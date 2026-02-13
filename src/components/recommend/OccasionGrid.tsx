import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import OccasionCard from './OccasionCard';
import { OCCASIONS } from '@/constants';
import { Heading, MonoLabel, Body } from '@/components/rc';
import type { OccasionId, RecentQuery } from '@/types';
import { cn } from '@/lib/utils';

interface OccasionGridProps {
  onSelectOccasion: (id: OccasionId) => void;
  cellarEmpty: boolean;
  recentQueries: RecentQuery[];
  onReplayQuery: (query: RecentQuery) => void;
  onDeleteQuery: (id: string) => void;
}

const OccasionGrid: React.FC<OccasionGridProps> = ({
  onSelectOccasion,
  cellarEmpty,
  recentQueries,
  onReplayQuery,
  onDeleteQuery,
}) => {
  return (
    <div className="flex flex-col gap-8 p-6 sm:p-10 h-full overflow-y-auto">
      {/* Header */}
      <div className="space-y-1">
        <Heading scale="title">RECOMMEND</Heading>
        <MonoLabel size="label" colour="ghost">WHAT'S THE OCCASION?</MonoLabel>
      </div>

      {/* Standard grid (no flags) */}
      <div className="grid grid-cols-2 gap-4">
        {OCCASIONS.filter(o => !o.featured && !o.primary).map((occasion) => (
          <OccasionCard
            key={occasion.id}
            occasion={occasion}
            onClick={() => onSelectOccasion(occasion.id)}
            disabled={cellarEmpty}
          />
        ))}
      </div>

      {/* Primary cards (full-width standard) */}
      {OCCASIONS.filter(o => o.primary).map((occasion) => (
        <OccasionCard
          key={occasion.id}
          occasion={occasion}
          onClick={() => onSelectOccasion(occasion.id)}
          disabled={cellarEmpty}
        />
      ))}

      {/* Featured cards (full-width horizontal) */}
      {OCCASIONS.filter(o => o.featured).map((occasion) => (
        <OccasionCard
          key={occasion.id}
          occasion={occasion}
          onClick={() => onSelectOccasion(occasion.id)}
          disabled={cellarEmpty}
        />
      ))}

      {cellarEmpty && (
        <MonoLabel size="micro" colour="ghost" align="centre" as="p">
          Add bottles to your cellar to unlock recommendations
        </MonoLabel>
      )}

      {/* Recent Queries */}
      {recentQueries.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--rc-border-subtle)]" />
            <MonoLabel size="label" colour="ghost" className="w-auto shrink-0">RECENT</MonoLabel>
            <div className="h-px flex-1 bg-[var(--rc-border-subtle)]" />
          </div>

          <div className="flex flex-col">
            {recentQueries.map((query) => (
              <RecentQueryRow
                key={query.id}
                query={query}
                onReplay={() => onReplayQuery(query)}
                onDelete={() => onDeleteQuery(query.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Recent Query Row ──

interface RecentQueryRowProps {
  query: RecentQuery;
  onReplay: () => void;
  onDelete: () => void;
}

const RecentQueryRow: React.FC<RecentQueryRowProps> = ({ query, onReplay, onDelete }) => {
  const [swipeX, setSwipeX] = useState(0);
  const touchStartRef = useRef(0);
  const SWIPE_THRESHOLD = 80;

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 flex items-center px-4 bg-[var(--rc-accent-coral)]">
        <span className="text-white font-[var(--rc-font-mono)] text-xs uppercase">Delete</span>
      </div>

      <div
        className={cn(
          "relative flex items-center justify-between gap-3 py-3 px-2 bg-[var(--rc-surface-primary)] cursor-pointer group",
          "transition-transform duration-150"
        )}
        style={{ transform: `translateX(${swipeX}px)` }}
        onClick={onReplay}
        onTouchStart={(e) => { touchStartRef.current = e.touches[0].clientX; }}
        onTouchMove={(e) => {
          const diff = e.touches[0].clientX - touchStartRef.current;
          if (diff < 0) setSwipeX(Math.max(diff, -SWIPE_THRESHOLD));
        }}
        onTouchEnd={() => {
          if (swipeX < -SWIPE_THRESHOLD / 2) {
            onDelete();
          }
          setSwipeX(0);
        }}
      >
        <div className="flex-1 min-w-0">
          <Body size="body" colour="secondary" as="span" truncate className="w-auto">
            {query.queryText}
          </Body>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MonoLabel size="micro" colour="ghost" className="w-auto">
            → {query.resultCount} suggestion{query.resultCount !== 1 ? 's' : ''}
          </MonoLabel>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="hidden md:flex items-center justify-center w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--rc-surface-secondary)]"
            aria-label="Delete query"
          >
            <X size={14} className="text-[var(--rc-ink-ghost)]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OccasionGrid;
