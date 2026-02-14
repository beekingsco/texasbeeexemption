import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon } from '@/lib/coupons';

// Simple in-memory rate limiting: 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const WINDOW_MS = 60000; // 1 minute

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (data.resetAt < now) {
      rateLimitMap.delete(ip);
    }
  }
}, 300000);

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { valid: false, error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const { code } = await req.json();
    
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Promo code is required' },
        { status: 400 }
      );
    }

    const result = validateCoupon(code.trim());
    
    if (result.valid && result.coupon) {
      return NextResponse.json({
        valid: true,
        coupon: {
          code: result.coupon.code,
          type: result.coupon.type,
          value: result.coupon.value,
          campaign: result.coupon.campaign,
        }
      });
    }

    return NextResponse.json({
      valid: false,
      error: result.error || 'Invalid promo code'
    });
  } catch (error) {
    console.error('Promo validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Error validating promo code' },
      { status: 500 }
    );
  }
}
