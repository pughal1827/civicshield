import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, children, id, ...props }, ref) => {
    const inputId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={inputId}
            ref={ref}
            className={cn(
              'w-full min-h-[44px] rounded-lg border bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 shadow-sm transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 hover:border-slate-600',
              className
            )}
            {...props}
          >
            {children}
          </select>
        </div>
        {error && <p className="text-xs font-medium text-rose-400">{error}</p>}
        {!error && helperText && <p className="text-xs text-slate-400">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
