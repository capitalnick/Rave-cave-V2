import React from 'react';
import { cn } from '@/lib/utils';

export interface DividerProps extends React.HTMLAttributes<HTMLElement> {
  orientation?: 'horizontal' | 'vertical';
  weight?: 'subtle' | 'emphasised';
  inset?: 'none' | 'icon' | 'text';
}

export const Divider = React.forwardRef<HTMLElement, DividerProps>(
  ({ orientation = 'horizontal', weight = 'subtle', inset = 'none', className, ...props }, ref) => {
    const isHorizontal = orientation === 'horizontal';
    
    // Inset logic (horizontal only)
    let insetStyles = {};
    if (isHorizontal) {
      if (inset === 'icon') insetStyles = { marginLeft: '68px' }; // icon zone(40) + padding(16) + gap(12)
      if (inset === 'text') insetStyles = { marginLeft: '16px' }; // padding(16)
    }

    if (isHorizontal) {
      return (
        <hr
          ref={ref as any}
          role="separator"
          aria-hidden="true"
          className={cn(
            "w-full border-none shrink-0",
            weight === 'subtle' ? "h-[var(--rc-divider-subtle-weight)] bg-[var(--rc-divider-subtle-colour)]" : "h-[var(--rc-divider-emphasis-weight)] bg-[var(--rc-divider-emphasis-colour)]",
            className
          )}
          style={insetStyles}
          {...props}
        />
      );
    }

    return (
      <div
        ref={ref as any}
        role="separator"
        aria-orientation="vertical"
        aria-hidden="true"
        className={cn(
          "h-full shrink-0",
          weight === 'subtle' ? "w-[var(--rc-divider-subtle-weight)] bg-[var(--rc-divider-subtle-colour)]" : "w-[var(--rc-divider-emphasis-weight)] bg-[var(--rc-divider-emphasis-colour)]",
          className
        )}
        {...props}
      />
    );
  }
);

Divider.displayName = 'Divider';
