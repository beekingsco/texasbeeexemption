'use client';

interface StickyUnlockBarProps {
  onUnlock: () => void;
  savingsAmount: string;
  isVisible: boolean;
}

export default function StickyUnlockBar({ onUnlock, savingsAmount, isVisible }: StickyUnlockBarProps) {
  if (!isVisible) return null;

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the bar */}
      <div style={{ height: 80 }} />
      
      {/* Sticky bar */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'linear-gradient(180deg, rgba(45,45,45,0.95) 0%, rgba(30,30,30,0.98) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(212, 168, 67, 0.3)',
          padding: '12px 20px',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'white',
                margin: 0,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
              }}
            >
              Unlock Your Full Report
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>
              Save {savingsAmount}/year · Step-by-step guide · Shopping list · Local resources
            </p>
          </div>
          <button
            onClick={onUnlock}
            style={{
              flexShrink: 0,
              background: '#d4a843',
              color: '#2d2d2d',
              fontWeight: 800,
              fontSize: 15,
              padding: '12px 28px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(212, 168, 67, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            $14.99 — Get Full Report
          </button>
        </div>
      </div>
    </>
  );
}
