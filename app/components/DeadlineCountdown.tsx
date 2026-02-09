'use client';

import { useState, useEffect } from 'react';

interface DeadlineCountdownProps {
  deadlineISO: string;
  timezone: string;
  deadlineText: string;
  stateName: string;
  programName: string;
}

export default function DeadlineCountdown({
  deadlineISO,
  timezone,
  deadlineText,
  stateName,
  programName,
}: DeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [hasPassed, setHasPassed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const update = () => {
      const now = Date.now();
      const deadlineMs = new Date(deadlineISO).getTime();
      const diff = deadlineMs - now;

      if (diff <= 0) {
        setHasPassed(true);
        setTimeLeft(null);
        return;
      }

      setHasPassed(false);
      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setTimeLeft({ days, hours, minutes, seconds });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadlineISO, timezone]);

  if (!mounted) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  const deadlineYear = new Date(deadlineISO).getFullYear();
  const nextYear = deadlineYear + 1;

  const barStyle: React.CSSProperties = {
    background: '#2D2D2D',
    color: '#FFFFFF',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
    fontSize: 14,
    fontWeight: 600,
    width: '100%',
  };

  const numberStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.15)',
    padding: '2px 8px',
    borderRadius: 6,
    fontWeight: 900,
    fontSize: 16,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
    minWidth: 32,
    textAlign: 'center' as const,
    display: 'inline-block',
    color: '#F59E0B',
  };

  if (hasPassed) {
    return (
      <div style={barStyle}>
        <span>⏰ The {deadlineYear} {stateName} filing deadline has passed.</span>
        <span style={{ opacity: 0.85 }}>Start preparing for {nextYear} now!</span>
      </div>
    );
  }

  if (!timeLeft) return null;

  return (
    <div style={barStyle}>
      <span>⏰ {deadlineText}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={numberStyle}>{timeLeft.days}</span>
        <span style={{ opacity: 0.5, fontSize: 11 }}>d</span>
        <span style={numberStyle}>{pad(timeLeft.hours)}</span>
        <span style={{ opacity: 0.5, fontSize: 11 }}>h</span>
        <span style={numberStyle}>{pad(timeLeft.minutes)}</span>
        <span style={{ opacity: 0.5, fontSize: 11 }}>m</span>
        <span style={numberStyle}>{pad(timeLeft.seconds)}</span>
        <span style={{ opacity: 0.5, fontSize: 11 }}>s</span>
      </span>
    </div>
  );
}
