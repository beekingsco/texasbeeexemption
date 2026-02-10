import { NextRequest, NextResponse } from 'next/server';
import { getAgentById, addAgentLead } from '@/lib/agent-storage';
import { AgentLead } from '@/lib/types/agent';
import { notifyAdmin } from '@/lib/notify';

// POST — create a lead from a branded link referral (no auth needed, called from client)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, propertyAddress, county, ownerName, acres, appraisedValue, estimatedSavings } = body;

    if (!agentId || !propertyAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify agent exists and is active
    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    if (agent.subscription?.status === 'cancelled') {
      return NextResponse.json({ error: 'Agent subscription inactive' }, { status: 400 });
    }

    const lead: AgentLead = {
      id: crypto.randomUUID(),
      agentId,
      propertyAddress,
      county: county || '',
      state: 'TX',
      ownerName: ownerName || undefined,
      acres: acres || 0,
      appraisedValue: appraisedValue || 0,
      estimatedSavings: estimatedSavings || 0,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    await addAgentLead(agentId, lead);

    // Notify admin and agent
    notifyAdmin('new_lead_captured', {
      name: ownerName,
      address: propertyAddress,
      county,
      acres,
      estimatedSavings,
      agentName: agent.name,
      agentEmail: agent.email,
    });

    // Send email notification to agent via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@beeexemption.com';
    if (RESEND_API_KEY) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `BeeExemption <${FROM_EMAIL}>`,
          to: [agent.email],
          subject: `📋 New Lead from Your Branded Link: ${county || 'Unknown'} County`,
          html: `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#EDF6FF;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="background:#053249;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
    <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0;">🐝 New Lead Alert!</h1>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 16px 16px;">
    <p style="color:#053249;font-size:16px;margin:0 0 16px;">Hi ${agent.name.split(' ')[0]},</p>
    <p style="color:#6B7280;font-size:15px;line-height:1.6;margin:0 0 20px;">
      Someone just used your branded link and submitted their property info!
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${ownerName ? `<tr><td style="padding:8px 12px;color:#6B7280;font-size:14px;">Owner</td><td style="padding:8px 12px;color:#053249;font-weight:600;font-size:14px;">${ownerName}</td></tr>` : ''}
      <tr><td style="padding:8px 12px;color:#6B7280;font-size:14px;">Address</td><td style="padding:8px 12px;color:#053249;font-weight:600;font-size:14px;">${propertyAddress}</td></tr>
      ${county ? `<tr><td style="padding:8px 12px;color:#6B7280;font-size:14px;">County</td><td style="padding:8px 12px;color:#053249;font-weight:600;font-size:14px;">${county}</td></tr>` : ''}
      ${acres ? `<tr><td style="padding:8px 12px;color:#6B7280;font-size:14px;">Acres</td><td style="padding:8px 12px;color:#053249;font-weight:600;font-size:14px;">${acres}</td></tr>` : ''}
      ${estimatedSavings ? `<tr><td style="padding:8px 12px;color:#6B7280;font-size:14px;">Est. Savings</td><td style="padding:8px 12px;color:#059669;font-weight:700;font-size:14px;">$${estimatedSavings.toLocaleString()}/yr</td></tr>` : ''}
    </table>
    <div style="text-align:center;">
      <a href="https://beeexemption.com/agent/leads" style="display:inline-block;background:#1C7CE5;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
        View in Dashboard →
      </a>
    </div>
  </div>
</div>
</body></html>`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, leadId: lead.id }, { status: 201 });
  } catch (error) {
    console.error('Ref lead error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
