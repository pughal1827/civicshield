'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Search, FileText, Eye, RefreshCw, MapPin, Filter } from 'lucide-react';
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
  reportCount: number;
  imageUrl?: string;
  createdAt: string;
}

export default function ComplaintsPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || 'ALL';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [activeTab, setActiveTab] = useState<string>(initialStatus);

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
      console.error('Error fetching complaints:', err);
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

  const isIncidentLate = (inc: IncidentItem) => {
    const isUnsolved = inc.status !== 'RESOLVED' && inc.status !== 'VERIFIED';
    const createdTime = new Date(inc.createdAt).getTime();
    const hoursElapsed = (Date.now() - createdTime) / (1000 * 3600);
    return (
      isUnsolved &&
      ((inc.severity === 'CRITICAL' && hoursElapsed > 4) ||
        (inc.severity === 'HIGH' && hoursElapsed > 24) ||
        hoursElapsed > 72)
    );
  };

  const filteredIncidents = incidents.filter((inc) => {
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (inc.caseId && inc.caseId.toLowerCase().includes(query)) ||
      (inc.title && inc.title.toLowerCase().includes(query)) ||
      (inc.summary && inc.summary.toLowerCase().includes(query)) ||
      (inc.address && inc.address.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (activeTab === 'NEW') return inc.status === 'SUBMITTED' || inc.status === 'AI_ANALYSED';
    if (activeTab === 'WORKING') return inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS';
    if (activeTab === 'SOLVED') return inc.status === 'RESOLVED' || inc.status === 'VERIFIED';
    if (activeTab === 'LATE') return isIncidentLate(inc);

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-sky-100 text-sky-700 tracking-wider">
            All Complaints Directory
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <FileText className="h-7 w-7 text-sky-600" /> All Complaints
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse, search, and manage all civic complaints in your jurisdiction.
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Directory
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Case ID (CS-1042), problem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-slate-100/80 border border-slate-200 rounded-full text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('NEW')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'NEW'
                ? 'bg-rose-600 text-white'
                : 'text-rose-600 hover:bg-rose-50'
            }`}
          >
            New ({incidents.filter((i) => i.status === 'SUBMITTED' || i.status === 'AI_ANALYSED').length})
          </button>
          <button
            onClick={() => setActiveTab('WORKING')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'WORKING'
                ? 'bg-sky-600 text-white'
                : 'text-sky-600 hover:bg-sky-50'
            }`}
          >
            Working ({incidents.filter((i) => i.status === 'ASSIGNED' || i.status === 'IN_PROGRESS').length})
          </button>
          <button
            onClick={() => setActiveTab('SOLVED')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'SOLVED'
                ? 'bg-emerald-600 text-white'
                : 'text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            Solved ({incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'VERIFIED').length})
          </button>
          <button
            onClick={() => setActiveTab('LATE')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'LATE'
                ? 'bg-purple-600 text-white'
                : 'text-purple-600 hover:bg-purple-50'
            }`}
          >
            Late ({incidents.filter(isIncidentLate).length})
          </button>
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <LoadingState message="Loading complaints directory..." />
      ) : filteredIncidents.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 space-y-2">
          <FileText className="h-8 w-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Complaints Found</h3>
          <p className="text-xs text-slate-500">No records match your search criteria or filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-sky-300 transition-all shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
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
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      #{inc.caseId}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        inc.status === 'RESOLVED' || inc.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {inc.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">{inc.title}</h3>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium pt-0.5">
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
