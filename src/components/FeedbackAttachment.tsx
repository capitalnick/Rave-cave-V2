import { useEffect, useState, useCallback } from 'react';
import { Paperclip, X } from 'lucide-react';
import { openFilePicker } from '@/components/scan/ModeSelector';
import { cn } from '@/lib/utils';

interface FeedbackAttachmentProps {
  file: File | null;
  onAttach: (f: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function FeedbackAttachment({ file, onAttach, onRemove, disabled }: FeedbackAttachmentProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleAttach = useCallback(() => {
    openFilePicker({ capture: false }, onAttach);
  }, [onAttach]);

  if (!file) {
    return (
      <button
        type="button"
        onClick={handleAttach}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 text-sm font-[family-name:var(--rc-font-body)]',
          'text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)] transition-colors',
          'disabled:opacity-40 disabled:pointer-events-none',
        )}
      >
        <Paperclip size={14} />
        Attach screenshot
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Screenshot preview"
          className="w-12 h-12 rounded-[var(--rc-radius-sm)] object-cover border border-[var(--rc-border-subtle)]"
        />
      )}
      <span className="text-sm text-[var(--rc-ink-secondary)] font-[family-name:var(--rc-font-body)] truncate max-w-[180px]">
        {file.name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="p-1 rounded-[var(--rc-radius-sm)] text-[var(--rc-ink-ghost)] hover:text-[var(--rc-ink-primary)] transition-colors disabled:opacity-40"
        aria-label="Remove screenshot"
      >
        <X size={14} />
      </button>
    </div>
  );
}
