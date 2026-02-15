import { isDev } from '@/config/firebaseConfig';

const STORAGE_KEY = 'rave-cave-prod-ack';

let pendingResolve: ((value: boolean) => void) | null = null;
let mountedSetOpen: ((open: boolean) => void) | null = null;

/**
 * Imperatively ask the user to confirm a production write.
 * Returns true immediately if in dev mode or already acknowledged.
 * Otherwise shows the ProdWriteGuard modal and waits for user response.
 */
export function confirmProdWrite(): Promise<boolean> {
  if (isDev) return Promise.resolve(true);
  if (localStorage.getItem(STORAGE_KEY) === 'true') return Promise.resolve(true);

  return new Promise((resolve) => {
    pendingResolve = resolve;
    mountedSetOpen?.(true);
  });
}

// ── React component (mount once in Layout or App) ──

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Heading, MonoLabel, Button } from '@/components/rc';

export function ProdWriteGuard() {
  const [open, setOpen] = useState(false);

  // Register setter so confirmProdWrite() can trigger the modal
  React.useEffect(() => {
    mountedSetOpen = setOpen;
    return () => { mountedSetOpen = null; };
  }, []);

  const handleConfirm = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
    pendingResolve?.(true);
    pendingResolve = null;
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    pendingResolve?.(false);
    pendingResolve = null;
  }, []);

  if (isDev) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent className="!max-w-sm bg-[var(--rc-surface-primary)] border-[var(--rc-divider-emphasis-weight)] border-[var(--rc-ink-primary)]">
        <DialogTitle className="sr-only">Production Write Confirmation</DialogTitle>
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--rc-accent-coral)] flex items-center justify-center">
            <span className="text-[var(--rc-ink-primary)] text-xl font-bold">!</span>
          </div>
          <Heading scale="heading">PRODUCTION</Heading>
          <MonoLabel size="label" colour="ghost">
            This will add to your real cellar. Continue?
          </MonoLabel>
          <div className="flex gap-3 w-full mt-2">
            <Button variantType="Secondary" label="CANCEL" onClick={handleCancel} className="flex-1" />
            <Button variantType="Primary" label="CONFIRM" onClick={handleConfirm} className="flex-1" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
