import type { Wine } from '@/types';

// ── Internal computation enum ──

export type MaturityCode = 'TOO_YOUNG' | 'DRINK_NOW' | 'HOLD' | 'PAST_PEAK' | 'UNKNOWN';

/**
 * Core maturity computation — single source of truth.
 *
 * - Both null/invalid → UNKNOWN
 * - Only drinkUntil set → past it: PAST_PEAK, otherwise: DRINK_NOW
 * - Only drinkFrom set → before it: TOO_YOUNG, otherwise: DRINK_NOW
 * - Both set → before window: TOO_YOUNG, after: PAST_PEAK,
 *              first third of window: HOLD, rest: DRINK_NOW
 */
export function computeMaturityCode(
  drinkFrom: number | string | null | undefined,
  drinkUntil: number | string | null | undefined,
): MaturityCode {
  const year = new Date().getFullYear();
  const from = Number(drinkFrom);
  const to = Number(drinkUntil);
  const hasFrom = !isNaN(from) && from > 0;
  const hasTo = !isNaN(to) && to > 0;

  if (!hasFrom && !hasTo) return 'UNKNOWN';
  if (!hasFrom) return year > to ? 'PAST_PEAK' : 'DRINK_NOW';
  if (!hasTo) return year < from ? 'TOO_YOUNG' : 'DRINK_NOW';

  // Both set
  if (year < from) return 'TOO_YOUNG';
  if (year > to) return 'PAST_PEAK';
  const windowSize = to - from;
  if (windowSize > 0 && (year - from) < windowSize / 3) return 'HOLD';
  return 'DRINK_NOW';
}

// ── Format variants ──

const LABEL_MAP: Record<MaturityCode, string> = {
  TOO_YOUNG: 'Hold',
  DRINK_NOW: 'Drink Now',
  HOLD: 'Hold',
  PAST_PEAK: 'Past Peak',
  UNKNOWN: 'Unknown',
};

/** Human-readable label: 'Drink Now', 'Hold', 'Past Peak', 'Unknown' */
export function getMaturityLabel(
  drinkFrom: number | string | null | undefined,
  drinkUntil: number | string | null | undefined,
): string {
  return LABEL_MAP[computeMaturityCode(drinkFrom, drinkUntil)];
}

/** Typed for Wine['maturity'] — returns 'Unknown' cast to match. */
export function getMaturityForWine(
  drinkFrom: number | string | null | undefined,
  drinkUntil: number | string | null | undefined,
): Wine['maturity'] {
  const code = computeMaturityCode(drinkFrom, drinkUntil);
  if (code === 'PAST_PEAK') return 'Past Peak';
  if (code === 'DRINK_NOW') return 'Drink Now';
  return 'Hold';
}

const KEBAB_MAP: Record<MaturityCode, string> = {
  TOO_YOUNG: 'hold',
  DRINK_NOW: 'drink-now',
  HOLD: 'hold',
  PAST_PEAK: 'past-peak',
  UNKNOWN: 'hold',
};

/** Kebab-case for RC UI Set: 'drink-now', 'hold', 'past-peak' */
export function getMaturityKebab(
  drinkFrom: number | string | null | undefined,
  drinkUntil: number | string | null | undefined,
): string {
  return KEBAB_MAP[computeMaturityCode(drinkFrom, drinkUntil)];
}

const EMOJI_MAP: Record<MaturityCode, string> = {
  TOO_YOUNG: '🟢 Hold',
  DRINK_NOW: '🍷 Drink Now',
  HOLD: '🟢 Hold',
  PAST_PEAK: '⚠️ Past Peak',
  UNKNOWN: 'Unknown',
};

/** Emoji-prefixed: '🍷 Drink Now', '🟢 Hold', '⚠️ Past Peak' */
export function getMaturityEmoji(
  drinkFrom: number | string | null | undefined,
  drinkUntil: number | string | null | undefined,
): string {
  return EMOJI_MAP[computeMaturityCode(drinkFrom, drinkUntil)];
}

// ── Sort rank (for cellar sort-by-maturity) ──

const RANK_MAP: Record<MaturityCode, number> = {
  PAST_PEAK: 0,   // urgent first
  DRINK_NOW: 1,
  HOLD: 2,
  TOO_YOUNG: 2,
  UNKNOWN: 3,     // unknown last
};

/** Numeric rank for sorting: Past Peak (0) → Drink Now (1) → Hold (2) → Unknown (3) */
export function getMaturityRank(
  drinkFrom: number | string | null | undefined,
  drinkUntil: number | string | null | undefined,
): number {
  return RANK_MAP[computeMaturityCode(drinkFrom, drinkUntil)];
}
