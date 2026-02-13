import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getApps, initializeApp} from "firebase-admin/app";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

if (getApps().length === 0) initializeApp();

const db = getFirestore();
const WINES_COLLECTION = "wines";

const ALLOWED_ORIGINS = [
  "https://rave-cave-v2.vercel.app",
  "http://localhost:3000",
];

// Firestore field mapping (copied from client src/types.ts — cannot import)
const FIELD_MAP: Record<string, string> = {
  producer: "Producer",
  name: "Wine name",
  vintage: "Vintage",
  type: "Wine type",
  cepage: "Cépage",
  appellation: "Appellation",
  region: "Region",
  country: "Country",
  quantity: "Quantity",
  drinkFrom: "Drink From",
  drinkUntil: "Drink Until",
  maturity: "Maturity",
  tastingNotes: "Tasting Notes",
  myRating: "My Rating",
  vivinoRating: "Vivino Rating",
  personalNote: "Personal Note",
  imageUrl: "Label image",
  price: "Bottle Price",
  format: "Format",
  processingStatus: "Processing Status",
};

// Reverse map: Firestore key -> app key
const REVERSE_MAP: Record<string, string> = {};
for (const [app, fs] of Object.entries(FIELD_MAP)) {
  REVERSE_MAP[fs] = app;
}

interface QueryParams {
  wineType?: string;
  country?: string;
  region?: string;
  producer?: string;
  grapeVarieties?: string[];
  vintageMin?: number;
  vintageMax?: number;
  priceMin?: number;
  priceMax?: number;
  maturityStatus?: string; // HOLD | DRINK_NOW | PAST_PEAK
  query?: string; // free text search
  semanticQuery?: string; // natural language for vector search
  sortBy?: string; // vintage | price | rating | recentlyAdded
  sortOrder?: string; // asc | desc
  limit?: number;
}

/**
 * Converts a Firestore doc to a client-friendly object.
 * @param {string} docId The Firestore document ID.
 * @param {Record<string, unknown>} data Raw doc data.
 * @return {Record<string, unknown>} Mapped wine object.
 */
function docToWine(
  docId: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  const wine: Record<string, unknown> = {id: docId};
  for (const [appKey, fsKey] of Object.entries(FIELD_MAP)) {
    if (data[fsKey] !== undefined) wine[appKey] = data[fsKey];
  }
  return wine;
}

/**
 * Returns maturity status based on drink window.
 * @param {number} drinkFrom Start year of drink window.
 * @param {number} drinkUntil End year of drink window.
 * @return {string} Maturity status label.
 */
function computeMaturity(
  drinkFrom: number,
  drinkUntil: number
): string {
  const year = new Date().getFullYear();
  if (!drinkFrom || !drinkUntil) return "Unknown";
  if (year >= drinkFrom && year <= drinkUntil) return "Drink Now";
  if (year < drinkFrom) return "Hold";
  return "Past Peak";
}

export const queryInventory = onRequest(
  {
    region: "australia-southeast1",
    secrets: [GEMINI_API_KEY],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 30,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
      }

      const body: QueryParams = typeof req.body === "string" ?
        (JSON.parse(req.body || "{}") as QueryParams) :
        ((req.body ?? {}) as QueryParams);

      const limit = Math.min(Math.max(body.limit || 10, 1), 20);
      let wines: Record<string, unknown>[];

      if (body.semanticQuery) {
        // Semantic search: embed query, findNearest,
        // then filter in-memory
        const apiKey = GEMINI_API_KEY.value();
        const {GoogleGenAI} = await import("@google/genai");
        const ai = new GoogleGenAI({apiKey});

        const embedResult = await ai.models.embedContent({
          model: "text-embedding-004",
          contents: body.semanticQuery,
        });
        const queryVector = embedResult.embeddings?.[0]?.values;
        if (!queryVector || queryVector.length === 0) {
          res.status(500).json({error: "Failed to generate query embedding"});
          return;
        }

        // Vector search: fetch extra candidates for
        // in-memory filtering
        const candidateLimit = Math.min(limit * 3, 60);
        const vectorQuery = db.collection(WINES_COLLECTION)
          .findNearest({
            vectorField: "embedding",
            queryVector: FieldValue.vector(queryVector),
            limit: candidateLimit,
            distanceMeasure: "COSINE",
          });
        const vectorSnapshot = await vectorQuery.get();
        wines = vectorSnapshot.docs.map((d) => docToWine(d.id, d.data()));
      } else {
        // ── Structured search path ──
        let query = db.collection(WINES_COLLECTION)
          .where(FIELD_MAP.producer, "!=", "");

        if (body.wineType) {
          query = query.where(FIELD_MAP.type, "==", body.wineType);
        }
        if (body.country) {
          query = query.where(FIELD_MAP.country, "==", body.country);
        }
        if (body.region) {
          query = query.where(FIELD_MAP.region, "==", body.region);
        }

        const snapshot = await query.get();
        wines = snapshot.docs.map((d) => docToWine(d.id, d.data()));
      }

      // In-memory filters (applied to both structured and semantic results)
      // For semantic path, structured filters apply
      // post-vector-search
      if (body.semanticQuery) {
        if (body.wineType) {
          wines = wines.filter((w) => w.type === body.wineType);
        }
        if (body.country) {
          wines = wines.filter((w) => w.country === body.country);
        }
        if (body.region) {
          wines = wines.filter((w) => w.region === body.region);
        }
      }
      if (body.producer) {
        const p = body.producer.toLowerCase();
        wines = wines.filter((w) =>
          String(w.producer || "").toLowerCase().includes(p)
        );
      }
      if (body.grapeVarieties && body.grapeVarieties.length > 0) {
        const grapes = body.grapeVarieties.map((g) => g.toLowerCase());
        wines = wines.filter((w) => {
          const cepage = String(w.cepage || "").toLowerCase();
          return grapes.some((g) => cepage.includes(g));
        });
      }
      if (body.vintageMin) {
        const min = body.vintageMin;
        wines = wines.filter((w) => Number(w.vintage) >= min);
      }
      if (body.vintageMax) {
        const max = body.vintageMax;
        wines = wines.filter((w) => Number(w.vintage) <= max);
      }
      if (body.priceMin) {
        const min = body.priceMin;
        wines = wines.filter((w) => Number(w.price) >= min);
      }
      if (body.priceMax) {
        const max = body.priceMax;
        wines = wines.filter((w) => Number(w.price) <= max);
      }
      if (body.maturityStatus) {
        const statusMap: Record<string, string> = {
          HOLD: "Hold",
          DRINK_NOW: "Drink Now",
          PAST_PEAK: "Past Peak",
        };
        const target = statusMap[body.maturityStatus];
        if (target) {
          wines = wines.filter((w) => {
            const m = computeMaturity(
              Number(w.drinkFrom) || 0,
              Number(w.drinkUntil) || 0
            );
            return m === target;
          });
        }
      }
      if (body.query) {
        const q = body.query.toLowerCase();
        wines = wines.filter((w) =>
          String(w.producer || "").toLowerCase().includes(q) ||
          String(w.name || "").toLowerCase().includes(q) ||
          String(w.cepage || "").toLowerCase().includes(q) ||
          String(w.region || "").toLowerCase().includes(q) ||
          String(w.appellation || "").toLowerCase().includes(q)
        );
      }

      // Sort
      if (body.sortBy) {
        const order = body.sortOrder === "desc" ? -1 : 1;
        wines.sort((a, b) => {
          let va: number;
          let vb: number;
          switch (body.sortBy) {
          case "vintage":
            va = Number(a.vintage) || 0;
            vb = Number(b.vintage) || 0;
            return (va - vb) * order;
          case "price":
            va = Number(a.price) || 0;
            vb = Number(b.price) || 0;
            return (va - vb) * order;
          case "rating":
            va = Number(a.vivinoRating) || 0;
            vb = Number(b.vivinoRating) || 0;
            return (va - vb) * order;
          default:
            return 0;
          }
        });
      }

      // Apply limit
      const results = wines.slice(0, limit);

      res.status(200).json({
        wines: results,
        total: wines.length,
        returned: results.length,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("queryInventory failed", {error: msg});
      res.status(500).json({error: "queryInventory failed", details: msg});
    }
  }
);
