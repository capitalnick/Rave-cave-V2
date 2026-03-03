import {EMBEDDING_FIELDS} from "./fieldMaps";

/**
 * Builds a single text string from descriptive fields for embedding.
 * Includes both legacy "Cépage" and modern "Grape Varieties" fields.
 * @param {Record<string, unknown>} data The wine document data.
 * @return {string} Concatenated embedding text.
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
          .map((v: unknown) => {
            if (typeof v === "object" && v && "name" in v) {
              return (v as {name: string}).name;
            }
            return String(v);
          })
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
 * @param {Record<string, unknown>} before Data before write.
 * @param {Record<string, unknown>} after Data after write.
 * @return {boolean} Whether reembedding is needed.
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
