'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, FileText, FilePlus, Search, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';

export default function MyReportsPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    try {
      const savedStr = localStorage.getItem('civicshield_my_reports');
      if (savedStr) {
        setReports(JSON.parse(savedStr));
      }
    } catch {
      setReports([]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-5 my-2 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-1">
            <Clock className="h-3.5 w-3.5" />
            <span>My Submissions</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">My Reports</h1>
          <p className="text-xs text-slate-400">Track complaints submitted from your device.</p>
        </div>
        <Link href="/report" className="w-full sm:w-auto">
          <Button size="md" variant="primary" className="w-full sm:w-auto min-h-[44px] font-bold text-xs rounded-xl">
            <FilePlus className="h-4 w-4 mr-1.5" /> Report an Issue
          </Button>
        </Link>
      </div>

      {/* Reports Mobile Cards or Clean Empty State */}
      {reports.length === 0 ? (
        <Card variant="glass" className="p-8 text-center space-y-4 shadow-xl border-slate-800 rounded-2xl">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <FileText className="h-7 w-7 text-slate-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No reports yet</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your submitted civic issue complaints will appear here as mobile cards.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/report">
              <Button size="lg" variant="primary" className="min-h-[48px] px-6 font-bold text-xs rounded-xl">
                <FilePlus className="h-4 w-4 mr-2" />
                Report your first civic issue
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((item: any, idx: number) => {
            const trackingTarget = `/track/${item.trackingCode || item.caseId}`;
            return (
              <Link key={idx} href={trackingTarget} className="block">
                <Card 
                  variant="glass" 
                  className="p-4 space-y-3 border-slate-800 hover:border-emerald-500/60 transition-all rounded-2xl cursor-pointer active:scale-[0.99]"
                >
                  {/* Top Row: Case ID & Issue Type */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-base font-extrabold text-emerald-400">{item.caseId}</span>
                    <span className="text-xs font-bold text-slate-200">
                      {item.category ? item.category.replace(/_/g, ' ') : 'Road / Pothole'}
                    </span>
                  </div>

                  {/* Date & Location / Context */}
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>Submitted {new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.priorityScore && <PriorityBadge score={item.priorityScore} />}
                  </div>

                  {/* Bottom Row: Status & Tap Arrow */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <StatusBadge status={item.status || 'SUBMITTED'} />
                    <div className="flex items-center text-xs font-semibold text-emerald-400 gap-0.5">
                      <span>View Details</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
