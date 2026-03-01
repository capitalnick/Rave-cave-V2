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

// ── Deterministic column mapping for known CSV formats ──
// Case-insensitive lookup: handles CellarTracker, Vivino, and common variants
// without needing an AI call for well-known columns.

const KNOWN_COLUMN_MAP: Record<string, ImportableField | null> = {
  // Identity / IDs — skip
  "iwine": null,
  "barcode": null,
  "producerwineid": null,

  // Producer
  "producer": "producer",
  "winery": "producer",
  "estate": "producer",
  "domaine": "producer",
  "house": "producer",

  // Wine name
  "wine": "name",
  "wine name": "name",
  "winename": "name",
  "label": "name",
  "cuvee": "name",
  "cuvée": "name",

  // Vintage
  "vintage": "vintage",
  "year": "vintage",

  // Wine type / colour
  "color": "type",
  "colour": "type",
  "wine type": "type",
  "winetype": "type",
  "wine color": "type",
  "wine colour": "type",

  // "Type" can mean wine type (Red/White) in generic CSVs,
  // or Still/Sparkling in CellarTracker. When Color column also
  // exists, Type is demoted in the conflict resolution step below.
  "type": "type",
  // CellarTracker "Category" = Wine/Beer — skip
  "category": null,

  // Grape
  "mastervarietal": "cepage",
  "varietal": "cepage",
  "grape": "cepage",
  "grape variety": "cepage",
  "grapes": "cepage",
  "variety": "cepage",
  "cépage": "cepage",
  "cepage": "cepage",

  // Geography
  "country": "country",
  "region": "region",
  "appellation": "appellation",
  // CellarTracker locale / subregion — skip (redundant)
  "locale": null,
  "subregion": null,
  "sub-region": null,
  "sub region": null,

  // Storage — skip
  "location": null,
  "bin": null,

  // Quantity
  "quantity": "quantity",
  "qty": "quantity",
  "bottles": "quantity",
  "count": "quantity",

  // Price
  "price": "price",
  "cost": "price",
  "bottle price": "price",
  // Valuation / currency — skip
  "valuation": null,
  "currency": null,

  // Drinking window
  "beginconsume": "drinkFrom",
  "begin consume": "drinkFrom",
  "drink from": "drinkFrom",
  "drinkfrom": "drinkFrom",
  "endconsume": "drinkUntil",
  "end consume": "drinkUntil",
  "drink to": "drinkUntil",
  "drink until": "drinkUntil",
  "drinkuntil": "drinkUntil",

  // Ratings
  "myscore": "myRating",
  "my score": "myRating",
  "my rating": "myRating",
  "your rating": "myRating",
  "ctscore": null, // CellarTracker community score — skip
  "ct score": null,
  "average rating": "vivinoRating",
  "rating": "vivinoRating",
  "vivino rating": "vivinoRating",

  // Notes
  "tasting notes": "tastingNotes",
  "tastingnotes": "tastingNotes",
  "notes": "tastingNotes",
  "your review": "tastingNotes",
  "private note": "personalNote",
  "my notes": "personalNote",
  "personal note": "personalNote",

  // Format
  "size": "format",
  "bottle size": "format",
  "format": "format",

  // Links & images
  "link to wine": "linkToWine",
  "imageurl": "imageUrl",
  "image url": "imageUrl",
  "image": "imageUrl",
  "label image": "imageUrl",

  // Vivino-specific skips
  "scan date": null,
  "wishlisted date": null,
  "wine id": null,
  "wine style": null,
  "food pairing": null,
};

/**
 * Normalise a header for lookup: lowercase, strip separators.
 * "Bottle_Price" -> "bottle price", "DrinkFrom" -> "drinkfrom"
 * @param {string} header The raw CSV header.
 * @return {string} The normalised key.
 */
function normaliseHeader(header: string): string {
  return header
    .trim()
    .replace(/[_-]+/g, " ") // underscores/dashes → spaces
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase → spaces
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Attempt deterministic mapping for a CSV header.
 * Tries exact lowercase match first, then normalised form.
 * @param {string} header The CSV column header to look up.
 * @return {object} The mapping result with found flag.
 */
function deterministicMap(
  header: string
): { field: ImportableField | null; found: true } | { found: false } {
  // Exact lowercase match
  const key = header.toLowerCase().trim();
  if (key in KNOWN_COLUMN_MAP) {
    return {field: KNOWN_COLUMN_MAP[key], found: true};
  }
  // Normalised match (handles underscores, camelCase, dashes)
  const normalised = normaliseHeader(header);
  if (normalised !== key && normalised in KNOWN_COLUMN_MAP) {
    return {field: KNOWN_COLUMN_MAP[normalised], found: true};
  }
  return {found: false};
}

// ── Value-based inference ──
// When the column name doesn't match, inspect sample values to infer the field.

const WINE_TYPES = new Set([
  "red", "white", "rosé", "rose", "sparkling", "dessert", "fortified",
]);
const COUNTRIES = new Set([
  "australia", "france", "italy", "spain", "germany", "chile",
  "argentina", "new zealand", "south africa", "portugal", "usa",
  "united states", "austria", "greece", "hungary", "lebanon",
  "georgia", "uruguay", "canada", "israel", "england",
]);
const FORMAT_PATTERN = /^\d{3,4}\s*ml$|^\d+(\.\d+)?\s*l$/i;
const YEAR_PATTERN = /^(19|20)\d{2}$/;
const PRICE_PATTERN = /^\$?\d+(\.\d{1,2})?$/;
const URL_PATTERN = /^https?:\/\//i;
const RATING_RANGE = {min: 0, max: 100};

/**
 * Infer a Rave Cave field from sample values when the column name
 * doesn't match the known dictionary.
 * @param {string[]} samples 1-3 non-empty sample values.
 * @param {Set<string>} usedFields Fields already claimed.
 * @return {ImportableField | null} The inferred field or null.
 */
function inferFieldFromValues(
  samples: string[],
  usedFields: Set<string>
): ImportableField | null {
  if (samples.length === 0) return null;
  const cleaned = samples.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;

  // Helper: return field only if not already used
  const claim = (f: ImportableField): ImportableField | null =>
    usedFields.has(f) ? null : f;

  // Wine type — all samples are known types
  if (cleaned.every((v) => WINE_TYPES.has(v.toLowerCase()))) {
    return claim("type");
  }

  // URL — likely imageUrl or linkToWine
  if (cleaned.every((v) => URL_PATTERN.test(v))) {
    if (cleaned.some((v) => /image|img|thumb|label|photo/i.test(v))) {
      return claim("imageUrl") || claim("linkToWine");
    }
    return claim("linkToWine") || claim("imageUrl");
  }

  // Format — "750ml", "1.5L"
  if (cleaned.every((v) => FORMAT_PATTERN.test(v.replace(/\s/g, "")))) {
    return claim("format");
  }

  // Country — all samples are known countries
  if (cleaned.every((v) => COUNTRIES.has(v.toLowerCase()))) {
    return claim("country");
  }

  // Years — 4-digit numbers in 1900–2099 range
  if (cleaned.every((v) => YEAR_PATTERN.test(v))) {
    const years = cleaned.map((v) => parseInt(v, 10));
    const avg = years.reduce((a, b) => a + b, 0) / years.length;
    // Drinking windows are typically future; vintages are past/present
    const currentYear = new Date().getFullYear();
    if (avg > currentYear + 2) {
      return claim("drinkUntil") || claim("drinkFrom");
    }
    return claim("vintage") || claim("drinkFrom");
  }

  // Price — "$35" or "85.00"
  if (cleaned.every((v) => PRICE_PATTERN.test(v))) {
    const nums = cleaned.map((v) =>
      parseFloat(v.replace(/[^0-9.]/g, ""))
    );
    // Prices typically > 5 and < 10000
    if (nums.every((n) => n >= 5 && n <= 10000)) {
      return claim("price");
    }
  }

  // Small integers 1-99 — likely quantity or rating
  if (cleaned.every((v) => /^\d{1,2}$/.test(v))) {
    const nums = cleaned.map((v) => parseInt(v, 10));
    if (nums.every((n) => n >= 1 && n <= 20)) {
      return claim("quantity");
    }
    if (
      nums.every(
        (n) => n >= RATING_RANGE.min && n <= RATING_RANGE.max
      )
    ) {
      return claim("myRating") || claim("vivinoRating");
    }
  }

  return null;
}

/**
 * Detect the CSV source (CellarTracker, Vivino, or generic) from headers.
 * @param {string[]} headers The CSV column headers.
 * @return {string} The detected source identifier.
 */
function detectSourceFromHeaders(headers: string[]): string {
  const lower = headers.map((h) => h.toLowerCase());
  if (lower.includes("iwine") || lower.includes("ctscore")) {
    return "cellartracker";
  }
  if (
    lower.includes("wine id") ||
    lower.includes("wine style") ||
    lower.includes("wishlisted date")
  ) {
    return "vivino";
  }
  return "generic";
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

      const sampleRows = rows.slice(0, 3);
      const detectedSource = detectSourceFromHeaders(headers);

      // ── Phase 1: Deterministic mapping for known columns ──
      // Map all headers without deduplication first — conflicts are
      // resolved in a separate pass before dedup.
      const deterministicMappings: FieldMapping[] = [];
      const unmappedHeaders: string[] = [];

      for (const h of headers) {
        const result = deterministicMap(h);
        if (result.found) {
          deterministicMappings.push({
            csvColumn: h,
            raveCaveField: result.field,
            confidence: "high",
            sampleValues: sampleRows
              .map((r) => r[h] || "")
              .filter(Boolean)
              .slice(0, 3),
          });
        } else {
          unmappedHeaders.push(h);
        }
      }

      // ── Conflict resolution for CellarTracker-specific columns ──
      const lowerHeaders = headers.map((h) => h.toLowerCase());

      // When both "Type" and "Color"/"Colour" exist: "Color" is the wine
      // type (Red/White), "Type" is still/sparkling classification — skip.
      const hasColorCol = lowerHeaders.some(
        (h) => h === "color" || h === "colour"
      );
      const hasTypeCol = lowerHeaders.some((h) => h === "type");
      if (hasColorCol && hasTypeCol) {
        for (const m of deterministicMappings) {
          if (m.csvColumn.toLowerCase() === "type") {
            m.raveCaveField = null;
          }
        }
      }

      // When both "MasterVarietal" and "Varietal" exist: prefer
      // MasterVarietal for cepage, skip Varietal.
      const hasMasterVarietal = lowerHeaders.includes("mastervarietal");
      const hasVarietal = lowerHeaders.includes("varietal");
      if (hasMasterVarietal && hasVarietal) {
        for (const m of deterministicMappings) {
          if (m.csvColumn.toLowerCase() === "varietal") {
            m.raveCaveField = null;
          }
        }
      }

      // ── Deduplicate deterministic mappings ──
      // First occurrence of each target field wins.
      const usedDeterministic = new Set<string>();
      for (const m of deterministicMappings) {
        if (m.raveCaveField) {
          if (usedDeterministic.has(m.raveCaveField)) {
            m.raveCaveField = null;
            m.confidence = "low";
          } else {
            usedDeterministic.add(m.raveCaveField);
          }
        }
      }

      // ── Phase 2: Value-based inference for remaining columns ──
      // Inspect sample values to infer field type even when the column
      // name is unrecognised.
      const inferredMappings: FieldMapping[] = [];
      const stillUnmapped: string[] = [];

      for (const h of unmappedHeaders) {
        const samples = sampleRows
          .map((r) => r[h] || "")
          .filter(Boolean)
          .slice(0, 3);
        const inferred = inferFieldFromValues(
          samples, usedDeterministic
        );
        if (inferred) {
          usedDeterministic.add(inferred);
          inferredMappings.push({
            csvColumn: h,
            raveCaveField: inferred,
            confidence: "medium",
            sampleValues: samples,
          });
        } else {
          stillUnmapped.push(h);
        }
      }

      // ── Phase 3: AI mapping for still-unrecognized columns ──
      let aiMappedColumns: FieldMapping[] = [];

      if (stillUnmapped.length > 0) {
        const sampleTable = [
          stillUnmapped.join(" | "),
          stillUnmapped.map(() => "---").join(" | "),
          ...sampleRows.map(
            (row) => stillUnmapped
              .map((h) => row[h] || "")
              .join(" | ")
          ),
        ].join("\n");

        // Only offer fields not already claimed by tiers 1+2
        const remainingFields = IMPORTABLE_FIELDS
          .filter((f) => !usedDeterministic.has(f));
        const fieldList = remainingFields
          .map((f) => `- ${f}`)
          .join("\n");

        const prompt = [
          "You are mapping columns from a wine CSV " +
          "to a wine database schema.",
          "",
          "Target fields (only these are still available):",
          fieldList,
          "",
          "CSV columns to map (headers + first 3 rows):",
          "",
          sampleTable,
          "",
          "For each CSV column, determine which " +
          "target field it maps to (or null to skip).",
          "Rate confidence: high, medium, or low.",
          "",
          "Respond ONLY with valid JSON, no backticks:",
          "{",
          "  \"mappings\": [",
          "    { \"csvColumn\": \"Col\", " +
          "\"raveCaveField\": \"name\", " +
          "\"confidence\": \"high\" },",
          "    { \"csvColumn\": \"Other\", " +
          "\"raveCaveField\": null, " +
          "\"confidence\": \"high\" }",
          "  ],",
          "  \"notes\": \"Brief notes about unmapped columns\"",
          "}",
        ].join("\n");

        try {
          const {GoogleGenAI} = await import("@google/genai");
          const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY.value()});

          const aiResult = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
              temperature: 0.1,
              maxOutputTokens: 4000,
            },
          });

          const responseText = aiResult.text?.trim() || "";
          const cleaned = responseText
            .replace(/```json|```/g, "")
            .trim();
          const parsed2 = JSON.parse(cleaned);

          aiMappedColumns = (parsed2.mappings || []).map(
            (m: {
              csvColumn: string;
              raveCaveField: string | null;
              confidence: string;
            }) => ({
              csvColumn: m.csvColumn,
              raveCaveField:
                (m.raveCaveField as ImportableField) || null,
              confidence:
                (m.confidence as "high" | "medium" | "low") || "low",
              sampleValues: sampleRows
                .map((r) => r[m.csvColumn] || "")
                .filter(Boolean)
                .slice(0, 3),
            })
          );
        } catch (aiErr) {
          logger.warn("AI mapping failed for remaining columns", {
            error: aiErr instanceof Error ?
              aiErr.message :
              String(aiErr),
            stillUnmapped,
          });
          // Fallback: mark remaining columns as skip
          aiMappedColumns = stillUnmapped.map((h) => ({
            csvColumn: h,
            raveCaveField: null,
            confidence: "low" as const,
            sampleValues: sampleRows
              .map((r) => r[h] || "")
              .filter(Boolean)
              .slice(0, 3),
          }));
        }
      }

      // ── Merge all tiers: deterministic → inferred → AI ──
      // Preserve original CSV column order
      const inferredMap = new Map(
        inferredMappings.map((m) => [m.csvColumn, m])
      );
      const aiMap = new Map(
        aiMappedColumns.map((m) => [m.csvColumn, m])
      );
      const enrichedMappings: FieldMapping[] = headers.map((h) => {
        const det = deterministicMappings.find(
          (m) => m.csvColumn === h
        );
        if (det) return det;
        const inf = inferredMap.get(h);
        if (inf) return inf;
        return aiMap.get(h) || {
          csvColumn: h,
          raveCaveField: null,
          confidence: "low" as const,
          sampleValues: sampleRows
            .map((r) => r[h] || "")
            .filter(Boolean)
            .slice(0, 3),
        };
      });

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

      const deterministicCount = deterministicMappings
        .filter((m) => m.raveCaveField !== null).length;
      const inferredCount = inferredMappings.length;
      const aiCount = aiMappedColumns
        .filter((m) => m.raveCaveField !== null).length;
      const totalMapped = deterministicCount + inferredCount + aiCount;
      const notes = stillUnmapped.length === 0 && unmappedHeaders.length === 0 ?
        `All ${headers.length} columns matched automatically.` :
        [
          `${deterministicCount} matched by name`,
          inferredCount > 0 ?
            `${inferredCount} inferred from values` : null,
          aiCount > 0 ? `${aiCount} mapped by AI` : null,
          stillUnmapped.length - aiCount > 0 ?
            `${stillUnmapped.length - aiCount} need manual review` :
            null,
        ].filter(Boolean).join(", ") + ".";

      res.json({
        mappings: enrichedMappings,
        detectedSource: detectedSource,
        notes,
        totalRows: rows.length,
        parseWarnings: parsed.errors.slice(0, 5).map((e) => e.message),
      });

      logger.info("Import mapping completed", {
        uid,
        source: detectedSource,
        columns: headers.length,
        deterministicHits: deterministicCount,
        inferredFromValues: inferredCount,
        aiMapped: aiCount,
        totalMapped,
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
