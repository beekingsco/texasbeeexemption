/**
 * Texas statewide parcels from TxGIO / TNRIS StratMap.
 * The yearly MapServer query endpoint (stratmap25_land_parcels_48) now
 * requires a token and no longer answers public queries. The stable public
 * service is stratmap_land_parcels_48_most_recent. Its /query operation
 * returns "capability is not supported"; /identify is the working call.
 *
 * TEXAS_PARCEL_SERVICE_URL overrides the MapServer root so the next rename
 * is an env change, not a code change.
 */

export const DEFAULT_TEXAS_PARCEL_SERVICE =
  'https://feature.geographic.texas.gov/arcgis/rest/services/Parcels/stratmap_land_parcels_48_most_recent/MapServer';

export type ParcelLookupStatus = 'ok' | 'no_parcel' | 'lookup_failed';

export interface TexasParcel {
  found: boolean;
  status: ParcelLookupStatus;
  propertyId?: string;
  geoId?: string;
  ownerName?: string;
  legalArea?: number;
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

export function texasParcelServiceUrl(): string {
  const configured = process.env.TEXAS_PARCEL_SERVICE_URL?.trim();
  return (configured || DEFAULT_TEXAS_PARCEL_SERVICE).replace(/\/$/, '');
}

function attr(attrs: Record<string, unknown>, name: string): string | undefined {
  const raw = attrs[name] ?? attrs[name.toUpperCase()] ?? attrs[name.toLowerCase()];
  if (raw == null) return undefined;
  const text = String(raw).trim();
  if (!text || text === '0' || /^0+$/.test(text)) return undefined;
  return text;
}

function positiveNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = parseFloat(value.replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function acresFrom(raw: string | undefined, unit: string | undefined): number | undefined {
  const amount = positiveNumber(raw);
  if (amount == null) return undefined;
  const normalized = (unit || '').toLowerCase();
  if (normalized.includes('sq') || normalized.includes('sf') || normalized.includes('feet')) {
    return amount / 43560;
  }
  return amount;
}

function buildSitus(attrs: Record<string, unknown>): string | undefined {
  const full = attr(attrs, 'situs_addr');
  if (full) {
    const cleaned = full.replace(/\s+/g, ' ').replace(/^[, ]+/, '').trim();
    // A street number has to lead the string. Zip-only leftovers like "TX 78702"
    // come from a neighboring pin and should not be shown as the situs.
    if (cleaned && /^\d/.test(cleaned)) return cleaned;
  }
  const parts = ['situs_num', 'situs_stre', 'situs_st_1', 'situs_st_2']
    .map((key) => attr(attrs, key))
    .filter((part): part is string => Boolean(part));
  return parts.join(' ') || undefined;
}

export function parcelFromAttributes(attrs: Record<string, unknown>): TexasParcel {
  const legalUnit = attr(attrs, 'lgl_area_unit');
  const gisUnit = attr(attrs, 'gis_area_unit');
  const legalArea = acresFrom(attr(attrs, 'legal_area'), legalUnit);
  const gisArea = acresFrom(attr(attrs, 'gis_area'), gisUnit);
  return {
    found: true,
    status: 'ok',
    propertyId: attr(attrs, 'prop_id'),
    geoId: attr(attrs, 'geo_id'),
    ownerName: attr(attrs, 'owner_name'),
    legalArea: legalArea ?? gisArea,
    gisArea,
    legalDesc: attr(attrs, 'legal_desc'),
    landValue: positiveNumber(attr(attrs, 'land_value')),
    improvementValue: positiveNumber(attr(attrs, 'imp_value')),
    marketValue: positiveNumber(attr(attrs, 'mkt_value')),
    situsAddress: buildSitus(attrs),
    situsCity: attr(attrs, 'situs_city'),
    situsZip: attr(attrs, 'situs_zip'),
    county: attr(attrs, 'county'),
    taxYear: positiveNumber(attr(attrs, 'tax_year')),
    yearBuilt: attr(attrs, 'year_built'),
    source: attr(attrs, 'source') || 'TxGIO StratMap',
    fips: attr(attrs, 'fips'),
  };
}

function scoreParcel(parcel: TexasParcel): number {
  let score = 0;
  if (parcel.marketValue) score += 10;
  if (parcel.legalArea && parcel.legalArea > 0.5) score += 5;
  if (parcel.ownerName) score += 3;
  if (parcel.situsAddress) score += 2;
  return score;
}

async function identify(
  lat: number,
  lng: number,
  delta: number,
  tolerance: number,
): Promise<Record<string, unknown>[]> {
  const service = texasParcelServiceUrl();
  const endpoint = service.endsWith('/identify') ? service : `${service}/identify`;
  const body = new URLSearchParams({
    f: 'json',
    geometry: JSON.stringify({ x: lng, y: lat, spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryPoint',
    sr: '4326',
    layers: 'all:0',
    tolerance: String(tolerance),
    mapExtent: `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`,
    imageDisplay: '400,400,96',
    returnGeometry: 'false',
  });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: 'https://beeexemption.com',
    },
    body,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new Error(`Texas parcel service HTTP ${response.status}`);
  }
  const data = await response.json() as {
    error?: { message?: string };
    results?: Array<{ attributes?: Record<string, unknown> }>;
  };
  if (data.error) {
    throw new Error(data.error.message || 'Texas parcel service error');
  }
  return (data.results || [])
    .map((result) => result.attributes)
    .filter((attributes): attributes is Record<string, unknown> => Boolean(attributes));
}

export async function lookupTexasParcel(lat: number, lng: number): Promise<TexasParcel> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { found: false, status: 'lookup_failed', error: 'lat and lng are required' };
  }

  const attempts = [
    { delta: 0.00015, tolerance: 2 },
    { delta: 0.0008, tolerance: 6 },
    { delta: 0.002, tolerance: 10 },
  ];
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const hits = await identify(lat, lng, attempt.delta, attempt.tolerance);
      if (hits.length === 0) continue;
      let best = parcelFromAttributes(hits[0]);
      let bestScore = scoreParcel(best);
      for (const hit of hits.slice(1, 5)) {
        const candidate = parcelFromAttributes(hit);
        const score = scoreParcel(candidate);
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
      return best;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    const message = lastError instanceof Error ? lastError.message : 'Failed to fetch parcel data';
    return { found: false, status: 'lookup_failed', error: message };
  }
  return { found: false, status: 'no_parcel', error: 'No parcel found at these coordinates' };
}
