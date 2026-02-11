import React from 'react';
import { cn } from '@/lib/utils';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';

export interface ToastProps {
  tone?: 'neutral' | 'success' | 'error' | 'warning';
  message: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  duration?: number;
  className?: string;
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ tone = 'neutral', message, icon, actionLabel, onAction, onDismiss, className }, ref) => {
    
    const toneConfig = {
      neutral: {
        bar: 'bg-[var(--rc-toast-neutral-bar)]',
        icon: <Info size={20} className="text-[var(--rc-toast-neutral-icon)]" />,
      },
      success: {
        bar: 'bg-[var(--rc-toast-success-bar)]',
        icon: <CheckCircle2 size={20} className="text-[var(--rc-toast-success-icon)]" />,
      },
      error: {
        bar: 'bg-[var(--rc-toast-error-bar)]',
        icon: <AlertTriangle size={20} className="text-[var(--rc-toast-error-icon)]" />,
      },
      warning: {
        bar: 'bg-[var(--rc-toast-warning-bar)]',
        icon: <AlertCircle size={20} className="text-[var(--rc-toast-warning-icon)]" />,
      },
    };

    const currentTone = toneConfig[tone];

    return (
      <div
        ref={ref}
        role={tone === 'error' ? 'alert' : 'status'}
        aria-live={tone === 'error' ? 'assertive' : 'polite'}
        className={cn(
          "relative flex items-center min-h-[48px] w-full max-w-[var(--rc-toast-max-width)] shadow-[var(--rc-toast-shadow)] rounded-[var(--rc-toast-radius)] bg-[var(--rc-toast-bg)] overflow-hidden",
          "px-[var(--rc-toast-padding-h)] py-[var(--rc-toast-padding-v)]",
          "transition-all duration-300",
          className
        )}
      >
        {/* Left Accent Bar */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-[var(--rc-toast-bar-width)]",
          currentTone.bar
        )} />

        {/* Icon */}
        <div className="flex shrink-0 items-center justify-center mr-[var(--rc-toast-icon-gap)]">
          {icon || currentTone.icon}
        </div>

        {/* Message */}
        <p className="flex-1 font-['Instrument_Sans',sans-serif] text-[15px] md:text-[16px] text-[var(--rc-ink-primary)] leading-[1.4] line-clamp-2">
          {message}
        </p>

        {/* Action */}
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="ml-[var(--rc-toast-icon-gap)] px-2 py-1 font-['Space_Mono',monospace] text-[11px] md:text-[12px] font-bold uppercase tracking-wider text-[var(--rc-toast-action-colour)] hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            {actionLabel}
          </button>
        )}

        {/* Dismiss */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="ml-[var(--rc-space-md)] p-1 flex items-center justify-center text-[var(--rc-toast-dismiss-colour)] hover:opacity-70 transition-opacity"
        >
          <X size={16} />
        </button>
      </div>
    );
  }
);

Toast.displayName = 'Toast';

/**
 * RAVE CAVE Toaster component to be placed at the root of the app.
 */
export const RCToaster = () => {
  return (
    <SonnerToaster
      position="top-center"
      hotkey={['alt', 't']}
      expand={true}
      richColors={false}
      toastOptions={{
        unstyled: true,
        className: 'w-full flex justify-center',
      }}
    />
  );
};

/**
 * Utility function to trigger a RAVE CAVE toast.
 */
export const showToast = (props: ToastProps) => {
  const { tone = 'neutral', duration, onDismiss, ...rest } = props;
  
  const defaultDurations = {
    neutral: 4000,
    success: 3000,
    warning: 5000,
    error: Infinity,
  };

  sonnerToast.custom((t) => (
    <Toast 
      tone={tone} 
      onDismiss={() => {
        sonnerToast.dismiss(t);
        onDismiss?.();
      }}
      {...rest} 
    />
  ), {
    duration: duration || defaultDurations[tone],
  });
};
