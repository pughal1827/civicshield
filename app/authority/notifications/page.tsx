'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ShieldAlert, AlertTriangle, Clock, CheckCircle2, Eye, RefreshCw } from 'lucide-react';
import { LoadingState } from '@/components/ui/loading-state';

interface NotificationAlert {
  id: string;
  incidentId: string;
  caseId: string;
  title: string;
  type: 'CRITICAL_NEW' | 'UNASSIGNED_HIGH' | 'SLA_LATE' | 'AI_CHECK_PENDING';
  message: string;
  timestamp: string;
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);

  const fetchNotifications = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.incidents)) {
          const list = json.data.incidents;
          const alertsList: NotificationAlert[] = [];

          list.forEach((inc: any) => {
            const caseId = inc.case_id || inc.caseId || 'CS-1042';

            if (inc.severity === 'CRITICAL' || inc.priorityScore >= 80) {
              alertsList.push({
                id: `alert-crit-${inc.id}`,
                incidentId: inc.id,
                caseId,
                title: inc.title,
                type: 'CRITICAL_NEW',
                message: `Critical priority complaint requires immediate officer verification.`,
                timestamp: inc.created_at || inc.createdAt,
              });
            }

            if ((inc.status === 'SUBMITTED' || inc.status === 'AI_ANALYSED') && inc.severity === 'HIGH') {
              alertsList.push({
                id: `alert-unassigned-${inc.id}`,
                incidentId: inc.id,
                caseId,
                title: inc.title,
                type: 'UNASSIGNED_HIGH',
                message: `High priority case unassigned. Department allocation required.`,
                timestamp: inc.created_at || inc.createdAt,
              });
            }

            if (inc.status === 'SUBMITTED') {
              alertsList.push({
                id: `alert-aicheck-${inc.id}`,
                incidentId: inc.id,
                caseId,
                title: inc.title,
                type: 'AI_CHECK_PENDING',
                message: `AI analysis ready for officer cross-check.`,
                timestamp: inc.created_at || inc.createdAt,
              });
            }
          });

          setAlerts(alertsList.slice(0, 15));
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-sky-100 text-sky-700 tracking-wider">
            Alerts & Notifications Feed
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Bell className="h-7 w-7 text-sky-600" /> Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time operational alerts for critical complaints, unassigned cases, and AI verifications.
          </p>
        </div>

        <button
          onClick={fetchNotifications}
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Alerts
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <LoadingState message="Fetching notifications..." />
      ) : alerts.length === 0 ? (
        <div className="bg-emerald-50 p-8 text-center rounded-2xl border border-emerald-200 text-emerald-950 space-y-2">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold">All Clear! No Active Alerts</h3>
          <p className="text-xs text-emerald-700 max-w-md mx-auto">
            There are no urgent notifications pending your review at this moment.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((item) => (
            <div
              key={item.id}
              className={`p-4 bg-white rounded-2xl border transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                item.type === 'CRITICAL_NEW'
                  ? 'border-rose-200 bg-rose-50/30'
                  : item.type === 'UNASSIGNED_HIGH'
                  ? 'border-amber-200 bg-amber-50/30'
                  : 'border-slate-200/80'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="mt-0.5 shrink-0">
                  {item.type === 'CRITICAL_NEW' ? (
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                  ) : item.type === 'UNASSIGNED_HIGH' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-sky-600" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-700">#{item.caseId}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        item.type === 'CRITICAL_NEW'
                          ? 'bg-rose-100 text-rose-700'
                          : item.type === 'UNASSIGNED_HIGH'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-sky-100 text-sky-700'
                      }`}
                    >
                      {item.type.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{item.title}</h4>
                  <p className="text-xs text-slate-600">{item.message}</p>
                  <span className="text-[10px] text-slate-400 font-mono block pt-1">
                    Timestamp: {formatExactDate(item.timestamp)}
                  </span>
                </div>
              </div>

              <div className="shrink-0 self-end sm:self-center">
                <Link href={`/authority/complaints/${item.incidentId}`}>
                  <button className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> View →
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
