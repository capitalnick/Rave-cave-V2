import React from 'react';
import { MonoLabel } from '@/components/rc';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SessionHeaderProps {
  bottleNumber: number;
  onDone: () => void;
}

const SessionHeader: React.FC<SessionHeaderProps> = ({ bottleNumber, onDone }) => {
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--rc-border-emphasis)] bg-[var(--rc-surface-secondary)]">
      <MonoLabel size="label" weight="bold" colour="primary" as="span" className="w-auto">
        <span
          key={bottleNumber}
          className={reducedMotion ? '' : 'inline-block animate-[slideInUp_200ms_ease-out]'}
        >
          Bottle {bottleNumber}
        </span>
      </MonoLabel>
      <button
        onClick={onDone}
        className="px-3 py-1 bg-[var(--rc-accent-acid)] text-[var(--rc-ink-primary)] font-[var(--rc-font-mono)] text-[11px] font-bold uppercase tracking-wider rounded-full hover:brightness-95 transition-all"
      >
        DONE
      </button>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SessionHeader;
