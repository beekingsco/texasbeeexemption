import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllBlogPosts } from '@/data/blog-posts';

export const metadata: Metadata = {
  title: 'Blog | Bee Exemption — Texas Agricultural Exemption Guides',
  description: 'County-by-county guides to agricultural exemptions in Texas. Learn how beekeeping can qualify you for property tax savings in your area.',
  keywords: [
    'Texas agricultural exemption',
    'ag exemption Texas',
    'beekeeping tax exemption',
    'property tax savings Texas',
    '1-d-1 agricultural valuation',
    'Texas county ag exemption',
    'bee exemption blog',
  ].join(', '),
  openGraph: {
    title: 'Blog | Bee Exemption — Texas Agricultural Exemption Guides',
    description: 'County-by-county guides to agricultural exemptions in Texas through beekeeping.',
    type: 'website',
    siteName: 'Bee Exemption',
    url: 'https://beeexemption.com/blog',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Texas Agricultural Exemption Guides',
    description: 'Learn how beekeeping can reduce your property taxes in Texas — county-specific guides.',
  },
  alternates: {
    canonical: 'https://beeexemption.com/blog',
  },
};

const C = {
  sky: '#F0F4FA',
  blue: '#1A3A6B',
  blueDark: '#122B52',
  navy: '#0D1B2A',
  green: '#D4A843',
  greenDark: '#B8912E',
  white: '#FFFFFF',
  gray: '#5A6A7A',
  lightGray: '#F5F7FB',
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <div style={{ minHeight: '100vh', background: C.white }}>
      <style>{`
        * { box-sizing: border-box; }
        .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
        .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .r-nav { display: flex; align-items: center; gap: 24px; }
        @media (max-width: 768px) {
          .r-nav { display: none; }
          .header-bar { height: 50px !important; }
          .blog-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* HEADER */}
      <header style={{ background: C.white, borderBottom: '1px solid #e2e8f0' }}>
        <div className="header-bar" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/beekings-logo.png" alt="BeeKings" style={{ height: 36 }} />
            <span style={{ fontWeight: 900, fontSize: 20, color: C.navy, letterSpacing: '-0.02em' }}>BEE EXEMPTION</span>
          </Link>
          <nav className="r-nav">
            <Link href="/#how-it-works" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>How It Works</Link>
            <Link href="/blog" style={{ fontSize: 14, fontWeight: 600, color: C.green, textDecoration: 'none' }}>Blog</Link>
            <Link href="/agents" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>For Agents</Link>
            <a href="https://beekings.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 600, color: C.gray, textDecoration: 'none' }}>BeeKings</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: C.sky, padding: '64px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, color: C.navy, marginBottom: 16, letterSpacing: '-0.02em' }}>
            Texas Agricultural Exemption Guides
          </h1>
          <p style={{ fontSize: 18, color: C.gray, lineHeight: 1.6, maxWidth: 600, margin: '0 auto' }}>
            County-specific guides to help you understand agricultural exemptions through beekeeping. 
            Find your county and learn the requirements, process, and potential savings.
          </p>
        </div>
      </section>

      {/* BLOG POSTS */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div 
            className="blog-grid"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: 24 
            }}
          >
            {posts.map((post) => (
              <Link 
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="hover-lift"
                style={{ 
                  textDecoration: 'none',
                  background: C.white,
                  border: '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>🐝</span>
                  <span style={{ 
                    fontSize: 12, 
                    fontWeight: 700, 
                    color: C.green,
                    background: 'rgba(212,168,67,0.15)',
                    padding: '4px 10px',
                    borderRadius: 12,
                  }}>
                    {post.county} County
                  </span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.navy, lineHeight: 1.3, margin: 0 }}>
                  {post.title}
                </h2>
                <p style={{ fontSize: 14, color: C.gray, lineHeight: 1.6, margin: 0 }}>
                  {post.metaDescription.slice(0, 120)}...
                </p>
                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: C.gray }}>
                    Est. savings: <strong style={{ color: C.green }}>${post.estimatedSavings.toLocaleString()}/yr</strong>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.blue }}>
                    Read guide →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '64px 24px', background: C.sky, textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧮</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, marginBottom: 12 }}>
            Calculate Your Exact Savings
          </h2>
          <p style={{ fontSize: 16, color: C.gray, marginBottom: 32, lineHeight: 1.6 }}>
            Enter your address and we&apos;ll pull your property data to show exactly how much you could save.
          </p>
          <Link
            href="/texas"
            style={{
              display: 'inline-block',
              padding: '14px 28px',
              borderRadius: 12,
              background: C.blue,
              color: C.white,
              fontWeight: 700,
              fontSize: 16,
              textDecoration: 'none',
            }}
          >
            Try the Texas Calculator →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: C.navy, padding: '48px 24px' }}>
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
              <p style={{ fontWeight: 700, color: C.white, marginBottom: 8, fontSize: 14 }}>Calculators</p>
              <p style={{ marginBottom: 4 }}><Link href="/texas" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Texas</Link></p>
              <p><Link href="/florida" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Florida</Link></p>
            </div>
            <div>
              <p style={{ fontWeight: 700, color: C.white, marginBottom: 8, fontSize: 14 }}>Resources</p>
              <p style={{ marginBottom: 4 }}><Link href="/blog" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>Blog</Link></p>
              <p><a href="https://beekings.com" target="_blank" rel="noopener noreferrer" style={{ color: '#8DA4B5', fontSize: 14, textDecoration: 'none' }}>BeeKings.com</a></p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1A3A4F', paddingTop: 20 }}>
            <p style={{ fontSize: 12, color: '#5A7A8A', lineHeight: 1.6, marginBottom: 12 }}>
              <strong style={{ color: '#8DA4B5' }}>Disclaimer:</strong> Estimates are based on publicly available county tax data. Actual savings depend on your specific property, county approval, and current tax rates.
            </p>
            <p style={{ fontSize: 12, color: '#5A7A8A', textAlign: 'center' }}>© {new Date().getFullYear()} BeeKings. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
