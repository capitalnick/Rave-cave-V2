import { GripVertical, X, Plus } from 'lucide-react';
import { CepageCombobox } from './CepageCombobox';
import { grapePercentTotal } from '../utils/grapeUtils';
import type { GrapeVariety } from '../types';

interface GrapeVarietiesEditorProps {
  value: GrapeVariety[];
  onChange: (value: GrapeVariety[]) => void;
  className?: string;
}

const MAX_VARIETIES = 5;

export function GrapeVarietiesEditor({
  value,
  onChange,
  className,
}: GrapeVarietiesEditorProps) {
  // Ensure at least one empty row when mounted with empty array
  const rows = value.length > 0 ? value : [{ name: '', pct: null }];

  const updateRow = (index: number, patch: Partial<GrapeVariety>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    // Keep rows that have a name, plus always keep the first row
    onChange(next.filter((r, i) => r.name.trim() || i === 0));
  };

  const addRow = () => {
    if (rows.length >= MAX_VARIETIES) return;
    onChange([...rows, { name: '', pct: null }]);
  };

  const removeRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length ? next : [{ name: '', pct: null }]);
  };

  const total = grapePercentTotal(rows);
  const totalOff = total !== null && total !== 100;

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical
              size={14}
              className="text-[var(--rc-ink-ghost)] shrink-0 cursor-grab"
            />

            <div className="flex-1 min-w-0">
              <CepageCombobox
                value={row.name}
                onChange={(name) => updateRow(i, { name })}
                placeholder="Variety…"
                autoFocus={i === 0 && rows.length === 1}
              />
            </div>

            <input
              type="number"
              min={1}
              max={100}
              value={row.pct ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                const parsed = raw === '' ? null : Math.min(100, Math.max(1, parseInt(raw)));
                updateRow(i, { pct: isNaN(parsed as number) ? null : parsed });
              }}
              placeholder="%"
              className="
                w-14 shrink-0
                bg-[var(--rc-surface-secondary)]
                border border-[var(--rc-border-subtle)]
                rounded-[var(--rc-radius-sm)]
                px-2 py-1.5
                text-[var(--rc-ink-primary)]
                text-sm text-right
                focus:outline-none focus:border-[var(--rc-accent-pink)]
                [appearance:textfield]
                [&::-webkit-outer-spin-button]:appearance-none
                [&::-webkit-inner-spin-button]:appearance-none
              "
            />

            <button
              type="button"
              onClick={() => removeRow(i)}
              className="
                shrink-0 p-0.5
                text-[var(--rc-ink-ghost)]
                hover:text-[var(--rc-accent-pink)]
                transition-colors
              "
              aria-label={`Remove ${row.name || 'variety'}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3">
        {rows.length < MAX_VARIETIES ? (
          <button
            type="button"
            onClick={addRow}
            className="
              flex items-center gap-1
              text-xs font-[var(--rc-font-mono)]
              text-[var(--rc-ink-tertiary)]
              hover:text-[var(--rc-accent-pink)]
              transition-colors
            "
          >
            <Plus size={12} />
            Add variety
          </button>
        ) : (
          <span className="text-xs font-[var(--rc-font-mono)] text-[var(--rc-ink-ghost)]">
            Max 5 varieties
          </span>
        )}

        {total !== null && (
          <span
            className={`
              text-xs font-[var(--rc-font-mono)]
              ${totalOff ? 'text-[var(--rc-accent-pink)]' : 'text-[var(--rc-ink-tertiary)]'}
            `}
          >
            Total: {total}%
          </span>
        )}
      </div>
    </div>
  );
}
