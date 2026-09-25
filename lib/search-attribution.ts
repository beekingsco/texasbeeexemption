export const SEARCH_SESSION_COOKIE = 'bee_sid';
export const SEARCH_ATTR_COOKIE = 'bee_attr';
export const SEARCH_SESSION_HEADER = 'x-bee-sid';
export const SEARCH_ATTR_HEADER = 'x-bee-attr';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StoredAttribution = {
  lp: string | null;
  us: string | null;
  um: string | null;
  uc: string | null;
  gclid: string | null;
  fbclid: string | null;
  ref: string | null;
};

export type SearchContext = {
  sessionId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  gclid: string | null;
  fbclid: string | null;
  referrer: string | null;
  landingPath: string | null;
};

type HeaderReader = { get(name: string): string | null };
type CookieReader = { get(name: string): { value: string } | undefined };

const OWN_HOSTS = ['beeexemption.com', 'texasbeeexemption.com', 'localhost', '127.0.0.1'];

function clip(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function isOwnHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host.endsWith('.vercel.app')) return true;
  return OWN_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function isSessionId(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

function pathOf(url: URL): string | null {
  const path = `${url.pathname}${url.search}`;
  if (!path || path === '/') return clip(path || '/', 500);
  return clip(path, 500);
}

function paramsFromUrl(url: URL): StoredAttribution {
  return {
    lp: pathOf(url),
    us: clip(url.searchParams.get('utm_source'), 200),
    um: clip(url.searchParams.get('utm_medium'), 200),
    uc: clip(url.searchParams.get('utm_campaign'), 200),
    gclid: clip(url.searchParams.get('gclid'), 200),
    fbclid: clip(url.searchParams.get('fbclid'), 200),
    ref: null,
  };
}

function fillMissing(target: StoredAttribution, extra: StoredAttribution) {
  target.us ||= extra.us;
  target.um ||= extra.um;
  target.uc ||= extra.uc;
  target.gclid ||= extra.gclid;
  target.fbclid ||= extra.fbclid;
  if (!target.lp) target.lp = extra.lp;
}

export function attributionFromLanding(url: URL, refererHeader: string | null): StoredAttribution {
  const attribution = paramsFromUrl(url);
  if (!refererHeader) return attribution;
  let referer: URL;
  try {
    referer = new URL(refererHeader);
  } catch {
    return attribution;
  }
  if (isOwnHost(referer.hostname)) {
    fillMissing(attribution, paramsFromUrl(referer));
    return attribution;
  }
  attribution.ref = clip(refererHeader, 500);
  return attribution;
}

export function encodeAttribution(attribution: StoredAttribution): string {
  const json = JSON.stringify(attribution);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeAttribution(value: string | null | undefined): StoredAttribution | null {
  if (!value) return null;
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<StoredAttribution>;
    return {
      lp: clip(parsed.lp, 500),
      us: clip(parsed.us, 200),
      um: clip(parsed.um, 200),
      uc: clip(parsed.uc, 200),
      gclid: clip(parsed.gclid, 200),
      fbclid: clip(parsed.fbclid, 200),
      ref: clip(parsed.ref, 500),
    };
  } catch {
    return null;
  }
}

function contextFromAttribution(sessionId: string | null, attribution: StoredAttribution | null): SearchContext {
  return {
    sessionId,
    utmSource: attribution?.us ?? null,
    utmMedium: attribution?.um ?? null,
    utmCampaign: attribution?.uc ?? null,
    gclid: attribution?.gclid ?? null,
    fbclid: attribution?.fbclid ?? null,
    referrer: attribution?.ref ?? null,
    landingPath: attribution?.lp ?? null,
  };
}

function attributionFromReferer(refererHeader: string | null): StoredAttribution | null {
  if (!refererHeader) return null;
  try {
    const referer = new URL(refererHeader);
    if (isOwnHost(referer.hostname)) return paramsFromUrl(referer);
    return {
      lp: null,
      us: null,
      um: null,
      uc: null,
      gclid: null,
      fbclid: null,
      ref: clip(refererHeader, 500),
    };
  } catch {
    return null;
  }
}

export function readServerSearchContext(request: {
  headers: HeaderReader;
  cookies: CookieReader;
}): SearchContext {
  const headerSession = request.headers.get(SEARCH_SESSION_HEADER);
  const cookieSession = request.cookies.get(SEARCH_SESSION_COOKIE)?.value;
  const sessionId = isSessionId(headerSession)
    ? headerSession
    : isSessionId(cookieSession)
      ? cookieSession
      : null;

  const attribution = decodeAttribution(request.headers.get(SEARCH_ATTR_HEADER))
    || decodeAttribution(request.cookies.get(SEARCH_ATTR_COOKIE)?.value)
    || attributionFromReferer(request.headers.get('referer'));

  return contextFromAttribution(sessionId, attribution);
}

export function cookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}
