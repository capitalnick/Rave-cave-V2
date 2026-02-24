import type { GrapeVariety } from '../types';

/**
 * Wine card display — names only, comma-separated.
 * e.g. "Shiraz, Grenache, Mourvèdre"
 */
export function formatGrapeDisplay(varieties: GrapeVariety[]): string {
  if (!varieties?.length) return '';
  return varieties.map(g => g.name).filter(Boolean).join(', ');
}

/**
 * Modal / detail display — includes % where present.
 * e.g. "Shiraz 60%, Grenache 30%, Mourvèdre 10%"
 * Falls back to name-only for entries without pct.
 */
export function formatGrapeDetailed(varieties: GrapeVariety[]): string {
  if (!varieties?.length) return '';
  return varieties
    .map(g => (g.pct != null ? `${g.name} ${g.pct}%` : g.name))
    .filter(Boolean)
    .join(', ');
}

/**
 * Returns the sum of all entered percentages.
 * Returns null if no percentages have been entered.
 */
export function grapePercentTotal(varieties: GrapeVariety[]): number | null {
  const withPct = varieties.filter(g => g.pct != null);
  if (!withPct.length) return null;
  return withPct.reduce((sum, g) => sum + (g.pct ?? 0), 0);
}

/**
 * Migration helper — parses legacy flat fields into GrapeVariety[].
 * e.g. cepage="Shiraz/Grenache", blendPercent="60/40"
 *   → [{ name: "Shiraz", pct: 60 }, { name: "Grenache", pct: 40 }]
 */
export function migrateLegacyFields(
  cepage: string | undefined | null,
  blendPercent: string | undefined | null
): GrapeVariety[] {
  if (!cepage?.trim()) return [];

  const names = cepage
    .split(/[\/,]/)
    .map(s => s.trim())
    .filter(Boolean);

  const pcts = blendPercent
    ? blendPercent
        .split(/[\/,]/)
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n > 0)
    : [];

  return names.map((name, i) => ({
    name,
    pct: pcts[i] ?? null,
  }));
}

/**
 * Convert a flat cepage string (e.g. from Gemini extraction) into GrapeVariety[].
 * Splits on common delimiters: / , & and "and".
 */
export function cepageStringToVarieties(cepage: string | undefined | null): GrapeVariety[] {
  if (!cepage?.trim()) return [];
  return cepage
    .split(/[\/&,]|(?:\s+and\s+)/i)
    .map(s => s.trim())
    .filter(Boolean)
    .map(name => ({ name, pct: null }));
}
