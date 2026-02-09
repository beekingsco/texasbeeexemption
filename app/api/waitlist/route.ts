import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON, forwardToWebhook } from '@/lib/storage';

interface WaitlistEntry {
  email: string;
  name: string;
  state: string;
  timestamp: string;
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

    const entry: WaitlistEntry = {
      email,
      name,
      state,
      timestamp: new Date().toISOString(),
    };

    // Read existing waitlist
    const waitlist = await readJSON<WaitlistEntry[]>('waitlist.json', []);
    
    // Add new entry
    waitlist.push(entry);
    
    // Save to file
    await writeJSON('waitlist.json', waitlist);
    
    // Forward to webhook for permanent storage
    await forwardToWebhook('waitlist_signup', {
      email: entry.email,
      name: entry.name,
      state: entry.state,
      timestamp: entry.timestamp,
    });

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
  const key = searchParams.get('key');

  if (key !== 'beekings2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const waitlist = await readJSON<WaitlistEntry[]>('waitlist.json', []);
    
    // Group by state and count
    const byState: Record<string, { count: number; entries: WaitlistEntry[] }> = {};
    
    for (const entry of waitlist) {
      if (!byState[entry.state]) {
        byState[entry.state] = { count: 0, entries: [] };
      }
      byState[entry.state].count++;
      byState[entry.state].entries.push(entry);
    }

    return NextResponse.json({
      total: waitlist.length,
      byState,
      entries: waitlist,
    });
  } catch (error) {
    console.error('Waitlist GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve waitlist' },
      { status: 500 }
    );
  }
}
