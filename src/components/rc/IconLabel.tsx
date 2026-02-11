import React from 'react';
import { cn } from '@/lib/utils';

export interface IconLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon?: React.ReactNode;
  label?: string;
  layout?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  emphasis?: 'primary' | 'secondary' | 'muted';
}

export const IconLabel = React.forwardRef<HTMLSpanElement, IconLabelProps>(
  ({ icon, label, layout = 'vertical', size = 'md', emphasis = 'secondary', className, ...props }, ref) => {
    if (!icon && !label) return null;

    const isHorizontal = layout === 'horizontal';

    const emphasisStyles = {
      primary: {
        icon: 'text-[var(--rc-iconlabel-primary-icon)]',
        label: 'text-[var(--rc-iconlabel-primary-label)]',
      },
      secondary: {
        icon: 'text-[var(--rc-iconlabel-secondary-icon)]',
        label: 'text-[var(--rc-iconlabel-secondary-label)]',
      },
      muted: {
        icon: 'text-[var(--rc-iconlabel-muted-icon)]',
        label: 'text-[var(--rc-iconlabel-muted-label)]',
      },
    };

    const sizeStyles = {
      sm: {
        iconSize: 'w-[var(--rc-iconlabel-icon-sm)] h-[var(--rc-iconlabel-icon-sm)]',
        iconStroke: '1.5px',
        labelFont: "font-['Space_Mono',monospace]",
        labelSize: 'text-[9px] md:text-[10px]',
        labelTransform: 'uppercase',
        gap: isHorizontal ? 'gap-[var(--rc-iconlabel-gap-h-sm)]' : 'gap-[var(--rc-iconlabel-gap-v-sm)]',
      },
      md: {
        iconSize: 'w-[var(--rc-iconlabel-icon-md)] h-[var(--rc-iconlabel-icon-md)]',
        iconStroke: '1.5px',
        labelFont: "font-['Instrument_Sans',sans-serif]",
        labelSize: 'text-[15px] md:text-[16px]',
        labelTransform: 'normal-case',
        gap: isHorizontal ? 'gap-[var(--rc-iconlabel-gap-h-md)]' : 'gap-[var(--rc-iconlabel-gap-v-md)]',
      },
      lg: {
        iconSize: 'w-[var(--rc-iconlabel-icon-lg)] h-[var(--rc-iconlabel-icon-lg)]',
        iconStroke: '2px',
        labelFont: "font-['Satoshi',sans-serif] font-black",
        labelSize: 'text-[22px] md:text-[32px]',
        labelTransform: 'normal-case',
        gap: isHorizontal ? 'gap-[var(--rc-iconlabel-gap-h-lg)]' : 'gap-[var(--rc-iconlabel-gap-v-lg)]',
      },
    };

    const currentSize = sizeStyles[size];
    const currentEmphasis = emphasisStyles[emphasis];

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex shrink-0 transition-colors",
          isHorizontal ? "flex-row items-center" : "flex-col items-center",
          currentSize.gap,
          className
        )}
        {...props}
      >
        {icon && (
          <span 
            className={cn(
              "flex items-center justify-center shrink-0",
              currentSize.iconSize,
              currentEmphasis.icon
            )}
            style={{ 
              strokeWidth: currentSize.iconStroke 
            }}
          >
            {icon}
          </span>
        )}
        {label && (
          <span 
            className={cn(
              "truncate leading-none",
              currentSize.labelFont,
              currentSize.labelSize,
              currentSize.labelTransform,
              currentEmphasis.label
            )}
          >
            {label}
          </span>
        )}
      </span>
    );
  }
);

IconLabel.displayName = 'IconLabel';
