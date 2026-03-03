import React, { useMemo } from 'react';
import {
  Button,
  Heading,
  Body,
  MonoLabel,
  Card,
} from '@/components/rc';
import type { DuplicateGroup } from '@/utils/importDedup';
import { cn } from '@/lib/utils';

// ── Types ──

interface DuplicateReviewProps {
  groups: DuplicateGroup[];
  onConfirm: (resolved: DuplicateGroup[]) => void;
  onToggle: (index: number, merged: boolean) => void;
  onBulkMerge: () => void;
  onBulkKeep: () => void;
}

// ── Component ──

export default function DuplicateReview({
  groups,
  onConfirm,
  onToggle,
  onBulkMerge,
  onBulkKeep,
}: DuplicateReviewProps) {
  const mergeCount = groups.filter(g => g.merged).length;
  const totalBefore = groups.reduce((acc, g) => acc + g.rowIndices.length, 0);
  const totalAfter = groups.reduce(
    (acc, g) => acc + (g.merged ? 1 : g.rowIndices.length),
    0,
  );

  // Count non-duplicate rows (rows not part of any group) isn't tracked here,
  // so the summary is relative to duplicate groups only.
  const pluralS = groups.length === 1 ? '' : 's';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-2">
        <Heading scale="heading">Review Duplicates</Heading>
      </div>
      <Body size="caption" colour="secondary" className="w-auto mb-4">
        {groups.length} wine{pluralS} appear{groups.length === 1 ? 's' : ''} more than once in your file.
        Merged entries will combine bottle counts.
      </Body>

      {/* Bulk actions */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={onBulkMerge}
          className="font-[var(--rc-font-mono)] text-[11px] uppercase tracking-wider text-[var(--rc-ink-ghost)] hover:text-[var(--rc-accent-pink)] transition-colors"
        >
          Merge all
        </button>
        <button
          onClick={onBulkKeep}
          className="font-[var(--rc-font-mono)] text-[11px] uppercase tracking-wider text-[var(--rc-ink-ghost)] hover:text-[var(--rc-accent-pink)] transition-colors"
        >
          Keep all separate
        </button>
      </div>

      {/* Group cards — scrollable area */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-24">
        {groups.map((group, idx) => (
          <GroupCard
            key={group.key}
            group={group}
            index={idx}
            onToggle={onToggle}
          />
        ))}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-[var(--rc-surface-primary)] border-t border-[var(--rc-border-subtle)] pt-3 -mx-6 px-6 pb-1">
        <MonoLabel size="label" colour="ghost" className="w-auto block mb-3">
          {mergeCount} merged &middot; {totalBefore} entries &rarr; {totalAfter} cellar{' '}
          {totalAfter === 1 ? 'entry' : 'entries'}
        </MonoLabel>
        <Button
          variantType="Primary"
          label="Continue"
          onClick={() => onConfirm(groups)}
          className="w-full"
        />
      </div>
    </div>
  );
}

// ── Group Card ──

function GroupCard({
  group,
  index,
  onToggle,
}: {
  group: DuplicateGroup;
  index: number;
  onToggle: (index: number, merged: boolean) => void;
}) {
  const { label, rowIndices, totalQuantity, merged, differingFields } = group;

  const subtitle = [label.vintage, label.name, label.cepage]
    .filter(Boolean)
    .join(' \u00B7 ');

  return (
    <Card elevation="flat" padding="standard" className="border border-[var(--rc-border-subtle)]">
      {/* Wine identity */}
      <Body weight="medium" className="w-auto">
        {label.producer || label.name}
      </Body>
      {subtitle && (
        <MonoLabel size="micro" colour="ghost" className="w-auto mt-0.5">
          {subtitle}
        </MonoLabel>
      )}

      {/* Entry count + total qty */}
      <MonoLabel size="label" className="w-auto mt-2 block">
        {rowIndices.length} entries &rarr; {totalQuantity} bottle{totalQuantity !== 1 ? 's' : ''}
      </MonoLabel>

      {/* Context line */}
      {merged && differingFields.length > 0 && (
        <Body size="caption" colour="ghost" className="w-auto mt-1">
          Row 1 data used &middot; {differingFields.join(', ')} from other rows discarded
        </Body>
      )}
      {!merged && (
        <Body size="caption" colour="secondary" className="w-auto mt-1">
          You'll have {rowIndices.length} separate entries for this wine
        </Body>
      )}

      {/* Toggle: Merge / Keep separate */}
      <div className="flex mt-3 rounded-lg overflow-hidden border border-[var(--rc-border-subtle)]">
        <button
          onClick={() => onToggle(index, true)}
          className={cn(
            'flex-1 py-2.5 text-xs font-medium transition-colors min-h-[48px]',
            merged
              ? 'bg-[var(--rc-accent-pink)] text-white'
              : 'bg-transparent text-[var(--rc-ink-secondary)] hover:bg-[var(--rc-surface-secondary)]',
          )}
        >
          Merge
        </button>
        <button
          onClick={() => onToggle(index, false)}
          className={cn(
            'flex-1 py-2.5 text-xs font-medium transition-colors min-h-[48px]',
            !merged
              ? 'bg-[var(--rc-surface-secondary)] text-[var(--rc-ink-primary)]'
              : 'bg-transparent text-[var(--rc-ink-secondary)] hover:bg-[var(--rc-surface-secondary)]',
          )}
        >
          Keep separate
        </button>
      </div>
    </Card>
  );
}
