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

interface AgentInfo {
  id: string;
  name: string;
  email: string;
  brokerage: string;
  licensedCounties: string[];
  logoUrl?: string;
  subscription?: {
    status: 'trial' | 'active' | 'cancelled';
    stripeCustomerId?: string;
    currentPeriodEnd?: string;
  };
  leadsCount?: number;
}

interface AgentLead {
  id: string;
  propertyAddress: string;
  county: string;
  ownerName?: string;
  acres: number;
  estimatedSavings: number;
  status: string;
  createdAt: string;
}

const C = {
  sky: '#EDF6FF',
  blue: '#1C7CE5',
  navy: '#053249',
  green: '#57C975',
  white: '#FFFFFF',
  gray: '#6B7280',
  amber: '#F59E0B',
  red: '#DC2626',
};

interface Funnel {
  pageViews: number;
  addressSearched: number;
  resultsViewed: number;
  signupStarted: number;
  leadCaptured: number;
  guideViewed: number;
}

interface AnalyticsEvent {
  event: string;
  county?: string;
  savings?: number;
  step?: string;
  address?: string;
  timestamp: string;
}

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<'leads' | 'agents' | 'revenue' | 'activity'>('leads');
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [agentLeads, setAgentLeads] = useState<Record<string, AgentLead[]>>({});
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);

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
        // Extract recent events for activity feed
        if (analyticsData.recentEvents) {
          setRecentEvents(analyticsData.recentEvents);
        }
      }

      // Fetch agents
      try {
        const agentsResp = await fetch(`/api/admin/agents?key=${encodeURIComponent(apiKey)}`);
        if (agentsResp.ok) {
          const agentsData = await agentsResp.json();
          setAgents(agentsData.agents || []);
        }
      } catch { /* ignore */ }

      setAuthed(true);
    } catch {
      setLeads([]);
    }
    setLoading(false);
  };

  const fetchAgentLeads = async (agentId: string) => {
    if (agentLeads[agentId]) return; // already loaded
    try {
      const resp = await fetch(`/api/admin/agents?key=${encodeURIComponent(key)}&agentId=${agentId}`);
      if (resp.ok) {
        const data = await resp.json();
        setAgentLeads(prev => ({ ...prev, [agentId]: data.leads || [] }));
      }
    } catch { /* ignore */ }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads(key);
  };

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setKey(hash);
      fetchLeads(hash);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtDate = (d: string) => new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  // Revenue calculations
  const reportSales = leads.filter(l => l.source === 'report' || l.source === 'calculator').length;
  const singleRevenue = reportSales * 1499; // $14.99 per report in cents
  const activeUnlimited = 0; // Would come from Stripe data
  const unlimitedMRR = activeUnlimited * 2999;
  const trialAgents = agents.filter(a => a.subscription?.status === 'trial').length;
  const activeAgents = agents.filter(a => a.subscription?.status === 'active').length;
  const agentRevenue = activeAgents * 29700; // $297/yr per agent

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: C.sky, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <form onSubmit={handleAuth} style={{ background: C.white, padding: 40, borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', maxWidth: 400, width: '100%' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 8 }}>🔐 Admin Dashboard</h1>
          <p style={{ color: C.gray, fontSize: 14, marginBottom: 24 }}>Enter the admin key to view the dashboard.</p>
          <input
            type="password" value={key} onChange={(e) => setKey(e.target.value)}
            placeholder="Admin key"
            style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 16, marginBottom: 16, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
          <button type="submit" style={{ width: '100%', padding: '14px', background: C.blue, color: C.white, fontWeight: 700, fontSize: 16, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            View Dashboard
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
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.white }}>BeeExemption Admin</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#8DA4B5', fontSize: 14, fontWeight: 600 }}>{total} leads · {agents.length} agents</span>
          <a href="/" style={{ color: C.blue, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>← Calculator</a>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Leads', value: total.toString(), color: C.blue },
            { label: 'Today', value: leads.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length.toString(), color: C.green },
            { label: 'Agents', value: agents.length.toString(), color: C.amber },
            { label: 'Active Agents', value: activeAgents.toString(), color: C.green },
            { label: 'Trial Agents', value: trialAgents.toString(), color: C.amber },
          ].map(s => (
            <div key={s.label} style={{ background: C.white, borderRadius: 12, padding: 20, textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: C.white, borderRadius: 12, padding: 4, border: '1px solid #e2e8f0' }}>
          {[
            { key: 'leads' as const, label: '📋 Leads', count: total },
            { key: 'agents' as const, label: '🐝 Agents', count: agents.length },
            { key: 'revenue' as const, label: '💰 Revenue' },
            { key: 'activity' as const, label: '📊 Activity' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
                background: activeTab === tab.key ? C.navy : 'transparent',
                color: activeTab === tab.key ? C.white : C.gray,
                fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {tab.label} {tab.count !== undefined ? `(${tab.count})` : ''}
            </button>
          ))}
        </div>

        {/* Funnel (always shown) */}
        {funnel && (
          <div style={{ background: C.white, borderRadius: 16, padding: 24, marginBottom: 24, border: '1px solid #e2e8f0' }}>
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

        {/* LEADS TAB */}
        {activeTab === 'leads' && (
          <>
            {loading ? (
              <p style={{ textAlign: 'center', color: C.gray, padding: 40 }}>Loading...</p>
            ) : leads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60, background: C.white, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>📭</p>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 8 }}>No leads yet</h2>
                <p style={{ color: C.gray, fontSize: 14 }}>Leads will appear here as visitors use the calculator.</p>
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
          </>
        )}

        {/* AGENTS TAB */}
        {activeTab === 'agents' && (
          <div style={{ background: C.white, borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: 0 }}>🐝 Agent Management</h2>
              <span style={{ fontSize: 13, color: C.gray }}>{agents.length} agents total</span>
            </div>
            {agents.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 40, marginBottom: 8 }}>🐝</p>
                <p style={{ color: C.gray, fontSize: 14 }}>No agents registered yet.</p>
              </div>
            ) : (
              <div>
                {agents.map(agent => {
                  const statusColor = agent.subscription?.status === 'trial' ? C.amber : agent.subscription?.status === 'active' ? C.green : C.red;
                  const statusLabel = agent.subscription?.status || 'unknown';
                  const isExpanded = expandedAgent === agent.id;
                  return (
                    <div key={agent.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <div
                        onClick={() => {
                          setExpandedAgent(isExpanded ? null : agent.id);
                          if (!isExpanded) fetchAgentLeads(agent.id);
                        }}
                        style={{
                          padding: '16px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
                          background: isExpanded ? '#FAFBFC' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 8, background: C.sky,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                        }}>
                          {agent.logoUrl ? (
                            <img src={agent.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <span style={{ fontSize: 20 }}>🐝</span>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 2 }}>{agent.name}</p>
                          <p style={{ fontSize: 12, color: C.gray }}>{agent.email} · {agent.brokerage}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 12, color: C.gray }}>{agent.licensedCounties?.map(c => c.replace('TX-', '')).join(', ') || 'No counties'}</span>
                          <span style={{
                            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                            textTransform: 'uppercase', background: `${statusColor}15`, color: statusColor,
                          }}>
                            {statusLabel}
                          </span>
                          <span style={{ fontSize: 12, color: C.gray }}>{agent.leadsCount || 0} leads</span>
                          <span style={{ color: C.gray, fontSize: 14 }}>{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '0 24px 16px', background: '#FAFBFC' }}>
                          {!agentLeads[agent.id] ? (
                            <p style={{ color: C.gray, fontSize: 13, padding: '12px 0' }}>Loading leads...</p>
                          ) : agentLeads[agent.id].length === 0 ? (
                            <p style={{ color: C.gray, fontSize: 13, padding: '12px 0' }}>No leads yet for this agent.</p>
                          ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                              <thead>
                                <tr>
                                  {['Date', 'Address', 'County', 'Owner', 'Savings', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: C.navy, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {agentLeads[agent.id].slice(0, 10).map(lead => (
                                  <tr key={lead.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '8px 12px', color: C.gray, whiteSpace: 'nowrap' }}>{fmtDate(lead.createdAt)}</td>
                                    <td style={{ padding: '8px 12px', color: C.navy, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.propertyAddress}</td>
                                    <td style={{ padding: '8px 12px', color: C.navy }}>{lead.county}</td>
                                    <td style={{ padding: '8px 12px', color: C.gray }}>{lead.ownerName || '—'}</td>
                                    <td style={{ padding: '8px 12px', color: C.green, fontWeight: 700 }}>{fmtMoney(lead.estimatedSavings)}</td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: '#F1F5F9', color: C.gray }}>
                                        {lead.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* REVENUE TAB */}
        {activeTab === 'revenue' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div style={{ background: C.white, borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>📄 Single Reports</h3>
                <p style={{ fontSize: 36, fontWeight: 900, color: C.blue, marginBottom: 4 }}>{reportSales}</p>
                <p style={{ fontSize: 13, color: C.gray }}>Reports sold</p>
                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 16, paddingTop: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Total Revenue</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{fmtMoney(singleRevenue / 100)}</p>
                </div>
              </div>
              <div style={{ background: C.white, borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>♾️ Unlimited Subs</h3>
                <p style={{ fontSize: 36, fontWeight: 900, color: C.blue, marginBottom: 4 }}>{activeUnlimited}</p>
                <p style={{ fontSize: 13, color: C.gray }}>Active subscriptions</p>
                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 16, paddingTop: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>MRR</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{fmtMoney(unlimitedMRR / 100)}/mo</p>
                </div>
              </div>
              <div style={{ background: C.white, borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>🐝 Agent Subscriptions</h3>
                <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 36, fontWeight: 900, color: C.amber }}>{trialAgents}</p>
                    <p style={{ fontSize: 12, color: C.gray }}>Trial</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 36, fontWeight: 900, color: C.green }}>{activeAgents}</p>
                    <p style={{ fontSize: 12, color: C.gray }}>Active</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 16, paddingTop: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Annual Revenue</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{fmtMoney(agentRevenue / 100)}/yr</p>
                </div>
              </div>
            </div>

            {/* Revenue Summary */}
            <div style={{ background: `linear-gradient(135deg, ${C.navy}, #0a2540)`, borderRadius: 16, padding: 32, color: C.white }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>💰 Revenue Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Report Sales', value: fmtMoney(singleRevenue / 100) },
                  { label: 'Unlimited MRR', value: fmtMoney(unlimitedMRR / 100) },
                  { label: 'Agent ARR', value: fmtMoney(agentRevenue / 100) },
                  { label: 'Total MRR (est)', value: fmtMoney((singleRevenue / 100 / 12) + (unlimitedMRR / 100) + (agentRevenue / 100 / 12)) },
                ].map(r => (
                  <div key={r.label}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#8DA4B5', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{r.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 900 }}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div style={{ background: C.white, borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: C.navy, margin: 0 }}>📊 Recent Activity</h2>
            </div>
            {recentEvents.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 40, marginBottom: 8 }}>📊</p>
                <p style={{ color: C.gray, fontSize: 14 }}>Activity events will appear here as users interact with the calculator.</p>
              </div>
            ) : (
              <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                {recentEvents.slice(0, 50).map((ev, i) => {
                  const emojiMap: Record<string, string> = {
                    page_view: '👀',
                    address_searched: '🔍',
                    results_viewed: '📊',
                    signup_started: '✍️',
                    lead_captured: '📋',
                    guide_viewed: '📥',
                  };
                  return (
                    <div key={i} style={{
                      padding: '12px 24px', borderBottom: '1px solid #f1f5f9',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <span style={{ fontSize: 18 }}>{emojiMap[ev.event] || '📣'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 2 }}>
                          {ev.event.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </p>
                        <p style={{ fontSize: 12, color: C.gray }}>
                          {ev.county ? `${ev.county} County` : ''}{ev.address ? ` · ${ev.address}` : ''}
                        </p>
                      </div>
                      <span style={{ fontSize: 12, color: C.gray, whiteSpace: 'nowrap' }}>{fmtDate(ev.timestamp)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
