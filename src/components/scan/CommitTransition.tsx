import React, { useEffect, useRef } from 'react';
import { Spinner } from '@/components/rc/loading/Spinner';
import { MonoLabel } from '@/components/rc';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { hapticMedium } from '@/utils/haptics';
import type { CommitStage } from '@/types';

interface CommitTransitionProps {
  stage: CommitStage;
  onComplete: () => void;
}

const PARTICLE_COUNT = 7;

const CommitTransition: React.FC<CommitTransitionProps> = ({ stage, onComplete }) => {
  const completeFired = useRef(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (stage !== 'success' || completeFired.current) return;
    completeFired.current = true;

    if (!reducedMotion) hapticMedium();

    const delay = reducedMotion ? 200 : 800;
    const timer = setTimeout(onComplete, delay);
    return () => clearTimeout(timer);
  }, [stage, onComplete, reducedMotion]);

  // Reset ref when stage goes back to idle
  useEffect(() => {
    if (stage === 'idle') completeFired.current = false;
  }, [stage]);

  if (stage === 'idle') return null;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4">
      {stage === 'saving' && (
        <>
          <Spinner size="sm" tone="acid" />
          <MonoLabel size="micro" weight="bold" colour="ghost">SAVING...</MonoLabel>
        </>
      )}

      {stage === 'success' && (
        <div className="relative w-12 h-12 flex items-center justify-center">
          {/* Checkmark */}
          <span className="text-[var(--rc-accent-acid)] text-2xl font-bold">✓</span>
          {/* Particles */}
          {!reducedMotion && Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <span
              key={i}
              className="commit-particle"
              style={{
                '--angle': `${(360 / PARTICLE_COUNT) * i}deg`,
                animationDelay: `${i * 30}ms`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {stage === 'error' && (
        <MonoLabel size="micro" weight="bold" colour="accent-coral">SAVE FAILED</MonoLabel>
      )}

      <style>{`
        @keyframes particle-burst {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0); }
        }
        .commit-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--rc-accent-acid);
          --tx: calc(cos(var(--angle)) * 28px);
          --ty: calc(sin(var(--angle)) * 28px);
          animation: particle-burst 0.6s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .commit-particle { display: none; }
        }
      `}</style>
    </div>
  );
};

export default CommitTransition;
