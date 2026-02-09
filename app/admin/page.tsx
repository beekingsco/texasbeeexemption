'use client';

import { useState, useEffect } from 'react';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  county: string;
  acres: number | null;
  appraisedValue: number | null;
  estimatedSavings: number | null;
  source: string;
  createdAt: string;
}

const C = {
  sky: '#EDF6FF',
  blue: '#1C7CE5',
  navy: '#053249',
  green: '#57C975',
  white: '#FFFFFF',
  gray: '#6B7280',
};

interface Funnel {
  pageViews: number;
  addressSearched: number;
  resultsViewed: number;
  signupStarted: number;
  leadCaptured: number;
  guideViewed: number;
}

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);

  const fetchLeads = async (apiKey: string) => {
    setLoading(true);
    try {
      const [leadsResp, analyticsResp] = await Promise.all([
        fetch(`/api/leads?key=${encodeURIComponent(apiKey)}`),
        fetch(`/api/analytics?key=${encodeURIComponent(apiKey)}`),
      ]);
      if (leadsResp.status === 401) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      const leadsData = await leadsResp.json();
      setLeads(leadsData.leads || []);
      setTotal(leadsData.total || 0);
      if (analyticsResp.ok) {
        const analyticsData = await analyticsResp.json();
        setFunnel(analyticsData.funnel || null);
      }
      setAuthed(true);
    } catch {
      setLeads([]);
    }
    setLoading(false);
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads(key);
  };

  // Auto-check if key is in URL hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setKey(hash);
      fetchLeads(hash);
    } else {
      setLoading(false);
    }
  }, []);

  const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtDate = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: C.sky, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <form onSubmit={handleAuth} style={{ background: C.white, padding: 40, borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', maxWidth: 400, width: '100%' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 8 }}>🔐 Leads Dashboard</h1>
          <p style={{ color: C.gray, fontSize: 14, marginBottom: 24 }}>Enter the admin key to view captured leads.</p>
          <input
            type="password" value={key} onChange={(e) => setKey(e.target.value)}
            placeholder="Admin key"
            style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 16, marginBottom: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
          <button type="submit" style={{ width: '100%', padding: '14px', background: C.blue, color: C.white, fontWeight: 700, fontSize: 16, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            View Leads
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.sky, fontFamily: 'system-ui' }}>
      <header style={{ background: C.navy, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🐝</span>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.white }}>BeeKings Leads</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#8DA4B5', fontSize: 14, fontWeight: 600 }}>{total} total leads</span>
          <a href="/" style={{ color: C.blue, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>← Calculator</a>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Leads', value: total.toString(), color: C.blue },
            { label: 'Today', value: leads.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length.toString(), color: C.green },
            { label: 'Avg Savings', value: leads.length > 0 ? fmtMoney(leads.reduce((s, l) => s + (l.estimatedSavings || 0), 0) / leads.length) : '$0', color: C.blue },
            { label: 'Counties', value: new Set(leads.map(l => l.county)).size.toString(), color: C.navy },
          ].map(s => (
            <div key={s.label} style={{ background: C.white, borderRadius: 12, padding: 20, textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Funnel */}
        {funnel && (
          <div style={{ background: C.white, borderRadius: 16, padding: 24, marginBottom: 32, border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 16 }}>📊 Conversion Funnel</h2>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
              {[
                { label: 'Page Views', value: funnel.pageViews, color: '#93C5FD' },
                { label: 'Searched', value: funnel.addressSearched, color: '#60A5FA' },
                { label: 'Saw Results', value: funnel.resultsViewed, color: C.blue },
                { label: 'Started Signup', value: funnel.signupStarted, color: '#2563EB' },
                { label: 'Leads', value: funnel.leadCaptured, color: C.green },
                { label: 'Viewed Guide', value: funnel.guideViewed, color: '#059669' },
              ].map(f => {
                const max = Math.max(funnel.pageViews, 1);
                const pct = Math.max(8, (f.value / max) * 100);
                return (
                  <div key={f.label} style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: C.navy, marginBottom: 4 }}>{f.value}</p>
                    <div style={{ height: `${pct}%`, background: f.color, borderRadius: '6px 6px 0 0', minHeight: 8, transition: 'height 0.3s' }} />
                    <p style={{ fontSize: 10, fontWeight: 600, color: C.gray, marginTop: 6 }}>{f.label}</p>
                  </div>
                );
              })}
            </div>
            {funnel.pageViews > 0 && funnel.leadCaptured > 0 && (
              <p style={{ fontSize: 13, color: C.gray, marginTop: 12, textAlign: 'center' }}>
                Overall conversion: <strong style={{ color: C.navy }}>{((funnel.leadCaptured / funnel.pageViews) * 100).toFixed(1)}%</strong> of visitors → leads
              </p>
            )}
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', color: C.gray, padding: 40 }}>Loading...</p>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: C.white, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>📭</p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 8 }}>No leads yet</h2>
            <p style={{ color: C.gray, fontSize: 14 }}>Leads will appear here as visitors use the calculator and submit their info.</p>
          </div>
        ) : (
          <div style={{ background: C.white, borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #e2e8f0' }}>
                    {['Name', 'Email', 'Phone', 'Address', 'County', 'Acres', 'Savings', 'Date'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: C.navy, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map(lead => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: C.navy, whiteSpace: 'nowrap' }}>{lead.firstName} {lead.lastName}</td>
                      <td style={{ padding: '12px 16px', color: C.blue }}><a href={`mailto:${lead.email}`} style={{ color: C.blue, textDecoration: 'none' }}>{lead.email}</a></td>
                      <td style={{ padding: '12px 16px', color: C.gray }}>{lead.phone || '—'}</td>
                      <td style={{ padding: '12px 16px', color: C.gray, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.address || '—'}</td>
                      <td style={{ padding: '12px 16px', color: C.navy, fontWeight: 600 }}>{lead.county || '—'}</td>
                      <td style={{ padding: '12px 16px', color: C.navy }}>{lead.acres ? lead.acres.toFixed(1) : '—'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: C.green }}>{lead.estimatedSavings ? fmtMoney(lead.estimatedSavings) : '—'}</td>
                      <td style={{ padding: '12px 16px', color: C.gray, whiteSpace: 'nowrap' }}>{fmtDate(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
