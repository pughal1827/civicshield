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
    <div className="min-h-screen bg-slate-50/50 text-slate-900 p-4 sm:p-6 lg:p-8 max-w-xl mx-auto space-y-5 my-2 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 bg-white p-5 rounded-2xl shadow-sm border">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-1">
            <Bell className="h-3.5 w-3.5" />
            <span>Updates</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-xs text-slate-500">Status alerts for your civic reports.</p>
        </div>
        <Badge variant="emerald">{notifications.length}</Badge>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <LoadingState message="Loading updates..." />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-8 text-center space-y-4 shadow-sm border-slate-200 bg-white rounded-2xl">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Check className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No notifications</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              You will receive status update cards here when your civic reports are assigned, in progress, or fixed.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className="p-4 space-y-2.5 bg-white border-slate-200 hover:border-emerald-300 transition-all rounded-2xl shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {notif.type === 'success' || notif.title?.includes('Resolved') ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-cyan-600" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 text-xs block">{notif.title}</span>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Your report <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">{notif.caseId}</span> is now {notif.statusName || 'In Progress'}.
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block pt-0.5">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Link href={`/track/${notif.caseId}`}>
                  <Button size="sm" variant="outline" className="text-xs shrink-0 border-slate-200 text-slate-700 hover:bg-slate-50 min-h-[38px] px-3 rounded-xl">
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
