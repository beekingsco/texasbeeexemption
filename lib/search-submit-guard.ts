import { normalizeAlertAddress } from '@/lib/normalize-address';

const WINDOW_MS = 60_000;
let inFlight = false;
const recent = new Map<string, number>();

export type SearchClaim = 'run' | 'run-silent' | 'ignore';

/**
 * One search at a time in this tab.
 * run: first search, and it should email.
 * run-silent: this address already emailed within 60s. The lookup can run
 * again (Try Again) but the caller must not post another search alert.
 * ignore: a search is already in flight. Enter plus a suggestion click, or a
 * second click before React re-renders, hits this even when the two address
 * strings are not the same.
 */
export function startSearch(address: string, now = Date.now()): SearchClaim {
  const key = normalizeAlertAddress(address);
  if (!key || inFlight) return 'ignore';
  inFlight = true;
  const prev = recent.get(key);
  if (prev != null && now - prev < WINDOW_MS) return 'run-silent';
  return 'run';
}

export function finishSearch(accepted: boolean, addresses: string[], now = Date.now()): void {
  inFlight = false;
  if (!accepted) return;
  for (const address of addresses) {
    const key = normalizeAlertAddress(address);
    if (key) recent.set(key, now);
  }
}

export function resetSearchSubmitGuardForTests(): void {
  inFlight = false;
  recent.clear();
}
