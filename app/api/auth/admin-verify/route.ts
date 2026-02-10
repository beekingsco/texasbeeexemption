import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken, createSessionToken } from '@/lib/auth-tokens';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'scout@beekings.com').split(',').map(e => e.trim().toLowerCase());
const ADMIN_KEY = process.env.ADMIN_KEY || 'beekings2026';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/admin?error=missing-token', req.url));
  }

  const email = await verifyMagicToken(token);
  if (!email || !ADMIN_EMAILS.includes(email.toLowerCase())) {
    return NextResponse.redirect(new URL('/admin?error=invalid-token', req.url));
  }

  // Redirect to admin with the key in a secure way (hash fragment, not exposed in server logs)
  const sessionToken = createSessionToken(`admin-${email}`);
  const response = NextResponse.redirect(new URL(`/admin#${ADMIN_KEY}`, req.url));
  
  // Also set a cookie for future visits
  response.cookies.set('admin_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/admin',
  });

  return response;
}
