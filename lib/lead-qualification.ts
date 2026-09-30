import { US_STATES } from '@/lib/states';

/**
 * Decides whether a submission is a real property lead.
 * State-picker clicks were stored as leads with the state name in both
 * Name and Address. A lead email goes out only when the name is a person,
 * the address is a street, and the email is usable.
 */

const STATE_NAMES = US_STATES.map((state) => state.name.toLowerCase());
const STATE_CODES = US_STATES.map((state) => state.code.toLowerCase());

/** Whole-field abbreviations that are not already the postal code. */
const EXTRA_STATE_TOKENS = [
  'district of columbia',
  'washington dc',
  'washington d c',
  'ala',
  'ariz',
  'ark',
  'calif',
  'colo',
  'conn',
  'del',
  'fla',
  'ill',
  'ind',
  'kans',
  'mass',
  'mich',
  'minn',
  'miss',
  'mont',
  'neb',
  'nev',
  'okla',
  'ore',
  'penn',
  'penna',
  'tenn',
  'tex',
  'wash',
  'wis',
  'wisc',
  'wyo',
  'w va',
  'dc',
];

const STATE_TOKEN_SET = new Set<string>([
  ...STATE_NAMES,
  ...STATE_CODES,
  ...EXTRA_STATE_TOKENS,
]);

const STATE_TOKENS_BY_LENGTH = [...STATE_TOKEN_SET].sort((a, b) => b.length - a.length);

function canonical(value: string): string {
  const spaced = value
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[.]/g, ' ')
    .replace(/[,#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // "N.Y." and "U.S. 69" become "ny" and "us 69". "N Main" stays "n main".
  return spaced.replace(
    /(^|\s)((?:[a-z]\s+)+[a-z])(?=\s|$)/g,
    (_match, lead: string, initials: string) => lead + initials.replace(/\s+/g, ''),
  );
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function matchesStateToken(key: string): boolean {
  return STATE_TOKEN_SET.has(key);
}

/** True when the entire field is a state name or abbreviation, and nothing else. */
export function isBareUsState(value: string): boolean {
  const key = canonical(value);
  if (!key) return false;
  if (matchesStateToken(key)) return true;
  const unwrapped = key.replace(/^state of\s+/, '').replace(/\s+state$/, '');
  return unwrapped !== key && matchesStateToken(unwrapped);
}

function stripTrailingState(key: string): string {
  for (const token of STATE_TOKENS_BY_LENGTH) {
    const suffix = ` ${token}`;
    if (key.endsWith(suffix) && key.length > suffix.length) {
      return key.slice(0, -suffix.length).trim();
    }
  }
  return key;
}

const STREET_SUFFIX = /\b[a-z0-9'-]+\s+(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|court|ct|circle|cir|place|pl|way|parkway|pkwy|highway|hwy|trail|trl|terrace|ter|loop|pike|pass|path|alley|aly|square|sq|crossing|xing|freeway|fwy|expressway|expy|route|rte)\b/;
const NUMBERED_ROUTE = /\b(county\s+road|co\s+rd|farm\s+to\s+market|fm|rr|cr|sr|us|ih|interstate|hc)\s*-?\s*\d+\b/;
const PO_BOX = /\bpo\s+box\b/;

/** A house number, route, or street suffix. A ZIP or city line does not count. */
export function hasStreetSignal(value: string): boolean {
  const key = canonical(value);
  if (!key) return false;
  if (PO_BOX.test(key) && /\d/.test(key)) return true;
  if (NUMBERED_ROUTE.test(key)) return true;
  if (STREET_SUFFIX.test(key)) return true;
  if (/^\d{5}\b/.test(key)) return false;
  return /^\d{1,6}\s+[a-z]/.test(key);
}

function isCountyPhrase(core: string): boolean {
  if (/^(county|parish|borough|census area)$/.test(core)) return true;
  if (/^.+ (county|parish|borough|census area)$/.test(core)) return true;
  if (/^(county|parish|borough|census area) of .+$/.test(core)) return true;
  // "Harris Co" — but not "County Road", and not a street that ends in Colorado ("123 Main St, Denver, CO").
  if (/^.+ co$/.test(core) && !/\b(rd|road|rte|route)\b/.test(core) && !hasStreetSignal(core)) return true;
  return false;
}

/** "Marion County", "Orleans Parish, LA", "Harris Co." — not "123 Main St, Harris County, TX". */
export function isCountyOnlyAddress(value: string): boolean {
  const key = canonical(value);
  if (!key || isBareUsState(value)) return false;
  if (hasStreetSignal(key)) return false;
  if (isCountyPhrase(key)) return true;
  const core = stripTrailingState(key);
  return core !== key && isCountyPhrase(core);
}

export function isRealStreetAddress(value: string): boolean {
  const key = canonical(value);
  if (!key) return false;
  if (isBareUsState(value)) return false;
  if (isCountyOnlyAddress(value)) return false;
  return hasStreetSignal(key);
}

export function isValidLeadEmail(value: string): boolean {
  const email = value.trim();
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export interface LeadFields {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  address?: string | null;
}

/**
 * Null means the submission may be saved and emailed.
 * A string is the visitor-facing reason to refuse it.
 */
export function contactLeadBlockReason(input: LeadFields): string | null {
  const first = asText(input.firstName);
  const last = asText(input.lastName);
  const name = asText(input.name) || `${first} ${last}`.trim();
  const email = asText(input.email);
  const address = asText(input.address);
  const parts = [first, last].filter(Boolean);
  const nameIsState =
    (name.length > 0 && isBareUsState(name)) ||
    (parts.length > 0 && parts.every((part) => isBareUsState(part)));

  if (nameIsState) {
    return 'Enter the property owner\'s name. A state name alone is not a contact.';
  }
  if (!isRealStreetAddress(address)) {
    return 'Enter a street address. A state or county alone is not enough.';
  }
  if (!isValidLeadEmail(email)) {
    return 'Enter a valid email address.';
  }
  return null;
}

/** Last line of defense in the mailer. Agent signups are not property leads. */
export function shouldDeliverNewLeadAlert(data: {
  name?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  address?: unknown;
  tier?: unknown;
}): boolean {
  if (data.tier === 'agent_signup') return true;
  return contactLeadBlockReason({
    name: asText(data.name),
    firstName: asText(data.firstName),
    lastName: asText(data.lastName),
    email: asText(data.email),
    address: asText(data.address),
  }) === null;
}
