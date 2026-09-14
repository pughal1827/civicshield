'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FileText, MapPin, Eye, ArrowRight, RefreshCw, Search } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

interface IncidentItem {
  id: string;
  caseId: string;
  title: string;
  summary: string;
  category: string;
  severity: string;
  status: string;
  priorityScore: number;
  address: string;
  departmentName?: string;
  imageUrl?: string;
  createdAt: string;
}

export default function MyReportsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<IncidentItem[]>([]);
  const [search, setSearch] = useState('');

  const fetchMyReports = async () => {
    setRefreshing(true);
    try {
      // 1. Get saved local tracking codes / cases
      let localSaved: any[] = [];
      try {
        const savedStr = localStorage.getItem('civicshield_my_reports');
        if (savedStr) localSaved = JSON.parse(savedStr);
      } catch {
        localSaved = [];
      }

      const res = await fetch('/api/incidents');
      if (res.ok) {
        const json = await res.json();
        const allIncs = Array.isArray(json.data) ? json.data : Array.isArray(json.data?.incidents) ? json.data.incidents : [];

        if (localSaved.length > 0) {
          const localIds = new Set(localSaved.map(r => r.id || r.incidentId || r.caseId));
          const matched = allIncs.filter((inc: any) => localIds.has(inc.id) || localIds.has(inc.caseId));
          // If some reports are only in localSaved, merge them
          const finalReports = matched.length > 0 ? matched : localSaved;
          setReports(finalReports);
        } else {
          setReports(allIncs);
        }
      } else if (localSaved.length > 0) {
        setReports(localSaved);
      }
    } catch (err) {
      console.error('Error fetching my reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
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

  const filteredReports = reports.filter((inc) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      inc.caseId?.toLowerCase().includes(q) ||
      inc.title?.toLowerCase().includes(q) ||
      inc.summary?.toLowerCase().includes(q) ||
      inc.address?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 tracking-wider">
            Personal Complaints Directory
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <FileText className="h-7 w-7 text-emerald-600" /> My Complaints
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track and view progress on all civic issues you have reported.
          </p>
        </div>

        <button
          onClick={fetchMyReports}
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh My Complaints
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Case ID (CS-1024), problem, address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs font-medium"
        />
      </div>

      {/* Complaints List */}
      {loading ? (
        <LoadingState message="Fetching your submitted complaints..." />
      ) : filteredReports.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 space-y-3">
          <FileText className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Complaints Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You haven&apos;t reported any civic issues yet. Click below to submit your first report.
          </p>
          <Link href="/report">
            <button className="px-5 py-2.5 bg-emerald-600 text-white font-extrabold text-xs rounded-xl hover:bg-emerald-500 transition-all shadow-xs">
              + Report an Issue
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((inc) => (
            <div
              key={inc.id}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-emerald-400 transition-all shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
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
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded">
                      #{inc.caseId}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        inc.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-700'
                          : inc.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {inc.severity || 'CRITICAL'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        inc.status === 'RESOLVED' || inc.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {(inc.status || 'SUBMITTED').replace('_', ' ')}
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
                    <span className="text-sky-700 font-semibold">{inc.departmentName || 'Road Maintenance'}</span>
                    <span>•</span>
                    <span className="font-mono">{formatExactDate(inc.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <Link href={`/track/${inc.caseId}`}>
                  <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs">
                    <Eye className="h-3.5 w-3.5" /> Track Complaint →
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
