import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import countyData from '@/data/texas-counties.json';
import type { County, PropertyLookupResult } from '@/types';

const counties = countyData as County[];

// True Automation client IDs for known counties
const TRUE_AUTOMATION_CLIENT_IDS: Record<string, string> = {
  'Van Zandt': '110', // Update with actual client ID
  'Kaufman': '61',
  'Henderson': '49',
  'Smith': '188',
  'Bexar': '110',
  'Dallas': '26',
  'Tarrant': '220',
  'Harris': '201',
  'Travis': '227',
  'Collin': '24',
  'Denton': '27',
  // Add more as discovered
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const countyName = searchParams.get('county');
  const address = searchParams.get('address');

  if (!countyName || !address) {
    return NextResponse.json(
      { found: false, error: 'County and address are required' },
      { status: 400 }
    );
  }

  // Find county data
  const county = counties.find(c => c.name === countyName);
  if (!county) {
    return NextResponse.json(
      { found: false, error: 'County not found' },
      { status: 404 }
    );
  }

  // Check if lookup is supported
  if (!county.cad.lookupSupported) {
    return NextResponse.json({
      found: false,
      error: 'Automatic lookup not available for this county',
      cadSearchUrl: county.cad.cadSearchUrl || county.cad.website,
    });
  }

  // Route to appropriate scraper
  if (county.cad.cadPlatform === 'trueAutomation') {
    return await scrapeTrueAutomation(county, address);
  }

  // Fallback
  return NextResponse.json({
    found: false,
    error: 'Lookup method not implemented for this county',
    cadSearchUrl: county.cad.cadSearchUrl || county.cad.website,
  });
}

async function scrapeTrueAutomation(
  county: County,
  address: string
): Promise<NextResponse<PropertyLookupResult>> {
  const clientId = county.cad.cadClientId || TRUE_AUTOMATION_CLIENT_IDS[county.name];

  if (!clientId) {
    return NextResponse.json({
      found: false,
      error: 'CAD client ID not configured',
      cadSearchUrl: county.cad.cadSearchUrl,
    });
  }

  const baseUrl = 'https://propaccess.trueautomation.com/clientdb';
  const cadSearchUrl = `${baseUrl}/?cid=${clientId}`;

  try {
    // Step 1: Perform search
    const searchUrl = `${baseUrl}/SearchResults.aspx?cid=${clientId}`;
    
    // Clean address for search (remove directional prefixes, suffixes as noted in the portal)
    const cleanAddress = address
      .replace(/^(N|S|E|W|NORTH|SOUTH|EAST|WEST)\s+/i, '')
      .replace(/\s+(ST|DR|AVE|RD|LN|BLVD|CT|WAY|PKWY|PL|CIR|TRL)\.?$/i, '');

    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: new URLSearchParams({
        __EVENTTARGET: '',
        __EVENTARGUMENT: '',
        'ctl00$searchbox$txtSearch': cleanAddress,
        'ctl00$searchbox$btnSearch': 'Search',
      }).toString(),
    });

    if (!searchResponse.ok) {
      throw new Error('Search request failed');
    }

    const searchHtml = await searchResponse.text();
    const $ = cheerio.load(searchHtml);

    // Parse search results
    const properties: PropertyLookupResult['properties'] = [];
    
    // Find property rows in the results table
    $('table tbody tr').each((_, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length < 7) return; // Not a data row

      const propertyId = cells.eq(1).text().trim();
      const propertyAddress = cells.eq(4).text().trim();
      const ownerName = cells.eq(5).text().trim();
      const appraisedValueText = cells.eq(7).text().trim();

      if (!propertyId || !propertyAddress) return;

      // Parse appraised value
      const marketValue = parseFloat(appraisedValueText.replace(/[$,]/g, '')) || 0;

      properties.push({
        propertyId,
        ownerName,
        address: propertyAddress,
        marketValue,
        assessedValue: marketValue, // Same for now, will get details if needed
        acres: null,
        estimatedTax: null,
      });
    });

    if (properties.length === 0) {
      return NextResponse.json({
        found: false,
        error: 'No properties found matching that address',
        cadSearchUrl,
      });
    }

    // If we found exactly one property, fetch detailed info
    if (properties.length === 1) {
      try {
        const details = await fetchPropertyDetails(baseUrl, clientId, properties[0].propertyId);
        if (details) {
          properties[0] = { ...properties[0], ...details };
        }
      } catch (err) {
        console.error('Error fetching property details:', err);
      }
    }

    return NextResponse.json({
      found: true,
      properties,
      cadSearchUrl,
    });
  } catch (error) {
    console.error('Error scraping True Automation:', error);
    return NextResponse.json({
      found: false,
      error: 'Failed to fetch property data. Please try manual entry.',
      cadSearchUrl,
    });
  }
}

async function fetchPropertyDetails(
  baseUrl: string,
  clientId: string,
  propertyId: string
): Promise<Partial<{
  propertyId: string;
  ownerName: string;
  address: string;
  marketValue: number;
  assessedValue: number;
  acres: number | null;
  estimatedTax: number | null;
}> | null> {
  try {
    const detailsUrl = `${baseUrl}/Property.aspx?cid=${clientId}&prop_id=${propertyId}`;
    
    const response = await fetch(detailsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract values section
    let marketValue = 0;
    let assessedValue = 0;
    let estimatedTax = 0;
    let acres = 0;

    // Find market value
    $('table').each((_, table) => {
      const $table = $(table);
      $table.find('tr').each((_, row) => {
        const $row = $(row);
        const text = $row.text();
        
        if (text.includes('Market Value:')) {
          const valueText = $row.find('td').last().text().trim();
          marketValue = parseFloat(valueText.replace(/[$,]/g, '')) || 0;
        }
        
        if (text.includes('Assessed Value:')) {
          const valueText = $row.find('td').last().text().trim();
          assessedValue = parseFloat(valueText.replace(/[$,]/g, '')) || 0;
        }
        
        if (text.includes('Taxes w/Current Exemptions:')) {
          const valueText = $row.find('td').last().text().trim();
          estimatedTax = parseFloat(valueText.replace(/[$,]/g, '')) || 0;
        }
        
        // Find acres in land details table
        if (text.includes('Acres')) {
          const cells = $row.find('td');
          if (cells.length > 3) {
            const acresText = cells.eq(3).text().trim();
            const acresValue = parseFloat(acresText);
            if (!isNaN(acresValue) && acresValue > 0) {
              acres += acresValue;
            }
          }
        }
      });
    });

    return {
      marketValue: marketValue || undefined,
      assessedValue: assessedValue || marketValue || undefined,
      acres: acres > 0 ? acres : null,
      estimatedTax: estimatedTax > 0 ? estimatedTax : null,
    };
  } catch (error) {
    console.error('Error fetching property details:', error);
    return null;
  }
}
