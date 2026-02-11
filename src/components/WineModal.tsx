import React, { useState, useEffect, useRef } from 'react';
import { Wine } from '@/types';
import { Star, Wine as WineIcon, Plus, Minus, MapPin } from 'lucide-react';
import { getDirectImageUrl } from '@/utils/imageUrl';
import { toRCWineCardProps } from '@/lib/adapters';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Heading, MonoLabel, Body, Badge, Chip, Divider, Input } from '@/components/rc';
import { ImageWithFallback } from '@/components/rc/figma/ImageWithFallback';
import { cn } from '@/lib/utils';

interface WineModalProps {
  wine: Wine;
  onClose: () => void;
  onUpdate?: (key: string, value: string) => Promise<void>;
}

/** Map RC wine type to Heading colour token */
const wineTypeToHeadingColour = {
  red: 'accent-pink',
  white: 'accent-acid',
  rosé: 'accent-coral',
  sparkling: 'accent-acid',
  dessert: 'accent-coral',
  orange: 'accent-coral',
} as const;

const WineModal: React.FC<WineModalProps> = ({ wine, onClose, onUpdate }) => {
  const rcProps = toRCWineCardProps(wine);
  const vintageColour = wineTypeToHeadingColour[rcProps.type];
  const displayImageUrl = getDirectImageUrl(wine.resolvedImageUrl || wine.imageUrl);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [updating, setUpdating] = useState(false);

  const [localQty, setLocalQty] = useState(Number(wine.quantity) || 0);
  const qtyTimeoutRef = useRef<number | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handlePopState = () => onCloseRef.current();
    window.history.pushState({ modalOpen: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const updateQuantity = (newQty: number) => {
    setLocalQty(newQty);
    if (qtyTimeoutRef.current) window.clearTimeout(qtyTimeoutRef.current);

    qtyTimeoutRef.current = window.setTimeout(async () => {
      if (onUpdate) {
        await onUpdate('quantity', newQty.toString());
      }
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

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-full sm:max-w-3xl w-full h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto bg-[var(--rc-surface-primary)] border-[var(--rc-divider-emphasis-weight)] border-[var(--rc-ink-primary)] shadow-[var(--rc-shadow-elevated)] p-0 gap-0 rounded-none sm:rounded-[var(--rc-radius-lg)]"
      >
        {/* Accessible title (visually hidden) */}
        <DialogTitle className="sr-only">{wine.producer} {wine.vintage}</DialogTitle>

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
            <div className="flex flex-col">
              <Heading scale="vintage" colour={vintageColour}>{String(wine.vintage)}</Heading>
              <MonoLabel size="micro" weight="bold" colour="ghost" className="ml-1">
                {wine.cepage || ''}
              </MonoLabel>
            </div>
          </div>
        </div>

        {/* Badges: Rating, Maturity, Quantity */}
        <div className="px-6 flex flex-wrap items-center gap-3 mb-6">
          {/* Rating Badge */}
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
            {renderField('Drink From', 'drinkFrom', wine.drinkFrom)}
            {renderField('Drink Until', 'drinkUntil', wine.drinkUntil)}
            {renderField('Country', 'country', wine.country)}
            {renderField('Region', 'region', wine.region)}
            {renderField('Producer', 'producer', wine.producer)}
            {renderField('Appellation', 'appellation', wine.appellation || '')}
            {renderField('Cépage', 'cepage', wine.cepage, true)}
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WineModal;
