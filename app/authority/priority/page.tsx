'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flame, ShieldAlert, AlertTriangle, Eye, ArrowRight, RefreshCw, MapPin } from 'lucide-react';
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
  address: string;
  departmentName?: string;
  reportCount: number;
  imageUrl?: string;
  createdAt: string;
}

export default function PriorityPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [activeTier, setActiveTier] = useState<string>('ALL');

  const fetchIncidents = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.incidents)) {
          setIncidents(json.data.incidents);
        }
      }
    } catch (err) {
      console.error('Error loading priority incidents:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const formatExactDate = (isoStr: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    } catch {
      return isoStr;
    }
  };

  const criticalList = incidents.filter((i) => i.severity === 'CRITICAL' || i.priorityScore >= 80);
  const highList = incidents.filter(
    (i) => (i.severity === 'HIGH' || (i.priorityScore >= 60 && i.priorityScore < 80)) && i.severity !== 'CRITICAL'
  );
  const mediumList = incidents.filter(
    (i) =>
      (i.severity === 'MEDIUM' || (i.priorityScore >= 40 && i.priorityScore < 60)) &&
      i.severity !== 'CRITICAL' &&
      i.severity !== 'HIGH'
  );
  const lowList = incidents.filter(
    (i) =>
      (i.severity === 'LOW' || i.priorityScore < 40) &&
      i.severity !== 'CRITICAL' &&
      i.severity !== 'HIGH' &&
      i.severity !== 'MEDIUM'
  );

  const getTierDisplayList = () => {
    if (activeTier === 'CRITICAL') return criticalList;
    if (activeTier === 'HIGH') return highList;
    if (activeTier === 'MEDIUM') return mediumList;
    if (activeTier === 'LOW') return lowList;
    return [...incidents].sort((a, b) => b.priorityScore - a.priorityScore);
  };

  const displayedIncidents = getTierDisplayList();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 tracking-wider">
            Priority Triage Ranking
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Flame className="h-7 w-7 text-rose-500 fill-current" /> Priority Complaints Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ordered strictly from highest priority to lowest to guide rapid municipal triage.
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Priorities
        </button>
      </div>

      {/* Priority Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs">
        <button
          onClick={() => setActiveTier('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTier === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Priority Tiers ({incidents.length})
        </button>

        <button
          onClick={() => setActiveTier('CRITICAL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTier === 'CRITICAL'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-600 hover:bg-rose-50'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" /> Critical ({criticalList.length})
        </button>

        <button
          onClick={() => setActiveTier('HIGH')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTier === 'HIGH'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-amber-600 hover:bg-amber-50'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> High ({highList.length})
        </button>

        <button
          onClick={() => setActiveTier('MEDIUM')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTier === 'MEDIUM'
              ? 'bg-yellow-500 text-slate-950 shadow-xs'
              : 'text-yellow-700 hover:bg-yellow-50'
          }`}
        >
          Medium ({mediumList.length})
        </button>

        <button
          onClick={() => setActiveTier('LOW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTier === 'LOW'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          Low ({lowList.length})
        </button>
      </div>

      {/* Complaints List */}
      {loading ? (
        <LoadingState message="Loading priority queue..." />
      ) : displayedIncidents.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 space-y-2">
          <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Complaints in {activeTier} Priority Tier</h3>
          <p className="text-xs text-slate-500">Select another tier or check back after new citizen reports are submitted.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedIncidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-sky-300 transition-all shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Thumbnail Image */}
                <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  {inc.imageUrl ? (
                    <Image src={inc.imageUrl} alt={inc.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-[10px] p-1 text-center bg-slate-100">
                      Civic Photo
                    </div>
                  )}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white ${
                        inc.severity === 'CRITICAL' || inc.priorityScore >= 80
                          ? 'bg-rose-600'
                          : inc.severity === 'HIGH' || inc.priorityScore >= 60
                          ? 'bg-amber-500'
                          : 'bg-yellow-500 text-slate-900'
                      }`}
                    >
                      {inc.severity || 'CRITICAL'}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">#{inc.caseId}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                      Score: {inc.priorityScore}/100
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">{inc.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{inc.summary}</p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium pt-1">
                    <span className="flex items-center gap-1 text-slate-700 font-semibold truncate">
                      <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                      {inc.address || 'Gummidipoondi Main Rd'}
                    </span>
                    <span>•</span>
                    <span>{inc.reportCount || 1} reports</span>
                    <span>•</span>
                    <span className="text-sky-700 font-semibold">{inc.departmentName || 'Unassigned'}</span>
                    <span>•</span>
                    <span className="font-mono">{formatExactDate(inc.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <Link href={`/authority/complaints/${inc.id}`}>
                  <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs">
                    <Eye className="h-3.5 w-3.5" /> View →
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
