import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { leadAttribution } from '@/lib/lead-source';
import { notifyFromRequest } from '@/lib/notify';
import { contactLeadBlockReason } from '@/lib/lead-qualification';
import { listBeeLeads, saveBeeLead, type BeeLead } from '@/lib/bee-store';

// OpenClaw notification (Scout → Chris)
const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY_URL || '';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

type Lead = BeeLead;

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

    const blockReason = contactLeadBlockReason({
      firstName: typeof firstName === 'string' ? firstName : '',
      lastName: typeof lastName === 'string' ? lastName : '',
      email: typeof email === 'string' ? email : '',
      address: typeof address === 'string' ? address : '',
    });
    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 400 });
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
