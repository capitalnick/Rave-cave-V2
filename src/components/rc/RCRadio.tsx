import React from 'react';
import { cn } from '@/lib/utils';
import { Platform } from './RCButton';

export type RadioState = 'Unselected' | 'Selected' | 'Disabled';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: RadioState;
  label?: string;
  platform?: Platform;
}

export const Radio: React.FC<RadioProps> = ({
  variant = 'Unselected',
  label,
  platform = 'Mobile',
  className,
  ...props
}) => {
  const isSelected = variant === 'Selected';
  const isDisabled = variant === 'Disabled';
  const isDesktop = platform === 'Desktop';

  return (
    <label className={cn("inline-flex items-center gap-3 cursor-pointer select-none", isDisabled && "cursor-not-allowed")}>
      <div 
        className={cn(
          "rounded-full border-[1.5px] flex items-center justify-center transition-all duration-150",
          isDesktop ? "w-[var(--rc-control-size-desktop)] h-[var(--rc-control-size-desktop)]" : "w-[var(--rc-control-size-mobile)] h-[var(--rc-control-size-mobile)]",
          !isSelected && "bg-[var(--rc-surface-elevated)] border-[var(--rc-control-border)]",
          isSelected && "bg-[var(--rc-surface-elevated)] border-[var(--rc-accent-pink)]",
          isDisabled && "bg-[var(--rc-control-disabled-bg)] border-[var(--rc-control-disabled-border)]"
        )}
      >
        {isSelected && (
          <div className={cn(
            "rounded-full bg-[var(--rc-accent-pink)]", 
            isDesktop ? "w-2 h-2" : "w-[9px] h-[9px]",
            isDisabled && "bg-[var(--rc-control-disabled-icon)]"
          )} />
        )}
      </div>
      {label && (
        <span className={cn("text-[15px] font-['Instrument_Sans']", isDisabled ? "text-[var(--rc-control-disabled-icon)]" : "text-[var(--rc-ink-primary)]")}>
          {label}
        </span>
      )}
    </label>
  );
};
