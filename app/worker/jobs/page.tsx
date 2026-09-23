'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  Flame,
  Wrench,
  CheckCircle2,
  MapPin,
  Clock,
  Eye,
  Filter,
  Shield,
  Search,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWorkerAuthHeaders } from '@/lib/auth/worker-client';

export default function WorkerAssignedJobsPage() {
  const [loading, setLoading] = useState(true);
  const [workerInfo, setWorkerInfo] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/worker/incidents', {
        credentials: 'same-origin',
        headers: getWorkerAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWorkerInfo(json.data.worker);
          setIncidents(json.data.incidents || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredIncidents = incidents.filter((inc) => {
    // Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ASSIGNED' && inc.status !== 'ASSIGNED' && inc.status !== 'SUBMITTED' && inc.status !== 'AI_ANALYSED') return false;
      if (statusFilter === 'IN_PROGRESS' && inc.status !== 'IN_PROGRESS' && inc.status !== 'WORKER_ACCEPTED') return false;
      if (statusFilter === 'COMPLETED' && inc.status !== 'COMPLETED' && inc.status !== 'WORK_COMPLETED' && inc.status !== 'RESOLVED') return false;
    }

    // Priority Filter
    const score = inc.priorityScore || inc.priority_score || 50;
    if (priorityFilter === 'CRITICAL' && score < 80) return false;
    if (priorityFilter === 'HIGH' && (score < 60 || score >= 80)) return false;
    if (priorityFilter === 'MEDIUM' && (score < 40 || score >= 60)) return false;
    if (priorityFilter === 'LOW' && score >= 40) return false;

    // Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      const caseId = (inc.caseId || inc.case_id || '').toLowerCase();
      const title = (inc.title || '').toLowerCase();
      const address = (inc.address || '').toLowerCase();
      if (!caseId.includes(q) && !title.includes(q) && !address.includes(q)) return false;
    }

    return true;
  });

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Assigned Jobs</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Department Isolation: Viewing complaints assigned strictly to{' '}
            <span className="font-extrabold text-orange-600">{workerInfo?.departmentName || 'your department'}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={fetchJobs}
            variant="outline"
            className="text-xs font-bold gap-2 rounded-xl h-10 border-slate-200"
          >
            <RefreshCw className="h-4 w-4 text-orange-500" />
            <span>Refresh Jobs</span>
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Case ID, title or address..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
            {['ALL', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Priority Select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-auto"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical (Score &ge; 80)</option>
            <option value="HIGH">High (60-79)</option>
            <option value="MEDIUM">Medium (40-59)</option>
            <option value="LOW">Low (&lt; 40)</option>
          </select>

        </div>
      </div>

      {/* JOBS LIST */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <div className="h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs font-bold">Loading department jobs...</span>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="py-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 space-y-3">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto" />
          <div className="font-black text-slate-800 text-sm">No Jobs Found Matching Criteria</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No complaints found for your department matching the selected filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIncidents.map((inc) => {
            const caseId = inc.caseId || inc.case_id || `CS-${inc.id.substring(0, 4)}`;
            const pScore = inc.priorityScore || inc.priority_score || 50;

            return (
              <div
                key={inc.id}
                className="p-5 rounded-3xl border border-slate-200 bg-white hover:border-orange-300 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                      {caseId}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] ${
                        inc.status === 'COMPLETED' || inc.status === 'WORK_COMPLETED' || inc.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inc.status === 'IN_PROGRESS' || inc.status === 'WORKER_ACCEPTED'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inc.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug line-clamp-2">{inc.title}</h3>

                  <div className="space-y-1 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <span className="line-clamp-1">{inc.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>Assigned: {formatDate(inc.createdAt || inc.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700">
                    Priority Score: <span className="font-black text-rose-600">{pScore}/100</span>
                  </div>

                  <Link href={`/worker/jobs/${inc.id}`}>
                    <Button size="sm" className="bg-slate-900 hover:bg-orange-600 text-white text-xs font-bold rounded-xl h-8 gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Job</span>
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
