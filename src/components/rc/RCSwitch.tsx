import React from 'react';
import { cn } from '@/lib/utils';

export type SwitchState = 'On' | 'Off' | 'Disabled';

export interface SwitchProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SwitchState;
  label?: string;
  onChange?: (isOn: boolean) => void;
}

export const Switch: React.FC<SwitchProps> = ({
  variant = 'Off',
  label,
  onChange,
  className,
  ...props
}) => {
  const [isOnInternal, setIsOnInternal] = React.useState(variant === 'On');
  const isDisabled = variant === 'Disabled';
  const isOn = isDisabled ? variant === 'On' : isOnInternal;

  const handleToggle = () => {
    if (isDisabled) return;
    const newState = !isOnInternal;
    setIsOnInternal(newState);
    onChange?.(newState);
  };

  return (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      <div 
        role="switch"
        aria-checked={isOn}
        onClick={handleToggle}
        className={cn(
          "relative w-[44px] h-[24px] rounded-full transition-colors duration-200 cursor-pointer",
          !isOn && "bg-[var(--rc-switch-track-off)]",
          isOn && "bg-[var(--rc-accent-pink)]",
          isDisabled && "bg-[var(--rc-switch-track-disabled)] cursor-not-allowed"
        )}
        {...props}
      >
        <div 
          className={cn(
            "absolute top-1 left-1 w-4 h-4 bg-[var(--rc-switch-thumb)] rounded-full transition-transform duration-200 shadow-sm",
            isOn && "translate-x-5",
            isDisabled && "bg-[var(--rc-switch-thumb-disabled)]"
          )}
        />
      </div>
      {label && (
        <span className={cn("text-[15px] font-['Instrument_Sans']", isDisabled ? "text-[var(--rc-disabled-text)]" : "text-[var(--rc-ink-primary)]")}>
          {label}
        </span>
      )}
    </div>
  );
};
