'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  MapPin,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Filter,
  CheckCircle2,
  Lock,
  Sparkles,
  HelpCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { RootCauseSignalItem, RootCauseResponse } from '@/lib/intelligence/types';

export default function AuthorityRootCausesPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RootCauseResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<RootCauseSignalItem | null>(null);

  // Filter states
  const [days, setDays] = useState(7);
  const [radius, setRadius] = useState(500);
  const [minIncidents, setMinIncidents] = useState(2);
  const [minSignalScore, setMinSignalScore] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');

  // 1. Check Authority Authentication
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

  // 2. Fetch Root-Cause Signals
  const fetchSignals = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.append('days', days.toString());
      params.append('radius', radius.toString());
      params.append('minIncidents', minIncidents.toString());
      params.append('minSignalScore', minSignalScore.toString());
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await fetch(`/api/authority/intelligence/root-causes?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setAuthorized(false);
          return;
        }
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to load root-cause signals');
      }

      const json: RootCauseResponse = await res.json();
      setData(json);
      if (json.signals && json.signals.length > 0) {
        setSelectedSignal(json.signals[0]);
      } else {
        setSelectedSignal(null);
      }
    } catch (err: any) {
      console.error('[Root Cause UI] Error loading signals:', err);
      setErrorMsg(err.message || 'Unable to analyze root-cause signals right now. Database unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchSignals();
    }
  }, [authorized, days, radius, minIncidents, minSignalScore, categoryFilter]);

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
            Only authorized municipal officers can access Root-Cause Signal Intelligence.
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

  const getBadgeVariant = (classification: string): 'rose' | 'amber' | 'cyan' | 'slate' => {
    switch (classification) {
      case 'VERY_STRONG':
        return 'rose';
      case 'STRONG':
        return 'amber';
      case 'MODERATE':
        return 'cyan';
      default:
        return 'slate';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cyan">Possible Signal Engine</Badge>
            <span className="text-xs text-slate-400">• Deterministic Correlation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-cyan-400 animate-pulse" />
            Possible Common Issues
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Related incidents that may indicate a shared civic problem.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/authority">
            <Button size="sm" variant="outline">
              Dashboard
            </Button>
          </Link>
          <Link href="/authority/intelligence/escalations">
            <Button size="sm" variant="outline" className="border-rose-800 text-rose-300">
              Urgent Alerts
            </Button>
          </Link>
          <Button size="sm" variant="cyan" onClick={fetchSignals} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Signals
          </Button>
        </div>
      </div>

      {/* Cautious Language Banner */}
      <Card variant="glass" className="p-4 bg-cyan-950/20 border-cyan-800/40 text-xs text-slate-300 space-y-1">
        <div className="flex items-center gap-2 font-bold text-cyan-400">
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span>Field Verification Guidance</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          Root-cause signals highlight spatial, temporal, category, and recurrence correlations between incidents to uncover potential underlying infrastructure issues.
          <strong className="text-cyan-300 ml-1">Human authority field verification is mandatory</strong> before determining physical root causes.
        </p>
      </Card>

      {/* Filter Parameters */}
      <Card variant="glass" className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
          <Filter className="h-4 w-4" />
          Signal Detection Parameters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-1">
          {/* Time Window */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Time Period (Days)</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={1}>Last 24 Hours</option>
              <option value={3}>Last 3 Days</option>
              <option value={7}>Last 7 Days (Default)</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
          </div>

          {/* Search Radius */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Spatial Radius (Meters)</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={100}>100 meters</option>
              <option value={250}>250 meters</option>
              <option value={500}>500 meters (Default)</option>
              <option value={1000}>1,000 meters</option>
            </select>
          </div>

          {/* Min Related Incidents */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Min Incidents</label>
            <select
              value={minIncidents}
              onChange={(e) => setMinIncidents(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={2}>≥ 2 Incidents (Default)</option>
              <option value={3}>≥ 3 Incidents</option>
              <option value={5}>≥ 5 Incidents</option>
              <option value={10}>≥ 10 Incidents</option>
            </select>
          </div>

          {/* Min Signal Score */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Min Signal Strength</label>
            <select
              value={minSignalScore}
              onChange={(e) => setMinSignalScore(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={0}>All Signals (0+)</option>
              <option value={40}>Moderate+ (40+)</option>
              <option value={60}>Strong+ (60+)</option>
              <option value={80}>Very Strong Only (80+)</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Categories</option>
              <option value="DRAINAGE_BLOCKAGE">Drainage / Sewage</option>
              <option value="WATER_LEAKAGE">Water Leakage</option>
              <option value="BROKEN_STREETLIGHT">Street Lighting</option>
              <option value="ROAD_POTHOLE">Roads & Potholes</option>
              <option value="GARBAGE_OVERFLOW">Garbage / Waste</option>
              <option value="TRAFFIC_SIGNAL_DAMAGED">Traffic Signal</option>
              <option value="PUBLIC_INFRA_DAMAGE">Infrastructure</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Database Error State */}
      {errorMsg && (
        <Card variant="glass" className="p-4 border-rose-900/60 bg-rose-950/20 text-rose-200 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">{errorMsg}</p>
            <p className="text-rose-300/80 mt-0.5">Please verify server status or refresh after database recovery.</p>
          </div>
        </Card>
      )}

      {/* Content Area */}
      {loading ? (
        <LoadingState message="Calculating deterministic spatial, temporal, and recurrence correlations..." />
      ) : data?.signals.length === 0 ? (
        <Card variant="glass" className="p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-white">No common issue signals detected for selected parameters.</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No incident clusters meeting the threshold of {minIncidents} related incidents within {radius} meters were detected.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Signals List (Left 5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Possible Signals ({data?.totalSignals || 0})
              </h2>
              <span className="text-xs text-slate-400">
                {data?.totalAffectedIncidents || 0} total active incidents analyzed
              </span>
            </div>

            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {data?.signals.map((signal) => {
                const isSelected = selectedSignal?.signalId === signal.signalId;
                return (
                  <Card
                    key={signal.signalId}
                    variant="glass"
                    onClick={() => setSelectedSignal(signal)}
                    className={`p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-500/40'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getBadgeVariant(signal.classification)}>
                            {signal.classification.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs font-bold text-white">
                            {signal.categoryLabel}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                          <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span>
                            {signal.radiusMeters}m area • {signal.incidentCount} related incidents
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-cyan-400">
                          {signal.signalScore} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                        </div>
                        <div className="text-[10px] text-amber-400 font-semibold">
                          {signal.requiresFieldVerification ? 'Needs Verification' : 'Verified'}
                        </div>
                      </div>
                    </div>

                    {/* Summary snippet */}
                    <p className="mt-2 text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-950/40 p-2 rounded border border-slate-800/60">
                      {signal.evidence[0] || 'Correlated incident signal detected'}
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Time window: {data?.config.days} days</span>
                      <span className="text-cyan-400 font-medium">{signal.recommendedAction}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Signal Detail Inspector (Right 7 cols) */}
          <div className="lg:col-span-7">
            {selectedSignal ? (
              <Card variant="glass" className="p-6 space-y-6 border-cyan-500/30 bg-slate-900/60">
                {/* Detail Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-cyan-400" />
                      <h2 className="text-lg font-bold text-white">
                        Possible {selectedSignal.categoryLabel} Issue
                      </h2>
                      <Badge variant={getBadgeVariant(selectedSignal.classification)}>
                        {selectedSignal.classification.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedSignal.incidentCount} related incidents within {selectedSignal.radiusMeters}m area during the last {data?.config.days} days.
                    </p>
                  </div>
                  <div className="text-center bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 shrink-0">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Signal Strength</span>
                    <span className="text-2xl font-black text-cyan-400">{selectedSignal.signalScore}</span>
                  </div>
                </div>

                {/* Evidence List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Correlation Evidence
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1">
                      <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> Spatial Concentration
                      </span>
                      <p className="text-xs text-slate-300">{selectedSignal.evidence[0] || 'High spatial concentration'}</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1">
                      <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Temporal Concentration
                      </span>
                      <p className="text-xs text-slate-300">{selectedSignal.evidence[1] || 'Recent time cluster'}</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1">
                      <span className="text-[11px] font-semibold text-teal-400 flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" /> Category Uniformity
                      </span>
                      <p className="text-xs text-slate-300">{selectedSignal.evidence[2] || 'Uniform category'}</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1">
                      <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" /> Recurrence Pattern
                      </span>
                      <p className="text-xs text-slate-300">{selectedSignal.evidence[3] || 'Historical recurrence analysis'}</p>
                    </div>
                  </div>
                </div>

                {/* Recommended Next Action */}
                <div className="bg-slate-950/80 border border-amber-900/40 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Recommended Operational Action
                    </span>
                    <Badge variant="amber">Needs Field Verification</Badge>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    &quot;{selectedSignal.recommendedAction}&quot;
                  </p>
                  <p className="text-xs text-slate-400">
                    Centroid coordinates: {selectedSignal.center.latitude.toFixed(4)}, {selectedSignal.center.longitude.toFixed(4)}. Dispatch field inspection team to verify common physical origin.
                  </p>
                </div>

                {/* Related Incidents */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Related Incident Cases ({selectedSignal.relatedIncidentIds.length})
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedSignal.relatedIncidentIds.map((incId) => (
                      <Link key={incId} href={`/authority/complaints/${incId}`}>
                        <Button size="sm" variant="outline" className="text-xs border-slate-700 hover:border-cyan-500 font-mono">
                          Incident #{incId.substring(0, 8)}...
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Data Privacy Note */}
                <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
                  <strong>Privacy Assurance:</strong> Calculated strictly using aggregated municipal master incident coordinates and categories. Zero citizen PII or tracking identifiers exposed.
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
