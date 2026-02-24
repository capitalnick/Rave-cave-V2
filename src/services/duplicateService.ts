import type { Wine, DuplicateCandidate } from '@/types';
import { formatGrapeDisplay } from '@/utils/grapeUtils';

/**
 * Normalised Levenshtein similarity: 1.0 = identical, 0.0 = completely different.
 */
function fuzzyMatch(a: string, b: string): number {
  const sa = a.toLowerCase().trim();
  const sb = b.toLowerCase().trim();
  if (sa === sb) return 1;
  if (!sa || !sb) return 0;

  const lenA = sa.length;
  const lenB = sb.length;
  const maxLen = Math.max(lenA, lenB);

  // Levenshtein distance via single-row DP
  const prev = Array.from({ length: lenB + 1 }, (_, i) => i);

  for (let i = 1; i <= lenA; i++) {
    let prevDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= lenB; j++) {
      const temp = prev[j];
      if (sa[i - 1] === sb[j - 1]) {
        prev[j] = prevDiag;
      } else {
        prev[j] = 1 + Math.min(prevDiag, prev[j], prev[j - 1]);
      }
      prevDiag = temp;
    }
  }

  const distance = prev[lenB];
  return 1 - distance / maxLen;
}

// Weighted scoring: Producer (0.35) + Varietal (0.25) + Vintage (0.20) + Name (0.15) + Region (0.05)
const WEIGHTS = {
  producer: 0.35,
  grapeVarieties: 0.25,
  vintage: 0.20,
  name: 0.15,
  region: 0.05,
};

const THRESHOLD = 0.60;
const MAX_CANDIDATES = 3;

/**
 * Find potential duplicate wines in the inventory.
 */
export function findDuplicates(draft: Partial<Wine>, inventory: Wine[]): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];

  for (const existing of inventory) {
    let score = 0;
    const matchedFields: string[] = [];

    // Vintage: exact match or skip entirely if mismatch and both present
    const draftVintage = Number(draft.vintage);
    const existingVintage = Number(existing.vintage);
    if (draftVintage && existingVintage) {
      if (draftVintage === existingVintage) {
        score += WEIGHTS.vintage;
        matchedFields.push('vintage');
      } else {
        // Vintage mismatch — likely different wine, skip
        continue;
      }
    }

    // Producer (fuzzy)
    if (draft.producer && existing.producer) {
      const sim = fuzzyMatch(draft.producer, existing.producer);
      if (sim > 0.6) {
        score += sim * WEIGHTS.producer;
        matchedFields.push('producer');
      }
    }

    // Varietal/Grape (fuzzy)
    const draftGrapes = formatGrapeDisplay(draft.grapeVarieties ?? []);
    const existingGrapes = formatGrapeDisplay(existing.grapeVarieties ?? []);
    if (draftGrapes && existingGrapes) {
      const sim = fuzzyMatch(draftGrapes, existingGrapes);
      if (sim > 0.5) {
        score += sim * WEIGHTS.grapeVarieties;
        matchedFields.push('grapeVarieties');
      }
    }

    // Wine name (fuzzy)
    if (draft.name && existing.name) {
      const sim = fuzzyMatch(draft.name, existing.name);
      if (sim > 0.5) {
        score += sim * WEIGHTS.name;
        matchedFields.push('name');
      }
    }

    // Region (fuzzy)
    if (draft.region && existing.region) {
      const sim = fuzzyMatch(draft.region, existing.region);
      if (sim > 0.5) {
        score += sim * WEIGHTS.region;
        matchedFields.push('region');
      }
    }

    if (score >= THRESHOLD) {
      candidates.push({
        wineId: existing.id,
        similarityScore: score,
        matchedFields,
        existingWine: existing,
      });
    }
  }

  return candidates
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, MAX_CANDIDATES);
}
