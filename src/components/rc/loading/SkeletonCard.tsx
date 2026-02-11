import React from 'react';
import { cn } from '@/lib/utils';
import { SkeletonBlock } from './SkeletonBlock';
import { SkeletonTextLine } from './SkeletonTextLine';

export const SkeletonCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading wine"
        className={cn(
          "relative flex flex-col p-3 rounded-[8px] border border-[var(--rc-border-subtle)] bg-[var(--rc-surface-primary)] shadow-sm overflow-hidden",
          className
        )}
        {...props}
      >
        {/* Left accent strip skeleton */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--rc-border-subtle)]" />
        
        {/* Image block */}
        <SkeletonBlock radius="sm" className="aspect-square w-full mb-3" delay={0} />
        
        {/* Producer */}
        <SkeletonTextLine textSize="label" width={60} className="mb-2" delay={50} />
        
        {/* Varietal */}
        <SkeletonTextLine textSize="heading" width={85} className="mb-1" delay={100} />
        
        {/* Vintage */}
        <SkeletonTextLine textSize="heading" width={40} className="mb-3" delay={150} />
        
        {/* Maturity Chip placeholder */}
        <SkeletonBlock radius="lg" className="h-6 w-24" delay={200} />
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';
