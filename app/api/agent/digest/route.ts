import { NextRequest, NextResponse } from 'next/server';
import { getAgents, getAgentLeads } from '@/lib/agent-storage';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@beeexemption.com';

function buildDigestEmail(agentName: string, stats: { newLeads: number; totalLeads: number; weekStart: string; weekEnd: string }): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#EDF6FF;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#053249;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
      <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0;">🐝 Weekly Digest</h1>
      <p style="color:#8DA4B5;font-size:13px;margin:4px 0 0;">${stats.weekStart} — ${stats.weekEnd}</p>
    </div>
    <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;">
      <p style="color:#053249;font-size:16px;margin:0 0 20px;">Hi ${agentName.split(' ')[0]},</p>
      <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Here's your weekly summary from BeeExemption:
      </p>
      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;background:#F8FAFC;border-radius:12px;padding:20px;text-align:center;">
          <p style="font-size:32px;font-weight:900;color:#1C7CE5;margin:0;">${stats.newLeads}</p>
          <p style="font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin:4px 0 0;">New Leads</p>
        </div>
        <div style="flex:1;background:#F8FAFC;border-radius:12px;padding:20px;text-align:center;">
          <p style="font-size:32px;font-weight:900;color:#059669;margin:0;">${stats.totalLeads}</p>
          <p style="font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin:4px 0 0;">Total Leads</p>
        </div>
      </div>
      ${stats.newLeads > 0 ? `
        <p style="color:#6B7280;font-size:14px;line-height:1.6;">
          🎉 You received <strong style="color:#053249;">${stats.newLeads} new lead${stats.newLeads > 1 ? 's' : ''}</strong> this week!
          Log in to your dashboard to review and follow up.
        </p>
      ` : `
        <p style="color:#6B7280;font-size:14px;line-height:1.6;">
          No new leads this week. Share your branded link to generate more traffic!
        </p>
      `}
      <div style="text-align:center;margin-top:24px;">
        <a href="https://beeexemption.com/agent/dashboard" style="display:inline-block;background:#1C7CE5;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
          View Dashboard →
        </a>
      </div>
      <p style="color:#8DA4B5;font-size:12px;margin:24px 0 0;text-align:center;">
        BeeExemption Agent Portal
      </p>
    </div>
  </div>
</body>
</html>`;
}

// GET — trigger weekly digest for all agents (requires admin key)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'beekings2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const agents = await getAgents();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekStart = weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEnd = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const results: Array<{ agent: string; email: string; sent: boolean; error?: string }> = [];

    for (const agent of agents) {
      // Skip cancelled agents
      if (agent.subscription?.status === 'cancelled') {
        results.push({ agent: agent.name, email: agent.email, sent: false, error: 'cancelled' });
        continue;
      }

      try {
        const leads = await getAgentLeads(agent.id);
        const newLeads = leads.filter(l => new Date(l.createdAt) >= weekAgo);

        const stats = {
          newLeads: newLeads.length,
          totalLeads: leads.length,
          weekStart,
          weekEnd,
        };

        // Send email via Resend
        if (RESEND_API_KEY) {
          const emailResp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `BeeExemption <${FROM_EMAIL}>`,
              to: [agent.email],
              subject: `🐝 Weekly Digest: ${stats.newLeads} new lead${stats.newLeads !== 1 ? 's' : ''} — ${weekEnd}`,
              html: buildDigestEmail(agent.name, stats),
            }),
          });

          if (emailResp.ok) {
            results.push({ agent: agent.name, email: agent.email, sent: true });
          } else {
            const errBody = await emailResp.text();
            results.push({ agent: agent.name, email: agent.email, sent: false, error: errBody });
          }
        } else {
          results.push({ agent: agent.name, email: agent.email, sent: false, error: 'No RESEND_API_KEY' });
        }
      } catch (err) {
        results.push({ agent: agent.name, email: agent.email, sent: false, error: String(err) });
      }
    }

    return NextResponse.json({
      ok: true,
      agentsProcessed: results.length,
      results,
    });
  } catch (error) {
    console.error('Digest error:', error);
    return NextResponse.json({ error: 'Digest failed' }, { status: 500 });
  }
}
