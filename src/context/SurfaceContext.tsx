import React, { createContext, useContext, useCallback, useRef, useMemo } from 'react';

/**
 * SurfaceManager handles stacking rules for sheets and panels.
 *
 * Rules:
 * - Only one bottom sheet at a time (one-level stacking)
 * - Desktop panels: detail (640px) and remy (400px) can coexist if viewport wide enough
 * - Only one detail panel at a time
 * - Escape closes the topmost surface
 */

interface SurfaceManagerValue {
  // Sheet stacking (one at a time)
  registerSheet: (id: string) => void;
  unregisterSheet: (id: string) => void;
  activeSheetId: () => string | null;

  // Panel tracking
  registerPanel: (id: string) => void;
  unregisterPanel: (id: string) => void;
  activePanelIds: () => string[];

  // Escape handler registration
  pushEscapeHandler: (handler: () => void) => () => void;
}

const SurfaceContext = createContext<SurfaceManagerValue | null>(null);

export function useSurfaceManager(): SurfaceManagerValue {
  const ctx = useContext(SurfaceContext);
  if (!ctx) throw new Error('useSurfaceManager must be used within SurfaceProvider');
  return ctx;
}

export const SurfaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sheetRef = useRef<string | null>(null);
  const panelsRef = useRef<Set<string>>(new Set());
  const escapeStackRef = useRef<(() => void)[]>([]);

  const registerSheet = useCallback((id: string) => {
    sheetRef.current = id;
  }, []);

  const unregisterSheet = useCallback((id: string) => {
    if (sheetRef.current === id) sheetRef.current = null;
  }, []);

  const activeSheetId = useCallback(() => sheetRef.current, []);

  const registerPanel = useCallback((id: string) => {
    panelsRef.current.add(id);
  }, []);

  const unregisterPanel = useCallback((id: string) => {
    panelsRef.current.delete(id);
  }, []);

  const activePanelIds = useCallback(() => Array.from(panelsRef.current), []);

  const pushEscapeHandler = useCallback((handler: () => void) => {
    escapeStackRef.current.push(handler);
    return () => {
      const idx = escapeStackRef.current.indexOf(handler);
      if (idx >= 0) escapeStackRef.current.splice(idx, 1);
    };
  }, []);

  // Global escape key listener — closes topmost surface
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && escapeStackRef.current.length > 0) {
        e.preventDefault();
        const topHandler = escapeStackRef.current[escapeStackRef.current.length - 1];
        topHandler();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const value = useMemo<SurfaceManagerValue>(() => ({
    registerSheet,
    unregisterSheet,
    activeSheetId,
    registerPanel,
    unregisterPanel,
    activePanelIds,
    pushEscapeHandler,
  }), [registerSheet, unregisterSheet, activeSheetId, registerPanel, unregisterPanel, activePanelIds, pushEscapeHandler]);

  return (
    <SurfaceContext.Provider value={value}>
      {children}
    </SurfaceContext.Provider>
  );
};
