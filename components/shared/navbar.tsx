'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, FilePlus, Search, LayoutDashboard, Menu, X, User, LogIn, HelpCircle, Info, MapPin, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          setCurrentUser(json.data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null));
  }, [pathname]);

  const isAuthorityPage = pathname?.startsWith('/dashboard') || pathname?.startsWith('/authority');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/90 bg-slate-950/95 backdrop-blur-md">
      {/* Top Utility Banner */}
      <div className="bg-slate-900 border-b border-slate-800/60 py-1 px-4 text-[11px] font-medium text-slate-400 flex items-center justify-between">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Official Municipal Digital Civic Service
          </span>
          <span className="hidden sm:inline-block text-slate-500">
            Emergency? Call 911 immediately.
          </span>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/citizen" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-emerald-400 border border-slate-700 group-hover:border-emerald-500/50 transition-colors">
            <Shield className="h-5 w-5 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              CivicShield
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Civic Service
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-300">
          <Link href="/citizen" className={`hover:text-emerald-400 transition-colors ${pathname === '/citizen' ? 'text-emerald-400' : ''}`}>
            Home
          </Link>
          <Link href="/report" className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 ${pathname === '/report' ? 'text-emerald-400' : ''}`}>
            <FilePlus className="h-3.5 w-3.5 text-emerald-400" />
            <span>Report Issue</span>
          </Link>
          <Link href="/track" className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 ${pathname?.startsWith('/track') ? 'text-emerald-400' : ''}`}>
            <Search className="h-3.5 w-3.5" />
            <span>Track Report</span>
          </Link>
          <Link href="/my-reports" className={`hover:text-emerald-400 transition-colors ${pathname === '/my-reports' ? 'text-emerald-400' : ''}`}>
            My Reports
          </Link>
          <Link href="/citizen/nearby" className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 ${pathname === '/citizen/nearby' ? 'text-emerald-400' : ''}`}>
            <MapPin className="h-3.5 w-3.5" />
            <span>Nearby</span>
          </Link>

          {!isAuthorityPage && (
            <Link
              href="/authority/login"
              className="hover:text-cyan-400 transition-colors border-l border-slate-800 pl-5 flex items-center gap-1.5 text-slate-400"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-cyan-400" />
              <span>Authority Portal</span>
            </Link>
          )}
        </nav>

        {/* Desktop User Action CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <Link href="/citizen/notifications">
                <Button size="sm" variant="ghost" className="p-2 min-h-[38px] text-slate-300 relative" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={currentUser.role === 'CITIZEN' ? '/citizen' : '/authority'}>
                <Button size="sm" variant="outline" className="text-xs gap-1.5 border-slate-700">
                  <User className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{currentUser.fullName}</span>
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button size="sm" variant="outline" className="text-xs gap-1.5 border-slate-700">
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Log In</span>
                </Button>
              </Link>
              <Link href="/report">
                <Button size="sm" variant="primary" className="text-xs font-bold">
                  Report Issue
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/report"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 min-h-[44px]"
          >
            <FilePlus className="h-4 w-4" />
            <span>Report a Civic Issue</span>
          </Link>
          <Link
            href="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900 min-h-[44px]"
          >
            <Search className="h-4 w-4" />
            <span>Track Report</span>
          </Link>
          <Link
            href="/my-reports"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900 min-h-[44px]"
          >
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>My Reports</span>
          </Link>
          <Link
            href="/citizen/nearby"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900 min-h-[44px]"
          >
            <MapPin className="h-4 w-4 text-blue-400" />
            <span>Nearby Civic Issues</span>
          </Link>
          <Link
            href="/how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900 min-h-[44px]"
          >
            <HelpCircle className="h-4 w-4" />
            <span>How It Works</span>
          </Link>

          {currentUser ? (
            <Link
              href={currentUser.role === 'CITIZEN' ? '/citizen' : '/authority'}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-900 border-t border-slate-800 pt-3 min-h-[44px]"
            >
              <User className="h-4 w-4 text-emerald-400" />
              <span>{currentUser.fullName} ({currentUser.role})</span>
            </Link>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" variant="outline" className="w-full text-xs min-h-[44px]">
                  Log In
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                <Button size="sm" variant="primary" className="w-full text-xs min-h-[44px]">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}

          <div className="pt-2 border-t border-slate-900 text-center">
            <Link
              href="/authority/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs text-slate-400 hover:text-cyan-400"
            >
              Authority Portal Login →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
