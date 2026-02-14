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

export default function WashingtonPage() {
  return (
    <div style={{ minHeight: '100vh', background: C.white }}>
      <style>{`
        .info-card { background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
        .info-card h3 { font-size: 18px; font-weight: 700; color: ${C.navy}; margin-bottom: 12px; }
        .info-card p, .info-card li { font-size: 15px; color: ${C.gray}; line-height: 1.7; }
        .info-card ul { padding-left: 20px; margin: 12px 0; }
        .highlight-box { background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 12px; padding: 16px; margin: 16px 0; }
        .highlight-box p { color: #92400E; margin: 0; }
        .tier-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .tier-table th, .tier-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .tier-table th { background: ${C.lightGray}; font-weight: 700; color: ${C.navy}; }
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
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Flag_of_Washington.svg/80px-Flag_of_Washington.svg.png" 
              alt="Washington flag"
              style={{ height: 48, borderRadius: 6, border: '2px solid rgba(255,255,255,0.2)' }}
            />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: C.white, marginBottom: 12 }}>
            Washington Beekeeping<br />Agricultural Exemptions
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>
            Current Use Assessment Program (RCW 84.34)
          </p>
          <div style={{ display: 'inline-block', background: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: 14, padding: '8px 16px', borderRadius: 8 }}>
            📋 Tier 2 — Viable With County Verification
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
              We&apos;re building Washington county data. Join the waitlist to be notified when your county is ready.
            </p>
          </div>

          {/* Overview */}
          <div className="info-card">
            <h3>🐝 Overview</h3>
            <p>
              Washington State has a <strong>Current Use Assessment</strong> program under <strong>RCW Chapter 84.34</strong> that allows 
              farm and agricultural lands to be valued at current use rather than market value. Beekeeping may qualify under the 
              broad definition of &quot;livestock or agricultural commodities for commercial purposes.&quot;
            </p>
            <div className="highlight-box">
              <p><strong>Important:</strong> Beekeeping is NOT explicitly mentioned in Washington law. County assessors have discretion in accepting beekeeping as qualifying agricultural use. Contact your county assessor to confirm.</p>
            </div>
          </div>

          {/* Tax Benefits */}
          <div className="info-card">
            <h3>🎉 Washington Beekeeper Tax Benefits</h3>
            <p>
              Washington designates eligible beekeepers as <strong>&quot;farmers&quot;</strong>, providing multiple tax exemptions:
            </p>
            <ul>
              <li><strong>Sales Tax Exemption:</strong> No sales tax on bee feed and bees for eligible apiarists</li>
              <li><strong>B&O Tax Exemption:</strong> Pollination services to farmers and wholesale honey sales exempt</li>
              <li><strong>Equipment Exemption:</strong> Replacement parts and repairs for farm equipment (if $10K+ annual income)</li>
              <li><strong>Property Tax:</strong> May qualify for agricultural land valuation (5+ acres, 6+ colonies typical)</li>
            </ul>
            <div className="highlight-box">
              <p><strong>Eligible Apiarist Requirements:</strong> Own 1+ bee colonies (7,000+ workers + queen), produce honey bee products for wholesale sale, and register with WA Dept. of Agriculture.</p>
            </div>
          </div>
          
          {/* Documentation */}
          <div className="info-card">
            <h3>📄 Required Documentation</h3>
            <p>To claim exemptions, you&apos;ll need:</p>
            <ul>
              <li><strong>WSDA Registration:</strong> Register your apiary with Washington Dept. of Agriculture</li>
              <li><strong>Farmer&apos;s Certificate:</strong> Provide vendors with completed &quot;Farmers&apos; Certificate for Wholesale Purchases and Sales Tax Exemptions&quot;</li>
              <li><strong>Income Records:</strong> Document $10K+ annual income (for equipment exemptions)</li>
            </ul>
          </div>

          {/* Acreage Tiers */}
          <div className="info-card">
            <h3>📊 Acreage & Income Requirements</h3>
            <p>Washington&apos;s Current Use Assessment has tiered requirements based on property size:</p>
            
            <table className="tier-table">
              <thead>
                <tr>
                  <th>Acreage</th>
                  <th>Income Requirement</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>20+ acres</strong></td>
                  <td>No minimum income — must be devoted to agricultural production</td>
                </tr>
                <tr>
                  <td><strong>5-19.9 acres</strong></td>
                  <td>$200/acre/year gross income for 3 of past 5 years</td>
                </tr>
                <tr>
                  <td><strong>Under 5 acres</strong></td>
                  <td>$1,500/year total gross income for 3 of past 5 years</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Requirements */}
          <div className="info-card">
            <h3>📝 What You&apos;ll Need</h3>
            <ul>
              <li><strong>Commercial Intent:</strong> Must be producing for commercial purposes</li>
              <li><strong>Income Records:</strong> Be prepared to document income from honey sales or pollination services</li>
              <li><strong>Bee Registration:</strong> Register with Washington State Department of Agriculture</li>
              <li><strong>Application:</strong> File with your county assessor by December 31</li>
              <li><strong>County Approval:</strong> County assessor must approve your application</li>
            </ul>
          </div>

          {/* Rollback Warning */}
          <div className="info-card">
            <h3>⚠️ Rollback Taxes</h3>
            <p>
              If your property is removed from Current Use Assessment, you may owe <strong>back taxes plus interest</strong> for the 
              previous 7 years (or since classification began, whichever is less). This is calculated as the difference between 
              what you paid and what you would have paid at full market value.
            </p>
            <p style={{ marginTop: 12 }}>
              Plan for long-term agricultural use before applying.
            </p>
          </div>

          {/* Counties */}
          <div className="info-card">
            <h3>🏛️ County Resources</h3>
            <p>Washington has 39 counties. Each county assessor administers the Current Use program independently. Here are some key counties:</p>
            <ul>
              <li><strong>King County</strong> — Seattle metro, high property values, significant savings potential</li>
              <li><strong>Pierce County</strong> — Tacoma area</li>
              <li><strong>Snohomish County</strong> — North of Seattle</li>
              <li><strong>Spokane County</strong> — Eastern Washington</li>
              <li><strong>Clark County</strong> — Vancouver area</li>
              <li><strong>Yakima County</strong> — Agricultural heartland, likely beekeeping-friendly</li>
              <li><strong>Chelan County</strong> — Apple orchards, pollination opportunities</li>
            </ul>
          </div>

          {/* Resources */}
          <div className="info-card">
            <h3>🔗 Resources</h3>
            
            <a href="https://dor.wa.gov/taxes-rates/property-tax/current-use" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>WA Dept. of Revenue — Current Use Assessment</h4>
              <p>Official state program information</p>
            </a>
            
            <a href="https://dor.wa.gov/sites/default/files/2022-02/BeekeepersGuide.pdf" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>WA Dept. of Revenue — Beekeepers Tax Guide</h4>
              <p>Official guide on tax benefits for beekeepers (PDF)</p>
            </a>
            
            <a href="https://agr.wa.gov/departments/insects-pests-and-weeds/insects/apiary" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>WA Dept. of Agriculture — Apiary Program</h4>
              <p>State bee registration and resources</p>
            </a>
            
            <a href="https://wasba.org/" target="_blank" rel="noopener noreferrer" className="link-card">
              <h4>Washington State Beekeepers Association</h4>
              <p>Statewide beekeeping organization</p>
            </a>
          </div>

          {/* Legal References */}
          <div className="info-card">
            <h3>⚖️ Legal References</h3>
            <ul>
              <li><strong>RCW 84.34</strong> — Open Space, Agricultural, Timberlands—Current Use</li>
              <li><strong>RCW 84.34.020(2)</strong> — Farm and agricultural land definition</li>
              <li><strong>RCW 84.34.030</strong> — Application procedures</li>
              <li><strong>Senate Bill 6057 (2015)</strong> — Apiarist farmer designation for excise taxes</li>
            </ul>
          </div>

          {/* CTA */}
          <div style={{ background: C.navy, borderRadius: 16, padding: '32px 24px', textAlign: 'center', marginTop: 32 }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 12 }}>
              Need Help With Your Washington Property?
            </h3>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
              We recommend contacting your county assessor to confirm beekeeping qualifies in your county.
            </p>
            <a href="mailto:info@beekings.com?subject=Washington%20Beekeeping%20Exemption%20Question" style={{ display: 'inline-block', background: C.green, color: C.navy, fontWeight: 700, fontSize: 16, padding: '14px 28px', borderRadius: 10, textDecoration: 'none' }}>
              Contact Us →
            </a>
          </div>

          {/* Growing Notice */}
          <p style={{ fontSize: 13, color: C.gray, textAlign: 'center', marginTop: 32, fontStyle: 'italic' }}>
            🌱 We&apos;re always growing. This page is updated as we learn more about Washington programs.
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
