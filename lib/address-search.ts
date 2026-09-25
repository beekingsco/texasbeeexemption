import { createHash } from 'node:crypto';

/** Counties Bee Exemption treats as the North Texas market. */
export const NORTH_TEXAS_COUNTIES = [
  'Dallas',
  'Tarrant',
  'Collin',
  'Denton',
  'Rockwall',
  'Kaufman',
  'Ellis',
  'Johnson',
  'Parker',
  'Wise',
  'Hunt',
  'Van Zandt',
] as const;

const NORTH_TEXAS_COUNTY_KEYS = new Set(
  NORTH_TEXAS_COUNTIES.map((county) => normalizePlace(county)),
);

function normalizePlace(value: string): string {
  return value
    .replace(/\s+(county|parish)$/i, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isNorthTexas(
  state: string | null | undefined,
  county: string | null | undefined,
): boolean {
  if (!county || !normalizePlace(county)) return false;
  if (!NORTH_TEXAS_COUNTY_KEYS.has(normalizePlace(county))) return false;
  if (!state || !state.trim()) return true;
  const normalizedState = state.trim().toLowerCase();
  return normalizedState === 'tx' || normalizedState === 'texas';
}

export function searchRegion(
  state: string | null | undefined,
  northTexas: boolean,
): 'north_texas' | 'florida' | 'other' {
  if (northTexas) return 'north_texas';
  const normalizedState = (state || '').trim().toLowerCase();
  if (normalizedState === 'fl' || normalizedState === 'florida') return 'florida';
  return 'other';
}

export function blankToNull(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function finiteOrNull(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

export function parseSavings(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function cleanCounty(county: string | null | undefined): string | null {
  return blankToNull((county || '').replace(/\s+(county|parish)$/i, ''), 120);
}

export function decodeGeoHeader(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return blankToNull(decodeURIComponent(value), 120);
  } catch {
    return blankToNull(value, 120);
  }
}

export function clientIpFromHeaders(headers: { get(name: string): string | null }): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || null;
}

const DEFAULT_IP_SALT = 'beeexemption-address-search-v1';

/** SHA-256 of the visitor IP. The raw address is never stored. */
export function hashIp(ip: string, salt = process.env.ADDRESS_SEARCH_IP_SALT || DEFAULT_IP_SALT): string {
  return createHash('sha256').update(`${salt}:${ip.trim()}`).digest('hex');
}
