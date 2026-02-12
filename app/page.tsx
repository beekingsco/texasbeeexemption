'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { US_STATES } from '@/lib/states';

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
  warm: '#FFF8EE',
  amber: '#D4A843',
};

const CALCULATOR_STATES = ['TX', 'FL', 'AR', 'LA'];
const INFO_STATES = ['AZ', 'CA', 'CO', 'CT', 'GA', 'HI', 'ID', 'IL', 'KY', 'ME', 'MD', 'MA', 'NH', 'NJ', 'NY', 'NC', 'OH', 'OK', 'OR', 'PA', 'SC', 'TN', 'UT', 'VT', 'VA', 'WA', 'WI'];

const STATE_FLAGS: Record<string, string> = {
  TX: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Flag_of_Texas.svg/66px-Flag_of_Texas.svg.png',
  FL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Flag_of_Florida.svg/66px-Flag_of_Florida.svg.png',
  AR: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Flag_of_Arkansas.svg/66px-Flag_of_Arkansas.svg.png',
  LA: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Flag_of_Louisiana.svg/66px-Flag_of_Louisiana.svg.png',
};

const BEEKEEPER_BASE = 153132;

const CITIES = [
  // Texas
  { city: 'Athens', state: 'TX' }, { city: 'Canton', state: 'TX' }, { city: 'Tyler', state: 'TX' },
  { city: 'Longview', state: 'TX' }, { city: 'Nacogdoches', state: 'TX' }, { city: 'Palestine', state: 'TX' },
  { city: 'Corsicana', state: 'TX' }, { city: 'Waxahachie', state: 'TX' }, { city: 'Terrell', state: 'TX' },
  { city: 'Kaufman', state: 'TX' }, { city: 'Mabank', state: 'TX' }, { city: 'Wills Point', state: 'TX' },
  { city: 'Grand Saline', state: 'TX' }, { city: 'Lindale', state: 'TX' }, { city: 'Chandler', state: 'TX' },
  { city: 'Ennis', state: 'TX' }, { city: 'Hillsboro', state: 'TX' }, { city: 'Fairfield', state: 'TX' },
  { city: 'Jacksonville', state: 'TX' }, { city: 'Henderson', state: 'TX' }, { city: 'Marshall', state: 'TX' },
  { city: 'Mineola', state: 'TX' }, { city: 'Sulphur Springs', state: 'TX' }, { city: 'Greenville', state: 'TX' },
  { city: 'Rockwall', state: 'TX' }, { city: 'Weatherford', state: 'TX' }, { city: 'Granbury', state: 'TX' },
  { city: 'Cleburne', state: 'TX' }, { city: 'Stephenville', state: 'TX' }, { city: 'Burnet', state: 'TX' },
  { city: 'Marble Falls', state: 'TX' }, { city: 'Dripping Springs', state: 'TX' }, { city: 'Bastrop', state: 'TX' },
  { city: 'Brenham', state: 'TX' }, { city: 'Huntsville', state: 'TX' }, { city: 'Conroe', state: 'TX' },
  { city: 'Livingston', state: 'TX' }, { city: 'Wimberley', state: 'TX' }, { city: 'La Grange', state: 'TX' },
  // Florida
  { city: 'Ocala', state: 'FL' }, { city: 'Gainesville', state: 'FL' }, { city: 'Palatka', state: 'FL' },
  { city: 'Brooksville', state: 'FL' }, { city: 'Deland', state: 'FL' }, { city: 'Clermont', state: 'FL' },
  { city: 'Eustis', state: 'FL' }, { city: 'Inverness', state: 'FL' }, { city: 'Chiefland', state: 'FL' },
  { city: 'Live Oak', state: 'FL' }, { city: 'Lake City', state: 'FL' }, { city: 'Perry', state: 'FL' },
  { city: 'Crestview', state: 'FL' }, { city: 'Defuniak Springs', state: 'FL' }, { city: 'Marianna', state: 'FL' },
  { city: 'Arcadia', state: 'FL' }, { city: 'Sebring', state: 'FL' }, { city: 'Okeechobee', state: 'FL' },
  { city: 'Labelle', state: 'FL' }, { city: 'Wauchula', state: 'FL' }, { city: 'Williston', state: 'FL' },
  { city: 'Newberry', state: 'FL' }, { city: 'Trenton', state: 'FL' }, { city: 'Monticello', state: 'FL' },
];

function randomSavings() {
  // $2,100 to $8,400 in $100 increments
  return (Math.floor(Math.random() * 64) + 21) * 100;
}

function randomLocation() {
  const loc = CITIES[Math.floor(Math.random() * CITIES.length)];
  return { city: loc.city, state: loc.state };
}

function useBeekeeperActivity() {
  const [count, setCount] = useState(BEEKEEPER_BASE);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastExiting, setToastExiting] = useState(false);
  const [countBump, setCountBump] = useState(false);
  const [toastData, setToastData] = useState({ savings: 3500, city: 'Athens', state: 'TX' });

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      // Vary timing: sometimes rapid (5-8s), sometimes medium (12-18s), occasionally slower (25-35s)
      const roll = Math.random();
      const delay = roll < 0.35
        ? (5 + Math.random() * 3) * 1000    // 35% chance: 5-8 seconds (rapid)
        : roll < 0.75
          ? (12 + Math.random() * 6) * 1000  // 40% chance: 12-18 seconds (medium)
          : (25 + Math.random() * 10) * 1000; // 25% chance: 25-35 seconds (slower)
      timeout = setTimeout(() => {
        // Bump counter
        setCount(c => c + 1);
        setCountBump(true);
        setTimeout(() => setCountBump(false), 600);

        // Generate random savings + location
        const loc = randomLocation();
        setToastData({ savings: randomSavings(), city: loc.city, state: loc.state });

        // Show toast
        setToastExiting(false);
        setToastVisible(true);
        setTimeout(() => {
          setToastExiting(true);
          setTimeout(() => {
            setToastVisible(false);
            setToastExiting(false);
            scheduleNext();
          }, 400);
        }, 3000);
      }, delay);
    };
    scheduleNext();
    return () => clearTimeout(timeout);
  }, []);

  return { count, toastVisible, toastExiting, countBump, toastData };
}

export default function NationalLanding() {
  const router = useRouter();
  const [selectedState, setSelectedState] = useState('');
  const { count: beekeeperCount, toastVisible, toastExiting, countBump, toastData } = useBeekeeperActivity();

  const handleStateSelect = async (stateCode: string) => {
    if (!stateCode) return;

    // Track interest
    const state = US_STATES.find(s => s.code === stateCode);
    try {
      await fetch('/api/state-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: state?.name || stateCode }),
      });
    } catch (e) {
      console.error('Failed to track state interest:', e);
    }

    if (stateCode === 'TX') {
      router.push('/texas');
    } else if (stateCode === 'FL') {
      router.push('/florida');
    } else if (stateCode === 'AR') {
      router.push('/arkansas');
    } else if (stateCode === 'LA') {
      router.push('/louisiana');
    } else {
      router.push(`/state/${stateCode.toLowerCase()}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.white }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes toastIn { from { opacity: 0; transform: translateY(-10px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes toastOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-10px) scale(0.9); } }
        .toast-enter { animation: toastIn 0.4s ease-out; }
        .toast-exit { animation: toastOut 0.4s ease-in; }
        @keyframes countBump { 0% { transform: scale(1); } 30% { transform: scale(1.15); } 100% { transform: scale(1); } }
        .count-bump { animation: countBump 0.5s ease-out; }
        .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
        .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235A6A7A' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
        .r-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .r-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        .r-nav { display: flex; align-items: center; gap: 24px; }
        @media (max-width: 768px) {
          .r-grid2 { grid-template-columns: 1fr; }
          .r-grid3 { grid-template-columns: 1fr; gap: 24px; }
          .r-nav { display: none; }
          .hero-section { padding-top: 40px !important; padding-bottom: 40px !important; min-height: 320px !important; }
          .hero-text { align-items: center !important; text-align: center !important; }
          .hero-text h1 { font-size: 26px !important; margin-bottom: 8px !important; }
          .hero-text p { font-size: 14px !important; margin-bottom: 14px !important; }
          .hero-layout { flex-direction: column !important; text-align: center !important; gap: 24px !important; align-items: center !important; }
          .hero-img { max-width: 160px !important; }
          .r-agent-img { display: none !important; }
          .counter-bar { padding: 8px 16px !important; }
          .counter-bar p { font-size: 13px !important; }
          .header-bar { height: 50px !important; }
        }
      `}</style>

      {/* HEADER */}
      <header style={{ background: C.white, borderBottom: '1px solid #e2e8f0' }}>
        <div className="header-bar" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 36 }} />
            <span style={{ fontWeight: 900, fontSize: 20, color: C.navy, letterSpacing: '-0.02em' }}>BEE EXEMPTION</span>
          </a>
          <nav className="r-nav">
            <a href="#how-it-works" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>How It Works</a>
            <a href="/blog" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>Blog</a>
            <a href="/agents" style={{ fontSize: 14, fontWeight: 600, color: C.green, textDecoration: 'none' }}>For Agents</a>
            <a href="https://beekings.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>BeeKings</a>
          </nav>
        </div>
      </header>

      {/* BEEKEEPER COUNTER */}
      <div className="counter-bar" style={{ background: C.navy, padding: '12px 24px', textAlign: 'center', position: 'relative' }}>
        <p style={{ fontSize: 15, color: C.white, fontWeight: 700, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontSize: 16, marginRight: 6 }}>🐝</span>
          <span className={countBump ? 'count-bump' : ''} style={{ color: C.green, fontWeight: 900, fontSize: 17, display: 'inline-block' }}>{beekeeperCount.toLocaleString()}</span>
          {' '}beekeepers in the US
        </p>
        <p style={{ fontSize: 13, color: '#8DA4B5', margin: '2px 0 0', fontWeight: 600 }}>
          10,000+ more join every year
        </p>

        {/* NEW BEEKEEPER TOAST — anchored below counter */}
        {toastVisible && (
          <div
            className={toastExiting ? 'toast-exit' : 'toast-enter'}
            style={{
              position: 'absolute', top: '100%', right: 24, marginTop: 8, zIndex: 9999,
              background: C.white, borderRadius: 14, padding: '12px 18px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', gap: 10,
              border: `2px solid ${C.green}`, whiteSpace: 'nowrap',
            }}
          >
            <img src="/bee-wink.png" alt="" style={{ width: 28, height: 28, flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 800, color: C.navy, fontSize: 14, margin: 0 }}>${toastData.savings.toLocaleString()}/yr Saved</p>
              <p style={{ fontWeight: 600, color: C.gray, fontSize: 12, margin: 0 }}>in {toastData.city}, {toastData.state}</p>
            </div>
          </div>
        )}
      </div>

      {/* HERO — full background photo */}
      <section className="hero-section" style={{ position: 'relative', padding: '220px 24px 32px', overflow: 'hidden', minHeight: 540 }}>
        {/* Full-screen background photo */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url(/beekeeper-frame.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 30%' }} />
        {/* Dark overlay for text readability */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(13,27,42,0.65) 0%, rgba(26,58,107,0.52) 50%, rgba(13,27,42,0.45) 100%)' }} />

        <div style={{ maxWidth: 700, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="hero-text fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <br /><br /><br /><br /><br />
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, color: C.white, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 16 }}>
              Could bees lower<br />your property taxes?
            </h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: 32, maxWidth: 520 }}>
              In many states, keeping a few beehives on your land qualifies you for an agricultural 
              exemption — reducing your property taxes by thousands of dollars a year.
            </p>

            {/* State Selector */}
            <div style={{ width: '100%', maxWidth: 400 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 8 }}>
                Select your state to get started
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  style={{
                    flex: 1, padding: '14px 44px 14px 16px', fontSize: 16, fontWeight: 600,
                    color: selectedState ? C.navy : C.gray, border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: 12, background: C.white, cursor: 'pointer', fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = C.green}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                >
                  <option value="">Choose your state...</option>
                  {US_STATES.map(state => {
                    const label = CALCULATOR_STATES.includes(state.code) 
                      ? ' ✓ Calculator' 
                      : INFO_STATES.includes(state.code) 
                        ? ' • Info' 
                        : '';
                    return (
                      <option key={state.code} value={state.code}>
                        {state.name}{label}
                      </option>
                    );
                  })}
                </select>
                <button
                  onClick={() => handleStateSelect(selectedState)}
                  disabled={!selectedState}
                  style={{
                    padding: '14px 24px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 16,
                    background: selectedState ? C.green : 'rgba(212,168,67,0.5)', color: selectedState ? C.navy : C.white,
                    cursor: selectedState ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Go →
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>&nbsp;</p>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK FACTS */}
      <section style={{ padding: '64px 24px', background: C.white }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="r-grid3">
            {[
              { icon: '🏡', title: 'For Landowners', desc: 'If you own 5+ acres of rural or semi-rural land, you may already qualify for an agricultural property tax exemption through beekeeping.' },
              { icon: '🐝', title: 'Low Maintenance', desc: 'Honeybees are gentle and largely self-sufficient. Most beekeepers spend just 15-30 minutes per hive per month during active season.' },
              { icon: '💰', title: 'Real Savings', desc: 'Agricultural appraisal typically reduces taxable land value by 90-98%, saving most qualifying landowners $2,000-$8,000+ per year.' },
            ].map(item => (
              <div key={item.title} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 15, color: C.gray, lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: '64px 24px', background: C.sky }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <img src="/hero-beekeeper.png" alt="Friendly beekeeper" style={{ height: 120, display: 'inline-block', objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: C.navy, textAlign: 'center', marginBottom: 12 }}>
            How it works
          </h2>
          <p style={{ fontSize: 16, color: C.gray, textAlign: 'center', marginBottom: 48 }}>
            Getting an agricultural exemption through beekeeping is simpler than most people think.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[
              { n: '1', title: 'Check your property', desc: 'Enter your address and we\'ll pull your real property data — acreage, assessed value, and county-specific requirements.' },
              { n: '2', title: 'See your estimated savings', desc: 'Our calculator compares your current taxes to what you\'d pay with an agricultural appraisal. Most landowners are surprised by the difference.' },
              { n: '3', title: 'Get your county guide', desc: 'Download a free guide with your county\'s specific requirements, application deadlines, and step-by-step filing instructions.' },
              { n: '4', title: 'Set up your hives', desc: 'BeeKings can provide everything you need — hives, bees, equipment, and hands-on training. Or bring your own if you\'re already a beekeeper.' },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', background: C.white, borderRadius: 16, padding: '24px 28px', border: '1px solid #D5EAFF' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.blue, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, flexShrink: 0 }}>{step.n}</div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{step.title}</h3>
                  <p style={{ fontSize: 15, color: C.gray, lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BEE PHOTO DIVIDER */}
      <div style={{ width: '100%', height: 200, overflow: 'hidden', position: 'relative' }}>
        <img
          src="/bees-closeup.jpg"
          alt="Honeybees working on hive frames"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(240,244,250,0.3) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.3) 100%)' }} />
      </div>

      {/* AVAILABLE STATES */}
      <section style={{ padding: '64px 24px', background: C.white }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 12 }}>Available calculators</h2>
          <p style={{ fontSize: 16, color: C.gray, marginBottom: 40 }}>
            Select a state to calculate your potential savings. More states launching soon.
          </p>

          <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { code: 'TX', name: 'Texas', counties: 254, desc: 'Real property data' },
              { code: 'FL', name: 'Florida', counties: 67, desc: 'No min acreage' },
              { code: 'AR', name: 'Arkansas', counties: 75, desc: 'Beekeeping explicit' },
              { code: 'LA', name: 'Louisiana', counties: 64, desc: '64 parishes' },
            ].map(state => (
              <button
                key={state.code}
                onClick={() => handleStateSelect(state.code)}
                className="hover-lift"
                style={{
                  background: C.white, border: '2px solid #D5EAFF', borderRadius: 12,
                  padding: '14px 20px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 14, position: 'relative',
                }}
              >
                <img 
                  src={STATE_FLAGS[state.code]} 
                  alt={`${state.name} flag`}
                  style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 21, objectFit: 'cover', borderRadius: 3, border: '1px solid #e2e8f0' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 17, fontWeight: 800, color: C.navy }}>{state.name}</p>
                    <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>{state.counties} counties • Live</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.gray }}>{state.desc}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" style={{ flexShrink: 0, marginRight: 28 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          <p style={{ fontSize: 14, color: C.gray, marginTop: 32 }}>
            <a href="/states" style={{ color: C.blue, fontWeight: 600, textDecoration: 'none' }}>View all 50 states →</a>
          </p>
        </div>
      </section>

      {/* ABOUT / TRUST */}
      <section id="about" style={{ padding: '64px 24px', background: C.sky }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, textAlign: 'center', marginBottom: 12 }}>
            Built by beekeepers, for landowners
          </h2>
          <p style={{ fontSize: 16, color: C.gray, textAlign: 'center', lineHeight: 1.7, marginBottom: 40 }}>
            Bee Exemption is a free tool from <a href="https://beekings.com" target="_blank" rel="noopener noreferrer" style={{ color: C.blue, fontWeight: 600, textDecoration: 'none' }}>BeeKings</a>, 
            a family-owned beekeeping company in Canton, Texas. We&apos;ve helped landowners across the state 
            set up beekeeping operations that qualify for agricultural exemptions — saving them thousands 
            on property taxes while supporting pollinator health.
          </p>

          <div style={{ background: C.white, borderRadius: 16, padding: '28px 32px', border: '1px solid #D5EAFF' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: C.navy, marginBottom: 16 }}>Why we built this</h3>
            <p style={{ fontSize: 15, color: C.gray, lineHeight: 1.7, marginBottom: 12 }}>
              Most landowners don&apos;t realize they&apos;re overpaying on property taxes. Agricultural exemptions 
              exist in nearly every state, and beekeeping is one of the easiest ways to qualify — but the 
              process can be confusing. County requirements vary, paperwork is scattered, and bad information 
              is everywhere.
            </p>
            <p style={{ fontSize: 15, color: C.gray, lineHeight: 1.7 }}>
              We built Bee Exemption to give landowners a clear, honest answer: <em>does my property qualify, 
              and how much could I save?</em> No hard sells, no inflated numbers. Just real data from your 
              county&apos;s appraisal district.
            </p>
          </div>
        </div>
      </section>

      {/* AGENT CTA BANNER */}
      <section style={{ padding: 0, background: C.navy, position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'stretch' }}>
          {/* Photo side */}
          <div style={{ flex: '0 0 320px', position: 'relative', overflow: 'hidden' }} className="r-agent-img">
            <img
              src="/agent-landowner.jpg"
              alt="Agent walking property with client"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', minHeight: 240 }}
            />
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 80, background: `linear-gradient(to right, transparent, ${C.navy})` }} />
          </div>
          {/* Text side */}
          <div style={{ flex: 1, padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212,168,67,0.15)', borderRadius: 16, padding: '5px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 14 }}>🏠</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.green, letterSpacing: '0.08em' }}>FOR REAL ESTATE AGENTS</span>
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: C.white, marginBottom: 10, lineHeight: 1.2 }}>
              Real Estate Agents Love Us
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 24, maxWidth: 480 }}>
              Generate qualified leads, close more deals, and help your clients save thousands on property taxes — all with your brand front and center.
            </p>
            <a
              href="/agents"
              style={{
                display: 'inline-block', padding: '14px 28px', borderRadius: 12,
                background: C.green, color: C.navy, fontWeight: 700, fontSize: 16,
                textDecoration: 'none', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(212,168,67,0.3)',
              }}
            >
              See Why Agents Partner With Us →
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '64px 24px', background: C.white }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, textAlign: 'center', marginBottom: 40 }}>
            Common questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { q: 'Is this legal?', a: 'Absolutely. Agricultural property tax exemptions are established by state law. Many states, including Texas and Florida, explicitly recognize beekeeping as a qualifying agricultural use. Thousands of landowners use beekeeping to maintain their agricultural classification every year.' },
              { q: 'How much land do I need?', a: 'It depends on your state and county. In Texas, most counties require 5-20 acres. Florida has no state-mandated minimum acreage. Our calculator checks your specific county\'s requirements automatically.' },
              { q: 'Do I need beekeeping experience?', a: 'No. Honeybees are gentle and low-maintenance. BeeKings provides hives, bees, equipment, training, and ongoing support. Many of our customers had zero experience before starting.' },
              { q: 'How much does it cost to get started?', a: 'A typical setup runs about $450 per hive (equipment + bees). Most properties need 6-12 hives. Annual maintenance is roughly $75 per hive. The investment usually pays for itself within the first year through tax savings alone — plus you get honey.' },
              { q: 'How long until I start saving?', a: 'If your land already has agricultural history, you may qualify the same tax year. For new agricultural use, most states require a few years of qualifying activity. The sooner you start, the sooner you save — and your savings compound every year you maintain the exemption.' },
              { q: 'Is the calculator really free?', a: 'Yes. No catches, no hidden fees. We built it to help landowners understand their options. If you decide you want help getting set up with hives, BeeKings is here — but there\'s zero obligation.' },
            ].map(faq => (
              <details key={faq.q} style={{ background: C.lightGray, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <summary style={{ padding: '16px 24px', fontWeight: 700, color: C.navy, fontSize: 16, cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {faq.q}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" style={{ flexShrink: 0, marginLeft: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p style={{ padding: '0 24px 16px', color: C.gray, lineHeight: 1.7, fontSize: 15 }}>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* GENTLE CTA */}
      <section style={{ padding: '64px 24px', background: C.sky, textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐝</div>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 12 }}>
              See what you could save
            </h2>
            <p style={{ fontSize: 16, color: C.gray, marginBottom: 32, lineHeight: 1.6 }}>
              It takes 60 seconds to check your property. No signup required.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/texas')}
                style={{ padding: '14px 28px', borderRadius: 12, background: C.blue, color: C.white, fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Texas Calculator
              </button>
              <button
                onClick={() => router.push('/florida')}
                style={{ padding: '14px 28px', borderRadius: 12, background: C.white, color: C.navy, fontWeight: 700, fontSize: 16, border: '2px solid #D5EAFF', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Florida Calculator
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.navy, padding: '48px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 28 }} />
                <span style={{ fontWeight: 800, fontSize: 18, color: C.white }}>BEE EXEMPTION</span>
              </div>
              <p style={{ color: '#8DA4B5', fontSize: 14 }}>A free tool by BeeKings</p>
              <p style={{ color: '#8DA4B5', fontSize: 14 }}>Canton, Texas</p>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: C.white, marginBottom: 8, fontSize: 14 }}>Calculators</p>
              <p style={{ marginBottom: 4 }}><a href="/texas" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Texas</a></p>
              <p><a href="/florida" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Florida</a></p>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: C.white, marginBottom: 8, fontSize: 14 }}>Resources</p>
              <p style={{ marginBottom: 4 }}><a href="/blog" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Blog</a></p>
              <p style={{ marginBottom: 4 }}><a href="https://beekings.com" target="_blank" rel="noopener noreferrer" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>BeeKings.com</a></p>
              <p><a href="mailto:info@beekings.com" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>info@beekings.com</a></p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1A3A4F', paddingTop: 20 }}>
            <p style={{ fontSize: 12, color: '#5A7A8A', lineHeight: 1.6, marginBottom: 12 }}>
              <strong style={{ color: '#8DA4B5' }}>Disclaimer:</strong> Estimates are based on publicly available county tax data and property records. Actual savings depend on your specific property, county approval, and current tax rates. This tool provides estimates only — not tax or legal advice.
            </p>
            <p style={{ fontSize: 12, color: '#5A7A8A', textAlign: 'center' }}>© {new Date().getFullYear()} BeeKings. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
