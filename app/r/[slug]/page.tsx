'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function BrandedRedirect() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [error, setError] = useState(false);

  useEffect(() => {
    async function lookupAgent() {
      try {
        const resp = await fetch(`/api/agent/lookup?slug=${encodeURIComponent(slug)}`);
        if (!resp.ok) {
          setError(true);
          return;
        }
        const data = await resp.json();
        if (data.agentId) {
          // Redirect to Texas calculator with ref
          const params = new URLSearchParams({ ref: data.agentId });
          if (data.logoUrl) params.set('agentLogo', data.logoUrl);
          if (data.agentName) params.set('agentName', data.agentName);
          router.replace(`/texas?${params.toString()}`);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    }
    lookupAgent();
  }, [slug, router]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#EDF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🐝</p>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#053249', marginBottom: 8 }}>Link Not Found</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>This agent link doesn&apos;t exist or has expired.</p>
          <a href="/texas" style={{ display: 'inline-block', background: '#1C7CE5', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 8, textDecoration: 'none' }}>
            Go to Calculator →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#EDF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🐝</div>
        <p style={{ color: '#6B7280', fontSize: 16 }}>Redirecting...</p>
      </div>
    </div>
  );
}
