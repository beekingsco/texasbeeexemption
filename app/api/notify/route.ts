import { NextRequest, NextResponse } from 'next/server';
import { notifyAdmin } from '@/lib/notify';

/**
 * POST /api/notify
 * Reusable notification endpoint. Accepts { event, data } and fires admin notifications.
 * Protected by internal secret or admin key.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data, key } = body;

    // Allow internal calls (from same server) or admin key
    const internalSecret = process.env.NOTIFY_SECRET || 'beekings2026';
    if (key !== internalSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!event) {
      return NextResponse.json({ error: 'Event type required' }, { status: 400 });
    }

    notifyAdmin(event, data || {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Notify error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
