import { getCurrencySymbol } from '@/lib/currencyConversion';

// Re-export for backward compatibility
export { getCurrencySymbol };

export function formatPrice(amount: number, currency: string): string {
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(val) || val <= 0) return '';
  return `${getCurrencySymbol(currency)}${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** Swap $ in a price bucket label (e.g. "Under $30") with the user's currency symbol */
export function formatPriceBucketLabel(bucket: string, currency: string): string {
  return bucket.replace(/\$/g, getCurrencySymbol(currency));
}
