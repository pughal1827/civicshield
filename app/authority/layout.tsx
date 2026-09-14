'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AuthoritySidebar } from '@/components/authority/authority-sidebar';
import { AuthorityTopbar } from '@/components/authority/authority-topbar';

export default function AuthorityLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/authority/login') {
    return <div className="min-h-screen bg-slate-950">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100/90 font-sans text-slate-800 antialiased">
      {/* Sidebar is fixed-positioned inside AuthoritySidebar component */}
      <AuthoritySidebar />

      {/* Main content area — offset by sidebar width */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 shrink-0">
          <AuthorityTopbar />
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
