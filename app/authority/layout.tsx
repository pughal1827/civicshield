'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AuthoritySidebar } from '@/components/authority/authority-sidebar';
import { AuthorityTopbar } from '@/components/authority/authority-topbar';

export default function AuthorityLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // If on login page, render without sidebar and topbar
  if (pathname === '/authority/login') {
    return <div className="min-h-screen bg-slate-950">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-100/90 font-sans text-slate-800 antialiased">
      {/* Fixed Dark Navy Sidebar */}
      <AuthoritySidebar />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <AuthorityTopbar />

        {/* Dynamic Page Content View */}
        <div className="flex-1 p-6 lg:p-8 max-w-[1400px] w-full mx-auto space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
