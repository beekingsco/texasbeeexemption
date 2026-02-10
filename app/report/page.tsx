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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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

  return (
    <div className="report-wrapper">
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
        @keyframes countUp { from { opacity: 0; } to { opacity: 1; } }
        .fade-up { animation: fadeInUp 0.6s ease-out both; }
        .fade-up-1 { animation-delay: 0.1s; }
        .fade-up-2 { animation-delay: 0.2s; }
        .fade-up-3 { animation-delay: 0.3s; }
        .bar-grow { animation: barGrow 1.2s ease-out both; }

        /* ═══ HEXAGON PATTERN BG ═══ */
        .hex-bg {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L52 17.5 L52 42.5 L30 55 L8 42.5 L8 17.5 Z' fill='none' stroke='%23f59e0b' stroke-width='0.3' opacity='0.12'/%3E%3C/svg%3E");
        }

        /* ═══ HIVE DIAGRAM ═══ */
        .hive-part { transition: transform 0.2s, box-shadow 0.2s; cursor: default; }
        .hive-part:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 10; position: relative; }

        /* ═══ CLEAN TABLE STYLES ═══ */
        .clean-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .clean-table th { 
          text-align: left; padding: 14px 16px; font-weight: 600; font-size: 12px; 
          text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; 
          border-bottom: none; background: transparent;
        }
        .clean-table td { padding: 14px 16px; border-bottom: none; }
        .clean-table tbody tr:last-child td { border-bottom: none; }
        .clean-table tbody tr:nth-child(even) { background: #fafafa; }
        .clean-table tfoot td { padding: 16px; font-weight: 700; border-top: none; border-bottom: none; }

        /* ═══ EXPENSE TABLE (dotted fill-in rows) ═══ */
        .expense-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .expense-table th {
          text-align: left; padding: 14px 16px; font-weight: 600; font-size: 12px;
          text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280;
          border-bottom: none; background: transparent;
        }
        .expense-table td { padding: 12px 16px; }
        .expense-table .example-row td { border-bottom: none; }
        .expense-table .blank-row td { border-bottom: none; }
        .expense-table tfoot td { padding: 14px 16px; font-weight: 700; border-top: none; }
      `}</style>

      {/* ════════════════════════════════════════════
          FLOATING PRINT BUTTON
          ════════════════════════════════════════════ */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
          </svg>
          Save as PDF
        </button>
      </div>

      {/* ════════════════════════════════════════════
          COVER / HEADER
          ════════════════════════════════════════════ */}
      <header className="hex-bg" style={{ background: 'linear-gradient(145deg, #1a2332 0%, #243b53 50%, #1a2332 100%)', color: 'white', padding: '56px 24px 64px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="flex items-center justify-between mb-8">
            <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 44 }} />
            <div className="text-right text-sm opacity-70">
              <div>Report #{Math.floor(Math.random() * 90000 + 10000)}</div>
              <div>{today()}</div>
            </div>
          </div>

          <div className="text-center fade-up">
            <div className="inline-block px-5 py-1.5 rounded-full text-xs font-semibold tracking-wider mb-5" style={{ background: 'rgba(245,178,51,0.15)', color: '#f5c542', border: '1px solid rgba(245,178,51,0.25)', letterSpacing: '0.1em' }}>
              Personalized Property Report
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ lineHeight: 1.15 }}>
              {county.name} County<br />
              <span style={{ color: '#f5c542' }}>Tax Savings Report</span>
            </h1>
            <p className="text-lg opacity-75 mb-6" style={{ fontWeight: 400 }}>Agricultural Exemption Through Beekeeping</p>

            <div className="inline-block rounded-2xl px-8 py-4 mb-4" style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <p className="text-sm opacity-60 mb-1">Prepared exclusively for</p>
              <p className="text-2xl font-bold">{name}</p>
              {email && <p className="text-sm opacity-50 mt-1">{email}</p>}
            </div>
          </div>

          {/* Hero savings number */}
          <div className="text-center mt-8 fade-up fade-up-1">
            <div className="inline-block rounded-3xl px-12 py-8" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(245,158,11,0.15))', border: '1px solid rgba(245,158,11,0.25)' }}>
              <p className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: '#86efac' }}>Estimated Annual Savings</p>
              <p className="text-6xl md:text-7xl font-black" style={{ color: '#4ade80' }}>{fmtMoney(annualSavings)}</p>
              <p className="text-sm opacity-60 mt-2">per year on property taxes • {savingsPercent.toFixed(0)}% reduction</p>
            </div>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════
          TABLE OF CONTENTS
          ════════════════════════════════════════════ */}
      <div className="no-print" style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 0' }}>
        <div className="report-section bg-white rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 tracking-wide mb-4">What&apos;s in this report</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { n: '1', title: 'How Much You\'ll Save', anchor: 'section-1' },
              { n: '2', title: 'How to Get Your Exemption', anchor: 'section-2' },
              { n: '3', title: 'What to Buy', anchor: 'section-3' },
              { n: '4', title: 'What You Need to Know', anchor: 'section-4' },
              { n: '5', title: 'Keeping Your Records Straight', anchor: 'section-5' },
              { n: '6', title: 'People Who Can Help', anchor: 'section-6' },
            ].map(item => (
              <a key={item.n} href={`#${item.anchor}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <span className="text-xl font-black text-amber-500 shrink-0 w-6">{item.n}</span>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-green-600 transition-colors">{item.title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 1: TAX SAVINGS ANALYSIS
          ════════════════════════════════════════════ */}
      <section id="section-1" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <div className="flex items-start gap-5 mb-10">
          <div className="text-5xl leading-none shrink-0 pt-1">💰</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900" style={{ letterSpacing: '-0.01em' }}>How Much You&apos;ll Save</h2>
            <p className="text-sm text-gray-400 mt-0.5">{county.name} County · {acres} acres · {fmtMoney(propertyValue)} property value</p>
          </div>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
          {[
            { label: 'You pay now', value: fmtMoney(currentTaxes), sub: 'per year', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
            { label: 'With beekeeping', value: fmtMoney(totalWithAg), sub: 'per year', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
            { label: 'You save', value: fmtMoney(annualSavings), sub: `${savingsPercent.toFixed(0)}% less`, bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
            { label: 'Over 10 years', value: fmtMoney(annualSavings * 10), sub: 'total savings', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
          ].map(m => (
            <div key={m.label} className="avoid-break rounded-2xl p-5 text-center" style={{ background: m.bg }}>
              <p className="text-xs font-semibold tracking-wide mb-2" style={{ color: m.text, opacity: 0.7 }}>{m.label}</p>
              <p className="text-3xl font-black" style={{ color: m.text }}>{m.value}</p>
              <p className="text-xs mt-1" style={{ color: m.text, opacity: 0.5 }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Visual bar chart */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-8">Your Taxes — Before and After</h3>

          <div className="mb-8">
            <div className="flex justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">What you pay now</span>
              <span className="text-lg font-bold text-red-600">{fmtMoney(currentTaxes)}/yr</span>
            </div>
            <div className="h-10 rounded-xl overflow-hidden" style={{ background: '#fde8e8' }}>
              <div className="h-full rounded-xl bar-grow" style={{ width: '100%', background: 'linear-gradient(90deg, #ef4444, #f87171)' }} />
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">What you&apos;d pay with beekeeping</span>
              <span className="text-lg font-bold text-green-600">{fmtMoney(totalWithAg)}/yr</span>
            </div>
            <div className="h-10 rounded-xl overflow-hidden" style={{ background: '#dcfce7' }}>
              <div className="h-full rounded-xl bar-grow" style={{ width: `${Math.max(5, (totalWithAg / currentTaxes) * 100)}%`, background: 'linear-gradient(90deg, #16a34a, #4ade80)' }} />
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-xl" style={{ background: '#fefcf3' }}>
            <span className="text-4xl leading-none shrink-0">🎉</span>
            <div>
              <p className="font-bold text-amber-800 text-lg">You save {fmtMoney(annualSavings)} per year ({savingsPercent.toFixed(0)}% reduction)</p>
              <p className="text-sm text-amber-700 mt-1" style={{ opacity: 0.7 }}>That&apos;s {fmtMoney(Math.round(annualSavings / 12))} back in your pocket every month</p>
            </div>
          </div>
        </div>

        {/* Year-over-year savings projection */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-8">How Your Savings Add Up Over Time</h3>
          <div className="space-y-4">
            {[1, 2, 3, 5, 10, 15, 20].map(year => {
              const cumSavings = annualSavings * year;
              const maxSavings = annualSavings * 20;
              const pct = maxSavings > 0 ? (cumSavings / maxSavings) * 100 : 0;
              return (
                <div key={year} className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-400 w-16 text-right">Year {year}</span>
                  <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg" style={{ width: `${Math.max(5, pct)}%`, background: `linear-gradient(90deg, #22c55e, #4ade80)` }} />
                  </div>
                  <span className="text-sm font-bold text-green-700 w-20 text-right">{fmtMoney(cumSavings)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROI calculation */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-3">Is It Worth It?</h3>
          <p className="text-sm text-gray-400 mb-8">Here&apos;s the math on what you put in vs. what you get back.</p>

          <div className="grid grid-cols-3 gap-3 md:gap-5 mb-8">
            <div className="text-center py-4">
              <p className="text-xs font-semibold text-gray-400 mb-2">Startup cost</p>
              <p className="text-2xl md:text-3xl font-black text-gray-900">{fmtMoney(totalUpfront)}</p>
              <p className="text-xs text-gray-400 mt-1">{requiredHives} hives + gear</p>
            </div>
            <div className="text-center py-4">
              <p className="text-xs font-semibold text-green-600 mb-2">Annual return</p>
              <p className="text-2xl md:text-3xl font-black text-green-600">{fmtMoney(netAnnualBenefit)}</p>
              <p className="text-xs text-gray-400 mt-1">savings + honey − upkeep</p>
            </div>
            <div className="text-center py-4">
              <p className="text-xs font-semibold text-amber-600 mb-2">Pays for itself in</p>
              <p className="text-2xl md:text-3xl font-black text-amber-600">~{roiMonths} mo</p>
              <p className="text-xs text-gray-400 mt-1">then it&apos;s pure savings</p>
            </div>
          </div>

          <div className="space-y-0">
            {[
              { label: 'Tax savings', value: `+${fmtMoney(annualSavings)}`, color: '#15803d' },
              { label: 'Honey you can sell', value: `+${fmtMoney(honeyRevenue)}`, color: '#b45309' },
              { label: 'Yearly upkeep', value: `−${fmtMoney(annualMaintenance)}`, color: '#dc2626' },
            ].map((item, i) => (
              <div key={item.label} className="flex justify-between items-center py-4" style={{ borderBottom: 'none' }}>
                <span className="text-gray-500">{item.label}</span>
                <span className="font-semibold" style={{ color: item.color }}>{item.value}/yr</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-5 mt-2" style={{ borderTop: 'none' }}>
              <span className="font-bold text-gray-800">You come out ahead</span>
              <span className="font-bold text-green-700 text-lg">{fmtMoney(netAnnualBenefit)}/yr</span>
            </div>
          </div>
        </div>

        {/* County-specific details */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10">
          <h3 className="text-xl font-black text-gray-800 mb-6">How We Calculated This</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { label: 'Your tax rate', value: `${taxRate.toFixed(2)}%` },
              { label: 'Farmland value per acre', value: `${fmtMoney(county.agProductivityValue)}` },
              { label: 'Home site', value: `${homesteadAcres} acre` },
              { label: 'Farmable land', value: `${agEligibleAcres.toFixed(1)} acres` },
              { label: 'Hives you need', value: `${requiredHives}` },
              { label: 'Region', value: county.region },
            ].map(d => (
              <div key={d.label} className="p-5 rounded-xl" style={{ background: '#f9fafb' }}>
                <p className="text-xs font-medium text-gray-400 tracking-wide">{d.label}</p>
                <p className="text-xl font-black text-gray-800 mt-2">{d.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-6 leading-relaxed">With an ag exemption, the county taxes your farmable land at the low &ldquo;farmland value&rdquo; instead of full market value. That&apos;s where the savings come from.</p>
        </div>
      </section>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}><hr style={{ border: 'none', borderTop: '1px solid #e0e0e0' }} /></div>

      {/* ════════════════════════════════════════════
          SECTION 2: COUNTY PLAYBOOK
          ════════════════════════════════════════════ */}
      <section id="section-2" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <div className="flex items-start gap-5 mb-10">
          <div className="text-5xl leading-none shrink-0 pt-1">📋</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900" style={{ letterSpacing: '-0.01em' }}>How to Get Your Exemption</h2>
            <p className="text-sm text-gray-400 mt-0.5">{county.name} County — step by step</p>
          </div>
        </div>

        {/* CAD Info Card */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-6">Where to Apply</h3>
          <div className="rounded-xl p-6" style={{ background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)' }}>
            <p className="text-xl font-bold text-blue-900 mb-3">{county.cad.name}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-lg">🌐</span>
                <a href={county.cad.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">{county.cad.website}</a>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">📞</span>
                <span className="font-semibold text-gray-800">{county.cad.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">📅</span>
                <span className="font-semibold text-red-700">Application Deadline: April 30th</span>
              </div>
            </div>
          </div>
          {county.notes && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50">
              <p className="text-sm text-amber-800"><strong>📝 County Note:</strong> {county.notes}</p>
            </div>
          )}
        </div>

        {/* County requirements */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-3">What {county.name} County Requires</h3>
          <p className="text-sm text-gray-400 mb-8">Here&apos;s what the county needs to see for you to qualify.</p>
          <div className="space-y-5">
            {[
              { q: 'How much land do I need?', a: `At least ${county.minAcres} acres.` },
              { q: 'How many beehives?', a: `At least ${county.minHives} active hive${county.minHives > 1 ? 's' : ''}. Larger properties need 1 more hive for every ${county.additionalHivesPer} acres past ${county.minAcres}.` },
              { q: 'What does that mean for my property?', a: `With ${acres} acres, you need ${requiredHives} hive${requiredHives > 1 ? 's' : ''}.` },
              { q: 'Do I need to have been farming before?', a: 'Technically, the county looks for 5 out of the last 7 years of agricultural use. But many counties grant first-time exemptions — just ask.' },
              { q: 'When is the deadline?', a: 'April 30th each year. File early if you can.' },
            ].map(item => (
              <div key={item.q} style={{ borderBottom: 'none', paddingBottom: 20 }}>
                <p className="font-semibold text-gray-800 mb-1">{item.q}</p>
                <p className="text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-step process */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-3">How to Apply — 5 Simple Steps</h3>
          <p className="text-sm text-gray-400 mb-8">Most people complete this process in a single afternoon.</p>
          <div className="space-y-8">
            {[
              { step: 1, title: 'Set up your hives', desc: `Place ${requiredHives} beehive${requiredHives > 1 ? 's' : ''} on your property. Morning sun, near a water source, away from neighbors.` },
              { step: 2, title: 'Get the application', desc: `Download the agricultural use form from your county website or call ${county.cad.phone}.` },
              { step: 3, title: 'Fill it out and attach your receipts', desc: `Check "Beekeeping" as your farm use. Include photos of your hives and your purchase receipts.` },
              { step: 4, title: 'Submit by April 30', desc: `Send it to ${county.cad.name} — by mail, in person, or online if they offer it.` },
              { step: 5, title: 'Wait for approval', desc: 'The county may send someone to verify your hives are there. After that, your new (much lower!) tax bill kicks in.' },
            ].map(s => (
              <div key={s.step} className="flex gap-5">
                <div className="shrink-0">
                  <span className="text-3xl font-black text-green-600">{s.step}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 mb-1">{s.title}</h4>
                  <p className="text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documentation checklist */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10">
          <h3 className="text-xl font-black text-gray-800 mb-3">What to Gather Before You Apply</h3>
          <p className="text-sm text-gray-400 mb-8">A simple checklist. Most of this you&apos;ll already have.</p>
          <div className="space-y-4">
            {[
              { item: 'The application form', note: 'Download from your county website or call them' },
              { item: 'Your equipment receipts', note: 'Hive boxes, bee suit, tools — anything you bought' },
              { item: 'Your bee purchase receipt', note: 'From your nuc/package bee supplier' },
              { item: 'Photos of your hives on the property', note: 'Phone photos with dates are perfect' },
              { item: 'A simple map of where hives are placed', note: 'A sketch or Google Maps screenshot works' },
              { item: 'Proof you own the property', note: 'Deed or tax statement' },
            ].map(d => (
              <div key={d.item} className="flex items-start gap-4 py-1">
                <span className="mt-0.5 text-lg shrink-0">☐</span>
                <div>
                  <p className="font-semibold text-gray-800">{d.item}</p>
                  <p className="text-sm text-gray-400">{d.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}><hr style={{ border: 'none', borderTop: '1px solid #e0e0e0' }} /></div>

      {/* ════════════════════════════════════════════
          SECTION 3: EQUIPMENT & AMAZON SHOPPING LIST
          ════════════════════════════════════════════ */}
      <section id="section-3" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <div className="flex items-start gap-5 mb-10">
          <div className="text-5xl leading-none shrink-0 pt-1">🛒</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900" style={{ letterSpacing: '-0.01em' }}>What to Buy</h2>
            <p className="text-sm text-gray-400 mt-0.5">Everything for {requiredHives} hive{requiredHives > 1 ? 's' : ''} — ready to order on Amazon</p>
          </div>
        </div>

        {/* Hive Anatomy Infographic — kept from original */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-2">Anatomy of a Beehive</h3>
          <p className="text-sm text-gray-400 mb-8">A standard Langstroth hive — the most common type in Texas beekeeping</p>

          <div className="flex flex-col items-center gap-0" style={{ maxWidth: 480, margin: '0 auto' }}>
            <div className="hive-part w-full rounded-t-xl p-3 text-center border-2" style={{ background: 'linear-gradient(135deg, #64748b, #475569)', borderColor: '#334155', color: 'white' }}>
              <p className="text-xs font-bold uppercase tracking-wider">Outer Cover (Telescoping Lid)</p>
              <p className="text-xs opacity-70">Protects from rain, snow & sun</p>
            </div>
            <div className="hive-part w-11/12 p-2 text-center border-x-2 border-b-2" style={{ background: '#f8fafc', borderColor: '#94a3b8' }}>
              <p className="text-xs font-bold text-gray-700">Inner Cover</p>
              <p className="text-xs text-gray-500">Ventilation & insulation barrier</p>
            </div>
            <div className="hive-part w-11/12 p-4 text-center border-x-2 border-b-2" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', borderColor: '#d97706' }}>
              <p className="text-sm font-bold text-amber-800">🍯 Honey Super (Medium Box)</p>
              <p className="text-xs text-amber-700">Where bees store surplus honey for harvest</p>
              <div className="flex justify-center gap-1 mt-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-5 h-8 rounded-sm" style={{ background: 'linear-gradient(to bottom, #fbbf24, #f59e0b)', border: '1px solid #d97706' }} />
                ))}
              </div>
              <p className="text-xs text-amber-600 mt-1">← Frames with honeycomb →</p>
            </div>
            <div className="hive-part w-11/12 p-2 text-center border-x-2 border-b-2" style={{ background: 'repeating-linear-gradient(90deg, #e2e8f0 0px, #e2e8f0 3px, transparent 3px, transparent 6px)', borderColor: '#64748b' }}>
              <p className="text-xs font-bold text-gray-700">⚡ Queen Excluder</p>
              <p className="text-xs text-gray-500">Keeps queen below — workers pass through to store honey</p>
            </div>
            <div className="hive-part w-11/12 p-5 text-center border-x-2 border-b-2" style={{ background: 'linear-gradient(135deg, #fed7aa, #fdba74)', borderColor: '#c2410c' }}>
              <p className="text-sm font-bold text-orange-900">👑 Deep Brood Box</p>
              <p className="text-xs text-orange-800">Queen lives & lays eggs here — the heart of the colony</p>
              <div className="flex justify-center gap-1 mt-2">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="w-4 h-10 rounded-sm" style={{ background: i < 3 || i > 6 ? 'linear-gradient(to bottom, #fbbf24, #d97706)' : 'linear-gradient(to bottom, #fb923c, #ea580c)', border: '1px solid #c2410c' }} />
                ))}
              </div>
              <p className="text-xs text-orange-700 mt-1">Honey frames | Brood frames | Honey frames</p>
            </div>
            <div className="hive-part w-full p-3 text-center border-2 border-t-0" style={{ background: 'linear-gradient(135deg, #a8a29e, #78716c)', borderColor: '#57534e', color: 'white' }}>
              <p className="text-xs font-bold">Bottom Board (Screened)</p>
              <p className="text-xs opacity-80">Ventilation & mite monitoring</p>
            </div>
            <div className="hive-part w-8/12 p-2 text-center rounded-b-lg border-2 border-t-0" style={{ background: '#44403c', borderColor: '#292524', color: 'white' }}>
              <p className="text-xs font-bold">🚪 Entrance Reducer</p>
              <p className="text-xs opacity-70">Controls access & defends against robbing</p>
            </div>
            <div className="flex justify-center gap-16 mt-2">
              <div className="w-4 h-6 rounded-sm" style={{ background: '#78716c' }} />
              <div className="w-4 h-6 rounded-sm" style={{ background: '#78716c' }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Hive Stand (keeps hive off ground)</p>
          </div>
        </div>

        {/* ═══ YOUR SHOPPING LIST — VERIFIED PRODUCTS ═══ */}
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
            <div className="report-section bg-white rounded-2xl mb-8 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 md:px-8 md:py-6" style={{ background: 'linear-gradient(135deg, #fefce8, #fef9c3)' }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Your Shopping List</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{products.length} items for {requiredHives} hive{requiredHives > 1 ? 's' : ''} — everything you need to get started</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-gray-900">{fmtMoney(Math.round(grandTotal))}</p>
                    <p className="text-xs text-green-700 font-semibold">Pays for itself in ~{months} months</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                {products.map((item, i) => (
                  <div key={`shop-${item.asin || item.name}-${i}`} className="px-5 py-5 md:px-8 md:py-6">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 leading-snug">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-amber-400 text-sm">{'★'.repeat(Math.round(item.rating))}</span>
                          <span className="text-xs text-gray-400">{fmt(item.reviews)} reviews</span>
                          {item.qty > 1 && <span className="text-xs text-gray-400">· Qty: {item.qty}</span>}
                        </div>
                      </div>
                      <span className="text-xl font-bold text-gray-900 shrink-0">${item.total.toFixed(2)}</span>
                    </div>
                    <div className="no-print mt-3">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block transition-all hover:brightness-95 active:scale-95"
                      >
                        <img src="/amazon-buy-now.jpg" alt="Buy Now on Amazon" style={{ height: 44, borderRadius: 8 }} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total + CTA */}
              <div className="px-6 py-5 md:px-8 md:py-6" style={{ background: '#fafafa' }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-gray-700">Total</span>
                  <span className="text-2xl font-black text-gray-900">{fmtMoney(Math.round(grandTotal))}</span>
                </div>
                <div className="no-print text-center">
                  <a
                    href="https://www.amazon.com/s?k=beekeeping+starter+kit&tag=BeeKings-20"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block transition-all hover:brightness-95 shadow-md"
                    style={{ borderRadius: 8 }}
                  >
                    <img src="/amazon-buy-now.jpg" alt="Buy Now on Amazon" style={{ height: 52, borderRadius: 8 }} />
                  </a>
                  <p className="text-xs text-gray-400 mt-2">As an Amazon Associate, BeeKings earns from qualifying purchases</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Hive Placement Guide */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10">
          <h3 className="text-xl font-black text-gray-800 mb-3">Where to Put Your Hives</h3>
          <p className="text-sm text-gray-400 mb-8">Pick a spot that checks most of these boxes and you&apos;re good to go.</p>
          <div className="space-y-5">
            {[
              { icon: '☀️', rule: 'Morning sun', detail: 'Face the entrance south or southeast so bees catch the early light.' },
              { icon: '💧', rule: 'Water nearby', detail: 'Within 200 feet. A bird bath or shallow dish with rocks for landing works great.' },
              { icon: '🌬️', rule: 'Blocked from north wind', detail: 'A fence, tree line, or building on the north side keeps hives warm in winter.' },
              { icon: '📏', rule: '25+ feet from neighbors', detail: 'Face entrances away from walkways. A privacy fence helps a lot.' },
              { icon: '⬆️', rule: 'Slightly raised off the ground', detail: 'Cinder blocks or a hive stand. Keeps pests out and prevents flooding.' },
            ].map(g => (
              <div key={g.rule} className="flex items-start gap-4" style={{ borderBottom: 'none', paddingBottom: 20 }}>
                <span className="text-xl shrink-0 mt-0.5">{g.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800">{g.rule}</p>
                  <p className="text-gray-500 mt-0.5">{g.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}><hr style={{ border: 'none', borderTop: '1px solid #e0e0e0' }} /></div>

      {/* ════════════════════════════════════════════
          SECTION 4: BEEKEEPING BASICS
          ════════════════════════════════════════════ */}
      <section id="section-4" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <div className="flex items-start gap-5 mb-10">
          <div className="text-5xl leading-none shrink-0 pt-1">🐝</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900" style={{ letterSpacing: '-0.01em' }}>What You Need to Know</h2>
            <p className="text-sm text-gray-400 mt-0.5">A quick crash course — no experience needed</p>
          </div>
        </div>

        {/* The 3 Types of Bees */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-8">Meet the Colony — The 3 Types of Bees</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Queen */}
            <div className="rounded-2xl overflow-hidden">
              <div className="p-4 text-center" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                <div className="text-5xl mb-2">👑</div>
                <h4 className="text-lg font-black text-amber-900">The Queen</h4>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">1 per colony</p>
              </div>
              <div className="p-4 bg-white">
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Only female that lays eggs</li>
                  <li>• Lays up to 2,000 eggs/day</li>
                  <li>• Lives 2-5 years</li>
                  <li>• Produces pheromones that organize the colony</li>
                  <li>• Largest bee in the hive</li>
                </ul>
              </div>
            </div>

            {/* Worker */}
            <div className="rounded-2xl overflow-hidden">
              <div className="p-4 text-center" style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)' }}>
                <div className="text-5xl mb-2">🐝</div>
                <h4 className="text-lg font-black text-green-900">The Worker</h4>
                <p className="text-xs font-bold text-green-700 uppercase tracking-wider">20,000-60,000 per colony</p>
              </div>
              <div className="p-4 bg-white">
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• All female (but don&apos;t lay eggs)</li>
                  <li>• Do ALL the work: foraging, nursing, guarding, cleaning</li>
                  <li>• Live 6 weeks (summer) to 6 months (winter)</li>
                  <li>• Make honey, wax, propolis</li>
                  <li>• Only bees with stingers</li>
                </ul>
              </div>
            </div>

            {/* Drone */}
            <div className="rounded-2xl overflow-hidden">
              <div className="p-4 text-center" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>
                <div className="text-5xl mb-2">🎩</div>
                <h4 className="text-lg font-black text-blue-900">The Drone</h4>
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">200-2,000 per colony</p>
              </div>
              <div className="p-4 bg-white">
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• All male</li>
                  <li>• Only purpose: mate with queens</li>
                  <li>• Don&apos;t forage, clean, or guard</li>
                  <li>• Bigger eyes, no stinger</li>
                  <li>• Kicked out before winter</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Seasonal Calendar — 4 seasons */}
        <div className="report-section bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-3">What to Do Each Season</h3>
          <p className="text-sm text-gray-400 mb-8">A simple year-round guide for your beehives</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { season: 'Spring', months: 'Feb – Apr', icon: '🌸', color: '#f0fdf4', border: '#bbf7d0', textColor: '#166534', tasks: [
                'Order and install your bees',
                'Do your first hive inspections',
                'File your ag exemption application (due April 30!)',
                'Watch for swarming — give bees room to grow',
              ]},
              { season: 'Summer', months: 'May – Aug', icon: '☀️', color: '#fffbeb', border: '#fde68a', textColor: '#92400e', tasks: [
                'Add extra boxes for honey storage',
                'Harvest honey when frames are full',
                'Treat for varroa mites (critical!)',
                'Make sure bees have water nearby',
              ]},
              { season: 'Fall', months: 'Sep – Nov', icon: '🍂', color: '#fef2f2', border: '#fecaca', textColor: '#991b1b', tasks: [
                'Check that hives have enough food for winter',
                'Do a final mite treatment',
                'Reduce hive entrances to keep pests out',
                'Stop opening hives once it gets cold',
              ]},
              { season: 'Winter', months: 'Dec – Jan', icon: '❄️', color: '#eff6ff', border: '#bfdbfe', textColor: '#1e40af', tasks: [
                'Leave hives alone — they know what to do',
                'Check hive weight occasionally (lift one side)',
                'Order next year\'s equipment and supplies',
                'Plan any expansions for spring',
              ]},
            ].map(s => (
              <div key={s.season} className="avoid-break rounded-2xl p-6" style={{ background: s.color }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p className="font-bold text-gray-900">{s.season}</p>
                    <p className="text-xs text-gray-400">{s.months}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {s.tasks.map(task => (
                    <li key={task} className="flex items-start gap-2">
                      <span className="text-xs mt-1.5" style={{ color: s.textColor }}>●</span>
                      <span className="text-sm leading-relaxed" style={{ color: s.textColor }}>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Common Mistakes */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-3">Four Mistakes That Kill Hives</h3>
          <p className="text-sm text-gray-400 mb-8">Avoid these and you&apos;re already ahead of most beginners.</p>
          <div className="space-y-5">
            {[
              { mistake: 'Ignoring mite treatments', fix: 'Varroa mites are the #1 killer. Treat your hives in summer and fall — every year.' },
              { mistake: 'Taking too much honey', fix: 'Your bees need about 60 lbs of honey to survive winter. Leave enough for them.' },
              { mistake: 'Not keeping records', fix: 'The county can ask for proof at any time. Photos, receipts, and a simple log are all you need.' },
              { mistake: 'Going it alone', fix: 'Join a local bee club. A mentor who knows your area is worth more than any book.' },
            ].map(m => (
              <div key={m.mistake} style={{ borderBottom: 'none', paddingBottom: 20 }}>
                <p className="font-semibold text-gray-800 mb-1">{m.mistake}</p>
                <p className="text-gray-500 leading-relaxed">{m.fix}</p>
              </div>
            ))}
          </div>
        </div>

        {/* YouTube Videos */}
        <div className="report-section bg-white rounded-2xl p-10">
          <h3 className="text-xl font-black text-gray-800 mb-3">Watch These First</h3>
          <p className="text-sm text-gray-400 mb-8">Five free YouTube videos that cover everything a beginner needs.</p>
          <div className="space-y-4">
            {videos.slice(0, 5).map(v => (
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all group"
                style={{ borderBottom: 'none' }}
              >
                <div className="shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-gray-200 relative">
                  <img
                    src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                    alt={v.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="white"><polygon points="3,1 10,6 3,11" /></svg>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 group-hover:text-red-700 transition-colors leading-snug">{v.title}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{v.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}><hr style={{ border: 'none', borderTop: '1px solid #e0e0e0' }} /></div>

      {/* ════════════════════════════════════════════
          SECTION 5: EXPENSE TRACKING & RECORD KEEPING
          ════════════════════════════════════════════ */}
      <section id="section-5" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <div className="flex items-start gap-5 mb-10">
          <div className="text-5xl leading-none shrink-0 pt-1">📋</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900" style={{ letterSpacing: '-0.01em' }}>Keeping Your Records Straight</h2>
            <p className="text-sm text-gray-400 mt-0.5">It&apos;s easier than you think — and it protects your savings</p>
          </div>
        </div>

        {/* Why Records Matter — simplified */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-3">The Short Version: Keep Your Receipts</h3>
          <p className="text-gray-500 leading-relaxed mb-8">The county can ask to see proof that you&apos;re actually keeping bees. If you can&apos;t show it, they can take your exemption away — and charge you back taxes with interest. The good news: this is easy.</p>

          <div className="space-y-5">
            <div style={{ borderBottom: 'none', paddingBottom: 20 }}>
              <p className="font-semibold text-gray-800 mb-1">Save every receipt</p>
              <p className="text-gray-500">Hives, bees, tools, treatments, feed — anything you spend money on. A folder or envelope per year works.</p>
            </div>
            <div style={{ borderBottom: 'none', paddingBottom: 20 }}>
              <p className="font-semibold text-gray-800 mb-1">Take photos of your hives each season</p>
              <p className="text-gray-500">Your phone timestamps them automatically. Four times a year is plenty.</p>
            </div>
            <div style={{ borderBottom: 'none', paddingBottom: 20 }}>
              <p className="font-semibold text-gray-800 mb-1">Keep a simple log</p>
              <p className="text-gray-500">A notebook or spreadsheet with dates and what you did. &ldquo;March 15 — inspected hives, all look healthy&rdquo; is enough.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">Hold onto everything for 7 years</p>
              <p className="text-gray-500">That&apos;s the standard rule for tax records. A shoebox in your closet works fine.</p>
            </div>
          </div>

          <div className="p-5 rounded-xl mt-8" style={{ background: '#fefcf3' }}>
            <p className="text-sm text-amber-800"><strong>Bonus:</strong> These same records let you deduct beekeeping expenses on your federal taxes too (IRS Schedule F). Your tax preparer will love you.</p>
          </div>
        </div>

        {/* What it Costs to Run Your Hives */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-3">What It Costs to Run Your Hives</h3>
          <p className="text-sm text-gray-400 mb-8">Year 1 costs more because you&apos;re buying everything. After that, it&apos;s mostly just supplies.</p>

          <div className="space-y-0">
            {[
              { cat: 'Hive boxes & equipment', y1: fmtMoney(requiredHives * hiveCost), y2: '—', note: 'One-time purchase' },
              { cat: 'Bees', y1: fmtMoney(requiredHives * nucCost), y2: fmtMoney(Math.round(requiredHives * 0.2) * nucCost), note: 'Replacements if any colonies die' },
              { cat: 'Bee suit & tools', y1: '$148', y2: '$35', note: 'Suit, gloves, smoker, hive tool' },
              { cat: 'Feed & mite treatments', y1: fmtMoney(requiredHives * 55), y2: fmtMoney(requiredHives * 45), note: 'Sugar syrup, pollen, Apivar strips' },
              { cat: 'Honey supplies', y1: '—', y2: '$125', note: 'Jars, labels, extraction gear' },
            ].map((item, i) => (
              <div key={item.cat} className="flex items-center gap-4 py-4" style={{ borderBottom: 'none' }}>
                <div className="flex-1">
                  <p className="font-medium text-gray-700">{item.cat}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>
                </div>
                <div className="shrink-0 text-right w-20">
                  <p className="text-xs text-gray-400">Year 1</p>
                  <p className="font-semibold text-gray-800">{item.y1}</p>
                </div>
                <div className="shrink-0 text-right w-20">
                  <p className="text-xs text-gray-400">Year 2+</p>
                  <p className="font-semibold text-gray-600">{item.y2}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-8 pt-6 px-1" style={{ borderTop: 'none' }}>
            <div>
              <p className="font-bold text-gray-800">Your tax savings each year</p>
              <p className="text-sm text-gray-400">This is what you save — every single year</p>
            </div>
            <p className="text-2xl font-bold text-green-700">{fmtMoney(annualSavings)}</p>
          </div>
        </div>

        {/* Hive Inspection Log Template */}
        <div className="report-section bg-white rounded-2xl p-10">
          <h3 className="text-xl font-black text-gray-800 mb-3">Quick Hive Check Template</h3>
          <p className="text-sm text-gray-400 mb-8">Print this out and fill in one each time you check your hives. Keeps your records organized.</p>

          <div className="p-8 rounded-2xl" style={{ background: '#f9fafb' }}>
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Date</p>
                <div style={{ borderBottom: '1px solid #d1d5db', height: 24 }} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Hive #</p>
                <div style={{ borderBottom: '1px solid #d1d5db', height: 24 }} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Weather</p>
                <div style={{ borderBottom: '1px solid #d1d5db', height: 24 }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-8">
              {[
                'Queen spotted?', 'Eggs visible?', 'Enough food stored?', 'Any signs of mites?',
                'Bees seem calm?', 'Colony looks strong?',
              ].map(item => (
                <label key={item} className="flex items-center gap-3">
                  <span className="text-base">☐</span>
                  <span className="text-sm text-gray-600">{item}</span>
                </label>
              ))}
            </div>

            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">Notes (what did you see? what did you do?)</p>
              <div style={{ borderBottom: '1px solid #d1d5db', height: 24 }} />
              <div style={{ borderBottom: '1px solid #d1d5db', height: 24, marginTop: 12 }} />
              <div style={{ borderBottom: '1px solid #d1d5db', height: 24, marginTop: 12 }} />
            </div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}><hr style={{ border: 'none', borderTop: '1px solid #e0e0e0' }} /></div>

      {/* ════════════════════════════════════════════
          SECTION 6: LOCAL BEE RESOURCES
          ════════════════════════════════════════════ */}
      <section id="section-6" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        <div className="flex items-start gap-5 mb-10">
          <div className="text-5xl leading-none shrink-0 pt-1">🗺️</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900" style={{ letterSpacing: '-0.01em' }}>People Who Can Help</h2>
            <p className="text-sm text-gray-400 mt-0.5">Suppliers, clubs, and contacts near {county.name} County</p>
          </div>
        </div>

        {/* Nuc Suppliers */}
        <div className="report-section bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-2">Nuc & Bee Suppliers Near You</h3>
          <p className="text-sm text-gray-400 mb-8">{county.region} region and surrounding areas — order early, nucs sell out fast!</p>

          {nearbySuppliers.length > 0 ? (
            <div className="space-y-4">
              {nearbySuppliers.map(s => (
                <div key={s.name} className="avoid-break p-5 rounded-xl transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900">{s.name}</h4>
                      <p className="text-xs text-gray-500">{s.city}, {s.county} • {s.region} region</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full">{s.priceRange}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs mb-2">
                    {s.contact.phone && (
                      <span className="flex items-center gap-1 text-gray-600">📞 {s.contact.phone}</span>
                    )}
                    {s.contact.website && (
                      <a href={s.contact.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">🌐 Website</a>
                    )}
                    {s.contact.email && (
                      <a href={`mailto:${s.contact.email}`} className="flex items-center gap-1 text-blue-600 hover:underline">✉️ {s.contact.email}</a>
                    )}
                  </div>
                  {s.nucTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {s.nucTypes.map(t => (
                        <span key={t} className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>📅 {s.season}</span>
                  </div>
                  {s.notes && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{s.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No suppliers found in your immediate region. Check the statewide suppliers below or contact BeeKings for sourcing help.</p>
          )}
        </div>

        {/* Local Beekeeping Associations */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-2">Beekeeping Associations</h3>
          <p className="text-sm text-gray-400 mb-6">Local clubs are the #1 resource for new beekeepers. Monthly meetings, mentors, and equipment swaps.</p>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-amber-50">
              <h4 className="font-bold text-amber-900">Texas Beekeepers Association (TBA)</h4>
              <p className="text-sm text-amber-800 mt-1">Statewide organization with local chapters across Texas</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                <a href="https://texasbeekeepers.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">🌐 texasbeekeepers.org</a>
                <span className="text-amber-700">📅 Annual convention in November</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <h4 className="font-bold text-gray-900">{county.region} Beekeeping Clubs</h4>
              <p className="text-sm text-gray-600 mt-1">Search for &ldquo;{county.name} County beekeeping association&rdquo; or visit the TBA website for a chapter locator. Most clubs meet monthly and welcome beginners.</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <h4 className="font-bold text-gray-900">Texas Master Beekeeper Program</h4>
              <p className="text-sm text-gray-600 mt-1">Run by TBA — levels from Apprentice to Master. Great education and credentials for your ag exemption documentation.</p>
              <a href="https://texasbeekeepers.org/master-beekeeper-program/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Learn more →</a>
            </div>
          </div>
        </div>

        {/* Texas Apiary Inspection Service */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10 mb-8">
          <h3 className="text-xl font-black text-gray-800 mb-6">Texas Apiary Inspection Service (TAIS)</h3>
          <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
            <p className="text-sm text-green-800 mb-3">The TAIS is part of Texas A&M AgriLife Extension. They provide free hive inspections, disease identification, and certification.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-bold text-green-900">Contact</p>
                <p className="text-sm text-green-800">Texas A&M AgriLife Extension</p>
                <p className="text-sm text-green-800">Phone: (979) 845-9713</p>
              </div>
              <div>
                <p className="text-xs font-bold text-green-900">Services</p>
                <ul className="text-sm text-green-800 space-y-0.5">
                  <li>• Free hive disease inspections</li>
                  <li>• Colony health certificates</li>
                  <li>• Educational resources</li>
                </ul>
              </div>
            </div>
            <a href="https://txbeeinspection.tamu.edu" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-3 inline-block">🌐 txbeeinspection.tamu.edu</a>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="report-section avoid-break bg-white rounded-2xl p-10">
          <h3 className="text-xl font-black text-gray-800 mb-6">Emergency Contacts & Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-red-50">
              <h4 className="font-bold text-red-900 mb-2">🐝 Swarm Removal</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Contact your local bee club first</li>
                <li>• TBA Swarm Hotline: check texasbeekeepers.org</li>
                <li>• {county.name} County Extension: call for local referrals</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-blue-50">
              <h4 className="font-bold text-blue-900 mb-2">👑 Queen Replacement Sources</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• BeeWeaver Apiaries — (737) 230-3435</li>
                <li>• Local nuc suppliers (see above)</li>
                <li>• Olivarez Honey Bees — (877) 865-0298</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-amber-50">
              <h4 className="font-bold text-amber-900 mb-2">🏥 Hive Health Emergency</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• TAIS Disease Lab: (979) 845-9713</li>
                <li>• County Extension Agent</li>
                <li>• Local beekeeping mentor</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-green-50">
              <h4 className="font-bold text-green-900 mb-2">📚 Additional Resources</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• <a href="https://agrilifeextension.tamu.edu" className="underline" target="_blank" rel="noopener noreferrer">Texas A&M AgriLife Extension</a></li>
                <li>• <a href="https://comptroller.texas.gov/taxes/property-tax/" className="underline" target="_blank" rel="noopener noreferrer">TX Comptroller — Property Tax</a></li>
                <li>• <a href="https://beekings.com" className="underline" target="_blank" rel="noopener noreferrer">BeeKings.com</a></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          FOOTER / CTA
          ════════════════════════════════════════════ */}
      <footer className="page-break" style={{ background: 'linear-gradient(145deg, #1a2332, #2d4a6f)', color: 'white' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 24px' }}>
          {/* CTA Box */}
          <div className="text-center mb-12 no-print">
            <div className="inline-block rounded-3xl p-10" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-5xl mb-4">🐝</div>
              <h2 className="text-3xl font-bold mb-4">Ready to Start Saving {fmtMoney(annualSavings)}/Year?</h2>
              <p className="text-lg opacity-65 mb-8" style={{ lineHeight: 1.7 }}>BeeKings provides everything: hives, bees, equipment, training, and ongoing support.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://beekings.com" target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-4 rounded-xl font-bold text-lg transition-transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#0f172a' }}>
                  Visit BeeKings.com →
                </a>
                <a href="mailto:info@beekings.com" className="inline-block px-8 py-4 rounded-xl font-bold text-lg transition-transform hover:scale-105" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
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
                <p className="text-sm font-semibold">BeeKings</p>
                <p className="text-xs opacity-50">Canton, Texas • info@beekings.com</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-xs opacity-40">Report generated {today()}</p>
              <p className="text-xs opacity-40">© {new Date().getFullYear()} BeeKings. All rights reserved.</p>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs opacity-40 leading-relaxed">
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
