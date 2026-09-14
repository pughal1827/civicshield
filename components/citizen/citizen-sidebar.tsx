'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  Home,
  PlusCircle,
  FileText,
  Search,
  MapPin,
  Bell,
  User,
  Settings,
  Trophy,
} from 'lucide-react';

interface CitizenSidebarProps {
  unreadCount?: number;
}

export function CitizenSidebar({ unreadCount }: CitizenSidebarProps) {
  const pathname = usePathname();
  const [realUnreadCount, setRealUnreadCount] = useState<number>(unreadCount ?? 0);

  useEffect(() => {
    fetch('/api/citizen/notifications')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          const count = json.data?.unreadCount ?? json.data?.notifications?.length ?? 0;
          setRealUnreadCount(count);
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { name: 'Home', href: '/citizen', icon: Home },
    { name: 'Report an Issue', href: '/report', icon: PlusCircle },
    { name: 'My Complaints', href: '/my-reports', icon: FileText },
    { name: 'Track Complaint', href: '/track', icon: Search },
    { name: 'Nearby Issues', href: '/citizen/nearby', icon: MapPin },
    { name: 'Notifications', href: '/citizen/notifications', icon: Bell, badge: realUnreadCount > 0 ? realUnreadCount : undefined },
    { name: 'Profile', href: '/citizen/profile', icon: User },
    { name: 'Settings', href: '/citizen/profile', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white text-slate-800 min-h-screen flex flex-col justify-between shrink-0 border-r border-slate-200/80 sticky top-0 h-screen select-none shadow-xs z-30">
      {/* Top Header Logo */}
      <div className="p-6 border-b border-slate-100">
        <Link href="/citizen" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform font-black">
            <Shield className="h-6 w-6 text-white fill-current" />
          </div>
          <div>
            <span className="text-lg font-black text-slate-900 tracking-tight block leading-tight">
              CivicShield <span className="text-emerald-600">AI</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
              Safer Cities. Stronger Communities.
            </span>
          </div>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/citizen' && item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span
                  className={`px-2 py-0.5 font-bold text-[10px] rounded-full shadow-xs ${
                    isActive
                      ? 'bg-white text-emerald-700'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* Bottom Footer Section */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/60 flex items-center gap-2.5 text-emerald-900">
          <Trophy className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="font-extrabold block">Top Contributor</span>
            <span className="text-[10px] text-emerald-700">Together for a Cleaner Tomorrow 🌱</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 text-center pt-1 font-medium">
          © 2026 CivicShield AI. All rights reserved.
        </div>
      </div>
    </aside>
  );
}
