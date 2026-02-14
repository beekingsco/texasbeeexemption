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

export default function OregonPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.white }}>
      <style>{`
        .info-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
        .info-card h3 { font-size: 18px; font-weight: 700; color: ${C.navy}; margin-bottom: 12px; }
        .info-card p, .info-card li { font-size: 15px; color: ${C.gray}; line-height: 1.7; }
        .info-card ul { padding-left: 20px; margin: 12px 0; }
        .highlight-box { background: #DCFCE7; border: 1px solid #86EFAC; border-radius: 12px; padding: 16px; margin: 16px 0; }
        .highlight-box p { color: #166534; margin: 0; }
        .warning-box { background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px; padding: 16px; margin: 16px 0; }
        .warning-box p { color: #92400E; margin: 0; }
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
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Flag_of_Oregon.svg/80px-Flag_of_Oregon.svg.png" 
              alt="Oregon flag"
              style={{ height: 48, borderRadius: 6, border: '2px solid rgba(255,255,255,0.2)' }}
            />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: C.white, marginBottom: 12 }}>
            Oregon Beekeeping<br />Agricultural Exemptions
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>
            Exclusive Farm Use (EFU) Zone & Special Assessment
          </p>
          <div style={{ display: 'inline-block', background: '#DCFCE7', color: '#166534', fontWeight: 700, fontSize: 14, padding: '8px 16px', borderRadius: 8 }}>
            📋 Research In Progress
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
              We&apos;re building Oregon county data. Join the waitlist to be notified when your county is ready.
            </p>
          </div>

          {/* Overview */}
          <div className="info-card">
            <h3>🐝 Overview</h3>
            <p>
              Oregon has an <strong>Exclusive Farm Use (EFU)</strong> zone program and <strong>Farm Use Special Assessment</strong> 
              that provides property tax reductions for agricultural land. Oregon is known for being agriculture-friendly 
              and has a strong beekeeping community.
            </p>
            <div className="highlight-box">
              <p><strong>Oregon Advantage:</strong> Oregon has a strong agricultural heritage and generally favorable policies for small farms. The state is a major honey producer and has significant pollination needs for crops like berries and tree fruits.</p>
            </div>
          </div>

          {/* What We Know */}
          <div className="info-card">
            <h3>📋 What We&apos;re Researching</h3>
            <p>We&apos;re actively gathering information on:</p>
            <ul>
              <li>Exclusive Farm Use (EFU) zone requirements</li>
              <li>Farm Use Special Assessment criteria</li>
              <li>Whether beekeeping explicitly qualifies</li>
              <li>Minimum acreage requirements by county</li>
              <li>Income thresholds for different property sizes</li>
              <li>Application deadlines and procedures</li>
            </ul>
            <div className="warning-box">
              <p><strong>Help Us:</strong> If you&apos;re an Oregon beekeeper with experience navigating agricultural tax programs, we&apos;d love to hear from you!</p>
            </div>
          </div>

          {/* General Info */}
          <div className="info-card">
            <h3>📊 General Oregon Farm Tax Info</h3>
            <p>Based on Oregon&apos;s farm use assessment programs:</p>
            <ul>
              <li><strong>Farm Use:</strong> Land used to raise livestock, produce crops, or conduct other farming activities</li>
              <li><strong>Income Requirements:</strong> Generally need to demonstrate commercial agricultural activity</li>
              <li><strong>Special Assessment:</strong> Land assessed at farm use value rather than market value</li>
              <li><strong>36 Counties:</strong> Each county assessor administers the program</li>
            </ul>
          </div>

          {/* Key Counties */}
          <div className="info-card">
            <h3>🏛️ Key Counties</h3>
            <p>Oregon&apos;s 36 counties vary in their agricultural focus:</p>
            <ul>
              <li><strong>Marion County</strong> — Salem area, significant agriculture</li>
              <li><strong>Clackamas County</strong> — Portland metro, high property values</li>
              <li><strong>Washington County</strong> — Portland metro, suburban agriculture</li>
              <li><strong>Lane County</strong> — Eugene area</li>
              <li><strong>Jackson County</strong> — Medford, southern Oregon</li>
              <li><strong>Deschutes County</strong> — Bend area, central Oregon</li>
              <li><strong>Hood River County</strong> — Orchards, significant pollination needs</li>
            </ul>
          </div>

          {/* Beekeeping in Oregon */}
          <div className="info-card">
            <h3>🍯 Beekeeping in Oregon</h3>
            <p>Oregon has a thriving beekeeping industry:</p>
            <ul>
              <li><strong>Major Crops:</strong> Berries, apples, pears, cherries — all need pollination</li>
              <li><strong>Honey Production:</strong> Oregon produces high-quality honey from clover, blackberry, and wildflowers</li>
              <li><strong>Registration:</strong> Oregon Department of Agriculture requires apiary registration</li>
              <li><strong>Community:</strong> Oregon State Beekeepers Association is active and helpful</li>
            </ul>
          </div>

          {/* Resources */}
          <div className="info-card">
            <h3>🔗 Resources</h3>
            
            <a href="https://www.oregon.gov/dor/programs/property/pages/farm-assessment.aspx" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>Oregon Dept. of Revenue — Farm Assessment</h4>
              <p>Official state program information</p>
            </a>
            
            <a href="https://www.oregon.gov/oda/programs/ippm/pages/apiaryregistration.aspx" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>Oregon Dept. of Agriculture — Apiary Registration</h4>
              <p>State bee registration requirements</p>
            </a>
            
            <a href="https://orsba.org/" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>Oregon State Beekeepers Association</h4>
              <p>Statewide beekeeping organization and resources</p>
            </a>
            
            <a href="https://extension.oregonstate.edu/bee-health" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>OSU Extension — Bee Health</h4>
              <p>Oregon State University beekeeping resources</p>
            </a>
          </div>

          {/* CTA */}
          <div style={{ background: C.navy, borderRadius: 16, padding: '32px 24px', textAlign: 'center', marginTop: 32 }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 12 }}>
              Know Something About Oregon?
            </h3>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
              We&apos;re actively researching Oregon&apos;s programs. If you have experience or information to share, we&apos;d love to hear from you.
            </p>
            <a href="mailto:info@beekings.com?subject=Oregon%20Beekeeping%20Exemption%20Information" style={{ display: 'inline-block', background: C.green, color: C.navy, fontWeight: 700, fontSize: 16, padding: '14px 28px', borderRadius: 10, textDecoration: 'none' }}>
              Share Information →
            </a>
          </div>

          {/* Growing Notice */}
          <p style={{ fontSize: 13, color: C.gray, textAlign: 'center', marginTop: 32, fontStyle: 'italic' }}>
            🌱 We&apos;re always growing. This page is updated as we learn more about Oregon programs.
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
