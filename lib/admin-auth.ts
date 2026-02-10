import { cookies } from 'next/headers';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'bee-admin-secret-dev-2026-xK9mP2';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'scout@beekings.com,millerbrother1@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase());
const LEGACY_KEY = 'beekings2026';

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function createAdminToken(email: string): string {
  const timestamp = Date.now().toString();
  const payload = `admin.${email.toLowerCase()}.${timestamp}`;
  const signature = Buffer.from(`${payload}.${ADMIN_SECRET}`).toString('base64url');
  return `${payload}.${signature}`;
}

export function verifyAdminToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 4 || parts[0] !== 'admin') return null;

    const [prefix, email, timestamp, signature] = parts;
    const payload = `${prefix}.${email}.${timestamp}`;
    const expected = Buffer.from(`${payload}.${ADMIN_SECRET}`).toString('base64url');

    if (signature !== expected) return null;

    // 30-day expiry
    const tokenTime = parseInt(timestamp, 10);
    if (Date.now() - tokenTime > 30 * 24 * 60 * 60 * 1000) return null;

    return email;
  } catch {
    return null;
  }
}

/**
 * Check if a request is authorized for admin access.
 * Accepts: legacy key param, admin JWT via cookie, or Authorization header.
 * Returns the admin email if authorized, null otherwise.
 */
export function checkAdminAuth(request: Request): { authorized: boolean; email?: string } {
  const url = new URL(request.url);

  // 1. Legacy key param (backward compat)
  const key = url.searchParams.get('key');
  if (key === LEGACY_KEY) {
    return { authorized: true, email: 'legacy-key' };
  }

  // 2. Authorization: Bearer <token> header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const email = verifyAdminToken(authHeader.slice(7));
    if (email) return { authorized: true, email };
  }

  // 3. Cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)bee_admin=([^;]+)/);
  if (match) {
    const email = verifyAdminToken(decodeURIComponent(match[1]));
    if (email) return { authorized: true, email };
  }

  return { authorized: false };
}
