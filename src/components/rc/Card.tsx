import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'flat' | 'raised';
  padding?: 'compact' | 'standard';
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ elevation = 'flat', padding = 'standard', disabled = false, onClick, className, children, ...props }, ref) => {
    const isClickable = !!onClick && !disabled;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick?.(event);
      }
    };

    return (
      <div
        ref={ref}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={disabled ? undefined : onClick}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        className={cn(
          "relative flex flex-col overflow-hidden transition-all duration-200 ease-out",
          "bg-[var(--rc-card-bg)] rounded-[var(--rc-card-radius)]",
          
          // Elevation
          elevation === 'flat' ? "shadow-[var(--rc-card-shadow-flat)]" : "shadow-[var(--rc-card-shadow-raised)]",
          
          // Padding
          padding === 'compact' ? "p-[var(--rc-card-padding-compact)]" : "p-[var(--rc-card-padding-standard)]",
          
          // Interaction States (Hover)
          elevation === 'raised' && !disabled && "md:hover:-translate-y-[2px] md:hover:shadow-[var(--rc-card-shadow-hover)] motion-reduce:hover:translate-y-0",
          
          // Interaction States (Pressed)
          !disabled && isClickable && "active:scale-[0.97] active:brightness-[0.95] motion-reduce:active:scale-100",
          
          // Disabled
          disabled && "opacity-40 pointer-events-none",
          
          // Accessibility Focus
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rc-accent-pink)] focus-visible:outline-offset-2",
          
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
