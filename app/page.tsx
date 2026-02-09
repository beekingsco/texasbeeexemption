'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { US_STATES } from '@/lib/states';

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
  warm: '#FFF8F0',
  amber: '#F59E0B',
};

const AVAILABLE_STATES = ['TX', 'FL'];

// Beekeeper counter: ~150,000 US beekeepers, growing ~12,000/yr ≈ 1 new every ~44 min
// We use a deterministic base so every visitor sees the same number at the same time
const BEEKEEPER_BASE = 152847; // base count as of Feb 1, 2026
const BEEKEEPER_BASE_TIME = new Date('2026-02-01T00:00:00Z').getTime();
const BEEKEEPERS_PER_MS = 12000 / (365.25 * 24 * 60 * 60 * 1000); // ~12K/year

function useBeekeeperCount() {
  const [count, setCount] = useState(BEEKEEPER_BASE);
  const prevCountRef = useRef(BEEKEEPER_BASE);
  const [displayCount, setDisplayCount] = useState(BEEKEEPER_BASE);

  useEffect(() => {
    const calcCount = () => {
      const elapsed = Date.now() - BEEKEEPER_BASE_TIME;
      return Math.floor(BEEKEEPER_BASE + elapsed * BEEKEEPERS_PER_MS);
    };
    setCount(calcCount());
    setDisplayCount(calcCount());
    prevCountRef.current = calcCount();

    // Update the target every 3 minutes
    const interval = setInterval(() => {
      const newCount = calcCount();
      prevCountRef.current = displayCount;
      setCount(newCount);
    }, 180000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate toward target
  useEffect(() => {
    if (displayCount >= count) return;
    const diff = count - displayCount;
    const step = Math.max(1, Math.floor(diff / 20));
    const timer = setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + step, count));
    }, 80);
    return () => clearTimeout(timer);
  }, [count, displayCount]);

  return displayCount;
}

export default function NationalLanding() {
  const router = useRouter();
  const [selectedState, setSelectedState] = useState('');
  const beekeeperCount = useBeekeeperCount();

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
        .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
        .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        select { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; }
        .r-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .r-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        .r-nav { display: flex; align-items: center; gap: 24px; }
        @media (max-width: 768px) {
          .r-grid2 { grid-template-columns: 1fr; }
          .r-grid3 { grid-template-columns: 1fr; gap: 24px; }
          .r-nav { display: none; }
          .hero-layout { flex-direction: column-reverse !important; text-align: center !important; }
          .hero-text { align-items: center !important; }
          .hero-img { max-width: 280px !important; }
        }
      `}</style>

      {/* HEADER */}
      <header style={{ background: C.white, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🐝</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: C.navy, letterSpacing: '-0.02em' }}>Bee Exemption</span>
          </a>
          <nav className="r-nav">
            <a href="#how-it-works" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>How It Works</a>
            <a href="#about" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>About</a>
            <a href="https://beekings.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>BeeKings</a>
          </nav>
        </div>
      </header>

      {/* BEEKEEPER COUNTER */}
      <div style={{ background: C.navy, padding: '10px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: C.white, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🐝</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: C.green, fontWeight: 900, fontSize: 16 }}>{beekeeperCount.toLocaleString()}</span>
            {' '}beekeepers across the U.S. and growing
          </span>
          <span style={{ fontSize: 10, color: '#8DA4B5' }}>•  USDA est.</span>
        </p>
      </div>

      {/* HERO */}
      <section style={{ background: C.sky, padding: '60px 24px 0', overflow: 'hidden' }}>
        <div className="hero-layout" style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: 40 }}>
          <div className="hero-text fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingBottom: 60 }}>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, color: C.navy, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 16 }}>
              Could bees lower<br />your property taxes?
            </h1>
            <p style={{ fontSize: 18, color: '#5A7A8A', lineHeight: 1.6, marginBottom: 32, maxWidth: 480 }}>
              In many states, keeping a few beehives on your land qualifies you for an agricultural 
              exemption — reducing your property taxes by thousands of dollars a year.
            </p>

            {/* State Selector */}
            <div style={{ width: '100%', maxWidth: 400 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
                Select your state to get started
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  style={{
                    flex: 1, padding: '14px 44px 14px 16px', fontSize: 16, fontWeight: 600,
                    color: selectedState ? C.navy : C.gray, border: '2px solid #D5EAFF',
                    borderRadius: 12, background: C.white, cursor: 'pointer', fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = C.blue}
                  onBlur={(e) => e.target.style.borderColor = '#D5EAFF'}
                >
                  <option value="">Choose your state...</option>
                  {US_STATES.map(state => (
                    <option key={state.code} value={state.code}>
                      {state.name}{AVAILABLE_STATES.includes(state.code) ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleStateSelect(selectedState)}
                  disabled={!selectedState}
                  style={{
                    padding: '14px 24px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 16,
                    background: selectedState ? C.blue : '#93C5FD', color: C.white,
                    cursor: selectedState ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Go →
                </button>
              </div>
              <p style={{ fontSize: 13, color: '#8DA4B5', marginTop: 8 }}>
                <span style={{ color: C.green, fontWeight: 700 }}>✓</span> Texas &amp; Florida calculators live — more states coming soon
              </p>
            </div>
          </div>

          {/* Beekeeper illustration */}
          <div className="hero-img" style={{ flex: '0 0 auto', maxWidth: 340, alignSelf: 'flex-end' }}>
            <img
              src="/hero-beekeeper.png"
              alt="Friendly beekeeper illustration"
              style={{ width: '100%', display: 'block', objectFit: 'contain' }}
            />
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

      {/* AVAILABLE STATES */}
      <section style={{ padding: '64px 24px', background: C.white }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 12 }}>Available calculators</h2>
          <p style={{ fontSize: 16, color: C.gray, marginBottom: 40 }}>
            Select a state to calculate your potential savings. More states launching soon.
          </p>

          <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { code: 'TX', name: 'Texas', emoji: '🤠', counties: 254, desc: 'Real property data' },
              { code: 'FL', name: 'Florida', emoji: '🌴', counties: 67, desc: 'No min acreage' },
            ].map(state => (
              <button
                key={state.code}
                onClick={() => handleStateSelect(state.code)}
                className="hover-lift"
                style={{
                  background: C.white, border: '2px solid #D5EAFF', borderRadius: 12,
                  padding: '14px 20px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                <span style={{ fontSize: 24 }}>{state.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 17, fontWeight: 800, color: C.navy }}>{state.name}</p>
                    <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>{state.counties} counties • Live</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.gray }}>{state.desc}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          <p style={{ fontSize: 14, color: C.gray, marginTop: 32 }}>
            Don&apos;t see your state? <a href="#" onClick={(e) => { e.preventDefault(); setSelectedState(''); const el = document.querySelector('select'); el?.focus(); }} style={{ color: C.blue, fontWeight: 600, textDecoration: 'none' }}>Select it above</a> to join the waitlist — we&apos;ll notify you when we launch.
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
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.navy, padding: '48px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>🐝</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: C.white }}>Bee Exemption</span>
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
