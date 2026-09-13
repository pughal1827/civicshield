'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCircle2, Clock, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';

export default function CitizenNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/citizen/notifications')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.notifications) {
          setNotifications(json.data.notifications);
        }
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-xl mx-auto space-y-5 my-2 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-1">
            <Bell className="h-3.5 w-3.5" />
            <span>Updates</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Notifications</h1>
          <p className="text-xs text-slate-400">Simple status alerts for your civic reports.</p>
        </div>
        <Badge variant="cyan">{notifications.length}</Badge>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <LoadingState message="Loading updates..." />
        </div>
      ) : notifications.length === 0 ? (
        <Card variant="glass" className="p-8 text-center space-y-4 shadow-xl border-slate-800 rounded-2xl">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
            <Check className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No notifications</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              You will receive status update cards here when your civic reports are assigned, in progress, or fixed.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              variant="glass"
              className="p-4 space-y-2.5 border-slate-800 hover:border-slate-700 transition-colors rounded-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {notif.type === 'success' || notif.title?.includes('Resolved') ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <Clock className="h-5 w-5 text-cyan-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-white text-xs block">{notif.title}</span>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      Your report <span className="font-mono text-emerald-400 font-bold">{notif.caseId}</span> is now {notif.statusName || 'In Progress'}.
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono block pt-0.5">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Link href={`/track/${notif.caseId}`}>
                  <Button size="sm" variant="outline" className="text-xs shrink-0 border-slate-700 min-h-[38px] px-3 rounded-xl">
                    View
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
