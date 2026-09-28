import { normalizeAlertAddress } from '@/lib/normalize-address';

const WINDOW_MS = 60_000;
const inflight = new Set<string>();
const recent = new Map<string, number>();

export type SearchClaim = 'run' | 'run-silent' | 'ignore';

/**
 * run: this is the first search, and it should send the alert.
 * run-silent: the same address already alerted within 60s, so the lookup
 * can run again but the caller must not post another search alert.
 * ignore: a search for this address is already in flight (double click,
 * Enter plus suggestion click, or two events in the same frame).
 */
export function beginSearch(address: string): SearchClaim {
  const key = normalizeAlertAddress(address);
  if (!key) return 'ignore';
  if (inflight.has(key)) return 'ignore';
  const prev = recent.get(key);
  inflight.add(key);
  if (prev && Date.now() - prev < WINDOW_MS) return 'run-silent';
  return 'run';
}

export function completeSearch(address: string): void {
  const key = normalizeAlertAddress(address);
  if (!key) return;
  inflight.delete(key);
  recent.set(key, Date.now());
}

export function cancelSearch(address: string): void {
  const key = normalizeAlertAddress(address);
  if (!key) return;
  inflight.delete(key);
}
