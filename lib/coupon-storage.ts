import { blobPut, blobRead } from './blob-helpers';
import { Coupon } from './types/coupon';

const COUPONS_BLOB_PATH = 'coupons/coupons.json';

// Default coupons seeded on first load
const DEFAULT_COUPONS: Coupon[] = [
  {
    code: 'FREE3M',
    description: '3 months free trial - 1 county, limited to 5 accounts',
    type: 'trial_extension',
    trialDays: 90,
    maxCounties: 1,
    maxRedemptions: 5,
    redemptions: 0,
    redeemedBy: [],
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'APOLLO30',
    description: '30-day free trial - Apollo.io outreach campaign',
    type: 'trial_extension',
    trialDays: 30,
    maxCounties: 1,
    maxRedemptions: 0, // unlimited
    redemptions: 0,
    redeemedBy: [],
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'REALTOR30',
    description: '30-day free trial for real estate agents - no card required',
    type: 'trial_extension',
    trialDays: 30,
    maxCounties: 1,
    maxRedemptions: 0, // unlimited
    redemptions: 0,
    redeemedBy: [],
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'PARTNER30',
    description: '30-day free trial - Partner outreach',
    type: 'trial_extension',
    trialDays: 30,
    maxCounties: 1,
    maxRedemptions: 0,
    redemptions: 0,
    redeemedBy: [],
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'BKDEMO',
    description: 'BeeKings demo - 2 year free trial',
    type: 'trial_extension',
    trialDays: 730,
    maxCounties: 1,
    maxRedemptions: 1,
    redemptions: 0,
    redeemedBy: [],
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'BKFRIENDS',
    description: 'Friends of BeeKings - 30-day free trial',
    type: 'trial_extension',
    trialDays: 30,
    maxCounties: 1,
    maxRedemptions: 0, // unlimited
    redemptions: 0,
    redeemedBy: [],
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];

export async function getCoupons(): Promise<Coupon[]> {
  try {
    const data = await blobRead<{ coupons: Coupon[] }>('coupons/coupons');
    if (!data) {
      // Seed defaults
      await saveCoupons(DEFAULT_COUPONS);
      return DEFAULT_COUPONS;
    }
    return data.coupons || [];
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return [];
  }
}

export async function saveCoupons(coupons: Coupon[]): Promise<void> {
  await blobPut(COUPONS_BLOB_PATH, JSON.stringify({ coupons }, null, 2));
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const coupons = await getCoupons();
  return coupons.find(c => c.code.toUpperCase() === code.toUpperCase()) || null;
}

export interface CouponValidation {
  valid: boolean;
  error?: string;
  coupon?: Coupon;
}

export async function validateCoupon(code: string, agentId?: string): Promise<CouponValidation> {
  const coupon = await getCouponByCode(code);
  if (!coupon) return { valid: false, error: 'Invalid coupon code' };
  if (!coupon.enabled) return { valid: false, error: 'This coupon is no longer active' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { valid: false, error: 'This coupon has expired' };
  if (coupon.maxRedemptions > 0 && coupon.redemptions >= coupon.maxRedemptions) return { valid: false, error: 'This coupon has reached its maximum uses' };
  if (agentId && coupon.redeemedBy.includes(agentId)) return { valid: false, error: 'You have already used this coupon' };
  return { valid: true, coupon };
}

export async function redeemCoupon(code: string, agentId: string): Promise<CouponValidation> {
  const validation = await validateCoupon(code, agentId);
  if (!validation.valid) return validation;

  const coupons = await getCoupons();
  const index = coupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase());
  if (index === -1) return { valid: false, error: 'Coupon not found' };

  coupons[index].redemptions += 1;
  coupons[index].redeemedBy.push(agentId);
  await saveCoupons(coupons);

  return { valid: true, coupon: coupons[index] };
}
