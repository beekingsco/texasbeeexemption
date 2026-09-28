import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { leadAttribution } from '@/lib/lead-source';
import { notifyFromRequest } from '@/lib/notify';
import { listBeeLeads, saveBeeLead, type BeeLead } from '@/lib/bee-store';

// Telegram lead alert
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const TG_CHAT_ID = process.env.TG_ALERT_CHAT_ID || '';

// OpenClaw notification (Scout → Chris via Telegram)
const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY_URL || '';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

type Lead = BeeLead;

/* ─── Telegram alert ─── */
async function sendTelegramAlert(lead: Lead): Promise<void> {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  try {
    const savings = lead.estimatedSavings ? `$${Math.round(lead.estimatedSavings).toLocaleString()}` : 'N/A';
    const text = `🐝 *New Lead!*\n\n` +
      `Source: ${lead.source}\n` +
      `Entry: ${lead.entry || 'direct'}\n\n` +
      `*${lead.firstName} ${lead.lastName}*\n` +
      `📧 ${lead.email}\n` +
      (lead.phone ? `📱 ${lead.phone}\n` : '') +
      `📍 ${lead.county || 'Unknown'} County\n` +
      (lead.address ? `🏠 ${lead.address}\n` : '') +
      (lead.acres ? `🏡 ${lead.acres} acres\n` : '') +
      (lead.appraisedValue ? `💰 Appraised: $${Math.round(lead.appraisedValue).toLocaleString()}\n` : '') +
      `💵 Est. savings: ${savings}/yr\n` +
      (lead.agentRef ? `🤝 Agent ref: ${lead.agentRef}\n` : '') +
      `\n⏰ ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}`;

    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'Markdown' }),
    });
  } catch {
    // Silent fail
  }
}

/* ─── POST — capture a new lead ─── */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 lead submissions per IP per 15 minutes
    const ip = getClientIp(req);
    const rl = checkRateLimit('lead-capture', ip, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, address, county, lat, lng, acres, appraisedValue, estimatedSavings, parcelData, source, agentRef } = body;
    const attribution = leadAttribution(req);

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    const lead: Lead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      firstName,
      lastName,
      email,
      phone: phone || '',
      address: address || '',
      county: county || '',
      state: typeof body.state === 'string' ? body.state : '',
      lat: lat || null,
      lng: lng || null,
      acres: acres || null,
      appraisedValue: appraisedValue || null,
      estimatedSavings: estimatedSavings || null,
      parcelData: parcelData || null,
      source: attribution.source,
      entry: attribution.entryLabel,
      channel: typeof source === 'string' && source.trim() ? source.trim() : 'calculator',
      agentRef: agentRef || undefined,
      createdAt: new Date().toISOString(),
    };

    await saveBeeLead(lead);

    await sendTelegramAlert(lead);
    await notifyFromRequest(req, 'new_lead_captured', {
      name: `${lead.firstName} ${lead.lastName}`.trim(),
      email: lead.email,
      phone: lead.phone || undefined,
      address: lead.address || undefined,
      county: lead.county || undefined,
      acres: lead.acres || undefined,
      estimatedSavings: lead.estimatedSavings || undefined,
    });

    return NextResponse.json({ success: true, id: lead.id });
  } catch (error) {
    console.error('Lead capture error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to save lead', detail: msg }, { status: 500 });
  }
}

/* ─── GET — retrieve leads (admin) ─── */
export async function GET(req: NextRequest) {
  const { checkAdminAuth } = await import('@/lib/admin-auth');
  if (!checkAdminAuth(req).authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);

  const leads = await listBeeLeads();

  const county = searchParams.get('county');
  const filtered = county ? leads.filter(l => l.county.toLowerCase() === county.toLowerCase()) : leads;

  return NextResponse.json({
    total: filtered.length,
    leads: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  });
}
