'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FilePlus, Bell, Clock, User } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  // Hide bottom nav on authority portal routes
  const isAuthority = pathname?.startsWith('/dashboard') || pathname?.startsWith('/authority');
  if (isAuthority) return null;

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'My Reports', href: '/my-reports', icon: Clock },
    { label: 'Report', href: '/report', icon: FilePlus, highlight: true },
    { label: 'Alerts', href: '/citizen/notifications', icon: Bell },
    { label: 'Profile', href: '/citizen/profile', icon: User },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-1.5 py-1 shadow-2xl"
      aria-label="Mobile bottom navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname?.startsWith(item.href);
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 min-h-[44px]"
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-cyan-500 text-white shadow-lg shadow-emerald-950/80 border-2 ${
                    isActive ? 'border-emerald-300 ring-2 ring-emerald-500/50' : 'border-slate-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span
                  className={`text-[10px] font-bold mt-0.5 ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-h-[44px] ${
                isActive
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
