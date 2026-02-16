import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Body, MonoLabel } from '@/components/rc';
import { matchToCellar } from '@/services/recommendService';
import type { WineListEntry, Wine } from '@/types';

interface WineListSectionProps {
  name: string;
  entries: WineListEntry[];
  inventory: Wine[];
}

const WineListSection: React.FC<WineListSectionProps> = ({ name, entries, inventory }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[var(--rc-border-subtle)] rounded-[var(--rc-radius-md)] overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--rc-surface-secondary)] hover:bg-[var(--rc-surface-tertiary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <MonoLabel size="label" colour="primary" className="w-auto">{name}</MonoLabel>
        </div>
        <MonoLabel size="micro" colour="ghost" className="w-auto">
          {entries.length} wine{entries.length !== 1 ? 's' : ''}
        </MonoLabel>
      </button>

      {/* Entries */}
      {open && (
        <div className="divide-y divide-[var(--rc-border-subtle)]">
          {entries.map(entry => {
            const { isFromCellar } = matchToCellar(
              { producer: entry.producer, vintage: entry.vintage },
              inventory
            );
            const price = entry.priceBottle != null
              ? `${entry.currency} ${entry.priceBottle}`
              : entry.priceGlass != null
                ? `${entry.currency} ${entry.priceGlass}/gl`
                : null;

            return (
              <div key={entry.entryId} className="px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <Body size="caption" weight="medium" className="truncate">
                    {entry.producer}{entry.name ? ` ${entry.name}` : ''}
                  </Body>
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.vintage && (
                      <MonoLabel size="micro" colour="ghost" className="w-auto">{entry.vintage}</MonoLabel>
                    )}
                    {entry.type && (
                      <MonoLabel size="micro" colour="ghost" className="w-auto">{entry.type}</MonoLabel>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isFromCellar && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[var(--rc-accent-acid)] text-[var(--rc-ink-primary)] font-[var(--rc-font-mono)] text-[9px] font-bold uppercase">
                      CELLAR
                    </span>
                  )}
                  {price && (
                    <MonoLabel size="micro" colour="secondary" className="w-auto">{price}</MonoLabel>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WineListSection;
