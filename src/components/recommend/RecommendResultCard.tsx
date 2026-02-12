import React from 'react';
import { cn } from '@/lib/utils';
import { RANK_BADGES, REMYS_PICK_BADGE } from '@/constants';
import { MonoLabel, Body } from '@/components/rc';
import type { Recommendation } from '@/types';

interface RecommendResultCardProps {
  recommendation: Recommendation;
  isSurprise?: boolean;
  isSingleResult?: boolean;
  index: number;
  onAddToCellar?: (recommendation: Recommendation) => void;
}

const RecommendResultCard: React.FC<RecommendResultCardProps> = ({
  recommendation,
  isSurprise = false,
  isSingleResult = false,
  index,
  onAddToCellar,
}) => {
  const badge = isSurprise || isSingleResult
    ? REMYS_PICK_BADGE
    : RANK_BADGES[recommendation.rankLabel];

  const wineTypeColor = getWineTypeColor(recommendation.type);
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
      {/* Rank Badge — top-left */}
      <div
        className="absolute top-3 left-3 z-10 px-2 py-1 rounded-[4px]"
        style={{ backgroundColor: badge.bgColor, color: badge.textColor }}
      >
        <span className="font-[var(--rc-font-mono)] text-[11px] font-bold uppercase tracking-wider leading-none">
          {badge.text}
        </span>
      </div>

      <div className="flex gap-4 p-4 pt-12">
        {/* Wine thumbnail placeholder */}
        <div
          className="w-20 h-20 rounded-[6px] shrink-0 flex items-center justify-center text-3xl"
          style={{ backgroundColor: `${wineTypeColor}20` }}
        >
          🍷
        </div>

        {/* Wine info */}
        <div className="flex-1 min-w-0 space-y-1">
          <MonoLabel size="label" colour="secondary" className="w-auto" truncate>
            {recommendation.producer}
          </MonoLabel>
          <p className="font-[var(--rc-font-display)] font-black text-[var(--rc-ink-primary)] leading-tight">
            {recommendation.name}
          </p>
          <p className="font-[var(--rc-font-display)] font-black leading-tight" style={{ color: wineTypeColor }}>
            {recommendation.vintage} · {recommendation.type}
          </p>
        </div>
      </div>

      {/* Rationale */}
      <div className="px-4 pb-3">
        <Body size="caption" colour="secondary" as="p" maxLines={isSurprise ? 4 : 2} className="italic">
          {recommendation.rationale}
        </Body>
      </div>

      {/* Metadata row */}
      <div className="flex items-center flex-wrap gap-2 px-4 pb-4">
        {/* Maturity chip */}
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-[var(--rc-font-mono)] uppercase tracking-wider",
          maturityLabel === 'DRINK NOW' && "bg-[rgba(255,0,110,0.1)] text-[var(--rc-accent-pink)]",
          maturityLabel === 'HOLD' && "bg-[rgba(199,255,0,0.2)] text-[var(--rc-ink-primary)]",
          maturityLabel === 'PAST PEAK' && "bg-[rgba(255,106,77,0.1)] text-[var(--rc-accent-coral)]"
        )}>
          {maturityLabel}
        </span>

        {/* Rating */}
        {recommendation.rating != null && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--rc-badge-rating-bg,#f5f0e8)] text-[12px] font-bold font-[var(--rc-font-display)]">
            ★ {recommendation.rating.toFixed(1)}
          </span>
        )}

        {/* Cellar status */}
        <span className={cn(
          "text-[11px] font-[var(--rc-font-mono)] uppercase tracking-wider",
          recommendation.isFromCellar ? "text-[var(--rc-ink-tertiary)]" : "text-[var(--rc-accent-coral)]"
        )}>
          {recommendation.isFromCellar ? 'From cellar' : 'Not in your cellar'}
        </span>
      </div>

      {/* Bottom actions */}
      {recommendation.isFromCellar && recommendation.wineId && (
        <div className="px-4 pb-4">
          <button className="text-[var(--rc-accent-pink)] underline underline-offset-4 font-[var(--rc-font-mono)] text-xs uppercase tracking-wider">
            Open bottle detail →
          </button>
        </div>
      )}
      {!recommendation.isFromCellar && (
        <div className="px-4 pb-4">
          <button
            onClick={() => onAddToCellar?.(recommendation)}
            className="text-[var(--rc-accent-pink)] underline underline-offset-4 font-[var(--rc-font-mono)] text-xs uppercase tracking-wider"
          >
            Add to cellar →
          </button>
        </div>
      )}
    </div>
  );
};

// ── Helpers ──

function getWineTypeColor(type: string): string {
  const map: Record<string, string> = {
    'Red': 'var(--rc-accent-pink)',
    'White': 'var(--rc-accent-acid)',
    'Rosé': 'var(--rc-accent-coral)',
    'Sparkling': '#ffd700',
    'Dessert': '#d4a574',
    'Fortified': '#6b4226',
  };
  return map[type] || 'var(--rc-ink-secondary)';
}

function formatMaturity(maturity: string): string {
  const m = maturity?.toUpperCase().replace(/_/g, ' ') || 'DRINK NOW';
  if (m.includes('DRINK')) return 'DRINK NOW';
  if (m.includes('HOLD')) return 'HOLD';
  if (m.includes('PAST') || m.includes('PEAK')) return 'PAST PEAK';
  return m;
}

export default RecommendResultCard;
