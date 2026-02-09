# BeeKings Ag Exemption Calculator - Rebuild Complete

## Overview
Rebuilt the Texas Agricultural Exemption Calculator with a premium King Ranch-inspired design aesthetic. The app helps Texas landowners calculate potential property tax savings through agricultural exemption via beekeeping.

## Design Direction
**King Ranch Heritage Aesthetic:**
- **Color Palette:**
  - Primary: Deep earthy brown (#68321f)
  - Background: Warm parchment (#f7e8da)
  - Accents: Copper (#cfbcad), honey gold (#D4A03C)
  - Hover: Darker brown (#976e53)

- **Typography:**
  - Headers: Georgia serif (premium, authoritative)
  - Body: Lato sans-serif (clean, readable)
  - Big, confident hero typography

- **Aesthetic:**
  - Subtle parchment texture background
  - Generous whitespace
  - Rounded elements (not bubbly)
  - Premium Texas heritage feel
  - Warm, approachable, authoritative

## Features Implemented

### 1. Hero Section
- Full-width with gradient background (primary to dark brown)
- Large serif heading: "Find Your Agricultural Tax Exemption"
- Compelling subtitle about 40-70% savings
- Trust badges (254 counties, free estimate, no signup)

### 2. County Selector
- Dropdown with all 254 Texas counties
- Reads from `data/texas-counties.json`
- Auto-loads county-specific data (tax rates, hive requirements, etc.)

### 3. CAD Property Lookup
- Smart URL generation for county CAD websites
- "Look Up Your Property" button opens county CAD in new tab
- Instructions for users to search and return with appraised value
- Specific URLs for known counties (Kaufman, Van Zandt, etc.)
- Fallback pattern: `[county]cad.org` for others

### 4. Savings Calculator
- Acres input (validates minimum acreage requirement)
- Appraised value input
- Real-time calculation when user clicks "Calculate My Savings"
- Smooth scroll to results

### 5. Results Display
- Three prominent cards:
  - Current Taxes (annual)
  - With Ag Exemption (annual)
  - Annual Savings (with percentage)
- Requirements card showing:
  - Number of hives needed (calculated dynamically)
  - Application requirements
  - Ongoing ag use requirements
- 10-year savings projection
- BeeKings CTA with phone number and website link
- Option to reset and calculate for different property

### 6. Supporting Content
- "How It Works" section (3 steps)
- FAQ section with 5 common questions
- All styled with King Ranch aesthetic

### 7. Footer
- Contact information
- Links to Texas Comptroller and resources
- Comprehensive disclaimer
- Copyright info

## Technical Details

### Data Source
- `data/texas-counties.json` - Contains all 254 counties with:
  - Tax rates
  - Agricultural productivity values
  - CAD contact info and URLs
  - Minimum acreage and hive requirements
  - Regional notes

### County-Specific Calculations
- **Hive Requirements:** Dynamically calculated based on:
  - Minimum hives (typically 6)
  - Additional hives per acreage bracket
  - Example: 6 hives for 5-20 acres, +1 per 5 additional acres

- **Tax Calculations:**
  - Current Taxes = Appraised Value × (County Tax Rate / 100)
  - Ag Taxes = Acres × Ag Productivity Value × (County Tax Rate / 100)
  - Savings = Current Taxes - Ag Taxes

### CAD URL Mapping
Known specific URLs programmed for:
- Kaufman: https://esearch.kaufman-cad.org
- Van Zandt: https://vzcad.org
- Many counties also have `cadSearchUrl` in the data

For others, uses pattern: `https://[county]cad.org`

## Tech Stack
- **Framework:** Next.js 16.1.6
- **Styling:** Tailwind CSS 4
- **Fonts:** Google Fonts (Lato)
- **TypeScript:** Fully typed
- **Build:** Clean production build ✓

## Running the App

### Development
```bash
npm run dev
```
Open http://localhost:3000

### Production Build
```bash
npm run build
npm start
```

### Verify Build
```bash
npm run build
```
Should compile successfully with no errors.

## File Structure
```
/app
  - page.tsx          # Main single-page application
  - layout.tsx        # Root layout with Lato font
  - globals.css       # Global styles, parchment texture
  
/data
  - texas-counties.json  # All 254 Texas counties data

tailwind.config.ts    # King Ranch color palette
package.json          # Dependencies
```

## Design Inspiration
Inspired by king-ranch.com:
- Premium, heritage Texas aesthetic
- Earthy, warm color palette
- Big confident typography
- Generous whitespace
- Not flat white — textured parchment feel
- Rounded but not bubbly elements
- Trusted institution, not tech startup

## Notes
- Mobile-responsive throughout
- Smooth scrolling to results
- Accessible form inputs with proper labels
- All 254 counties included and tested
- Clean TypeScript with no errors
- Builds successfully for production

## BeeKings Branding
- Subtle bee/honey theme via gold accent color
- Focus on land, heritage, and Texas tradition
- Premium but approachable
- Emphasizes trust and authority in agricultural exemptions

---

**Built:** February 2026  
**Status:** Production Ready ✓  
**Build Status:** Clean ✓
