import React from 'react';
import { cn } from '@/lib/utils';
import { SkeletonBlock } from './SkeletonBlock';
import { SkeletonTextLine } from './SkeletonTextLine';

interface SkeletonResultCardProps extends React.HTMLAttributes<HTMLDivElement> {
  showBadge?: boolean;
}

export const SkeletonResultCard = React.forwardRef<HTMLDivElement, SkeletonResultCardProps>(
  ({ className, showBadge = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading recommendation"
        className={cn(
          "relative flex gap-4 p-4 rounded-[8px] border border-[var(--rc-border-subtle)] bg-[var(--rc-surface-primary)] overflow-hidden",
          className
        )}
        {...props}
      >
        {/* Left accent strip */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--rc-border-subtle)]" />

        {/* Thumbnail */}
        <SkeletonBlock radius="sm" className="w-14 h-14 flex-shrink-0" delay={0} />

        {/* Text content */}
        <div className="flex-1 space-y-2 min-w-0">
          {/* Rank badge placeholder */}
          {showBadge && (
            <SkeletonBlock radius="lg" className="h-5 w-20" delay={50} />
          )}
          {/* Producer */}
          <SkeletonTextLine textSize="label" width={45} delay={100} />
          {/* Wine name */}
          <SkeletonTextLine textSize="heading" width={75} delay={150} />
          {/* Rationale — two lines */}
          <SkeletonTextLine textSize="body" width={95} delay={200} />
          <SkeletonTextLine textSize="body" width={70} delay={250} />
        </div>
      </div>
    );
  }
);

SkeletonResultCard.displayName = 'SkeletonResultCard';
