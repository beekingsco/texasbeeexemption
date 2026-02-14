import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface Coupon {
  code: string;
  type: 'trial' | 'discount';
  value: number;
  maxRedemptions: number | null;
  currentRedemptions: number;
  expiresAt: string | null;
  campaign: string;
  active: boolean;
  createdAt: string;
}

const COUPONS_PATH = join(process.cwd(), 'data', 'coupons.json');
const LOCK_PATH = join(process.cwd(), 'data', 'coupons.lock');

// Simple file-based locking mechanism
const locks = new Map<string, Promise<void>>();

async function withLock<T>(key: string, fn: () => T): Promise<T> {
  // Wait for existing lock
  while (locks.has(key)) {
    await locks.get(key);
  }
  
  // Create new lock
  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  locks.set(key, lockPromise);
  
  try {
    return fn();
  } finally {
    locks.delete(key);
    releaseLock!();
  }
}

export function readCoupons(): Coupon[] {
  try {
    return JSON.parse(readFileSync(COUPONS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

export function writeCoupons(coupons: Coupon[]): void {
  writeFileSync(COUPONS_PATH, JSON.stringify(coupons, null, 2));
}

export function findCoupon(code: string): Coupon | undefined {
  const coupons = readCoupons();
  return coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
}

export function validateCoupon(code: string): { valid: boolean; error?: string; coupon?: Coupon } {
  const coupon = findCoupon(code);
  if (!coupon) return { valid: false, error: 'Invalid promo code' };
  if (!coupon.active) return { valid: false, error: 'This promo code is no longer active' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, error: 'This promo code has expired' };
  }
  if (coupon.maxRedemptions !== null && coupon.currentRedemptions >= coupon.maxRedemptions) {
    return { valid: false, error: 'This promo code has reached its redemption limit' };
  }
  return { valid: true, coupon };
}

export async function redeemCoupon(code: string): Promise<boolean> {
  return withLock('coupons', () => {
    const coupons = readCoupons();
    const idx = coupons.findIndex(c => c.code.toUpperCase() === code.toUpperCase());
    if (idx === -1) return false;
    coupons[idx].currentRedemptions++;
    writeCoupons(coupons);
    return true;
  });
}
