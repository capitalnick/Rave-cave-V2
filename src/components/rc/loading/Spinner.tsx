import React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'pink' | 'acid' | 'coral';
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', tone = 'pink', className, ...props }, ref) => {
    const sizeMap = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-10 h-10',
    };

    const colorMap = {
      pink: 'var(--rc-accent-pink)',
      acid: 'var(--rc-accent-acid)',
      coral: 'var(--rc-accent-coral)',
    };

    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={cn(
          "relative flex items-center justify-center",
          sizeMap[size],
          className
        )}
        {...props}
      >
        <div 
          className="absolute inset-0 rounded-full border-2 border-[var(--rc-spinner-track)]"
        />
        <div 
          className={cn(
            "absolute inset-0 rounded-full border-2 border-transparent border-t-current animate-spin motion-reduce:animate-none",
            "motion-reduce:border-t-current motion-reduce:border-r-current motion-reduce:border-b-current"
          )}
          style={{ 
            color: colorMap[tone],
            borderTopColor: colorMap[tone]
          }}
        />
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';
