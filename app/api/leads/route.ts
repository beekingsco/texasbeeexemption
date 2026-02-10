import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

// Telegram lead alert
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const TG_CHAT_ID = process.env.TG_ALERT_CHAT_ID || '';

// OpenClaw notification (Scout → Chris via Telegram)
const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY_URL || '';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  county: string;
  lat: number | null;
  lng: number | null;
  acres: number | null;
  appraisedValue: number | null;
  estimatedSavings: number | null;
  parcelData: Record<string, unknown> | null;
  source: string;
  agentRef?: string;
  createdAt: string;
}

/* ─── Blob helpers (individual files per lead) ─── */

async function saveLead(lead: Lead): Promise<void> {
  // Save as individual file — no read-modify-write race condition
  const key = `leads/${lead.id}.json`;
  await put(key, JSON.stringify(lead), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
}

async function readAllLeads(): Promise<Lead[]> {
  const leads: Lead[] = [];
  let cursor: string | undefined;

  // Paginate through all lead blobs
  do {
    const result = await list({
      prefix: 'leads/lead_',
      cursor,
      limit: 1000,
    });
    for (const blob of result.blobs) {
      try {
        const resp = await fetch(blob.url);
        if (resp.ok) {
          const lead = await resp.json();
          leads.push(lead);
        }
      } catch {
        // Skip corrupt blobs
      }
    }
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  // Also check legacy all-leads.json
  try {
    const { blobs } = await list({ prefix: 'leads/all-leads' });
    const legacy = blobs.find(b => b.pathname === 'leads/all-leads.json');
    if (legacy) {
      const resp = await fetch(legacy.url);
      if (resp.ok) {
        const legacyLeads: Lead[] = await resp.json();
        // Merge legacy leads (avoid duplicates by id)
        const existingIds = new Set(leads.map(l => l.id));
        for (const ll of legacyLeads) {
          if (!existingIds.has(ll.id)) {
            leads.push(ll);
          }
        }
      }
    }
  } catch {
    // Ignore legacy read errors
  }

  return leads;
}

/* ─── Telegram alert ─── */
async function sendTelegramAlert(lead: Lead): Promise<void> {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  try {
    const savings = lead.estimatedSavings ? `$${Math.round(lead.estimatedSavings).toLocaleString()}` : 'N/A';
    const text = `🐝 *New Lead!*\n\n` +
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
    const body = await req.json();
    const { firstName, lastName, email, phone, address, county, lat, lng, acres, appraisedValue, estimatedSavings, parcelData, source, agentRef } = body;

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
      lat: lat || null,
      lng: lng || null,
      acres: acres || null,
      appraisedValue: appraisedValue || null,
      estimatedSavings: estimatedSavings || null,
      parcelData: parcelData || null,
      source: source || 'calculator',
      agentRef: agentRef || undefined,
      createdAt: new Date().toISOString(),
    };

    // Save lead as individual blob (reliable, no race conditions)
    await saveLead(lead);

    // Fire alerts (non-blocking)
    sendTelegramAlert(lead).catch(() => {});

    return NextResponse.json({ success: true, id: lead.id });
  } catch (error) {
    console.error('Lead capture error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to save lead', detail: msg }, { status: 500 });
  }
}

/* ─── GET — retrieve leads (admin) ─── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const apiKey = searchParams.get('key');

  if (apiKey !== 'beekings2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leads = await readAllLeads();

  const county = searchParams.get('county');
  const filtered = county ? leads.filter(l => l.county.toLowerCase() === county.toLowerCase()) : leads;

  return NextResponse.json({
    total: filtered.length,
    leads: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  });
}
