import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { createAgent, getAgentByEmail } from '@/lib/agent-storage';
import { Agent } from '@/lib/types/agent';
import { validateCoupon, redeemCoupon } from '@/lib/coupon-storage';
import { notifyAdmin } from '@/lib/notify';

export async function POST(req: NextRequest) {
  try {
    const { name, email, brokerage, phone, counties, couponCode, plan } = await req.json();

    if (!name || !email || !brokerage || !phone || !couponCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate coupon — must be always_free
    const couponResult = await validateCoupon(couponCode);
    if (!couponResult.valid || couponResult.coupon?.type !== 'always_free') {
      return NextResponse.json({ error: 'Invalid coupon for free signup' }, { status: 400 });
    }

    // Check if agent already exists
    const existing = await getAgentByEmail(email.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Create agent with always-free status
    const passwordHash = await bcrypt.hash(randomUUID(), 10);
    const licensedCounties = counties === 'ALL' ? ['ALL'] : counties.split(',').map((c: string) => c.trim()).filter(Boolean);

    const agent: Agent = {
      id: randomUUID(),
      email: email.trim().toLowerCase(),
      passwordHash,
      name: name.trim(),
      brokerage: brokerage.trim(),
      phone: phone.trim(),
      licenseNumber: '',
      licensedCounties,
      createdAt: new Date().toISOString(),
      subscription: { status: 'active' as const },
      couponCode,
    };

    await createAgent(agent);
    await redeemCoupon(couponCode, agent.id);

    notifyAdmin('agent_trial_started', {
      agentName: agent.name,
      agentEmail: agent.email,
      tier: 'agent_free',
    });

    return NextResponse.json({ ok: true, agentId: agent.id });
  } catch (error: any) {
    console.error('Free signup error:', error?.message, error?.stack);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
