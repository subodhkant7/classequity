import type { Metadata } from 'next';
import './globals.css';
import './showcase.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  title: { default: 'ClassEquity — Every child belongs', template: '%s · ClassEquity' },
  openGraph: {
    title: 'ClassEquity — Every child deserves a place in the adventure',
    description: 'Plan together. Support privately. Verify every payment.',
    type: 'website',
    images: [
      {
        url: '/social-preview.png',
        width: 1200,
        height: 630,
        alt: 'ClassEquity — School adventures, shared fairly',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClassEquity — Every child belongs',
    images: ['/social-preview.png'],
  },
  icons: { icon: '/icon.svg' },
  description:
    'School adventures, shared fairly. Coordinate group pricing, confidential support, and verified PayPal sandbox payments.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
