import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureDB, isPostgresConfigured } from '@/lib/db';
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

// JSON file fallback
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

    const usePg = isPostgresConfigured();
    if (usePg) await ensureDB();

    const timestamp = new Date().toISOString();
    const referrer = req.headers.get('referer') || undefined;
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 200);

    if (usePg) {
      await sql`
        INSERT INTO analytics (event, county, savings, step, address, referrer, user_agent, timestamp)
        VALUES (${event}, ${county || null}, ${savings || null}, ${step || null},
          ${address || null}, ${referrer || null}, ${userAgent || null}, ${timestamp})
      `;
    } else {
      const events = await readEvents();
      events.push({
        event,
        county: county || undefined,
        savings: savings || undefined,
        step: step || undefined,
        address: address || undefined,
        referrer,
        userAgent,
        timestamp,
      });
      await writeEvents(events);
    }

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

  const usePg = isPostgresConfigured();
  if (usePg) await ensureDB();

  let events: AnalyticsEvent[];

  if (usePg) {
    const result = await sql`SELECT event, county, savings, step, address, referrer, user_agent, timestamp FROM analytics ORDER BY timestamp DESC LIMIT 10000`;
    events = result.rows.map(r => ({
      event: r.event as string,
      county: (r.county as string) || undefined,
      savings: r.savings as number | undefined,
      step: (r.step as string) || undefined,
      address: (r.address as string) || undefined,
      referrer: (r.referrer as string) || undefined,
      userAgent: (r.user_agent as string) || undefined,
      timestamp: new Date(r.timestamp as string).toISOString(),
    }));
  } else {
    events = await readEvents();
  }

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

  // Recent events for activity feed (last 50)
  const recentEvents = events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50)
    .map(e => ({
      event: e.event,
      county: e.county,
      savings: e.savings,
      address: e.address,
      timestamp: e.timestamp,
    }));

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
    recentEvents,
  });
}
