import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAlertAddress } from '@/lib/normalize-address';
import {
  claimSearchAlert,
  resetSearchAlertDedupeForTests,
  searchAlertIdempotencyKey,
} from '@/lib/search-alert-dedupe';
import {
  finishSearch,
  resetSearchSubmitGuardForTests,
  startSearch,
} from '@/lib/search-submit-guard';

const NOW = Date.parse('2026-09-28T00:25:09.000Z');
const IP = '203.0.113.10';

/**
 * Stand-in for Resend. The real API stores Idempotency-Key for 24h and
 * does not send a second email for the same key.
 */
async function sendOnce(
  address: string,
  ip: string,
  sent: Map<string, string>,
  now: number,
): Promise<void> {
  const key = searchAlertIdempotencyKey(address, ip, now);
  const claimed = await claimSearchAlert(address, ip, now);
  if (!claimed) return;
  if (sent.has(key)) return;
  sent.set(key, address);
}

test('punctuation and USA suffixes are the same search', () => {
  assert.equal(
    normalizeAlertAddress('33027 Hollywood, FL, USA'),
    normalizeAlertAddress('33027, Hollywood, FL'),
  );
  assert.equal(
    normalizeAlertAddress('Bokeelia, FL, USA'),
    normalizeAlertAddress('bokeelia fl'),
  );
});

test('Enter plus a suggestion click posts one search alert', async () => {
  resetSearchSubmitGuardForTests();
  const posts: string[] = [];

  // Production fired both of these with no shared lock. The typed text and
  // the suggestion text are different strings for the same place.
  const typed = startSearch('33027 Hollywood FL', NOW);
  const suggestion = startSearch('33027, Hollywood, FL, USA', NOW + 50);
  if (typed === 'run') posts.push('33027 Hollywood, FL, USA');
  if (suggestion === 'run') posts.push('33027, Hollywood, FL, USA');
  finishSearch(typed !== 'ignore', ['33027 Hollywood FL', '33027 Hollywood, FL, USA'], NOW + 800);

  assert.deepEqual(posts, ['33027 Hollywood, FL, USA']);
  assert.equal(suggestion, 'ignore');
});

test('two contacts posts one second apart send one email', async () => {
  resetSearchAlertDedupeForTests();
  const sent = new Map<string, string>();
  const geocoded = '33027 Hollywood, FL, USA';
  const suggestion = '33027, Hollywood, FL';

  await Promise.all([
    sendOnce(geocoded, IP, sent, NOW),
    sendOnce(suggestion, IP, sent, NOW + 1000),
  ]);

  assert.equal(sent.size, 1);
  assert.equal(searchAlertIdempotencyKey(geocoded, IP, NOW), searchAlertIdempotencyKey(suggestion, IP, NOW + 1000));
});

test('a second isolate still produces one Resend send', async () => {
  resetSearchAlertDedupeForTests();
  const sent = new Map<string, string>();
  const address = 'Bokeelia, FL, USA';

  await sendOnce(address, IP, sent, NOW);
  resetSearchAlertDedupeForTests();
  await sendOnce('bokeelia fl', IP, sent, NOW + 1000);

  assert.equal(sent.size, 1);
});

test('a search after the 60s window can email again', async () => {
  resetSearchAlertDedupeForTests();
  const sent = new Map<string, string>();
  await sendOnce('Bokeelia, FL', IP, sent, NOW);
  await sendOnce('Bokeelia, FL', IP, sent, NOW + 61_000);
  assert.equal(sent.size, 2);
});
