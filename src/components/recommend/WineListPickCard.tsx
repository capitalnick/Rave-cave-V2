import React from 'react';
import { Body, MonoLabel } from '@/components/rc';
import { RANK_BADGES } from '@/constants';
import type { WineListPick, WineListEntry, RankLabel } from '@/types';

interface WineListPickCardProps {
  pick: WineListPick;
  entry: WineListEntry;
}

const WineListPickCard: React.FC<WineListPickCardProps> = ({ pick, entry }) => {
  const badge = RANK_BADGES[pick.rankLabel] || RANK_BADGES['best-match'];
  const isOutlined = pick.rankLabel === 'value';

  const price = entry.priceBottle != null
    ? `${entry.currency} ${entry.priceBottle}`
    : entry.priceGlass != null
      ? `${entry.currency} ${entry.priceGlass}/glass`
      : null;

  return (
    <div className="border border-[var(--rc-border-subtle)] rounded-[var(--rc-radius-md)] p-4 bg-[var(--rc-surface-primary)] space-y-2">
      {/* Badge row */}
      <div className="flex items-center gap-2">
        <span
          className="px-2 py-0.5 rounded-full font-[var(--rc-font-mono)] text-[10px] font-bold uppercase tracking-wider"
          style={isOutlined
            ? { border: `1.5px solid ${badge.textColor}`, color: badge.textColor, background: 'transparent' }
            : { backgroundColor: badge.bgColor, color: badge.textColor }
          }
        >
          {badge.text}
        </span>
        {pick.cellarMatchNote && (
          <span className="px-2 py-0.5 rounded-full bg-[var(--rc-accent-acid)] text-[var(--rc-ink-primary)] font-[var(--rc-font-mono)] text-[10px] font-bold uppercase tracking-wider">
            IN YOUR CELLAR
          </span>
        )}
      </div>

      {/* Wine details */}
      <div>
        <Body size="body" weight="medium">
          {entry.producer}{entry.name ? ` ${entry.name}` : ''}
        </Body>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.vintage && (
            <MonoLabel size="micro" colour="secondary" className="w-auto">{entry.vintage}</MonoLabel>
          )}
          {entry.type && (
            <MonoLabel size="micro" colour="ghost" className="w-auto">{entry.type}</MonoLabel>
          )}
          {price && (
            <MonoLabel size="micro" colour="secondary" className="w-auto">{price}</MonoLabel>
          )}
        </div>
      </div>

      {/* Rationale */}
      <Body size="caption" colour="secondary">{pick.rationale}</Body>

      {/* Cellar match note */}
      {pick.cellarMatchNote && (
        <MonoLabel size="micro" colour="accent-acid" className="w-auto">
          {pick.cellarMatchNote}
        </MonoLabel>
      )}
    </div>
  );
};

export default WineListPickCard;
