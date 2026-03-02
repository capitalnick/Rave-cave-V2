import {EMBEDDING_FIELDS} from "./fieldMaps";

/**
 * Builds a single text string from descriptive fields for embedding.
 * Includes both legacy "Cépage" and modern "Grape Varieties" fields.
 */
export function buildEmbeddingText(
  data: Record<string, unknown>
): string {
  const parts: string[] = [];
  for (const [, fsKey] of Object.entries(EMBEDDING_FIELDS)) {
    const val = data[fsKey];
    if (val !== undefined && val !== null && val !== "" && val !== 0) {
      // Handle Grape Varieties array format
      if (Array.isArray(val)) {
        const names = val
          .map((v: unknown) => (typeof v === "object" && v && "name" in v ? (v as {name: string}).name : String(v)))
          .filter(Boolean);
        if (names.length > 0) parts.push(names.join(", "));
      } else {
        parts.push(String(val));
      }
    }
  }
  return parts.join(". ");
}

/**
 * Checks whether embedding-relevant fields changed between writes.
 */
export function needsReembedding(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
): boolean {
  if (!before || !after) return true;
  for (const fsKey of Object.values(EMBEDDING_FIELDS)) {
    if (String(before[fsKey] ?? "") !== String(after[fsKey] ?? "")) {
      return true;
    }
  }
  return false;
}
