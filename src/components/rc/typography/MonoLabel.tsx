import React from 'react';
import { cn } from '@/lib/utils';

export interface MonoLabelProps extends React.HTMLAttributes<HTMLElement> {
  size?: 'label' | 'micro';
  weight?: 'regular' | 'bold';
  colour?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'on-accent' | 'accent-pink' | 'accent-acid' | 'accent-coral';
  uppercase?: boolean;
  align?: 'left' | 'centre' | 'right';
  as?: React.ElementType;
  truncate?: boolean;
  children: React.ReactNode;
}

export const MonoLabel = React.forwardRef<HTMLElement, MonoLabelProps>(
  ({ 
    size = 'label', 
    weight = 'regular', 
    colour = 'tertiary', 
    uppercase = true,
    align = 'left', 
    as = 'span', 
    truncate = false, 
    children, 
    className, 
    ...props 
  }, ref) => {
    
    const Component = as;

    const sizeStyles = {
      label: {
        size: 'text-[length:var(--rc-type-label)]',
        lh: 'leading-[var(--rc-lh-label)]',
        ls: 'tracking-[var(--rc-ls-label)]',
      },
      micro: {
        size: 'text-[length:var(--rc-type-micro)]',
        lh: 'leading-[var(--rc-lh-micro)]',
        ls: 'tracking-[var(--rc-ls-micro)]',
      },
    };

    const weightStyles = {
      regular: 'font-normal', // 400
      bold: 'font-bold', // 700
    };

    // Colour applied via inline style to avoid twMerge stripping text-[color:...]
    const colourVars: Record<string, string> = {
      primary: 'var(--rc-ink-primary)',
      secondary: 'var(--rc-ink-secondary)',
      tertiary: 'var(--rc-ink-tertiary)',
      ghost: 'var(--rc-ink-ghost)',
      'on-accent': 'var(--rc-ink-on-accent)',
      'accent-pink': 'var(--rc-accent-pink)',
      'accent-acid': 'var(--rc-accent-acid)',
      'accent-coral': 'var(--rc-accent-coral)',
    };

    const alignStyles = {
      left: 'text-left',
      centre: 'text-center',
      right: 'text-right',
    };

    const currentSize = sizeStyles[size];

    return (
      <Component
        ref={ref}
        className={cn(
          "block w-full font-[family-name:var(--rc-font-mono)]",
          currentSize.size,
          currentSize.lh,
          currentSize.ls,
          weightStyles[weight],
          alignStyles[align],
          uppercase ? "uppercase" : "normal-case",
          truncate && "whitespace-nowrap overflow-hidden text-overflow-ellipsis",
          className
        )}
        style={{ color: colourVars[colour], ...(props.style || {}) }}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

MonoLabel.displayName = 'MonoLabel';
