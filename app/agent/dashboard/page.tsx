'use client';
import { useState, useEffect } from 'react';
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
  logoUrl?: string;
  subdomain?: string;
  licensedCounties: string[];
  subscription?: {
    status: 'trial' | 'active' | 'cancelled';
    stripeCustomerId?: string;
    currentPeriodEnd?: string;
  };
}

interface Lead {
  id: string;
  propertyAddress: string;
  county: string;
  ownerName?: string;
  acres: number;
  appraisedValue: number;
  estimatedSavings: number;
  status: string;
  createdAt: string;
}

export default function AgentDashboard() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const sessionResp = await fetch('/api/auth/session');
        if (sessionResp.status === 401) {
          router.push('/agent/login');
          return;
        }
        const sessionData = await sessionResp.json();
        setAgent(sessionData.agent);

        // Fetch leads
        const leadsResp = await fetch('/api/agent/leads');
        if (leadsResp.ok) {
          const leadsData = await leadsResp.json();
          setLeads(leadsData.leads || []);
        }
      } catch {
        router.push('/agent/login');
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/session?action=logout', { method: 'POST' });
    router.push('/agent/login');
  };

  const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const now = new Date();
  const thisMonthLeads = leads.filter(l => {
    const d = new Date(l.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const statusColors: Record<string, string> = {
    new: '#3B82F6',
    contacted: C.amber,
    client: C.green,
    closed: C.gray,
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.grayLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐝</div>
          <p style={{ color: C.gray, fontSize: 16 }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!agent) return null;

  const slug = agent.subdomain || agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div style={{ minHeight: '100vh', background: C.grayLight, fontFamily: 'system-ui' }}>
      {/* Header */}
      <header style={{ background: C.navy, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🐝</span>
          <span style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>Bee<span style={{ color: C.amber }}>Exemption</span></span>
          <span style={{ color: '#8DA4B5', fontSize: 13 }}>Agent Portal</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#8DA4B5', fontSize: 13 }}>{agent.email}</span>
          <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #4a5568', color: '#8DA4B5', padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 4 }}>
            Welcome back, {agent.name.split(' ')[0]}! 👋
          </h1>
          <p style={{ color: C.gray, fontSize: 14 }}>
            {agent.brokerage} · {agent.subscription?.status === 'trial' ? '🟡 Free Trial' : agent.subscription?.status === 'active' ? '🟢 Active' : '🔴 Cancelled'}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Leads', value: leads.length.toString(), icon: '📋', color: C.blue },
            { label: 'This Month', value: thisMonthLeads.length.toString(), icon: '📅', color: C.green },
            { label: 'Total Reports', value: leads.length.toString(), icon: '📊', color: C.amber },
            { label: 'Counties', value: agent.licensedCounties.length.toString(), icon: '🗺️', color: C.navy },
          ].map(s => (
            <div key={s.label} style={{ background: C.white, borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</span>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
              </div>
              <p style={{ fontSize: 32, fontWeight: 900, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions + Branded Link */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
          <div style={{ background: C.white, borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 16 }}>⚡ Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'View All Leads', href: '/agent/leads', icon: '📋' },
                { label: 'Agent Settings', href: '/agent/settings', icon: '⚙️' },
              ].map(a => (
                <a key={a.label} href={a.href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', background: C.grayLight, borderRadius: 8,
                  textDecoration: 'none', color: C.navy, fontWeight: 600, fontSize: 14,
                  transition: 'background 0.2s',
                }}>
                  <span>{a.icon}</span> {a.label}
                </a>
              ))}
            </div>
          </div>

          <div style={{ background: `linear-gradient(135deg, ${C.navy}, #0a2540)`, borderRadius: 12, padding: 24, color: C.white }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>🔗 Your Branded Link</h3>
            <p style={{ color: '#8DA4B5', fontSize: 13, marginBottom: 16 }}>Share this link with your clients:</p>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{ fontSize: 13, flex: 1, wordBreak: 'break-all' }}>beeexemption.com/r/{slug}</code>
              <button
                onClick={() => navigator.clipboard?.writeText(`https://beeexemption.com/r/${slug}`)}
                style={{ background: C.amber, border: 'none', color: C.white, padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Recent Leads */}
        <div style={{ background: C.white, borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: 0 }}>📋 Recent Leads</h3>
            {leads.length > 0 && (
              <a href="/agent/leads" style={{ color: C.amber, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>View All →</a>
            )}
          </div>

          {leads.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 40, marginBottom: 8 }}>📭</p>
              <p style={{ color: C.gray, fontSize: 14 }}>No leads yet. Share your branded link to start generating leads!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Date', 'Address', 'County', 'Acres', 'Savings', 'Status'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: C.navy, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 10).map(lead => (
                    <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 16px', color: C.gray, whiteSpace: 'nowrap' }}>{fmtDate(lead.createdAt)}</td>
                      <td style={{ padding: '10px 16px', color: C.navy, fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.propertyAddress}</td>
                      <td style={{ padding: '10px 16px', color: C.navy }}>{lead.county}</td>
                      <td style={{ padding: '10px 16px', color: C.gray }}>{lead.acres}</td>
                      <td style={{ padding: '10px 16px', color: C.green, fontWeight: 700 }}>{fmtMoney(lead.estimatedSavings)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: `${statusColors[lead.status] || C.gray}15`,
                          color: statusColors[lead.status] || C.gray,
                        }}>
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
