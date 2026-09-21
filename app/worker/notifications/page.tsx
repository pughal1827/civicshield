'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, HardHat, CheckCircle2, ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WorkerNotificationsPage() {
  const [workerInfo, setWorkerInfo] = useState<any>(null);

  useEffect(() => {
    fetch('/api/worker/incidents')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setWorkerInfo(json.data.worker);
        }
      })
      .catch(() => {});
  }, []);

  const deptName = workerInfo?.departmentName || 'Your Department';

  const notifications = [
    {
      id: 'notif-case-001',
      title: `🔔 Job Notification for ${deptName}`,
      message: `Case CASE-001 (Deep Pothole Asphalt Repair) is assigned to ${deptName}.`,
      time: 'Just now',
      unread: true,
      href: '/worker/jobs/inc-case-001',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Department Job Notifications</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Notifications filtered strictly for <span className="font-extrabold text-orange-600">{deptName}</span> workers.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              n.unread
                ? 'bg-orange-50/60 border-orange-200 shadow-xs'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900">
                {n.unread && <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />}
                <span>{n.title}</span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{n.message}</p>
              <div className="text-[10px] text-slate-400 font-bold">{n.time}</div>
            </div>

            <Link href={n.href}>
              <Button size="sm" className="bg-slate-900 hover:bg-orange-600 text-white text-xs font-bold rounded-xl h-9 gap-1.5 shrink-0">
                <span>View Job</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
