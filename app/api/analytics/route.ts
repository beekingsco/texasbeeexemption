import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/lib/storage';

interface AnalyticsEvent {
  event: string;
  county?: string;
  savings?: number;
  step?: string;
  address?: string;
  referrer?: string;
  userAgent?: string;
  timestamp: string;
}

async function readEvents(): Promise<AnalyticsEvent[]> {
  return readJSON<AnalyticsEvent[]>('analytics.json', []);
}

async function writeEvents(events: AnalyticsEvent[]): Promise<void> {
  const trimmed = events.slice(-10000);
  await writeJSON('analytics.json', trimmed);
}

// POST — track an event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, county, savings, step, address } = body;
    
    if (!event) {
      return NextResponse.json({ error: 'Event name required' }, { status: 400 });
    }

    const events = await readEvents();
    events.push({
      event,
      county: county || undefined,
      savings: savings || undefined,
      step: step || undefined,
      address: address || undefined,
      referrer: req.headers.get('referer') || undefined,
      userAgent: (req.headers.get('user-agent') || '').slice(0, 200),
      timestamp: new Date().toISOString(),
    });
    await writeEvents(events);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET — view analytics (requires key)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'beekings2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const events = await readEvents();
  const now = new Date();
  const today = events.filter(e => new Date(e.timestamp).toDateString() === now.toDateString());
  const week = events.filter(e => now.getTime() - new Date(e.timestamp).getTime() < 7 * 86400000);

  // Count by event type
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.event] = (counts[e.event] || 0) + 1;
  }
  const todayCounts: Record<string, number> = {};
  for (const e of today) {
    todayCounts[e.event] = (todayCounts[e.event] || 0) + 1;
  }

  return NextResponse.json({
    total: events.length,
    today: today.length,
    thisWeek: week.length,
    eventCounts: counts,
    todayCounts,
    funnel: {
      pageViews: counts['page_view'] || 0,
      addressSearched: counts['address_searched'] || 0,
      resultsViewed: counts['results_viewed'] || 0,
      signupStarted: counts['signup_started'] || 0,
      leadCaptured: counts['lead_captured'] || 0,
      guideViewed: counts['guide_viewed'] || 0,
    },
  });
}
