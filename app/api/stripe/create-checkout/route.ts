import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, getOrCreatePrice, TierKey, TIERS } from '@/lib/stripe';
import { validateCoupon, redeemCoupon } from '@/lib/coupons';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tier, propertyData, county, couponCode } = body as {
      tier: TierKey;
      propertyData?: Record<string, string>;
      county?: string;
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
    
    const successUrl = `${origin}/report/success?session_id={CHECKOUT_SESSION_ID}&${reportParams.toString()}`;
    const cancelUrl = `${origin}/report?${reportParams.toString()}`;

    // Handle coupon logic for agent tier
    let trialDays: number | undefined;
    let stripeCouponId: string | undefined;

    if (tier === 'agent' && couponCode) {
      const couponResult = validateCoupon(couponCode);
      if (couponResult.valid && couponResult.coupon) {
        const c = couponResult.coupon;
        metadata.coupon_code = c.code;
        metadata.coupon_campaign = c.campaign;

        if (c.type === 'trial') {
          trialDays = c.value;
        } else if (c.type === 'discount') {
          // Create a one-time Stripe coupon for the discount
          const sc = await stripe.coupons.create({
            percent_off: c.value,
            duration: 'once',
            name: `Promo ${c.code}`,
          });
          stripeCouponId = sc.id;
        }
        redeemCoupon(couponCode);
      }
    }

    // For agent tier without coupon, no trial (trial is coupon-based now)
    const subscriptionTrialDays: number | undefined = tier === 'agent' ? trialDays : ('trialDays' in tierConfig ? (tierConfig as { trialDays?: number }).trialDays : undefined);

    // Create checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: tierConfig.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
      payment_intent_data: tierConfig.mode === 'payment' ? { metadata } : undefined,
      subscription_data: tierConfig.mode === 'subscription' ? {
        metadata,
        ...(subscriptionTrialDays ? { trial_period_days: subscriptionTrialDays } : {}),
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
