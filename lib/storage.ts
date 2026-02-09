import { promises as fs } from 'fs';
import path from 'path';

const IS_VERCEL = process.env.VERCEL === '1';

function getFilePath(filename: string): string {
  if (IS_VERCEL) {
    // Vercel: use /tmp (ephemeral but works per invocation)
    return path.join('/tmp', filename);
  }
  // Local: use data/ directory
  return path.join(process.cwd(), 'data', filename);
}

export async function readJSON<T>(filename: string, fallback: T[] = [] as unknown as T[]): Promise<T> {
  try {
    const data = await fs.readFile(getFilePath(filename), 'utf-8');
    return JSON.parse(data);
  } catch {
    return fallback as unknown as T;
  }
}

export async function writeJSON<T>(filename: string, data: T): Promise<void> {
  const filePath = getFilePath(filename);
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Webhook forwarder — sends data to Mission Control for permanent storage
const WEBHOOK_URL = process.env.LEADS_WEBHOOK_URL;

export async function forwardToWebhook(type: string, data: Record<string, unknown>): Promise<void> {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data, timestamp: new Date().toISOString() }),
    });
  } catch {
    // Silent fail — don't block the user experience
  }
}
