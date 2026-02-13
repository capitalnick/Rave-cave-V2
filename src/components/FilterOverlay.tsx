import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Chip, MonoLabel, Divider, Heading, Input, Checkbox } from '@/components/rc';
import type { ChipState, MaturityValue } from '@/components/rc/Chip';
import type { FacetKey, FacetOption, FiltersState } from '@/lib/faceted-filters';

// ── Wine type → Chip indicator color ──
const WINE_TYPE_COLORS: Record<string, string> = {
  Red: 'var(--rc-wine-red)',
  White: 'var(--rc-wine-white)',
  'Rosé': 'var(--rc-wine-rose)',
  Sparkling: 'var(--rc-wine-sparkling)',
  Dessert: 'var(--rc-wine-dessert)',
  Fortified: 'var(--rc-wine-red)',
};

// ── Maturity → Chip maturityValue prop ──
const MATURITY_CHIP_MAP: Record<string, MaturityValue> = {
  'Drink Now': 'drink-now',
  'Hold': 'hold',
  'Past Peak': 'past-peak',
};

// ── Price bucket ordering ──
const PRICE_ORDER = ['Under $30', '$30-$60', '$60-$100', '$100+'];

interface FilterOverlayProps {
  filters: FiltersState;
  facetOptions: Record<string, FacetOption[]>;
  filteredCount: number;
  onToggleFacet: (key: FacetKey, value: string) => void;
  onClearFilters: () => void;
  onClose?: () => void;
}

// ── Accordion section ──
const AccordionSection: React.FC<{
  title: string;
  facetKey: FacetKey;
  options: FacetOption[];
  selected: string[];
  onToggle: (key: FacetKey, value: string) => void;
  searchable?: boolean;
}> = ({ title, facetKey, options, selected, onToggle, searchable = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const activeCount = selected.length;

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    return options.filter(opt =>
      opt.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm, searchable]);

  return (
    <div className="py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left group"
      >
        <span className="flex items-center gap-2">
          <MonoLabel size="micro" weight="bold" colour="primary" as="span" className="w-auto">
            {title}
          </MonoLabel>
          {activeCount > 0 && (
            <span className="bg-[var(--rc-ink-primary)] text-[var(--rc-accent-acid)] text-[9px] px-1.5 rounded-full font-[var(--rc-font-mono)] font-bold leading-tight min-w-[18px] text-center">
              {activeCount}
            </span>
          )}
        </span>
        {expanded
          ? <ChevronUp size={14} className="text-[var(--rc-ink-tertiary)]" />
          : <ChevronDown size={14} className="text-[var(--rc-ink-tertiary)]" />
        }
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {searchable && (
            <div className="mb-2">
              <Input
                typeVariant="Search"
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div key={opt.value} className="flex items-center justify-between">
                  <Checkbox
                    variant={selected.includes(opt.value) ? 'Checked' : 'Unchecked'}
                    label={opt.value}
                    platform="Desktop"
                    onChange={() => onToggle(facetKey, opt.value)}
                    className={opt.count === 0 ? 'opacity-40' : ''}
                  />
                  <MonoLabel
                    size="micro"
                    colour={opt.count === 0 ? 'ghost' : 'tertiary'}
                    as="span"
                    className="w-auto shrink-0 ml-2"
                  >
                    {opt.count}
                  </MonoLabel>
                </div>
              ))
            ) : (
              <MonoLabel size="micro" colour="ghost" align="centre" as="span" className="block py-2">
                No results
              </MonoLabel>
            )}
          </div>
        </div>
      )}
      <Divider weight="subtle" className="mt-3" />
    </div>
  );
};

// ── Main component ──
const FilterOverlay: React.FC<FilterOverlayProps> = ({
  filters,
  facetOptions,
  filteredCount,
  onToggleFacet,
  onClearFilters,
  onClose,
}) => {
  // ── Chip helpers ──
  const chipState = (facetKey: FacetKey, value: string, count: number): ChipState => {
    const facet = filters[facetKey];
    if ('include' in facet && facet.include.includes(value)) return 'Selected';
    if (count === 0) return 'Disabled';
    return 'Default';
  };

  // Sort price options by predefined order
  const sortedPriceOptions = useMemo(() => {
    const priceOpts = facetOptions.price ?? [];
    return PRICE_ORDER
      .map(label => priceOpts.find(o => o.value === label) ?? { value: label, count: 0 })
  }, [facetOptions.price]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <Heading scale="heading">Filters</Heading>
        <button
          onClick={onClearFilters}
          className="font-[var(--rc-font-mono)] text-[9px] font-bold uppercase underline text-[var(--rc-ink-ghost)] hover:text-[var(--rc-accent-pink)] transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* ── TYPE chips ── */}
      <div className="py-2">
        <MonoLabel size="micro" weight="bold" colour="primary" as="div" className="mb-2">
          Type
        </MonoLabel>
        <div className="flex flex-wrap gap-2">
          {(facetOptions.wineType ?? []).map((opt) => (
            <Chip
              key={opt.value}
              variant="WineType"
              state={chipState('wineType', opt.value, opt.count)}
              label={`${opt.value} (${opt.count})`}
              indicatorColor={WINE_TYPE_COLORS[opt.value]}
              onClick={() => opt.count > 0 || filters.wineType.include.includes(opt.value)
                ? onToggleFacet('wineType', opt.value) : undefined}
            />
          ))}
        </div>
      </div>

      {/* ── MATURITY chips ── */}
      <div className="py-2">
        <MonoLabel size="micro" weight="bold" colour="primary" as="div" className="mb-2">
          Maturity
        </MonoLabel>
        <div className="flex flex-wrap gap-2">
          {(facetOptions.maturityStatus ?? []).map((opt) => (
            <Chip
              key={opt.value}
              variant="Maturity"
              state={chipState('maturityStatus', opt.value, opt.count)}
              label={`${opt.value} (${opt.count})`}
              maturityValue={MATURITY_CHIP_MAP[opt.value]}
              onClick={() => opt.count > 0 || filters.maturityStatus.include.includes(opt.value)
                ? onToggleFacet('maturityStatus', opt.value) : undefined}
            />
          ))}
        </div>
      </div>

      {/* ── PRICE chips ── */}
      <div className="py-2">
        <MonoLabel size="micro" weight="bold" colour="primary" as="div" className="mb-2">
          Price
        </MonoLabel>
        <div className="flex flex-wrap gap-2">
          {sortedPriceOptions.map((opt) => (
            <Chip
              key={opt.value}
              variant="Filter"
              state={chipState('price', opt.value, opt.count)}
              label={`${opt.value} (${opt.count})`}
              onClick={() => opt.count > 0 || filters.price.include.includes(opt.value)
                ? onToggleFacet('price', opt.value) : undefined}
            />
          ))}
        </div>
      </div>

      <Divider weight="emphasised" />

      {/* ── Accordion sections ── */}
      <AccordionSection
        title="Grapes"
        facetKey="grapeVariety"
        options={facetOptions.grapeVariety ?? []}
        selected={filters.grapeVariety.include}
        onToggle={onToggleFacet}
        searchable
      />
      <AccordionSection
        title="Producer"
        facetKey="producer"
        options={facetOptions.producer ?? []}
        selected={filters.producer.include}
        onToggle={onToggleFacet}
        searchable
      />
      <AccordionSection
        title="Region"
        facetKey="region"
        options={facetOptions.region ?? []}
        selected={filters.region.include}
        onToggle={onToggleFacet}
      />
      <AccordionSection
        title="Country"
        facetKey="country"
        options={facetOptions.country ?? []}
        selected={filters.country.include}
        onToggle={onToggleFacet}
      />
      <AccordionSection
        title="Appellation"
        facetKey="appellation"
        options={facetOptions.appellation ?? []}
        selected={filters.appellation.include}
        onToggle={onToggleFacet}
      />
      <AccordionSection
        title="Vintages"
        facetKey="vintage"
        options={facetOptions.vintage ?? []}
        selected={filters.vintage.include}
        onToggle={onToggleFacet}
      />

      {/* ── Show Results button ── */}
      <div className="pt-4 pb-2">
        <button
          onClick={onClose}
          className="w-full py-4 bg-[var(--rc-accent-acid)] border-[var(--rc-divider-emphasis-weight)] border-[var(--rc-ink-primary)] font-[var(--rc-font-display)] text-2xl uppercase font-black rounded-[var(--rc-radius-md)]"
        >
          Show Results ({filteredCount})
        </button>
      </div>
    </div>
  );
};

export default FilterOverlay;
