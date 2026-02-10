import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, getOrCreatePrice, TierKey, TIERS } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tier, propertyData, county } = body as {
      tier: TierKey;
      propertyData?: Record<string, string>;
      county?: string;
    };

    if (!tier || !TIERS[tier]) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const priceId = await getOrCreatePrice(tier);
    const tierConfig = TIERS[tier];

    // Build metadata from property data
    const metadata: Record<string, string> = {
      tier,
      ...(county && { county }),
      ...(propertyData?.name && { customer_name: propertyData.name }),
      ...(propertyData?.email && { customer_email: propertyData.email }),
      ...(propertyData?.acres && { acres: propertyData.acres }),
      ...(propertyData?.propertyValue && { property_value: propertyData.propertyValue }),
      ...(propertyData?.taxRate && { tax_rate: propertyData.taxRate }),
    };

    // Build the success URL — redirect back to report with access token
    const origin = req.headers.get('origin') || 'https://beeexemption.com';
    
    // Build report params from propertyData
    const reportParams = new URLSearchParams();
    if (propertyData) {
      Object.entries(propertyData).forEach(([key, value]) => {
        if (value) reportParams.set(key, value);
      });
    }
    if (county) reportParams.set('county', county);
    
    const isAgent = tier === 'agent' || tier === 'county_addon';
    const successUrl = isAgent 
      ? `${origin}/agent/login?welcome=true&session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/report/success?session_id={CHECKOUT_SESSION_ID}&${reportParams.toString()}`;
    const cancelUrl = isAgent
      ? `${origin}/agents`
      : `${origin}/report?${reportParams.toString()}`;

    // Create checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: tierConfig.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_intent_data: tierConfig.mode === 'payment' ? { metadata } : undefined,
      subscription_data: tierConfig.mode === 'subscription' ? {
        metadata,
        ...('trialDays' in tierConfig && tierConfig.trialDays
          ? { trial_period_days: tierConfig.trialDays }
          : {}),
      } : undefined,
    };

    // If we have an email, prefill it
    if (propertyData?.email) {
      sessionParams.customer_email = propertyData.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
