# Promo Code System - Quick Start

## 🚀 Deploy Now

```bash
cd /Users/scoutbot/.openclaw/workspace/tax-calculator
git add .
git commit -m "Add REALTOR50 promo code system"
git push origin main
```

That's it! Vercel will auto-deploy.

## 🎯 The Code

**REALTOR50**
- 50% off all plans
- Expires: March 15, 2026
- For real estate professionals

## 📍 Where Users Enter It

Visit `https://beeexemption.com/pricing`

You'll see a promo code input field on:
1. Single Report plan ($14.99)
2. Unlimited Access plan ($29.99/mo)  
3. Agent Partner Program ($297/yr)

## ✅ What Happens

1. User types "realtor50" (case doesn't matter)
2. Clicks "Apply"
3. Sees "✅ 50% off applied!" in green
4. Clicks checkout
5. Stripe shows discounted price
6. They pay 50% less

## 📊 Track Usage

**Quick Check:**
```bash
curl https://beeexemption.com/api/promo/stats | jq '.coupons[] | select(.code=="REALTOR50")'
```

**Full Stats:**
Visit: `https://beeexemption.com/api/promo/stats`

## 🔧 Update the Code

Edit: `/data/coupons.json`

```json
{
  "code": "REALTOR50",
  "value": 50,          // Change discount % here
  "expiresAt": "...",   // Change expiration date
  "active": true,       // Set false to disable
  "maxRedemptions": null // Set number to limit uses
}
```

Then commit + push to deploy changes.

## 🎁 Create More Codes

Add to `/data/coupons.json`:

```json
{
  "code": "SUMMER25",
  "type": "discount",
  "value": 25,
  "maxRedemptions": 100,
  "currentRedemptions": 0,
  "expiresAt": "2026-08-31T23:59:59.000Z",
  "campaign": "summer-sale",
  "active": true,
  "createdAt": "2026-02-13T00:00:00.000Z"
}
```

## 📚 Full Documentation

- **PROMO_CODES.md** - Complete system docs
- **PROMO_DEPLOYMENT.md** - Deployment guide & testing
- **This file** - Quick reference

## 💰 Revenue Impact

Example: If 100 realtors sign up for Agent plan:
- Normal: 100 × $297 = $29,700
- With 50% off: 100 × $148.50 = $14,850
- **Cost of promo: $14,850**

But if it gets them to sign up who wouldn't have otherwise, it's pure gain!

## ⏰ Don't Forget

**March 1, 2026** - Review if code should be extended  
**March 15, 2026** - Code expires automatically

Set a calendar reminder!

## 🆘 Need Help?

Check these files:
1. `/app/pricing/page.tsx` - The UI
2. `/app/api/promo/validate/route.ts` - Validation logic
3. `/app/api/stripe/create-checkout/route.ts` - Checkout integration
4. `/lib/coupons.ts` - Core coupon functions
5. `/data/coupons.json` - All active codes

---

**Status:** ✅ Ready  
**Action:** Deploy via git push  
**Test:** Visit /pricing and try REALTOR50
