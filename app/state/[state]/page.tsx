'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { US_STATES } from '@/lib/states';

const C = {
  sky: '#EDF6FF',
  blue: '#1C7CE5',
  blueDark: '#1A5CA3',
  navy: '#053249',
  green: '#57C975',
  greenDark: '#249241',
  white: '#FFFFFF',
  gray: '#6B7280',
  lightGray: '#F8FAFC',
};

export default function StatePage() {
  const params = useParams();
  const router = useRouter();
  const stateCode = (params.state as string)?.toUpperCase();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const state = US_STATES.find((s) => s.code === stateCode);
  const stateName = state?.name || 'this state';

  useEffect(() => {
    // Redirect Texas to calculator
    if (stateCode === 'TX') {
      router.push('/texas');
    }
  }, [stateCode, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email,
          state: stateName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Waitlist submission error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (stateCode === 'TX') {
    return null; // Will redirect
  }

  if (!state) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.sky, padding: '2rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ color: C.navy, fontSize: '2rem' }}>State not found</h1>
          <button
            onClick={() => router.push('/')}
            style={{
              marginTop: '2rem',
              padding: '1rem 2rem',
              backgroundColor: C.blue,
              color: C.white,
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to State Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.sky }}>
      {/* Header */}
      <header
        style={{
          background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
          padding: '1.5rem 1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: 'none',
              color: C.white,
              fontSize: '0.9rem',
              cursor: 'pointer',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            ← Back to state selection
          </button>
          <h1
            style={{
              color: C.white,
              fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
              fontWeight: 700,
              margin: 0,
              textAlign: 'center',
            }}
          >
            We aren&apos;t quite buzzing in {stateName} yet! 🐝
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 1rem' }}>
        {!submitted ? (
          <div
            style={{
              backgroundColor: C.white,
              borderRadius: '16px',
              padding: '2.5rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            }}
          >
            <h2
              style={{
                color: C.navy,
                fontSize: '1.75rem',
                marginBottom: '1rem',
                textAlign: 'center',
              }}
            >
              Want to be notified when we launch?
            </h2>
            <p
              style={{
                color: C.gray,
                fontSize: '1rem',
                lineHeight: 1.6,
                textAlign: 'center',
                marginBottom: '2rem',
              }}
            >
              We&apos;re working on bringing bee exemption resources to {stateName}. Leave your
              email and we&apos;ll let you know as soon as we launch.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="firstName"
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: C.navy,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `2px solid ${C.lightGray}`,
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.blue)}
                  onBlur={(e) => (e.target.style.borderColor = C.lightGray)}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="lastName"
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: C.navy,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `2px solid ${C.lightGray}`,
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.blue)}
                  onBlur={(e) => (e.target.style.borderColor = C.lightGray)}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    color: C.navy,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1rem',
                    border: `2px solid ${C.lightGray}`,
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = C.blue)}
                  onBlur={(e) => (e.target.style.borderColor = C.lightGray)}
                />
              </div>

              {error && (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: isSubmitting ? C.gray : C.green,
                  color: C.white,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = C.greenDark;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = C.green;
                  }
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Notify Me 🐝'}
              </button>
            </form>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: C.white,
              borderRadius: '16px',
              padding: '3rem 2rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '4rem',
                marginBottom: '1rem',
              }}
            >
              ✅
            </div>
            <h2
              style={{
                color: C.navy,
                fontSize: '2rem',
                marginBottom: '1rem',
              }}
            >
              You&apos;re on the list!
            </h2>
            <p
              style={{
                color: C.gray,
                fontSize: '1.125rem',
                lineHeight: 1.6,
                marginBottom: '2rem',
              }}
            >
              We&apos;ll notify you as soon as we launch in {stateName}. Thanks for your interest!
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '1rem 2rem',
                backgroundColor: C.blue,
                color: C.white,
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = C.blueDark;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = C.blue;
              }}
            >
              Back to Home
            </button>
          </div>
        )}

        {/* Additional Info */}
        <div
          style={{
            marginTop: '3rem',
            padding: '2rem',
            backgroundColor: C.white,
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <h3 style={{ color: C.navy, fontSize: '1.25rem', marginBottom: '1rem' }}>
            Already available in Texas!
          </h3>
          <p style={{ color: C.gray, lineHeight: 1.7, marginBottom: '1.5rem' }}>
            Our Texas calculator is live now. See how much you could save on property taxes with
            beekeeping.
          </p>
          <button
            onClick={() => router.push('/texas')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: C.green,
              color: C.white,
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = C.greenDark;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = C.green;
            }}
          >
            Try Texas Calculator →
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: C.navy,
          color: C.white,
          padding: '2rem 1rem',
          marginTop: '4rem',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, opacity: 0.9 }}>
          &copy; {new Date().getFullYear()} Bee Exemption — Powered by{' '}
          <a
            href="https://beekings.com"
            style={{ color: C.green, textDecoration: 'none' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            BeeKings
          </a>
        </p>
      </footer>
    </div>
  );
}
