import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAgentLeads, addAgentLead, updateAgentLead, deleteAgentLead } from '@/lib/agent-storage';
import { AgentLead } from '@/lib/types/agent';

// GET - Fetch all leads for the authenticated agent
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leads = await getAgentLeads(session.user.id);
    return NextResponse.json({ leads });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to process reports request', detail: String(error) },
      { status: 500 }
    );
  }
}

// POST - Create a new lead
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { propertyAddress, county, state, ownerName, acres, appraisedValue, estimatedSavings, reportUrl } = body;

    // Validate required fields
    if (!propertyAddress || !county || !state || !acres || !appraisedValue || !estimatedSavings) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const lead: AgentLead = {
      id: crypto.randomUUID(),
      agentId: session.user.id,
      propertyAddress,
      county,
      state,
      ownerName,
      acres,
      appraisedValue,
      estimatedSavings,
      status: 'new',
      reportUrl,
      createdAt: new Date().toISOString(),
    };

    await addAgentLead(session.user.id, lead);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Failed to process reports request', detail: String(error) },
      { status: 500 }
    );
  }
}

// PATCH - Update a lead
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, notes, ownerName } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (ownerName !== undefined) updates.ownerName = ownerName;

    const updatedLead = await updateAgentLead(session.user.id, id, updates);
    if (!updatedLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ lead: updatedLead });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: 'Failed to process reports request', detail: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Delete a lead
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteAgentLead(session.user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { error: 'Failed to process reports request', detail: String(error) },
      { status: 500 }
    );
  }
}
