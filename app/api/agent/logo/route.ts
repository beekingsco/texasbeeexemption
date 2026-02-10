import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifySessionToken } from '@/lib/auth-tokens';
import { getAgentById, updateAgent } from '@/lib/agent-storage';

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const sessionCookie = req.cookies.get('bee_session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const agentId = verifySessionToken(sessionCookie);
    if (!agentId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const agent = await getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG' }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 2MB.' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const ext = file.name.split('.').pop() || 'png';
    const blobPath = `agents/logos/${agentId}.${ext}`;
    const blob = await put(blobPath, file, {
      access: 'public',
      contentType: file.type,
    });

    // Update agent record
    await updateAgent(agentId, { logoUrl: blob.url });

    return NextResponse.json({ logoUrl: blob.url });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
