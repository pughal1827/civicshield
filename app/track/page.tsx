'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Key, Clock, ChevronRight, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function PublicTrackPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [savedReports, setSavedReports] = useState<any[]>([]);

  useEffect(() => {
    try {
      const savedStr = localStorage.getItem('civicshield_my_reports');
      if (savedStr) {
        setSavedReports(JSON.parse(savedStr));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('Please enter a Case ID or tracking code.');
      return;
    }
    setErrorMsg('');
    router.push(`/track/${encodeURIComponent(code.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 p-4 sm:p-6 lg:p-8 max-w-xl mx-auto space-y-5 my-2 pb-24">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
          <Search className="h-3.5 w-3.5" />
          <span>Case Tracking</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Track a Report</h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Check real-time municipal resolution progress.
        </p>
      </div>

      {/* Lookup Form */}
      <Card className="p-5 sm:p-6 space-y-4 bg-white border-slate-200 shadow-sm rounded-2xl">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Enter Case ID:
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Enter Case ID (e.g. CS-4821)..."
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className="pl-10 h-12 text-sm bg-slate-50 border-slate-200 rounded-xl focus:bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>
            {errorMsg && (
              <p className="text-xs text-rose-600 flex items-center gap-1 pt-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5" /> {errorMsg}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" variant="primary" className="w-full min-h-[50px] font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs">
            <Search className="h-4 w-4 mr-2" />
            Track Report
          </Button>
        </form>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
          <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>Your Case ID is displayed when you submit a report or listed in My Reports.</span>
        </div>
      </Card>

      {/* Saved Reports (Local History Cards) */}
      {savedReports.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Recent Reports on Device
          </h3>

          <div className="space-y-2">
            {savedReports.slice(0, 5).map((item: any, idx: number) => (
              <Link key={idx} href={`/track/${item.trackingCode || item.caseId}`}>
                <div className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between transition-colors shadow-xs min-h-[44px]">
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{item.caseId}</span>
                    <p className="text-[11px] text-slate-500 pt-1">
                      {item.category?.replace(/_/g, ' ') || 'Civic Issue'} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
