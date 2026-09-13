'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ToastProps {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastProps> = ({ id, type, title, message, onDismiss }) => {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
    error: <XCircle className="h-5 w-5 text-rose-400" />,
    info: <Info className="h-5 w-5 text-cyan-400" />,
  };

  const borders = {
    success: 'border-emerald-800/80 bg-emerald-950/90 text-emerald-100',
    warning: 'border-amber-800/80 bg-amber-950/90 text-amber-100',
    error: 'border-rose-800/80 bg-rose-950/90 text-rose-100',
    info: 'border-cyan-800/80 bg-cyan-950/90 text-cyan-100',
  };

  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 w-full max-w-sm', borders[type])}>
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
        {message && <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{message}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 hover:bg-black/20 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
