import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Infinite-scroll hook using IntersectionObserver.
 * When the sentinel enters the viewport, calls `loadMore`.
 */
export function useInfiniteScroll(hasMore: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);

  const loadMore = useCallback(() => {
    if (hasMore) setTriggered(true);
  }, [hasMore]);

  // Reset trigger after consumer has acted on it
  const reset = useCallback(() => setTriggered(false), []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return { sentinelRef, triggered, reset };
}
