'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HardHat,
  LayoutDashboard,
  ClipboardList,
  Flame,
  MapPin,
  Camera,
  Bell,
  User,
  Settings,
  LogOut,
  Shield,
  Building2,
  Wrench,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearStoredWorker } from '@/lib/auth/worker-client';

interface WorkerSidebarProps {
  workerName?: string;
  departmentName?: string;
  unreadNotificationsCount?: number;
}

export function WorkerSidebar({
  workerName = 'Field Worker',
  departmentName = 'Field Operations',
  unreadNotificationsCount = 2,
}: WorkerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'Dashboard', href: '/worker/dashboard', icon: LayoutDashboard },
    { name: 'Assigned Jobs', href: '/worker/jobs', icon: ClipboardList },
    { name: 'Priority Jobs', href: '/worker/priority', icon: Flame, badge: 'High' },
    { name: 'Job Locations', href: '/worker/map', icon: MapPin },
    { name: 'Evidence', href: '/worker/evidence', icon: Camera },
    { name: 'Notifications', href: '/worker/notifications', icon: Bell, count: unreadNotificationsCount },
    { name: 'Profile', href: '/worker/profile', icon: User },
    { name: 'Settings', href: '/worker/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    clearStoredWorker();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore error
    }
    router.push('/worker/login');
    router.refresh();
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800 shrink-0 min-h-screen sticky top-0 h-screen z-40 select-none">
      
      <div className="space-y-6 p-4">
        
        {/* BRAND HEADER */}
        <div className="px-2 pt-2">
          <Link href="/worker/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white">CivicShield</span>
                <span className="text-lg font-black text-orange-400">WORKER</span>
              </div>
              <p className="text-[10px] text-orange-300/90 font-bold tracking-wider uppercase">
                Field Operations Portal
              </p>
            </div>
          </Link>
        </div>

        {/* WORKER USER CARD */}
        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black text-slate-100 truncate">{workerName}</span>
          </div>
          <div className="text-[11px] font-bold text-orange-400 flex items-center gap-1">
            <Wrench className="h-3 w-3 shrink-0" />
            <span className="truncate">{departmentName}</span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/worker/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all group ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-orange-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.count !== undefined && item.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white text-orange-600' : 'bg-orange-500 text-white'
                  }`}>
                    {item.count}
                  </span>
                )}

                {item.badge && !item.count && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white text-orange-600' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

      </div>

      {/* BOTTOM FOOTER & SIGN OUT */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-extrabold gap-2 rounded-xl h-10"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
        <div className="text-[10px] font-semibold text-slate-500 text-center">
          CivicShield Worker v2.4 · Municipal Staff
        </div>
      </div>

    </aside>
  );
}
