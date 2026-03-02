/**
 * Single source of truth for Firestore field name mappings.
 * All Cloud Functions should import from here.
 */

/** Full Firestore field map: camelCase → Title Case */
export const FIRESTORE_FIELD_MAP: Record<string, string> = {
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

/** Reverse map: Firestore Title Case → camelCase */
export const REVERSE_FIELD_MAP: Record<string, string> = {};
for (const [app, fs] of Object.entries(FIRESTORE_FIELD_MAP)) {
  REVERSE_FIELD_MAP[fs] = app;
}

/**
 * Fields included in embedding text for semantic search.
 * NOTE: Includes both "Cépage" (legacy) and "Grape Varieties" (modern)
 * so embeddings capture grape data regardless of which field is populated.
 */
export const EMBEDDING_FIELDS: Record<string, string> = {
  producer: "Producer",
  name: "Wine name",
  vintage: "Vintage",
  type: "Wine type",
  cepage: "Cépage",
  grapeVarieties: "Grape Varieties",
  appellation: "Appellation",
  region: "Region",
  country: "Country",
  tastingNotes: "Tasting Notes",
  personalNote: "Personal Note",
  maturity: "Maturity",
  drinkFrom: "Drink From",
  drinkUntil: "Drink Until",
};

/** Fields exposed by queryInventory (subset of full map) */
export const QUERY_FIELDS: Record<string, string> = {
  producer: "Producer",
  name: "Wine name",
  vintage: "Vintage",
  type: "Wine type",
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
  imageUrl: "Label image",
  price: "Bottle Price",
  format: "Format",
  processingStatus: "Processing Status",
};
