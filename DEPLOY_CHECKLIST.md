# 🚀 Promo Code System - Deployment Checklist

**Project:** BeeExemption.com Tax Calculator  
**Feature:** REALTOR50 Promo Code System  
**Status:** ✅ Ready to Deploy  

---

## Pre-Deployment Verification

### ✅ Code Quality
- [x] TypeScript compiles without errors
- [x] Next.js build passes
- [x] All API routes generated
- [x] No console warnings
- [x] Linting passes

### ✅ Files Ready
- [x] REALTOR50 added to `/data/coupons.json`
- [x] Promo UI added to pricing page
- [x] Validation API created
- [x] Stats API created
- [x] Checkout route updated
- [x] Documentation complete

### ✅ Configuration
- [x] Stripe keys in `.env.local`
- [x] Expiration date set (March 15, 2026)
- [x] Discount value: 50%
- [x] Active: true

---

## Deployment Steps

### Step 1: Commit Changes
```bash
cd /Users/scoutbot/.openclaw/workspace/tax-calculator

# Review changes
git status

# Stage all files
git add .

# Commit with descriptive message
git commit -m "Add promo code system with REALTOR50 (50% off, expires Mar 15)"

# View commit
git log -1 --stat
```

### Step 2: Push to Production
```bash
# Push to main branch (triggers Vercel auto-deploy)
git push origin main

# OR if on dev branch:
# git checkout main
# git merge dev
# git push origin main
```

### Step 3: Monitor Deployment
1. Visit Vercel dashboard
2. Watch deployment progress
3. Wait for "Deployment Successful"
4. Note the deployment URL

---

## Post-Deployment Testing

### Test 1: Valid Promo Code ✅
```
1. Visit: https://beeexemption.com/pricing
2. Scroll to ANY pricing tier
3. Enter: REALTOR50
4. Click: Apply
5. Expected: "✅ 50% off applied!" (green message)
```

### Test 2: Invalid Code ❌
```
1. Enter: FAKE123
2. Click: Apply
3. Expected: "❌ Invalid promo code" (red message)
```

### Test 3: Case Insensitive
```
1. Enter: realtor50 (lowercase)
2. Should auto-convert to: REALTOR50
3. Click: Apply
4. Expected: "✅ 50% off applied!"
```

### Test 4: Full Checkout Flow
```
1. Apply REALTOR50 to any tier
2. Click checkout button
3. Redirected to Stripe
4. Verify discount shows in Stripe checkout
5. Price should be 50% of original
6. Cancel or complete checkout
```

### Test 5: Stats Endpoint
```bash
curl https://beeexemption.com/api/promo/stats | jq
```

Expected response:
```json
{
  "total": 3,
  "active": 3,
  "coupons": [
    {
      "code": "REALTOR50",
      "status": "active",
      "redemptions": {
        "current": 0,
        "remaining": "unlimited"
      }
    }
  ]
}
```

### Test 6: Stripe Integration
```
1. Complete a test checkout with REALTOR50
2. Check Stripe dashboard
3. Look for metadata:
   - coupon_code: REALTOR50
   - coupon_campaign: realtor-launch
4. Verify discount was applied
```

---

## Verification Checklist

After deployment, verify:

- [ ] Pricing page loads without errors
- [ ] Promo input visible on all 3 tiers
- [ ] Valid code shows success message
- [ ] Invalid code shows error message
- [ ] Auto-uppercase works
- [ ] Apply button functions
- [ ] Checkout includes promo code
- [ ] Stripe shows discount
- [ ] Stats API returns data
- [ ] No console errors
- [ ] Mobile view works
- [ ] Desktop view works

---

## Rollback Plan

If something goes wrong:

### Quick Rollback
```bash
# Revert last commit
git revert HEAD
git push origin main

# OR restore previous deployment in Vercel dashboard
```

### Disable Code (Without Rollback)
```bash
# Edit data/coupons.json
# Set: "active": false for REALTOR50
git add data/coupons.json
git commit -m "Disable REALTOR50 temporarily"
git push origin main
```

---

## Monitoring

### Week 1 Metrics
- [ ] Promo code validation attempts
- [ ] Successful REALTOR50 redemptions
- [ ] Conversion rate (with code vs without)
- [ ] Average order value
- [ ] Revenue impact

### Track Via:
1. **Stats API:** `https://beeexemption.com/api/promo/stats`
2. **File Check:** `cat data/coupons.json | grep currentRedemptions`
3. **Stripe:** Filter by `coupon_campaign: realtor-launch`

---

## Important Reminders

### Calendar Events
- **March 1, 2026** - Review redemptions, decide if extending
- **March 14, 2026** - Last day reminder (optional marketing push)
- **March 15, 2026** - Code expires automatically
- **March 16, 2026** - Verify expired code shows error

### Documentation Access
All docs are in the project root:
- `PROMO_CODES.md` - System documentation
- `PROMO_DEPLOYMENT.md` - This file
- `PROMO_QUICK_START.md` - Quick reference
- `PROMO_SYSTEM_COMPLETE.md` - Complete summary
- `PROMO_UI_PREVIEW.md` - Visual reference

---

## Support Resources

### If Issues Arise
1. Check Vercel deployment logs
2. Review browser console errors
3. Test API endpoints directly
4. Check `/data/coupons.json` syntax
5. Verify Stripe keys are correct

### Quick Fixes
```bash
# Syntax error in coupons.json?
cat data/coupons.json | jq  # Validate JSON

# API not responding?
curl -X POST https://beeexemption.com/api/promo/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"REALTOR50"}'

# Stats endpoint?
curl https://beeexemption.com/api/promo/stats
```

---

## Success Criteria

Deployment is successful when:
- ✅ All 6 post-deployment tests pass
- ✅ No console errors on pricing page
- ✅ REALTOR50 validates successfully
- ✅ Checkout shows 50% discount
- ✅ Stats API returns data
- ✅ Mobile + desktop both work

---

## Communication

### Announce Launch
```
📢 NEW: REALTOR50 Promo Code Now Live!

🎉 Real estate professionals can now get 50% off BeeExemption.com services

💰 50% discount on all plans
⏰ Expires March 15, 2026
🔗 https://beeexemption.com/pricing

Just enter REALTOR50 at checkout!
```

### Share Stats (Weekly)
```
📊 REALTOR50 Week 1 Stats:
- X redemptions
- $Y total revenue
- Z% conversion rate
- Most popular tier: [tier name]
```

---

## Next Actions

### Immediate (Post-Deploy)
1. [ ] Run all 6 tests above
2. [ ] Verify no errors
3. [ ] Share promo code with target audience
4. [ ] Set calendar reminders

### Week 1
1. [ ] Monitor redemption rate
2. [ ] Check for any issues
3. [ ] Gather user feedback
4. [ ] Optimize if needed

### Month 1
1. [ ] Review total redemptions
2. [ ] Calculate ROI
3. [ ] Decide on extension
4. [ ] Plan next campaign

---

**READY TO DEPLOY?** ✅

```bash
cd /Users/scoutbot/.openclaw/workspace/tax-calculator
git add .
git commit -m "Add REALTOR50 promo code system"
git push origin main
```

Then run the 6 post-deployment tests above!

---

**Status:** ✅ READY  
**Action:** Deploy via `git push origin main`  
**Test:** Visit /pricing and enter REALTOR50  
**Expires:** March 15, 2026
