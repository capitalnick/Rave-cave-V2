/**
 * Section B: Cellar-Specific Questions (With Inventory Access) — 19 tests
 */

import type { EvalTestCase } from '../config/models.js';
import {
  noEmoji, hasFrenchFlourish, responseLength, noToolCalls,
  hasToolCall, containsAny, hasWineCards,
} from '../validators/structural.js';

export const sectionB: EvalTestCase[] = [
  // B1. Inventory Queries
  {
    id: 'B1.1', section: 'B', tags: [],
    prompt: 'How many bottles do I have?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      noToolCalls(), // Should answer from cellar summary
      responseLength({ min: 10, max: 300 }),
    ],
    judgeCriteria: 'Answers from cellar summary (no tool call needed). Gives exact bottle count. May break down by type. Accurate to the fixture data.',
  },
  {
    id: 'B1.2', section: 'B', tags: ['regression'],
    prompt: 'Show me my French reds',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory', { country: 'France', wineType: 'Red' }),
      responseLength({ min: 30, max: 600 }),
    ],
    judgeCriteria: 'Calls queryInventory with country: "France" and wineType: "Red". Lists actual wines from results (Château Margaux, DRC, Domaine Tempier). Never invents wines not in results.',
  },
  {
    id: 'B1.3', section: 'B', tags: [],
    prompt: "What's my most expensive bottle?",
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['365', 'margaux', 'château', 'yquem', '350', 'henschke', 'dom pérignon', '320']),
    ],
    judgeCriteria: 'Calls queryInventory with sortBy: "price", sortOrder: "desc". Returns actual most expensive wine with price. Data matches fixture.',
  },
  {
    id: 'B1.4', section: 'B', tags: [],
    prompt: 'Do I have any Pinot Noir?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['pinot noir', 'romanée-conti', 'drc', 'échezeaux', 'cloudy bay', 'central otago']),
    ],
    judgeCriteria: 'Calls queryInventory with grapeVarieties: ["Pinot Noir"]. Reports results accurately — should find DRC Échezeaux and Cloudy Bay Pinot Noir. If none, says so clearly.',
  },
  {
    id: 'B1.5', section: 'B', tags: [],
    prompt: 'What Australian wines are in my cellar?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory', { country: 'Australia' }),
      responseLength({ min: 40, max: 800 }),
    ],
    judgeCriteria: 'Calls queryInventory with country: "Australia". Lists results accurately. Should find Penfolds, Henschke, Torbreck, Yellow Tail, Wynns, Grosset, Leeuwin, Turkey Flat, Jansz, De Bortoli, Seppeltsfield, Tyrrell\'s. Doesn\'t fabricate.',
  },
  {
    id: 'B1.6', section: 'B', tags: [],
    prompt: 'How many whites vs reds do I have?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      responseLength({ min: 15, max: 300 }),
    ],
    judgeCriteria: 'Answers from summary or tool call. Gives counts for Red and White types. Should be accurate to fixture data.',
  },

  // B2. Drink-Tonight Recommendations
  {
    id: 'B2.1', section: 'B', tags: ['regression'],
    prompt: 'What should I drink tonight?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasFrenchFlourish(),
      hasToolCall('queryInventory'),
      responseLength({ min: 50, max: 600 }),
    ],
    judgeCriteria: 'Calls queryInventory. Prioritises "Drink Now" maturity wines. Considers variety (not just most expensive). Gives 1-3 picks with rationale. Uses actual tasting notes and data.',
  },
  {
    id: 'B2.2', section: 'B', tags: [],
    prompt: "I'm having steak, what should I open?",
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['red', 'cabernet', 'shiraz', 'tannin', 'bold', 'full']),
    ],
    judgeCriteria: 'Calls queryInventory (semanticQuery for steak/meat pairing or wineType: "Red"). Picks appropriate bold reds. Mentions tannin/body match with steak. Uses actual wines from cellar.',
  },
  {
    id: 'B2.3', section: 'B', tags: [],
    prompt: 'Something light and refreshing for the afternoon',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['white', 'rosé', 'rose', 'sauvignon', 'riesling', 'sparkling', 'light', 'refreshing']),
    ],
    judgeCriteria: 'Calls queryInventory. Suggests whites, rosés, or sparkling. Doesn\'t suggest heavy Cabernets or bold reds. Light and refreshing picks.',
  },
  {
    id: 'B2.4', section: 'B', tags: [],
    prompt: "What's ready to drink right now?",
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
    ],
    judgeCriteria: 'Calls queryInventory with maturityStatus: "DRINK_NOW" or similar. Lists results with drink windows. Accurate to fixture maturity data.',
  },
  {
    id: 'B2.5', section: 'B', tags: [],
    prompt: 'I want something under $30 tonight',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
    ],
    judgeCriteria: 'Calls queryInventory with priceMax: 30 or similar. Results respect price filter. Should find Yellow Tail ($18), Cloudy Bay SB ($28), Turkey Flat Rosé ($24), Jansz ($30), Lustau ($28), Viña Errázuriz ($22).',
  },

  // B3. Cellar Intelligence
  {
    id: 'B3.1', section: 'B', tags: [],
    prompt: 'What wines should I drink soon before they go past peak?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['drink', 'window', 'soon', 'peak', 'before']),
    ],
    judgeCriteria: 'Queries for wines approaching end of drink window. Provides urgency ranking. Should identify wines with drinkUntil dates in the near future. Accurate to fixture data.',
  },
  {
    id: 'B3.2', section: 'B', tags: [],
    prompt: "What's the best value wine in my cellar?",
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['value', 'price', 'quality', 'rating', 'bang for', 'worth']),
    ],
    judgeCriteria: 'Considers price vs rating/quality ratio. Explains reasoning. Uses actual data from cellar. Should identify wines with good rating-to-price ratio.',
  },
  {
    id: 'B3.3', section: 'B', tags: [],
    prompt: "I notice I don't have much white wine, what should I buy?",
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      responseLength({ min: 40, max: 600 }),
    ],
    judgeCriteria: 'References actual cellar breakdown. Makes purchase suggestions that complement collection. Shows awareness of what\'s already in the cellar.',
  },
  {
    id: 'B3.4', section: 'B', tags: [],
    prompt: 'What regions am I missing in my collection?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      responseLength({ min: 40, max: 600 }),
    ],
    judgeCriteria: 'Analyzes cellar composition. Identifies gaps (e.g., no German wines, limited South American, no Austrian). Suggests regions to explore. Based on actual data.',
  },
  {
    id: 'B3.5', section: 'B', tags: [],
    prompt: 'Compare my two best Shiraz bottles',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['shiraz', 'henschke', 'torbreck', 'penfolds', 'yellow tail']),
    ],
    judgeCriteria: 'Queries for Shiraz wines. Picks top 2 (Henschke Hill of Grace + Torbreck RunRig likely). Compares vintage, rating, tasting notes. Uses actual wine data.',
  },

  // B4. Accuracy & Grounding
  {
    id: 'B4.1', section: 'B', tags: ['regression'],
    prompt: 'Tell me about the Penfolds Bin 389 in my cellar',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['penfolds', 'bin 389', '2019', 'blackcurrant', 'cabernet', 'shiraz']),
    ],
    judgeCriteria: 'Calls queryInventory for Penfolds. Returns actual data. Tasting notes, vintage (2019), price ($85), grapes (Cabernet Sauvignon/Shiraz) all match fixture. Rating conversion: 91/100 in tool results should become ~4.55 on a 0-5 scale (divide by 20) — this is correct, not invented. Drink window 2023-2035 matches tool output. Does not invent wines or data not present in tool results.',
  },
  {
    id: 'B4.2', section: 'B', tags: ['regression'],
    prompt: 'Do I have any Château Latour?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
    ],
    judgeCriteria: 'Calls queryInventory for Château Latour (not in fixture). Correctly reports wine not found. May offer general knowledge about Latour. Does NOT pretend it\'s in cellar.',
  },
  {
    id: 'B4.3', section: 'B', tags: [],
    prompt: 'How much did I pay for the Dom Pérignon?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['320', '$320', 'dom pérignon']),
    ],
    judgeCriteria: 'Returns actual price from inventory ($320). Correct currency. Accurate to fixture data.',
  },
  {
    id: 'B4.5', section: 'B', tags: [],
    prompt: "What's my oldest bottle?",
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['2005', "tyrrell's", 'vat 1', 'hunter valley', 'sémillon']),
    ],
    judgeCriteria: 'Calls queryInventory sorted by vintage asc. Returns Tyrrell\'s Vat 1 2005 as oldest. Accurate to fixture.',
  },

  // B5. Wine Cards & Formatting
  {
    id: 'B5.1', section: 'B', tags: [],
    prompt: 'Recommend 3 wines for dinner',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      hasWineCards({ minCount: 1 }),
    ],
    judgeCriteria: 'Response includes ```wine fenced block with valid JSON array. Each wine has producer, name, vintage at minimum. Uses actual cellar wines.',
  },
  {
    id: 'B5.3', section: 'B', tags: [],
    prompt: "What's in my cellar?",
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      responseLength({ min: 50, max: 1000 }),
    ],
    judgeCriteria: 'Results formatted as readable list or wine cards. Not a raw data dump. Organized by type or category. Accurate to fixture data.',
  },
];
