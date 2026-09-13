import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, variant = 'default', ...props }, ref) => {
    const baseStyles = 'rounded-xl border transition-all duration-200 shadow-lg';
    
    const variants = {
      default: 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-slate-950/40',
      glass: 'bg-slate-900/60 backdrop-blur-md border-slate-800/80 text-slate-100 shadow-slate-950/50',
      interactive: 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 hover:shadow-emerald-950/20 text-slate-100 cursor-pointer hover:-translate-y-0.5',
    };

    return (
      <div ref={ref} className={cn(baseStyles, variants[variant], className)} {...props}>
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 border-b border-slate-800/80', className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-lg font-semibold text-slate-100 tracking-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-slate-400 mt-1', className)} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-5 pt-0 border-t border-slate-800/50 flex items-center justify-between mt-2', className)} {...props}>
    {children}
  </div>
);
