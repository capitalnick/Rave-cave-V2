import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeMaturityCode,
  getMaturityLabel,
  getMaturityKebab,
  getMaturityEmoji,
  getMaturityRank,
  getMaturityForWine,
} from '../maturityUtils';

// Mock current year to 2026 for deterministic tests
const MOCK_YEAR = 2026;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(MOCK_YEAR, 0, 1));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('computeMaturityCode', () => {
  it('returns UNKNOWN when both null', () => {
    expect(computeMaturityCode(null, null)).toBe('UNKNOWN');
  });

  it('returns UNKNOWN when both undefined', () => {
    expect(computeMaturityCode(undefined, undefined)).toBe('UNKNOWN');
  });

  it('returns UNKNOWN when both 0', () => {
    expect(computeMaturityCode(0, 0)).toBe('UNKNOWN');
  });

  it('returns DRINK_NOW when only drinkUntil set and not past', () => {
    expect(computeMaturityCode(null, 2030)).toBe('DRINK_NOW');
  });

  it('returns PAST_PEAK when only drinkUntil set and past', () => {
    expect(computeMaturityCode(null, 2020)).toBe('PAST_PEAK');
  });

  it('returns TOO_YOUNG when only drinkFrom set and before it', () => {
    expect(computeMaturityCode(2030, null)).toBe('TOO_YOUNG');
  });

  it('returns DRINK_NOW when only drinkFrom set and past it', () => {
    expect(computeMaturityCode(2020, null)).toBe('DRINK_NOW');
  });

  it('returns TOO_YOUNG when before window', () => {
    expect(computeMaturityCode(2028, 2035)).toBe('TOO_YOUNG');
  });

  it('returns PAST_PEAK when after window', () => {
    expect(computeMaturityCode(2015, 2020)).toBe('PAST_PEAK');
  });

  it('returns HOLD in first third of window', () => {
    // Window 2025-2034 (10 years), first third = 2025-2028.33
    // Current year 2026 is in first third
    expect(computeMaturityCode(2025, 2034)).toBe('HOLD');
  });

  it('returns DRINK_NOW in latter portion of window', () => {
    // Window 2020-2030 (10 years), first third = 2020-2023.33
    // Current year 2026 is past first third
    expect(computeMaturityCode(2020, 2030)).toBe('DRINK_NOW');
  });

  it('handles string inputs', () => {
    expect(computeMaturityCode('2020', '2030')).toBe('DRINK_NOW');
  });

  it('handles NaN strings as unknown', () => {
    expect(computeMaturityCode('abc', 'def')).toBe('UNKNOWN');
  });
});

describe('getMaturityLabel', () => {
  it('returns human-readable labels', () => {
    expect(getMaturityLabel(2020, 2030)).toBe('Drink Now');
    expect(getMaturityLabel(2030, 2035)).toBe('Hold'); // TOO_YOUNG → Hold
    expect(getMaturityLabel(2015, 2020)).toBe('Past Peak');
    expect(getMaturityLabel(null, null)).toBe('Unknown');
  });
});

describe('getMaturityKebab', () => {
  it('returns kebab-case for RC UI Set', () => {
    expect(getMaturityKebab(2020, 2030)).toBe('drink-now');
    expect(getMaturityKebab(2030, 2035)).toBe('hold');
    expect(getMaturityKebab(2015, 2020)).toBe('past-peak');
    expect(getMaturityKebab(null, null)).toBe('hold');
  });
});

describe('getMaturityEmoji', () => {
  it('returns emoji-prefixed strings', () => {
    expect(getMaturityEmoji(2020, 2030)).toBe('🍷 Drink Now');
    expect(getMaturityEmoji(2030, 2035)).toBe('🟢 Hold');
    expect(getMaturityEmoji(2015, 2020)).toBe('⚠️ Past Peak');
    expect(getMaturityEmoji(null, null)).toBe('Unknown');
  });
});

describe('getMaturityRank', () => {
  it('sorts Past Peak first (0), then Drink Now (1), Hold (2), Unknown (3)', () => {
    expect(getMaturityRank(2015, 2020)).toBe(0); // Past Peak
    expect(getMaturityRank(2020, 2030)).toBe(1); // Drink Now
    expect(getMaturityRank(2030, 2035)).toBe(2); // Too Young → Hold rank
    expect(getMaturityRank(null, null)).toBe(3);  // Unknown
  });
});

describe('getMaturityForWine', () => {
  it('returns Wine-compatible maturity values', () => {
    expect(getMaturityForWine(2020, 2030)).toBe('Drink Now');
    expect(getMaturityForWine(2030, 2035)).toBe('Hold');
    expect(getMaturityForWine(2015, 2020)).toBe('Past Peak');
    expect(getMaturityForWine(null, null)).toBe('Hold'); // Unknown maps to Hold
  });
});
