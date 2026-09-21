'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  LayoutDashboard,
  Flame,
  FileText,
  Camera,
  MapPin,
  Clock,
  GitMerge,
  Bell,
  BarChart3,
  Building2,
  User,
  Settings,
  LogOut,
} from 'lucide-react';

interface AuthoritySidebarProps {
  unreadCount?: number;
}

export function AuthoritySidebar({ unreadCount }: AuthoritySidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [realUnreadCount, setRealUnreadCount] = useState<number>(unreadCount ?? 0);

  useEffect(() => {
    fetch('/api/incidents')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.incidents)) {
          const count = json.data.incidents.filter(
            (inc: any) => inc.severity === 'CRITICAL' || inc.status === 'SUBMITTED' || inc.priorityScore >= 80
          ).length;
          setRealUnreadCount(count);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/authority/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/authority', icon: LayoutDashboard },
    { name: 'Priority List', href: '/authority/priority', icon: Flame },
    { name: 'All Complaints', href: '/authority/complaints', icon: FileText },
    { name: 'Evidence Approval', href: '/authority/evidence', icon: Camera },
    { name: 'Map', href: '/authority/map', icon: MapPin },
    { name: 'Late Complaints', href: '/authority/late', icon: Clock },
    { name: 'Same Problems', href: '/authority/duplicates', icon: GitMerge },
    { name: 'Notifications', href: '/authority/notifications', icon: Bell, badge: realUnreadCount > 0 ? realUnreadCount : undefined },
    { name: 'Reports', href: '/authority/reports', icon: BarChart3 },
    { name: 'Departments', href: '/authority/intelligence/departments', icon: Building2 },
  ];


  const bottomItems = [
    { name: 'Profile', href: '/authority/profile', icon: User },
    { name: 'Settings', href: '/authority/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 h-screen overflow-y-auto bg-[#0b132b] text-slate-300 flex flex-col justify-between shadow-2xl border-r border-slate-800/80 select-none fixed top-0 left-0 z-50">
      {/* Top Header Logo */}
      <div className="p-6 border-b border-slate-800/60">
        <Link href="/authority" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform font-black">
            <Shield className="h-6 w-6 text-slate-950 fill-current" />
          </div>
          <div>
            <span className="text-lg font-black text-white tracking-tight block leading-tight">
              CivicShield <span className="text-emerald-400">AI</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium tracking-wide block mt-0.5">
              Authority Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/authority' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span className="px-2 py-0.5 bg-rose-500 text-white font-bold text-[10px] rounded-full shadow-sm">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* Bottom Footer Items */}
      <div className="p-4 border-t border-slate-800/80 space-y-1 bg-[#090f23]">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900/60 transition-all"
            >
              <Icon className="h-4 w-4 text-slate-400" />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-all text-left mt-1"
        >
          <LogOut className="h-4 w-4 text-rose-400" />
          <span>Logout</span>
        </button>

        <div className="pt-3 text-[10px] text-slate-500 text-center leading-tight">
          CivicShield AI<br />
          <span className="text-slate-400">Safer Cities. Stronger Communities.</span>
        </div>
      </div>
    </aside>
  );
}
