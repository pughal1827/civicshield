'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user already dismissed in this session
      const dismissed = sessionStorage.getItem('civicshield_pwa_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('civicshield_pwa_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:max-w-sm z-40 bg-slate-900/95 border border-emerald-500/40 p-4 rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 text-white shadow-md">
            <Shield className="h-5 w-5 fill-current" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white">Install CivicShield AI</h4>
            <p className="text-[11px] text-slate-300 leading-tight">
              Add to home screen for fast mobile reporting and instant tracking.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-200 p-1"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleDismiss}
          className="text-xs min-h-[36px] border-slate-800"
        >
          Not now
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={handleInstallClick}
          className="text-xs min-h-[36px] font-bold px-4 bg-emerald-600 hover:bg-emerald-500"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Install App
        </Button>
      </div>
    </div>
  );
};
