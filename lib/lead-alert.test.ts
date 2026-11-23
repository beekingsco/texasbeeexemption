import assert from 'node:assert/strict';
import test from 'node:test';
import { leadAlertIdempotencyKey } from '@/lib/lead-alert';

test('one lead email keeps one Resend idempotency key', () => {
  const first = leadAlertIdempotencyKey(' Chris@Example.com ');
  const second = leadAlertIdempotencyKey('chris@example.com');
  assert.equal(first, second);
  assert.match(first, /^bee-lead-[a-f0-9]{64}$/);
  assert.notEqual(first, leadAlertIdempotencyKey('other@example.com'));
});
