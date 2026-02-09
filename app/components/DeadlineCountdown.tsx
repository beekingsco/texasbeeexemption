'use client';

import { useState, useEffect } from 'react';

interface DeadlineCountdownProps {
  /** Deadline date string, e.g. "2026-04-30T23:59:59" */
  deadlineISO: string;
  /** IANA timezone, e.g. "America/Chicago" */
  timezone: string;
  /** Text shown below the countdown numbers */
  deadlineText: string;
  /** State name for the "passed" message */
  stateName: string;
  /** e.g. "Ag Exemption" or "Agricultural Classification" */
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

    const getDeadlineMs = () => {
      // Create deadline in the target timezone
      // We parse the ISO string and treat it as the deadline in that timezone
      const deadlineDate = new Date(deadlineISO);
      return deadlineDate.getTime();
    };

    const update = () => {
      const now = Date.now();
      const deadlineMs = getDeadlineMs();
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

  // Don't render on server to avoid hydration mismatch
  if (!mounted) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  // Extract year from deadline for messaging
  const deadlineYear = new Date(deadlineISO).getFullYear();
  const nextYear = deadlineYear + 1;

  return (
    <>
      <style>{`
        @keyframes countdownPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
        }
        @keyframes countdownFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .countdown-banner {
          animation: countdownPulse 3s ease-in-out infinite, countdownFadeIn 0.5s ease-out;
          background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
          border: 2px solid #F59E0B;
          border-radius: 16px;
          padding: 24px 20px;
          text-align: center;
          max-width: 720px;
          margin: 0 auto;
        }
        .countdown-grid {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin: 16px 0;
        }
        .countdown-unit {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .countdown-number {
          background: #92400E;
          color: #FEF3C7;
          font-size: 36px;
          font-weight: 900;
          min-width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          font-variant-numeric: tabular-nums;
          box-shadow: 0 4px 12px rgba(146, 64, 14, 0.3);
          letter-spacing: -0.02em;
        }
        .countdown-label {
          font-size: 11px;
          font-weight: 700;
          color: #92400E;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 6px;
        }
        .countdown-separator {
          font-size: 32px;
          font-weight: 900;
          color: #B45309;
          display: flex;
          align-items: center;
          padding-bottom: 20px;
        }
        .countdown-passed {
          background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
          border: 2px solid #F59E0B;
          border-radius: 16px;
          padding: 24px 20px;
          text-align: center;
          max-width: 720px;
          margin: 0 auto;
          animation: countdownFadeIn 0.5s ease-out;
        }
        @media (max-width: 768px) {
          .countdown-number {
            font-size: 24px;
            min-width: 52px;
            height: 52px;
            border-radius: 10px;
          }
          .countdown-separator {
            font-size: 24px;
            padding-bottom: 14px;
          }
          .countdown-grid {
            gap: 6px;
          }
          .countdown-label {
            font-size: 9px;
          }
          .countdown-banner {
            padding: 16px 12px;
            border-radius: 12px;
          }
        }
      `}</style>

      {hasPassed ? (
        <div className="countdown-passed">
          <p style={{ fontSize: 16, fontWeight: 800, color: '#92400E', marginBottom: 4 }}>
            ⏰ Deadline Passed
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#B45309', lineHeight: 1.5 }}>
            The {deadlineYear} filing deadline has passed. Start preparing for {nextYear} now!
          </p>
          <p style={{ fontSize: 13, color: '#92400E', marginTop: 8, opacity: 0.8 }}>
            Get your {stateName} {programName} guide ready so you don&apos;t miss the next deadline.
          </p>
        </div>
      ) : timeLeft ? (
        <div className="countdown-banner">
          <p style={{ fontSize: 16, fontWeight: 800, color: '#92400E', marginBottom: 4, letterSpacing: '-0.01em' }}>
            ⏰ Filing Deadline Approaching!
          </p>
          <div className="countdown-grid">
            <div className="countdown-unit">
              <div className="countdown-number">{timeLeft.days}</div>
              <div className="countdown-label">Days</div>
            </div>
            <div className="countdown-separator">:</div>
            <div className="countdown-unit">
              <div className="countdown-number">{pad(timeLeft.hours)}</div>
              <div className="countdown-label">Hours</div>
            </div>
            <div className="countdown-separator">:</div>
            <div className="countdown-unit">
              <div className="countdown-number">{pad(timeLeft.minutes)}</div>
              <div className="countdown-label">Minutes</div>
            </div>
            <div className="countdown-separator">:</div>
            <div className="countdown-unit">
              <div className="countdown-number">{pad(timeLeft.seconds)}</div>
              <div className="countdown-label">Seconds</div>
            </div>
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#92400E', lineHeight: 1.4 }}>
            {deadlineText}
          </p>
        </div>
      ) : null}
    </>
  );
}
