import { NextRequest, NextResponse } from 'next/server';
import type { ParcelData } from '@/app/api/parcel/route';

const TNRIS_PARCEL_URL = 'https://feature.geographic.texas.gov/arcgis/rest/services/Parcels/stratmap25_land_parcels_48/MapServer/0/query';

function cleanString(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  const s = val.trim();
  return s && s !== '0' && s !== '00000' && s !== '000000' ? s : undefined;
}

function buildSitusAddress(attrs: Record<string, string>): string | undefined {
  const parts = [attrs.situs_num, attrs.situs_stre, attrs.situs_st_1, attrs.situs_st_2]
    .map(p => (p || '').trim()).filter(Boolean);
  return parts.join(' ').trim() || undefined;
}

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get('lat');
  const lng = request.nextUrl.searchParams.get('lng');
  const excludeId = request.nextUrl.searchParams.get('excludeId') || '';

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  try {
    // ~1km radius buffer
    const buf = 0.01;
    const url = new URL(TNRIS_PARCEL_URL);
    url.searchParams.set('f', 'json');
    url.searchParams.set('geometry', `${parseFloat(lng) - buf},${parseFloat(lat) - buf},${parseFloat(lng) + buf},${parseFloat(lat) + buf}`);
    url.searchParams.set('geometryType', 'esriGeometryEnvelope');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('outFields', '*');
    url.searchParams.set('returnGeometry', 'false');
    url.searchParams.set('inSR', '4326');
    url.searchParams.set('resultRecordCount', '20');

    const resp = await fetch(url.toString(), {
      headers: { 'Referer': 'https://beekings.com' },
      signal: AbortSignal.timeout(12000),
    });

    if (!resp.ok) throw new Error(`TNRIS API ${resp.status}`);
    const data = await resp.json();

    const features: Record<string, unknown>[] = data.features || [];

    const parcels: ParcelData[] = features
      .map((f: Record<string, unknown>) => {
        const attrs = f.attributes as Record<string, string>;
        return {
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
          situsZip: cleanString(attrs.situs_zip),
          county: cleanString(attrs.county),
          taxYear: parseInt(attrs.tax_year) || undefined,
          source: cleanString(attrs.source),
          fips: attrs.fips || undefined,
        } as ParcelData;
      })
      .filter(p =>
        p.propertyId !== excludeId &&         // exclude the primary parcel
        (p.legalArea || 0) >= 0.5             // skip tiny slivers
      )
      .slice(0, 8);

    return NextResponse.json({ parcels });
  } catch (err) {
    console.error('Nearby parcels error:', err);
    return NextResponse.json({ error: 'Failed to fetch nearby parcels', parcels: [] });
  }
}
