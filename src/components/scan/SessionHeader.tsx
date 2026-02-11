import React from 'react';
import { MonoLabel, Chip } from '@/components/rc';

interface SessionHeaderProps {
  bottleNumber: number;
  onDone: () => void;
}

const SessionHeader: React.FC<SessionHeaderProps> = ({ bottleNumber, onDone }) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--rc-border-emphasis)] bg-[var(--rc-surface-secondary)]">
      <MonoLabel size="label" weight="bold" colour="primary" as="span" className="w-auto">
        Bottle {bottleNumber}
      </MonoLabel>
      <button
        onClick={onDone}
        className="px-3 py-1 bg-[var(--rc-accent-acid)] text-[var(--rc-ink-primary)] font-[var(--rc-font-mono)] text-[11px] font-bold uppercase tracking-wider rounded-full hover:brightness-95 transition-all"
      >
        DONE
      </button>
    </div>
  );
};

export default SessionHeader;
