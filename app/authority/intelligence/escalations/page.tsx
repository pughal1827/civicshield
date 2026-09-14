'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Lock,
  RefreshCw,
  Filter,
  ChevronRight,
  Clock,
  Users,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { EscalationAlertItem, EscalationResponse, EscalationLevel } from '@/lib/intelligence/types';

export default function AuthorityEscalationsPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EscalationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Filters
  const [days, setDays] = useState(7);
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');

  // 1. Check Authority Auth
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

  // 2. Fetch Escalation Alerts
  const fetchEscalations = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.append('days', days.toString());
      if (levelFilter !== 'ALL') params.append('level', levelFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await fetch(`/api/authority/intelligence/escalations?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setAuthorized(false);
          return;
        }
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to load escalation alerts');
      }

      const json: EscalationResponse = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('[Escalations UI] Error loading alerts:', err);
      setErrorMsg(err.message || 'Unable to load urgent civic alerts right now. Database unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchEscalations();
    }
  }, [authorized, days, levelFilter, categoryFilter]);

  // Handle Mark Reviewed
  const handleMarkReviewed = async (incidentId: string) => {
    setReviewingId(incidentId);
    setActionSuccess(null);
    try {
      const res = await fetch('/api/authority/intelligence/escalations/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, reviewNotes: 'Authority review completed via Urgent Alerts portal.' }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to record review audit log');
      }
      setActionSuccess(`Escalation review logged successfully for incident ${incidentId.substring(0, 8)}.`);
      fetchEscalations();
    } catch (err: any) {
      alert(err.message || 'Failed to mark escalation reviewed.');
    } finally {
      setReviewingId(null);
    }
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
            Only authorized municipal officers can access the Emergency Escalation Engine.
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

  // Level Badge Renderer using text + icon + status
  const renderLevelBadge = (level: EscalationLevel) => {
    switch (level) {
      case 'EMERGENCY_REVIEW':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-600 text-rose-300 font-bold text-xs">
            <ShieldAlert className="h-4 w-4 text-rose-400 animate-pulse" />
            <span>[EMERGENCY REVIEW] Urgent Action Required</span>
          </div>
        );
      case 'URGENT':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-600 text-amber-300 font-bold text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>[URGENT] High Priority Alert</span>
          </div>
        );
      case 'WATCH':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-600 text-cyan-300 font-semibold text-xs">
            <Eye className="h-4 w-4 text-cyan-400" />
            <span>[WATCH] Operational Monitoring</span>
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-xs">
            <span>Standard Monitoring</span>
          </div>
        );
    }
  };

  const unreviewedCount = data?.alerts ? data.alerts.filter((a) => !a.isReviewed).length : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="rose">Emergency Escalation Engine</Badge>
            <span className="text-xs text-slate-400">• Deterministic Urgent Alerts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-rose-500 animate-pulse" />
            Urgent Civic Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Identify critical civic issues, SLA breaches, and high-risk safety escalations requiring immediate municipal review.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/authority">
            <Button size="sm" variant="outline">
              Dashboard
            </Button>
          </Link>
          <Link href="/authority/intelligence/root-causes">
            <Button size="sm" variant="outline" className="border-cyan-800 text-cyan-300">
              Possible Common Issues
            </Button>
          </Link>
          <Button size="sm" variant="cyan" onClick={fetchEscalations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Alerts
          </Button>
        </div>
      </div>

      {/* Summary Level Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card
          variant="glass"
          onClick={() => setLevelFilter('EMERGENCY_REVIEW')}
          className={`p-4 cursor-pointer transition-all border ${
            levelFilter === 'EMERGENCY_REVIEW' ? 'border-rose-500 ring-1 ring-rose-500/50 bg-rose-950/30' : 'border-rose-950 bg-rose-950/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" /> Emergency Review
            </span>
            <span className="text-2xl font-black text-rose-400">
              {data?.summary.emergencyReviewCount || 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Highest priority & critical safety risks</p>
        </Card>

        <Card
          variant="glass"
          onClick={() => setLevelFilter('URGENT')}
          className={`p-4 cursor-pointer transition-all border ${
            levelFilter === 'URGENT' ? 'border-amber-500 ring-1 ring-amber-500/50 bg-amber-950/30' : 'border-amber-950 bg-amber-950/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Urgent Alerts
            </span>
            <span className="text-2xl font-black text-amber-400">
              {data?.summary.urgentCount || 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">High priority & SLA risks</p>
        </Card>

        <Card
          variant="glass"
          onClick={() => setLevelFilter('WATCH')}
          className={`p-4 cursor-pointer transition-all border ${
            levelFilter === 'WATCH' ? 'border-cyan-500 ring-1 ring-cyan-500/50 bg-cyan-950/30' : 'border-slate-800 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Eye className="h-4 w-4" /> Watch List
            </span>
            <span className="text-2xl font-black text-cyan-400">
              {data?.summary.watchCount || 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Medium priority monitoring</p>
        </Card>

        <Card
          variant="glass"
          onClick={() => setLevelFilter('ALL')}
          className={`p-4 cursor-pointer transition-all border ${
            levelFilter === 'ALL' ? 'border-slate-500 bg-slate-900' : 'border-slate-800 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Total Escalations</span>
            <span className="text-2xl font-black text-slate-100">
              {data?.summary.totalAlerts || 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {unreviewedCount} requiring review
          </p>
        </Card>
      </div>

      {/* Action Success Toast */}
      {actionSuccess && (
        <Card variant="glass" className="p-3 bg-emerald-950/30 border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-white text-xs">
            Dismiss
          </button>
        </Card>
      )}

      {/* Filter Parameters */}
      <Card variant="glass" className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider">
            <Filter className="h-4 w-4" />
            Escalation Filters
          </div>
          {Boolean(data?.summary.emergencyReviewCount && data.summary.emergencyReviewCount > 0) && (
            <span className="text-xs font-bold text-rose-400 animate-pulse flex items-center gap-1">
              <ShieldAlert className="h-4 w-4" /> Immediate Authority Review Needed
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Level Filter */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Escalation Tier</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Escalation Tiers</option>
              <option value="EMERGENCY_REVIEW">[EMERGENCY REVIEW] Emergency Review</option>
              <option value="URGENT">[URGENT] Urgent Alerts</option>
              <option value="WATCH">[WATCH] Watch List</option>
            </select>
          </div>

          {/* Time Window */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Lookback Period</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value={1}>Last 24 Hours</option>
              <option value={3}>Last 3 Days</option>
              <option value={7}>Last 7 Days (Default)</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Filter Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="">All Categories</option>
              <option value="ROAD_POTHOLE">Roads & Potholes</option>
              <option value="GARBAGE_OVERFLOW">Garbage & Sanitation</option>
              <option value="BROKEN_STREETLIGHT">Street Lighting</option>
              <option value="WATER_LEAKAGE">Water Leakage</option>
              <option value="DRAINAGE_BLOCKAGE">Drainage / Sewage</option>
              <option value="TRAFFIC_SIGNAL_DAMAGED">Traffic Signals</option>
              <option value="PUBLIC_INFRA_DAMAGE">Public Infrastructure</option>
            </select>
          </div>
        </div>
      </Card>

      {/* DB Failure Error */}
      {errorMsg && (
        <Card variant="glass" className="p-4 border-rose-900/60 bg-rose-950/20 text-rose-200 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">{errorMsg}</p>
            <p className="text-rose-300/80 mt-0.5">Please check system backend connectivity or refresh after database recovery.</p>
          </div>
        </Card>
      )}

      {/* Escalation Alerts Feed */}
      {loading ? (
        <LoadingState message="Evaluating priority, safety risks, SLA statuses, and escalation criteria..." />
      ) : data?.alerts.length === 0 ? (
        <Card variant="glass" className="p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-white">No active urgent alerts matching criteria.</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All evaluated incidents in the last {days} days are within standard operational parameters.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Urgent Escalation Feed ({data?.alerts.length || 0})
            </h2>
            <span className="text-xs text-slate-400">
              Ranked deterministically by escalation severity
            </span>
          </div>

          <div className="space-y-4">
            {data?.alerts.map((alert) => (
              <Card
                key={alert.incidentId}
                variant="glass"
                className={`p-6 space-y-4 border transition-all ${
                  alert.escalationLevel === 'EMERGENCY_REVIEW'
                    ? 'border-rose-500/50 bg-rose-950/20'
                    : alert.escalationLevel === 'URGENT'
                    ? 'border-amber-500/50 bg-amber-950/20'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {renderLevelBadge(alert.escalationLevel)}
                    <span className="font-mono font-extrabold text-sm text-white">
                      Case #{alert.caseId}
                    </span>
                    <Badge variant="cyan">{alert.categoryLabel}</Badge>
                    {alert.isReviewed && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded font-semibold">
                        <CheckSquare className="h-3 w-3" /> Reviewed by Authority
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge score={alert.priorityScore} />
                  </div>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Priority Score</span>
                    <span className="text-lg font-extrabold text-rose-400">{alert.priorityScore} / 100</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Safety Risk Factor</span>
                    <span className="text-lg font-extrabold text-amber-400">{alert.safetyRiskScore} / 100</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                      <Users className="h-3 w-3 text-cyan-400" /> Citizen Reports
                    </span>
                    <span className="text-lg font-extrabold text-cyan-400">{alert.reportCount} submissions</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                      <Clock className="h-3 w-3 text-cyan-400" /> SLA Status
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        alert.slaState === 'BREACHED'
                          ? 'text-rose-400'
                          : alert.slaState === 'AT_RISK'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {alert.slaState}
                    </span>
                  </div>
                </div>

                {/* Why Escalated (Evidence Reasons) */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Escalation Evidence & Triggers:
                  </span>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {alert.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommended Next Action & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block font-semibold uppercase">
                      Recommended Action:
                    </span>
                    <p className="text-xs font-semibold text-cyan-300">
                      &quot;{alert.recommendedAction}&quot;
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Link href={`/authority/complaints/${alert.incidentId}`}>
                      <Button size="sm" variant="outline" className="text-xs border-slate-700 hover:border-cyan-500">
                        Open Incident
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>

                    {!alert.isReviewed ? (
                      <Button
                        size="sm"
                        variant="cyan"
                        onClick={() => handleMarkReviewed(alert.incidentId)}
                        disabled={reviewingId === alert.incidentId}
                        className="font-bold text-xs"
                      >
                        {reviewingId === alert.incidentId ? (
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Mark Reviewed
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="text-xs text-slate-500 border-slate-800">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                        Reviewed
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
