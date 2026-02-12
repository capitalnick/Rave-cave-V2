import React, { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Crosshair } from 'lucide-react';
import { hapticLight } from '@/utils/haptics';

interface ScanFABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onLongPress?: () => void;
}

const LONG_PRESS_MS = 500;

export const ScanFAB = React.forwardRef<HTMLButtonElement, ScanFABProps>(({
  className,
  onClick,
  onLongPress,
  ...props
}, ref) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(() => {
    longPressedRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      hapticLight();
      onLongPress?.();
    }, LONG_PRESS_MS);
  }, [onLongPress]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    clearTimer();
    if (!longPressedRef.current) {
      onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
    }
  }, [clearTimer, onClick]);

  const handlePointerLeave = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  return (
    <button
      ref={ref}
      className={cn(
        "flex items-center justify-center w-[56px] h-[56px] rounded-full bg-[var(--rc-accent-pink)] text-[var(--rc-ink-on-accent)] shadow-[0_4px_12px_var(--rc-accent-pink-10)] transition-transform active:scale-90",
        className
      )}
      aria-label="Scan label"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      {...props}
      onClick={undefined}
    >
      <Crosshair className="w-7 h-7" />
    </button>
  );
});

ScanFAB.displayName = 'ScanFAB';
