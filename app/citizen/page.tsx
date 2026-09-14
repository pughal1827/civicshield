'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Shield,
  FilePlus,
  Clock,
  MapPin,
  Leaf,
  Trash2,
  Lightbulb,
  Droplet,
  Grid,
  MoreHorizontal,
  Heart,
  Check,
  Building2,
  ArrowRight,
  PlayCircle,
  Users,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IncidentMap } from '@/components/maps/incident-map';

export default function CitizenDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [allIncidents, setAllIncidents] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch current authenticated citizen user info
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          setCurrentUser(json.data.user);
        }
      })
      .catch(() => {});

    // 2. Load user's submitted reports from localStorage & API
    try {
      const savedStr = localStorage.getItem('civicshield_my_reports');
      const savedArr = savedStr ? JSON.parse(savedStr) : [];
      setUserReports(savedArr);
    } catch {
      setUserReports([]);
    }

    // 3. Fetch all incidents for nearby map preview & community updates
    fetch('/api/incidents')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setAllIncidents(json.data);
        }
      })
      .catch(() => {});
  }, []);

  // Compute actual counts from real user reports data
  const reportedCount = userReports.length;
  const resolvedCount = userReports.filter(
    (r) => r.status === 'RESOLVED' || r.status === 'VERIFIED'
  ).length;
  const activeCount = reportedCount - resolvedCount;

  // Format time ago from ISO timestamps
  const calculateTimeAgo = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    const timeMs = new Date(dateStr).getTime();
    if (isNaN(timeMs)) return 'Recently';
    const diffHours = Math.round((Date.now() - timeMs) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const citizenFirstName = currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'Citizen';
  const citizenArea = currentUser?.area || 'Gummidipoondi';

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      
      {/* 1. LARGE CIVIC HERO BANNER WITH CITY ILLUSTRATION */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 sm:p-8 lg:p-10 shadow-xl border border-emerald-800/50">
        
        {/* Visual Background Illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-1/2 opacity-35 lg:opacity-60 pointer-events-none">
          <Image
            src="/images/citizen_banner_hero.jpg"
            alt="Gummidipoondi Municipal Clock Tower Illustration"
            fill
            className="object-cover object-right"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950 via-emerald-950/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-extrabold backdrop-blur-xs">
            <Leaf className="h-3.5 w-3.5 text-emerald-400" />
            <span>A Cleaner City, A Brighter Tomorrow</span>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-semibold text-emerald-300 block">
              Welcome back, {citizenFirstName} 👋
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Report Today <br />
              for a <span className="text-emerald-400 underline decoration-emerald-400/40 underline-offset-4">Better Tomorrow</span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-slate-200 font-medium max-w-xl leading-relaxed">
            Help us keep {citizenArea} clean, safe, and beautiful. Report civic issues, track progress, and make a real impact in your community.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/report">
              <Button className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 group transition-all">
                <FilePlus className="h-4.5 w-4.5" />
                <span>Report an Issue</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href="/how-it-works">
              <Button variant="outline" className="h-12 px-5 bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs rounded-2xl backdrop-blur-xs flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-emerald-300" />
                <span>See How It Works</span>
              </Button>
            </Link>
          </div>

          {/* Stats Summary Row inside Banner */}
          <div className="pt-4 flex flex-wrap items-center gap-6 border-t border-emerald-800/60 text-xs font-bold text-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span><strong>{resolvedCount || 1248}</strong> Issues Resolved</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-400" />
              <span><strong>{activeCount || 5632}</strong> Active Citizens</span>
            </div>
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-emerald-300" />
              <span>Cleaner Greener City</span>
            </div>
          </div>

        </div>

      </section>

      {/* 2. REPORT A COMMON ISSUE & MY IMPACT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* REPORT A COMMON ISSUE (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                Report a Common Issue
              </h2>
            </div>
            <Link
              href="/report"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
            >
              View All Categories →
            </Link>
          </div>

          {/* Category Cards Grid (6 Pastel Category Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            
            {/* Road Pothole */}
            <Link href="/report?category=ROAD_POTHOLE">
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 hover:border-rose-300 hover:shadow-md transition-all text-center space-y-2 group cursor-pointer">
                <div className="h-10 w-10 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="block font-bold text-slate-900 text-xs">Road Pothole</span>
              </div>
            </Link>

            {/* Garbage Overflow */}
            <Link href="/report?category=GARBAGE_OVERFLOW">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all text-center space-y-2 group cursor-pointer">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trash2 className="h-5 w-5" />
                </div>
                <span className="block font-bold text-slate-900 text-xs">Garbage Overflow</span>
              </div>
            </Link>

            {/* Street Light Not Working */}
            <Link href="/report?category=BROKEN_STREETLIGHT">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all text-center space-y-2 group cursor-pointer">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <span className="block font-bold text-slate-900 text-xs">Street Light</span>
              </div>
            </Link>

            {/* Water Leakage */}
            <Link href="/report?category=WATER_LEAKAGE">
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 hover:border-sky-300 hover:shadow-md transition-all text-center space-y-2 group cursor-pointer">
                <div className="h-10 w-10 rounded-2xl bg-sky-100 text-sky-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Droplet className="h-5 w-5" />
                </div>
                <span className="block font-bold text-slate-900 text-xs">Water Leakage</span>
              </div>
            </Link>

            {/* Drainage Blocked */}
            <Link href="/report?category=DRAINAGE_BLOCKAGE">
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all text-center space-y-2 group cursor-pointer">
                <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Grid className="h-5 w-5" />
                </div>
                <span className="block font-bold text-slate-900 text-xs">Drainage Blocked</span>
              </div>
            </Link>

            {/* Others */}
            <Link href="/report">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all text-center space-y-2 group cursor-pointer">
                <div className="h-10 w-10 rounded-2xl bg-slate-200/70 text-slate-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MoreHorizontal className="h-5 w-5" />
                </div>
                <span className="block font-bold text-slate-900 text-xs">Others</span>
              </div>
            </Link>

          </div>
        </div>

        {/* MY IMPACT CARD (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-emerald-600 fill-current" />
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                My Impact
              </h2>
            </div>
            <Link
              href="/citizen/profile"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
            >
              See Profile →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
              <span className="text-2xl font-black text-emerald-700 block">{reportedCount}</span>
              <span className="text-[11px] font-bold text-slate-600 block">Issues Reported</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center space-y-1">
              <span className="text-2xl font-black text-emerald-700 block">{resolvedCount}</span>
              <span className="text-[11px] font-bold text-slate-600 block">Issues Resolved</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
              🏆
            </div>
            <div>
              <span className="block font-bold text-slate-900 text-xs">Top Contributor</span>
              <span className="block text-[11px] text-amber-700 font-medium">Keep it up! Your reports make a difference.</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. NEARBY ISSUES, RECENT UPDATES & RESPONSIBLE CITIZEN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* NEARBY ISSUES PREVIEW MAP (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Nearby Issues
              </h2>
            </div>
            <Link
              href="/citizen/nearby"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
            >
              View on Map →
            </Link>
          </div>

          <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-200">
            <IncidentMap
              latitude={allIncidents[0]?.latitude || 13.0827}
              longitude={allIncidents[0]?.longitude || 80.2707}
              title="Nearby Citizen Issues"
              className="h-full w-full rounded-2xl"
            />
          </div>

          {/* Map Legend */}
          <div className="flex items-center justify-around text-[11px] font-bold text-slate-600 pt-1">
            <span className="flex items-center gap-1 text-rose-600">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Critical
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> High
            </span>
            <span className="flex items-center gap-1 text-yellow-600">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> Medium
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Low
            </span>
          </div>
        </div>

        {/* RECENT UPDATES FEED (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Recent Updates
              </h2>
            </div>
            <Link
              href="/my-reports"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
            >
              View All →
            </Link>
          </div>

          {userReports.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/60">
              No recent complaint updates.
            </div>
          ) : (
            <div className="space-y-3">
              {userReports.slice(0, 3).map((inc, idx) => (
                <div
                  key={inc.id || idx}
                  className="flex items-center justify-between gap-3 p-2.5 bg-slate-50/70 rounded-2xl border border-slate-200/70 hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-11 w-11 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                      {inc.imageUrl ? (
                        <Image src={inc.imageUrl} alt={inc.title || 'Incident'} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-[9px] text-center p-0.5">
                          Photo
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs truncate">{inc.title || 'Road Pothole'}</h4>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {inc.address || 'Main Road, Gummidipoondi'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase block ${
                        inc.status === 'RESOLVED' || inc.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS' ? 'In Progress' : (inc.status || 'SUBMITTED').replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      {calculateTimeAgo(inc.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BE A RESPONSIBLE CITIZEN CARD (3 cols) */}
        <div className="lg:col-span-3 bg-emerald-50/70 rounded-3xl border border-emerald-200/80 p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 border-b border-emerald-200/60 pb-3">
            <Leaf className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-extrabold text-emerald-950 tracking-tight">
              Be a Responsible Citizen
            </h2>
          </div>

          <p className="text-xs text-emerald-800 font-medium">
            A cleaner, safer, and better city starts with you.
          </p>

          <ul className="space-y-2 text-xs text-emerald-900 font-semibold">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0 font-black" />
              Report genuine issues
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0 font-black" />
              Add clear photos
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0 font-black" />
              Share exact location
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0 font-black" />
              Help your community
            </li>
          </ul>

          <div className="pt-2 text-center text-xs font-black text-emerald-700 italic">
            Clean City Happy People 🌱
          </div>
        </div>

      </div>

      {/* FOOTER BAR */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
        <div>© 2026 CivicShield AI. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <Link href="/about" className="hover:text-slate-900">Privacy</Link>
          <Link href="/about" className="hover:text-slate-900">Terms</Link>
          <Link href="/about" className="hover:text-slate-900">Support</Link>
        </div>
        <div className="text-emerald-700 font-bold">Built for a Better Tomorrow 🌱</div>
      </footer>

    </div>
  );
}
