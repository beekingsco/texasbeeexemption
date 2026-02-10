'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import countiesData from '@/data/arkansas-counties.json';
import DeadlineCountdown from '@/app/components/DeadlineCountdown';
import StateBadge from '@/app/components/StateBadge';

interface County {
  name: string;
  region: string;
  assessor: { name: string; website: string; phone: string };
  minAcres: number;
  minHives: number;
  additionalHivesPer: number;
  avgTaxRate: number;
  agProductivityValue: number;
  notes: string;
}

interface Suggestion {
  text: string;
  magicKey: string;
}

interface GeocodedAddress {
  address: string;
  lat: number;
  lng: number;
  score: number;
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  addrType: string;
}

interface LeadData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const C = {
  sky: '#F0F4FA',
  blue: '#1A3A6B',
  blueDark: '#122B52',
  navy: '#0D1B2A',
  green: '#D4A843',
  greenDark: '#B8912E',
  white: '#FFFFFF',
  gray: '#5A6A7A',
  lightGray: '#F5F7FB',
};

type Step = 'search' | 'results' | 'signup' | 'thankyou';

export default function ArkansasCalculator() {
  const [step, setStep] = useState<Step>('search');
  const [selectedCountyName, setSelectedCountyName] = useState('');
  const [acres, setAcres] = useState('');
  const [appraisedValue, setAppraisedValue] = useState('');
  const [lead, setLead] = useState<LeadData>({ firstName: '', lastName: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Address search state
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState<GeocodedAddress | null>(null);
  const [addressMode, setAddressMode] = useState(true); // true = address search, false = manual county

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
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
      body: JSON.stringify({ event, ...data, state: 'AR' }),
    }).catch(() => {});
  }, []);

  const trackContact = useCallback((action: string, data?: Record<string, unknown>) => {
    fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId: sessionIdRef.current, state: 'AR', ...data }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    track('page_view', { referrer: document.referrer, page: 'arkansas' });
  }, [track]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ArcGIS autocomplete
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 5) { setSuggestions([]); return; }
    try {
      const resp = await fetch(`/api/geocode?q=${encodeURIComponent(query)}&mode=suggest&state=AR`);
      const data = await resp.json();
      if (data.suggestions?.length > 0) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    } catch { setSuggestions([]); }
  }, []);

  const handleAddressInput = (value: string) => {
    setSearchInput(value);
    setSearchError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const processAddress = async (addressText: string, magicKey?: string) => {
    setIsSearching(true);
    setSearchError('');
    setShowSuggestions(false);
    setSearchInput(addressText.replace(/, USA$/, ''));

    try {
      const geoUrl = `/api/geocode?q=${encodeURIComponent(addressText)}&mode=geocode${magicKey ? `&magicKey=${encodeURIComponent(magicKey)}` : ''}`;
      const geoResp = await fetch(geoUrl);
      const geoData = await geoResp.json();

      if (!geoData.results?.length) {
        setSearchError('We couldn\'t verify that address. Try entering your full street address.');
        setIsSearching(false);
        return;
      }

      const geo: GeocodedAddress = geoData.results[0];

      // Check it's Arkansas
      if (geo.state && !['AR', 'Arkansas'].includes(geo.state)) {
        setSearchError(`That address is in ${geo.state}, not Arkansas. Try our Texas or Florida calculator, or select another state from the homepage.`);
        setIsSearching(false);
        return;
      }

      // Match county
      const countyClean = (geo.county || '').replace(/ County$/i, '').trim();
      const matchedCounty = counties.find(c => c.name.toLowerCase() === countyClean.toLowerCase());

      if (!matchedCounty) {
        setSearchError(`Couldn't identify the county for this address. Please select your county manually below.`);
        setIsSearching(false);
        setAddressMode(false);
        return;
      }

      setGeocodedAddress(geo);
      setSelectedCountyName(matchedCounty.name);
      setSearchInput(geo.address.replace(/, USA$/, ''));

      // Auto-fill with reasonable defaults for the county
      if (!acres) setAcres('10');
      if (!appraisedValue) setAppraisedValue('250000');

      // Auto-advance to results
      setStep('results');

      track('address_searched', { county: matchedCounty.name, address: geo.address, state: 'AR' });
      trackContact('search', { address: geo.address, county: countyClean, lat: geo.lat, lng: geo.lng, referrer: document.referrer });
    } catch {
      setSearchError('Something went wrong. Please try again.');
    }
    setIsSearching(false);
  };

  const handleSuggestionSelect = (s: Suggestion) => {
    setShowSuggestions(false);
    processAddress(s.text, s.magicKey);
  };

  const handleAddressSearch = () => {
    if (searchInput.trim()) processAddress(searchInput);
  };

  // Calculate results
  const calculateResults = () => {
    if (!selectedCounty) return null;
    const totalAcres = acres ? parseFloat(acres) : 0;
    const totalValue = appraisedValue ? parseFloat(appraisedValue) : 0;
    if (isNaN(totalAcres) || isNaN(totalValue) || totalAcres <= 0 || totalValue <= 0) return null;

    const taxRate = selectedCounty.avgTaxRate / 100; // Arkansas uses percentage rates

    // Arkansas: typically 5 acres minimum, but varies by county
    // Homestead: 1 acre + structure stays taxed at market rate
    const homesteadAcres = Math.min(1, totalAcres);
    const agEligibleAcres = Math.max(0, totalAcres - homesteadAcres);

    if (agEligibleAcres < selectedCounty.minAcres) return null;

    // Estimate land value vs improvement value
    // Assume ~60% of value is land for rural AR property
    const landPortion = 0.6;
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
    if (agEligibleAcres > selectedCounty.minAcres) {
      requiredHives += Math.ceil((agEligibleAcres - selectedCounty.minAcres) / selectedCounty.additionalHivesPer);
    }

    // Costs
    const hiveCost = 197;
    const nucCost = 260;
    const upfrontPerHive = hiveCost + nucCost;
    const annualMgmtPerHive = 75;
    const totalUpfront = requiredHives * upfrontPerHive;
    const annualMgmt = requiredHives * annualMgmtPerHive;

    // Arkansas honey production (moderate climate)
    const honeyLbsPerHive = 50;
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
    const minRequired = selectedCounty ? selectedCounty.minAcres + 1 : 6;
    if (parseFloat(acres) < minRequired) {
      setSearchError(`Your property needs at least ${selectedCounty?.minAcres || 5} acres (beyond your homestead) to benefit from agricultural use valuation.`);
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
        state: 'AR',
        acres: acres ? parseFloat(acres) : null,
        appraisedValue: appraisedValue ? parseFloat(appraisedValue) : null,
        estimatedSavings: results?.annualSavings,
        source: 'arkansas-calculator',
      };
      await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      track('lead_captured', { county: selectedCounty?.name, savings: results?.annualSavings, state: 'AR' });
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
      <StateBadge stateCode="AR" stateName="Arkansas" />
      <style>{`
        * { box-sizing: border-box; }
        .r-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        .r-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .r-nav { display: flex; align-items: center; gap: 32px; }
        .r-hero-h1 { font-size: 60px; }
        .r-result-num { font-size: 72px; }
        .r-pill { flex-direction: row; border-radius: 100px; padding: 6px 6px 6px 20px; }
        .r-pill-btn { white-space: nowrap; border-radius: 100px; padding: 14px 28px; font-size: 16px; }
        .r-footer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
        .r-section { padding: 80px 24px; }
        .r-vprops { display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; }
        .r-signup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        .spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
        @media (max-width: 768px) {
          .r-grid3 { grid-template-columns: 1fr; gap: 24px; }
          .r-grid2 { grid-template-columns: 1fr; }
          .r-nav { display: none; }
          .r-hero-h1 { font-size: 40px; }
          .r-result-num { font-size: 48px; }
          .r-pill { flex-direction: column; border-radius: 16px; padding: 16px; }
          .r-pill-btn { border-radius: 12px; padding: 16px; font-size: 16px; width: 100%; }
          .r-footer-grid { grid-template-columns: 1fr; gap: 32px; }
          .r-section { padding: 48px 16px; }
          .r-vprops { flex-direction: column; align-items: center; gap: 12px; }
          .r-signup-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* HEADER */}
      <header style={{ background: C.white, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: back arrow */}
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: C.gray }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>🔙</span>
          </a>
          {/* Center: BeeKings logo */}
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 40 }} />
          </a>
          {/* Right: state badge */}
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
            <div style={{ background: `linear-gradient(135deg, ${C.blue} 0%, ${C.blueDark} 100%)`, color: C.white, fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 20 }}>🐝</span> Arkansas
            </div>
          </div>
        </div>
      </header>

      {/* COUNTDOWN BANNER */}
      <div style={{ width: '100%' }}>
        <DeadlineCountdown
          deadlineISO="2026-03-01T23:59:59-06:00"
          timezone="America/Chicago"
          deadlineText="File by March 1 for 2026 Arkansas Agricultural Use Valuation"
          stateName="Arkansas"
          programName="Agricultural Use Valuation"
        />
      </div>

      {/* ===== STEP 1: SEARCH ===== */}
      {step === 'search' && (
        <>
          {/* Hero with background photo */}
          <section style={{ position: 'relative', overflow: 'hidden', minHeight: 420 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url(/hero-landowner.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 25%' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(13,27,42,0.6) 0%, rgba(26,58,91,0.45) 50%, rgba(13,27,42,0.4) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 10, maxWidth: 800, margin: '0 auto', padding: '60px 24px 60px', textAlign: 'center' }}>
              <h1 className="r-hero-h1" style={{ fontWeight: 900, color: '#FFFFFF', lineHeight: 1.05, marginBottom: 16, letterSpacing: '-0.03em', maxWidth: '100%' }}>
                Save Money on<br />Property Taxes<br /><span style={{ color: C.green }}>with Bees</span>
              </h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 32, fontWeight: 500 }}>
                See how much you could save with an Arkansas agricultural use valuation
              </p>

              {/* Search pill */}
              <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }} ref={searchRef}>
                <div className="r-pill" style={{
                  background: C.white, boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  display: 'flex', alignItems: 'center',
                  border: searchError ? '2px solid #EF4444' : '2px solid #e2e8f0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 33 33" fill={C.blue} style={{ flexShrink: 0, marginRight: 8 }}>
                      <path d="M16.5 32.168a7.028 7.028 0 0 1-5.748-2.933c-5.081-7.01-7.659-12.278-7.659-15.662A13.405 13.405 0 0 1 25.98 4.094a13.405 13.405 0 0 1 3.927 9.48c0 3.383-2.578 8.652-7.66 15.66a7.028 7.028 0 0 1-5.747 2.934Zm0-29.09A10.511 10.511 0 0 0 6 13.576c0 2.68 2.524 7.635 7.106 13.953a4.194 4.194 0 0 0 6.786 0C24.475 21.211 27 16.256 27 13.576a10.51 10.51 0 0 0-10.5-10.498Z" />
                      <path d="M16.5 8.17a5.333 5.333 0 1 0 0 10.667 5.333 5.333 0 0 0 0-10.667Zm0 7.999a2.667 2.667 0 1 1 0-5.333 2.667 2.667 0 0 1 0 5.333Z" />
                    </svg>
                    <input
                      type="text" value={searchInput}
                      onChange={(e) => handleAddressInput(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && searchInput.trim()) handleAddressSearch(); }}
                      placeholder="Enter your address"
                      style={{ flex: 1, fontSize: 16, fontWeight: 500, color: C.navy, border: 'none', outline: 'none', background: 'transparent', padding: '14px 0', fontFamily: 'inherit', minWidth: 0 }}
                    />
                  </div>
                  <button onClick={handleAddressSearch} disabled={!searchInput.trim() || isSearching} className="r-pill-btn" style={{
                    background: searchInput.trim() && !isSearching ? C.blue : '#93C5FD', color: C.white, fontWeight: 700, border: 'none',
                    cursor: searchInput.trim() && !isSearching ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    {isSearching ? <><span className="spinner" /> Verifying...</> : 'Get My Savings'}
                  </button>
                </div>

                {searchError && (
                  <div style={{ marginTop: 12, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, textAlign: 'left' }}>
                    <p style={{ fontSize: 14, color: '#991B1B', fontWeight: 500 }}>{searchError}</p>
                  </div>
                )}

                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, background: C.white, border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.12)', maxHeight: 360, overflowY: 'auto', zIndex: 50 }}>
                    {suggestions.map((s, i) => {
                      const parts = s.text.split(',').map(p => p.trim());
                      const street = parts[0] || '';
                      const rest = parts.slice(1).join(', ');
                      return (
                        <button key={i} onClick={() => handleSuggestionSelect(s)}
                          style={{ width: '100%', padding: '14px 20px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 12 }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = C.sky)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                          <svg width="18" height="18" viewBox="0 0 33 33" fill={C.blue} style={{ flexShrink: 0 }}>
                            <path d="M16.5 32.168a7.028 7.028 0 0 1-5.748-2.933c-5.081-7.01-7.659-12.278-7.659-15.662A13.405 13.405 0 0 1 25.98 4.094a13.405 13.405 0 0 1 3.927 9.48c0 3.383-2.578 8.652-7.66 15.66a7.028 7.028 0 0 1-5.747 2.934Z" />
                          </svg>
                          <div>
                            <div style={{ fontWeight: 700, color: C.navy, fontSize: 16 }}>{street}</div>
                            <div style={{ fontSize: 13, color: '#5A6A7A', marginTop: 2 }}>{rest}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 12, fontWeight: 500 }}>
                Instant estimate — no phone calls, no spam
              </p>

              <div className="r-vprops" style={{ marginTop: 16 }}>
                {['Minimum 5 acres', 'Free instant estimate', 'All 75 AR counties'].map(text => (
                  <span key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="12" fill="#FFFFFF" opacity={0.2} />
                      <path d="M7 12l3 3 7-7" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Property details form — shows after address is found */}
          {geocodedAddress && selectedCountyName && (
            <section style={{ background: C.white, padding: '40px 24px' }}>
              <div style={{ maxWidth: 480, margin: '0 auto' }}>
                <div style={{ background: C.white, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 28, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="12" fill={C.green} />
                      <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{selectedCountyName} County, Arkansas</p>
                  </div>
                  <p style={{ fontSize: 14, color: C.gray, marginBottom: 20 }}>
                    We found your county. Enter your property details to calculate savings:
                  </p>
                  <div className="r-grid2" style={{ marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Acres</label>
                      <input type="number" value={acres} onChange={(e) => { setAcres(e.target.value); setSearchError(''); }} placeholder="e.g. 10"
                        style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 600, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                      <p style={{ fontSize: 11, color: C.gray, marginTop: 3 }}>Min 5 acres typically</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Assessed Value ($)</label>
                      <input type="number" value={appraisedValue} onChange={(e) => { setAppraisedValue(e.target.value); setSearchError(''); }} placeholder="e.g. 250000"
                        style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 600, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                      <p style={{ fontSize: 11, color: C.gray, marginTop: 3 }}>From tax notice</p>
                    </div>
                  </div>
                  {searchError && (
                    <div style={{ marginBottom: 16, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10 }}>
                      <p style={{ fontSize: 13, color: '#991B1B', fontWeight: 500 }}>{searchError}</p>
                    </div>
                  )}
                  <button onClick={handleCalculate} style={{
                    width: '100%', padding: '14px 24px', borderRadius: 12,
                    background: C.blue, color: C.white, fontWeight: 700, fontSize: 16,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 4px 16px rgba(28,124,229,0.3)',
                  }}>
                    Calculate My Savings →
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* How It Works */}
          <section id="how-it-works" className="r-section" style={{ background: C.sky, textAlign: 'center' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8 }}>
                <img src="/hero-beekeeper.png" alt="Beekeeper illustration" style={{ width: 220, height: 'auto', marginBottom: 12 }} />
                <h2 style={{ fontSize: 32, fontWeight: 800, color: C.navy, marginBottom: 8 }}>How Agricultural Use Valuation Works</h2>
              </div>
              <p style={{ color: C.gray, fontSize: 16, marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
                Arkansas law allows landowners using property for agriculture — including beekeeping — to have it assessed at its agricultural productivity value instead of market value.
              </p>
              <div className="r-grid3" style={{ gap: 48 }}>
                {[
                  { n: '1', title: 'Check your property', desc: 'Enter your county, acreage, and current assessed value above. We\'ll estimate your savings based on your county\'s tax rates and agricultural productivity values.' },
                  { n: '2', title: 'See your savings', desc: 'Get an instant estimate of how much you could save annually, the number of hives you\'d need, and your return on investment.' },
                  { n: '3', title: 'Get your free guide', desc: 'Download a county-specific guide with your County Assessor\'s contact info, application tips, and the March 1 deadline.' },
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
                Why Arkansas Is Great for Beekeeping
              </h2>
              <p style={{ color: C.gray, fontSize: 16, textAlign: 'center', marginBottom: 48, maxWidth: 560, margin: '0 auto 48px' }}>
                Arkansas&apos;s climate and legal framework make it an excellent state for combining beekeeping with property tax savings.
              </p>
              <div className="r-grid2" style={{ gap: 20 }}>
                {[
                  { icon: '🌳', title: 'Diverse Forage Sources', desc: 'Arkansas\'s forests, wildflowers, and agricultural crops provide excellent bee forage year-round, from spring blackberry blooms to fall goldenrod.' },
                  { icon: '📋', title: 'Straightforward Process', desc: 'File your agricultural use application with your County Assessor by March 1. Once approved, your classification typically continues annually as long as agricultural use continues.' },
                  { icon: '💰', title: 'Significant Tax Savings', desc: 'Arkansas assesses agricultural land at productivity value rather than market value — often 40-70% lower, resulting in substantial annual tax savings.' },
                  { icon: '🍯', title: 'Quality Honey Production', desc: 'Arkansas hives typically produce 50+ lbs of honey per year. Local raw honey sells for $15-25/lb, providing income alongside your tax savings.' },
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
                  { q: 'What is Arkansas agricultural use valuation?', a: 'Under Arkansas law, land used for "bona fide agricultural purposes" — including beekeeping — is assessed at its agricultural productivity value instead of market value. This typically reduces the taxable value of the land by 40–70%, leading to significant property tax savings for Arkansas landowners.' },
                  { q: 'What are the minimum requirements?', a: 'Requirements vary by county, but most Arkansas counties require a minimum of 5 acres and 5 beehives to qualify for agricultural use valuation. The application must be filed with your County Assessor by March 1 each year.' },
                  { q: 'When is the application deadline?', a: 'March 1 of each year. First-time applicants must file a full application with their County Assessor. If you miss the deadline, you may still apply with a late filing, but it\'s not guaranteed to be accepted. After your first year, the classification typically continues as long as agricultural use continues.' },
                  { q: 'How many beehives do I need?', a: 'Arkansas law doesn\'t specify an exact number — it requires "bona fide agricultural use." In practice, most County Assessors look for at least 5 hives on minimum acreage, with roughly 1 additional hive per 5 acres beyond that. Our calculator estimates the appropriate number based on your county\'s typical requirements.' },
                  { q: 'How much does it cost to get started with bees?', a: 'A basic hive setup runs about $197 for equipment and $260 for a nucleus colony (nuc) of bees — roughly $457 per hive. Annual maintenance (mite treatments, feed, replacement parts) averages around $75 per hive. Most beekeepers also earn income from honey: Arkansas hives typically produce 50 lbs per year, which sells for about $20/lb locally.' },
                  { q: 'Can I combine this with homestead exemption?', a: 'Yes. Agricultural use valuation and homestead exemption are separate programs and can be combined. Your home and the surrounding 1 acre continue to receive any applicable homestead benefits and are taxed at market rate. The agricultural use valuation applies to your remaining qualifying acreage, reducing that land\'s taxable value.' },
                  { q: 'Do I need beekeeping experience?', a: 'No prior experience is needed. BeeKings provides hives, bees, equipment, hands-on training, and ongoing support. Arkansas also has excellent local beekeeping associations and the University of Arkansas Cooperative Extension Service for education. You may need to register your apiary with the Arkansas State Plant Board.' },
                  { q: 'How long does approval take?', a: 'If you file by March 1, your County Assessor will evaluate your application and typically notify you within a few months. If denied, you can appeal. Once approved, the classification typically stays in effect as long as your agricultural use continues — you don\'t need to reapply annually in most cases.' },
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
                Use the calculator above to get a free, instant estimate for your Arkansas property
              </p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: C.green, color: C.navy, fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(212,168,67,0.4)' }}>
                Calculate My Savings →
              </button>
              <p style={{ color: '#5A7A8A', fontSize: 13, marginTop: 12 }}>Free • Instant • No spam</p>
            </div>
          </section>

          {/* SEO Content */}
          <section className="r-section" style={{ background: C.lightGray }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 20, textAlign: 'center' }}>
                Arkansas Beekeeping Agricultural Use Valuation Guide
              </h2>
              <div style={{ fontSize: 15, color: C.gray, lineHeight: 1.8 }}>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>What is Arkansas agricultural use valuation?</strong> Arkansas law allows
                  landowners to have their property assessed at its agricultural productivity value instead of market value if it&apos;s being used for
                  bona fide agricultural purposes — which explicitly includes beekeeping. This typically reduces the taxable value of the land
                  by 40–70%, resulting in substantial property tax savings for Arkansas landowners.
                </p>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>Minimum requirements.</strong> Most Arkansas counties require a minimum of 5 acres
                  to qualify for agricultural use valuation. You&apos;ll also need to demonstrate genuine agricultural activity — typically
                  5 beehives on minimum acreage, with roughly 1 additional hive per 5 acres beyond that. Requirements may vary slightly by county.
                </p>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>How many beehives do I need?</strong> While Arkansas law doesn&apos;t specify an exact number,
                  most County Assessors look for 5 hives on minimum acreage (5 acres), with approximately 1 additional hive per 5 acres beyond that.
                  Our calculator estimates the appropriate number based on your county&apos;s typical requirements and your property size.
                </p>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>Arkansas&apos;s beekeeping advantage.</strong> Arkansas&apos;s diverse landscape — from Ozark forests
                  to Delta farmland — provides excellent bee forage throughout the growing season. Arkansas hives typically produce 50+ lbs of honey
                  per year. At $15-25/lb for local raw honey, that&apos;s meaningful income on top of your tax savings.
                </p>
                <p>
                  <strong style={{ color: C.navy }}>All 75 Arkansas counties.</strong> Our calculator covers every Arkansas county, from
                  Benton and Washington in the northwest to Chicot and Ashley in the southeast. Each county has its own County Assessor
                  and tax rates, and we factor in your county&apos;s specific data to give you the most accurate estimate possible.
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

            {/* Satellite Map — if we have geocoded coordinates */}
            {geocodedAddress && (
              <div style={{ borderRadius: '16px 16px 0 0', overflow: 'hidden', marginBottom: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: 160, background: '#1a2e1a' }}>
                <img
                  src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${geocodedAddress.lng - 0.003},${geocodedAddress.lat - 0.0015},${geocodedAddress.lng + 0.003},${geocodedAddress.lat + 0.0015}&bboxSR=4326&imageSR=4326&size=800,320&format=jpg&f=image`}
                  alt="Satellite view of property"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* County info */}
            <div style={{ background: C.white, borderRadius: geocodedAddress ? 0 : '16px 16px 0 0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #D5EAFF', borderTop: geocodedAddress ? 'none' : '1px solid #D5EAFF' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="12" fill={C.green} />
                <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
                  {geocodedAddress ? geocodedAddress.address.replace(/, USA$/, '') : `${selectedCounty.name} County, Arkansas`} — {acres} acres
                </p>
                <p style={{ fontSize: 13, color: C.gray }}>
                  {geocodedAddress ? `${selectedCounty.name} County · ` : ''}Assessed value: {fmtMoney(parseFloat(appraisedValue))} · Tax rate: {selectedCounty.avgTaxRate}%
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.gray }}>Without Ag Use Valuation</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: C.navy }}>{fmtMoney(results.currentTaxes)}/yr</span>
                    </div>
                    <div style={{ height: 28, background: '#FEE2E2', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '100%', background: '#EF4444', borderRadius: 8 }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.gray }}>With Ag Use Valuation</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: C.green }}>{fmtMoney(results.totalWithAg)}/yr</span>
                    </div>
                    <div style={{ height: 28, background: '#FFF0D1', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(5, (results.totalWithAg / results.currentTaxes) * 100)}%`, background: C.green, borderRadius: 8 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#FFF8EE', borderRadius: 10, border: '1px solid #F0DBA8' }}>
                    <span style={{ fontSize: 20 }}>💰</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.greenDark }}>You save {fmtMoney(results.annualSavings)}/yr ({results.savingsPercent.toFixed(0)}% reduction)</span>
                  </div>

                  {/* Homestead note */}
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', marginTop: 16, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
                    <strong>📝 Note:</strong> Your homestead ({results.homesteadAcres} acre + home, estimated at {fmtMoney(results.homesteadValue)}) continues to be taxed at market rate.
                    The ag use valuation applies to the remaining <strong>{results.agEligibleAcres.toFixed(results.agEligibleAcres % 1 ? 2 : 0)} acres</strong>.
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
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>Total Upfront</span>
                      <span style={{ fontSize: 17, fontWeight: 900, color: C.blue }}>{fmtMoney(results.totalUpfront)}</span>
                    </div>
                  </div>

                  <div style={{ padding: 16, background: '#F0F9FF', borderRadius: 10, border: '1px solid #BAE6FD', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 18 }}>🍯</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Annual Honey Production</span>
                    </div>
                    <p style={{ fontSize: 14, color: C.gray, margin: 0 }}>
                      Estimated {fmt(results.totalHoneyLbs)} lbs/year × ${results.honeyLbsPerHive / results.honeyLbsPerHive * 20}/lb = <strong style={{ color: C.navy }}>{fmtMoney(results.honeyRevenue)}</strong> revenue
                    </p>
                  </div>

                  <div style={{ padding: 16, background: '#FFF8EE', borderRadius: 10, border: '1px solid #F0DBA8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Annual Management Cost</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{fmtMoney(results.annualMgmt)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F0DBA8' }}>
                      <span style={{ fontSize: 14, color: C.gray }}>({results.requiredHives} hives × $75/year)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Net Annual Benefit</span>
                      <span style={{ fontSize: 17, fontWeight: 900, color: C.green }}>{fmtMoney(results.netAnnualSavings)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: C.gray, margin: 0, textAlign: 'center' }}>
                      Tax savings + honey revenue - management cost
                    </p>
                  </div>

                  <div style={{ marginTop: 16, padding: 16, background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenDark} 100%)`, borderRadius: 12, textAlign: 'center', color: C.white }}>
                    <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.9, marginBottom: 4 }}>Return on Investment</p>
                    <p style={{ fontSize: 32, fontWeight: 900, marginBottom: 4 }}>{results.roiMonths} months</p>
                    <p style={{ fontSize: 13, opacity: 0.9, margin: 0 }}>Pays for itself in under {Math.ceil(results.roiMonths / 12)} {results.roiMonths <= 12 ? 'year' : 'years'}</p>
                  </div>
                </div>

                {/* County Info */}
                <div style={{ background: C.white, borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 28, marginBottom: 32, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 700, color: C.navy, fontSize: 17, marginBottom: 20 }}>📋 {selectedCounty.name} County Information</h3>

                  <div style={{ padding: 16, background: C.lightGray, borderRadius: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8 }}>County Assessor</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 4 }}>{selectedCounty.assessor.name}</div>
                    <div style={{ fontSize: 14, color: C.gray, marginBottom: 2 }}>
                      <a href={`tel:${selectedCounty.assessor.phone}`} style={{ color: C.blue, textDecoration: 'none' }}>{selectedCounty.assessor.phone}</a>
                    </div>
                    <div style={{ fontSize: 14, color: C.gray }}>
                      <a href={selectedCounty.assessor.website} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: 'none' }}>{selectedCounty.assessor.website}</a>
                    </div>
                  </div>

                  <div style={{ padding: 16, background: '#F0F9FF', borderRadius: 12, border: '1px solid #BAE6FD' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Requirements for {selectedCounty.name} County</div>
                    <ul style={{ fontSize: 14, color: C.gray, margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                      <li>Minimum <strong>{selectedCounty.minAcres} acres</strong> for agricultural use</li>
                      <li>Minimum <strong>{selectedCounty.minHives} beehives</strong> (+ 1 per {selectedCounty.additionalHivesPer} acres)</li>
                      <li>File application by <strong>March 1</strong> annually</li>
                      <li>Average tax rate: <strong>{selectedCounty.avgTaxRate}%</strong></li>
                    </ul>
                  </div>

                  {selectedCounty.notes && (
                    <div style={{ marginTop: 16, padding: 12, background: '#FFFBEB', borderRadius: 10, border: '1px solid #FDE68A', fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
                      <strong>📌 Note:</strong> {selectedCounty.notes}
                    </div>
                  )}
                </div>

                {/* CTA Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                  <button onClick={() => setStep('signup')} style={{ width: '100%', background: C.blue, color: C.white, fontWeight: 700, fontSize: 17, padding: '16px 32px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(28,124,229,0.3)' }}>
                    Get Your Free County-Specific Guide →
                  </button>
                  <button onClick={startOver} style={{ width: '100%', background: C.white, color: C.navy, fontWeight: 600, fontSize: 15, padding: '12px 24px', borderRadius: 10, border: `2px solid ${C.navy}`, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ← Start Over
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ===== STEP 3: SIGNUP ===== */}
      {step === 'signup' && results && selectedCounty && (
        <section className="fade-in" style={{ background: C.sky, minHeight: 'calc(100vh - 64px)', padding: '60px 24px' }}>
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 40 }}>
              {['Property', 'Savings', 'Guide'].map((label, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, background: i <= 2 ? C.blue : '#D1D5DB', color: C.white,
                  }}>{i < 2 ? '✓' : i + 1}</div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: i <= 2 ? C.navy : C.gray }}>{label}</span>
                  {i < 2 && <div style={{ width: 40, height: 2, background: i < 2 ? C.blue : '#D1D5DB', marginLeft: 8 }} />}
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: C.navy, marginBottom: 12 }}>Get Your Free County Guide</h2>
              <p style={{ fontSize: 16, color: C.gray }}>
                Receive a detailed, step-by-step guide for {selectedCounty.name} County with application instructions, assessor contact info, and deadline reminders.
              </p>
            </div>

            <div style={{ background: C.white, borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 24 }}>
              {/* Summary */}
              <div style={{ padding: 20, background: C.lightGray, borderRadius: 12, marginBottom: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.gray, marginBottom: 4 }}>Your Estimated Annual Savings</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: C.green, marginBottom: 8 }}>{fmtMoney(results.annualSavings)}</div>
                <div style={{ fontSize: 13, color: C.gray }}>
                  {results.totalAcres} acres • {results.requiredHives} hives • {selectedCounty.name} County
                </div>
              </div>

              <form onSubmit={handleLeadSubmit}>
                <div className="r-signup-grid" style={{ marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>First Name *</label>
                    <input required type="text" value={lead.firstName} onChange={(e) => setLead({ ...lead, firstName: e.target.value })}
                      style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontWeight: 500, color: C.navy, fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Last Name *</label>
                    <input required type="text" value={lead.lastName} onChange={(e) => setLead({ ...lead, lastName: e.target.value })}
                      style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontWeight: 500, color: C.navy, fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Email Address *</label>
                  <input required type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontWeight: 500, color: C.navy, fontFamily: 'inherit', outline: 'none' }} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Phone Number *</label>
                  <input required type="tel" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontWeight: 500, color: C.navy, fontFamily: 'inherit', outline: 'none' }} />
                </div>

                <button type="submit" disabled={isSubmitting} style={{
                  width: '100%', padding: '16px 32px', borderRadius: 12,
                  background: isSubmitting ? '#93C5FD' : C.blue, color: C.white, fontWeight: 700, fontSize: 17,
                  border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(28,124,229,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {isSubmitting ? <><span className="spinner" /> Submitting...</> : 'Send Me the Free Guide →'}
                </button>

                <p style={{ fontSize: 12, color: C.gray, marginTop: 16, textAlign: 'center', lineHeight: 1.6 }}>
                  By submitting this form, you agree to receive email and text communications from BeeKings about your property tax savings. No spam, ever. Unsubscribe anytime.
                </p>
              </form>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep('results')} style={{ background: 'transparent', border: 'none', color: C.gray, fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                ← Back to Results
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===== STEP 4: THANK YOU ===== */}
      {step === 'thankyou' && (
        <section className="fade-in" style={{ background: C.sky, minHeight: 'calc(100vh - 64px)', padding: '60px 24px' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 24 }}>🎉</div>
            <h1 style={{ fontSize: 40, fontWeight: 900, color: C.navy, marginBottom: 16 }}>Check Your Inbox!</h1>
            <p style={{ fontSize: 17, color: C.gray, marginBottom: 40, lineHeight: 1.6 }}>
              Your free {selectedCounty?.name} County guide is on its way. We&apos;ll also follow up within 24 hours to answer any questions and help you get started.
            </p>

            <div style={{ background: C.white, borderRadius: 20, padding: 32, marginBottom: 32, textAlign: 'left', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 20, textAlign: 'center' }}>What Happens Next?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { icon: '📧', title: 'Check your email', desc: 'Your Arkansas agricultural use guide should arrive within 5 minutes. Check your spam folder if you don\'t see it.' },
                  { icon: '📞', title: 'We\'ll call you', desc: 'A BeeKings specialist will reach out within 24 hours to discuss your property and answer questions.' },
                  { icon: '🐝', title: 'Site assessment', desc: 'We\'ll schedule a free site visit to evaluate your property and plan optimal hive placement.' },
                  { icon: '📋', title: 'File your application', desc: 'We prepare and submit your application to the County Assessor before the March 1 deadline.' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 32, flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 14, color: C.gray, lineHeight: 1.6 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 15, color: C.gray, marginBottom: 20 }}>
                Questions? Call us at <a href="tel:+18885551234" style={{ color: C.blue, fontWeight: 700, textDecoration: 'none' }}>(888) 555-1234</a>
              </p>
              <button onClick={startOver} style={{ background: C.white, color: C.navy, fontWeight: 600, fontSize: 16, padding: '12px 32px', borderRadius: 10, border: `2px solid ${C.navy}`, cursor: 'pointer', fontFamily: 'inherit' }}>
                Calculate Another Property
              </button>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ background: C.navy, color: C.white, padding: '60px 24px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="r-footer-grid" style={{ marginBottom: 40 }}>
            <div>
              <img src="/beekings-logo-white.png" alt="BeeKings" style={{ height: 32, marginBottom: 16 }} />
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
                Helping Arkansas landowners save thousands on property taxes through strategic beekeeping and agricultural use valuation.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Quick Links</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="/" style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Home</a>
                <a href="#how-it-works" style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>How It Works</a>
                <a href="#faq" style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>FAQ</a>
                <a href="https://beekings.com" style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>BeeKings.com</a>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Contact</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="tel:+18885551234" style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>(888) 555-1234</a>
                <a href="mailto:info@beekings.com" style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>info@beekings.com</a>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              © 2026 BeeKings. All rights reserved.
            </p>
            <div style={{ display: 'flex', gap: 24 }}>
              <a href="/privacy" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="/terms" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
