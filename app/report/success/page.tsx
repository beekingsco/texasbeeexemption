'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function SuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  const sessionId = params.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMsg('No session ID found. Please try again.');
      return;
    }

    async function verifyPayment() {
      try {
        const res = await fetch(`/api/stripe/verify?session_id=${sessionId}`);
        const data = await res.json();

        if (data.paid) {
          setStatus('success');
          
          // Build the report URL with access param
          const reportParams = new URLSearchParams();
          // Copy all params except session_id to the report URL
          params.forEach((value, key) => {
            if (key !== 'session_id') {
              reportParams.set(key, value);
            }
          });
          reportParams.set('access', sessionId!);

          // Redirect to the full report after a short delay
          setTimeout(() => {
            router.replace(`/report?${reportParams.toString()}`);
          }, 2500);
        } else {
          setStatus('error');
          setErrorMsg('Payment could not be verified. If you were charged, please contact support.');
        }
      } catch {
        setStatus('error');
        setErrorMsg('Failed to verify payment. Please try again or contact support.');
      }
    }

    verifyPayment();
  }, [sessionId, params, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: '#faf9f6',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      <div className="text-center p-12" style={{ maxWidth: 500 }}>
        {status === 'verifying' && (
          <>
            <div className="text-6xl mb-6 animate-bounce">🐝</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#2d2d2d', marginBottom: 12 }}>
              Verifying Your Payment...
            </h1>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.6 }}>
              Hang tight — we&apos;re confirming your purchase with Stripe.
            </p>
            <div
              style={{
                width: 48,
                height: 48,
                border: '4px solid #e5e5e0',
                borderTopColor: '#d4a843',
                borderRadius: '50%',
                margin: '24px auto 0',
                animation: 'spin 1s linear infinite',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#15803d', marginBottom: 12 }}>
              Payment Confirmed!
            </h1>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.6, marginBottom: 8 }}>
              Your full report is unlocked. Redirecting you now...
            </p>
            <p style={{ fontSize: 13, color: '#999' }}>
              If you&apos;re not redirected, <a href="#" onClick={(e) => {
                e.preventDefault();
                const reportParams = new URLSearchParams();
                params.forEach((value, key) => {
                  if (key !== 'session_id') reportParams.set(key, value);
                });
                reportParams.set('access', sessionId!);
                router.replace(`/report?${reportParams.toString()}`);
              }} style={{ color: '#2563eb', fontWeight: 600 }}>click here</a>.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-6">⚠️</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#c53030', marginBottom: 12 }}>
              Something Went Wrong
            </h1>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
              {errorMsg}
            </p>
            <a
              href="mailto:support@beeexemption.com"
              style={{
                display: 'inline-block',
                background: '#2d2d2d',
                color: 'white',
                fontWeight: 700,
                fontSize: 15,
                padding: '12px 28px',
                borderRadius: 10,
                textDecoration: 'none',
              }}
            >
              Contact Support
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: '#faf9f6' }}
        >
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🐝</div>
            <p className="text-lg font-bold text-gray-700">Loading...</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
