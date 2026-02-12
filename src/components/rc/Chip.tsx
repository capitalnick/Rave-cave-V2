import React from 'react';
import { cn } from '@/lib/utils';

export type ChipType = 'Filter' | 'Toggle' | 'WineType' | 'Maturity';
export type ChipState = 'Default' | 'Selected' | 'Disabled';
export type MaturityValue = 'drink-now' | 'hold' | 'past-peak';

export interface ChipProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: ChipType;
  state?: ChipState;
  label: string;
  indicatorColor?: string;
  maturityValue?: MaturityValue;
}

export const Chip: React.FC<ChipProps> = ({
  variant = 'Filter',
  state = 'Default',
  label,
  indicatorColor,
  maturityValue,
  className,
  ...props
}) => {
  const isSelected = state === 'Selected';
  const isDisabled = state === 'Disabled';
  const isMaturity = variant === 'Maturity';
  const hasIndicator = variant === 'WineType' || isMaturity;

  // Phase 1.3: Font and transform
  const baseStyles = "inline-flex items-center justify-center transition-all duration-150 ease-out select-none rounded-full cursor-pointer uppercase tracking-wider font-['Space_Mono',monospace]";
  
  // Phase 1.3: Maturity height
  const sizingStyles = cn(
    "px-4 py-1.5 h-auto",
    isMaturity ? "min-h-[24px]" : "min-h-[32px]"
  );
  
  // Phase 1.3: Maturity selected colours
  let maturitySelectedStyles = "";
  if (isMaturity && isSelected && maturityValue) {
    const map = {
      'drink-now': "bg-[var(--rc-maturity-drink-now-bg)] text-[var(--rc-maturity-drink-now-text)]",
      'hold': "bg-[var(--rc-maturity-hold-bg)] text-[var(--rc-maturity-hold-text)]",
      'past-peak': "bg-[var(--rc-maturity-past-peak-bg)] text-[var(--rc-maturity-past-peak-text)]",
    };
    maturitySelectedStyles = map[maturityValue];
  }

  const variantStyles = cn(
    "text-[12px] font-bold",
    !isMaturity && "border",
    !isSelected && !isDisabled && "bg-[var(--rc-surface-elevated)] border-[var(--rc-border-subtle)] text-[var(--rc-ink-primary)] hover:bg-[var(--rc-surface-secondary)]",
    isSelected && !isMaturity && "bg-[var(--rc-selection-bg)] border-[var(--rc-selection-border)] text-[var(--rc-selection-text)]",
    isMaturity && isSelected && maturitySelectedStyles,
    isDisabled && "bg-[var(--rc-disabled-bg)] border-[var(--rc-disabled-border)] text-[var(--rc-disabled-text)] cursor-not-allowed"
  );

  return (
    <div
      className={cn(baseStyles, sizingStyles, variantStyles, className)}
      {...props}
    >
      {hasIndicator && !isMaturity && (
        <div className="mr-2 flex items-center justify-center w-2 h-2 rounded-full overflow-hidden">
          <div 
            className={cn("w-full h-full rounded-full", isDisabled ? "bg-[var(--rc-disabled-border)]" : "")}
            style={!isDisabled ? { backgroundColor: indicatorColor || 'var(--rc-accent-pink)' } : {}}
          />
        </div>
      )}
      <span className="leading-none">{label}</span>
    </div>
  );
};
