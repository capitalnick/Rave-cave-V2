import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  matchesAllFacets,
  getPriceBucket,
  EMPTY_FILTERS,
  type FiltersState,
  type PriceContext,
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
    producer: 'Domaine Leflaive',
    name: 'Puligny-Montrachet',
    vintage: 2020,
    type: 'White',
    grapeVarieties: [{ name: 'Chardonnay', pct: 100 }],
    region: 'Burgundy',
    country: 'France',
    quantity: 2,
    drinkFrom: 2022,
    drinkUntil: 2032,
    maturity: 'Drink Now',
    tastingNotes: 'Elegant minerality',
    price: 80,
    format: '750ml',
    ...overrides,
  };
}

describe('getPriceBucket', () => {
  it('returns Under $30 for price 0', () => {
    expect(getPriceBucket(0)).toBe('Under $30');
  });

  it('returns Under $30 for price 29.99', () => {
    expect(getPriceBucket(29.99)).toBe('Under $30');
  });

  it('returns $30-$60 for price 30', () => {
    expect(getPriceBucket(30)).toBe('$30-$60');
  });

  it('returns $30-$60 for price 59.99', () => {
    expect(getPriceBucket(59.99)).toBe('$30-$60');
  });

  it('returns $60-$100 for price 60', () => {
    expect(getPriceBucket(60)).toBe('$60-$100');
  });

  it('returns $60-$100 for price 99.99', () => {
    expect(getPriceBucket(99.99)).toBe('$60-$100');
  });

  it('returns $100+ for price 100', () => {
    expect(getPriceBucket(100)).toBe('$100+');
  });

  it('returns $100+ for price 5000', () => {
    expect(getPriceBucket(5000)).toBe('$100+');
  });

  it('returns Under $30 for negative price', () => {
    expect(getPriceBucket(-10)).toBe('Under $30');
  });
});

describe('matchesAllFacets with price conversion (priceCtx)', () => {
  const priceCtx: PriceContext = {
    homeCurrency: 'AUD',
    rates: {
      EUR: 1.68,
      GBP: 1.92,
      USD: 1.53,
    },
  };

  it('uses home-converted price when priceCtx is provided', () => {
    // Wine priced at 50 EUR; converted: 50 * 1.68 = 84 AUD => bucket "$60-$100"
    const wine = makeWine({ price: 50, priceCurrency: 'EUR' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      price: { include: ['$60-$100'] },
    };
    expect(matchesAllFacets(wine, filters, priceCtx)).toBe(true);
  });

  it('rejects wine when converted price does not match bucket', () => {
    // Wine priced at 50 EUR; converted: 50 * 1.68 = 84 AUD => bucket "$60-$100"
    const wine = makeWine({ price: 50, priceCurrency: 'EUR' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      price: { include: ['Under $30'] },
    };
    expect(matchesAllFacets(wine, filters, priceCtx)).toBe(false);
  });

  it('uses raw price when no priceCtx is provided', () => {
    // Wine at 50 with no conversion => bucket "$30-$60"
    const wine = makeWine({ price: 50, priceCurrency: 'EUR' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      price: { include: ['$30-$60'] },
    };
    expect(matchesAllFacets(wine, filters)).toBe(true);
  });

  it('uses raw price when priceCurrency is undefined (domestic wine)', () => {
    // Wine at 45 AUD, no priceCurrency => raw price used => bucket "$30-$60"
    const wine = makeWine({ price: 45, priceCurrency: undefined });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      price: { include: ['$30-$60'] },
    };
    expect(matchesAllFacets(wine, filters, priceCtx)).toBe(true);
  });

  it('uses raw price when priceCurrency matches home currency', () => {
    // Wine at 45 AUD, same as home => returns 45 directly => bucket "$30-$60"
    const wine = makeWine({ price: 45, priceCurrency: 'AUD' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      price: { include: ['$30-$60'] },
    };
    expect(matchesAllFacets(wine, filters, priceCtx)).toBe(true);
  });

  it('falls back to raw price when rate is missing for currency', () => {
    // Wine priced at 25 CHF; CHF not in rates => fallback 1:1 => 25 => "Under $30"
    const wine = makeWine({ price: 25, priceCurrency: 'CHF' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      price: { include: ['Under $30'] },
    };
    expect(matchesAllFacets(wine, filters, priceCtx)).toBe(true);
  });

  it('converts GBP wine into correct bucket', () => {
    // Wine at 60 GBP; converted: 60 * 1.92 = 115.2 AUD => bucket "$100+"
    const wine = makeWine({ price: 60, priceCurrency: 'GBP' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      price: { include: ['$100+'] },
    };
    expect(matchesAllFacets(wine, filters, priceCtx)).toBe(true);
  });

  it('converts USD wine into correct bucket', () => {
    // Wine at 35 USD; converted: 35 * 1.53 = 53.55 AUD => bucket "$30-$60"
    const wine = makeWine({ price: 35, priceCurrency: 'USD' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      price: { include: ['$30-$60'] },
    };
    expect(matchesAllFacets(wine, filters, priceCtx)).toBe(true);
  });

  it('handles zero-priced wine with conversion context', () => {
    const wine = makeWine({ price: 0, priceCurrency: 'EUR' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      price: { include: ['Under $30'] },
    };
    expect(matchesAllFacets(wine, filters, priceCtx)).toBe(true);
  });

  it('empty price filter matches all wines regardless of currency', () => {
    const eurWine = makeWine({ id: 'w1', price: 200, priceCurrency: 'EUR' });
    const gbpWine = makeWine({ id: 'w2', price: 15, priceCurrency: 'GBP' });
    const audWine = makeWine({ id: 'w3', price: 50 });

    expect(matchesAllFacets(eurWine, EMPTY_FILTERS, priceCtx)).toBe(true);
    expect(matchesAllFacets(gbpWine, EMPTY_FILTERS, priceCtx)).toBe(true);
    expect(matchesAllFacets(audWine, EMPTY_FILTERS, priceCtx)).toBe(true);
  });

  it('combines price filter with other facets', () => {
    // Wine: 50 EUR => 84 AUD => "$60-$100", type Red
    const wine = makeWine({ price: 50, priceCurrency: 'EUR', type: 'Red' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      wineType: { include: ['Red'] },
      price: { include: ['$60-$100'] },
    };
    expect(matchesAllFacets(wine, filters, priceCtx)).toBe(true);
  });

  it('rejects when price matches but other facet does not', () => {
    // Wine: 50 EUR => 84 AUD => "$60-$100", but type is White not Red
    const wine = makeWine({ price: 50, priceCurrency: 'EUR', type: 'White' });
    const filters: FiltersState = {
      ...EMPTY_FILTERS,
      wineType: { include: ['Red'] },
      price: { include: ['$60-$100'] },
    };
    expect(matchesAllFacets(wine, filters, priceCtx)).toBe(false);
  });
});
