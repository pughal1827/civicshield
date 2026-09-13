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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 my-4 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <Link href="/citizen" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 mb-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Portal</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-amber-400" />
            Problems Near You
          </h1>
          <p className="text-xs text-slate-400">
            Public community hazard feed. Check reported issues in your area.
          </p>
        </div>
        <Badge variant="amber">Public Feed ({issues.length})</Badge>
      </div>

      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px] uppercase tracking-wider">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          Public Privacy Protection
        </div>
        <p className="text-[11px] leading-relaxed">
          Displays safe public information only (Category, General Area, Status, and Priority level). Citizen identities and secret tracking codes are strictly protected.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <LoadingState message="Loading nearby community issues..." />
        </div>
      ) : issues.length === 0 ? (
        <Card variant="glass" className="p-8 sm:p-12 text-center space-y-4 shadow-xl border-slate-800">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <FileText className="h-8 w-8 text-slate-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No nearby issues found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no public civic issues registered in your area yet.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/report">
              <Button size="md" variant="primary" className="min-h-[44px] px-6 font-bold">
                <FilePlus className="h-4 w-4 mr-2" />
                Report an Issue
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {issues.map((issue) => (
            <Card key={issue.id} variant="glass" className="p-4 space-y-3 border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-400 text-sm">{issue.caseId}</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {issue.category ? issue.category.replace('_', ' ') : 'Civic Issue'}
                  </span>
                </div>
                <PriorityBadge score={issue.priorityScore || 50} />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-300 font-medium">{issue.title}</p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                  <span className="truncate">{issue.address}</span>
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                <div className="flex items-center gap-2">
                  <StatusBadge status={issue.status} />
                  <span className="text-[10px] text-slate-500 font-mono">
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
