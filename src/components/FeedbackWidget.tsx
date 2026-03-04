import { useState, useRef, useCallback, useEffect, memo, type ChangeEvent } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { HelpCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useInventory } from '@/context/InventoryContext';
import { useProfile } from '@/context/ProfileContext';
import { useIsSheetMobile } from '@/components/ui/use-mobile';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button as RCButton } from '@/components/rc/RCButton';
import { submitFeedback } from '@/services/feedbackService';
import { cn } from '@/lib/utils';

const APP_VERSION = '1.0.0';

type Category = 'bug' | 'suggestion' | null;

const FeedbackWidget = memo(function FeedbackWidget() {
  const { user } = useAuth();
  const { scanOpen } = useInventory();
  const { isPremium } = useProfile();
  const isMobile = useIsSheetMobile();
  const route = useRouterState({ select: (s) => s.location.pathname });

  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<Category>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Draft ref persists text across open/close
  const draftRef = useRef('');
  const [message, setMessage] = useState('');
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => { clearTimeout(dismissTimerRef.current); }, []);

  const handleOpen = useCallback(() => {
    clearTimeout(dismissTimerRef.current);
    setMessage(draftRef.current);
    setError(null);
    setShowSuccess(false);
    setIsOpen(true);
  }, []);

  // draftRef is already synced on every keystroke, so no dependency on message needed
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleMessageChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 500) {
      setMessage(val);
      draftRef.current = val;
    }
  }, []);

  const handleCategoryToggle = useCallback((cat: Category) => {
    setCategory((prev) => (prev === cat ? null : cat));
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        message: trimmed,
        category,
        route,
        userAgent: navigator.userAgent,
        appVersion: APP_VERSION,
        isPremium,
      });

      // Reset form
      draftRef.current = '';
      setMessage('');
      setCategory(null);
      setShowSuccess(true);

      // Auto-dismiss after 1.2s
      dismissTimerRef.current = setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }, [message, isSubmitting, category, route, isPremium]);

  // Hide when scan is open or user is not authenticated
  if (scanOpen || !user) return null;

  const trimmedMessage = message.trim();
  const canSubmit = trimmedMessage.length > 0 && !isSubmitting;

  const formContent = showSuccess ? (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-8">
      <CheckCircle size={40} className="text-[var(--rc-accent-acid)]" />
      <p className="text-[var(--rc-ink-primary)] font-[family-name:var(--rc-font-display)] font-semibold text-lg">
        Thanks for your feedback
      </p>
    </div>
  ) : (
    <div className="flex flex-col gap-4 py-2">
      <p className="text-[var(--rc-ink-primary)] font-[family-name:var(--rc-font-display)] font-semibold text-lg">
        Send feedback
      </p>

      {/* Category chips */}
      <div className="flex gap-2">
        {(['bug', 'suggestion'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleCategoryToggle(cat)}
            aria-pressed={category === cat}
            className={cn(
              'px-3 min-h-[44px] rounded-full text-sm font-medium transition-colors border',
              'font-[family-name:var(--rc-font-body)]',
              category === cat
                ? 'bg-[var(--rc-accent-pink)] text-[var(--rc-ink-on-accent)] border-transparent'
                : 'bg-[var(--rc-surface-secondary)] text-[var(--rc-ink-secondary)] border-[var(--rc-border-subtle)] hover:bg-[var(--rc-button-secondary-hover)]'
            )}
          >
            {cat === 'bug' ? 'Bug' : 'Suggestion'}
          </button>
        ))}
      </div>

      {/* Message textarea */}
      <div className="relative">
        <textarea
          value={message}
          onChange={handleMessageChange}
          placeholder="What's on your mind?"
          aria-label="Feedback message"
          rows={4}
          maxLength={500}
          className={cn(
            'w-full resize-none rounded-[var(--rc-radius-md)] border border-[var(--rc-border-subtle)]',
            'bg-[var(--rc-surface-secondary)] text-[var(--rc-ink-primary)]',
            'placeholder:text-[var(--rc-ink-ghost)]',
            'font-[family-name:var(--rc-font-body)] text-sm',
            'p-3 outline-none',
            'focus:border-[var(--rc-accent-pink)] focus:ring-1 focus:ring-[var(--rc-accent-pink)]',
            'transition-colors'
          )}
        />
        <span className="absolute bottom-2 right-3 text-xs text-[var(--rc-ink-ghost)] font-[family-name:var(--rc-font-mono)]">
          {message.length}/500
        </span>
      </div>

      {/* Error message */}
      {error && (
        <p role="alert" className="text-sm text-[var(--rc-accent-coral)] font-[family-name:var(--rc-font-body)]">
          {error}
        </p>
      )}

      {/* Submit button */}
      <RCButton
        variantType="Primary"
        label={isSubmitting ? 'Sending...' : 'Send'}
        disabled={!canSubmit}
        onClick={handleSubmit}
      />
    </div>
  );

  const fab = (
    <button
      type="button"
      onClick={isMobile ? handleOpen : undefined}
      className={cn(
        'fixed z-[49] flex items-center justify-center',
        'w-11 h-11 rounded-full',
        'bg-[var(--rc-surface-secondary)] border border-[var(--rc-border-subtle)]',
        'shadow-[var(--rc-shadow-elevated)]',
        'text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)]',
        'transition-colors cursor-pointer',
        // Mobile: above tab bar
        'right-4 bottom-[calc(var(--rc-tab-height)+env(safe-area-inset-bottom)+12px)]',
        // Desktop: fixed bottom-right
        'lg:right-6 lg:bottom-6'
      )}
      aria-label="Send feedback"
    >
      <HelpCircle size={20} />
    </button>
  );

  if (isMobile) {
    return (
      <>
        {fab}
        {isOpen && (
          <BottomSheet
            open={isOpen}
            onOpenChange={(open) => {
              if (!open) handleClose();
            }}
            snapPoint="half"
            id="feedback"
            title="Send feedback"
            dismissible={!isSubmitting}
          >
            {formContent}
          </BottomSheet>
        )}
      </>
    );
  }

  // Desktop: Popover
  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      if (open) handleOpen();
      else if (!isSubmitting) handleClose();
    }}>
      <PopoverTrigger asChild>
        {fab}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        onInteractOutside={(e) => { if (isSubmitting) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (isSubmitting) e.preventDefault(); }}
        className={cn(
          'w-80 p-4',
          'bg-[var(--rc-surface-primary)] border border-[var(--rc-border-subtle)]',
          'rounded-[var(--rc-radius-lg)] shadow-[var(--rc-shadow-elevated)]'
        )}
      >
        {formContent}
      </PopoverContent>
    </Popover>
  );
});

export default FeedbackWidget;
