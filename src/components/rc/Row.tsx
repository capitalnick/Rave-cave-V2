import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Switch as RCSwitch } from './RCSwitch';

export interface RowProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  leadingIcon?: React.ReactNode;
  trailingAction?: 'none' | 'chevron' | 'switch' | 'value';
  trailingValue?: string;
  switchChecked?: boolean;
  onSwitchChange?: (checked: boolean) => void;
  divider?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export const Row = React.forwardRef<HTMLElement, RowProps>(
  ({ 
    title, 
    subtitle, 
    leadingIcon, 
    trailingAction = 'none', 
    trailingValue, 
    switchChecked, 
    onSwitchChange, 
    divider = true, 
    onClick, 
    disabled = false, 
    className, 
    ...props 
  }, ref) => {
    const isClickable = !!onClick && !disabled;
    const Component = isClickable ? 'button' : 'div';

    const handleSwitchClick = (e: React.MouseEvent) => {
      if (trailingAction === 'switch') {
        e.stopPropagation();
      }
    };

    return (
      <Component
        ref={ref as any}
        type={isClickable ? 'button' : undefined}
        onClick={isClickable ? onClick : undefined}
        className={cn(
          "group relative flex w-full items-center text-left transition-colors duration-150",
          "min-h-[var(--rc-row-min-height)] py-[var(--rc-row-padding-v)] px-[var(--rc-row-padding-h)]",
          "bg-transparent",
          
          // Interaction
          isClickable && "hover:bg-[var(--rc-row-hover-bg)] active:bg-[var(--rc-row-pressed-bg)] cursor-pointer",
          disabled && "opacity-40 pointer-events-none",
          
          // Focus
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rc-accent-pink)]",
          
          className
        )}
        {...props}
      >
        {/* Leading Icon */}
        {leadingIcon && (
          <div className="flex shrink-0 items-center justify-center w-[var(--rc-row-icon-zone)] h-[var(--rc-row-icon-zone)] mr-[var(--rc-row-icon-gap)] text-[var(--rc-ink-secondary)]">
            <div className="w-[var(--rc-row-icon-size)] h-[var(--rc-row-icon-size)]">
              {leadingIcon}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 flex-col justify-center min-w-0">
          <span className="font-['Instrument_Sans'] text-[15px] md:text-[16px] font-normal text-[var(--rc-ink-primary)] truncate">
            {title}
          </span>
          {subtitle && (
            <span className="font-['Instrument_Sans'] text-[13px] md:text-[14px] text-[var(--rc-ink-tertiary)] truncate mt-[var(--rc-space-xs)]">
              {subtitle}
            </span>
          )}
        </div>

        {/* Trailing Action */}
        {trailingAction !== 'none' && (
          <div className="flex shrink-0 items-center ml-[var(--rc-row-trailing-gap)]">
            {trailingAction === 'chevron' && (
              <ChevronRight className="w-4 h-4 text-[var(--rc-ink-ghost)]" />
            )}
            {trailingAction === 'value' && (
              <span className="font-['Instrument_Sans'] text-[15px] md:text-[16px] text-[var(--rc-ink-tertiary)]">
                {trailingValue}
              </span>
            )}
            {trailingAction === 'switch' && (
              <div onClick={handleSwitchClick}>
                <RCSwitch 
                  variant={switchChecked ? 'On' : 'Off'} 
                  onChange={onSwitchChange}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {divider && (
          <div 
            className="absolute bottom-0 right-0 h-[1px] bg-[var(--rc-row-divider-colour)]" 
            style={{ 
              left: leadingIcon 
                ? "calc(var(--rc-row-padding-h) + var(--rc-row-icon-zone) + var(--rc-row-icon-gap))" 
                : "var(--rc-row-padding-h)" 
            }}
          />
        )}
      </Component>
    );
  }
);

Row.displayName = 'Row';
