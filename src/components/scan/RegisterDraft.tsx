import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Plus, Minus, Search } from 'lucide-react';
import { Heading, MonoLabel, Button, Input, Divider, Chip, InlineMessage } from '@/components/rc';
import ConfidenceIndicator from './ConfidenceIndicator';
import MoreFieldsSection from './MoreFieldsSection';
import CommitTransition from './CommitTransition';
import { GrapeVarietiesEditor } from '@/components/GrapeVarietiesEditor';
import { useScrollFieldIntoView } from '@/hooks/useScrollFieldIntoView';
import type { Wine, WineType, WineDraft, ExtractionConfidence, CommitStage, GrapeVariety } from '@/types';

interface RegisterDraftProps {
  draft: WineDraft;
  onUpdateFields: (fields: Partial<Wine>) => void;
  onConfirm: () => void;
  onRetake: () => void;
  isCommitting: boolean;
  commitStage?: CommitStage;
  onCommitAnimationComplete?: () => void;
  onAskRemy?: () => void;
  imageQualityWarning?: string | null;
  moreFieldsExpanded?: boolean;
  onToggleMoreFields?: () => void;
  isMobile?: boolean;
  keyboardVisible?: boolean;
}

const WINE_TYPES: WineType[] = ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified'];

const PRIMARY_FIELDS: { key: keyof Wine; label: string; placeholder: string }[] = [
  { key: 'producer', label: 'Producer', placeholder: 'e.g. Domaine de la Romanée-Conti' },
  { key: 'name', label: 'Wine Name', placeholder: 'e.g. Grands Échezeaux' },
  { key: 'vintage', label: 'Vintage', placeholder: 'e.g. 2019' },
  { key: 'grapeVarieties', label: 'Grape / Cépage', placeholder: 'e.g. Pinot Noir' },
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
  onAskRemy,
  imageQualityWarning,
  moreFieldsExpanded,
  onToggleMoreFields,
  isMobile = false,
  keyboardVisible = false,
}) => {
  const { fields, extraction, image, source } = draft;
  const [priceInput, setPriceInput] = useState(fields.price ? String(fields.price) : '');
  const [inputFocused, setInputFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useScrollFieldIntoView(scrollRef);

  // Track input focus via delegation on the scroll container
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        setInputFocused(true);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      // Check if focus is moving to another input within the container
      const related = e.relatedTarget as Node | null;
      if (!related || !container.contains(related)) {
        setInputFocused(false);
      }
    };

    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);
    return () => {
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Collapse hero on mobile when any input is focused OR keyboard is visible
  const heroCollapsed = isMobile && (inputFocused || keyboardVisible);

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
    <div className="flex flex-col lg:flex-row h-full max-h-[100dvh] lg:max-h-[92vh] overflow-hidden">
      {/* Hero image (left on desktop, top on mobile) */}
      {image && (
        <div
          className={`lg:w-1/2 lg:h-auto bg-[var(--rc-surface-secondary)] flex items-center justify-center flex-shrink-0 transition-[height] duration-200 ease-out overflow-hidden ${
            heroCollapsed ? 'h-12' : 'h-[30vh]'
          }`}
        >
          <img
            src={image.localUri}
            alt="Captured wine label"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Form — flex-col so footer stays pinned at bottom */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Scrollable form area */}
        <div ref={scrollRef} className="flex-1 flex flex-col overflow-y-auto min-h-0 pb-20 lg:pb-4">
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const q = [fields.producer, fields.name, fields.vintage]
                    .map(v => String(v ?? '').trim())
                    .filter(Boolean)
                    .join(' ');
                  if (q) window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, '_blank');
                }}
                className="flex items-center gap-1 text-[var(--rc-ink-ghost)] hover:text-[var(--rc-ink-primary)] transition-colors"
              >
                <Search size={14} />
                <MonoLabel size="micro" colour="ghost">SEARCH</MonoLabel>
              </button>
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
              const isGrapes = key === 'grapeVarieties';
              const isEmpty = isGrapes
                ? !(fields.grapeVarieties as GrapeVariety[] | undefined)?.some(g => g.name.trim())
                : value === '' || value === 0;

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
                  {isGrapes ? (
                    <GrapeVarietiesEditor
                      value={(fields.grapeVarieties as GrapeVariety[] | undefined) ?? []}
                      onChange={(val) => onUpdateFields({ grapeVarieties: val })}
                    />
                  ) : (
                    <Input
                      type={isNumeric ? 'number' : 'text'}
                      value={String(value)}
                      onChange={(e) =>
                        handleFieldChange(key, isNumeric ? Number(e.target.value) : e.target.value)
                      }
                      placeholder={placeholder}
                      className={isEmpty ? 'border-[var(--rc-accent-coral)]' : ''}
                      autoFocus={key === 'producer' && !isMobile}
                    />
                  )}
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
        </div>

        {/* Footer — always visible, outside scroll container */}
        <div className="shrink-0 bg-[var(--rc-surface-primary)] border-t border-[var(--rc-border-emphasis)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {commitStage !== 'idle' && commitStage !== undefined ? (
            <CommitTransition stage={commitStage} onComplete={onCommitAnimationComplete ?? (() => {})} />
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                variantType="Primary"
                label={isCommitting ? 'SAVING...' : 'CONFIRM TO CELLAR'}
                onClick={onConfirm}
                disabled={!priceValid || isCommitting}
                className="w-full"
              />
              {onAskRemy && (
                <button
                  onClick={onAskRemy}
                  disabled={isCommitting}
                  className="w-full py-3 px-4 rounded-[var(--rc-radius-sm)] border border-[var(--rc-accent-acid)] bg-transparent font-[var(--rc-font-mono)] text-xs font-bold tracking-wider text-[var(--rc-accent-acid)] uppercase hover:bg-[var(--rc-accent-acid)]/10 transition-colors disabled:opacity-50"
                >
                  ✦ Ask Remy About This Wine
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterDraft;
