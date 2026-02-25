import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button, Input, Switch, Heading, MonoLabel, Body } from '@/components/rc';
import { OCCASIONS, WINE_PER_PERSON_MULTIPLIER } from '@/constants';
import { cn } from '@/lib/utils';
import type {
  OccasionId,
  OccasionContext,
  DinnerContext,
  PartyContext,
  PartyVibe,
  WinePerPerson,
  GiftContext,
  WineListAnalysisContext,
} from '@/types';

interface OccasionContextFormProps {
  occasionId: OccasionId;
  onSubmit: (context: OccasionContext) => void;
  onBack: () => void;
}

const OccasionContextForm: React.FC<OccasionContextFormProps> = ({ occasionId, onSubmit, onBack }) => {
  const occasion = OCCASIONS.find(o => o.id === occasionId)!;
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)] transition-colors"
          aria-label="Back to occasions"
        >
          <ArrowLeft size={20} />
          <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider">Back</span>
        </button>
      </div>
      <div className="px-6 pb-4">
        <Heading scale="heading">{occasion.title}</Heading>
      </div>

      {/* Form Content */}
      <div className="flex-1 px-6 pb-24">
        {occasionId === 'dinner' && (
          <DinnerForm onSubmit={onSubmit} submitting={submitting} setSubmitting={setSubmitting} />
        )}
        {occasionId === 'party' && (
          <PartyForm onSubmit={onSubmit} submitting={submitting} setSubmitting={setSubmitting} />
        )}
        {occasionId === 'gift' && (
          <GiftForm onSubmit={onSubmit} submitting={submitting} setSubmitting={setSubmitting} />
        )}
        {occasionId === 'analyze_winelist' && (
          <WineListForm onSubmit={onSubmit} submitting={submitting} setSubmitting={setSubmitting} />
        )}
      </div>
    </div>
  );
};

// ── Segmented Control ──

interface SegmentedControlProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function SegmentedControl<T extends string | number>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-4 py-2 rounded-full font-[var(--rc-font-mono)] text-xs uppercase tracking-wider font-bold border transition-all duration-150",
            value === opt.value
              ? "bg-[var(--rc-selection-bg)] border-[var(--rc-selection-border)] text-[var(--rc-selection-text)]"
              : "bg-white border-[var(--rc-border-subtle)] text-[var(--rc-ink-primary)] hover:bg-[var(--rc-surface-secondary)]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Stepper ──

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

const Stepper: React.FC<StepperProps> = ({ value, min, max, onChange }) => {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-10 h-10 rounded-full border border-[var(--rc-border-subtle)] flex items-center justify-center text-lg font-bold disabled:opacity-30 hover:bg-[var(--rc-surface-secondary)] transition-colors"
      >
        −
      </button>
      <span className="font-[var(--rc-font-display)] font-black text-2xl min-w-[3ch] text-center">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-10 h-10 rounded-full border border-[var(--rc-border-subtle)] flex items-center justify-center text-lg font-bold disabled:opacity-30 hover:bg-[var(--rc-surface-secondary)] transition-colors"
      >
        +
      </button>
    </div>
  );
};

// ── Cellar Toggle ──

interface CellarToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

const CellarToggle: React.FC<CellarToggleProps> = ({ value, onChange }) => (
  <div className="flex items-center justify-between py-3">
    <MonoLabel size="label" colour="primary" className="w-auto">From my cellar only</MonoLabel>
    <Switch variant={value ? 'On' : 'Off'} onChange={onChange} />
  </div>
);

// ── Submit Button ──

interface SubmitRowProps {
  submitting: boolean;
  onClick: () => void;
}

const SubmitRow: React.FC<SubmitRowProps> = ({ submitting, onClick }) => (
  <div className="pt-6">
    <Button
      variantType="Primary"
      label={submitting ? 'THINKING…' : 'FIND WINES'}
      onClick={onClick}
      disabled={submitting}
      className={cn("w-full", submitting && "animate-pulse")}
    />
  </div>
);

// ── Field Group ──

interface FieldGroupProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

const FieldGroup: React.FC<FieldGroupProps> = ({ label, hint, children }) => (
  <div className="space-y-2">
    <MonoLabel size="label" colour="secondary" className="w-auto">{label}</MonoLabel>
    {children}
    {hint && (
      <span className="text-xs text-[var(--rc-ink-ghost)] font-[var(--rc-font-body)]">{hint}</span>
    )}
  </div>
);

// ── Dinner Form ──

interface FormProps {
  onSubmit: (context: OccasionContext) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
}

const DinnerForm: React.FC<FormProps> = ({ onSubmit, submitting, setSubmitting }) => {
  const [meal, setMeal] = useState('');
  const [guests, setGuests] = useState<2 | 4 | 6 | 8>(4);
  const [budgetPerBottle, setBudgetPerBottle] = useState<'any' | 'under-20' | '20-50' | '50-plus'>('any');
  const [cellarOnly, setCellarOnly] = useState(true);

  const handleSubmit = () => {
    setSubmitting(true);
    const ctx: DinnerContext = { meal, guests, budgetPerBottle, cellarOnly };
    onSubmit(ctx);
  };

  return (
    <div className="space-y-8">
      {/* Headline */}
      <Heading scale="title" colour="primary">What are you eating?</Heading>

      {/* Rémy personality block */}
      <div className="flex gap-3 items-start">
        <span className="w-[28px] h-[28px] rounded-full bg-[var(--rc-accent-pink)] flex items-center justify-center font-[var(--rc-font-mono)] text-[11px] font-bold text-white leading-none shrink-0 mt-0.5">R</span>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <MonoLabel size="label" colour="primary" className="w-auto">Rémy</MonoLabel>
            <MonoLabel size="micro" colour="ghost" className="w-auto">Bon appétit</MonoLabel>
          </div>
          <Body size="caption" colour="secondary" as="p" className="italic">
            Décrivez votre plat — the more detail, the better I can match.
          </Body>
        </div>
      </div>

      {/* Meal textarea */}
      <Input
        typeVariant="Textarea"
        placeholder="e.g., Slow-braised lamb shoulder with rosemary roasted potatoes, finishing with a dark chocolate tart"
        value={meal}
        onChange={(e) => setMeal(e.target.value)}
      />

      {/* Guests */}
      <FieldGroup label="Guests">
        <SegmentedControl
          options={[
            { value: 2 as const, label: '2' },
            { value: 4 as const, label: '4' },
            { value: 6 as const, label: '6' },
            { value: 8 as const, label: '8+' },
          ]}
          value={guests}
          onChange={setGuests}
        />
      </FieldGroup>

      {/* Price per bottle */}
      <FieldGroup label="Price per bottle">
        <SegmentedControl
          options={[
            { value: 'any' as const, label: 'Any' },
            { value: 'under-20' as const, label: 'Under $20' },
            { value: '20-50' as const, label: '$20–50' },
            { value: '50-plus' as const, label: '$50+' },
          ]}
          value={budgetPerBottle}
          onChange={setBudgetPerBottle}
        />
      </FieldGroup>

      <CellarToggle value={cellarOnly} onChange={setCellarOnly} />
      <SubmitRow submitting={submitting} onClick={handleSubmit} />
    </div>
  );
};

// ── Party Form ──

const PARTY_VIBES: { value: PartyVibe; label: string; hint: string }[] = [
  { value: 'summer-brunch',      label: 'Summer Brunch',       hint: 'Light, bright, easy-drinking' },
  { value: 'garden-party',       label: 'Garden Party',        hint: 'Elegant outdoors, varied styles' },
  { value: 'bbq',                label: 'BBQ',                 hint: 'Bold reds, crisp whites, rosé' },
  { value: 'cocktail-party',     label: 'Cocktail Party',      hint: 'Sparkling-forward, crowd pleasers' },
  { value: 'celebration',        label: 'Celebration',         hint: 'Premium picks, fizz to start' },
  { value: 'casual-dinner',      label: 'Casual Dinner',       hint: 'Relaxed, food-friendly, approachable' },
  { value: 'wine-lovers-dinner', label: 'Wine Lovers\' Dinner', hint: 'Showcase bottles, diversity of regions' },
  { value: 'holiday-feast',      label: 'Holiday Feast',       hint: 'Rich reds, aromatic whites, festive' },
  { value: 'late-night',         label: 'Late Night',          hint: 'Fun, easy, nothing too serious' },
];

const WINE_PER_PERSON_OPTIONS: { value: WinePerPerson; label: string; hint: string }[] = [
  { value: 'light',    label: 'Light',    hint: '¼ bottle pp' },
  { value: 'moderate', label: 'Moderate', hint: '½ bottle pp' },
  { value: 'generous', label: 'Generous', hint: '¾ bottle pp' },
  { value: 'full',     label: 'Full',     hint: '1 bottle pp' },
];

const PartyForm: React.FC<FormProps> = ({ onSubmit, submitting, setSubmitting }) => {
  const [guests, setGuests] = useState(8);
  const [winePerPerson, setWinePerPerson] = useState<WinePerPerson>('moderate');
  const [vibe, setVibe] = useState<PartyVibe>('casual-dinner');
  const [budgetPerBottle, setBudgetPerBottle] = useState<'any' | 'under-20' | '20-50' | '50-plus'>('any');
  const [cellarOnly, setCellarOnly] = useState(true);

  const totalBottles = Math.ceil(guests * WINE_PER_PERSON_MULTIPLIER[winePerPerson]);

  const handleSubmit = () => {
    setSubmitting(true);
    const ctx: PartyContext = { guests, winePerPerson, totalBottles, vibe, budgetPerBottle, cellarOnly };
    onSubmit(ctx);
  };

  return (
    <div className="space-y-6">
      <Heading scale="subhead" colour="primary">TELL RÉMY ABOUT YOUR PARTY</Heading>

      {/* Guest stepper */}
      <FieldGroup label="How many guests?">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setGuests(Math.max(2, guests - 1))}
            disabled={guests <= 2}
            className="w-12 h-12 rounded-full border-2 border-[var(--rc-border-subtle)] flex items-center justify-center text-xl font-bold disabled:opacity-30 hover:bg-[var(--rc-surface-secondary)] transition-colors"
          >
            −
          </button>
          <span className="font-[var(--rc-font-display)] font-black text-5xl min-w-[3ch] text-center tabular-nums">
            {guests}
          </span>
          <button
            type="button"
            onClick={() => setGuests(Math.min(100, guests + 1))}
            disabled={guests >= 100}
            className="w-12 h-12 rounded-full border-2 border-[var(--rc-border-subtle)] flex items-center justify-center text-xl font-bold disabled:opacity-30 hover:bg-[var(--rc-surface-secondary)] transition-colors"
          >
            +
          </button>
        </div>
      </FieldGroup>

      {/* Wine per person — 2×2 grid */}
      <FieldGroup label="Wine per person">
        <div className="grid grid-cols-2 gap-2">
          {WINE_PER_PERSON_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setWinePerPerson(opt.value)}
              className={cn(
                "flex flex-col items-start px-4 py-3 rounded-lg border-2 transition-all duration-150 text-left",
                winePerPerson === opt.value
                  ? "border-[var(--rc-accent-acid)] bg-[var(--rc-accent-acid)]/10"
                  : "border-[var(--rc-border-subtle)] bg-white hover:bg-[var(--rc-surface-secondary)]"
              )}
            >
              <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider font-bold">{opt.label}</span>
              <span className="text-[10px] text-[var(--rc-ink-ghost)] font-[var(--rc-font-body)]">{opt.hint}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Live bottle count */}
      <div className="flex items-center gap-3 rounded-lg bg-[var(--rc-surface-secondary)] border-l-4 border-[var(--rc-accent-acid)] px-4 py-3">
        <span className="font-[var(--rc-font-display)] font-black text-3xl text-[var(--rc-ink-primary)] tabular-nums">
          {totalBottles}
        </span>
        <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider text-[var(--rc-ink-secondary)]">
          bottles needed
        </span>
      </div>

      {/* Vibe — vertical list */}
      <FieldGroup label="Vibe">
        <div className="flex flex-col gap-1.5">
          {PARTY_VIBES.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setVibe(v.value)}
              className={cn(
                "flex flex-col items-start px-4 py-2.5 rounded-lg border transition-all duration-150 text-left",
                vibe === v.value
                  ? "border-[var(--rc-accent-pink)] bg-[var(--rc-accent-pink)]/10"
                  : "border-[var(--rc-border-subtle)] bg-white hover:bg-[var(--rc-surface-secondary)]"
              )}
            >
              <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider font-bold">{v.label}</span>
              <span className="text-[10px] text-[var(--rc-ink-ghost)] font-[var(--rc-font-body)]">{v.hint}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Budget */}
      <FieldGroup label="Budget per bottle">
        <SegmentedControl
          options={[
            { value: 'any' as const, label: 'Any' },
            { value: 'under-20' as const, label: 'Under $20' },
            { value: '20-50' as const, label: '$20–50' },
            { value: '50-plus' as const, label: '$50+' },
          ]}
          value={budgetPerBottle}
          onChange={setBudgetPerBottle}
        />
      </FieldGroup>

      <CellarToggle value={cellarOnly} onChange={setCellarOnly} />
      <SubmitRow submitting={submitting} onClick={handleSubmit} />
    </div>
  );
};

// ── Gift Form ──

const GiftForm: React.FC<FormProps> = ({ onSubmit, submitting, setSubmitting }) => {
  const [recipient, setRecipient] = useState('');
  const [theirTaste, setTheirTaste] = useState('');
  const [occasion, setOccasion] = useState<'birthday' | 'thank-you' | 'holiday' | 'just-because'>('just-because');
  const [budget, setBudget] = useState<'any' | 'under-30' | '30-75' | '75-plus'>('any');
  const [cellarOnly, setCellarOnly] = useState(false); // Default OFF for gifts

  const handleSubmit = () => {
    setSubmitting(true);
    const ctx: GiftContext = { recipient, theirTaste, occasion, budget, cellarOnly };
    onSubmit(ctx);
  };

  return (
    <div className="space-y-6">
      <Heading scale="subhead" colour="primary">TELL RÉMY ABOUT THE GIFT</Heading>

      <FieldGroup label="Who's it for?" hint={!recipient ? 'Helps Rémy personalise the pick' : undefined}>
        <Input
          placeholder="e.g., My wine-loving dad"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
      </FieldGroup>

      <div className="pt-2">
        <MonoLabel size="label" colour="ghost" className="w-auto pb-3">EXTRAS (OPTIONAL)</MonoLabel>
      </div>

      <FieldGroup label="What do they like?">
        <Input
          placeholder="e.g., Bold reds, Italian wines..."
          value={theirTaste}
          onChange={(e) => setTheirTaste(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup label="Gift occasion">
        <SegmentedControl
          options={[
            { value: 'birthday' as const, label: 'Birthday' },
            { value: 'thank-you' as const, label: 'Thank You' },
            { value: 'holiday' as const, label: 'Holiday' },
            { value: 'just-because' as const, label: 'Just Because' },
          ]}
          value={occasion}
          onChange={setOccasion}
        />
      </FieldGroup>

      <FieldGroup label="Budget">
        <SegmentedControl
          options={[
            { value: 'any' as const, label: 'Any' },
            { value: 'under-30' as const, label: 'Under $30' },
            { value: '30-75' as const, label: '$30–75' },
            { value: '75-plus' as const, label: '$75+' },
          ]}
          value={budget}
          onChange={setBudget}
        />
      </FieldGroup>

      <CellarToggle value={cellarOnly} onChange={setCellarOnly} />
      <SubmitRow submitting={submitting} onClick={handleSubmit} />
    </div>
  );
};

// ── Wine List Form ──

type BudgetPreset = 'any' | 'under-30' | '30-60' | '60-100' | '100-plus';

const BUDGET_RANGES: Record<BudgetPreset, { min: number | null; max: number | null }> = {
  'any':       { min: null, max: null },
  'under-30':  { min: null, max: 30 },
  '30-60':     { min: 30,   max: 60 },
  '60-100':    { min: 60,   max: 100 },
  '100-plus':  { min: 100,  max: null },
};

const WineListForm: React.FC<FormProps> = ({ onSubmit, submitting, setSubmitting }) => {
  const [budgetPreset, setBudgetPreset] = useState<BudgetPreset>('any');
  const [meal, setMeal] = useState('');
  const [preferences, setPreferences] = useState('');

  const handleSubmit = () => {
    setSubmitting(true);
    const range = BUDGET_RANGES[budgetPreset];
    const ctx: WineListAnalysisContext = {
      budgetMin: range.min,
      budgetMax: range.max,
      currency: 'AUD',
      meal,
      preferences,
    };
    onSubmit(ctx);
  };

  return (
    <div className="space-y-6">
      <Heading scale="subhead" colour="primary">TELL RÉMY WHAT YOU'RE AFTER</Heading>

      <FieldGroup label="Budget per bottle">
        <SegmentedControl
          options={[
            { value: 'any' as const,      label: 'Any' },
            { value: 'under-30' as const, label: 'Under $30' },
            { value: '30-60' as const,    label: '$30\u201360' },
            { value: '60-100' as const,   label: '$60\u2013100' },
            { value: '100-plus' as const, label: '$100+' },
          ]}
          value={budgetPreset}
          onChange={setBudgetPreset}
        />
      </FieldGroup>

      <FieldGroup label="What are you eating?" hint={!meal ? 'Helps Rémy pick pairings from the list' : undefined}>
        <Input
          typeVariant="Textarea"
          placeholder="e.g., Grilled lamb chops with mint..."
          value={meal}
          onChange={(e) => setMeal(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup label="Style preferences (optional)">
        <Input
          placeholder="e.g., French only, nothing too tannic..."
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
        />
      </FieldGroup>

      <div className="pt-6">
        <Button
          variantType="Primary"
          label={submitting ? 'THINKING\u2026' : 'NEXT: CAPTURE PAGES'}
          onClick={handleSubmit}
          disabled={submitting}
          className={cn("w-full", submitting && "animate-pulse")}
        />
      </div>
    </div>
  );
};

export default OccasionContextForm;
