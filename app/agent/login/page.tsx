'use client';
import { useState } from 'react';

const C = {
  amber: '#F59E0B',
  amberDark: '#D97706',
  navy: '#053249',
  gray: '#64748B',
  grayLight: '#F1F5F9',
  white: '#FFFFFF',
  green: '#059669',
  red: '#DC2626',
  sky: '#EDF6FF',
};

export default function AgentLogin() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const resp = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        setError(data.error || 'Failed to send login link');
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // Check for error params
  const errorMessages: Record<string, string> = {
    missing_token: 'Login link is missing or invalid.',
    invalid_token: 'Login link has expired or already been used. Please request a new one.',
    agent_not_found: 'Account not found. Please sign up first.',
    verification_failed: 'Verification failed. Please try again.',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.grayLight, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: C.navy }}>
              🐝 Bee<span style={{ color: C.amber }}>Exemption</span>
            </span>
          </a>
          <p style={{ color: C.gray, fontSize: 14, marginTop: 8 }}>Agent Portal</p>
        </div>

        {/* Login Card */}
        <div style={{
          background: C.white,
          borderRadius: 16,
          padding: '40px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
                Check Your Email
              </h1>
              <p style={{ color: C.gray, fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
                We sent a sign-in link to <strong style={{ color: C.navy }}>{email}</strong>.
                Click the link in the email to access your dashboard.
              </p>
              <p style={{ color: C.gray, fontSize: 13 }}>
                Link expires in 15 minutes. Check your spam folder if you don&apos;t see it.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                style={{
                  marginTop: 20,
                  background: 'none',
                  border: 'none',
                  color: C.amber,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 style={{
                fontSize: 28,
                fontWeight: 700,
                color: C.navy,
                marginBottom: 8,
                textAlign: 'center',
              }}>
                Agent Sign In
              </h1>
              <p style={{ color: C.gray, fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
                Enter your email to receive a magic login link
              </p>

              {(error || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error'))) && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 20,
                  color: C.red,
                  fontSize: 14,
                }}>
                  {error || (typeof window !== 'undefined' && errorMessages[new URLSearchParams(window.location.search).get('error') || '']) || 'An error occurred.'}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="agent@example.com"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: '2px solid #E2E8F0',
                      fontSize: 16,
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = C.amber}
                    onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px 24px',
                    borderRadius: 10,
                    background: loading ? C.gray : C.amber,
                    color: C.white,
                    fontSize: 16,
                    fontWeight: 700,
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {loading ? 'Sending...' : 'Send Magic Link ✨'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <a
                  href="/agents"
                  style={{ color: C.amber, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  Don&apos;t have an account? Get started →
                </a>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <a
            href="mailto:scout@beekings.com?subject=BeeExemption%20Support%20Request"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: C.white,
              border: `1px solid #E2E8F0`,
              borderRadius: 8,
              padding: '10px 20px',
              color: C.navy,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              transition: 'border-color 0.2s',
            }}
          >
            📧 Contact Help
          </a>
          <p style={{ color: C.gray, fontSize: 12, marginTop: 12 }}>
            © {new Date().getFullYear()} BeeExemption · <a href="/" style={{ color: C.gray }}>Home</a>
          </p>
        </div>
      </div>
    </div>
  );
}
