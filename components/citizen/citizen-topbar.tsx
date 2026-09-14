'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, MapPin, ChevronDown, User } from 'lucide-react';

interface CitizenProfile {
  fullName: string;
  email: string;
  role: string;
  area: string;
}

export function CitizenTopbar() {
  const router = useRouter();
  const [citizen, setCitizen] = useState<CitizenProfile>({
    fullName: 'Jane Citizen',
    email: 'citizen@civicshield.org',
    role: 'CITIZEN',
    area: 'Gummidipoondi',
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          const u = json.data.user;
          setCitizen({
            fullName: u.fullName || 'Jane Citizen',
            email: u.email,
            role: u.role,
            area: u.area || 'Gummidipoondi',
          });
        }
      })
      .catch((err) => console.error('Failed to load user profile in citizen topbar:', err));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/my-reports?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getFirstName = (name: string) => {
    if (!name) return 'Citizen';
    return name.split(' ')[0];
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
      {/* Search Bar Input */}
      <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search location, issues, or your complaint ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-100/80 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
        />
      </form>

      {/* Right side Location Picker, Notifications & Profile */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Location Dropdown */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-200/60 transition-colors">
          <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>{citizen.area}</span>
          <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
        </div>

        {/* Notifications Icon */}
        <Link
          href="/citizen/notifications"
          className="relative p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2.2 w-2.2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
        </Link>

        {/* Profile Avatar & Name */}
        <Link href="/citizen/profile" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center justify-center text-xs shadow-xs group-hover:ring-2 group-hover:ring-emerald-500/30 transition-all">
            {citizen.fullName ? citizen.fullName.charAt(0) : 'J'}
          </div>
          <div className="text-left hidden md:block">
            <span className="block font-bold text-slate-900 text-xs leading-none group-hover:text-emerald-600 transition-colors">
              Hi, {getFirstName(citizen.fullName)}
            </span>
            <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
              Citizen
            </span>
          </div>
        </Link>
      </div>
    </header>
  );
}
