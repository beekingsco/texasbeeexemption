import { NextRequest, NextResponse } from 'next/server';
import { getAgents, getAgentLeads } from '@/lib/agent-storage';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'beekings2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const agentId = searchParams.get('agentId');

    // If agentId provided, return that agent's leads
    if (agentId) {
      const leads = await getAgentLeads(agentId);
      return NextResponse.json({
        leads: leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      });
    }

    // Otherwise return all agents with lead counts
    const agents = await getAgents();
    const agentsWithCounts = await Promise.all(
      agents.map(async (agent) => {
        const leads = await getAgentLeads(agent.id);
        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          brokerage: agent.brokerage,
          phone: agent.phone,
          logoUrl: agent.logoUrl,
          subdomain: agent.subdomain,
          licensedCounties: agent.licensedCounties,
          subscription: agent.subscription,
          createdAt: agent.createdAt,
          leadsCount: leads.length,
        };
      })
    );

    return NextResponse.json({
      agents: agentsWithCounts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    });
  } catch (error) {
    console.error('Admin agents error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
