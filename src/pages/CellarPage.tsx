import React from 'react';
import { Loader2, Filter } from 'lucide-react';
import WineCard from '@/components/WineCard';
import { useInventory } from '@/context/InventoryContext';
import { useScrollSentinel } from '@/hooks/useScrollSentinel';
import { IconButton, Heading, MonoLabel, PageHeader } from '@/components/rc';
import WineIcon from '@/components/icons/WineIcon';
import { SortMenu } from '@/components/SortMenu';
import type { SortField } from '@/types';

/* ── Condensed sticky header ─────────────────────────── */
const CondensedHeader: React.FC<{
  isPastHero: boolean;
  totalBottles: number;
  totalLabels: number;
  activeFilterCount: number;
  onFilterPress: () => void;
  sortField: SortField;
  setSortField: (f: SortField) => void;
}> = ({ isPastHero, totalBottles, totalLabels, activeFilterCount, onFilterPress, sortField, setSortField }) => (
  <div
    className="sticky top-0 z-[var(--rc-z-sticky)] flex items-center gap-3 sm:gap-4 px-4 sm:px-10 bg-[var(--rc-surface-elevated)] border-b border-[var(--rc-border-subtle)] transition-opacity duration-150 motion-reduce:transition-none"
    style={{
      height: 56,
      opacity: isPastHero ? 1 : 0,
      pointerEvents: isPastHero ? 'auto' : 'none',
    }}
  >
    {/* Counts — left */}
    <div className="flex gap-3 sm:gap-4 items-center font-mono text-xs uppercase tracking-widest text-[var(--rc-ink-ghost)]">
      <span className="flex items-baseline gap-1">
        <span className="text-[var(--rc-accent-pink)] font-display text-lg">{totalBottles}</span> bottles
      </span>
      <span className="flex items-baseline gap-1">
        <span className="text-[var(--rc-accent-acid)] font-display text-lg text-stroke-black">{totalLabels}</span> labels
      </span>
    </div>

    {/* Filter + Sort — right */}
    <div className="flex gap-2 items-center ml-auto flex-shrink-0">
      <div className="relative">
        <IconButton icon={Filter} aria-label="Filter" onClick={onFilterPress} />
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--rc-ink-primary)] text-[var(--rc-accent-acid)] font-[var(--rc-font-mono)] text-[9px] font-bold">
            {activeFilterCount}
          </span>
        )}
      </div>
      <SortMenu value={sortField} onChange={setSortField} iconButton />
    </div>
  </div>
);

const CellarPage: React.FC = () => {
  const {
    loading,
    filteredInventory,
    totalBottlesFiltered,
    heroWineIds,
    clearFilters,
    setSelectedWine,
    handleUpdate,
    sortField,
    setSortField,
    activeFilterCount,
    setMobileFiltersOpen,
  } = useInventory();

  const { sentinelRef, isPastHero } = useScrollSentinel();

  const openFilters = () => setMobileFiltersOpen(true);

  return (
    <div data-scroll-container className="h-full overflow-y-auto">
      <CondensedHeader
        isPastHero={isPastHero}
        totalBottles={totalBottlesFiltered}
        totalLabels={filteredInventory.length}
        activeFilterCount={activeFilterCount}
        onFilterPress={openFilters}
        sortField={sortField}
        setSortField={setSortField}
      />

      {/* Hero section */}
      <div className="p-4 sm:p-10 space-y-4 sm:space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="flex-1 w-full">
            <PageHeader title="THE COLLECTION" subtitle="Your cellar inventory" />
          </div>

          <div className="flex gap-4 sm:gap-6 items-end flex-shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[var(--rc-accent-pink)] text-4xl sm:text-6xl font-display leading-none tracking-tight">{totalBottlesFiltered}</span>
              <span className="text-[9px] sm:text-xs font-mono uppercase tracking-widest text-[var(--rc-ink-primary)]">Bottles</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[var(--rc-accent-acid)] text-4xl sm:text-6xl font-display leading-none tracking-tight text-stroke-black">{filteredInventory.length}</span>
              <span className="text-[9px] sm:text-xs font-mono uppercase tracking-widest text-[var(--rc-ink-primary)]">Labels</span>
            </div>
            <div className="flex gap-2 items-center self-center">
              <div className="relative">
                <IconButton icon={Filter} aria-label="Filter" onClick={openFilters} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--rc-ink-primary)] text-[var(--rc-accent-acid)] font-[var(--rc-font-mono)] text-[9px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <SortMenu value={sortField} onChange={setSortField} iconButton />
            </div>
          </div>
        </div>

        {/* Sentinel — marks bottom of hero */}
        <div ref={sentinelRef} />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-[var(--rc-accent-pink)]" size={48} />
            <p className="font-mono text-sm sm:text-xl animate-pulse">SYNCHRONIZING...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8 pb-24 sm:pb-20">
            {filteredInventory.map(wine => (
              <WineCard
                key={wine.id}
                wine={wine}
                isHero={heroWineIds.includes(wine.id)}
                onClick={() => setSelectedWine(wine)}
                onUpdate={(key, value) => handleUpdate(wine, key, value)}
              />
            ))}
            {filteredInventory.length === 0 && (
              <div className="col-span-full py-20 sm:py-40 text-center border-4 sm:border-8 border-dashed border-[var(--rc-ink-ghost)] bg-[var(--rc-surface-elevated)]/50 px-4">
                <p className="font-display text-4xl sm:text-6xl text-[var(--rc-ink-ghost)]">Your cellar awaits its first libation.</p>
                <p className="mt-3 font-mono text-sm text-[var(--rc-ink-ghost)]">Add a bottle to begin.</p>
                <button onClick={clearFilters} className="mt-6 bg-[var(--rc-ink-primary)] text-[var(--rc-ink-on-accent)] px-8 py-3 font-mono text-xs uppercase tracking-widest hover:bg-[var(--rc-accent-pink)]">Add to Cellar</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CellarPage;
