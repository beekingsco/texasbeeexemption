'use client';

import { ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  eligibilityHeadline,
  readServerUnlock,
  readStoredUnlock,
  savingsRangeLabel,
  splitPersonName,
  subscribeUnlock,
  writeStoredUnlock,
  type StoredUnlock,
} from '@/lib/results-unlock';

export type UnlockInfo = {
  email: string;
  name: string;
  firstName: string;
  lastName: string;
};

type Props = {
  children: ReactNode;
  county: string;
  stateCode: string;
  stateName: string;
  qualifies: boolean | null;
  acresKnown: boolean;
  annualSavings: number | null;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  acres?: number | null;
  appraisedValue?: number | null;
  parcelData?: Record<string, unknown> | null;
  loading?: boolean;
  onUnlocked?: (info: UnlockInfo) => void;
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: '2px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 500,
  color: '#0D1B2A',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

function infoFromStored(saved: StoredUnlock): UnlockInfo {
  const parts = splitPersonName(saved.name || '');
  return {
    email: saved.email,
    name: saved.name || '',
    firstName: saved.firstName || parts.firstName,
    lastName: saved.lastName || parts.lastName,
  };
}

export default function ResultsEmailGate({
  children,
  county,
  stateCode,
  stateName,
  qualifies,
  acresKnown,
  annualSavings,
  address,
  lat,
  lng,
  acres,
  appraisedValue,
  parcelData,
  loading = false,
  onUnlocked,
}: Props) {
  const stored = useSyncExternalStore(subscribeUnlock, readStoredUnlock, readServerUnlock);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const onUnlockedRef = useRef(onUnlocked);

  useEffect(() => {
    onUnlockedRef.current = onUnlocked;
  }, [onUnlocked]);

  useEffect(() => {
    if (stored?.email) onUnlockedRef.current?.(infoFromStored(stored));
  }, [stored]);

  if (stored) return <>{children}</>;

  const headline = eligibilityHeadline({ county, stateName, qualifies, acresKnown: acresKnown && !loading });
  const range = loading ? null : savingsRangeLabel(annualSavings);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const parts = splitPersonName(name);
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'results_unlock',
          name: name.trim(),
          firstName: parts.firstName,
          lastName: parts.lastName,
          email: email.trim(),
          address: address || '',
          county,
          state: stateCode,
          lat: lat ?? null,
          lng: lng ?? null,
          acres: acres ?? null,
          appraisedValue: appraisedValue ?? null,
          estimatedSavings: annualSavings ?? null,
          parcelData: parcelData ?? null,
          source: 'results-gate',
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data && typeof data.error === 'string'
          ? data.error
          : 'Enter a valid email to see your full results.';
        setError(message);
        setSubmitting(false);
        return;
      }
      const info: UnlockInfo = {
        email: email.trim(),
        name: name.trim(),
        firstName: parts.firstName,
        lastName: parts.lastName,
      };
      writeStoredUnlock({
        email: info.email,
        name: info.name,
        firstName: info.firstName,
        lastName: info.lastName,
        address,
        county,
        state: stateCode,
      });
      onUnlockedRef.current?.(info);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '28px 24px',
        marginBottom: 16,
        border: '1px solid #D5EAFF',
        boxShadow: '0 8px 32px rgba(13,27,42,0.08)',
      }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1A3A6B', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>
          {county} County, {stateName}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0D1B2A', lineHeight: 1.3, marginBottom: 8 }}>
          {headline}
        </h2>
        {range && (
          <p style={{ fontSize: 16, color: '#5A6A7A', marginBottom: 16 }}>
            Estimated savings <strong style={{ color: '#0D1B2A' }}>{range}/yr</strong>
          </p>
        )}
        {!range && !loading && (
          <p style={{ fontSize: 15, color: '#5A6A7A', marginBottom: 16 }}>
            {qualifies === false
              ? 'Enter your email to see the acreage detail for this county.'
              : 'Your full county breakdown is ready.'}
          </p>
        )}
        {loading && (
          <p style={{ fontSize: 15, color: '#5A6A7A', marginBottom: 16 }}>
            Pulling property records. You can enter your email while that finishes.
          </p>
        )}
        <form onSubmit={onSubmit}>
            <p style={{ fontSize: 15, color: '#0D1B2A', fontWeight: 700, marginBottom: 14 }}>
              Free — just enter your email to see your full results.
            </p>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0D1B2A', marginBottom: 6 }}>
              Name <span style={{ fontWeight: 400, color: '#5A6A7A' }}>(optional)</span>
            </label>
            <input
              type="text"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Chris Miller"
              style={{ ...fieldStyle, marginBottom: 14 }}
            />
            <label htmlFor="results-unlock-email" style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#0D1B2A', marginBottom: 6 }}>
              Email
            </label>
            <input
              id="results-unlock-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              style={{ ...fieldStyle, marginBottom: 16 }}
            />
            {error && (
              <p style={{ fontSize: 14, color: '#991B1B', fontWeight: 600, marginBottom: 12 }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              style={{
                width: '100%',
                padding: '14px 24px',
                borderRadius: 12,
                border: 'none',
                background: submitting || !email.trim() ? '#93C5FD' : '#1A3A6B',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 16,
                cursor: submitting || !email.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {submitting ? 'Saving…' : 'See my full results'}
            </button>
            <p style={{ fontSize: 12, color: '#5A6A7A', marginTop: 12, textAlign: 'center' }}>
              We&apos;ll never share your info. One email for this search, not a newsletter signup.
            </p>
          </form>
      </div>

      {!loading && (
        <div style={{ position: 'relative', maxHeight: 280, overflow: 'hidden', borderRadius: 16, marginBottom: 24 }}>
          <div
            aria-hidden="true"
            style={{ filter: 'blur(8px)', pointerEvents: 'none', userSelect: 'none' }}
          >
            {children}
          </div>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(240,244,250,0.15) 0%, rgba(240,244,250,0.92) 100%)',
          }} />
        </div>
      )}
    </div>
  );
}
