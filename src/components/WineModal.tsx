import React, { useState, useRef, useCallback } from 'react';
import { Wine, GrapeVariety } from '@/types';
import { Star, Wine as WineIcon, Plus, Minus, MapPin, ExternalLink, Trash2, Camera, X, Loader2 } from 'lucide-react';
import { getDirectImageUrl } from '@/utils/imageUrl';
import { toRCWineCardProps } from '@/lib/adapters';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { RightPanel } from '@/components/ui/right-panel';
import { Heading, MonoLabel, Body, Badge, Chip, Divider, Input, WineTypeIndicator, Button, InlineMessage, showToast } from '@/components/rc';
import { ImageWithFallback } from '@/components/rc/figma/ImageWithFallback';
import { useIsMobile } from '@/components/ui/use-mobile';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/formatPrice';
import { GrapeVarietiesEditor } from '@/components/GrapeVarietiesEditor';
import { formatGrapeDisplay, formatGrapeDetailed } from '@/utils/grapeUtils';
import { useProfile } from '@/context/ProfileContext';
import { uploadLabelImage } from '@/services/storageService';
import { compressImageForStorage, compressImageForThumbnail } from '@/utils/imageCompression';
import { inventoryService } from '@/services/inventoryService';
import type { WineType } from '@/components/rc/WineTypeIndicator';

interface WineModalProps {
  wine: Wine;
  onClose: () => void;
  onUpdate?: (key: string, value: string) => Promise<void>;
  onDelete?: (wineId: string) => Promise<void>;
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

const WINE_TYPES = ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified'] as const;
const NUMERIC_FIELDS = new Set(['vintage', 'price', 'drinkFrom', 'drinkUntil']);

function validateNumericField(key: string, value: string): string | null {
  if (!value.trim()) return null; // allow clearing
  const num = Number(value);
  if (isNaN(num)) return 'Must be a number';
  switch (key) {
    case 'vintage': {
      const max = new Date().getFullYear() + 1;
      if (num < 1900 || num > max) return `Must be between 1900 and ${max}`;
      break;
    }
    case 'drinkFrom':
    case 'drinkUntil':
      if (num < 1900 || num > 2100) return 'Must be between 1900 and 2100';
      break;
    case 'price':
      if (num < 0) return 'Must be 0 or greater';
      break;
  }
  return null;
}

// ── Photo upload hook (shared between desktop hero + mobile heroZone) ──

function usePhotoUpload(wineId: string, onUpdate?: (key: string, value: string) => Promise<void>) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    setUploading(true);
    try {
      const [fullBlob, thumbBlob] = await Promise.all([
        compressImageForStorage(file),
        compressImageForThumbnail(file),
      ]);
      const { imageUrl, thumbnailUrl } = await uploadLabelImage(fullBlob, thumbBlob, wineId);
      await inventoryService.updateFields(wineId, { imageUrl, thumbnailUrl });
      if (onUpdate) {
        await onUpdate('imageUrl', imageUrl);
        await onUpdate('thumbnailUrl', thumbnailUrl);
      }
      showToast({ tone: 'success', message: 'Photo updated' });
    } catch (err) {
      console.error('Photo upload failed', err);
      showToast({ tone: 'error', message: 'Photo upload failed' });
    } finally {
      setUploading(false);
    }
  }, [wineId, onUpdate]);

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handlePhotoSelect}
    />
  );

  return { uploading, fileInputRef, fileInput };
}

// ── Inner content (surface-agnostic) ──

const WineDetailContent: React.FC<{
  wine: Wine;
  onUpdate?: (key: string, value: string) => Promise<void>;
  onDelete?: (wineId: string) => Promise<void>;
  hideHeroImage?: boolean;
  photoUploading?: boolean;
  photoFileInputRef?: React.RefObject<HTMLInputElement | null>;
  photoFileInput?: React.ReactNode;
}> = ({ wine, onUpdate, onDelete, hideHeroImage, photoUploading, photoFileInputRef, photoFileInput }) => {
  const { profile } = useProfile();
  const rcProps = toRCWineCardProps(wine);
  const vintageColour = wineTypeToHeadingColour[rcProps.type];
  const displayImageUrl = getDirectImageUrl(wine.resolvedImageUrl || wine.imageUrl);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editGrapes, setEditGrapes] = useState<GrapeVariety[]>([]);
  const [updating, setUpdating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    // Validate numeric fields
    if (NUMERIC_FIELDS.has(key)) {
      const error = validateNumericField(key, editValue);
      if (error) {
        setValidationError(error);
        return;
      }
    }
    setValidationError(null);
    setUpdating(true);
    try {
      if (key === 'grapeVarieties') {
        const cleaned = editGrapes.filter(g => g.name.trim());
        await onUpdate(key, JSON.stringify(cleaned));
      } else {
        await onUpdate(key, editValue);
      }
      setEditingField(null);
    } catch (e) {
      console.error('Update failed', e);
    } finally {
      setUpdating(false);
    }
  };

  const formatPriceLabel = (p: string | number) => {
    const val = typeof p === 'string' ? parseFloat(p) : p;
    return formatPrice(val, profile.currency);
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
              key === 'grapeVarieties' ? (
                <div className="space-y-2">
                  <GrapeVarietiesEditor
                    value={editGrapes}
                    onChange={setEditGrapes}
                  />
                  <button
                    onClick={() => handleUpdate(key)}
                    disabled={updating}
                    className="bg-[var(--rc-accent-acid)] px-3 py-1 border border-[var(--rc-ink-primary)] font-[var(--rc-font-mono)] font-bold uppercase text-[9px] rounded-[var(--rc-radius-sm)]"
                  >
                    {updating ? '...' : 'SAVE'}
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <Input
                      value={editValue}
                      onChange={e => { setEditValue(e.target.value); setValidationError(null); }}
                      className="flex-1"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleUpdate(key)}
                      {...(NUMERIC_FIELDS.has(key) ? { inputMode: 'numeric' as const, pattern: '[0-9]*' } : {})}
                      state={validationError ? 'Error' : 'Default'}
                    />
                    <button
                      onClick={() => handleUpdate(key)}
                      disabled={updating}
                      className="bg-[var(--rc-accent-acid)] px-3 py-0.5 border border-[var(--rc-ink-primary)] font-[var(--rc-font-mono)] font-bold uppercase text-[9px] rounded-[var(--rc-radius-sm)]"
                    >
                      {updating ? '...' : 'SAVE'}
                    </button>
                  </div>
                  {validationError && (
                    <span className="text-[var(--rc-accent-coral)] text-[11px] font-[var(--rc-font-mono)]">{validationError}</span>
                  )}
                </div>
              )
            ) : (
              <span
                onClick={() => {
                  setEditingField(label);
                  setValidationError(null);
                  if (key === 'grapeVarieties') {
                    setEditGrapes(wine.grapeVarieties ?? []);
                  } else {
                    setEditValue(strValue);
                  }
                }}
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
      {/* Hero Image — hidden when rendered externally via dragZone */}
      {!hideHeroImage && (
        <div className="relative h-60 bg-[var(--rc-ink-primary)] flex items-center justify-center overflow-hidden group">
          {photoFileInput}
          {displayImageUrl ? (
            <>
              <ImageWithFallback
                src={displayImageUrl}
                alt={wine.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              {/* Replace photo overlay */}
              {!photoUploading && (
                <button
                  onClick={() => photoFileInputRef?.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera size={24} className="text-white mb-1" />
                  <span className="text-white text-xs font-[var(--rc-font-mono)] uppercase tracking-wider">Replace Photo</span>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => photoFileInputRef?.current?.click()}
              className="flex flex-col items-center justify-center gap-2 cursor-pointer opacity-40 hover:opacity-70 transition-opacity"
            >
              <Camera size={32} className="text-[var(--rc-ink-on-accent)]" />
              <span className="text-[var(--rc-ink-on-accent)] text-xs font-[var(--rc-font-mono)] uppercase tracking-wider">Add Photo</span>
            </button>
          )}
          {/* Upload spinner overlay */}
          {photoUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Loader2 size={32} className="text-white animate-spin" />
            </div>
          )}
        </div>
      )}

      <div className="relative">
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
              {formatGrapeDisplay(wine.grapeVarieties)}
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

        {/* My Rating — tappable stars */}
        <div className="sticker-badge">
          <div className="flex items-center gap-1 px-3 py-1.5">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => onUpdate?.('myRating', star.toString())}
                className="p-0.5 hover:scale-110 transition-transform"
              >
                <Star
                  size={18}
                  fill={star <= Number(wine.myRating) ? 'var(--rc-accent-pink)' : 'none'}
                  className="text-[var(--rc-accent-pink)]"
                />
              </button>
            ))}
            {wine.myRating && (
              <button
                onClick={() => onUpdate?.('myRating', '')}
                className="p-0.5 ml-1 opacity-40 hover:opacity-100 transition-opacity"
                title="Clear rating"
              >
                <X size={14} className="text-[var(--rc-ink-primary)]" />
              </button>
            )}
          </div>
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
          {/* Wine Type — chip picker */}
          <div className="space-y-1 p-[var(--rc-space-md)] border border-[var(--rc-border-emphasis)] bg-[var(--rc-surface-primary)] rounded-[var(--rc-radius-sm)]">
            <dt>
              <MonoLabel size="micro" weight="bold" colour="accent-pink" as="span" className="w-auto">Wine Type</MonoLabel>
            </dt>
            <dd className="flex flex-wrap gap-1.5 mt-1">
              {WINE_TYPES.map(t => (
                <Chip
                  key={t}
                  variant="WineType"
                  state={wine.type === t ? 'Selected' : 'Default'}
                  label={t}
                  onClick={() => onUpdate?.('type', t)}
                  className="cursor-pointer"
                />
              ))}
            </dd>
          </div>
          {renderField('Format', 'format', wine.format)}
          {renderField('Drink From', 'drinkFrom', wine.drinkFrom)}
          {renderField('Drink Until', 'drinkUntil', wine.drinkUntil)}
          {renderField('Country', 'country', wine.country)}
          {renderField('Region', 'region', wine.region)}
          {renderField('Producer', 'producer', wine.producer)}
          {renderField('Appellation', 'appellation', wine.appellation || '')}
          {renderField('Vintage', 'vintage', wine.vintage)}
          {renderField('Cépage', 'grapeVarieties', formatGrapeDetailed(wine.grapeVarieties))}
          {renderField('Personal Note', 'personalNote', wine.personalNote || '', true)}
          {renderLinkField('Link to Wine', 'linkToWine', wine.linkToWine)}
        </dl>

        {/* Delete from cellar */}
        {onDelete && (
          <div className="mt-8">
            <Divider weight="subtle" className="mb-4" />
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-[var(--rc-accent-coral)] hover:opacity-80 transition-opacity"
              >
                <Trash2 size={14} />
                <MonoLabel size="micro" weight="bold" colour="ghost" as="span" className="w-auto text-[var(--rc-accent-coral)]">
                  Delete from cellar
                </MonoLabel>
              </button>
            ) : (
              <div className="space-y-3">
                <InlineMessage
                  tone="warning"
                  message="This wine will be permanently removed from your cellar."
                />
                <div className="flex gap-2">
                  <Button
                    variantType="Secondary"
                    label="Cancel"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                  />
                  <Button
                    variantType="Destructive"
                    label={deleting ? 'Deleting...' : 'Delete'}
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await onDelete(wine.id);
                      } catch {
                        setDeleting(false);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ── Outer surface wrapper (responsive) ──

const WineModal: React.FC<WineModalProps> = ({ wine, onClose, onUpdate, onDelete }) => {
  const isMobile = useIsMobile();
  const { keyboardVisible } = useKeyboardVisible();
  const { uploading: photoUploading, fileInputRef: photoFileInputRef, fileInput: photoFileInput } = usePhotoUpload(wine.id, onUpdate);

  const photoProps = {
    photoUploading,
    photoFileInputRef,
    photoFileInput,
  };

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
        <WineDetailContent wine={wine} onUpdate={onUpdate} onDelete={onDelete} {...photoProps} />
      </RightPanel>
    );
  }

  // Mobile: BottomSheet (vaul) — destination view, opens at full only
  const displayImageUrl = getDirectImageUrl(wine.resolvedImageUrl || wine.imageUrl);

  const heroZone = (
    <div className={cn(
      "overflow-hidden transition-[max-height] duration-200 ease-out",
      keyboardVisible ? "max-h-0" : "max-h-60"
    )}>
      <div className="relative h-60 bg-[var(--rc-ink-primary)] flex items-center justify-center overflow-hidden group">
        {photoFileInput}
        {displayImageUrl ? (
          <>
            <ImageWithFallback
              src={displayImageUrl}
              alt={wine.name}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
            {!photoUploading && (
              <button
                onClick={() => photoFileInputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 active:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera size={24} className="text-white mb-1" />
                <span className="text-white text-xs font-[var(--rc-font-mono)] uppercase tracking-wider">Replace Photo</span>
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => photoFileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 cursor-pointer opacity-40 hover:opacity-70 transition-opacity"
          >
            <Camera size={32} className="text-[var(--rc-ink-on-accent)]" />
            <span className="text-[var(--rc-ink-on-accent)] text-xs font-[var(--rc-font-mono)] uppercase tracking-wider">Add Photo</span>
          </button>
        )}
        {photoUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 size={32} className="text-white animate-spin" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <BottomSheet
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      snapPoint="full"
      snapPoints={['full']}
      id="wine-detail"
      title={`${wine.producer} ${wine.vintage}`}
      className="[&>div:last-child]:px-0"
      dragZone={heroZone}
    >
      <WineDetailContent wine={wine} onUpdate={onUpdate} onDelete={onDelete} hideHeroImage />
    </BottomSheet>
  );
};

export default WineModal;
