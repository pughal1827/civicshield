'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { WorkerSidebar } from './worker-sidebar';
import { WorkerTopbar } from './worker-topbar';

interface WorkerLayoutProps {
  children: React.ReactNode;
}

export function WorkerLayout({ children }: WorkerLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [workerUser, setWorkerUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  if (pathname === '/worker/login') {
    return <>{children}</>;
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          const user = json.data.user;
          if (user.role === 'WORKER') {
            setWorkerUser(user);
          } else {
            // Not a worker - redirect to worker login
            router.push('/worker/login');
          }
        } else {
          // Fallback demo worker context for development if session cookie not present
          setWorkerUser({
            fullName: 'Alex Rivera (Road Maintenance Lead)',
            departmentName: 'Road Maintenance',
            role: 'WORKER',
          });
        }
      })
      .catch(() => {
        setWorkerUser({
          fullName: 'Alex Rivera (Road Maintenance Lead)',
          departmentName: 'Road Maintenance',
          role: 'WORKER',
        });
      })
      .finally(() => setLoading(false));
  }, [router]);

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
