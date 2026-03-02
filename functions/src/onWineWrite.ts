import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {buildEmbeddingText, needsReembedding} from "./embeddingUtils";
import {REGION, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL} from "./config";

const db = getFirestore();
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

export const onWineWrite = onDocumentWritten(
  {
    document: "users/{userId}/wines/{wineId}",
    region: REGION,
    secrets: [GEMINI_API_KEY],
  },
  async (event) => {
    const userId = event.params.userId;
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
        model: EMBEDDING_MODEL,
        contents: text,
        config: {outputDimensionality: EMBEDDING_DIMENSIONS},
      });

      const embedding = result.embeddings?.[0]?.values;
      if (!embedding || embedding.length === 0) {
        logger.error(`Wine ${wineId}: empty embedding returned`);
        return;
      }

      await db.collection("users").doc(userId).collection("wines")
        .doc(wineId).update({
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
