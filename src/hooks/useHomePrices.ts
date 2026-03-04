import { useMemo } from 'react';
import type { Wine } from '@/types';
import { useProfile } from '@/context/ProfileContext';
import { convertToHome } from '@/lib/currencyConversion';

/**
 * Returns a Map<wineId, homePrice> — each wine's price converted to the
 * user's home currency using manual conversion rates.
 *
 * Components opt in where needed — avoids bloating InventoryContext.
 */
export function useHomePrices(inventory: Wine[]): Map<string, number> {
  const { profile } = useProfile();
  const { currency: home, conversionRates: rates } = profile;

  return useMemo(() => {
    const map = new Map<string, number>();
    for (const w of inventory) {
      const raw = Number(w.price) || 0;
      map.set(w.id, convertToHome(raw, w.priceCurrency, home, rates));
    }
    return map;
  }, [inventory, home, rates]);
}
