# Quick Test Guide

## 🚀 Getting Started

The tax calculator is running on **http://localhost:3003**

## ✅ Quick Test Checklist

### Test 1: Supported County Lookup (Van Zandt)
1. Open http://localhost:3003
2. Select **"Van Zandt County"**
3. Enter address: **"123 Main"** (or any Van Zandt address)
4. Click **"Look Up My Property"**
5. ✅ Verify: Property search executes
6. ✅ Verify: Results displayed (or error message with fallback)

### Test 2: Supported County (Bexar - Multiple Results)
1. Select **"Bexar County"**
2. Enter address: **"Main"**
3. Click **"Look Up My Property"**
4. ✅ Verify: Multiple properties shown
5. Click one of the properties
6. ✅ Verify: Property details displayed
7. Click **"This Is My Property - Continue"**
8. ✅ Verify: Form fields auto-filled

### Test 3: Unsupported County (Dallas)
1. Select **"Dallas County"**
2. ✅ Verify: "Manual Entry Required" message shown
3. ✅ Verify: Link to Dallas CAD website displayed
4. Click **"Continue to Manual Entry"**
5. ✅ Verify: Manual entry form appears

### Test 4: Manual Entry Fallback
1. Select any supported county
2. Click **"Enter Manually"** button
3. ✅ Verify: Skips lookup, shows manual form
4. Enter acreage and tax amount
5. Click **"Calculate My Savings"**
6. ✅ Verify: Results page displays

### Test 5: Complete E2E Flow
1. Select **"Kaufman County"**
2. Enter a test address
3. Select found property (if available)
4. Confirm property
5. Review auto-filled data
6. Calculate savings
7. ✅ Verify: Full workflow completes

## 🔍 What to Look For

### ✅ Success Indicators
- County dropdown works
- Address input appears for supported counties
- Loading state shows during lookup
- Property data displays correctly
- Auto-fill works when property selected
- Manual entry always available
- Calculate button works
- Results page displays savings

### ⚠️ Known Behavior
- Some addresses may return no results (expected)
- CAD websites may be slow (2-4 seconds normal)
- Dallas, Harris, Travis require manual entry (expected)
- Empty address = disabled lookup button (expected)

### 🐛 Report If You See
- Build errors or crashes
- Broken UI elements
- API errors that don't show user-friendly message
- Auto-fill not working when property selected
- Calculate button not working
- Results page not displaying

## 📱 Test URLs

**Local Development:**
- http://localhost:3003

**API Endpoint (Direct Test):**
```bash
# Test Van Zandt lookup
curl "http://localhost:3003/api/property-lookup?county=Van%20Zandt&address=123%20Main"

# Test Kaufman lookup
curl "http://localhost:3003/api/property-lookup?county=Kaufman&address=Main"

# Test Bexar lookup
curl "http://localhost:3003/api/property-lookup?county=Bexar&address=Main"
```

## 🎯 Priority Test Counties

1. **Van Zandt** - Priority county, True Automation
2. **Kaufman** - Priority county, True Automation
3. **Henderson** - Priority county, True Automation
4. **Smith** - Priority county, True Automation
5. **Bexar** - Major metro, good for testing multiple results
6. **Dallas** - Unsupported, test manual fallback

## 💡 Test Tips

- Use simple addresses: "123 Main" works better than "123 N Main St"
- Some counties have limited public data
- Real addresses work best for testing
- Check browser console for API responses
- Network tab shows lookup requests

## 🏗️ Development Commands

```bash
# Build production
npm run build

# Run dev server (port 3003)
npm run dev -- -p 3003

# Test API route directly
curl "http://localhost:3003/api/property-lookup?county=Bexar&address=Main"

# Update county data
node scripts/update-cad-platforms.js
```

## 📊 Expected Results

### Van Zandt County
- Platform: True Automation
- Client ID: 231
- Should return property data if address valid

### Kaufman County
- Platform: True Automation
- Client ID: 61
- Should return property data if address valid

### Bexar County
- Platform: True Automation
- Client ID: 110
- Good for testing multiple results

### Dallas County
- Platform: Custom
- Should show manual entry prompt

## ✅ Test Complete When...

- [ ] Can select any county
- [ ] Supported counties show address input
- [ ] Unsupported counties show manual entry
- [ ] Property lookup executes and returns data
- [ ] Can confirm found property
- [ ] Form auto-fills with property data
- [ ] Can calculate savings
- [ ] Results page displays correctly
- [ ] Manual entry fallback works
- [ ] No console errors

---

**Ready to test!** Open http://localhost:3003 and try the checklist above.
