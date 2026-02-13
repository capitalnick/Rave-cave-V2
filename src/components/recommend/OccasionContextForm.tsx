import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button, Input, Switch, Heading, MonoLabel } from '@/components/rc';
import { OCCASIONS } from '@/constants';
import { cn } from '@/lib/utils';
import type {
  OccasionId,
  OccasionContext,
  DinnerContext,
  PartyContext,
  GiftContext,
  CheeseContext,
  ScanMenuContext,
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
        {occasionId === 'cheese' && (
          <CheeseForm onSubmit={onSubmit} submitting={submitting} setSubmitting={setSubmitting} />
        )}
        {occasionId === 'scan_menu' && (
          <ScanMenuForm onSubmit={onSubmit} submitting={submitting} setSubmitting={setSubmitting} />
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
  const [vibe, setVibe] = useState<'casual' | 'fancy'>('casual');
  const [cellarOnly, setCellarOnly] = useState(true);

  const handleSubmit = () => {
    setSubmitting(true);
    const ctx: DinnerContext = { meal, guests, vibe, cellarOnly };
    onSubmit(ctx);
  };

  return (
    <div className="space-y-6">
      <Heading scale="subhead" colour="primary">TELL RÉMY ABOUT YOUR MEAL</Heading>

      <FieldGroup label="What are you serving?" hint={!meal ? 'A description helps Rémy nail the pairing' : undefined}>
        <Input
          typeVariant="Textarea"
          placeholder="e.g., Slow-braised lamb shoulder with rosemary roasted potatoes"
          value={meal}
          onChange={(e) => setMeal(e.target.value)}
        />
      </FieldGroup>

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

      <FieldGroup label="Vibe">
        <SegmentedControl
          options={[
            { value: 'casual' as const, label: 'Casual' },
            { value: 'fancy' as const, label: 'Fancy' },
          ]}
          value={vibe}
          onChange={setVibe}
        />
      </FieldGroup>

      <CellarToggle value={cellarOnly} onChange={setCellarOnly} />
      <SubmitRow submitting={submitting} onClick={handleSubmit} />
    </div>
  );
};

// ── Party Form ──

const PartyForm: React.FC<FormProps> = ({ onSubmit, submitting, setSubmitting }) => {
  const [guests, setGuests] = useState(8);
  const [vibe, setVibe] = useState<'casual' | 'cocktail' | 'celebration'>('casual');
  const [budgetPerBottle, setBudgetPerBottle] = useState<'any' | 'under-20' | '20-50' | '50-plus'>('any');
  const [cellarOnly, setCellarOnly] = useState(true);

  const handleSubmit = () => {
    setSubmitting(true);
    const ctx: PartyContext = { guests, vibe, budgetPerBottle, cellarOnly };
    onSubmit(ctx);
  };

  return (
    <div className="space-y-6">
      <Heading scale="subhead" colour="primary">TELL RÉMY ABOUT YOUR PARTY</Heading>

      <FieldGroup label="How many guests?">
        <Stepper value={guests} min={2} max={50} onChange={setGuests} />
      </FieldGroup>

      <FieldGroup label="Vibe">
        <SegmentedControl
          options={[
            { value: 'casual' as const, label: 'Casual' },
            { value: 'cocktail' as const, label: 'Cocktail' },
            { value: 'celebration' as const, label: 'Celebration' },
          ]}
          value={vibe}
          onChange={setVibe}
        />
      </FieldGroup>

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

// ── Cheese Form ──

const CheeseForm: React.FC<FormProps> = ({ onSubmit, submitting, setSubmitting }) => {
  const [cheeses, setCheeses] = useState('');
  const [style, setStyle] = useState<'light-fresh' | 'bold-aged' | 'mixed'>('mixed');
  const [cellarOnly, setCellarOnly] = useState(true);

  const handleSubmit = () => {
    setSubmitting(true);
    const ctx: CheeseContext = { cheeses, style, cellarOnly };
    onSubmit(ctx);
  };

  return (
    <div className="space-y-6">
      <Heading scale="subhead" colour="primary">TELL RÉMY ABOUT YOUR CHEESE BOARD</Heading>

      <FieldGroup label="What cheeses?" hint={!cheeses ? 'The more detail, the better the pairing' : undefined}>
        <Input
          placeholder="e.g., Brie, aged Gruyère, blue cheese"
          value={cheeses}
          onChange={(e) => setCheeses(e.target.value)}
        />
      </FieldGroup>

      <FieldGroup label="Style">
        <SegmentedControl
          options={[
            { value: 'light-fresh' as const, label: 'Light & Fresh' },
            { value: 'bold-aged' as const, label: 'Bold & Aged' },
            { value: 'mixed' as const, label: 'Mixed' },
          ]}
          value={style}
          onChange={setStyle}
        />
      </FieldGroup>

      <CellarToggle value={cellarOnly} onChange={setCellarOnly} />
      <SubmitRow submitting={submitting} onClick={handleSubmit} />
    </div>
  );
};

// ── Scan Menu Form ──

type BudgetPreset = 'any' | 'under-30' | '30-60' | '60-100' | '100-plus';

const BUDGET_RANGES: Record<BudgetPreset, { min: number | null; max: number | null }> = {
  'any':       { min: null, max: null },
  'under-30':  { min: null, max: 30 },
  '30-60':     { min: 30,   max: 60 },
  '60-100':    { min: 60,   max: 100 },
  '100-plus':  { min: 100,  max: null },
};

const ScanMenuForm: React.FC<FormProps> = ({ onSubmit, submitting, setSubmitting }) => {
  const [budgetPreset, setBudgetPreset] = useState<BudgetPreset>('any');
  const [meal, setMeal] = useState('');
  const [preferences, setPreferences] = useState('');

  const handleSubmit = () => {
    setSubmitting(true);
    const range = BUDGET_RANGES[budgetPreset];
    const ctx: ScanMenuContext = {
      budgetMin: range.min,
      budgetMax: range.max,
      currency: 'AUD',
      budgetUnit: 'bottle',
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

      <FieldGroup label="What are you eating?" hint={!meal ? 'Helps Rémy match wines to your meal' : undefined}>
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
          label={submitting ? 'THINKING\u2026' : 'NEXT: SCAN MENU'}
          onClick={handleSubmit}
          disabled={submitting}
          className={cn("w-full", submitting && "animate-pulse")}
        />
      </div>
    </div>
  );
};

export default OccasionContextForm;
