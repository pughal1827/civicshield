'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FilePlus, 
  Clock, 
  Bell, 
  User, 
  ChevronRight, 
  MapPin,
  Shield,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';

export default function CitizenDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          setCurrentUser(json.data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null));

    try {
      const savedStr = localStorage.getItem('civicshield_my_reports');
      const savedArr = savedStr ? JSON.parse(savedStr) : [];
      setReports(savedArr);
    } catch {
      setReports([]);
    }
  }, []);

  const activeCount = reports.filter((r) => r.status !== 'VERIFIED').length;
  const resolvedCount = reports.filter((r) => r.status === 'RESOLVED' || r.status === 'VERIFIED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-24">
      {/* Top Mobile Bar Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 shadow-sm">
            <Shield className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">
              Hello, {currentUser?.fullName ? currentUser.fullName.split(' ')[0] : 'Citizen'}
            </h1>
            <p className="text-[11px] text-slate-400">Citizen Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/citizen/notifications">
            <Button size="sm" variant="outline" className="h-11 w-11 p-0 rounded-xl border-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Notifications">
              <Bell className="h-4 w-4 text-slate-300" />
            </Button>
          </Link>
          <Link href="/citizen/profile">
            <Button size="sm" variant="outline" className="h-11 w-11 p-0 rounded-xl border-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Profile">
              <User className="h-4 w-4 text-emerald-400" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Action Banner */}
      <section className="space-y-4 text-center py-2">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">Report a Civic Problem</h2>
          <p className="text-xs text-slate-400">Track your reported complaints and verify municipal fixes.</p>
        </div>

        {/* Visually Dominant Report Button */}
        <Link href="/report" className="block w-full">
          <Button 
            size="lg" 
            variant="primary" 
            className="w-full min-h-[56px] text-base font-extrabold shadow-xl shadow-emerald-950/80 rounded-2xl gap-2 flex items-center justify-center border-2 border-emerald-400/30"
          >
            <FilePlus className="h-5 w-5" />
            <span>📷 Report an Issue</span>
          </Button>
        </Link>

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link href="/my-reports" className="w-full">
            <Button size="md" variant="outline" className="w-full min-h-[48px] text-xs font-semibold border-slate-800 rounded-xl gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>See your reports</span>
            </Button>
          </Link>
          <Link href="/track" className="w-full">
            <Button size="md" variant="outline" className="w-full min-h-[48px] text-xs font-semibold border-slate-800 rounded-xl gap-2">
              <MapPin className="h-4 w-4 text-amber-400" />
              <span>Track a complaint</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Card variant="glass" className="p-4 space-y-1 border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium">Active Reports</span>
          <p className="text-2xl font-extrabold text-white">{activeCount}</p>
        </Card>
        <Card variant="glass" className="p-4 space-y-1 border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium">Resolved Reports</span>
          <p className="text-2xl font-extrabold text-emerald-400">{resolvedCount}</p>
        </Card>
      </div>

      {/* Recent Reports List with Clean Empty State */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Your Recent Reports</h3>
          {reports.length > 0 && (
            <Link href="/my-reports" className="text-xs text-emerald-400 font-semibold hover:underline">
              View All →
            </Link>
          )}
        </div>

        {reports.length === 0 ? (
          <Card variant="glass" className="p-6 text-center space-y-3 border-slate-800">
            <div className="mx-auto h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <FileText className="h-6 w-6 text-slate-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">No reports submitted yet</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Report a civic issue or hazard in your area to get started.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.slice(0, 4).map((report, idx) => (
              <Card key={idx} variant="glass" className="p-4 space-y-2.5 border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-emerald-400 text-xs">{report.caseId}</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {report.category ? report.category.replace(/_/g, ' ') : 'Civic Issue'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  <StatusBadge status={report.status || 'SUBMITTED'} />
                  <Link href={`/track/${report.trackingCode || report.caseId}`}>
                    <Button size="sm" variant="outline" className="text-xs gap-1 border-slate-700 min-h-[38px] px-3">
                      <span>Track</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
