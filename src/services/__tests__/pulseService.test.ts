import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeMaturityBreakdown,
  computeTopProducers,
  computeTypeDistribution,
  generateStoryCards,
  computeDrinkingWindows,
  computeTimelineRange,
  computePulseStats,
} from '../pulseService';
import type { Wine, MaturityBreakdown } from '@/types';

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
    grapeVarieties: [],
    region: 'Barossa',
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

describe('computeMaturityBreakdown', () => {
  it('counts bottles by maturity status', () => {
    const inventory = [
      makeWine({ quantity: 2, drinkFrom: 2020, drinkUntil: 2030 }), // Drink Now
      makeWine({ quantity: 3, drinkFrom: 2030, drinkUntil: 2040 }), // Hold (too young)
      makeWine({ quantity: 1, drinkFrom: 2015, drinkUntil: 2020 }), // Past Peak
    ];
    const result = computeMaturityBreakdown(inventory);
    expect(result.drinkNow).toBe(2);
    expect(result.hold).toBe(3);
    expect(result.pastPeak).toBe(1);
    expect(result.total).toBe(6);
  });

  it('returns zeros for empty inventory', () => {
    const result = computeMaturityBreakdown([]);
    expect(result).toEqual({ drinkNow: 0, hold: 0, pastPeak: 0, unknown: 0, total: 0 });
  });

  it('counts unknown maturity', () => {
    const result = computeMaturityBreakdown([
      makeWine({ quantity: 2, drinkFrom: 0, drinkUntil: 0 }),
    ]);
    expect(result.unknown).toBe(2);
  });
});

describe('computeTopProducers', () => {
  it('returns top 5 producers by bottle count', () => {
    const inventory = [
      makeWine({ producer: 'Penfolds', quantity: 5 }),
      makeWine({ producer: 'Henschke', quantity: 3 }),
      makeWine({ producer: 'Torbreck', quantity: 2 }),
      makeWine({ producer: 'Yalumba', quantity: 4 }),
      makeWine({ producer: 'Jim Barry', quantity: 1 }),
      makeWine({ producer: 'Cirillo', quantity: 6 }),
    ];
    const result = computeTopProducers(inventory);
    expect(result).toHaveLength(5);
    expect(result[0].name).toBe('Cirillo');
    expect(result[0].count).toBe(6);
  });

  it('aggregates multiple wines from same producer', () => {
    const inventory = [
      makeWine({ producer: 'Penfolds', quantity: 2, price: 100 }),
      makeWine({ producer: 'Penfolds', quantity: 3, price: 200 }),
    ];
    const result = computeTopProducers(inventory);
    expect(result[0].count).toBe(5);
    expect(result[0].totalValue).toBe(800); // (2*100) + (3*200)
  });

  it('skips wines with no producer', () => {
    const inventory = [makeWine({ producer: '' })];
    expect(computeTopProducers(inventory)).toEqual([]);
  });
});

describe('computeTypeDistribution', () => {
  it('counts bottles by wine type', () => {
    const inventory = [
      makeWine({ type: 'Red', quantity: 5 }),
      makeWine({ type: 'White', quantity: 3 }),
      makeWine({ type: 'Red', quantity: 2 }),
    ];
    const result = computeTypeDistribution(inventory);
    expect(result['Red']).toBe(7);
    expect(result['White']).toBe(3);
  });

  it('uses "Unknown" for wines with no type', () => {
    const inventory = [makeWine({ type: '' as any, quantity: 1 })];
    const result = computeTypeDistribution(inventory);
    expect(result['Unknown']).toBe(1);
  });
});

describe('generateStoryCards', () => {
  it('generates past-peak alert when bottles past peak', () => {
    const breakdown: MaturityBreakdown = { drinkNow: 5, hold: 3, pastPeak: 2, unknown: 0, total: 10 };
    const cards = generateStoryCards([], breakdown, null, { Red: 10 });
    expect(cards[0].type).toBe('past-peak-alert');
    expect(cards[0].headline).toContain('2 bottles');
  });

  it('uses singular when 1 bottle past peak', () => {
    const breakdown: MaturityBreakdown = { drinkNow: 5, hold: 3, pastPeak: 1, unknown: 0, total: 9 };
    const cards = generateStoryCards([], breakdown, null, { Red: 9 });
    expect(cards[0].headline).toContain('1 bottle');
    expect(cards[0].headline).not.toContain('bottles');
  });

  it('returns max 3 cards', () => {
    const breakdown: MaturityBreakdown = { drinkNow: 5, hold: 3, pastPeak: 2, unknown: 0, total: 10 };
    const mvWine = makeWine({ vintage: 2019, producer: 'Penfolds', price: 500 });
    const cards = generateStoryCards([], breakdown, mvWine, { Red: 5, White: 5 });
    expect(cards.length).toBeLessThanOrEqual(3);
  });

  it('includes ready-to-drink card', () => {
    const breakdown: MaturityBreakdown = { drinkNow: 5, hold: 0, pastPeak: 0, unknown: 0, total: 5 };
    const cards = generateStoryCards([], breakdown, null, { Red: 5 });
    expect(cards.some(c => c.type === 'ready-to-drink')).toBe(true);
  });
});

describe('computeDrinkingWindows', () => {
  it('filters out wines without valid drink windows', () => {
    const inventory = [
      makeWine({ drinkFrom: 2020, drinkUntil: 2030 }),
      makeWine({ drinkFrom: 0, drinkUntil: 0 }),
    ];
    const result = computeDrinkingWindows(inventory);
    expect(result).toHaveLength(1);
  });

  it('sorts by total value descending', () => {
    const inventory = [
      makeWine({ id: 'a', price: 50, quantity: 1, drinkFrom: 2020, drinkUntil: 2030 }),
      makeWine({ id: 'b', price: 200, quantity: 1, drinkFrom: 2020, drinkUntil: 2030 }),
    ];
    const result = computeDrinkingWindows(inventory);
    expect(result[0].wineId).toBe('b');
  });
});

describe('computeTimelineRange', () => {
  it('returns current year ± 10 for empty windows', () => {
    const result = computeTimelineRange([]);
    expect(result.min).toBe(MOCK_YEAR);
    expect(result.max).toBe(MOCK_YEAR + 10);
  });

  it('ensures current year is included', () => {
    const windows = [
      { wineId: 'w1', producer: 'P', name: 'N', vintage: 2019, type: 'Red' as const,
        drinkFrom: 2030, drinkUntil: 2040, maturity: 'Hold' as const, totalValue: 100, quantity: 1 },
    ];
    const result = computeTimelineRange(windows);
    expect(result.min).toBeLessThanOrEqual(MOCK_YEAR);
  });
});

describe('computePulseStats', () => {
  it('aggregates all pulse metrics', () => {
    const inventory = [
      makeWine({ quantity: 3, price: 100, type: 'Red' }),
      makeWine({ quantity: 2, price: 50, type: 'White', drinkFrom: 2030, drinkUntil: 2040 }),
    ];
    const stats = computePulseStats(inventory);
    expect(stats.totalBottles).toBe(5);
    expect(stats.totalValue).toBe(400); // 3*100 + 2*50
    expect(stats.averageBottleValue).toBe(80);
    expect(stats.typeDistribution['Red']).toBe(3);
    expect(stats.typeDistribution['White']).toBe(2);
    expect(stats.topProducers.length).toBeGreaterThan(0);
    expect(stats.storyCards.length).toBeGreaterThan(0);
  });

  it('handles empty inventory', () => {
    const stats = computePulseStats([]);
    expect(stats.totalBottles).toBe(0);
    expect(stats.totalValue).toBe(0);
    expect(stats.averageBottleValue).toBe(0);
    expect(stats.mostValuableWine).toBeNull();
  });

  it('finds most valuable wine by unit price', () => {
    const inventory = [
      makeWine({ id: 'cheap', price: 20 }),
      makeWine({ id: 'expensive', price: 500 }),
    ];
    const stats = computePulseStats(inventory);
    expect(stats.mostValuableWine?.id).toBe('expensive');
  });
});
