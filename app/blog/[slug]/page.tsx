import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPost, getAllBlogPosts, BlogPost } from '@/data/blog-posts';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  
  if (!post) {
    return {
      title: 'Post Not Found | Bee Exemption',
    };
  }

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    keywords: [
      `${post.county} County agricultural exemption`,
      `${post.county} County ag exemption`,
      `${post.county} ag exemption bees`,
      `property tax savings ${post.county} County Texas`,
      `${post.county} County beekeeping tax exemption`,
      '1-d-1 agricultural valuation',
      'Texas ag exemption',
      'beekeeping property tax',
    ].join(', '),
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      type: 'article',
      siteName: 'Bee Exemption',
      url: `https://beeexemption.com/blog/${post.slug}`,
      locale: 'en_US',
      publishedTime: post.publishedAt,
      authors: ['BeeKings'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.metaDescription,
    },
    alternates: {
      canonical: `https://beeexemption.com/blog/${post.slug}`,
    },
  };
}

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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function renderContent(content: string): React.ReactNode[] {
  const paragraphs = content.split('\n\n');
  
  return paragraphs.map((paragraph, index) => {
    const trimmed = paragraph.trim();
    
    // Handle headers
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={index} style={{ 
          fontSize: 24, 
          fontWeight: 800, 
          color: C.navy, 
          marginTop: 48, 
          marginBottom: 16,
          letterSpacing: '-0.01em',
        }}>
          {trimmed.replace('## ', '')}
        </h2>
      );
    }
    
    // Handle lists
    if (trimmed.includes('\n- ') || trimmed.startsWith('- ')) {
      const items = trimmed.split('\n').filter(line => line.startsWith('- '));
      return (
        <ul key={index} style={{ 
          marginBottom: 24, 
          paddingLeft: 24,
          listStyleType: 'disc',
        }}>
          {items.map((item, i) => (
            <li key={i} style={{ 
              fontSize: 16, 
              color: C.gray, 
              lineHeight: 1.8,
              marginBottom: 8,
            }}>
              {item.replace('- ', '').split('**').map((part, j) => 
                j % 2 === 1 ? <strong key={j} style={{ color: C.navy }}>{part}</strong> : part
              )}
            </li>
          ))}
        </ul>
      );
    }

    // Handle numbered lists
    if (/^\d+\./.test(trimmed)) {
      const items = trimmed.split('\n').filter(line => /^\d+\./.test(line));
      return (
        <ol key={index} style={{ 
          marginBottom: 24, 
          paddingLeft: 24,
          listStyleType: 'decimal',
        }}>
          {items.map((item, i) => (
            <li key={i} style={{ 
              fontSize: 16, 
              color: C.gray, 
              lineHeight: 1.8,
              marginBottom: 8,
            }}>
              {item.replace(/^\d+\.\s*/, '').split('**').map((part, j) => 
                j % 2 === 1 ? <strong key={j} style={{ color: C.navy }}>{part}</strong> : part
              )}
            </li>
          ))}
        </ol>
      );
    }
    
    // Regular paragraph with bold formatting
    return (
      <p key={index} style={{ 
        fontSize: 16, 
        color: C.gray, 
        lineHeight: 1.8, 
        marginBottom: 24,
      }}>
        {trimmed.split('**').map((part, j) => 
          j % 2 === 1 ? <strong key={j} style={{ color: C.navy }}>{part}</strong> : part
        )}
      </p>
    );
  });
}

function getRelatedPosts(currentSlug: string): BlogPost[] {
  const allPosts = getAllBlogPosts();
  return allPosts
    .filter(post => post.slug !== currentSlug)
    .slice(0, 3);
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(slug);

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
          .blog-hero { padding: 40px 24px !important; }
          .blog-hero h1 { font-size: 26px !important; }
          .blog-content { padding: 32px 20px !important; }
          .cad-card { flex-direction: column !important; }
          .related-grid { grid-template-columns: 1fr !important; }
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

      {/* BREADCRUMB */}
      <div style={{ background: C.lightGray, padding: '12px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: C.gray, margin: 0 }}>
            <Link href="/" style={{ color: C.blue, textDecoration: 'none' }}>Home</Link>
            {' / '}
            <Link href="/blog" style={{ color: C.blue, textDecoration: 'none' }}>Blog</Link>
            {' / '}
            <span>{post.county} County</span>
          </p>
        </div>
      </div>

      {/* HERO */}
      <section className="blog-hero" style={{ background: C.sky, padding: '64px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>🐝</span>
            <span style={{ 
              fontSize: 13, 
              fontWeight: 700, 
              color: C.green,
              background: 'rgba(212,168,67,0.15)',
              padding: '5px 12px',
              borderRadius: 12,
            }}>
              {post.county} County, Texas
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 900, color: C.navy, marginBottom: 16, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {post.title}
          </h1>
          <p style={{ fontSize: 14, color: C.gray }}>
            Published {formatDate(post.publishedAt)} by BeeKings
          </p>
        </div>
      </section>

      {/* QUICK FACTS */}
      <section style={{ background: C.white, padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
            gap: 16,
            background: C.lightGray,
            borderRadius: 12,
            padding: 20,
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: C.gray, marginBottom: 4 }}>Min. Acreage</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{post.minAcres} acres</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: C.gray, marginBottom: 4 }}>Min. Hives</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{post.minHives} hives</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: C.gray, marginBottom: 4 }}>Est. Savings</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: C.green }}>${post.estimatedSavings.toLocaleString()}/yr</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: C.gray, marginBottom: 4 }}>Application</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>April 30</p>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <article className="blog-content" style={{ padding: '48px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {renderContent(post.content)}

          {/* CAD CONTACT CARD */}
          <div style={{ 
            background: C.sky, 
            borderRadius: 16, 
            padding: 24, 
            marginTop: 48,
            border: '1px solid #D5EAFF',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 16 }}>
              📍 {post.cadName}
            </h3>
            <div className="cad-card" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 14, color: C.gray, marginBottom: 4 }}>Address</p>
                <p style={{ fontSize: 15, color: C.navy, fontWeight: 600 }}>{post.cadAddress}</p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: C.gray, marginBottom: 4 }}>Phone</p>
                <p style={{ fontSize: 15, color: C.navy, fontWeight: 600 }}>{post.cadPhone}</p>
              </div>
              <div>
                <p style={{ fontSize: 14, color: C.gray, marginBottom: 4 }}>Website</p>
                <a 
                  href={post.cadWebsite} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: 15, color: C.blue, fontWeight: 600, textDecoration: 'none' }}
                >
                  {post.cadWebsite.replace('https://', '').replace('http://', '')}
                </a>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ 
            background: C.navy, 
            borderRadius: 16, 
            padding: 32, 
            marginTop: 48,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 28, marginBottom: 12 }}>🧮</p>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 12 }}>
              Calculate Your Exact Savings
            </h3>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 24, lineHeight: 1.6 }}>
              Enter your {post.county} County address to see exactly how much you could save with agricultural exemption.
            </p>
            <Link
              href="/texas"
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                borderRadius: 12,
                background: C.green,
                color: C.navy,
                fontWeight: 700,
                fontSize: 16,
                textDecoration: 'none',
              }}
            >
              Try the Calculator →
            </Link>
          </div>
        </div>
      </article>

      {/* RELATED POSTS */}
      <section style={{ background: C.lightGray, padding: '64px 24px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 32, textAlign: 'center' }}>
            More County Guides
          </h2>
          <div 
            className="related-grid"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: 20 
            }}
          >
            {relatedPosts.map((related) => (
              <Link 
                key={related.slug}
                href={`/blog/${related.slug}`}
                className="hover-lift"
                style={{ 
                  textDecoration: 'none',
                  background: C.white,
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <span style={{ 
                  fontSize: 12, 
                  fontWeight: 700, 
                  color: C.green,
                }}>
                  {related.county} County
                </span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.navy, lineHeight: 1.3, margin: 0 }}>
                  Agricultural Exemption Guide
                </h3>
                <p style={{ fontSize: 13, color: C.gray, margin: 0 }}>
                  Est. savings: ${related.estimatedSavings.toLocaleString()}/yr
                </p>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link
              href="/blog"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: C.blue,
                textDecoration: 'none',
              }}
            >
              ← View all county guides
            </Link>
          </div>
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

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.metaDescription,
            datePublished: post.publishedAt,
            author: {
              '@type': 'Organization',
              name: 'BeeKings',
              url: 'https://beekings.com',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Bee Exemption',
              url: 'https://beeexemption.com',
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://beeexemption.com/blog/${post.slug}`,
            },
          }),
        }}
      />
    </div>
  );
}
