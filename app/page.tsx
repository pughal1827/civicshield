'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FilePlus, 
  Search, 
  Shield, 
  Clock,
  MapPin,
  Bell,
  User,
  ChevronRight,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';

export default function LandingPage() {
  const [nearbyIssues, setNearbyIssues] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          setCurrentUser(json.data.user);
        }
      })
      .catch(() => {});

    fetch('/api/citizen/nearby')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data?.issues)) {
          setNearbyIssues(json.data.issues.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 pb-24 md:pb-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 pt-4 sm:pt-8">
      
      {/* Top Mobile Bar Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 shadow-sm">
            <Shield className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">CivicShield</h1>
            <p className="text-[11px] text-slate-400">Public Civic Service</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/citizen/notifications">
            <Button size="sm" variant="outline" className="h-11 w-11 p-0 rounded-xl border-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Notifications">
              <Bell className="h-4 w-4 text-slate-300" />
            </Button>
          </Link>
          <Link href={currentUser ? '/citizen/profile' : '/login'}>
            <Button size="sm" variant="outline" className="h-11 w-11 p-0 rounded-xl border-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Profile">
              <User className="h-4 w-4 text-emerald-400" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Action Hero Section */}
      <section className="space-y-6 text-center py-4 sm:py-6">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Report a Civic Problem
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
            Direct municipal hazard reporting. Take a photo, pin your location, and notify repair crews immediately.
          </p>
        </div>

        {/* Visually Dominant Primary Report Button */}
        <div className="pt-2">
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
        </div>

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
              <Search className="h-4 w-4 text-cyan-400" />
              <span>Track a complaint</span>
            </Button>
          </Link>
        </div>

        {/* Quick Action Navigation Pills */}
        <div className="flex items-center justify-center gap-2 pt-2 text-xs">
          <Link href="/citizen/nearby">
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold flex items-center gap-2 hover:border-slate-700 min-h-[44px]">
              <MapPin className="h-4 w-4 text-amber-400" />
              <span>📍 Nearby Issues</span>
            </div>
          </Link>
          <Link href="/citizen/notifications">
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold flex items-center gap-2 hover:border-slate-700 min-h-[44px]">
              <Bell className="h-4 w-4 text-cyan-400" />
              <span>🔔 Notifications</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Nearby Civic Issues Preview with Clean Empty State */}
      <section className="space-y-3 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-400" />
            <span>Nearby Civic Hazards</span>
          </h3>
          <Link href="/citizen/nearby" className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1">
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {nearbyIssues.length > 0 ? (
          <div className="space-y-3">
            {nearbyIssues.map((issue) => (
              <Card key={issue.id} variant="glass" className="p-4 space-y-2.5 border-slate-800 hover:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-200">{issue.category ? issue.category.replace(/_/g, ' ') : 'Civic Issue'}</span>
                  {issue.priorityScore && <PriorityBadge score={issue.priorityScore} />}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{issue.description}</p>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>{issue.addressText || 'Local Zone'}</span>
                  </span>
                  <StatusBadge status={issue.status || 'SUBMITTED'} />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card variant="glass" className="p-6 text-center space-y-3 border-slate-800">
            <div className="mx-auto h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <FileText className="h-6 w-6 text-slate-500" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">No nearby issues found</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Be the first to report a civic issue in your area.
              </p>
            </div>
          </Card>
        )}
      </section>

      {/* Trust Guarantee Note */}
      <div className="text-center pt-4 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Verified Municipal Resolution Workflow</span>
        </div>
      </div>

    </div>
  );
}
