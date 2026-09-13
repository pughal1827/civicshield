'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Shield,
  Layers,
  MapPin,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Filter,
  CheckCircle2,
  Lock,
  Clock,
  UserCheck,
  ChevronRight,
  Flame,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { LoadingState } from '@/components/ui/loading-state';
import {
  DepartmentOperationsResponse,
  DepartmentWorkloadDetail,
  UnassignedIncidentItem,
} from '@/lib/intelligence/types';

export default function AuthorityDepartmentOperationsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DepartmentOperationsResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
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

  // 2. Fetch Department Operations Data
  const fetchDeptData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (departmentFilter !== 'ALL') params.append('departmentId', departmentFilter);

      const res = await fetch(`/api/authority/intelligence/departments?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setAuthorized(false);
          return;
        }
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to load department operations');
      }

      const json: DepartmentOperationsResponse = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('[Department UI] Error:', err);
      setErrorMsg(err.message || 'Unable to load department operations intelligence right now. Database unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchDeptData();
    }
  }, [authorized, departmentFilter]);

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
            Only authorized municipal personnel can access Department Operations Intelligence.
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
            <span className="text-xs text-slate-400">• Operational Workload & Pressure Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-cyan-400" />
            Department Operations & Workload
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time capacity tracking, unassigned critical queues, SLA risk monitoring, and deterministic department pressure analytics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/authority/intelligence">
            <Button size="sm" variant="outline">Hotspots</Button>
          </Link>
          <Link href="/authority/intelligence/recurring">
            <Button size="sm" variant="outline">Recurring</Button>
          </Link>
          <Link href="/authority/intelligence/sla">
            <Button size="sm" variant="outline">SLA Risk</Button>
          </Link>
          <Button size="sm" variant="cyan" onClick={fetchDeptData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

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

      {/* SECTION 1: Unassigned Critical & High Priority Queue */}
      {data && (data.totalUnassignedCritical > 0 || data.totalUnassignedHigh > 0) && (
        <Card variant="glass" className="p-5 border-rose-900/60 bg-rose-950/20 space-y-4">
          <div className="flex items-center justify-between border-b border-rose-900/40 pb-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-rose-400 animate-pulse" />
              <h2 className="text-base font-extrabold text-white">🚨 Unassigned Critical & High Priority Queue</h2>
            </div>
            <span className="text-xs text-rose-300 font-semibold">
              {data.totalUnassignedCritical} Critical • {data.totalUnassignedHigh} High Priority
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...data.unassignedCritical, ...data.unassignedHigh].map((item) => (
              <div
                key={item.incidentId}
                className="bg-slate-900/80 border border-rose-900/50 p-3.5 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-extrabold text-cyan-400">{item.caseId}</span>
                    <PriorityBadge score={item.priorityScore} />
                    <span className="text-xs text-slate-300 font-medium">{item.categoryLabel}</span>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <Clock className="h-3 w-3 text-rose-400" />
                    <span>Submitted {item.timeSinceSubmissionText}</span>
                  </div>
                </div>

                <Link href={`/authority/incidents/${item.incidentId}`}>
                  <Button size="sm" variant="cyan" className="shrink-0 font-bold text-xs">
                    Assign <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SECTION 2: Filter Bar & Department Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Department Capacity & Pressure Cards
          </h2>
          <div className="w-48">
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
              <option value="dept_traffic">Traffic Management</option>
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingState message="Calculating real-time department operational metrics and pressure scores..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.departments.map((dept) => {
              const p = dept.pressure;
              const isHigh = p.classification === 'HIGH';
              const isElevated = p.classification === 'ELEVATED';

              return (
                <Card
                  key={dept.departmentId}
                  variant="glass"
                  className={`p-5 space-y-4 border ${
                    isHigh
                      ? 'border-rose-500/60 bg-rose-950/20'
                      : isElevated
                      ? 'border-amber-500/60 bg-amber-950/20'
                      : 'border-slate-800 bg-slate-900/50'
                  }`}
                >
                  {/* Department Header & Pressure Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-[11px] font-mono text-cyan-400 font-semibold">{dept.departmentCode}</div>
                      <h3 className="text-base font-bold text-white">{dept.departmentName}</h3>
                    </div>

                    <div className="text-right">
                      <Badge
                        variant={
                          isHigh ? 'rose' : isElevated ? 'amber' : p.classification === 'MODERATE' ? 'amber' : 'emerald'
                        }
                        className="font-bold"
                      >
                        {p.classification} PRESSURE
                      </Badge>
                      <div className="text-lg font-black text-white mt-1">
                        {p.pressureScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[11px]">Active Incidents</span>
                      <span className="text-base font-bold text-amber-400">{dept.activeCount}</span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[11px]">Critical / High</span>
                      <span className="text-base font-bold text-rose-400">{dept.criticalCount + dept.highCount}</span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[11px]">SLA At-Risk / Breached</span>
                      <span className="text-base font-bold text-rose-300">{dept.slaAtRiskCount + dept.slaBreachedCount}</span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[11px]">Recurring Locations</span>
                      <span className="text-base font-bold text-cyan-400">{dept.recurringProblemCount}</span>
                    </div>
                  </div>

                  {/* Resolution & Verification Metrics */}
                  <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Average Resolution Time:</span>
                      <strong className="text-slate-200">
                        {dept.resolution.averageResolutionHours !== null
                          ? `${dept.resolution.averageResolutionHours} hours`
                          : 'No data'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Citizen Verification Rate:</span>
                      <strong className="text-emerald-400">
                        {dept.verification.verificationRate !== null
                          ? `${dept.verification.verificationRate}%`
                          : 'No data'}
                      </strong>
                    </div>
                  </div>

                  {/* Pressure Reasons & Bottleneck Warnings */}
                  <div className="space-y-1 text-xs">
                    <span className="text-slate-400 font-semibold text-[11px] block">Pressure Drivers:</span>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5 text-[11px]">
                      {p.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>

                    {p.hasBottleneck && (
                      <div className="mt-2 p-2 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-300 text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <span>{p.bottleneckExplanation}</span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
