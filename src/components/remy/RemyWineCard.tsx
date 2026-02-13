import React from 'react';
import { Heading, Body, MonoLabel, Badge } from '@/components/rc';
import type { RemyWineData } from '@/utils/remyParser';
import type { Wine } from '@/types';

interface RemyWineCardProps {
  wine: RemyWineData;
  index: number;
  onAddToCellar?: (wine: RemyWineData) => void;
  cellarMatch?: Wine;
  onViewWine?: (wine: Wine) => void;
}

const RemyWineCard: React.FC<RemyWineCardProps> = ({ wine, index, onAddToCellar, cellarMatch, onViewWine }) => {
  const displayName = wine.vintage
    ? `${wine.name} ${wine.vintage}`
    : wine.name;

  const meta = [wine.producer, wine.region, wine.type].filter(Boolean).join(' / ');

  return (
    <div
      className="bg-[var(--rc-surface-primary)] rounded-xl p-4 mt-3"
      style={{
        animation: 'remyCardFadeIn 300ms ease-out both',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <Heading scale="subhead" colour="primary" as="h4" className="mb-1">
        {displayName}
      </Heading>

      {meta && (
        <MonoLabel size="label" colour="tertiary" as="span" className="w-auto">
          {meta}
        </MonoLabel>
      )}

      <div className="flex items-center gap-3 mt-2">
        {wine.rating != null && (
          <Badge typeVariant="Rating" label={wine.rating.toFixed(1)} />
        )}
      </div>

      {wine.note && (
        <Body size="caption" colour="secondary" as="p" className="mt-2 italic w-auto">
          {wine.note}
        </Body>
      )}

      {cellarMatch && onViewWine ? (
        <button
          onClick={() => onViewWine(cellarMatch)}
          className="mt-3 font-[var(--rc-font-mono)] text-[11px] uppercase tracking-wider text-[var(--rc-accent-acid)] underline underline-offset-2 hover:text-[var(--rc-accent-pink)] transition-colors"
        >
          Open bottle detail &rarr;
        </button>
      ) : onAddToCellar ? (
        <button
          onClick={() => onAddToCellar(wine)}
          className="mt-3 font-[var(--rc-font-mono)] text-[11px] uppercase tracking-wider text-[var(--rc-accent-pink)] underline underline-offset-2 hover:text-[var(--rc-accent-coral)] transition-colors"
        >
          Add to cellar &rarr;
        </button>
      ) : null}
    </div>
  );
};

export default RemyWineCard;
