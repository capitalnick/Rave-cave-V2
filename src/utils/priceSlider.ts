/**
 * Non-linear price ↔ slider-position mapping.
 *
 * Positions 0–20  → $0–$100 in $5 steps  (21 ticks)
 * Positions 21–24 → $125–$200 in $25 steps (4 ticks)
 *
 * Total: 25 positions (0–24)
 */

export const POSITION_COUNT = 25; // 0 … 24
export const MAX_POSITION = POSITION_COUNT - 1; // 24
export const ABSOLUTE_MAX_PRICE = 200;

/** Convert a slider position (0–24) to a dollar price. */
export function positionToPrice(position: number): number {
  const p = Math.round(Math.min(MAX_POSITION, Math.max(0, position)));
  if (p <= 20) return p * 5;          // 0→$0, 20→$100
  return 100 + (p - 20) * 25;         // 21→$125, 24→$200
}

/** Convert a dollar price to the nearest slider position (0–24). */
export function priceToPosition(price: number): number {
  const clamped = Math.max(0, Math.min(ABSOLUTE_MAX_PRICE, price));
  if (clamped <= 100) return Math.round(clamped / 5);
  return 20 + Math.round((clamped - 100) / 25);
}
