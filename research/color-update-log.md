# Americana Blue & Gold Color Palette Update

**Date:** 2026-02-09  
**Goal:** Rebrand beeexemption.com with a trusted, patriotic "USDA meets honey gold" feel.

## Files Changed

1. `app/page.tsx` (homepage)
2. `app/texas/page.tsx` (Texas calculator)
3. `app/florida/page.tsx` (Florida calculator)

## Color Constant (`C` object) Changes

All three files had their `C` object updated:

| Key | Old Value | New Value | Description |
|-----|-----------|-----------|-------------|
| `sky` | `#EDF6FF` | `#F0F4FA` | Muted blue-gray background |
| `blue` | `#1C7CE5` | `#1A3A6B` | Deep federal blue |
| `blueDark` | `#1A5CA3` | `#122B52` | Darker blue for hover states |
| `navy` | `#053249` | `#0D1B2A` | Deep navy for headings |
| `green` | `#57C975` | `#D4A843` | Warm honey gold (replaces green) |
| `greenDark` | `#249241` | `#B8912E` | Darker gold for hover |
| `gray` | `#6B7280` | `#5A6A7A` | Blue-tinted gray |
| `lightGray` | `#F8FAFC` | `#F5F7FB` | Slightly bluer light gray |
| `warm` | `#FFF8F0` | `#FFF8EE` | Warm cream (homepage only) |
| `amber` | `#F59E0B` | `#D4A843` | Match the gold (homepage only) |

## Hardcoded Color Changes

### Green-tinted backgrounds → Gold-tinted backgrounds
- `#F0FDF4` → `#FFF8EE` (savings callout backgrounds)
- `#BBF7D0` → `#F0DBA8` (savings callout borders)
- `#DCFCE7` → `#FFF0D1` (ag exemption bar background)
- `#ECFDF5` → `#FFF8EE` (testimonial savings badge background)

### Box shadows (green rgba → gold rgba)
- `rgba(87,201,117,0.4)` → `rgba(212,168,67,0.4)` (CTA button shadows)
- `rgba(87,201,117,0.3)` → `rgba(212,168,67,0.3)` (guide link shadow)

### CTA button text color
- All `background: C.green, color: C.white` → `background: C.green, color: C.navy`
- This applies to: Final CTA buttons, "Get Your Free Guide" buttons, "View Your Guide Now" links

### Hardcoded gray
- `#6B7280` → `#5A6A7A` in suggestion dropdown text (Texas & Florida)
- `%236B7280` → `%235A6A7A` in homepage select dropdown SVG arrow

## Elements preserved as-is
- `#D5EAFF` border colors — kept (still works with the bluer palette)
- `#e2e8f0` borders — kept
- `#8DA4B5` muted text — kept
- `#5A7A8A` secondary text — kept
- `#1A3A4F` footer divider — kept
- Warning/amber backgrounds (`#FFFBEB`, `#FDE68A`, `#92400E`) — kept
- Error states (`#FEF2F2`, `#FECACA`, `#EF4444`, `#991B1B`) — kept
- Star ratings (`#FBBF24`) — kept

## What was NOT changed
- No layout or spacing changes
- No text content changes
- No functionality or state logic changes
- No API routes touched
- No git push (pushing via GitHub API)

## Build Status
✅ `npx next build` — compiled successfully, all pages generated without errors.
