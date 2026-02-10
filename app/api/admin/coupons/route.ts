import { NextRequest, NextResponse } from 'next/server';
import { getCoupons, saveCoupons } from '@/lib/coupon-storage';
import { Coupon } from '@/lib/types/coupon';

const ADMIN_KEY = process.env.ADMIN_KEY || 'beekings2026';

function checkAuth(req: NextRequest): boolean {
  const key = req.headers.get('x-admin-key') || req.nextUrl.searchParams.get('key');
  return key === ADMIN_KEY;
}

// GET - list all coupons
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const coupons = await getCoupons();
  return NextResponse.json({ coupons });
}

// POST - create a new coupon
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { code, description, type, trialDays, percentOff, fixedOff, maxCounties, maxRedemptions, expiresAt } = body;

  if (!code || !type) return NextResponse.json({ error: 'code and type are required' }, { status: 400 });

  const coupons = await getCoupons();
  if (coupons.find(c => c.code.toUpperCase() === code.toUpperCase())) {
    return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
  }

  const newCoupon: Coupon = {
    code: code.toUpperCase(),
    description: description || '',
    type,
    trialDays,
    percentOff,
    fixedOff,
    maxCounties: maxCounties || 1,
    maxRedemptions: maxRedemptions || 0,
    redemptions: 0,
    redeemedBy: [],
    enabled: true,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  coupons.push(newCoupon);
  await saveCoupons(coupons);
  return NextResponse.json({ coupon: newCoupon }, { status: 201 });
}

// PATCH - update a coupon (toggle enabled, etc)
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, ...updates } = await req.json();
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });

  const coupons = await getCoupons();
  const index = coupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase());
  if (index === -1) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

  // Only allow safe updates
  const allowed = ['description', 'enabled', 'maxRedemptions', 'maxCounties', 'expiresAt'];
  for (const key of allowed) {
    if (key in updates) (coupons[index] as any)[key] = updates[key];
  }

  await saveCoupons(coupons);
  return NextResponse.json({ coupon: coupons[index] });
}
