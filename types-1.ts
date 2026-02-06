/**
 * Rave Cave Wine Schema — Single Source of Truth
 * Both UI components and AI tools reference these types.
 */

export type WineType = 'Red' | 'White' | 'Rosé' | 'Sparkling' | 'Dessert' | 'Fortified';
export type MaturityStatus = 'Hold' | 'Drink Now' | 'Past Peak';
export type ProcessingStatus = 'pending' | 'complete' | 'error';

export interface Wine {
  /** Firestore document ID */
  id: string;
  
  /** Producer / winery name */
  producer: string;
  
  /** Wine name / cuvée */
  name: string;
  
  /** Vintage year */
  vintage: number;
  
  /** Wine type category */
  type: WineType;
  
  /** Grape variety/varieties (e.g. "Shiraz", "Cabernet Sauvignon/Merlot") */
  cepage: string;
  
  /** Blend percentages if known (e.g. "60/40") */
  blendPercent: string;
  
  /** Appellation / AOC / AVA */
  appellation: string;
  
  /** Wine region (e.g. "Barossa Valley") */
  region: string;
  
  /** Country of origin */
  country: string;
  
  /** Number of bottles in cellar */
  quantity: number;
  
  /** Year to start drinking */
  drinkFrom: number;
  
  /** Year by which to drink */
  drinkUntil: number;
  
  /** Maturity status */
  maturity: MaturityStatus;
  
  /** Tasting notes */
  tastingNotes: string;
  
  /** User's personal rating */
  myRating: string;
  
  /** Vivino community rating */
  vivinoRating: number;
  
  /** Personal notes / memory attached to this bottle */
  personalNote: string;
  
  /** External link (Vivino, winery, etc.) */
  linkToWine: string;
  
  /** Original image URL from Firestore */
  imageUrl: string;
  
  /** Resolved/proxied image URL for display */
  resolvedImageUrl?: string;
  
  /** Price per bottle in user's currency */
  price: number;
  
  /** Bottle format (e.g. "750ml", "1.5L") */
  format: string;
  
  /** Processing status for async operations */
  processingStatus?: ProcessingStatus;
}

/**
 * Firestore field name mappings
 * Maps camelCase property names to Firestore display field names
 */
export const FIRESTORE_FIELD_MAP: Record<keyof Omit<Wine, 'id' | 'resolvedImageUrl'>, string> = {
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

export interface CellarStats {
  totalBottles: number;
  totalValue: number;
  typeDistribution: Record<string, number>;
  topProducers: { name: string; count: number }[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp?: number;
  imageUrl?: string;
}

/**
 * Staged wine during the "add bottle" flow
 * Partial because not all fields are required initially
 */
export type StagedWine = Partial<Omit<Wine, 'id'>>;
