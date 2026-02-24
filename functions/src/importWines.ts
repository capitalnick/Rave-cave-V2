import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import Papa from "papaparse";
import {validateAuth, AuthError} from "./authMiddleware";
import {ALLOWED_ORIGINS} from "./cors";
import {checkRateLimit, RATE_LIMITS} from "./rateLimit";

const db = getFirestore();
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const FREE_TIER_MAX_BOTTLES = 50;

/**
 * Maps camelCase Wine fields to their Title Case Firestore field names.
 * Must stay in sync with FIRESTORE_FIELD_MAP in src/types.ts.
 */
const FIRESTORE_FIELD_MAP: Record<string, string> = {
  producer: "Producer",
  name: "Wine name",
  vintage: "Vintage",
  type: "Wine type",
  cepage: "Cépage",
  grapeVarieties: "Grape Varieties",
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
  linkToWine: "Link to wine",
  imageUrl: "Label image",
  thumbnailUrl: "Thumbnail URL",
  price: "Bottle Price",
  format: "Format",
  processingStatus: "Processing Status",
};

/**
 * Convert a camelCase wine object to Title Case Firestore doc.
 * @param {Record<string, unknown>} wine The wine with camelCase keys.
 * @return {Record<string, unknown>} Doc with Title Case keys.
 */
function wineToFirestoreDoc(
  wine: Record<string, unknown>
): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(wine)) {
    const firestoreKey = FIRESTORE_FIELD_MAP[key] || key;
    doc[firestoreKey] = value;
  }
  return doc;
}

// Rave Cave Wine fields that can be imported
const IMPORTABLE_FIELDS = [
  "producer",
  "name",
  "vintage",
  "type",
  "cepage",
  "region",
  "country",
  "appellation",
  "quantity",
  "drinkFrom",
  "drinkUntil",
  "price",
  "format",
  "tastingNotes",
  "personalNote",
  "myRating",
  "vivinoRating",
  "linkToWine",
  "imageUrl",
] as const;

type ImportableField = typeof IMPORTABLE_FIELDS[number];

interface FieldMapping {
  csvColumn: string;
  raveCaveField: ImportableField | null;
  confidence: "high" | "medium" | "low";
  sampleValues: string[];
}

// ── mapImportFields ──

export const mapImportFields = onRequest(
  {
    region: "australia-southeast1",
    cors: ALLOWED_ORIGINS,
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

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

    const allowed = await checkRateLimit(
      uid, "mapImportFields", RATE_LIMITS.mapImportFields
    );
    if (!allowed) {
      res.status(429).json({error: "Rate limit exceeded"});
      return;
    }

    const {csv} = req.body as { csv?: string };
    if (!csv || typeof csv !== "string") {
      res.status(400).json({error: "Missing csv field in request body"});
      return;
    }

    if (csv.length > 5 * 1024 * 1024) {
      res.status(400).json({error: "CSV too large. Maximum 5MB."});
      return;
    }

    try {
      const parsed = Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
      });

      if (parsed.errors.length > 0 && parsed.data.length === 0) {
        res.status(400).json({
          error: "Failed to parse CSV",
          details: parsed.errors.slice(0, 5).map((e) => e.message),
        });
        return;
      }

      const headers = parsed.meta.fields || [];
      const rows = parsed.data as Record<string, string>[];

      if (headers.length === 0) {
        res.status(400).json({error: "No columns found in CSV"});
        return;
      }
      if (rows.length === 0) {
        res.status(400).json({error: "No data rows found in CSV"});
        return;
      }
      if (rows.length > 2000) {
        res.status(400).json({
          error: `CSV has ${rows.length} rows. Maximum 2000 wines per import.`,
        });
        return;
      }

      // Build sample table for Gemini
      const sampleRows = rows.slice(0, 3);
      const sampleTable = [
        headers.join(" | "),
        headers.map(() => "---").join(" | "),
        ...sampleRows.map(
          (row) => headers.map((h) => row[h] || "").join(" | ")
        ),
      ].join("\n");

      const fieldList = IMPORTABLE_FIELDS
        .map((f) => `- ${f}`)
        .join("\n");
      const prompt = [
        "You are mapping columns from a wine CSV " +
        "to a wine database schema.",
        "",
        "Target fields:",
        fieldList,
        "",
        "CSV data (headers + first 3 rows):",
        "",
        sampleTable,
        "",
        "For each CSV column, determine which " +
        "target field it maps to (or null to skip).",
        "Rate confidence: high, medium, or low.",
        "",
        "Common mappings:",
        "- Wine/Wine Name/Label -> name",
        "- Winery/Producer/Estate -> producer",
        "- Varietal/Grape/Variety -> cepage",
        "- Color/Wine Type/Category -> type " +
        "(Red/White/Rosé/Sparkling/Dessert/Fortified)",
        "- Size/Bottle Size/Format -> format",
        "- Qty/Quantity/Bottles/Count -> quantity",
        "- BeginConsume/Drink From -> drinkFrom",
        "- EndConsume/Drink To/Drink Until -> drinkUntil",
        "- Drinking Window (range like 2024-2030) " +
        "-> TWO entries: drinkFrom AND drinkUntil",
        "- Locale/Country -> country",
        "- Location -> skip (storage, not origin)",
        "- CT/CT Score/Wine ratings count -> skip",
        "- Average rating -> vivinoRating (Vivino)",
        "- Price/Cost/Valuation -> price",
        "- My Score/My Rating/Your rating -> myRating",
        "- Notes/Tasting Notes/Your review -> tastingNotes",
        "- Private Note/My Notes -> personalNote",
        "- Appellation/Sub-Region -> appellation",
        "- Link to wine -> linkToWine",
        "- Label image -> imageUrl",
        "- Scan date/Wishlisted date -> skip",
        "",
        "IMPORTANT: If a column has date ranges " +
        "like 2024-2030, map as TWO entries: " +
        "drinkFrom AND drinkUntil.",
        "",
        "Respond ONLY with valid JSON, no backticks:",
        "{",
        "  \"mappings\": [",
        "    { \"csvColumn\": \"Wine\", " +
        "\"raveCaveField\": \"name\", " +
        "\"confidence\": \"high\" },",
        "    { \"csvColumn\": \"Loc\", " +
        "\"raveCaveField\": null, " +
        "\"confidence\": \"high\" }",
        "  ],",
        "  \"detectedSource\": " +
        "\"cellartracker\"|\"vivino\"|\"generic\",",
        "  \"notes\": \"Brief notes\"",
        "}",
      ].join("\n");

      const {GoogleGenAI} = await import("@google/genai");
      const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY.value()});

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          temperature: 0.1,
          maxOutputTokens: 2000,
        },
      });

      const responseText = result.text?.trim() || "";

      let aiMapping: {
        mappings: {
          csvColumn: string;
          raveCaveField: string | null;
          confidence: string;
        }[];
        detectedSource: string;
        notes: string;
      };

      try {
        const cleaned = responseText.replace(/```json|```/g, "").trim();
        aiMapping = JSON.parse(cleaned);
      } catch (_e) {
        logger.error("Failed to parse Gemini mapping response", {
          responseText,
        });
        // Fallback: return headers with no mapping
        const fallbackMappings: FieldMapping[] = headers.map((h) => ({
          csvColumn: h,
          raveCaveField: null,
          confidence: "low" as const,
          sampleValues: sampleRows
            .map((r) => r[h] || "")
            .filter(Boolean)
            .slice(0, 3),
        }));

        res.json({
          mappings: fallbackMappings,
          detectedSource: "unknown",
          notes: "AI mapping failed. Please map columns manually.",
          totalRows: rows.length,
          parseWarnings: parsed.errors.slice(0, 5).map((e) => e.message),
        });
        return;
      }

      // Enrich with sample values
      const enrichedMappings: FieldMapping[] = aiMapping.mappings.map((m) => ({
        csvColumn: m.csvColumn,
        raveCaveField: (m.raveCaveField as ImportableField) || null,
        confidence: (m.confidence as "high" | "medium" | "low") || "low",
        sampleValues: sampleRows
          .map((r) => r[m.csvColumn] || "")
          .filter(Boolean)
          .slice(0, 3),
      }));

      // Deduplicate target fields (allow drinkFrom+drinkUntil from same col)
      const usedFields = new Set<string>();
      for (const m of enrichedMappings) {
        if (m.raveCaveField) {
          if (usedFields.has(m.raveCaveField)) {
            // Allow drinkFrom/drinkUntil pair from same column
            const isDrinkPair =
              m.raveCaveField === "drinkFrom" ||
              m.raveCaveField === "drinkUntil";
            const otherField =
              m.raveCaveField === "drinkFrom" ? "drinkUntil" : "drinkFrom";
            const existingEntry = enrichedMappings.find(
              (e) =>
                e !== m &&
                e.csvColumn === m.csvColumn &&
                e.raveCaveField === otherField
            );
            if (isDrinkPair && existingEntry) {
              // This is the valid range split — keep it
              continue;
            }
            m.raveCaveField = null;
            m.confidence = "low";
          } else {
            usedFields.add(m.raveCaveField);
          }
        }
      }

      res.json({
        mappings: enrichedMappings,
        detectedSource: aiMapping.detectedSource || "generic",
        notes: aiMapping.notes || "",
        totalRows: rows.length,
        parseWarnings: parsed.errors.slice(0, 5).map((e) => e.message),
      });

      logger.info("Import mapping completed", {
        uid,
        source: aiMapping.detectedSource,
        columns: headers.length,
        rows: rows.length,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("mapImportFields failed", {uid, error: msg});
      res.status(500).json({error: "Failed to process CSV"});
    }
  }
);

// ── commitImport ──

interface CommitRequest {
  csv: string;
  mappings: { csvColumn: string; raveCaveField: string | null }[];
  maxWines?: number;
}

interface ImportResult {
  imported: number;
  duplicatesMerged: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

export const commitImport = onRequest(
  {
    region: "australia-southeast1",
    cors: ALLOWED_ORIGINS,
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

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

    const allowed = await checkRateLimit(
      uid, "commitImport", RATE_LIMITS.commitImport
    );
    if (!allowed) {
      res.status(429).json({error: "Rate limit exceeded"});
      return;
    }

    const {csv, mappings, maxWines} = req.body as CommitRequest;

    if (!csv || !mappings) {
      res.status(400).json({error: "Missing csv or mappings"});
      return;
    }

    try {
      // 1. Parse CSV
      const parsed = Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
      });
      const rows = parsed.data as Record<string, string>[];

      // 2. Server-side tier cap
      const profileDoc = await db
        .doc(`users/${uid}/profile/preferences`)
        .get();
      const tier = profileDoc.data()?.tier || "free";

      const winesSnap = await db.collection(`users/${uid}/wines`).get();
      const currentBottles = winesSnap.docs.reduce((sum, doc) => {
        const d = doc.data();
        return sum + (d["Quantity"] || d.quantity || 0);
      }, 0);

      let importLimit: number;
      if (tier === "premium") {
        importLimit = rows.length;
      } else {
        const remaining = Math.max(0, FREE_TIER_MAX_BOTTLES - currentBottles);
        importLimit = Math.min(
          rows.length,
          maxWines || remaining,
          remaining
        );
      }

      // 3. Build active mapping (skip nulls)
      const activeMapping = mappings.filter((m) => m.raveCaveField !== null);

      // 4. Transform rows to Wine objects
      const wines: Record<string, unknown>[] = [];
      const skippedRows: { row: number; reason: string }[] = [];

      for (let i = 0; i < rows.length && wines.length < importLimit; i++) {
        const row = rows[i];
        const wine: Record<string, unknown> = {};

        for (const m of activeMapping) {
          const rawValue = row[m.csvColumn]?.trim() || "";
          if (!rawValue) continue;
          const field = m.raveCaveField as string;
          wine[field] = coerceValue(field, rawValue);
        }

        // Validate: must have at least producer or name
        if (!wine.producer && !wine.name) {
          skippedRows.push({
            row: i + 2,
            reason: "Missing producer and wine name",
          });
          continue;
        }

        // Ensure producer is always set
        if (!wine.producer && wine.name) {
          wine.producer = wine.name;
        } else if (wine.producer && !wine.name) {
          wine.name = wine.producer;
        }

        // Defaults for missing fields
        if (!wine.quantity || (wine.quantity as number) < 1) {
          wine.quantity = 1;
        }
        if (!wine.vintage) wine.vintage = 0;
        if (!wine.format) wine.format = "750ml";
        if (!wine.country) wine.country = "";
        if (!wine.region) wine.region = "";

        wines.push(wine);
      }

      // 5. Load existing wines for duplicate detection
      const existingWines = winesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 6. Duplicate detection
      const duplicatesMerged: string[] = [];
      const winesToCreate: Record<string, unknown>[] = [];
      const quantityUpdates: { docId: string; addQuantity: number }[] = [];

      for (const wine of wines) {
        const match = findDuplicate(wine, existingWines);
        if (match) {
          quantityUpdates.push({
            docId: match.id,
            addQuantity: (wine.quantity as number) || 1,
          });
          duplicatesMerged.push(match.id);
        } else {
          winesToCreate.push(wine);
        }
      }

      // 7. Batch write to Firestore (max 400 per batch)
      const BATCH_SIZE = 400;
      let importedCount = 0;

      for (let i = 0; i < winesToCreate.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = winesToCreate.slice(i, i + BATCH_SIZE);

        for (const wine of chunk) {
          const docRef = db.collection(`users/${uid}/wines`).doc();
          batch.set(docRef, {
            ...wineToFirestoreDoc(wine),
            createdAt: FieldValue.serverTimestamp(),
          });
          importedCount++;
        }

        await batch.commit();
      }

      // Update quantities for duplicates
      for (let i = 0; i < quantityUpdates.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = quantityUpdates.slice(i, i + BATCH_SIZE);

        for (const update of chunk) {
          const docRef = db.doc(`users/${uid}/wines/${update.docId}`);
          batch.update(docRef, {
            "Quantity": FieldValue.increment(update.addQuantity),
          });
        }

        await batch.commit();
      }

      const result: ImportResult = {
        imported: importedCount,
        duplicatesMerged: duplicatesMerged.length,
        skipped: skippedRows.length,
        errors: skippedRows.slice(0, 20),
      };

      logger.info("Import completed", {uid, ...result});
      res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("commitImport failed", {uid, error: msg});
      res.status(500).json({error: "Import failed. Please try again."});
    }
  }
);

// ── Helpers ──

/**
 * Coerce CSV string values to correct types for Wine fields.
 * @param {string} field The target Wine field name.
 * @param {string} raw The raw CSV string value.
 * @return {unknown} The coerced value.
 */
function coerceValue(field: string, raw: string): unknown {
  switch (field) {
  case "vintage":
  case "drinkFrom":
  case "drinkUntil": {
    if (/^(nv|n\.v\.|non.?vintage)$/i.test(raw)) return 0;
    // Handle range: "2024-2030" or "2024 – 2030"
    const rangeMatch = raw.match(/(\d{4})\s*[-–]\s*(\d{4})/);
    if (rangeMatch) {
      return field === "drinkFrom" ?
        parseInt(rangeMatch[1], 10) :
        parseInt(rangeMatch[2], 10);
    }
    const year = parseInt(raw, 10);
    return isNaN(year) ? 0 : year;
  }
  case "quantity": {
    const qty = parseInt(raw, 10);
    return isNaN(qty) || qty < 1 ? 1 : qty;
  }
  case "price":
  case "vivinoRating":
  case "myRating": {
    const num = parseFloat(raw.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  }
  case "type": {
    const lower = raw.toLowerCase();
    if (lower.includes("red")) return "Red";
    if (lower.includes("white")) return "White";
    if (
      lower.includes("ros") ||
        lower.includes("rosé") ||
        lower.includes("rose")
    ) return "Rosé";
    if (
      lower.includes("spark") ||
        lower.includes("champagne") ||
        lower.includes("cava") ||
        lower.includes("prosecco") ||
        lower.includes("crémant")
    ) return "Sparkling";
    if (
      lower.includes("dessert") ||
        lower.includes("sweet") ||
        lower.includes("ice wine") ||
        lower.includes("sauternes") ||
        lower.includes("tokaji")
    ) return "Dessert";
    if (
      lower.includes("fortif") ||
        lower.includes("port") ||
        lower.includes("sherry") ||
        lower.includes("madeira") ||
        lower.includes("marsala")
    ) return "Fortified";
    return raw; // Keep original if unrecognised
  }
  case "format": {
    const lower = raw.toLowerCase().replace(/\s+/g, "");
    if (
      lower.includes("1.5l") ||
        lower.includes("1500") ||
        lower.includes("magnum")
    ) return "1500ml";
    if (lower.includes("375") || lower.includes("half")) return "375ml";
    if (
      lower.includes("3l") ||
        lower.includes("3000") ||
        lower.includes("jeroboam")
    ) return "3000ml";
    return "750ml";
  }
  default:
    return raw;
  }
}

/**
 * Find a duplicate in existing wines.
 * Match: normalised producer + name + vintage.
 * @param {Record<string, unknown>} wine The imported wine.
 * @param {Record<string, unknown>[]} existing Existing cellar wines.
 * @return {{ id: string } | null} The duplicate match or null.
 */
function findDuplicate(
  wine: Record<string, unknown>,
  existing: Record<string, unknown>[]
): { id: string } | null {
  const normalise = (s: unknown) =>
    String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const wProducer = normalise(wine.producer);
  const wName = normalise(wine.name);
  const wVintage = (wine.vintage as number) || 0;

  for (const e of existing) {
    // Existing docs use Title Case keys from Firestore
    const eProducer = normalise(e["Producer"] || e.producer);
    const eName = normalise(e["Wine name"] || e.name);
    const eVintage = (
      (e["Vintage"] as number) || (e.vintage as number) || 0
    );

    // Exact match on all three
    if (
      wProducer === eProducer &&
      wName === eName &&
      wVintage === eVintage
    ) {
      return {id: e.id as string};
    }

    // Fuzzy: producer + vintage match, name is substring
    if (wVintage === eVintage && wProducer === eProducer) {
      if (
        wName && eName &&
        (wName.includes(eName) || eName.includes(wName))
      ) {
        return {id: e.id as string};
      }
    }
  }

  return null;
}
