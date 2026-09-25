/** Contractor Command Supabase project that owns public.address_searches. */
export const ADDRESS_SEARCH_SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ixvlatpjzbqhccuniqwy.supabase.co';

export function supabaseServiceKey(): string | null {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    '';
  const trimmed = key.trim();
  return trimmed || null;
}

/** PostgREST / Postgres errors when an insert names a column the migration has not added yet. */
export function missingColumnName(message: string): string | null {
  const patterns = [
    /Could not find the '([^']+)' column/i,
    /column "([^"]+)" of relation/i,
    /column "([^"]+)" does not exist/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

type PostResult = { ok: boolean; status: number; message: string; row: Record<string, unknown> | null };

const warnedColumns = new Set<string>();

function warnMissing(column: string) {
  if (warnedColumns.has(column)) return;
  warnedColumns.add(column);
  console.warn(`address search insert omitted missing column: ${column}`);
}

async function readBody(response: Response): Promise<{ message: string; row: Record<string, unknown> | null }> {
  const text = await response.text();
  if (!text) return { message: response.statusText, row: null };
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      const row = (parsed[0] && typeof parsed[0] === 'object') ? parsed[0] as Record<string, unknown> : null;
      return { message: text, row };
    }
    if (parsed && typeof parsed === 'object') {
      const record = parsed as { message?: string; error?: string; details?: string };
      const message = [record.message, record.error, record.details].filter(Boolean).join(' ') || text;
      return { message, row: null };
    }
    return { message: text, row: null };
  } catch {
    return { message: text, row: null };
  }
}

function authHeaders(key: string, prefer: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

async function postRow(table: string, row: Record<string, unknown>, key: string): Promise<PostResult> {
  const response = await fetch(`${ADDRESS_SEARCH_SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: authHeaders(key, 'return=representation'),
    body: JSON.stringify(row),
  });
  const body = await readBody(response);
  return { ok: response.ok, status: response.status, message: body.message, row: body.row };
}

/**
 * Inserts a row with the service role key. Columns the table does not have yet
 * are dropped and the insert is retried, so a pending schema migration does not
 * lose the rest of the row.
 */
export async function supabaseInsert(
  table: string,
  row: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const key = supabaseServiceKey();
  if (!key) {
    console.error('address search log skipped: SUPABASE_SERVICE_ROLE_KEY is not set');
    return null;
  }

  const payload: Record<string, unknown> = { ...row };
  for (let attempt = 0; attempt < 12; attempt++) {
    const result = await postRow(table, payload, key);
    if (result.ok) return result.row;
    const missing = missingColumnName(result.message);
    if (!missing || !(missing in payload)) {
      console.error('address search insert failed', result.status, result.message);
      return null;
    }
    warnMissing(missing);
    delete payload[missing];
  }
  console.error('address search insert failed after dropping missing columns');
  return null;
}

export async function supabasePatchById(
  table: string,
  id: string,
  row: Record<string, unknown>,
): Promise<boolean> {
  const key = supabaseServiceKey();
  if (!key) return false;
  const payload: Record<string, unknown> = { ...row };
  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await fetch(
      `${ADDRESS_SEARCH_SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: authHeaders(key, 'return=minimal'),
        body: JSON.stringify(payload),
      },
    );
    if (response.ok) return true;
    const body = await readBody(response);
    const missing = missingColumnName(body.message);
    if (!missing || !(missing in payload)) {
      console.error('address search update failed', response.status, body.message);
      return false;
    }
    warnMissing(missing);
    delete payload[missing];
  }
  return false;
}

export async function supabaseLatestId(table: string, filter: string): Promise<string | null> {
  const key = supabaseServiceKey();
  if (!key) return null;
  const response = await fetch(
    `${ADDRESS_SEARCH_SUPABASE_URL}/rest/v1/${table}?select=id&${filter}&order=created_at.desc&limit=1`,
    { headers: authHeaders(key, 'return=representation') },
  );
  const body = await readBody(response);
  if (!response.ok) {
    console.error('address search lookup failed', response.status, body.message);
    return null;
  }
  const id = body.row?.id;
  return typeof id === 'string' ? id : null;
}
