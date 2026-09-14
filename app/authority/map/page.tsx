'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IncidentMap } from '@/components/maps/incident-map';
import { Map as MapIcon, MapPin, Eye, RefreshCw, Filter } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

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
  departmentName?: string;
  reportCount: number;
  createdAt: string;
}

export default function ProblemMapPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);

  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);

  const fetchMapIncidents = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.incidents)) {
          const list = json.data.incidents;
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

  const getPriorityDot = (severity: string, score: number) => {
    if (severity === 'CRITICAL' || score >= 80) return 'bg-rose-500 shadow-rose-500/50';
    if (severity === 'HIGH' || score >= 60) return 'bg-amber-500 shadow-amber-500/50';
    if (severity === 'MEDIUM' || score >= 40) return 'bg-yellow-400 shadow-yellow-400/50';
    return 'bg-emerald-500 shadow-emerald-500/50';
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (priorityFilter !== 'ALL') {
      if (priorityFilter === 'CRITICAL' && inc.severity !== 'CRITICAL' && inc.priorityScore < 80) return false;
      if (priorityFilter === 'HIGH' && inc.severity !== 'HIGH' && (inc.priorityScore < 60 || inc.priorityScore >= 80)) return false;
      if (priorityFilter === 'MEDIUM' && inc.severity !== 'MEDIUM' && (inc.priorityScore < 40 || inc.priorityScore >= 60)) return false;
      if (priorityFilter === 'LOW' && inc.severity !== 'LOW' && inc.priorityScore >= 40) return false;
    }

    if (categoryFilter !== 'ALL') {
      if (!inc.category?.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-sky-100 text-sky-700 tracking-wider">
            Spatial Overview
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <MapIcon className="h-7 w-7 text-sky-600" /> Problem Map
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real complaint locations in your assigned jurisdiction color-coded by priority tier.
          </p>
        </div>

        <button
          onClick={fetchMapIncidents}
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Spatial Telemetry
        </button>
      </div>

      {/* Map Legend & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Priority Color Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider">Map Legend:</span>
          <span className="flex items-center gap-1.5 text-rose-600">
            <span className="h-3 w-3 rounded-full bg-rose-500 shadow-sm" /> Red = Critical
          </span>
          <span className="flex items-center gap-1.5 text-amber-600">
            <span className="h-3 w-3 rounded-full bg-amber-500 shadow-sm" /> Orange = High
          </span>
          <span className="flex items-center gap-1.5 text-yellow-600">
            <span className="h-3 w-3 rounded-full bg-yellow-400 shadow-sm" /> Yellow = Medium
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" /> Green = Low
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 font-bold"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 font-bold"
          >
            <option value="ALL">All Categories</option>
            <option value="ROAD">Road / Pothole</option>
            <option value="GARBAGE">Garbage / Waste</option>
            <option value="WATER">Water / Leakage</option>
            <option value="ELECTRICAL">Streetlight / Electrical</option>
            <option value="DRAINAGE">Drainage / Sewage</option>
            <option value="TRAFFIC">Traffic Signal</option>
          </select>
        </div>
      </div>

      {/* Map Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Interactive Map (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <IncidentMap
              latitude={selectedIncident?.latitude || 13.0827}
              longitude={selectedIncident?.longitude || 80.2707}
              title={selectedIncident?.title || 'Gummidipoondi Spatial View'}
              className="h-[520px] w-full rounded-xl"
            />
          </div>
        </div>

        {/* Right Marker Pins List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Spatial Pins ({filteredIncidents.length})
          </h2>

          {loading ? (
            <LoadingState message="Loading spatial markers..." />
          ) : filteredIncidents.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-xs text-slate-400">
              No complaint markers match the selected map filters.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${getPriorityDot(inc.severity, inc.priorityScore)}`} />
                        <span className="font-mono font-bold text-xs text-slate-700">#{inc.caseId}</span>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {inc.severity || 'CRITICAL'}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 mt-1 line-clamp-1">{inc.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 flex items-center gap-1 font-medium">
                      <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                      {inc.address || 'Gummidipoondi Main Rd'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 mt-2 font-medium">
                      <span>{inc.reportCount || 1} Reports • {inc.departmentName || 'Road Maintenance'}</span>
                      <Link href={`/authority/complaints/${inc.id}`} onClick={(e) => e.stopPropagation()}>
                        <button className="px-3 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg hover:bg-slate-800">
                          View →
                        </button>
                      </Link>
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
