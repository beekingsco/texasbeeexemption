'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import countiesData from '@/data/texas-counties.json';

interface County {
  name: string;
  region: string;
  cad: { name: string; website: string; phone: string };
  minAcres: number;
  minHives: number;
  additionalHivesPer: number;
  avgTaxRate: number;
  agProductivityValue: number;
  notes: string;
}

const C = {
  blue: '#1C7CE5',
  navy: '#053249',
  green: '#57C975',
  gray: '#6B7280',
};

function GuideContent() {
  const params = useSearchParams();
  const countyName = params.get('county');
  const counties = useMemo(() => countiesData as County[], []);
  const county = counties.find(c => c.name.toLowerCase() === (countyName || '').toLowerCase());

  if (!county) {
    return (
      <div style={{ padding: 60, textAlign: 'center', fontFamily: 'Georgia, serif' }}>
        <h1>County not found</h1>
        <p>Please provide a valid county name, e.g., <code>?county=Van Zandt</code></p>
      </div>
    );
  }

  const taxRate = county.avgTaxRate.toFixed(2);
  const agValue = county.agProductivityValue;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 48px', fontFamily: 'Georgia, serif', color: '#1a1a1a', lineHeight: 1.7, fontSize: 15 }}>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          h1, h2, h3 { page-break-after: avoid; }
          .page-break { page-break-before: always; }
        }
        h1 { font-size: 32px; color: ${C.navy}; margin-bottom: 4px; }
        h2 { font-size: 22px; color: ${C.blue}; border-bottom: 2px solid ${C.blue}; padding-bottom: 8px; margin-top: 40px; }
        h3 { font-size: 17px; color: ${C.navy}; margin-top: 28px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 10px 14px; border: 1px solid #ddd; text-align: left; font-size: 14px; }
        th { background: #f3f7fb; font-weight: 700; color: ${C.navy}; }
        ul, ol { padding-left: 24px; }
        li { margin-bottom: 6px; }
        .highlight { background: #f0fdf4; border-left: 4px solid ${C.green}; padding: 16px 20px; border-radius: 4px; margin: 16px 0; }
        .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 4px; margin: 16px 0; }
        .checklist { list-style: none; padding-left: 0; }
        .checklist li:before { content: "☐ "; font-size: 16px; }
      `}</style>

      {/* Print button */}
      <div className="no-print" style={{ position: 'fixed', top: 20, right: 20, zIndex: 100 }}>
        <button onClick={() => window.print()} style={{ background: C.blue, color: 'white', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontFamily: 'system-ui' }}>
          🖨️ Save as PDF
        </button>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 48, marginBottom: 16 }} />
        <h1>{county.name} County</h1>
        <h1 style={{ fontSize: 24, color: C.blue, marginTop: 0 }}>Agricultural Exemption Guide</h1>
        <p style={{ color: C.gray, fontSize: 14 }}>Your Complete Guide to Beekeeping Tax Savings in {county.name} County, Texas</p>
        <p style={{ color: C.gray, fontSize: 13 }}>Prepared by BeeKings · beekings.com · Canton, Texas</p>
      </div>

      <hr style={{ border: 'none', borderTop: '2px solid #e2e8f0', margin: '32px 0' }} />

      <h2>Understanding the Agricultural Valuation</h2>

      <h3>What It Actually Is</h3>
      <p>
        The &ldquo;ag exemption&rdquo; is technically an <strong>agricultural appraisal</strong> under Texas Tax Code Chapter 23, Subchapter D (also called &ldquo;1-d-1 open-space appraisal&rdquo;). Instead of taxing your land at market value, the county appraises it at its <strong>productivity value</strong> — what the land produces agriculturally.
      </p>

      <h3>Why It Matters</h3>
      <p>
        For most properties in {county.name} County, this reduces the taxable value of your <strong>land</strong> by <strong>90-98%</strong>. Your home and immediate surrounding area (typically 1 acre) remain at market value, but all qualifying acreage gets the dramatically reduced rate.
      </p>

      <div className="highlight">
        <strong>💡 The Numbers for {county.name} County</strong>
        <ul>
          <li><strong>Average tax rate:</strong> {taxRate}%</li>
          <li><strong>Agricultural productivity value:</strong> ~${agValue}/acre</li>
          <li><strong>Typical market value of land:</strong> $5,000–$25,000/acre</li>
          <li><strong>Potential tax reduction:</strong> 80-95% on qualifying acreage</li>
        </ul>
      </div>

      <h2>{county.name} County Beekeeping Requirements</h2>

      <table>
        <thead>
          <tr><th>Requirement</th><th>Details</th></tr>
        </thead>
        <tbody>
          <tr><td>Minimum acreage</td><td><strong>{county.minAcres} acres</strong></td></tr>
          <tr><td>Minimum hives</td><td><strong>{county.minHives} active bee colonies</strong></td></tr>
          <tr><td>Additional hives</td><td>1 hive per {county.additionalHivesPer} additional acres</td></tr>
          <tr><td>Agricultural history</td><td>5 of preceding 7 tax years of qualifying use</td></tr>
          <tr><td>Region</td><td>{county.region}</td></tr>
        </tbody>
      </table>

      <h3>Your County&apos;s Appraisal District</h3>
      <table>
        <tbody>
          <tr><td><strong>Name</strong></td><td>{county.cad.name}</td></tr>
          <tr><td><strong>Website</strong></td><td><a href={county.cad.website} target="_blank" rel="noopener noreferrer">{county.cad.website}</a></td></tr>
          <tr><td><strong>Phone</strong></td><td>{county.cad.phone}</td></tr>
        </tbody>
      </table>

      <h3>What Counts as an &ldquo;Active Colony&rdquo;</h3>
      <p>Per Texas Comptroller guidelines, each colony must:</p>
      <ul>
        <li>Have a queen bee</li>
        <li>Have worker bees actively maintaining the hive</li>
        <li>Be located on the qualifying property</li>
        <li>Show evidence of management and maintenance</li>
      </ul>

      {county.notes && (
        <div className="highlight">
          <strong>📋 {county.name} County Notes:</strong> {county.notes}
        </div>
      )}

      <div className="page-break" />

      <h2>Step-by-Step Application Process</h2>

      <h3>Step 1: Prepare Your Property (Months 1–3)</h3>
      <ul className="checklist">
        <li>Identify your ag-eligible acreage (total property minus homestead)</li>
        <li>Ensure proper hive placement (accessible, good sun exposure, water source nearby)</li>
        <li>Set up {county.minHives} or more active bee colonies</li>
        <li>Begin keeping a <strong>hive management log</strong> (inspections, treatments, honey harvests)</li>
      </ul>

      <h3>Step 2: Document Everything (Ongoing)</h3>
      <p>Keep records of:</p>
      <ul className="checklist">
        <li>Purchase receipts for hives, bees, and equipment</li>
        <li>Hive inspection dates and observations</li>
        <li>Honey production records (even small amounts count)</li>
        <li>Any hive treatments or management activities</li>
        <li>Photos of your hives (quarterly recommended)</li>
      </ul>

      <h3>Step 3: Apply to {county.cad.name} (Before April 30)</h3>
      <ul className="checklist">
        <li>Obtain the <strong>1-D-1 Agricultural Use Application</strong> from {county.cad.website}</li>
        <li>Complete all sections, marking &ldquo;Beekeeping&rdquo; as your agricultural use</li>
        <li>Attach your management log and documentation</li>
        <li>Submit by <strong>April 30</strong> for the current tax year</li>
      </ul>

      <h3>Step 4: Property Inspection (If Required)</h3>
      <ul>
        <li>The CAD may send an appraiser to verify your operation</li>
        <li>Ensure hives are visible and appear actively managed</li>
        <li>Have your management log available to show</li>
        <li>Be prepared to answer questions about your beekeeping activities</li>
      </ul>

      <h3>Step 5: Receive Your New Appraisal (Mid-Year)</h3>
      <ul>
        <li>Review your new appraised value showing the ag valuation</li>
        <li>Verify the productivity value was applied to qualifying acreage</li>
        <li>If denied, you have the right to protest to the Appraisal Review Board</li>
      </ul>

      <h2>Important Deadlines</h2>
      <table>
        <thead>
          <tr><th>Deadline</th><th>Action</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>January 1</strong></td><td>Ownership and property status determined for the year</td></tr>
          <tr><td><strong>April 30</strong></td><td>Deadline to file ag exemption application</td></tr>
          <tr><td><strong>May 15</strong></td><td>Deadline to file renditions and property reports</td></tr>
          <tr><td><strong>June–July</strong></td><td>Appraisal Review Board hearings (if protesting)</td></tr>
          <tr><td><strong>October–January</strong></td><td>Tax bills mailed; due by January 31</td></tr>
        </tbody>
      </table>

      <div className="warning">
        <strong>⚠️ Rollback Taxes Warning</strong>
        <p>
          If you stop qualifying for the ag exemption after receiving it, the county can assess <strong>rollback taxes</strong> for up to 5 years. Rollback taxes are the difference between what you paid with the ag valuation and what you would have paid at market value, <strong>plus 7% interest per year</strong>.
        </p>
        <p><strong>How to avoid rollback taxes:</strong></p>
        <ul>
          <li>Maintain your beekeeping operation consistently</li>
          <li>Keep at least the minimum number of hives active</li>
          <li>Document your agricultural use every year</li>
          <li>Don&apos;t let hives go empty or abandoned</li>
        </ul>
      </div>

      <h2>Why Beekeeping?</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, margin: '16px 0' }}>
        <div>
          <h3>🕐 Low Maintenance</h3>
          <ul>
            <li>15–30 minutes per hive per month</li>
            <li>Less labor than cattle or hay</li>
            <li>No daily feeding required</li>
          </ul>
        </div>
        <div>
          <h3>💰 Low Cost</h3>
          <ul>
            <li>Initial setup: $250–$500/hive</li>
            <li>Annual maintenance: ~$100/hive</li>
            <li>ROI from tax savings: 500–2,000%+</li>
          </ul>
        </div>
        <div>
          <h3>🌿 Good for the Environment</h3>
          <ul>
            <li>Pollinates local plants and crops</li>
            <li>Supports bee populations</li>
            <li>Produces honey and beeswax</li>
          </ul>
        </div>
        <div>
          <h3>🍯 Bonus: You Get Honey!</h3>
          <ul>
            <li>30–60 lbs per hive per year</li>
            <li>TX wildflower honey: $10–$15/lb</li>
            <li>Beeswax products add value</li>
          </ul>
        </div>
      </div>

      <h2>BeeKings Can Help</h2>
      <div className="highlight">
        <h3 style={{ marginTop: 0 }}>What We Provide</h3>
        <ul>
          <li><strong>Hives & Bees</strong> — Complete setup delivered and installed</li>
          <li><strong>Equipment</strong> — Suit, smoker, hive tool, and everything you need</li>
          <li><strong>Training</strong> — Hands-on instruction for confident beekeeping</li>
          <li><strong>Ongoing Support</strong> — We&apos;re always a call or text away</li>
          <li><strong>Application Help</strong> — Guidance on your county paperwork</li>
        </ul>
        <p style={{ marginBottom: 0 }}>
          <strong>Get started:</strong> beekings.com · info@beekings.com · Canton, Texas
        </p>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '40px 0 16px' }} />
      <p style={{ fontSize: 11, color: '#999', lineHeight: 1.5 }}>
        <strong>Disclaimer:</strong> This guide is for informational purposes only and does not constitute tax or legal advice. Property tax regulations vary by county and change periodically. Consult with your county appraisal district and/or a qualified tax professional for advice specific to your situation.
      </p>
      <p style={{ fontSize: 11, color: '#999', textAlign: 'center' }}>
        © 2026 BeeKings. All rights reserved. Prepared with data from {county.cad.name} and the Texas Comptroller of Public Accounts.
      </p>
    </div>
  );
}

export default function GuidePage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center' }}>Loading guide...</div>}>
      <GuideContent />
    </Suspense>
  );
}
