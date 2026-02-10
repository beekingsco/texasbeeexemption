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
    const { oldCounty, newCounty } = body as { oldCounty: string; newCounty: string };

    if (!oldCounty || !newCounty) {
      return NextResponse.json({ error: 'oldCounty and newCounty are required' }, { status: 400 });
    }

    // Validate oldCounty is in agent's licensedCounties
    if (!agent.licensedCounties.includes(oldCounty)) {
      return NextResponse.json({ error: `${oldCounty} is not in your licensed counties` }, { status: 400 });
    }

    // Check 30-day cooldown
    if (agent.lastCountyChange) {
      const lastChange = new Date(agent.lastCountyChange);
      const thirtyDaysLater = new Date(lastChange.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (new Date() < thirtyDaysLater) {
        return NextResponse.json({
          error: `County change available after ${thirtyDaysLater.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          nextChangeDate: thirtyDaysLater.toISOString(),
        }, { status: 429 });
      }
    }

    // Update counties: remove old, add new
    const updatedCounties = agent.licensedCounties
      .filter(c => c !== oldCounty)
      .concat(newCounty);

    await updateAgent(agentId, {
      licensedCounties: updatedCounties,
      lastCountyChange: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, counties: updatedCounties });
  } catch (error) {
    console.error('County change error:', error);
    return NextResponse.json({ error: 'County change failed' }, { status: 500 });
  }
}
