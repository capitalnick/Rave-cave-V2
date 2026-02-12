import React, { useState, useRef } from 'react';
import { Wine } from '@/types';
import { Star, Wine as WineIcon, Plus, Minus, MapPin, ExternalLink } from 'lucide-react';
import { getDirectImageUrl } from '@/utils/imageUrl';
import { toRCWineCardProps } from '@/lib/adapters';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { RightPanel } from '@/components/ui/right-panel';
import { Heading, MonoLabel, Body, Badge, Chip, Divider, Input, WineTypeIndicator } from '@/components/rc';
import { ImageWithFallback } from '@/components/rc/figma/ImageWithFallback';
import { useIsMobile } from '@/components/ui/use-mobile';
import { cn } from '@/lib/utils';
import type { WineType } from '@/components/rc/WineTypeIndicator';

interface WineModalProps {
  wine: Wine;
  onClose: () => void;
  onUpdate?: (key: string, value: string) => Promise<void>;
}

/** Map RC wine type to Heading colour token */
const wineTypeToHeadingColour = {
  red: 'accent-pink',
  white: 'accent-acid',
  rose: 'accent-coral',
  sparkling: 'accent-acid',
  dessert: 'accent-coral',
  orange: 'accent-coral',
} as const;

// ── Inner content (surface-agnostic) ──

const WineDetailContent: React.FC<{
  wine: Wine;
  onUpdate?: (key: string, value: string) => Promise<void>;
}> = ({ wine, onUpdate }) => {
  const rcProps = toRCWineCardProps(wine);
  const vintageColour = wineTypeToHeadingColour[rcProps.type];
  const displayImageUrl = getDirectImageUrl(wine.resolvedImageUrl || wine.imageUrl);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [updating, setUpdating] = useState(false);

  const [localQty, setLocalQty] = useState(Number(wine.quantity) || 0);
  const qtyTimeoutRef = useRef<number | null>(null);

  const updateQuantity = (newQty: number) => {
    setLocalQty(newQty);
    if (qtyTimeoutRef.current) window.clearTimeout(qtyTimeoutRef.current);
    qtyTimeoutRef.current = window.setTimeout(async () => {
      if (onUpdate) await onUpdate('quantity', newQty.toString());
    }, 500);
  };

  const handleUpdate = async (key: string) => {
    if (!onUpdate) return;
    setUpdating(true);
    try {
      await onUpdate(key, editValue);
      setEditingField(null);
    } catch (e) {
      console.error('Update failed', e);
    } finally {
      setUpdating(false);
    }
  };

  const formatPriceLabel = (p: string | number) => {
    const val = typeof p === 'string' ? parseFloat(p) : p;
    return !isNaN(val) && val > 0 ? `$${val.toFixed(0)}` : '';
  };

  const renderField = (label: string, key: string, value: string | number, fullWidth: boolean = false) => {
    const isEditing = editingField === label;
    const strValue = (value ?? '').toString();
    const displayValue = label === 'Bottle Price' ? formatPriceLabel(strValue) : strValue;

    return (
      <div className={cn(
        "space-y-1 p-[var(--rc-space-md)] border border-[var(--rc-border-emphasis)] bg-[var(--rc-surface-primary)] rounded-[var(--rc-radius-sm)]",
        fullWidth && "md:col-span-2"
      )}>
        <dt>
          <MonoLabel size="micro" weight="bold" colour="accent-pink" as="span" className="w-auto">{label}</MonoLabel>
        </dt>
        <dd>
          <Body size="caption" colour="primary" as="span" className="w-auto">
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="flex-1"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleUpdate(key)}
                />
                <button
                  onClick={() => handleUpdate(key)}
                  disabled={updating}
                  className="bg-[var(--rc-accent-acid)] px-3 py-0.5 border border-[var(--rc-ink-primary)] font-[var(--rc-font-mono)] font-bold uppercase text-[9px] rounded-[var(--rc-radius-sm)]"
                >
                  {updating ? '...' : 'SAVE'}
                </button>
              </div>
            ) : (
              <span
                onClick={() => { setEditingField(label); setEditValue(strValue); }}
                className="cursor-pointer hover:bg-[var(--rc-surface-secondary)] block min-h-[1rem] rounded-[var(--rc-radius-sm)] transition-colors"
              >
                {displayValue || ''}
              </span>
            )}
          </Body>
        </dd>
      </div>
    );
  };

  const renderLinkField = (label: string, key: string, value: string | undefined) => {
    const isEditing = editingField === label;
    const strValue = (value ?? '').toString();
    const href = strValue.startsWith('http') ? strValue : strValue ? `https://${strValue}` : '';

    return (
      <div className="space-y-1 p-[var(--rc-space-md)] border border-[var(--rc-border-emphasis)] bg-[var(--rc-surface-primary)] rounded-[var(--rc-radius-sm)] md:col-span-2">
        <dt>
          <MonoLabel size="micro" weight="bold" colour="accent-pink" as="span" className="w-auto">{label}</MonoLabel>
        </dt>
        <dd>
          <Body size="caption" colour="primary" as="span" className="w-auto">
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="flex-1"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleUpdate(key)}
                />
                <button
                  onClick={() => handleUpdate(key)}
                  disabled={updating}
                  className="bg-[var(--rc-accent-acid)] px-3 py-0.5 border border-[var(--rc-ink-primary)] font-[var(--rc-font-mono)] font-bold uppercase text-[9px] rounded-[var(--rc-radius-sm)]"
                >
                  {updating ? '...' : 'SAVE'}
                </button>
              </div>
            ) : strValue ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline cursor-pointer"
                onClick={e => e.stopPropagation()}
              >
                <span className="break-all">{strValue}</span>
                <ExternalLink size={12} className="shrink-0" />
              </a>
            ) : (
              <span
                onClick={() => { setEditingField(label); setEditValue(strValue); }}
                className="cursor-pointer hover:bg-[var(--rc-surface-secondary)] block min-h-[1rem] rounded-[var(--rc-radius-sm)] transition-colors"
              />
            )}
          </Body>
          {!isEditing && strValue && (
            <button
              onClick={() => { setEditingField(label); setEditValue(strValue); }}
              className="mt-1"
            >
              <MonoLabel size="micro" colour="ghost" as="span" className="w-auto cursor-pointer hover:underline">edit</MonoLabel>
            </button>
          )}
        </dd>
      </div>
    );
  };

  return (
    <>
      {/* Hero Image */}
      <div className="relative">
        <div className="h-60 bg-[var(--rc-ink-primary)] flex items-center justify-center overflow-hidden">
          {displayImageUrl ? (
            <ImageWithFallback
              src={displayImageUrl}
              alt={wine.name}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <WineIcon size={64} className="text-[var(--rc-ink-on-accent)] opacity-20" />
          )}
        </div>

        {/* Header: Producer, Vintage, Cepage, Location */}
        <div className="p-6 pb-2 space-y-0.5">
          <div className="flex items-center gap-1.5 opacity-60">
            <MapPin size={10} className="text-[var(--rc-ink-primary)]" />
            <MonoLabel size="micro" colour="primary" uppercase={false} as="span" className="w-auto">
              {wine.region || ''}{wine.region && wine.country ? ', ' : ''}{wine.country || ''}
            </MonoLabel>
          </div>
          <Heading scale="title" truncate>{wine.producer}</Heading>
          <Heading scale="vintage" colour={vintageColour}>{String(wine.vintage)}</Heading>
          <div className="flex items-center gap-2 mt-1">
            <WineTypeIndicator wineType={rcProps.type as WineType} format="pill" />
            <MonoLabel size="micro" weight="bold" colour="ghost">
              {wine.cepage || ''}
            </MonoLabel>
          </div>
        </div>
      </div>

      {/* Badges: Rating, My Rating, Maturity, Quantity */}
      <div className="px-6 flex flex-wrap items-center gap-3 mb-6">
        {/* Vivino Rating Badge */}
        <div className="sticker-badge">
          {editingField === 'Rating' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--rc-ink-primary)] border border-[var(--rc-ink-primary)] rounded-[var(--rc-radius-sm)]">
              <Star size={16} fill="var(--rc-accent-acid)" className="text-[var(--rc-accent-acid)]" />
              <input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="w-10 bg-transparent border-b border-[var(--rc-accent-acid)] font-[var(--rc-font-display)] text-xl text-[var(--rc-accent-acid)] outline-none"
                autoFocus
                onBlur={() => handleUpdate('vivinoRating')}
                onKeyDown={e => e.key === 'Enter' && handleUpdate('vivinoRating')}
              />
            </div>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
              onClick={() => { setEditingField('Rating'); setEditValue(wine.vivinoRating?.toString() || ''); }}
            >
              <Badge typeVariant="Rating" label={Number(wine.vivinoRating || 0).toFixed(1)} />
            </div>
          )}
        </div>

        {/* My Rating Badge */}
        <div className="sticker-badge">
          {editingField === 'My Rating' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--rc-surface-secondary)] border border-[var(--rc-ink-primary)] rounded-[var(--rc-radius-sm)]">
              <Star size={16} fill="var(--rc-accent-pink)" className="text-[var(--rc-accent-pink)]" />
              <input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                placeholder="1-5"
                className="w-10 bg-transparent border-b border-[var(--rc-accent-pink)] font-[var(--rc-font-display)] text-xl text-[var(--rc-ink-primary)] outline-none"
                autoFocus
                onBlur={() => handleUpdate('myRating')}
                onKeyDown={e => e.key === 'Enter' && handleUpdate('myRating')}
              />
            </div>
          ) : (
            <div
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer"
              onClick={() => { setEditingField('My Rating'); setEditValue(wine.myRating || ''); }}
            >
              <Star size={14} fill={wine.myRating ? 'var(--rc-accent-pink)' : 'none'} className="text-[var(--rc-accent-pink)]" />
              <MonoLabel size="micro" weight="bold" colour="primary" as="span" className="w-auto">
                {wine.myRating || 'Rate'}
              </MonoLabel>
            </div>
          )}
        </div>

        {/* Maturity Chip */}
        <Chip
          variant="Maturity"
          state="Selected"
          maturityValue={rcProps.maturity}
          label={rcProps.maturity.replace('-', ' ')}
        />

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 ml-auto px-3 py-1.5 border border-[var(--rc-border-emphasis)] bg-[var(--rc-surface-primary)] rounded-[var(--rc-radius-sm)]">
          <button
            onClick={() => updateQuantity(Math.max(0, localQty - 1))}
            className="p-1 hover:bg-[var(--rc-surface-secondary)] transition-colors rounded-[var(--rc-radius-sm)]"
          >
            <Minus size={16} />
          </button>
          <div className="flex flex-col items-center">
            <MonoLabel size="micro" weight="bold" colour="ghost" as="span" className="w-auto">Qty</MonoLabel>
            <span className="font-[var(--rc-font-display)] text-2xl leading-none w-6 text-center font-black">{localQty}</span>
          </div>
          <button
            onClick={() => updateQuantity(localQty + 1)}
            className="p-1 hover:bg-[var(--rc-surface-secondary)] transition-colors rounded-[var(--rc-radius-sm)]"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Detail Fields */}
      <div className="p-6 pt-0 pb-8">
        <Divider weight="emphasised" className="mb-6" />
        <dl className="grid md:grid-cols-2 gap-3">
          {renderField('Tasting Notes', 'tastingNotes', wine.tastingNotes, true)}
          {renderField('Wine name', 'name', wine.name)}
          {renderField('Bottle Price', 'price', wine.price)}
          {renderField('Wine Type', 'type', wine.type)}
          {renderField('Format', 'format', wine.format)}
          {renderField('Drink From', 'drinkFrom', wine.drinkFrom)}
          {renderField('Drink Until', 'drinkUntil', wine.drinkUntil)}
          {renderField('Country', 'country', wine.country)}
          {renderField('Region', 'region', wine.region)}
          {renderField('Producer', 'producer', wine.producer)}
          {renderField('Appellation', 'appellation', wine.appellation || '')}
          {renderField('Cépage', 'cepage', wine.cepage, true)}
          {renderField('Personal Note', 'personalNote', wine.personalNote || '', true)}
          {renderLinkField('Link to Wine', 'linkToWine', wine.linkToWine)}
        </dl>
      </div>
    </>
  );
};

// ── Outer surface wrapper (responsive) ──

const WineModal: React.FC<WineModalProps> = ({ wine, onClose, onUpdate }) => {
  const isMobile = useIsMobile();

  // Desktop: RightPanel (640px slide-in)
  if (!isMobile) {
    return (
      <RightPanel
        open
        onClose={onClose}
        width="detail"
        id="wine-detail"
        title={`${wine.producer} ${wine.vintage}`}
      >
        <WineDetailContent wine={wine} onUpdate={onUpdate} />
      </RightPanel>
    );
  }

  // Mobile: BottomSheet (vaul) — destination view, opens at full
  return (
    <BottomSheet
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      snapPoint="full"
      snapPoints={['half', 'full']}
      id="wine-detail"
      title={`${wine.producer} ${wine.vintage}`}
      className="[&>div:last-child]:px-0"
    >
      <WineDetailContent wine={wine} onUpdate={onUpdate} />
    </BottomSheet>
  );
};

export default WineModal;
