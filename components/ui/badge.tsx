import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate';
}

export const Badge = ({ className, children, variant = 'default', ...props }: BadgeProps) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors';
  
  const variants = {
    default: 'bg-slate-800 text-slate-200 border-slate-700',
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80',
    slate: 'bg-slate-800/80 text-slate-300 border-slate-700',
  };

  return (
    <span className={cn(baseStyles, variants[variant], className)} {...props}>
      {children}
    </span>
  );
};
