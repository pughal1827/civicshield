import React from 'react';
import { IncidentStatus } from '@/types/incident';
import { Badge } from './badge';
import { FileText, Cpu, UserCheck, Clock, CheckCircle2, ShieldCheck, Copy, AlertTriangle } from 'lucide-react';

export interface StatusBadgeProps {
  status: IncidentStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config: Record<
    IncidentStatus,
    { label: string; variant: 'slate' | 'emerald' | 'amber' | 'cyan' | 'rose'; icon: React.ReactNode }
  > = {
    SUBMITTED: { label: 'Submitted', variant: 'slate', icon: <FileText className="h-3 w-3 mr-1 text-slate-600" /> },
    AI_ANALYSED: { label: 'AI Analysed', variant: 'cyan', icon: <Cpu className="h-3 w-3 mr-1 text-cyan-600" /> },
    ASSIGNED: { label: 'Assigned', variant: 'amber', icon: <UserCheck className="h-3 w-3 mr-1 text-amber-600" /> },
    IN_PROGRESS: { label: 'Work in Progress', variant: 'amber', icon: <Clock className="h-3 w-3 mr-1 text-amber-600 animate-pulse" /> },
    RESOLVED: { label: 'Resolved', variant: 'emerald', icon: <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> },
    CITIZEN_VERIFICATION: { label: 'Needs Verification', variant: 'cyan', icon: <ShieldCheck className="h-3 w-3 mr-1 text-cyan-600" /> },
    VERIFIED: { label: 'Verified & Closed', variant: 'emerald', icon: <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> },
    DUPLICATE: { label: 'Duplicate Flagged', variant: 'slate', icon: <Copy className="h-3 w-3 mr-1 text-slate-500" /> },
    ESCALATED: { label: 'Escalated Priority', variant: 'rose', icon: <AlertTriangle className="h-3 w-3 mr-1 text-rose-500" /> },
  };

  const current = config[status] || {
    label: status,
    variant: 'slate',
    icon: <FileText className="h-3 w-3 mr-1 text-slate-600" />,
  };

  return (
    <Badge variant={current.variant} className={className}>
      {current.icon}
      <span>{current.label}</span>
    </Badge>
  );
};
