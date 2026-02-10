import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ paid: false, error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const paid =
      session.payment_status === 'paid' ||
      (session.mode === 'subscription' && session.status === 'complete');

    return NextResponse.json({
      paid,
      tier: session.metadata?.tier || 'single',
      customerEmail: session.customer_email,
      metadata: session.metadata,
    });
  } catch (error) {
    console.error('Stripe verify error:', error);
    return NextResponse.json({ paid: false, error: 'Invalid session' }, { status: 400 });
  }
}
