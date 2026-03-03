import React, { useState, useMemo, useCallback } from 'react';
import {
  Button,
  Body,
  MonoLabel,
  Badge,
  Checkbox,
  InlineMessage,
} from '@/components/rc';
import type { ParsedWine } from '@/utils/importDedup';
import { cn } from '@/lib/utils';

// ── Types ──

interface BottleSelectGateProps {
  wines: ParsedWine[];
  remainingCapacity: number;
  totalExistingBottles: number;
  onConfirm: (selectedWines: ParsedWine[]) => void;
  onUpgrade: () => void;
}

// ── Component ──

export default function BottleSelectGate({
  wines,
  remainingCapacity,
  totalExistingBottles,
  onConfirm,
  onUpgrade,
}: BottleSelectGateProps) {
  const csvBottles = useMemo(
    () => wines.reduce((sum, w) => sum + w.quantity, 0),
    [wines],
  );

  // Track selected indices (all selected by default up to capacity)
  const [selected, setSelected] = useState<Set<number>>(() => {
    const set = new Set<number>();
    let count = 0;
    for (let i = 0; i < wines.length; i++) {
      if (count + wines[i].quantity <= remainingCapacity) {
        set.add(i);
        count += wines[i].quantity;
      }
    }
    return set;
  });

  const selectedBottles = useMemo(
    () => wines.reduce((sum, w, i) => sum + (selected.has(i) ? w.quantity : 0), 0),
    [wines, selected],
  );

  const overCap = selectedBottles > remainingCapacity;
  const pct = remainingCapacity > 0
    ? Math.min(100, (selectedBottles / remainingCapacity) * 100)
    : selectedBottles > 0 ? 100 : 0;

  const toggleWine = useCallback((index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(wines.map((_, i) => i)));
  }, [wines]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  return (
    <div className="flex flex-col min-h-0">
      {/* Section A — Upgrade banner */}
      <div className="mb-4">
        <InlineMessage
          tone="warning"
          message="Import exceeds free tier"
          secondaryMessage={`Your file has ${csvBottles} bottles but you only have ${remainingCapacity} slots remaining (${totalExistingBottles} of 50 used).`}
        />
      </div>

      <div className="mb-4">
        <Body size="caption" colour="secondary" className="w-auto">
          Select which wines to import, or upgrade for unlimited space.
        </Body>
      </div>

      {/* Bulk actions */}
      <div className="flex gap-3 mb-3">
        <button
          onClick={selectAll}
          className="font-[var(--rc-font-mono)] text-[11px] uppercase tracking-wider text-[var(--rc-ink-ghost)] hover:text-[var(--rc-accent-pink)] transition-colors"
        >
          Select all
        </button>
        <button
          onClick={deselectAll}
          className="font-[var(--rc-font-mono)] text-[11px] uppercase tracking-wider text-[var(--rc-ink-ghost)] hover:text-[var(--rc-accent-pink)] transition-colors"
        >
          Deselect all
        </button>
      </div>

      {/* Section B — Wine selection list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {wines.map((wine, idx) => (
          <div
            key={`${wine.lineIndex}-${idx}`}
            className="flex items-center gap-3 min-h-[48px] py-2 border-b border-[var(--rc-border-subtle)] last:border-0 cursor-pointer overflow-hidden"
            onClick={() => toggleWine(idx)}
          >
            <Checkbox
              variant={selected.has(idx) ? 'Checked' : 'Unchecked'}
              onChange={() => toggleWine(idx)}
            />
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="truncate text-[13px] font-medium font-['Instrument_Sans',sans-serif] text-[var(--rc-ink-primary)]">
                {wine.producer && wine.name
                  ? `${wine.producer} ${wine.name}`
                  : wine.name || wine.producer}
              </div>
              {(wine.vintage || wine.cepage) && (
                <MonoLabel size="micro" colour="ghost" className="w-auto mt-0.5">
                  {[wine.vintage, wine.cepage].filter(Boolean).join(' \u00B7 ')}
                </MonoLabel>
              )}
            </div>
            <Badge typeVariant="Count" tone="Neutral" label={wine.quantity} className="shrink-0" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--rc-border-subtle)] pt-3 mt-2">
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-[var(--rc-surface-tertiary)] overflow-hidden mb-2">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-200',
              overCap
                ? 'bg-[var(--rc-accent-coral)]'
                : 'bg-[var(--rc-accent-pink)]',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Counter */}
        <div role="status" aria-live="polite">
          <MonoLabel
            size="label"
            colour={overCap ? 'accent-coral' : 'ghost'}
            className="w-auto"
          >
            {selectedBottles} / {remainingCapacity} bottles selected
            {overCap && ' — over capacity'}
          </MonoLabel>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-3">
          <Button
            variantType="Primary"
            label="Upgrade to add all wines"
            onClick={onUpgrade}
            className="flex-1"
          />
          <Button
            variantType="Secondary"
            label={`Continue with ${selectedBottles}`}
            disabled={overCap || selectedBottles === 0}
            onClick={() => {
              const selectedWines = wines.filter((_, i) => selected.has(i));
              onConfirm(selectedWines);
            }}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}
