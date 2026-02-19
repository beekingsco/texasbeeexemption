import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAgent, getAgentByEmail } from '@/lib/agent-storage';
import { createSessionToken } from '@/lib/auth-tokens';
import { Agent } from '@/lib/types/agent';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Retrieve the Stripe checkout session with customer details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    if (!session || session.payment_status === 'unpaid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const email = session.customer_details?.email || session.customer_email;
    const name = session.customer_details?.name || 'Agent';

    if (!email) {
      return NextResponse.json({ error: 'No email found in checkout session' }, { status: 400 });
    }

    // Idempotent: check if agent already exists
    const existingAgent = await getAgentByEmail(email);
    if (existingAgent) {
      // Agent already exists — just create a session and log them in
      const token = createSessionToken(existingAgent.id);
      const response = NextResponse.json({
        ok: true,
        agent: { ...existingAgent, passwordHash: undefined },
        existing: true,
      });
      response.cookies.set('bee_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
      return response;
    }

    // Determine subscription status from Stripe
    let subscriptionStatus: 'trial' | 'active' = 'active';
    let currentPeriodEnd: string | undefined;
    let stripeCustomerId: string | undefined;

    // Get customer ID
    if (typeof session.customer === 'string') {
      stripeCustomerId = session.customer;
    } else if (session.customer && typeof session.customer === 'object' && 'id' in session.customer) {
      stripeCustomerId = session.customer.id;
    }

    // Check subscription for trial info
    const subscription = session.subscription;
    if (subscription && typeof subscription === 'object' && 'status' in subscription) {
      if (subscription.status === 'trialing') {
        subscriptionStatus = 'trial';
        if (subscription.trial_end) {
          currentPeriodEnd = new Date(subscription.trial_end * 1000).toISOString();
        }
      } else if (subscription.status === 'active') {
        subscriptionStatus = 'active';
        // Access current_period_end via type assertion since Stripe types vary
        const sub = subscription as any;
        if (typeof sub.current_period_end === 'number') {
          currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
        }
      }
    }

    // Generate a random password (agent will use magic link to login in future)
    const randomPassword = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    // Create the agent
    const agent: Agent = {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      name,
      brokerage: '',
      phone: '',
      licenseNumber: '',
      licensedCounties: [],
      createdAt: new Date().toISOString(),
      subscription: {
        status: subscriptionStatus,
        stripeCustomerId,
        ...(currentPeriodEnd && { currentPeriodEnd }),
      },
    };

    await createAgent(agent);

    // Create session token and set cookie
    const token = createSessionToken(agent.id);
    const { passwordHash: _, ...agentData } = agent;

    const response = NextResponse.json({
      ok: true,
      agent: agentData,
      existing: false,
    });

    response.cookies.set('bee_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Onboard agent error:', error?.message, error?.stack);
    return NextResponse.json(
      { error: 'Failed to create agent account', detail: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
