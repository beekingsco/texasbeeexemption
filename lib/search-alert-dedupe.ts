import { normalizeAlertAddress } from '@/lib/normalize-address';
import { supabaseRpc } from '@/lib/supabase-rest';

const WINDOW_MS = 60_000;
const recent = new Map<string, number>();

function memoryClaim(key: string): boolean {
  const prev = recent.get(key);
  const now = Date.now();
  if (prev && now - prev < WINDOW_MS) return false;
  recent.set(key, now);
  if (recent.size > 500) {
    for (const [entry, at] of recent) {
      if (now - at > WINDOW_MS) recent.delete(entry);
    }
  }
  return true;
}

/**
 * One alert per normalized address + IP inside 60 seconds.
 * Same-instance duplicates are stopped in memory immediately.
 * After bee_search_alert_dedupe is migrated, claim_bee_search_alert
 * stops duplicates across serverless instances. address_searches is not
 * used as the lock: geocoding already writes that row before the alert.
 * Returns true when this request should send the email.
 */
export async function claimSearchAlert(address: string, ip: string | null): Promise<boolean> {
  const addressNorm = normalizeAlertAddress(address);
  if (!addressNorm) return true;
  const ipKey = (ip || 'no-ip').trim().slice(0, 80) || 'no-ip';
  const memKey = `${addressNorm}|${ipKey}`;
  if (!memoryClaim(memKey)) return false;

  const rpc = await supabaseRpc('claim_bee_search_alert', {
    p_address: addressNorm,
    p_ip: ipKey,
  });
  if (rpc === false) return false;
  return true;
}
