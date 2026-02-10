import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAgent, getAgentByEmail } from '@/lib/agent-storage';
import { Agent } from '@/lib/types/agent';
import { put } from '@vercel/blob';
import { validateCoupon, redeemCoupon } from '@/lib/coupon-storage';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, brokerage, phone, licenseNumber, licensedCounties, subdomain, logo, couponCode } = body;

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

    // Validate coupon if provided
    let appliedCoupon = null;
    if (couponCode) {
      const couponResult = await validateCoupon(couponCode);
      if (!couponResult.valid) {
        return NextResponse.json({ error: couponResult.error }, { status: 400 });
      }
      appliedCoupon = couponResult.coupon!;
      // Enforce county limit from coupon
      if (licensedCounties.length > appliedCoupon.maxCounties) {
        return NextResponse.json(
          { error: `This coupon is limited to ${appliedCoupon.maxCounties} county${appliedCoupon.maxCounties > 1 ? 'ies' : ''}` },
          { status: 400 }
        );
      }
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
      subscription: appliedCoupon?.type === 'always_free'
        ? { status: 'active' as const }
        : {
            status: 'trial' as const,
            ...(appliedCoupon?.trialDays && {
              currentPeriodEnd: new Date(Date.now() + appliedCoupon.trialDays * 86400000).toISOString(),
            }),
          },
      couponCode: appliedCoupon?.code,
    };

    await createAgent(agent);

    // Redeem coupon after successful creation
    if (couponCode && appliedCoupon) {
      await redeemCoupon(couponCode, agent.id);
    }

    // Return agent without password hash
    const { passwordHash: _, ...agentWithoutPassword } = agent;
    return NextResponse.json({ agent: agentWithoutPassword }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating agent:', error?.message, error?.stack);
    return NextResponse.json(
      { error: 'Internal server error', detail: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
