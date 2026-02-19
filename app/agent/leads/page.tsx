'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  amber: '#F59E0B',
  navy: '#053249',
  gray: '#64748B',
  grayLight: '#F1F5F9',
  white: '#FFFFFF',
  green: '#059669',
  blue: '#1C7CE5',
  red: '#DC2626',
};

interface Lead {
  id: string;
  propertyAddress: string;
  county: string;
  state: string;
  ownerName?: string;
  ownerEmail?: string;
  acres: number;
  appraisedValue: number;
  estimatedSavings: number;
  status: 'new' | 'contacted' | 'client' | 'closed';
  notes?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  new: '#3B82F6',
  contacted: '#F59E0B',
  client: '#059669',
  closed: '#64748B',
};

const PAGE_SIZE = 20;

export default function AgentLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      const sessionResp = await fetch('/api/auth/session');
      if (sessionResp.status === 401) { router.push('/agent/login'); return; }

      const leadsResp = await fetch('/api/agent/leads');
      if (leadsResp.ok) {
        const data = await leadsResp.json();
        setLeads(data.leads || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    const resp = await fetch('/api/agent/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: leadId, status: newStatus }),
    });
    if (resp.ok) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus as Lead['status'] } : l));
    }
  };

  const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Status counts
  const statusCounts = {
    all: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    client: leads.filter(l => l.status === 'client').length,
    closed: leads.filter(l => l.status === 'closed').length,
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.grayLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🐝</div>
          <p style={{ color: C.gray }}>Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.grayLight, fontFamily: 'system-ui' }}>
      {/* Header */}
      <header style={{ background: C.navy, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/agent/dashboard" style={{ color: '#8DA4B5', textDecoration: 'none', fontSize: 13 }}>← Dashboard</a>
          <span style={{ color: '#4a5568' }}>|</span>
          <span style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>📋 Leads</span>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Your Leads ({filtered.length})</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'new', 'contacted', 'client', 'closed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: filter === f ? 'none' : '1px solid #e2e8f0',
                  background: filter === f ? C.navy : C.white,
                  color: filter === f ? C.white : C.gray,
                  cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {f} {statusCounts[f] > 0 ? `(${statusCounts[f]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: C.white, borderRadius: 16, border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>📭</p>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
              {filter === 'all' ? 'No leads yet' : `No ${filter} leads`}
            </h2>
            <p style={{ color: C.gray, fontSize: 14 }}>
              {filter === 'all'
                ? 'Leads will appear here as visitors use your branded link.'
                : `No leads with "${filter}" status. Change the filter to see other leads.`}
            </p>
          </div>
        ) : (
          <>
            <div style={{ background: C.white, borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #e2e8f0' }}>
                    {['Date', 'Name', 'Email', 'County', 'Address', 'Acres', 'Est. Savings', 'Status'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: C.navy, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(lead => (
                    <>
                      <tr
                        key={lead.id}
                        onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 14px', color: C.gray, whiteSpace: 'nowrap' }}>{fmtDate(lead.createdAt)}</td>
                        <td style={{ padding: '12px 14px', color: C.navy, fontWeight: 600 }}>{lead.ownerName || '—'}</td>
                        <td style={{ padding: '12px 14px', color: C.blue, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead.ownerEmail ? (
                            <a href={`mailto:${lead.ownerEmail}`} onClick={(e) => e.stopPropagation()} style={{ color: C.blue, textDecoration: 'none' }}>{lead.ownerEmail}</a>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '12px 14px', color: C.navy, fontWeight: 600 }}>{lead.county}</td>
                        <td style={{ padding: '12px 14px', color: C.gray, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.propertyAddress}</td>
                        <td style={{ padding: '12px 14px', color: C.gray }}>{lead.acres}</td>
                        <td style={{ padding: '12px 14px', color: C.green, fontWeight: 700 }}>{fmtMoney(lead.estimatedSavings)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            display: 'inline-block', padding: '4px 10px', borderRadius: 20,
                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                            background: `${statusColors[lead.status] || C.gray}15`,
                            color: statusColors[lead.status] || C.gray,
                          }}>
                            {lead.status}
                          </span>
                        </td>
                      </tr>
                      {expandedId === lead.id && (
                        <tr key={`${lead.id}-detail`}>
                          <td colSpan={8} style={{ padding: '16px 24px', background: '#FAFBFC', borderBottom: '2px solid #e2e8f0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: 4 }}>Full Address</p>
                                <p style={{ color: C.navy, fontSize: 14 }}>{lead.propertyAddress}</p>
                              </div>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: 4 }}>Appraised Value</p>
                                <p style={{ color: C.navy, fontSize: 14 }}>{fmtMoney(lead.appraisedValue)}</p>
                              </div>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', marginBottom: 4 }}>Notes</p>
                                <p style={{ color: C.gray, fontSize: 14 }}>{lead.notes || 'No notes'}</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span style={{ fontSize: 12, color: C.gray, lineHeight: '28px' }}>Update status:</span>
                              {['new', 'contacted', 'client', 'closed'].map(s => (
                                <button
                                  key={s}
                                  onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, s); }}
                                  style={{
                                    padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 700,
                                    border: lead.status === s ? 'none' : '1px solid #e2e8f0',
                                    background: lead.status === s ? (statusColors[s] || C.gray) : C.white,
                                    color: lead.status === s ? C.white : C.gray,
                                    cursor: 'pointer', textTransform: 'capitalize',
                                  }}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: '1px solid #e2e8f0', background: C.white, color: page === 1 ? '#cbd5e1' : C.navy,
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ← Previous
                </button>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        width: 36, height: 36, borderRadius: 8, fontSize: 13, fontWeight: 700,
                        border: page === p ? 'none' : '1px solid #e2e8f0',
                        background: page === p ? C.navy : C.white,
                        color: page === p ? C.white : C.gray,
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: '1px solid #e2e8f0', background: C.white, color: page === totalPages ? '#cbd5e1' : C.navy,
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Summary */}
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <p style={{ color: C.gray, fontSize: 12 }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} leads
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
