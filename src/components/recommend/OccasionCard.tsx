import React from 'react';
import { cn } from '@/lib/utils';
import type { Occasion } from '@/types';

interface OccasionCardProps {
  occasion: Occasion;
  onClick: () => void;
  disabled?: boolean;
}

const OccasionCard: React.FC<OccasionCardProps> = ({ occasion, onClick, disabled = false }) => {
  const accentVar = `var(--rc-${occasion.accentToken})`;
  const orderLabel = String(occasion.order).padStart(2, '0');
  const isFull = occasion.featured || occasion.primary;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${occasion.title}: ${occasion.description}${disabled ? ', unavailable, add bottles to your cellar first' : ''}`}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        // Base layout
        "relative flex select-none cursor-pointer overflow-hidden",
        "bg-[var(--rc-surface-primary)]",
        "border-b border-[var(--rc-border-subtle)]",
        // Full-width horizontal layout (featured / primary)
        isFull
          ? "flex-row items-center gap-5 px-5 py-6 min-h-[88px]"
          : "flex-col px-4 py-5 min-h-[128px]",
        // Hover
        "md:hover:bg-[var(--rc-surface-elevated)] transition-colors duration-150",
        // Press
        "active:bg-[var(--rc-surface-secondary)]",
        // Disabled
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      {/* 3px left accent strip */}
      <span
        className="absolute top-0 left-0 w-[3px] h-full"
        style={{ backgroundColor: accentVar }}
        aria-hidden="true"
      />

      {isFull ? (
        // ── FULL-WIDTH HORIZONTAL LAYOUT ──
        <>
          <span
            className="font-[var(--rc-font-mono)] text-[9px] font-bold tracking-[0.1em] min-w-[24px] shrink-0"
            style={{ color: accentVar }}
            aria-hidden="true"
          >
            {orderLabel}
          </span>

          <div className="flex-1 min-w-0">
            <p className="font-[var(--rc-font-display)] text-[22px] leading-none tracking-[0.02em] text-[var(--rc-ink-primary)] mb-1">
              {occasion.title.toUpperCase()}
            </p>
            <p className="font-[var(--rc-font-body)] text-[11px] text-[var(--rc-ink-tertiary)] leading-snug">
              {occasion.description}
            </p>
          </div>

          {/* Badge — only for analyze_winelist */}
          {occasion.id === 'analyze_winelist' && (
            <span className="font-[var(--rc-font-mono)] text-[8px] font-bold tracking-[0.14em] uppercase text-[var(--rc-ink-primary)] bg-[var(--rc-accent-acid)] px-2 py-1 shrink-0 whitespace-nowrap">
              MULTI-SCAN
            </span>
          )}
        </>
      ) : (
        // ── GRID CARD LAYOUT ──
        <>
          <span
            className="font-[var(--rc-font-mono)] text-[9px] font-bold tracking-[0.1em] mb-5 block"
            style={{ color: accentVar }}
            aria-hidden="true"
          >
            {orderLabel}
          </span>

          <p className="font-[var(--rc-font-display)] text-[22px] leading-[1.0] tracking-[0.02em] text-[var(--rc-ink-primary)] mb-1.5 flex-1">
            {occasion.title.toUpperCase()}
          </p>

          <p className="font-[var(--rc-font-body)] text-[11px] text-[var(--rc-ink-tertiary)] leading-snug">
            {occasion.description}
          </p>
        </>
      )}
    </div>
  );
};

export default OccasionCard;
