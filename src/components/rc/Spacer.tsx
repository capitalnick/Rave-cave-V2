import React from 'react';
import { cn } from '@/lib/utils';

export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  direction?: 'vertical' | 'horizontal';
}

export const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ size = 'md', direction = 'vertical', className, ...props }, ref) => {
    const isVertical = direction === 'vertical';

    const sizeMap = {
      xs: 'var(--rc-space-xs)',
      sm: 'var(--rc-space-sm)',
      md: 'var(--rc-space-md)',
      lg: 'var(--rc-space-lg)',
      xl: 'var(--rc-space-xl)',
    };

    const tokenValue = sizeMap[size];

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cn("shrink-0 grow-0", className)}
        style={{
          [isVertical ? 'height' : 'width']: tokenValue,
        }}
        {...props}
      />
    );
  }
);

Spacer.displayName = 'Spacer';
