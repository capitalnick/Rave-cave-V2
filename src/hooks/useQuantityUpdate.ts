import { useState, useRef, useEffect } from 'react';

/**
 * Debounced quantity update hook — used by WineCard and WineModal.
 * Provides immediate UI feedback with a 500ms debounce before persisting.
 */
export function useQuantityUpdate(
  wineQuantity: number,
  onUpdate?: (key: string, value: string) => Promise<void>,
  delay = 500,
) {
  const [localQty, setLocalQty] = useState(Number(wineQuantity) || 0);
  const timeoutRef = useRef<number | null>(null);

  // Sync with external changes
  useEffect(() => {
    setLocalQty(Number(wineQuantity) || 0);
  }, [wineQuantity]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, []);

  const updateQuantity = (newQty: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLocalQty(newQty);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(async () => {
      if (onUpdate) await onUpdate('quantity', newQty.toString());
    }, delay);
  };

  return { localQty, updateQuantity };
}
