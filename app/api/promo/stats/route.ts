import { NextRequest, NextResponse } from 'next/server';
import { readCoupons } from '@/lib/coupons';

export async function GET(req: NextRequest) {
  // Check bearer token auth
  const authHeader = req.headers.get('authorization');
  const expectedKey = process.env.ADMIN_API_KEY;
  
  if (!expectedKey || !authHeader || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const coupons = readCoupons();
    
    const stats = coupons.map(coupon => {
      const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
      const isMaxedOut = coupon.maxRedemptions !== null && coupon.currentRedemptions >= coupon.maxRedemptions;
      
      return {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        campaign: coupon.campaign,
        active: coupon.active,
        redemptions: {
          current: coupon.currentRedemptions,
          max: coupon.maxRedemptions,
          remaining: coupon.maxRedemptions !== null 
            ? Math.max(0, coupon.maxRedemptions - coupon.currentRedemptions)
            : 'unlimited'
        },
        expires: coupon.expiresAt,
        isExpired,
        isMaxedOut,
        status: !coupon.active ? 'inactive' : isExpired ? 'expired' : isMaxedOut ? 'maxed out' : 'active',
        createdAt: coupon.createdAt,
      };
    });

    return NextResponse.json({
      total: coupons.length,
      active: stats.filter(s => s.status === 'active').length,
      coupons: stats,
    });
  } catch (error) {
    console.error('Error fetching promo stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promo code stats' },
      { status: 500 }
    );
  }
}
