import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth-tokens';
import { getAgentById, updateAgent } from '@/lib/agent-storage';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('bee_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const agentId = verifySessionToken(sessionCookie);
    if (!agentId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await req.json();
    const { county } = body as { county: string };

    if (!county) {
      return NextResponse.json({ error: 'county is required' }, { status: 400 });
    }

    // Validate county exists
    if (!agent.licensedCounties.includes(county)) {
      return NextResponse.json({ error: `${county} is not in your licensed counties` }, { status: 400 });
    }

    // Must keep at least 1 county
    if (agent.licensedCounties.length <= 1) {
      return NextResponse.json({ error: 'You must keep at least one licensed county' }, { status: 400 });
    }

    const updatedCounties = agent.licensedCounties.filter(c => c !== county);

    await updateAgent(agentId, { licensedCounties: updatedCounties });

    return NextResponse.json({ success: true, counties: updatedCounties });
  } catch (error) {
    console.error('County remove error:', error);
    return NextResponse.json({ error: 'County removal failed' }, { status: 500 });
  }
}
