'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import countiesData from '@/data/texas-counties.json';
import suppliersData from '@/data/texas-nuc-suppliers.json';
import amazonProducts from '@/data/amazon-products.json';
import verifiedProducts from '@/data/verified-products.json';

/* ─────────────────────────── Types ─────────────────────────── */
interface County {
  name: string;
  region: string;
  cad: { name: string; website: string; phone: string };
  minAcres: number;
  minHives: number;
  additionalHivesPer: number;
  avgTaxRate: number;
  agProductivityValue: number;
  notes: string;
}

interface Supplier {
  name: string;
  county: string;
  region: string;
  city: string;
  contact: { phone: string; email: string; website: string; facebook: string };
  nucTypes: string[];
  priceRange: string;
  season: string;
  notes: string;
}

/* ────────────────────── Region mapping ──────────────────────── */
const regionMapping: Record<string, string[]> = {
  'Central TX': ['Central', 'Southeast'],
  'East TX': ['East', 'North Central', 'Southeast'],
  'Gulf Coast': ['Gulf Coast', 'Southeast', 'Central'],
  'Hill Country': ['Hill Country', 'Central', 'South'],
  'North TX': ['North Central', 'East', 'Central'],
  'Panhandle': ['Panhandle', 'North Central', 'West'],
  'South TX': ['South', 'Gulf Coast', 'Central'],
  'West TX': ['West', 'Panhandle', 'Central'],
};

/* ──────────────────── Formatting helpers ────────────────────── */
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtMoney = (n: number) => '$' + fmt(n);
const today = () => {
  const d = new Date();
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

/* ──────────────────── Design tokens ────────────────────── */
const colors = {
  cream: '#faf9f6',
  darkGreen: '#2d2d2d',
  gold: '#d4a843',
  goldLight: 'rgba(212, 168, 67, 0.15)',
  white: '#ffffff',
  cardShadow: '0 2px 12px rgba(0,0,0,0.06)',
};

/* ──────────────────── Section Header Component ────────────────────── */
function SectionHeader({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="mb-10">
      <h2 style={{ fontSize: 28, fontWeight: 900, color: colors.darkGreen, letterSpacing: '0.03em', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
        <span style={{ marginRight: 12 }}>{emoji}</span>
        {title}
      </h2>
      <div style={{ width: 80, height: 4, background: colors.gold, borderRadius: 2, marginTop: 10 }} />
    </div>
  );
}

/* ──────────────────── Page Footer Component ────────────────────── */
function PageFooter({ name, county }: { name: string; county: string }) {
  return (
    <div style={{ borderTop: `1px solid #e5e5e0`, paddingTop: 16, marginTop: 48, textAlign: 'center' }}>
      <p style={{ fontSize: 12, color: '#999', letterSpacing: '0.05em' }}>
        BeeKings.com • {name} • {county} County Property Report
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REPORT CONTENT
   ═══════════════════════════════════════════════════════════════ */
function ReportContent() {
  const params = useSearchParams();
  const countyName = params.get('county') || '';
  const acresParam = parseFloat(params.get('acres') || '10');
  const propertyValue = parseFloat(params.get('propertyValue') || '300000');
  const taxRateParam = params.get('taxRate');
  const name = params.get('name') || 'Property Owner';
  const email = params.get('email') || '';

  const counties = useMemo(() => countiesData as County[], []);
  const suppliers = useMemo(() => suppliersData as Supplier[], []);

  const county = counties.find(c => c.name.toLowerCase() === countyName.toLowerCase());

  if (!county) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.cream }}>
        <div className="text-center p-12">
          <div className="text-6xl mb-4">🐝</div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">County Not Found</h1>
          <p className="text-gray-500">Please provide a valid Texas county name via <code className="bg-gray-200 px-2 py-1 rounded">?county=Travis</code></p>
        </div>
      </div>
    );
  }

  /* ── Calculations ── */
  const acres = acresParam;
  const taxRate = taxRateParam ? parseFloat(taxRateParam) : county.avgTaxRate;
  const effectiveTaxRate = taxRate / 100;
  const homesteadAcres = Math.min(1, acres);
  const agEligibleAcres = Math.max(0, acres - homesteadAcres);
  const perAcreLandValue = acres > 0 ? (propertyValue * 0.6) / acres : 0;
  const homesteadValue = propertyValue * 0.4 + homesteadAcres * perAcreLandValue;
  const currentTaxes = propertyValue * effectiveTaxRate;
  const homesteadTaxes = homesteadValue * effectiveTaxRate;
  const agTaxes = agEligibleAcres * county.agProductivityValue * effectiveTaxRate;
  const totalWithAg = homesteadTaxes + agTaxes;
  const annualSavings = Math.max(0, currentTaxes - totalWithAg);
  const savingsPercent = currentTaxes > 0 ? (annualSavings / currentTaxes) * 100 : 0;

  let requiredHives = county.minHives;
  if (agEligibleAcres > county.minAcres) {
    requiredHives += Math.ceil((agEligibleAcres - county.minAcres) / county.additionalHivesPer);
  }

  const hiveCost = 197;
  const nucCost = 260;
  const totalUpfront = requiredHives * (hiveCost + nucCost);
  const annualMaintenance = requiredHives * 75;
  const honeyRevenue = requiredHives * 30 * 20;
  const netAnnualBenefit = annualSavings - annualMaintenance + honeyRevenue;
  const roiMonths = netAnnualBenefit > 0 ? Math.ceil((totalUpfront / netAnnualBenefit) * 12) : 0;

  /* ── Supplier matching ── */
  const matchedRegions = regionMapping[county.region] || ['Central'];
  const nearbySuppliers = suppliers.filter(s => matchedRegions.includes(s.region));

  /* ── Equipment list (legacy — kept for backward compat) ── */
  const equipmentList = [
    { item: 'Complete Hive Body (deep)', qty: requiredHives, unitCost: 65, desc: 'Brood box with frames & foundation' },
    { item: 'Honey Super (medium)', qty: requiredHives, unitCost: 45, desc: 'For honey production' },
    { item: 'Bottom Board', qty: requiredHives, unitCost: 18, desc: 'Screened preferred for ventilation' },
    { item: 'Telescoping Outer Cover', qty: requiredHives, unitCost: 22, desc: 'Weather protection' },
    { item: 'Inner Cover', qty: requiredHives, unitCost: 12, desc: 'Insulation & ventilation' },
    { item: 'Queen Excluder', qty: requiredHives, unitCost: 10, desc: 'Keeps queen in brood box' },
    { item: 'Entrance Reducer', qty: requiredHives, unitCost: 3, desc: 'Helps defend against robbing' },
    { item: 'Frames (10-pack)', qty: requiredHives * 2, unitCost: 22, desc: 'For brood & honey supers' },
    { item: 'Nucleus Colony (nuc)', qty: requiredHives, unitCost: 260, desc: '5 frames with queen & bees' },
    { item: 'Bee Suit (full)', qty: 1, unitCost: 65, desc: 'Ventilated with veil' },
    { item: 'Leather Gloves', qty: 1, unitCost: 18, desc: 'Sting-resistant beekeeping gloves' },
    { item: 'Smoker', qty: 1, unitCost: 35, desc: 'Stainless steel with guard' },
    { item: 'Hive Tool', qty: 1, unitCost: 12, desc: 'For prying frames & scraping' },
    { item: 'Bee Brush', qty: 1, unitCost: 8, desc: 'Gentle bee removal' },
    { item: 'Frame Grip', qty: 1, unitCost: 10, desc: 'Safe frame handling' },
    { item: 'Entrance Feeder', qty: requiredHives, unitCost: 8, desc: 'Boardman-style sugar syrup feeder' },
    { item: 'Hive Beetle Trap', qty: requiredHives, unitCost: 6, desc: 'Small hive beetle management' },
  ];
  const equipTotal = equipmentList.reduce((sum, e) => sum + e.qty * e.unitCost, 0);

  /* ── Amazon Shopping List Builder ── */
  type AmazonProduct = {
    name: string; asin: string; price: number; rating: number; reviews: number;
    amazonUrl: string; image: string; description: string; recommended: boolean;
    tier: string; brand: string; perHive: boolean; qtyFixed?: number; qtyPer?: number;
    includesHive?: boolean;
  };
  type TierItemDef = { category: string; productIndex: number; perHive?: boolean; qty?: number };
  type TierDef = { label: string; emoji: string; description: string; color: string; items: TierItemDef[] };

  const buildShoppingTier = (tierKey: string) => {
    const tiers = amazonProducts.shoppingListTiers as Record<string, TierDef>;
    const tierDef = tiers[tierKey];
    if (!tierDef) return { items: [], total: 0, label: '', emoji: '', description: '', color: '' };
    const cats = amazonProducts.categories as Record<string, { label: string; icon: string; products: AmazonProduct[] }>;
    const items: { product: AmazonProduct; catLabel: string; qty: number; total: number }[] = [];
    for (const ti of tierDef.items) {
      const cat = cats[ti.category];
      if (!cat) continue;
      const product = cat.products[ti.productIndex];
      if (!product) continue;
      let qty: number;
      if (ti.perHive) { qty = requiredHives; }
      else if (ti.qty !== undefined) { qty = ti.qty; }
      else if (product.qtyFixed !== undefined) { qty = product.qtyFixed; }
      else if (product.qtyPer !== undefined) { qty = product.qtyPer * requiredHives; }
      else { qty = 1; }
      items.push({ product, catLabel: cat.label, qty, total: Math.round(product.price * qty * 100) / 100 });
    }
    const total = items.reduce((s, i) => s + i.total, 0);
    return { items, total: Math.round(total * 100) / 100, label: tierDef.label, emoji: tierDef.emoji, description: tierDef.description, color: tierDef.color };
  };

  const shoppingTiers = {
    budget: buildShoppingTier('budget'),
    recommended: buildShoppingTier('recommended'),
    premium: buildShoppingTier('premium'),
  };

  /* ── YouTube videos ── */
  const videos = [
    { title: 'Beekeeping for Beginners — Full Course', channel: 'University of Guelph / Ontario Beekeepers', id: 'nZCMHxrz6Wc', desc: 'Comprehensive 45-min guide covering everything from hive setup to your first harvest' },
    { title: 'How to Install a Nuc Into Your Hive', channel: 'Kamon Reynolds — Tennessee\'s Bees', id: 'IBv0K5Wbf0g', desc: 'Step-by-step nuc installation with close-up footage' },
    { title: 'First Hive Inspection — What to Look For', channel: 'Barnyard Bees', id: '8s4tpn6WQSM', desc: 'Beginner-friendly walkthrough of your first hive inspection' },
    { title: 'How to Light a Smoker (and Keep It Lit)', channel: 'Bob Binnie — Blue Ridge Honey Company', id: 'BcFLCDSxUCg', desc: 'Master the smoker — the #1 beginner struggle solved' },
    { title: 'Varroa Mite Treatment Guide', channel: 'Kamon Reynolds — Tennessee\'s Bees', id: 'GF9YbKT_Xtg', desc: 'Essential mite management to keep your colonies healthy' },
    { title: 'How to Harvest Honey — Complete Guide', channel: 'Frederick Dunn', id: 'wpmrJBN0wKo', desc: 'From pulling frames to bottling your first batch' },
    { title: 'Reading Your Bees — What They\'re Telling You', channel: 'David Burns — Long Lane Honey Bee Farms', id: 'XjL2r9LXeRk', desc: 'Learn to understand colony behavior and mood' },
    { title: 'Fall & Winter Preparation for Hives', channel: 'Bob Binnie — Blue Ridge Honey Company', id: 'VLPDTtU5j04', desc: 'Get your hives ready for Texas winters' },
    { title: 'Queen Spotting Tips for Beginners', channel: 'Kamon Reynolds — Tennessee\'s Bees', id: '2gKqbhFCDjA', desc: 'Find your queen fast — essential beekeeping skill' },
    { title: 'Setting Up a Bee Yard — Layout & Location', channel: 'Barnyard Bees', id: 'FnU3K4_LxYM', desc: 'Perfect placement for healthy hives and happy neighbors' },
  ];

  /* ── Seasonal calendar ── */
  const seasonalCalendar = [
    { month: 'January', icon: '❄️', tasks: 'Check hive weight (stores), ensure ventilation, order equipment for spring, monitor for cold-weather die-offs', watch: 'Starvation risk — feed fondant if stores are light' },
    { month: 'February', icon: '🌱', tasks: 'Order nucs/packages, clean & repair equipment, feed 1:1 sugar syrup if needed, first quick inspections on warm days (60°F+)', watch: 'Queen laying — look for small brood patches starting' },
    { month: 'March', icon: '🌸', tasks: 'Spring buildup begins! Full inspections, add supers as needed, monitor for swarm cells, treat for varroa if needed', watch: 'Swarm season starts — check every 7-10 days' },
    { month: 'April', icon: '🐝', tasks: 'Peak swarm season — split strong hives, install nucs/packages, add honey supers, FILE AG EXEMPTION APPLICATION (deadline April 30!)', watch: 'Swarm prevention is critical — don\'t let them get crowded' },
    { month: 'May', icon: '🍯', tasks: 'Main nectar flow begins! Add supers as needed, check for laying queens, monitor hive health', watch: 'Honey flow — bees need room or they\'ll swarm' },
    { month: 'June', icon: '☀️', tasks: 'Peak honey production, harvest spring honey, ensure adequate ventilation, provide water source', watch: 'Heat management — ensure good airflow, shade if 100°F+' },
    { month: 'July', icon: '🌡️', tasks: 'Harvest honey, treat for varroa mites (critical!), ensure water source, check for small hive beetles', watch: 'Texas heat stress — bees will beard outside hive (normal)' },
    { month: 'August', icon: '🔥', tasks: 'Second varroa treatment if needed, late-summer feeding if nectar dearth, extract & bottle honey', watch: 'Robbing season — reduce entrances on weak hives' },
    { month: 'September', icon: '🍂', tasks: 'Fall flow begins (goldenrod, aster), assess winter stores, combine weak colonies, treat for varroa', watch: 'Ensure each hive has at least 60 lbs of honey going into fall' },
    { month: 'October', icon: '🍁', tasks: 'Final inspections, verify queen health, mouse guards on, reduce entrances, winterize hives', watch: 'Last chance for varroa treatment before winter' },
    { month: 'November', icon: '🌾', tasks: 'Minimal disturbance, check hive weight, add moisture quilt/ventilation, feed if light', watch: 'Don\'t open hives below 55°F — you\'ll break the cluster' },
    { month: 'December', icon: '🎄', tasks: 'Leave hives alone, monitor entrance for activity on warm days, plan next year, order catalogs', watch: 'Hefting test — tilt hive to gauge stores; feed fondant if too light' },
  ];

  /* ── Report number (stable per render) ── */
  const reportNumber = useMemo(() => Math.floor(Math.random() * 90000 + 10000), []);

  return (
    <div className="report-wrapper" style={{ background: colors.cream, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      <style>{`
        /* ═══ BASE TYPOGRAPHY ═══ */
        .report-wrapper {
          font-size: 15px;
          line-height: 1.7;
          color: #374151;
          -webkit-font-smoothing: antialiased;
        }

        .report-wrapper h1, .report-wrapper h2, .report-wrapper h3, .report-wrapper h4 {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        /* ═══ PRINT STYLES ═══ */
        @media print {
          @page { margin: 0.6in; size: letter; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          .report-wrapper { padding: 0 !important; font-size: 14px; }
          .report-section { box-shadow: none !important; border: none !important; }
          .report-card { box-shadow: none !important; }
          a { text-decoration: none !important; }
          .shopping-item-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
        }

        /* ═══ ANIMATIONS ═══ */
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes barGrow { from { width: 0; } }
        .fade-up { animation: fadeInUp 0.6s ease-out both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.2s; }
        .fade-up-3 { animation-delay: 0.3s; }
        .bar-grow { animation: barGrow 1.2s ease-out both; }

        /* ═══ HIVE DIAGRAM ═══ */
        .hive-part { transition: transform 0.2s, box-shadow 0.2s; cursor: default; }
        .hive-part:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 10; position: relative; }

        /* ═══ PDF-STYLE CARD ═══ */
        .pdf-card {
          background: ${colors.white};
          border-radius: 12px;
          box-shadow: ${colors.cardShadow};
          overflow: hidden;
        }

        /* ═══ GOLD LEFT BORDER CARD ═══ */
        .gold-border-card {
          border-left: 4px solid ${colors.gold};
          background: ${colors.white};
          border-radius: 0 12px 12px 0;
          box-shadow: ${colors.cardShadow};
          padding: 24px 28px;
        }
      `}</style>

      {/* ════════════════════════════════════════════
          FLOATING PRINT BUTTON
          ════════════════════════════════════════════ */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="text-white font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all hover:brightness-110"
          style={{ background: colors.darkGreen }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
          </svg>
          Save as PDF
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 1 — COVER (Hero)
          ════════════════════════════════════════════════════════════ */}
      <header style={{ background: colors.darkGreen, color: 'white', padding: '64px 24px 72px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Top line: report # and date */}
          <div className="text-center mb-6 fade-up">
            <p style={{ color: colors.gold, fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              REPORT #{reportNumber} • {today().toUpperCase()}
            </p>
          </div>

          {/* Main title */}
          <div className="text-center fade-up fade-up-1">
            <h1 style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.15, marginBottom: 16, color: 'white' }}>
              Personalized Property Report<br />
              <span style={{ color: colors.gold }}>{county.name} County</span>
            </h1>
            <p style={{ fontSize: 18, opacity: 0.7, fontWeight: 400, marginBottom: 40 }}>
              Agricultural Exemption Through Beekeeping
            </p>
          </div>

          {/* Prepared for block */}
          <div className="text-center fade-up fade-up-2" style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.5, marginBottom: 8 }}>
              PREPARED EXCLUSIVELY FOR
            </p>
            <p style={{ fontSize: 28, fontWeight: 800 }}>{name}</p>
            {email && <p style={{ fontSize: 14, opacity: 0.5, marginTop: 4 }}>{email}</p>}
          </div>

          {/* Savings callout card */}
          <div className="fade-up fade-up-3" style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{
              background: 'rgba(45, 45, 45, 0.85)',
              borderLeft: `5px solid ${colors.gold}`,
              borderRadius: '0 16px 16px 0',
              padding: '32px 36px',
              backdropFilter: 'blur(10px)',
            }}>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: colors.gold, fontWeight: 700, marginBottom: 8 }}>
                ESTIMATED ANNUAL SAVINGS
              </p>
              <p style={{ fontSize: 56, fontWeight: 900, color: colors.gold, lineHeight: 1.1 }}>
                {fmtMoney(annualSavings)}
              </p>
              <p style={{ fontSize: 14, opacity: 0.6, marginTop: 8 }}>
                per year on property taxes • {savingsPercent.toFixed(0)}% reduction
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2 — HOW MUCH YOU'LL SAVE
          ════════════════════════════════════════════════════════════ */}
      <section id="section-1" style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px 40px' }}>
        <SectionHeader emoji="💰" title="HOW MUCH YOU'LL SAVE" />

        {/* Property detail line */}
        <p style={{ fontSize: 15, color: '#666', marginBottom: 28 }}>
          <strong style={{ color: '#333' }}>Property Detail:</strong> {county.name} County · {acres} acres · {fmtMoney(propertyValue)} property value
        </p>

        {/* Two side-by-side cards: current vs with beekeeping */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          <div className="pdf-card avoid-break" style={{ padding: 28, textAlign: 'center' }}>
            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', fontWeight: 700, marginBottom: 8 }}>YOU PAY NOW</p>
            <p style={{ fontSize: 40, fontWeight: 900, color: '#c53030' }}>{fmtMoney(currentTaxes)}</p>
            <p style={{ fontSize: 13, color: '#999', marginTop: 4 }}>per year</p>
          </div>
          <div className="pdf-card avoid-break" style={{ padding: 28, textAlign: 'center' }}>
            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', fontWeight: 700, marginBottom: 8 }}>WITH BEEKEEPING</p>
            <p style={{ fontSize: 40, fontWeight: 900, color: colors.darkGreen }}>{fmtMoney(totalWithAg)}</p>
            <p style={{ fontSize: 13, color: '#999', marginTop: 4 }}>per year</p>
          </div>
        </div>

        {/* Bar chart: Annual Property Tax Comparison */}
        <div className="pdf-card avoid-break" style={{ padding: 36, marginBottom: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#222', marginBottom: 28 }}>Annual Property Tax Comparison</h3>

          <div style={{ marginBottom: 24 }}>
            <div className="flex justify-between mb-2">
              <span style={{ fontSize: 14, fontWeight: 600, color: '#666' }}>Current Taxes</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#c53030' }}>{fmtMoney(currentTaxes)}/yr</span>
            </div>
            <div style={{ height: 36, borderRadius: 8, overflow: 'hidden', background: '#fee2e2' }}>
              <div className="bar-grow" style={{ height: '100%', width: '100%', borderRadius: 8, background: 'linear-gradient(90deg, #dc2626, #ef4444)' }} />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div className="flex justify-between mb-2">
              <span style={{ fontSize: 14, fontWeight: 600, color: '#666' }}>With Beekeeping Exemption</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: colors.darkGreen }}>{fmtMoney(totalWithAg)}/yr</span>
            </div>
            <div style={{ height: 36, borderRadius: 8, overflow: 'hidden', background: '#dcfce7' }}>
              <div className="bar-grow" style={{ height: '100%', width: `${Math.max(5, (totalWithAg / currentTaxes) * 100)}%`, borderRadius: 8, background: `linear-gradient(90deg, ${colors.darkGreen}, #22c55e)` }} />
            </div>
          </div>

          <div style={{ background: '#fffbeb', borderLeft: `4px solid ${colors.gold}`, borderRadius: '0 8px 8px 0', padding: '16px 20px' }}>
            <p style={{ fontWeight: 800, color: '#92400e', fontSize: 16 }}>
              🎉 You save {fmtMoney(annualSavings)} per year ({savingsPercent.toFixed(0)}% reduction)
            </p>
            <p style={{ fontSize: 13, color: '#b45309', marginTop: 4, opacity: 0.8 }}>
              That&apos;s {fmtMoney(Math.round(annualSavings / 12))} back in your pocket every month
            </p>
          </div>
        </div>

        {/* Savings Over Time — cumulative line chart */}
        <div className="pdf-card avoid-break" style={{ padding: 36, marginBottom: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#222', marginBottom: 28 }}>Savings Over Time</h3>
          <div className="space-y-3">
            {[1, 2, 3, 5, 10, 15, 20].map(year => {
              const cumSavings = annualSavings * year;
              const maxSavings = annualSavings * 20;
              const pct = maxSavings > 0 ? (cumSavings / maxSavings) * 100 : 0;
              return (
                <div key={year} className="flex items-center gap-4">
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#999', width: 56, textAlign: 'right' }}>Year {year}</span>
                  <div style={{ flex: 1, height: 24, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(5, pct)}%`, borderRadius: 6, background: `linear-gradient(90deg, ${colors.darkGreen}, #4ade80)` }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: colors.darkGreen, width: 80, textAlign: 'right' }}>{fmtMoney(cumSavings)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Is It Worth It? callout */}
        <div className="avoid-break" style={{ background: '#e8f4fd', borderRadius: 12, padding: 32, marginBottom: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: '#1a56db', marginBottom: 16 }}>💡 Is It Worth It?</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Startup cost</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#333' }}>{fmtMoney(totalUpfront)}</p>
              <p style={{ fontSize: 11, color: '#888' }}>{requiredHives} hives + gear</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: colors.darkGreen, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Annual return</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: colors.darkGreen }}>{fmtMoney(netAnnualBenefit)}</p>
              <p style={{ fontSize: 11, color: '#888' }}>savings + honey − upkeep</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Payback period</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#b45309' }}>~{roiMonths} mo</p>
              <p style={{ fontSize: 11, color: '#888' }}>then it&apos;s pure savings</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(26,86,219,0.15)', paddingTop: 16 }}>
            {[
              { label: 'Tax savings', value: `+${fmtMoney(annualSavings)}`, color: '#15803d' },
              { label: 'Honey you can sell', value: `+${fmtMoney(honeyRevenue)}`, color: '#b45309' },
              { label: 'Yearly upkeep', value: `−${fmtMoney(annualMaintenance)}`, color: '#dc2626' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center" style={{ padding: '8px 0' }}>
                <span style={{ color: '#555' }}>{item.label}</span>
                <span style={{ fontWeight: 700, color: item.color }}>{item.value}/yr</span>
              </div>
            ))}
            <div className="flex justify-between items-center" style={{ padding: '12px 0', borderTop: '2px solid rgba(26,86,219,0.2)', marginTop: 8 }}>
              <span style={{ fontWeight: 800, color: '#222' }}>You come out ahead</span>
              <span style={{ fontWeight: 800, color: colors.darkGreen, fontSize: 18 }}>{fmtMoney(netAnnualBenefit)}/yr</span>
            </div>
          </div>
        </div>

        {/* How we calculated */}
        <div className="pdf-card avoid-break" style={{ padding: 36 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 20 }}>How We Calculated This</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Your tax rate', value: `${taxRate.toFixed(2)}%` },
              { label: 'Farmland value per acre', value: `${fmtMoney(county.agProductivityValue)}` },
              { label: 'Home site', value: `${homesteadAcres} acre` },
              { label: 'Farmable land', value: `${agEligibleAcres.toFixed(1)} acres` },
              { label: 'Hives you need', value: `${requiredHives}` },
              { label: 'Region', value: county.region },
            ].map(d => (
              <div key={d.label} style={{ background: colors.cream, borderRadius: 10, padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#999', letterSpacing: '0.03em' }}>{d.label}</p>
                <p style={{ fontSize: 20, fontWeight: 900, color: '#222', marginTop: 6 }}>{d.value}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#999', marginTop: 20, lineHeight: 1.6 }}>
            With an ag exemption, the county taxes your farmable land at the low &ldquo;farmland value&rdquo; instead of full market value. That&apos;s where the savings come from.
          </p>
        </div>

        <PageFooter name={name} county={county.name} />
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 3 — HOW TO GET YOUR EXEMPTION
          ════════════════════════════════════════════════════════════ */}
      <section id="section-2" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px 40px' }}>
        <SectionHeader emoji="📋" title="HOW TO GET YOUR EXEMPTION" />

        {/* Where to Apply — gold border card */}
        <div className="gold-border-card avoid-break" style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 16 }}>Where to Apply</h3>
          <p style={{ fontSize: 18, fontWeight: 700, color: colors.darkGreen, marginBottom: 12 }}>{county.cad.name}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="flex items-center gap-3">
              <span>🌐</span>
              <a href={county.cad.website} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>{county.cad.website}</a>
            </div>
            <div className="flex items-center gap-3">
              <span>📞</span>
              <span style={{ fontWeight: 600, color: '#333' }}>{county.cad.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>📅</span>
              <span style={{ fontWeight: 700, color: '#c53030' }}>Deadline: April 30th</span>
            </div>
          </div>
          {county.notes && (
            <div style={{ background: '#fffbeb', borderRadius: 8, padding: '12px 16px', marginTop: 16 }}>
              <p style={{ fontSize: 14, color: '#92400e' }}><strong>📝 Note:</strong> {county.notes}</p>
            </div>
          )}
        </div>

        {/* County Requirements */}
        <div className="pdf-card avoid-break" style={{ padding: 32, marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 20 }}>County Requirements</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              `Minimum land: ${county.minAcres} acres`,
              `Minimum hives: ${county.minHives} active hive${county.minHives > 1 ? 's' : ''}`,
              `Additional hives: 1 more per ${county.additionalHivesPer} acres beyond ${county.minAcres}`,
              `Your property (${acres} acres): ${requiredHives} hive${requiredHives > 1 ? 's' : ''} required`,
              `Agricultural use history: 5 of last 7 years (many counties flexible for first-timers)`,
              `Filing deadline: April 30th each year`,
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < 5 ? '1px solid #f3f4f6' : 'none' }}>
                <span style={{ color: colors.gold, fontWeight: 900, fontSize: 18, lineHeight: '24px' }}>•</span>
                <span style={{ fontSize: 14, color: '#444', lineHeight: '24px' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 5 Steps to Apply */}
        <div className="pdf-card avoid-break" style={{ padding: 32, marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 24 }}>5 Steps to Apply</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[
              { step: 1, title: 'Set Up Your Hives', desc: `Place ${requiredHives} beehive${requiredHives > 1 ? 's' : ''} on your property. Morning sun, near a water source, away from neighbors.` },
              { step: 2, title: 'Get the Application', desc: `Download the agricultural use form from your county website or call ${county.cad.phone}.` },
              { step: 3, title: 'Fill It Out & Attach Receipts', desc: `Check "Beekeeping" as your farm use. Include photos of your hives and your purchase receipts.` },
              { step: 4, title: 'Submit by April 30', desc: `Send it to ${county.cad.name} — by mail, in person, or online if they offer it.` },
              { step: 5, title: 'Wait for Approval', desc: 'The county may send someone to verify your hives are there. After that, your new (much lower!) tax bill kicks in.' },
            ].map(s => (
              <div key={s.step} className="flex gap-4">
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: colors.darkGreen, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, flexShrink: 0 }}>
                  {s.step}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 800, color: '#222', fontSize: 15, marginBottom: 4 }}>{s.title}</h4>
                  <p style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Application Checklist */}
        <div className="pdf-card avoid-break" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 20 }}>Application Checklist</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { item: 'The application form', note: 'Download from your county website or call them' },
              { item: 'Your equipment receipts', note: 'Hive boxes, bee suit, tools — anything you bought' },
              { item: 'Your bee purchase receipt', note: 'From your nuc/package bee supplier' },
              { item: 'Photos of your hives on the property', note: 'Phone photos with dates are perfect' },
              { item: 'A simple map of where hives are placed', note: 'A sketch or Google Maps screenshot works' },
              { item: 'Proof you own the property', note: 'Deed or tax statement' },
            ].map(d => (
              <div key={d.item} className="flex items-start gap-3">
                <span style={{ fontSize: 18, marginTop: 1, flexShrink: 0 }}>☐</span>
                <div>
                  <p style={{ fontWeight: 700, color: '#333', fontSize: 14 }}>{d.item}</p>
                  <p style={{ fontSize: 13, color: '#888' }}>{d.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <PageFooter name={name} county={county.name} />
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 4 — WHAT TO BUY
          ════════════════════════════════════════════════════════════ */}
      <section id="section-3" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px 40px' }}>
        <SectionHeader emoji="🛒" title="WHAT TO BUY" />

        {/* ═══ VERIFIED PRODUCTS SHOPPING LIST ═══ */}
        {(() => {
          type VerifiedProduct = { asin: string | null; url: string; name: string; price: number; rating: number; reviews: number; brand: string; perHive?: boolean };
          const products = (verifiedProducts as VerifiedProduct[]).map(p => ({
            ...p,
            qty: p.perHive ? requiredHives : 1,
            total: p.price * (p.perHive ? requiredHives : 1),
          }));
          const grandTotal = products.reduce((s, p) => s + p.total, 0);
          const annMaint = requiredHives * 75;
          const netBenefit = annualSavings - annMaint;
          const months = netBenefit > 0 ? Math.ceil((grandTotal / netBenefit) * 12) : 0;

          return (
            <>
              {/* Intro line */}
              <p style={{ fontSize: 15, color: '#555', marginBottom: 28 }}>
                Everything required for <strong>{requiredHives} hive{requiredHives > 1 ? 's' : ''}</strong>. Total estimated startup: <strong style={{ color: colors.darkGreen }}>{fmtMoney(Math.round(grandTotal))}</strong>.
              </p>

              {/* Table */}
              <div className="pdf-card avoid-break" style={{ marginBottom: 28, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: colors.darkGreen }}>
                      <th style={{ textAlign: 'left', padding: '14px 20px', color: 'white', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item</th>
                      <th style={{ textAlign: 'center', padding: '14px 16px', color: 'white', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '14px 20px', color: 'white', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: 100 }}>Est. Cost</th>
                      <th className="no-print" style={{ textAlign: 'center', padding: '14px 16px', color: 'white', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', width: 110 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((item, i) => (
                      <tr key={`shop-${item.asin || item.name}-${i}`} style={{ background: i % 2 === 0 ? 'white' : '#fafaf8' }}>
                        <td style={{ padding: '12px 20px' }}>
                          <p style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span style={{ color: '#d4a843', fontSize: 12 }}>{'★'.repeat(Math.round(item.rating))}</span>
                            <span style={{ fontSize: 11, color: '#999' }}>{fmt(item.reviews)} reviews</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: '#555', fontSize: 14 }}>{item.qty}</td>
                        <td style={{ textAlign: 'right', padding: '12px 20px', fontWeight: 700, color: '#222', fontSize: 15 }}>${item.total.toFixed(2)}</td>
                        <td className="no-print" style={{ textAlign: 'center', padding: '12px 12px' }}>
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-block transition-all hover:brightness-95 active:scale-95">
                            <img src="/amazon-buy-now.jpg" alt="Buy Now" style={{ height: 32, borderRadius: 5 }} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: colors.cream, borderTop: `2px solid ${colors.gold}` }}>
                      <td style={{ padding: '16px 20px', fontWeight: 900, color: '#222', fontSize: 16 }} colSpan={2}>TOTAL</td>
                      <td style={{ textAlign: 'right', padding: '16px 20px', fontWeight: 900, color: colors.darkGreen, fontSize: 18 }}>{fmtMoney(Math.round(grandTotal))}</td>
                      <td className="no-print"></td>
                    </tr>
                  </tfoot>
                </table>
                <p className="no-print" style={{ fontSize: 11, color: '#999', marginTop: 12, textAlign: 'center' }}>As an Amazon Associate, BeeKings earns from qualifying purchases</p>
              </div>
            </>
          );
        })()}

        {/* Hive Anatomy Infographic */}
        <div className="pdf-card avoid-break" style={{ padding: '36px 24px', marginBottom: 28, textAlign: 'center' }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 4 }}>Anatomy of a Beehive</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>A standard Langstroth hive — the most common type in Texas beekeeping</p>
          <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
            <img src="/hive-anatomy.jpg" alt="Anatomy of a Langstroth Beehive" style={{ width: '100%', display: 'block' }} />
            {/* Labels with arrows - positioned relative to image */}
            {[
              { label: 'Outer Cover', desc: 'Weather protection', top: '6%', left: '-2%', arrowTo: '32%', side: 'left' },
              { label: 'Inner Cover', desc: 'Ventilation barrier', top: '18%', left: '-2%', arrowTo: '38%', side: 'left' },
              { label: 'Honey Super', desc: 'Surplus honey storage', top: '30%', right: '-2%', arrowTo: '60%', side: 'right' },
              { label: 'Queen Excluder', desc: 'Keeps queen in brood box', top: '44%', right: '-2%', arrowTo: '55%', side: 'right' },
              { label: 'Deep Brood Box', desc: 'Queen lays eggs here', top: '60%', left: '-2%', arrowTo: '38%', side: 'left' },
              { label: 'Bottom Board', desc: 'Screened for ventilation', top: '84%', right: '-2%', arrowTo: '55%', side: 'right' },
            ].map((item) => (
              <div key={item.label} style={{
                position: 'absolute',
                top: item.top,
                ...(item.side === 'left' ? { left: item.left } : { right: item.right }),
                display: 'flex',
                alignItems: 'center',
                gap: 0,
                flexDirection: item.side === 'left' ? 'row' : 'row-reverse',
              }}>
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e5e5',
                  borderRadius: 6,
                  padding: '4px 10px',
                  boxShadow: '0 1px 4px rgba(0,0,0,.08)',
                  whiteSpace: 'nowrap',
                  zIndex: 2,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#222', margin: 0, lineHeight: 1.3 }}>{item.label}</p>
                  <p style={{ fontSize: 9, color: '#888', margin: 0, lineHeight: 1.2 }}>{item.desc}</p>
                </div>
                <svg width="40" height="2" style={{ flexShrink: 0 }}>
                  <line x1="0" y1="1" x2="36" y2="1" stroke="#d4a843" strokeWidth="1.5" />
                  {item.side === 'left'
                    ? <polygon points="36,0 40,1 36,2" fill="#d4a843" />
                    : <polygon points="4,0 0,1 4,2" fill="#d4a843" />
                  }
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* Pro Tip: Placement */}
        <div className="gold-border-card avoid-break">
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 16 }}>🏡 Pro Tip: Placement</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '☀️', rule: 'Morning sun', detail: 'Face the entrance south or southeast so bees catch the early light.' },
              { icon: '💧', rule: 'Water nearby', detail: 'Within 200 feet. A bird bath or shallow dish with rocks for landing works great.' },
              { icon: '🌬️', rule: 'Blocked from north wind', detail: 'A fence, tree line, or building on the north side keeps hives warm in winter.' },
              { icon: '📏', rule: '25+ feet from neighbors', detail: 'Face entrances away from walkways. A privacy fence helps a lot.' },
              { icon: '⬆️', rule: 'Slightly raised off the ground', detail: 'Cinder blocks or a hive stand. Keeps pests out and prevents flooding.' },
            ].map(g => (
              <div key={g.rule} className="flex items-start gap-3">
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{g.icon}</span>
                <div>
                  <p style={{ fontWeight: 700, color: '#333', fontSize: 14 }}>{g.rule}</p>
                  <p style={{ color: '#777', fontSize: 13, marginTop: 2 }}>{g.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <PageFooter name={name} county={county.name} />
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 5 — WHAT YOU NEED TO KNOW
          ════════════════════════════════════════════════════════════ */}
      <section id="section-4" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px 40px' }}>
        <SectionHeader emoji="🐝" title="WHAT YOU NEED TO KNOW" />

        {/* Two side-by-side cards: Queen & Workers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="pdf-card avoid-break" style={{ overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', padding: '20px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 4 }}>👑</div>
              <h4 style={{ fontSize: 18, fontWeight: 900, color: '#92400e' }}>The Queen (1)</h4>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: '#555' }}>
                <li style={{ padding: '4px 0' }}>• Only female that lays eggs</li>
                <li style={{ padding: '4px 0' }}>• Lays up to 2,000 eggs/day</li>
                <li style={{ padding: '4px 0' }}>• Lives 2-5 years</li>
                <li style={{ padding: '4px 0' }}>• Produces pheromones that organize the colony</li>
                <li style={{ padding: '4px 0' }}>• Largest bee in the hive</li>
              </ul>
            </div>
          </div>

          <div className="pdf-card avoid-break" style={{ overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', padding: '20px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 4 }}>🐝</div>
              <h4 style={{ fontSize: 18, fontWeight: 900, color: '#166534' }}>Workers (60k)</h4>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: '#555' }}>
                <li style={{ padding: '4px 0' }}>• All female (but don&apos;t lay eggs)</li>
                <li style={{ padding: '4px 0' }}>• Do ALL the work: foraging, nursing, guarding</li>
                <li style={{ padding: '4px 0' }}>• Live 6 weeks (summer) to 6 months (winter)</li>
                <li style={{ padding: '4px 0' }}>• Make honey, wax, propolis</li>
                <li style={{ padding: '4px 0' }}>• Only bees with stingers</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Seasonal Calendar */}
        <div className="pdf-card" style={{ padding: 32, marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 20 }}>Seasonal Calendar</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { season: 'Spring (Feb – Apr)', icon: '🌸', tasks: 'Order and install your bees. Do first hive inspections. File your ag exemption application (due April 30!). Watch for swarming.' },
              { season: 'Summer (May – Aug)', icon: '☀️', tasks: 'Add extra boxes for honey storage. Harvest honey when frames are full. Treat for varroa mites (critical!). Ensure bees have water nearby.' },
              { season: 'Fall (Sep – Nov)', icon: '🍂', tasks: 'Check hives have enough food for winter. Final mite treatment. Reduce hive entrances to keep pests out. Stop opening hives once cold.' },
              { season: 'Winter (Dec – Jan)', icon: '❄️', tasks: 'Leave hives alone — they know what to do. Check hive weight occasionally. Order next year\'s equipment and supplies.' },
            ].map(s => (
              <div key={s.season} className="flex items-start gap-3">
                <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{s.icon}</span>
                <div>
                  <p style={{ fontWeight: 800, color: '#222', fontSize: 15 }}>{s.season}</p>
                  <p style={{ fontSize: 14, color: '#666', marginTop: 4, lineHeight: 1.6 }}>{s.tasks}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Management Mistakes — pink/red tinted */}
        <div className="avoid-break" style={{ background: '#fdf2f2', borderRadius: 12, padding: 32, marginBottom: 28, border: '1px solid #fecaca' }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#991b1b', marginBottom: 20 }}>⚠️ 4 Management Mistakes That Kill Hives</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { n: 1, mistake: 'Ignoring mite treatments', fix: 'Varroa mites are the #1 killer. Treat your hives in summer and fall — every year.' },
              { n: 2, mistake: 'Taking too much honey', fix: 'Your bees need about 60 lbs of honey to survive winter. Leave enough for them.' },
              { n: 3, mistake: 'Not keeping records', fix: 'The county can ask for proof at any time. Photos, receipts, and a simple log are all you need.' },
              { n: 4, mistake: 'Going it alone', fix: 'Join a local bee club. A mentor who knows your area is worth more than any book.' },
            ].map(m => (
              <div key={m.n} className="flex gap-3">
                <span style={{ fontWeight: 900, color: '#dc2626', fontSize: 18, width: 24, flexShrink: 0 }}>{m.n}.</span>
                <div>
                  <p style={{ fontWeight: 700, color: '#7f1d1d', fontSize: 14 }}>{m.mistake}</p>
                  <p style={{ fontSize: 13, color: '#991b1b', marginTop: 2, opacity: 0.8 }}>{m.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Record Keeping Log Template */}
        <div className="pdf-card avoid-break" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 4 }}>Record Keeping Log Template</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Print this out and fill in each time you check your hives.</p>

          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.darkGreen }}>
                  {['Date', 'Hive #', 'Queen?', 'Food?', 'Notes'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'white', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(6)].map((_, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fafaf8' }}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} style={{ padding: '14px', borderBottom: '1px solid #eee', minWidth: j === 4 ? 160 : 80 }}>&nbsp;</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <PageFooter name={name} county={county.name} />
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 6 — LOCAL RESOURCES & SUPPLIERS
          ════════════════════════════════════════════════════════════ */}
      <section id="section-6" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px 40px' }}>
        <SectionHeader emoji="🏪" title="LOCAL RESOURCES & SUPPLIERS" />

        {/* Nuc Suppliers */}
        <div className="pdf-card" style={{ padding: 32, marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 4 }}>Nuc & Bee Suppliers Near You</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>{county.region} region and surrounding areas — order early, nucs sell out fast!</p>

          {nearbySuppliers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {nearbySuppliers.map(s => (
                <div key={s.name} className="gold-border-card avoid-break" style={{ padding: '16px 20px' }}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 style={{ fontWeight: 800, color: '#222', fontSize: 15 }}>{s.name}</h4>
                      <p style={{ fontSize: 12, color: '#888' }}>{s.city}, {s.county} • {s.region} region</p>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: colors.darkGreen, background: '#dcfce7', padding: '4px 12px', borderRadius: 20 }}>{s.priceRange}</span>
                  </div>
                  <div className="flex flex-wrap gap-3" style={{ fontSize: 12, marginBottom: 6 }}>
                    {s.contact.phone && <span style={{ color: '#555' }}>📞 {s.contact.phone}</span>}
                    {s.contact.website && <a href={s.contact.website} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>🌐 Website</a>}
                    {s.contact.email && <a href={`mailto:${s.contact.email}`} style={{ color: '#2563eb' }}>✉️ {s.contact.email}</a>}
                  </div>
                  {s.nucTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {s.nucTypes.map(t => (
                        <span key={t} style={{ fontSize: 11, fontWeight: 600, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 12 }}>{t}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#888' }}>📅 {s.season}</div>
                  {s.notes && <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: '#888', textAlign: 'center', padding: '24px 0' }}>No suppliers found in your immediate region. Check statewide suppliers or contact BeeKings for sourcing help.</p>
          )}
        </div>

        {/* Beekeeping Association */}
        <div className="gold-border-card avoid-break" style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 16 }}>Beekeeping Associations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h4 style={{ fontWeight: 800, color: '#222', fontSize: 15 }}>Texas Beekeepers Association (TBA)</h4>
              <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Statewide organization with local chapters across Texas</p>
              <a href="https://texasbeekeepers.org" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#2563eb', marginTop: 4, display: 'inline-block' }}>🌐 texasbeekeepers.org</a>
            </div>
            <div style={{ borderTop: '1px solid #f0f0e8', paddingTop: 12 }}>
              <h4 style={{ fontWeight: 800, color: '#222', fontSize: 15 }}>{county.region} Beekeeping Clubs</h4>
              <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Search for &ldquo;{county.name} County beekeeping association&rdquo; or visit the TBA website for a chapter locator.</p>
            </div>
            <div style={{ borderTop: '1px solid #f0f0e8', paddingTop: 12 }}>
              <h4 style={{ fontWeight: 800, color: '#222', fontSize: 15 }}>Texas Apiary Inspection Service (TAIS)</h4>
              <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Free hive inspections, disease identification, and certification via Texas A&M AgriLife Extension.</p>
              <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>📞 (979) 845-9713 · <a href="https://txbeeinspection.tamu.edu" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>txbeeinspection.tamu.edu</a></p>
            </div>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="pdf-card avoid-break" style={{ padding: 32, marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 20 }}>Emergency Contacts & Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ background: '#fdf2f2', borderRadius: 10, padding: 16 }}>
              <h4 style={{ fontWeight: 800, color: '#991b1b', marginBottom: 8, fontSize: 14 }}>🐝 Swarm Removal</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: '#7f1d1d' }}>
                <li>• Contact your local bee club first</li>
                <li>• TBA Swarm Hotline: check texasbeekeepers.org</li>
                <li>• {county.name} County Extension: call for referrals</li>
              </ul>
            </div>
            <div style={{ background: '#eff6ff', borderRadius: 10, padding: 16 }}>
              <h4 style={{ fontWeight: 800, color: '#1e3a5f', marginBottom: 8, fontSize: 14 }}>👑 Queen Replacement Sources</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: '#1e40af' }}>
                <li>• BeeWeaver Apiaries — (737) 230-3435</li>
                <li>• Local nuc suppliers (see above)</li>
                <li>• Olivarez Honey Bees — (877) 865-0298</li>
              </ul>
            </div>
            <div style={{ background: '#fffbeb', borderRadius: 10, padding: 16 }}>
              <h4 style={{ fontWeight: 800, color: '#92400e', marginBottom: 8, fontSize: 14 }}>🏥 Hive Health Emergency</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: '#92400e' }}>
                <li>• TAIS Disease Lab: (979) 845-9713</li>
                <li>• County Extension Agent</li>
                <li>• Local beekeeping mentor</li>
              </ul>
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16 }}>
              <h4 style={{ fontWeight: 800, color: '#166534', marginBottom: 8, fontSize: 14 }}>📚 Additional Resources</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: '#166534' }}>
                <li>• <a href="https://agrilifeextension.tamu.edu" style={{ textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">Texas A&M AgriLife Extension</a></li>
                <li>• <a href="https://comptroller.texas.gov/taxes/property-tax/" style={{ textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">TX Comptroller — Property Tax</a></li>
                <li>• <a href="https://beekings.com" style={{ textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">BeeKings.com</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Dark Green CTA Block */}
        <div className="avoid-break" style={{ background: colors.darkGreen, borderRadius: 16, padding: '40px 36px', textAlign: 'center', color: 'white' }}>
          <h3 style={{ fontSize: 24, fontWeight: 900, color: colors.gold, marginBottom: 12 }}>
            Ready to Start Saving {fmtMoney(annualSavings)}/Year?
          </h3>
          <p style={{ fontSize: 15, opacity: 0.75, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.7 }}>
            BeeKings provides everything you need: equipment, bees, training, and ongoing support to get your agricultural exemption.
          </p>
          <a
            href="https://beekings.com"
            target="_blank"
            rel="noopener noreferrer"
            className="no-print"
            style={{
              display: 'inline-block',
              background: colors.gold,
              color: colors.darkGreen,
              fontWeight: 800,
              fontSize: 16,
              padding: '14px 36px',
              borderRadius: 10,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            Visit BeeKings.com →
          </a>
        </div>

        <PageFooter name={name} county={county.name} />
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 5 — RECORD KEEPING & EXPENSES (kept from original)
          ════════════════════════════════════════════════════════════ */}
      <section id="section-5" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px 40px' }}>
        <SectionHeader emoji="📋" title="KEEPING YOUR RECORDS STRAIGHT" />

        <div className="pdf-card avoid-break" style={{ padding: 32, marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 8 }}>The Short Version: Keep Your Receipts</h3>
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, marginBottom: 20 }}>
            The county can ask to see proof that you&apos;re actually keeping bees. If you can&apos;t show it, they can take your exemption away — and charge you back taxes with interest. The good news: this is easy.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { title: 'Save every receipt', desc: 'Hives, bees, tools, treatments, feed — anything you spend money on. A folder or envelope per year works.' },
              { title: 'Take photos of your hives each season', desc: 'Your phone timestamps them automatically. Four times a year is plenty.' },
              { title: 'Keep a simple log', desc: 'A notebook or spreadsheet with dates and what you did. "March 15 — inspected hives, all look healthy" is enough.' },
              { title: 'Hold onto everything for 7 years', desc: 'That\'s the standard rule for tax records. A shoebox in your closet works fine.' },
            ].map(item => (
              <div key={item.title} style={{ borderBottom: '1px solid #f0f0e8', paddingBottom: 16 }}>
                <p style={{ fontWeight: 700, color: '#333', fontSize: 14 }}>{item.title}</p>
                <p style={{ color: '#777', fontSize: 13, marginTop: 4 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#fffbeb', borderLeft: `4px solid ${colors.gold}`, borderRadius: '0 8px 8px 0', padding: '14px 18px', marginTop: 20 }}>
            <p style={{ fontSize: 13, color: '#92400e' }}>
              <strong>Bonus:</strong> These same records let you deduct beekeeping expenses on your federal taxes too (IRS Schedule F). Your tax preparer will love you.
            </p>
          </div>
        </div>

        {/* What it Costs */}
        <div className="pdf-card avoid-break" style={{ padding: 32, marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 8 }}>What It Costs to Run Your Hives</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Year 1 costs more because you&apos;re buying everything. After that, it&apos;s mostly just supplies.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { cat: 'Hive boxes & equipment', y1: fmtMoney(requiredHives * hiveCost), y2: '—', note: 'One-time purchase' },
              { cat: 'Bees', y1: fmtMoney(requiredHives * nucCost), y2: fmtMoney(Math.round(requiredHives * 0.2) * nucCost), note: 'Replacements if any colonies die' },
              { cat: 'Bee suit & tools', y1: '$148', y2: '$35', note: 'Suit, gloves, smoker, hive tool' },
              { cat: 'Feed & mite treatments', y1: fmtMoney(requiredHives * 55), y2: fmtMoney(requiredHives * 45), note: 'Sugar syrup, pollen, Apivar strips' },
              { cat: 'Honey supplies', y1: '—', y2: '$125', note: 'Jars, labels, extraction gear' },
            ].map((item) => (
              <div key={item.cat} className="flex items-center gap-4" style={{ padding: '12px 0', borderBottom: '1px solid #f0f0e8' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: '#444', fontSize: 14 }}>{item.cat}</p>
                  <p style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{item.note}</p>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right', width: 72 }}>
                  <p style={{ fontSize: 10, color: '#999' }}>Year 1</p>
                  <p style={{ fontWeight: 700, color: '#333', fontSize: 14 }}>{item.y1}</p>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right', width: 72 }}>
                  <p style={{ fontSize: 10, color: '#999' }}>Year 2+</p>
                  <p style={{ fontWeight: 600, color: '#666', fontSize: 14 }}>{item.y2}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between" style={{ marginTop: 20, paddingTop: 16, borderTop: `2px solid ${colors.gold}` }}>
            <div>
              <p style={{ fontWeight: 800, color: '#222' }}>Your tax savings each year</p>
              <p style={{ fontSize: 12, color: '#888' }}>This is what you save — every single year</p>
            </div>
            <p style={{ fontSize: 24, fontWeight: 900, color: colors.darkGreen }}>{fmtMoney(annualSavings)}</p>
          </div>
        </div>

        {/* YouTube Videos */}
        <div className="pdf-card" style={{ padding: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: '#222', marginBottom: 4 }}>Watch These First</h3>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Five free YouTube videos that cover everything a beginner needs.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {videos.slice(0, 5).map(v => (
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4"
                style={{ padding: '10px 12px', borderRadius: 10, textDecoration: 'none', color: 'inherit', transition: 'background 0.2s' }}
              >
                <div style={{ flexShrink: 0, width: 72, height: 48, borderRadius: 8, overflow: 'hidden', background: '#eee', position: 'relative' }}>
                  <img
                    src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                    alt={v.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 24, height: 24, background: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.85 }}>
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="white"><polygon points="3,1 10,6 3,11" /></svg>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: '#333', fontSize: 14, lineHeight: 1.3 }}>{v.title}</p>
                  <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{v.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        <PageFooter name={name} county={county.name} />
      </section>

      {/* ════════════════════════════════════════════════════════════
          SECTION 7 — FOOTER
          ════════════════════════════════════════════════════════════ */}
      <footer className="page-break" style={{ background: colors.darkGreen, color: 'white' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px' }}>
          {/* CTA Box */}
          <div className="text-center mb-12 no-print">
            <div style={{ display: 'inline-block', borderRadius: 20, padding: '40px 48px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🐝</div>
              <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, color: colors.gold }}>Ready to Start Saving {fmtMoney(annualSavings)}/Year?</h2>
              <p style={{ fontSize: 16, opacity: 0.65, marginBottom: 28, lineHeight: 1.7, maxWidth: 400, margin: '0 auto 28px' }}>
                BeeKings provides everything: hives, bees, equipment, training, and ongoing support.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://beekings.com" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 10, fontWeight: 800, fontSize: 16, background: colors.gold, color: colors.darkGreen, textDecoration: 'none' }}>
                  Visit BeeKings.com →
                </a>
                <a href="mailto:info@beekings.com" style={{ display: 'inline-block', padding: '14px 32px', borderRadius: 10, fontWeight: 800, fontSize: 16, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', textDecoration: 'none' }}>
                  Email Us
                </a>
              </div>
            </div>
          </div>

          {/* Footer info */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center gap-4">
              <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 36, filter: 'brightness(2)' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700 }}>BeeKings</p>
                <p style={{ fontSize: 12, opacity: 0.5 }}>Canton, Texas • info@beekings.com</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p style={{ fontSize: 12, opacity: 0.4 }}>Report generated {today()}</p>
              <p style={{ fontSize: 12, opacity: 0.4 }}>© {new Date().getFullYear()} BeeKings. All rights reserved.</p>
            </div>
          </div>

          {/* Last page footer */}
          <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ fontSize: 12, opacity: 0.4, letterSpacing: '0.05em' }}>
              BeeKings.com • Report #{reportNumber} • Confidential
            </p>
          </div>

          <div style={{ marginTop: 24, padding: '16px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 11, opacity: 0.4, lineHeight: 1.6 }}>
              <strong>Disclaimer:</strong> This report is for informational purposes only and does not constitute tax or legal advice. Estimates are based on publicly available county tax data and standard calculations. Actual savings depend on your specific property, CAD approval, and current tax rates. Property tax regulations vary by county and are subject to change. Consult with your county appraisal district and/or a qualified tax professional for advice specific to your situation. BeeKings provides beekeeping equipment, bees, and education — not tax or legal advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE EXPORT WITH SUSPENSE
   ═══════════════════════════════════════════════════════════════ */
export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.cream }}>
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐝</div>
          <p className="text-lg font-bold text-gray-700">Generating your report...</p>
          <p className="text-sm text-gray-400 mt-0.5">This may take a moment</p>
        </div>
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
