import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Outlier Agent — American Hairline Discovery & Breakdown Desk',
  description: 'Viral outlier video radar, script reverse-engineering & production pipeline for American Hairline',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
