import React from 'react';
import { cn } from '@/lib/utils';
import { RANK_BADGES, REMYS_PICK_BADGE } from '@/constants';
import { Heading, MonoLabel, Body } from '@/components/rc';
import { ImageWithFallback } from '@/components/rc/figma/ImageWithFallback';
import WineIcon from '@/components/icons/WineIcon';
import type { Recommendation } from '@/types';

interface RecommendResultCardProps {
  recommendation: Recommendation;
  imageUrl?: string;
  isSurprise?: boolean;
  isSingleResult?: boolean;
  index: number;
  onAddToCellar?: (recommendation: Recommendation) => void;
  onViewWine?: (wineId: string) => void;
}

const BADGE_W = 'w-[120px]';
const BADGE_H = 'h-[44px]';

const RecommendResultCard: React.FC<RecommendResultCardProps> = ({
  recommendation,
  imageUrl,
  isSurprise = false,
  isSingleResult = false,
  index,
  onAddToCellar,
  onViewWine,
}) => {
  const badge = isSurprise || isSingleResult
    ? REMYS_PICK_BADGE
    : RANK_BADGES[recommendation.rankLabel];

  const maturityLabel = formatMaturity(recommendation.maturity);

  return (
    <div
      className={cn(
        "relative bg-[var(--rc-surface-elevated,var(--rc-surface-primary))] rounded-[8px] shadow-[var(--rc-card-shadow-raised)] overflow-hidden",
        "transition-all duration-200",
        "active:scale-[0.98] active:duration-100",
        "md:hover:shadow-[var(--rc-card-shadow-hover)]"
      )}
      style={{
        animation: `slideInFromRight 400ms cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 60}ms both`,
      }}
    >
      <div className="flex gap-4 p-4">
        {/* Left column: badge + thumbnail (card-within-card) */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          {/* Rank badge — fixed size, centered text, wraps if needed */}
          <div
            className={cn(
              BADGE_W, BADGE_H,
              "flex items-center justify-center rounded-[6px] px-2 text-center"
            )}
            style={{ backgroundColor: badge.bgColor, color: badge.textColor }}
          >
            <span className="font-[var(--rc-font-mono)] text-[10px] font-bold uppercase tracking-wider leading-tight">
              {badge.text}
            </span>
          </div>

          {/* Wine thumbnail — card within card */}
          <div
            className={cn(
              BADGE_W, "aspect-[3/4] rounded-[6px] overflow-hidden",
              "bg-[var(--rc-surface-secondary)] border border-[var(--rc-border-subtle)]",
              "flex items-center justify-center"
            )}
          >
            {imageUrl ? (
              <ImageWithFallback
                src={imageUrl}
                alt={`${recommendation.producer} ${recommendation.name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <WineIcon size={32} className="opacity-30 text-[var(--rc-ink-ghost)]" />
            )}
          </div>
        </div>

        {/* Right column: wine info + rationale + metadata */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Wine info */}
          <div className="space-y-1">
            <MonoLabel size="label" colour="secondary" className="w-auto" truncate>
              {recommendation.producer}
            </MonoLabel>
            <Heading scale="subhead" as="p">
              {recommendation.name}
            </Heading>
            <Heading scale="subhead" as="p" colour={getWineTypeHeadingColour(recommendation.type)}>
              {recommendation.vintage} · {recommendation.type}
            </Heading>
          </div>

          {/* Rationale */}
          <Body size="caption" colour="secondary" as="p" maxLines={isSurprise ? 4 : 2} className="italic">
            {recommendation.rationale}
          </Body>

          {/* Metadata row */}
          <div className="flex items-center flex-wrap gap-2">
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-[var(--rc-font-mono)] uppercase tracking-wider",
              maturityLabel === 'DRINK NOW' && "bg-[rgba(255,0,110,0.1)] text-[var(--rc-accent-pink)]",
              maturityLabel === 'HOLD' && "bg-[rgba(199,255,0,0.2)] text-[var(--rc-ink-primary)]",
              maturityLabel === 'PAST PEAK' && "bg-[rgba(255,106,77,0.1)] text-[var(--rc-accent-coral)]"
            )}>
              {maturityLabel}
            </span>

            {recommendation.rating != null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--rc-badge-rating-bg,#f5f0e8)] text-[12px] font-bold font-[var(--rc-font-display)]">
                ★ {recommendation.rating.toFixed(1)}
              </span>
            )}

            <MonoLabel size="micro" colour={recommendation.isFromCellar ? 'tertiary' : 'accent-coral'} as="span" className="w-auto">
              {recommendation.isFromCellar ? 'From cellar' : 'Not in your cellar'}
            </MonoLabel>
          </div>

          {/* Action link */}
          {recommendation.isFromCellar && recommendation.wineId ? (
            <button
              onClick={() => onViewWine?.(recommendation.wineId)}
              className="text-[var(--rc-accent-pink)] underline underline-offset-4 font-[var(--rc-font-mono)] text-xs uppercase tracking-wider text-left"
            >
              Open bottle detail →
            </button>
          ) : (
            <button
              onClick={() => {
                const q = [recommendation.producer, recommendation.name, recommendation.type, recommendation.vintage]
                  .map(v => String(v ?? '').trim())
                  .filter(Boolean)
                  .join(' ');
                if (q) window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
              }}
              className="text-[var(--rc-accent-pink)] underline underline-offset-4 font-[var(--rc-font-mono)] text-xs uppercase tracking-wider text-left"
            >
              Search for wine →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Helpers ──

type HeadingColour = 'primary' | 'secondary' | 'on-accent' | 'accent-pink' | 'accent-acid' | 'accent-coral';

function getWineTypeHeadingColour(type: string): HeadingColour {
  const map: Record<string, HeadingColour> = {
    'Red': 'accent-pink',
    'White': 'accent-acid',
    'Rosé': 'accent-coral',
    'Sparkling': 'accent-acid',
    'Dessert': 'accent-coral',
    'Fortified': 'accent-coral',
  };
  return map[type] || 'secondary';
}

function formatMaturity(maturity: string): string {
  const m = maturity?.toUpperCase().replace(/_/g, ' ') || 'DRINK NOW';
  if (m.includes('DRINK')) return 'DRINK NOW';
  if (m.includes('HOLD')) return 'HOLD';
  if (m.includes('PAST') || m.includes('PEAK')) return 'PAST PEAK';
  return m;
}

export default RecommendResultCard;
