import { describe, it, expect } from 'vitest';
import { findDuplicates } from '../duplicateService';
import type { Wine } from '@/types';

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
    drinkFrom: 2025,
    drinkUntil: 2040,
    maturity: 'Hold',
    tastingNotes: '',
    price: 850,
    format: '750ml',
    ...overrides,
  };
}

describe('findDuplicates', () => {
  it('finds exact match above threshold', () => {
    const inventory = [makeWine()];
    const draft: Partial<Wine> = {
      producer: 'Penfolds',
      name: 'Grange',
      vintage: 2019,
      grapeVarieties: [{ name: 'Shiraz' }],
      region: 'Barossa Valley',
    };
    const results = findDuplicates(draft, inventory);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].similarityScore).toBeGreaterThanOrEqual(0.6);
  });

  it('skips wines with different vintages', () => {
    const inventory = [makeWine({ vintage: 2019 })];
    const draft: Partial<Wine> = {
      producer: 'Penfolds',
      name: 'Grange',
      vintage: 2020,
    };
    const results = findDuplicates(draft, inventory);
    expect(results).toHaveLength(0);
  });

  it('returns empty for empty inventory', () => {
    const draft: Partial<Wine> = { producer: 'Penfolds', vintage: 2019 };
    expect(findDuplicates(draft, [])).toEqual([]);
  });

  it('limits results to 3 candidates', () => {
    const inventory = Array.from({ length: 10 }, (_, i) =>
      makeWine({ id: `w${i}` }),
    );
    const draft: Partial<Wine> = {
      producer: 'Penfolds',
      name: 'Grange',
      vintage: 2019,
      grapeVarieties: [{ name: 'Shiraz' }],
    };
    const results = findDuplicates(draft, inventory);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('sorts candidates by similarity score descending', () => {
    const inventory = [
      makeWine({ id: 'w1', producer: 'Penfolds', name: 'Grange' }),
      makeWine({ id: 'w2', producer: 'Penfold', name: 'Grange' }), // slight typo
    ];
    const draft: Partial<Wine> = {
      producer: 'Penfolds',
      name: 'Grange',
      vintage: 2019,
      grapeVarieties: [{ name: 'Shiraz' }],
    };
    const results = findDuplicates(draft, inventory);
    if (results.length > 1) {
      expect(results[0].similarityScore).toBeGreaterThanOrEqual(results[1].similarityScore);
    }
  });

  it('does not match completely different wines', () => {
    const inventory = [
      makeWine({
        id: 'w1',
        producer: 'Henschke',
        name: 'Hill of Grace',
        vintage: 2018,
        grapeVarieties: [{ name: 'Shiraz' }],
        region: 'Eden Valley',
      }),
    ];
    const draft: Partial<Wine> = {
      producer: 'Leeuwin Estate',
      name: 'Art Series',
      vintage: 2020,
      grapeVarieties: [{ name: 'Chardonnay' }],
      region: 'Margaret River',
    };
    expect(findDuplicates(draft, inventory)).toHaveLength(0);
  });

  it('includes matched fields in results', () => {
    const inventory = [makeWine()];
    const draft: Partial<Wine> = {
      producer: 'Penfolds',
      name: 'Grange',
      vintage: 2019,
    };
    const results = findDuplicates(draft, inventory);
    expect(results[0].matchedFields).toContain('producer');
    expect(results[0].matchedFields).toContain('vintage');
  });

  it('handles fuzzy producer match (close spelling)', () => {
    // "Penfold" vs "Penfolds" — Levenshtein 1/8 = 0.875 similarity, well above 0.6 threshold
    const inventory = [makeWine({ producer: 'Penfold' })];
    const draft: Partial<Wine> = {
      producer: 'Penfolds',
      name: 'Grange',
      vintage: 2019,
    };
    const results = findDuplicates(draft, inventory);
    expect(results.length).toBeGreaterThan(0);
  });
});
