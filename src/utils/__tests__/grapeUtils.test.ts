import { describe, it, expect } from 'vitest';
import {
  formatGrapeDisplay,
  formatGrapeDetailed,
  grapePercentTotal,
  migrateLegacyFields,
  cepageStringToVarieties,
} from '../grapeUtils';

describe('formatGrapeDisplay', () => {
  it('returns comma-separated names', () => {
    expect(
      formatGrapeDisplay([
        { name: 'Shiraz', pct: 60 },
        { name: 'Grenache', pct: 40 },
      ]),
    ).toBe('Shiraz, Grenache');
  });

  it('returns empty string for empty array', () => {
    expect(formatGrapeDisplay([])).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatGrapeDisplay(null as any)).toBe('');
    expect(formatGrapeDisplay(undefined as any)).toBe('');
  });

  it('filters out entries with empty names', () => {
    expect(
      formatGrapeDisplay([{ name: 'Shiraz' }, { name: '' }, { name: 'Merlot' }]),
    ).toBe('Shiraz, Merlot');
  });

  it('handles single variety', () => {
    expect(formatGrapeDisplay([{ name: 'Cabernet Sauvignon' }])).toBe('Cabernet Sauvignon');
  });
});

describe('formatGrapeDetailed', () => {
  it('includes percentages where present', () => {
    expect(
      formatGrapeDetailed([
        { name: 'Shiraz', pct: 60 },
        { name: 'Grenache', pct: 40 },
      ]),
    ).toBe('Shiraz 60%, Grenache 40%');
  });

  it('omits percentage when null', () => {
    expect(
      formatGrapeDetailed([
        { name: 'Shiraz', pct: 60 },
        { name: 'Grenache', pct: null },
      ]),
    ).toBe('Shiraz 60%, Grenache');
  });

  it('omits percentage when undefined', () => {
    expect(formatGrapeDetailed([{ name: 'Riesling' }])).toBe('Riesling');
  });

  it('returns empty string for empty array', () => {
    expect(formatGrapeDetailed([])).toBe('');
  });
});

describe('grapePercentTotal', () => {
  it('sums all percentages', () => {
    expect(
      grapePercentTotal([
        { name: 'Shiraz', pct: 60 },
        { name: 'Grenache', pct: 40 },
      ]),
    ).toBe(100);
  });

  it('returns null when no varieties have percentages', () => {
    expect(grapePercentTotal([{ name: 'Shiraz' }, { name: 'Merlot' }])).toBeNull();
  });

  it('only sums entries that have pct', () => {
    expect(
      grapePercentTotal([
        { name: 'Shiraz', pct: 60 },
        { name: 'Grenache', pct: null },
      ]),
    ).toBe(60);
  });

  it('returns null for empty array', () => {
    expect(grapePercentTotal([])).toBeNull();
  });
});

describe('migrateLegacyFields', () => {
  it('parses slash-separated cepage with percentages', () => {
    expect(migrateLegacyFields('Shiraz/Grenache', '60/40')).toEqual([
      { name: 'Shiraz', pct: 60 },
      { name: 'Grenache', pct: 40 },
    ]);
  });

  it('parses comma-separated cepage', () => {
    expect(migrateLegacyFields('Shiraz, Merlot', null)).toEqual([
      { name: 'Shiraz', pct: null },
      { name: 'Merlot', pct: null },
    ]);
  });

  it('handles more names than percentages', () => {
    expect(migrateLegacyFields('Shiraz/Grenache/Mourvèdre', '60/30')).toEqual([
      { name: 'Shiraz', pct: 60 },
      { name: 'Grenache', pct: 30 },
      { name: 'Mourvèdre', pct: null },
    ]);
  });

  it('returns empty for null cepage', () => {
    expect(migrateLegacyFields(null, null)).toEqual([]);
  });

  it('returns empty for empty string cepage', () => {
    expect(migrateLegacyFields('', '60')).toEqual([]);
  });

  it('returns empty for whitespace-only cepage', () => {
    expect(migrateLegacyFields('   ', null)).toEqual([]);
  });

  it('filters out invalid percentages (surviving valid ones shift left)', () => {
    // 'abc' is filtered from pcts → [40], so pcts[0]=40 maps to Shiraz, pcts[1]=undefined maps to null
    expect(migrateLegacyFields('Shiraz/Merlot', 'abc/40')).toEqual([
      { name: 'Shiraz', pct: 40 },
      { name: 'Merlot', pct: null },
    ]);
  });
});

describe('cepageStringToVarieties', () => {
  it('splits on slash', () => {
    expect(cepageStringToVarieties('Shiraz/Grenache')).toEqual([
      { name: 'Shiraz', pct: null },
      { name: 'Grenache', pct: null },
    ]);
  });

  it('splits on comma', () => {
    expect(cepageStringToVarieties('Shiraz, Merlot')).toEqual([
      { name: 'Shiraz', pct: null },
      { name: 'Merlot', pct: null },
    ]);
  });

  it('splits on ampersand', () => {
    expect(cepageStringToVarieties('Cabernet & Merlot')).toEqual([
      { name: 'Cabernet', pct: null },
      { name: 'Merlot', pct: null },
    ]);
  });

  it('splits on "and"', () => {
    expect(cepageStringToVarieties('Shiraz and Grenache')).toEqual([
      { name: 'Shiraz', pct: null },
      { name: 'Grenache', pct: null },
    ]);
  });

  it('returns empty for null', () => {
    expect(cepageStringToVarieties(null)).toEqual([]);
  });

  it('returns empty for empty string', () => {
    expect(cepageStringToVarieties('')).toEqual([]);
  });

  it('handles single variety', () => {
    expect(cepageStringToVarieties('Riesling')).toEqual([
      { name: 'Riesling', pct: null },
    ]);
  });
});
