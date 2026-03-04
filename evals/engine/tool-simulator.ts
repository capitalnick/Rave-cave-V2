/**
 * Eval Harness — Tool Simulator
 *
 * In-memory implementations of queryInventory, stageWine, commitWine.
 * Mirrors the filter logic from functions/src/queryInventory.ts exactly.
 */

import { FixtureWine, FIXTURE_WINES } from '../config/fixtures.js';

const currentYear = new Date().getFullYear();

function computeMaturity(drinkFrom: number, drinkUntil: number): string {
  if (!drinkFrom || !drinkUntil) return 'Unknown';
  if (currentYear >= drinkFrom && currentYear <= drinkUntil) return 'Drink Now';
  if (currentYear < drinkFrom) return 'Hold';
  return 'Past Peak';
}

interface QueryArgs {
  wineType?: string;
  country?: string;
  region?: string;
  producer?: string;
  grapeVarieties?: string[];
  vintageMin?: number;
  vintageMax?: number;
  priceMin?: number;
  priceMax?: number;
  maturityStatus?: string;
  query?: string;
  semanticQuery?: string;
  sortBy?: string;
  sortOrder?: string;
  limit?: number;
}

/**
 * Format a wine into the same text format as useGeminiLive.ts handleToolCalls.
 */
function formatWine(w: FixtureWine): string {
  const parts = [
    `${w.producer}${w.name ? ' ' + w.name : ''} ${w.vintage || 'NV'}`,
    `${w.type}, ${w.region}${w.country ? ', ' + w.country : ''}`,
    `$${w.price} — Qty: ${w.quantity}`,
    `Maturity: ${w.maturity || 'Unknown'}`,
  ];
  if (w.grapeVarieties?.length) {
    parts.push(`Grape: ${w.grapeVarieties.map(g => g.name).join(', ')}`);
  }
  if (w.tastingNotes) parts.push(`Notes: ${w.tastingNotes}`);
  if (w.vivinoRating) parts.push(`Rating: ${w.vivinoRating}/100`);
  if (w.drinkFrom || w.drinkUntil) parts.push(`Window: ${w.drinkFrom || '?'}–${w.drinkUntil || '?'}`);
  if (w.appellation) parts.push(`Appellation: ${w.appellation}`);
  return parts.join(' — ');
}

export function simulateQueryInventory(args: QueryArgs): string {
  let wines = [...FIXTURE_WINES];
  const limit = Math.min(Math.max(args.limit || 10, 1), 20);

  // Structured filters
  if (args.wineType) {
    wines = wines.filter(w => w.type === args.wineType);
  }
  if (args.country) {
    wines = wines.filter(w => w.country === args.country);
  }
  if (args.region) {
    wines = wines.filter(w => w.region === args.region);
  }
  if (args.producer) {
    const p = args.producer.toLowerCase();
    wines = wines.filter(w => w.producer.toLowerCase().includes(p));
  }
  if (args.grapeVarieties && args.grapeVarieties.length > 0) {
    const grapes = args.grapeVarieties.map(g => g.toLowerCase());
    wines = wines.filter(w => {
      const varieties = w.grapeVarieties.map(v => v.name.toLowerCase());
      return grapes.some(g => varieties.some(v => v.includes(g)));
    });
  }
  if (args.vintageMin) {
    wines = wines.filter(w => w.vintage >= args.vintageMin!);
  }
  if (args.vintageMax) {
    wines = wines.filter(w => w.vintage <= args.vintageMax!);
  }
  if (args.priceMin) {
    wines = wines.filter(w => w.price >= args.priceMin!);
  }
  if (args.priceMax) {
    wines = wines.filter(w => w.price <= args.priceMax!);
  }
  if (args.maturityStatus) {
    const statusMap: Record<string, string> = {
      HOLD: 'Hold',
      DRINK_NOW: 'Drink Now',
      PAST_PEAK: 'Past Peak',
    };
    const target = statusMap[args.maturityStatus];
    if (target) {
      wines = wines.filter(w => {
        const m = computeMaturity(w.drinkFrom, w.drinkUntil);
        return m === target;
      });
    }
  }
  if (args.query) {
    const q = args.query.toLowerCase();
    wines = wines.filter(w => {
      const grapeStr = w.grapeVarieties.map(v => v.name).join(' ').toLowerCase();
      return (
        w.producer.toLowerCase().includes(q) ||
        w.name.toLowerCase().includes(q) ||
        grapeStr.includes(q) ||
        w.region.toLowerCase().includes(q) ||
        w.appellation.toLowerCase().includes(q)
      );
    });
  }

  // semanticQuery: keyword matching fallback (no embeddings in eval)
  if (args.semanticQuery) {
    const keywords = args.semanticQuery.toLowerCase().split(/\s+/);
    wines = wines.filter(w => {
      const searchable = [
        w.producer, w.name, w.type, w.region, w.country,
        w.appellation, w.tastingNotes,
        ...w.grapeVarieties.map(g => g.name),
      ].join(' ').toLowerCase();
      return keywords.some(k => searchable.includes(k));
    });
  }

  // Sort
  if (args.sortBy) {
    const order = args.sortOrder === 'desc' ? -1 : 1;
    wines.sort((a, b) => {
      switch (args.sortBy) {
        case 'vintage': {
          const va = a.vintage || 0;
          const vb = b.vintage || 0;
          if (va === 0 && vb === 0) return 0;
          if (va === 0) return 1;
          if (vb === 0) return -1;
          return (va - vb) * order;
        }
        case 'price':
          return (a.price - b.price) * order;
        case 'rating':
          return ((a.vivinoRating || 0) - (b.vivinoRating || 0)) * order;
        default:
          return 0;
      }
    });
  }

  const results = wines.slice(0, limit);
  const total = wines.length;

  if (results.length === 0) {
    return `No wines found matching those criteria. Total in cellar: ${FIXTURE_WINES.length}.`;
  }

  const formatted = results.map(formatWine).join('\n');
  return `Found ${total} wines (showing ${results.length}):\n${formatted}`;
}

export function simulateStageWine(args: Record<string, unknown>): string {
  return 'Wine staged. Now ask the user for price and quantity.';
}

export function simulateCommitWine(args: Record<string, unknown>): string {
  const price = args.price;
  const quantity = args.quantity || 1;
  return `Success! Wine added to cellar with ID eval-${Date.now()}. Price: $${price}, Quantity: ${quantity}.`;
}

/**
 * Dispatch a tool call and return the result string.
 */
export function handleToolCall(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'queryInventory':
      return simulateQueryInventory(args as unknown as QueryArgs);
    case 'stageWine':
      return simulateStageWine(args);
    case 'commitWine':
      return simulateCommitWine(args);
    default:
      return `Unknown tool: ${name}`;
  }
}
