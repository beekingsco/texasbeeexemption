import { NextRequest, NextResponse } from 'next/server';
import { createMagicToken } from '@/lib/auth-tokens';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@beeexemption.com';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'scout@beekings.com').split(',').map(e => e.trim().toLowerCase());

function buildAdminMagicEmail(loginUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#EDF6FF;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 16px;">
    <div style="background:#053249;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">🔐 BeeExemption Admin</h1>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;">
      <h2 style="color:#053249;font-size:20px;margin:0 0 12px;">Admin Login</h2>
      <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Click below to access the admin dashboard. This link expires in 15 minutes.
      </p>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${loginUrl}" style="display:inline-block;background:#1C7CE5;color:#fff;font-weight:700;font-size:16px;padding:14px 40px;border-radius:12px;text-decoration:none;">
          Open Admin Dashboard →
        </a>
      </div>
      <p style="color:#9CA3AF;font-size:13px;line-height:1.5;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const normalizedEmail = email.trim().toLowerCase();

    // Always return success to avoid email enumeration
    if (!ADMIN_EMAILS.includes(normalizedEmail)) {
      return NextResponse.json({ ok: true, message: 'If this is an admin email, a login link has been sent.' });
    }

    const token = await createMagicToken(normalizedEmail);
    const origin = req.headers.get('origin') || 'https://beeexemption.com';
    const loginUrl = `${origin}/api/auth/admin-verify?token=${token}`;

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
          subject: 'BeeExemption Admin Login',
          html: buildAdminMagicEmail(loginUrl),
        }),
      });

      if (!resp.ok) {
        console.error('Failed to send admin magic link:', await resp.text());
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, message: 'If this is an admin email, a login link has been sent.' });
  } catch (error) {
    console.error('Admin magic link error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
