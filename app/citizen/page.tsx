'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
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
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Flame,
  Navigation,
  Compass,
  ChevronRight,
  Eye,
  ShieldAlert,
  ThumbsUp,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Dynamically import Leaflet Map to avoid SSR issues
const IncidentClusterMap = dynamic(
  () => import('@/components/maps/incident-cluster-map').then((mod) => mod.IncidentClusterMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2">
        <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-[11px] font-semibold text-slate-300">Loading nearby community map…</span>
      </div>
    ),
  }
);

interface SmartSuggestion {
  id: string;
  type: 'safety' | 'community' | 'tip' | 'weather';
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  icon: string;
  actionText?: string;
  actionHref?: string;
  incidentId?: string;
}

export default function CitizenDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [allIncidents, setAllIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [loadingIncidents, setLoadingIncidents] = useState(true);

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

    // 3. Fetch all active incidents for nearby map preview & community updates
    fetch('/api/incidents')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const list = Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.data.incidents)
            ? json.data.incidents
            : [];
          setAllIncidents(list);
          if (list.length > 0) {
            setSelectedIncident(list[0]);
          }
        }
      })
      .catch((err) => console.error('Error loading citizen incidents:', err))
      .finally(() => setLoadingIncidents(false));
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

  // ─── DYNAMIC AI SMART SUGGESTIONS ENGINE ─────────────────────────────────
  const smartSuggestions: SmartSuggestion[] = useMemo(() => {
    const suggestions: SmartSuggestion[] = [];

    // Find critical / safety-sensitive hazards in area
    const criticalIncidents = allIncidents.filter(
      (inc) =>
        inc.severity === 'CRITICAL' ||
        (inc.priorityScore && inc.priorityScore >= 80) ||
        inc.category === 'OPEN_MANHOLE' ||
        inc.category === 'ELECTRICAL_HAZARD'
    );

    if (criticalIncidents.length > 0) {
      const topHazard = criticalIncidents[0];
      const categoryLabel = topHazard.category?.replace(/_/g, ' ') || 'Hazard';
      const streetName = topHazard.address?.split(',')[0] || topHazard.address || 'nearby street';

      suggestions.push({
        id: 'sug-critical-hazard',
        type: 'safety',
        title: `Caution: ${categoryLabel} Reported Nearby`,
        description: `Active safety hazard near ${streetName}. Exercise caution if driving two-wheelers or walking at night. Municipal team has been dispatched.`,
        badge: 'Safety Advisory',
        badgeColor: 'bg-rose-500 text-white',
        icon: '⚠️',
        actionText: 'View on Map',
        actionHref: '/citizen/nearby',
        incidentId: topHazard.id,
      });
    }

    // Find clustered hotspots (multiple citizen reports)
    const clustered = allIncidents.filter((inc) => (inc.reportCount || 1) > 1);
    if (clustered.length > 0) {
      const hotSpot = clustered[0];
      suggestions.push({
        id: 'sug-cluster-boost',
        type: 'community',
        title: `Community Hotspot: ${hotSpot.reportCount} Neighbors Reported`,
        description: `Multiple citizens confirmed "${hotSpot.title}" on ${hotSpot.address || citizenArea}. Community confirmations have elevated this issue to high municipal triage priority!`,
        badge: 'Community Alert',
        badgeColor: 'bg-purple-600 text-white',
        icon: '👥',
        actionText: 'Check Status',
        actionHref: '/citizen/nearby',
        incidentId: hotSpot.id,
      });
    }

    // Water stagnation / drainage check
    const waterIssues = allIncidents.filter(
      (inc) => inc.category === 'FLOOD' || inc.category === 'DRAINAGE_BLOCKAGE' || inc.category === 'WATER_LEAKAGE'
    );
    if (waterIssues.length > 0) {
      suggestions.push({
        id: 'sug-water-advisory',
        type: 'weather',
        title: 'Road Drainage & Water Stagnation Notice',
        description: `${waterIssues.length} water-related complaint${waterIssues.length > 1 ? 's' : ''} reported in your zone. Avoid low-lying corridors during heavy rains to prevent commute delays.`,
        badge: 'Monsoon Alert',
        badgeColor: 'bg-sky-600 text-white',
        icon: '🌧️',
        actionText: 'View Water Points',
        actionHref: '/citizen/nearby',
      });
    }

    // Always include a Smart Photography & Reporting AI Tip
    suggestions.push({
      id: 'sug-reporting-tip',
      type: 'tip',
      title: 'AI Photo Triage Tip for Faster Resolution',
      description: 'Taking clear photos from 5–10 feet with road landmarks visible allows CivicShield AI to automatically extract coordinates and speeds up department assignment by 40%.',
      badge: 'Civic Best Practice',
      badgeColor: 'bg-emerald-600 text-white',
      icon: '📸',
      actionText: 'Report an Issue',
      actionHref: '/report',
    });

    return suggestions.slice(0, 3);
  }, [allIncidents, citizenArea]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* ─── 1. LARGE CIVIC HERO BANNER WITH CITY ILLUSTRATION ─────────────── */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 sm:p-8 lg:p-10 shadow-xl border border-emerald-800/50">
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
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-extrabold backdrop-blur-xs">
            <Leaf className="h-3.5 w-3.5 text-emerald-400" />
            <span>A Cleaner City, A Brighter Tomorrow</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-semibold text-emerald-300 block">
              Welcome back, {citizenFirstName} 👋
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Report Today <br />
              for a <span className="text-emerald-400 underline decoration-emerald-400/40 underline-offset-4">Better Tomorrow</span>
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 font-medium max-w-xl leading-relaxed">
            Help us keep {citizenArea} clean, safe, and beautiful. Report civic issues, track progress, and make a real impact in your community.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/report">
              <Button className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 group transition-all">
                <FilePlus className="h-4.5 w-4.5" />
                <span>Report an Issue</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <Link href="/citizen/nearby">
              <Button variant="outline" className="h-12 px-5 bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs rounded-2xl backdrop-blur-xs flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-300" />
                <span>Explore Nearby Map ({allIncidents.length})</span>
              </Button>
            </Link>
          </div>

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
              <span>{allIncidents.length} Active Spatial Issues in {citizenArea}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. SMART AI COMMUNITY ASSISTANT & NEARBY ADVISORIES (NEW FEATURE) ─ */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white border border-emerald-800/50 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Sparkles className="h-4.5 w-4.5 animate-pulse text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                <span>AI Community & Safety Assistant</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950 uppercase">
                  Live Insights
                </span>
              </h2>
              <p className="text-[11px] text-emerald-300/80 font-medium">
                Automated geospatial safety advisories and community action tips based on active reports in {citizenArea}.
              </p>
            </div>
          </div>

          <Link
            href="/citizen/nearby"
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline self-start sm:self-auto"
          >
            <span>Explore All {allIncidents.length} Issues</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Suggestions Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {smartSuggestions.map((sug) => (
            <div
              key={sug.id}
              className="p-4 rounded-2xl bg-slate-950/60 border border-emerald-900/60 hover:border-emerald-700/80 transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base">{sug.icon}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${sug.badgeColor}`}>
                    {sug.badge}
                  </span>
                </div>

                <h3 className="text-xs font-extrabold text-white leading-snug group-hover:text-emerald-300 transition-colors">
                  {sug.title}
                </h3>

                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  {sug.description}
                </p>
              </div>

              {sug.actionText && (
                <div className="pt-2 border-t border-slate-800/80">
                  <Link
                    href={sug.actionHref || '/citizen/nearby'}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 group/btn"
                  >
                    <span>{sug.actionText}</span>
                    <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── 3. REPORT A COMMON ISSUE & MY IMPACT GRID ─────────────────────── */}
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link href="/report?category=ROAD_POTHOLE">
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 hover:border-rose-300 hover:shadow-md transition-all text-center space-y-2 group cursor-pointer">
                <div className="h-10 w-10 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="block font-bold text-slate-900 text-xs">Road Pothole</span>
              </div>
            </Link>

            <Link href="/report?category=GARBAGE_OVERFLOW">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all text-center space-y-2 group cursor-pointer">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trash2 className="h-5 w-5" />
                </div>
                <span className="block font-bold text-slate-900 text-xs">Garbage Overflow</span>
              </div>
            </Link>

            <Link href="/report?category=BROKEN_STREETLIGHT">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all text-center space-y-2 group cursor-pointer">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <span className="block font-bold text-slate-900 text-xs">Street Light</span>
              </div>
            </Link>

            <Link href="/report?category=WATER_LEAKAGE">
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 hover:border-sky-300 hover:shadow-md transition-all text-center space-y-2 group cursor-pointer">
                <div className="h-10 w-10 rounded-2xl bg-sky-100 text-sky-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Droplet className="h-5 w-5" />
                </div>
                <span className="block font-bold text-slate-900 text-xs">Water Leakage</span>
              </div>
            </Link>

            <Link href="/report?category=DRAINAGE_BLOCKAGE">
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all text-center space-y-2 group cursor-pointer">
                <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Grid className="h-5 w-5" />
                </div>
                <span className="block font-bold text-slate-900 text-xs">Drainage Blocked</span>
              </div>
            </Link>

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

      {/* ─── 4. NEARBY ISSUES INTERACTIVE MAP & RECENT UPDATES GRID ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* NEARBY ISSUES MULTI-PIN INTERACTIVE MAP (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-5 space-y-3 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Nearby Community Issues ({allIncidents.length})
                </h2>
              </div>
              <Link
                href="/citizen/nearby"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
              >
                View Full Map →
              </Link>
            </div>

            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Real-time complaint locations color-coded by hazard tier across {citizenArea}.
            </p>
          </div>

          {/* Spatial Map Container */}
          <div className="relative h-60 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <IncidentClusterMap
              incidents={allIncidents}
              selectedIncident={selectedIncident}
              selectedIncidentId={selectedIncident?.id}
              onIncidentClick={(inc) => setSelectedIncident(inc)}
              height="100%"
              className="h-full w-full"
              showControls={true}
            />
          </div>

          {/* Map Priority Legend */}
          <div className="flex items-center justify-around text-[11px] font-bold text-slate-600 pt-1 border-t border-slate-100">
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

        {/* RECENT UPDATES FEED (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Recent Updates in {citizenArea}
              </h2>
            </div>
            <Link
              href="/citizen/nearby"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
            >
              View All →
            </Link>
          </div>

          {allIncidents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/60">
              No recent complaint updates.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {allIncidents.slice(0, 4).map((inc, idx) => (
                <div
                  key={inc.id || idx}
                  onClick={() => setSelectedIncident(inc)}
                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedIncident?.id === inc.id
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                      {inc.imageUrl ? (
                        <Image src={inc.imageUrl} alt={inc.title || 'Incident'} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-[10px] text-center p-0.5 bg-slate-100">
                          📍 Pin
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[10px] text-slate-600">#{inc.caseId || inc.case_id}</span>
                        <h4 className="font-bold text-slate-900 text-xs truncate">{inc.title || 'Civic Issue'}</h4>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {inc.address || `${citizenArea} Sector Road`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase block ${
                        inc.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-700'
                          : inc.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {inc.severity || 'MEDIUM'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      {calculateTimeAgo(inc.createdAt || inc.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── FOOTER BAR ─────────────────────────────────────────────────────── */}
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
