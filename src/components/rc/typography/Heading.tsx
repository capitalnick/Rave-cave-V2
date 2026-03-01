import React from 'react';
import { cn } from '@/lib/utils';

export interface HeadingProps extends React.HTMLAttributes<HTMLElement> {
  scale?: 'hero' | 'vintage' | 'title' | 'heading' | 'subhead';
  colour?: 'primary' | 'secondary' | 'on-accent' | 'accent-pink' | 'accent-acid' | 'accent-coral';
  align?: 'left' | 'centre' | 'right';
  as?: React.ElementType;
  truncate?: boolean;
  maxLines?: number;
  children: React.ReactNode;
}

export const Heading = React.forwardRef<HTMLElement, HeadingProps>(
  ({ 
    scale = 'heading', 
    colour = 'primary', 
    align = 'left', 
    as, 
    truncate = false, 
    maxLines, 
    children, 
    className, 
    style, 
    ...props 
  }, ref) => {
    
    // Determine the semantic element based on scale if not provided
    const Component = as || (
      scale === 'hero' || scale === 'vintage' ? 'span' :
      scale === 'title' ? 'h1' :
      scale === 'heading' ? 'h2' :
      scale === 'subhead' ? 'h3' : 'h2'
    );

    const scaleStyles = {
      hero: {
        size: 'text-[length:var(--rc-type-hero)]',
        weight: 'font-black', // Satoshi 900
        lh: 'leading-[var(--rc-lh-hero)]',
        ls: 'tracking-[var(--rc-ls-hero)]',
      },
      vintage: {
        size: 'text-[length:var(--rc-type-vintage)]',
        weight: 'font-black', // Satoshi 900
        lh: 'leading-[var(--rc-lh-vintage)]',
        ls: 'tracking-[var(--rc-ls-vintage)]',
      },
      title: {
        size: 'text-[length:var(--rc-type-title)]',
        weight: 'font-black', // Satoshi 900
        lh: 'leading-[var(--rc-lh-title)]',
        ls: 'tracking-[var(--rc-ls-title)]',
      },
      heading: {
        size: 'text-[length:var(--rc-type-heading)]',
        weight: 'font-bold', // Satoshi 700
        lh: 'leading-[var(--rc-lh-heading)]',
        ls: 'tracking-[var(--rc-ls-heading)]',
      },
      subhead: {
        size: 'text-[length:var(--rc-type-subhead)]',
        weight: 'font-bold', // Satoshi 700
        lh: 'leading-[var(--rc-lh-subhead)]',
        ls: 'tracking-[var(--rc-ls-subhead)]',
      },
    };

    // Colour applied via inline style to avoid twMerge stripping text-[color:...]
    // when text-left / text-center / text-[length:...] are also present.
    const colourVars: Record<string, string> = {
      primary: 'var(--rc-ink-primary)',
      secondary: 'var(--rc-ink-secondary)',
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

    const currentScale = scaleStyles[scale];
    const needsStroke = colour === 'accent-acid' && (scale === 'hero' || scale === 'vintage' || scale === 'title' || scale === 'heading' || scale === 'subhead');

    return (
      <Component
        ref={ref}
        className={cn(
          "block w-full break-word font-[family-name:var(--rc-font-display)]",
          currentScale.size,
          currentScale.weight,
          currentScale.lh,
          currentScale.ls,
          alignStyles[align],
          needsStroke && "text-stroke-black",
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

Heading.displayName = 'Heading';
