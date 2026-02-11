import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type ButtonType = 'Primary' | 'Secondary' | 'Tertiary' | 'Destructive';
export type Platform = 'Mobile' | 'Desktop';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variantType?: ButtonType;
  platform?: Platform;
  label: string;
  iconAsset?: LucideIcon;
  iconPosition?: 'Leading' | 'Trailing' | 'None';
  forceState?: 'Default' | 'Hover' | 'Pressed' | 'Focus' | 'Disabled';
}

export const Button: React.FC<ButtonProps> = ({
  variantType = 'Primary',
  platform = 'Mobile',
  label,
  iconAsset: Icon,
  iconPosition = 'None',
  forceState,
  disabled,
  className,
  ...props
}) => {
  const isMobile = platform === 'Mobile';
  const isDesktop = platform === 'Desktop';
  const isTertiary = variantType === 'Tertiary';
  
  // Base classes
  const baseClasses = cn(
    "relative flex items-center justify-center transition-all duration-200 font-['Instrument_Sans'] font-semibold select-none",
    isMobile ? "h-[var(--rc-button-height-mobile)] px-[var(--rc-button-padding-h-filled)] rounded-[var(--rc-button-radius)]" : 
               "h-[var(--rc-button-height-desktop)] px-[var(--rc-button-padding-h-filled-desktop)] rounded-[var(--rc-button-radius)]",
    isTertiary && "px-[var(--rc-button-padding-h-text)] h-auto min-h-0 bg-transparent"
  );

  // Variant classes
  const variantClasses = {
    Primary: "bg-[var(--rc-accent-pink)] text-[var(--rc-ink-on-accent)] shadow-sm hover:bg-[var(--rc-accent-pink-hover)] active:bg-[var(--rc-accent-pink-pressed)]",
    Secondary: "bg-[var(--rc-surface-secondary)] text-[var(--rc-ink-primary)] border border-[var(--rc-border-subtle)] hover:bg-[#EBE7D8] active:bg-[#E2DECE]",
    Tertiary: cn(
      "text-[var(--rc-ink-primary)]",
      isMobile ? "underline decoration-1 underline-offset-4" : "hover:underline"
    ),
    Destructive: "bg-[var(--rc-accent-coral)] text-[var(--rc-ink-on-accent)] shadow-sm hover:bg-[var(--rc-accent-coral-dark)] active:bg-[#CC553D]"
  };

  // State overrides
  const stateOverrides = forceState ? {
    Default: "",
    Hover: variantType === 'Primary' ? "bg-[var(--rc-accent-pink-hover)]" : 
           variantType === 'Secondary' ? "bg-[#EBE7D8]" : 
           variantType === 'Tertiary' ? "underline" : 
           "bg-[var(--rc-accent-coral-dark)]",
    Pressed: variantType === 'Primary' ? "bg-[var(--rc-accent-pink-pressed)]" : 
             variantType === 'Secondary' ? "bg-[#E2DECE]" : 
             variantType === 'Tertiary' ? "underline opacity-70" : 
             "bg-[#CC553D]",
    Focus: "ring-2 ring-[var(--rc-focus-ring-pink)] ring-offset-2",
    Disabled: "opacity-40 cursor-not-allowed"
  }[forceState] : "";

  // Phase 1.5 tertiary disabled logic
  const isDisabled = disabled || forceState === 'Disabled';
  const tertiaryDisabledClasses = isTertiary && isDisabled ? (
    isMobile ? "text-[var(--rc-ink-ghost)] underline decoration-[var(--rc-ink-ghost)]" : "text-[var(--rc-ink-ghost)] no-underline"
  ) : "";

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variantType],
        stateOverrides,
        tertiaryDisabledClasses,
        isDisabled && !forceState && "opacity-40 cursor-not-allowed",
        className
      )}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {Icon && iconPosition === 'Leading' && (
        <Icon className={cn("mr-[var(--rc-button-icon-gap)]", isMobile ? "w-5 h-5" : "w-4 h-4")} />
      )}
      
      <span>{label}</span>

      {Icon && iconPosition === 'Trailing' && (
        <Icon className={cn("ml-[var(--rc-button-icon-gap)]", isMobile ? "w-5 h-5" : "w-4 h-4")} />
      )}
    </button>
  );
};
