import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Minus } from 'lucide-react';
import { Platform } from './RCButton';

export type CheckboxState = 'Unchecked' | 'Checked' | 'Indeterminate' | 'Disabled';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: CheckboxState;
  label?: string;
  platform?: Platform;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  variant = 'Unchecked',
  label,
  platform = 'Mobile',
  className,
  ...props
}) => {
  const isChecked = variant === 'Checked';
  const isIndeterminate = variant === 'Indeterminate';
  const isDisabled = variant === 'Disabled';
  const isDesktop = platform === 'Desktop';

  return (
    <label className={cn("inline-flex items-center gap-3 cursor-pointer select-none", isDisabled && "cursor-not-allowed")}>
      <div className="relative">
        <div 
          className={cn(
            "border-[1.5px] rounded-[var(--rc-control-radius)] flex items-center justify-center transition-colors duration-150",
            // Phase 1.2 sizing
            isDesktop ? "w-[var(--rc-control-size-desktop)] h-[var(--rc-control-size-desktop)]" : "w-[var(--rc-control-size-mobile)] h-[var(--rc-control-size-mobile)]",
            variant === 'Unchecked' && "bg-[var(--rc-surface-elevated)] border-[var(--rc-control-border)]",
            (isChecked || isIndeterminate) && "bg-[var(--rc-control-checked-fill)] border-[var(--rc-control-checked-fill)]",
            isDisabled && "bg-[var(--rc-control-disabled-bg)] border-[var(--rc-control-disabled-border)]"
          )}
        >
          {isChecked && <Check className="w-[80%] h-[80%] text-[var(--rc-control-checked-icon)] stroke-[4px]" />}
          {isIndeterminate && <Minus className="w-[80%] h-[80%] text-[var(--rc-control-checked-icon)] stroke-[4px]" />}
        </div>
      </div>
      {label && (
        <span className={cn("text-[15px] font-['Instrument_Sans']", isDisabled ? "text-[var(--rc-control-disabled-icon)]" : "text-[var(--rc-ink-primary)]")}>
          {label}
        </span>
      )}
    </label>
  );
};
