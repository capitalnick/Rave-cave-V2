import React from 'react';
import { cn } from '@/lib/utils';

export type TextSize = 'body' | 'label' | 'heading' | 'caption';

interface SkeletonTextLineProps extends React.HTMLAttributes<HTMLDivElement> {
  textSize?: TextSize;
  width?: number; // 0-100
  delay?: number;
}

export const SkeletonTextLine = React.forwardRef<HTMLDivElement, SkeletonTextLineProps>(
  ({ textSize = 'body', width = 100, delay = 0, className, ...props }, ref) => {
    const heightMap = {
      heading: 'h-4',   // 16px
      body: 'h-3',      // 12px
      caption: 'h-2.5', // 10px
      label: 'h-2',     // 8px
    };

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn(
          "relative overflow-hidden bg-[var(--rc-skeleton-base)] rounded-[4px]",
          heightMap[textSize],
          className
        )}
        style={{ width: `${width}%` }}
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

SkeletonTextLine.displayName = 'SkeletonTextLine';
