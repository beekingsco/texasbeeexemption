'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import countiesData from '@/data/texas-counties.json';

const C = {
  amber: '#F59E0B',
  navy: '#053249',
  gray: '#64748B',
  grayLight: '#F1F5F9',
  white: '#FFFFFF',
  green: '#059669',
  blue: '#1C7CE5',
  sky: '#EDF6FF',
};

interface County {
  name: string;
  region: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  logoUrl?: string;
  subdomain?: string;
  licensedCounties: string[];
}

export default function AgentOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [countySearch, setCountySearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const counties = (countiesData as County[]).map(c => c.name).sort();

  const filteredCounties = countySearch
    ? counties.filter(c => c.toLowerCase().includes(countySearch.toLowerCase()))
    : counties;

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch('/api/auth/session');
        if (resp.status === 401) { router.push('/agent/login'); return; }
        const data = await resp.json();
        setAgent(data.agent);
        // If already has counties, start at step 3
        if (data.agent.licensedCounties?.length > 0) {
          setSelectedCounty(data.agent.licensedCounties[0]?.replace('TX-', '') || '');
          setStep(3);
        }
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
        setUploadMsg('✅ Logo uploaded!');
      } else {
        setUploadMsg(`❌ ${data.error || 'Upload failed'}`);
      }
    } catch {
      setUploadMsg('❌ Upload failed');
    }
    setUploading(false);
  };

  const handleCountySave = async () => {
    if (!selectedCounty) return;
    setSaving(true);
    try {
      const resp = await fetch('/api/agent/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'county', county: selectedCounty }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setAgent(data.agent);
        setStep(3);
      }
    } catch {
      // ignore
    }
    setSaving(false);
  };

  const slug = agent?.subdomain || agent?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '';

  const copyLink = () => {
    navigator.clipboard?.writeText(`https://beeexemption.com/r/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.sky, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐝</div>
          <p style={{ color: C.gray }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div style={{ minHeight: '100vh', background: C.sky, fontFamily: 'system-ui', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 540, width: '100%', padding: '32px 24px' }}>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step >= s ? C.blue : '#e2e8f0',
              color: step >= s ? C.white : C.gray,
              fontWeight: 800, fontSize: 16,
              transition: 'all 0.3s',
            }}>
              {step > s ? '✓' : s}
            </div>
          ))}
        </div>

        {/* Step 1: Welcome + Logo */}
        {step === 1 && (
          <div style={{ background: C.white, borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <p style={{ fontSize: 48, marginBottom: 8 }}>🐝</p>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 8 }}>
              Welcome, {agent.name.split(' ')[0]}!
            </h1>
            <p style={{ color: C.gray, fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
              Let&apos;s set up your BeeExemption agent account. First, upload your logo to brand your reports and landing page.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 32 }}>
              <div style={{
                width: 120, height: 120, borderRadius: 16, background: C.grayLight,
                border: '3px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                cursor: 'pointer',
              }} onClick={() => fileRef.current?.click()}>
                {agent.logoUrl ? (
                  <img src={agent.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 32, marginBottom: 4 }}>📷</p>
                    <p style={{ fontSize: 11, color: C.gray }}>Click to upload</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              {uploading && <p style={{ fontSize: 13, color: C.gray }}>Uploading...</p>}
              {uploadMsg && <p style={{ fontSize: 13, color: uploadMsg.startsWith('✅') ? C.green : '#DC2626' }}>{uploadMsg}</p>}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  background: agent.logoUrl ? C.blue : C.grayLight,
                  color: agent.logoUrl ? C.white : C.gray,
                  fontWeight: 700, fontSize: 16, padding: '14px 32px', borderRadius: 10,
                  border: 'none', cursor: 'pointer',
                }}
              >
                {agent.logoUrl ? 'Next →' : 'Skip for Now →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select County */}
        {step === 2 && (
          <div style={{ background: C.white, borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 8, textAlign: 'center' }}>
              🗺️ Select Your County
            </h1>
            <p style={{ color: C.gray, fontSize: 15, marginBottom: 24, textAlign: 'center', lineHeight: 1.6 }}>
              Choose the Texas county you&apos;ll be serving. You can add more counties later.
            </p>

            <input
              type="text"
              value={countySearch}
              onChange={(e) => setCountySearch(e.target.value)}
              placeholder="Search counties..."
              style={{
                width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10,
                fontSize: 15, marginBottom: 16, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />

            <div style={{
              maxHeight: 280, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10,
              marginBottom: 24,
            }}>
              {filteredCounties.map(county => (
                <button
                  key={county}
                  onClick={() => { setSelectedCounty(county); setCountySearch(''); }}
                  style={{
                    width: '100%', padding: '12px 16px', border: 'none', borderBottom: '1px solid #f1f5f9',
                    background: selectedCounty === county ? `${C.blue}10` : 'transparent',
                    color: selectedCounty === county ? C.blue : C.navy,
                    fontWeight: selectedCounty === county ? 700 : 400,
                    fontSize: 14, textAlign: 'left', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {selectedCounty === county && '✓ '}{county} County
                </button>
              ))}
            </div>

            {selectedCounty && (
              <p style={{ fontSize: 14, color: C.green, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>
                ✓ Selected: {selectedCounty} County
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setStep(1)}
                style={{ background: C.grayLight, color: C.gray, fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={handleCountySave}
                disabled={!selectedCounty || saving}
                style={{
                  background: selectedCounty ? C.blue : '#e2e8f0',
                  color: selectedCounty ? C.white : C.gray,
                  fontWeight: 700, fontSize: 16, padding: '12px 32px', borderRadius: 10,
                  border: 'none', cursor: selectedCounty ? 'pointer' : 'not-allowed',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving...' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Branded Link Ready */}
        {step === 3 && (
          <div style={{ background: C.white, borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <p style={{ fontSize: 48, marginBottom: 8 }}>🎉</p>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 8 }}>
              You&apos;re All Set!
            </h1>
            <p style={{ color: C.gray, fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
              Your branded link is ready. Share it with clients and leads will automatically appear in your dashboard.
            </p>

            <div style={{
              background: `linear-gradient(135deg, ${C.navy}, #0a2540)`, borderRadius: 12, padding: 24,
              marginBottom: 24, color: C.white,
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#8DA4B5', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Your Branded Link</p>
              <div style={{
                background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <code style={{ fontSize: 15, flex: 1, wordBreak: 'break-all', fontWeight: 600 }}>
                  beeexemption.com/r/{slug}
                </code>
                <button
                  onClick={copyLink}
                  style={{
                    background: C.amber, border: 'none', color: C.white, padding: '8px 16px',
                    borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {selectedCounty && (
              <p style={{ fontSize: 14, color: C.gray, marginBottom: 24 }}>
                📍 Serving <strong style={{ color: C.navy }}>{selectedCounty} County, TX</strong>
              </p>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => router.push('/agent/dashboard')}
                style={{
                  background: C.blue, color: C.white, fontWeight: 700, fontSize: 16,
                  padding: '14px 32px', borderRadius: 10, border: 'none', cursor: 'pointer',
                }}
              >
                Go to Dashboard →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
