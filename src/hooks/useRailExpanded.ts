import { useState, useEffect } from 'react';

const RAIL_EXPAND_BREAKPOINT = 1600;

export function useRailExpanded(): boolean {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(min-width: ${RAIL_EXPAND_BREAKPOINT}px)`).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${RAIL_EXPAND_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setExpanded(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return expanded;
}
