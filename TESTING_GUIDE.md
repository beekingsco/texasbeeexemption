# Testing Guide for Redesigned Tax Calculator

## Quick Start
1. **Dev Server:** `npm run dev` - Running on http://localhost:3000
2. **Production Build:** `npm run build` - ✅ Builds successfully

## Visual Testing Checklist

### Desktop (1920x1080)
- [ ] Hero section - Big bold headline visible
- [ ] Hero subtitle - Clear value proposition
- [ ] Trust line - "Free • No signup • Based on Texas Comptroller data"
- [ ] Calculator card - Clean white card on warm gray background
- [ ] County selector - Searchable dropdown works
- [ ] Manual entry fields - Large, accessible inputs
- [ ] Calculate button - Amber/gold color, disabled when invalid
- [ ] Results section - Big green savings number stands out
- [ ] Breakdown cards - Clean layout with 5/10 year projections
- [ ] County requirements - Clear hive count and deadline
- [ ] ROI card - Honey-gold background with white text
- [ ] "How It Works" - 3 cards with emoji icons
- [ ] FAQ section - 5 questions with friendly copy
- [ ] Footer - BeeKings branding, contact info, disclaimer

### Mobile (375x667 - iPhone SE)
- [ ] Hero headline - Still large and readable
- [ ] Calculator inputs - Easy to tap, proper spacing
- [ ] Buttons - Full width, thumb-friendly height
- [ ] Results - Stacks nicely, savings number still prominent
- [ ] Cards - Single column, proper padding
- [ ] FAQ - Readable, comfortable line length
- [ ] All sections - No horizontal scrolling

### Tablet (768x1024 - iPad)
- [ ] Grid layouts - Proper 2-column on calculator/results
- [ ] "How It Works" - 3 columns visible
- [ ] All content - Comfortable reading experience

## Functional Testing

### Calculator Flow
1. **County Selection:**
   - [ ] Start typing county name (e.g., "Travis")
   - [ ] Dropdown filters as you type
   - [ ] Click county - selected state appears
   - [ ] Optional: Try property lookup if supported
   - [ ] Skip to manual entry

2. **Property Details:**
   - [ ] Enter annual tax amount (e.g., 8000)
   - [ ] Enter acreage (e.g., 10)
   - [ ] Button enables when valid
   - [ ] Try < 5 acres - see error message

3. **Calculate:**
   - [ ] Click "Calculate My Savings"
   - [ ] Page smoothly scrolls to results
   - [ ] Big savings number displays
   - [ ] All cards populate correctly
   - [ ] County-specific info shows
   - [ ] ROI calculations correct

4. **Reset:**
   - [ ] Click "Calculate for another property"
   - [ ] Scrolls back to top
   - [ ] Form resets

### Edge Cases
- [ ] Very large acreage (100+ acres) - hive count calculates correctly
- [ ] Very small tax amount ($1000) - still shows savings
- [ ] Long county names - display properly
- [ ] No results - FAQ/How It Works still visible

## Accessibility Testing
- [ ] Keyboard navigation - Tab through all inputs
- [ ] Focus states - Visible on all interactive elements
- [ ] Labels - All inputs have proper labels
- [ ] Color contrast - Text readable on all backgrounds
- [ ] Semantic HTML - Proper heading hierarchy

## Performance Testing
- [ ] Initial load - Fast, no flash of unstyled content
- [ ] County dropdown - Smooth filtering
- [ ] Scroll performance - No jank
- [ ] Mobile - Responsive and fast

## Browser Testing
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Copy/Tone Check
- [ ] "You" and "your" throughout
- [ ] Conversational, not corporate
- [ ] Short sentences, easy to scan
- [ ] Personality: "Yep, it's that simple." / "No catch. Just bees."
- [ ] Trustworthy - no hype, just facts

## Design System Verification
- [ ] Colors: Honey gold (#D4A03C) primary
- [ ] Backgrounds: White and warm gray (#F5F3EF)
- [ ] Green: Used only for savings/positive numbers
- [ ] Typography: Inter font loads correctly
- [ ] Rounded corners: 12px on all cards/buttons
- [ ] Shadows: Subtle on all cards
- [ ] Spacing: Generous padding, lots of white space

## Test Data
Use these for quick testing:

**Harris County (Houston):**
- Tax: $8,000
- Acres: 10
- Expected: ~$4,500-5,500 savings

**Travis County (Austin):**
- Tax: $10,000
- Acres: 15
- Expected: ~$6,000-7,000 savings

**Collin County (Dallas suburb):**
- Tax: $12,000
- Acres: 20
- Expected: ~$7,000-9,000 savings

## Known Good Behavior
- Property lookup may not work for all counties (expected - it's optional)
- Savings vary widely by county (expected - different tax rates)
- Some counties have different hive requirements (expected - calculated correctly)

## Issues to Watch For
- [ ] Dropdown doesn't filter - check JavaScript console
- [ ] Colors look wrong - verify Tailwind config loaded
- [ ] Layout breaks on mobile - check responsive classes
- [ ] Calculations seem off - verify county data loaded
- [ ] Scroll doesn't work - check smooth-scroll CSS

## Success Criteria
✅ Page loads in < 2 seconds
✅ Calculator completes in < 3 clicks
✅ Savings number is the emotional climax
✅ Mobile experience is smooth
✅ Design feels trustworthy, not salesy
