import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth-tokens';
import { getAgentLeads, addAgentLead, updateAgentLead, deleteAgentLead } from '@/lib/agent-storage';
import { AgentLead } from '@/lib/types/agent';

function getAgentIdFromSession(req: NextRequest): string | null {
  const sessionCookie = req.cookies.get('bee_session')?.value;
  if (!sessionCookie) return null;
  return verifySessionToken(sessionCookie);
}

// GET - Fetch all leads for the authenticated agent
export async function GET(req: NextRequest) {
  try {
    const agentId = getAgentIdFromSession(req);
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leads = await getAgentLeads(agentId);
    return NextResponse.json({ leads: leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new lead
export async function POST(req: NextRequest) {
  try {
    const agentId = getAgentIdFromSession(req);
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { propertyAddress, county, state, ownerName, acres, appraisedValue, estimatedSavings, reportUrl } = body;

    if (!propertyAddress || !county) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const lead: AgentLead = {
      id: crypto.randomUUID(),
      agentId,
      propertyAddress,
      county,
      state: state || 'TX',
      ownerName,
      acres: acres || 0,
      appraisedValue: appraisedValue || 0,
      estimatedSavings: estimatedSavings || 0,
      status: 'new',
      reportUrl,
      createdAt: new Date().toISOString(),
    };

    await addAgentLead(agentId, lead);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a lead
export async function PATCH(req: NextRequest) {
  try {
    const agentId = getAgentIdFromSession(req);
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, notes, ownerName } = body;

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const updates: Partial<AgentLead> = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (ownerName !== undefined) updates.ownerName = ownerName;

    const updatedLead = await updateAgentLead(agentId, id, updates);
    if (!updatedLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a lead
export async function DELETE(req: NextRequest) {
  try {
    const agentId = getAgentIdFromSession(req);
    if (!agentId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const deleted = await deleteAgentLead(agentId, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
