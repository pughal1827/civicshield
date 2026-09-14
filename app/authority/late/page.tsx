'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Eye, RefreshCw, CheckCircle2, MapPin } from 'lucide-react';
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

export default function LateComplaintsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);

  const fetchLateIncidents = async () => {
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
      console.error('Error fetching late complaints:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLateIncidents();
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

  const calculateHoursLate = (createdAtStr: string, severity: string) => {
    const createdTime = new Date(createdAtStr).getTime();
    const hoursElapsed = (Date.now() - createdTime) / (1000 * 3600);
    const targetHours = severity === 'CRITICAL' ? 4 : severity === 'HIGH' ? 24 : 72;
    return Math.max(0, Math.floor(hoursElapsed - targetHours));
  };

  const lateComplaintsList = incidents.filter((inc) => {
    const isUnsolved = inc.status !== 'RESOLVED' && inc.status !== 'VERIFIED';
    const createdTime = new Date(inc.createdAt).getTime();
    const hoursElapsed = (Date.now() - createdTime) / (1000 * 3600);
    return (
      isUnsolved &&
      ((inc.severity === 'CRITICAL' && hoursElapsed > 4) ||
        (inc.severity === 'HIGH' && hoursElapsed > 24) ||
        hoursElapsed > 72)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-purple-100 text-purple-700 tracking-wider">
            SLA Overdue Tracking
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Clock className="h-7 w-7 text-purple-600" /> Late Complaints Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complaints where the allowed resolution time has passed. Urgent officer follow-up required.
          </p>
        </div>

        <button
          onClick={fetchLateIncidents}
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-purple-600 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Overdue Queue
        </button>
      </div>

      {/* Late Complaints List */}
      {loading ? (
        <LoadingState message="Checking SLA late complaints..." />
      ) : lateComplaintsList.length === 0 ? (
        <div className="bg-emerald-50 p-8 text-center rounded-2xl border border-emerald-200 text-emerald-950 space-y-2">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold">No Late Complaints!</h3>
          <p className="text-xs text-emerald-700 max-w-md mx-auto">
            All active complaints in your area are currently within their SLA target response limits. High performance!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lateComplaintsList.map((inc) => {
            const hoursLate = calculateHoursLate(inc.createdAt, inc.severity);
            return (
              <div
                key={inc.id}
                className="bg-white p-5 rounded-2xl border border-purple-200/80 hover:border-purple-400 transition-all shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
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
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        #{inc.caseId}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-600 text-white">
                        LATE ({hoursLate}h Overdue)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700">
                        {inc.severity || 'HIGH'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">{inc.title}</h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium pt-0.5">
                      <span className="flex items-center gap-1 text-slate-700 font-semibold truncate">
                        <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                        {inc.address || 'Gummidipoondi Main Rd'}
                      </span>
                      <span>•</span>
                      <span className="text-purple-700 font-bold">{inc.departmentName || 'Road Maintenance'}</span>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
