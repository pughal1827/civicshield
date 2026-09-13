import React from 'react';
import { cn } from '@/lib/utils/cn';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'critical' | 'warning' | 'success' | 'info';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'default',
  className,
}) => {
  const variantStyles = {
    default: 'border-slate-800 bg-slate-900/60 text-slate-100',
    critical: 'border-rose-900/60 bg-rose-950/20 text-rose-100',
    warning: 'border-amber-900/60 bg-amber-950/20 text-amber-100',
    success: 'border-emerald-900/60 bg-emerald-950/20 text-emerald-100',
    info: 'border-blue-900/60 bg-blue-950/20 text-blue-100',
  };

  const iconStyles = {
    default: 'bg-slate-800 text-slate-400',
    critical: 'bg-rose-900/50 text-rose-300',
    warning: 'bg-amber-900/50 text-amber-300',
    success: 'bg-emerald-900/50 text-emerald-300',
    info: 'bg-blue-900/50 text-blue-300',
  };

  return (
    <div
      className={cn(
        'p-5 rounded-2xl border shadow-sm transition-all flex items-start justify-between gap-4',
        variantStyles[variant],
        className
      )}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
      </div>
      {Icon && (
        <div className={cn('p-2.5 rounded-xl shrink-0', iconStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
};
