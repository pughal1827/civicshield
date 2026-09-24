'use client';

import React, { useEffect, useState } from 'react';
import { HardHat, User, Mail, Shield, Wrench, Building2, CheckCircle2, Award, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getWorkerAuthHeaders } from '@/lib/auth/worker-client';

export default function WorkerProfilePage() {
  const [workerInfo, setWorkerInfo] = useState<any>(null);

  useEffect(() => {
    fetch('/api/worker/incidents', {
      credentials: 'same-origin',
      headers: getWorkerAuthHeaders(),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setWorkerInfo(json.data.worker);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <User className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Worker Officer Profile</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Department field Operations Personnel Credentials
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-5 border-b border-slate-100 pb-6">
          <div className="h-20 w-20 rounded-3xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
            <HardHat className="h-10 w-10" />
          </div>

          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-black text-slate-900">{workerInfo?.fullName || 'Field Worker Officer'}</h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                ACTIVE
              </span>
            </div>
            <p className="text-xs font-extrabold text-orange-600">{workerInfo?.departmentName || 'Field Operations'}</p>
            <p className="text-xs text-slate-500 font-mono">ID: {workerInfo?.id || 'EMP-WORKER-2026'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-extrabold text-slate-400 block">Department Email</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{workerInfo?.email || 'worker@civicshield.gov'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-extrabold text-slate-400 block">Assigned Department</span>
            <span className="font-bold text-orange-600 text-sm">{workerInfo?.departmentName || workerInfo?.departmentCode}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-extrabold text-slate-400 block">Security Clearance</span>
            <span className="font-bold text-slate-900 text-sm">Level 2 Field Technician</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="font-extrabold text-slate-400 block">Verification Status</span>
            <span className="font-bold text-emerald-600 text-sm flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Official Municipal Field Staff
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
