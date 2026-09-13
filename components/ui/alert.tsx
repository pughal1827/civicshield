import React from 'react';
import { cn } from '@/lib/utils/cn';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = 'info',
  title,
  children,
  onClose,
  ...props
}) => {
  const variantStyles = {
    info: 'bg-blue-950/40 text-blue-200 border-blue-800/60',
    success: 'bg-emerald-950/40 text-emerald-200 border-emerald-800/60',
    warning: 'bg-amber-950/40 text-amber-200 border-amber-800/60',
    error: 'bg-rose-950/40 text-rose-200 border-rose-800/60',
  };

  const icons = {
    info: <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />,
    error: <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border shadow-sm transition-all',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 text-sm space-y-0.5">
        {title && <h5 className="font-semibold tracking-tight">{title}</h5>}
        <div className="text-slate-300 leading-relaxed text-xs sm:text-sm">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-md min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
