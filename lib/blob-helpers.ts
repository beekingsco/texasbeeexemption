import { put, list, type PutBlobResult, type ListBlobResult } from '@vercel/blob';

const MAX_RETRIES = 2;
const BACKOFF_MS = 300;

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        const delay = BACKOFF_MS * Math.pow(2, attempt);
        console.warn(`[blob] ${label} attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  console.error(`[blob] ${label} failed after ${MAX_RETRIES + 1} attempts`, lastError);
  throw lastError;
}

export async function blobPut(
  path: string,
  data: string,
  options?: { access?: 'public'; contentType?: string }
): Promise<PutBlobResult> {
  return withRetry(`put(${path})`, () =>
    put(path, data, {
      access: options?.access ?? 'public',
      contentType: options?.contentType ?? 'application/json',
      allowOverwrite: true,
    })
  );
}

export async function blobRead<T = unknown>(prefix: string): Promise<T | null> {
  return withRetry(`read(${prefix})`, async () => {
    const blobs: ListBlobResult = await list({ prefix });
    if (blobs.blobs.length === 0) return null;
    const response = await fetch(blobs.blobs[0].url);
    if (!response.ok) {
      throw new Error(`Fetch blob content failed: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  });
}
