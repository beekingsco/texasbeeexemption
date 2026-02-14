# Promo Code System

## Overview
BeeExemption.com now has a fully functional promo code system that supports:
- Percentage discounts (e.g., 50% off)
- Trial extensions for subscription plans
- Expiration dates
- Redemption limits
- Campaign tracking

## Active Promo Codes

### REALTOR50
- **Type:** Discount
- **Value:** 50% off
- **Expires:** March 15, 2026 (30 days from deployment)
- **Campaign:** realtor-launch
- **Status:** Active
- **Max Redemptions:** Unlimited

### APOLLO30
- **Type:** Trial Extension
- **Value:** 30 days
- **Expires:** Never
- **Campaign:** apollo
- **Status:** Active

### PARTNER30
- **Type:** Trial Extension
- **Value:** 30 days
- **Expires:** Never
- **Campaign:** partner
- **Status:** Active

## Managing Promo Codes

### File Location
All promo codes are stored in: `/data/coupons.json`

### Adding a New Promo Code
Edit `/data/coupons.json` and add a new entry:

```json
{
  "code": "SUMMER25",
  "type": "discount",
  "value": 25,
  "maxRedemptions": 100,
  "currentRedemptions": 0,
  "expiresAt": "2026-08-31T23:59:59.000Z",
  "campaign": "summer-promo",
  "active": true,
  "createdAt": "2026-02-13T00:00:00.000Z"
}
```

### Field Descriptions
- **code**: The promo code users enter (case-insensitive)
- **type**: Either "discount" (percentage off) or "trial" (extends trial period)
- **value**: 
  - For discount: percentage off (1-100)
  - For trial: number of days
- **maxRedemptions**: Maximum times the code can be used (null = unlimited)
- **currentRedemptions**: Current usage count (increments automatically)
- **expiresAt**: ISO 8601 date string (null = never expires)
- **campaign**: Internal tracking label
- **active**: Enable/disable the code without deleting it
- **createdAt**: ISO 8601 date when code was created

### Deactivating a Code
Change `"active": true` to `"active": false` in the JSON file.

### Updating Expiration
Change the `expiresAt` field to a new ISO 8601 date string:
```json
"expiresAt": "2026-12-31T23:59:59.000Z"
```

To make a code never expire:
```json
"expiresAt": null
```

## How It Works

### User Flow
1. User enters promo code on pricing page
2. System validates code in real-time:
   - Checks if code exists
   - Checks if active
   - Checks if expired
   - Checks redemption limit
3. Shows success/error message
4. On checkout, applies discount via Stripe coupon

### Technical Implementation

#### Validation API
- **Endpoint:** `/api/promo/validate`
- **Method:** POST
- **Body:** `{ "code": "REALTOR50" }`
- **Response:** `{ "valid": true, "coupon": {...} }` or `{ "valid": false, "error": "..." }`

#### Checkout Integration
- Promo code is passed to `/api/stripe/create-checkout`
- System creates a Stripe coupon on-the-fly for discount codes
- Coupon is applied to the checkout session
- Redemption count is incremented after successful validation

#### Components Updated
- **Pricing Page** (`/app/pricing/page.tsx`): Added promo code input fields for all tiers
- **Checkout API** (`/app/api/stripe/create-checkout/route.ts`): Updated to accept and apply coupons
- **Validation API** (`/app/api/promo/validate/route.ts`): New endpoint for real-time validation

## Tracking & Analytics

### View Redemption Count
Check `currentRedemptions` in `/data/coupons.json`

### Campaign Attribution
All checkouts with promo codes include metadata:
- `coupon_code`: The code used
- `coupon_campaign`: The campaign label

This metadata is visible in Stripe dashboard and can be used for analytics.

## Example: Creating a Limited-Time BOGO Code

```json
{
  "code": "BOGO",
  "type": "discount",
  "value": 100,
  "maxRedemptions": 50,
  "currentRedemptions": 0,
  "expiresAt": "2026-03-01T23:59:59.000Z",
  "campaign": "feb-flash-sale",
  "active": true,
  "createdAt": "2026-02-13T00:00:00.000Z"
}
```

This creates:
- 100% off (free!)
- Limited to first 50 users
- Expires March 1, 2026
- Tracked under "feb-flash-sale" campaign

## Security Notes
- Codes are case-insensitive (auto-converted to uppercase)
- Validation happens server-side (can't be bypassed)
- Redemption count is incremented atomically
- Expired codes automatically fail validation
- Inactive codes fail validation even if otherwise valid

## Deployment Notes
After updating `/data/coupons.json`:
1. Commit changes to git
2. Deploy to Vercel (automatic via git push)
3. No server restart needed - changes take effect immediately

## Future Enhancements (Not Yet Implemented)
- Admin dashboard for managing codes
- Email collection on promo code usage
- Automatic email campaigns for code recipients
- Usage analytics dashboard
- Multi-tier code restrictions (e.g., "agent-only" codes)
