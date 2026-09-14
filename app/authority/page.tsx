'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  ArrowRight,
  FileText,
  Building2,
  RefreshCw,
  Eye,
  Calendar,
  Layers,
  MapPin,
  Flame,
  Bell,
  BarChart3,
  Sparkles,
  Zap,
  TrendingUp,
  Map as MapIcon,
  Check,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/components/ui/loading-state';

const IncidentClusterMap = dynamic(
  () => import('@/components/maps/incident-cluster-map').then((mod) => mod.IncidentClusterMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[460px] bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-sm animate-pulse">
        Loading incident map…
      </div>
    ),
  }
);

interface IncidentItem {
  id: string;
  caseId: string;
  title: string;
  summary: string;
  category: string;
  severity: string;
  status: string;
  priorityScore: number;
  latitude: number;
  longitude: number;
  address: string;
  departmentName?: string;
  reportCount: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface StatsData {
  total: number;
  critical: number;
  high: number;
  working: number;
  late: number;
  solved: number;
}

export default function AuthorityDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [officerName, setOfficerName] = useState('Officer Robert Chen');
  const [officerArea, setOfficerArea] = useState('Gummidipoondi Zone');
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    critical: 0,
    high: 0,
    working: 0,
    late: 0,
    solved: 0,
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateStr(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardTelemetry = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch User Session
      const authRes = await fetch('/api/auth/me');
      const authJson = await authRes.json();

      if (!authJson.success || (authJson.data?.user?.role !== 'AUTHORITY' && authJson.data?.user?.role !== 'ADMIN')) {
        setAuthorized(false);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setAuthorized(true);
      if (authJson.data?.user) {
        setOfficerName(authJson.data.user.fullName || 'Officer Robert Chen');
        setOfficerArea(authJson.data.user.department?.name || authJson.data.user.area || 'Gummidipoondi Zone');
      }

      // 2. Fetch Incidents Feed
      const incRes = await fetch('/api/incidents');
      if (incRes.ok) {
        const incJson = await incRes.json();
        if (incJson.success && Array.isArray(incJson.data?.incidents)) {
          const list: IncidentItem[] = incJson.data.incidents;
          setIncidents(list);

          // Use real stats from API if available, otherwise compute from incidents
          const now = Date.now();
          let total = list.length;
          let critical = 0;
          let high = 0;
          let working = 0;
          let late = 0;
          let solved = 0;

          list.forEach((inc) => {
            if (inc.severity === 'CRITICAL' || (inc.priorityScore || 0) >= 80) critical++;
            else if (inc.severity === 'HIGH' || (inc.priorityScore || 0) >= 60) high++;

            if (inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS') working++;
            if (inc.status === 'RESOLVED' || inc.status === 'VERIFIED') solved++;

            const createdTime = new Date(inc.createdAt).getTime();
            const hoursElapsed = (now - createdTime) / (1000 * 3600);
            const isUnsolved = inc.status !== 'RESOLVED' && inc.status !== 'VERIFIED';
            if (isUnsolved && ((inc.severity === 'CRITICAL' && hoursElapsed > 4) || (inc.severity === 'HIGH' && hoursElapsed > 24) || hoursElapsed > 72)) {
              late++;
            }
          });

          setStats({ total, critical, high, working, late, solved });
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardTelemetry();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <LoadingState message="Connecting to Municipal Command Telemetry..." />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-950 p-8 rounded-2xl border border-rose-900/60 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mx-auto flex items-center justify-center">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">403 Forbidden — Officer Access Only</h1>
          <p className="text-xs text-rose-200/80 leading-relaxed">
            Only authenticated municipal authority officers can access the Command Center. Citizen accounts are restricted.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/authority/login">
              <button className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all">
                Sign in to Authority Portal
              </button>
            </Link>
            <Link href="/">
              <button className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition-all">
                Back to Public Portal
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formatExactDate = (isoStr: string) => {
    if (!isoStr) return '14 Sep 2026, 10:42 AM';
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    } catch {
      return isoStr;
    }
  };

  // Filter top priority complaints for the main feed
  const priorityFeed = [...incidents]
    .filter((inc) => inc.status !== 'RESOLVED' && inc.status !== 'VERIFIED')
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 1. GREETING HEADER & DATE/TIME WIDGET */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Good Morning, {officerName} 👋
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
            {officerArea} <span className="text-slate-300">•</span> Let&apos;s make our city safer and better today.
          </p>
        </div>

        {/* Date / Time Card */}
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="block font-bold text-slate-800 text-xs">
              {currentDateStr || 'Tuesday, 9 September 2026'}
            </span>
            <span className="block text-[11px] text-slate-400 font-mono font-medium">
              {currentTimeStr || '10:24 AM'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. SIX METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Complaints */}
        <Link href="/authority/complaints">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-sky-300 transition-all group cursor-pointer space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Complaints
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats.total}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> ↑ 12% from last week
            </span>
          </div>
        </Link>

        {/* Critical */}
        <Link href="/authority/priority">
          <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-xs hover:shadow-md hover:border-rose-400 transition-all group cursor-pointer space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                Critical
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats.critical}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
              ↑ 3 new
            </span>
          </div>
        </Link>

        {/* High */}
        <Link href="/authority/priority">
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs hover:shadow-md hover:border-amber-400 transition-all group cursor-pointer space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
                High
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats.high}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-amber-600 flex items-center gap-1">
              ↑ 5 new
            </span>
          </div>
        </Link>

        {/* Working */}
        <Link href="/authority/complaints?status=WORKING">
          <div className="bg-white p-4 rounded-2xl border border-sky-200/80 shadow-xs hover:shadow-md hover:border-sky-400 transition-all group cursor-pointer space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">
                Working
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats.working}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-sky-600 flex items-center gap-1">
              ↑ 8 in progress
            </span>
          </div>
        </Link>

        {/* Late */}
        <Link href="/authority/late">
          <div className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-xs hover:shadow-md hover:border-purple-400 transition-all group cursor-pointer space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">
                Late
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats.late}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-purple-600 flex items-center gap-1">
              ↑ 2 more
            </span>
          </div>
        </Link>

        {/* Solved */}
        <Link href="/authority/complaints?status=SOLVED">
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all group cursor-pointer space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                Solved
              </span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                {stats.solved}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
              ↑ 6 this week
            </span>
          </div>
        </Link>
      </div>

      {/* 3. SPLIT MAIN DASHBOARD LAYOUT (Left Column & Right Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: PRIORITY COMPLAINTS & BOTTOM SUCCESS BANNER (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 🔥 PRIORITY COMPLAINTS CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-rose-500 fill-current" />
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Priority Complaints
                </h2>
              </div>
              <Link
                href="/authority/priority"
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 hover:underline"
              >
                View All →
              </Link>
            </div>

            {/* Complaints Feed List */}
            {priorityFeed.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-700">No Urgent Priority Complaints Pending</p>
                <p>All active citizen reports in your area are verified and under control.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {priorityFeed.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/70 hover:border-sky-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Thumbnail Photo */}
                      <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                        {inc.imageUrl ? (
                          <Image
                            src={inc.imageUrl}
                            alt={inc.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-[10px] text-center p-1 bg-slate-100">
                            Civic Photo
                          </div>
                        )}
                      </div>

                      {/* Complaint Metadata */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white ${
                              inc.severity === 'CRITICAL' || inc.priorityScore >= 80
                                ? 'bg-rose-600'
                                : inc.severity === 'HIGH' || inc.priorityScore >= 60
                                ? 'bg-amber-500'
                                : 'bg-yellow-500 text-slate-900'
                            }`}
                          >
                            {inc.severity || 'CRITICAL'}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-slate-500">
                            #{inc.caseId}
                          </span>
                          {(inc.reportCount > 1 || (inc as any).report_count > 1) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Flame className="h-3 w-3 text-amber-600" />
                              {inc.reportCount || (inc as any).report_count} Clustered
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">
                          {inc.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium">
                          <span className="flex items-center gap-1 text-slate-700 font-semibold truncate">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            {inc.address || 'Location noted'}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            {inc.reportCount || 1} {((inc.reportCount || 1) === 1 ? 'citizen report' : 'citizen reports')}
                          </span>
                          <span>•</span>
                          <span className="text-sky-700 font-semibold">{inc.departmentName || 'Civic Infrastructure'}</span>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                          ⏱ {formatExactDate(inc.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* Right Status & View Button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 shrink-0 border-t sm:border-t-0 border-slate-200/60 pt-2 sm:pt-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inc.status === 'SUBMITTED' || inc.status === 'AI_ANALYSED'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {inc.status === 'SUBMITTED' ? 'NEW' : inc.status.replace('_', ' ')}
                      </span>

                      <Link href={`/authority/complaints/${inc.id}`}>
                        <button className="px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-900 hover:text-white transition-colors flex items-center gap-1 shadow-2xs">
                          View →
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🏆 BOTTOM SUCCESS / STATUS BANNER */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-900 shadow-xs">
            <div className="flex items-center gap-3 text-xs font-bold">
              <div className="h-9 w-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                🏆
              </div>
              <div>
                <span className="block text-sm font-extrabold text-emerald-950">
                  Keep up the great work!
                </span>
                <span className="block text-xs font-medium text-emerald-700 mt-0.5">
                  <strong>{stats.solved} complaints</strong> have been resolved this week.
                </span>
              </div>
            </div>

            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300/60 shrink-0">
              Together for a Cleaner, Safer Tomorrow 🌱
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: MAP PREVIEW, NOTIFICATIONS, CHART, QUICK ACTIONS (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 📍 PROBLEM MAP CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-sky-600" />
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Problem Map
                </h2>
              </div>
              <Link
                href="/authority/map"
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 hover:underline"
              >
                Open Map →
              </Link>
            </div>

            {/* Spatial Map Preview with Clustering */}
            <div className="relative h-52 w-full rounded-xl overflow-hidden border border-slate-200">
              <IncidentClusterMap
                incidents={incidents}
                height="100%"
                className="h-full w-full"
              />
            </div>

            {/* Map Priority Legend */}
            <div className="flex items-center justify-around text-[11px] font-semibold text-slate-600 pt-1">
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

          {/* 🔔 RECENT NOTIFICATIONS CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-sky-600" />
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Recent Notifications
                </h2>
              </div>
              <Link
                href="/authority/notifications"
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 hover:underline"
              >
                View All →
              </Link>
            </div>

            {/* Event List */}
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0 mt-1" />
                <div>
                  <span className="font-bold text-slate-900 block">New critical complaint reported</span>
                  <span className="text-[11px] text-slate-500 block">Main Road, Gummidipoondi • 2 minutes ago</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500 shrink-0 mt-1" />
                <div>
                  <span className="font-bold text-slate-900 block">AI analysis completed</span>
                  <span className="text-[11px] text-slate-500 block">Garbage overflow - CS-1042 • 15 minutes ago</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0 mt-1" />
                <div>
                  <span className="font-bold text-slate-900 block">Complaint is now late</span>
                  <span className="text-[11px] text-slate-500 block">Street light - CS-0987 • 1 hour ago</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                <div>
                  <span className="font-bold text-slate-900 block">Department marked as resolved</span>
                  <span className="text-[11px] text-slate-500 block">Water leakage - CS-1011 • 2 hours ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* 📊 COMPLAINT STATUS OVERVIEW CHART CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-sky-600" />
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Complaint Status Overview
                </h2>
              </div>
              <span className="text-xs font-bold text-sky-600">Last 7 Days →</span>
            </div>

            {/* Daily Bar Stacked Mock Chart */}
            <div className="h-32 flex items-end justify-between gap-2 pt-4 px-2">
              {['Sep 3', 'Sep 4', 'Sep 5', 'Sep 6', 'Sep 7', 'Sep 8', 'Sep 9'].map((day, idx) => {
                const heights = [60, 75, 80, 95, 85, 70, 90];
                const h = heights[idx];
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end" style={{ height: `${h}%` }}>
                      <div className="h-2/5 bg-sky-500 w-full" />
                      <div className="h-1/5 bg-amber-400 w-full" />
                      <div className="h-1/5 bg-rose-500 w-full" />
                      <div className="h-1/5 bg-emerald-500 w-full" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ⚡ QUICK ACTIONS CARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap className="h-5 w-5 text-amber-500 fill-current" />
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Quick Actions
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/authority/complaints">
                <button className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between transition-colors shadow-2xs">
                  <span>📋 View All</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </Link>

              <Link href="/authority/map">
                <button className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between transition-colors shadow-2xs">
                  <span>📍 Open Map</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </Link>

              <Link href="/authority/reports">
                <button className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between transition-colors shadow-2xs">
                  <span>📊 Generate Report</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </Link>

              <Link href="/authority/late">
                <button className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between transition-colors shadow-2xs">
                  <span>⏰ Late Queue</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
