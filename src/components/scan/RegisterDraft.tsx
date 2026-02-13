import React, { useState } from 'react';
import { RefreshCw, Plus, Minus } from 'lucide-react';
import { Heading, MonoLabel, Body, Button, Input, Divider, Chip, InlineMessage } from '@/components/rc';
import ConfidenceIndicator from './ConfidenceIndicator';
import MoreFieldsSection from './MoreFieldsSection';
import CommitTransition from './CommitTransition';
import type { Wine, WineType, WineDraft, ExtractionConfidence, CommitStage } from '@/types';

interface RegisterDraftProps {
  draft: WineDraft;
  onUpdateFields: (fields: Partial<Wine>) => void;
  onConfirm: () => void;
  onRetake: () => void;
  isCommitting: boolean;
  commitStage?: CommitStage;
  onCommitAnimationComplete?: () => void;
  imageQualityWarning?: string | null;
  moreFieldsExpanded?: boolean;
  onToggleMoreFields?: () => void;
}

const WINE_TYPES: WineType[] = ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified'];

const PRIMARY_FIELDS: { key: keyof Wine; label: string; placeholder: string }[] = [
  { key: 'producer', label: 'Producer', placeholder: 'e.g. Domaine de la Romanée-Conti' },
  { key: 'name', label: 'Wine Name', placeholder: 'e.g. Grands Échezeaux' },
  { key: 'vintage', label: 'Vintage', placeholder: 'e.g. 2019' },
  { key: 'cepage', label: 'Grape / Cépage', placeholder: 'e.g. Pinot Noir' },
  { key: 'region', label: 'Region', placeholder: 'e.g. Burgundy' },
  { key: 'country', label: 'Country', placeholder: 'e.g. France' },
  { key: 'format', label: 'Format', placeholder: 'e.g. 750ml' },
];

const RegisterDraft: React.FC<RegisterDraftProps> = ({
  draft,
  onUpdateFields,
  onConfirm,
  onRetake,
  isCommitting,
  commitStage = 'idle',
  onCommitAnimationComplete,
  imageQualityWarning,
  moreFieldsExpanded,
  onToggleMoreFields,
}) => {
  const { fields, extraction, image, source } = draft;
  const [priceInput, setPriceInput] = useState(fields.price ? String(fields.price) : '');

  const getConfidence = (key: string): ExtractionConfidence | null => {
    return extraction?.fields[key]?.confidence ?? null;
  };

  const handleFieldChange = (key: string, value: string | number) => {
    onUpdateFields({ [key]: value });
  };

  const handlePriceChange = (val: string) => {
    setPriceInput(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onUpdateFields({ price: num });
    }
  };

  const handleQuantity = (delta: number) => {
    const current = fields.quantity ?? 1;
    const next = Math.max(1, current + delta);
    onUpdateFields({ quantity: next });
  };

  const handleTypeSelect = (type: WineType) => {
    onUpdateFields({ type });
  };

  const priceValid = fields.price !== undefined && fields.price > 0;

  return (
    <div className="flex flex-col lg:flex-row h-full max-h-[92vh] overflow-hidden">
      {/* Hero image (left on desktop, top on mobile) */}
      {image && (
        <div className="lg:w-1/2 h-[30vh] lg:h-auto bg-[var(--rc-surface-secondary)] flex items-center justify-center flex-shrink-0">
          <img
            src={image.localUri}
            alt="Captured wine label"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Form */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <div className="space-y-1">
            <Heading scale="heading">REVIEW &amp; EDIT</Heading>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  source === 'scan'
                    ? 'bg-[var(--rc-accent-acid)] text-[var(--rc-ink-primary)]'
                    : 'bg-[var(--rc-surface-secondary)] text-[var(--rc-ink-ghost)]'
                }`}
              >
                {source === 'scan' ? 'LABEL SCAN' : 'MANUAL ENTRY'}
              </span>
              {extraction?.imageQuality && (
                <MonoLabel size="micro" colour="ghost">
                  Image: {extraction.imageQuality}
                </MonoLabel>
              )}
            </div>
          </div>
          {source === 'scan' && (
            <button
              onClick={onRetake}
              className="flex items-center gap-1 text-[var(--rc-ink-ghost)] hover:text-[var(--rc-ink-primary)] transition-colors"
            >
              <RefreshCw size={14} />
              <MonoLabel size="micro" colour="ghost">RETAKE</MonoLabel>
            </button>
          )}
        </div>

        <Divider weight="emphasised" className="mx-4" />

        {/* Image quality warning */}
        {imageQualityWarning && (
          <div className="px-4 pt-3">
            <InlineMessage tone="warning" message={imageQualityWarning} />
          </div>
        )}

        {/* Wine Type Selector */}
        <div className="px-4 pt-4 pb-2 space-y-2">
          <div className="flex items-center">
            <MonoLabel size="micro" weight="bold" colour="accent-pink" as="span" className="w-auto">
              Type
            </MonoLabel>
            <ConfidenceIndicator confidence={getConfidence('type')} />
          </div>
          <div className="flex flex-wrap gap-2">
            {WINE_TYPES.map((type) => (
              <Chip
                key={type}
                variant="WineType"
                label={type}
                state={fields.type === type ? 'Selected' : 'Default'}
                onClick={() => handleTypeSelect(type)}
              />
            ))}
          </div>
        </div>

        {/* Primary Fields */}
        <div className="px-4 py-2 space-y-3">
          {PRIMARY_FIELDS.map(({ key, label, placeholder }) => {
            const value = fields[key] ?? '';
            const confidence = getConfidence(key);
            const isNumeric = key === 'vintage';
            const isEmpty = value === '' || value === 0;

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center">
                  <MonoLabel
                    size="micro"
                    weight="bold"
                    colour={isEmpty && !confidence ? 'accent-coral' : 'accent-pink'}
                    as="span"
                    className="w-auto"
                  >
                    {label}
                  </MonoLabel>
                  <ConfidenceIndicator confidence={confidence} />
                </div>
                <Input
                  type={isNumeric ? 'number' : 'text'}
                  value={String(value)}
                  onChange={(e) =>
                    handleFieldChange(key, isNumeric ? Number(e.target.value) : e.target.value)
                  }
                  placeholder={placeholder}
                  className={isEmpty ? 'border-[var(--rc-accent-coral)]' : ''}
                  autoFocus={key === 'producer'}
                />
              </div>
            );
          })}
        </div>

        {/* Price + Quantity row */}
        <div className="px-4 py-2 flex gap-4">
          {/* Price (required) */}
          <div className="flex-1 space-y-1">
            <MonoLabel
              size="micro"
              weight="bold"
              colour={priceValid ? 'accent-pink' : 'accent-coral'}
              as="span"
              className="w-auto"
            >
              Price *
            </MonoLabel>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--rc-ink-ghost)] text-sm font-bold">
                $
              </span>
              <Input
                type="number"
                value={priceInput}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="0"
                className={`pl-7 ${!priceValid ? 'border-[var(--rc-accent-coral)]' : ''}`}
              />
            </div>
            {!priceValid && (
              <MonoLabel size="micro" colour="accent-coral">Required</MonoLabel>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <MonoLabel size="micro" weight="bold" colour="accent-pink" as="span" className="w-auto">
              Qty
            </MonoLabel>
            <div className="flex items-center gap-2 border border-[var(--rc-border-emphasis)] rounded-[var(--rc-radius-sm)] px-2 py-1">
              <button
                onClick={() => handleQuantity(-1)}
                className="p-1 hover:bg-[var(--rc-surface-secondary)] rounded transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="font-[var(--rc-font-display)] text-xl w-8 text-center font-black">
                {fields.quantity ?? 1}
              </span>
              <button
                onClick={() => handleQuantity(1)}
                className="p-1 hover:bg-[var(--rc-surface-secondary)] rounded transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* More Fields (expandable) */}
        <MoreFieldsSection
          fields={fields}
          extraction={extraction}
          onFieldChange={handleFieldChange}
          expanded={moreFieldsExpanded}
          onToggleExpanded={onToggleMoreFields}
        />

        {/* Sticky Footer */}
        <div className="sticky bottom-0 bg-[var(--rc-surface-primary)] border-t border-[var(--rc-border-emphasis)] p-4 mt-auto">
          {commitStage !== 'idle' && commitStage !== undefined ? (
            <CommitTransition stage={commitStage} onComplete={onCommitAnimationComplete ?? (() => {})} />
          ) : (
            <Button
              variantType="Primary"
              label={isCommitting ? 'SAVING...' : 'CONFIRM TO CELLAR'}
              onClick={onConfirm}
              disabled={!priceValid || isCommitting}
              className="w-full"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterDraft;
