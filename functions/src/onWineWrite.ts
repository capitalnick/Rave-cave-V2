import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getApps, initializeApp} from "firebase-admin/app";

if (getApps().length === 0) initializeApp();

const db = getFirestore();
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Firestore field names (Title Case) used for embedding text
const DESCRIPTIVE_FIELDS: Record<string, string> = {
  producer: "Producer",
  name: "Wine name",
  vintage: "Vintage",
  type: "Wine type",
  cepage: "Cépage",
  appellation: "Appellation",
  region: "Region",
  country: "Country",
  tastingNotes: "Tasting Notes",
  personalNote: "Personal Note",
  maturity: "Maturity",
  drinkFrom: "Drink From",
  drinkUntil: "Drink Until",
};

/**
 * Builds a single text string from descriptive fields.
 * @param {Record<string, unknown>} data Wine document data.
 * @return {string} Concatenated descriptive text.
 */
function buildEmbeddingText(
  data: Record<string, unknown>
): string {
  const parts: string[] = [];
  for (const [, fsKey] of Object.entries(DESCRIPTIVE_FIELDS)) {
    const val = data[fsKey];
    if (val !== undefined && val !== null && val !== "" && val !== 0) {
      parts.push(String(val));
    }
  }
  return parts.join(". ");
}

/**
 * Checks whether descriptive fields changed.
 * @param {Record<string, unknown> | undefined} before Data
 *   before the write.
 * @param {Record<string, unknown> | undefined} after Data
 *   after the write.
 * @return {boolean} True if re-embedding is needed.
 */
function needsReembedding(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
): boolean {
  if (!before || !after) return true; // Create or delete

  // Check if any descriptive field changed
  for (const fsKey of Object.values(DESCRIPTIVE_FIELDS)) {
    if (String(before[fsKey] ?? "") !== String(after[fsKey] ?? "")) {
      return true;
    }
  }
  return false;
}

export const onWineWrite = onDocumentWritten(
  {
    document: "wines/{wineId}",
    region: "australia-southeast1",
    secrets: [GEMINI_API_KEY],
  },
  async (event) => {
    const wineId = event.params.wineId;
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    // Document deleted — nothing to embed
    if (!afterData) {
      logger.info(`Wine ${wineId} deleted, skipping embedding`);
      return;
    }

    // Check if descriptive fields actually changed
    if (beforeData && !needsReembedding(beforeData, afterData)) {
      logger.info(
        `Wine ${wineId}: only non-descriptive` +
        " fields changed, skipping embedding"
      );
      return;
    }

    const text = buildEmbeddingText(afterData);
    if (!text) {
      logger.warn(`Wine ${wineId}: no descriptive text to embed`);
      return;
    }

    try {
      const apiKey = GEMINI_API_KEY.value();
      const {GoogleGenAI} = await import("@google/genai");
      const ai = new GoogleGenAI({apiKey});

      const result = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: text,
        config: {outputDimensionality: 768},
      });

      const embedding = result.embeddings?.[0]?.values;
      if (!embedding || embedding.length === 0) {
        logger.error(`Wine ${wineId}: empty embedding returned`);
        return;
      }

      await db.collection("wines").doc(wineId).update({
        embedding: FieldValue.vector(embedding),
      });

      logger.info(
        `Wine ${wineId}: embedding generated` +
        ` (${embedding.length} dims)`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error(`Wine ${wineId}: embedding failed`, {error: msg});
      // Don't throw — let the original write succeed
    }
  }
);
