import React, { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSurfaceManager } from '@/context/SurfaceContext';

export type PanelWidth = 'remy' | 'detail';

const WIDTH_MAP: Record<PanelWidth, string> = {
  remy: '400px',
  detail: '640px',
};

interface RightPanelProps {
  open: boolean;
  onClose: () => void;
  /** Panel width preset */
  width: PanelWidth;
  /** Unique ID for coexistence rules */
  id: string;
  /** If true, no scrim overlay (for pinned panels like Remy) */
  pinned?: boolean;
  /** Content */
  children: React.ReactNode;
  /** Accessible title */
  title: string;
  /** Additional class on the panel */
  className?: string;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  open,
  onClose,
  width,
  id,
  pinned = false,
  children,
  title,
  className,
}) => {
  const reducedMotion = useReducedMotion();
  const surfaceManager = useSurfaceManager();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Register with surface manager + escape handler
  useEffect(() => {
    if (!open) return;
    surfaceManager.registerPanel(id);
    const removeEscape = surfaceManager.pushEscapeHandler(onClose);
    return () => {
      surfaceManager.unregisterPanel(id);
      removeEscape();
    };
  }, [open, id, surfaceManager, onClose]);

  // Focus trap: capture focus on open, restore on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Delay to let animation start
      requestAnimationFrame(() => panelRef.current?.focus());
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Tab trap within panel
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return;

    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const panelWidth = WIDTH_MAP[width];

  const motionProps = reducedMotion
    ? { initial: false, animate: { x: 0 }, exit: { x: 0 } }
    : {
        initial: { x: '100%' },
        animate: { x: 0 },
        exit: { x: '100%' },
        transition: { type: 'spring', damping: 25, stiffness: 300 },
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim (modal panels only, not pinned) */}
          {!pinned && (
            <motion.div
              className="fixed inset-0 z-[50] bg-black/30 hidden lg:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
              onClick={onClose}
              aria-hidden
            />
          )}

          {/* Panel */}
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-label={title}
            aria-modal={!pinned}
            tabIndex={-1}
            onKeyDown={!pinned ? handleKeyDown : undefined}
            className={cn(
              "fixed top-0 right-0 bottom-0 z-[51]",
              "hidden lg:flex flex-col",
              "bg-[var(--rc-surface-primary)]",
              "border-l border-[var(--rc-border-subtle)]",
              "shadow-[var(--rc-shadow-elevated)]",
              "outline-none overflow-hidden",
              className,
            )}
            style={{ width: panelWidth }}
            {...motionProps}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-[var(--rc-radius-sm)] text-[var(--rc-ink-tertiary)] hover:text-[var(--rc-ink-primary)] hover:bg-[var(--rc-surface-secondary)] transition-colors"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
