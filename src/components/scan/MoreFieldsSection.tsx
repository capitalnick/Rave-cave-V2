import React from 'react';
import { ChevronDown } from 'lucide-react';
import { MonoLabel, Input } from '@/components/rc';
import ConfidenceIndicator from './ConfidenceIndicator';
import type { Wine, ExtractionResult, ExtractionConfidence } from '@/types';

interface MoreFieldsSectionProps {
  fields: Partial<Wine>;
  extraction: ExtractionResult | null;
  onFieldChange: (key: string, value: string | number) => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

const MORE_FIELDS: { key: keyof Wine; label: string }[] = [
  { key: 'drinkFrom', label: 'Drink From' },
  { key: 'drinkUntil', label: 'Drink Until' },
  { key: 'appellation', label: 'Appellation' },
  { key: 'tastingNotes', label: 'Tasting Notes' },
  { key: 'personalNote', label: 'Personal Notes' },
];

const MoreFieldsSection: React.FC<MoreFieldsSectionProps> = ({
  fields,
  extraction,
  onFieldChange,
  expanded: controlledExpanded,
  onToggleExpanded,
}) => {
  const [internalExpanded, setInternalExpanded] = React.useState(false);
  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded = onToggleExpanded ?? (() => setInternalExpanded(prev => !prev));

  const getConfidence = (key: string): ExtractionConfidence | null => {
    return extraction?.fields[key]?.confidence ?? null;
  };

  return (
    <div className="border-t border-[var(--rc-border-emphasis)]">
      <button
        onClick={() => setExpanded()}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--rc-surface-secondary)] transition-colors"
      >
        <MonoLabel size="micro" weight="bold" colour="ghost">
          MORE FIELDS
        </MonoLabel>
        <ChevronDown
          size={16}
          className={`text-[var(--rc-ink-ghost)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{ maxHeight: expanded ? '500px' : '0px' }}
      >
        <div className="px-4 pb-4 space-y-3">
          {MORE_FIELDS.map(({ key, label }) => {
            const value = fields[key] ?? '';
            const confidence = getConfidence(key);
            const isNumeric = key === 'drinkFrom' || key === 'drinkUntil';

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center">
                  <MonoLabel size="micro" weight="bold" colour="accent-pink" as="span" className="w-auto">
                    {label}
                  </MonoLabel>
                  <ConfidenceIndicator confidence={confidence} />
                </div>
                {key === 'tastingNotes' || key === 'personalNote' ? (
                  <textarea
                    value={String(value)}
                    onChange={(e) => onFieldChange(key, e.target.value)}
                    rows={2}
                    className="w-full bg-[var(--rc-surface-secondary)] border border-[var(--rc-border-emphasis)] rounded-[var(--rc-radius-sm)] px-3 py-2 font-[var(--rc-font-body)] text-sm text-[var(--rc-ink-primary)] resize-none focus:outline-none focus:border-[var(--rc-accent-pink)] transition-colors"
                  />
                ) : (
                  <Input
                    type={isNumeric ? 'number' : 'text'}
                    value={String(value)}
                    onChange={(e) => onFieldChange(key, isNumeric ? Number(e.target.value) : e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MoreFieldsSection;
