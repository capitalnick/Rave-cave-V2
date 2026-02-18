import { useState, useEffect, useRef } from 'react';
import { REMY_THINKING_STATES } from '@/constants';

const CYCLE_MS = 2800;
const FADE_MS = 300;

/** Returns a rotating Rémy thinking phrase with a fade flag for transitions. */
export function useRemyThinking(): { text: string; fading: boolean } {
  const [index, setIndex] = useState(
    () => Math.floor(Math.random() * REMY_THINKING_STATES.length)
  );
  const [fading, setFading] = useState(false);
  const usedRef = useRef(new Set<number>([index]));

  useEffect(() => {
    const id = setInterval(() => {
      // Fade out
      setFading(true);
      // Swap text after fade-out completes
      setTimeout(() => {
        setIndex(prev => {
          if (usedRef.current.size >= REMY_THINKING_STATES.length) {
            usedRef.current.clear();
          }
          let next: number;
          do {
            next = Math.floor(Math.random() * REMY_THINKING_STATES.length);
          } while (next === prev || usedRef.current.has(next));
          usedRef.current.add(next);
          return next;
        });
        // Fade in
        setFading(false);
      }, FADE_MS);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return { text: REMY_THINKING_STATES[index], fading };
}
