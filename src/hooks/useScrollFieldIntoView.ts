import { useEffect, type RefObject } from 'react';

/**
 * Scrolls focused inputs/textareas into view within a scroll container.
 * Uses event delegation on `focusin` so it covers all current + future fields.
 */
export function useScrollFieldIntoView(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timer: ReturnType<typeof setTimeout>;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
        return;
      }

      clearTimeout(timer);
      // 300ms delay lets keyboard animation settle before scrolling
      timer = setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    };

    container.addEventListener('focusin', handleFocusIn);

    return () => {
      clearTimeout(timer);
      container.removeEventListener('focusin', handleFocusIn);
    };
  }, [containerRef]);
}
