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
