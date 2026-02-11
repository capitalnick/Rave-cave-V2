import React from 'react';
import { cn } from '@/lib/utils';

interface InlineLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'on-pink';
}

export const InlineLoader = React.forwardRef<HTMLDivElement, InlineLoaderProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    const isOnPink = variant === 'on-pink';
    
    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={cn(
          "inline-flex items-center gap-[var(--rc-space-sm)] p-2 rounded-xl h-6",
          isOnPink && "bg-[var(--rc-accent-pink)]",
          className
        )}
        {...props}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full motion-reduce:animate-pulse",
              isOnPink ? "bg-white" : "bg-[var(--rc-loader-dot)]"
            )}
            style={{ 
              animation: 'rc-dot-scale 1s infinite ease-in-out',
              animationDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>
    );
  }
);

InlineLoader.displayName = 'InlineLoader';
