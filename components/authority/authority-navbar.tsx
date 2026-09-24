'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield,
  Home,
  AlertTriangle,
  FileText,
  Camera,
  Map as MapIcon,
  Clock,
  GitMerge,
  Bell,
  BarChart3,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthorityUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department?: {
    id: string;
    name: string;
  };
  area?: string;
}

export function AuthorityNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthorityUser | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          const u = json.data.user;
          setUser({
            id: u.id,
            fullName: u.fullName || 'Officer Robert Chen',
            email: u.email,
            role: u.role,
            department: u.department,
            area: u.area || 'Gummidipoondi Zone',
          });
        }
      })
      .catch((err) => console.error('Failed to load user profile in navbar:', err));

    fetch('/api/incidents')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.incidents)) {
          const count = json.data.incidents.filter(
            (inc: any) => inc.severity === 'CRITICAL' || inc.status === 'SUBMITTED' || inc.priorityScore >= 80
          ).length;
          setUnreadNotificationsCount(count);
        }
      })
      .catch(() => { });
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

  const navLinks = [
    { name: 'Home', href: '/authority', icon: Home },
    { name: 'Priority', href: '/authority/priority', icon: AlertTriangle },
    { name: 'Complaints', href: '/authority/complaints', icon: FileText },
    { name: 'Evidence Approval', href: '/authority/evidence', icon: Camera },
    { name: 'Map', href: '/authority/map', icon: MapIcon },
    { name: 'Late', href: '/authority/late', icon: Clock },
    { name: 'Same Problems', href: '/authority/duplicates', icon: GitMerge },
    { name: 'Notifications', href: '/authority/notifications', icon: Bell, badge: unreadNotificationsCount },
    { name: 'Reports', href: '/authority/reports', icon: BarChart3 },
  ];

  const greetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
      {/* Top Banner: Greeting & Assigned Zone */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-cyan-400">
              {greetingTime()}, {user?.fullName || 'Officer'} 👋
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {user?.department?.name || user?.area || 'Gummidipoondi Zone'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Official Portal • Live Persistence</span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-cyan-400 font-bold">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Brand Logo */}
        <Link href="/authority" className="flex items-center gap-2.5 shrink-0 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-black text-white tracking-tight block leading-none">
              CivicShield <span className="text-cyan-400">AI</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mt-0.5">
              Authority Portal
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/authority' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{link.name}</span>
                {link.badge && link.badge > 0 ? (
                  <span className="ml-0.5 px-1.5 py-0.2 bg-rose-500 text-white font-bold text-[10px] rounded-full">
                    {link.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Officer Profile & Logout */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/authority/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs hover:border-cyan-500/50 transition-colors">
            <div className="h-7 w-7 rounded-full bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold">
              {user?.fullName ? user.fullName.charAt(0) : 'O'}
            </div>
            <div className="text-left">
              <span className="block font-bold text-slate-200 text-xs line-clamp-1">{user?.fullName || 'Officer'}</span>
              <span className="block text-[10px] text-slate-400 font-mono">Role: AUTHORITY</span>
            </div>
          </Link>

          <Button
            size="sm"
            variant="outline"
            onClick={handleLogout}
            className="text-xs border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-900 min-h-[38px] px-3"
            title="Sign out of Authority Portal"
          >
            <LogOut className="h-4 w-4 mr-1 text-slate-400" />
            Logout
          </Button>
        </div>

        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-400" />
              <div>
                <span className="block font-bold text-xs text-white">{user?.fullName || 'Officer'}</span>
                <span className="block text-[10px] text-slate-400">{user?.email}</span>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleLogout} className="text-xs border-rose-900 text-rose-300">
              Logout
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/authority' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-semibold ${isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-300 bg-slate-900/60 hover:bg-slate-900'
                    }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{link.name}</span>
                  {link.badge && link.badge > 0 ? (
                    <span className="ml-auto px-1.5 py-0.2 bg-rose-500 text-white font-bold text-[10px] rounded-full">
                      {link.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
