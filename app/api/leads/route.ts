import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { captureBeeLead, LeadInputError, type CaptureIntent } from '@/lib/capture-bee-lead';
import { listBeeLeads } from '@/lib/bee-store';

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

    const body = await req.json() as Record<string, unknown>;
    const intent: CaptureIntent = body.intent === 'results_unlock' ? 'results_unlock' : 'guide';
    const saved = await captureBeeLead(req, body, intent);

    return NextResponse.json({ success: true, id: saved.id, created: saved.created });
  } catch (error) {
    if (error instanceof LeadInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
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
