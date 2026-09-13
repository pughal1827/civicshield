import React from 'react';
import { cn } from '@/lib/utils/cn';
import { CheckCircle2, Clock, CircleDot, Circle } from 'lucide-react';

export interface TimelineStep {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ steps, className }) => {
  return (
    <div className={cn('relative space-y-6 before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:-z-10 before:bg-slate-800', className)}>
      {steps.map((step, idx) => {
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';

        return (
          <div key={step.id || idx} className="relative flex items-start gap-4 group">
            {/* Timeline Dot Icon */}
            <div className="shrink-0">
              {isCompleted ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 shadow-sm">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              ) : isCurrent ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-950 text-blue-400 border border-blue-600 shadow-sm animate-pulse">
                  <CircleDot className="h-4 w-4" />
                </div>
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-slate-500 border border-slate-800">
                  <Circle className="h-3.5 w-3.5" />
                </div>
              )}
            </div>

            {/* Timeline Content */}
            <div className="flex-1 space-y-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <h4
                  className={cn(
                    'text-sm font-semibold',
                    isCompleted
                      ? 'text-slate-200'
                      : isCurrent
                      ? 'text-blue-300'
                      : 'text-slate-400'
                  )}
                >
                  {step.title}
                </h4>
                {step.timestamp && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{step.timestamp}</span>
                  </span>
                )}
              </div>
              {step.description && (
                <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
