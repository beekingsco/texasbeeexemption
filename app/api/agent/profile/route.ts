import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAgentById, updateAgent } from '@/lib/agent-storage';
import { put } from '@vercel/blob';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agent = await getAgentById(session.user.id);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Return agent without password hash
    const { passwordHash: _, ...agentWithoutPassword } = agent;
    return NextResponse.json({ agent: agentWithoutPassword });
  } catch (error) {
    console.error('Error fetching agent profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, brokerage, phone, licenseNumber, licensedCounties, subdomain, logo } = body;

    const updates: any = {};
    if (name) updates.name = name;
    if (brokerage) updates.brokerage = brokerage;
    if (phone) updates.phone = phone;
    if (licenseNumber) updates.licenseNumber = licenseNumber;
    if (licensedCounties) updates.licensedCounties = licensedCounties;
    if (subdomain !== undefined) updates.subdomain = subdomain;

    // Handle logo upload if provided
    if (logo) {
      try {
        const base64Data = logo.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = await put(`agents/logos/${session.user.id}.png`, buffer, {
          access: 'public',
          contentType: 'image/png',
        });
        updates.logoUrl = blob.url;
      } catch (error) {
        console.error('Error uploading logo:', error);
      }
    }

    const updatedAgent = await updateAgent(session.user.id, updates);
    if (!updatedAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Return agent without password hash
    const { passwordHash: _, ...agentWithoutPassword } = updatedAgent;
    return NextResponse.json({ agent: agentWithoutPassword });
  } catch (error) {
    console.error('Error updating agent profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
