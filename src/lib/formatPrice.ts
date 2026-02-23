import type { Currency } from '@/context/ProfileContext';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  AUD: 'A$',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
};

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}

export function formatPrice(amount: number, currency: Currency): string {
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(val) || val <= 0) return '';
  return `${CURRENCY_SYMBOLS[currency]}${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** Swap $ in a price bucket label (e.g. "Under $30") with the user's currency symbol */
export function formatPriceBucketLabel(bucket: string, currency: Currency): string {
  return bucket.replace(/\$/g, CURRENCY_SYMBOLS[currency]);
}
