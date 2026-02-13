import type { Wine } from '@/types';
import { getMaturityStatus } from '@/constants';

// ── Types ──

export type FacetKey =
  | 'wineType'
  | 'maturityStatus'
  | 'country'
  | 'region'
  | 'appellation'
  | 'producer'
  | 'grapeVariety'
  | 'vintage'
  | 'rating'
  | 'price';

export type MultiSelectFacet = { include: string[] };
export type RangeFacet = { min: number | null; max: number | null };

export interface FiltersState {
  wineType: MultiSelectFacet;
  maturityStatus: MultiSelectFacet;
  country: MultiSelectFacet;
  region: MultiSelectFacet;
  appellation: MultiSelectFacet;
  producer: MultiSelectFacet;
  grapeVariety: MultiSelectFacet;
  vintage: MultiSelectFacet;
  rating: RangeFacet;
  price: MultiSelectFacet;
  searchQuery: string;
}

export const EMPTY_FILTERS: FiltersState = {
  wineType: { include: [] },
  maturityStatus: { include: [] },
  country: { include: [] },
  region: { include: [] },
  appellation: { include: [] },
  producer: { include: [] },
  grapeVariety: { include: [] },
  vintage: { include: [] },
  rating: { min: null, max: null },
  price: { include: [] },
  searchQuery: '',
};

// ── Helpers ──

const norm = (s: string) => s.trim().toLowerCase();

const GRAPE_SPLIT_RE = /[\/&+,]|(?:\s+and\s+)/i;

export function parseGrapes(cepage: string | undefined): string[] {
  if (!cepage || cepage.trim() === '') return [];
  return cepage.split(GRAPE_SPLIT_RE).map(g => g.trim()).filter(g => g.length > 0);
}

export function computeMaturity(wine: Wine): string {
  const raw = getMaturityStatus(wine.drinkFrom, wine.drinkUntil);
  return raw.replace(/[🍷🟢⚠️]/g, '').trim();
}

// ── Matchers ──

function matchesMulti(value: string | undefined, facet: MultiSelectFacet): boolean {
  if (facet.include.length === 0) return true;
  if (!value) return false;
  return facet.include.some(v => norm(v) === norm(value));
}

function matchesMultiArray(values: string[], facet: MultiSelectFacet): boolean {
  if (facet.include.length === 0) return true;
  if (values.length === 0) return false;
  return facet.include.some(fv => values.some(v => norm(v) === norm(fv)));
}

function matchesRange(n: number | undefined, range: RangeFacet): boolean {
  if (range.min === null && range.max === null) return true;
  if (n === undefined || n === null) return false;
  if (range.min !== null && n < range.min) return false;
  if (range.max !== null && n > range.max) return false;
  return true;
}

function matchesSearch(wine: Wine, query: string): boolean {
  if (!query) return true;
  const q = norm(query);
  return (
    norm(wine.producer).includes(q) ||
    norm(wine.name).includes(q) ||
    norm(wine.country).includes(q) ||
    norm(wine.region).includes(q) ||
    norm(wine.appellation ?? '').includes(q) ||
    norm(wine.cepage ?? '').includes(q)
  );
}

// Price bucket matching for MultiSelectFacet-based price
const PRICE_BUCKETS: { label: string; test: (p: number) => boolean }[] = [
  { label: 'Under $30', test: p => p < 30 },
  { label: '$30-$60', test: p => p >= 30 && p < 60 },
  { label: '$60-$100', test: p => p >= 60 && p < 100 },
  { label: '$100+', test: p => p >= 100 },
];

export function getPriceBucket(price: number): string {
  for (const b of PRICE_BUCKETS) {
    if (b.test(price)) return b.label;
  }
  return 'Under $30';
}

function matchesPriceFacet(price: number, facet: MultiSelectFacet): boolean {
  if (facet.include.length === 0) return true;
  const bucket = getPriceBucket(price);
  return facet.include.includes(bucket);
}

// ── Core filter functions ──

function wineMatchesFacet(wine: Wine, key: FacetKey, filters: FiltersState): boolean {
  switch (key) {
    case 'wineType':
      return matchesMulti(wine.type, filters.wineType);
    case 'maturityStatus':
      return matchesMulti(computeMaturity(wine), filters.maturityStatus);
    case 'country':
      return matchesMulti(wine.country, filters.country);
    case 'region':
      return matchesMulti(wine.region, filters.region);
    case 'appellation':
      return matchesMulti(wine.appellation, filters.appellation);
    case 'producer':
      return matchesMulti(wine.producer, filters.producer);
    case 'grapeVariety':
      return matchesMultiArray(parseGrapes(wine.cepage), filters.grapeVariety);
    case 'vintage':
      return matchesMulti(String(wine.vintage), filters.vintage);
    case 'rating':
      return matchesRange(wine.vivinoRating, filters.rating);
    case 'price':
      return matchesPriceFacet(wine.price, filters.price);
  }
}

const ALL_FACET_KEYS: FacetKey[] = [
  'wineType', 'maturityStatus', 'country', 'region', 'appellation',
  'producer', 'grapeVariety', 'vintage', 'rating', 'price',
];

export function matchesAllFacets(wine: Wine, filters: FiltersState): boolean {
  if (!matchesSearch(wine, filters.searchQuery)) return false;
  return ALL_FACET_KEYS.every(key => wineMatchesFacet(wine, key, filters));
}

function matchesAllFacetsExcept(wine: Wine, filters: FiltersState, exceptKey: FacetKey): boolean {
  if (!matchesSearch(wine, filters.searchQuery)) return false;
  return ALL_FACET_KEYS.every(key => key === exceptKey || wineMatchesFacet(wine, key, filters));
}

// ── Facet value extractors ──

function extractFacetValue(wine: Wine, key: FacetKey): string[] {
  switch (key) {
    case 'wineType':
      return wine.type ? [wine.type] : [];
    case 'maturityStatus':
      return [computeMaturity(wine)];
    case 'country':
      return wine.country ? [wine.country] : [];
    case 'region':
      return wine.region ? [wine.region] : [];
    case 'appellation':
      return wine.appellation ? [wine.appellation] : [];
    case 'producer':
      return wine.producer ? [wine.producer] : [];
    case 'grapeVariety':
      return parseGrapes(wine.cepage);
    case 'vintage':
      return wine.vintage ? [String(wine.vintage)] : [];
    case 'rating':
      return wine.vivinoRating !== undefined ? [String(wine.vivinoRating)] : [];
    case 'price':
      return [getPriceBucket(wine.price)];
  }
}

// ── Facet aggregation (self-excluding) ──

export interface FacetOption {
  value: string;
  count: number;
}

export function aggregateFacetOptions(
  wines: Wine[],
  filters: FiltersState,
  key: FacetKey,
): FacetOption[] {
  const counts = new Map<string, number>();

  for (const wine of wines) {
    if (!matchesAllFacetsExcept(wine, filters, key)) continue;
    const values = extractFacetValue(wine, key);
    for (const v of values) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

// ── Active filter count ──

export function countActiveFilters(filters: FiltersState): number {
  let n = 0;
  if (filters.searchQuery) n++;
  if (filters.wineType.include.length) n += filters.wineType.include.length;
  if (filters.maturityStatus.include.length) n += filters.maturityStatus.include.length;
  if (filters.country.include.length) n += filters.country.include.length;
  if (filters.region.include.length) n += filters.region.include.length;
  if (filters.appellation.include.length) n += filters.appellation.include.length;
  if (filters.producer.include.length) n += filters.producer.include.length;
  if (filters.grapeVariety.include.length) n += filters.grapeVariety.include.length;
  if (filters.vintage.include.length) n += filters.vintage.include.length;
  if (filters.rating.min !== null) n++;
  if (filters.rating.max !== null) n++;
  if (filters.price.include.length) n += filters.price.include.length;
  return n;
}
