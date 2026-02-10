import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import { createAdminToken, isAdminEmail } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/admin?error=missing_token', req.url));
    }

    // Look up OTP from Vercel Blob
    const blobs = await list({ prefix: `auth/admin-otp/${token}` });
    if (blobs.blobs.length === 0) {
      return NextResponse.redirect(new URL('/admin?error=invalid_token', req.url));
    }

    const blob = blobs.blobs[0];
    const resp = await fetch(blob.url);
    const data = await resp.json();

    // Delete the OTP (one-time use)
    await del(blob.url);

    if (!data.email || !data.expiresAt) {
      return NextResponse.redirect(new URL('/admin?error=invalid_token', req.url));
    }

    if (Date.now() > data.expiresAt) {
      return NextResponse.redirect(new URL('/admin?error=expired', req.url));
    }

    if (!isAdminEmail(data.email)) {
      return NextResponse.redirect(new URL('/admin?error=unauthorized', req.url));
    }

    // Create admin session token
    const adminToken = createAdminToken(data.email);

    // Set cookie and redirect to admin
    const response = NextResponse.redirect(new URL('/admin', req.url));
    response.cookies.set('bee_admin', adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Admin verify error:', error);
    return NextResponse.redirect(new URL('/admin?error=verification_failed', req.url));
  }
}
