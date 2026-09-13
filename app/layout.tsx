import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { MobileBottomNav } from '@/components/shared/bottom-nav';
import { OfflineBanner } from '@/components/shared/offline-banner';
import { InstallPrompt } from '@/components/shared/install-prompt';

export const metadata: Metadata = {
  title: 'CivicShield AI | AI-Powered Civic Issue Detection, Prioritization & Resolution',
  description: 'Smart municipal platform transforming citizen complaint reports into structured, prioritized, non-duplicate incidents for swift municipal resolution.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CivicShield AI',
  },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
        <OfflineBanner />
        <Navbar />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <Footer />
        <MobileBottomNav />
        <InstallPrompt />
      </body>
    </html>
  );
}
