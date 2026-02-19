import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@beeexemption.com';

function buildAdminMagicEmail(email: string, loginUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F0F4FA;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 16px;">
    <div style="background:#0D1B2A;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">🐝 BeeExemption</h1>
      <p style="color:#8DA4B5;font-size:13px;margin:4px 0 0;">Admin Dashboard</p>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;">
      <h2 style="color:#0D1B2A;font-size:20px;margin:0 0 12px;">Admin Sign In</h2>
      <p style="color:#5A6A7A;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Click the button below to sign in to the admin dashboard. This link expires in 15 minutes.
      </p>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${loginUrl}" style="display:inline-block;background:#D4A843;color:#0D1B2A;font-weight:700;font-size:16px;padding:14px 40px;border-radius:12px;text-decoration:none;">
          Sign In to Admin →
        </a>
      </div>
      <p style="color:#9CA3AF;font-size:13px;line-height:1.5;">
        If you didn't request this link, you can safely ignore this email.
      </p>
    </div>
    <p style="text-align:center;color:#8DA4B5;font-size:11px;margin:16px 0 0;">
      © ${new Date().getFullYear()} BeeExemption
    </p>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 admin magic link requests per IP per 15 minutes
    const ip = getClientIp(req);
    const rl = checkRateLimit('admin-magic-link', ip, 3, 15 * 60 * 1000);
    if (!rl.allowed) {
      // Return success-like response to avoid leaking rate limit info
      return NextResponse.json({ ok: true, message: 'If this email is authorized, a login link has been sent.' });
    }

    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Always return success to avoid email enumeration
    if (!isAdminEmail(normalizedEmail)) {
      return NextResponse.json({ ok: true, message: 'If this email is authorized, a login link has been sent.' });
    }

    // Create a one-time token stored in memory (simple approach using crypto)
    const otp = crypto.randomUUID();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 min

    // Store OTP in Vercel Blob
    const { put } = await import('@vercel/blob');
    await put(`auth/admin-otp/${otp}.json`, JSON.stringify({ email: normalizedEmail, expiresAt }), {
      access: 'public',
      contentType: 'application/json',
    });

    const origin = req.headers.get('origin') || 'https://beeexemption.com';
    const loginUrl = `${origin}/api/auth/admin-verify?token=${otp}`;

    // Send email via Resend
    if (RESEND_API_KEY) {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `BeeExemption <${FROM_EMAIL}>`,
          to: [normalizedEmail],
          subject: 'Sign in to BeeExemption Admin',
          html: buildAdminMagicEmail(normalizedEmail, loginUrl),
        }),
      });

      if (!resp.ok) {
        console.error('Failed to send admin magic link:', await resp.text());
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
    } else {
      // Dev mode: log the link
      console.log(`[DEV] Admin magic link for ${normalizedEmail}: ${loginUrl}`);
    }

    return NextResponse.json({ ok: true, message: 'If this email is authorized, a login link has been sent.' });
  } catch (error) {
    console.error('Admin magic link error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
