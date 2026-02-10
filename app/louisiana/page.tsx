'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import parishesData from '@/data/louisiana-parishes.json';
import DeadlineCountdown from '@/app/components/DeadlineCountdown';
import StateBadge from '@/app/components/StateBadge';

interface Parish {
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

export default function LouisianaCalculator() {
  const [step, setStep] = useState<Step>('search');
  const [selectedParishName, setSelectedParishName] = useState('');
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
  const parishes = useMemo(() => parishesData as Parish[], []);

  const selectedParish = useMemo(
    () => parishes.find(p => p.name === selectedParishName) || null,
    [parishes, selectedParishName]
  );

  // Group parishes by region
  const regionGroups = useMemo(() => {
    const groups: Record<string, Parish[]> = {};
    parishes.forEach(p => {
      if (!groups[p.region]) groups[p.region] = [];
      groups[p.region].push(p);
    });
    const sorted: { region: string; parishes: Parish[] }[] = [];
    Object.keys(groups).sort().forEach(r => {
      sorted.push({ region: r, parishes: groups[r].sort((a, b) => a.name.localeCompare(b.name)) });
    });
    return sorted;
  }, [parishes]);

  const track = useCallback((event: string, data?: Record<string, unknown>) => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...data, state: 'LA' }),
    }).catch(() => {});
  }, []);

  const trackContact = useCallback((action: string, data?: Record<string, unknown>) => {
    fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId: sessionIdRef.current, state: 'LA', ...data }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    track('page_view', { referrer: document.referrer, page: 'louisiana' });
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
      const resp = await fetch(`/api/geocode?q=${encodeURIComponent(query)}&mode=suggest&state=LA`);
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

      if (geo.state && !['LA', 'Louisiana'].includes(geo.state)) {
        setSearchError(`That address is in ${geo.state}, not Louisiana. Try our Texas calculator or select another state from the homepage.`);
        setIsSearching(false);
        return;
      }

      // Louisiana uses parishes - clean up the name
      const parishClean = (geo.county || '').replace(/ Parish$/i, '').replace(/ County$/i, '').trim();
      const matchedParish = parishes.find(p => p.name.toLowerCase() === parishClean.toLowerCase());

      if (!matchedParish) {
        setSearchError(`Couldn't identify the parish for this address. Please select your parish manually below.`);
        setIsSearching(false);
        setAddressMode(false);
        return;
      }

      setGeocodedAddress(geo);
      setSelectedParishName(matchedParish.name);
      setSearchInput(geo.address.replace(/, USA$/, ''));

      if (!acres) setAcres('10');
      if (!appraisedValue) setAppraisedValue('250000');

      setStep('results');

      track('address_searched', { parish: matchedParish.name, address: geo.address, state: 'LA' });
      trackContact('search', { address: geo.address, parish: parishClean, lat: geo.lat, lng: geo.lng, referrer: document.referrer });
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
    if (!selectedParish) return null;
    const totalAcres = acres ? parseFloat(acres) : 0;
    const totalValue = appraisedValue ? parseFloat(appraisedValue) : 0;
    if (isNaN(totalAcres) || isNaN(totalValue) || totalAcres <= 0 || totalValue <= 0) return null;

    const taxRate = selectedParish.avgTaxRate / 100; // Louisiana uses percentage rates

    // Louisiana: Agricultural use value applies to qualifying acreage
    // Most parishes require minimum 5 acres for ag use
    const homesteadAcres = Math.min(1, totalAcres);
    const agEligibleAcres = Math.max(0, totalAcres - homesteadAcres);

    if (agEligibleAcres < selectedParish.minAcres) return null;

    // Estimate land vs improvement value (60% land typical for LA)
    const landPortion = 0.6;
    const landValue = totalValue * landPortion;
    const improvValue = totalValue * (1 - landPortion);

    const perAcreLand = totalAcres > 0 ? landValue / totalAcres : 0;
    const homesteadValue = improvValue + (homesteadAcres * perAcreLand);
    const agLandMarketValue = Math.max(0, totalValue - homesteadValue);

    // Current taxes
    const currentTaxes = totalValue * taxRate;

    // With ag classification (use value assessment)
    const homesteadTaxes = homesteadValue * taxRate;
    const agTaxes = agEligibleAcres * selectedParish.agProductivityValue * taxRate;
    const totalWithAg = homesteadTaxes + agTaxes;

    const annualSavings = Math.max(0, currentTaxes - totalWithAg);
    const savingsPercent = currentTaxes > 0 ? (annualSavings / currentTaxes) * 100 : 0;

    // Hive requirements
    let requiredHives = selectedParish.minHives;
    if (selectedParish.additionalHivesPer > 0 && agEligibleAcres > selectedParish.minAcres) {
      const extraAcres = agEligibleAcres - selectedParish.minAcres;
      requiredHives += Math.ceil(extraAcres / selectedParish.additionalHivesPer);
    }

    // Costs
    const hiveCost = 197;
    const nucCost = 260;
    const upfrontPerHive = hiveCost + nucCost;
    const annualMgmtPerHive = 75;
    const totalUpfront = requiredHives * upfrontPerHive;
    const annualMgmt = requiredHives * annualMgmtPerHive;

    // Louisiana honey production (warm, humid climate - good production)
    const honeyLbsPerHive = 55;
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
    if (!selectedParishName) {
      setSearchError('Please select your parish.');
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
    const minRequired = selectedParish ? selectedParish.minAcres + 1 : 6;
    if (parseFloat(acres) < minRequired) {
      setSearchError(`Your property needs at least ${selectedParish?.minAcres || 5} acres (beyond your homestead) to benefit from agricultural use valuation in ${selectedParishName} Parish.`);
      return;
    }
    track('calculator_submitted', { parish: selectedParishName, acres: parseFloat(acres), value: parseFloat(appraisedValue) });
    trackContact('search', { parish: selectedParishName, acres: parseFloat(acres), value: parseFloat(appraisedValue), referrer: document.referrer });
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
        parish: selectedParish?.name,
        state: 'LA',
        acres: acres ? parseFloat(acres) : null,
        appraisedValue: appraisedValue ? parseFloat(appraisedValue) : null,
        estimatedSavings: results?.annualSavings,
        source: 'louisiana-calculator',
      };
      await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      track('lead_captured', { parish: selectedParish?.name, savings: results?.annualSavings, state: 'LA' });
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
    setSelectedParishName('');
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
      <StateBadge stateCode="LA" stateName="Louisiana" />
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
          </div>
        </div>
      </header>

      {/* COUNTDOWN */}
      <div style={{ width: '100%' }}>
        <DeadlineCountdown
          deadlineISO="2026-04-01T23:59:59-05:00"
          timezone="America/Chicago"
          deadlineText="File by April 1 for 2026 Louisiana Agricultural Use Value Assessment"
          stateName="Louisiana"
          programName="Agricultural Use Value Assessment"
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
                Save Money on<br />Property Taxes<br /><span style={{ color: C.green }}>with Bees</span>
              </h1>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 32, fontWeight: 500 }}>
                See how much you could save with a Louisiana agricultural use value assessment
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
                {['Minimum 5 acres', 'Free instant estimate', 'All 64 LA parishes'].map(text => (
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
          {geocodedAddress && selectedParishName && (
            <section style={{ background: C.white, padding: '40px 24px' }}>
              <div style={{ maxWidth: 480, margin: '0 auto' }}>
                <div style={{ background: C.white, borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 28, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="12" fill={C.green} />
                      <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{selectedParishName} Parish, Louisiana</p>
                  </div>
                  <p style={{ fontSize: 14, color: C.gray, marginBottom: 20 }}>
                    We found your parish. Enter your property details to calculate savings:
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
                <h2 style={{ fontSize: 32, fontWeight: 800, color: C.navy, marginBottom: 8 }}>How Agricultural Use Value Works</h2>
              </div>
              <p style={{ color: C.gray, fontSize: 16, marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
                Louisiana law allows landowners using property for agriculture — including beekeeping — to have it assessed at its agricultural use value instead of market value.
              </p>
              <div className="r-grid3" style={{ gap: 48 }}>
                {[
                  { n: '1', title: 'Check your property', desc: 'Enter your parish, acreage, and current assessed value above. We\'ll estimate your savings based on your parish\'s tax rates and agricultural productivity values.' },
                  { n: '2', title: 'See your savings', desc: 'Get an instant estimate of how much you could save annually, the number of hives you\'d need, and your return on investment.' },
                  { n: '3', title: 'Get your free guide', desc: 'Download a parish-specific guide with your Parish Assessor\'s contact info, application tips, and the April 1 deadline.' },
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
                Why Louisiana Is Great for Beekeeping
              </h2>
              <p style={{ color: C.gray, fontSize: 16, textAlign: 'center', marginBottom: 48, maxWidth: 560, margin: '0 auto 48px' }}>
                Louisiana&apos;s climate and legal framework make it an excellent state for combining beekeeping with property tax savings.
              </p>
              <div className="r-grid2" style={{ gap: 20 }}>
                {[
                  { icon: '🌴', title: 'Year-Round Forage', desc: 'Louisiana\'s subtropical climate means bees stay active longer, with nectar flows from tallow trees, clover, goldenrod, and agricultural crops nearly year-round. Hives typically produce 55+ lbs of honey annually.' },
                  { icon: '📋', title: 'Straightforward Process', desc: 'File your agricultural use application with your Parish Assessor by April 1. Register your bees with LDAF (Louisiana Department of Agriculture & Forestry). Once approved, your classification typically continues annually.' },
                  { icon: '💰', title: 'Significant Tax Savings', desc: 'Louisiana assesses agricultural land at use value rather than market value — often 40-70% lower, resulting in substantial annual tax savings for parish landowners.' },
                  { icon: '🍯', title: 'Quality Honey Production', desc: 'Louisiana hives produce excellent honey from diverse sources including citrus, tallow, and wildflowers. Local raw honey sells for $20-25/lb, providing income alongside your tax savings.' },
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
                  { q: 'What is Louisiana agricultural use value assessment?', a: 'Under Louisiana law, land used for "bona fide agricultural purposes" — including beekeeping — is assessed at its agricultural use value instead of market value. This typically reduces the taxable value of the land by 40–70%, leading to significant property tax savings for Louisiana landowners. Beekeepers must register with the Louisiana Department of Agriculture and Forestry (LDAF).' },
                  { q: 'What are Louisiana\'s minimum requirements?', a: 'Requirements vary by parish, but most Louisiana parishes require a minimum of 5 acres and 5 beehives to qualify for agricultural use value assessment. Louisiana uses parishes, not counties. The application must be filed with your Parish Assessor by April 1 each year, and bees must be registered with LDAF.' },
                  { q: 'When is the application deadline?', a: 'April 1 of each year. This is later than most states (which have March 1 deadlines). First-time applicants must file a full application with their Parish Assessor. If you miss the deadline, you may still apply with a late filing, but it\'s not guaranteed to be accepted. After your first year, the classification typically continues as long as agricultural use continues.' },
                  { q: 'How many beehives do I need?', a: 'Louisiana law doesn\'t specify an exact number — it requires "bona fide agricultural use." In practice, most Parish Assessors look for at least 5 hives on minimum acreage (5 acres). Our calculator estimates the appropriate number based on your parish\'s typical requirements and your property size.' },
                  { q: 'What is LDAF registration?', a: 'The Louisiana Department of Agriculture and Forestry (LDAF) requires beekeepers to register their apiaries. This is a simple process with a small annual fee (typically $10-15 per year). LDAF registration helps demonstrate your legitimate agricultural activity to your Parish Assessor. BeeKings handles all LDAF registration paperwork for our clients.' },
                  { q: 'How much does it cost to get started with bees?', a: 'A basic hive setup runs about $197 for equipment and $260 for a nucleus colony (nuc) of bees — roughly $457 per hive. Annual maintenance (mite treatments, feed, replacement parts) averages around $75 per hive. Louisiana hives typically produce 55 lbs per year, which sells for about $20/lb locally — $1,100 in honey revenue per hive.' },
                  { q: 'Can I combine this with homestead exemption?', a: 'Yes. Agricultural use value assessment and Louisiana\'s homestead exemption are separate programs and can be combined. Your home and the surrounding acre continue to receive any applicable homestead benefits and are taxed at market rate. The agricultural use value assessment applies to your remaining qualifying acreage, reducing that land\'s taxable value.' },
                  { q: 'Do I need beekeeping experience?', a: 'No prior experience is needed. BeeKings provides hives, bees, equipment, hands-on training, ongoing support, and handles all LDAF registration. Louisiana also has excellent local beekeeping associations and the LSU AgCenter for education.' },
                  { q: 'What makes Louisiana different from other states?', a: 'Louisiana uses parishes instead of counties (64 parishes total). The application deadline is April 1, later than most states. Beekeepers must register with LDAF. Louisiana\'s subtropical climate allows nearly year-round beekeeping with excellent honey production. Louisiana Tax Commission and parish assessors handle assessments, and the state has historically lower property tax rates than neighboring states like Texas.' },
                  { q: 'How long does approval take?', a: 'If you file by April 1, your Parish Assessor will evaluate your application and typically notify you within a few months. If denied, you can appeal. Once approved, the classification typically stays in effect as long as your agricultural use continues — you don\'t need to reapply annually in most parishes, though LDAF registration must be renewed annually.' },
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
                Use the calculator above to get a free, instant estimate for your Louisiana property
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
                Louisiana Beekeeping Agricultural Use Value Guide
              </h2>
              <div style={{ fontSize: 15, color: C.gray, lineHeight: 1.8 }}>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>What is Louisiana agricultural use value assessment?</strong> Louisiana law allows
                  landowners to have their property assessed at its agricultural use value instead of market value if it&apos;s being used for
                  bona fide agricultural purposes — which explicitly includes beekeeping. This typically reduces the taxable value of the land
                  by 40–70%, resulting in substantial property tax savings for Louisiana landowners. Unlike most states, Louisiana is divided
                  into 64 parishes rather than counties, and beekeepers must register with the Louisiana Department of Agriculture and Forestry (LDAF).
                </p>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>Louisiana&apos;s parish system.</strong> Louisiana is unique in using parishes instead of
                  counties for local government. Each of Louisiana&apos;s 64 parishes has its own Parish Assessor who handles property tax
                  assessments. The application process is similar across parishes, but specific requirements and tax rates vary. Our calculator
                  covers all 64 Louisiana parishes, from Caddo and Bossier in the north to Plaquemines and St. Bernard in the south.
                </p>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>Minimum requirements.</strong> Most Louisiana parishes require a minimum of 5 acres
                  to qualify for agricultural use value assessment. You&apos;ll also need to demonstrate genuine agricultural activity — typically
                  5 beehives on minimum acreage. All beekeepers must register their apiaries with LDAF, which helps establish your legitimate
                  agricultural operation. LDAF registration is inexpensive (around $10-15 annually) and BeeKings handles all paperwork for clients.
                </p>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>Louisiana&apos;s climate advantage.</strong> Louisiana&apos;s subtropical climate allows
                  nearly year-round beekeeping with multiple nectar flows. Tallow trees bloom in spring, clover and wildflowers in summer, and
                  goldenrod in fall. Louisiana hives typically produce 55+ lbs of honey per year. At $20-25/lb for local raw honey, that&apos;s
                  meaningful income on top of your tax savings. The warm, humid climate is ideal for bees, though beekeepers must stay vigilant
                  about hive beetles and moisture management.
                </p>
                <p style={{ marginBottom: 16 }}>
                  <strong style={{ color: C.navy }}>April 1 deadline.</strong> Louisiana&apos;s application deadline is April 1 each year,
                  later than most states (which typically have March 1 deadlines). This gives Louisiana landowners an extra month to file.
                  Applications must be submitted to your Parish Assessor along with documentation of your agricultural use, including LDAF
                  apiary registration. Once approved, the classification typically auto-renews annually as long as agricultural use continues,
                  though you must maintain your LDAF registration.
                </p>
                <p>
                  <strong style={{ color: C.navy }}>All 64 Louisiana parishes.</strong> Our calculator covers every Louisiana parish, from
                  urban parishes like Orleans (New Orleans) and East Baton Rouge (Baton Rouge) to rural parishes like Cameron, Tensas, and
                  West Carroll. Each parish has its own Parish Assessor and tax rates, and we factor in your parish&apos;s specific data —
                  including the Louisiana Tax Commission&apos;s guidelines — to give you the most accurate estimate possible. Whether you&apos;re
                  in Acadiana, the Florida Parishes, Cajun Country, or North Louisiana, our calculator provides parish-specific estimates.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ===== STEP 2: RESULTS ===== */}
      {step === 'results' && selectedParish && (
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

            {/* Satellite Map */}
            {geocodedAddress && (
              <div style={{ borderRadius: '16px 16px 0 0', overflow: 'hidden', marginBottom: 0, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: 160, background: '#1a2e1a' }}>
                <img
                  src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${geocodedAddress.lng - 0.003},${geocodedAddress.lat - 0.0015},${geocodedAddress.lng + 0.003},${geocodedAddress.lat + 0.0015}&bboxSR=4326&imageSR=4326&size=800,320&format=jpg&f=image`}
                  alt="Satellite view of property"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* Parish info */}
            <div style={{ background: C.white, borderRadius: geocodedAddress ? 0 : '16px 16px 0 0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #D5EAFF', borderTop: geocodedAddress ? 'none' : '1px solid #D5EAFF' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="12" fill={C.green} />
                <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>
                  {geocodedAddress ? geocodedAddress.address.replace(/, USA$/, '') : `${selectedParish.name} Parish, Louisiana`} — {acres} acres
                </p>
                <p style={{ fontSize: 13, color: C.gray }}>
                  {geocodedAddress ? `${selectedParish.name} Parish · ` : ''}Assessed value: {fmtMoney(parseFloat(appraisedValue))} · Tax rate: {selectedParish.avgTaxRate}%
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.gray }}>Without Ag Use Value</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: C.navy }}>{fmtMoney(results.currentTaxes)}/yr</span>
                    </div>
                    <div style={{ height: 28, background: '#FEE2E2', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '100%', background: '#EF4444', borderRadius: 8 }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.gray }}>With Ag Use Value</span>
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
                    The ag use value applies to the remaining <strong>{results.agEligibleAcres.toFixed(results.agEligibleAcres % 1 ? 2 : 0)} acres</strong>.
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div style={{ textAlign: 'center', padding: '14px 8px', background: C.lightGray, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.gray, marginBottom: 4 }}>Annual Mgmt</p>
                      <p style={{ fontSize: 18, fontWeight: 900, color: C.navy }}>{fmtMoney(results.annualMgmt)}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '14px 8px', background: C.lightGray, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.gray, marginBottom: 4 }}>Honey Value</p>
                      <p style={{ fontSize: 18, fontWeight: 900, color: C.green }}>+{fmtMoney(results.honeyRevenue)}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '14px 8px', background: C.green, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(13,27,42,0.7)', marginBottom: 4 }}>ROI</p>
                      <p style={{ fontSize: 18, fontWeight: 900, color: C.navy }}>{results.roiMonths}mo</p>
                    </div>
                  </div>

                  <div style={{ padding: '14px 16px', background: '#ECFDF5', borderRadius: 12, border: '1px solid #A7F3D0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 20 }}>🍯</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#065F46' }}>Annual Honey Production</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#047857', margin: 0 }}>
                      Estimated {fmt(results.totalHoneyLbs)} lbs of premium Louisiana honey per year<br />
                      (Market value: {fmtMoney(results.honeyRevenue)} at $20/lb)
                    </p>
                  </div>
                </div>

                {/* Net Savings Card */}
                <div style={{ background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenDark} 100%)`, borderRadius: 20, padding: 28, marginBottom: 24, textAlign: 'center', color: C.white, boxShadow: '0 8px 32px rgba(212,168,67,0.3)' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.9, marginBottom: 8 }}>Net Annual Benefit</p>
                  <p style={{ fontSize: 48, fontWeight: 900, marginBottom: 12, lineHeight: 1 }}>{fmtMoney(results.netAnnualSavings)}</p>
                  <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 0 }}>
                    Tax savings ({fmtMoney(results.annualSavings)}) + Honey revenue ({fmtMoney(results.honeyRevenue)}) − Management ({fmtMoney(results.annualMgmt)})
                  </p>
                </div>

                {/* Parish Info */}
                <div style={{ background: C.white, borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 28, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 700, color: C.navy, fontSize: 17, marginBottom: 20 }}>📍 {selectedParish.name} Parish Information</h3>

                  <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Parish Assessor</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{selectedParish.assessor.name}</p>
                    <p style={{ fontSize: 14, color: C.gray, marginBottom: 2 }}>
                      <a href={selectedParish.assessor.website} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, textDecoration: 'none' }}>
                        {selectedParish.assessor.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    </p>
                    <p style={{ fontSize: 14, color: C.gray }}>{selectedParish.assessor.phone}</p>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Requirements</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                          <circle cx="12" cy="12" r="12" fill={C.green} />
                          <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 14, color: C.navy }}>Minimum {selectedParish.minAcres} acres for agricultural use</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                          <circle cx="12" cy="12" r="12" fill={C.green} />
                          <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 14, color: C.navy }}>Minimum {selectedParish.minHives} beehives required</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                          <circle cx="12" cy="12" r="12" fill={C.green} />
                          <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 14, color: C.navy }}>File with Parish Assessor by April 1</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                          <circle cx="12" cy="12" r="12" fill={C.green} />
                          <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span style={{ fontSize: 14, color: C.navy }}>LDAF (Louisiana Dept of Agriculture & Forestry) bee registration required</span>
                      </div>
                    </div>
                  </div>

                  {selectedParish.notes && (
                    <div style={{ padding: '12px 16px', background: C.lightGray, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: 13, color: C.gray, margin: 0, lineHeight: 1.5 }}>
                        <strong style={{ color: C.navy }}>Parish Note:</strong> {selectedParish.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* CTA Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  <button onClick={() => setStep('signup')} style={{
                    width: '100%', padding: '18px 32px', borderRadius: 12,
                    background: C.blue, color: C.white, fontWeight: 700, fontSize: 18,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 4px 20px rgba(26,58,107,0.3)',
                  }}>
                    Get My Free Parish Guide →
                  </button>
                  <button onClick={startOver} style={{
                    width: '100%', padding: '14px 32px', borderRadius: 12,
                    background: 'transparent', color: C.navy, fontWeight: 600, fontSize: 16,
                    border: `2px solid ${C.navy}`, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Calculate Another Property
                  </button>
                </div>

                {/* What's Next */}
                <div style={{ background: C.white, borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 16 }}>What happens next?</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { icon: '📧', text: 'Get your free parish-specific guide with filing instructions' },
                      { icon: '🐝', text: 'We install and maintain hives on your property' },
                      { icon: '📋', text: 'We handle all paperwork: Parish Assessor application + LDAF bee registration' },
                      { icon: '💰', text: 'Start saving on taxes + enjoy fresh Louisiana honey' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 24, flexShrink: 0 }}>{item.icon}</span>
                        <span style={{ fontSize: 14, color: C.gray }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ===== STEP 3: SIGNUP ===== */}
      {step === 'signup' && results && selectedParish && (
        <section className="r-section fade-in" style={{ background: C.sky }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontSize: 42, fontWeight: 900, marginBottom: 16, ...gradientText }}>Get Your Free Parish Guide</h1>
              <p style={{ fontSize: 16, color: C.gray }}>
                Receive a detailed {selectedParish.name} Parish guide with filing instructions, deadlines, and assessor contact info
              </p>
            </div>

            <div style={{ background: C.white, borderRadius: 16, padding: 32, border: '1px solid #e2e8f0', marginBottom: 24 }}>
              <div style={{ padding: 16, background: C.lightGray, borderRadius: 12, marginBottom: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: C.gray, marginBottom: 4 }}>Estimated Annual Savings</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: C.green, marginBottom: 0 }}>{fmtMoney(results.netAnnualSavings)}</p>
                <p style={{ fontSize: 13, color: C.gray, marginTop: 4 }}>{selectedParish.name} Parish · {acres} acres</p>
              </div>

              <form onSubmit={handleLeadSubmit}>
                <div className="r-signup-grid" style={{ marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>First Name</label>
                    <input required type="text" value={lead.firstName} onChange={(e) => setLead({ ...lead, firstName: e.target.value })}
                      style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', color: C.navy }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Last Name</label>
                    <input required type="text" value={lead.lastName} onChange={(e) => setLead({ ...lead, lastName: e.target.value })}
                      style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', color: C.navy }} />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Email</label>
                  <input required type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', color: C.navy }} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 6 }}>Phone</label>
                  <input required type="tel" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', color: C.navy }} />
                </div>

                <button type="submit" disabled={isSubmitting} style={{
                  width: '100%', padding: '16px 32px', borderRadius: 12,
                  background: C.blue, color: C.white, fontWeight: 700, fontSize: 18,
                  border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 20px rgba(26,58,107,0.3)',
                }}>
                  {isSubmitting ? <><span className="spinner" /> Sending...</> : 'Download My Parish Guide'}
                </button>

                <p style={{ fontSize: 12, color: C.gray, textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
                  We respect your privacy. No spam, ever. Unsubscribe anytime.
                </p>
              </form>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep('results')} style={{
                background: 'transparent', border: 'none', color: C.gray,
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                textDecoration: 'underline',
              }}>
                ← Back to Results
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===== STEP 4: THANK YOU ===== */}
      {step === 'thankyou' && (
        <section className="r-section fade-in" style={{ background: C.sky, minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 80, marginBottom: 24 }}>🎉</div>
            <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 16, ...gradientText }}>Check Your Email!</h1>
            <p style={{ fontSize: 18, color: C.gray, marginBottom: 32, lineHeight: 1.6 }}>
              Your personalized {selectedParish?.name} Parish guide is on its way. We&apos;ll also reach out within 24 hours to discuss your property and next steps.
            </p>

            <div style={{ background: C.white, borderRadius: 16, padding: 32, border: '1px solid #e2e8f0', marginBottom: 32, textAlign: 'left' }}>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: C.navy, marginBottom: 20, textAlign: 'center' }}>What Happens Next?</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: '📧', title: 'Check Your Inbox', desc: 'Your parish-specific guide includes Parish Assessor contact info, deadlines, and LDAF registration details.' },
                  { icon: '📞', title: 'We\'ll Call You', desc: 'Our team will reach out to answer questions and discuss your property specifics.' },
                  { icon: '🐝', title: 'Site Visit & Setup', desc: 'We\'ll visit your property to plan hive placement and handle all LDAF paperwork.' },
                  { icon: '📄', title: 'File Applications', desc: 'We prepare and submit documentation to your Parish Assessor and LDAF before the April 1 deadline.' },
                  { icon: '💰', title: 'Start Saving', desc: 'Once approved, enjoy significant tax savings and delicious Louisiana honey.' },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 36, flexShrink: 0 }}>{step.icon}</div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{step.title}</div>
                      <div style={{ fontSize: 14, color: C.gray, lineHeight: 1.5 }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 15, color: C.gray, marginBottom: 16 }}>
                Questions? Call us at <a href="tel:+19725551234" style={{ color: C.blue, fontWeight: 600, textDecoration: 'none' }}>(972) 555-1234</a>
              </p>
              <button onClick={startOver} style={{
                background: C.white, color: C.navy, fontSize: 16, fontWeight: 700,
                padding: '12px 32px', borderRadius: 12, border: `2px solid ${C.navy}`,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
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
                BeeKings helps Louisiana landowners reduce property taxes through agricultural use value assessment with professional beekeeping services.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Resources</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="#how-it-works" style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>How It Works</a>
                <a href="#faq" style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>FAQ</a>
                <a href="https://beekings.com" style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>BeeKings.com</a>
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Contact</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a href="mailto:info@beekings.com" style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>info@beekings.com</a>
                <a href="tel:+19725551234" style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>(972) 555-1234</a>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              © 2026 BeeKings. All rights reserved.
            </p>
            <div style={{ display: 'flex', gap: 24 }}>
              <a href="/privacy" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Privacy Policy</a>
              <a href="/terms" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
