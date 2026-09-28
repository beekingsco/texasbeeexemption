import { NextResponse } from 'next/server';
import { loadTexasCounties } from '@/lib/county-rules';

export async function GET() {
  const { counties, source } = await loadTexasCounties();
  return NextResponse.json({
    state: 'TX',
    source,
    counties,
  });
}
