/**
 * Section F: Wine Brief Mode — 8 automatable tests (F1.1-F1.4, F2.1-F2.5)
 * F1.5 (Brief Actions render) is UI-only.
 */

import type { EvalTestCase } from '../config/models.js';
import {
  noEmoji, hasFrenchFlourish, noToolCalls, responseLength,
  hasMarkdownSections, hasWineCards, containsAny,
} from '../validators/structural.js';

const WINE_BRIEF_SECTIONS = [
  'THE VERDICT',
  'THE WINE',
  'WHAT TO EXPECT IN THE GLASS',
  'THIS VINTAGE',
  'VALUE VERDICT',
  "REMY'S CALL",
];

export const sectionF: EvalTestCase[] = [
  // F1. Brief Structure
  {
    id: 'F1.1', section: 'F', tags: ['regression'],
    prompt: 'Give me a wine brief for this bottle.',
    mode: 'wine-brief',
    wineBriefContext: '[WINE_BRIEF_CONTEXT] Wine: Château Margaux 2015, Margaux, Bordeaux, France. Type: Red. Grapes: Cabernet Sauvignon 87%, Merlot 8%, Petit Verdot 5%. Price: $365 AUD.',
    structuralValidators: [
      noEmoji(),
      hasFrenchFlourish(),
      noToolCalls(),
      hasMarkdownSections(WINE_BRIEF_SECTIONS),
      responseLength({ min: 200, max: 1200 }),
    ],
    judgeCriteria: 'All 6 sections present in correct order: THE VERDICT, THE WINE, WHAT TO EXPECT IN THE GLASS, THIS VINTAGE, VALUE VERDICT, REMY\'S CALL. Each section has 2-4 sentences. Tone is opinionated and expert.',
  },
  {
    id: 'F1.2', section: 'F', tags: [],
    prompt: 'Tell me about this wine.',
    mode: 'wine-brief',
    wineBriefContext: '[WINE_BRIEF_CONTEXT] Wine: Penfolds Bin 389, 2019, South Australia. Type: Red. Grapes: Cabernet Sauvignon 53%, Shiraz 47%. Price: $85 AUD.',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      hasMarkdownSections(WINE_BRIEF_SECTIONS),
      responseLength({ min: 150, max: 1200 }),
    ],
    judgeCriteria: 'No empty sections. Each section has 2-4 sentences. THE VERDICT is punchy and opinionated. WHAT TO EXPECT IN THE GLASS is vivid. Content matches the specific wine.',
  },
  {
    id: 'F1.3', section: 'F', tags: [],
    prompt: 'Wine brief please.',
    mode: 'wine-brief',
    wineBriefContext: '[WINE_BRIEF_CONTEXT] Wine: Cloudy Bay Sauvignon Blanc 2023, Marlborough, New Zealand. Type: White. Grapes: Sauvignon Blanc. Price: $28 AUD.',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      hasMarkdownSections(WINE_BRIEF_SECTIONS),
      hasWineCards({ minCount: 1 }),
    ],
    judgeCriteria: '```wine fenced JSON block appended at end with correct wine data matching the scanned label (Cloudy Bay SB 2023). All 6 sections present.',
  },
  {
    id: 'F1.4', section: 'F', tags: ['regression'],
    prompt: 'Give me the brief.',
    mode: 'wine-brief',
    wineBriefContext: '[WINE_BRIEF_CONTEXT] Wine: Torbreck RunRig 2019, Barossa Valley, Australia. Type: Red. Grapes: Shiraz 97%, Viognier 3%. Price: $180 AUD.',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      hasMarkdownSections(WINE_BRIEF_SECTIONS),
    ],
    judgeCriteria: 'Remy does NOT call queryInventory, stageWine, or commitWine. Answers purely from expertise. No tool calls in wine brief mode. All 6 sections present.',
  },

  // F2. Brief Quality
  {
    id: 'F2.1', section: 'F', tags: [],
    prompt: 'Wine brief for this premium Bordeaux.',
    mode: 'wine-brief',
    wineBriefContext: '[WINE_BRIEF_CONTEXT] Wine: Château Margaux 2015, Margaux, Bordeaux, France. Type: Red. Grapes: Cabernet Sauvignon 87%, Merlot 8%, Petit Verdot 5%. Price: $365 AUD.',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      hasMarkdownSections(WINE_BRIEF_SECTIONS),
      containsAny(['2015', 'bordeaux', 'margaux', 'excellent', 'outstanding', 'great year', 'exceptional']),
    ],
    judgeCriteria: 'Vintage assessment accurate for 2015 Bordeaux (excellent year). Value reflects premium pricing ($365). Tasting notes match Bordeaux/Margaux profile (cassis, violet, graphite). THIS VINTAGE section mentions 2015 as an outstanding year.',
  },
  {
    id: 'F2.2', section: 'F', tags: [],
    prompt: 'What do you think of this wine?',
    mode: 'wine-brief',
    wineBriefContext: '[WINE_BRIEF_CONTEXT] Wine: Yellow Tail Shiraz 2023, South Eastern Australia. Type: Red. Grapes: Shiraz. Price: $18 AUD.',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      hasMarkdownSections(WINE_BRIEF_SECTIONS),
      containsAny(['everyday', 'daily', 'casual', 'easy', 'simple', 'accessible', 'budget', 'value']),
    ],
    judgeCriteria: 'Honest verdict (daily drinker, not a gem). Value reflects low price ($18). Doesn\'t oversell quality. THE VERDICT is honest without being cruel. Practical tone.',
  },
  {
    id: 'F2.3', section: 'F', tags: [],
    prompt: 'Brief this wine for me.',
    mode: 'wine-brief',
    wineBriefContext: '[WINE_BRIEF_CONTEXT] Wine: Domaine Obscure, Cuvée Mystère 2020, Languedoc, France. Type: Red. Grapes: Carignan 50%, Grenache 50%. Price: $35 AUD.',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      hasMarkdownSections(WINE_BRIEF_SECTIONS),
      containsAny(['languedoc', 'carignan', 'grenache', 'southern france', 'south of france', 'mediterranean']),
    ],
    judgeCriteria: 'Admits uncertainty about producer where appropriate (obscure/unknown). Still provides useful regional context (Languedoc, Southern Rhône style). Doesn\'t fabricate producer history. Honest about what\'s known vs unknown.',
  },
  {
    id: 'F2.4', section: 'F', tags: [],
    prompt: 'Wine brief.',
    mode: 'wine-brief',
    wineBriefContext: '[WINE_BRIEF_CONTEXT] Wine: Pol Roger Brut Réserve NV, Champagne, France. Type: Sparkling. Grapes: Pinot Noir 33%, Chardonnay 33%, Pinot Meunier 34%. Price: $75 AUD.',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      hasMarkdownSections(WINE_BRIEF_SECTIONS),
      containsAny(['mousse', 'bubble', 'acidity', 'champagne', 'sparkling', 'nv', 'non-vintage']),
    ],
    judgeCriteria: 'WHAT TO EXPECT mentions mousse, acidity, dosage. THIS VINTAGE handles NV correctly (explains NV concept, house style consistency). Champagne-appropriate language throughout.',
  },
  {
    id: 'F2.5', section: 'F', tags: [],
    prompt: 'Brief this for me.',
    mode: 'wine-brief',
    wineBriefContext: '[WINE_BRIEF_CONTEXT] Wine: Lustau Palo Cortado, Jerez, Spain. Type: Fortified. Grapes: Palomino. Price: $28 AUD. Note: This is an aged Sherry.',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      hasMarkdownSections(WINE_BRIEF_SECTIONS),
      containsAny(['sherry', 'jerez', 'oxidative', 'nutty', 'dry', 'hazelnut', 'palo cortado', 'fortified']),
    ],
    judgeCriteria: 'Appropriate descriptors for Palo Cortado (oxidative complexity, nutty, dry, hazelnut). Serving suggestions in REMY\'S CALL (temperature, pairings like aged cheese or charcuterie). Accurate Sherry knowledge.',
  },
];
