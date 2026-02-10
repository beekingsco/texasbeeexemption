import { NextRequest, NextResponse } from 'next/server';

// Texas Natural Resources Information System (TNRIS) statewide parcel layer
// Free, no API key, covers all 254 Texas counties
// Returns owner name, market value, acreage, property ID, etc.

const TNRIS_PARCEL_URL = 'https://feature.geographic.texas.gov/arcgis/rest/services/Parcels/stratmap25_land_parcels_48/MapServer/0/query';

export interface ParcelData {
  found: boolean;
  propertyId?: string;
  geoId?: string;
  ownerName?: string;
  legalArea?: number; // acres
  gisArea?: number;
  legalDesc?: string;
  landValue?: number;
  improvementValue?: number;
  marketValue?: number;
  situsAddress?: string;
  situsCity?: string;
  situsZip?: string;
  county?: string;
  taxYear?: number;
  yearBuilt?: string;
  source?: string;
  fips?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat');
  const lng = request.nextUrl.searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ found: false, error: 'lat and lng are required' }, { status: 400 });
  }

  try {
    const url = new URL(TNRIS_PARCEL_URL);
    url.searchParams.set('f', 'json');
    // Use a small envelope (buffer) around the point to catch parcels where
    // the geocoded pin lands slightly outside the parcel boundary (common with rural addresses)
    const buf = 0.0005; // ~55 meters
    url.searchParams.set('geometry', `${parseFloat(lng) - buf},${parseFloat(lat) - buf},${parseFloat(lng) + buf},${parseFloat(lat) + buf}`);
    url.searchParams.set('geometryType', 'esriGeometryEnvelope');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', '*');
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('inSR', '4326');

    const resp = await fetch(url.toString(), {
      headers: { 'Referer': 'https://beekings.com' },
      signal: AbortSignal.timeout(12000),
    });

    if (!resp.ok) throw new Error(`TNRIS API ${resp.status}`);
    const data = await resp.json();

    const features = data.features || [];
    if (features.length === 0) {
      return NextResponse.json({ found: false, error: 'No parcel found at these coordinates' });
    }

    // Take the first parcel (most relevant)
    const attrs = features[0].attributes;

    const parcel: ParcelData = {
      found: true,
      propertyId: attrs.prop_id || undefined,
      geoId: attrs.geo_id || undefined,
      ownerName: cleanString(attrs.owner_name),
      legalArea: parseFloat(attrs.legal_area) || undefined,
      gisArea: parseFloat(attrs.gis_area) || undefined,
      legalDesc: cleanString(attrs.legal_desc),
      landValue: parseInt(attrs.land_value) || undefined,
      improvementValue: parseInt(attrs.imp_value) || undefined,
      marketValue: parseInt(attrs.mkt_value) || undefined,
      situsAddress: buildSitusAddress(attrs),
      situsCity: cleanString(attrs.situs_city),
      situsZip: cleanZip(attrs.situs_zip),
      county: cleanString(attrs.county),
      taxYear: parseInt(attrs.tax_year) || undefined,
      yearBuilt: cleanString(attrs.year_built),
      source: cleanString(attrs.source),
      fips: attrs.fips || undefined,
    };

    // If we got multiple features (e.g. address is at a boundary), return the best one
    // Prefer the one with a market value and larger area
    if (features.length > 1) {
      let best = parcel;
      let bestScore = scoreParcel(parcel);
      for (let i = 1; i < Math.min(features.length, 5); i++) {
        const a = features[i].attributes;
        const candidate: ParcelData = {
          found: true,
          propertyId: a.prop_id || undefined,
          geoId: a.geo_id || undefined,
          ownerName: cleanString(a.owner_name),
          legalArea: parseFloat(a.legal_area) || undefined,
          gisArea: parseFloat(a.gis_area) || undefined,
          legalDesc: cleanString(a.legal_desc),
          landValue: parseInt(a.land_value) || undefined,
          improvementValue: parseInt(a.imp_value) || undefined,
          marketValue: parseInt(a.mkt_value) || undefined,
          situsAddress: buildSitusAddress(a),
          situsCity: cleanString(a.situs_city),
          situsZip: cleanZip(a.situs_zip),
          county: cleanString(a.county),
          taxYear: parseInt(a.tax_year) || undefined,
          yearBuilt: cleanString(a.year_built),
          source: cleanString(a.source),
          fips: a.fips || undefined,
        };
        const score = scoreParcel(candidate);
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
      return NextResponse.json(best);
    }

    return NextResponse.json(parcel);
  } catch (err) {
    console.error('Parcel lookup error:', err);
    return NextResponse.json({ found: false, error: 'Failed to fetch parcel data' });
  }
}

function cleanString(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  const s = val.trim();
  return s && s !== '0' && s !== '00000' && s !== '000000' ? s : undefined;
}

function cleanZip(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  const s = val.trim().replace(/^0+$/, '');
  return s || undefined;
}

function buildSitusAddress(attrs: Record<string, string>): string | undefined {
  const parts = [
    attrs.situs_num,
    attrs.situs_stre,
    attrs.situs_st_1,
    attrs.situs_st_2,
  ].map(p => (p || '').trim()).filter(Boolean);
  const addr = parts.join(' ').trim();
  return addr || undefined;
}

function scoreParcel(p: ParcelData): number {
  let score = 0;
  if (p.marketValue && p.marketValue > 0) score += 10;
  if (p.legalArea && p.legalArea > 0.5) score += 5; // Prefer larger parcels (more relevant for ag)
  if (p.ownerName) score += 3;
  if (p.situsAddress) score += 2;
  return score;
}
