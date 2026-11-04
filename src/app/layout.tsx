import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'ClassEquity — Every child belongs', template: '%s · ClassEquity' },
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
