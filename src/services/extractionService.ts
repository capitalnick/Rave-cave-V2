import { CONFIG } from '@/constants';
import type { Wine, ExtractionResult, ExtractionConfidence, ExtractedField } from '@/types';
import { sanitizeWineName } from '@/utils/wineNameGuard';
import { authFetch } from '@/utils/authFetch';
import { firebaseConfig } from '@/config/firebaseConfig';

const GEMINI_PROXY_URL = process.env.GEMINI_PROXY_URL ||
  `https://australia-southeast1-${firebaseConfig.projectId}.cloudfunctions.net/gemini`;

async function callGeminiProxy(body: { model: string; contents: any[]; systemInstruction?: string }, signal?: AbortSignal) {
  const res = await authFetch(GEMINI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new ExtractionError(`Gemini proxy error: ${res.status}`, 'PROXY_ERROR');
  return res.json();
}

export type ExtractionErrorCode = 'PROXY_ERROR' | 'PARSE_ERROR' | 'TIMEOUT' | 'UNKNOWN';

export class ExtractionError extends Error {
  code: ExtractionErrorCode;
  constructor(message: string, code: ExtractionErrorCode = 'UNKNOWN') {
    super(message);
    this.name = 'ExtractionError';
    this.code = code;
  }
}

const SYSTEM_INSTRUCTION = `You are a wine label extraction AI. Analyze the provided wine label image and extract all visible information.

Return ONLY valid JSON (no markdown fences) with this exact structure:
{
  "producer": { "value": "string or null", "confidence": "high|medium|low" },
  "name": { "value": "string or null", "confidence": "high|medium|low" },
  "vintage": { "value": number_or_null, "confidence": "high|medium|low" },
  "type": { "value": "Red|White|Rosé|Sparkling|Dessert|Fortified|null", "confidence": "high|medium|low" },
  "cepage": { "value": "string or null", "confidence": "high|medium|low" },
  "region": { "value": "string or null", "confidence": "high|medium|low" },
  "country": { "value": "string or null", "confidence": "high|medium|low" },
  "appellation": { "value": "string or null", "confidence": "high|medium|low" },
  "tastingNotes": { "value": "string or null", "confidence": "high|medium|low" },
  "format": { "value": "string or null", "confidence": "high|medium|low" },
  "drinkFrom": { "value": number_or_null, "confidence": "high|medium|low" },
  "drinkUntil": { "value": number_or_null, "confidence": "high|medium|low" },
  "imageQuality": "high|medium|low"
}

Rules:
- WINE NAME: The "name" field is the cuvee/bottling name ONLY. It must NEVER match or contain the producer name or grape variety. If no distinct cuvee name is visible, set name to null.
- Only extract what is clearly visible on the label
- Set confidence to "high" if text is clearly legible, "medium" if partially visible/inferred, "low" if guessed from context
- For wine type, infer from grape variety, colour cues, or label text if not explicitly stated
- For region/country, infer from appellation if possible
- For format, default to "750ml" if not visible (confidence: "low")
- For drinkFrom/drinkUntil, estimate based on wine type and vintage if not stated (confidence: "low")
- Return null values for fields you cannot determine at all`;

function computeMaturity(drinkFrom: number | null, drinkUntil: number | null): string {
  const year = new Date().getFullYear();
  if (!drinkFrom || !drinkUntil) return 'Unknown';
  if (year >= drinkFrom && year <= drinkUntil) return 'Drink Now';
  if (year < drinkFrom) return 'Hold';
  return 'Past Peak';
}

function parseResponse(rawText: string): { fields: Partial<Wine>; extraction: ExtractionResult } {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ExtractionError('Failed to parse extraction response as JSON', 'PARSE_ERROR');
  }

  const extractionFields: Record<string, ExtractedField> = {};
  const wineFields: Partial<Wine> = {};

  const fieldKeys = [
    'producer', 'name', 'vintage', 'type', 'cepage', 'region', 'country',
    'appellation', 'tastingNotes', 'format', 'drinkFrom', 'drinkUntil'
  ];

  let filledCount = 0;
  let totalConfidence = 0;

  for (const key of fieldKeys) {
    const raw = parsed[key];
    if (raw && typeof raw === 'object' && 'value' in raw) {
      const confidence = (['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : 'low') as ExtractionConfidence;
      extractionFields[key] = { value: raw.value, confidence };
      if (raw.value != null) {
        (wineFields as any)[key] = raw.value;
        filledCount++;
        totalConfidence += confidence === 'high' ? 1 : confidence === 'medium' ? 0.6 : 0.3;
      }
    }
  }

  // Sanitize name (remove if it duplicates producer or cepage)
  const sanitized = sanitizeWineName(wineFields);
  Object.assign(wineFields, sanitized);

  // Set defaults
  if (!wineFields.quantity) wineFields.quantity = 1;
  if (!wineFields.price) wineFields.price = 0;
  if (!wineFields.format) wineFields.format = '750ml';

  // Compute maturity
  const drinkFrom = wineFields.drinkFrom as number | undefined;
  const drinkUntil = wineFields.drinkUntil as number | undefined;
  wineFields.maturity = computeMaturity(drinkFrom ?? null, drinkUntil ?? null) as Wine['maturity'];

  const avgConfidence = filledCount > 0 ? totalConfidence / filledCount : 0;
  const status = filledCount >= 4 ? 'complete' : filledCount >= 2 ? 'partial' : 'failed';

  const imageQuality = (['high', 'medium', 'low'].includes(parsed.imageQuality) ? parsed.imageQuality : null) as ExtractionResult['imageQuality'];

  return {
    fields: wineFields,
    extraction: {
      fields: extractionFields,
      status,
      imageQuality,
    },
  };
}

/**
 * Extract wine data from a label image via Gemini.
 * @param base64 - Base64-encoded JPEG (no data URI prefix)
 * @param timeoutMs - Abort after this many ms (default 12000)
 */
export async function extractWineFromLabel(
  base64: string,
  timeoutMs = 12000
): Promise<{ fields: Partial<Wine>; extraction: ExtractionResult }> {
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY = 2000;
  let lastError: ExtractionError | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await callGeminiProxy(
        {
          model: CONFIG.MODELS.TEXT,
          systemInstruction: SYSTEM_INSTRUCTION,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { data: base64, mimeType: 'image/jpeg' } },
                { text: 'Extract all wine information from this label image.' },
              ],
            },
          ],
        },
        controller.signal
      );

      const text = response?.text;
      if (!text) throw new ExtractionError('Empty response from Gemini', 'PARSE_ERROR');

      return parseResponse(text);
    } catch (e: any) {
      clearTimeout(timer);

      if (e.name === 'AbortError') {
        throw new ExtractionError('Label extraction timed out', 'TIMEOUT');
      }

      const err = e instanceof ExtractionError ? e : new ExtractionError(e.message || 'Extraction failed', 'UNKNOWN');
      lastError = err;

      // Only retry on PROXY_ERROR
      if (err.code === 'PROXY_ERROR' && attempt < MAX_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new ExtractionError('Extraction failed', 'UNKNOWN');
}
