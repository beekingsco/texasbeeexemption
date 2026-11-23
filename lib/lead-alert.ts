import { createHash } from 'crypto';

/** Stable per email address. Resend keeps an Idempotency-Key for 24 hours. */
export function leadAlertIdempotencyKey(email: string): string {
  const normalized = email.trim().toLowerCase();
  const digest = createHash('sha256').update(normalized).digest('hex');
  return `bee-lead-${digest}`;
}
