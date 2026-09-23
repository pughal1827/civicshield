'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HardHat,
  ClipboardList,
  Wrench,
  Flame,
  CheckCircle2,
  MapPin,
  Clock,
  ArrowRight,
  Shield,
  RefreshCw,
  AlertTriangle,
  Building2,
  Eye,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWorkerAuthHeaders } from '@/lib/auth/worker-client';

interface WorkerIncident {
  id: string;
  caseId?: string;
  case_id?: string;
  title: string;
  summary?: string;
  category: string;
  severity: string;
  status: string;
  priorityScore?: number;
  priority_score?: number;
  address: string;
  createdAt?: string;
  created_at?: string;
  departmentName?: string;
}

export default function WorkerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [workerInfo, setWorkerInfo] = useState<any>(null);
  const [incidents, setIncidents] = useState<WorkerIncident[]>([]);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    assignedCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    highPriorityCount: 0,
  });

  const fetchWorkerDashboard = async () => {
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
          if (json.data.stats) {
            setStats(json.data.stats);
          }
        }
      }
    } catch (err) {
      console.error('Error loading worker dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkerDashboard();
  }, []);

  const formatDate = (isoStr?: string) => {
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

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-black">
            <HardHat className="h-3.5 w-3.5" />
            <span>CivicShield WORKER · {workerInfo?.departmentName || workerInfo?.departmentCode || 'Field Operations'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome, <span className="text-orange-400">{workerInfo?.fullName || 'Field Worker'}</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium">
            Department Isolation Active: Showing complaints strictly assigned to{' '}
            <strong className="text-orange-300 underline">{workerInfo?.departmentName || 'your department'}</strong>.
          </p>
        </div>

        <div className="z-10 flex items-center gap-3">
          <Button
            onClick={fetchWorkerDashboard}
            variant="outline"
            className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-bold rounded-xl gap-2 h-10"
          >
            <RefreshCw className="h-4 w-4 text-orange-400" />
            <span>Refresh Queue</span>
          </Button>

          <Link href="/worker/jobs">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold rounded-xl h-10 gap-2 shadow-lg shadow-orange-500/25">
              <span>View All Assigned Jobs</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold">Assigned Jobs</span>
            <ClipboardList className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.assignedCount || stats.totalAssigned}</div>
          <div className="text-[11px] font-bold text-slate-400">Strictly {workerInfo?.departmentName}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold">In Progress</span>
            <Wrench className="h-5 w-5 text-sky-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.inProgressCount}</div>
          <div className="text-[11px] font-bold text-sky-600">Active Field Work</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold">High Priority</span>
            <Flame className="h-5 w-5 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.highPriorityCount}</div>
          <div className="text-[11px] font-bold text-rose-600">Score &ge; 70</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold">Completed</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.completedCount}</div>
          <div className="text-[11px] font-bold text-emerald-600">Evidence Submitted</div>
        </div>
      </div>

      {/* MY ASSIGNED JOBS SECTION */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-black text-slate-900">MY ASSIGNED JOBS</h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Only {workerInfo?.departmentName || 'your department'} complaints appear here.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-extrabold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200">
            <Shield className="h-4 w-4" />
            <span>Backend Isolated Queue</span>
          </div>
        </div>

        {/* JOBS GRID */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <div className="h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <span className="text-xs font-bold">Loading department complaints...</span>
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <div className="font-extrabold text-slate-800 text-sm">No Active Jobs for {workerInfo?.departmentName}</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All assigned complaints for your department have been resolved or no new issues are assigned yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incidents.map((inc) => {
              const caseId = inc.caseId || inc.case_id || `CS-${inc.id.substring(0, 4)}`;
              const pScore = inc.priorityScore || inc.priority_score || 50;

              return (
                <div
                  key={inc.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-orange-300 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    
                    {/* Top Row: Case ID & Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                        {caseId}
                      </span>

                      <span
                        className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] ${
                          inc.status === 'COMPLETED' || inc.status === 'WORK_COMPLETED' || inc.status === 'RESOLVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : inc.status === 'IN_PROGRESS' || inc.status === 'WORKER_ACCEPTED'
                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {inc.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                      {inc.title}
                    </h3>

                    {/* Meta info */}
                    <div className="space-y-1.5 text-xs text-slate-600 pt-1">
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

                  {/* Bottom Bar: Priority Score & View Button */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-700">
                      Priority: <span className="font-black text-rose-600">{pScore}/100</span>
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

    </div>
  );
}
