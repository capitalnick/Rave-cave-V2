/**
 * Section C: Mixed Questions (General + Cellar Context) — 9 tests
 */

import type { EvalTestCase } from '../config/models.js';
import {
  noEmoji, hasFrenchFlourish, responseLength,
  hasToolCall, containsAny,
} from '../validators/structural.js';

export const sectionC: EvalTestCase[] = [
  // C1. Hybrid Recommendations
  {
    id: 'C1.1', section: 'C', tags: ['regression'],
    prompt: 'I love the Penfolds Bin 389 in my cellar, what else should I buy that\'s similar?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasFrenchFlourish(),
      hasToolCall('queryInventory'),
      containsAny(['penfolds', 'bin 389', 'cabernet', 'shiraz', 'similar', 'buy', 'recommend']),
      responseLength({ min: 60, max: 700 }),
    ],
    judgeCriteria: 'References actual cellar wine (Penfolds Bin 389). Calls queryInventory to verify it. CRITICAL: Must suggest wines to BUY that are NOT already in the user\'s cellar — e.g., other Cabernet-Shiraz blends from Australian producers, or similar wines from other regions. May also mention cellar wines for comparison, but the primary response should include purchase recommendations for new wines. Blends personal knowledge with inventory data.',
  },
  {
    id: 'C1.2', section: 'C', tags: [],
    prompt: 'How does my Grosset Polish Hill Riesling compare to a typical Clare Valley Riesling?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['grosset', 'polish hill', 'riesling', 'clare valley']),
    ],
    judgeCriteria: 'Calls queryInventory for the Grosset. Provides general knowledge comparison of Clare Valley Riesling style. Uses actual tasting notes from cellar. Informative and specific.',
  },
  {
    id: 'C1.3', section: 'C', tags: [],
    prompt: "I'm going to Burgundy next month, what should I buy that I don't already have?",
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['burgundy', 'bourgogne', 'pinot', 'chardonnay']),
    ],
    judgeCriteria: 'Checks current Burgundy holdings (DRC Échezeaux, Leflaive). Suggests wines that fill gaps. Shows awareness of what\'s already owned. Practical buying advice for a Burgundy trip.',
  },
  {
    id: 'C1.4', section: 'C', tags: [],
    prompt: 'Teach me about Barolo and show me if I have any',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['barolo', 'nebbiolo', 'piedmont', 'piemonte']),
    ],
    judgeCriteria: 'General education about Barolo (Nebbiolo, Piedmont, aging potential). Then calls queryInventory to check. Reports accurately (no Barolo in fixture). Doesn\'t pretend to find some.',
  },

  // C2. Occasion-Based (Cellar + Knowledge)
  {
    id: 'C2.1', section: 'C', tags: [],
    prompt: "I'm hosting a dinner for 6, suggest wines from my cellar and wines I should buy",
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['cellar', 'buy', 'purchase', 'dinner']),
      responseLength({ min: 80, max: 800 }),
    ],
    judgeCriteria: 'Calls queryInventory for cellar options. Adds external suggestions. Clearly labels which are cellar vs buy. Considers quantities available. Balanced selection.',
  },
  {
    id: 'C2.2', section: 'C', tags: [],
    prompt: 'My friend only drinks natural wine, what do I have that\'s close?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['natural', 'minimal', 'organic', 'intervention', 'close']),
    ],
    judgeCriteria: 'Calls queryInventory (semanticQuery about natural/minimal intervention). May note cellar wines that aren\'t technically natural but are close in style. Honest about limitations.',
  },
  {
    id: 'C2.3', section: 'C', tags: [],
    prompt: 'Birthday gift for a wine snob, should I pick from my cellar or buy something special?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['gift', 'birthday', 'special', 'premium', 'impressive']),
    ],
    judgeCriteria: 'Evaluates cellar for gift-worthy bottles (DRC, Château Margaux, Henschke). Also suggests premium external options. Gives pros/cons of each approach.',
  },

  // C3. Learning & Context
  {
    id: 'C3.1', section: 'C', tags: [],
    prompt: 'Why is the Château Margaux 2015 rated so highly?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['margaux', '2015', 'rating', 'quality', 'bordeaux']),
    ],
    judgeCriteria: 'Looks up the wine\'s rating and data (98/100). Explains quality factors (2015 vintage excellence, producer reputation, Margaux terroir). Uses actual data from cellar.',
  },
  {
    id: 'C3.2', section: 'C', tags: [],
    prompt: 'When should I open the Ridge Monte Bello?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['ridge', 'monte bello', '2018', 'drink', 'window', 'open', 'wait']),
    ],
    judgeCriteria: 'Checks drink window (2025-2048). Gives specific year recommendation. Explains why waiting is worth it or if it\'s ready now. Uses actual data.',
  },
  {
    id: 'C3.3', section: 'C', tags: [],
    prompt: 'I want to learn about Italian wines, what do I already have to start tasting?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['italian', 'italy', 'antinori', 'tignanello', 'tuscany', 'sangiovese']),
    ],
    judgeCriteria: 'Queries Italian wines in cellar (Antinori Tignanello). Uses them as learning examples. Adds educational context about Italian regions, grapes, and styles.',
  },
];
