'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Map as MapIcon,
  MapPin,
  RefreshCw,
  Layers,
  ShieldAlert,
  Sparkles,
  Search,
  Filter,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  ArrowUpDown,
  Building2,
  UserCheck,
  ChevronRight,
  ExternalLink,
  X,
  Share2,
  Navigation,
} from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';
import { CATEGORY_CONFIG, SEVERITY_COLORS } from '@/components/maps/incident-cluster-map';

// Dynamically import Leaflet Map to avoid SSR issues
const IncidentClusterMap = dynamic(
  () => import('@/components/maps/incident-cluster-map').then((mod) => mod.IncidentClusterMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[560px] w-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-800">
        <div className="h-8 w-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-300">
          Loading spatial telemetry & active incident pins…
        </span>
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
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  priorityScore: number;
  latitude: number;
  longitude: number;
  address: string;
  departmentId?: string;
  departmentName?: string;
  departmentCode?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  reportCount: number;
  createdAt: string;
}

export default function ProblemMapPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);

  // Filters and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'priority' | 'reports' | 'recent'>('priority');
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);

  const fetchMapIncidents = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.incidents)) {
          const list: IncidentItem[] = json.data.incidents;
          setIncidents(list);
          if (list.length > 0 && !selectedIncident) {
            setSelectedIncident(list[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching map incidents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMapIncidents();
  }, []);

  // Spatial Telemetry Statistics
  const stats = useMemo(() => {
    const total = incidents.length;
    const critical = incidents.filter((i) => i.severity === 'CRITICAL' || i.priorityScore >= 80).length;
    const high = incidents.filter((i) => i.severity === 'HIGH' || (i.priorityScore >= 60 && i.priorityScore < 80)).length;
    const unassigned = incidents.filter((i) => !i.assignedOfficerId && i.status !== 'RESOLVED').length;
    const clusteredCount = incidents.filter((i) => (i.reportCount || 1) > 1).length;

    return { total, critical, high, unassigned, clusteredCount };
  }, [incidents]);

  const getPriorityDot = (severity: string, score: number) => {
    if (severity === 'CRITICAL' || score >= 80) return 'bg-rose-500 shadow-rose-500/50';
    if (severity === 'HIGH' || score >= 60) return 'bg-amber-500 shadow-amber-500/50';
    if (severity === 'MEDIUM' || score >= 40) return 'bg-yellow-400 shadow-yellow-400/50';
    return 'bg-emerald-500 shadow-emerald-500/50';
  };

  // Filtered & Sorted Incidents
  const filteredIncidents = useMemo(() => {
    return incidents
      .filter((inc) => {
        // Priority filter
        if (priorityFilter !== 'ALL') {
          if (priorityFilter === 'CRITICAL' && inc.severity !== 'CRITICAL' && inc.priorityScore < 80) return false;
          if (priorityFilter === 'HIGH' && inc.severity !== 'HIGH' && (inc.priorityScore < 60 || inc.priorityScore >= 80)) return false;
          if (priorityFilter === 'MEDIUM' && inc.severity !== 'MEDIUM' && (inc.priorityScore < 40 || inc.priorityScore >= 60)) return false;
          if (priorityFilter === 'LOW' && inc.severity !== 'LOW' && inc.priorityScore >= 40) return false;
        }

        // Category filter
        if (categoryFilter !== 'ALL') {
          if (!inc.category?.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
        }

        // Status filter
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'UNASSIGNED') {
            if (inc.assignedOfficerId || inc.status === 'RESOLVED') return false;
          } else if (inc.status !== statusFilter) {
            return false;
          }
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesCaseId = inc.caseId?.toLowerCase().includes(q);
          const matchesTitle = inc.title?.toLowerCase().includes(q);
          const matchesAddress = inc.address?.toLowerCase().includes(q);
          const matchesDept = inc.departmentName?.toLowerCase().includes(q);
          const matchesSummary = inc.summary?.toLowerCase().includes(q);
          if (!matchesCaseId && !matchesTitle && !matchesAddress && !matchesDept && !matchesSummary) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          return (b.priorityScore || 0) - (a.priorityScore || 0);
        }
        if (sortBy === 'reports') {
          return (b.reportCount || 1) - (a.reportCount || 1);
        }
        if (sortBy === 'recent') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
  }, [incidents, priorityFilter, categoryFilter, statusFilter, searchQuery, sortBy]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('priority');
  };

  return (
    <div className="space-y-6">
      {/* ─── 1. TOP HEADER & TELEMETRY CONTROLS ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-sky-100 text-sky-700 tracking-wider">
              Spatial Command
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
              Zone: Gummidipoondi
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
            <MapIcon className="h-7 w-7 text-sky-600" /> Municipal Problem Map
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time geospatial intelligence, clustered citizen reports, and triage routing across jurisdiction.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            onClick={fetchMapIncidents}
            disabled={refreshing}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
            title="Reload real-time telemetry from database"
          >
            <RefreshCw className={`h-4 w-4 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh Telemetry'}</span>
          </button>

          <Link
            href="/authority/complaints"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <span>All Complaints</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* ─── 2. SPATIAL KPI STATUS CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Plotted */}
        <button
          type="button"
          onClick={resetAllFilters}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            priorityFilter === 'ALL' && categoryFilter === 'ALL' && statusFilter === 'ALL'
              ? 'bg-sky-50/70 border-sky-300 ring-2 ring-sky-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Active Pins</span>
            <MapPin className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{stats.total}</div>
          <span className="text-[10px] font-semibold text-slate-500">Total in Jurisdiction</span>
        </button>

        {/* Critical Alerts */}
        <button
          type="button"
          onClick={() => setPriorityFilter(priorityFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            priorityFilter === 'CRITICAL'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase">Critical</span>
            <Flame className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 mt-1">{stats.critical}</div>
          <span className="text-[10px] font-semibold text-rose-500/80">Immediate Hazards</span>
        </button>

        {/* High Priority */}
        <button
          type="button"
          onClick={() => setPriorityFilter(priorityFilter === 'HIGH' ? 'ALL' : 'HIGH')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            priorityFilter === 'HIGH'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase">High Priority</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 mt-1">{stats.high}</div>
          <span className="text-[10px] font-semibold text-amber-500/80">Action Needed &lt;24h</span>
        </button>

        {/* Clustered Hotspots */}
        <button
          type="button"
          onClick={() => setSortBy(sortBy === 'reports' ? 'priority' : 'reports')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            sortBy === 'reports'
              ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-600 uppercase">Clustered</span>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-purple-600 mt-1">{stats.clusteredCount}</div>
          <span className="text-[10px] font-semibold text-purple-500/80">Multiple Reports</span>
        </button>

        {/* Unassigned Issues */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            statusFilter === 'UNASSIGNED'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase">Unassigned</span>
            <UserCheck className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{stats.unassigned}</div>
          <span className="text-[10px] font-semibold text-slate-500">Needs Officer</span>
        </button>
      </div>

      {/* ─── 3. ADVANCED SEARCH & FILTER CONTROLS ───────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case ID (#CS-9653), road name, category, or keyword…"
              className="w-full h-10 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Selector */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">🔴 Critical Only</option>
              <option value="HIGH">🟠 High Only</option>
              <option value="MEDIUM">🟡 Medium Only</option>
              <option value="LOW">🟢 Low Only</option>
            </select>

            {/* Category Selector */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="ROAD">🕳️ Road / Pothole</option>
              <option value="MANHOLE">⚠️ Open Manhole</option>
              <option value="GARBAGE">🗑️ Garbage / Waste</option>
              <option value="WATER">💧 Water Leakage</option>
              <option value="ELECTRICAL">⚡ Streetlight / Wire</option>
              <option value="DRAINAGE">🌊 Drainage / Sewage</option>
              <option value="TRAFFIC">🚦 Traffic Signal</option>
              <option value="INFRA">🏛️ Public Infra</option>
            </select>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="priority">Sort: Highest Urgency</option>
              <option value="reports">Sort: Most Reports (Clustered)</option>
              <option value="recent">Sort: Most Recent</option>
            </select>

            {/* Clear All Filters Button */}
            {(searchQuery || priorityFilter !== 'ALL' || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="h-10 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Category Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Quick Filter:</span>
          {[
            { id: 'ALL', label: 'All Issues' },
            { id: 'ROAD', label: '🕳️ Roads' },
            { id: 'MANHOLE', label: '⚠️ Manholes' },
            { id: 'ELECTRICAL', label: '⚡ Electrical' },
            { id: 'GARBAGE', label: '🗑️ Waste' },
            { id: 'DRAINAGE', label: '🌊 Drainage' },
            { id: 'WATER', label: '💧 Water' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setCategoryFilter(categoryFilter === chip.id ? 'ALL' : chip.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                categoryFilter === chip.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 4. MAIN SPLIT SCREEN (INTERACTIVE MAP + TRIAGE QUEUE) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Multi-Pin Map (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <IncidentClusterMap
              incidents={filteredIncidents}
              selectedIncident={selectedIncident}
              selectedIncidentId={selectedIncident?.id}
              onIncidentClick={(inc) => setSelectedIncident(inc)}
              height="560px"
              className="h-[560px] w-full rounded-xl"
              showControls={true}
            />
          </div>

          {/* Map Legend Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-slate-200/80 text-[11px] font-semibold text-slate-600 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-400 uppercase text-[10px]">Pins:</span>
              <span className="flex items-center gap-1 text-rose-600">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Critical
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> High
              </span>
              <span className="flex items-center gap-1 text-yellow-600">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" /> Medium
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Low
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <Compass className="h-3.5 w-3.5 text-sky-600" />
              <span>Tap a pin on map to inspect</span>
            </div>
          </div>
        </div>

        {/* Right Spatial Queue & Selected Card Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Spatial Triage Queue
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-extrabold">
                {filteredIncidents.length}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">
              Click to center & inspect
            </span>
          </div>

          {loading ? (
            <LoadingState message="Loading spatial markers…" />
          ) : filteredIncidents.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 space-y-3">
              <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">No matching spatial incidents</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Try adjusting search terms or clearing your filters.
                </p>
              </div>
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const isCritical = inc.severity === 'CRITICAL' || (inc.priorityScore && inc.priorityScore >= 80);
                const catInfo = CATEGORY_CONFIG[inc.category] || { label: 'Issue', icon: '📍' };

                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/60 shadow-md ring-2 ring-sky-500/30'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                    }`}
                  >
                    {/* Header: Case ID, Severity, Category */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${getPriorityDot(inc.severity, inc.priorityScore)}`} />
                        <span className="font-mono font-extrabold text-xs text-slate-800">
                          #{inc.caseId}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                          <span>{catInfo.icon}</span>
                          <span>{catInfo.label}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {inc.reportCount > 1 && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-extrabold">
                            🔥 {inc.reportCount} Clustered
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded text-white shadow-2xs ${
                            isCritical ? 'bg-rose-600' : inc.severity === 'HIGH' ? 'bg-amber-500' : 'bg-slate-700'
                          }`}
                        >
                          {inc.severity || 'CRITICAL'}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-1">
                      {inc.title}
                    </h3>

                    {/* Address & GPS */}
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 flex items-center gap-1 font-medium">
                      <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                      <span>{inc.address || 'Gummidipoondi Jurisdiction Area'}</span>
                    </p>

                    {/* Expanded Footer for selected card or compact for normal */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-2 font-medium">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        <span className="truncate max-w-[150px]">
                          {inc.departmentName || 'Public Works'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${inc.latitude},${inc.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                          title="Open in Google Maps"
                        >
                          <Navigation className="h-2.5 w-2.5 text-sky-600" />
                          <span>GPS</span>
                        </a>

                        <Link href={`/authority/complaints/${inc.id}`} onClick={(e) => e.stopPropagation()}>
                          <button className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition-colors shadow-2xs flex items-center gap-1">
                            <span>Inspect</span>
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
