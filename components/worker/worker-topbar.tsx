'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HardHat, Wrench, UserCheck, LogOut, Bell, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkerTopbarProps {
  workerName?: string;
  departmentName?: string;
  unreadCount?: number;
}

import { clearStoredWorker } from '@/lib/auth/worker-client';

export function WorkerTopbar({
  workerName = 'Field Worker',
  departmentName = 'Department Operations',
  unreadCount = 2,
}: WorkerTopbarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    clearStoredWorker();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/worker/login');
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left Header Title */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
            <HardHat className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900 tracking-tight">CivicShield WORKER</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                {departmentName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Field Operations Portal · Task Management</p>
          </div>
        </div>

        {/* Right Worker Info & Actions */}
        <div className="flex items-center gap-4">
          
          <Link href="/worker/notifications" className="relative p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </Link>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <UserCheck className="h-4 w-4 text-orange-600 shrink-0" />
            <div>
              <div className="font-extrabold text-slate-900 leading-none">{workerName}</div>
              <div className="text-[10px] font-semibold text-slate-500 leading-none mt-0.5">{departmentName}</div>
            </div>
          </div>

          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold gap-1.5 rounded-xl h-9"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>

        </div>

      </div>
    </header>
  );
}
