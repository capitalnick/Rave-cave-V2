import { useEffect } from 'react';
import type { NavigateFn } from '@tanstack/react-router';

const SHORTCUT_MAP: Record<string, string> = {
  '1': '/cellar',
  '2': '/pulse',
  '3': '/recommend',
  '4': '/remy',
};

/**
 * Registers Cmd/Ctrl + 1..4 keyboard shortcuts for tab navigation.
 */
export function useKeyboardShortcuts(navigate: NavigateFn) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // IME guard
      if (e.isComposing) return;

      // Must have exactly one of meta or ctrl (not both, not neither)
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.metaKey && e.ctrlKey) return;

      // No extra modifiers
      if (e.shiftKey || e.altKey) return;

      // Focus guard: skip if inside editable elements
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (target.isContentEditable) return;
      }

      const route = SHORTCUT_MAP[e.key];
      if (!route) return;

      e.preventDefault();
      navigate({ to: route });
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);
}
