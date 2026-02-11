'use client';

import Link from 'next/link';
import { useState } from 'react';

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

interface StateInfo {
  code: string;
  name: string;
  status: 'full-page' | 'researched' | 'coming-soon';
  tier?: number;
  headline?: string;
  slug?: string;
}

const states: StateInfo[] = [
  { code: 'AL', name: 'Alabama', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'AK', name: 'Alaska', status: 'coming-soon', headline: 'No statewide property tax' },
  { code: 'AZ', name: 'Arizona', status: 'researched', tier: 2, headline: 'Class 3 agricultural classification', slug: 'arizona' },
  { code: 'AR', name: 'Arkansas', status: 'full-page', tier: 1, headline: 'No waiting period — qualify year 1', slug: 'arkansas' },
  { code: 'CA', name: 'California', status: 'researched', tier: 3, headline: 'County-by-county programs available', slug: 'california' },
  { code: 'CO', name: 'Colorado', status: 'researched', tier: 1, headline: 'Apiculture explicitly in statute', slug: 'colorado' },
  { code: 'CT', name: 'Connecticut', status: 'researched', tier: 1, headline: 'PA 490 — bees explicitly listed', slug: 'connecticut' },
  { code: 'DE', name: 'Delaware', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'FL', name: 'Florida', status: 'full-page', tier: 1, headline: 'No waiting period — qualify year 1', slug: 'florida' },
  { code: 'GA', name: 'Georgia', status: 'researched', tier: 2, headline: 'GATE program + CUVA', slug: 'georgia' },
  { code: 'HI', name: 'Hawaii', status: 'researched', tier: 2, headline: 'Ag dedication program', slug: 'hawaii' },
  { code: 'ID', name: 'Idaho', status: 'researched', tier: 2, headline: 'Agricultural exemption', slug: 'idaho' },
  { code: 'IL', name: 'Illinois', status: 'researched', tier: 1, headline: 'Apiculture explicitly in statute', slug: 'illinois' },
  { code: 'IN', name: 'Indiana', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'IA', name: 'Iowa', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'KS', name: 'Kansas', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'KY', name: 'Kentucky', status: 'researched', tier: 1, headline: 'Apiculture explicitly in statute', slug: 'kentucky' },
  { code: 'LA', name: 'Louisiana', status: 'full-page', tier: 1, headline: 'No waiting period for 3+ acres', slug: 'louisiana' },
  { code: 'ME', name: 'Maine', status: 'researched', tier: 2, headline: 'Bees in farmland current use', slug: 'maine' },
  { code: 'MD', name: 'Maryland', status: 'researched', tier: 1, headline: 'No minimum acreage!', slug: 'maryland' },
  { code: 'MA', name: 'Massachusetts', status: 'researched', tier: 1, headline: 'Ch. 61A — bees explicitly listed', slug: 'massachusetts' },
  { code: 'MI', name: 'Michigan', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'MN', name: 'Minnesota', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'MS', name: 'Mississippi', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'MO', name: 'Missouri', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'MT', name: 'Montana', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'NE', name: 'Nebraska', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'NV', name: 'Nevada', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'NH', name: 'New Hampshire', status: 'researched', tier: 1, headline: 'Raising of bees explicit', slug: 'new-hampshire' },
  { code: 'NJ', name: 'New Jersey', status: 'researched', tier: 1, headline: 'Highest savings potential in US', slug: 'new-jersey' },
  { code: 'NM', name: 'New Mexico', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'NY', name: 'New York', status: 'researched', tier: 2, headline: 'Agricultural assessment', slug: 'new-york' },
  { code: 'NC', name: 'North Carolina', status: 'researched', tier: 2, headline: 'Present Use Value program', slug: 'north-carolina' },
  { code: 'ND', name: 'North Dakota', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'OH', name: 'Ohio', status: 'researched', tier: 2, headline: 'CAUV program', slug: 'ohio' },
  { code: 'OK', name: 'Oklahoma', status: 'researched', tier: 2, headline: 'Agricultural use valuation', slug: 'oklahoma' },
  { code: 'OR', name: 'Oregon', status: 'researched', tier: 2, headline: 'EFU zones & farm assessment', slug: 'oregon' },
  { code: 'PA', name: 'Pennsylvania', status: 'researched', tier: 1, headline: 'Clean & Green — apiaries listed', slug: 'pennsylvania' },
  { code: 'RI', name: 'Rhode Island', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'SC', name: 'South Carolina', status: 'researched', tier: 2, headline: 'Bees under livestock', slug: 'south-carolina' },
  { code: 'SD', name: 'South Dakota', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'TN', name: 'Tennessee', status: 'researched', tier: 2, headline: 'Greenbelt program', slug: 'tennessee' },
  { code: 'TX', name: 'Texas', status: 'full-page', tier: 1, headline: '5 of 7 years ag history required', slug: 'texas' },
  { code: 'UT', name: 'Utah', status: 'researched', tier: 2, headline: 'Farmland Assessment Act', slug: 'utah' },
  { code: 'VT', name: 'Vermont', status: 'researched', tier: 2, headline: 'Current use program', slug: 'vermont' },
  { code: 'VA', name: 'Virginia', status: 'researched', tier: 1, headline: 'Animals useful to man — explicit', slug: 'virginia' },
  { code: 'WA', name: 'Washington', status: 'researched', tier: 2, headline: 'Current use + farmer designation', slug: 'washington' },
  { code: 'WV', name: 'West Virginia', status: 'coming-soon', headline: 'Research in progress' },
  { code: 'WI', name: 'Wisconsin', status: 'researched', tier: 2, headline: 'Bees = livestock', slug: 'wisconsin' },
  { code: 'WY', name: 'Wyoming', status: 'coming-soon', headline: 'Research in progress' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'full-page':
      return { bg: '#DCFCE7', text: '#166534', label: '✓ Calculator Available' };
    case 'researched':
      return { bg: '#FEF3C7', text: '#92400E', label: 'Research Complete' };
    default:
      return { bg: '#F3F4F6', text: '#6B7280', label: 'Coming Soon' };
  }
};

const getFlagUrl = (code: string) => {
  const flagMap: Record<string, string> = {
    'TX': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Flag_of_Texas.svg/45px-Flag_of_Texas.svg.png',
    'FL': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Flag_of_Florida.svg/45px-Flag_of_Florida.svg.png',
    'AR': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Flag_of_Arkansas.svg/45px-Flag_of_Arkansas.svg.png',
    'LA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Flag_of_Louisiana.svg/45px-Flag_of_Louisiana.svg.png',
    'CA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Flag_of_California.svg/45px-Flag_of_California.svg.png',
    'GA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Flag_of_Georgia_%28U.S._state%29.svg/45px-Flag_of_Georgia_%28U.S._state%29.svg.png',
    'NJ': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Flag_of_New_Jersey.svg/45px-Flag_of_New_Jersey.svg.png',
    'WA': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Flag_of_Washington.svg/45px-Flag_of_Washington.svg.png',
  };
  return flagMap[code] || null;
};

export default function StatesPage() {
  const [filter, setFilter] = useState<'all' | 'available' | 'researched' | 'coming-soon'>('all');
  
  const filteredStates = states.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'available') return s.status === 'full-page';
    if (filter === 'researched') return s.status === 'researched';
    return s.status === 'coming-soon';
  });

  const availableCount = states.filter(s => s.status === 'full-page').length;
  const researchedCount = states.filter(s => s.status === 'researched').length;

  return (
    <div style={{ minHeight: '100vh', background: C.white }}>
      <style>{`
        .state-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .state-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .filter-btn { padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; border: none; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
        .filter-btn.active { background: ${C.blue}; color: white; }
        .filter-btn:not(.active) { background: ${C.lightGray}; color: ${C.gray}; }
        .filter-btn:not(.active):hover { background: #E2E8F0; }
        @media (max-width: 768px) {
          .states-grid { grid-template-columns: 1fr !important; }
          .filter-bar { flex-wrap: wrap; }
        }
      `}</style>

      {/* Header */}
      <header style={{ background: C.white, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: C.gray }}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>🔙</span>
          </Link>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 40 }} />
          </Link>
          <a href="mailto:info@beekings.com" style={{ background: C.blue, color: C.white, fontSize: 14, fontWeight: 700, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
            Contact Us
          </a>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`, padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: C.white, marginBottom: 16 }}>
            Beekeeping Tax Exemptions<br />by State
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 24 }}>
            Explore agricultural property tax programs across all 50 states
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: C.green }}>{availableCount}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>States with Calculator</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: C.green }}>{researchedCount}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>States Researched</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: C.green }}>50</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Total States</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div style={{ background: C.lightGray, padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <div className="filter-bar" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All States (50)
          </button>
          <button className={`filter-btn ${filter === 'available' ? 'active' : ''}`} onClick={() => setFilter('available')}>
            Calculator Available ({availableCount})
          </button>
          <button className={`filter-btn ${filter === 'researched' ? 'active' : ''}`} onClick={() => setFilter('researched')}>
            Research Complete ({researchedCount})
          </button>
          <button className={`filter-btn ${filter === 'coming-soon' ? 'active' : ''}`} onClick={() => setFilter('coming-soon')}>
            Coming Soon ({50 - availableCount - researchedCount})
          </button>
        </div>
      </div>

      {/* States Grid */}
      <section style={{ padding: '48px 24px' }}>
        <div className="states-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {filteredStates.map(state => {
            const badge = getStatusBadge(state.status);
            const flag = getFlagUrl(state.code);
            const isClickable = state.slug;
            
            const card = (
              <div 
                className="state-card"
                style={{ 
                  background: C.white, 
                  borderRadius: 16, 
                  padding: 24, 
                  border: '1px solid #e2e8f0',
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: state.status === 'coming-soon' ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  {flag ? (
                    <img src={flag} alt={`${state.name} flag`} style={{ width: 36, height: 24, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0' }} />
                  ) : (
                    <div style={{ width: 36, height: 24, background: C.lightGray, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.gray }}>
                      {state.code}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>{state.name}</h3>
                  </div>
                  {state.tier && (
                    <div style={{ background: state.tier === 1 ? '#DCFCE7' : state.tier === 2 ? '#FEF3C7' : '#FEE2E2', color: state.tier === 1 ? '#166534' : state.tier === 2 ? '#92400E' : '#991B1B', fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 6 }}>
                      Tier {state.tier}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 14, color: C.gray, marginBottom: 12, minHeight: 40 }}>{state.headline}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: badge.text, background: badge.bg, padding: '4px 10px', borderRadius: 6 }}>
                    {badge.label}
                  </span>
                  {isClickable && (
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.blue }}>
                      View Calculator →
                    </span>
                  )}
                </div>
              </div>
            );

            return isClickable ? (
              <Link key={state.code} href={`/${state.slug}`} style={{ textDecoration: 'none' }}>
                {card}
              </Link>
            ) : (
              <div key={state.code}>{card}</div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: C.navy, padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: C.white, marginBottom: 12 }}>
            Don&apos;t See Your State?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 24 }}>
            We&apos;re expanding quickly. Contact us to request priority research for your state.
          </p>
          <a href="mailto:info@beekings.com?subject=State%20Research%20Request" style={{ display: 'inline-block', background: C.green, color: C.navy, fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Request Your State →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: C.lightGray, padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: C.gray }}>
          © 2026 BeeKings · <a href="/" style={{ color: C.blue, textDecoration: 'none' }}>Home</a> · <a href="mailto:info@beekings.com" style={{ color: C.blue, textDecoration: 'none' }}>Contact</a>
        </p>
      </footer>
    </div>
  );
}
