import { useState, useRef, useCallback, useEffect, memo, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRouterState } from '@tanstack/react-router';
import { HelpCircle, CheckCircle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useInventory } from '@/context/InventoryContext';
import { useProfile } from '@/context/ProfileContext';
import { Button as RCButton } from '@/components/rc/RCButton';
import { submitFeedback } from '@/services/feedbackService';
import { cn } from '@/lib/utils';

const APP_VERSION = '1.0.0';
type Category = 'bug' | 'suggestion' | null;

const FeedbackWidget = memo(function FeedbackWidget() {
  const { user } = useAuth();
  const { scanOpen } = useInventory();
  const { isPremium } = useProfile();
  const route = useRouterState({ select: (s) => s.location.pathname });

  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<Category>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
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

  const handleClose = useCallback(() => {
    if (!isSubmitting) setIsOpen(false);
  }, [isSubmitting]);

  const handleMessageChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 500) { setMessage(val); draftRef.current = val; }
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
        message: trimmed, category, route,
        userAgent: navigator.userAgent, appVersion: APP_VERSION, isPremium,
      });
      draftRef.current = '';
      setMessage('');
      setCategory(null);
      setShowSuccess(true);
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

  if (scanOpen || !user || route === '/remy') return null;

  const canSubmit = message.trim().length > 0 && !isSubmitting;

  const formContent = showSuccess ? (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-8">
      <CheckCircle size={40} className="text-[var(--rc-accent-acid)]" />
      <p className="text-[var(--rc-ink-primary)] font-[family-name:var(--rc-font-display)] font-semibold text-lg">
        Thanks for your feedback
      </p>
    </div>
  ) : (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between">
        <p className="text-[var(--rc-ink-primary)] font-[family-name:var(--rc-font-display)] font-semibold text-lg">
          Send feedback
        </p>
        <button
          type="button" onClick={handleClose}
          className="p-1.5 rounded-[var(--rc-radius-sm)] text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)] transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex gap-2">
        {(['bug', 'suggestion'] as const).map((cat) => (
          <button
            key={cat} type="button"
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
      <div className="relative">
        <textarea
          value={message} onChange={handleMessageChange}
          placeholder="What's on your mind?" aria-label="Feedback message"
          rows={4} maxLength={500}
          className={cn(
            'w-full resize-none rounded-[var(--rc-radius-md)] border border-[var(--rc-border-subtle)]',
            'bg-[var(--rc-surface-secondary)] text-[var(--rc-ink-primary)]',
            'placeholder:text-[var(--rc-ink-ghost)] font-[family-name:var(--rc-font-body)] text-base',
            'p-3 outline-none focus:border-[var(--rc-accent-pink)] focus:ring-1 focus:ring-[var(--rc-accent-pink)]',
            'transition-colors'
          )}
        />
        <span className="absolute bottom-2 right-3 text-xs text-[var(--rc-ink-ghost)] font-[family-name:var(--rc-font-mono)]">
          {message.length}/500
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-[var(--rc-accent-coral)] font-[family-name:var(--rc-font-body)]">
          {error}
        </p>
      )}
      <RCButton
        variantType="Primary"
        label={isSubmitting ? 'Sending...' : 'Send'}
        disabled={!canSubmit} onClick={handleSubmit}
      />
    </div>
  );

  return createPortal(
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'fixed z-[9999] flex items-center justify-center',
          'w-11 h-11 rounded-full',
          'bg-[var(--rc-surface-secondary)] border border-[var(--rc-border-subtle)]',
          'shadow-[var(--rc-shadow-elevated)]',
          'text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)]',
          'transition-colors cursor-pointer select-none',
          'right-4 bottom-[calc(var(--rc-tab-height)+env(safe-area-inset-bottom)+20px)]',
          'md:right-6 md:bottom-6',
        )}
        style={{ touchAction: 'manipulation' }}
        aria-label="Send feedback"
      >
        <HelpCircle size={20} />
      </button>

      {/* Feedback panel — no vaul/Drawer, pure CSS */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[10000] bg-black/40"
            onClick={handleClose}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            role="dialog"
            aria-label="Send feedback"
            className={cn(
              'fixed z-[10001] inset-x-0 bottom-0',
              'max-h-[85vh] overflow-y-auto',
              'bg-[var(--rc-surface-primary)] rounded-t-[var(--rc-radius-lg)]',
              'border-t border-[var(--rc-border-subtle)]',
              'shadow-[var(--rc-shadow-elevated)]',
              'px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4',
              'md:inset-x-auto md:right-6 md:bottom-6 md:left-auto',
              'md:w-[380px] md:rounded-[var(--rc-radius-lg)]',
              'md:border md:pb-4',
            )}
          >
            {formContent}
          </div>
        </>
      )}
    </>,
    document.body,
  );
});

export default FeedbackWidget;
