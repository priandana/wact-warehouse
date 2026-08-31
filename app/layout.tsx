import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | WACT',
    default: 'WACT — Warehouse Action & Case Tracker',
  },
  description: 'Internal warehouse monitoring, QC, and case management system',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WACT',
  },
};

export const viewport: Viewport = {
  themeColor: '#3B6FE0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="id" data-scroll-behavior="smooth" className={`${plusJakarta.variable} h-full`}>
      <body className="min-h-full antialiased font-[var(--font-plus-jakarta),ui-sans-serif,system-ui,sans-serif]">
        {children}
      </body>
    </html>
  );
}
