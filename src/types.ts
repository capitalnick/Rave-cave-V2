export type TabId = 'cellar' | 'pulse' | 'recommend' | 'remy';

export type WineType = 'Red' | 'White' | 'Rosé' | 'Sparkling' | 'Dessert' | 'Fortified';
export type MaturityStatus = 'Hold' | 'Drink Now' | 'Past Peak';

export interface Wine {
  id: string;
  producer: string;
  name: string;
  vintage: number;
  type: WineType;
  cepage: string;
  blendPercent?: string;
  appellation?: string;
  region: string;
  country: string;
  quantity: number;
  drinkFrom: number;
  drinkUntil: number;
  maturity: MaturityStatus;
  tastingNotes: string;
  myRating?: string;
  vivinoRating?: number;
  personalNote?: string;
  linkToWine?: string;
  imageUrl?: string;
  resolvedImageUrl?: string;
  price: number;
  format: string;
  processingStatus?: 'pending' | 'complete' | 'error';
}

export type IngestionState = 'IDLE' | 'STAGED' | 'NEEDS_PRICE' | 'READY_TO_COMMIT' | 'COMMITTED';

export interface StagedWine extends Partial<Omit<Wine, 'id'>> {
  stagedId?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  image?: string;
  isStaging?: boolean;
}

export interface CellarStats {
  totalBottles: number;
  totalValue: number;
  typeDistribution: Record<string, number>;
  topProducers: { name: string; count: number }[];
}

export interface CellarFilters {
  vintage: number[];
  type: WineType[];
  cepage: string[];
  producer: string[];
  region: string[];
  country: string[];
  maturity: string[];
  priceRange: string[];
}

// ── Occasion Types ──
export type OccasionId = 'dinner' | 'party' | 'gift' | 'cheese' | 'surprise';

export interface Occasion {
  id: OccasionId;
  title: string;
  description: string;
  icon: string; // emoji character
}

// ── Context Types (per-occasion form inputs) ──
export interface DinnerContext {
  meal: string;
  guests: 2 | 4 | 6 | 8;
  vibe: 'casual' | 'fancy';
  cellarOnly: boolean;
}

export interface PartyContext {
  guests: number;
  vibe: 'casual' | 'cocktail' | 'celebration';
  budgetPerBottle: 'any' | 'under-20' | '20-50' | '50-plus';
  cellarOnly: boolean;
}

export interface GiftContext {
  recipient: string;
  theirTaste: string;
  occasion: 'birthday' | 'thank-you' | 'holiday' | 'just-because';
  budget: 'any' | 'under-30' | '30-75' | '75-plus';
  cellarOnly: boolean;
}

export interface CheeseContext {
  cheeses: string;
  style: 'light-fresh' | 'bold-aged' | 'mixed';
  cellarOnly: boolean;
}

export type OccasionContext = DinnerContext | PartyContext | GiftContext | CheeseContext | null;

// ── Recommendation Types ──
export type RankLabel = 'best-match' | 'also-great' | 'adventurous';

export interface Recommendation {
  wineId: string;
  producer: string;
  name: string;
  vintage: number;
  type: WineType;
  rank: 1 | 2 | 3;
  rankLabel: RankLabel;
  rationale: string;
  isFromCellar: boolean;
  maturity: string;
  rating: number | null;
}

export interface RecommendChatContext {
  resultSetId: string;
  occasionId: OccasionId;
  occasionTitle: string;
  contextInputs: OccasionContext;
  recommendations: Recommendation[];
}

// ── Recent Query Type ──
export interface RecentQuery {
  id: string;
  occasionId: OccasionId;
  queryText: string;
  resultCount: number;
  resultSetId: string;
  timestamp: number;
  contextInputs: OccasionContext;
}

/**
 * SINGLE SOURCE OF TRUTH FOR FIELD MAPPING
 */
export const FIRESTORE_FIELD_MAP: Record<string, string> = {
  producer: 'Producer',
  name: 'Wine name',
  vintage: 'Vintage',
  type: 'Wine type',
  cepage: 'Cépage',
  blendPercent: 'Blend %',
  appellation: 'Appellation',
  region: 'Region',
  country: 'Country',
  quantity: 'Quantity',
  drinkFrom: 'Drink From',
  drinkUntil: 'Drink Until',
  maturity: 'Maturity',
  tastingNotes: 'Tasting Notes',
  myRating: 'My Rating',
  vivinoRating: 'Vivino Rating',
  personalNote: 'Personal Note',
  linkToWine: 'Link to wine',
  imageUrl: 'Label image',
  price: 'Bottle Price',
  format: 'Format',
  processingStatus: 'Processing Status',
};
