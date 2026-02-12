import React from 'react';
import { Wine, Hourglass, TrendingDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChipType = 'Filter' | 'Toggle' | 'WineType' | 'Maturity';
export type ChipState = 'Default' | 'Selected' | 'Disabled';
export type MaturityValue = 'drink-now' | 'hold' | 'past-peak';

const maturityIcons: Record<MaturityValue, LucideIcon> = {
  'drink-now': Wine,
  'hold': Hourglass,
  'past-peak': TrendingDown,
};

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
  const baseStyles = cn(
    "inline-flex items-center justify-center transition-all duration-150 ease-out select-none rounded-full cursor-pointer uppercase tracking-wider font-['Space_Mono',monospace]",
    isMaturity && isSelected && maturityValue && "gap-1.5"
  );
  
  // Phase 1.3: Maturity height — compact icon-only on mobile
  const sizingStyles = cn(
    "h-auto",
    isMaturity ? "px-2 md:px-4 py-1.5 min-h-[24px]" : "px-4 py-1.5 min-h-[32px]"
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
      {isMaturity && isSelected && maturityValue && (() => {
        const Icon = maturityIcons[maturityValue];
        return <Icon size={14} strokeWidth={2} className="shrink-0" />;
      })()}
      <span className={cn("leading-none", isMaturity && isSelected && maturityValue && "hidden md:inline")}>{label}</span>
    </div>
  );
};
