import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureDB, isPostgresConfigured } from '@/lib/db';
import { readJSON, writeJSON, forwardToWebhook } from '@/lib/storage';
import { leadAttribution } from '@/lib/lead-source';
import { notifyFromRequest } from '@/lib/notify';

interface WaitlistEntry {
  email: string;
  name: string;
  state: string;
  timestamp: string;
  source?: string;
  entry?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, state } = body;

    if (!email || !name || !state) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, state' },
        { status: 400 }
      );
    }

    const usePg = isPostgresConfigured();
    if (usePg) await ensureDB();

    const timestamp = new Date().toISOString();
    const attribution = leadAttribution(req);

    if (usePg) {
      try {
        await sql`
          INSERT INTO waitlist (email, name, state, timestamp, source, entry)
          VALUES (${email}, ${name}, ${state}, ${timestamp}, ${attribution.source}, ${attribution.entryLabel})
        `;
      } catch (error) {
        console.error('waitlist saved without source columns', error);
        await sql`
          INSERT INTO waitlist (email, name, state, timestamp)
          VALUES (${email}, ${name}, ${state}, ${timestamp})
        `;
      }
    } else {
      const entry: WaitlistEntry = {
        email,
        name,
        state,
        timestamp,
        source: attribution.source,
        entry: attribution.entryLabel,
      };
      const waitlist = await readJSON<WaitlistEntry[]>('waitlist.json', []);
      waitlist.push(entry);
      await writeJSON('waitlist.json', waitlist);
    }

    await forwardToWebhook('waitlist_signup', {
      email,
      name,
      state,
      timestamp,
      source: attribution.source,
      entry: attribution.entryLabel,
    });
    notifyFromRequest(req, 'new_lead_captured', { name, email, address: state });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json(
      { error: 'Failed to save waitlist entry' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { checkAdminAuth } = await import('@/lib/admin-auth');
  if (!checkAdminAuth(req).authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const usePg = isPostgresConfigured();
    if (usePg) await ensureDB();

    let entries: WaitlistEntry[];

    if (usePg) {
      const result = await sql`SELECT email, name, state, timestamp FROM waitlist ORDER BY timestamp DESC`;
      entries = result.rows.map(r => ({
        email: r.email as string,
        name: r.name as string,
        state: r.state as string,
        timestamp: new Date(r.timestamp as string).toISOString(),
      }));
    } else {
      entries = await readJSON<WaitlistEntry[]>('waitlist.json', []);
    }

    // Group by state and count
    const byState: Record<string, { count: number; entries: WaitlistEntry[] }> = {};
    for (const entry of entries) {
      if (!byState[entry.state]) {
        byState[entry.state] = { count: 0, entries: [] };
      }
      byState[entry.state].count++;
      byState[entry.state].entries.push(entry);
    }

    return NextResponse.json({
      total: entries.length,
      byState,
      entries,
    });
  } catch (error) {
    console.error('Waitlist GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve waitlist' },
      { status: 500 }
    );
  }
}
