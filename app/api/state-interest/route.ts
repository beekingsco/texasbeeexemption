import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureDB, isPostgresConfigured } from '@/lib/db';
import { readJSON, writeJSON, forwardToWebhook } from '@/lib/storage';

interface StateInterest {
  state: string;
  timestamp: string;
  userAgent?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { state } = body;

    if (!state) {
      return NextResponse.json(
        { error: 'Missing required field: state' },
        { status: 400 }
      );
    }

    const usePg = isPostgresConfigured();
    if (usePg) await ensureDB();

    const timestamp = new Date().toISOString();
    const userAgent = req.headers.get('user-agent') || undefined;

    if (usePg) {
      await sql`
        INSERT INTO state_interest (state, user_agent, timestamp)
        VALUES (${state}, ${userAgent || null}, ${timestamp})
      `;
    } else {
      const interest: StateInterest = { state, timestamp, userAgent };
      const interests = await readJSON<StateInterest[]>('state-interest.json', []);
      interests.push(interest);
      await writeJSON('state-interest.json', interests);
    }

    await forwardToWebhook('state_interest', { state, timestamp, userAgent });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('State interest error:', error);
    return NextResponse.json(
      { error: 'Failed to save state interest' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (key !== 'beekings2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const usePg = isPostgresConfigured();
    if (usePg) await ensureDB();

    let interests: StateInterest[];

    if (usePg) {
      const result = await sql`SELECT state, timestamp, user_agent FROM state_interest ORDER BY timestamp DESC`;
      interests = result.rows.map(r => ({
        state: r.state as string,
        timestamp: new Date(r.timestamp as string).toISOString(),
        userAgent: (r.user_agent as string) || undefined,
      }));
    } else {
      interests = await readJSON<StateInterest[]>('state-interest.json', []);
    }

    // Count by state and sort by popularity
    const counts: Record<string, number> = {};
    for (const interest of interests) {
      counts[interest.state] = (counts[interest.state] || 0) + 1;
    }

    const sorted = Object.entries(counts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      total: interests.length,
      byState: sorted,
      raw: interests,
    });
  } catch (error) {
    console.error('State interest GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve state interest data' },
      { status: 500 }
    );
  }
}
