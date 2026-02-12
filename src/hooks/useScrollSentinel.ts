import { useEffect, useRef, useState } from 'react';

/**
 * Tracks whether a sentinel element has scrolled out of view
 * using IntersectionObserver (no scroll listeners).
 */
export function useScrollSentinel() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isPastHero, setIsPastHero] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPastHero(!entry.isIntersecting);
      },
      { threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, isPastHero };
}
