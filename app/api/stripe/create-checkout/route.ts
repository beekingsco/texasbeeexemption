import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, getOrCreatePrice, TierKey, TIERS } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tier, propertyData, county, agentName, agentEmail, agentBrokerage, agentPhone, agentCounties, couponCode } = body as {
      tier: TierKey;
      propertyData?: Record<string, string>;
      county?: string;
      agentName?: string;
      agentEmail?: string;
      agentBrokerage?: string;
      agentPhone?: string;
      agentCounties?: string;
      couponCode?: string;
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
      // Agent signup fields
      ...(agentName && { agent_name: agentName }),
      ...(agentEmail && { agent_email: agentEmail }),
      ...(agentBrokerage && { agent_brokerage: agentBrokerage }),
      ...(agentPhone && { agent_phone: agentPhone }),
      ...(agentCounties && { agent_counties: agentCounties.substring(0, 500) }),
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
    if (agentEmail) {
      sessionParams.customer_email = agentEmail;
    } else if (propertyData?.email) {
      sessionParams.customer_email = propertyData.email;
    }

    // Apply coupon if provided
    if (couponCode) {
      try {
        // Try as promotion code first
        const promoCodes = await stripe.promotionCodes.list({ code: couponCode, active: true, limit: 1 });
        if (promoCodes.data.length > 0) {
          sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
        } else {
          // Try as coupon directly
          const coupon = await stripe.coupons.retrieve(couponCode);
          if (coupon && coupon.valid) {
            sessionParams.discounts = [{ coupon: coupon.id }];
          }
        }
      } catch {
        // Coupon not found, continue without it
        console.warn('Coupon not found:', couponCode);
      }
      // Remove trial if discounts are applied (Stripe doesn't allow both with some configurations)
      // Actually keep trial — Stripe allows discounts + trial together
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
