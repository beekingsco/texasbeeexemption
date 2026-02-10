import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { verifySessionToken } from '@/lib/auth-tokens';
import { getAgentById } from '@/lib/agent-storage';

export async function POST(req: NextRequest) {
  try {
    // Authenticate via session cookie
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
    const customerId = body.customerId || agent.subscription?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
    }

    // Verify the customer ID matches the agent's records
    if (agent.subscription?.stripeCustomerId && customerId !== agent.subscription.stripeCustomerId) {
      return NextResponse.json({ error: 'Customer mismatch' }, { status: 403 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://beeexemption.com'}/agent/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
