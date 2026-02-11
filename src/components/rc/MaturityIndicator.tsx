import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, TriangleAlert } from 'lucide-react';

export type MaturityType = 'drink-now' | 'hold' | 'past-peak';

interface MaturityIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  maturity: MaturityType;
  disabled?: boolean;
}

export const MaturityIndicator = React.forwardRef<HTMLDivElement, MaturityIndicatorProps>(
  ({ maturity, disabled, className, ...props }, ref) => {
    const config = {
      'drink-now': {
        color: 'var(--rc-maturity-drink-now)',
        Icon: CheckCircle2,
        label: 'Drink Now'
      },
      'hold': {
        color: 'var(--rc-maturity-hold)',
        Icon: Clock,
        label: 'Hold'
      },
      'past-peak': {
        color: 'var(--rc-maturity-past-peak)',
        Icon: TriangleAlert,
        label: 'Past Peak'
      }
    };

    const { color, Icon, label } = config[maturity];

    return (
      <div
        ref={ref}
        role="img"
        aria-label={`Maturity: ${label}`}
        className={cn(
          "inline-flex items-center gap-[var(--rc-space-sm)] transition-opacity duration-200 min-w-[24px] min-h-[24px]",
          disabled && "opacity-40",
          className
        )}
        {...props}
      >
        <div 
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <Icon 
          className="w-4 h-4 flex-shrink-0" 
          style={{ color: color }} 
          strokeWidth={1.5}
        />
      </div>
    );
  }
);

MaturityIndicator.displayName = 'MaturityIndicator';
