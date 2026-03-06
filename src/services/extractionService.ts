import { CONFIG } from '@/constants';
import type { Wine, ExtractionResult, ExtractionConfidence, ExtractedField } from '@/types';
import { sanitizeWineName } from '@/utils/wineNameGuard';
import { cepageStringToVarieties } from '@/utils/grapeUtils';
import { getMaturityForWine } from '@/utils/maturityUtils';
import { callGeminiProxy } from '@/utils/geminiProxy';

export type ExtractionErrorCode = 'PROXY_ERROR' | 'PARSE_ERROR' | 'TIMEOUT' | 'UNKNOWN';

import { ExtractionError } from './errors';
export { ExtractionError };

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
  "imageQuality": "high|medium|low",
  "isDecorativeLabel": false
}

Rules:
- DECORATIVE LABEL: If the label is purely artistic/decorative with NO readable wine text at all (no producer name, no wine name, no vintage, no region visible as text), set "isDecorativeLabel" to true and set ALL field values to null. A label with even one legible wine-related word is NOT decorative — set "isDecorativeLabel" to false.
- KNOWLEDGE INFERENCE: When you CAN read text on the label (e.g. a wine name or producer), you SHOULD use your wine knowledge to infer related fields like cepage, region, country, and type. Set confidence to "medium" for inferred fields. This is encouraged — only decorative labels (no text at all) should have null fields.
- WINE NAME: The "name" field is the cuvee/bottling name ONLY. It must NEVER match or contain the producer name or grape variety. If no distinct cuvee name is visible, set name to null.
- Only extract what is clearly visible on the label, plus inferences from your wine knowledge when text gives you a starting point
- Set confidence to "high" if text is clearly legible, "medium" if inferred from your wine knowledge, "low" if guessed from context with low certainty
- For wine type, infer from grape variety, colour cues, or label text if not explicitly stated
- For region/country, infer from appellation if possible
- For format, default to "750ml" if not visible (confidence: "low")
- For drinkFrom/drinkUntil, estimate based on wine type and vintage if not stated (confidence: "low")
- Return null values for fields you cannot determine at all`;

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

  // Convert extracted cepage string to grapeVarieties array
  if ((wineFields as any).cepage) {
    wineFields.grapeVarieties = cepageStringToVarieties((wineFields as any).cepage);
    delete (wineFields as any).cepage;
  }
  // Copy cepage confidence to grapeVarieties for UI indicator
  if (extractionFields.cepage) {
    extractionFields.grapeVarieties = extractionFields.cepage;
  }

  // Sanitize name (remove if it duplicates producer or grape variety)
  const sanitized = sanitizeWineName(wineFields);
  Object.assign(wineFields, sanitized);

  // Set defaults
  if (!wineFields.quantity) wineFields.quantity = 1;
  if (!wineFields.price) wineFields.price = 0;
  if (!wineFields.format) wineFields.format = '750ml';

  // Compute maturity
  const drinkFrom = wineFields.drinkFrom as number | undefined;
  const drinkUntil = wineFields.drinkUntil as number | undefined;
  wineFields.maturity = getMaturityForWine(drinkFrom ?? null, drinkUntil ?? null);

  const avgConfidence = filledCount > 0 ? totalConfidence / filledCount : 0;
  const status = filledCount >= 4 ? 'complete' : filledCount >= 2 ? 'partial' : 'failed';

  const imageQuality = (['high', 'medium', 'low'].includes(parsed.imageQuality) ? parsed.imageQuality : null) as ExtractionResult['imageQuality'];
  const isDecorativeLabel = parsed.isDecorativeLabel === true;

  return {
    fields: wineFields,
    extraction: {
      fields: extractionFields,
      status,
      imageQuality,
      isDecorativeLabel,
    },
  };
}

/**
 * Extract wine data from a label image via Gemini.
 * @param base64 - Base64-encoded JPEG (no data URI prefix)
 * @param timeoutMs - Abort after this many ms (default 55000)
 */
export async function extractWineFromLabel(
  base64: string,
  timeoutMs = 55000
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
        ExtractionError as any,
        controller.signal,
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
