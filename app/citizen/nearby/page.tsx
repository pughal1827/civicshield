'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, ArrowLeft, AlertTriangle, FilePlus, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { LoadingState } from '@/components/ui/loading-state';

export default function NearbyIssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/citizen/nearby')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.issues)) {
          setIssues(json.data.issues);
        }
      })
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 my-2 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 bg-white p-5 rounded-2xl shadow-sm border">
        <div className="space-y-1">
          <Link href="/citizen" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 mb-1 font-medium">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Portal</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-amber-500" />
            Problems Near You
          </h1>
          <p className="text-xs text-slate-500">
            Public community hazard feed. Check reported issues in your area.
          </p>
        </div>
        <Badge variant="amber" className="self-start sm:self-auto">Public Feed ({issues.length})</Badge>
      </div>

      <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs text-slate-700 space-y-1 shadow-xs">
        <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px] uppercase tracking-wider">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Public Privacy Protection
        </div>
        <p className="text-[11px] leading-relaxed text-slate-600">
          Displays safe public information only (Category, General Area, Status, and Priority level). Citizen identities and tracking codes are strictly protected.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <LoadingState message="Loading nearby community issues..." />
        </div>
      ) : issues.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center space-y-4 shadow-sm border-slate-200 bg-white rounded-2xl">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">No nearby issues found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no public civic issues registered in your area yet.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/report">
              <Button size="md" variant="primary" className="min-h-[44px] px-6 font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                <FilePlus className="h-4 w-4 mr-2" />
                Report an Issue
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issues.map((issue) => (
            <Card key={issue.id} className="p-5 space-y-3 bg-white border-slate-200 hover:border-emerald-300 transition-all shadow-sm rounded-2xl">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">{issue.caseId}</span>
                  <span className="text-xs font-bold text-slate-800">
                    {issue.category ? issue.category.replace('_', ' ') : 'Civic Issue'}
                  </span>
                </div>
                <PriorityBadge score={issue.priorityScore || 50} />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-800 font-semibold">{issue.title}</p>
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">{issue.address}</span>
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <StatusBadge status={issue.status} />
                  <span className="text-[10px] text-slate-500 font-mono font-medium">
                    {issue.reportCount || 1} citizen report(s)
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
