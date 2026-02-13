import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUpDown, Check } from 'lucide-react';
import { Divider, MonoLabel, IconButton } from '@/components/rc';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useIsSheetMobile } from '@/components/ui/use-mobile';
import { SORT_OPTIONS } from '@/types';
import type { SortField } from '@/types';

interface SortMenuProps {
  value: SortField;
  onChange: (field: SortField) => void;
  compact?: boolean;
  /** Render trigger as an IconButton (Secondary style) instead of text */
  iconButton?: boolean;
}

/* ── Shared option rendering ─────────────────────────────── */

interface SortOptionButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  mobile?: boolean;
}

const SortOptionButton: React.FC<SortOptionButtonProps> = ({ label, selected, onClick, mobile }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between w-full px-3 ${mobile ? 'py-3' : 'py-2'} text-left text-sm font-[var(--rc-font-body)] hover:bg-[var(--rc-surface-sunken)] rounded-[var(--rc-radius-sm)] transition-colors`}
    style={{ color: selected ? 'var(--rc-accent-pink)' : 'var(--rc-ink-primary)' }}
  >
    <span>{label}</span>
    {selected && <Check size={14} />}
  </button>
);

/* ── Desktop dropdown ────────────────────────────────────── */

interface SortMenuDropdownProps {
  value: SortField;
  onSelect: (field: SortField) => void;
}

const SortMenuDropdown: React.FC<SortMenuDropdownProps> = ({ value, onSelect }) => {
  const decisionOptions = SORT_OPTIONS.filter(o => o.group === 'decision');
  const orgOptions = SORT_OPTIONS.filter(o => o.group === 'organisational');

  return (
    <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--rc-surface-elevated)] border border-[var(--rc-border-subtle)] rounded-[var(--rc-radius-md)] shadow-lg z-[var(--rc-z-dropdown)] overflow-hidden">
      <div className="py-1 px-1">
        <MonoLabel size="micro" colour="ghost" className="px-3 pt-2 pb-1">Decision</MonoLabel>
        {decisionOptions.map(opt => (
          <SortOptionButton key={opt.value} label={opt.label} selected={opt.value === value} onClick={() => onSelect(opt.value)} />
        ))}
      </div>
      <Divider weight="subtle" className="mx-1" />
      <div className="py-1 px-1">
        <MonoLabel size="micro" colour="ghost" className="px-3 pt-2 pb-1">Organisational</MonoLabel>
        {orgOptions.map(opt => (
          <SortOptionButton key={opt.value} label={opt.label} selected={opt.value === value} onClick={() => onSelect(opt.value)} />
        ))}
      </div>
    </div>
  );
};

/* ── Mobile bottom sheet ─────────────────────────────────── */

interface SortMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: SortField;
  onSelect: (field: SortField) => void;
}

const SortMenuSheet: React.FC<SortMenuSheetProps> = ({ open, onOpenChange, value, onSelect }) => {
  const decisionOptions = SORT_OPTIONS.filter(o => o.group === 'decision');
  const orgOptions = SORT_OPTIONS.filter(o => o.group === 'organisational');

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} snapPoint="full" snapPoints={['full']} id="sort-menu" title="Sort wines" dismissible>
      <div className="py-2">
        <MonoLabel size="micro" colour="ghost" className="px-3 pt-2 pb-1">Decision</MonoLabel>
        {decisionOptions.map(opt => (
          <SortOptionButton key={opt.value} label={opt.label} selected={opt.value === value} onClick={() => onSelect(opt.value)} mobile />
        ))}
      </div>
      <Divider weight="subtle" className="mx-1" />
      <div className="py-2 pb-8">
        <MonoLabel size="micro" colour="ghost" className="px-3 pt-2 pb-1">Organisational</MonoLabel>
        {orgOptions.map(opt => (
          <SortOptionButton key={opt.value} label={opt.label} selected={opt.value === value} onClick={() => onSelect(opt.value)} mobile />
        ))}
      </div>
    </BottomSheet>
  );
};

/* ── Main SortMenu ───────────────────────────────────────── */

export const SortMenu: React.FC<SortMenuProps> = ({ value, onChange, compact, iconButton }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isSheetMobile = useIsSheetMobile();

  const currentLabel = SORT_OPTIONS.find(o => o.value === value)?.label ?? 'Sort';

  const toggle = useCallback(() => setOpen(prev => !prev), []);

  // Click-outside and Escape handlers for desktop dropdown only
  useEffect(() => {
    if (!open || isSheetMobile) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, isSheetMobile]);

  const handleSelect = (field: SortField) => {
    onChange(field);
    setOpen(false);
  };

  const trigger = iconButton ? (
    <IconButton icon={ArrowUpDown} aria-label="Sort" onClick={toggle} />
  ) : (
    <button
      onClick={toggle}
      className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--rc-ink-ghost)] hover:text-[var(--rc-ink-primary)] transition-colors"
      aria-haspopup="listbox"
      aria-expanded={open}
    >
      <ArrowUpDown size={16} />
      {!compact && <span className="hidden sm:inline">{currentLabel}</span>}
    </button>
  );

  if (isSheetMobile) {
    return (
      <>
        {trigger}
        <SortMenuSheet open={open} onOpenChange={setOpen} value={value} onSelect={handleSelect} />
      </>
    );
  }

  return (
    <div className="relative inline-block" ref={ref}>
      {trigger}
      {open && <SortMenuDropdown value={value} onSelect={handleSelect} />}
    </div>
  );
};
