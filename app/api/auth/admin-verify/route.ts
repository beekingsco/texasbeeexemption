import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth-tokens';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'scout@beekings.com').split(',').map(e => e.trim().toLowerCase());
const ADMIN_KEY = process.env.ADMIN_KEY || 'beekings2026';
const SESSION_SECRET = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'beeexemption-session-2026';

function verifyAdminToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;

    const [email, expiresStr, signature] = parts;
    const payload = `${email}:${expiresStr}`;
    const expectedSig = Buffer.from(`${payload}:${SESSION_SECRET}`).toString('base64url');

    if (signature !== expectedSig) return null;
    if (Date.now() > parseInt(expiresStr, 10)) return null;

    return email;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/admin?error=missing-token', req.url));
  }

  const email = verifyAdminToken(token);
  if (!email || !ADMIN_EMAILS.includes(email.toLowerCase())) {
    return NextResponse.redirect(new URL('/admin?error=invalid-token', req.url));
  }

  const sessionToken = createSessionToken(`admin-${email}`);
  const response = NextResponse.redirect(new URL(`/admin#${ADMIN_KEY}`, req.url));

  response.cookies.set('admin_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/admin',
  });

  return response;
}
