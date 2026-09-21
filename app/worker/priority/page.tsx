'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, MapPin, Clock, Eye, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WorkerPriorityJobsPage() {
  const [loading, setLoading] = useState(true);
  const [workerInfo, setWorkerInfo] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);

  const fetchPriorityJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/worker/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWorkerInfo(json.data.worker);
          const all = json.data.incidents || [];
          // Filter priority >= 60
          setIncidents(all.filter((i: any) => (i.priorityScore || i.priority_score || 0) >= 60));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriorityJobs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-rose-500" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">High Priority Jobs</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Urgent complaints for <span className="font-extrabold text-orange-600">{workerInfo?.departmentName || 'your department'}</span> requiring immediate field dispatch.
          </p>
        </div>

        <Button onClick={fetchPriorityJobs} variant="outline" className="text-xs font-bold gap-2 rounded-xl h-10 border-slate-200">
          <RefreshCw className="h-4 w-4 text-orange-500" />
          <span>Refresh</span>
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <div className="h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <span className="text-xs font-bold">Loading priority jobs...</span>
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 space-y-3">
          <Flame className="h-10 w-10 text-slate-300 mx-auto" />
          <div className="font-black text-slate-800 text-sm">No High Priority Jobs Currently Pending</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All urgent complaints for {workerInfo?.departmentName} are managed or under resolution.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {incidents.map((inc) => {
            const caseId = inc.caseId || inc.case_id || `CS-${inc.id.substring(0, 4)}`;
            const pScore = inc.priorityScore || inc.priority_score || 50;

            return (
              <div key={inc.id} className="p-5 rounded-3xl border-2 border-rose-200 bg-rose-50/30 hover:border-rose-400 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-200">
                    {caseId}
                  </span>
                  <span className="text-xs font-black text-rose-600 bg-rose-100 px-2.5 py-0.5 rounded-full">
                    Priority: {pScore}/100
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 leading-snug">{inc.title}</h3>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span className="line-clamp-1">{inc.address}</span>
                </div>

                <div className="pt-2 flex justify-end">
                  <Link href={`/worker/jobs/${inc.id}`}>
                    <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl h-8 gap-1.5 shadow-md">
                      <Eye className="h-3.5 w-3.5" />
                      <span>Dispatch & View Job</span>
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
