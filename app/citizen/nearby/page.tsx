'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MapPin,
  ArrowLeft,
  AlertTriangle,
  FilePlus,
  FileText,
  Search,
  Filter,
  Flame,
  CheckCircle2,
  Compass,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Navigation,
  Layers,
  Crosshair,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { LoadingState } from '@/components/ui/loading-state';

// Dynamically import Leaflet Map to avoid SSR issues
const IncidentClusterMap = dynamic(
  () => import('@/components/maps/incident-cluster-map').then((mod) => mod.IncidentClusterMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[500px] w-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2">
        <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-300">Loading spatial community map…</span>
      </div>
    ),
  }
);

export default function NearbyIssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/citizen/nearby')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.issues)) {
          setIssues(json.data.issues);
          if (json.data.issues.length > 0) {
            setSelectedIssue(json.data.issues[0]);
          }
        }
      })
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (categoryFilter !== 'ALL') {
        if (!issue.category?.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = issue.title?.toLowerCase().includes(q);
        const matchAddress = issue.address?.toLowerCase().includes(q);
        const matchCase = issue.caseId?.toLowerCase().includes(q);
        if (!matchTitle && !matchAddress && !matchCase) return false;
      }
      return true;
    });
  }, [issues, categoryFilter, searchQuery]);

  const handleSelectIssue = (issue: any) => {
    setSelectedIssue(issue);
    // Smoothly scroll the card into view if clicked on map
    const cardEl = document.getElementById(`issue-card-${issue.id}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 p-3 sm:p-5 lg:p-6 max-w-[1600px] mx-auto space-y-4 pb-20">
      {/* ─── Top Header Bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="space-y-1">
          <Link
            href="/citizen"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 font-bold transition-colors mb-0.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Citizen Portal</span>
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              <span>Problems Near You</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Gummidipoondi Zone
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Live public community hazard radar. Interactive map on the left, issues list and filters on the right.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Badge variant="emerald" className="text-xs font-bold px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
            {filteredIssues.length} of {issues.length} Issues
          </Badge>

          <Link href="/report">
            <Button
              size="md"
              variant="primary"
              className="h-10 px-4 font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs text-xs flex items-center gap-1.5 shrink-0"
            >
              <FilePlus className="h-4 w-4" />
              <span>Report Issue</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Split Screen Layout: Map Left (7 cols), Issues Right (5 cols) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ─── LEFT COLUMN: Interactive Map Canvas (lg:col-span-7) ─────────── */}
        <div className="lg:col-span-7 space-y-3 lg:sticky lg:top-4">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between px-2 pt-1 text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-slate-900">
                <Compass className="h-4 w-4 text-emerald-600" />
                <span>Spatial Community Map</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Click any pin to inspect & center
              </span>
            </div>

            {/* Map Window */}
            <div className="relative h-[480px] sm:h-[560px] lg:h-[calc(100vh-210px)] min-h-[460px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-inner">
              <IncidentClusterMap
                incidents={filteredIssues}
                selectedIncident={selectedIssue}
                selectedIncidentId={selectedIssue?.id}
                onIncidentClick={handleSelectIssue}
                height="100%"
                className="h-full w-full"
                showControls={true}
              />
            </div>

            {/* Map Legend */}
            <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] font-bold text-slate-600 border-t border-slate-100">
              <span className="flex items-center gap-1 text-rose-600">
                <span className="h-2 w-2 rounded-full bg-rose-600" /> Critical
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> High
              </span>
              <span className="flex items-center gap-1 text-yellow-600">
                <span className="h-2 w-2 rounded-full bg-yellow-500" /> Medium
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Low
              </span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Search, Filters & Issues List (lg:col-span-5) ──── */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Filter & Search Controls */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by street name, road, or issue keyword…"
                className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">All Categories ({issues.length})</option>
                <option value="ROAD">🕳️ Road / Pothole</option>
                <option value="MANHOLE">⚠️ Open Manhole</option>
                <option value="GARBAGE">🗑️ Garbage / Waste</option>
                <option value="WATER">💧 Water Leakage</option>
                <option value="ELECTRICAL">⚡ Electrical / Light</option>
                <option value="DRAINAGE">🌊 Drainage / Sewer</option>
              </select>
            </div>
          </div>

          {/* Community Privacy Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-slate-700 space-y-1 shadow-xs">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px] uppercase tracking-wider">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              Community Privacy Notice
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
              Displays safe civic telemetry only. Citizen names & tracking codes are strictly protected.
            </p>
          </div>

          {/* Issues List Container */}
          <div ref={listContainerRef} className="space-y-2.5">
            {loading ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
                <LoadingState message="Loading nearby community issues..." />
              </div>
            ) : filteredIssues.length === 0 ? (
              <Card className="p-8 text-center space-y-4 shadow-sm border-slate-200 bg-white rounded-2xl">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
                  <FileText className="h-6 w-6 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">No matching issues found</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Try adjusting your search query or category filter above.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('ALL');
                  }}
                  className="text-xs font-bold rounded-xl"
                >
                  Clear Filters
                </Button>
              </Card>
            ) : (
              <div className="space-y-2.5 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
                {filteredIssues.map((issue) => {
                  const isSelected = selectedIssue?.id === issue.id;
                  return (
                    <Card
                      id={`issue-card-${issue.id}`}
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className={`p-3.5 space-y-2.5 bg-white transition-all shadow-xs rounded-2xl cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/40 shadow-sm'
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                            #{issue.caseId}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {issue.category ? issue.category.replace(/_/g, ' ') : 'Civic Issue'}
                          </span>
                        </div>
                        <PriorityBadge score={issue.priorityScore || 50} />
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-slate-900 font-bold line-clamp-1">{issue.title}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                          <span className="truncate">{issue.address || 'Gummidipoondi Jurisdiction'}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={issue.status} />
                          <span className="text-[10px] text-slate-500 font-mono font-medium">
                            {issue.reportCount || 1} report{issue.reportCount > 1 ? 's' : ''}
                          </span>
                        </div>

                        <span className={`text-[11px] font-extrabold flex items-center gap-0.5 ${
                          isSelected ? 'text-emerald-700' : 'text-emerald-600 hover:text-emerald-700'
                        }`}>
                          {isSelected ? '● Centered on Map' : 'Focus on Map →'}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
