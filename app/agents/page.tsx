'use client';

import { useState, useEffect, useRef } from 'react';

const C = {
  sky: '#F0F4FA',
  blue: '#1A3A6B',
  navy: '#0D1B2A',
  green: '#D4A843',
  greenDark: '#B8912E',
  white: '#FFFFFF',
  gray: '#5A6A7A',
  charcoal: '#2d2d2d',
  lightGray: '#F5F7FB',
};

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, style: { opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.7s ease-out, transform 0.7s ease-out' } as React.CSSProperties };
}

function FadeSection({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const fade = useFadeIn();
  return (
    <div ref={fade.ref} style={{ ...fade.style, ...style }}>
      {children}
    </div>
  );
}

export default function AgentLandingPage() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'agent', propertyData: {} }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.white }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeInHero { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .hero-animate { animation: fadeInHero 0.8s ease-out; }
        .cta-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .cta-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 28px rgba(212,168,67,0.4) !important; }
        .cta-btn-blue { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .cta-btn-blue:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 28px rgba(26,58,107,0.35) !important; }
        .feature-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.1) !important; }
        .step-card { transition: transform 0.2s ease; }
        .step-card:hover { transform: translateY(-2px); }
        .r-nav-agents { display: flex; align-items: center; gap: 24px; }
        .r-grid-features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .r-grid-roi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .r-grid-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        @media (max-width: 900px) {
          .r-grid-steps { grid-template-columns: repeat(2, 1fr); }
          .r-grid-roi { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .r-nav-agents { display: none; }
          .r-grid-features { grid-template-columns: 1fr; }
          .r-grid-steps { grid-template-columns: 1fr; }
          .hero-flex { flex-direction: column !important; text-align: center !important; }
          .hero-flex > div:first-child { align-items: center !important; }
          .pricing-flex { flex-direction: column !important; }
        }
      `}</style>

      {/* HEADER */}
      <header style={{ background: C.white, borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 36 }} />
            <span style={{ fontWeight: 900, fontSize: 20, color: C.navy, letterSpacing: '-0.02em' }}>BEE EXEMPTION</span>
          </a>
          <nav className="r-nav-agents">
            <a href="/" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>Home</a>
            <a href="/pricing" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>Pricing</a>
            <a href="/agent/login" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>Agent Login</a>
            <button
              onClick={handleCheckout}
              style={{ padding: '10px 20px', borderRadius: 10, background: C.green, color: C.navy, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Start Free Trial
            </button>
          </nav>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      <section style={{ background: `linear-gradient(135deg, ${C.navy} 0%, #1A3A5B 100%)`, padding: '80px 24px 90px', position: 'relative', overflow: 'hidden' }}>
        {/* Background photo overlay */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url(/agent-landowner.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.12 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `linear-gradient(135deg, ${C.navy}ee 0%, #1A3A5Bdd 100%)` }} />
        
        <div className="hero-animate hero-flex" style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 48, position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212,168,67,0.15)', borderRadius: 20, padding: '6px 16px', marginBottom: 20 }}>
              <span style={{ fontSize: 14 }}>🏠</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.green, letterSpacing: '0.05em' }}>FOR REAL ESTATE AGENTS</span>
            </div>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, color: C.white, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
              Turn Every Land Listing Into a Tax-Saving Opportunity
            </h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 36, maxWidth: 520 }}>
              Give your clients something no other agent offers — a personalized property tax savings report. 
              Generate qualified leads, close more deals, and become the go-to agent for rural land.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="cta-btn"
                style={{ padding: '16px 32px', borderRadius: 12, background: C.green, color: C.navy, fontWeight: 800, fontSize: 17, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(212,168,67,0.3)' }}
              >
                {checkoutLoading ? 'Loading...' : 'Start Free 30-Day Trial →'}
              </button>
              <a
                href="#how-it-works"
                style={{ padding: '16px 28px', borderRadius: 12, background: 'transparent', color: C.white, fontWeight: 700, fontSize: 16, border: '2px solid rgba(255,255,255,0.25)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
              >
                See How It Works
              </a>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 14 }}>
              No credit card required • Cancel anytime
            </p>
          </div>
          <div style={{ flex: '0 0 auto', maxWidth: 320 }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 28, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 48 }}>📊</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 4 }}>YOUR CLIENT&apos;S SAVINGS</p>
                <p style={{ fontSize: 32, fontWeight: 900, color: C.green }}>$5,847</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>per year in property tax savings</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80' }} />
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Lead captured: Jane D. — 45 acres</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                <span style={{ fontSize: 12 }}>🏷️</span>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Branded with YOUR logo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== PAIN POINT ===================== */}
      <FadeSection>
        <section style={{ padding: '80px 24px', background: C.white }}>
          <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: C.navy, marginBottom: 16, lineHeight: 1.2 }}>
              Rural Land Listings Are Hard to Sell. <br />
              <span style={{ color: C.green }}>They Don&apos;t Have to Be.</span>
            </h2>
            <p style={{ fontSize: 17, color: C.gray, lineHeight: 1.8, maxWidth: 640, margin: '0 auto 48px' }}>
              Every agent fights over the same leads with the same pitch. Rural listings sit for months 
              because buyers don&apos;t see the full value. Meanwhile, your marketing budget goes to Zillow 
              and you&apos;re one of 20 agents competing for the same click.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
              {[
                { icon: '😤', label: 'Generic Listings', desc: 'Your rural listings look the same as everyone else\'s. No differentiation.' },
                { icon: '💸', label: 'Expensive Leads', desc: 'Zillow & Realtor leads cost $20-50+ each — and you\'re sharing them with other agents.' },
                { icon: '🕐', label: 'Long Sit Times', desc: 'Rural land listings average 6+ months on market. Buyers need a reason to act.' },
              ].map(item => (
                <div key={item.label} style={{ background: C.lightGray, borderRadius: 16, padding: 28, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 8 }}>{item.label}</h3>
                  <p style={{ fontSize: 14, color: C.gray, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeSection>

      {/* Solution bridge */}
      <FadeSection>
        <section style={{ padding: '0', background: C.sky, overflow: 'hidden' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 0 }} className="hero-flex">
            <div style={{ flex: '0 0 auto', maxWidth: 380, overflow: 'hidden' }}>
              <img
                src="/beekeeper-frame.jpg"
                alt="Beekeeper holding honeycomb frame"
                style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div style={{ flex: 1, padding: '48px 40px', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: C.blue, lineHeight: 1.7 }}>
                <span style={{ fontSize: 24, marginRight: 8 }}>💡</span>
                What if you could show every prospect exactly how much they&apos;d save on taxes — 
                with <em>your name</em> on the report?
              </p>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ===================== HOW IT WORKS ===================== */}
      <FadeSection>
        <section id="how-it-works" style={{ padding: '80px 24px', background: C.white }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Simple 4-Step Process</p>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: C.navy, lineHeight: 1.2 }}>
                How BeeExemption Works for Agents
              </h2>
            </div>

            <div className="r-grid-steps">
              {[
                { step: '1', icon: '🔗', title: 'Get Your Branded Link', desc: 'Sign up and we create your personalized, white-labeled BeeExemption page with your logo, name, and contact info.' },
                { step: '2', icon: '📤', title: 'Share It Everywhere', desc: 'Drop it in your email signature, social posts, listing descriptions, farm mailers — anywhere you market.' },
                { step: '3', icon: '📊', title: 'Prospects Discover Savings', desc: 'They enter their property address and instantly see how much they could save with an ag exemption. It\'s free for them.' },
                { step: '4', icon: '🔔', title: 'You Get the Lead', desc: 'You\'re notified with their name, email, property details, and estimated savings. Reach out and close the deal.' },
              ].map(item => (
                <div key={item.step} className="step-card" style={{ background: C.sky, borderRadius: 20, padding: 28, textAlign: 'center', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', width: 32, height: 32, borderRadius: '50%', background: C.blue, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900 }}>
                    {item.step}
                  </div>
                  <div style={{ fontSize: 40, marginBottom: 16, marginTop: 8 }}>{item.icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ fontSize: 14, color: C.gray, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ===================== ROI / NUMBERS ===================== */}
      <FadeSection>
        <section style={{ padding: '80px 24px', background: C.navy }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>The Numbers Don&apos;t Lie</p>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: C.white, lineHeight: 1.2 }}>
                The ROI That Sells Itself
              </h2>
            </div>

            <div className="r-grid-roi">
              {[
                {
                  icon: '💰',
                  stat: '$3,000 – $8,000',
                  label: 'Average Annual Savings',
                  desc: 'That\'s what your clients save on property taxes every single year with a beekeeping ag exemption. You\'re the one who showed them.',
                },
                {
                  icon: '🏆',
                  stat: '1 Commission',
                  label: 'Pays for 10+ Years',
                  desc: 'At $297/year, a single rural land commission covers your BeeExemption cost for over a decade. One deal. That\'s it.',
                },
                {
                  icon: '📉',
                  stat: '$0.00',
                  label: 'Cost Per Lead',
                  desc: 'Zillow leads cost $20-50 each. BeeExemption leads come from YOUR link, YOUR brand. They\'re basically free — and they\'re exclusive to you.',
                },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 32, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>{item.icon}</div>
                  <p style={{ fontSize: 28, fontWeight: 900, color: C.green, marginBottom: 4 }}>{item.stat}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 12 }}>{item.label}</p>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ===================== WHAT YOU GET ===================== */}
      <FadeSection>
        <section style={{ padding: '80px 24px', background: C.white }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Everything You Need</p>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: C.navy, lineHeight: 1.2 }}>
                What&apos;s Included in Your Agent Account
              </h2>
            </div>

            <div className="r-grid-features">
              {[
                { icon: '🏷️', title: 'White-Labeled Reports', desc: 'Every report features your logo, name, and contact information. Clients see you as the expert, not us.' },
                { icon: '🔗', title: 'Branded Shareable Link', desc: 'A custom URL (beeexemption.com/r/yourname) you can share anywhere — social media, email, listing descriptions.' },
                { icon: '🔔', title: 'Lead Notifications', desc: 'Instant alerts when someone uses your link. You get their name, email, property address, and estimated savings.' },
                { icon: '📋', title: 'Client Dashboard', desc: 'View all your leads in one place. Track which properties they searched, their savings estimates, and follow-up status.' },
                { icon: '♾️', title: 'Unlimited Reports', desc: 'Generate as many branded reports as you want for your covered counties. No per-report fees, ever.' },
                { icon: '🐝', title: 'BeeKings Handles Setup', desc: 'When your client is ready for bees, BeeKings provides everything — hives, bees, equipment, and training. You just make the intro.' },
                { icon: '🏅', title: 'Certified Partner Badge', desc: 'Display the "BeeKings Certified Partner" badge on your site and marketing. It signals expertise and builds trust.' },
                { icon: '📞', title: 'Priority Support', desc: 'Direct line to our team for questions, custom report requests, and client consultations. We\'re here to help you close.' },
              ].map(item => (
                <div key={item.title} className="feature-card" style={{ background: C.lightGray, borderRadius: 16, padding: 28, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{item.icon}</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.navy }}>{item.title}</h3>
                  </div>
                  <p style={{ fontSize: 14, color: C.gray, lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ===================== SOCIAL PROOF / USE CASES ===================== */}
      <FadeSection>
        <section style={{ padding: '80px 24px', background: C.sky }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Real-World Scenarios</p>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: C.navy, lineHeight: 1.2 }}>
                How Agents Are Using BeeExemption
              </h2>
            </div>

            {/* Photo banner */}
            <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 48 }}>
              <img
                src="/beekeepers-inspecting.jpg"
                alt="Beekeepers inspecting hive frames together"
                style={{ width: '100%', height: 260, objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {[
                {
                  emoji: '📱',
                  scenario: 'The Facebook Power Play',
                  description: 'Imagine posting your BeeExemption link in your farm area Facebook group with a simple message: "Hey neighbors — did you know you might be overpaying on your property taxes? I put together a free tool that shows you exactly how much you could save with a beekeeping ag exemption. Check it out." Within 48 hours, you have 15 new leads — landowners who entered their property info and now see you as the agent who actually helps them save money. No cold calls. No ad spend. Just genuine value.',
                },
                {
                  emoji: '🏡',
                  scenario: 'The Listing That Sells Itself',
                  description: 'You\'re listing a 20-acre tract that\'s been sitting for 3 months. You add one line to the description: "This property qualifies for a beekeeping agricultural exemption that could save you $4,200/year in property taxes." Suddenly the listing has a financial hook. Buyers don\'t just see land — they see an investment that pays them back every year. You include a link to the branded report in every showing packet. The property goes under contract in two weeks.',
                },
                {
                  emoji: '✉️',
                  scenario: 'The Drip Campaign Secret Weapon',
                  description: 'You add your BeeExemption link to your monthly email newsletter that goes to 500 past clients and prospects. "Curious if your land qualifies for a tax break? Check this out." Each month, 5-10 people click through and run their property. That\'s 5-10 warm leads who self-identified as landowners interested in saving money — exactly the kind of people who buy and sell rural property. And every single one has your name on their report.',
                },
              ].map(item => (
                <div key={item.scenario} style={{ background: C.white, borderRadius: 20, padding: 32, border: '1px solid #D5EAFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 32 }}>{item.emoji}</span>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>{item.scenario}</h3>
                  </div>
                  <p style={{ fontSize: 15, color: C.gray, lineHeight: 1.8 }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ===================== PRICING ===================== */}
      <FadeSection>
        <section id="pricing" style={{ padding: '80px 24px', background: C.white }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Simple Pricing</p>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: C.navy, lineHeight: 1.2 }}>
                One Plan. Everything Included.
              </h2>
              <p style={{ fontSize: 16, color: C.gray, marginTop: 12, maxWidth: 480, margin: '12px auto 0' }}>
                Start with a free 30-day trial. If it doesn&apos;t pay for itself, cancel anytime.
              </p>
            </div>

            <div style={{ maxWidth: 520, margin: '0 auto' }}>
              <div style={{ background: C.white, borderRadius: 24, padding: '40px 36px', border: `2px solid ${C.green}`, boxShadow: '0 8px 40px rgba(0,0,0,0.08)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', background: C.green, color: C.navy, fontSize: 12, fontWeight: 800, padding: '6px 20px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  30 Days Free
                </div>

                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <span style={{ fontSize: 40 }}>🏠</span>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8, marginBottom: 4 }}>Agent Partner Plan</p>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 56, fontWeight: 900, color: C.navy }}>$297</span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: C.gray }}>/year</span>
                </div>
                <p style={{ textAlign: 'center', fontSize: 15, color: C.gray, marginBottom: 6 }}>per county</p>
                <p style={{ textAlign: 'center', fontSize: 14, color: C.blue, fontWeight: 600, marginBottom: 28 }}>
                  + $97/year for each additional county
                </p>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24, marginBottom: 28 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                      'White-labeled reports with your logo',
                      'Branded shareable link',
                      'Lead notifications (name, email, property)',
                      'Client dashboard',
                      'Unlimited reports for your counties',
                      'BeeKings handles bee setup for your clients',
                      'BeeKings Certified Partner badge',
                      'Priority support',
                    ].map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ color: C.green, fontSize: 16, fontWeight: 700, flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: 15, color: C.charcoal }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="cta-btn"
                  style={{ width: '100%', padding: '18px 24px', borderRadius: 14, background: C.green, color: C.navy, fontWeight: 800, fontSize: 18, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(212,168,67,0.3)', marginBottom: 12 }}
                >
                  {checkoutLoading ? 'Loading...' : 'Start Your Free 30-Day Trial →'}
                </button>
                <p style={{ textAlign: 'center', fontSize: 13, color: C.gray }}>
                  Cancel anytime • One commission pays for 10+ years
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ===================== FAQ ===================== */}
      <FadeSection>
        <section style={{ padding: '80px 24px', background: C.sky }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: C.navy }}>
                Questions? We&apos;ve Got Answers.
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                {
                  q: 'How do leads work?',
                  a: 'When someone uses your branded link to check their property, you\'re automatically notified with their name, email, property address, and estimated savings. They appear in your agent dashboard where you can track and follow up. These are exclusive leads — they came from your link, and they\'re your clients.',
                },
                {
                  q: 'Can I use BeeExemption in multiple counties?',
                  a: 'Yes! Your first county is included at $297/year. Each additional county is just $97/year. Your branded reports and lead capture work across all your covered counties. Most agents start with their primary county and expand as they see results.',
                },
                {
                  q: 'What if my client actually wants bees?',
                  a: 'That\'s where BeeKings comes in. We handle everything — hives, bees, equipment, training, and ongoing support. You just make the introduction. Your client gets their ag exemption set up properly, and you look like a hero for connecting all the dots.',
                },
                {
                  q: 'Do I need to know anything about bees or agriculture?',
                  a: 'Not at all. BeeExemption handles all the calculations and county-specific requirements. You\'re simply sharing a tool that helps landowners discover their potential tax savings. BeeKings handles the agricultural side if clients want to move forward.',
                },
                {
                  q: 'How is this different from just telling my client about ag exemptions?',
                  a: 'BeeExemption provides personalized, data-driven reports with exact savings calculations based on real property data. It\'s not a generic pitch — it\'s a professional document with your branding that shows a specific dollar amount for a specific property. That\'s what gets clients to act.',
                },
                {
                  q: 'What does the 30-day trial include?',
                  a: 'Everything. Full access to your branded link, unlimited reports, lead notifications, and your client dashboard. If BeeExemption doesn\'t deliver value in 30 days, just cancel. No questions asked, no charges.',
                },
                {
                  q: 'Can I share leads with my team or brokerage?',
                  a: 'Your leads are yours. You can view and manage them in your dashboard. If you want team access, contact us — we\'re happy to set up brokerage-level accounts for larger teams.',
                },
              ].map((faq, i) => (
                <div
                  key={faq.q}
                  style={{ background: C.white, borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      width: '100%', padding: '18px 24px', background: 'none', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: C.navy, fontSize: 16 }}>{faq.q}</span>
                    <svg
                      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5"
                      style={{ flexShrink: 0, marginLeft: 16, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div style={{
                    maxHeight: openFaq === i ? 300 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease',
                  }}>
                    <p style={{ padding: '0 24px 18px', color: C.gray, lineHeight: 1.7, fontSize: 15 }}>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeSection>

      {/* ===================== FINAL CTA ===================== */}
      <section style={{ padding: '80px 24px', background: `linear-gradient(135deg, ${C.navy} 0%, #1A3A5B 100%)`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 30% 60%, #D4A843 1px, transparent 1px), radial-gradient(circle at 70% 40%, #D4A843 1px, transparent 1px)', backgroundSize: '80px 80px' }} />

        <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🐝</div>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, color: C.white, marginBottom: 16, lineHeight: 1.2 }}>
            Ready to Stand Out?
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 36, maxWidth: 500, margin: '0 auto 36px' }}>
            Join agents who use BeeExemption to generate exclusive leads, close more rural land deals, 
            and give their clients something no one else can.
          </p>
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="cta-btn"
            style={{ padding: '18px 40px', borderRadius: 14, background: C.green, color: C.navy, fontWeight: 800, fontSize: 18, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 24px rgba(212,168,67,0.35)', marginBottom: 12 }}
          >
            {checkoutLoading ? 'Loading...' : 'Start Your Free 30-Day Trial →'}
          </button>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
            No credit card required • Cancel anytime • Full access for 30 days
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.navy, padding: '48px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 28 }} />
                <span style={{ fontWeight: 800, fontSize: 18, color: C.white }}>BEE EXEMPTION</span>
              </div>
              <p style={{ color: '#8DA4B5', fontSize: 14 }}>A free tool by BeeKings</p>
              <p style={{ color: '#8DA4B5', fontSize: 14 }}>Canton, Texas</p>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: C.white, marginBottom: 8, fontSize: 14 }}>Quick Links</p>
              <p style={{ marginBottom: 4 }}><a href="/" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Home</a></p>
              <p style={{ marginBottom: 4 }}><a href="/pricing" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Pricing</a></p>
              <p><a href="/agent/login" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Agent Login</a></p>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: C.white, marginBottom: 8, fontSize: 14 }}>Contact</p>
              <p style={{ marginBottom: 4 }}><a href="https://beekings.com" target="_blank" rel="noopener noreferrer" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>BeeKings.com</a></p>
              <p><a href="mailto:info@beekings.com" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>info@beekings.com</a></p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1A3A4F', paddingTop: 20 }}>
            <p style={{ fontSize: 12, color: '#5A7A8A', textAlign: 'center' }}>© {new Date().getFullYear()} BeeKings. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
