import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken, createSessionToken } from '@/lib/auth-tokens';
import { getAgentByEmail } from '@/lib/agent-storage';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/agent/login?error=missing_token', req.url));
    }

    // Verify the magic token
    const email = await verifyMagicToken(token);
    if (!email) {
      return NextResponse.redirect(new URL('/agent/login?error=invalid_token', req.url));
    }

    // Find agent
    const agent = await getAgentByEmail(email);
    if (!agent) {
      return NextResponse.redirect(new URL('/agent/login?error=agent_not_found', req.url));
    }

    // Create session token
    const sessionToken = createSessionToken(agent.id);

    // Set cookie and redirect to dashboard
    const response = NextResponse.redirect(new URL('/agent/dashboard', req.url));
    response.cookies.set('bee_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.redirect(new URL('/agent/login?error=verification_failed', req.url));
  }
}
