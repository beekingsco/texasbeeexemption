'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const C = {
  amber: '#F59E0B',
  amberDark: '#D97706',
  amberLight: '#FEF3C7',
  navy: '#053249',
  gray: '#64748B',
  grayLight: '#F1F5F9',
  white: '#FFFFFF',
  green: '#059669',
  red: '#DC2626',
};

export default function AgentLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password');
      setLoading(false);
    } else {
      router.push('/agent/dashboard');
    }
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
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28,
            fontWeight: 700,
            color: C.navy,
            marginBottom: 8,
            textAlign: 'center',
          }}>
            Welcome Back
          </h1>
          <p style={{ color: C.gray, fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
            Sign in to your agent dashboard
          </p>

          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 20,
              color: C.red,
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="agent@example.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: `1px solid #E2E8F0`,
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.navy, marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: `1px solid #E2E8F0`,
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <a
              href="/agent/signup"
              style={{ color: C.amber, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            >
              Don&apos;t have an account? Sign up →
            </a>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: C.gray, fontSize: 12, marginTop: 24 }}>
          © {new Date().getFullYear()} BeeExemption · <a href="/" style={{ color: C.gray }}>Home</a>
        </p>
      </div>
    </div>
  );
}
