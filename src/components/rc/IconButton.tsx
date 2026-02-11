import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  'aria-label': string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  'aria-label': ariaLabel,
  className,
  ...props
}) => {
  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[var(--rc-surface-secondary)] text-[var(--rc-ink-primary)] transition-all duration-200",
        "hover:brightness-95 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};
