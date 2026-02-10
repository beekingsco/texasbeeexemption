'use client';

const STATE_FLAGS: Record<string, string> = {
  TX: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Flag_of_Texas.svg/80px-Flag_of_Texas.svg.png',
  FL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Flag_of_Florida.svg/80px-Flag_of_Florida.svg.png',
  AR: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Flag_of_Arkansas.svg/80px-Flag_of_Arkansas.svg.png',
  LA: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Flag_of_Louisiana.svg/80px-Flag_of_Louisiana.svg.png',
  WA: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Flag_of_Washington.svg/80px-Flag_of_Washington.svg.png',
  OR: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Flag_of_Oregon.svg/80px-Flag_of_Oregon.svg.png',
  CA: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Flag_of_California.svg/80px-Flag_of_California.svg.png',
};

export default function StateBadge({ stateCode, stateName }: { stateCode: string; stateName: string }) {
  const flagUrl = STATE_FLAGS[stateCode];
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        padding: '6px 12px 6px 8px',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {flagUrl && (
        <img
          src={flagUrl}
          alt={`${stateName} flag`}
          style={{ height: 20, borderRadius: 2, boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }}
        />
      )}
      <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', letterSpacing: '0.02em' }}>
        {stateName}
      </span>
    </div>
  );
}
