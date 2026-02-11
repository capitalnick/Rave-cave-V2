import React from 'react';
import { cn } from '@/lib/utils';
import { IconLabel } from './IconLabel';

export interface TabItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  iconFilled: React.ReactNode;
  label: string;
  state?: 'active' | 'inactive' | 'disabled';
  context?: 'tabbar' | 'rail-collapsed' | 'rail-expanded';
}

export const TabItem = React.forwardRef<HTMLButtonElement, TabItemProps>(
  ({ icon, iconFilled, label, state = 'inactive', context = 'tabbar', onClick, className, ...props }, ref) => {
    const isActive = state === 'active';
    const isDisabled = state === 'disabled';
    
    // Determine which icon variant to show
    const displayIcon = isActive ? iconFilled : icon;

    // Rendering logic per context
    if (context === 'tabbar') {
      return (
        <button
          ref={ref}
          type="button"
          role="tab"
          aria-selected={isActive}
          aria-disabled={isDisabled}
          onClick={onClick}
          disabled={isDisabled}
          className={cn(
            "flex-1 flex flex-col items-center justify-center h-[var(--rc-tab-height)]",
            "px-[var(--rc-space-sm)] pt-[var(--rc-space-md)] pb-[var(--rc-space-sm)]",
            "bg-transparent border-none transition-opacity duration-150",
            isDisabled && "opacity-40 cursor-not-allowed",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rc-accent-pink)]",
            className
          )}
          {...props}
        >
          <IconLabel
            icon={displayIcon}
            label={label}
            layout="vertical"
            size="sm"
            emphasis={isActive ? 'primary' : (isDisabled ? 'muted' : 'secondary')}
            className="w-full"
          />
        </button>
      );
    }

    // Rail contexts (collapsed or expanded)
    const isExpanded = context === 'rail-expanded';
    
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        aria-disabled={isDisabled}
        onClick={onClick}
        disabled={isDisabled}
        className={cn(
          "relative flex items-center w-full h-[var(--rc-rail-item-height)]",
          "bg-transparent border-none transition-colors duration-200 ease-[var(--ease-default)]",
          !isActive && !isDisabled && "md:hover:bg-[var(--rc-rail-hover-bg)]",
          isActive ? "cursor-default" : "cursor-pointer",
          isDisabled && "opacity-40 cursor-not-allowed",
          // Focus ring inset to avoid layout shift in the rail
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--rc-accent-pink)]",
          className
        )}
        {...props}
      >
        {/* Active Indicator Bar */}
        {isActive && (
          <div 
            className="absolute left-0 top-0 bottom-0 w-[var(--rc-rail-active-bar-width)] bg-[var(--rc-rail-active-bar-colour)] rounded-r-[var(--rc-radius-sm)]" 
          />
        )}

        <div className={cn(
          "flex items-center w-full h-full",
          isExpanded ? "px-[var(--rc-space-xl)]" : "justify-center"
        )}>
          {isExpanded ? (
            <IconLabel
              icon={displayIcon}
              label={label}
              layout="horizontal"
              size="md"
              emphasis={isActive ? 'primary' : (isDisabled ? 'muted' : 'secondary')}
            />
          ) : (
            <IconLabel
              icon={displayIcon}
              label="" // Icon only for collapsed rail
              layout="vertical"
              size="md"
              emphasis={isActive ? 'primary' : (isDisabled ? 'muted' : 'secondary')}
            />
          )}
        </div>
      </button>
    );
  }
);

TabItem.displayName = 'TabItem';
