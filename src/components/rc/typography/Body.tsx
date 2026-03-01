import React from 'react';
import { cn } from '@/lib/utils';

export interface BodyProps extends React.HTMLAttributes<HTMLElement> {
  size?: 'body' | 'caption';
  weight?: 'regular' | 'medium';
  colour?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'on-accent' | 'accent-pink' | 'accent-coral';
  align?: 'left' | 'centre' | 'right';
  as?: React.ElementType;
  truncate?: boolean;
  maxLines?: number;
  children: React.ReactNode;
}

export const Body = React.forwardRef<HTMLElement, BodyProps>(
  ({ 
    size = 'body', 
    weight = 'regular', 
    colour = 'primary', 
    align = 'left', 
    as = 'p', 
    truncate = false, 
    maxLines, 
    children, 
    className, 
    style, 
    ...props 
  }, ref) => {
    
    const Component = as;

    const sizeStyles = {
      body: {
        size: 'text-[length:var(--rc-type-body)]',
        lh: 'leading-[var(--rc-lh-body)]',
        ls: 'tracking-[var(--rc-ls-body)]',
      },
      caption: {
        size: 'text-[length:var(--rc-type-caption)]',
        lh: 'leading-[var(--rc-lh-caption)]',
        ls: 'tracking-[var(--rc-ls-caption)]',
      },
    };

    const weightStyles = {
      regular: 'font-normal', // 400
      medium: 'font-medium', // 500
    };

    // Colour applied via inline style to avoid twMerge stripping text-[color:...]
    const colourVars: Record<string, string> = {
      primary: 'var(--rc-ink-primary)',
      secondary: 'var(--rc-ink-secondary)',
      tertiary: 'var(--rc-ink-tertiary)',
      ghost: 'var(--rc-ink-ghost)',
      'on-accent': 'var(--rc-ink-on-accent)',
      'accent-pink': 'var(--rc-accent-pink)',
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
          "block w-full break-word font-[family-name:var(--rc-font-body)]",
          currentSize.size,
          currentSize.lh,
          currentSize.ls,
          weightStyles[weight],
          alignStyles[align],
          truncate && !maxLines && "whitespace-nowrap overflow-hidden text-overflow-ellipsis",
          maxLines && "line-clamp-[var(--max-lines)]",
          className
        )}
        style={{
          color: colourVars[colour],
          ...style,
          ...(maxLines ? { '--max-lines': maxLines } as React.CSSProperties : {})
        }}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Body.displayName = 'Body';
