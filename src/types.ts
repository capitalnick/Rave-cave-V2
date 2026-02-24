import type { LucideIcon } from 'lucide-react';

export type TabId = 'cellar' | 'pulse' | 'recommend' | 'remy';
export type NavId = TabId | 'settings';

export type WineType = 'Red' | 'White' | 'Rosé' | 'Sparkling' | 'Dessert' | 'Fortified';
export type AccentToken = 'accent-pink' | 'accent-acid' | 'accent-coral' | 'accent-ink';
export type MaturityStatus = 'Hold' | 'Drink Now' | 'Past Peak';

export interface GrapeVariety {
  name: string;        // e.g. "Shiraz"
  pct?: number | null; // e.g. 85 — optional, integer 1–100
}

export interface Wine {
  id: string;
  producer: string;
  name: string;
  vintage: number;
  type: WineType;
  grapeVarieties: GrapeVariety[];
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
  thumbnailUrl?: string;
  resolvedImageUrl?: string;
  price: number;
  format: string;
  processingStatus?: 'pending' | 'complete' | 'error';
}

export type SortField =
  | 'maturity'
  | 'vintage-desc'
  | 'vintage-asc'
  | 'rating'
  | 'price-desc'
  | 'price-asc'
  | 'producer'
  | 'country';

export const SORT_OPTIONS: { value: SortField; label: string; group: 'decision' | 'organisational' }[] = [
  { value: 'maturity',     label: 'Maturity (Drink Now First)', group: 'decision' },
  { value: 'vintage-asc',  label: 'Vintage (Oldest First)',     group: 'decision' },
  { value: 'vintage-desc', label: 'Vintage (Newest First)',     group: 'decision' },
  { value: 'rating',       label: 'Rating (Highest First)',     group: 'decision' },
  { value: 'price-desc',   label: 'Price (Highest First)',      group: 'decision' },
  { value: 'price-asc',    label: 'Price (Lowest First)',       group: 'decision' },
  { value: 'producer',     label: 'Producer A\u2013Z',          group: 'organisational' },
  { value: 'country',      label: 'Country A\u2013Z',           group: 'organisational' },
];

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
  grapeVarieties: string[];
  producer: string[];
  region: string[];
  country: string[];
  maturity: string[];
  priceRange: string[];
}

// ── Occasion Types ──
export type OccasionId = 'dinner' | 'party' | 'gift' | 'surprise' | 'analyze_winelist';

export interface Occasion {
  id: OccasionId;
  title: string;
  description: string;
  icon: LucideIcon;
  accentToken: AccentToken;
  order: number;
  featured?: boolean;
  primary?: boolean;
}

// ── Context Types (per-occasion form inputs) ──
export interface DinnerContext {
  meal: string;
  guests: 2 | 4 | 6 | 8;
  vibe: 'casual' | 'fancy';
  cellarOnly: boolean;
}

export type PartyVibe =
  | 'summer-brunch' | 'garden-party' | 'bbq' | 'cocktail-party'
  | 'celebration' | 'casual-dinner' | 'wine-lovers-dinner'
  | 'holiday-feast' | 'late-night';

export type WinePerPerson = 'light' | 'moderate' | 'generous' | 'full';

export interface PartyContext {
  guests: number;
  winePerPerson: WinePerPerson;
  totalBottles: number;
  vibe: PartyVibe;
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

export interface WineListAnalysisContext {
  budgetMin: number | null;
  budgetMax: number | null;
  currency: 'AUD' | 'EUR' | 'USD' | 'GBP';
  meal: string;
  preferences: string;
}

export type OccasionContext = DinnerContext | PartyContext | GiftContext | WineListAnalysisContext | null;

// ── Recommendation Types ──
export type RankLabel = 'best-match' | 'also-great' | 'adventurous' | 'value' | 'pairing';

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

export interface WineBriefContext {
  briefId: string;
  fields: Partial<Wine>;
  source: 'scan' | 'manual';
}

export interface RecommendChatContext {
  resultSetId: string;
  occasionId: OccasionId;
  occasionTitle: string;
  contextInputs: OccasionContext;
  recommendations: Recommendation[];
  wineListAnalysis?: WineListAnalysis;
}

// ── Wine List Analysis Types ──

export interface WineListEntry {
  entryId: string;
  producer: string;
  name: string;
  vintage: number | null;
  type: WineType | null;
  priceGlass: number | null;
  priceBottle: number | null;
  currency: string;
  section: string;
  pageIndex: number;
  asListed: string;
}

export type WineListPickType = 'top' | 'value' | 'adventurous' | 'pairing';

export interface WineListPick {
  entryId: string;
  rank: number;
  rankLabel: RankLabel;
  rationale: string;
  pickType: WineListPickType;
  cellarMatchId: string | null;
  cellarMatchNote: string | null;
}

export interface WineListAnalysis {
  sessionId: string;
  restaurantName: string | null;
  entries: WineListEntry[];
  sections: { name: string; pageIndices: number[]; entryIds: string[] }[];
  picks: WineListPick[];
  pageCount: number;
  analysedAt: number;
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

// ── Crowd Allocation Types ──

export interface CrowdAllocationItem {
  wineId: string | null;
  producer: string;
  wineName: string;
  vintage: number;
  wineType: WineType;
  region: string;
  bottles: number;
  role: string;
  rationale: string;
  inCellar: boolean;
}

export interface CrowdAllocation {
  totalBottles: number;
  items: CrowdAllocationItem[];
  remyNote: string;
  vibeLabel: string;
}

export interface CrowdShortfall {
  needed: number;
  available: number;
  originalContext: PartyContext;
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
  | 'reviewing'
  | 'extracting'
  | 'draft'
  | 'committing'
  | 'committed'
  | 'success-screen';

export type CommitStage = 'idle' | 'saving' | 'success' | 'error';

export type { ExtractionErrorCode } from '@/services/extractionService';

// ── Faceted filter types (re-exported from lib) ──
export type {
  FacetKey,
  MultiSelectFacet,
  RangeFacet,
  FiltersState,
  FacetOption,
} from '@/lib/faceted-filters';

/**
 * SINGLE SOURCE OF TRUTH FOR FIELD MAPPING
 */
export const FIRESTORE_FIELD_MAP: Record<string, string> = {
  producer: 'Producer',
  name: 'Wine name',
  vintage: 'Vintage',
  type: 'Wine type',
  grapeVarieties: 'Grape Varieties',
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
  thumbnailUrl: 'Thumbnail URL',
  price: 'Bottle Price',
  format: 'Format',
  processingStatus: 'Processing Status',
};
