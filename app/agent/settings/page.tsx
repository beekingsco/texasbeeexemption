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
  subscription?: {
    status: 'trial' | 'active' | 'cancelled';
    stripeCustomerId?: string;
    currentPeriodEnd?: string;
  };
}

export default function AgentSettingsPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

        {/* Counties */}
        <div style={{ background: C.white, borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 20 }}>🗺️ Licensed Counties</h2>
          {agent.licensedCounties.length === 0 ? (
            <p style={{ color: C.gray, fontSize: 14 }}>No counties selected yet. Complete onboarding to add your first county.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {agent.licensedCounties.map(county => (
                <span key={county} style={{
                  display: 'inline-block', padding: '8px 16px', borderRadius: 20,
                  background: `${C.blue}10`, color: C.blue, fontSize: 13, fontWeight: 600,
                }}>
                  {county.replace('TX-', '')} County
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
