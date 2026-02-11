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

// ── Pulse Dashboard Types ──

export interface DrinkingWindow {
  wineId: string;
  producer: string;
  name: string;
  vintage: number;
  type: WineType;
  drinkFrom: number;
  drinkUntil: number;
  maturity: MaturityStatus;
  totalValue: number;
  quantity: number;
}

export interface MaturityBreakdown {
  drinkNow: number;
  hold: number;
  pastPeak: number;
  unknown: number;
  total: number;
}

export type StoryCardType =
  | 'past-peak-alert'
  | 'ready-to-drink'
  | 'most-valuable'
  | 'cellar-diversity'
  | 'aging-potential';

export interface StoryCard {
  id: string;
  type: StoryCardType;
  icon: string;
  headline: string;
  subtext: string;
  accentColor: string;
  cta?: {
    label: string;
    action: 'navigate-cellar' | 'view-wine' | 'view-story' | 'view-drinking-window';
    payload?: string;
  };
}

export interface PulseStats {
  totalBottles: number;
  totalValue: number;
  typeDistribution: Record<string, number>;
  topProducers: { name: string; count: number; totalValue: number }[];
  maturityBreakdown: MaturityBreakdown;
  drinkingWindows: DrinkingWindow[];
  storyCards: StoryCard[];
  bottlesNeedingAttention: number;
  readyToDrinkCount: number;
  mostValuableWine: Wine | null;
  averageBottleValue: number;
  timelineRange: { min: number; max: number };
}

// ── Scan & Register Pipeline Types ──

export type ExtractionConfidence = 'high' | 'medium' | 'low';

export interface ExtractedField {
  value: any;
  confidence: ExtractionConfidence;
}

export interface ExtractionResult {
  fields: Record<string, ExtractedField>;
  status: 'complete' | 'partial' | 'failed';
  imageQuality: 'high' | 'medium' | 'low' | null;
}

export interface DuplicateCandidate {
  wineId: string;
  similarityScore: number;
  matchedFields: string[];
  existingWine: Wine;
}

export type DraftSource = 'scan' | 'manual';

export interface DraftImage {
  localUri: string;
  remoteUrl: string | null;
}

export interface WineDraft {
  draftId: string;
  source: DraftSource;
  fields: Partial<Wine>;
  extraction: ExtractionResult | null;
  image: DraftImage | null;
  createdAt: string;
}

export type ScanStage =
  | 'closed'
  | 'mode-select'
  | 'extracting'
  | 'draft'
  | 'committing'
  | 'committed';

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
