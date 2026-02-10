import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth-tokens';
import { getAgentById } from '@/lib/agent-storage';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('bee_session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const agentId = verifySessionToken(sessionCookie);
    if (!agentId) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Return agent without password hash
    const { passwordHash: _, ...agentData } = agent;
    return NextResponse.json({ agent: agentData });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ error: 'Session error' }, { status: 500 });
  }
}

// POST — logout
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('action') === 'logout') {
    const response = NextResponse.json({ ok: true });
    response.cookies.set('bee_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return response;
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
