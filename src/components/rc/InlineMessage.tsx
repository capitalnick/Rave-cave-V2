import React from 'react';
import { cn } from '@/lib/utils';
import { Info, AlertCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface InlineMessageProps {
  tone?: 'info' | 'warning' | 'error';
  message: string;
  secondaryMessage?: string;
  icon?: React.ReactNode;
  animate?: boolean;
  className?: string;
}

export const InlineMessage = React.forwardRef<HTMLDivElement, InlineMessageProps>(
  ({ tone = 'info', message, secondaryMessage, icon, animate = true, className }, ref) => {
    
    const toneConfig = {
      info: {
        bar: 'bg-[var(--rc-inline-msg-info-bar)]',
        bg: 'bg-[var(--rc-inline-msg-info-bg)]',
        icon: <Info size={16} className="text-[var(--rc-inline-msg-info-icon)]" />,
      },
      warning: {
        bar: 'bg-[var(--rc-inline-msg-warning-bar)]',
        bg: 'bg-[var(--rc-inline-msg-warning-bg)]',
        icon: <AlertCircle size={16} className="text-[var(--rc-inline-msg-warning-icon)]" />,
      },
      error: {
        bar: 'bg-[var(--rc-inline-msg-error-bar)]',
        bg: 'bg-[var(--rc-inline-msg-error-bg)]',
        icon: <AlertTriangle size={16} className="text-[var(--rc-inline-msg-error-icon)]" />,
      },
    };

    const currentTone = toneConfig[tone];

    const content = (
      <div
        ref={ref}
        role={tone === 'error' ? 'alert' : 'status'}
        aria-live={tone === 'error' ? 'assertive' : 'polite'}
        className={cn(
          "relative flex items-start w-full min-h-[36px] overflow-hidden",
          "p-[var(--rc-inline-msg-padding)] rounded-[var(--rc-inline-msg-radius)]",
          currentTone.bg,
          className
        )}
      >
        {/* Left Accent Bar */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-[var(--rc-inline-msg-bar-width)]",
          currentTone.bar
        )} />

        {/* Icon */}
        <div className="flex shrink-0 items-center justify-center mt-[2px] mr-[var(--rc-inline-msg-icon-gap)]">
          {icon || currentTone.icon}
        </div>

        {/* Text Group */}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-['Instrument_Sans',sans-serif] text-[15px] md:text-[16px] font-medium text-[var(--rc-ink-primary)] leading-[1.4]">
            {message}
          </span>
          {secondaryMessage && (
            <span className="mt-[var(--rc-space-xs)] font-['Instrument_Sans',sans-serif] text-[13px] md:text-[14px] text-[var(--rc-ink-secondary)] leading-[1.4]">
              {secondaryMessage}
            </span>
          )}
        </div>
      </div>
    );

    if (!animate) return content;

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ 
          duration: 0.2, 
          ease: [0.2, 0, 0, 1], // ease-default
          opacity: { duration: 0.15 } 
        }}
        className="w-full overflow-hidden"
      >
        {content}
      </motion.div>
    );
  }
);

InlineMessage.displayName = 'InlineMessage';
