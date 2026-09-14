import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate';
}

export const Badge = ({ className, children, variant = 'default', ...props }: BadgeProps) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors shadow-xs';
  
  const variants = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
    cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </span>
  );
};
