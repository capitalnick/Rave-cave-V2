import type { BuiltInCurrency } from '@/context/ProfileContext';

/** The five built-in currencies that ship with default rates */
export const BUILT_IN_CURRENCIES: BuiltInCurrency[] = ['AUD', 'USD', 'EUR', 'GBP', 'JPY'];

/**
 * Extended currency symbol map — covers 15+ common codes.
 * Built-in currencies use their familiar short symbols;
 * others use their standard ISO symbols or code prefix.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: 'A$',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  CAD: 'C$',
  NZD: 'NZ$',
  CHF: 'CHF ',
  JPY: '\u00A5',
  CNY: '\u00A5',
  HKD: 'HK$',
  SGD: 'S$',
  SEK: 'kr ',
  NOK: 'kr ',
  DKK: 'kr ',
  ZAR: 'R',
  BRL: 'R$',
  INR: '\u20B9',
  KRW: '\u20A9',
  THB: '\u0E3F',
  MXN: 'MX$',
};

/**
 * Get the display symbol for a currency code.
 * Unknown codes return the code itself as a prefix (e.g. "CHF ").
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

/**
 * Convert an amount from a source currency to the user's home currency.
 *
 * Rate convention: `rates[FROM]` = "1 FROM = X HOME"
 * (foreign-to-home multiplier). Home currency rate is implicitly 1.0.
 *
 * Defensive: returns the raw amount if source is missing, same as home,
 * or the rate is missing/invalid.
 */
export function convertToHome(
  amount: number,
  from: string | undefined,
  home: string,
  rates: Record<string, number>,
): number {
  if (!from || from === home) return amount;
  const rate = rates[from];
  if (!rate || rate <= 0) return amount; // safe fallback: treat as 1:1
  return amount * rate;
}
