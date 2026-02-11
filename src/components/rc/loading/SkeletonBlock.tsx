import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  radius?: 'none' | 'sm' | 'md' | 'lg';
  delay?: number;
}

export const SkeletonBlock = React.forwardRef<HTMLDivElement, SkeletonBlockProps>(
  ({ radius = 'md', delay = 0, className, ...props }, ref) => {
    const radiusMap = {
      none: 'rounded-none',
      sm: 'rounded-[6px]',
      md: 'rounded-[8px]',
      lg: 'rounded-[12px]',
    };

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn(
          "relative overflow-hidden bg-[var(--rc-skeleton-base)]",
          radiusMap[radius],
          className
        )}
        {...props}
      >
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--rc-skeleton-highlight)] to-transparent"
          style={{
            backgroundSize: '200% 100%',
            animation: 'rc-shimmer 1.5s infinite ease-in-out',
            animationDelay: `${delay}ms`
          }}
        />
      </div>
    );
  }
);

SkeletonBlock.displayName = 'SkeletonBlock';
