import React, { useState, useRef, useEffect } from 'react';
import { Wine } from '@/types';
import { Wine as WineIcon, Plus, Minus } from 'lucide-react';
import { Card, Heading, MonoLabel, Chip, WineTypeIndicator } from '@/components/rc';
import { ImageWithFallback } from '@/components/rc/figma/ImageWithFallback';
import { toRCWineCardProps } from '@/lib/adapters';
import { formatGrapeDisplay } from '@/utils/grapeUtils';
import { getDirectImageUrl } from '@/utils/imageUrl';
import { cn } from '@/lib/utils';
import type { WineType } from '@/components/rc/WineTypeIndicator';

interface WineCardProps {
  wine: Wine;
  isHero?: boolean;
  onClick: () => void;
  onUpdate?: (key: string, value: string) => Promise<void>;
}

const getPriceSymbol = (price: number) => {
  if (price <= 20) return '$';
  if (price <= 40) return '$$';
  if (price <= 60) return '$$$';
  if (price <= 150) return '$$$$';
  return '$$$$$';
};

/** Map RC wine type to Heading colour token */
const wineTypeToHeadingColour = {
  red: 'accent-pink',
  white: 'accent-acid',
  rose: 'accent-coral',
  sparkling: 'accent-acid',
  dessert: 'accent-coral',
  orange: 'accent-coral',
} as const;

const WineCard: React.FC<WineCardProps> = ({ wine, isHero, onClick, onUpdate }) => {
  const rcProps = toRCWineCardProps(wine);
  const indicatorType = rcProps.type as WineType;
  // Grid view: prefer thumbnail for fast loading; fall back to full image
  const displayImageUrl = getDirectImageUrl(wine.thumbnailUrl || wine.resolvedImageUrl || wine.imageUrl);
  const stampRotation = React.useMemo(() => Math.random() * 6 - 3, []);
  const vintageColour = wineTypeToHeadingColour[rcProps.type];

  const [localQty, setLocalQty] = useState(Number(wine.quantity) || 0);
  const qtyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalQty(Number(wine.quantity) || 0);
  }, [wine.quantity]);

  const updateQuantity = (newQty: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalQty(newQty);
    if (qtyTimeoutRef.current) window.clearTimeout(qtyTimeoutRef.current);

    qtyTimeoutRef.current = window.setTimeout(async () => {
      if (onUpdate) {
        await onUpdate('quantity', newQty.toString());
      }
    }, 500);
  };

  const numericPrice = typeof wine.price === 'number' ? wine.price : parseFloat(wine.price as unknown as string) || 0;

  return (
    <Card
      elevation="raised"
      padding="standard"
      onClick={onClick}
      id={`wine-card-${wine.id}`}
      className={cn(
        "w-full group h-full",
        isHero && "ring-2 ring-[var(--rc-accent-pink)]"
      )}
    >
      {/* Wine Type Strip */}
      <WineTypeIndicator
        wineType={indicatorType}
        format="strip"
        className="group-hover:w-[var(--rc-card-strip-width-hover)] transition-all duration-200"
      />

      {/* FAVE Badge */}
      {isHero && (
        <div
          className="absolute top-1 sm:top-3 right-1 sm:right-3 z-10 bg-[var(--rc-ink-primary)] text-[var(--rc-ink-on-accent)] px-2 sm:px-4 py-1 sm:py-2 font-[var(--rc-font-mono)] text-[8px] sm:text-xs font-bold uppercase border-2 border-[var(--rc-ink-primary)] rounded-[var(--rc-radius-sm)]"
          style={{ transform: `rotate(${stampRotation}deg)`, boxShadow: '2px 2px 0 rgba(0,0,0,0.3)' }}
        >
          FAVE
        </div>
      )}

      {/* Image Zone */}
      <div className="relative w-full aspect-square rounded-[var(--rc-card-image-radius)] overflow-hidden shrink-0">
        {displayImageUrl ? (
          <ImageWithFallback
            src={displayImageUrl}
            alt={wine.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--rc-surface-secondary)]">
            <WineIcon size={64} className="text-[var(--rc-ink-primary)] opacity-10" />
          </div>
        )}
      </div>

      {/* Data Zone */}
      <div className="flex flex-col flex-1 mt-[var(--rc-card-gap-image-to-data)] min-w-0">
        {/* Wine Name */}
        <MonoLabel size="micro" weight="bold" colour="ghost" truncate className="mb-[var(--rc-card-gap-text-lines)]">
          {wine.name || ''}
        </MonoLabel>

        {/* Producer */}
        <MonoLabel size="label" colour="tertiary" uppercase={false} truncate className="mb-[var(--rc-card-gap-text-lines)]">
          {wine.producer}
        </MonoLabel>

        {/* Cepage / Varietal */}
        <Heading scale="heading" truncate maxLines={1} className="mb-[var(--rc-card-gap-text-lines)]">
          {formatGrapeDisplay(wine.grapeVarieties)}
        </Heading>

        {/* Vintage */}
        <Heading scale="vintage" colour={vintageColour} className="mb-[var(--rc-card-gap-text-lines)]">
          {rcProps.vintage}
        </Heading>

        {/* Price Symbol */}
        <MonoLabel size="micro" weight="bold" colour="ghost" className="opacity-40">
          {getPriceSymbol(numericPrice)}
        </MonoLabel>

        {/* Footer: Maturity Chip + Qty Controls */}
        <div className="mt-auto pt-[var(--rc-space-md)] border-t border-[var(--rc-border-subtle)] flex justify-between items-center">
          <Chip
            variant="Maturity"
            state="Selected"
            maturityValue={rcProps.maturity}
            label={rcProps.maturity.replace('-', ' ')}
          />

          <div className="flex items-center gap-1.5 sm:gap-2 bg-[var(--rc-ink-primary)] text-[var(--rc-ink-on-accent)] px-1.5 sm:px-2 py-0.5 sm:py-1 border-2 border-[var(--rc-ink-primary)] rounded-[var(--rc-radius-sm)]">
            <button
              onClick={(e) => updateQuantity(Math.max(0, localQty - 1), e)}
              className="p-0.5 hover:text-[var(--rc-accent-acid)] transition-colors"
            >
              <Minus size={10} className="sm:w-[14px] sm:h-[14px]" />
            </button>
            <span className="font-[var(--rc-font-display)] text-lg sm:text-2xl leading-none min-w-[1rem] text-center font-black">
              {localQty}
            </span>
            <button
              onClick={(e) => updateQuantity(localQty + 1, e)}
              className="p-0.5 hover:text-[var(--rc-accent-acid)] transition-colors"
            >
              <Plus size={10} className="sm:w-[14px] sm:h-[14px]" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default WineCard;
