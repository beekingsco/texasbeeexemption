import { createHash } from 'crypto';
import { normalizeAlertAddress } from '@/lib/normalize-address';
import { supabaseRpc } from '@/lib/supabase-rest';

export const SEARCH_ALERT_WINDOW_MS = 60_000;
const recent = new Map<string, number>();

export function searchAlertKey(address: string, ip: string | null): string {
  const addressNorm = normalizeAlertAddress(address);
  const ipKey = (ip || 'no-ip').trim().slice(0, 80) || 'no-ip';
  return `${addressNorm}|${ipKey}`;
}

/** Stable for the same address + IP inside one 60s bucket. Resend uses this as Idempotency-Key. */
export function searchAlertIdempotencyKey(address: string, ip: string | null, now = Date.now()): string {
  const bucket = Math.floor(now / SEARCH_ALERT_WINDOW_MS);
  const digest = createHash('sha256').update(`${searchAlertKey(address, ip)}|${bucket}`).digest('hex');
  return `bee-search-${digest}`;
}

function memoryClaim(key: string, now: number): boolean {
  const prev = recent.get(key);
  if (prev != null && now - prev < SEARCH_ALERT_WINDOW_MS) return false;
  recent.set(key, now);
  if (recent.size > 500) {
    for (const [entry, at] of recent) {
      if (now - at > SEARCH_ALERT_WINDOW_MS) recent.delete(entry);
    }
  }
  return true;
}

/**
 * One alert per normalized address + IP inside 60 seconds.
 * Same-instance duplicates are stopped in memory before any await, so two
 * overlapping requests on this isolate cannot both pass.
 * After bee_search_alert_dedupe is migrated, claim_bee_search_alert stops
 * duplicates across serverless instances. address_searches is not the lock:
 * geocoding already writes that row before the alert.
 * Returns true when this request should send the email.
 */
export async function claimSearchAlert(address: string, ip: string | null, now = Date.now()): Promise<boolean> {
  const addressNorm = normalizeAlertAddress(address);
  if (!addressNorm) return true;
  if (!memoryClaim(searchAlertKey(address, ip), now)) return false;

  const ipKey = (ip || 'no-ip').trim().slice(0, 80) || 'no-ip';
  const rpc = await supabaseRpc('claim_bee_search_alert', {
    p_address: addressNorm,
    p_ip: ipKey,
  });
  if (rpc === false) return false;
  return true;
}

export function resetSearchAlertDedupeForTests(): void {
  recent.clear();
}
