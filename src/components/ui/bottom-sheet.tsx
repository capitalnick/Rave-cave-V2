import React, { useCallback, useEffect } from 'react';
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSurfaceManager } from '@/context/SurfaceContext';

export type SheetSnapPoint = 'peek' | 'half' | 'full';

const SNAP_VALUES: Record<SheetSnapPoint, number> = {
  peek: 0.25,
  half: 0.5,
  full: 0.9,
};

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial snap point when the sheet opens */
  snapPoint?: SheetSnapPoint;
  /** Which snap points are available (defaults to all three) */
  snapPoints?: SheetSnapPoint[];
  /** Unique ID for stacking management */
  id?: string;
  /** Content */
  children: React.ReactNode;
  /** Accessible title (required for a11y) */
  title: string;
  /** Optional description */
  description?: string;
  /** Additional class on the content panel */
  className?: string;
  /** If true, the sheet cannot be dismissed by swiping/clicking overlay */
  dismissible?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onOpenChange,
  snapPoint = 'half',
  snapPoints: allowedSnapPoints,
  id,
  children,
  title,
  description,
  className,
  dismissible = true,
}) => {
  const reducedMotion = useReducedMotion();
  const surfaceManager = useSurfaceManager();

  // Compute numeric snap points
  const snaps = (allowedSnapPoints ?? ['peek', 'half', 'full']).map(s => SNAP_VALUES[s]);
  const initialSnap = SNAP_VALUES[snapPoint];

  // One-level stacking: when this sheet opens, close any other open sheet
  useEffect(() => {
    if (open && id) {
      surfaceManager.registerSheet(id);
      return () => surfaceManager.unregisterSheet(id);
    }
  }, [open, id, surfaceManager]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={handleOpenChange}
      snapPoints={snaps}
      activeSnapPoint={open ? initialSnap : undefined}
      fadeFromIndex={snaps.length - 1}
      dismissible={dismissible}
      modal
    >
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-[60] bg-black/40 transition-opacity"
          style={reducedMotion ? { transition: 'none' } : undefined}
        />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[61] flex flex-col",
            "bg-[var(--rc-surface-primary)] rounded-t-[var(--rc-radius-lg)]",
            "border-t border-[var(--rc-border-subtle)]",
            "shadow-[var(--rc-shadow-elevated)]",
            "outline-none",
            "max-h-[92vh]",
            className,
          )}
          style={reducedMotion ? { transition: 'none' } : undefined}
        >
          {/* Drag handle */}
          <Drawer.Handle className="mx-auto mt-3 mb-2 w-10 h-1 rounded-full bg-[var(--rc-ink-ghost)]" />

          {/* Accessible title */}
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          {description && <Drawer.Description className="sr-only">{description}</Drawer.Description>}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-[env(safe-area-inset-bottom)]">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
