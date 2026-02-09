'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import countiesData from '@/data/florida-counties.json';

interface County {
  name: string;
  region: string;
  propertyAppraiser: { name: string; website: string; phone: string };
  minAcres: number;
  minHives: number;
  additionalHivesPer: number;
  avgMillageRate: number;
  agProductivityValue: number;
  notes: string;
}

interface LeadData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const C = {
  sky: '#EDF6FF',
  blue: '#1C7CE5',
  blueDark: '#1A5CA3',
  navy: '#053249',
  green: '#57C975',
  greenDark: '#249241',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F8FAFC',
};

type Step = 'search' | 'results' | 'signup' | 'thankyou';

export default function FloridaCalculator() {
  const [step, setStep] = useState<Step>('search');
  const [selectedCountyName, setSelectedCountyName] = useState('');
  const [acres, setAcres] = useState('');
  const [appraisedValue, setAppraisedValue] = useState('');
  const [lead, setLead] = useState<LeadData>({ firstName: '', lastName: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchError, setSearchError] = useState('');

  const resultsTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>(`s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const counties = useMemo(() => countiesData as County[], []);

  const selectedCounty = useMemo(
    () => counties.find(c => c.name === selectedCountyName) || null,
    [counties, selectedCountyName]
  );

  // Group counties by region for the dropdown
  const regionGroups = useMemo(() => {
    const groups: Record<string, County[]> = {};
    counties.forEach(c => {
      if (!groups[c.region]) groups[c.region] = [];
      groups[c.region].push(c);
    });
    // Sort regions and counties within
    const sorted: { region: string; counties: County[] }[] = [];
    Object.keys(groups).sort().forEach(r => {
      sorted.push({ region: r, counties: groups[r].sort((a, b) => a.name.localeCompare(b.name)) });
    });
    return sorted;
  }, [counties]);

  const track = useCallback((event: string, data?: Record<string, unknown>) => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...data, state: 'FL' }),
    }).catch(() => {});
  }, []);

  const trackContact = useCallback((action: string, data?: Record<string, unknown>) => {
    fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId: sessionIdRef.current, state: 'FL', ...data }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    track('page_view', { referrer: document.referrer, page: 'florida' });
  }, [track]);

  // Calculate results
  const calculateResults = () => {
    if (!selectedCounty) return null;
    const totalAcres = acres ? parseFloat(acres) : 0;
    const totalValue = appraisedValue ? parseFloat(appraisedValue) : 0;
    if (isNaN(totalAcres) || isNaN(totalValue) || totalAcres <= 0 || totalValue <= 0) return null;

    const taxRate = selectedCounty.avgMillageRate / 1000; // mills to decimal

    // Florida: no state minimum acreage — all acres can potentially qualify
    // Homestead: 1 acre + structure stays taxed at market rate
    const homesteadAcres = Math.min(1, totalAcres);
    const agEligibleAcres = Math.max(0, totalAcres - homesteadAcres);

    if (agEligibleAcres <= 0) return null;

    // Estimate land value vs improvement value
    // Assume ~70% of value is land for rural FL property
    const landPortion = 0.7;
    const landValue = totalValue * landPortion;
    const improvValue = totalValue * (1 - landPortion);

    const perAcreLand = totalAcres > 0 ? landValue / totalAcres : 0;
    const homesteadValue = improvValue + (homesteadAcres * perAcreLand);
    const agLandMarketValue = Math.max(0, totalValue - homesteadValue);

    // Current taxes: full market value
    const currentTaxes = totalValue * taxRate;

    // With ag classification: homestead at market, ag land at productivity value
    const homesteadTaxes = homesteadValue * taxRate;
    const agTaxes = agEligibleAcres * selectedCounty.agProductivityValue * taxRate;
    const totalWithAg = homesteadTaxes + agTaxes;

    const annualSavings = Math.max(0, currentTaxes - totalWithAg);
    const savingsPercent = currentTaxes > 0 ? (annualSavings / currentTaxes) * 100 : 0;

    // Hive requirements
    let requiredHives = selectedCounty.minHives;
    if (agEligibleAcres > 5) {
      requiredHives += Math.ceil((agEligibleAcres - 5) / selectedCounty.additionalHivesPer);
    }

    // Costs
    const hiveCost = 197;
    const nucCost = 260;
    const upfrontPerHive = hiveCost + nucCost;
    const annualMgmtPerHive = 75;
    const totalUpfront = requiredHives * upfrontPerHive;
    const annualMgmt = requiredHives * annualMgmtPerHive;

    // Florida honey production is higher than Texas
    const honeyLbsPerHive = 60;
    const honeyPricePerLb = 20;
    const totalHoneyLbs = requiredHives * honeyLbsPerHive;
    const honeyRevenue = totalHoneyLbs * honeyPricePerLb;

    const netAnnualSavings = annualSavings - annualMgmt + honeyRevenue;
    const roiMonths = netAnnualSavings > 0 ? Math.ceil((totalUpfront / netAnnualSavings) * 12) : 0;

    return {
      currentTaxes,
      totalWithAg,
      homesteadTaxes,
      agTaxes,
      annualSavings,
      savingsPercent,
      requiredHives,
      totalAcres,
      agEligibleAcres,
      homesteadAcres,
      totalValue,
      homesteadValue,
      agLandMarketValue,
      totalUpfront,
      annualMgmt,
      netAnnualSavings,
      roiMonths,
      hiveCost,
      nucCost,
      honeyLbsPerHive,
      totalHoneyLbs,
      honeyRevenue,
    };
  };

  const results = calculateResults();

  const handleCalculate = () => {
    setSearchError('');
    if (!selectedCountyName) {
      setSearchError('Please select your county.');
      return;
    }
    if (!acres || parseFloat(acres) <= 0) {
      setSearchError('Please enter your property acreage.');
      return;
    }
    if (!appraisedValue || parseFloat(appraisedValue) <= 0) {
      setSearchError('Please enter your current assessed property value.');
      return;
    }
    if (parseFloat(acres) <= 1) {
      setSearchError('Your property needs more than 1 acre (beyond your homestead) to benefit from agricultural classification.');
      return;
    }
    track('calculator_submitted', { county: selectedCountyName, acres: parseFloat(acres), value: parseFloat(appraisedValue) });
    trackContact('search', { county: selectedCountyName, acres: parseFloat(acres), value: parseFloat(appraisedValue), referrer: document.referrer });
    setStep('results');
    resultsTimeRef.current = Date.now();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...lead,
        county: selectedCounty?.name,
        state: 'FL',
        acres: acres ? parseFloat(acres) : null,
        appraisedValue: appraisedValue ? parseFloat(appraisedValue) : null,
        estimatedSavings: results?.annualSavings,
        source: 'florida-calculator',
      };
      await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      track('lead_captured', { county: selectedCounty?.name, savings: results?.annualSavings, state: 'FL' });
      trackContact('identify', { firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone });
      trackContact('engage', { event: 'completed_signup' });
    } catch (err) {
      console.error('Lead save error:', err);
    }
    setStep('thankyou');
    setIsSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startOver = () => {
    setStep('search');
    setSelectedCountyName('');
    setAcres('');
    setAppraisedValue('');
    setSearchError('');
    setLead({ firstName: '', lastName: '', email: '', phone: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtMoney = (n: number) => '$' + fmt(n);

  const gradientText = {
    background: `linear-gradient(to bottom, ${C.blue}, ${C.blueDark})`,
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.white }}>
      <style>{`
        * { box-sizing: border-box; }
        .r-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        .r-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .r-nav { display: flex; align-items: center; gap: 32px; }
        .r-hero-h1 { font-size: 52px; }
        .r-result-num { font-size: 72px; }
        .r-footer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
        .r-section { padding: 80px 24px; }
        .r-signup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        .spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
        @media (max-width: 768px) {
          .r-grid3 { grid-template-columns: 1fr; gap: 24px; }
          .r-grid2 { grid-template-columns: 1fr; }
          .r-nav { display: none; }
          .r-hero-h1 { font-size: 34px; }
          .r-result-num { font-size: 48px; }
          .r-footer-grid { grid-template-columns: 1fr; gap: 32px; }
          .r-section { padding: 48px 16px; }
          .r-signup-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* HEADER */}
      <header style={{ background: C.white, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 40 }} />
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <nav className="r-nav">
              {step === 'search' && (
                <>
                  <a href="#how-it-works" style={{ fontSize: 14, fontWeight: 600, color: C.navy, textDecoration: 'none' }}>How It Works</a>
                  <a href="#faq" style={{ fontSize: 14, fontWeight: 600, color: C.navy, textDecoration: 'none' }}>FAQ</a>
                </>
              )}
              <a href="https://beekings.com" style={{ fontSize: 14, fontWeight: 600, color: C.navy, textDecoration: 'none' }}>BeeKings.com</a>
              <a href="mailto:info@beekings.com" style={{ background: C.blue, color: C.white, fontSize: 14, fontWeight: 700, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>Contact Us</a>
            </nav>
          </div>
        </div>
      </header>

      {/* ===== STEP 1: SEARCH ===== */}
      {step === 'search' && (
        <>
          {/* Hero */}
          <section style={{ background: C.sky, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, background: C.green }} />
            <svg style={{ position: 'absolute', bottom: 172, left: 0, right: 0, width: '100%' }} height="40" viewBox="0 0 1200 40" preserveAspectRatio="none">
              <path d="M0,40 C150,5 350,30 500,12 C650,-5 800,25 950,8 C1050,0 1150,18 1200,5 L1200,40 Z" fill={C.green} />
            </svg>
            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 5, width: '100%', maxWidth: 600, pointerEvents: 'none' }}>
              <img src="/hero-beekeeper.png" alt="Beekeeper illustration" style={{ width: '100%', display: 'block', objectFit: 'contain' }} />
            </div>
            <div style={{ position: 'relative', zIndex: 10, maxWidth: 800, margin: '0 auto', padding: '32px 24px 300px', textAlign: 'center' }}>
              <h1 className="r-hero-h1" style={{ fontWeight: 900, color: C.navy, lineHeight: 1.1, marginBottom: 16, letterSpacing: '-0.03em' }}>
                Florida Property Tax<br />Savings <span style={{ color: C.blue }}>with Bees</span> 🐝
              </h1>
              <p style={{ fontSize: 17, color: '#5A7A8A', marginBottom: 12, fontWeight: 500, maxWidth: 560, margin: '0 auto 12px' }}>
                Florida has no minimum acreage for agricultural classification. That means even smaller properties can qualify — and the savings can be substantial.
              </p>
              <p style={{ fontSize: 14, color: '#8DA4B5', fontWeight: 500, marginBottom: 0 }}>
                Use this free calculator to estimate your savings.
              </p>
            </div>
          </section>

          {/* Calculator Form */}
          <section className="r-section" style={{ background: C.white }}>
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <div style={{ background: C.white, borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.1)', padding: 32, border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 4, textAlign: 'center' }}>
                  Estimate Your Savings
                </h2>
                <p style={{ fontSize: 14, color: C.gray, marginBottom: 28, textAlign: 'center' }}>
                  Enter your property details below — takes about 30 seconds.
                </p>

                {/* County selector */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
                    County
                  </label>
                  <select
                    value={selectedCountyName}
                    onChange={(e) => { setSelectedCountyName(e.target.value); setSearchError(''); }}
                    style={{
                      width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 10,
                      fontSize: 16, fontWeight: 500, color: selectedCountyName ? C.navy : C.gray,
                      fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                      background: C.white, cursor: 'pointer', appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center',
                    }}
                  >
                    <option value="">Select your Florida county…</option>
                    {regionGroups.map(group => (
                      <optgroup key={group.region} label={group.region}>
                        {group.counties.map(c => (
                          <option key={c.name} value={c.name}>{c.name} County</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Acreage */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
                    Property Size (acres)
                  </label>
                  <input
                    type="number" value={acres}
                    onChange={(e) => { setAcres(e.target.value); setSearchError(''); }}
                    placeholder="e.g. 10"
                    style={{
                      width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 10,
                      fontSize: 16, fontWeight: 500, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>
                    Florida has no minimum acreage requirement at the state level
                  </p>
                </div>

                {/* Assessed value */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
                    Current Assessed Value ($)
                  </label>
                  <input
                    type="number" value={appraisedValue}
                    onChange={(e) => { setAppraisedValue(e.target.value); setSearchError(''); }}
                    placeholder="e.g. 250000"
                    style={{
                      width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 10,
                      fontSize: 16, fontWeight: 500, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <p style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>
                    Find this on your TRIM notice or your county Property Appraiser&apos;s website
                  </p>
                </div>

                {searchError && (
                  <div style={{ marginBottom: 20, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12 }}>
                    <p style={{ fontSize: 14, color: '#991B1B', fontWeight: 500 }}>{searchError}</p>
                  </div>
                )}

                <button
                  onClick={handleCalculate}
                  style={{
                    width: '100%', padding: '16px 32px', borderRadius: 12,
                    background: C.blue, color: C.white, fontWeight: 700, fontSize: 17,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 4px 16px rgba(28,124,229,0.3)',
                  }}
                >
                  Calculate My Savings →
                </button>
                <p style={{ textAlign: 'center', fontSize: 13, color: '#8DA4B5', marginTop: 12, fontWeight: 500 }}>
                  Free estimate — no phone calls, no spam
                </p>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="r-section" style={{ background: C.sky, textAlign: 'center' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: C.navy, marginBottom: 8 }}>How Agricultural Classification Works</h2>
              <p style={{ color: C.gray, fontSize: 16, marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
                Florida law (Statute 193.461) allows landowners using property for agriculture — including beekeeping — to have it assessed at its agricultural value instead of market value.
              </p>
              <div className="r-grid3" style={{ gap: 48 }}>
                {[
                  { n: '1', title: 'Check your property', desc: 'Enter your county, acreage, and current assessed value above. We\'ll estimate your savings based on your county\'s millage rates and agricultural productivity values.' },
                  { n: '2', title: 'See your savings', desc: 'Get an instant estimate of how much you could save annually, the number of hives you\'d need, and your return on investment.' },
                  { n: '3', title: 'Get your free guide', desc: 'Download a county-specific guide with your Property Appraiser\'s contact info, application tips, and the March 1 deadline.' },
                ].map(s => (
                  <div key={s.n}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: C.blue, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, margin: '0 auto 20px' }}>{s.n}</div>
                    <h3 style={{ fontWeight: 700, color: C.navy, fontSize: 18, marginBottom: 8 }}>{s.title}</h3>
                    <p style={{ color: C.gray, fontSize: 15, lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Key Advantages */}
          <section className="r-section" style={{ background: C.white }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: C.navy, marginBottom: 8, textAlign: 'center' }}>
                Why Florida Is Great for Beekeeping
              </h2>
              <p style={{ color: C.gray, fontSize: 16, textAlign: 'center', marginBottom: 48, maxWidth: 560, margin: '0 auto 48px' }}>
                Florida&apos;s climate and legal framework make it one of the best states for combining beekeeping with property tax savings.
              </p>
              <div className="r-grid2" style={{ gap: 20 }}>
                {[
                  { icon: '📏', title: 'No Minimum Acreage', desc: 'Unlike most states, Florida law specifically says counties cannot require a minimum number of acres for agricultural classification.' },
                  { icon: '🌴', title: 'Year-Round Beekeeping', desc: 'Florida\'s subtropical climate means bees stay active longer, producing 60–100 lbs of honey per hive — nearly double some northern states.' },
                  { icon: '🔄', title: 'Auto-Renewing Classification', desc: 'Once approved, your agricultural classification renews automatically each year until your land use changes. Less paperwork than many states.' },
                  { icon: '🍯', title: 'Multiple Nectar Flows', desc: 'Citrus blooms in spring, gallberry and palmetto in summer, goldenrod in fall — Florida bees have forage sources most of the year.' },
                ].map(item => (
                  <div key={item.title} style={{ background: C.lightGray, borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                    <h3 style={{ fontWeight: 700, color: C.navy, fontSize: 17, marginBottom: 8 }}>{item.title}</h3>
                    <p style={{ color: C.gray, fontSize: 14, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="r-section" style={{ background: C.sky, textAlign: 'center' }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: C.navy, marginBottom: 48 }}>Frequently Asked Questions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { q: 'What is agricultural classification in Florida?', a: 'Under Florida Statute 193.461, land used for "bona fide agricultural purposes" — including beekeeping — is assessed at its agricultural productivity value instead of market value. This typically reduces the taxable value of the land by 90–99%, leading to significant property tax savings. It\'s sometimes informally called an "ag exemption," though technically it\'s a classification, not an exemption.' },
                  { q: 'Does Florida really have no minimum acreage?', a: 'Correct. Florida Statute 193.461 explicitly states that "a minimum acreage may not be required for agricultural assessment." Your county Property Appraiser will evaluate whether your land demonstrates a genuine agricultural use, but there is no acreage floor set by state law. That said, you\'ll need enough space to maintain bees safely and demonstrate commercial intent.' },
                  { q: 'When is the application deadline?', a: 'March 1 of each year. First-time applicants must file a full application with their county Property Appraiser. If you miss the deadline, you may still apply with a late filing petition and a small fee, but it\'s not guaranteed to be accepted. After your first year, the classification auto-renews unless your land use changes.' },
                  { q: 'How many beehives do I need?', a: 'Florida law doesn\'t specify an exact number — it requires "bona fide commercial agricultural use." In practice, most Property Appraisers look for at least 4–6 hives on smaller properties, with more required as acreage increases. Our calculator estimates the number based on typical county practices.' },
                  { q: 'How much does it cost to get started with bees?', a: 'A basic hive setup runs about $197 for equipment and $260 for a nucleus colony (nuc) of bees — roughly $457 per hive. Annual maintenance (mite treatments, feed, replacement parts) averages around $75 per hive. Most beekeepers also earn income from honey: Florida hives typically produce 60 lbs per year, which sells for about $20/lb locally.' },
                  { q: 'What about my homestead exemption?', a: 'Agricultural classification and homestead exemption are separate programs and can be combined. Your home and the surrounding 1 acre continue to receive the homestead exemption and are taxed at market rate. The agricultural classification applies to your remaining qualifying acreage, reducing that land\'s taxable value.' },
                  { q: 'Do I need beekeeping experience?', a: 'No prior experience is needed. BeeKings provides hives, bees, equipment, hands-on training, and ongoing support. Florida also has an excellent network of local beekeeping associations and the UF/IFAS Honey Bee Research Lab for education. You will need to register your apiary with the Florida Department of Agriculture (FDACS) — it\'s a simple process with a small annual fee.' },
                  { q: 'How long does approval take?', a: 'If you file by March 1, your county Property Appraiser will evaluate your application and typically notify you by the time TRIM (Truth in Millage) notices go out, usually in August. If denied, you can appeal to the Value Adjustment Board. Once approved, the classification stays in effect until your agricultural use ends.' },
                ].map(faq => (
                  <details key={faq.q} style={{ background: C.white, borderRadius: 12, textAlign: 'left', border: '1px solid #e2e8f0' }}>
                    <summary style={{ padding: '18px 24px', fontWeight: 700, color: C.navy, fontSize: 16, cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {faq.q}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" style={{ flexShrink: 0, marginLeft: 16 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <p style={{ padding: '0 24px 18px', color: C.gray, lineHeight: 1.7, fontSize: 15 }}>{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="r-section" style={{ background: C.navy, textAlign: 'center' }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: C.white, lineHeight: 1.2, marginBottom: 12 }}>
                Ready to See Your Savings?
              </h2>
              <p style={{ color: '#8DA4B5', fontSize: 16, marginBottom: 32 }}>
                Use the calculator above to get a free, instant estimate for your Florida property
              </p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: C.green, color: C.white, fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(87,201,117,0.4)' }}>
                Calculate My Savings →
              </button>
              <p style={{ color: '#5A7A8A', fontSize: 13, marginTop: 12 }}>Free • Instant • No spam</p>
            </div>
          </section>

          {/* SEO Content */}
          <section className="r-section" style={{ background: C.lightGray }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 20, textAlign: 'center' }}>
                Florida Beekeeping Agricultural Classification Guide
              </h2>
              <div style={{ fontSize: 15, color: C.gray, lineHeight: 1.8 }}>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>What is Florida agricultural classification?</strong> Under Florida Statute 193.461,
                  landowners can have their property assessed at its agricultural productivity value instead of market value if it&apos;s being used for
                  bona fide agricultural purposes — which explicitly includes beekeeping. This typically reduces the taxable value of the land
                  by 90–99%, resulting in substantial property tax savings for Florida landowners.
                </p>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>No minimum acreage.</strong> One of Florida&apos;s biggest advantages is that state law
                  prohibits counties from requiring a minimum number of acres for agricultural classification. Whether you have 2 acres or 200,
                  you may qualify — as long as you can demonstrate genuine agricultural use. This makes Florida one of the most accessible
                  states for beekeeping-based property tax savings.
                </p>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>How many beehives do I need?</strong> While Florida law doesn&apos;t specify an exact number,
                  most county Property Appraisers look for 4–6 hives on smaller properties, with roughly 1 additional hive per 5 acres beyond that.
                  Our calculator estimates the appropriate number based on your county&apos;s typical requirements.
                </p>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>Florida&apos;s climate advantage.</strong> Florida&apos;s subtropical climate allows year-round
                  beekeeping with multiple nectar flows — citrus in spring, gallberry and palmetto in summer, and goldenrod in fall. Florida hives
                  typically produce 60–100 lbs of honey per year, nearly double what many northern states see. At $20/lb for local raw honey,
                  that&apos;s meaningful income on top of your tax savings.
                </p>
                <p>
                  <strong style={{ color: C.navy }}>All 67 Florida counties.</strong> Our calculator covers every Florida county, from
                  Miami-Dade and Broward in the southeast to Escambia and Santa Rosa in the Panhandle. Each county has its own Property Appraiser
                  and millage rates, and we factor in your county&apos;s specific data to give you the most accurate estimate possible.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ===== STEP 2: RESULTS ===== */}
      {step === 'results' && selectedCounty && (
        <section className="fade-in" style={{ background: C.sky, minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
              {['Property', 'Savings', 'Guide'].map((label, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, background: i <= 1 ? C.blue : '#D1D5DB', color: C.white,
                  }}>{i < 1 ? '✓' : i + 1}</div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: i <= 1 ? C.navy : C.gray }}>{label}</span>
                  {i < 2 && <div style={{ width: 40, height: 2, background: i < 1 ? C.blue : '#D1D5DB', marginLeft: 8 }} />}
                </div>
              ))}
            </div>

            {/* County info */}
            <div style={{ background: C.white, borderRadius: '16px 16px 0 0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #D5EAFF' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="12" fill={C.green} />
                <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
                  {selectedCounty.name} County, Florida — {acres} acres
                </p>
                <p style={{ fontSize: 13, color: C.gray }}>
                  Assessed value: {fmtMoney(parseFloat(appraisedValue))} · Millage rate: {selectedCounty.avgMillageRate} mills
                </p>
              </div>
              <button onClick={startOver} style={{ fontSize: 13, fontWeight: 600, color: C.blue, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Change</button>
            </div>

            {/* Main savings display */}
            {results && (
              <>
                <div style={{ background: C.white, borderRadius: '0 0 16px 16px', padding: '28px 20px', textAlign: 'center', marginBottom: 24, border: '1px solid #D5EAFF', borderTop: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Estimated Annual Savings</p>
                  <div className="r-result-num" style={{ ...gradientText, fontWeight: 900, lineHeight: 1 }}>
                    {fmtMoney(results.annualSavings)}
                  </div>
                  <p style={{ fontSize: 15, color: C.gray, marginTop: 8 }}>per year on property taxes</p>
                </div>

                {/* Tax Comparison */}
                <div style={{ background: C.white, borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 28, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 700, color: C.navy, fontSize: 17, marginBottom: 20 }}>Tax Comparison</h3>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.gray }}>Without Ag Classification</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: C.navy }}>{fmtMoney(results.currentTaxes)}/yr</span>
                    </div>
                    <div style={{ height: 28, background: '#FEE2E2', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '100%', background: '#EF4444', borderRadius: 8 }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.gray }}>With Ag Classification</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: C.green }}>{fmtMoney(results.totalWithAg)}/yr</span>
                    </div>
                    <div style={{ height: 28, background: '#DCFCE7', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(5, (results.totalWithAg / results.currentTaxes) * 100)}%`, background: C.green, borderRadius: 8 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                    <span style={{ fontSize: 20 }}>💰</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.greenDark }}>You save {fmtMoney(results.annualSavings)}/yr ({results.savingsPercent.toFixed(0)}% reduction)</span>
                  </div>

                  {/* Homestead note */}
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', marginTop: 16, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
                    <strong>📝 Note:</strong> Your homestead ({results.homesteadAcres} acre + home, estimated at {fmtMoney(results.homesteadValue)}) continues to be taxed at market rate.
                    The ag classification applies to the remaining <strong>{results.agEligibleAcres.toFixed(results.agEligibleAcres % 1 ? 2 : 0)} acres</strong>.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                    <div style={{ background: C.blue, borderRadius: 16, padding: 18, color: C.white, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8, marginBottom: 4 }}>10-Year Savings</p>
                      <p style={{ fontSize: 26, fontWeight: 900 }}>{fmtMoney(results.annualSavings * 10)}</p>
                    </div>
                    <div style={{ background: C.navy, borderRadius: 16, padding: 18, color: C.white, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8, marginBottom: 4 }}>20-Year Savings</p>
                      <p style={{ fontSize: 26, fontWeight: 900 }}>{fmtMoney(results.annualSavings * 20)}</p>
                    </div>
                  </div>
                </div>

                {/* Investment & ROI */}
                <div style={{ background: C.white, borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 28, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 700, color: C.navy, fontSize: 17, marginBottom: 20 }}>🐝 Your Investment</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.lightGray, borderRadius: 10 }}>
                      <span style={{ fontSize: 14, color: C.gray }}>Hive equipment ({results.requiredHives} × ${results.hiveCost})</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{fmtMoney(results.requiredHives * results.hiveCost)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.lightGray, borderRadius: 10 }}>
                      <span style={{ fontSize: 14, color: C.gray }}>Bee nucs ({results.requiredHives} × ${results.nucCost})</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{fmtMoney(results.requiredHives * results.nucCost)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: C.sky, borderRadius: 10, borderTop: '2px solid #D5EAFF' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Total startup cost</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: C.navy }}>{fmtMoney(results.totalUpfront)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.lightGray, borderRadius: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 14, color: C.gray }}>Annual bee management (est.)</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>-{fmtMoney(results.annualMgmt)}/yr</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#FFFBEB', borderRadius: 10, marginBottom: 16, border: '1px solid #FDE68A' }}>
                    <div>
                      <span style={{ fontSize: 14, color: '#92400E' }}>🍯 Honey production ({results.totalHoneyLbs} lbs × $20/lb)</span>
                      <p style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>{results.requiredHives} hive{results.requiredHives > 1 ? 's' : ''} × ~{results.honeyLbsPerHive} lbs each (FL avg)</p>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#92400E' }}>+{fmtMoney(results.honeyRevenue)}/yr</span>
                  </div>

                  {results.netAnnualSavings > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
                      <span style={{ fontSize: 20 }}>📈</span>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: C.greenDark }}>
                          Total annual benefit: {fmtMoney(results.netAnnualSavings)}/yr
                        </p>
                        <p style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>
                          Startup cost pays for itself in ~{results.roiMonths} month{results.roiMonths !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* County Details */}
                <div style={{ background: C.white, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 24, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 700, color: C.navy, fontSize: 17, marginBottom: 16 }}>
                    {selectedCounty.name} County Details
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                    <div style={{ padding: '10px 14px', background: C.lightGray, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5 }}>Property Appraiser</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginTop: 2 }}>{selectedCounty.propertyAppraiser.name}</p>
                    </div>
                    <div style={{ padding: '10px 14px', background: C.lightGray, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5 }}>Phone</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginTop: 2 }}>{selectedCounty.propertyAppraiser.phone}</p>
                    </div>
                    <div style={{ padding: '10px 14px', background: C.lightGray, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5 }}>Application Deadline</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginTop: 2 }}>March 1</p>
                    </div>
                    <div style={{ padding: '10px 14px', background: C.lightGray, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5 }}>Required Hives (est.)</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginTop: 2 }}>{results.requiredHives} hives</p>
                    </div>
                  </div>

                  {selectedCounty.notes && (
                    <p style={{ fontSize: 13, color: C.gray, fontStyle: 'italic' }}>💡 {selectedCounty.notes}</p>
                  )}

                  <a
                    href={selectedCounty.propertyAppraiser.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 14, fontWeight: 600, color: C.blue, textDecoration: 'none' }}
                  >
                    Visit {selectedCounty.name} County Property Appraiser →
                  </a>
                </div>

                {/* What you'll need */}
                <div style={{ background: C.white, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 24, marginBottom: 32, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 700, color: C.navy, fontSize: 17, marginBottom: 16 }}>What you&apos;ll need</h3>
                  {[
                    { label: `${results.requiredHives} beehive${results.requiredHives > 1 ? 's' : ''}`, sub: `Recommended for ${results.agEligibleAcres.toFixed(results.agEligibleAcres % 1 ? 2 : 0)} ag-eligible acres in ${selectedCounty.name} County` },
                    { label: 'Agricultural classification application', sub: `Filed with ${selectedCounty.propertyAppraiser.name} by March 1` },
                    { label: 'FDACS apiary registration', sub: 'Required for all Florida beekeepers — simple online form (~$10/year)' },
                    { label: 'Demonstrate bona fide agricultural use', sub: 'Classification auto-renews annually once approved (FL Statute 193.461)' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                      <svg width="22" height="22" viewBox="0 0 20 20" fill={C.green} style={{ flexShrink: 0, marginTop: 2 }}>
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p style={{ fontWeight: 700, color: C.navy, fontSize: 15 }}>{item.label}</p>
                        <p style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => {
                    setStep('signup');
                    track('signup_started', { county: selectedCounty.name, savings: results?.annualSavings, state: 'FL' });
                    trackContact('engage', { event: 'started_signup' });
                    if (resultsTimeRef.current) {
                      trackContact('engage', { event: 'time_on_results', timeMs: Date.now() - resultsTimeRef.current });
                    }
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{ width: '100%', background: C.green, color: C.white, fontWeight: 700, fontSize: 18, padding: '18px 32px', borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(87,201,117,0.4)' }}
                >
                  Get Your Free {selectedCounty.name} County Guide →
                </button>
                <p style={{ textAlign: 'center', fontSize: 13, color: C.gray, marginTop: 12 }}>
                  Free PDF with step-by-step filing instructions for {selectedCounty.name} County
                </p>
              </>
            )}
          </div>
        </section>
      )}

      {/* ===== STEP 3: SIGNUP ===== */}
      {step === 'signup' && selectedCounty && results && (
        <section className="fade-in" style={{ background: C.sky, minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px 80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
              {['Property', 'Savings', 'Guide'].map((label, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, background: C.blue, color: C.white }}>{i < 2 ? '✓' : i + 1}</div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.navy }}>{label}</span>
                  {i < 2 && <div style={{ width: 40, height: 2, background: C.blue, marginLeft: 8 }} />}
                </div>
              ))}
            </div>

            <div style={{ background: C.white, borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 32, border: '1px solid #D5EAFF' }}>
              <p style={{ fontSize: 14, color: C.gray, fontWeight: 600, marginBottom: 4 }}>Your estimated annual savings</p>
              <p style={{ fontSize: 40, fontWeight: 900, ...gradientText, lineHeight: 1 }}>{fmtMoney(results.annualSavings)}</p>
              <p style={{ fontSize: 14, color: C.gray, marginTop: 8 }}>{selectedCounty.name} County, Florida — {acres} acres</p>
            </div>

            <div style={{ background: C.white, borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: 32, border: '1px solid #e2e8f0' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 8 }}>Get Your Free Guide</h2>
                <p style={{ fontSize: 15, color: C.gray, lineHeight: 1.5 }}>
                  We&apos;ll email you the <strong style={{ color: C.navy }}>{selectedCounty.name} County Agricultural Classification Guide</strong> with your Property Appraiser&apos;s contact info, application tips, and step-by-step filing instructions.
                </p>
              </div>

              <form onSubmit={handleLeadSubmit}>
                <div className="r-signup-grid" style={{ marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 6 }}>First Name *</label>
                    <input type="text" required value={lead.firstName} onChange={(e) => setLead({ ...lead, firstName: e.target.value })} placeholder="Chris"
                      style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 500, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Last Name *</label>
                    <input type="text" required value={lead.lastName} onChange={(e) => setLead({ ...lead, lastName: e.target.value })} placeholder="Miller"
                      style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 500, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Email *</label>
                  <input type="email" required value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} placeholder="chris@example.com"
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 500, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Phone <span style={{ fontWeight: 400, color: C.gray }}>(optional)</span></label>
                  <input type="tel" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder="(305) 555-1234"
                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 500, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <button type="submit" disabled={isSubmitting || !lead.firstName || !lead.lastName || !lead.email}
                  style={{ width: '100%', padding: '16px 32px', borderRadius: 12, background: !isSubmitting && lead.firstName && lead.lastName && lead.email ? C.blue : '#93C5FD', color: C.white, fontWeight: 700, fontSize: 17, border: 'none', cursor: !isSubmitting && lead.firstName && lead.lastName && lead.email ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {isSubmitting ? <><span className="spinner" /> Sending...</> : 'Email My Free Guide'}
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gray} strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <p style={{ fontSize: 12, color: C.gray }}>We&apos;ll never share your info. Unsubscribe anytime.</p>
              </div>
            </div>

            <p style={{ textAlign: 'center', marginTop: 20 }}>
              <button onClick={() => { setStep('results'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ background: 'transparent', border: 'none', color: C.gray, fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>← Back to savings</button>
            </p>
          </div>
        </section>
      )}

      {/* ===== STEP 4: THANK YOU ===== */}
      {step === 'thankyou' && selectedCounty && results && (
        <section className="fade-in" style={{ background: C.sky, minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ maxWidth: 560, margin: '0 auto', padding: '60px 24px 80px', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: C.navy, marginBottom: 12 }}>You&apos;re All Set!</h2>
            <p style={{ fontSize: 17, color: C.gray, lineHeight: 1.6, marginBottom: 32, maxWidth: 420, margin: '0 auto 32px' }}>
              Your <strong style={{ color: C.navy }}>{selectedCounty.name} County Agricultural Classification Guide</strong> is on its way to <strong style={{ color: C.navy }}>{lead.email}</strong>.
            </p>

            <div style={{ background: C.white, borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 32, border: '1px solid #D5EAFF' }}>
              <p style={{ fontSize: 14, color: C.gray, fontWeight: 600, marginBottom: 4 }}>Your estimated annual savings</p>
              <p style={{ fontSize: 48, fontWeight: 900, ...gradientText, lineHeight: 1, marginBottom: 16 }}>{fmtMoney(results.annualSavings)}</p>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <p style={{ fontSize: 15, color: C.navy, fontWeight: 600, marginBottom: 4 }}>What happens next?</p>
                <div style={{ textAlign: 'left', display: 'inline-block' }}>
                  {[
                    'Check your email for the guide',
                    `Contact ${selectedCounty.name} County Property Appraiser before March 1`,
                    'Reach out to BeeKings when you\'re ready to get started with hives',
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: C.sky, color: C.blue, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 14, color: C.gray }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: C.navy, borderRadius: 16, padding: 32 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: C.white, marginBottom: 8 }}>Ready to start saving?</h3>
              <p style={{ color: '#8DA4B5', fontSize: 14, marginBottom: 20 }}>BeeKings provides everything: hives, bees, equipment, training, and ongoing support.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="mailto:info@beekings.com" style={{ background: C.blue, color: C.white, fontWeight: 700, fontSize: 15, padding: '12px 28px', borderRadius: 12, textDecoration: 'none' }}>Email Us</a>
                <a href="https://beekings.com" target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(255,255,255,0.15)', color: C.white, fontWeight: 700, fontSize: 15, padding: '12px 28px', borderRadius: 12, textDecoration: 'none' }}>Visit BeeKings.com</a>
              </div>
            </div>

            <p style={{ marginTop: 24 }}>
              <button onClick={startOver} style={{ background: 'transparent', border: 'none', color: C.gray, fontWeight: 600, fontSize: 14, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>Calculate for another property</button>
            </p>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ background: C.navy, padding: '56px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="r-footer-grid" style={{ marginBottom: 40 }}>
            <div>
              <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 36, marginBottom: 12, filter: 'brightness(0) invert(1)' }} />
              <p style={{ color: '#8DA4B5', fontSize: 14 }}>Canton, Texas</p>
              <p style={{ marginTop: 8 }}><a href="mailto:info@beekings.com" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>info@beekings.com</a></p>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: C.white, marginBottom: 12, fontSize: 14 }}>Resources</p>
              <p style={{ marginBottom: 8 }}><a href="https://www.flsenate.gov/Laws/Statutes/2024/193.461" target="_blank" rel="noopener noreferrer" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>FL Statute 193.461</a></p>
              <p style={{ marginBottom: 8 }}><a href="https://floridabeekeepers.org" target="_blank" rel="noopener noreferrer" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Florida State Beekeepers Assn.</a></p>
              <p style={{ marginBottom: 8 }}><a href="https://www.fdacs.gov/" target="_blank" rel="noopener noreferrer" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>FL Dept. of Agriculture</a></p>
              <p><a href="/texas" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Texas Calculator</a></p>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: C.white, marginBottom: 12, fontSize: 14 }}>Company</p>
              <p style={{ marginBottom: 8 }}><a href="https://beekings.com" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>About</a></p>
              <p style={{ marginBottom: 8 }}><a href="mailto:info@beekings.com" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Contact</a></p>
              <p><a href="#" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Privacy Policy</a></p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1A3A4F', paddingTop: 24 }}>
            <p style={{ fontSize: 12, color: '#5A7A8A', lineHeight: 1.6, marginBottom: 16 }}>
              <strong style={{ color: '#8DA4B5' }}>Disclaimer:</strong> Estimates are based on publicly available county tax data and typical agricultural productivity values. Actual savings depend on your specific property, county Property Appraiser assessment, and approval of your agricultural classification application. BeeKings provides equipment, bees, and education — not tax or legal advice. Consult a qualified professional for advice specific to your situation.
            </p>
            <p style={{ fontSize: 12, color: '#5A7A8A', textAlign: 'center' }}>© {new Date().getFullYear()} BeeKings. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
