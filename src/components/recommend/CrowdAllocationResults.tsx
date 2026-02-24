import React from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Button, Heading, MonoLabel } from '@/components/rc';
import type { CrowdAllocation, CrowdAllocationItem, WineType } from '@/types';

interface CrowdAllocationResultsProps {
  allocation: CrowdAllocation;
  cellarOnly: boolean;
  onStartOver: () => void;
  onHandoffToRemy: () => void;
}

const WINE_TYPE_ACCENT: Record<string, string> = {
  Red:       'var(--rc-accent-pink)',
  White:     'var(--rc-accent-acid)',
  'Rosé':    'var(--rc-accent-coral)',
  Sparkling: 'var(--rc-accent-acid)',
  Dessert:   'var(--rc-accent-coral)',
  Fortified: 'var(--rc-accent-coral)',
};

function getAccentColor(wineType: string): string {
  return WINE_TYPE_ACCENT[wineType] || 'var(--rc-accent-pink)';
}

function buildSearchUrl(item: CrowdAllocationItem): string {
  const q = encodeURIComponent(`${item.producer} ${item.wineName} ${item.vintage} wine buy`);
  return `https://www.google.com/search?q=${q}`;
}

const CrowdAllocationResults: React.FC<CrowdAllocationResultsProps> = ({
  allocation,
  cellarOnly,
  onStartOver,
  onHandoffToRemy,
}) => {
  const hasNonCellar = allocation.items.some(i => !i.inCellar);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 sm:p-10 gap-6">
      {/* Header */}
      <div className="space-y-1">
        {allocation.vibeLabel && (
          <MonoLabel size="label" colour="ghost">{allocation.vibeLabel.toUpperCase()}</MonoLabel>
        )}
        <Heading scale="heading">YOUR CROWD</Heading>
      </div>

      {/* Total bottles hero */}
      <div className="flex items-center gap-3 rounded-lg bg-[var(--rc-surface-secondary)] border-l-4 border-[var(--rc-accent-acid)] px-4 py-3">
        <span className="font-[var(--rc-font-display)] font-black text-4xl text-[var(--rc-ink-primary)] tabular-nums">
          {allocation.totalBottles}
        </span>
        <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider text-[var(--rc-ink-secondary)]">
          bottles
        </span>
      </div>

      {/* Non-cellar notice */}
      {!cellarOnly && hasNonCellar && (
        <div className="rounded-lg bg-[var(--rc-surface-tertiary)] px-4 py-2.5">
          <MonoLabel size="micro" colour="secondary">
            Includes wines to source &middot; tap a card to search
          </MonoLabel>
        </div>
      )}

      {/* Rémy's note */}
      {allocation.remyNote && (
        <p className="font-[var(--rc-font-body)] text-sm text-[var(--rc-ink-secondary)] italic leading-relaxed">
          "{allocation.remyNote}"
        </p>
      )}

      {/* Wine cards */}
      <div className="grid grid-cols-1 gap-3">
        {allocation.items.map((item, i) => (
          <AllocationCard key={`${item.producer}-${item.vintage}-${i}`} item={item} cellarOnly={cellarOnly} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pb-8">
        <Button variantType="Secondary" label="Start Over" onClick={onStartOver} className="flex-1" />
        <Button
          variantType="Primary"
          label="Refine with Rémy"
          iconAsset={ArrowRight}
          iconPosition="Trailing"
          onClick={onHandoffToRemy}
          className="flex-1"
        />
      </div>

      {/* Slide-in keyframes */}
      <style>{`
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

// ── Individual Allocation Card ──

interface AllocationCardProps {
  item: CrowdAllocationItem;
  cellarOnly: boolean;
}

const AllocationCard: React.FC<AllocationCardProps> = ({ item, cellarOnly }) => {
  const accent = getAccentColor(item.wineType);
  const isExternal = !item.inCellar;

  return (
    <div
      className="relative rounded-lg border border-[var(--rc-border-subtle)] bg-white overflow-hidden"
      style={{ animation: 'slideInFromRight 0.4s ease-out both' }}
    >
      {/* Left accent strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: accent }}
      />

      <div className="pl-4 pr-4 py-4">
        {/* Top row: role + badges */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: accent, color: accent === 'var(--rc-accent-acid)' ? 'var(--rc-ink-primary)' : 'white' }}
          >
            {item.role}
          </span>
          {isExternal && !cellarOnly && (
            <span className="inline-block px-2 py-0.5 rounded border border-[var(--rc-border-subtle)] text-[10px] font-bold uppercase tracking-wider text-[var(--rc-ink-ghost)] font-[var(--rc-font-mono)]">
              TO SOURCE
            </span>
          )}
          {/* Bottle count */}
          <span className="ml-auto font-[var(--rc-font-display)] font-black text-lg tabular-nums text-[var(--rc-ink-primary)]">
            {item.bottles}<span className="text-xs font-normal text-[var(--rc-ink-ghost)] ml-0.5">btl{item.bottles !== 1 ? 's' : ''}</span>
          </span>
        </div>

        {/* Wine details */}
        <div className="space-y-0.5">
          <p className="font-[var(--rc-font-display)] font-bold text-sm text-[var(--rc-ink-primary)] leading-tight">
            {item.producer}
          </p>
          {item.wineName && (
            <p className="font-[var(--rc-font-body)] text-sm text-[var(--rc-ink-secondary)] leading-tight">
              {item.wineName}
            </p>
          )}
          <div className="flex items-center gap-2">
            <MonoLabel size="micro" colour="ghost">{item.vintage}</MonoLabel>
            {item.region && (
              <>
                <span className="text-[var(--rc-ink-ghost)]">&middot;</span>
                <MonoLabel size="micro" colour="ghost">{item.region}</MonoLabel>
              </>
            )}
            <span className="text-[var(--rc-ink-ghost)]">&middot;</span>
            <MonoLabel size="micro" colour="ghost">{item.wineType}</MonoLabel>
          </div>
        </div>

        {/* Rationale */}
        {item.rationale && (
          <p className="mt-2 font-[var(--rc-font-body)] text-xs text-[var(--rc-ink-ghost)] leading-relaxed">
            {item.rationale}
          </p>
        )}

        {/* External search CTA */}
        {isExternal && !cellarOnly && (
          <a
            href={buildSearchUrl(item)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[var(--rc-accent-pink)] font-[var(--rc-font-mono)] text-[10px] uppercase tracking-wider font-bold hover:underline"
          >
            <ExternalLink size={12} />
            Search this bottle
          </a>
        )}
      </div>
    </div>
  );
};

export default CrowdAllocationResults;
