'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function NationalLanding() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStates = US_STATES.filter((state) =>
    state.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStateClick = async (stateCode: string, stateName: string) => {
    // Track interest
    try {
      await fetch('/api/state-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: stateName }),
      });
    } catch (e) {
      console.error('Failed to track state interest:', e);
    }

    // Route to appropriate page
    if (stateCode === 'TX') {
      router.push('/texas');
    } else {
      router.push(`/state/${stateCode.toLowerCase()}`);
    }
  };

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
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h1
            style={{
              color: C.white,
              fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
              fontWeight: 700,
              margin: 0,
            }}
          >
            Save Money on Property Taxes with Bees 🐝
          </h1>
          <p
            style={{
              color: C.white,
              fontSize: 'clamp(1rem, 3vw, 1.25rem)',
              margin: '0.75rem 0 0 0',
              opacity: 0.95,
            }}
          >
            Select your state to see how much you could save
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Search Box */}
        <div style={{ marginBottom: '2rem' }}>
          <input
            type="text"
            placeholder="Search for your state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.125rem',
              border: `2px solid ${C.blue}`,
              borderRadius: '12px',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = C.navy;
              e.target.style.boxShadow = `0 0 0 3px ${C.sky}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = C.blue;
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* State Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {filteredStates.map((state) => (
            <button
              key={state.code}
              onClick={() => handleStateClick(state.code, state.name)}
              style={{
                backgroundColor: C.white,
                border: `2px solid ${C.blue}`,
                borderRadius: '12px',
                padding: '1.5rem 1rem',
                fontSize: '1.125rem',
                fontWeight: 600,
                color: C.navy,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = C.blue;
                e.currentTarget.style.color = C.white;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(28, 124, 229, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = C.white;
                e.currentTarget.style.color = C.navy;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {state.name}
              {state.code === 'TX' && (
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                    color: C.green,
                    fontWeight: 700,
                  }}
                >
                  ✓ Available Now
                </span>
              )}
            </button>
          ))}
        </div>

        {filteredStates.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: C.gray,
              fontSize: '1.125rem',
            }}
          >
            No states found matching &quot;{searchTerm}&quot;
          </div>
        )}

        {/* Footer Info */}
        <div
          style={{
            marginTop: '4rem',
            padding: '2rem',
            backgroundColor: C.white,
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ color: C.navy, fontSize: '1.5rem', marginBottom: '1rem' }}>
            How It Works
          </h2>
          <p style={{ color: C.gray, lineHeight: 1.7, fontSize: '1rem', margin: 0 }}>
            Beekeeping can qualify as agricultural use in most states, potentially reducing your
            property taxes by thousands of dollars per year. Select your state above to see
            available resources, requirements, and calculate your potential savings.
          </p>
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
