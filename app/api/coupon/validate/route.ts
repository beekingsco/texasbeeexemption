import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/coupon-storage';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

    const result = await validateCoupon(code);
    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 200 });
    }

    const coupon = result.coupon!;
    return NextResponse.json({
      valid: true,
      description: coupon.description,
      type: coupon.type,
      trialDays: coupon.trialDays,
      maxCounties: coupon.maxCounties,
      remainingUses: coupon.maxRedemptions > 0 ? coupon.maxRedemptions - coupon.redemptions : null,
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
