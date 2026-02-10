'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  amber: '#F59E0B',
  amberDark: '#D97706',
  navy: '#053249',
  gray: '#64748B',
  grayLight: '#F1F5F9',
  white: '#FFFFFF',
  green: '#059669',
  blue: '#1C7CE5',
  sky: '#EDF6FF',
  red: '#DC2626',
};

const TX_COUNTIES = [
  'Anderson', 'Angelina', 'Bell', 'Bexar', 'Bowie', 'Brazoria', 'Brazos',
  'Cameron', 'Cherokee', 'Collin', 'Comal', 'Dallas', 'Denton', 'Ector',
  'Ellis', 'El Paso', 'Fort Bend', 'Galveston', 'Grayson', 'Gregg',
  'Guadalupe', 'Harris', 'Hays', 'Henderson', 'Hidalgo', 'Hood', 'Hunt',
  'Jefferson', 'Johnson', 'Kaufman', 'Lubbock', 'McLennan', 'Midland',
  'Montgomery', 'Navarro', 'Nueces', 'Parker', 'Potter', 'Rockwall',
  'Smith', 'Tarrant', 'Taylor', 'Tom Green', 'Travis', 'Van Zandt',
  'Victoria', 'Webb', 'Wichita', 'Williamson', 'Wise',
];

interface Agent {
  id: string;
  email: string;
  name: string;
  brokerage: string;
  phone: string;
  licenseNumber: string;
  logoUrl?: string;
  subdomain?: string;
  licensedCounties: string[];
  lastCountyChange?: string;
  subscription?: {
    status: 'trial' | 'active' | 'cancelled';
    stripeCustomerId?: string;
    currentPeriodEnd?: string;
  };
}

interface Invoice {
  id: string;
  date: number;
  description: string;
  amount: string;
  status: string;
  invoiceUrl: string | null;
}

export default function AgentSettingsPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // County management state
  const [changingCounty, setChangingCounty] = useState<string | null>(null);
  const [addingCounty, setAddingCounty] = useState(false);
  const [countyLoading, setCountyLoading] = useState(false);

  // Billing history state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  // Cancel subscription state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch('/api/auth/session');
        if (resp.status === 401) { router.push('/agent/login'); return; }
        const data = await resp.json();
        setAgent(data.agent);
      } catch {
        router.push('/agent/login');
      }
      setLoading(false);
    }
    load();
  }, [router]);

  // Fetch billing history
  useEffect(() => {
    async function loadInvoices() {
      try {
        const resp = await fetch('/api/agent/billing-history');
        if (resp.ok) {
          const data = await resp.json();
          setInvoices(data.invoices || []);
        }
      } catch {
        // silently fail
      }
      setInvoicesLoading(false);
    }
    if (!loading && agent) {
      loadInvoices();
    }
  }, [loading, agent]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg('');
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const resp = await fetch('/api/agent/logo', { method: 'POST', body: formData });
      const data = await resp.json();
      if (resp.ok) {
        setAgent(prev => prev ? { ...prev, logoUrl: data.logoUrl } : prev);
        setUploadMsg('✅ Logo updated!');
      } else {
        setUploadMsg(`❌ ${data.error || 'Upload failed'}`);
      }
    } catch {
      setUploadMsg('❌ Upload failed');
    }
    setUploading(false);
  };

  const handleLogoRemove = async () => {
    if (!confirm('Remove your logo? The default bee icon will be shown instead.')) return;
    try {
      const resp = await fetch('/api/agent/logo', { method: 'DELETE' });
      if (resp.ok) {
        setAgent(prev => prev ? { ...prev, logoUrl: undefined } : prev);
        setUploadMsg('✅ Logo removed');
      }
    } catch {
      setUploadMsg('❌ Failed to remove logo');
    }
  };

  const copyLink = () => {
    const slug = agent?.subdomain || agent?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    navigator.clipboard?.writeText(`https://beeexemption.com/r/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBillingPortal = async () => {
    if (!agent?.subscription?.stripeCustomerId) {
      alert('No billing account linked. Contact support.');
      return;
    }
    try {
      const resp = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: agent.subscription.stripeCustomerId }),
      });
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Could not open billing portal. Contact support.');
      }
    } catch {
      alert('Error opening billing portal.');
    }
  };

  const canChangeCounty = (): { allowed: boolean; nextDate?: string } => {
    if (!agent?.lastCountyChange) return { allowed: true };
    const lastChange = new Date(agent.lastCountyChange);
    const thirtyDaysLater = new Date(lastChange.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (new Date() < thirtyDaysLater) {
      return {
        allowed: false,
        nextDate: thirtyDaysLater.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      };
    }
    return { allowed: true };
  };

  const handleCountyChange = async (oldCounty: string, newCounty: string) => {
    setCountyLoading(true);
    try {
      const resp = await fetch('/api/agent/county-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldCounty, newCounty }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setAgent(prev => prev ? { ...prev, licensedCounties: data.counties, lastCountyChange: new Date().toISOString() } : prev);
        setChangingCounty(null);
      } else {
        alert(data.error || 'County change failed');
      }
    } catch {
      alert('County change failed');
    }
    setCountyLoading(false);
  };

  const handleCountyAdd = async (county: string) => {
    // Redirect to Stripe checkout for county add-on
    setCountyLoading(true);
    try {
      const resp = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'county_addon', county }),
      });
      const data = await resp.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Could not start checkout. Contact support.');
      }
    } catch {
      alert('Checkout failed');
    }
    setCountyLoading(false);
    setAddingCounty(false);
  };

  const handleCountyRemove = async (county: string) => {
    if (!confirm(`Remove ${county.replace('TX-', '')} County? This takes effect at your next renewal.`)) return;
    setCountyLoading(true);
    try {
      const resp = await fetch('/api/agent/county-remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ county }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setAgent(prev => prev ? { ...prev, licensedCounties: data.counties } : prev);
      } else {
        alert(data.error || 'County removal failed');
      }
    } catch {
      alert('County removal failed');
    }
    setCountyLoading(false);
  };

  // Get available counties (not already licensed)
  const getAvailableCounties = () => {
    if (!agent) return TX_COUNTIES;
    const licensed = new Set(agent.licensedCounties.map(c => c.replace('TX-', '')));
    return TX_COUNTIES.filter(c => !licensed.has(c));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.grayLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐝</div>
          <p style={{ color: C.gray, fontSize: 16 }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!agent) return null;

  const slug = agent.subdomain || agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const statusLabel = agent.subscription?.status === 'trial' ? '🟡 Free Trial' : agent.subscription?.status === 'active' ? '🟢 Active' : '🔴 Cancelled';
  const statusColor = agent.subscription?.status === 'trial' ? C.amber : agent.subscription?.status === 'active' ? C.green : C.red;
  const changeCheck = canChangeCounty();

  return (
    <div style={{ minHeight: '100vh', background: C.grayLight, fontFamily: 'system-ui' }}>
      {/* Header */}
      <header style={{ background: C.navy, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/agent/dashboard" style={{ color: '#8DA4B5', textDecoration: 'none', fontSize: 13 }}>← Dashboard</a>
          <span style={{ color: '#4a5568' }}>|</span>
          <span style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>⚙️ Settings</span>
        </div>
        <span style={{ color: '#8DA4B5', fontSize: 13 }}>{agent.email}</span>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 32 }}>Account Settings</h1>

        {/* Profile Section */}
        <div style={{ background: C.white, borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 20 }}>👤 Profile</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Name', value: agent.name },
              { label: 'Email', value: agent.email },
              { label: 'Brokerage', value: agent.brokerage },
              { label: 'Phone', value: agent.phone },
              { label: 'License #', value: agent.licenseNumber },
            ].map(f => (
              <div key={f.label}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{f.label}</p>
                <p style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>{f.value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Logo Section */}
        <div style={{ background: C.white, borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 20 }}>🖼️ Logo</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: 12, background: C.grayLight, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {agent.logoUrl ? (
                <img src={agent.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 32 }}>🐝</span>
              )}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    background: C.blue, color: C.white, fontWeight: 700, fontSize: 14,
                    padding: '10px 20px', borderRadius: 8, border: 'none', cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? 0.6 : 1,
                  }}
                >
                  {uploading ? 'Uploading...' : agent.logoUrl ? 'Change Logo' : 'Upload Logo'}
                </button>
                {agent.logoUrl && (
                  <button
                    onClick={handleLogoRemove}
                    style={{
                      background: 'none', border: 'none', color: C.red, fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', padding: '4px 8px',
                    }}
                  >
                    Remove Logo
                  </button>
                )}
              </div>
              <p style={{ fontSize: 12, color: C.gray, marginTop: 6 }}>PNG, JPEG, or WebP. Max 2MB.</p>
              {uploadMsg && <p style={{ fontSize: 13, marginTop: 4, color: uploadMsg.startsWith('✅') ? C.green : C.red }}>{uploadMsg}</p>}
            </div>
          </div>
        </div>

        {/* Branded Link */}
        <div style={{ background: `linear-gradient(135deg, ${C.navy}, #0a2540)`, borderRadius: 12, padding: 24, marginBottom: 24, color: C.white }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>🔗 Your Branded Link</h2>
          <p style={{ color: '#8DA4B5', fontSize: 13, marginBottom: 16 }}>Share this with your clients. When they use the calculator through your link, leads are automatically attributed to you.</p>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ fontSize: 14, flex: 1, wordBreak: 'break-all' }}>beeexemption.com/r/{slug}</code>
            <button
              onClick={copyLink}
              style={{ background: C.amber, border: 'none', color: C.white, padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Subscription */}
        <div style={{ background: C.white, borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 20 }}>💳 Subscription</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Status</p>
              <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: `${statusColor}15`, color: statusColor }}>
                {statusLabel}
              </span>
            </div>
            {agent.subscription?.currentPeriodEnd && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Current Period Ends</p>
                <p style={{ fontSize: 14, color: C.navy, fontWeight: 600 }}>
                  {new Date(agent.subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleBillingPortal}
            style={{
              background: C.grayLight, color: C.navy, fontWeight: 700, fontSize: 14,
              padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer',
            }}
          >
            Manage Billing →
          </button>
        </div>

        {/* Billing History */}
        <div style={{ background: C.white, borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 20 }}>📄 Billing History</h2>
          {invoicesLoading ? (
            <p style={{ color: C.gray, fontSize: 14 }}>Loading invoices...</p>
          ) : invoices.length === 0 ? (
            <p style={{ color: C.gray, fontSize: 14 }}>No invoices yet — your first invoice will appear after your trial ends.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: C.gray, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', color: C.gray, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Description</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', color: C.gray, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Amount</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px', color: C.gray, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => {
                      const statusBg = inv.status === 'paid' ? '#ECFDF5' : inv.status === 'open' ? '#FFFBEB' : '#F9FAFB';
                      const statusFg = inv.status === 'paid' ? C.green : inv.status === 'open' ? C.amber : C.gray;
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', color: C.navy, fontWeight: 500 }}>
                            {new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '10px 12px', color: C.navy }}>{inv.description}</td>
                          <td style={{ padding: '10px 12px', color: C.navy, fontWeight: 600, textAlign: 'right' }}>${inv.amount}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                              fontSize: 12, fontWeight: 600, background: statusBg, color: statusFg,
                            }}>
                              {inv.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            {inv.invoiceUrl && (
                              <a
                                href={inv.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: C.blue, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                              >
                                View Invoice
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <button
                  onClick={handleBillingPortal}
                  style={{
                    background: 'none', border: 'none', color: C.blue, fontSize: 14,
                    fontWeight: 600, cursor: 'pointer', padding: 0,
                  }}
                >
                  View All in Stripe →
                </button>
              </div>
            </>
          )}
        </div>

        {/* Counties */}
        <div style={{ background: C.white, borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 20 }}>🗺️ Licensed Counties</h2>
          {agent.licensedCounties.length === 0 ? (
            <p style={{ color: C.gray, fontSize: 14 }}>No counties selected yet. Complete onboarding to add your first county.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {agent.licensedCounties.map(county => {
                const displayName = county.replace('TX-', '');
                const isChanging = changingCounty === county;
                return (
                  <div key={county} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      display: 'inline-block', padding: '8px 16px', borderRadius: 20,
                      background: `${C.blue}10`, color: C.blue, fontSize: 13, fontWeight: 600,
                    }}>
                      {displayName} County
                    </span>

                    {/* Change County */}
                    {!isChanging ? (
                      <button
                        onClick={() => setChangingCounty(county)}
                        disabled={!changeCheck.allowed || countyLoading}
                        title={!changeCheck.allowed ? `Next change: ${changeCheck.nextDate}` : 'Change this county'}
                        style={{
                          background: 'none', border: '1px solid #e2e8f0', color: changeCheck.allowed ? C.navy : C.gray,
                          fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6,
                          cursor: changeCheck.allowed && !countyLoading ? 'pointer' : 'not-allowed',
                          opacity: changeCheck.allowed ? 1 : 0.5,
                        }}
                      >
                        Change
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <select
                          onChange={(e) => {
                            if (e.target.value) handleCountyChange(county, `TX-${e.target.value}`);
                          }}
                          defaultValue=""
                          disabled={countyLoading}
                          style={{
                            fontSize: 13, padding: '5px 8px', borderRadius: 6,
                            border: '1px solid #e2e8f0', color: C.navy, cursor: 'pointer',
                          }}
                        >
                          <option value="" disabled>Select county...</option>
                          {getAvailableCounties().map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setChangingCounty(null)}
                          style={{
                            background: 'none', border: 'none', color: C.gray,
                            fontSize: 13, cursor: 'pointer', padding: '4px',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Remove County (only if more than 1) */}
                    {agent.licensedCounties.length > 1 && !isChanging && (
                      <button
                        onClick={() => handleCountyRemove(county)}
                        disabled={countyLoading}
                        title={`Remove ${displayName} County`}
                        style={{
                          background: 'none', border: 'none', color: C.gray,
                          fontSize: 14, cursor: countyLoading ? 'not-allowed' : 'pointer',
                          padding: '2px 6px', lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add County */}
          <div style={{ marginTop: 16 }}>
            {!addingCounty ? (
              <button
                onClick={() => setAddingCounty(true)}
                disabled={countyLoading}
                style={{
                  background: C.grayLight, color: C.navy, fontWeight: 600, fontSize: 13,
                  padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0',
                  cursor: countyLoading ? 'not-allowed' : 'pointer',
                }}
              >
                + Add County
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  onChange={(e) => {
                    if (e.target.value) handleCountyAdd(e.target.value);
                  }}
                  defaultValue=""
                  disabled={countyLoading}
                  style={{
                    fontSize: 13, padding: '8px 12px', borderRadius: 6,
                    border: '1px solid #e2e8f0', color: C.navy, cursor: 'pointer',
                  }}
                >
                  <option value="" disabled>Select county to add...</option>
                  {getAvailableCounties().map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => setAddingCounty(false)}
                  style={{
                    background: 'none', border: 'none', color: C.gray,
                    fontSize: 14, cursor: 'pointer', padding: '4px',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            <p style={{ fontSize: 12, color: C.gray, marginTop: 8 }}>
              Adding a county starts a new $97/yr subscription for that county.
              {!changeCheck.allowed && (
                <span style={{ display: 'block', marginTop: 4, color: C.amber }}>
                  ⏳ County changes available after {changeCheck.nextDate}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Cancel Subscription */}
        <div style={{
          background: '#FFF5F5', borderRadius: 12, padding: 24,
          border: '1px solid #FEE2E2', marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Cancel Subscription</h2>
          <p style={{ color: C.gray, fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
            If you cancel, your account stays active until{' '}
            {agent.subscription?.currentPeriodEnd
              ? new Date(agent.subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : 'the end of your current period'
            }.
            {' '}After that, your branded link and lead notifications will stop.
          </p>

          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              style={{
                background: 'none', color: C.red, fontWeight: 700, fontSize: 14,
                padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.red}`,
                cursor: 'pointer',
              }}
            >
              Cancel Subscription
            </button>
          ) : (
            <div>
              <p style={{ color: C.red, fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
                Are you sure? This can&apos;t be undone.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleBillingPortal}
                  style={{
                    background: C.red, color: C.white, fontWeight: 700, fontSize: 14,
                    padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  }}
                >
                  Yes, Cancel
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  style={{
                    background: C.grayLight, color: C.gray, fontWeight: 700, fontSize: 14,
                    padding: '10px 20px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer',
                  }}
                >
                  Never mind
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
