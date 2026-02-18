import { useState, useEffect, useRef } from 'react';
import { REMY_THINKING_STATES } from '@/constants';

/** Returns a rotating Rémy thinking phrase, cycling every 1.2s. */
export function useRemyThinking(): string {
  const [index, setIndex] = useState(
    () => Math.floor(Math.random() * REMY_THINKING_STATES.length)
  );
  const usedRef = useRef(new Set<number>([index]));

  useEffect(() => {
    const id = setInterval(() => {
      setIndex(prev => {
        // Reset bag when exhausted
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
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return REMY_THINKING_STATES[index];
}
