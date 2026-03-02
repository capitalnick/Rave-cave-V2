import { CONFIG } from '../constants';
import { callGeminiProxy } from '@/utils/geminiProxy';
import { matchToCellar, buildCellarSnapshotForPrompt, RecommendError } from './recommendService';
import type {
  WineListAnalysisContext,
  WineListEntry,
  WineListPick,
  WineListAnalysis,
  Wine,
  RankLabel,
} from '../types';

// ── Progress Callbacks ──

export type WineListProgressEvent =
  | { stage: 'extracting'; pagesTotal: number }
  | {
      stage: 'extraction-complete';
      entryCount: number;
      entries: WineListEntry[];
      restaurantName: string | null;
      sections: { name: string; pageIndices: number[]; entryIds: string[] }[];
    }
  | { stage: 'generating-picks' };

export type WineListProgressCallback = (progress: WineListProgressEvent) => void;

// ── Prompt Builders ──

function buildExtractionPrompt(): string {
  return `You are Rémy, an expert French sommelier for "Rave Cave".

The user has photographed pages from a restaurant wine list. Extract EVERY wine you can read from the images.

Respond with ONLY a valid JSON object (no markdown fences, no extra text) with this exact shape:
{
  "restaurantName": "string or null (if visible on the list)",
  "sections": [
    {
      "name": "string (section heading from the list, e.g., 'Whites by the Glass', 'Champagne')",
      "pageIndices": [0]
    }
  ],
  "entries": [
    {
      "producer": "string",
      "name": "string (cuvée name, or empty if none)",
      "vintage": number or null,
      "type": "Red" | "White" | "Rosé" | "Sparkling" | "Dessert" | "Fortified" | null,
      "priceGlass": number or null,
      "priceBottle": number or null,
      "currency": "string (e.g., AUD, EUR, USD)",
      "section": "string (must match a section name above)",
      "pageIndex": number (0-based, which image this came from),
      "asListed": "string (exact text from the list for this entry)"
    }
  ]
}

Rules:
- Extract ALL wines, not just highlights — be exhaustive
- "asListed" should be the raw text as printed on the list
- Group wines by their visible section headings
- If no section heading is visible, use "Uncategorised"
- If wine type is ambiguous, infer from section name or set null
- Do NOT invent wines — only extract what is visibly printed`;
}

function buildPicksPrompt(
  entries: WineListEntry[],
  restaurantName: string | null,
  context: WineListAnalysisContext,
  cellarSnapshot: string
): string {
  const budgetLine = formatBudget(context);
  const mealLine = context.meal ? `Meal: ${context.meal}` : 'Meal: Not specified';
  const prefLine = context.preferences ? `Preferences: ${context.preferences}` : '';

  const wineListText = entries.map(e => {
    const price = e.priceBottle != null ? `${e.currency} ${e.priceBottle}/btl` : e.priceGlass != null ? `${e.currency} ${e.priceGlass}/glass` : 'price unknown';
    return `[${e.entryId}] ${e.producer} ${e.name} ${e.vintage ?? 'NV'} (${e.type ?? '?'}) — ${price} — Section: ${e.section}`;
  }).join('\n');

  return `You are Rémy, an expert French sommelier for "Rave Cave".

The user is at ${restaurantName ?? 'a restaurant'} and has shared their wine list. Here are all the wines extracted:

${wineListText}

Context:
Budget: ${budgetLine}
${mealLine}
${prefLine}

USER'S CELLAR (for cross-referencing):
${cellarSnapshot}

Select your picks from the wine list. Respond with ONLY a valid JSON array (no markdown fences, no extra text). Each pick must have:
{
  "entryId": "string (must match an entryId from the list above)",
  "rank": number (1 = best),
  "rankLabel": "best-match" | "also-great" | "adventurous" | "value" | "pairing",
  "rationale": "string (1-2 sentences, warm sommelier tone)",
  "pickType": "top" | "value" | "adventurous" | "pairing"
}

Rules:
- Select 3 top picks (best-match, also-great, adventurous)
- Select 1 value pick (best quality-to-price ratio)
${context.meal ? '- Select 1-2 pairing picks (best matches for the meal)' : ''}
- entryId MUST reference an actual wine from the list — never invent
- Respect the budget constraint if set
- If a wine matches something in the user's cellar, mention it in the rationale
- Keep rationales warm and conversational`;
}

function formatBudget(ctx: WineListAnalysisContext): string {
  if (ctx.priceRange) {
    return `${ctx.currency} ${ctx.priceRange.min}\u2013${ctx.priceRange.max}`;
  }
  if (ctx.budgetMin === null && ctx.budgetMax === null) return 'No limit';
  if (ctx.budgetMin === null) return `Under ${ctx.currency} ${ctx.budgetMax}`;
  if (ctx.budgetMax === null) return `${ctx.currency} ${ctx.budgetMin}+`;
  return `${ctx.currency} ${ctx.budgetMin}\u2013${ctx.budgetMax}`;
}

// ── Parsers ──

function stripFences(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return cleaned;
}

function parseExtractionResponse(rawText: string, pageCount: number): {
  restaurantName: string | null;
  entries: WineListEntry[];
  sections: { name: string; pageIndices: number[]; entryIds: string[] }[];
} {
  const cleaned = stripFences(rawText);

  // Find first { to last }
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) {
    throw new RecommendError('Could not find JSON object in extraction response', 'PARSE_ERROR');
  }
  const jsonStr = cleaned.substring(first, last + 1);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new RecommendError('Failed to parse extraction response as JSON', 'PARSE_ERROR');
  }

  const rawEntries: any[] = parsed.entries || [];
  if (rawEntries.length === 0) {
    throw new RecommendError('No wines detected on the list', 'EMPTY_RESULTS');
  }

  // Assign entryIds (Cloud Function post-processing pattern)
  const entries: WineListEntry[] = rawEntries.map((e: any): WineListEntry => ({
    entryId: crypto.randomUUID(),
    producer: e.producer || 'Unknown',
    name: e.name || '',
    vintage: e.vintage != null ? Number(e.vintage) : null,
    type: e.type || null,
    priceGlass: e.priceGlass != null ? Number(e.priceGlass) : null,
    priceBottle: e.priceBottle != null ? Number(e.priceBottle) : null,
    currency: e.currency || 'AUD',
    section: e.section || 'Uncategorised',
    pageIndex: e.pageIndex != null ? Number(e.pageIndex) : 0,
    asListed: e.asListed || '',
  }));

  // Build sections with entryIds
  const rawSections: any[] = parsed.sections || [];
  const sections = rawSections.map((s: any) => ({
    name: s.name || 'Uncategorised',
    pageIndices: Array.isArray(s.pageIndices) ? s.pageIndices : [0],
    entryIds: entries.filter(e => e.section === s.name).map(e => e.entryId),
  }));

  // Add entries that didn't match any section
  const coveredIds = new Set(sections.flatMap(s => s.entryIds));
  const uncovered = entries.filter(e => !coveredIds.has(e.entryId));
  if (uncovered.length > 0) {
    const existing = sections.find(s => s.name === 'Uncategorised');
    if (existing) {
      existing.entryIds.push(...uncovered.map(e => e.entryId));
    } else {
      sections.push({
        name: 'Uncategorised',
        pageIndices: [...new Set(uncovered.map(e => e.pageIndex))],
        entryIds: uncovered.map(e => e.entryId),
      });
    }
  }

  return {
    restaurantName: parsed.restaurantName || null,
    entries,
    sections,
  };
}

function parsePicksResponse(rawText: string, entries: WineListEntry[], inventory: Wine[]): WineListPick[] {
  const cleaned = stripFences(rawText);

  const first = cleaned.indexOf('[');
  const last = cleaned.lastIndexOf(']');
  if (first === -1 || last === -1 || last <= first) {
    throw new RecommendError('Could not find JSON array in picks response', 'PARSE_ERROR');
  }
  const jsonStr = cleaned.substring(first, last + 1);

  let parsed: any[];
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new RecommendError('Failed to parse picks response as JSON', 'PARSE_ERROR');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new RecommendError('AI returned no picks', 'EMPTY_RESULTS');
  }

  const entryMap = new Map(entries.map(e => [e.entryId, e]));

  return parsed
    .filter((p: any) => entryMap.has(p.entryId)) // Only keep picks referencing real entries
    .map((p: any): WineListPick => {
      const entry = entryMap.get(p.entryId)!;
      const { wineId, isFromCellar } = matchToCellar(
        { producer: entry.producer, vintage: entry.vintage },
        inventory
      );
      const cellarWine = isFromCellar ? inventory.find(w => w.id === wineId) : null;

      return {
        entryId: p.entryId,
        rank: Number(p.rank) || 1,
        rankLabel: (p.rankLabel || 'best-match') as RankLabel,
        rationale: p.rationale || '',
        pickType: (['top', 'value', 'adventurous', 'pairing'].includes(p.pickType) ? p.pickType : 'top') as WineListPick['pickType'],
        cellarMatchId: isFromCellar ? wineId : null,
        cellarMatchNote: cellarWine ? `You have ${cellarWine.quantity} bottle${cellarWine.quantity !== 1 ? 's' : ''}` : null,
      };
    });
}

// ── Public API ──

/**
 * Stage 1: Extract all wines from wine list images.
 */
export async function extractWineListEntries(
  base64Images: string[],
  signal?: AbortSignal
): Promise<{
  restaurantName: string | null;
  entries: WineListEntry[];
  sections: { name: string; pageIndices: number[]; entryIds: string[] }[];
}> {
  const imageParts = base64Images.map(img => ({
    inlineData: { data: img, mimeType: 'image/jpeg' },
  }));

  const response = await callGeminiProxy({
    model: CONFIG.MODELS.TEXT,
    systemInstruction: buildExtractionPrompt(),
    contents: [{
      role: 'user',
      parts: [
        { text: `Extract all wines from these ${base64Images.length} wine list page${base64Images.length > 1 ? 's' : ''}.` },
        ...imageParts,
      ],
    }],
  }, RecommendError as any);

  const text = response?.text;
  if (!text) throw new RecommendError('Empty response from AI for wine list extraction', 'EMPTY_RESULTS');

  return parseExtractionResponse(text, base64Images.length);
}

/**
 * Stage 2: Generate picks from extracted entries (text-only, no images).
 */
export async function generateWineListPicks(
  entries: WineListEntry[],
  restaurantName: string | null,
  context: WineListAnalysisContext,
  inventory: Wine[],
  signal?: AbortSignal
): Promise<WineListPick[]> {
  const cellarSnapshot = buildCellarSnapshotForPrompt(inventory);
  const systemInstruction = buildPicksPrompt(entries, restaurantName, context, cellarSnapshot);

  const response = await callGeminiProxy({
    model: CONFIG.MODELS.TEXT,
    systemInstruction,
    contents: [{
      role: 'user',
      parts: [{ text: 'Select the best picks from this wine list based on my context.' }],
    }],
  }, RecommendError as any);

  const text = response?.text;
  if (!text) throw new RecommendError('Empty response from AI for wine list picks', 'EMPTY_RESULTS');

  return parsePicksResponse(text, entries, inventory);
}

/**
 * Full two-stage pipeline: extract + picks.
 */
export async function analyseWineList(
  base64Images: string[],
  context: WineListAnalysisContext,
  inventory: Wine[],
  signal?: AbortSignal,
  onProgress?: WineListProgressCallback
): Promise<WineListAnalysis> {
  const sessionId = crypto.randomUUID();

  // Fire immediately so the UI can show page count
  onProgress?.({ stage: 'extracting', pagesTotal: base64Images.length });

  // Stage 1: Extraction
  const { restaurantName, entries, sections } = await extractWineListEntries(base64Images, signal);

  // Fire when extraction is done — pass the data so UI can transition early
  onProgress?.({
    stage: 'extraction-complete',
    entryCount: entries.length,
    entries,
    restaurantName,
    sections,
  });

  // Stage 2: Picks
  onProgress?.({ stage: 'generating-picks' });
  const picks = await generateWineListPicks(entries, restaurantName, context, inventory, signal);

  return {
    sessionId,
    restaurantName,
    entries,
    sections,
    picks,
    pageCount: base64Images.length,
    analysedAt: Date.now(),
  };
}

/**
 * Re-run only Stage 2 with updated context (e.g., meal added).
 */
export async function reanalyseWineListPicks(
  entries: WineListEntry[],
  restaurantName: string | null,
  context: WineListAnalysisContext,
  inventory: Wine[],
  signal?: AbortSignal
): Promise<WineListPick[]> {
  return generateWineListPicks(entries, restaurantName, context, inventory, signal);
}
