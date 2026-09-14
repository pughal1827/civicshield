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
    <div className="min-h-screen bg-slate-50/50 text-slate-900 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6 my-2 pb-24">
      <Link href="/citizen" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 mb-2 font-medium">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Citizen Portal</span>
      </Link>

      <Card className="p-6 sm:p-8 space-y-6 border-slate-200 bg-white shadow-sm text-center rounded-2xl">
        <Badge variant="emerald">Citizen Report View</Badge>
        <h1 className="text-2xl font-extrabold text-slate-900">Report Case {id}</h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          To view the complete real-time vertical tracking timeline and resolution evidence for this report, use the public tracking portal.
        </p>

        <div className="pt-2 flex justify-center">
          <Link href={`/track/${id}`}>
            <Button size="md" variant="primary" className="px-6 min-h-[44px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              <Search className="h-4 w-4 mr-2" />
              Open Tracking Timeline
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
