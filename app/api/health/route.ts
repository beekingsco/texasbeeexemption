import { NextResponse } from 'next/server';
import { supabaseServiceKey, warnIfSupabaseServiceKeyMissing } from '@/lib/supabase-rest';

/** Reports whether server-side Supabase writes can run. Does not return secrets. */
export async function GET() {
  const present = Boolean(supabaseServiceKey());
  if (!present) warnIfSupabaseServiceKeyMissing('health');
  return NextResponse.json(
    {
      ok: present,
      supabaseServiceRole: present ? 'present' : 'missing',
    },
    { status: present ? 200 : 503 },
  );
}
