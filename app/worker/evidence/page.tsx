'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Camera, CheckCircle2, Shield, Eye, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WorkerEvidencePage() {
  const [loading, setLoading] = useState(true);
  const [workerInfo, setWorkerInfo] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/worker/incidents')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setWorkerInfo(json.data.worker);
          setIncidents(json.data.incidents || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">On-Ground Evidence Vault</h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Proof of resolution submitted for <span className="font-extrabold text-orange-600">{workerInfo?.departmentName || 'your department'}</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {incidents.map((inc) => {
          const caseId = inc.caseId || inc.case_id || `CS-${inc.id.substring(0, 4)}`;

          return (
            <div key={inc.id} className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                  {caseId}
                </span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {inc.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="font-black text-slate-900 text-sm line-clamp-1">{inc.title}</div>

              {/* Photo Evidence */}
              <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                <Image
                  src={inc.imageUrl || '/images/officer_command.jpg'}
                  alt="Proof photo"
                  fill
                  className="object-cover"
                />
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span className="line-clamp-1">{inc.address}</span>
                </div>
              </div>

              <Link href={`/worker/jobs/${inc.id}`} className="block">
                <Button className="w-full bg-slate-900 hover:bg-orange-600 text-white text-xs font-bold rounded-xl h-9 gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  <span>View Evidence Record</span>
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
