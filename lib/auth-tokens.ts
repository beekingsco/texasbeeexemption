import { put, list, del } from '@vercel/blob';

interface MagicToken {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
}

const TOKENS_BLOB_PATH = 'auth/magic-tokens.json';

async function readTokens(): Promise<MagicToken[]> {
  try {
    const blobs = await list({ prefix: 'auth/magic-tokens' });
    if (blobs.blobs.length === 0) return [];
    const response = await fetch(blobs.blobs[0].url);
    const data = await response.json();
    return data.tokens || [];
  } catch {
    return [];
  }
}

async function writeTokens(tokens: MagicToken[]): Promise<void> {
  // Clean up expired tokens
  const now = new Date().getTime();
  const active = tokens.filter(t => new Date(t.expiresAt).getTime() > now && !t.used);
  
  await put(TOKENS_BLOB_PATH, JSON.stringify({ tokens: active }, null, 2), {
    access: 'public',
    contentType: 'application/json',
      allowOverwrite: true,
  });
}

export async function createMagicToken(email: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  const tokens = await readTokens();
  // Remove any existing tokens for this email
  const filtered = tokens.filter(t => t.email.toLowerCase() !== email.toLowerCase());
  filtered.push({ token, email: email.toLowerCase(), expiresAt, used: false });
  await writeTokens(filtered);

  return token;
}

export async function verifyMagicToken(token: string): Promise<string | null> {
  const tokens = await readTokens();
  const found = tokens.find(t => t.token === token && !t.used);

  if (!found) return null;
  if (new Date(found.expiresAt).getTime() < Date.now()) return null;

  // Mark as used
  found.used = true;
  await writeTokens(tokens);

  return found.email;
}

// Session cookie helpers
const SESSION_SECRET = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'beeexemption-session-2026';

export function createSessionToken(agentId: string): string {
  // Simple signed token: agentId.timestamp.signature
  const timestamp = Date.now().toString();
  const payload = `${agentId}.${timestamp}`;
  // Simple HMAC-like signature using base64 encoding
  const signature = Buffer.from(`${payload}.${SESSION_SECRET}`).toString('base64url');
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [agentId, timestamp, signature] = parts;
    const payload = `${agentId}.${timestamp}`;
    const expectedSignature = Buffer.from(`${payload}.${SESSION_SECRET}`).toString('base64url');

    if (signature !== expectedSignature) return null;

    // Check if token is within 30 days
    const tokenTime = parseInt(timestamp, 10);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - tokenTime > thirtyDays) return null;

    return agentId;
  } catch {
    return null;
  }
}
