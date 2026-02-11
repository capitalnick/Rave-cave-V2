import React from 'react';
import { cn } from '@/lib/utils';
import { Crosshair } from 'lucide-react';

export const ScanFAB: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        "flex items-center justify-center w-[56px] h-[56px] rounded-full bg-[var(--rc-accent-pink)] text-white shadow-[0_4px_12px_rgba(255,0,110,0.3)] transition-transform active:scale-90",
        className
      )}
      aria-label="Scan label"
      {...props}
    >
      <Crosshair className="w-7 h-7" />
    </button>
  );
};
