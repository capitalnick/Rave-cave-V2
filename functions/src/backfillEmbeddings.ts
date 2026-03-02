import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {validateAuth, AuthError} from "./authMiddleware";
import {ALLOWED_ORIGINS} from "./cors";
import {checkRateLimit, RATE_LIMITS} from "./rateLimit";
import {buildEmbeddingText} from "./embeddingUtils";
import {REGION, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL} from "./config";

const db = getFirestore();
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const backfillEmbeddings = onRequest(
  {
    region: REGION,
    secrets: [GEMINI_API_KEY],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 540, // 9 minutes for large collections
  },
  async (req, res) => {
    try {
      let uid: string;
      try {
        uid = await validateAuth(req);
      } catch (e) {
        if (e instanceof AuthError) {
          res.status(401).json({error: "Unauthorized"});
          return;
        }
        throw e;
      }

      const rateLimitAllowed = await checkRateLimit(
        uid, "backfill", RATE_LIMITS.backfill
      );
      if (!rateLimitAllowed) {
        res.status(429).json({error: "Rate limit exceeded. Try again later."});
        return;
      }

      const apiKey = GEMINI_API_KEY.value();
      const {GoogleGenAI} = await import("@google/genai");
      const ai = new GoogleGenAI({apiKey});

      // Get all wines for this user
      const snapshot = await db.collection("users").doc(uid)
        .collection("wines").get();

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
              model: EMBEDDING_MODEL,
              contents: text,
              config: {outputDimensionality: EMBEDDING_DIMENSIONS},
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
