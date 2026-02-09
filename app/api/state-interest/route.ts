import { NextRequest, NextResponse } from 'next/server';
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

    const interest: StateInterest = {
      state,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent') || undefined,
    };

    // Read existing interests
    const interests = await readJSON<StateInterest[]>('state-interest.json', []);
    
    // Add new interest
    interests.push(interest);
    
    // Save to file
    await writeJSON('state-interest.json', interests);
    
    // Forward to webhook for permanent storage
    await forwardToWebhook('state_interest', {
      state: interest.state,
      timestamp: interest.timestamp,
      userAgent: interest.userAgent,
    });

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
    const interests = await readJSON<StateInterest[]>('state-interest.json', []);
    
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
