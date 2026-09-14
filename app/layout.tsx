import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CitizenLayout } from '@/components/citizen/citizen-layout';
import { OfflineBanner } from '@/components/shared/offline-banner';
import { InstallPrompt } from '@/components/shared/install-prompt';

export const metadata: Metadata = {
  title: 'CivicShield AI | Citizen Civic Service Portal',
  description: 'Smart municipal platform transforming citizen complaint reports into structured, prioritized, non-duplicate incidents for swift municipal resolution.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CivicShield AI',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
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
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-800 flex flex-col antialiased selection:bg-emerald-500/20 selection:text-emerald-800">
        <OfflineBanner />
        <CitizenLayout>{children}</CitizenLayout>
        <InstallPrompt />
      </body>
    </html>
  );
}
