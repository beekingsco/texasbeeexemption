/** Browser memory for a visitor who already gave an email. 30 days, this browser only. */
export const UNLOCK_STORAGE_KEY = 'bee_results_unlock_v1';
export const UNLOCK_COOKIE = 'bee_results_unlock';
export const UNLOCK_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: StoredUnlock | null = null;
const COOKIE_ONLY: StoredUnlock = { email: '', name: '', at: 0 };

export function subscribeUnlock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitUnlock(): void {
  listeners.forEach((listener) => listener());
}

export function readServerUnlock(): StoredUnlock | null {
  return null;
}

export type StoredUnlock = {
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  county?: string;
  state?: string;
  at: number;
};

export function splitPersonName(name: string): { firstName: string; lastName: string } {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) return { firstName: '', lastName: '' };
  const parts = cleaned.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function eligibilityHeadline(input: {
  county: string;
  stateName: string;
  qualifies: boolean | null;
  acresKnown: boolean;
}): string {
  const county = input.county.trim() || 'Your';
  if (!input.acresKnown || input.qualifies == null) {
    return `We found your property in ${county} County, ${input.stateName}.`;
  }
  if (input.qualifies) {
    return `${county} County looks eligible for a beekeeping agricultural exemption.`;
  }
  return `${county} County looks short of the acreage this exemption needs.`;
}

/** A band around the estimate so the teaser does not print the exact dollar amount. */
export function savingsRangeLabel(annual: number | null | undefined): string | null {
  if (annual == null || !Number.isFinite(annual) || annual < 100) return null;
  const step = annual < 2000 ? 250 : annual < 8000 ? 500 : 1000;
  const low = Math.floor(annual / step) * step;
  const high = low + step;
  const money = (value: number) => '$' + value.toLocaleString('en-US');
  return `${money(low)}–${money(high)}`;
}

function cookiePresent(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((part) => part.trim().startsWith(`${UNLOCK_COOKIE}=`));
}

export function readStoredUnlock(): StoredUnlock | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(UNLOCK_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  cachedValue = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredUnlock;
      const fresh = parsed
        && typeof parsed.email === 'string'
        && parsed.email.includes('@')
        && typeof parsed.at === 'number'
        && Date.now() - parsed.at < UNLOCK_MAX_AGE_SECONDS * 1000;
      if (fresh) {
        cachedValue = parsed;
        return cachedValue;
      }
      window.localStorage.removeItem(UNLOCK_STORAGE_KEY);
      cachedRaw = null;
    } catch {
      cachedValue = null;
    }
  }
  if (cookiePresent()) cachedValue = COOKIE_ONLY;
  return cachedValue;
}

export function writeStoredUnlock(record: Omit<StoredUnlock, 'at'> & { at?: number }): void {
  if (typeof window === 'undefined') return;
  const stored: StoredUnlock = {
    email: record.email.trim(),
    name: record.name.trim(),
    firstName: record.firstName,
    lastName: record.lastName,
    address: record.address,
    county: record.county,
    state: record.state,
    at: record.at ?? Date.now(),
  };
  cachedValue = stored;
  cachedRaw = JSON.stringify(stored);
  window.localStorage.setItem(UNLOCK_STORAGE_KEY, cachedRaw);
  document.cookie = `${UNLOCK_COOKIE}=1; Path=/; Max-Age=${UNLOCK_MAX_AGE_SECONDS}; SameSite=Lax`;
  emitUnlock();
}
