'use client';

import { useState } from 'react';

const C = {
  sky: '#F0F4FA',
  blue: '#1A3A6B',
  navy: '#0D1B2A',
  green: '#D4A843',
  greenDark: '#B8912E',
  white: '#FFFFFF',
  gray: '#5A6A7A',
  charcoal: '#2d2d2d',
  red: '#DC2626',
  lightGreen: '#10B981',
};

export default function PricingPage() {
  const [agentExpanded, setAgentExpanded] = useState(false);
  const [promoCode, setPromoCode] = useState<{ [key: string]: string }>({});
  const [promoStatus, setPromoStatus] = useState<{ [key: string]: { valid: boolean; message: string } | null }>({});
  const [validatingPromo, setValidatingPromo] = useState<{ [key: string]: boolean }>({});

  const validatePromoCode = async (tier: string, code: string) => {
    if (!code.trim()) {
      setPromoStatus({ ...promoStatus, [tier]: null });
      return;
    }

    setValidatingPromo({ ...validatingPromo, [tier]: true });
    
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      
      if (data.valid) {
        setPromoStatus({
          ...promoStatus,
          [tier]: {
            valid: true,
            message: data.coupon.type === 'discount' 
              ? `${data.coupon.value}% off applied!` 
              : `${data.coupon.value} day trial applied!`
          }
        });
      } else {
        setPromoStatus({
          ...promoStatus,
          [tier]: {
            valid: false,
            message: data.error || 'Invalid promo code'
          }
        });
      }
    } catch (err) {
      console.error('Promo validation error:', err);
      setPromoStatus({
        ...promoStatus,
        [tier]: {
          valid: false,
          message: 'Error validating code'
        }
      });
    } finally {
      setValidatingPromo({ ...validatingPromo, [tier]: false });
    }
  };

  const handleCheckout = async (tier: string) => {
    try {
      const couponCode = promoCode[tier]?.trim() || undefined;
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, propertyData: {}, couponCode }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  return (
    <div style={{ background: C.sky, minHeight: '100vh' }}>
      <style>{`
        @keyframes wiggle { 0%, 100% { transform: rotate(0deg); } 15% { transform: rotate(-2deg); } 30% { transform: rotate(2deg); } 45% { transform: rotate(-1.5deg); } 60% { transform: rotate(1deg); } 75% { transform: rotate(-0.5deg); } }
        .cta-wiggle { animation: wiggle 2.5s ease-in-out infinite; animation-delay: 3s; }
        .cta-wiggle:hover { animation: none; transform: scale(1.03); transition: transform 0.15s ease; }
        .plan-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.12) !important; }
      `}</style>

      {/* Header */}
      <div style={{ background: C.charcoal, padding: '48px 24px 56px', textAlign: 'center' }}>
        <p style={{ color: C.green, fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>
          BEEEXEMPTION.COM
        </p>
        <h1 style={{ color: C.white, fontSize: 36, fontWeight: 900, lineHeight: 1.15, maxWidth: 600, margin: '0 auto 12px' }}>
          Choose Your Plan
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, maxWidth: 480, margin: '0 auto' }}>
          Find out exactly how much you&apos;ll save — and get everything you need to file your ag exemption
        </p>
      </div>

      {/* Plans */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 60px' }}>

        {/* Consumer Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 48 }}>

          {/* Single Report */}
          <div className="plan-card" style={{ background: C.white, borderRadius: 20, padding: 32, border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Single Report</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 48, fontWeight: 900, color: C.navy }}>$14.99</span>
            </div>
            <p style={{ fontSize: 14, color: C.gray, marginBottom: 24 }}>One property, one-time purchase</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {[
                'Personalized savings calculation',
                'Step-by-step application guide',
                'County-specific deadlines & forms',
                'Shopping list with Amazon links',
                'Local bee suppliers directory',
                'Hive placement guide',
                'Record keeping templates',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: C.green, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 14, color: '#444' }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Promo Code Input */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Promo code"
                  value={promoCode['single'] || ''}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setPromoCode({ ...promoCode, single: value });
                    if (!value) setPromoStatus({ ...promoStatus, single: null });
                  }}
                  onBlur={(e) => validatePromoCode('single', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1px solid ${promoStatus['single']?.valid === false ? C.red : '#d1d5db'}`,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => validatePromoCode('single', promoCode['single'] || '')}
                  disabled={!promoCode['single'] || validatingPromo['single']}
                  style={{
                    padding: '10px 16px',
                    background: C.navy,
                    color: C.white,
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: promoCode['single'] && !validatingPromo['single'] ? 'pointer' : 'not-allowed',
                    opacity: promoCode['single'] && !validatingPromo['single'] ? 1 : 0.5,
                    fontFamily: 'inherit',
                  }}
                >
                  {validatingPromo['single'] ? '...' : 'Apply'}
                </button>
              </div>
              {promoStatus['single'] && (
                <p style={{
                  fontSize: 12,
                  marginTop: 6,
                  color: promoStatus['single'].valid ? C.lightGreen : C.red,
                  fontWeight: 600,
                }}>
                  {promoStatus['single'].message}
                </p>
              )}
            </div>

            <button
              onClick={() => handleCheckout('single')}
              className="cta-wiggle"
              style={{ width: '100%', background: C.green, color: C.navy, fontWeight: 700, fontSize: 16, padding: '16px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(212,168,67,0.3)' }}
            >
              Get Your Report →
            </button>
          </div>

          {/* Unlimited */}
          <div className="plan-card" style={{ background: C.white, borderRadius: 20, padding: 32, border: `2px solid ${C.blue}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: C.blue, color: C.white, fontSize: 11, fontWeight: 700, padding: '5px 16px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Best Value
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Unlimited Access</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 48, fontWeight: 900, color: C.navy }}>$29.99</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: C.gray }}>/mo</span>
            </div>
            <p style={{ fontSize: 14, color: C.gray, marginBottom: 24 }}>Search any property, any county — unlimited</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {[
                'Everything in Single Report',
                'Unlimited property searches',
                'Any county in Texas',
                'Compare multiple properties',
                'Perfect for property shoppers',
                'Updated data & new features',
                'Cancel anytime',
              ].map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: C.green, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 14, color: '#444' }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Promo Code Input */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Promo code"
                  value={promoCode['unlimited'] || ''}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setPromoCode({ ...promoCode, unlimited: value });
                    if (!value) setPromoStatus({ ...promoStatus, unlimited: null });
                  }}
                  onBlur={(e) => validatePromoCode('unlimited', e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1px solid ${promoStatus['unlimited']?.valid === false ? C.red : '#d1d5db'}`,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => validatePromoCode('unlimited', promoCode['unlimited'] || '')}
                  disabled={!promoCode['unlimited'] || validatingPromo['unlimited']}
                  style={{
                    padding: '10px 16px',
                    background: C.navy,
                    color: C.white,
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: promoCode['unlimited'] && !validatingPromo['unlimited'] ? 'pointer' : 'not-allowed',
                    opacity: promoCode['unlimited'] && !validatingPromo['unlimited'] ? 1 : 0.5,
                    fontFamily: 'inherit',
                  }}
                >
                  {validatingPromo['unlimited'] ? '...' : 'Apply'}
                </button>
              </div>
              {promoStatus['unlimited'] && (
                <p style={{
                  fontSize: 12,
                  marginTop: 6,
                  color: promoStatus['unlimited'].valid ? C.lightGreen : C.red,
                  fontWeight: 600,
                }}>
                  {promoStatus['unlimited'].message}
                </p>
              )}
            </div>

            <button
              onClick={() => handleCheckout('unlimited')}
              className="cta-wiggle"
              style={{ width: '100%', background: C.blue, color: C.white, fontWeight: 700, fontSize: 16, padding: '16px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(26,58,107,0.3)' }}
            >
              Start Unlimited Access →
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: C.gray, marginTop: 10 }}>
              Save vs buying 2+ individual reports
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ height: 1, background: '#d1d5db', marginBottom: 20 }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: '0.15em' }}>For Real Estate Professionals</p>
        </div>

        {/* Agent Plan */}
        <div className="plan-card" style={{ background: C.white, borderRadius: 20, padding: 36, border: `2px solid ${C.green}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>🏠</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Agent Partner Program</p>
              <p style={{ fontSize: 14, color: C.gray }}>White-label reports for your clients</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: C.navy }}>$297</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: C.gray }}>/year for 1 county</span>
          </div>
          <p style={{ fontSize: 14, color: C.blue, fontWeight: 600, marginBottom: 8 }}>or $497/year for the entire state</p>
          <p style={{ fontSize: 13, color: C.green, fontWeight: 700, marginBottom: 24 }}>🎁 7-day free trial — try it risk-free</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { icon: '🏷️', text: 'Your logo on every report' },
              { icon: '📊', text: 'Unlimited reports for clients' },
              { icon: '🔔', text: 'Lead notifications when people use your link' },
              { icon: '🔗', text: 'Private branded link to share' },
              { icon: '📋', text: 'Client contact list & dashboard' },
              { icon: '🤝', text: 'Shared leads — they\'re your clients' },
              { icon: '🐝', text: 'BeeKings handles the bee setup' },
              { icon: '🏅', text: 'BeeKings Certified Partner badge' },
            ].map((item) => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 14, color: '#444' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setAgentExpanded(!agentExpanded)}
            style={{ width: '100%', background: 'transparent', border: `2px solid ${C.green}`, color: C.navy, fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}
          >
            {agentExpanded ? 'Hide details ↑' : 'How does it work? ↓'}
          </button>

          {agentExpanded && (
            <div style={{ background: C.sky, borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { step: '1', title: 'Sign up & upload your logo', desc: 'We create your branded report template and private link.' },
                  { step: '2', title: 'Share your link with clients', desc: 'They enter their property address and instantly see their potential savings.' },
                  { step: '3', title: 'You get notified', desc: 'Every time someone uses your link, you get their name, email, and property details.' },
                  { step: '4', title: 'Print custom reports', desc: 'Generate professional, white-labeled reports for any client meeting — unlimited.' },
                  { step: '5', title: 'BeeKings handles the bees', desc: 'When your client is ready, we provide equipment, bees, and setup support. You look like a hero.' },
                ].map((item) => (
                  <div key={item.step} style={{ display: 'flex', gap: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.green, color: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{item.step}</div>
                    <div>
                      <p style={{ fontWeight: 700, color: C.navy, fontSize: 14 }}>{item.title}</p>
                      <p style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Promo Code Input */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Promo code (e.g., REALTOR50)"
                value={promoCode['agent'] || ''}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setPromoCode({ ...promoCode, agent: value });
                  if (!value) setPromoStatus({ ...promoStatus, agent: null });
                }}
                onBlur={(e) => validatePromoCode('agent', e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${promoStatus['agent']?.valid === false ? C.red : '#d1d5db'}`,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => validatePromoCode('agent', promoCode['agent'] || '')}
                disabled={!promoCode['agent'] || validatingPromo['agent']}
                style={{
                  padding: '10px 16px',
                  background: C.navy,
                  color: C.white,
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: promoCode['agent'] && !validatingPromo['agent'] ? 'pointer' : 'not-allowed',
                  opacity: promoCode['agent'] && !validatingPromo['agent'] ? 1 : 0.5,
                  fontFamily: 'inherit',
                }}
              >
                {validatingPromo['agent'] ? '...' : 'Apply'}
              </button>
            </div>
            {promoStatus['agent'] && (
              <p style={{
                fontSize: 12,
                marginTop: 6,
                color: promoStatus['agent'].valid ? C.lightGreen : C.red,
                fontWeight: 600,
              }}>
                {promoStatus['agent'].message}
              </p>
            )}
          </div>

          <button
            onClick={() => handleCheckout('agent')}
            className="cta-wiggle"
            style={{ width: '100%', background: C.green, color: C.navy, fontWeight: 700, fontSize: 16, padding: '16px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(212,168,67,0.3)' }}
          >
            Start Your Free 7-Day Trial →
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: C.gray, marginTop: 10 }}>
            No charge for 7 days • Cancel anytime • One commission pays for 10 years
          </p>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 640, margin: '48px auto 0', textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 24 }}>Common Questions</h3>
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { q: 'Can I cancel my subscription anytime?', a: 'Yes — cancel anytime from your account. No contracts, no cancellation fees.' },
              { q: 'What\'s included in the enhanced report?', a: 'A personalized property analysis with exact savings calculations, step-by-step application instructions for your county, a shopping list with direct Amazon links, local bee supplier directory, hive placement guide, and record keeping templates.' },
              { q: 'Why would a real estate agent use this?', a: 'It\'s a powerful lead magnet. Share your branded link, get notified when potential clients research properties, and show them exactly how much they\'ll save. It helps you close deals by quantifying a benefit most buyers don\'t know about.' },
              { q: 'Do agents get access to client information?', a: 'Yes — every person who uses your branded link becomes a shared lead. You get their name, email, and property details. They\'re your client — we just help with the bee side.' },
              { q: 'Can I cover more than one county?', a: 'Yes! Choose the Entire State plan at $497/year and you get access to all 254 Texas counties. Or start with a single county at $297/year and upgrade anytime.' },
            ].map((faq) => (
              <div key={faq.q} style={{ background: C.white, borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
                <p style={{ fontWeight: 700, color: C.navy, fontSize: 14, marginBottom: 6 }}>{faq.q}</p>
                <p style={{ fontSize: 13, color: C.gray, lineHeight: 1.6 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
