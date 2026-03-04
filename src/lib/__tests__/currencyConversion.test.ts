import { describe, it, expect } from 'vitest';
import { convertToHome, getCurrencySymbol } from '../currencyConversion';

describe('convertToHome', () => {
  const rates: Record<string, number> = {
    EUR: 1.68,
    GBP: 1.92,
    USD: 1.53,
  };

  it('returns amount unchanged when from equals home currency', () => {
    expect(convertToHome(100, 'AUD', 'AUD', rates)).toBe(100);
  });

  it('returns amount unchanged when from is undefined', () => {
    expect(convertToHome(100, undefined, 'AUD', rates)).toBe(100);
  });

  it('returns amount unchanged when from is empty string', () => {
    expect(convertToHome(100, '', 'AUD', rates)).toBe(100);
  });

  it('returns amount unchanged when rate is missing (1:1 fallback)', () => {
    expect(convertToHome(100, 'CHF', 'AUD', rates)).toBe(100);
  });

  it('returns amount unchanged when rate is zero', () => {
    const ratesWithZero: Record<string, number> = { ...rates, CHF: 0 };
    expect(convertToHome(100, 'CHF', 'AUD', ratesWithZero)).toBe(100);
  });

  it('returns amount unchanged when rate is negative', () => {
    const ratesWithNeg: Record<string, number> = { ...rates, CHF: -0.5 };
    expect(convertToHome(100, 'CHF', 'AUD', ratesWithNeg)).toBe(100);
  });

  it('converts EUR to AUD using rate', () => {
    // 100 EUR * 1.68 = 168 AUD
    expect(convertToHome(100, 'EUR', 'AUD', rates)).toBe(168);
  });

  it('converts GBP to AUD using rate', () => {
    // 50 GBP * 1.92 = 96 AUD
    expect(convertToHome(50, 'GBP', 'AUD', rates)).toBe(96);
  });

  it('converts USD to AUD using rate', () => {
    // 200 USD * 1.53 = 306 AUD
    expect(convertToHome(200, 'USD', 'AUD', rates)).toBe(306);
  });

  it('home currency is implicitly 1.0 (not in rates)', () => {
    // When from === home, the function short-circuits, so no rate lookup needed
    expect(convertToHome(75, 'AUD', 'AUD', {})).toBe(75);
  });

  it('handles zero amount', () => {
    expect(convertToHome(0, 'EUR', 'AUD', rates)).toBe(0);
  });

  it('handles fractional amounts', () => {
    // 10.5 EUR * 1.68 = 17.64 AUD
    expect(convertToHome(10.5, 'EUR', 'AUD', rates)).toBeCloseTo(17.64);
  });
});

describe('getCurrencySymbol', () => {
  it('returns A$ for AUD', () => {
    expect(getCurrencySymbol('AUD')).toBe('A$');
  });

  it('returns euro sign for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('\u20AC');
  });

  it('returns pound sign for GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('\u00A3');
  });

  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns C$ for CAD', () => {
    expect(getCurrencySymbol('CAD')).toBe('C$');
  });

  it('returns NZ$ for NZD', () => {
    expect(getCurrencySymbol('NZD')).toBe('NZ$');
  });

  it('returns CHF with trailing space for CHF', () => {
    expect(getCurrencySymbol('CHF')).toBe('CHF ');
  });

  it('returns yen sign for JPY', () => {
    expect(getCurrencySymbol('JPY')).toBe('\u00A5');
  });

  it('returns rupee sign for INR', () => {
    expect(getCurrencySymbol('INR')).toBe('\u20B9');
  });

  it('returns won sign for KRW', () => {
    expect(getCurrencySymbol('KRW')).toBe('\u20A9');
  });

  it('returns HK$ for HKD', () => {
    expect(getCurrencySymbol('HKD')).toBe('HK$');
  });

  it('returns S$ for SGD', () => {
    expect(getCurrencySymbol('SGD')).toBe('S$');
  });

  it('returns R$ for BRL', () => {
    expect(getCurrencySymbol('BRL')).toBe('R$');
  });

  it('returns code + space for unknown currency', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ ');
  });

  it('returns code + space for another unknown currency', () => {
    expect(getCurrencySymbol('PLN')).toBe('PLN ');
  });
});
