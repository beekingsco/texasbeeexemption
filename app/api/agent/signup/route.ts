import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAgent, getAgentByEmail } from '@/lib/agent-storage';
import { Agent } from '@/lib/types/agent';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, brokerage, phone, licenseNumber, licensedCounties, subdomain, logo } = body;

    // Validate required fields
    if (!name || !email || !password || !brokerage || !phone || !licenseNumber || !licensedCounties) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if agent already exists
    const existingAgent = await getAgentByEmail(email);
    if (existingAgent) {
      return NextResponse.json(
        { error: 'Agent with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Handle logo upload if provided
    let logoUrl: string | undefined;
    if (logo) {
      try {
        // logo should be base64 data URL
        const base64Data = logo.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const agentId = crypto.randomUUID();
        const blob = await put(`agents/logos/${agentId}.png`, buffer, {
          access: 'public',
          contentType: 'image/png',
        });
        logoUrl = blob.url;
      } catch (error) {
        console.error('Error uploading logo:', error);
        // Continue without logo
      }
    }

    // Create agent
    const agent: Agent = {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      name,
      brokerage,
      phone,
      licenseNumber,
      logoUrl,
      subdomain,
      licensedCounties,
      createdAt: new Date().toISOString(),
      subscription: {
        status: 'trial',
      },
    };

    await createAgent(agent);

    // Return agent without password hash
    const { passwordHash: _, ...agentWithoutPassword } = agent;
    return NextResponse.json({ agent: agentWithoutPassword }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
