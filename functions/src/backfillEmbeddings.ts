import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getApps, initializeApp} from "firebase-admin/app";

if (getApps().length === 0) initializeApp();

const db = getFirestore();
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const ALLOWED_ORIGINS = [
  "https://rave-cave-v2.vercel.app",
  "http://localhost:3000",
];

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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const backfillEmbeddings = onRequest(
  {
    region: "australia-southeast1",
    secrets: [GEMINI_API_KEY],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 540, // 9 minutes for large collections
  },
  async (req, res) => {
    try {
      const apiKey = GEMINI_API_KEY.value();
      const {GoogleGenAI} = await import("@google/genai");
      const ai = new GoogleGenAI({apiKey});

      // Get all wines without embeddings
      const snapshot = await db.collection("wines")
        .where("Producer", "!=", "")
        .get();

      const needsEmbedding = snapshot.docs.filter((d) => {
        const data = d.data();
        return !data.embedding || !Array.isArray(data.embedding);
      });

      logger.info(
        `Backfill: ${needsEmbedding.length} wines need` +
        ` embeddings out of ${snapshot.size} total`
      );

      let processed = 0;
      let failed = 0;
      const BATCH_SIZE = 10;

      for (let i = 0; i < needsEmbedding.length; i += BATCH_SIZE) {
        const batch = needsEmbedding.slice(i, i + BATCH_SIZE);

        for (const doc of batch) {
          const text = buildEmbeddingText(doc.data());
          if (!text) {
            logger.warn(
              `Backfill: Wine ${doc.id}` +
              " has no descriptive text, skipping"
            );
            continue;
          }

          try {
            const result = await ai.models.embedContent({
              model: "text-embedding-004",
              contents: text,
            });

            const embedding = result.embeddings?.[0]?.values;
            if (embedding && embedding.length > 0) {
              await doc.ref.update({
                embedding: FieldValue.vector(embedding),
              });
              processed++;
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.error(`Backfill: Wine ${doc.id} failed`, {error: msg});
            failed++;
          }
        }

        // Rate limit: 1s delay between batches
        if (i + BATCH_SIZE < needsEmbedding.length) {
          await delay(1000);
        }
      }

      const result = {
        total: snapshot.size,
        needed: needsEmbedding.length,
        processed,
        failed,
      };
      logger.info("Backfill complete", result);
      res.status(200).json(result);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("Backfill failed", {error: msg});
      res.status(500).json({error: "Backfill failed", details: msg});
    }
  }
);
