import React from 'react';
import { LoadingState } from '@/components/ui/loading-state';

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <LoadingState message="Initializing CivicShield AI..." />
    </div>
  );
}
