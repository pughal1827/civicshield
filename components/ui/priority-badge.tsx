import React from 'react';
import { IncidentSeverity } from '@/types/incident';
import { Badge } from './badge';
import { AlertTriangle, AlertCircle, Info, CircleDot } from 'lucide-react';

export interface PriorityBadgeProps {
  score?: number;
  severity?: IncidentSeverity;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ score, severity, className }) => {
  let label = 'Low';
  let variant: 'slate' | 'emerald' | 'amber' | 'rose' = 'slate';
  let icon: React.ReactNode = <CircleDot className="h-3 w-3 mr-1 text-slate-400" />;

  if (score !== undefined) {
    if (score >= 80) {
      label = `Critical (${score})`;
      variant = 'rose';
      icon = <AlertTriangle className="h-3 w-3 mr-1 text-rose-400" />;
    } else if (score >= 60) {
      label = `High (${score})`;
      variant = 'amber';
      icon = <AlertCircle className="h-3 w-3 mr-1 text-amber-400" />;
    } else if (score >= 40) {
      label = `Medium (${score})`;
      variant = 'emerald';
      icon = <Info className="h-3 w-3 mr-1 text-emerald-400" />;
    } else {
      label = `Low (${score})`;
      variant = 'slate';
      icon = <CircleDot className="h-3 w-3 mr-1 text-slate-400" />;
    }
  } else if (severity) {
    const map: Record<
      IncidentSeverity,
      { label: string; variant: 'slate' | 'emerald' | 'amber' | 'rose'; icon: React.ReactNode }
    > = {
      CRITICAL: { label: 'Critical', variant: 'rose', icon: <AlertTriangle className="h-3 w-3 mr-1 text-rose-400" /> },
      HIGH: { label: 'High', variant: 'amber', icon: <AlertCircle className="h-3 w-3 mr-1 text-amber-400" /> },
      MEDIUM: { label: 'Medium', variant: 'emerald', icon: <Info className="h-3 w-3 mr-1 text-emerald-400" /> },
      LOW: { label: 'Low', variant: 'slate', icon: <CircleDot className="h-3 w-3 mr-1 text-slate-400" /> },
    };
    const item = map[severity];
    if (item) {
      label = item.label;
      variant = item.variant;
      icon = item.icon;
    }
  }

  return (
    <Badge variant={variant} className={className}>
      {icon}
      <span>{label}</span>
    </Badge>
  );
};

