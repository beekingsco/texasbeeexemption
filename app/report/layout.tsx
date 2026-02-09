import type { Metadata } from 'next';
import { Lato } from 'next/font/google';
import '../globals.css';

const lato = Lato({
  weight: ['300', '400', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Your Property Tax Savings Report — BeeKings',
  description:
    'Personalized Texas beekeeping agricultural exemption property report with savings analysis, county playbook, equipment guide, and local resources.',
  robots: { index: false, follow: false },
};

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </head>
      <body className={lato.className} style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
