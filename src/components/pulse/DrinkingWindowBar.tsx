import React from 'react';
import type { DrinkingWindow } from '@/types';

interface DrinkingWindowBarProps {
  window: DrinkingWindow;
  range: { min: number; max: number };
  onTap: () => void;
}

const MATURITY_COLORS: Record<string, string> = {
  'Drink Now': 'var(--rc-maturity-drink-now)',
  'Hold': 'var(--rc-maturity-hold)',
  'Past Peak': 'var(--rc-maturity-past-peak)',
};

const DrinkingWindowBar: React.FC<DrinkingWindowBarProps> = ({ window: w, range, onTap }) => {
  const totalSpan = range.max - range.min;
  if (totalSpan <= 0) return null;

  const leftPct = ((w.drinkFrom - range.min) / totalSpan) * 100;
  const widthPct = ((w.drinkUntil - w.drinkFrom) / totalSpan) * 100;
  const color = MATURITY_COLORS[w.maturity] || 'var(--rc-ink-ghost)';

  return (
    <div
      className="relative h-4 cursor-pointer group"
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(); } }}
      aria-label={`${w.producer} ${w.name} ${w.vintage}: ${w.drinkFrom}-${w.drinkUntil}`}
    >
      <div
        className="absolute top-0 h-full rounded transition-opacity group-hover:opacity-80"
        style={{
          left: `${leftPct}%`,
          width: `${Math.max(widthPct, 2)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
};

export default DrinkingWindowBar;
