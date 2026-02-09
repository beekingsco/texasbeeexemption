import { NextRequest, NextResponse } from 'next/server';

// This endpoint receives webhooks from the production site and stores them
// Used when running on the Mac mini as a permanent data backup
// Production Vercel site forwards leads/contacts here

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'beekings2026';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, data, timestamp } = body;

    // Log to console for now — Mission Control will pick this up
    console.log(`[WEBHOOK] ${type} at ${timestamp}:`, JSON.stringify(data).slice(0, 200));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
