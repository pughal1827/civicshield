'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Shield,
  Layers,
  MapPin,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Filter,
  CheckCircle2,
  Lock,
  Building2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { HotspotItem, HotspotsResponse } from '@/lib/intelligence/types';

export default function AuthorityHotspotIntelligencePage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HotspotsResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotItem | null>(null);

  // Filters
  const [days, setDays] = useState(7);
  const [radius, setRadius] = useState(500);
  const [minIncidents, setMinIncidents] = useState(3);
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

  // 2. Fetch Hotspots
  const fetchHotspots = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.append('days', days.toString());
      params.append('radius', radius.toString());
      params.append('minIncidents', minIncidents.toString());
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await fetch(`/api/authority/intelligence/hotspots?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setAuthorized(false);
          return;
        }
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to load hotspots');
      }

      const json: HotspotsResponse = await res.json();
      setData(json);
      if (json.hotspots && json.hotspots.length > 0) {
        setSelectedHotspot(json.hotspots[0]);
      } else {
        setSelectedHotspot(null);
      }
    } catch (err: any) {
      console.error('[Intelligence UI] Error loading hotspots:', err);
      setErrorMsg(err.message || 'Unable to load civic hotspots right now. Database unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      fetchHotspots();
    }
  }, [authorized, days, radius, minIncidents, categoryFilter]);

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
            Only authorized municipal officers can access the Civic Intelligence & Hotspot Engine.
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
            <span className="text-xs text-slate-400">• Deterministic Spatial Clustering Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
            <Flame className="h-7 w-7 text-amber-500 animate-pulse" />
            Civic Hotspot Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Detect geographic concentrations of active civic incidents to optimize municipal resource allocation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/authority">
            <Button size="sm" variant="outline">
              Operations Dashboard
            </Button>
          </Link>
          <Button size="sm" variant="cyan" onClick={fetchHotspots} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Hotspots
          </Button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <Card variant="glass" className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
          <Filter className="h-4 w-4" />
          Hotspot Detection Parameters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          {/* Time Window */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Time Window (Days)</label>
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

          {/* Spatial Radius */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Search Radius (Meters)</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={100}>100 meters</option>
              <option value={250}>250 meters</option>
              <option value={500}>500 meters (Default)</option>
              <option value={1000}>1,000 meters</option>
              <option value={2000}>2,000 meters</option>
            </select>
          </div>

          {/* Min Incidents */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Min Active Incidents</label>
            <select
              value={minIncidents}
              onChange={(e) => setMinIncidents(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value={2}>≥ 2 Incidents</option>
              <option value={3}>≥ 3 Incidents (Default)</option>
              <option value={5}>≥ 5 Incidents</option>
              <option value={10}>≥ 10 Incidents</option>
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
            <p className="text-rose-300/80 mt-0.5">Please check system backend connectivity or try refreshing.</p>
          </div>
        </Card>
      )}

      {/* Main Grid Content */}
      {loading ? (
        <LoadingState message="Analyzing spatial clusters and detecting civic hotspots..." />
      ) : data?.hotspots.length === 0 ? (
        <Card variant="glass" className="p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-white">No civic hotspots detected for the selected period.</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No active spatial concentrations meeting the threshold of {minIncidents} incidents within {radius} meters were found in the last {days} days.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Hotspots List (Left 5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Detected Hotspots ({data?.totalHotspots || 0})
              </h2>
              <span className="text-xs text-slate-400">
                {data?.totalClusteredIncidents} Incidents ({data?.totalClusteredReports} Citizen Submissions)
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {data?.hotspots.map((hs) => {
                const isSelected = selectedHotspot?.id === hs.id;
                return (
                  <Card
                    key={hs.id}
                    variant="glass"
                    onClick={() => setSelectedHotspot(hs)}
                    className={`p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-amber-500/60 bg-amber-950/20 ring-1 ring-amber-500/40'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              hs.hotspotSeverity === 'CRITICAL'
                                ? 'rose'
                                : hs.hotspotSeverity === 'HIGH'
                                ? 'amber'
                                : 'cyan'
                            }
                          >
                            {hs.hotspotSeverity}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-200">
                            {hs.hotspotType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
                          <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span>
                            Centroid: {hs.center.latitude.toFixed(4)}, {hs.center.longitude.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-extrabold text-amber-400">
                          {hs.incidentCount} <span className="text-xs font-normal text-slate-400">incidents</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {hs.citizenReportCount} citizen reports
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                        <span>{hs.trend.explanation}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Radius: {hs.radiusMeters}m</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Selected Hotspot Detail Panel (Right 7 cols) */}
          <div className="lg:col-span-7">
            {selectedHotspot ? (
              <Card variant="glass" className="p-6 space-y-6 border-amber-500/30 bg-slate-900/60">
                {/* Detail Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-amber-400" />
                      <h2 className="text-lg font-bold text-white">Civic Hotspot Detail</h2>
                      <Badge variant="amber">{selectedHotspot.hotspotSeverity}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      High concentration detected within {selectedHotspot.radiusMeters}m radius during the last {days} days.
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                    Detection Strength: <strong className="text-cyan-400">{selectedHotspot.detectionStrength}</strong>
                  </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Active Master Incidents</span>
                    <span className="text-xl font-black text-amber-400">{selectedHotspot.incidentCount}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block flex items-center gap-1">
                      <Users className="h-3 w-3 text-cyan-400" /> Citizen Submissions
                    </span>
                    <span className="text-xl font-black text-cyan-400">{selectedHotspot.citizenReportCount}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">Critical Priority</span>
                    <span className="text-xl font-black text-rose-400">{selectedHotspot.criticalCount}</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block">High Priority</span>
                    <span className="text-xl font-black text-amber-300">{selectedHotspot.highCount}</span>
                  </div>
                </div>

                {/* Priority & Category Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category Breakdown */}
                  <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Top Categories</h3>
                    <div className="space-y-1.5 pt-1">
                      {selectedHotspot.topCategories.map((c) => (
                        <div key={c.category} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">{c.categoryLabel}</span>
                          <span className="font-bold text-amber-400">{c.count} incidents</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Primary Department */}
                  <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Primary Department</h3>
                    {selectedHotspot.topDepartment ? (
                      <div className="pt-1 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                          <Building2 className="h-4 w-4" />
                          {selectedHotspot.topDepartment.departmentName}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Code: {selectedHotspot.topDepartment.departmentCode} • {selectedHotspot.topDepartment.count} assigned active issues
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic pt-1">No primary department assigned yet.</p>
                    )}
                  </div>
                </div>

                {/* Period-over-Period Trend Summary */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    Period-over-Period Activity Trend
                  </div>
                  <p className="text-xs text-slate-300 pt-1">
                    {selectedHotspot.incidentCount} active incidents in the current {days}-day period compared to{' '}
                    {selectedHotspot.trend.previousCount} in the previous period.
                  </p>
                  <p className="text-xs text-cyan-400/90 font-medium">
                    {selectedHotspot.trend.explanation}
                  </p>
                </div>

                {/* Footer Disclaimer */}
                <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
                  <strong>Privacy & Triage Note:</strong> Information is aggregated deterministically from public primary incidents. No citizen credentials, emails, or personal tracking identifiers are exposed.
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
