import { useRef, useEffect, useCallback } from 'react';
import { useRouterState } from '@tanstack/react-router';

/**
 * Saves and restores scroll position per route.
 * Returns a ref to attach to the <main> wrapper around <Outlet />.
 */
export function useScrollPreservation() {
  const mainRef = useRef<HTMLDivElement>(null);
  const scrollMap = useRef(new Map<string, number>());
  const listenerRef = useRef<{ el: HTMLElement; handler: () => void } | null>(null);

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const cleanupListener = useCallback(() => {
    if (listenerRef.current) {
      listenerRef.current.el.removeEventListener('scroll', listenerRef.current.handler);
      listenerRef.current = null;
    }
  }, []);

  useEffect(() => {
    cleanupListener();

    const container = mainRef.current?.querySelector<HTMLElement>('[data-scroll-container]');
    if (!container) return;

    // Double rAF to wait for layout paint before restoring
    let raf1: number;
    let raf2: number;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const saved = scrollMap.current.get(pathname);
        if (saved != null) {
          container.scrollTop = saved;
        }

        // Attach passive scroll listener to continuously track position
        const handler = () => {
          scrollMap.current.set(pathname, container.scrollTop);
        };
        container.addEventListener('scroll', handler, { passive: true });
        listenerRef.current = { el: container, handler };
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      cleanupListener();
    };
  }, [pathname, cleanupListener]);

  return mainRef;
}
