import { CONFIG, OCCASION_DIRECTIVES, PERSONALITY_DIRECTIVES, EXPERIENCE_HINTS } from '../constants';
import type {
  OccasionId,
  OccasionContext,
  DinnerContext,
  PartyContext,
  GiftContext,
  Recommendation,
  Wine,
  RankLabel,
  CrowdAllocation,
  CrowdAllocationItem,
  PartyVibe,
  SourceMode,
} from '../types';

import { WINE_PER_PERSON_MULTIPLIER } from '../constants';

import { authFetch } from '@/utils/authFetch';
import { FUNCTION_URLS } from '@/config/functionUrls';

export async function callGeminiProxy(body: { model: string; contents: any[]; systemInstruction?: string }) {
  const res = await authFetch(FUNCTION_URLS.gemini, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new RecommendError(`Gemini proxy error: ${res.status}`, 'PROXY_ERROR');
  return res.json();
}

// ── Error Types ──

export type RecommendErrorCode = 'PROXY_ERROR' | 'PARSE_ERROR' | 'EMPTY_RESULTS' | 'UNKNOWN';

export class RecommendError extends Error {
  code: RecommendErrorCode;
  constructor(message: string, code: RecommendErrorCode = 'UNKNOWN') {
    super(message);
    this.name = 'RecommendError';
    this.code = code;
  }
}

// ── Prompt Building ──

function buildOccasionPrompt(occasionId: OccasionId, context: OccasionContext): string {
  switch (occasionId) {
    case 'dinner': {
      const c = context as DinnerContext;
      const priceClause = c.priceRange
        ? `Price per bottle: $${c.priceRange.min}–$${c.priceRange.max}`
        : 'Price: no constraint';
      return `The user is planning a dinner.
Meal: ${c.meal || 'Not specified'}
Guests: ${c.guests}
${priceClause}`;
    }
    case 'party': {
      const c = context as PartyContext;
      return buildPartyPromptBlock(c);
    }
    case 'gift': {
      const c = context as GiftContext;
      const occasionDir = OCCASION_DIRECTIVES[c.occasion] || '';
      const personalityDir = PERSONALITY_DIRECTIVES[c.personality] || '';
      const expHint = EXPERIENCE_HINTS[c.experienceLevel] || '';
      const priceClause = c.priceRange
        ? `Price per bottle: $${c.priceRange.min}\u2013$${c.priceRange.max}`
        : 'Price: no constraint';
      const styleClause = c.wineStyle === 'surprise'
        ? 'no style preference \u2014 surprise them'
        : c.wineStyle;
      const regionClause = c.regionPreference && c.regionPreference !== 'either'
        ? `Region preference: ${c.regionPreference}`
        : '';

      return `The user is choosing a wine gift.

Occasion: ${c.occasion} \u2014 ${occasionDir}
Recipient wine experience: ${c.experienceLevel} \u2014 ${expHint}
Personality: ${c.personality} \u2014 ${personalityDir}

Wine direction:
- Colour: ${c.wineColour === 'no-preference' ? 'no preference' : c.wineColour}
- Style: ${styleClause}
${regionClause ? `- ${regionClause}` : ''}
${priceClause}`;
    }
    case 'surprise':
      return 'The user wants a surprise wine recommendation. Pick something interesting and unexpected.';
    default:
      return '';
  }
}

// ── Party / Crowd Allocation ──

const vibeStyleGuide: Record<PartyVibe, string> = {
  'summer-brunch':      'Lean white & rosé, one sparkling, minimal red.',
  'garden-party':       'Mix of rosé, white, light reds. Sparkling welcome.',
  'bbq':                'Bold reds dominant, one crisp white or rosé for balance.',
  'cocktail-party':     'Sparkling-forward, aromatic whites, minimal red.',
  'celebration':        'Lead with sparkling/champagne, then premium reds & whites.',
  'casual-dinner':      'Even red/white split, food-friendly, approachable.',
  'wine-lovers-dinner': 'Diverse regions & styles, showcase interesting bottles.',
  'holiday-feast':      'Rich reds, aromatic whites, one festive sparkling.',
  'late-night':         'Easy-drinking, fun, nothing too serious. Sparkling & light reds.',
};

function buildPartyPromptBlock(c: PartyContext): string {
  const priceClause = c.priceRange
    ? `$${c.priceRange.min}\u2013$${c.priceRange.max}`
    : 'No budget constraint';

  return `The user is planning a party ("Wines for a Crowd").

CROWD DETAILS:
- Guests: ${c.guests}
- Wine per person: ${c.winePerPerson} (${WINE_PER_PERSON_MULTIPLIER[c.winePerPerson]} bottles pp)
- Total bottles needed: ${c.totalBottles}
- Vibe: ${c.vibe}
- Budget per bottle: ${priceClause}
- Source mode: ${c.sourceMode}

VIBE STYLE GUIDE for "${c.vibe}": ${vibeStyleGuide[c.vibe]}

ALLOCATION INSTRUCTIONS:
- Recommend 3–6 different wines, each with a specific bottle count.
- The sum of all bottle counts MUST equal exactly ${c.totalBottles}.
- Each wine gets a "role" label (e.g., "The Crowd Pleaser", "The Conversation Starter", "The Dark Horse").
- Include a short rationale per wine explaining why it fits the vibe and role.
- Vary by type, region, and price to create an interesting spread.

${c.sourceMode === 'cellar'
  ? `CELLAR-ONLY MODE: Every wine MUST come from the cellar. Each item must have a valid wineId and inCellar: true. If you cannot fill ${c.totalBottles} bottles from the cellar, return as many as you can.`
  : c.sourceMode === 'other'
  ? `OUTSIDE-CELLAR MODE: Every wine MUST be from outside the cellar. Do NOT include any wine from the cellar inventory. Set wineId to null and inCellar: false for all items.`
  : `MIXED MODE: Include wines from both the cellar AND from outside. You MUST include at least one cellar wine (inCellar: true with valid wineId) and at least one non-cellar wine (inCellar: false, wineId: null).`
}

Return ONLY a valid JSON object (no markdown fences, no extra text) with this exact shape:
{
  "totalBottles": ${c.totalBottles},
  "vibeLabel": "string (a short editorial label for this vibe, e.g. 'Summer Brunch Spread')",
  "remyNote": "string (1-2 sentences framing the collection — warm, sommelier voice)",
  "items": [
    {
      "wineId": "string | null",
      "producer": "string",
      "wineName": "string",
      "vintage": number,
      "wineType": "Red" | "White" | "Rosé" | "Sparkling" | "Dessert" | "Fortified",
      "region": "string",
      "bottles": number,
      "role": "string",
      "rationale": "string",
      "inCellar": boolean
    }
  ]
}`;
}

function buildRecommendPrompt(
  occasionId: OccasionId,
  context: OccasionContext,
  cellarSnapshot: string,
  sourceMode: SourceMode,
  excludeIds?: string[]
): string {
  const occasionDetails = buildOccasionPrompt(occasionId, context);
  const isSurprise = occasionId === 'surprise';
  const count = isSurprise ? 1 : 3;

  const excludeClause = excludeIds?.length
    ? `\nDo NOT recommend any of these previously suggested wines (by producer+vintage): ${excludeIds.join(', ')}`
    : '';

  const cellarInstruction = sourceMode === 'cellar'
    ? `You MUST only recommend wines from the user's cellar inventory below. If fewer than ${count} good matches exist, return fewer.

CELLAR INVENTORY:
${cellarSnapshot}`
    : sourceMode === 'other'
    ? `You MUST only recommend wines that are NOT in the user's cellar. Do not recommend any wine that appears in the cellar inventory below.

CELLAR INVENTORY (avoid these wines):
${cellarSnapshot}`
    : `You should recommend a mix of wines from the user's cellar AND wines from your general knowledge. You MUST include at least one wine from the cellar and at least one wine not in the cellar.

CELLAR INVENTORY:
${cellarSnapshot}`;

  return `You are Rémy, an expert French sommelier for "Rave Cave".

${occasionDetails}
${excludeClause}

${cellarInstruction}

Respond with ONLY a valid JSON array of ${isSurprise ? '1' : 'up to 3'} wine recommendations. Each object must have these exact fields:
{
  "producer": "string",
  "name": "string (varietal or cuvée name)",
  "vintage": number,
  "type": "Red" | "White" | "Rosé" | "Sparkling" | "Dessert" | "Fortified",
  "rank": ${isSurprise ? '1' : '1 | 2 | 3'},
  "rankLabel": "${isSurprise ? 'best-match' : 'best-match | also-great | adventurous'}",
  "rationale": "string (${isSurprise ? '1-3 sentences explaining why this is a great pick' : 'one sentence explaining why this wine fits'})",
  "maturity": "DRINK_NOW" | "HOLD" | "PAST_PEAK",
  "rating": number | null (0-5.0 scale, or null if unknown)
}

Rules:
- Rank 1 = best-match, Rank 2 = also-great, Rank 3 = adventurous
- Return ONLY the JSON array, no markdown fences, no extra text
- Each rationale should be warm and conversational, like a sommelier speaking`;
}

// ── Cellar Matching ──

export function matchToCellar(rec: any, inventory: Wine[]): { wineId: string; isFromCellar: boolean } {
  const producer = (rec.producer || '').toLowerCase().trim();
  const vintage = Number(rec.vintage);

  for (const wine of inventory) {
    const cellarProducer = wine.producer.toLowerCase().trim();
    const cellarVintage = Number(wine.vintage);

    // Fuzzy match: producer substring match + vintage match
    if (cellarVintage === vintage && (
      cellarProducer.includes(producer) || producer.includes(cellarProducer)
    )) {
      return { wineId: wine.id, isFromCellar: true };
    }
  }

  return { wineId: '', isFromCellar: false };
}

function parseRecommendations(rawText: string, inventory: Wine[]): Recommendation[] {
  // Strip markdown fences if present
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: any[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new RecommendError('Failed to parse AI response as JSON', 'PARSE_ERROR');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new RecommendError('AI returned no recommendations', 'EMPTY_RESULTS');
  }

  return parsed.map((rec): Recommendation => {
    const { wineId, isFromCellar } = matchToCellar(rec, inventory);
    return {
      wineId,
      producer: rec.producer || 'Unknown',
      name: rec.name || 'Unknown',
      vintage: Number(rec.vintage) || new Date().getFullYear(),
      type: rec.type || 'Red',
      rank: rec.rank || 1,
      rankLabel: (rec.rankLabel || 'best-match') as RankLabel,
      rationale: rec.rationale || '',
      isFromCellar,
      maturity: rec.maturity || 'DRINK_NOW',
      rating: rec.rating != null ? Number(rec.rating) : null,
    };
  });
}

// ── Public API ──

export async function getRecommendations(
  occasionId: OccasionId,
  context: OccasionContext,
  inventory: Wine[]
): Promise<Recommendation[]> {
  const sourceMode: SourceMode = context ? ((context as any).sourceMode || 'cellar') : 'cellar';
  const cellarSnapshot = buildCellarSnapshotForPrompt(inventory);
  const systemInstruction = buildRecommendPrompt(occasionId, context, cellarSnapshot, sourceMode);

  const response = await callGeminiProxy({
    model: CONFIG.MODELS.TEXT,
    systemInstruction,
    contents: [{ role: 'user', parts: [{ text: 'Please recommend wines based on the context above.' }] }],
  });

  const text = response?.text;
  if (!text) throw new RecommendError('Empty response from AI', 'EMPTY_RESULTS');

  return parseRecommendations(text, inventory);
}

export async function getSurpriseMe(
  inventory: Wine[],
  excludeIds: string[] = []
): Promise<Recommendation> {
  const cellarSnapshot = buildCellarSnapshotForPrompt(inventory);
  const systemInstruction = buildRecommendPrompt(
    'surprise',
    null,
    cellarSnapshot,
    inventory.length > 0 ? 'cellar' : 'both',
    excludeIds
  );

  const response = await callGeminiProxy({
    model: CONFIG.MODELS.TEXT,
    systemInstruction,
    contents: [{ role: 'user', parts: [{ text: 'Surprise me with a wine pick!' }] }],
  });

  const text = response?.text;
  if (!text) throw new RecommendError('Empty response from AI', 'EMPTY_RESULTS');

  const results = parseRecommendations(text, inventory);
  if (results.length === 0) throw new RecommendError('No surprise pick returned', 'EMPTY_RESULTS');
  return results[0];
}

// ── Crowd Allocation API ──

function parseCrowdAllocation(rawText: string, inventory: Wine[], sourceMode: SourceMode): CrowdAllocation {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new RecommendError('Failed to parse crowd allocation response as JSON', 'PARSE_ERROR');
  }

  if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new RecommendError('AI returned no crowd allocation items', 'EMPTY_RESULTS');
  }

  let items: CrowdAllocationItem[] = parsed.items.map((item: any): CrowdAllocationItem => {
    // Try to match to cellar
    const { wineId, isFromCellar } = matchToCellar(item, inventory);
    const resolvedWineId = isFromCellar ? wineId : (item.wineId || null);
    const resolvedInCellar = isFromCellar || (item.inCellar === true);

    return {
      wineId: resolvedInCellar ? resolvedWineId : null,
      producer: item.producer || 'Unknown',
      wineName: item.wineName || item.name || '',
      vintage: Number(item.vintage) || new Date().getFullYear(),
      wineType: item.wineType || item.type || 'Red',
      region: item.region || '',
      bottles: Number(item.bottles) || 1,
      role: item.role || '',
      rationale: item.rationale || '',
      inCellar: resolvedInCellar,
    };
  });

  // In cellar-only mode, filter out any non-cellar items
  if (sourceMode === 'cellar') {
    const before = items.length;
    items = items.filter(i => i.inCellar);
    if (items.length < before) {
      console.warn(`[CrowdAllocation] Filtered ${before - items.length} non-cellar items in cellar-only mode`);
    }
  } else if (sourceMode === 'other') {
    const before = items.length;
    items = items.filter(i => !i.inCellar);
    if (items.length < before) {
      console.warn(`[CrowdAllocation] Filtered ${before - items.length} cellar items in other-only mode`);
    }
  }

  return {
    totalBottles: Number(parsed.totalBottles) || items.reduce((sum, i) => sum + i.bottles, 0),
    items,
    remyNote: parsed.remyNote || '',
    vibeLabel: parsed.vibeLabel || '',
  };
}

export async function getPartyRecommendation(
  context: PartyContext,
  inventory: Wine[]
): Promise<CrowdAllocation> {
  const cellarSnapshot = buildCellarSnapshotForPrompt(inventory);
  const occasionDetails = buildPartyPromptBlock(context);

  const cellarInstruction = context.sourceMode === 'cellar'
    ? `You MUST only recommend wines from the user's cellar inventory below.\n\nCELLAR INVENTORY:\n${cellarSnapshot}`
    : context.sourceMode === 'other'
    ? `You MUST only recommend wines NOT in the user's cellar. Do not include any wine from the inventory below.\n\nCELLAR INVENTORY (avoid these):\n${cellarSnapshot}`
    : `Include a mix of cellar wines and non-cellar wines. You MUST include at least one from each.\n\nCELLAR INVENTORY:\n${cellarSnapshot}`;

  const systemInstruction = `You are Rémy, an expert French sommelier for "Rave Cave".\n\n${occasionDetails}\n\n${cellarInstruction}`;

  const response = await callGeminiProxy({
    model: CONFIG.MODELS.TEXT,
    systemInstruction,
    contents: [{ role: 'user', parts: [{ text: 'Please build my crowd wine allocation based on the context above.' }] }],
  });

  const text = response?.text;
  if (!text) throw new RecommendError('Empty response from AI', 'EMPTY_RESULTS');

  return parseCrowdAllocation(text, inventory, context.sourceMode);
}

// ── Streaming API ──

async function callGeminiProxyStream(
  body: { model: string; contents: any[]; systemInstruction?: string },
  onRecommendation: (rec: Recommendation) => void,
  inventory: Wine[],
  signal?: AbortSignal
): Promise<void> {
  const res = await authFetch(FUNCTION_URLS.geminiStream, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new RecommendError(`Gemini proxy error: ${res.status}`, 'PROXY_ERROR');
  if (!res.body) throw new RecommendError('No response body for stream', 'PROXY_ERROR');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const payload = trimmed.slice(6); // strip "data: "

        if (payload === '[DONE]') {
          return;
        }

        if (payload.startsWith('{"_fallback"')) {
          try {
            const fallback = JSON.parse(payload);
            const recs = parseRecommendations(fallback._fallback, inventory);
            recs.forEach(onRecommendation);
          } catch {
            throw new RecommendError('Failed to parse fallback response', 'PARSE_ERROR');
          }
          return;
        }

        try {
          const raw = JSON.parse(payload);
          const { wineId, isFromCellar } = matchToCellar(raw, inventory);
          const rec: Recommendation = {
            wineId,
            producer: raw.producer || 'Unknown',
            name: raw.name || 'Unknown',
            vintage: Number(raw.vintage) || new Date().getFullYear(),
            type: raw.type || 'Red',
            rank: raw.rank || 1,
            rankLabel: (raw.rankLabel || 'best-match') as RankLabel,
            rationale: raw.rationale || '',
            isFromCellar,
            maturity: raw.maturity || 'DRINK_NOW',
            rating: raw.rating != null ? Number(raw.rating) : null,
          };
          onRecommendation(rec);
        } catch {
          // Skip malformed individual object
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function getRecommendationsStream(
  occasionId: OccasionId,
  context: OccasionContext,
  inventory: Wine[],
  onRecommendation: (rec: Recommendation) => void,
  signal?: AbortSignal
): Promise<void> {
  const sourceMode: SourceMode = context ? ((context as any).sourceMode || 'cellar') : 'cellar';
  const cellarSnapshot = buildCellarSnapshotForPrompt(inventory);
  const systemInstruction = buildRecommendPrompt(occasionId, context, cellarSnapshot, sourceMode);

  await callGeminiProxyStream(
    {
      model: CONFIG.MODELS.TEXT,
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: 'Please recommend wines based on the context above.' }] }],
    },
    onRecommendation,
    inventory,
    signal
  );
}

// ── Helpers ──

export function buildCellarSnapshotForPrompt(inventory: Wine[]): string {
  if (inventory.length === 0) return 'Cellar is empty.';
  const limited = inventory.slice(0, CONFIG.INVENTORY_LIMIT);
  let context = `Showing ${limited.length} of ${inventory.length} bottles:\n`;
  limited.forEach(w => {
    context += `- [ID:${w.id}] ${w.vintage} ${w.producer} ${w.name} (${w.type}, $${w.price}, Qty: ${w.quantity}, Maturity: ${w.maturity})\n`;
  });
  return context;
}
