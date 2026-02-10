import { NextRequest, NextResponse } from 'next/server';
import { getAgents } from '@/lib/agent-storage';

// GET — look up agent by slug for branded link redirect
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
  }

  try {
    const agents = await getAgents();

    // Try matching by subdomain first, then by derived slug from name
    const agent = agents.find(a => {
      if (a.subdomain && a.subdomain === slug) return true;
      // Derive slug from name
      const derivedSlug = a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return derivedSlug === slug;
    });

    // Also try matching by ID
    const agentById = !agent ? agents.find(a => a.id === slug) : null;
    const found = agent || agentById;

    if (!found) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Only return if subscription is active or trial
    if (found.subscription?.status === 'cancelled') {
      return NextResponse.json({ error: 'Agent subscription inactive' }, { status: 404 });
    }

    return NextResponse.json({
      agentId: found.id,
      agentName: found.name,
      brokerage: found.brokerage,
      logoUrl: found.logoUrl || null,
      counties: found.licensedCounties,
    });
  } catch (error) {
    console.error('Agent lookup error:', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
