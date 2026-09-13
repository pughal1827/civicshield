'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check initial online status
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
    }

    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full bg-amber-950/95 border-b border-amber-800/80 text-amber-200 px-4 py-2.5 backdrop-blur-md shadow-lg transition-all animate-in slide-in-from-top-2 duration-200"
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <WifiOff className="h-4 w-4 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-amber-300">You're offline — </span>
            <span>Check your internet connection before submitting a report.</span>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-amber-400 hover:text-amber-200 hover:bg-amber-900/50 transition-colors"
          aria-label="Dismiss offline banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
