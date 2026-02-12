import { useState, useEffect } from 'react';

const PINNED_REMY_BREAKPOINT = 1440;
const QUERY = `(min-width: ${PINNED_REMY_BREAKPOINT}px)`;

export function usePinnedRemy(): boolean {
  const [pinned, setPinned] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setPinned(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return pinned;
}
