import React from 'react';
import { cn } from '@/lib/utils';
import OccasionCard from './OccasionCard';
import { OCCASIONS } from '@/constants';
import { PageHeader } from '@/components/rc';
import type { OccasionId } from '@/types';

interface OccasionGridProps {
  onSelectOccasion: (id: OccasionId) => void;
  cellarEmpty: boolean;
}

const OccasionGrid: React.FC<OccasionGridProps> = ({ onSelectOccasion, cellarEmpty }) => {
  const gridCards = OCCASIONS.filter(o => !o.featured && !o.primary);
  const fullCards = OCCASIONS.filter(o => o.featured || o.primary);

  return (
    <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">

      {/* Header */}
      <div className="p-6 sm:p-10 pb-4">
        <PageHeader title="RECOMMEND" subtitle="WHAT'S THE OCCASION?" />
      </div>

      {/* ── 2-column grid ── */}
      <div
        role="list"
        className="grid grid-cols-2 border-t border-[var(--rc-border-subtle)]"
      >
        {gridCards
          .sort((a, b) => a.order - b.order)
          .map((occasion, index) => (
            <div
              key={occasion.id}
              role="listitem"
              className={cn(
                "border-[var(--rc-border-subtle)]",
                index % 2 === 0 ? "border-r" : ""
              )}
            >
              <OccasionCard
                occasion={occasion}
                onClick={() => onSelectOccasion(occasion.id)}
                disabled={cellarEmpty && occasion.id !== 'analyze_winelist'}
              />
            </div>
          ))}
      </div>

      {/* ── Full-width cards ── */}
      {fullCards
        .sort((a, b) => a.order - b.order)
        .map((occasion) => (
          <OccasionCard
            key={occasion.id}
            occasion={occasion}
            onClick={() => onSelectOccasion(occasion.id)}
            disabled={false}
          />
        ))}

      {/* ── Empty cellar notice ── */}
      {cellarEmpty && (
        <p className="font-[var(--rc-font-mono)] text-[9px] tracking-[0.1em] uppercase text-[var(--rc-ink-ghost)] text-center px-5 py-6">
          Add bottles to your cellar to unlock recommendations
        </p>
      )}

    </div>
  );
};

export default OccasionGrid;
