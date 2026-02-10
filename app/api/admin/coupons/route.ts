import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { readCoupons, writeCoupons, Coupon } from '@/lib/coupons';

function authGuard(req: NextRequest) {
  const { authorized } = checkAdminAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = authGuard(req);
  if (denied) return denied;
  return NextResponse.json(readCoupons());
}

export async function POST(req: NextRequest) {
  const denied = authGuard(req);
  if (denied) return denied;

  const body = await req.json();
  const { code, type, value, maxRedemptions, expiresAt, campaign } = body;

  if (!code || !type || value == null || !campaign) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const coupons = readCoupons();
  if (coupons.find(c => c.code.toUpperCase() === code.toUpperCase())) {
    return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
  }

  const newCoupon: Coupon = {
    code: code.toUpperCase().trim(),
    type,
    value: Number(value),
    maxRedemptions: maxRedemptions ?? null,
    currentRedemptions: 0,
    expiresAt: expiresAt || null,
    campaign: campaign.trim(),
    active: true,
    createdAt: new Date().toISOString(),
  };

  coupons.push(newCoupon);
  writeCoupons(coupons);
  return NextResponse.json(newCoupon, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const denied = authGuard(req);
  if (denied) return denied;

  const body = await req.json();
  const { code, ...updates } = body;
  if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

  const coupons = readCoupons();
  const idx = coupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

  const allowed = ['active', 'maxRedemptions', 'expiresAt', 'campaign', 'value', 'type'];
  for (const key of Object.keys(updates)) {
    if (allowed.includes(key)) {
      (coupons[idx] as unknown as Record<string, unknown>)[key] = updates[key];
    }
  }

  writeCoupons(coupons);
  return NextResponse.json(coupons[idx]);
}

export async function DELETE(req: NextRequest) {
  const denied = authGuard(req);
  if (denied) return denied;

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

  const coupons = readCoupons();
  const idx = coupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

  coupons[idx].active = false;
  writeCoupons(coupons);
  return NextResponse.json({ success: true, coupon: coupons[idx] });
}
