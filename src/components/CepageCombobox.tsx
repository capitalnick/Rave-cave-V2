import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/rc';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { GRAPE_VARIETIES } from '@/data/grapeVarieties';
import { cn } from '@/lib/utils';

interface CepageComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const CepageCombobox: React.FC<CepageComboboxProps> = ({
  value,
  onChange,
  placeholder = 'e.g. Pinot Noir',
  className,
  autoFocus,
}) => {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value.trim()) return [];
    const q = value.toLowerCase();
    const matches = GRAPE_VARIETIES.filter((g) => g.toLowerCase().includes(q));
    // Sort: exact match first, then prefix, then substring
    matches.sort((a, b) => {
      const al = a.toLowerCase();
      const bl = b.toLowerCase();
      if (al === q && bl !== q) return -1;
      if (bl === q && al !== q) return 1;
      const aPrefix = al.startsWith(q);
      const bPrefix = bl.startsWith(q);
      if (aPrefix && !bPrefix) return -1;
      if (bPrefix && !aPrefix) return 1;
      return 0;
    });
    return matches;
  }, [value]);

  // Show dropdown when there are matches and input has text
  const shouldOpen = filtered.length > 0 && value.trim().length > 0;

  useEffect(() => {
    setHighlightIndex(-1);
  }, [value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const handleSelect = (grape: string) => {
    onChange(grape);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!shouldOpen || !open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <Popover open={open && shouldOpen} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div>
          <Input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={className}
            autoFocus={autoFocus}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          'w-[var(--radix-popover-trigger-width)] p-0 border border-[var(--rc-border-emphasis)]',
          'bg-[var(--rc-surface-primary)] rounded-[var(--rc-radius-sm)] shadow-lg',
          'max-h-[calc(2.25rem*8)] overflow-y-auto',
          '!z-[70]'
        )}
      >
        <div ref={listRef} role="listbox">
          {filtered.slice(0, 50).map((grape, i) => (
            <button
              key={grape}
              role="option"
              aria-selected={i === highlightIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click registers
                handleSelect(grape);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
              className={cn(
                'w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors',
                "font-['Instrument_Sans'] text-[var(--rc-ink-primary)]",
                i === highlightIndex
                  ? 'bg-[var(--rc-accent-pink)]/15'
                  : 'hover:bg-[var(--rc-surface-secondary)]'
              )}
            >
              {grape}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { CepageCombobox };
export default CepageCombobox;
