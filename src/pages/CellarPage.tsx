import React from 'react';
import { Loader2 } from 'lucide-react';
import WineCard from '@/components/WineCard';
import { useInventory } from '@/context/InventoryContext';
import { useScrollSentinel } from '@/hooks/useScrollSentinel';
import { Input } from '@/components/rc';

/* ── Condensed sticky header ─────────────────────────── */
const CondensedHeader: React.FC<{
  isPastHero: boolean;
  search: string;
  setSearch: (v: string) => void;
  totalBottles: number;
  totalLabels: number;
}> = ({ isPastHero, search, setSearch, totalBottles, totalLabels }) => (
  <div
    className="sticky top-0 z-[var(--rc-z-sticky)] flex items-center gap-4 px-4 sm:px-10 bg-[var(--rc-surface-elevated)] border-b border-[var(--rc-border-subtle)] transition-opacity duration-150 motion-reduce:transition-none"
    style={{
      height: 56,
      opacity: isPastHero ? 1 : 0,
      pointerEvents: isPastHero ? 'auto' : 'none',
    }}
  >
    <div className="flex-1 max-w-md">
      <Input
        typeVariant="Search"
        sizeVariant="Desktop"
        placeholder="SEARCH PRODUCER OR LABEL..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
    <div className="flex gap-4 items-baseline font-mono text-xs uppercase tracking-widest text-[var(--rc-ink-ghost)] ml-auto flex-shrink-0">
      <span>
        <span className="text-[var(--rc-accent-pink)] font-display text-lg">{totalBottles}</span> bottles
      </span>
      <span>
        <span className="text-[var(--rc-accent-acid)] font-display text-lg text-stroke-black">{totalLabels}</span> labels
      </span>
    </div>
  </div>
);

const CellarPage: React.FC = () => {
  const {
    isSynced,
    loading,
    search,
    setSearch,
    filteredInventory,
    totalBottlesFiltered,
    heroWineIds,
    clearFilters,
    setSelectedWine,
    handleUpdate,
  } = useInventory();

  const { sentinelRef, isPastHero } = useScrollSentinel();

  return (
    <div data-scroll-container className="h-full overflow-y-auto">
      <CondensedHeader
        isPastHero={isPastHero}
        search={search}
        setSearch={setSearch}
        totalBottles={totalBottlesFiltered}
        totalLabels={filteredInventory.length}
      />

      {/* Hero section */}
      <div className="p-4 sm:p-10 space-y-6 sm:space-y-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="space-y-2 flex-1 w-full">
            <h2 className="font-display text-5xl sm:text-7xl lg:text-8xl leading-none uppercase tracking-tighter">Your Cave</h2>
            <p className="font-mono text-[10px] sm:text-sm uppercase tracking-widest text-[var(--rc-ink-ghost)]">
              Firestore &bull; {isSynced ? 'Live Synchronized' : 'Connecting...'}
            </p>

            <div className="mt-4 sm:mt-6 max-w-xl">
              <Input
                typeVariant="Search"
                sizeVariant="Desktop"
                placeholder="SEARCH PRODUCER OR LABEL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4 sm:gap-8 font-display text-2xl sm:text-4xl leading-none tracking-tight flex-shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[var(--rc-accent-pink)] text-4xl sm:text-6xl">{totalBottlesFiltered}</span>
              <span className="text-[9px] sm:text-xs font-mono uppercase tracking-widest text-[var(--rc-ink-primary)]">Bottles</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[var(--rc-accent-acid)] text-4xl sm:text-6xl text-stroke-black">{filteredInventory.length}</span>
              <span className="text-[9px] sm:text-xs font-mono uppercase tracking-widest text-[var(--rc-ink-primary)]">Labels</span>
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
                <p className="font-display text-4xl sm:text-6xl text-[var(--rc-ink-ghost)]">NO RECORDS FOUND</p>
                <button onClick={clearFilters} className="mt-6 bg-[var(--rc-ink-primary)] text-[var(--rc-ink-on-accent)] px-8 py-3 font-mono text-xs uppercase tracking-widest hover:bg-[var(--rc-accent-pink)]">Reset All</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CellarPage;
