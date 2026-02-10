import { NextRequest, NextResponse } from 'next/server';
import { createMagicToken } from '@/lib/auth-tokens';
import { getAgentByEmail } from '@/lib/agent-storage';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@beeexemption.com';

function buildMagicLinkEmail(name: string, loginUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#EDF6FF;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 16px;">
    <div style="background:#053249;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">🐝 BeeExemption</h1>
      <p style="color:#8DA4B5;font-size:13px;margin:4px 0 0;">Agent Portal</p>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;">
      <h2 style="color:#053249;font-size:20px;margin:0 0 12px;">Hi ${name},</h2>
      <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Click the button below to sign in to your agent dashboard. This link expires in 15 minutes.
      </p>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${loginUrl}" style="display:inline-block;background:#F59E0B;color:#fff;font-weight:700;font-size:16px;padding:14px 40px;border-radius:12px;text-decoration:none;">
          Sign In to Dashboard →
        </a>
      </div>
      <p style="color:#9CA3AF;font-size:13px;line-height:1.5;">
        If you didn't request this link, you can safely ignore this email.
      </p>
    </div>
    <p style="text-align:center;color:#8DA4B5;font-size:11px;margin:16px 0 0;">
      © ${new Date().getFullYear()} BeeExemption · Agent Portal
    </p>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if agent exists
    const agent = await getAgentByEmail(email);
    if (!agent) {
      // Don't reveal whether email exists — always show success
      return NextResponse.json({ ok: true, message: 'If an account exists, a login link has been sent.' });
    }

    // Create magic link token
    const token = await createMagicToken(email);

    // Build login URL
    const origin = req.headers.get('origin') || 'https://beeexemption.com';
    const loginUrl = `${origin}/api/auth/verify?token=${token}`;

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
          to: [email],
          subject: 'Sign in to BeeExemption Agent Portal',
          html: buildMagicLinkEmail(agent.name, loginUrl),
        }),
      });

      if (!resp.ok) {
        console.error('Failed to send magic link email:', await resp.text());
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, message: 'If an account exists, a login link has been sent.' });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
