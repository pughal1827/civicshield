import React from 'react';
import { IncidentStatus } from '@/types/incident';
import { Badge } from './badge';
import { FileText, Cpu, UserCheck, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface StatusBadgeProps {
  status: IncidentStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config: Record<
    IncidentStatus,
    { label: string; variant: 'slate' | 'emerald' | 'amber' | 'cyan' | 'rose'; icon: React.ReactNode }
  > = {
    SUBMITTED: { label: 'Submitted', variant: 'slate', icon: <FileText className="h-3 w-3 mr-1 text-slate-400" /> },
    AI_ANALYSED: { label: 'AI Analysed', variant: 'cyan', icon: <Cpu className="h-3 w-3 mr-1 text-cyan-400" /> },
    ASSIGNED: { label: 'Assigned', variant: 'amber', icon: <UserCheck className="h-3 w-3 mr-1 text-amber-400" /> },
    IN_PROGRESS: { label: 'Work in Progress', variant: 'amber', icon: <Clock className="h-3 w-3 mr-1 text-amber-400 animate-pulse" /> },
    RESOLVED: { label: 'Resolved', variant: 'emerald', icon: <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" /> },
    CITIZEN_VERIFICATION: { label: 'Needs Verification', variant: 'cyan', icon: <ShieldCheck className="h-3 w-3 mr-1 text-cyan-400" /> },
    VERIFIED: { label: 'Verified & Closed', variant: 'emerald', icon: <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" /> },
  };

  const current = config[status] || {
    label: status,
    variant: 'slate',
    icon: <FileText className="h-3 w-3 mr-1 text-slate-400" />,
  };

  return (
    <Badge variant={current.variant} className={className}>
      {current.icon}
      <span>{current.label}</span>
    </Badge>
  );
};
