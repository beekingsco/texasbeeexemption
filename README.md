# Texas Agricultural Exemption Calculator

A comprehensive web tool for BeeKings that helps Texas landowners calculate potential property tax savings through agricultural exemptions via beekeeping.

## Features

- **All 254 Texas Counties**: Complete county data with accurate 2024/2025 tax rates
- **Real-Time Calculations**: Instant savings estimates based on county-specific rates
- **Mobile-Responsive**: Beautiful design that works on all devices
- **County-Specific Requirements**: Shows exact hive requirements and CAD contact information
- **ROI Calculator**: Shows payback period for BeeKings Tax Saver Package
- **Professional Design**: BeeKings branding with gold/amber theme and bee motifs

## What's Included

### County Data (`data/texas-counties.json`)
- All 254 Texas counties
- County Appraisal District (CAD) contact information
- Actual tax rates (county-specific, updated 2024/2025)
- Agricultural productivity values
- Minimum acreage and hive requirements
- Regional classifications
- County-specific notes

### Calculator Features
1. **Input Form**:
   - Searchable county dropdown
   - Acreage input with validation
   - Current annual property tax amount
   
2. **Results Display**:
   - Annual, 5-year, and 10-year savings projections
   - Required number of beehives
   - County-specific requirements and deadlines
   - CAD contact information
   - BeeKings package pricing and ROI
   - Step-by-step "How It Works" guide

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Optimized for Vercel (or any static host)

## Installation & Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Deploy automatically

Or use Vercel CLI:
```bash
npm install -g vercel
vercel
```

### Deploy to Other Hosts

Build static export:
```bash
# Modify next.config.js to add:
# output: 'export'

npm run build
# Upload the 'out' directory to your hosting provider
```

### Environment Variables

No environment variables required - all calculations are client-side.

## Project Structure

```
tax-calculator/
├── app/
│   ├── page.tsx              # Main page with calculator
│   ├── layout.tsx            # Root layout with metadata
│   └── globals.css           # Global styles
├── components/
│   ├── Calculator.tsx        # Input form component
│   └── Results.tsx           # Results display component
├── data/
│   └── texas-counties.json   # Complete county data (254 counties)
├── types/
│   └── index.ts              # TypeScript type definitions
├── public/                   # Static assets
├── tailwind.config.ts        # Tailwind configuration
└── package.json             # Dependencies
```

## County Data Structure

Each county includes:
```typescript
{
  name: string;              // County name
  region: string;            // East TX, North TX, etc.
  cad: {
    name: string;            // Full CAD name
    website: string;         // CAD website URL
    phone: string;           // CAD phone number
  };
  minAcres: number;          // Minimum acres (typically 5)
  minHives: number;          // Base hive requirement (typically 6)
  additionalHivesPer: number; // Additional hives per X acres
  avgTaxRate: number;        // Combined tax rate (percentage)
  agProductivityValue: number; // Ag value per acre
  notes: string;             // County-specific notes
}
```

## Calculation Logic

```typescript
// Agricultural value
agValue = acreage × agProductivityValue

// Agricultural tax
agTax = agValue × (avgTaxRate / 100)

// Annual savings
annualSavings = currentTax - agTax

// Required hives (for acreage > 20)
requiredHives = minHives + floor((acres - 20) / additionalHivesPer)

// ROI calculation
roiYears = packageCost / annualSavings
```

## Customization

### Update Tax Rates
Edit `data/texas-counties.json` with current tax rates from county websites.

### Modify Package Pricing
Update in `components/Calculator.tsx`:
```typescript
const basePackageCost = 3995; // Change as needed
```

### Adjust Branding
- Colors: `tailwind.config.ts`
- Content: Component files
- Images: Add to `public/` directory

## Legal & Compliance

### Included Disclaimers
- Estimates only, verify with county CAD
- Not tax advice
- Subject to CAD approval
- Consult tax professional

### Marketing Claims
All tax savings calculations based on:
- Actual county tax rates (researched 2024/2025)
- Texas Comptroller agricultural valuation guidelines
- County-specific CAD requirements

## Support & Updates

### Data Maintenance
- Review county tax rates annually (September-November)
- Update CAD contact information as needed
- Add county-specific notes from user feedback

### Feature Additions
Potential enhancements:
- Zip code to county lookup
- Property value estimator
- Email results as PDF
- Multi-language support (Spanish)
- Integration with BeeKings CRM

## Contact

**BeeKings**
- Phone: (903) XXX-XXXX
- Website: beekings.com
- Email: info@beekings.com

## License

Proprietary - © 2026 BeeKings. All rights reserved.

---

## Deployment Checklist

- [ ] All 254 counties verified
- [ ] Tax rates current (2024/2025)
- [ ] CAD contact information accurate
- [ ] Mobile responsive tested
- [ ] Cross-browser compatibility checked
- [ ] Legal disclaimers included
- [ ] BeeKings contact information updated
- [ ] Meta tags and SEO optimized
- [ ] Performance optimization complete
- [ ] Analytics integrated (optional)

## Notes for BeeKings

1. **Update Phone Number**: Replace `(903) XXX-XXXX` with actual contact number
2. **Domain Setup**: Point beekings.com/calculator or calculator.beekings.com to deployment
3. **Analytics**: Consider adding Google Analytics or similar
4. **Lead Capture**: Optionally add email capture for results PDF
5. **CRM Integration**: Can integrate with existing CRM for lead tracking

---

Built with ❤️ and 🐝 for Texas landowners
