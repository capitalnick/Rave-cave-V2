import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  matchesAllFacets,
  countActiveFilters,
  aggregateFacetOptions,
  parseGrapes,
  getPriceBucket,
  EMPTY_FILTERS,
  type FiltersState,
} from '../faceted-filters';
import type { Wine } from '@/types';

// Mock date for maturity calculations
const MOCK_YEAR = 2026;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(MOCK_YEAR, 0, 1));
});
afterEach(() => {
  vi.useRealTimers();
});

function makeWine(overrides: Partial<Wine> = {}): Wine {
  return {
    id: 'w1',
    producer: 'Penfolds',
    name: 'Grange',
    vintage: 2019,
    type: 'Red',
    grapeVarieties: [{ name: 'Shiraz', pct: 100 }],
    region: 'Barossa Valley',
    country: 'Australia',
    quantity: 1,
    drinkFrom: 2020,
    drinkUntil: 2030,
    maturity: 'Drink Now',
    tastingNotes: '',
    price: 100,
    format: '750ml',
    ...overrides,
  };
}

describe('parseGrapes', () => {
  it('returns grape names', () => {
    expect(parseGrapes([{ name: 'Shiraz' }, { name: 'Grenache' }])).toEqual(['Shiraz', 'Grenache']);
  });

  it('filters out empty names', () => {
    expect(parseGrapes([{ name: '' }, { name: 'Merlot' }])).toEqual(['Merlot']);
  });

  it('returns empty for undefined', () => {
    expect(parseGrapes(undefined)).toEqual([]);
  });

  it('returns empty for empty array', () => {
    expect(parseGrapes([])).toEqual([]);
  });
});

describe('getPriceBucket', () => {
  it('returns Under $30 for low prices', () => {
    expect(getPriceBucket(15)).toBe('Under $30');
  });

  it('returns $30-$60 bucket', () => {
    expect(getPriceBucket(45)).toBe('$30-$60');
  });

  it('returns $60-$100 bucket', () => {
    expect(getPriceBucket(80)).toBe('$60-$100');
  });

  it('returns $100+ for expensive wines', () => {
    expect(getPriceBucket(500)).toBe('$100+');
  });

  it('returns Under $30 for zero price', () => {
    expect(getPriceBucket(0)).toBe('Under $30');
  });
});

describe('matchesAllFacets', () => {
  it('matches all wines with empty filters', () => {
    const wine = makeWine();
    expect(matchesAllFacets(wine, EMPTY_FILTERS)).toBe(true);
  });

  it('filters by wine type', () => {
    const wine = makeWine({ type: 'Red' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      wineType: { include: ['White'] },
    };
    expect(matchesAllFacets(wine, filters)).toBe(false);
  });

  it('matches when wine type is included', () => {
    const wine = makeWine({ type: 'Red' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      wineType: { include: ['Red'] },
    };
    expect(matchesAllFacets(wine, filters)).toBe(true);
  });

  it('filters by country', () => {
    const wine = makeWine({ country: 'Australia' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      country: { include: ['France'] },
    };
    expect(matchesAllFacets(wine, filters)).toBe(false);
  });

  it('filters by producer', () => {
    const wine = makeWine({ producer: 'Penfolds' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      producer: { include: ['Penfolds'] },
    };
    expect(matchesAllFacets(wine, filters)).toBe(true);
  });

  it('filters by grape variety', () => {
    const wine = makeWine({ grapeVarieties: [{ name: 'Shiraz' }] });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      grapeVariety: { include: ['Shiraz'] },
    };
    expect(matchesAllFacets(wine, filters)).toBe(true);
  });

  it('excludes when grape variety does not match', () => {
    const wine = makeWine({ grapeVarieties: [{ name: 'Shiraz' }] });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      grapeVariety: { include: ['Chardonnay'] },
    };
    expect(matchesAllFacets(wine, filters)).toBe(false);
  });

  it('filters by vintage', () => {
    const wine = makeWine({ vintage: 2019 });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      vintage: { include: ['2019'] },
    };
    expect(matchesAllFacets(wine, filters)).toBe(true);
  });

  it('filters by search query (producer)', () => {
    const wine = makeWine({ producer: 'Penfolds' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      searchQuery: 'penfolds',
    };
    expect(matchesAllFacets(wine, filters)).toBe(true);
  });

  it('filters by search query (no match)', () => {
    const wine = makeWine({ producer: 'Penfolds' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      searchQuery: 'henschke',
    };
    expect(matchesAllFacets(wine, filters)).toBe(false);
  });

  it('filters by price bucket', () => {
    const wine = makeWine({ price: 50 });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      price: { include: ['$30-$60'] },
    };
    expect(matchesAllFacets(wine, filters)).toBe(true);
  });

  it('requires all facets to match (AND logic)', () => {
    const wine = makeWine({ type: 'Red', country: 'Australia' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      wineType: { include: ['Red'] },
      country: { include: ['France'] },
    };
    expect(matchesAllFacets(wine, filters)).toBe(false);
  });

  it('matches case-insensitively', () => {
    const wine = makeWine({ producer: 'Penfolds' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      producer: { include: ['penfolds'] },
    };
    expect(matchesAllFacets(wine, filters)).toBe(true);
  });
});

describe('countActiveFilters', () => {
  it('returns 0 for empty filters', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });

  it('counts search query as 1', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, searchQuery: 'test' })).toBe(1);
  });

  it('counts each selected value', () => {
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      wineType: { include: ['Red', 'White'] },
      country: { include: ['Australia'] },
    };
    expect(countActiveFilters(filters)).toBe(3);
  });

  it('counts rating min and max separately', () => {
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      rating: { min: 90, max: 100 },
    };
    expect(countActiveFilters(filters)).toBe(2);
  });
});

describe('aggregateFacetOptions', () => {
  it('returns facet counts for wine type', () => {
    const wines = [
      makeWine({ type: 'Red' }),
      makeWine({ type: 'Red' }),
      makeWine({ type: 'White' }),
    ];
    const options = aggregateFacetOptions(wines, EMPTY_FILTERS, 'wineType');
    expect(options).toEqual(
      expect.arrayContaining([
        { value: 'Red', count: 2 },
        { value: 'White', count: 1 },
      ]),
    );
  });

  it('sorts by count descending', () => {
    const wines = [
      makeWine({ type: 'White' }),
      makeWine({ type: 'Red' }),
      makeWine({ type: 'Red' }),
    ];
    const options = aggregateFacetOptions(wines, EMPTY_FILTERS, 'wineType');
    expect(options[0].value).toBe('Red');
    expect(options[0].count).toBe(2);
  });

  it('self-excludes the target facet (shows options for other wines)', () => {
    const wines = [
      makeWine({ type: 'Red', country: 'Australia' }),
      makeWine({ type: 'White', country: 'France' }),
    ];
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      wineType: { include: ['Red'] },
    };
    // Aggregating wineType should self-exclude, showing both options
    const options = aggregateFacetOptions(wines, filters, 'wineType');
    expect(options).toHaveLength(2);
  });
});
