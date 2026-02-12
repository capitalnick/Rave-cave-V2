import React from 'react';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

export type BadgeType = 'Rating' | 'Confidence' | 'Count' | 'Status';
export type BadgeTone = 'Neutral' | 'Accent' | 'Success' | 'Warning' | 'Error';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  typeVariant?: BadgeType;
  tone?: BadgeTone;
  label: string | number;
}

export const Badge: React.FC<BadgeProps> = ({
  typeVariant = 'Status',
  tone = 'Neutral',
  label,
  className,
  ...props
}) => {
  const isCount = typeVariant === 'Count';
  const isRating = typeVariant === 'Rating';
  
  // Phase 1.1: Tone colour map using RAVE CAVE tokens
  const toneStyles = {
    Neutral: "bg-[var(--rc-badge-neutral-bg)] text-[var(--rc-badge-neutral-text)]",
    Accent: "bg-[var(--rc-accent-pink-10)] text-[var(--rc-accent-pink)]",
    Success: "bg-[var(--rc-badge-success-bg)] text-[var(--rc-badge-success-text)]",
    Warning: "bg-[var(--rc-badge-warning-bg)] text-[var(--rc-badge-warning-text)]",
    Error: "bg-[var(--rc-badge-error-bg)] text-[var(--rc-badge-error-text)]",
  };

  const displayLabel = isCount && typeof label === 'number' && label > 99 ? '99+' : label;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md text-[12px] font-bold font-['Instrument_Sans'] uppercase tracking-wider",
        toneStyles[tone],
        isCount && "rounded-full min-w-[22px] px-1.5 h-6",
        isRating ? "font-['Satoshi',sans-serif] font-black h-7 bg-[var(--rc-badge-rating-bg)] text-[var(--rc-badge-rating-text)] px-2" : "h-6 px-2",
        className
      )}
      {...props}
    >
      {isRating && (
        <Star className="w-3.5 h-3.5 mr-1 fill-[var(--rc-accent-acid)] text-[var(--rc-accent-acid)]" />
      )}
      <span className="leading-none">{displayLabel}</span>
    </span>
  );
};
