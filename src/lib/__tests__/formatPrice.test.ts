import { describe, it, expect } from 'vitest';
import { getCurrencySymbol, formatPrice, formatPriceBucketLabel } from '../formatPrice';

describe('getCurrencySymbol', () => {
  it('returns A$ for AUD', () => expect(getCurrencySymbol('AUD')).toBe('A$'));
  it('returns $ for USD', () => expect(getCurrencySymbol('USD')).toBe('$'));
  it('returns € for EUR', () => expect(getCurrencySymbol('EUR')).toBe('€'));
  it('returns £ for GBP', () => expect(getCurrencySymbol('GBP')).toBe('£'));
});

describe('formatPrice', () => {
  it('formats price with currency symbol', () => {
    expect(formatPrice(100, 'AUD')).toBe('A$100');
  });

  it('formats with commas for large values', () => {
    const result = formatPrice(1500, 'USD');
    expect(result).toContain('$');
    expect(result).toContain('1');
    expect(result).toContain('500');
  });

  it('returns empty string for 0', () => {
    expect(formatPrice(0, 'AUD')).toBe('');
  });

  it('returns empty string for negative price', () => {
    expect(formatPrice(-10, 'AUD')).toBe('');
  });

  it('returns empty string for NaN', () => {
    expect(formatPrice(NaN, 'AUD')).toBe('');
  });

  it('handles string amount (coercion)', () => {
    expect(formatPrice('50' as any, 'GBP')).toBe('£50');
  });

  it('uses EUR symbol', () => {
    expect(formatPrice(75, 'EUR')).toBe('€75');
  });
});

describe('formatPriceBucketLabel', () => {
  it('replaces $ with currency symbol', () => {
    expect(formatPriceBucketLabel('Under $30', 'EUR')).toBe('Under €30');
  });

  it('replaces multiple $ symbols', () => {
    expect(formatPriceBucketLabel('$30-$60', 'GBP')).toBe('£30-£60');
  });

  it('passes through labels without $', () => {
    expect(formatPriceBucketLabel('No price', 'AUD')).toBe('No price');
  });
});
