import { NextRequest, NextResponse } from 'next/server';

// ArcGIS World Geocoder - free, no API key, excellent quality
// Two modes: suggest (autocomplete) and findAddressCandidates (full geocode)

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  const magicKey = request.nextUrl.searchParams.get('magicKey');
  const mode = request.nextUrl.searchParams.get('mode') || 'suggest'; // 'suggest' or 'geocode'

  if (!q || q.trim().length < 4) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (mode === 'suggest') {
      return await suggestAddresses(q);
    } else {
      return await geocodeAddress(q, magicKey || undefined);
    }
  } catch (err) {
    console.error('Geocode error:', err);
    return NextResponse.json({ results: [], error: 'Geocoding failed' });
  }
}

async function suggestAddresses(query: string) {
  // ArcGIS Suggest endpoint - fast autocomplete
  const url = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest');
  url.searchParams.set('f', 'json');
  url.searchParams.set('text', query);
  url.searchParams.set('maxSuggestions', '6');
  url.searchParams.set('countryCode', 'US');
  // Bias toward Texas center
  url.searchParams.set('location', '-99.5,31.5');
  url.searchParams.set('distance', '500000'); // 500km radius preference
  // Only return addresses (not POIs)
  url.searchParams.set('category', 'Address');

  const resp = await fetch(url.toString(), {
    headers: { 'Referer': 'https://beekings.com' },
    signal: AbortSignal.timeout(6000),
  });

  if (!resp.ok) throw new Error(`ArcGIS suggest ${resp.status}`);
  const data = await resp.json();

  const suggestions = (data.suggestions || [])
    .filter((s: { text: string }) => /\bTX\b|Texas/i.test(s.text))
    .map((s: { text: string; magicKey: string }) => ({
      text: s.text,
      magicKey: s.magicKey,
    }));

  return NextResponse.json({ suggestions });
}

async function geocodeAddress(query: string, magicKey?: string) {
  const url = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
  url.searchParams.set('f', 'json');
  url.searchParams.set('singleLine', query);
  url.searchParams.set('maxLocations', '1');
  url.searchParams.set('outFields', '*');
  url.searchParams.set('countryCode', 'US');
  if (magicKey) {
    url.searchParams.set('magicKey', magicKey);
  }

  const resp = await fetch(url.toString(), {
    headers: { 'Referer': 'https://beekings.com' },
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) throw new Error(`ArcGIS geocode ${resp.status}`);
  const data = await resp.json();

  const candidates = (data.candidates || []).map((c: Record<string, unknown>) => {
    const a = c.attributes as Record<string, string>;
    const loc = c.location as { x: number; y: number };
    return {
      address: c.address as string,
      lat: loc.y,
      lng: loc.x,
      score: c.score,
      street: a.StAddr || '',
      city: a.City || '',
      state: a.RegionAbbr || a.Region || '',
      zip: a.Postal || '',
      county: (a.Subregion || '').replace(/ County$/i, ''),
      addrType: a.Addr_type || '',
      structType: a.StrucType || '',
    };
  });

  return NextResponse.json({ results: candidates });
}
