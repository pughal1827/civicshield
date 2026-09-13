'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Search, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { PriorityBadge } from '@/components/ui/priority-badge';

export default function CitizenReportDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6 my-4">
      <Link href="/citizen" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 mb-2">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Citizen Workspace</span>
      </Link>

      <Card variant="glass" className="p-6 sm:p-8 space-y-6 border-slate-800 shadow-2xl text-center">
        <Badge variant="emerald">Citizen Report View</Badge>
        <h1 className="text-2xl font-bold text-white">Report Case {id}</h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          To view the complete real-time vertical tracking timeline and resolution evidence for this report, use the public tracking portal.
        </p>

        <div className="pt-2 flex justify-center">
          <Link href={`/track/${id}`}>
            <Button size="md" variant="primary" className="px-6 min-h-[44px] font-bold">
              <Search className="h-4 w-4 mr-2" />
              Open Tracking Timeline
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
