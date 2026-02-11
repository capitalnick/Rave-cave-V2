import React from 'react';
import { cn } from '@/lib/utils';
import type { Occasion } from '@/types';

interface OccasionCardProps {
  occasion: Occasion;
  onClick: () => void;
  disabled?: boolean;
}

const OccasionCard: React.FC<OccasionCardProps> = ({ occasion, onClick, disabled = false }) => {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${occasion.title}: ${occasion.description}`}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 p-4 sm:p-6",
        "bg-[var(--rc-surface-primary)] border border-[var(--rc-border-subtle)] rounded-[8px]",
        "transition-all duration-150 ease-out select-none cursor-pointer",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rc-accent-pink)] focus-visible:outline-offset-2",
        // Pressed
        "active:scale-[0.97] active:duration-100",
        // Hover (desktop)
        "md:hover:-translate-y-[1px] md:hover:shadow-[var(--rc-card-shadow-raised)]",
        // Disabled
        disabled && "opacity-40 pointer-events-none cursor-not-allowed"
      )}
    >
      <span className="text-[28px] sm:text-[48px] leading-none" aria-hidden="true">
        {occasion.icon}
      </span>
      <span className="font-[var(--rc-font-display)] font-black text-[var(--rc-type-body)] text-[var(--rc-ink-primary)] text-center uppercase tracking-wide leading-tight">
        {occasion.title}
      </span>
    </div>
  );
};

export default OccasionCard;
