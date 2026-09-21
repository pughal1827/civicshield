'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { CitizenSidebar } from '@/components/citizen/citizen-sidebar';
import { CitizenTopbar } from '@/components/citizen/citizen-topbar';
import { MobileBottomNav } from '@/components/shared/bottom-nav';

export function CitizenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Public, worker & authority routes must NEVER render citizen sidebar or chrome
  const isStandaloneRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/about' ||
    pathname === '/how-it-works' ||
    pathname.startsWith('/authority') ||
    pathname.startsWith('/worker');

  if (isStandaloneRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-100/90 font-sans text-slate-800 antialiased selection:bg-emerald-500/20 selection:text-emerald-800">
      {/* Desktop Left Sidebar — hidden on standalone routes */}
      <div className={`hidden lg:block ${isStandaloneRoute ? 'lg:hidden' : ''}`}>
        <CitizenSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Top Header Bar — hidden on standalone routes */}
        {!isStandaloneRoute && <CitizenTopbar />}

        {/* Dynamic Page Content View */}
        <div className={`flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto space-y-6 ${isStandaloneRoute ? 'lg:p-6' : ''}`}>
          {children}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar — hidden on standalone routes */}
      {!isStandaloneRoute && (
        <div className="lg:hidden">
          <MobileBottomNav />
        </div>
      )}
    </div>
  );
}
