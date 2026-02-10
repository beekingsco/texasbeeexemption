'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import countiesData from '@/data/texas-counties.json';
import DeadlineCountdown from '@/app/components/DeadlineCountdown';

interface County {
  name: string;
  region: string;
  cad: { name: string; website: string; phone: string; cadSearchUrl?: string };
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

interface ParcelData {
  found: boolean;
  propertyId?: string;
  ownerName?: string;
  legalArea?: number;
  gisArea?: number;
  legalDesc?: string;
  landValue?: number;
  improvementValue?: number;
  marketValue?: number;
  situsAddress?: string;
  county?: string;
  taxYear?: number;
  yearBuilt?: string;
  source?: string;
  error?: string;
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

export default function Home() {
  const [step, setStep] = useState<Step>('search');
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingParcel, setIsLoadingParcel] = useState(false);
  const [geocodedAddress, setGeocodedAddress] = useState<GeocodedAddress | null>(null);
  const [parcelData, setParcelData] = useState<ParcelData | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<County | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [acres, setAcres] = useState('');
  const [appraisedValue, setAppraisedValue] = useState('');
  const [lead, setLead] = useState<LeadData>({ firstName: '', lastName: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [agentRef, setAgentRef] = useState<string | null>(null);
  const [agentLogo, setAgentLogo] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const resultsTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>(`s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const counties = useMemo(() => countiesData as County[], []);

  // Simple analytics tracking
  const track = useCallback((event: string, data?: Record<string, unknown>) => {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...data }),
    }).catch(() => {});
  }, []);

  const trackContact = useCallback((action: string, data?: Record<string, unknown>) => {
    fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId: sessionIdRef.current, ...data }),
    }).catch(() => {});
  }, []);

  // Track page view on mount + capture agent ref
  useEffect(() => {
    track('page_view', { referrer: document.referrer });

    // Capture agent referral from URL params
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const logo = params.get('agentLogo');
    const name = params.get('agentName');

    if (ref) {
      sessionStorage.setItem('bee_agent_ref', ref);
      setAgentRef(ref);
      if (logo) {
        sessionStorage.setItem('bee_agent_logo', logo);
        setAgentLogo(logo);
      }
      if (name) {
        sessionStorage.setItem('bee_agent_name', name);
        setAgentName(name);
      }
    } else {
      // Check sessionStorage for existing ref
      const storedRef = sessionStorage.getItem('bee_agent_ref');
      if (storedRef) setAgentRef(storedRef);
      const storedLogo = sessionStorage.getItem('bee_agent_logo');
      if (storedLogo) setAgentLogo(storedLogo);
      const storedName = sessionStorage.getItem('bee_agent_name');
      if (storedName) setAgentName(storedName);
    }
  }, [track]);

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
      const resp = await fetch(`/api/geocode?q=${encodeURIComponent(query)}&mode=suggest`);
      const data = await resp.json();
      if (data.suggestions?.length > 0) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    } catch { setSuggestions([]); }
  }, []);

  const handleInputChange = (value: string) => {
    setSearchInput(value);
    setSearchError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  // Full pipeline: geocode → find county → fetch parcel data → show results
  const processAddress = async (addressText: string, magicKey?: string) => {
    setIsSearching(true);
    setSearchError('');
    setShowSuggestions(false);
    setSearchInput(addressText.replace(/, USA$/, ''));

    try {
      // Step 1: Geocode to get lat/lng and county
      const geoUrl = `/api/geocode?q=${encodeURIComponent(addressText)}&mode=geocode${magicKey ? `&magicKey=${encodeURIComponent(magicKey)}` : ''}`;
      const geoResp = await fetch(geoUrl);
      const geoData = await geoResp.json();

      if (!geoData.results?.length) {
        setSearchError('We couldn\'t verify that address. Try entering your full street address (e.g. "123 Main St, Canton, TX 75103").');
        setIsSearching(false);
        return;
      }

      const geo: GeocodedAddress = geoData.results[0];

      // Check it's Texas
      if (geo.state && !['TX', 'Texas'].includes(geo.state)) {
        setSearchError('We currently only cover Texas properties. More states coming soon!');
        setIsSearching(false);
        return;
      }

      // Match county
      const countyClean = (geo.county || '').replace(/ County$/i, '').trim();
      const matchedCounty = counties.find(c => c.name.toLowerCase() === countyClean.toLowerCase());
      
      if (!matchedCounty) {
        setSearchError(`Couldn't identify the county for this address. Please try a more specific address.`);
        setIsSearching(false);
        return;
      }

      setGeocodedAddress(geo);
      setSelectedCounty(matchedCounty);
      setSearchInput(geo.address.replace(/, USA$/, ''));
      setIsSearching(false);
      setIsLoadingParcel(true);
      setStep('results');
      track('address_searched', { county: matchedCounty.name, address: geo.address });
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Step 2: Fetch parcel data from TNRIS using coordinates
      try {
        const parcelResp = await fetch(`/api/parcel?lat=${geo.lat}&lng=${geo.lng}`);
        const parcel: ParcelData = await parcelResp.json();
        setParcelData(parcel.found ? parcel : null);
        
        // Auto-fill acres and appraised value from parcel data
        if (parcel.found) {
          if (parcel.legalArea && parcel.legalArea > 0) {
            setAcres(parcel.legalArea.toString());
          }
          if (parcel.marketValue && parcel.marketValue > 0) {
            setAppraisedValue(parcel.marketValue.toString());
          }
        }
        // Save contact to spreadsheet
        trackContact('search', {
          address: geo.address,
          county: countyClean,
          lat: geo.lat,
          lng: geo.lng,
          ownerName: parcel.found ? parcel.ownerName || '' : '',
          acres: parcel.found ? parcel.legalArea : null,
          marketValue: parcel.found ? parcel.marketValue : null,
          landValue: parcel.found ? parcel.landValue : null,
          improvementValue: parcel.found ? parcel.improvementValue : null,
          referrer: document.referrer,
        });
      } catch {
        setParcelData(null);
      } finally {
        setIsLoadingParcel(false);
        track('results_viewed', { county: matchedCounty.name });
        resultsTimeRef.current = Date.now();
      }

      // Track contact for every search — use parcel data already fetched above
    } catch {
      setSearchError('Something went wrong. Please try again.');
      setIsSearching(false);
    }
  };

  const handleSuggestionSelect = (s: Suggestion) => {
    setShowSuggestions(false);
    processAddress(s.text, s.magicKey);
  };

  const handleSearch = () => {
    if (searchInput.trim()) processAddress(searchInput);
  };

  // Calculation — properly excludes homestead (1 acre + structure) from ag exemption
  const getDefaultPropertyValue = (county: County): number => {
    return ['Dallas-Fort Worth', 'Houston', 'Austin', 'San Antonio'].includes(county.region) ? 300000 : 180000;
  };

  const calculateResults = () => {
    if (!selectedCounty) return null;
    const hasParcelAcres = !!(parcelData?.found && parcelData?.legalArea && parcelData.legalArea > 0);
    const hasParcelValue = !!(parcelData?.found && parcelData?.marketValue && parcelData.marketValue > 0);
    const totalAcres = acres ? parseFloat(acres) : (hasParcelAcres ? parcelData!.legalArea! : 0);
    const totalValue = appraisedValue ? parseFloat(appraisedValue) : (hasParcelValue ? parcelData!.marketValue! : getDefaultPropertyValue(selectedCounty));
    if (isNaN(totalAcres) || isNaN(totalValue) || totalValue <= 0) return null;

    const taxRate = selectedCounty.avgTaxRate / 100;
    const improvValue = parcelData?.improvementValue || 0;
    const landValue = parcelData?.landValue || (totalValue - improvValue);
    const hasHomestead = improvValue > 0 || totalAcres > 2; // assume homestead if improvements exist

    // Homestead: up to 1 acre + structure stays taxed at market rate (can't get ag on that)
    const homesteadAcres = hasHomestead ? Math.min(1, totalAcres) : 0;
    const agEligibleAcres = Math.max(0, totalAcres - homesteadAcres);

    // If total property is under the minimum + homestead, it simply doesn't qualify
    if (totalAcres > 0 && totalAcres < selectedCounty.minAcres + homesteadAcres) {
      // Still calculate so we can show the message, but savings will be 0
    }

    // Value of the homestead portion (structure + 1 acre of land)
    const perAcreLand = totalAcres > 0 ? landValue / totalAcres : 0;
    const homesteadValue = improvValue + (homesteadAcres * perAcreLand);
    const agLandMarketValue = Math.max(0, totalValue - homesteadValue);

    // Current taxes: full market value on everything
    const currentTaxes = totalValue * taxRate;

    // With ag exemption:
    // - Homestead portion still taxed at market rate
    // - Ag-eligible land taxed at productivity value (very low)
    const homesteadTaxes = homesteadValue * taxRate;
    const agTaxes = agEligibleAcres * selectedCounty.agProductivityValue * taxRate;
    const totalWithAg = homesteadTaxes + agTaxes;

    const annualSavings = Math.max(0, currentTaxes - totalWithAg);
    const savingsPercent = currentTaxes > 0 ? (annualSavings / currentTaxes) * 100 : 0;

    // Check if property qualifies
    const qualifies = agEligibleAcres >= selectedCounty.minAcres;

    // Hive requirements based on ag-eligible acres
    let requiredHives = selectedCounty.minHives;
    if (agEligibleAcres > selectedCounty.minAcres) {
      requiredHives += Math.ceil((agEligibleAcres - selectedCounty.minAcres) / selectedCounty.additionalHivesPer);
    }

    // Investment costs
    const hiveCost = 197;
    const nucCost = 260;
    const upfrontPerHive = hiveCost + nucCost; // $457 per hive setup
    const annualMgmtPerHive = 75; // annual maintenance: mite treatments ~$25, sugar/feed ~$25, replacement parts ~$25
    const totalUpfront = requiredHives * upfrontPerHive;
    const annualMgmt = requiredHives * annualMgmtPerHive;
    const honeyLbsPerHive = 30; // conservative Texas estimate (range: 30-60 lbs)
    const honeyPricePerLb = 20; // local raw honey, 1 lb jar
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
      hasHomestead,
      totalUpfront,
      annualMgmt,
      netAnnualSavings,
      roiMonths,
      hiveCost,
      nucCost,
      honeyLbsPerHive,
      totalHoneyLbs,
      honeyRevenue,
      qualifies,
    };
  };

  const results = calculateResults();

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...lead,
        address: geocodedAddress?.address || searchInput,
        county: selectedCounty?.name,
        lat: geocodedAddress?.lat,
        lng: geocodedAddress?.lng,
        acres: acres ? parseFloat(acres) : parcelData?.legalArea,
        appraisedValue: appraisedValue ? parseFloat(appraisedValue) : parcelData?.marketValue,
        estimatedSavings: results?.annualSavings,
        parcelData: parcelData?.found ? {
          propertyId: parcelData.propertyId,
          ownerName: parcelData.ownerName,
          marketValue: parcelData.marketValue,
          legalArea: parcelData.legalArea,
          landValue: parcelData.landValue,
          improvementValue: parcelData.improvementValue,
        } : null,
        source: 'calculator',
        agentRef: agentRef || undefined,
      };
      await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      // If agent ref, also create a lead for the agent
      if (agentRef) {
        fetch('/api/agent/ref-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agentRef,
            propertyAddress: geocodedAddress?.address || searchInput,
            county: selectedCounty?.name,
            ownerName: `${lead.firstName} ${lead.lastName}`.trim(),
            acres: acres ? parseFloat(acres) : parcelData?.legalArea || 0,
            appraisedValue: appraisedValue ? parseFloat(appraisedValue) : parcelData?.marketValue || 0,
            estimatedSavings: results?.annualSavings || 0,
          }),
        }).catch(() => {});
      }
      // Send guide email
      fetch('/api/send-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          firstName: lead.firstName,
          county: selectedCounty?.name,
          estimatedSavings: results?.annualSavings,
          acres: acres ? parseFloat(acres) : parcelData?.legalArea,
          requiredHives: results?.requiredHives,
        }),
      }).catch(() => {});
      track('lead_captured', { county: selectedCounty?.name, savings: results?.annualSavings });
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
    setStep('search'); setSearchInput(''); setGeocodedAddress(null); setParcelData(null);
    setSelectedCounty(null); setSuggestions([]); setAcres(''); setAppraisedValue('');
    setSearchError(''); setShowCustomize(false);
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
        .r-stat-num { font-size: 64px; }
        .r-big-num { font-size: 96px; }
        .r-result-num { font-size: 80px; }
        .r-pill { flex-direction: row; border-radius: 100px; padding: 6px 6px 6px 20px; }
        .r-pill-btn { white-space: nowrap; border-radius: 100px; padding: 14px 28px; font-size: 16px; }
        .r-footer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
        .r-section { padding: 80px 24px; }
        .r-vprops { display: flex; justify-content: center; gap: 24px; flex-wrap: wrap; }
        .r-signup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .r-prop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes wiggle { 0%, 100% { transform: rotate(0deg); } 15% { transform: rotate(-2deg); } 30% { transform: rotate(2deg); } 45% { transform: rotate(-1.5deg); } 60% { transform: rotate(1deg); } 75% { transform: rotate(-0.5deg); } }
        .cta-wiggle { animation: wiggle 2.5s ease-in-out infinite; animation-delay: 3s; }
        .cta-wiggle:hover { animation: none; transform: scale(1.02); transition: transform 0.15s ease; }
        .cta-green { display: block; width: 100%; text-align: center; margin-top: 20px; background: linear-gradient(135deg, #22883e, #2da44e); color: #fff; font-weight: 700; font-size: 17px; padding: 18px 24px; border-radius: 14px; border: none; cursor: pointer; font-family: inherit; text-decoration: none; box-shadow: 0 4px 16px rgba(34,136,62,0.35); box-sizing: border-box; }
        .cta-green span { display: block; font-size: 12px; font-weight: 400; opacity: 0.85; margin-top: 4px; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        .spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
        .skeleton { background: linear-gradient(90deg, #e2e8f0 25%, #edf2f7 50%, #e2e8f0 75%); background-size: 200% 100%; animation: pulse 1.5s ease-in-out infinite; border-radius: 8px; }
        @media (max-width: 768px) {
          .r-grid3 { grid-template-columns: 1fr; gap: 24px; }
          .r-grid2 { grid-template-columns: 1fr; }
          .r-nav { display: none; }
          .r-hero-h1 { font-size: 40px; }
          .r-stat-num { font-size: 40px; }
          .r-big-num { font-size: 48px; }
          .r-result-num { font-size: 48px; }
          .r-pill { flex-direction: column; border-radius: 16px; padding: 16px; }
          .r-pill-btn { border-radius: 12px; padding: 16px; font-size: 16px; width: 100%; }
          .r-footer-grid { grid-template-columns: 1fr; gap: 32px; }
          .r-section { padding: 48px 16px; }
          .r-vprops { flex-direction: column; align-items: center; gap: 12px; }
          .r-signup-grid { grid-template-columns: 1fr; }
          .r-prop-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* HEADER */}
      <header style={{ background: C.white, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: US flag + back arrow */}
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: C.navy }}>
            <span style={{ fontSize: 18 }}>◀</span>
            <span style={{ fontSize: 24 }}>🇺🇸</span>
          </a>
          {/* Center: BeeKings logo */}
          <a href="/" onClick={(e) => { e.preventDefault(); startOver(); }} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
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
            <img src="/texas-bees-badge.jpg" alt="Texas Bees Save You Money" style={{ height: 48, borderRadius: 8 }} />
          </div>
        </div>
      </header>

      {/* COUNTDOWN BANNER */}
      <div style={{ width: '100%' }}>
        <DeadlineCountdown
          deadlineISO="2026-04-30T23:59:59-05:00"
          timezone="America/Chicago"
          deadlineText="File by April 30 for 2026 Texas Ag Exemption"
          stateName="Texas"
          programName="Ag Exemption"
        />
      </div>

      {/* ===== STEP 1: SEARCH ===== */}
      {step === 'search' && (
        <>
          <section style={{ background: C.sky, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, background: C.green }} />
            <svg style={{ position: 'absolute', bottom: 172, left: 0, right: 0, width: '100%' }} height="40" viewBox="0 0 1200 40" preserveAspectRatio="none">
              <path d="M0,40 C150,5 350,30 500,12 C650,-5 800,25 950,8 C1050,0 1150,18 1200,5 L1200,40 Z" fill={C.green} />
            </svg>
            {/* Hero illustration */}
            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 5, width: '100%', maxWidth: 600, pointerEvents: 'none' }}>
              <img src="/hero-beekeeper.png" alt="Beekeeper illustration" style={{ width: '100%', display: 'block', objectFit: 'contain' }} />
            </div>
            <div style={{ position: 'relative', zIndex: 10, maxWidth: 800, margin: '0 auto', padding: '24px 24px 280px', textAlign: 'center' }}>
              <h1 className="r-hero-h1" style={{ fontWeight: 900, color: C.navy, lineHeight: 1.05, marginBottom: 16, letterSpacing: '-0.03em', maxWidth: '100%' }}>
                Save Money on<br />Property Taxes<br /><span style={{ color: C.blue }}>with Bees</span> 🐝
              </h1>
              <p style={{ fontSize: 16, color: '#5A7A8A', marginBottom: 32, fontWeight: 500 }}>
                See how much you could save with a Texas bee exemption
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
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && searchInput.trim()) handleSearch(); }}
                    placeholder="Enter your address"
                    style={{ flex: 1, fontSize: 16, fontWeight: 500, color: C.navy, border: 'none', outline: 'none', background: 'transparent', padding: '14px 0', fontFamily: 'inherit', minWidth: 0 }}
                  />
                  </div>
                  <button onClick={handleSearch} disabled={!searchInput.trim() || isSearching} className="r-pill-btn" style={{
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

              <p style={{ fontSize: 13, color: '#8DA4B5', marginTop: 12, fontWeight: 500 }}>
                Instant estimate — no phone calls, no spam
              </p>

              <div className="r-vprops" style={{ marginTop: 16 }}>
                {['Real property data', 'Free instant estimate', 'All 254 TX counties'].map(text => (
                  <span key={text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: C.navy }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="12" fill={C.blue} opacity={0.15} />
                      <path d="M7 12l3 3 7-7" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="r-section" style={{ background: C.white, textAlign: 'center' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: C.navy, lineHeight: 1.2, marginBottom: 60 }}>
                Trusted By More Texas Landowners<br />Than Anyone Else
              </h2>
              <div className="r-grid3" style={{ marginBottom: 48 }}>
                {[
                  { num: '95%', label: 'Success Rate' },
                  { num: '$5,247', label: 'Avg Annual Savings' },
                  { num: '254', label: 'Texas Counties' },
                ].map(s => (
                  <div key={s.num}>
                    <div className="r-stat-num" style={{ ...gradientText, fontWeight: 900, lineHeight: 1 }}>{s.num}</div>
                    <div style={{ fontSize: 16, color: C.gray, marginTop: 8, fontWeight: 500 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Big number */}
          <section className="r-section" style={{ background: C.sky, textAlign: 'center' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <div className="r-big-num" style={{ ...gradientText, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>$2,500,000+</div>
              <p style={{ fontSize: 18, color: C.gray, marginTop: 16, fontWeight: 500 }}>Total estimated savings for Texas landowners</p>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="r-section" style={{ background: C.white, textAlign: 'center' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: C.navy, marginBottom: 8 }}>How It Works</h2>
              <p style={{ color: C.gray, fontSize: 16, marginBottom: 60 }}>Get your estimate in less than <strong style={{ color: C.navy }}>60 seconds</strong></p>
              <div className="r-grid3" style={{ gap: 48 }}>
                {[
                  { n: '1', title: 'Enter your address', desc: 'We verify your property and pull real tax data from your county appraisal district.' },
                  { n: '2', title: 'See your savings', desc: 'Get an instant estimate based on your actual property value and acreage.' },
                  { n: '3', title: 'Get your guide', desc: 'Download your county\'s ag exemption guide with step-by-step filing instructions.' },
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

          {/* Testimonials */}
          <section className="r-section" style={{ background: C.sky, textAlign: 'center' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: C.navy, marginBottom: 8 }}>What Texas Landowners Are Saying</h2>
              <p style={{ color: C.gray, fontSize: 16, marginBottom: 48 }}>Real savings from real property owners across Texas</p>
              <div className="r-grid3" style={{ gap: 24 }}>
                {[
                  { quote: "I had no idea beekeeping could save me this much on taxes. BeeKings walked me through the entire process — from getting the hives set up to filing with the county. Saving over $4,000 a year now.", name: 'Sarah M.', loc: 'Van Zandt County', savings: '$4,200/yr' },
                  { quote: "We bought 12 acres outside of Dallas and the taxes were killing us. Got set up with 6 hives through BeeKings and our tax bill dropped by more than 80%. Best investment we\'ve made on the property.", name: 'James & Lisa T.', loc: 'Kaufman County', savings: '$6,800/yr' },
                  { quote: "Honestly didn\'t think my 5 acres would qualify, but it did. The bees basically take care of themselves and I\'m saving almost $3,000 a year. Plus we get honey! Win-win.", name: 'Mark R.', loc: 'Henderson County', savings: '$2,950/yr' },
                ].map((t, i) => (
                  <div key={i} style={{ background: C.white, borderRadius: 16, padding: 28, textAlign: 'left', border: '1px solid #D5EAFF', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="18" height="18" viewBox="0 0 24 24" fill="#FBBF24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <p style={{ fontSize: 15, color: C.navy, lineHeight: 1.7, flex: 1, marginBottom: 16 }}>&ldquo;{t.quote}&rdquo;</p>
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 700, color: C.navy, fontSize: 15 }}>{t.name}</p>
                        <p style={{ fontSize: 13, color: C.gray }}>{t.loc}</p>
                      </div>
                      <div style={{ background: '#FFF8EE', padding: '4px 10px', borderRadius: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: C.greenDark }}>Saving {t.savings}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="r-section" style={{ background: C.white, textAlign: 'center' }}>
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: C.navy, marginBottom: 48 }}>Frequently Asked Questions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { q: 'Is this really legal?', a: 'Absolutely. Texas Tax Code Chapter 23, Subchapter D explicitly recognizes beekeeping as qualifying agricultural use. The Texas Comptroller has specific guidelines for beekeeping ag valuations, and thousands of Texas landowners use this every year.' },
                  { q: 'How many acres do I need?', a: 'Most Texas counties require between 5 and 20 acres for a beekeeping ag exemption. Some counties accept as few as 5 acres. Our calculator automatically checks your county\'s specific requirements.' },
                  { q: 'How much work is involved?', a: 'Italian honeybees are gentle and low-maintenance. Most beekeepers spend 15-30 minutes per hive per month during active season. We provide complete training and ongoing support to make it easy.' },
                  { q: 'How soon can I qualify?', a: 'If your land already has agricultural history, you may qualify the same tax year. For new agricultural use, Texas requires 5 of 7 years of qualifying ag use. The sooner you start, the sooner you save — and your savings compound every year.' },
                  { q: 'What about property with a house?', a: 'Your home and the surrounding 1-2 acres (your homestead) remain taxed at market value. The ag exemption applies to your remaining qualifying acreage. Our calculator automatically separates these when estimating your savings.' },
                  { q: 'Do I need beekeeping experience?', a: 'Not at all! BeeKings provides everything you need: hives, bees, equipment, hands-on training, and ongoing support. Many of our most successful customers started with zero experience.' },
                  { q: 'What does "ag exemption" actually mean?', a: 'It\'s technically an agricultural appraisal (1-d-1), not an exemption. Your land is appraised at its productivity value (what it produces agriculturally) instead of market value. For most properties, this reduces the taxable land value by 90-98%.' },
                ].map(faq => (
                  <details key={faq.q} style={{ background: C.lightGray, borderRadius: 12, textAlign: 'left', border: '1px solid #e2e8f0' }}>
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
              <h2 style={{ fontSize: 36, fontWeight: 800, color: C.white, lineHeight: 1.2, marginBottom: 12 }}>
                Stop Overpaying on<br />Property Taxes
              </h2>
              <p style={{ color: '#8DA4B5', fontSize: 16, marginBottom: 32 }}>
                Join thousands of Texas landowners saving money with a beekeeping ag exemption
              </p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: C.green, color: C.navy, fontWeight: 700, fontSize: 18, padding: '16px 40px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(212,168,67,0.4)' }}>
                Get My Free Savings Estimate →
              </button>
              <p style={{ color: '#5A7A8A', fontSize: 13, marginTop: 12 }}>Free • Instant • No spam</p>
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
              {['Address', 'Savings', 'Guide'].map((label, i) => (
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

            {/* Verified address */}
            <div style={{ background: C.white, borderRadius: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0, border: '1px solid #D5EAFF', borderTop: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="12" fill={C.green} />
                <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{geocodedAddress?.address?.replace(/, USA$/, '') || searchInput}</p>
                <p style={{ fontSize: 13, color: C.gray }}>{selectedCounty.name} County, Texas</p>
              </div>
              <button onClick={startOver} style={{ fontSize: 13, fontWeight: 600, color: C.blue, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Change</button>
            </div>

            {/* Not Qualified or Missing Data Message */}
            {results && !results.qualifies && (
              <div style={{ background: C.white, borderRadius: '0 0 16px 16px', padding: '32px 24px', textAlign: 'center', marginBottom: 24, border: '1px solid #D5EAFF', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🐝</div>
                {results.totalAcres === 0 ? (
                  <>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 12 }}>We Couldn&apos;t Find Your Property Size</h2>
                    <p style={{ fontSize: 15, color: C.gray, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 20px' }}>
                      We verified your address but couldn&apos;t pull acreage data from county records. 
                      Enter your property size below to see your savings estimate.
                    </p>
                    <div style={{ maxWidth: 300, margin: '0 auto 20px' }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 6, textAlign: 'left' }}>How many acres is your property?</label>
                      <input type="number" value={acres} onChange={(e) => setAcres(e.target.value)} placeholder={`Min. ${selectedCounty?.minAcres} acres needed`}
                        style={{ width: '100%', padding: '14px 16px', border: '2px solid #D5EAFF', borderRadius: 10, fontSize: 18, fontWeight: 600, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
                    </div>
                  </>
                ) : (
                  <>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 12 }}>Not Enough Land to Qualify</h2>
                    <p style={{ fontSize: 15, color: C.gray, lineHeight: 1.6, maxWidth: 420, margin: '0 auto 20px' }}>
                      {results.totalAcres <= 1 ? (
                        <>Your property is only <strong style={{ color: C.navy }}>{results.totalAcres < 1 ? 'under 1 acre' : '1 acre'}</strong> — you&apos;d need at least <strong style={{ color: C.navy }}>{selectedCounty?.minAcres} acres</strong> (plus your homestead) to qualify for a beekeeping ag exemption in {selectedCounty?.name} County.</>
                      ) : (
                        <>Your property has <strong style={{ color: C.navy }}>{results.agEligibleAcres.toFixed(1)} ag-eligible acres</strong>, but {selectedCounty?.name} County requires at least <strong style={{ color: C.navy }}>{selectedCounty?.minAcres} acres</strong> beyond your 1-acre homestead to qualify.</>
                      )}
                    </p>
                    <p style={{ fontSize: 13, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 16px', maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.5 }}>
                      💡 Our data may not be 100% accurate — if you know your actual acreage, use the form below to get a better estimate.
                    </p>
                    <div style={{ maxWidth: 300, margin: '0 auto 16px' }}>
                      <input type="number" value={acres} onChange={(e) => setAcres(e.target.value)} placeholder="Enter your actual acres"
                        style={{ width: '100%', padding: '14px 16px', border: '2px solid #D5EAFF', borderRadius: 10, fontSize: 18, fontWeight: 600, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
                    </div>
                    <p style={{ fontSize: 14, color: C.gray, marginBottom: 16 }}>
                      Or try a different address:
                    </p>
                    <button onClick={startOver} style={{ background: C.blue, color: C.white, fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Search Another Property →
                    </button>
                  </>
                )}
              </div>
            )}
            {results && results.qualifies && (
              <div style={{ background: C.white, borderRadius: '0 0 16px 16px', padding: '24px 20px', textAlign: 'center', marginBottom: 24, border: '1px solid #D5EAFF', borderTop: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Estimated Annual Savings</p>
                <div className="r-result-num" style={{ ...gradientText, fontWeight: 900, lineHeight: 1 }}>
                  {fmtMoney(results.annualSavings)}
                </div>
                <p style={{ fontSize: 15, color: C.gray, marginTop: 8 }}>per year on property taxes</p>
                <button onClick={() => { setStep('signup'); track('cta_savings_top', { county: selectedCounty.name, savings: results?.annualSavings }); trackContact('engage', { event: 'started_signup' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="cta-wiggle cta-green">
                  📋 Get Your Free {selectedCounty.name} County Guide
                  <span>Step-by-step filing instructions, deadlines & requirements</span>
                </button>
              </div>
            )}

            {/* Property Details from TNRIS */}
            {isLoadingParcel && (
              <div style={{ background: C.white, borderRadius: 16, padding: 24, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 16 }}>Loading property data...</p>
                <div className="r-prop-grid">
                  {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
                </div>
              </div>
            )}

            {parcelData?.found && !isLoadingParcel && (
              <div style={{ background: C.white, borderRadius: 16, padding: 24, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>📋 Property Details</span>
                  <span style={{ fontSize: 12, color: C.gray, background: C.sky, padding: '2px 8px', borderRadius: 6 }}>
                    {parcelData.source || `${selectedCounty.name} County`} · {parcelData.taxYear || 'Current'}
                  </span>
                </div>
                <div className="r-prop-grid">
                  {parcelData.ownerName && (
                    <div style={{ padding: '10px 14px', background: C.lightGray, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5 }}>Owner</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginTop: 2 }}>{parcelData.ownerName}</p>
                    </div>
                  )}
                  {parcelData.marketValue !== undefined && parcelData.marketValue > 0 && (
                    <div style={{ padding: '10px 14px', background: C.lightGray, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5 }}>Appraised Value</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginTop: 2 }}>{fmtMoney(parcelData.marketValue)}</p>
                    </div>
                  )}
                  {parcelData.legalArea !== undefined && parcelData.legalArea > 0 && (
                    <div style={{ padding: '10px 14px', background: C.lightGray, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5 }}>Acreage</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginTop: 2 }}>{parcelData.legalArea.toFixed(2)} acres</p>
                    </div>
                  )}
                  {parcelData.landValue !== undefined && parcelData.landValue > 0 && (
                    <div style={{ padding: '10px 14px', background: C.lightGray, borderRadius: 10 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5 }}>Land Value</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginTop: 2 }}>{fmtMoney(parcelData.landValue)}</p>
                    </div>
                  )}
                </div>
                {parcelData.legalDesc && (
                  <p style={{ fontSize: 12, color: C.gray, marginTop: 12, fontStyle: 'italic' }}>Legal: {parcelData.legalDesc}</p>
                )}
              </div>
            )}

            {/* Details — only show when property qualifies */}
            {results && results.qualifies && (
              <>
                {/* Visual Tax Comparison */}
                <div style={{ background: C.white, borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 32, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 700, color: C.navy, fontSize: 17, marginBottom: 24 }}>Tax Comparison</h3>

                  {/* Bar chart comparison */}
                  <div style={{ marginBottom: 24 }}>
                    {/* Current taxes bar */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.gray }}>Without Ag Exemption</span>
                        <span style={{ fontSize: 16, fontWeight: 900, color: C.navy }}>{fmtMoney(results.currentTaxes)}/yr</span>
                      </div>
                      <div style={{ height: 32, background: '#FEE2E2', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '100%', background: '#EF4444', borderRadius: 8, transition: 'width 0.8s ease-out' }} />
                      </div>
                    </div>
                    {/* With ag exemption bar */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.gray }}>With Ag Exemption</span>
                        <span style={{ fontSize: 16, fontWeight: 900, color: C.green }}>{fmtMoney(results.totalWithAg)}/yr</span>
                      </div>
                      <div style={{ height: 32, background: '#FFF0D1', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.max(5, (results.totalWithAg / results.currentTaxes) * 100)}%`, background: C.green, borderRadius: 8, transition: 'width 0.8s ease-out' }} />
                      </div>
                    </div>
                    {/* Savings callout */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#FFF8EE', borderRadius: 10, border: '1px solid #F0DBA8' }}>
                      <span style={{ fontSize: 20 }}>💰</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: C.greenDark }}>You save {fmtMoney(results.annualSavings)}/yr ({results.savingsPercent.toFixed(0)}% reduction)</span>
                    </div>
                  </div>

                  {/* Homestead note */}
                  {results.hasHomestead && (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
                      <strong>📝 Note:</strong> Your homestead ({results.homesteadAcres} acre + structure, valued at {fmtMoney(results.homesteadValue)}) continues to be taxed at market rate.
                      The ag exemption applies to the remaining <strong>{results.agEligibleAcres.toFixed(results.agEligibleAcres % 1 ? 2 : 0)} acres</strong>.
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                    <div style={{ background: C.blue, borderRadius: 16, padding: 20, color: C.white, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8, marginBottom: 4 }}>10-Year Savings</p>
                      <p style={{ fontSize: 28, fontWeight: 900 }}>{fmtMoney(results.annualSavings * 10)}</p>
                    </div>
                    <div style={{ background: C.navy, borderRadius: 16, padding: 20, color: C.white, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8, marginBottom: 4 }}>20-Year Savings</p>
                      <p style={{ fontSize: 28, fontWeight: 900 }}>{fmtMoney(results.annualSavings * 20)}</p>
                    </div>
                  </div>

                  {/* Free Guide CTA */}
                  <button onClick={() => { setStep('signup'); track('cta_tax_comparison', { county: selectedCounty.name, savings: results?.annualSavings }); trackContact('engage', { event: 'started_signup' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="cta-wiggle cta-green">
                    📋 See How to Claim Your {fmtMoney(results.annualSavings)}/yr Savings
                    <span>Free guide with your county&apos;s exact requirements & deadlines</span>
                  </button>
                </div>

                {/* Investment & ROI */}
                <div style={{ background: C.white, borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 32, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 700, color: C.navy, fontSize: 17, marginBottom: 20 }}>🐝 Your Investment</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.lightGray, borderRadius: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 14, color: C.gray }}>Annual bee management (est.)</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>-{fmtMoney(results.annualMgmt)}/yr</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#FFFBEB', borderRadius: 10, marginBottom: 16, border: '1px solid #FDE68A' }}>
                    <div>
                      <span style={{ fontSize: 14, color: '#92400E' }}>🍯 Honey production ({results.totalHoneyLbs} lbs × $20/jar)</span>
                      <p style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>{results.requiredHives} hive{results.requiredHives > 1 ? 's' : ''} × ~{results.honeyLbsPerHive} lbs each</p>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#92400E' }}>+{fmtMoney(results.honeyRevenue)}/yr</span>
                  </div>

                  {results.netAnnualSavings > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#FFF8EE', borderRadius: 10, border: '1px solid #F0DBA8' }}>
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

                  {/* Free Guide CTA */}
                  <button onClick={() => { setStep('signup'); track('cta_investment', { county: selectedCounty.name, savings: results?.annualSavings }); trackContact('engage', { event: 'started_signup' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="cta-wiggle cta-green">
                    🐝 Ready to Start Saving? Get Your Free Guide
                    <span>Everything you need to apply for your ag exemption in {selectedCounty.name} County</span>
                  </button>
                </div>

                {/* Map View - moved above address */}

                {/* Customize */}
                <div style={{ background: C.white, borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, marginBottom: 24 }}>
                  <button onClick={() => { setShowCustomize(!showCustomize); if (!showCustomize) trackContact('engage', { event: 'adjusted_estimate' }); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <span style={{ fontWeight: 700, color: C.navy, fontSize: 15 }}>⚙️ Adjust your estimate</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2.5" style={{ transform: showCustomize ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showCustomize && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                      <div className="r-grid2">
                        <div>
                          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Acres</label>
                          <input type="number" value={acres} onChange={(e) => setAcres(e.target.value)} placeholder="10"
                            style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 600, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                          <p style={{ fontSize: 12, color: C.gray, marginTop: 4 }}>Min. {selectedCounty.minAcres} acres required</p>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Appraised Value</label>
                          <input type="number" value={appraisedValue} onChange={(e) => setAppraisedValue(e.target.value)} placeholder="180000"
                            style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 16, fontWeight: 600, color: C.navy, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                <div style={{ background: C.white, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: 24, marginBottom: 32, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontWeight: 700, color: C.navy, fontSize: 17, marginBottom: 16 }}>What you&apos;ll need</h3>
                  {[
                    { label: `${results.requiredHives} beehive${results.requiredHives > 1 ? 's' : ''}`, sub: `Required for ${results.agEligibleAcres.toFixed(results.agEligibleAcres % 1 ? 2 : 0)} ag-eligible acres in ${selectedCounty.name} County` },
                    { label: 'Ag exemption application', sub: `Filed with ${selectedCounty.cad.name}` },
                    { label: 'Ongoing agricultural use', sub: '5 of 7 years to maintain status' },
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
                <button onClick={() => { setStep('signup'); track('cta_bottom', { county: selectedCounty.name, savings: results?.annualSavings }); trackContact('engage', { event: 'started_signup' }); if (resultsTimeRef.current) { trackContact('engage', { event: 'time_on_results', timeMs: Date.now() - resultsTimeRef.current }); } window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="cta-wiggle cta-green" style={{ marginTop: 0 }}>
                  📋 Get Your Free {selectedCounty.name} County Guide →
                  <span>Free PDF with step-by-step filing instructions & deadlines</span>
                </button>
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
              {['Address', 'Savings', 'Guide'].map((label, i) => (
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
              <p style={{ fontSize: 14, color: C.gray, marginTop: 8 }}>{geocodedAddress?.address?.replace(/, USA$/, '') || searchInput}</p>
            </div>

            <div style={{ background: C.white, borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', padding: 32, border: '1px solid #e2e8f0' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 8 }}>Get Your Free Guide</h2>
                <p style={{ fontSize: 15, color: C.gray, lineHeight: 1.5 }}>
                  We&apos;ll email you the <strong style={{ color: C.navy }}>{selectedCounty.name} County Ag Exemption Guide</strong> with county-specific regulations and step-by-step filing instructions.
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
                  <input type="tel" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder="(903) 555-1234"
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
              Your <strong style={{ color: C.navy }}>{selectedCounty.name} County Ag Exemption Guide</strong> is ready! We&apos;ll also send a copy to <strong style={{ color: C.navy }}>{lead.email}</strong>.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
              <a href={`/guide?county=${encodeURIComponent(selectedCounty.name)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.green, color: C.navy, fontWeight: 700, fontSize: 16, padding: '14px 28px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 4px 12px rgba(212,168,67,0.3)' }}>
                📋 View Your Free Guide
              </a>
            </div>

            {/* Enhanced Report Upsell */}
            <div style={{ background: C.white, borderRadius: 20, padding: '28px 24px', marginBottom: 32, border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Want even more?</p>
              <a href={`/report?county=${encodeURIComponent(selectedCounty.name)}&acres=${acres || parcelData?.legalArea || 10}&propertyValue=${appraisedValue || parcelData?.marketValue || 300000}&taxRate=${selectedCounty.avgTaxRate}&name=${encodeURIComponent((lead.firstName + ' ' + lead.lastName).trim())}&email=${encodeURIComponent(lead.email)}`}
                target="_blank" rel="noopener noreferrer"
                className="cta-wiggle cta-green"
                style={{ marginTop: 0, marginBottom: 20 }}>
                🔓 Upgrade to Enhanced Report — $14.99
              </a>
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Step-by-step ag exemption application walkthrough',
                  'Personalized beekeeping shopping list with Amazon links',
                  'Local bee suppliers & nuc sources near you',
                  'Seasonal hive management calendar for your region',
                  'Record-keeping templates for CAD compliance',
                  'Hive placement guide with property diagram',
                  'County-specific deadlines & CAD contact info',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="#22883e" style={{ flexShrink: 0, marginTop: 1 }}>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span style={{ fontSize: 14, color: C.navy, lineHeight: 1.4 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: C.white, borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', marginBottom: 32, border: '1px solid #D5EAFF' }}>
              <p style={{ fontSize: 14, color: C.gray, fontWeight: 600, marginBottom: 4 }}>Your estimated annual savings</p>
              <p style={{ fontSize: 48, fontWeight: 900, ...gradientText, lineHeight: 1, marginBottom: 16 }}>{fmtMoney(results.annualSavings)}</p>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <p style={{ fontSize: 15, color: C.navy, fontWeight: 600, marginBottom: 4 }}>What happens next?</p>
                <div style={{ textAlign: 'left', display: 'inline-block' }}>
                  {['Click "View Your Guide Now" to read it instantly', 'Review your county\'s specific requirements & deadlines', 'Contact BeeKings when you\'re ready to get started'].map((text, i) => (
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

      {/* SEO Content Section — visible to crawlers, useful to users */}
      {step === 'search' && (
        <section className="r-section" style={{ background: C.lightGray }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 20, textAlign: 'center' }}>
              Texas Beekeeping Agricultural Exemption Guide
            </h2>
            <div style={{ fontSize: 15, color: C.gray, lineHeight: 1.8 }}>
              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: C.navy }}>What is a Texas bee exemption?</strong> Under Texas Tax Code Chapter 23, Subchapter D, 
                landowners can qualify for an agricultural appraisal (commonly called an &quot;ag exemption&quot;) by maintaining beehives on their property. 
                This reduces your property&apos;s taxable value from market value to agricultural productivity value — typically saving landowners 
                80-98% on the land portion of their property taxes.
              </p>
              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: C.navy }}>How much land do I need?</strong> Requirements vary by county, but most Texas counties 
                accept beekeeping ag exemptions on properties as small as 5-10 acres. Popular counties like Van Zandt, Kaufman, Henderson, 
                Dallas, Tarrant, Collin, Denton, Ellis, and Rockwall all have active beekeeping ag exemption programs.
              </p>
              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: C.navy }}>How many beehives do I need for a Texas ag exemption?</strong> The Texas Comptroller 
                recommends a minimum of 6 hives for 5-10 acres, with additional hives required for larger properties. Each county appraisal 
                district sets its own specific requirements. Our calculator automatically determines the exact number of hives needed for your property.
              </p>
              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: C.navy }}>What are the costs?</strong> A typical beekeeping setup costs approximately $197 per hive 
                for equipment and $260 per nucleus colony (nuc) of bees. Annual maintenance runs about $75 per hive for mite treatments, 
                feed, and supplies. Most landowners also earn $400-$600+ per hive annually from honey production (approximately 30 lbs per hive at $20/lb for local raw honey).
              </p>
              <p style={{ marginBottom: 16 }}>
                <strong style={{ color: C.navy }}>Which Texas counties support beekeeping ag exemptions?</strong> All 254 Texas counties 
                recognize beekeeping as a qualifying agricultural use. Our calculator includes county-specific data for tax rates, minimum 
                acreage requirements, hive requirements, and productivity values. Whether you&apos;re in East Texas, the DFW Metroplex, 
                Hill Country, Gulf Coast, or West Texas — we&apos;ve got your county covered.
              </p>
              <p>
                <strong style={{ color: C.navy }}>Real estate agents:</strong> Help your clients save thousands on property taxes. 
                Our free calculator uses real data from county appraisal districts and the Texas Natural Resources Information System (TNRIS) 
                to provide accurate, instant savings estimates. Share this tool with clients buying rural or semi-rural Texas properties 
                of 5+ acres — it could be the difference that closes the deal.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ background: C.navy, padding: '56px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="r-footer-grid" style={{ marginBottom: 40 }}>
            <div>
              <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 36, marginBottom: 12 }} />
              <p style={{ color: '#8DA4B5', fontSize: 14 }}>Canton, Texas</p>
              <p style={{ marginTop: 8 }}><a href="mailto:info@beekings.com" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>info@beekings.com</a></p>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: C.white, marginBottom: 12, fontSize: 14 }}>Resources</p>
              <p style={{ marginBottom: 8 }}><a href="https://comptroller.texas.gov/taxes/property-tax/exemptions/" target="_blank" rel="noopener noreferrer" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Texas Property Tax Info</a></p>
              <p style={{ marginBottom: 8 }}><a href="https://texasbee.org" target="_blank" rel="noopener noreferrer" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Texas Beekeepers Association</a></p>
              <p><a href="https://agrilife.org" target="_blank" rel="noopener noreferrer" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Texas A&M AgriLife</a></p>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: C.white, marginBottom: 12, fontSize: 14 }}>Company</p>
              <p style={{ marginBottom: 8 }}><a href="https://beekings.com" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>About</a></p>
              <p style={{ marginBottom: 8 }}><a href="#" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Contact</a></p>
              <p><a href="#" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Privacy Policy</a></p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1A3A4F', paddingTop: 24 }}>
            <p style={{ fontSize: 12, color: '#5A7A8A', lineHeight: 1.6, marginBottom: 16 }}>
              <strong style={{ color: '#8DA4B5' }}>Disclaimer:</strong> Estimates based on county tax data and publicly available parcel records. Actual savings depend on your specific property and CAD approval. BeeKings provides equipment, bees, and education—not tax or legal advice.
            </p>
            <p style={{ fontSize: 12, color: '#5A7A8A', textAlign: 'center' }}>© {new Date().getFullYear()} BeeKings. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
