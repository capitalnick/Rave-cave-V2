import React, { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, Chip, InlineMessage, PriceRangeSlider, MonoLabel, Body } from '@/components/rc';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { ABSOLUTE_MAX_PRICE } from '@/utils/priceSlider';
import type {
  GiftContext,
  GiftOccasion,
  ExperienceLevel,
  GiftPersonality,
  WineColour,
  SourceMode,
  Wine,
} from '@/types';

// ── Props ──

interface GiftQuizFormProps {
  onSubmit: (context: GiftContext) => void;
  onCancel: () => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  inventory: Wine[];
}

// ── Step Option Constants ──

const OCCASION_OPTIONS: { value: GiftOccasion; label: string }[] = [
  { value: 'birthday',        label: 'Birthday' },
  { value: 'thank-you',       label: 'Thank You' },
  { value: 'celebration',     label: 'Celebration' },
  { value: 'congratulations', label: 'Congratulations' },
  { value: 'just-because',    label: 'Just Because' },
  { value: 'sympathy',        label: 'Sympathy' },
];

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; hint: string }[] = [
  { value: 'curious',    label: 'Curious',    hint: 'New to wine — still discovering what they like' },
  { value: 'casual',     label: 'Casual',     hint: 'Enjoys wine but doesn\'t think about it too much' },
  { value: 'enthusiast', label: 'Enthusiast', hint: 'Knows their regions and grapes' },
  { value: 'collector',  label: 'Collector',  hint: 'Serious about wine — has their own cellar' },
];

const PERSONALITY_OPTIONS: { value: GiftPersonality; label: string; hint: string }[] = [
  { value: 'adventurous', label: 'Adventurous', hint: 'Loves discovering the unexpected' },
  { value: 'classic',     label: 'Classic',     hint: 'Trusts tradition and reputation' },
  { value: 'storyteller', label: 'Storyteller', hint: 'Loves wines with a narrative' },
  { value: 'understated', label: 'Understated', hint: 'Quietly excellent, no fuss' },
  { value: 'bold',        label: 'Bold',        hint: 'Wants something that commands attention' },
  { value: 'easy-going',  label: 'Easy-going',  hint: 'Approachable and unpretentious' },
];

const WINE_COLOUR_OPTIONS: { value: WineColour; label: string }[] = [
  { value: 'red',           label: 'Red' },
  { value: 'white',         label: 'White' },
  { value: 'rose',          label: 'Rosé' },
  { value: 'sparkling',     label: 'Sparkling' },
  { value: 'no-preference', label: 'No Preference' },
];

const STYLE_OPTIONS: Record<WineColour, { value: string; label: string; hint: string }[]> = {
  red: [
    { value: 'full-bodied-structured', label: 'Full-bodied & Structured',   hint: 'Cabernet, Barossa Shiraz, Bordeaux blends' },
    { value: 'medium-elegant',         label: 'Medium & Elegant',           hint: 'Pinot Noir, Nebbiolo, Sangiovese' },
    { value: 'bold-fruit-forward',     label: 'Bold & Fruit-forward',       hint: 'Malbec, Zinfandel, Aussie Shiraz' },
    { value: 'earthy-savoury',         label: 'Earthy & Savoury',           hint: 'Rhone blends, Tempranillo, aged Nebbiolo' },
    { value: 'light-juicy',            label: 'Light & Juicy',              hint: 'Gamay, young Pinot, Dolcetto' },
    { value: 'spicy-aromatic',         label: 'Spicy & Aromatic',           hint: 'Syrah, Mourvèdre, Grenache' },
    { value: 'tannic-age-worthy',      label: 'Tannic & Age-worthy',        hint: 'Barolo, Brunello, classified Bordeaux' },
    { value: 'surprise',               label: 'Surprise Me',                hint: 'Let Rémy decide' },
  ],
  white: [
    { value: 'crisp-mineral',        label: 'Crisp & Mineral',        hint: 'Chablis, Sancerre, Albariño' },
    { value: 'rich-oaky',            label: 'Rich & Oaky',            hint: 'Oaked Chardonnay, White Burgundy' },
    { value: 'aromatic-floral',      label: 'Aromatic & Floral',      hint: 'Riesling, Gewürztraminer, Viognier' },
    { value: 'light-refreshing',     label: 'Light & Refreshing',     hint: 'Pinot Grigio, Vermentino, Grüner Veltliner' },
    { value: 'textured-complex',     label: 'Textured & Complex',     hint: 'Aged Riesling, skin-contact, Chenin Blanc' },
    { value: 'surprise',             label: 'Surprise Me',            hint: 'Let Rémy decide' },
  ],
  rose: [
    { value: 'dry-provence',   label: 'Dry & Provençal',   hint: 'Pale, crisp, Mediterranean' },
    { value: 'fruity-vibrant', label: 'Fruity & Vibrant',  hint: 'Bolder colour, berry-driven' },
    { value: 'surprise',       label: 'Surprise Me',       hint: 'Let Rémy decide' },
  ],
  sparkling: [
    { value: 'champagne',       label: 'Champagne',              hint: 'The classic — toasty, brioche, fine bubbles' },
    { value: 'cremant-cava',    label: 'Crémant / Cava',         hint: 'Traditional method, great value' },
    { value: 'prosecco-fresh',  label: 'Prosecco & Fresh Fizz',  hint: 'Light, fruity, approachable' },
    { value: 'pet-nat-natural', label: 'Pét-nat / Natural',      hint: 'Funky, cloudy, conversation-starting' },
    { value: 'surprise',        label: 'Surprise Me',            hint: 'Let Rémy decide' },
  ],
  'no-preference': [
    { value: 'crowd-pleaser',    label: 'Crowd Pleaser',         hint: 'Something universally enjoyable' },
    { value: 'conversation-starter', label: 'Conversation Starter', hint: 'Unusual, interesting, a talking point' },
    { value: 'safe-premium',     label: 'Safe & Premium',        hint: 'Quality everyone will recognise' },
    { value: 'surprise',         label: 'Surprise Me',           hint: 'Let Rémy decide' },
  ],
};

const REGION_OPTIONS: { value: 'old-world' | 'new-world' | 'either'; label: string; hint: string }[] = [
  { value: 'old-world', label: 'Old World',  hint: 'France, Italy, Spain, Germany...' },
  { value: 'new-world', label: 'New World',  hint: 'Australia, NZ, USA, South America...' },
  { value: 'either',    label: 'Either',     hint: 'No preference — Rémy decides' },
];

const SECTION_LABELS = ['ABOUT THE PERSON', 'ABOUT THE PERSON', 'ABOUT THE PERSON', 'ABOUT THE WINE', 'ABOUT THE WINE', 'ABOUT THE WINE'] as const;
const STEP_QUESTIONS = [
  'What\'s the occasion?',
  'How experienced are they with wine?',
  'How would you describe them?',
  'What colour wine?',
  'What style?',
  'Any region preference?',
] as const;

const TOTAL_STEPS = 6;

// ── Local Sub-components ──

interface SelectorTileProps {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}

const SelectorTile: React.FC<SelectorTileProps> = ({ label, hint, selected, onClick }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onClick}
    className={cn(
      'flex flex-col items-start w-full min-h-[48px] px-4 py-3 rounded-lg border-2 transition-all duration-150 text-left',
      selected
        ? 'border-[var(--rc-accent-pink)] bg-[var(--rc-accent-pink)]/10'
        : 'border-[var(--rc-border-subtle)] bg-white hover:bg-[var(--rc-surface-secondary)]',
    )}
  >
    <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider font-bold">{label}</span>
    {hint && (
      <span className="text-[10px] text-[var(--rc-ink-ghost)] font-[var(--rc-font-body)] mt-0.5">{hint}</span>
    )}
  </button>
);

interface GridTileProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

const GridTile: React.FC<GridTileProps> = ({ label, selected, onClick }) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onClick}
    className={cn(
      'flex items-center justify-center min-h-[48px] px-4 py-3 rounded-lg border-2 transition-all duration-150 text-center',
      selected
        ? 'border-[var(--rc-accent-pink)] bg-[var(--rc-accent-pink)]/10'
        : 'border-[var(--rc-border-subtle)] bg-white hover:bg-[var(--rc-surface-secondary)]',
    )}
  >
    <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider font-bold">{label}</span>
  </button>
);

interface QuizProgressBarProps {
  step: number;
  total: number;
}

const QuizProgressBar: React.FC<QuizProgressBarProps> = ({ step, total }) => {
  const pct = (step / total) * 100;
  return (
    <div
      className="w-full h-1 rounded-full bg-[var(--rc-border-subtle)] relative overflow-hidden"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={total}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-[var(--rc-accent-pink)]"
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      />
      {/* Midpoint tick */}
      <div
        className="absolute top-0 bottom-0 w-px bg-[var(--rc-border-subtle)]"
        style={{ left: '50%' }}
      />
    </div>
  );
};

// ── Source Label Map ──

const SOURCE_LABELS: { value: SourceMode; label: string }[] = [
  { value: 'cellar', label: 'From my cellar' },
  { value: 'other',  label: 'Buy something new' },
  { value: 'both',   label: 'Either' },
];

// ── Main Component ──

const GiftQuizForm: React.FC<GiftQuizFormProps> = ({ onSubmit, onCancel, submitting, setSubmitting, inventory }) => {
  const reducedMotion = useReducedMotion();

  // Quiz state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [occasion, setOccasion] = useState<GiftOccasion | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [personality, setPersonality] = useState<GiftPersonality | null>(null);
  const [wineColour, setWineColour] = useState<WineColour | null>(null);
  const [wineStyle, setWineStyle] = useState<string | null>(null);
  const [regionPreference, setRegionPreference] = useState<'old-world' | 'new-world' | 'either' | null>(null);

  // Persistent footer state
  const [sourceMode, setSourceMode] = useState<SourceMode>('both');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: ABSOLUTE_MAX_PRICE });

  const isFullRange = priceRange.min === 0 && priceRange.max >= ABSOLUTE_MAX_PRICE;

  const canAdvance = useMemo(() => {
    switch (step) {
      case 1: return occasion !== null;
      case 2: return experienceLevel !== null;
      case 3: return personality !== null;
      case 4: return wineColour !== null;
      case 5: return wineStyle !== null;
      case 6: return true; // region is optional
      default: return false;
    }
  }, [step, occasion, experienceLevel, personality, wineColour, wineStyle]);

  const goNext = useCallback(() => {
    if (!canAdvance || step >= TOTAL_STEPS) return;
    setDirection(1);
    setStep(s => s + 1);
  }, [canAdvance, step]);

  const goBack = useCallback(() => {
    if (step <= 1) return;
    // Clear wineStyle when going back from step 5 (branching dependency)
    if (step === 5) setWineStyle(null);
    setDirection(-1);
    setStep(s => s - 1);
  }, [step]);

  const handleColourChange = useCallback((colour: WineColour) => {
    setWineColour(colour);
    // Reset style when colour changes (branching dependency)
    setWineStyle(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!occasion || !experienceLevel || !personality || !wineColour || !wineStyle) return;
    setSubmitting(true);
    const ctx: GiftContext = {
      occasion,
      experienceLevel,
      personality,
      wineColour,
      wineStyle,
      regionPreference: regionPreference ?? null,
      sourceMode,
      priceRange: isFullRange ? null : priceRange,
    };
    onSubmit(ctx);
  }, [occasion, experienceLevel, personality, wineColour, wineStyle, regionPreference, sourceMode, isFullRange, priceRange, setSubmitting, onSubmit]);

  // Animation variants
  const variants = reducedMotion
    ? { enter: {}, center: {}, exit: {} }
    : {
        enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
      };

  const transition = reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeInOut' as const };

  const currentStyles = wineColour ? STYLE_OPTIONS[wineColour] : [];

  const isLastStep = step === TOTAL_STEPS;
  const showFooter = step >= 4;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Progress + section label */}
      <div className="px-6 pt-6 pb-2 space-y-2">
        <QuizProgressBar step={step} total={TOTAL_STEPS} />
        <MonoLabel size="micro" colour="ghost" className="w-auto">
          {SECTION_LABELS[step - 1]}
        </MonoLabel>
      </div>

      {/* Step content (animated, scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <fieldset className="space-y-4 pb-6">
              <legend className="font-[var(--rc-font-display)] font-black text-lg text-[var(--rc-ink-primary)] pb-2">
                {STEP_QUESTIONS[step - 1]}
              </legend>

              {/* Step 1: Occasion (2×3 grid) */}
              {step === 1 && (
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Gift occasion">
                  {OCCASION_OPTIONS.map(opt => (
                    <GridTile
                      key={opt.value}
                      label={opt.label}
                      selected={occasion === opt.value}
                      onClick={() => setOccasion(opt.value)}
                    />
                  ))}
                </div>
              )}

              {/* Step 2: Experience level (single column) */}
              {step === 2 && (
                <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Experience level">
                  {EXPERIENCE_OPTIONS.map(opt => (
                    <SelectorTile
                      key={opt.value}
                      label={opt.label}
                      hint={opt.hint}
                      selected={experienceLevel === opt.value}
                      onClick={() => setExperienceLevel(opt.value)}
                    />
                  ))}
                </div>
              )}

              {/* Step 3: Personality (single column) */}
              {step === 3 && (
                <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Personality">
                  {PERSONALITY_OPTIONS.map(opt => (
                    <SelectorTile
                      key={opt.value}
                      label={opt.label}
                      hint={opt.hint}
                      selected={personality === opt.value}
                      onClick={() => setPersonality(opt.value)}
                    />
                  ))}
                </div>
              )}

              {/* Step 4: Wine colour (horizontal chips) */}
              {step === 4 && (
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Wine colour">
                  {WINE_COLOUR_OPTIONS.map(opt => (
                    <Chip
                      key={opt.value}
                      variant="Toggle"
                      state={wineColour === opt.value ? 'Selected' : 'Default'}
                      label={opt.label}
                      onClick={() => handleColourChange(opt.value)}
                    />
                  ))}
                </div>
              )}

              {/* Step 5: Wine style (branched by colour) */}
              {step === 5 && (
                <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Wine style">
                  {currentStyles.map(opt => (
                    <SelectorTile
                      key={opt.value}
                      label={opt.label}
                      hint={opt.hint}
                      selected={wineStyle === opt.value}
                      onClick={() => setWineStyle(opt.value)}
                    />
                  ))}
                </div>
              )}

              {/* Step 6: Region preference (optional) */}
              {step === 6 && (
                <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Region preference">
                  {REGION_OPTIONS.map(opt => (
                    <SelectorTile
                      key={opt.value}
                      label={opt.label}
                      hint={opt.hint}
                      selected={regionPreference === opt.value}
                      onClick={() => setRegionPreference(opt.value)}
                    />
                  ))}
                </div>
              )}
            </fieldset>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Persistent footer (steps 4–6): source + price */}
      {showFooter && (
        <div className="px-6 py-3 space-y-3 border-t border-[var(--rc-border-subtle)] bg-[var(--rc-surface-primary)]">
          {/* Source chips */}
          <div className="space-y-1.5">
            <MonoLabel size="micro" colour="ghost" className="w-auto">SOURCE</MonoLabel>
            <div className="flex flex-wrap gap-2">
              {SOURCE_LABELS.map(opt => (
                <Chip
                  key={opt.value}
                  variant="Toggle"
                  state={sourceMode === opt.value ? 'Selected' : 'Default'}
                  label={opt.label}
                  onClick={() => setSourceMode(opt.value)}
                />
              ))}
            </div>
            {sourceMode === 'cellar' && inventory.length === 0 && (
              <InlineMessage tone="warning" message="Your cellar is empty — no wines to choose from." />
            )}
          </div>

          {/* Price slider */}
          <PriceRangeSlider
            value={priceRange}
            onChange={setPriceRange}
            absoluteMax={ABSOLUTE_MAX_PRICE}
          />
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--rc-border-subtle)] bg-[var(--rc-surface-primary)]">
        {step === 1 ? (
          <Button
            variantType="Secondary"
            label="Cancel"
            onClick={onCancel}
            className="flex-1"
          />
        ) : (
          <Button
            variantType="Secondary"
            label="Back"
            onClick={goBack}
            className="flex-1"
          />
        )}
        {isLastStep ? (
          <Button
            variantType="Primary"
            label={submitting ? 'THINKING\u2026' : 'ASK R\u00c9MY'}
            onClick={handleSubmit}
            disabled={submitting || !canAdvance}
            className={cn('flex-1', submitting && 'animate-pulse')}
          />
        ) : (
          <Button
            variantType="Primary"
            label="Next"
            onClick={goNext}
            disabled={!canAdvance}
            className="flex-1"
          />
        )}
      </div>
    </div>
  );
};

export default GiftQuizForm;
