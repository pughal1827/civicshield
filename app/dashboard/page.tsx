'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ChevronRight,
  GitMerge,
  RefreshCw,
  Building2,
  Flame,
  TrendingUp,
  MapPin,
  Sparkles,
  HelpCircle,
  Eye,
  Calendar,
  CheckSquare,
  ArrowUpRight,
  ListFilter,
  Map as MapIcon,
  Shield,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { LoadingState } from '@/components/ui/loading-state';

export default function CivicOperationsCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commandData, setCommandData] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Record<string, boolean>>({});

  // Filter & Search
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Date formatted string
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setCurrentDateStr(
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );
  }, []);

  const fetchCommandCenterData = async () => {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      // 1. Fetch Command Center Operational Telemetry
      const commandRes = await fetch('/api/authority/operations/command-center?days=7');
      if (!commandRes.ok) {
        if (commandRes.status === 503) {
          throw new Error('Database service unavailable. Failed to fetch telemetry.');
        }
        throw new Error('Failed to load operations telemetry.');
      }
      const commandJson = await commandRes.json();
      if (commandJson.success) {
        setCommandData(commandJson.data);
      }

      // 2. Fetch Incidents Feed
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);

      const incRes = await fetch(`/api/incidents?${params.toString()}`);
      if (incRes.ok) {
        const incJson = await incRes.json();
        if (incJson.success) {
          setIncidents(incJson.data.incidents || []);
        }
      }
    } catch (err: any) {
      console.error('[Command Center UI] Fetch error:', err);
      setErrorMsg(err.message || 'Unable to load command center data right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCommandCenterData();
  }, [search, priorityFilter, statusFilter, categoryFilter]);

  const handleRetrySection = (sectionKey: string) => {
    setSectionErrors((prev) => ({ ...prev, [sectionKey]: false }));
    fetchCommandCenterData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 overflow-x-hidden">
      {/* ------------------------------------------------------------- */}
      {/* TOP COMMAND CENTER HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cyan">Civic Operations Command Center</Badge>
            <span className="text-xs text-slate-400 font-mono">• Municipal Live Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <Shield className="h-7 w-7 text-cyan-400" />
            Civic Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2">
            <span>Monitor civic issues, identify priorities, and coordinate resolution.</span>
            {currentDateStr && (
              <span className="hidden sm:inline-flex items-center gap-1 text-slate-500 font-medium">
                <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                {currentDateStr}
              </span>
            )}
          </p>
        </div>

        {/* Global Nav Buttons & Refresh Control */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/authority/incidents">
            <Button size="sm" variant="outline" className="text-xs border-slate-700 min-h-[44px] px-3">
              <ListFilter className="h-4 w-4 mr-1.5 text-cyan-400" /> Incidents
            </Button>
          </Link>
          <Link href="/authority/intelligence/departments">
            <Button size="sm" variant="cyan" className="font-bold text-xs min-h-[44px] px-3">
              <Building2 className="h-4 w-4 mr-1.5" /> Departments
            </Button>
          </Link>
          <Link href="/authority/intelligence/escalations">
            <Button size="sm" variant="outline" className="text-xs border-rose-800 text-rose-300 min-h-[44px] px-3">
              <ShieldAlert className="h-4 w-4 mr-1.5 text-rose-400" /> Alerts
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchCommandCenterData}
            disabled={refreshing}
            className="shrink-0 min-h-[44px] border-slate-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Database Error Banner */}
      {errorMsg && (
        <Card variant="glass" className="p-4 border-rose-900/60 bg-rose-950/30 text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">{errorMsg}</p>
              <p className="text-rose-300/80 mt-0.5">Please check system database connectivity or retry refreshing.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={fetchCommandCenterData} className="text-xs border-rose-700">
            Retry
          </Button>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 1: TODAY'S ACTION QUEUE (MOST IMPORTANT BANNER) */}
      {/* ------------------------------------------------------------- */}
      <Card
        variant="glass"
        className="p-6 border-cyan-500/40 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-cyan-950/20 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400 animate-pulse" />
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">Today&apos;s Action Queue</h2>
              <Badge variant="amber">Immediate Triage</Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {commandData?.actionQueue?.totalActionItems > 0 ? (
                <span>
                  <strong className="text-amber-400 font-black text-base mr-1">
                    {commandData.actionQueue.totalActionItems} items
                  </strong>{' '}
                  require municipal authority action right now.
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold">Nothing urgent right now. All primary workflows on track.</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/authority/intelligence/escalations">
              <Button size="md" variant="cyan" className="font-bold text-xs min-h-[44px]">
                Review Priority Queue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Action Item Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <Link href="/authority/intelligence/escalations">
            <div className="bg-slate-950/80 border border-rose-900/50 p-3 rounded-xl hover:border-rose-500 transition-all cursor-pointer">
              <span className="text-[11px] font-semibold text-rose-400 block flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> Emergency Reviews
              </span>
              <span className="text-2xl font-black text-rose-300">
                {commandData?.actionQueue?.emergencyReviewCount || 0}
              </span>
            </div>
          </Link>

          <Link href="/authority/incidents">
            <div className="bg-slate-950/80 border border-amber-900/50 p-3 rounded-xl hover:border-amber-500 transition-all cursor-pointer">
              <span className="text-[11px] font-semibold text-amber-400 block flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Unassigned Crit/High
              </span>
              <span className="text-2xl font-black text-amber-300">
                {(commandData?.actionQueue?.unassignedCriticalCount || 0) + (commandData?.actionQueue?.unassignedHighCount || 0)}
              </span>
            </div>
          </Link>

          <Link href="/authority/intelligence/sla">
            <div className="bg-slate-950/80 border border-rose-900/40 p-3 rounded-xl hover:border-rose-500 transition-all cursor-pointer">
              <span className="text-[11px] font-semibold text-rose-400 block flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> SLA Breached
              </span>
              <span className="text-2xl font-black text-rose-300">
                {commandData?.actionQueue?.slaBreachedCount || 0}
              </span>
            </div>
          </Link>

          <Link href="/authority/intelligence/root-causes">
            <div className="bg-slate-950/80 border border-cyan-900/50 p-3 rounded-xl hover:border-cyan-500 transition-all cursor-pointer">
              <span className="text-[11px] font-semibold text-cyan-400 block flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Possible Common Causes
              </span>
              <span className="text-2xl font-black text-cyan-300">
                {commandData?.actionQueue?.commonCauseCount || 0}
              </span>
            </div>
          </Link>
        </div>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* QUICK ACTIONS BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Quick Actions</span>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard">
            <Button size="sm" variant="outline" className="text-xs border-slate-700 min-h-[44px]">
              + Review Reports
            </Button>
          </Link>
          <Link href="/authority/intelligence/escalations">
            <Button size="sm" variant="outline" className="text-xs border-rose-800 text-rose-300 min-h-[44px]">
              + Priority Queue
            </Button>
          </Link>
          <Link href="/authority/incidents">
            <Button size="sm" variant="outline" className="text-xs border-slate-700 min-h-[44px]">
              + View Map
            </Button>
          </Link>
          <Link href="/authority/intelligence/departments">
            <Button size="sm" variant="outline" className="text-xs border-cyan-800 text-cyan-300 min-h-[44px]">
              + Department Operations
            </Button>
          </Link>
          <Link href="/authority/intelligence/sla">
            <Button size="sm" variant="outline" className="text-xs border-slate-700 min-h-[44px]">
              + SLA Monitoring
            </Button>
          </Link>
          <Link href="/authority/intelligence">
            <Button size="sm" variant="outline" className="text-xs border-slate-700 min-h-[44px]">
              + Civic Intelligence
            </Button>
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GRID: URGENT ALERTS & UNASSIGNED PRIORITY QUEUE */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 cols: Urgent Civic Alerts */}
        <div className="lg:col-span-6 space-y-4">
          <Card variant="glass" className="p-5 space-y-4 border-rose-950 bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-400 animate-pulse" />
                <h2 className="text-base font-bold text-white">Urgent Civic Alerts</h2>
              </div>
              <Link href="/authority/intelligence/escalations">
                <Button size="sm" variant="outline" className="text-xs border-rose-800 text-rose-300 min-h-[44px]">
                  View Alerts
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Alert Counters */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-rose-900/60 text-center">
                <span className="text-[10px] text-rose-400 font-bold block uppercase">Emergency Review</span>
                <span className="text-xl font-black text-rose-300">{commandData?.escalationSummary?.emergencyReviewCount || 0}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-amber-900/60 text-center">
                <span className="text-[10px] text-amber-400 font-bold block uppercase">Urgent</span>
                <span className="text-xl font-black text-amber-300">{commandData?.escalationSummary?.urgentCount || 0}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-center">
                <span className="text-[10px] text-cyan-400 font-bold block uppercase">Watch</span>
                <span className="text-xl font-black text-cyan-300">{commandData?.escalationSummary?.watchCount || 0}</span>
              </div>
            </div>

            {/* Previews List */}
            {commandData?.urgentAlerts?.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-200">Nothing urgent right now.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All monitored incidents are within safe operational limits.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {commandData?.urgentAlerts?.map((alert: any) => (
                  <div
                    key={alert.incidentId}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-rose-400">#{alert.caseId}</span>
                        <Badge variant="cyan">{alert.categoryLabel}</Badge>
                      </div>
                      <PriorityBadge score={alert.priorityScore} />
                    </div>

                    <div className="text-xs text-slate-300 font-medium flex items-center justify-between gap-2">
                      <span className="truncate">{alert.title}</span>
                      <span className="text-[11px] font-bold text-amber-400 shrink-0">Safety Risk: {alert.safetyRiskScore}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="truncate">SLA: <strong className="text-cyan-300">{alert.slaState}</strong></span>
                      <Link href={`/dashboard/incidents/${alert.incidentId}`}>
                        <span className="text-cyan-400 font-semibold hover:underline flex items-center gap-0.5">
                          Inspect <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right 6 cols: Unassigned Priority Queue */}
        <div className="lg:col-span-6 space-y-4">
          <Card variant="glass" className="p-5 space-y-4 border-amber-950 bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Unassigned Priority Cases</h2>
              </div>
              <Badge variant="amber">Critical & High Only</Badge>
            </div>

            {commandData?.unassignedCritical?.length === 0 && commandData?.unassignedHigh?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto" />
                <p className="font-bold text-slate-200 text-sm">All high-priority cases are assigned.</p>
                <p className="text-[11px] text-slate-400">No unassigned critical or high priority incidents pending dispatch.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {[...(commandData?.unassignedCritical || []), ...(commandData?.unassignedHigh || [])].map((inc: any) => (
                  <div
                    key={inc.incidentId}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-amber-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-400">#{inc.caseId}</span>
                        <Badge variant="cyan">{inc.categoryLabel}</Badge>
                      </div>
                      <PriorityBadge score={inc.priorityScore} />
                    </div>

                    <p className="text-xs text-slate-200 font-semibold line-clamp-1">{inc.title}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="truncate">{inc.timeSinceSubmissionText || 'Submitted recently'}</span>
                      <Link href={`/dashboard/incidents/${inc.incidentId}`}>
                        <Button size="sm" variant="cyan" className="text-[11px] h-7 px-2.5 font-bold">
                          Assign
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 2: DEPARTMENT OPERATIONS & SLA HEALTH */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Operations (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card variant="glass" className="p-5 space-y-4 border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Department Operations</h2>
              </div>
              <Link href="/authority/intelligence/departments">
                <Button size="sm" variant="outline" className="text-xs border-cyan-800 text-cyan-300 min-h-[44px]">
                  View Department Operations
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {/* Department Compact Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {commandData?.departments?.map((dept: any) => (
                <div
                  key={dept.departmentId}
                  className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2 hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white truncate max-w-[130px]">{dept.departmentName}</span>
                    <Badge
                      variant={
                        dept.pressureClassification === 'HIGH'
                          ? 'rose'
                          : dept.pressureClassification === 'ELEVATED'
                          ? 'amber'
                          : 'cyan'
                      }
                    >
                      {dept.pressureClassification}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Active Cases</span>
                      <strong className="text-slate-100">{dept.activeCount}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Critical/High</span>
                      <strong className="text-amber-400">{dept.criticalCount + dept.highCount}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400">SLA Risk: <strong className="text-rose-400">{dept.slaAtRiskCount + dept.slaBreachedCount}</strong></span>
                    <span className="text-slate-400">Pressure: <strong className="text-cyan-400">{dept.pressureScore}/100</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* SLA Health Gauges (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card variant="glass" className="p-5 space-y-4 border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">SLA Health</h2>
              </div>
              <Link href="/authority/intelligence/sla">
                <Button size="sm" variant="outline" className="text-xs border-slate-700 min-h-[44px]">
                  View SLA
                </Button>
              </Link>
            </div>

            <div className="space-y-3">
              {/* On Track */}
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> On Track
                </span>
                <span className="text-xl font-extrabold text-emerald-300">{commandData?.slaSummary?.onTrackCount || 0}</span>
              </div>

              {/* At Risk */}
              <div className="bg-slate-950/60 border border-amber-900/50 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> At Risk (Remaining &le; 25%)
                </span>
                <span className="text-xl font-extrabold text-amber-300">{commandData?.slaSummary?.atRiskCount || 0}</span>
              </div>

              {/* Breached */}
              <div className="bg-slate-950/60 border border-rose-900/50 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" /> Breached
                </span>
                <span className="text-xl font-extrabold text-rose-300">{commandData?.slaSummary?.breachedCount || 0}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 space-y-1">
              <span className="font-semibold text-slate-300 block uppercase">SLA Target Targets:</span>
              <p>Critical: 4h • High: 24h • Medium: 72h • Low: 168h</p>
            </div>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 3: INTELLIGENCE MODULES (HOTSPOTS, RECURRING, COMMON CAUSES) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hotspots Summary */}
        <Card variant="glass" className="p-5 space-y-3 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Civic Hotspots</h2>
            </div>
            <Link href="/authority/intelligence/hotspots">
              <Button size="sm" variant="outline" className="text-xs border-slate-700">
                View
              </Button>
            </Link>
          </div>

          {commandData?.hotspotsSummary?.topHotspots?.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 text-center bg-slate-950/40 rounded-xl">
              No significant civic hotspot detected.
            </p>
          ) : (
            <div className="space-y-2">
              {commandData?.hotspotsSummary?.topHotspots?.map((hs: any) => (
                <div key={hs.id} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span>{hs.hotspotType.replace('_', ' ')}</span>
                    <span className="text-amber-400 font-bold">{hs.incidentCount} incidents</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Radius: {hs.radiusMeters}m</span>
                    <Badge variant={hs.hotspotSeverity === 'CRITICAL' ? 'rose' : 'amber'}>{hs.hotspotSeverity}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recurring Problems Summary */}
        <Card variant="glass" className="p-5 space-y-3 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Recurring Problems</h2>
            </div>
            <Link href="/authority/intelligence/recurring">
              <Button size="sm" variant="outline" className="text-xs border-slate-700">
                View
              </Button>
            </Link>
          </div>

          {commandData?.recurringSummary?.topRecurrences?.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 text-center bg-slate-950/40 rounded-xl">
              No recurring pattern detected in the selected period.
            </p>
          ) : (
            <div className="space-y-2">
              {commandData?.recurringSummary?.topRecurrences?.map((rec: any) => (
                <div key={rec.recurrenceId} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span>{rec.categoryLabel}</span>
                    <span className="text-cyan-400 font-bold">{rec.occurrenceCount} occurrences</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{rec.radiusMeters}m area</span>
                    <Badge variant="cyan">{rec.recurrenceStrength}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Possible Common Issues (Root Cause Signals) */}
        <Card variant="glass" className="p-5 space-y-3 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Possible Common Issues</h2>
            </div>
            <Link href="/authority/intelligence/root-causes">
              <Button size="sm" variant="outline" className="text-xs border-cyan-800 text-cyan-300">
                Review Signals
              </Button>
            </Link>
          </div>

          {commandData?.rootCausesSummary?.topSignals?.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 text-center bg-slate-950/40 rounded-xl">
              No strong related-incident signals detected.
            </p>
          ) : (
            <div className="space-y-2">
              {commandData?.rootCausesSummary?.topSignals?.map((sig: any) => (
                <div key={sig.signalId} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span>{sig.categoryLabel}</span>
                    <span className="text-cyan-400 font-bold">Signal: {sig.signalScore}/100</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{sig.incidentCount} related incidents</span>
                    <span className="text-amber-400 font-medium">Needs Field Verification</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LEVEL 4: CIVIC ACTIVITY TREND & MAP PREVIEW */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Civic Activity Chart (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <Card variant="glass" className="p-5 space-y-3 border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">7-Day Civic Activity</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">Historical Telemetry</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center py-2 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Created</span>
                <span className="text-xl font-bold text-slate-100">{commandData?.activityTrend?.metrics?.totalIncidents || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Resolved</span>
                <span className="text-xl font-bold text-emerald-400">{commandData?.activityTrend?.metrics?.resolvedIncidents || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Verified</span>
                <span className="text-xl font-bold text-cyan-400">{commandData?.activityTrend?.metrics?.verifiedIncidents || 0}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Historical activity telemetry aggregated across all municipal sectors for the selected lookback window.
            </p>
          </Card>
        </div>

        {/* Map Preview (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <Card variant="glass" className="p-5 space-y-3 border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Spatial Operations Map</h2>
              </div>
              <Link href="/authority/incidents">
                <Button size="sm" variant="cyan" className="text-xs font-bold min-h-[44px]">
                  Open Full Map
                </Button>
              </Link>
            </div>

            <div className="h-32 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-4 text-center space-y-1">
              <MapPin className="h-6 w-6 text-cyan-400 animate-bounce" />
              <span className="text-xs font-semibold text-slate-200">Interactive Geographic Triage Active</span>
              <span className="text-[11px] text-slate-400">
                Centroid coordinates & active incident pins ready for operational visualization.
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* INCIDENTS TABLE / FILTER CONTROL BAR */}
      {/* ------------------------------------------------------------- */}
      <Card className="p-4 bg-slate-900/90 border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Master Incident Triage Feed</h2>
          <span className="text-xs text-slate-400">Filtered Live Operational Data</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Case ID, summary, or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-slate-950 text-xs"
            />
          </div>

          {/* Priority Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase">Priority Tier</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical (80–100)</option>
              <option value="HIGH">High (60–79)</option>
              <option value="MEDIUM">Medium (40–59)</option>
              <option value="LOW">Low (0–39)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase">Lifecycle Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="AI_ANALYSED">AI Analysed</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="VERIFIED">Verified</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">All Categories</option>
              <option value="ROAD_POTHOLE">Road / Pothole</option>
              <option value="GARBAGE_OVERFLOW">Garbage / Waste</option>
              <option value="BROKEN_STREETLIGHT">Streetlight / Electrical</option>
              <option value="WATER_LEAKAGE">Water Leakage</option>
              <option value="DRAINAGE_BLOCKAGE">Drainage / Sewage</option>
              <option value="TRAFFIC_SIGNAL_DAMAGED">Traffic Signal</option>
              <option value="PUBLIC_INFRA_DAMAGE">Public Infrastructure</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Incident List Table (Desktop) & Stacked Cards (Mobile) */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <LoadingState message="Querying live incident triage feed..." />
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No active civic incidents matched your filter criteria.
          </div>
        ) : (
          <>
            {/* Mobile View: Stacked Incident Cards */}
            <div className="block md:hidden divide-y divide-slate-800/80">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-4 space-y-3 bg-slate-900/60 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-cyan-400">{incident.case_id}</span>
                      {incident.is_duplicate_flagged && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded font-sans">
                          <GitMerge className="h-3 w-3" /> Duplicate
                        </span>
                      )}
                    </div>
                    <PriorityBadge score={incident.priority_score} />
                  </div>

                  <div className="space-y-1">
                    <span className="font-semibold text-slate-200 text-sm">{incident.category.replace('_', ' ')}</span>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{incident.summary}</p>
                    <p className="text-[11px] text-slate-500 truncate">{incident.address}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={incident.status} />
                      <span className="text-[11px] text-slate-400 font-medium">
                        {incident.departments ? incident.departments.name : 'Unassigned'}
                      </span>
                    </div>

                    <Link href={`/dashboard/incidents/${incident.id}`}>
                      <Button size="sm" variant="outline" className="text-xs gap-1 border-slate-700 hover:border-cyan-500 min-h-[44px] px-3">
                        Inspect
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Full Data Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Case ID</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Category & Summary</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Reports</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {incidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-200">
                        <div className="flex flex-col gap-1">
                          <span className="text-cyan-400">{incident.case_id}</span>
                          {incident.is_duplicate_flagged && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded font-sans">
                              <GitMerge className="h-3 w-3" /> Duplicate Warning
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <PriorityBadge score={incident.priority_score} />
                      </td>
                      <td className="p-4 max-w-md">
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-200">{incident.category.replace('_', ' ')}</span>
                          <p className="text-slate-400 line-clamp-2 leading-relaxed">{incident.summary}</p>
                          <p className="text-[10px] text-slate-500 truncate">{incident.address}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="p-4 text-slate-400 font-medium">
                        {incident.departments ? incident.departments.name : 'Unassigned'}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {incident.report_count || 1} report(s)
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link href={`/dashboard/incidents/${incident.id}`}>
                          <Button size="sm" variant="outline" className="text-xs gap-1 border-slate-700 hover:border-cyan-500 min-h-[44px]">
                            Inspect
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
