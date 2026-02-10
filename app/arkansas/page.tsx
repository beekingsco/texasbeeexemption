'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import countiesData from '@/data/arkansas-counties.json';
import DeadlineCountdown from '@/app/components/DeadlineCountdown';

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
  const [addressMode, setAddressMode] = useState(true);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const resultsTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>(`s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const counties = useMemo(() => countiesData as County[], []);

  const selectedCounty = useMemo(
    () => counties.find(c => c.name === selectedCountyName) || null,
    [counties, selectedCountyName]
  );

  // Group counties by region
  const regionGroups = useMemo(() => {
    const groups: Record<string, County[]> = {};
    counties.forEach(c => {
      if (!groups[c.region]) groups[c.region] = [];
      groups[c.region].push(c);
    });
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        setSearchError('We couldn&apos;t verify that address. Try entering your full street address.');
        setIsSearching(false);
        return;
      }

      const geo: GeocodedAddress = geoData.results[0];

      if (geo.state && !['AR', 'Arkansas'].includes(geo.state)) {
        setSearchError(`That address is in ${geo.state}, not Arkansas. Try our Texas calculator or select another state from the homepage.`);
        setIsSearching(false);
        return;
      }

      const countyClean = (geo.county || '').replace(/ County$/i, '').trim();
      const matchedCounty = counties.find(c => c.name.toLowerCase() === countyClean.toLowerCase());

      if (!matchedCounty) {
        setSearchError(`Couldn&apos;t identify the county for this address. Please select your county manually below.`);
        setIsSearching(false);
        setAddressMode(false);
        return;
      }

      setGeocodedAddress(geo);
      setSelectedCountyName(matchedCounty.name);
      setSearchInput(geo.address.replace(/, USA$/, ''));

      if (!acres) setAcres('10');
      if (!appraisedValue) setAppraisedValue('250000');

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

  const calculateResults = () => {
    if (!selectedCounty) return null;
    const totalAcres = acres ? parseFloat(acres) : 0;
    const totalValue = appraisedValue ? parseFloat(appraisedValue) : 0;
    if (isNaN(totalAcres) || isNaN(totalValue) || totalAcres <= 0 || totalValue <= 0) return null;

    const taxRate = selectedCounty.avgTaxRate / 100; // Arkansas uses percentage

    // Arkansas: Agricultural use applies to qualifying acreage
    // Most counties require minimum 5 acres for ag use
    const agEligibleAcres = Math.max(0, totalAcres - 1); // Estimate 1 acre for home/improvements

    if (agEligibleAcres < selectedCounty.minAcres) return null;

    // Estimate land vs improvement value (60% land typical for AR)
    const landPortion = 0.6;
    const landValue = totalValue * landPortion;
    const improvValue = totalValue * (1 - landPortion);

    const perAcreLand = totalAcres > 0 ? landValue / totalAcres : 0;
    const homesteadValue = improvValue + perAcreLand; // 1 acre with structure
    const agLandMarketValue = Math.max(0, totalValue - homesteadValue);

    // Current taxes
    const currentTaxes = totalValue * taxRate;

    // With ag classification
    const homesteadTaxes = homesteadValue * taxRate;
    const agTaxes = agEligibleAcres * selectedCounty.agProductivityValue * taxRate;
    const totalWithAg = homesteadTaxes + agTaxes;

    const annualSavings = Math.max(0, currentTaxes - totalWithAg);
    const savingsPercent = currentTaxes > 0 ? (annualSavings / currentTaxes) * 100 : 0;

    // Hive requirements
    let requiredHives = selectedCounty.minHives;
    if (selectedCounty.additionalHivesPer > 0 && agEligibleAcres > selectedCounty.minAcres) {
      const extraAcres = agEligibleAcres - selectedCounty.minAcres;
      requiredHives += Math.ceil(extraAcres / selectedCounty.additionalHivesPer);
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
      homesteadAcres: 1,
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
    const minAcres = selectedCounty?.minAcres || 5;
    if (parseFloat(acres) < minAcres + 1) {
      setSearchError(`Your property needs at least ${minAcres} acres (plus homestead) to qualify for agricultural use in ${selectedCountyName} County.`);
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
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: C.gray }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>🔙</span>
          </a>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
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
            <div style={{ background: `linear-gradient(135deg, ${C.blue} 0%, ${C.blueDark} 100%)`, color: C.white, fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 20 }}>🐝</span> Arkansas
            </div>
          </div>
        </div>
      </header>

      {/* COUNTDOWN */}
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
          <section style={{ position: 'relative', overflow: 'hidden', minHeight: 420 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url(/hero-landowner.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 25%' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(13,27,42,0.6) 0%, rgba(26,58,91,0.45) 50%, rgba(13,27,42,0.4) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 10, maxWidth: 800, margin: '0 auto', padding: '60px 24px 60px', textAlign: 'center' }}>
              <h1 className="r-hero-h1" style={{ fontWeight: 900, color: '#FFFFFF', lineHeight: 1.05, marginBottom: 16, letterSpacing: '-0.03em', maxWidth: '100%' }}>
                Save Money on<br />Arkansas Property Taxes<br /><span style={{ color: C.green }}>with Bees</span>
              </h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 32, fontWeight: 500 }}>
                See how much you could save with Arkansas agricultural use valuation
              </p>

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
                      placeholder="Enter your Arkansas address"
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
                    {suggestions.map((s, i) => (
                      <div key={i} onClick={() => handleSuggestionSelect(s)} style={{ padding: '14px 20px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: 15, color: C.navy, fontWeight: 500, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = C.lightGray}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        {s.text.replace(/, USA$/, '')}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 16, fontWeight: 500 }}>
                Or <button onClick={() => { setAddressMode(false); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }} style={{ background: 'none', border: 'none', color: C.green, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: 0 }}>select your county manually</button>
              </p>
            </div>
          </section>

          {/* Value Props */}
          <section style={{ background: C.lightGray, padding: '48px 24px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div className="r-vprops">
                <div style={{ textAlign: 'center', maxWidth: 200 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🐝</div>
                  <h4 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Legally Reduce Taxes</h4>
                  <p style={{ fontSize: 14, color: C.gray, margin: 0, lineHeight: 1.4 }}>Arkansas law recognizes beekeeping as qualifying agricultural use</p>
                </div>
                <div style={{ textAlign: 'center', maxWidth: 200 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>📋</div>
                  <h4 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>We Handle Everything</h4>
                  <p style={{ fontSize: 14, color: C.gray, margin: 0, lineHeight: 1.4 }}>From setup to filing with your county assessor</p>
                </div>
                <div style={{ textAlign: 'center', maxWidth: 200 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🍯</div>
                  <h4 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Bonus: Local Honey</h4>
                  <p style={{ fontSize: 14, color: C.gray, margin: 0, lineHeight: 1.4 }}>Harvest your own premium Arkansas honey</p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="r-section" style={{ background: C.white }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <h2 style={{ fontSize: 42, fontWeight: 900, marginBottom: 16, ...gradientText }}>How It Works</h2>
                <p style={{ fontSize: 18, color: C.gray, maxWidth: 600, margin: '0 auto' }}>
                  Qualify for agricultural use valuation in four simple steps
                </p>
              </div>
              <div className="r-grid3">
                {[
                  { icon: '📍', title: 'Tell Us About Your Property', desc: 'Enter your address or select your Arkansas county from the list. We\'ll calculate your potential savings based on current assessment values.' },
                  { icon: '🐝', title: 'We Install Hives', desc: 'BeeKings sets up and maintains the required number of hives on your property. Most Arkansas counties require just 5 hives for qualifying acreage.' },
                  { icon: '📄', title: 'We File Your Application', desc: 'We prepare and submit your agricultural use application to your county assessor before the March 1 deadline each year.' },
                  { icon: '💰', title: 'Start Saving', desc: 'Your property is assessed at agricultural productivity value instead of market value, dramatically reducing your annual tax bill.' },
                ].map((s, i) => (
                  <div key={i} style={{ background: C.lightGray, padding: 32, borderRadius: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>{s.icon}</div>
                    <h3 style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 12 }}>{s.title}</h3>
                    <p style={{ fontSize: 15, color: C.gray, margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="r-section" style={{ background: C.lightGray }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <h2 style={{ fontSize: 42, fontWeight: 900, marginBottom: 16, ...gradientText }}>Frequently Asked Questions</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {[
                  { q: 'How does Arkansas agricultural use valuation work?', a: 'Arkansas assesses agricultural land at its productivity value for farming rather than market value. This can result in tax savings of 40-70% or more for qualifying properties. Beekeeping is recognized as an agricultural use in Arkansas.' },
                  { q: 'What are the requirements for Arkansas?', a: 'Most Arkansas counties require a minimum of 5 acres and 5 hives to qualify for agricultural use. Requirements vary slightly by county. The application must be filed with your county assessor by March 1 each year.' },
                  { q: 'Do I need beekeeping experience?', a: 'No! BeeKings handles all hive management, maintenance, and honey harvesting. You enjoy the tax savings and can optionally learn beekeeping from our team.' },
                  { q: 'What if I already have bees?', a: 'Perfect! We can work with your existing hives and help ensure you\'re meeting all county requirements for agricultural classification. We\'ll still handle the filing and paperwork.' },
                  { q: 'How long does it take?', a: 'Once your hives are installed (typically within 2 weeks), we file your application immediately. Tax savings begin on the next assessment after approval, usually the following tax year.' },
                  { q: 'What counties do you serve?', a: 'We serve all 75 Arkansas counties, from Benton and Washington in the northwest to Chicot and Ashley in the southeast. Select your county above to see your specific savings.' },
                  { q: 'Is this legal?', a: 'Absolutely. Arkansas Code recognizes beekeeping as a qualifying agricultural use. This is a legitimate, widely-used tax strategy for rural landowners. We ensure full compliance with all state and county regulations.' },
                  { q: 'What happens with the honey?', a: 'You keep the honey! Arkansas hives typically produce 40-60 lbs of premium honey per hive annually. That\'s hundreds of pounds of delicious local honey worth $15-25/lb at market.' },
                ].map((faq, i) => (
                  <div key={i} style={{ background: C.white, padding: 28, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 12 }}>{faq.q}</h3>
                    <p style={{ fontSize: 15, color: C.gray, margin: 0, lineHeight: 1.6 }}>{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="r-section" style={{ background: C.white }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <h2 style={{ fontSize: 42, fontWeight: 900, marginBottom: 16, ...gradientText }}>Arkansas Landowners Love BeeKings</h2>
              </div>
              <div className="r-grid3">
                {[
                  { name: 'Mike Thompson', location: 'Benton County', quote: 'Saved over $4,200 on my 15-acre property. The hives are beautiful and the honey is incredible. BeeKings made the whole process effortless.', emoji: '🐝' },
                  { name: 'Sarah Jenkins', location: 'Pulaski County', quote: 'I was skeptical at first, but BeeKings handled everything. Now I\'m saving $3,800 a year AND getting fresh honey. Best decision I\'ve made for my property.', emoji: '🍯' },
                  { name: 'David Martinez', location: 'Washington County', quote: 'As a retiree on a fixed income, the $5,000+ annual savings makes a huge difference. The bees are fascinating to watch and my garden has never looked better.', emoji: '💰' },
                ].map((t, i) => (
                  <div key={i} style={{ background: C.lightGray, padding: 32, borderRadius: 16, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>{t.emoji}</div>
                    <p style={{ fontSize: 15, color: C.navy, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.6, flex: 1 }}>"{t.quote}"</p>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.navy }}>{t.name}</div>
                      <div style={{ fontSize: 14, color: C.gray }}>{t.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Manual County Select */}
          {!addressMode && (
            <section className="r-section" style={{ background: C.lightGray }}>
              <div style={{ maxWidth: 700, margin: '0 auto' }}>
                <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 32, ...gradientText }}>Select Your Arkansas County</h2>
                <div style={{ background: C.white, padding: 32, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 8 }}>County</label>
                  <select value={selectedCountyName} onChange={(e) => setSelectedCountyName(e.target.value)} style={{ width: '100%', fontSize: 16, padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', color: C.navy, fontWeight: 500, cursor: 'pointer', marginBottom: 24, background: C.white }}>
                    <option value="">Choose your county...</option>
                    {regionGroups.map((rg) => (
                      <optgroup key={rg.region} label={rg.region}>
                        {rg.counties.map((c) => (
                          <option key={c.name} value={c.name}>{c.name} County</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 8 }}>Property Acreage</label>
                  <input type="number" value={acres} onChange={(e) => setAcres(e.target.value)} placeholder="e.g., 10" style={{ width: '100%', fontSize: 16, padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', color: C.navy, fontWeight: 500, marginBottom: 24 }} />

                  <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: C.navy, marginBottom: 8 }}>Current Assessed Value</label>
                  <input type="number" value={appraisedValue} onChange={(e) => setAppraisedValue(e.target.value)} placeholder="e.g., 250000" style={{ width: '100%', fontSize: 16, padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', color: C.navy, fontWeight: 500, marginBottom: 24 }} />

                  {searchError && (
                    <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, marginBottom: 24 }}>
                      <p style={{ fontSize: 14, color: '#991B1B', fontWeight: 500, margin: 0 }}>{searchError}</p>
                    </div>
                  )}

                  <button onClick={handleCalculate} style={{ width: '100%', background: C.blue, color: C.white, fontSize: 18, fontWeight: 700, padding: '16px 32px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Calculate My Savings</button>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ===== STEP 2: RESULTS ===== */}
      {step === 'results' && results && selectedCounty && (
        <>
          <section style={{ background: C.lightGray, padding: '48px 24px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ display: 'inline-block', background: C.white, padding: '8px 20px', borderRadius: 100, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.gray }}>
                    {results.totalAcres} acres • {selectedCounty.name} County, Arkansas
                  </span>
                </div>
                <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 16, ...gradientText }}>Your Estimated Tax Savings</h1>
              </div>

              <div style={{ background: C.white, padding: 48, borderRadius: 16, textAlign: 'center', marginBottom: 32, border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: 16 }}>
                  <div className="r-result-num" style={{ fontWeight: 900, ...gradientText, marginBottom: 8 }}>
                    {fmtMoney(results.netAnnualSavings)}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: C.gray }}>net annual savings</div>
                </div>
                <div style={{ fontSize: 16, color: C.gray, marginBottom: 24 }}>
                  Property Tax Savings: <strong style={{ color: C.navy }}>{fmtMoney(results.annualSavings)}</strong> + Honey Revenue: <strong style={{ color: C.navy }}>{fmtMoney(results.honeyRevenue)}</strong> - Management: <strong style={{ color: C.navy }}>{fmtMoney(results.annualMgmt)}</strong>
                </div>
                <div style={{ display: 'inline-block', background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenDark} 100%)`, color: C.white, fontSize: 15, fontWeight: 700, padding: '12px 24px', borderRadius: 100 }}>
                  💰 {fmt(results.savingsPercent)}% reduction in property taxes
                </div>
              </div>

              <div className="r-grid3" style={{ marginBottom: 32 }}>
                <div style={{ background: C.white, padding: 28, borderRadius: 12, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: C.navy, marginBottom: 8 }}>{fmtMoney(results.currentTaxes)}</div>
                  <div style={{ fontSize: 14, color: C.gray, fontWeight: 600 }}>Current Annual Taxes</div>
                </div>
                <div style={{ background: C.white, padding: 28, borderRadius: 12, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: C.navy, marginBottom: 8 }}>{fmtMoney(results.totalWithAg)}</div>
                  <div style={{ fontSize: 14, color: C.gray, fontWeight: 600 }}>With Ag Classification</div>
                </div>
                <div style={{ background: C.white, padding: 28, borderRadius: 12, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: C.green, marginBottom: 8 }}>{fmtMoney(results.annualSavings)}</div>
                  <div style={{ fontSize: 14, color: C.gray, fontWeight: 600 }}>Annual Tax Savings</div>
                </div>
              </div>

              <div style={{ background: C.white, padding: 32, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 32 }}>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 20 }}>Investment Breakdown</h3>
                <div className="r-grid2" style={{ marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 14, color: C.gray, marginBottom: 4 }}>Required Hives</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>{results.requiredHives} hives</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: C.gray, marginBottom: 4 }}>Total Upfront Cost</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>{fmtMoney(results.totalUpfront)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: C.gray, marginBottom: 4 }}>Annual Management</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>{fmtMoney(results.annualMgmt)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: C.gray, marginBottom: 4 }}>Payback Period</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>{results.roiMonths} months</div>
                  </div>
                </div>
                <div style={{ padding: 16, background: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 8 }}>🍯 Bonus: Annual Honey Production</div>
                  <div style={{ fontSize: 14, color: C.gray }}>
                    Estimated {fmt(results.totalHoneyLbs)} lbs of premium Arkansas honey per year (valued at {fmtMoney(results.honeyRevenue)})
                  </div>
                </div>
              </div>

              <div style={{ background: C.white, padding: 32, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 32 }}>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 20 }}>County Information</h3>
                <div className="r-grid2">
                  <div>
                    <div style={{ fontSize: 14, color: C.gray, marginBottom: 4 }}>County Assessor</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: C.navy, marginBottom: 4 }}>{selectedCounty.assessor.name}</div>
                    <div style={{ fontSize: 14, color: C.gray }}>
                      <a href={selectedCounty.assessor.website} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: 'none' }}>{selectedCounty.assessor.website}</a>
                    </div>
                    <div style={{ fontSize: 14, color: C.gray }}>{selectedCounty.assessor.phone}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: C.gray, marginBottom: 4 }}>Requirements for {selectedCounty.name} County</div>
                    <div style={{ fontSize: 14, color: C.navy }}>
                      • Minimum {selectedCounty.minAcres} acres<br />
                      • Minimum {selectedCounty.minHives} hives<br />
                      • File by March 1 annually
                    </div>
                  </div>
                </div>
                {selectedCounty.notes && (
                  <div style={{ marginTop: 16, padding: 16, background: C.lightGray, borderRadius: 8, fontSize: 14, color: C.gray }}>
                    <strong style={{ color: C.navy }}>Note:</strong> {selectedCounty.notes}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => setStep('signup')} style={{ background: C.blue, color: C.white, fontSize: 18, fontWeight: 700, padding: '16px 40px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Get Started Now
                </button>
                <button onClick={startOver} style={{ background: C.white, color: C.navy, fontSize: 18, fontWeight: 700, padding: '16px 40px', borderRadius: 8, border: `2px solid ${C.navy}`, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Start Over
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ===== STEP 3: SIGNUP ===== */}
      {step === 'signup' && results && selectedCounty && (
        <section className="r-section" style={{ background: C.lightGray }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontSize: 42, fontWeight: 900, marginBottom: 16, ...gradientText }}>Claim Your Savings</h1>
              <p style={{ fontSize: 16, color: C.gray }}>
                Get a free consultation and detailed plan for your {results.totalAcres}-acre property in {selectedCounty.name} County
              </p>
            </div>

            <div style={{ background: C.white, padding: 40, borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 24 }}>
              <div style={{ marginBottom: 24, padding: 20, background: C.lightGray, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: C.green, marginBottom: 4 }}>{fmtMoney(results.netAnnualSavings)}</div>
                <div style={{ fontSize: 14, color: C.gray, fontWeight: 600 }}>Estimated Net Annual Savings</div>
              </div>

              <form onSubmit={handleLeadSubmit}>
                <div className="r-signup-grid" style={{ marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 6 }}>First Name</label>
                    <input required type="text" value={lead.firstName} onChange={(e) => setLead({ ...lead, firstName: e.target.value })} style={{ width: '100%', fontSize: 15, padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', color: C.navy }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 6 }}>Last Name</label>
                    <input required type="text" value={lead.lastName} onChange={(e) => setLead({ ...lead, lastName: e.target.value })} style={{ width: '100%', fontSize: 15, padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', color: C.navy }} />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 6 }}>Email</label>
                  <input required type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} style={{ width: '100%', fontSize: 15, padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', color: C.navy }} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 6 }}>Phone</label>
                  <input required type="tel" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} style={{ width: '100%', fontSize: 15, padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', color: C.navy }} />
                </div>

                <button type="submit" disabled={isSubmitting} style={{ width: '100%', background: C.blue, color: C.white, fontSize: 18, fontWeight: 700, padding: '16px 32px', borderRadius: 8, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {isSubmitting ? <><span className="spinner" /> Submitting...</> : 'Get My Free Consultation'}
                </button>

                <p style={{ fontSize: 13, color: C.gray, marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>
                  By submitting, you agree to receive calls and texts from BeeKings. No spam, ever. Unsubscribe anytime.
                </p>
              </form>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep('results')} style={{ background: 'none', border: 'none', color: C.gray, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                ← Back to Results
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===== STEP 4: THANK YOU ===== */}
      {step === 'thankyou' && (
        <section className="r-section" style={{ background: C.lightGray, minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 80, marginBottom: 24 }}>🎉</div>
            <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 16, ...gradientText }}>You're All Set!</h1>
            <p style={{ fontSize: 18, color: C.gray, marginBottom: 32, lineHeight: 1.6 }}>
              Thank you for choosing BeeKings! We'll contact you within 24 hours to schedule your free consultation and discuss your personalized plan for {selectedCounty?.name} County, Arkansas.
            </p>

            <div style={{ background: C.white, padding: 32, borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 32, textAlign: 'left' }}>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 20, textAlign: 'center' }}>What Happens Next?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: '📞', title: 'We\'ll Call You', desc: 'Our team will reach out to discuss your property and answer any questions.' },
                  { icon: '🐝', title: 'Site Visit', desc: 'We\'ll visit your property to determine optimal hive placement and finalize your custom plan.' },
                  { icon: '📋', title: 'File Application', desc: 'We prepare and submit all required documentation to your county assessor before the March 1 deadline.' },
                  { icon: '💰', title: 'Start Saving', desc: 'Once approved, you\'ll see significant tax savings on your next assessment.' },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 36, flexShrink: 0 }}>{step.icon}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{step.title}</div>
                      <div style={{ fontSize: 14, color: C.gray }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 15, color: C.gray, marginBottom: 16 }}>Have questions? Call us at <a href="tel:+19725551234" style={{ color: C.blue, fontWeight: 600, textDecoration: 'none' }}>(972) 555-1234</a></p>
              <button onClick={startOver} style={{ background: C.white, color: C.navy, fontSize: 16, fontWeight: 700, padding: '12px 32px', borderRadius: 8, border: `2px solid ${C.navy}`, cursor: 'pointer', fontFamily: 'inherit' }}>
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
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                <div>📧 info@beekings.com</div>
                <div>📞 (972) 555-1234</div>
                <div>📍 Arkansas Statewide Service</div>
              </div>
            </div>
          </div>
          <div style={{ paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            <p style={{ margin: 0 }}>© 2026 BeeKings. All rights reserved. Not legal or tax advice. Consult a professional for your specific situation.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
