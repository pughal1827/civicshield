'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RotateCcw,
  Shield,
  Layers,
  MapPin,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Filter,
  CheckCircle2,
  Lock,
  Calendar,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { RecurrenceItem, RecurringResponse } from '@/lib/intelligence/types';

export default function AuthorityRecurringIntelligencePage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RecurringResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedRecurrence, setSelectedRecurrence] = useState<RecurrenceItem | null>(null);

  // Filters
  const [days, setDays] = useState(180);
  const [radius, setRadius] = useState(250);
  const [minOccurrences, setMinOccurrences] = useState(3);
  const [categoryFilter, setCategoryFilter] = useState('');

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

  // 2. Fetch Recurring Problems
  const fetchRecurring = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.append('days', days.toString());
      params.append('radius', radius.toString());
      params.append('minOccurrences', minOccurrences.toString());
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await fetch(`/api/authority/intelligence/recurring?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setAuthorized(false);
          return;
        }
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to load recurring problems');
      }

      const json: RecurringResponse = await res.json();
      setData(json);
      if (json.recurrences && json.recurrences.length > 0) {
        setSelectedRecurrence(json.recurrences[0]);
      } else {
        setSelectedRecurrence(null);
      }
    } catch (err: any) {
      console.error('[Recurring Intelligence UI] Error:', err);
      setErrorMsg(err.message || 'Unable to load recurring civic problems right now. Database unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchRecurring();
    }
  }, [authorized, days, radius, minOccurrences, categoryFilter]);

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
            Only authorized municipal officers can access Recurring Civic Problem Intelligence.
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
            <span className="text-xs text-slate-400">• Spatial-Temporal Lookback Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <RotateCcw className="h-7 w-7 text-cyan-400" />
            Recurring Civic Problems
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Identify locations where similar civic issues repeatedly appear over historical time windows to address underlying infrastructure root causes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/authority/intelligence">
            <Button size="sm" variant="outline">
              Hotspot Intelligence
            </Button>
          </Link>
          <Link href="/authority/intelligence/sla">
            <Button size="sm" variant="outline">
              SLA Monitoring
            </Button>
          </Link>
          <Button size="sm" variant="cyan" onClick={fetchRecurring} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <Card variant="glass" className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
          <Filter className="h-4 w-4" />
          Recurrence Search Parameters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {/* Lookback Window */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Lookback Window</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={180}>Last 180 Days (6 Months)</option>
              <option value={365}>Last 365 Days (1 Year)</option>
            </select>
          </div>

          {/* Spatial Radius */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Spatial Radius (Meters)</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={100}>100 meters</option>
              <option value={250}>250 meters (Default)</option>
              <option value={500}>500 meters</option>
              <option value={1000}>1,000 meters</option>
            </select>
          </div>

          {/* Min Occurrences */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Min Historical Occurrences</label>
            <select
              value={minOccurrences}
              onChange={(e) => setMinOccurrences(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={2}>≥ 2 Occurrences</option>
              <option value={3}>≥ 3 Occurrences (Default)</option>
              <option value={5}>≥ 5 Occurrences</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Filter Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Civic Categories</option>
              <option value="ROAD_POTHOLE">Roads & Potholes</option>
              <option value="GARBAGE">Garbage & Sanitation</option>
              <option value="STREETLIGHT">Street Lighting</option>
              <option value="WATER_LEAKAGE">Water Leakage</option>
              <option value="DRAINAGE_BLOCKAGE">Drainage Blockage</option>
              <option value="TRAFFIC_SIGNAL">Traffic Signals</option>
              <option value="PUBLIC_INFRA_DAMAGE">Public Infrastructure</option>
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
            <p className="text-rose-300/80 mt-0.5">Please verify database connectivity or refresh.</p>
          </div>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <LoadingState message="Analyzing historical incident logs and computing spatial recurrence..." />
      ) : data?.recurrences.length === 0 ? (
        <Card variant="glass" className="p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-white">No recurring civic problems detected for the selected period.</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No repeated same-category occurrences meeting the threshold of {minOccurrences} incidents within {radius} meters were found in the last {days} days.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recurrence Cards List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Recurring Clusters ({data?.totalRecurringProblems || 0})
              </h2>
              <span className="text-xs text-slate-400">
                {data?.totalAffectedIncidents} Historical Incidents Total
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {data?.recurrences.map((item) => {
                const isSelected = selectedRecurrence?.recurrenceId === item.recurrenceId;
                return (
                  <Card
                    key={item.recurrenceId}
                    variant="glass"
                    onClick={() => setSelectedRecurrence(item)}
                    className={`p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-500/40'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              item.recurrenceStrength === 'STRONG'
                                ? 'rose'
                                : item.recurrenceStrength === 'MODERATE'
                                ? 'amber'
                                : 'cyan'
                            }
                          >
                            {item.recurrenceStrength} STRENGTH
                          </Badge>
                          <span className="text-xs font-semibold text-slate-200">
                            {item.categoryLabel}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                          <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span>
                            Centroid: {item.center.latitude.toFixed(4)}, {item.center.longitude.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-extrabold text-cyan-400">
                          {item.occurrenceCount} <span className="text-xs font-normal text-slate-400">occurrences</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Last: {item.daysSinceLastOccurrence}d ago
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Avg interval: {item.averageDaysBetweenOccurrences} days</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Radius: {item.radiusMeters}m</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Selected Recurrence Detail Panel (7 cols) */}
          <div className="lg:col-span-7">
            {selectedRecurrence ? (
              <Card variant="glass" className="p-6 space-y-6 border-cyan-500/30 bg-slate-900/60">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-5 w-5 text-cyan-400" />
                      <h2 className="text-lg font-bold text-white">Possible Recurring Civic Problem</h2>
                      <Badge variant="cyan">{selectedRecurrence.categoryLabel}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Repeated incidents detected within {selectedRecurrence.radiusMeters}m over the last {days} days.
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                    Strength: <strong className="text-cyan-400">{selectedRecurrence.recurrenceStrength}</strong>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Total Occurrences</span>
                    <span className="text-xl font-black text-cyan-400">{selectedRecurrence.occurrenceCount}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Active Now</span>
                    <span className="text-xl font-black text-amber-400">{selectedRecurrence.activeOccurrenceCount}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Resolved / Verified</span>
                    <span className="text-xl font-black text-emerald-400">
                      {selectedRecurrence.resolvedOccurrenceCount + selectedRecurrence.verifiedOccurrenceCount}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Average Interval</span>
                    <span className="text-xl font-black text-slate-200">{selectedRecurrence.averageDaysBetweenOccurrences}d</span>
                  </div>
                </div>

                {/* Timeline Breakdown */}
                <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-cyan-400" />
                    Historical Recurrence Timeline
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">First Reported Occurrence:</span>
                      <strong className="text-slate-200">
                        {new Date(selectedRecurrence.firstOccurrence).toLocaleDateString()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Most Recent Occurrence:</span>
                      <strong className="text-slate-200">
                        {new Date(selectedRecurrence.lastOccurrence).toLocaleDateString()} ({selectedRecurrence.daysSinceLastOccurrence} days ago)
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Period Trend */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    Lookback Period Trend
                  </div>
                  <p className="text-xs text-cyan-400/90 font-medium pt-1">
                    {selectedRecurrence.trend.explanation}
                  </p>
                </div>

                {/* Disclaimer */}
                <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
                  <strong>Analytical Note:</strong> Recurrence signals reflect deterministic spatial-temporal patterns across historical incident master records. They represent potential infrastructure degradation rather than single-incident duplicate submissions.
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
