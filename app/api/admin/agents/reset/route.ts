import { NextRequest, NextResponse } from 'next/server';
import { saveAgents } from '@/lib/agent-storage';

const ADMIN_KEY = process.env.ADMIN_KEY || 'beekings2026';

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || req.nextUrl.searchParams.get('key');
  if (key !== ADMIN_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await saveAgents([]);
  return NextResponse.json({ ok: true, message: 'All agents cleared' });
}
