import { CONFIG } from '../constants';
import type {
  OccasionId,
  OccasionContext,
  DinnerContext,
  PartyContext,
  GiftContext,
  Recommendation,
  Wine,
  RankLabel,
} from '../types';

import { authFetch } from '@/utils/authFetch';
import { firebaseConfig } from '@/config/firebaseConfig';

const GEMINI_PROXY_URL = process.env.GEMINI_PROXY_URL ||
  `https://australia-southeast1-${firebaseConfig.projectId}.cloudfunctions.net/gemini`;

const GEMINI_STREAM_URL =
  `https://australia-southeast1-${firebaseConfig.projectId}.cloudfunctions.net/geminiStream`;

export async function callGeminiProxy(body: { model: string; contents: any[]; systemInstruction?: string }) {
  const res = await authFetch(GEMINI_PROXY_URL, {
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
      return `The user is planning a dinner.
Meal: ${c.meal || 'Not specified'}
Guests: ${c.guests}
Vibe: ${c.vibe}`;
    }
    case 'party': {
      const c = context as PartyContext;
      return `The user is planning a party.
Guests: ${c.guests}
Vibe: ${c.vibe}
Budget per bottle: ${c.budgetPerBottle === 'any' ? 'No budget constraint' : c.budgetPerBottle.replace('-', ' to $').replace('under-', 'Under $').replace('plus', '+')}`;
    }
    case 'gift': {
      const c = context as GiftContext;
      return `The user is picking a wine gift.
Recipient: ${c.recipient || 'Not specified'}
Their taste: ${c.theirTaste || 'Not specified'}
Gift occasion: ${c.occasion}
Budget: ${c.budget === 'any' ? 'No budget constraint' : c.budget.replace('-', ' to $').replace('under-', 'Under $').replace('plus', '+')}`;
    }
    case 'surprise':
      return 'The user wants a surprise wine recommendation. Pick something interesting and unexpected.';
    default:
      return '';
  }
}

function buildRecommendPrompt(
  occasionId: OccasionId,
  context: OccasionContext,
  cellarSnapshot: string,
  cellarOnly: boolean,
  excludeIds?: string[]
): string {
  const occasionDetails = buildOccasionPrompt(occasionId, context);
  const isSurprise = occasionId === 'surprise';
  const count = isSurprise ? 1 : 3;

  const excludeClause = excludeIds?.length
    ? `\nDo NOT recommend any of these previously suggested wines (by producer+vintage): ${excludeIds.join(', ')}`
    : '';

  const cellarInstruction = cellarOnly
    ? `You MUST only recommend wines from the user's cellar inventory below. If fewer than ${count} good matches exist, return fewer.

CELLAR INVENTORY:
${cellarSnapshot}`
    : `You may recommend any wine from your general knowledge. The user's cellar is provided for reference — if a recommendation happens to match a cellar wine, note it.

CELLAR INVENTORY (for reference):
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
  const cellarOnly = context ? (context as any).cellarOnly !== false : true;
  const cellarSnapshot = buildCellarSnapshotForPrompt(inventory);
  const systemInstruction = buildRecommendPrompt(occasionId, context, cellarSnapshot, cellarOnly);

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
    inventory.length > 0,
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

// ── Streaming API ──

async function callGeminiProxyStream(
  body: { model: string; contents: any[]; systemInstruction?: string },
  onRecommendation: (rec: Recommendation) => void,
  inventory: Wine[],
  signal?: AbortSignal
): Promise<void> {
  const res = await authFetch(GEMINI_STREAM_URL, {
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
  const cellarOnly = context ? (context as any).cellarOnly !== false : true;
  const cellarSnapshot = buildCellarSnapshotForPrompt(inventory);
  const systemInstruction = buildRecommendPrompt(occasionId, context, cellarSnapshot, cellarOnly);

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
