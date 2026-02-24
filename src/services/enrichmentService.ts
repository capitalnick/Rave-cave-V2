import { CONFIG } from '@/constants';
import { inventoryService } from './inventoryService';
import type { Wine } from '@/types';
import { authFetch } from '@/utils/authFetch';
import { FUNCTION_URLS } from '@/config/functionUrls';
import { formatGrapeDisplay, cepageStringToVarieties } from '@/utils/grapeUtils';

function computeMaturity(drinkFrom: number | null, drinkUntil: number | null): Wine['maturity'] {
  const year = new Date().getFullYear();
  if (!drinkFrom || !drinkUntil) return 'Unknown' as Wine['maturity'];
  if (year >= drinkFrom && year <= drinkUntil) return 'Drink Now';
  if (year < drinkFrom) return 'Hold';
  return 'Past Peak';
}

function buildEnrichmentPrompt(wine: Partial<Wine>): string {
  const parts = [
    wine.producer && `Producer: ${wine.producer}`,
    wine.name && `Name/Cuvee: ${wine.name}`,
    wine.vintage && `Vintage: ${wine.vintage}`,
    wine.type && `Type: ${wine.type}`,
    wine.grapeVarieties?.length && `Cepage: ${formatGrapeDisplay(wine.grapeVarieties)}`,
    wine.region && `Region: ${wine.region}`,
    wine.country && `Country: ${wine.country}`,
    wine.appellation && `Appellation: ${wine.appellation}`,
  ].filter(Boolean).join('\n');

  return `You are a wine expert. Given the following wine details, provide enrichment data as JSON.

${parts}

Return ONLY valid JSON (no markdown fences) with this exact structure:
{
  "tastingNotes": "comma-separated adjectives, 5-8 descriptors (e.g. structured, graphite, cassis, firm tannins, long finish)",
  "drinkFrom": <integer year or null>,
  "drinkUntil": <integer year or null>,
  "cepage": "<grape varieties separated by / or null>",
  "vivinoRating": <integer 0-100>
}

Rules:
- tastingNotes: Adjectives and short descriptors only, comma-separated, 5-8 items. No full sentences. Derived from region, vintage, producer, cepage, and type.
- drinkFrom/drinkUntil: Integer years based on region, vintage, cepage, classification, producer tier. Return null if vintage is unknown or 0.
- cepage: Only provide if not already known above. Use region-aware inference (e.g. Burgundy red → Pinot Noir, Bordeaux → Cabernet Sauvignon / Merlot, Barolo → Nebbiolo). Return null if cepage is already provided or cannot be inferred.
- vivinoRating: An estimated quality score 0-100 based on producer tier, classification, region prestige, and vintage quality. Default to 75 if insufficient info. No decimals.`;
}

/**
 * Post-commit enrichment: fills tasting notes, drink window, cepage, and AI rating
 * via a single Gemini call. Fire-and-forget — callers use .catch(console.error).
 */
export async function enrichWine(docId: string, wine: Partial<Wine>): Promise<void> {
  const needsTastingNotes = !wine.tastingNotes;
  const needsDrinkFrom = !wine.drinkFrom || wine.drinkFrom === 0;
  const needsDrinkUntil = !wine.drinkUntil || wine.drinkUntil === 0;
  const needsCepage = !wine.grapeVarieties?.length;
  const needsRating = !wine.vivinoRating;

  // Nothing to enrich
  if (!needsTastingNotes && !needsDrinkFrom && !needsDrinkUntil && !needsCepage && !needsRating) {
    return;
  }

  // Mark as pending
  await inventoryService.updateField(docId, 'processingStatus', 'pending');

  try {
    const res = await authFetch(FUNCTION_URLS.gemini, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.MODELS.TEXT,
        contents: [{ role: 'user', parts: [{ text: buildEnrichmentPrompt(wine) }] }],
      }),
    });

    if (!res.ok) throw new Error(`Enrichment proxy error: ${res.status}`);

    const data = await res.json();
    const rawText = (data?.text || '').trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(rawText);

    const updates: Record<string, any> = {};

    if (needsTastingNotes && parsed.tastingNotes) {
      updates.tastingNotes = parsed.tastingNotes;
    }
    if (needsDrinkFrom && typeof parsed.drinkFrom === 'number') {
      updates.drinkFrom = parsed.drinkFrom;
    }
    if (needsDrinkUntil && typeof parsed.drinkUntil === 'number') {
      updates.drinkUntil = parsed.drinkUntil;
    }
    if (needsCepage && parsed.cepage) {
      updates.grapeVarieties = cepageStringToVarieties(parsed.cepage);
    }
    if (needsRating && typeof parsed.vivinoRating === 'number') {
      updates.vivinoRating = parsed.vivinoRating;
    }

    // Derive maturity if drink window was enriched
    const finalDrinkFrom = updates.drinkFrom ?? wine.drinkFrom ?? null;
    const finalDrinkUntil = updates.drinkUntil ?? wine.drinkUntil ?? null;
    if (updates.drinkFrom || updates.drinkUntil) {
      updates.maturity = computeMaturity(finalDrinkFrom, finalDrinkUntil);
    }

    updates.processingStatus = 'complete';
    await inventoryService.updateFields(docId, updates);
  } catch (e) {
    console.error('Enrichment failed:', e);
    await inventoryService.updateField(docId, 'processingStatus', 'error').catch(() => {});
  }
}
