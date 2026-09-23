'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WorkerSidebar } from './worker-sidebar';
import { WorkerTopbar } from './worker-topbar';
import { getStoredWorkerUser, getWorkerAuthHeaders, setStoredWorker } from '@/lib/auth/worker-client';

interface WorkerLayoutProps {
  children: React.ReactNode;
}

export function WorkerLayout({ children }: WorkerLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [workerUser, setWorkerUser] = useState<any>(() => getStoredWorkerUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pathname === '/worker/login') return;

    const stored = getStoredWorkerUser();
    if (stored) {
      setWorkerUser(stored);
    }

    fetch('/api/auth/me', {
      credentials: 'same-origin',
      headers: getWorkerAuthHeaders(),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          const user = json.data.user;
          if (user.role === 'WORKER') {
            setWorkerUser(user);
            setStoredWorker(user);
          } else {
            // Not a worker - redirect to worker login
            router.push('/worker/login');
          }
        } else if (stored && stored.role === 'WORKER') {
          setWorkerUser(stored);
        } else {
          // Fallback demo worker context for development if session cookie not present
          const defaultWorker = {
            id: 'user-worker-road-001',
            email: 'road.worker@civicshield.demo',
            fullName: 'Alex Rivera (Road Maintenance Lead)',
            departmentCode: 'ROAD_MAINT',
            departmentName: 'Road Maintenance',
            role: 'WORKER',
          };
          setWorkerUser(defaultWorker);
          setStoredWorker(defaultWorker);
        }
      })
      .catch(() => {
        if (stored && stored.role === 'WORKER') {
          setWorkerUser(stored);
        } else {
          const defaultWorker = {
            id: 'user-worker-road-001',
            email: 'road.worker@civicshield.demo',
            fullName: 'Alex Rivera (Road Maintenance Lead)',
            departmentCode: 'ROAD_MAINT',
            departmentName: 'Road Maintenance',
            role: 'WORKER',
          };
          setWorkerUser(defaultWorker);
          setStoredWorker(defaultWorker);
        }
      })
      .finally(() => setLoading(false));
  }, [router, pathname]);

  if (pathname === '/worker/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <div className="hidden md:block">
        <WorkerSidebar
          workerName={workerUser?.fullName}
          departmentName={workerUser?.departmentName || workerUser?.departmentCode}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <WorkerTopbar
          workerName={workerUser?.fullName}
          departmentName={workerUser?.departmentName || workerUser?.departmentCode}
        />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
