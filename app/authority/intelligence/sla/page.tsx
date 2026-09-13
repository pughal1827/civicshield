'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  Shield,
  Layers,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Filter,
  Lock,
  Building2,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/ui/loading-state';
import { IncidentSLAItem, SLAResponse, SLAStatus } from '@/lib/intelligence/types';

export default function AuthoritySLAMonitoringPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SLAResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [slaStatusFilter, setSlaStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  // 1. Verify Authority Clearance
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && (json.data?.user?.role === 'AUTHORITY' || json.data?.user?.role === 'ADMIN')) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      })
      .catch(() => setAuthorized(false));
  }, []);

  // 2. Fetch SLA Monitoring Data
  const fetchSLA = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (slaStatusFilter !== 'ALL') params.append('slaStatus', slaStatusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (departmentFilter !== 'ALL') params.append('departmentId', departmentFilter);

      const res = await fetch(`/api/authority/intelligence/sla?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setAuthorized(false);
          return;
        }
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to load SLA monitoring');
      }

      const json: SLAResponse = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('[SLA UI] Error:', err);
      setErrorMsg(err.message || 'Unable to load SLA monitoring right now. Database unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchSLA();
    }
  }, [authorized, slaStatusFilter, priorityFilter, departmentFilter]);

  // Helper function to format seconds into readable HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
        <LoadingState message="Verifying authority security credentials..." />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Card variant="glass" className="w-full max-w-md p-6 text-center space-y-4 border-rose-900/60 bg-rose-950/20">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white">403 Forbidden — Access Denied</h1>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            Only authorized municipal officers can access the SLA Monitoring Dashboard.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/authority/login">
              <Button size="md" variant="cyan" className="w-full font-bold">
                Go to Authority Login
              </Button>
            </Link>
            <Link href="/">
              <Button size="md" variant="outline" className="w-full border-slate-700">
                Back to Public Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cyan">Civic Intelligence Platform</Badge>
            <span className="text-xs text-slate-400">• Real-Time Operational Resolution Targets</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <Clock className="h-7 w-7 text-cyan-400" />
            SLA Monitoring & Risk Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor resolution deadlines against priority SLA targets (Critical: 4h, High: 24h, Medium: 72h, Low: 168h).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/authority">
            <Button size="sm" variant="outline">
              Operations Dashboard
            </Button>
          </Link>
          <Button size="sm" variant="cyan" onClick={fetchSLA} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh SLA
          </Button>
        </div>
      </div>

      {/* SLA Summary Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* On Track */}
        <Card variant="glass" className="p-4 space-y-1 border-emerald-900/50 bg-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> 🟢 On Track
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-300">
            {data ? data.summary.onTrack : '...'}
          </p>
          <span className="text-[11px] text-slate-400 block pt-0.5">Remaining SLA time &gt; 25%</span>
        </Card>

        {/* At Risk */}
        <Card variant="glass" className="p-4 space-y-1 border-amber-900/50 bg-amber-950/20">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> 🟠 At Risk
            </span>
          </div>
          <p className="text-2xl font-black text-amber-300">
            {data ? data.summary.atRisk : '...'}
          </p>
          <span className="text-[11px] text-slate-400 block pt-0.5">Remaining SLA time ≤ 25%</span>
        </Card>

        {/* Breached */}
        <Card variant="glass" className="p-4 space-y-1 border-rose-900/60 bg-rose-950/25">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <AlertOctagon className="h-4 w-4" /> 🔴 Breached
            </span>
          </div>
          <p className="text-2xl font-black text-rose-300">
            {data ? data.summary.breached : '...'}
          </p>
          <span className="text-[11px] text-slate-400 block pt-0.5">Target SLA deadline passed</span>
        </Card>

        {/* Total Tracked */}
        <Card variant="glass" className="p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-cyan-400" /> Total Tracked
            </span>
          </div>
          <p className="text-2xl font-black text-slate-100">
            {data ? data.summary.totalTracked : '...'}
          </p>
          <span className="text-[11px] text-slate-400 block pt-0.5">Active master incidents</span>
        </Card>
      </div>

      {/* Filter Control Bar */}
      <Card variant="glass" className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
          <Filter className="h-4 w-4" />
          Filter SLA Risk Queue
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* SLA Status Filter */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">SLA Status</label>
            <select
              value={slaStatusFilter}
              onChange={(e) => setSlaStatusFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All SLA States</option>
              <option value="BREACHED">🔴 Breached Only</option>
              <option value="AT_RISK">🟠 At Risk Only</option>
              <option value="ON_TRACK">🟢 On Track Only</option>
              <option value="NOT_APPLICABLE">⚪ Closed / Verified</option>
            </select>
          </div>

          {/* Priority Tier Filter */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Priority Tier</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical (4h Target)</option>
              <option value="HIGH">High (24h Target)</option>
              <option value="MEDIUM">Medium (72h Target)</option>
              <option value="LOW">Low (168h Target)</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Departments</option>
              <option value="dept_roads">Road Maintenance</option>
              <option value="dept_sanitation">Sanitation Department</option>
              <option value="dept_electrical">Electrical Works</option>
              <option value="dept_water">Water Resources</option>
              <option value="dept_drainage">Drainage Department</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Database Error Banner */}
      {errorMsg && (
        <Card variant="glass" className="p-4 border-rose-900/60 bg-rose-950/20 text-rose-200 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">{errorMsg}</p>
            <p className="text-rose-300/80 mt-0.5">Please check backend connectivity or refresh.</p>
          </div>
        </Card>
      )}

      {/* Main SLA Queue Table */}
      {loading ? (
        <LoadingState message="Calculating real-time resolution SLA deadlines..." />
      ) : data?.incidents.length === 0 ? (
        <Card variant="glass" className="p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-white">No SLA risks detected.</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All active incidents are currently within their response targets.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold uppercase tracking-wider text-slate-300">
              SLA Risk Queue ({data?.incidents.length} Records)
            </span>
            <span>Sorted by SLA urgency (Breached & At-Risk first)</span>
          </div>

          <div className="space-y-3">
            {data?.incidents.map((item) => {
              const isBreached = item.slaStatus === 'BREACHED';
              const isAtRisk = item.slaStatus === 'AT_RISK';
              const isNotApplicable = item.slaStatus === 'NOT_APPLICABLE';

              return (
                <Card
                  key={item.incidentId}
                  variant="glass"
                  className={`p-4 transition-all border ${
                    isBreached
                      ? 'border-rose-500/60 bg-rose-950/20'
                      : isAtRisk
                      ? 'border-amber-500/60 bg-amber-950/20'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">{item.caseId}</span>
                        <PriorityBadge score={item.priorityScore} />
                        <StatusBadge status={item.status as any} />
                        <span className="text-xs text-slate-400">• {item.categoryLabel}</span>
                      </div>

                      <h3 className="text-sm font-bold text-white">{item.title}</h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-cyan-400" />
                          {item.departmentName || 'Unassigned'}
                        </span>
                        <span>Target: {item.targetHours} hours</span>
                        <span>SLA Start: {new Date(item.slaStart).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Right SLA Progress & Status Badge */}
                    <div className="w-full md:w-64 shrink-0 space-y-2 text-right">
                      <div className="flex items-center justify-between md:justify-end gap-2">
                        {isBreached ? (
                          <Badge variant="rose" className="flex items-center gap-1 font-bold">
                            <AlertOctagon className="h-3.5 w-3.5" /> 🔴 BREACHED
                          </Badge>
                        ) : isAtRisk ? (
                          <Badge variant="amber" className="flex items-center gap-1 font-bold">
                            <AlertTriangle className="h-3.5 w-3.5" /> 🟠 AT RISK
                          </Badge>
                        ) : isNotApplicable ? (
                          <Badge variant="slate" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> ⚪ COMPLETED
                          </Badge>
                        ) : (
                          <Badge variant="emerald" className="flex items-center gap-1 font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 🟢 ON TRACK
                          </Badge>
                        )}


                        <span className="text-xs font-bold text-slate-200">
                          {isBreached
                            ? 'Overdue'
                            : isNotApplicable
                            ? 'Closed'
                            : `${formatTime(item.remainingSeconds)} left`}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all ${
                              isBreached
                                ? 'bg-rose-500'
                                : isAtRisk
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Elapsed: {formatTime(item.elapsedSeconds)}</span>
                          <span>{item.progressPercent}% SLA time elapsed</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
