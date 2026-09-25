import { isOwnHost, readServerSearchContext, type SearchContext } from '@/lib/search-attribution';

/** Production domain for this site. Used as the lead and search source value. */
export const SITE_SOURCE = 'beeexemption.com';

export type EntryPoint = {
  code: string;
  label: string;
};

type HeaderReader = { get(name: string): string | null };
type CookieReader = { get(name: string): { value: string } | undefined };

export function isQrMarker(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '');
  return normalized === 'qr' || normalized === 'qrcode' || normalized === 'qrcodes';
}

/** External referrer only. Same-site addresses are not an entry point. */
export function externalReferrer(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (isOwnHost(url.hostname)) return null;
    return trimmed.slice(0, 500);
  } catch {
    return null;
  }
}

function referrerHost(value: string | null | undefined): string | null {
  const referrer = externalReferrer(value);
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./i, '');
  } catch {
    return referrer.slice(0, 120);
  }
}

/**
 * Entry is `qr` when the visit used a QR link (`?src=qr` or a utm value of qr).
 * Otherwise it is the UTM source/medium/campaign, another `src` value,
 * an external referrer, or `direct`.
 */
export function entryPoint(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  src?: string | null;
  referrer?: string | null;
}): EntryPoint {
  if (
    isQrMarker(input.src) ||
    isQrMarker(input.utmSource) ||
    isQrMarker(input.utmMedium) ||
    isQrMarker(input.utmCampaign)
  ) {
    return { code: 'qr', label: 'QR code' };
  }

  const utm = [input.utmSource, input.utmMedium, input.utmCampaign]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);
  if (utm.length > 0) {
    const label = utm.join(' / ');
    return { code: label, label };
  }

  const src = input.src?.trim();
  if (src) return { code: src, label: src };

  const host = referrerHost(input.referrer);
  if (host) return { code: 'referrer', label: `referrer: ${host}` };
  return { code: 'direct', label: 'direct' };
}

export function entryFromContext(context: SearchContext): EntryPoint {
  return entryPoint({
    utmSource: context.utmSource,
    utmMedium: context.utmMedium,
    utmCampaign: context.utmCampaign,
    src: context.src,
    referrer: context.referrer,
  });
}

export function leadAttribution(request: { headers: HeaderReader; cookies: CookieReader }): {
  source: string;
  entry: string;
  entryLabel: string;
  context: SearchContext;
} {
  const context = readServerSearchContext(request);
  const entry = entryFromContext(context);
  return {
    source: SITE_SOURCE,
    entry: entry.code,
    entryLabel: entry.label,
    context,
  };
}
