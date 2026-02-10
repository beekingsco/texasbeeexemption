import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth-tokens';
import { getAgentById, updateAgent } from '@/lib/agent-storage';

// POST — save onboarding progress
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
    const { step, county, subdomain } = body;

    const updates: Record<string, unknown> = {};

    if (step === 'county' && county) {
      // Add county to licensedCounties if not already there
      const countyKey = `TX-${county}`;
      if (!agent.licensedCounties.includes(countyKey)) {
        updates.licensedCounties = [...agent.licensedCounties, countyKey];
      }
    }

    if (step === 'slug' && subdomain) {
      updates.subdomain = subdomain;
    }

    if (Object.keys(updates).length > 0) {
      const updated = await updateAgent(agentId, updates as Partial<typeof agent>);
      if (!updated) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
      }
      const { passwordHash: _, ...agentData } = updated;
      return NextResponse.json({ agent: agentData });
    }

    return NextResponse.json({ agent: { ...agent, passwordHash: undefined } });
  } catch (error) {
    console.error('Onboard error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
