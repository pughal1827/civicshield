'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, ChevronDown } from 'lucide-react';

interface OfficerProfile {
  fullName: string;
  email: string;
  role: string;
  departmentName?: string;
  area?: string;
}

export function AuthorityTopbar() {
  const router = useRouter();
  const [officer, setOfficer] = useState<OfficerProfile>({
    fullName: 'Officer Robert Chen',
    email: 'officer@civicshield.gov',
    role: 'AUTHORITY',
    area: 'Gummidipoondi Zone',
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          const u = json.data.user;
          setOfficer({
            fullName: u.fullName || 'Officer Robert Chen',
            email: u.email,
            role: u.role,
            departmentName: u.department?.name,
            area: u.department?.name || u.area || 'Gummidipoondi Zone',
          });
        }
      })
      .catch((err) => console.error('Failed to load user profile in topbar:', err));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/authority/complaints?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'AR';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search complaints, locations, case IDs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-100/80 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
        />
      </form>

      {/* Right User & Notification Controls */}
      <div className="flex items-center gap-5">
        {/* Notification Bell */}
        <Link
          href="/authority/notifications"
          className="relative p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
        </Link>

        {/* Officer Avatar & Details Badge */}
        <Link href="/authority/profile" className="flex items-center gap-3 pl-3 border-l border-slate-200 hover:opacity-80 transition-opacity">
          <div className="h-9 w-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-emerald-500/20">
            {getInitials(officer.fullName)}
          </div>
          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900 text-xs leading-none">
                {officer.fullName}
              </span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </div>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              {officer.area || 'Gummidipoondi Zone'}
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
