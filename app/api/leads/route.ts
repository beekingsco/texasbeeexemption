import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureDB, isPostgresConfigured } from '@/lib/db';
import { readJSON, writeJSON, forwardToWebhook } from '@/lib/storage';

// Telegram lead alert
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const TG_CHAT_ID = process.env.TG_ALERT_CHAT_ID || '';

async function sendLeadAlert(lead: Lead): Promise<void> {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  try {
    const savings = lead.estimatedSavings ? `$${lead.estimatedSavings.toLocaleString()}` : 'N/A';
    const text = `🐝 *New Lead!*\n\n` +
      `*${lead.firstName} ${lead.lastName}*\n` +
      `📧 ${lead.email}\n` +
      (lead.phone ? `📱 ${lead.phone}\n` : '') +
      `📍 ${lead.county || 'Unknown county'}${lead.source ? ` (${lead.source})` : ''}\n` +
      (lead.acres ? `🏡 ${lead.acres} acres\n` : '') +
      (lead.appraisedValue ? `💰 Appraised: $${lead.appraisedValue.toLocaleString()}\n` : '') +
      `💵 Est. savings: ${savings}\n` +
      `\n⏰ ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}`;

    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'Markdown' }),
    });
  } catch {
    // Silent fail — don't block lead capture
  }
}

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
  createdAt: string;
}

function rowToLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    firstName: (row.first_name as string) || '',
    lastName: (row.last_name as string) || '',
    email: (row.email as string) || '',
    phone: (row.phone as string) || '',
    address: (row.address as string) || '',
    county: (row.county as string) || '',
    lat: row.lat as number | null,
    lng: row.lng as number | null,
    acres: row.acres as number | null,
    appraisedValue: row.appraised_value as number | null,
    estimatedSavings: row.estimated_savings as number | null,
    parcelData: row.parcel_data as Record<string, unknown> | null,
    source: (row.source as string) || 'calculator',
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : new Date().toISOString(),
  };
}

// JSON file fallback
async function readLeads(): Promise<Lead[]> {
  return readJSON<Lead[]>('leads.json', []);
}

async function writeLeads(leads: Lead[]): Promise<void> {
  await writeJSON('leads.json', leads);
}

// POST — capture a new lead
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone, address, county, lat, lng, acres, appraisedValue, estimatedSavings, parcelData, source } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: 'First name, last name, and email are required' }, { status: 400 });
    }

    const usePg = isPostgresConfigured();
    if (usePg) await ensureDB();

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
      createdAt: new Date().toISOString(),
    };

    if (usePg) {
      await sql`
        INSERT INTO leads (id, first_name, last_name, email, phone, address, county, lat, lng,
          acres, appraised_value, estimated_savings, parcel_data, source, created_at)
        VALUES (${lead.id}, ${lead.firstName}, ${lead.lastName}, ${lead.email}, ${lead.phone},
          ${lead.address}, ${lead.county}, ${lead.lat}, ${lead.lng}, ${lead.acres},
          ${lead.appraisedValue}, ${lead.estimatedSavings},
          ${lead.parcelData ? JSON.stringify(lead.parcelData) : null},
          ${lead.source}, ${lead.createdAt})
      `;
    } else {
      const leads = await readLeads();
      leads.push(lead);
      await writeLeads(leads);
    }

    await forwardToWebhook('lead', lead as unknown as Record<string, unknown>);
    await sendLeadAlert(lead);

    return NextResponse.json({ success: true, id: lead.id });
  } catch (error) {
    console.error('Lead capture error:', error);
    return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
  }
}

// GET — retrieve leads (admin endpoint)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const apiKey = searchParams.get('key');

  if (apiKey !== 'beekings2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const usePg = isPostgresConfigured();
  if (usePg) await ensureDB();

  let leads: Lead[];

  if (usePg) {
    const result = await sql`SELECT * FROM leads ORDER BY created_at DESC`;
    leads = result.rows.map(rowToLead);
  } else {
    leads = await readLeads();
  }

  const county = searchParams.get('county');
  const filtered = county ? leads.filter(l => l.county.toLowerCase() === county.toLowerCase()) : leads;

  return NextResponse.json({
    total: filtered.length,
    leads: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  });
}
