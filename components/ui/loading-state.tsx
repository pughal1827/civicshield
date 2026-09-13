import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center space-y-3', className)}>
      <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      <p className="text-sm font-medium text-slate-400 animate-pulse">{message}</p>
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-slate-800 rounded"></div>
        <div className="h-4 w-16 bg-slate-800 rounded-full"></div>
      </div>
      <div className="h-5 w-3/4 bg-slate-800 rounded"></div>
      <div className="h-4 w-full bg-slate-800/60 rounded"></div>
      <div className="pt-2 flex justify-between items-center">
        <div className="h-3 w-20 bg-slate-800 rounded"></div>
        <div className="h-8 w-24 bg-slate-800 rounded-lg"></div>
      </div>
    </div>
  );
};
