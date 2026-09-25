import texasCounties from '@/data/texas-counties.json';
import {
  blankToNull,
  cleanCounty,
  clientIpFromHeaders,
  decodeGeoHeader,
  finiteOrNull,
  hashIp,
  isNorthTexas,
} from '@/lib/address-search';
import { entryFromContext, SITE_SOURCE } from '@/lib/lead-source';
import type { SearchContext } from '@/lib/search-attribution';
import { supabaseInsert, supabaseLatestId, supabasePatchById, supabaseServiceKey } from '@/lib/supabase-rest';

const TABLE = 'address_searches';

type CountyRule = { name: string; minAcres: number };
const TEXAS_MIN_ACRES = new Map(
  (texasCounties as CountyRule[]).map((county) => [county.name.toLowerCase(), county.minAcres]),
);

export type AddressSearchEntry = {
  rawAddress: string;
  normalizedAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
  state?: string | null;
  county?: string | null;
  parcelId?: string | null;
  acres?: number | null;
  marketValue?: number | null;
  eligibility?: string | null;
  resultShown?: string | null;
  savingsShown?: number | null;
  context: SearchContext;
  userAgent?: string | null;
  headers: { get(name: string): string | null };
  email?: string | null;
  phone?: string | null;
};

export function texasEligibility(county: string | null | undefined, acres: number | null | undefined): string | null {
  const cleaned = cleanCounty(county);
  const acreage = finiteOrNull(acres ?? null);
  if (!cleaned || acreage == null) return null;
  const minAcres = TEXAS_MIN_ACRES.get(cleaned.toLowerCase());
  if (minAcres == null) return null;
  const agEligible = Math.max(0, acreage - 1);
  return agEligible >= minAcres ? 'eligible' : 'not_eligible';
}

function utmValue(context: SearchContext): string | null {
  return entryFromContext(context).code;
}

function searchRow(entry: AddressSearchEntry): Record<string, unknown> {
  const state = blankToNull(entry.state, 40);
  const county = cleanCounty(entry.county);
  const ip = clientIpFromHeaders(entry.headers);
  const entryPoint = entryFromContext(entry.context);
  const eligibility = blankToNull(entry.eligibility, 200)
    || texasEligibility(county, entry.acres)
    || blankToNull(entry.resultShown, 200);

  return {
    created_at: new Date().toISOString(),
    raw_address: blankToNull(entry.rawAddress, 1000),
    normalized_address: blankToNull(entry.normalizedAddress, 1000),
    lat: finiteOrNull(entry.lat),
    lng: finiteOrNull(entry.lng),
    state,
    county,
    parcel_id: blankToNull(entry.parcelId, 120),
    acreage: finiteOrNull(entry.acres),
    market_value: finiteOrNull(entry.marketValue),
    estimated_annual_savings: finiteOrNull(entry.savingsShown),
    eligibility,
    utm_source: entry.context.utmSource,
    utm_medium: entry.context.utmMedium,
    utm_campaign: entry.context.utmCampaign,
    gclid: entry.context.gclid,
    fbclid: entry.context.fbclid,
    referrer: entry.context.referrer,
    landing_page_path: entry.context.landingPath,
    user_agent: blankToNull(entry.userAgent, 500),
    ip_hash: ip ? hashIp(ip) : null,
    ip_country: decodeGeoHeader(entry.headers.get('x-vercel-ip-country')),
    ip_region: decodeGeoHeader(entry.headers.get('x-vercel-ip-country-region')),
    ip_city: decodeGeoHeader(entry.headers.get('x-vercel-ip-city')),
    email: blankToNull(entry.email, 320),
    phone: blankToNull(entry.phone, 40),
    is_north_texas: isNorthTexas(state, county),
    source: SITE_SOURCE,
    ip,
    city: decodeGeoHeader(entry.headers.get('x-vercel-ip-city')),
    region: decodeGeoHeader(entry.headers.get('x-vercel-ip-country-region')),
    country: decodeGeoHeader(entry.headers.get('x-vercel-ip-country')),
    utm: utmValue(entry.context) || entryPoint.code,
  };
}

export async function insertAddressSearch(entry: AddressSearchEntry): Promise<Record<string, unknown> | null> {
  return supabaseInsert(TABLE, searchRow(entry));
}

/** Fire-and-forget wrapper. Failures are logged and never thrown. */
export async function logAddressSearch(entry: AddressSearchEntry): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('address search log timeout')), 4000);
      insertAddressSearch(entry).then(() => {
        clearTimeout(timer);
        resolve();
      }, (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  } catch (error) {
    console.error('address search log failed', error);
  }
}

async function recentSearchId(input: {
  headers?: { get(name: string): string | null };
  lat?: number | null;
  lng?: number | null;
}): Promise<string | null> {
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const lat = finiteOrNull(input.lat);
  const lng = finiteOrNull(input.lng);
  if (lat != null && lng != null) {
    const pad = 0.0002;
    const id = await supabaseLatestId(
      TABLE,
      `created_at=gte.${encodeURIComponent(since)}&lat=gte.${lat - pad}&lat=lte.${lat + pad}&lng=gte.${lng - pad}&lng=lte.${lng + pad}`,
    );
    if (id) return id;
  }
  const ip = input.headers ? clientIpFromHeaders(input.headers) : null;
  if (!ip) return null;
  return supabaseLatestId(
    TABLE,
    `created_at=gte.${encodeURIComponent(since)}&ip_hash=eq.${encodeURIComponent(hashIp(ip))}`,
  );
}

/**
 * Fills parcel, eligibility, email, phone, or savings onto the central search row
 * for this visitor. Used when a later request already has that information.
 */
export async function recordSearchFollowUp(input: {
  sessionId?: string | null;
  email?: string | null;
  phone?: string | null;
  savings?: number | null;
  resultNote?: string | null;
  headers?: { get(name: string): string | null };
  lat?: number | null;
  lng?: number | null;
  parcelId?: string | null;
  county?: string | null;
  acres?: number | null;
  marketValue?: number | null;
  eligibility?: string | null;
}): Promise<void> {
  try {
    if (!supabaseServiceKey()) return;
    const email = blankToNull(input.email, 320);
    const phone = blankToNull(input.phone, 40);
    const savings = finiteOrNull(input.savings);
    const parcelId = blankToNull(input.parcelId, 120);
    const county = cleanCounty(input.county);
    const acres = finiteOrNull(input.acres);
    const marketValue = finiteOrNull(input.marketValue);
    const eligibility = blankToNull(input.eligibility, 200) || texasEligibility(county, acres);
    if (!email && !phone && savings == null && !parcelId && !eligibility && acres == null && marketValue == null) return;

    const id = await recentSearchId(input);
    if (!id) return;

    const patch: Record<string, unknown> = {};
    if (email) patch.email = email;
    if (phone) patch.phone = phone;
    if (savings != null) patch.estimated_annual_savings = savings;
    if (parcelId) patch.parcel_id = parcelId;
    if (county) patch.county = county;
    if (acres != null) patch.acreage = acres;
    if (marketValue != null) patch.market_value = marketValue;
    if (eligibility) patch.eligibility = eligibility;
    if (Object.keys(patch).length === 0) return;
    await supabasePatchById(TABLE, id, patch);
  } catch (error) {
    console.error('address search follow-up failed', error);
  }
}
