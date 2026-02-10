'use client';

import { ReactNode } from 'react';

interface BlurredSectionProps {
  children: ReactNode;
  isLocked: boolean;
  onUnlock: () => void;
  savingsAmount?: string;
  isDemo?: boolean;
}

export default function BlurredSection({ children, isLocked, onUnlock, savingsAmount, isDemo }: BlurredSectionProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Blurred content */}
      <div
        style={{
          filter: 'blur(8px)',
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(250,249,246,0) 0%, rgba(250,249,246,0.4) 20%, rgba(250,249,246,0.7) 50%, rgba(250,249,246,0.9) 80%, rgba(250,249,246,0.95) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        {/* Unlock prompt card */}
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            padding: '36px 40px',
            maxWidth: 420,
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid rgba(212, 168, 67, 0.3)',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>{isDemo ? '🐝' : '🔒'}</div>
          <h3
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: '#2d2d2d',
              marginBottom: 8,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
            }}
          >
            {isDemo ? 'Full Reports for Your Clients' : 'This Section Is Locked'}
          </h3>
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
            {isDemo
              ? 'As a BeeExemption agent, your clients get the complete report — white-labeled with your branding, logo, and contact info.'
              : 'Get your complete personalized report with step-by-step instructions, shopping lists, and local resources.'}
          </p>
          {savingsAmount && !isDemo && (
            <p style={{ fontSize: 13, color: '#15803d', fontWeight: 700, marginBottom: 20 }}>
              💰 Your report shows {savingsAmount}/year in savings
            </p>
          )}
          {isDemo ? (
            <a
              href="/agents"
              style={{
                display: 'block',
                background: '#d4a843',
                color: '#2d2d2d',
                fontWeight: 800,
                fontSize: 16,
                padding: '14px 24px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                boxSizing: 'border-box',
                textAlign: 'center',
                textDecoration: 'none',
                transition: 'all 0.2s',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
              }}
            >
              Start Your Free Trial →
            </a>
          ) : (
            <button
              onClick={onUnlock}
              style={{
                display: 'inline-block',
                background: '#d4a843',
                color: '#2d2d2d',
                fontWeight: 800,
                fontSize: 16,
                padding: '14px 32px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.2s',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Unlock Full Report — $14.99
            </button>
          )}
          <p style={{ fontSize: 11, color: '#999', marginTop: 12 }}>
            {isDemo
              ? 'Branded reports · Unlimited leads · Cancel anytime'
              : 'One-time payment · Instant access · Secure checkout'}
          </p>
        </div>
      </div>
    </div>
  );
}
