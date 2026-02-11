'use client';

import Link from 'next/link';

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

export default function CaliforniaPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.white }}>
      <style>{`
        .info-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
        .info-card h3 { font-size: 18px; font-weight: 700; color: ${C.navy}; margin-bottom: 12px; }
        .info-card p, .info-card li { font-size: 15px; color: ${C.gray}; line-height: 1.7; }
        .info-card ul { padding-left: 20px; margin: 12px 0; }
        .highlight-box { background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px; padding: 16px; margin: 16px 0; }
        .highlight-box p { color: #92400E; margin: 0; }
        .link-card { display: block; background: ${C.lightGray}; border-radius: 12px; padding: 16px; text-decoration: none; margin-bottom: 12px; transition: all 0.15s; }
        .link-card:hover { background: #E2E8F0; }
        .link-card h4 { font-size: 15px; font-weight: 700; color: ${C.navy}; margin-bottom: 4px; }
        .link-card p { font-size: 13px; color: ${C.gray}; margin: 0; }
      `}</style>

      {/* Header */}
      <header style={{ background: C.white, borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/states" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: C.gray }}>
            ← All States
          </Link>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 36 }} />
          </Link>
          <a href="mailto:info@beekings.com" style={{ background: C.blue, color: C.white, fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
            Contact
          </a>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`, padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Flag_of_California.svg/80px-Flag_of_California.svg.png" 
              alt="California flag"
              style={{ height: 48, borderRadius: 6, border: '2px solid rgba(255,255,255,0.2)' }}
            />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: C.white, marginBottom: 12 }}>
            California Beekeeping<br />Agricultural Exemptions
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>
            Williamson Act & County-Level Programs
          </p>
          <div style={{ display: 'inline-block', background: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: 14, padding: '8px 16px', borderRadius: 8 }}>
            📋 Tier 3 — County-by-County Opportunities
          </div>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          
          {/* Coming Soon Banner */}
          <div style={{ background: '#EFF6FF', border: '2px solid #3B82F6', borderRadius: 16, padding: '24px', marginBottom: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 8 }}>Property Search Coming Soon</h2>
            <p style={{ fontSize: 15, color: C.gray, marginBottom: 0 }}>
              We&apos;re building California county data. Join the waitlist to be notified when your county is ready.
            </p>
          </div>

          {/* Overview */}
          <div className="info-card">
            <h3>🐝 Overview</h3>
            <p>
              California uses the <strong>Williamson Act</strong> (California Land Conservation Act of 1965) for agricultural property tax reductions. 
              Beekeeping theoretically qualifies under the broad definition of &quot;agricultural commodity,&quot; but unlike Texas or Florida, 
              there are <strong>no explicit beekeeping provisions</strong> in state law.
            </p>
            <div className="highlight-box">
              <p><strong>Key Insight:</strong> California is a county-by-county opportunity. Some counties like Sacramento have beekeeping-friendly programs with as few as 6 hives on 5 acres.</p>
            </div>
          </div>

          {/* What We Know */}
          <div className="info-card">
            <h3>📋 What We Know</h3>
            <ul>
              <li><strong>Williamson Act:</strong> 40-acre minimum for non-prime agricultural land at the state level</li>
              <li><strong>County Programs:</strong> Individual counties may have lower thresholds</li>
              <li><strong>Sacramento County:</strong> 6+ hives, register with Ag Commissioner, 5+ acres in some areas</li>
              <li><strong>Income Threshold:</strong> ~$1,000/year in some counties</li>
              <li><strong>Bee Registration:</strong> Required statewide with County Agricultural Commissioner</li>
            </ul>
          </div>

          {/* Requirements */}
          <div className="info-card">
            <h3>📝 General Requirements</h3>
            <ul>
              <li><strong>Minimum Acreage:</strong> Varies by county (5-40 acres depending on program)</li>
              <li><strong>Minimum Hives:</strong> 6+ typically for agricultural classification</li>
              <li><strong>Income:</strong> Must demonstrate commercial agricultural activity</li>
              <li><strong>Registration:</strong> All apiaries must register with county Ag Commissioner</li>
              <li><strong>Contract:</strong> Williamson Act requires 10-year contract with rollback penalties</li>
            </ul>
          </div>

          {/* Counties */}
          <div className="info-card">
            <h3>🏛️ Counties With Known Programs</h3>
            <p>These counties have documented beekeeping-friendly agricultural valuation:</p>
            <ul>
              <li><strong>Sacramento County</strong> — 6+ hives, Ag Commissioner registration</li>
              <li><strong>Placer County</strong> — Research in progress</li>
              <li><strong>El Dorado County</strong> — Research in progress</li>
              <li><strong>Sonoma County</strong> — Research in progress</li>
            </ul>
            <p style={{ marginTop: 16, fontStyle: 'italic' }}>
              We&apos;re actively researching all 58 California counties. Contact us if you have information about your county.
            </p>
          </div>

          {/* Resources */}
          <div className="info-card">
            <h3>🔗 Resources</h3>
            
            <a href="https://www.conservation.ca.gov/dlrp/lca" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>California Dept. of Conservation — Williamson Act</h4>
              <p>Official state program information and guidelines</p>
            </a>
            
            <a href="https://agcomm.saccounty.net/Programs/pages/apiary.aspx" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>Sacramento County Agricultural Commissioner — Apiary Program</h4>
              <p>County beekeeping registration and requirements</p>
            </a>
            
            <a href="https://www.beeopic-beekeeping.com/news/beekeeping-for-agriculture-land-valuation-ag-exemption/" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>Beeopic Beekeeping — CA Ag Exemption Guide</h4>
              <p>Local beekeeping company&apos;s insights on California programs</p>
            </a>
            
            <a href="https://cba.org/" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>California State Beekeepers Association</h4>
              <p>Statewide beekeeping organization and resources</p>
            </a>
          </div>

          {/* Legal References */}
          <div className="info-card">
            <h3>⚖️ Legal References</h3>
            <ul>
              <li><strong>Gov. Code § 51201</strong> — Agricultural commodity definition</li>
              <li><strong>Gov. Code § 51222</strong> — Minimum acreage requirements</li>
              <li><strong>Gov. Code § 51230</strong> — Agricultural preserve requirements</li>
              <li><strong>FAC § 29040</strong> — Bee registration requirements</li>
            </ul>
          </div>

          {/* CTA */}
          <div style={{ background: C.navy, borderRadius: 16, padding: '32px 24px', textAlign: 'center', marginTop: 32 }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 12 }}>
              Need Help With Your California Property?
            </h3>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
              We&apos;re actively researching California counties. Contact us for personalized guidance.
            </p>
            <a href="mailto:info@beekings.com?subject=California%20Beekeeping%20Exemption%20Question" style={{ display: 'inline-block', background: C.green, color: C.navy, fontWeight: 700, fontSize: 16, padding: '14px 28px', borderRadius: 10, textDecoration: 'none' }}>
              Contact Us →
            </a>
          </div>

          {/* Growing Notice */}
          <p style={{ fontSize: 13, color: C.gray, textAlign: 'center', marginTop: 32, fontStyle: 'italic' }}>
            🌱 We&apos;re always growing. This page is updated as we learn more about California programs.
            <br />Last updated: February 2026
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: C.lightGray, padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: C.gray }}>
          © 2026 BeeKings · <Link href="/" style={{ color: C.blue, textDecoration: 'none' }}>Home</Link> · <Link href="/states" style={{ color: C.blue, textDecoration: 'none' }}>All States</Link>
        </p>
      </footer>
    </div>
  );
}
