import type { Metadata } from 'next';
import { Lato } from 'next/font/google';
import './globals.css';

const lato = Lato({ 
  weight: ['300', '400', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Bee Exemption — Save on Property Taxes with Beekeeping',
  description: 'Discover how beekeeping can reduce your property taxes across the United States. Agricultural exemptions through beekeeping can save you thousands per year. Select your state to learn more about bee ag exemption requirements and savings.',
  keywords: [
    'bee exemption',
    'beekeeping tax exemption',
    'agricultural exemption beekeeping',
    'property tax savings beekeeping',
    'ag exemption calculator',
    'beekeeping ag valuation',
    'property tax reduction',
    'bee hive tax exemption',
    'agricultural appraisal beekeeping',
    'save money on property taxes',
    'beekeeping tax benefits',
    'bee farm tax exemption',
    'Texas bee exemption',
    'Texas ag exemption beekeeping',
    'Texas agricultural exemption calculator',
    'Texas property tax savings',
    'beekeeping tax exemption Texas',
    'Texas 1-d-1 agricultural valuation',
    'ag exemption calculator Texas',
    'how to get ag exemption in Texas',
    'Texas beekeeping property tax',
    'save money on property taxes Texas',
    'Texas land tax reduction',
    'Texas agricultural appraisal',
    'Texas homestead ag exemption',
    'how many hives for ag exemption Texas',
    'Texas ag exemption requirements',
    'Van Zandt County ag exemption',
    'Kaufman County ag exemption',
    'Henderson County ag exemption',
    'Dallas County ag exemption',
    'Tarrant County ag exemption',
    'Texas rural property tax savings',
    'Texas acreage tax break',
    'reduce property taxes with bees',
    'ag exemption requirements by state',
  ].join(', '),
  openGraph: {
    title: 'Bee Exemption — Save on Property Taxes with Beekeeping',
    description: 'Learn how beekeeping can qualify for agricultural exemptions and reduce your property taxes. Resources and calculators available for property owners across America.',
    type: 'website',
    siteName: 'Bee Exemption',
    url: 'https://beeexemption.com',
    locale: 'en_US',
    images: [
      {
        url: 'https://beeexemption.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Bee Exemption — Save on Property Taxes with Beekeeping',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Save on Property Taxes with Bees 🐝',
    description: 'Beekeeping can qualify for agricultural exemptions and save you thousands on property taxes. Select your state to learn more.',
    site: '@VisitFirstMonday',
    images: ['https://beeexemption.com/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://beeexemption.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="canonical" href="https://beeexemption.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Bee Exemption',
              url: 'https://beeexemption.com',
              description: 'Resources and calculators to help property owners understand and apply for agricultural exemptions through beekeeping. Reduce your property taxes legally and sustainably.',
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Any',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              creator: {
                '@type': 'Organization',
                name: 'BeeKings',
                url: 'https://beekings.com',
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: 'Canton',
                  addressRegion: 'TX',
                  addressCountry: 'US',
                },
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'Can beekeeping qualify for agricultural property tax exemptions?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes. Many states recognize beekeeping as a qualifying agricultural use for property tax exemptions or reduced agricultural appraisals. Requirements vary by state and county, but beekeeping is widely accepted as legitimate agricultural production.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How much can I save on property taxes with beekeeping?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Property tax savings vary significantly by state, county, property value, and acreage. Many landowners save thousands of dollars annually. Agricultural appraisal can reduce taxable land value by 90% or more in states with strong ag exemption programs.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How many acres do I need for a bee ag exemption?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Acreage requirements vary by state and county. Some jurisdictions accept as few as 5 acres for beekeeping, while others may require 10-20 acres. Check your local appraisal district or county assessor for specific requirements.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How many beehives do I need for an ag exemption?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'The minimum number of hives depends on your state, county, and property size. Common requirements range from 6-12 hives for smaller properties, with additional hives needed per acre above minimum thresholds. Requirements are set by local appraisal authorities.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How much does it cost to start beekeeping for a tax exemption?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Initial costs include hive equipment (approximately $150-250 per hive) and bee colonies ($150-300 per colony). Annual maintenance costs average $50-100 per hive. Most landowners recoup their investment within 1-2 years through tax savings, plus potential honey income.',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={lato.className}>{children}</body>
    </html>
  );
}
