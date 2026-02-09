import type { Metadata } from 'next';
import { Lato } from 'next/font/google';
import './globals.css';

const lato = Lato({ 
  weight: ['300', '400', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Texas Bee Exemption Calculator — Save Thousands on Property Taxes | TexasBeeExemption.com',
  description: 'Free Texas agricultural exemption calculator for beekeeping. See how much you can save on property taxes with a bee ag exemption. Real data from all 254 Texas counties. Enter your address for an instant savings estimate.',
  keywords: [
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
    'bee hive tax exemption',
    'Texas agricultural appraisal',
    'Texas homestead ag exemption',
    'property tax reduction beekeeping',
    'how many hives for ag exemption Texas',
    'Texas ag exemption requirements',
    'Van Zandt County ag exemption',
    'Kaufman County ag exemption',
    'Henderson County ag exemption',
    'Dallas County ag exemption',
    'Tarrant County ag exemption',
    'Texas rural property tax savings',
    'Texas acreage tax break',
    'beekeeping tax benefits Texas',
    'Texas property tax relief',
    'reduce property taxes with bees Texas',
    'Texas bee farm tax exemption',
    'ag exemption 5 acres Texas',
    'ag exemption 10 acres Texas',
  ].join(', '),
  openGraph: {
    title: 'Texas Bee Exemption — Free Property Tax Savings Calculator',
    description: 'Discover how much you could save on Texas property taxes with a beekeeping agricultural exemption. Free instant estimate using real county appraisal data for all 254 Texas counties.',
    type: 'website',
    siteName: 'Bee Exemption',
    url: 'https://beeexemption.com',
    locale: 'en_US',
    images: [
      {
        url: 'https://beeexemption.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Texas Bees Save You Money — Free Bee Exemption Calculator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Save Thousands on Texas Property Taxes with Bees 🐝',
    description: 'Free calculator shows your exact ag exemption savings. Real property data from all 254 Texas counties. Enter your address — instant results.',
    site: '@VisitFirstMonday',
    images: ['https://beeexemption.com/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://texasbeeexemption.com',
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
  other: {
    'geo.region': 'US-TX',
    'geo.placename': 'Texas',
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
        <link rel="canonical" href="https://texasbeeexemption.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Texas Bee Exemption Calculator',
              url: 'https://texasbeeexemption.com',
              description: 'Free calculator to estimate property tax savings from a beekeeping agricultural exemption in Texas. Covers all 254 counties with real appraisal district data.',
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
                  name: 'How many acres do I need for a bee ag exemption in Texas?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Most Texas counties require between 5 and 20 acres for a beekeeping agricultural exemption. Some counties accept as few as 5 acres. Requirements vary by county appraisal district.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How many beehives do I need for an ag exemption in Texas?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'The minimum number of hives depends on your county and acreage. Most counties require 6 hives for the first 5-10 acres, plus 1 additional hive per 2.5-5 additional acres. Our calculator shows the exact requirement for your property.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How much can I save on Texas property taxes with beekeeping?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'The average Texas landowner saves $3,000-$7,000 per year with a beekeeping ag exemption. Savings depend on your property value, acreage, and county tax rate. Agricultural appraisal typically reduces taxable land value by 90-98%.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Is beekeeping a legal agricultural exemption in Texas?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes. Texas Tax Code Chapter 23, Subchapter D explicitly recognizes beekeeping as qualifying agricultural use. The Texas Comptroller has specific guidelines for beekeeping ag valuations.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How much does it cost to start beekeeping for a tax exemption?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Startup costs are approximately $197 per hive for equipment and $260 per nuc (bee colony). Annual management costs run about $75 per hive. Most landowners recoup their investment within the first year through tax savings alone, plus earn additional income from honey production.',
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
