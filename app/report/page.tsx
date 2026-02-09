'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import countiesData from '@/data/texas-counties.json';
import suppliersData from '@/data/texas-nuc-suppliers.json';
import amazonProducts from '@/data/amazon-products.json';

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">County Not Found</h1>
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
        /* ═══ PRINT STYLES ═══ */
        @media print {
          @page { margin: 0.5in; size: letter; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          .report-wrapper { padding: 0 !important; }
          .report-section { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          a { text-decoration: none !important; }
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
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L52 17.5 L52 42.5 L30 55 L8 42.5 L8 17.5 Z' fill='none' stroke='%23f59e0b' stroke-width='0.3' opacity='0.15'/%3E%3C/svg%3E");
        }

        /* ═══ HIVE DIAGRAM ═══ */
        .hive-part { transition: transform 0.2s, box-shadow 0.2s; cursor: default; }
        .hive-part:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10; position: relative; }
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
      <header className="hex-bg" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)', color: 'white', padding: '48px 24px 56px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="flex items-center justify-between mb-8">
            <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 44 }} />
            <div className="text-right text-sm opacity-70">
              <div>Report #{Math.floor(Math.random() * 90000 + 10000)}</div>
              <div>{today()}</div>
            </div>
          </div>

          <div className="text-center fade-up">
            <div className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-4" style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
              Personalized Property Report
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-3 leading-tight">
              {county.name} County<br />
              <span style={{ color: '#fbbf24' }}>Tax Savings Report</span>
            </h1>
            <p className="text-lg opacity-80 mb-6">Agricultural Exemption Through Beekeeping</p>

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
        <div className="report-section bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">📑 Table of Contents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { n: '1', title: 'Property Tax Savings Analysis', anchor: 'section-1' },
              { n: '2', title: 'Your County Playbook', anchor: 'section-2' },
              { n: '3', title: 'Equipment & Shopping List', anchor: 'section-3' },
              { n: '4', title: 'Beekeeping Basics', anchor: 'section-4' },
              { n: '5', title: 'Expense Tracking & Record Keeping', anchor: 'section-5' },
              { n: '6', title: 'Local Bee Resources', anchor: 'section-6' },
            ].map(item => (
              <a key={item.n} href={`#${item.anchor}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">{item.n}</span>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-green-600 transition-colors">{item.title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SECTION 1: TAX SAVINGS ANALYSIS
          ════════════════════════════════════════════ */}
      <section id="section-1" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-xl">💰</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Your Property Tax Savings Analysis</h2>
            <p className="text-sm text-gray-500">{county.name} County, Texas • {acres} acres • {fmtMoney(propertyValue)} appraised value</p>
          </div>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Current Taxes', value: fmtMoney(currentTaxes), sub: '/year', color: 'bg-red-50 text-red-700 border-red-100' },
            { label: 'With Ag Exemption', value: fmtMoney(totalWithAg), sub: '/year', color: 'bg-green-50 text-green-700 border-green-100' },
            { label: 'Annual Savings', value: fmtMoney(annualSavings), sub: `${savingsPercent.toFixed(0)}% less`, color: 'bg-amber-50 text-amber-700 border-amber-100' },
            { label: '10-Year Savings', value: fmtMoney(annualSavings * 10), sub: 'cumulative', color: 'bg-blue-50 text-blue-700 border-blue-100' },
          ].map(m => (
            <div key={m.label} className={`avoid-break rounded-2xl p-4 border ${m.color}`}>
              <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{m.label}</p>
              <p className="text-2xl font-black">{m.value}</p>
              <p className="text-xs opacity-60">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Visual bar chart */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Tax Comparison — Before vs. After</h3>

          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Without Ag Exemption</span>
              <span className="text-lg font-black text-red-600">{fmtMoney(currentTaxes)}/yr</span>
            </div>
            <div className="h-10 bg-red-100 rounded-xl overflow-hidden">
              <div className="h-full bg-red-500 rounded-xl bar-grow" style={{ width: '100%' }} />
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">With Beekeeping Ag Exemption</span>
              <span className="text-lg font-black text-green-600">{fmtMoney(totalWithAg)}/yr</span>
            </div>
            <div className="h-10 bg-green-100 rounded-xl overflow-hidden">
              <div className="h-full bg-green-500 rounded-xl bar-grow" style={{ width: `${Math.max(5, (totalWithAg / currentTaxes) * 100)}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#fef9ee', border: '1px solid #fde68a' }}>
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-amber-800">You save {fmtMoney(annualSavings)} per year ({savingsPercent.toFixed(0)}% reduction)</p>
              <p className="text-sm text-amber-700 opacity-80">That&apos;s {fmtMoney(Math.round(annualSavings / 12))} back in your pocket every month</p>
            </div>
          </div>
        </div>

        {/* Year-over-year savings projection */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Cumulative Savings Projection</h3>
          <div className="space-y-3">
            {[1, 2, 3, 5, 10, 15, 20].map(year => {
              const cumSavings = annualSavings * year;
              const maxSavings = annualSavings * 20;
              const pct = maxSavings > 0 ? (cumSavings / maxSavings) * 100 : 0;
              return (
                <div key={year} className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-500 w-16 text-right">Year {year}</span>
                  <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg flex items-center px-3" style={{ width: `${Math.max(8, pct)}%`, background: `linear-gradient(90deg, #16a34a, #22c55e)` }}>
                      <span className="text-xs font-bold text-white whitespace-nowrap">{fmtMoney(cumSavings)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROI calculation */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">🐝 Return on Investment</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', color: 'white' }}>
              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Startup Investment</p>
              <p className="text-3xl font-black">{fmtMoney(totalUpfront)}</p>
              <p className="text-xs opacity-50 mt-1">{requiredHives} hives + equipment</p>
            </div>
            <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #14532d, #16a34a)', color: 'white' }}>
              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Net Annual Benefit</p>
              <p className="text-3xl font-black">{fmtMoney(netAnnualBenefit)}</p>
              <p className="text-xs opacity-50 mt-1">savings + honey − maintenance</p>
            </div>
            <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #78350f, #d97706)', color: 'white' }}>
              <p className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Payback Period</p>
              <p className="text-3xl font-black">~{roiMonths} mo</p>
              <p className="text-xs opacity-50 mt-1">to recoup your investment</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Tax savings</span>
              <span className="font-bold text-green-700">+{fmtMoney(annualSavings)}/yr</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Honey production ({requiredHives * 30} lbs × $20/lb)</span>
              <span className="font-bold text-amber-700">+{fmtMoney(honeyRevenue)}/yr</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Annual maintenance ({requiredHives} hives × $75)</span>
              <span className="font-bold text-red-600">−{fmtMoney(annualMaintenance)}/yr</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg" style={{ background: '#fef9ee', border: '1px solid #fde68a' }}>
              <span className="font-bold text-gray-900">Net annual benefit</span>
              <span className="font-black text-green-700">{fmtMoney(netAnnualBenefit)}/yr</span>
            </div>
          </div>
        </div>

        {/* County-specific details */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">County Tax Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Avg. Tax Rate', value: `${taxRate.toFixed(2)}%` },
              { label: 'Ag Productivity Value', value: `${fmtMoney(county.agProductivityValue)}/acre` },
              { label: 'Homestead (non-ag)', value: `${homesteadAcres} acre` },
              { label: 'Ag-Eligible Acres', value: `${agEligibleAcres.toFixed(1)} acres` },
              { label: 'Required Hives', value: `${requiredHives} colonies` },
              { label: 'Region', value: county.region },
            ].map(d => (
              <div key={d.label} className="p-4 rounded-xl bg-gray-50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{d.label}</p>
                <p className="text-lg font-black text-gray-900 mt-1">{d.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 2: COUNTY PLAYBOOK
          ════════════════════════════════════════════ */}
      <section id="section-2" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-xl">📋</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Your {county.name} County Playbook</h2>
            <p className="text-sm text-gray-500">Everything you need to file for your ag exemption</p>
          </div>
        </div>

        {/* CAD Info Card */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Your County Appraisal District</h3>
          <div className="rounded-xl p-6" style={{ background: 'linear-gradient(135deg, #eff6ff, #f0f9ff)', border: '1px solid #bfdbfe' }}>
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
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800"><strong>📝 County Note:</strong> {county.notes}</p>
            </div>
          )}
        </div>

        {/* County requirements */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{county.name} County Beekeeping Requirements</h3>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0f172a', color: 'white' }}>
                  <th className="text-left p-4 font-bold">Requirement</th>
                  <th className="text-left p-4 font-bold">{county.name} County</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Minimum Acreage', `${county.minAcres} acres`],
                  ['Minimum Hives', `${county.minHives} active colonies`],
                  ['Additional Hives', `1 additional hive per ${county.additionalHivesPer} acres beyond ${county.minAcres}`],
                  ['Your Property', `${acres} acres → ${requiredHives} hive${requiredHives > 1 ? 's' : ''} required`],
                  ['Ag History Required', '5 out of 7 preceding tax years'],
                  ['Tax Rate', `${taxRate.toFixed(2)}%`],
                  ['Productivity Value', `${fmtMoney(county.agProductivityValue)}/acre (vs. market rate)`],
                ].map(([label, value], i) => (
                  <tr key={label} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="p-4 font-semibold text-gray-700">{label}</td>
                    <td className="p-4 font-bold text-gray-900">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step-by-step process */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Step-by-Step Application Process</h3>
          <div className="space-y-6">
            {[
              { step: 1, title: 'Set Up Your Beekeeping Operation', time: 'Months 1-3', desc: `Install at least ${requiredHives} active bee colonies on your property. Place hives in a suitable location with morning sun, wind protection, and a nearby water source.` },
              { step: 2, title: 'Start Keeping Records Immediately', time: 'Ongoing', desc: 'Document everything: purchase receipts, hive inspection logs, photos of your operation, honey production records, and management activities. The CAD may ask for proof.' },
              { step: 3, title: 'Obtain the Application Form', time: 'January - March', desc: `Download the 1-D-1 Agricultural Use Application from ${county.cad.website} or call ${county.cad.phone} to request a copy.` },
              { step: 4, title: 'Complete the Application', time: 'Before April 30', desc: `Fill out all sections. Mark "Beekeeping/Apiculture" as your agricultural use. List ${requiredHives} colonies on ${agEligibleAcres.toFixed(1)} ag-eligible acres. Attach your management documentation.` },
              { step: 5, title: `Submit to ${county.cad.name}`, time: 'By April 30', desc: 'Submit your completed application with all supporting documentation. Keep a copy for your records. You can submit in person, by mail, or online (if available).' },
              { step: 6, title: 'Property Inspection (If Required)', time: 'May - June', desc: 'The CAD may send an appraiser to verify your operation. Ensure hives are visible, actively managed, and appear healthy. Have your management log ready to show.' },
              { step: 7, title: 'Receive Your New Appraisal', time: 'Mid-Year', desc: 'Review your updated property appraisal showing the ag valuation. Verify the productivity value was applied to qualifying acreage. If denied, you can protest to the Appraisal Review Board.' },
            ].map(s => (
              <div key={s.step} className="flex gap-4">
                <div className="shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}>{s.step}</div>
                </div>
                <div className="flex-1 pb-6" style={{ borderBottom: s.step < 7 ? '1px solid #f3f4f6' : 'none' }}>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-bold text-gray-900">{s.title}</h4>
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{s.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documentation checklist */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📝 Required Documentation Checklist</h3>
          <p className="text-sm text-gray-500 mb-4">Check off each item as you gather your documents. All items should be ready before filing.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              '1-D-1 Agricultural Use Application (completed)',
              'Property deed or proof of ownership',
              'Receipts for hive equipment purchases',
              'Receipts for bee colony (nuc) purchases',
              'Hive management/inspection log',
              'Photos of hives on property (quarterly)',
              'Honey production records',
              'Map showing hive placement on property',
              'Equipment & supply receipts',
              'Beekeeping course certificate (if available)',
              'Annual expense summary',
              'Prior year ag exemption (if renewing)',
            ].map(item => (
              <label key={item} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <span className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 shrink-0 flex items-center justify-center text-xs">☐</span>
                <span className="text-sm text-gray-700">{item}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 3: EQUIPMENT & AMAZON SHOPPING LIST
          ════════════════════════════════════════════ */}
      <section id="section-3" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-xl">🛒</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Your Personalized Shopping List</h2>
            <p className="text-sm text-gray-500">Everything you need for {requiredHives} hive{requiredHives > 1 ? 's' : ''} in {county.name} County — ready to buy on Amazon</p>
          </div>
        </div>

        {/* Hive Anatomy Infographic — kept from original */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Anatomy of a Beehive</h3>
          <p className="text-sm text-gray-500 mb-6">A standard Langstroth hive — the most common type in Texas beekeeping</p>

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

        {/* ═══ AMAZON SHOPPING LIST ═══ */}
        {(() => {
          const tierOrder = [
            { key: 'budget' as const, bg: 'linear-gradient(135deg, #14532d, #16a34a)', badgeBg: '#16a34a' },
            { key: 'recommended' as const, bg: 'linear-gradient(135deg, #78350f, #d97706)', badgeBg: '#d97706' },
            { key: 'premium' as const, bg: 'linear-gradient(135deg, #1e3a8a, #2563eb)', badgeBg: '#2563eb' },
          ];

          return (
            <>
              {/* Tier overview cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {tierOrder.map(({ key, bg }) => {
                  const t = shoppingTiers[key];
                  const annMaint = requiredHives * 75;
                  const netBenefit = annualSavings - annMaint;
                  const months = netBenefit > 0 ? Math.ceil((t.total / netBenefit) * 12) : 0;
                  return (
                    <div key={key} className="rounded-2xl p-5 text-center text-white" style={{ background: bg }}>
                      <p className="text-2xl mb-1">{t.emoji}</p>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-70">{t.label}</p>
                      <p className="text-3xl font-black mt-1">{fmtMoney(Math.round(t.total))}</p>
                      <p className="text-xs opacity-60 mt-1">{t.items.length} items</p>
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                        <p className="text-xs opacity-80">Pays for itself in</p>
                        <p className="text-lg font-black">~{months} months</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detailed tier tables */}
              {tierOrder.map(({ key, bg, badgeBg }) => {
                const t = shoppingTiers[key];
                const annMaint = requiredHives * 75;
                const netBenefit = annualSavings - annMaint;
                const months = netBenefit > 0 ? Math.ceil((t.total / netBenefit) * 12) : 0;

                return (
                  <div key={key} className="report-section bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
                    {/* Tier header */}
                    <div className="p-6 text-white" style={{ background: bg }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-black">{t.emoji} {t.label}</p>
                          <p className="text-sm opacity-80 mt-1">{t.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black">{fmtMoney(Math.round(t.total))}</p>
                          <p className="text-xs opacity-60">{t.items.length} items for {requiredHives} hive{requiredHives > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Product</th>
                            <th className="text-center p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Qty</th>
                            <th className="text-right p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Unit</th>
                            <th className="text-right p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Total</th>
                            <th className="text-center p-3 font-bold text-gray-600 text-xs uppercase tracking-wider no-print">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.items.map((item, i) => (
                            <tr key={`${key}-${item.product.asin}-${i}`} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-100 hover:bg-amber-50 transition-colors`}>
                              <td className="p-3">
                                <div className="flex items-start gap-3">
                                  <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">📦</div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-gray-900 text-sm leading-tight">{item.product.name}</p>
                                      {item.product.recommended && (
                                        <span className="shrink-0 text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: '#16a34a' }}>🐝 BeeKings Pick</span>
                                      )}
                                      {key === 'budget' && i === 0 && (
                                        <span className="shrink-0 text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: '#d97706' }}>💰 Best Value</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">{item.product.brand} • ⭐ {item.product.rating} ({fmt(item.product.reviews)} reviews)</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-center font-semibold text-gray-700">{item.qty}</td>
                              <td className="p-3 text-right text-gray-700">${item.product.price.toFixed(2)}</td>
                              <td className="p-3 text-right font-bold text-gray-900">${item.total.toFixed(2)}</td>
                              <td className="p-3 text-center no-print">
                                <a
                                  href={item.product.amazonUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                                  style={{ background: '#ff9900', color: '#0f172a' }}
                                >
                                  View on Amazon →
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid #fde68a' }}>
                            <td colSpan={3} className="p-4 font-bold text-gray-900 text-right text-base">{t.emoji} {t.label} Total</td>
                            <td className="p-4 text-right font-black text-xl" style={{ color: badgeBg }}>{fmtMoney(Math.round(t.total))}</td>
                            <td className="p-4 no-print" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* ROI bar */}
                    <div className="p-4 border-t border-gray-100" style={{ background: '#fefce8' }}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📊</span>
                          <span className="text-sm text-gray-700">
                            <strong>{t.label} startup:</strong> {fmtMoney(Math.round(t.total))} → <strong className="text-green-700">Tax savings: {fmtMoney(annualSavings)}/yr</strong>
                          </span>
                        </div>
                        <span className="text-sm font-black px-3 py-1 rounded-full text-white" style={{ background: badgeBg }}>
                          Pays for itself in ~{months} months
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Open Full Shopping List on Amazon button */}
              <div className="no-print text-center mb-6">
                <a
                  href={`https://www.amazon.com/dp/${shoppingTiers.recommended.items[0]?.product.asin || 'B09P3TCT4T'}?tag=BeeKings-20`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-lg font-black transition-all hover:scale-105 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #ff9900, #ffad33)', color: '#0f172a' }}
                >
                  🛒 Shop Beekeeping Equipment on Amazon
                </a>
                <p className="text-xs text-gray-400 mt-2">As an Amazon Associate, BeeKings earns from qualifying purchases</p>
              </div>
            </>
          );
        })()}

        {/* Hive Placement Guide */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Hive Placement Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '☀️', title: 'Sun Exposure', desc: 'Face hive entrance south or southeast for morning sun. Full sun is ideal in Texas — bees get active earlier and stay productive longer.', tip: 'Afternoon shade is okay in summer to help with heat' },
              { icon: '🌬️', title: 'Wind Protection', desc: 'Place hives near a windbreak (fence, building, tree line) on the north side. Cold north winds in winter can stress colonies.', tip: 'Don\'t block the entrance — bees need clear flight path' },
              { icon: '💧', title: 'Water Source', desc: 'Bees need water within 200 feet. A bird bath, shallow pond, or dripping faucet works. Add rocks/corks for landing spots.', tip: 'If no natural water, set up a bee waterer before installing bees' },
              { icon: '📏', title: 'Distance & Access', desc: 'Keep hives 25-50 feet from property lines and high-traffic areas. Face entrances away from paths and neighbors.', tip: 'A 6-foot privacy fence between hives and neighbors works great' },
              { icon: '🏔️', title: 'Elevation', desc: 'Place on level ground slightly elevated (cinder blocks or hive stand). Avoid low spots where cold air pools or water collects.', tip: 'Tilt hive very slightly forward so rain runs off the landing board' },
              { icon: '🚗', title: 'Vehicle Access', desc: 'You\'ll need to carry heavy honey supers. Make sure you can get a vehicle or cart within reasonable distance of the hive yard.', tip: 'A full honey super can weigh 60+ lbs' },
            ].map(g => (
              <div key={g.title} className="p-5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{g.icon}</span>
                  <h4 className="font-bold text-gray-900">{g.title}</h4>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-2">{g.desc}</p>
                <p className="text-xs text-green-700 bg-green-50 px-3 py-1 rounded-full inline-block">💡 {g.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 4: BEEKEEPING BASICS
          ════════════════════════════════════════════ */}
      <section id="section-4" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-yellow-100 flex items-center justify-center text-xl">🐝</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Beekeeping Basics</h2>
            <p className="text-sm text-gray-500">Your crash course in becoming a Texas beekeeper</p>
          </div>
        </div>

        {/* The 3 Types of Bees */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Meet the Colony — The 3 Types of Bees</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Queen */}
            <div className="rounded-2xl overflow-hidden border-2 border-amber-200">
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
            <div className="rounded-2xl overflow-hidden border-2 border-green-200">
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
            <div className="rounded-2xl overflow-hidden border-2 border-blue-200">
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

        {/* Seasonal Calendar */}
        <div className="report-section bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Texas Beekeeping Seasonal Calendar</h3>
          <p className="text-sm text-gray-500 mb-6">Month-by-month guide for your first year and beyond</p>

          <div className="space-y-3">
            {seasonalCalendar.map(m => (
              <div key={m.month} className="avoid-break flex gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="shrink-0 text-center" style={{ width: 70 }}>
                  <div className="text-2xl mb-0.5">{m.icon}</div>
                  <p className="text-xs font-bold text-gray-900">{m.month}</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 leading-relaxed"><span className="font-bold text-gray-900">Tasks:</span> {m.tasks}</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed"><span className="font-bold">⚠️ Watch for:</span> {m.watch}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* First-Year Timeline */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Your First-Year Beekeeper Timeline</h3>
          <div className="space-y-4">
            {[
              { when: 'Month 1', title: 'Get Educated', desc: 'Read beginner books, watch videos below, join a local beekeeping association. Order equipment.' },
              { when: 'Month 2', title: 'Set Up Your Apiary', desc: 'Prepare hive location. Assemble equipment. Set up water source. Install hive stands.' },
              { when: 'Month 3', title: 'Install Your Bees', desc: `Install ${requiredHives} nuc(s) into your hive(s). Feed 1:1 sugar syrup. Leave them alone for a week.` },
              { when: 'Month 4', title: 'First Inspections', desc: 'Check for queen, brood pattern, food stores. Add second box when 7/10 frames are drawn out.' },
              { when: 'Months 5-6', title: 'Building Season', desc: 'Regular inspections every 10-14 days. Monitor for pests. Watch for swarm signs. Add supers.' },
              { when: 'Months 7-8', title: 'First Harvest', desc: 'Harvest honey from capped supers (if any). Treat for varroa mites. Keep records.' },
              { when: 'Months 9-12', title: 'Prepare for Winter', desc: 'Ensure adequate honey stores (60+ lbs). Reduce entrances. Add mouse guards. Minimal disturbance.' },
            ].map((t, i) => (
              <div key={t.when} className="flex gap-4">
                <div className="shrink-0 w-24">
                  <span className="text-xs font-bold text-white px-2 py-1 rounded-full" style={{ background: `hsl(${120 + i * 30}, 60%, 40%)` }}>{t.when}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-sm">{t.title}</h4>
                  <p className="text-sm text-gray-600">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Common Mistakes */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🚫 Common Beginner Mistakes to Avoid</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { mistake: 'Not treating for varroa mites', fix: 'Treat proactively — varroa kills more colonies than anything else' },
              { mistake: 'Opening the hive too often', fix: 'Inspect every 10-14 days max. Each opening disrupts the colony.' },
              { mistake: 'Not feeding new colonies', fix: 'New nucs need 1:1 sugar syrup until they build up comb and stores' },
              { mistake: 'Harvesting too much honey', fix: 'Leave at least 60 lbs for winter. Greedy harvesting = dead colonies.' },
              { mistake: 'Ignoring swarm prevention', fix: 'Give bees room! Add supers early. Check for swarm cells in spring.' },
              { mistake: 'Not joining a local bee club', fix: 'Local mentors are invaluable. They know your climate and conditions.' },
              { mistake: 'Placing hives in full shade', fix: 'Bees need morning sun. Full shade promotes hive beetles and disease.' },
              { mistake: 'Not keeping records', fix: 'You need records for your CAD and for tracking hive health trends.' },
            ].map(m => (
              <div key={m.mistake} className="p-4 rounded-xl bg-red-50 border border-red-100">
                <p className="text-sm font-bold text-red-800 mb-1">❌ {m.mistake}</p>
                <p className="text-xs text-green-800 bg-green-50 p-2 rounded-lg">✅ {m.fix}</p>
              </div>
            ))}
          </div>
        </div>

        {/* YouTube Videos */}
        <div className="report-section bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-2">🎬 Recommended Video Tutorials</h3>
          <p className="text-sm text-gray-500 mb-6">Free beekeeping education from top YouTube channels</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos.map(v => (
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 p-3 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-all group"
              >
                <div className="shrink-0 w-28 h-20 rounded-lg overflow-hidden bg-gray-200 relative">
                  <img
                    src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                    alt={v.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="white"><polygon points="3,1 10,6 3,11" /></svg>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 group-hover:text-red-700 transition-colors leading-tight line-clamp-2">{v.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{v.channel}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{v.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 5: EXPENSE TRACKING & RECORD KEEPING
          ════════════════════════════════════════════ */}
      <section id="section-5" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-xl">📊</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Expense Tracking & Record Keeping</h2>
            <p className="text-sm text-gray-500">Protect your exemption with proper documentation</p>
          </div>
        </div>

        {/* Why Records Matter */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">⚠️ Why You MUST Keep Records</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', border: '1px solid #fecaca' }}>
              <h4 className="font-bold text-red-900 mb-2">🏛️ County Appraisal District (CAD)</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• CAD can audit your ag exemption at any time</li>
                <li>• Must prove active agricultural use</li>
                <li>• No records = exemption denied or revoked</li>
                <li>• Could face 5 years of rollback taxes + 7% interest</li>
              </ul>
            </div>
            <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe' }}>
              <h4 className="font-bold text-blue-900 mb-2">🏦 IRS (Schedule F)</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Beekeeping expenses are tax-deductible</li>
                <li>• File Schedule F for farm income/expenses</li>
                <li>• Equipment may qualify for Section 179 deduction</li>
                <li>• Must have records to substantiate deductions</li>
              </ul>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800"><strong>💡 Pro Tip:</strong> Keep all records for at least 7 years. Use a dedicated folder (physical or digital) labeled by tax year. Take photos with timestamps — your phone&apos;s camera app auto-dates images.</p>
          </div>
        </div>

        {/* Expense Tracking Template */}
        <div className="report-section bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Printable Expense Tracking Template</h3>
          <p className="text-sm text-gray-500 mb-4">Print this page and use it to track your beekeeping expenses throughout the year</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: '#0f172a', color: 'white' }}>
                  <th className="p-3 text-left font-bold">Date</th>
                  <th className="p-3 text-left font-bold">Category</th>
                  <th className="p-3 text-left font-bold">Description</th>
                  <th className="p-3 text-right font-bold">Amount</th>
                  <th className="p-3 text-left font-bold">Receipt #</th>
                </tr>
              </thead>
              <tbody>
                {/* Example rows */}
                <tr className="bg-green-50 text-green-800">
                  <td className="p-3 border-b border-gray-200 italic">3/15/2026</td>
                  <td className="p-3 border-b border-gray-200 italic">Equipment</td>
                  <td className="p-3 border-b border-gray-200 italic">6 complete hive setups (BeeKings)</td>
                  <td className="p-3 border-b border-gray-200 text-right italic">{fmtMoney(requiredHives * hiveCost)}</td>
                  <td className="p-3 border-b border-gray-200 italic">BK-001</td>
                </tr>
                <tr className="bg-green-50 text-green-800">
                  <td className="p-3 border-b border-gray-200 italic">4/01/2026</td>
                  <td className="p-3 border-b border-gray-200 italic">Bees</td>
                  <td className="p-3 border-b border-gray-200 italic">{requiredHives} nucs — Italian bees</td>
                  <td className="p-3 border-b border-gray-200 text-right italic">{fmtMoney(requiredHives * nucCost)}</td>
                  <td className="p-3 border-b border-gray-200 italic">NUC-001</td>
                </tr>
                {/* Blank rows for user */}
                {[...Array(12)].map((_, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 border-b border-gray-200" style={{ minWidth: 90 }}>&nbsp;</td>
                    <td className="p-3 border-b border-gray-200" style={{ minWidth: 100 }}>&nbsp;</td>
                    <td className="p-3 border-b border-gray-200" style={{ minWidth: 200 }}>&nbsp;</td>
                    <td className="p-3 border-b border-gray-200">&nbsp;</td>
                    <td className="p-3 border-b border-gray-200">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100">
                  <td colSpan={3} className="p-3 text-right font-bold">Year Total:</td>
                  <td className="p-3 text-right font-bold">$________</td>
                  <td className="p-3">&nbsp;</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* What receipts to keep */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">What Receipts to Keep</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { cat: '🐝 Bees', items: ['Nucleus colonies (nucs)', 'Package bees', 'Queen bees (replacements)', 'Queen cages & supplies'] },
              { cat: '📦 Equipment', items: ['Hive bodies & supers', 'Frames & foundation', 'Smoker, hive tool, brush', 'Protective clothing (suit, gloves, veil)'] },
              { cat: '💊 Treatments', items: ['Varroa mite treatments (Apivar, OAV, etc.)', 'Antibiotics (if prescribed)', 'Beetle traps', 'Feed (sugar, pollen patties)'] },
              { cat: '🔧 Maintenance', items: ['Paint, stain, wood preservative', 'Replacement parts', 'Extraction equipment', 'Bottling supplies, labels, jars'] },
            ].map(c => (
              <div key={c.cat} className="p-4 rounded-xl bg-gray-50">
                <h4 className="font-bold text-gray-900 mb-2">{c.cat}</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {c.items.map(item => <li key={item}>• {item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Annual Expense Report */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Sample Annual Expense Report</h3>
          <p className="text-sm text-gray-500 mb-4">Example for a {requiredHives}-hive operation in {county.name} County</p>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0f172a', color: 'white' }}>
                  <th className="p-3 text-left font-bold">Category</th>
                  <th className="p-3 text-right font-bold">Year 1</th>
                  <th className="p-3 text-right font-bold">Year 2+</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Hive Equipment', fmtMoney(requiredHives * hiveCost), '$0 (already purchased)'],
                  ['Bee Colonies (nucs)', fmtMoney(requiredHives * nucCost), fmtMoney(Math.round(requiredHives * 0.2) * nucCost) + ' (20% replacement)'],
                  ['Protective Gear', '$83', '$20 (replacements)'],
                  ['Tools (smoker, hive tool, etc.)', '$65', '$15 (replacements)'],
                  ['Feed (sugar syrup, pollen)', fmtMoney(requiredHives * 30), fmtMoney(requiredHives * 20)],
                  ['Mite Treatments', fmtMoney(requiredHives * 25), fmtMoney(requiredHives * 25)],
                  ['Extraction Supplies', '$0 (not harvesting year 1)', '$50'],
                  ['Bottling & Labels', '$0', '$75'],
                ].map(([cat, y1, y2], i) => (
                  <tr key={cat} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="p-3 font-semibold">{cat}</td>
                    <td className="p-3 text-right">{y1}</td>
                    <td className="p-3 text-right">{y2}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#fef9ee', borderTop: '2px solid #fde68a' }}>
                  <td className="p-3 font-bold">TOTAL EXPENSES</td>
                  <td className="p-3 text-right font-black text-amber-800">{fmtMoney(totalUpfront + 83 + 65 + requiredHives * 30 + requiredHives * 25)}</td>
                  <td className="p-3 text-right font-bold text-gray-700">{fmtMoney(Math.round(requiredHives * 0.2) * nucCost + 20 + 15 + requiredHives * 20 + requiredHives * 25 + 50 + 75)}</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="p-3 font-bold text-green-800">TAX SAVINGS</td>
                  <td className="p-3 text-right font-black text-green-700">{fmtMoney(annualSavings)}</td>
                  <td className="p-3 text-right font-black text-green-700">{fmtMoney(annualSavings)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Hive Inspection Log Template */}
        <div className="report-section bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Hive Inspection Log Template</h3>
          <p className="text-sm text-gray-500 mb-4">Use this for each hive inspection. Print multiple copies.</p>

          <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Hive #</p>
                <div className="border-b-2 border-gray-300 h-6 mt-1" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Date</p>
                <div className="border-b-2 border-gray-300 h-6 mt-1" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Weather</p>
                <div className="border-b-2 border-gray-300 h-6 mt-1" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Temp (°F)</p>
                <div className="border-b-2 border-gray-300 h-6 mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6">
              {[
                'Queen spotted?', 'Eggs visible?', 'Larvae present?', 'Capped brood?',
                'Honey stores adequate?', 'Pollen visible?', 'Varroa signs?', 'Hive beetles?',
                'Wax moths?', 'Queen cells?', 'Temperament (calm/agitated)?', 'Population (strong/weak)?',
              ].map(item => (
                <label key={item} className="flex items-center gap-2 p-1">
                  <span className="w-4 h-4 rounded border-2 border-gray-300 shrink-0">☐</span>
                  <span className="text-xs text-gray-700">{item}</span>
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Actions Taken</p>
                <div className="border-b border-gray-200 h-5" />
                <div className="border-b border-gray-200 h-5 mt-2" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Notes / Observations</p>
                <div className="border-b border-gray-200 h-5" />
                <div className="border-b border-gray-200 h-5 mt-2" />
                <div className="border-b border-gray-200 h-5 mt-2" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Next Inspection Plan</p>
                <div className="border-b border-gray-200 h-5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECTION 6: LOCAL BEE RESOURCES
          ════════════════════════════════════════════ */}
      <section id="section-6" className="page-break" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center text-xl">🗺️</div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Local Bee Resources</h2>
            <p className="text-sm text-gray-500">Suppliers, associations, and contacts near {county.name} County</p>
          </div>
        </div>

        {/* Nuc Suppliers */}
        <div className="report-section bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">🐝 Nuc & Bee Suppliers Near You</h3>
          <p className="text-sm text-gray-500 mb-6">{county.region} region and surrounding areas — order early, nucs sell out fast!</p>

          {nearbySuppliers.length > 0 ? (
            <div className="space-y-4">
              {nearbySuppliers.map(s => (
                <div key={s.name} className="avoid-break p-5 rounded-xl border border-gray-200 hover:border-green-300 transition-colors">
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
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🤝 Beekeeping Associations</h3>
          <p className="text-sm text-gray-500 mb-4">Local clubs are the #1 resource for new beekeepers. Monthly meetings, mentors, and equipment swaps.</p>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <h4 className="font-bold text-amber-900">Texas Beekeepers Association (TBA)</h4>
              <p className="text-sm text-amber-800 mt-1">Statewide organization with local chapters across Texas</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                <a href="https://texasbeekeepers.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">🌐 texasbeekeepers.org</a>
                <span className="text-amber-700">📅 Annual convention in November</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <h4 className="font-bold text-gray-900">{county.region} Beekeeping Clubs</h4>
              <p className="text-sm text-gray-600 mt-1">Search for &ldquo;{county.name} County beekeeping association&rdquo; or visit the TBA website for a chapter locator. Most clubs meet monthly and welcome beginners.</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <h4 className="font-bold text-gray-900">Texas Master Beekeeper Program</h4>
              <p className="text-sm text-gray-600 mt-1">Run by TBA — levels from Apprentice to Master. Great education and credentials for your ag exemption documentation.</p>
              <a href="https://texasbeekeepers.org/master-beekeeper-program/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Learn more →</a>
            </div>
          </div>
        </div>

        {/* Texas Apiary Inspection Service */}
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🔬 Texas Apiary Inspection Service (TAIS)</h3>
          <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0' }}>
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
        <div className="report-section avoid-break bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🆘 Emergency Contacts & Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <h4 className="font-bold text-red-900 mb-2">🐝 Swarm Removal</h4>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Contact your local bee club first</li>
                <li>• TBA Swarm Hotline: check texasbeekeepers.org</li>
                <li>• {county.name} County Extension: call for local referrals</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <h4 className="font-bold text-blue-900 mb-2">👑 Queen Replacement Sources</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• BeeWeaver Apiaries — (737) 230-3435</li>
                <li>• Local nuc suppliers (see above)</li>
                <li>• Olivarez Honey Bees — (877) 865-0298</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <h4 className="font-bold text-amber-900 mb-2">🏥 Hive Health Emergency</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• TAIS Disease Lab: (979) 845-9713</li>
                <li>• County Extension Agent</li>
                <li>• Local beekeeping mentor</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-green-50 border border-green-200">
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
      <footer className="page-break" style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a5f)', color: 'white' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px' }}>
          {/* CTA Box */}
          <div className="text-center mb-12 no-print">
            <div className="inline-block rounded-3xl p-10" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-5xl mb-4">🐝</div>
              <h2 className="text-3xl font-black mb-3">Ready to Start Saving {fmtMoney(annualSavings)}/Year?</h2>
              <p className="text-lg opacity-70 mb-6">BeeKings provides everything: hives, bees, equipment, training, and ongoing support.</p>
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
          <p className="text-sm text-gray-400 mt-1">This may take a moment</p>
        </div>
      </div>
    }>
      <ReportContent />
    </Suspense>
  );
}
