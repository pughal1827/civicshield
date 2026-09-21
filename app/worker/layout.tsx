import React from 'react';
import { WorkerLayout } from '@/components/worker/worker-layout';

export const metadata = {
  title: 'CivicShield AI | Department Worker Portal',
  description: 'Department Field Operations & Complaint Resolution Platform',
};

export default function WorkerRootLayout({ children }: { children: React.ReactNode }) {
  return <WorkerLayout>{children}</WorkerLayout>;
}
