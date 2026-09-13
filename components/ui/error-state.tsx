import React from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Data',
  message = 'We encountered an issue loading this information. Please check your connection and try again.',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-rose-900/40 bg-rose-950/10',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-950/60 text-rose-400 mb-4 border border-rose-800/80">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h4 className="text-base font-semibold text-slate-100 mb-1">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
};
