import { NextRequest, NextResponse } from 'next/server';
import { saveAgents } from '@/lib/agent-storage';
import { checkAdminAuth } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const { authorized } = checkAdminAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await saveAgents([]);
  return NextResponse.json({ ok: true, message: 'All agents cleared' });
}
