import React from 'react';
import { RECOMMEND_FOLLOWUP_CHIPS } from '@/constants';
import { cn } from '@/lib/utils';

interface FollowUpChipsProps {
  onChipClick: (question: string) => void;
}

const FollowUpChips: React.FC<FollowUpChipsProps> = ({ onChipClick }) => {
  return (
    <div className="flex flex-wrap gap-2 px-6 pb-4">
      {RECOMMEND_FOLLOWUP_CHIPS.map((chip) => (
        <button
          key={chip}
          onClick={() => onChipClick(chip)}
          className={cn(
            "px-3 py-1.5 rounded-full border border-[var(--rc-border-emphasis)]",
            "bg-[var(--rc-ink-primary)] text-[var(--rc-ink-on-accent)]",
            "font-[var(--rc-font-mono)] text-[11px] uppercase tracking-wider font-bold",
            "transition-all duration-150",
            "hover:bg-[var(--rc-accent-pink)] hover:border-[var(--rc-accent-pink)]",
            "active:scale-95"
          )}
        >
          {chip}
        </button>
      ))}
    </div>
  );
};

export default FollowUpChips;
