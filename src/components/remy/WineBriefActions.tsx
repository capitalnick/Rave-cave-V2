import React from 'react';
import type { Wine } from '@/types';

interface WineBriefActionsProps {
  fields: Partial<Wine>;
  onAddToCellar: (wine: Partial<Wine>) => void;
  onDismiss: () => void;
}

const WineBriefActions: React.FC<WineBriefActionsProps> = ({ fields, onAddToCellar, onDismiss }) => {
  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-[var(--rc-surface-elevated,#2d2d2d)] border-t border-[var(--rc-border-emphasis)]">
      <button
        onClick={() => onAddToCellar(fields)}
        className="flex-1 py-2.5 px-4 rounded-full bg-[var(--rc-accent-pink)] text-[var(--rc-ink-on-accent)] font-[var(--rc-font-mono)] text-xs font-bold tracking-wider uppercase transition-colors hover:brightness-110"
      >
        + Add to Cellar
      </button>
      <button
        onClick={onDismiss}
        className="flex-1 py-2.5 px-4 rounded-full border border-[var(--rc-border-emphasis)] bg-transparent text-[var(--rc-ink-ghost)] font-[var(--rc-font-mono)] text-xs font-bold tracking-wider uppercase transition-colors hover:text-[var(--rc-ink-on-accent)]"
      >
        ✓ Got What I Needed
      </button>
    </div>
  );
};

export default WineBriefActions;
