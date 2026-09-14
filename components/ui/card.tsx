import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'interactive' | 'dark';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, variant = 'default', ...props }, ref) => {
    const baseStyles = 'rounded-2xl border transition-all duration-200 shadow-xs';
    
    const variants = {
      default: 'bg-white border-slate-200 text-slate-900 shadow-sm',
      glass: 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-900 shadow-sm',
      interactive: 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md text-slate-900 cursor-pointer transition-all',
      dark: 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-slate-950/40',
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
