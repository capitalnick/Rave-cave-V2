/**
 * Section E: Recommend → Remy Handoff — 5 tests
 */

import type { EvalTestCase } from '../config/models.js';
import {
  noEmoji, hasFrenchFlourish, hasToolCall,
  containsAny, responseLength,
} from '../validators/structural.js';

export const sectionE: EvalTestCase[] = [
  // E1. Dinner Handoff
  {
    id: 'E1.1', section: 'E', tags: ['regression'],
    prompt: 'Tell me more about these wine recommendations.',
    mode: 'handoff',
    handoffContext: '[RECOMMENDATION CONTEXT] The user asked for dinner pairing recommendations for grilled salmon. Rémy suggested: 1) Grosset Polish Hill Riesling 2022 — crisp acidity pairs well with salmon, 2) Cloudy Bay Sauvignon Blanc 2023 — herbal notes complement the fish, 3) Domaine Leflaive Puligny-Montrachet 2020 — premium option with citrus and minerality.',
    structuralValidators: [
      noEmoji(),
      hasFrenchFlourish(),
      containsAny(['salmon', 'grosset', 'cloudy bay', 'leflaive', 'recommendation']),
      responseLength({ min: 50, max: 600 }),
    ],
    judgeCriteria: 'Remy acknowledges the dinner context and salmon pairing. References the specific recommendations (Grosset, Cloudy Bay, Leflaive). Offers to explain or adjust. Natural handoff continuation.',
  },
  {
    id: 'E1.2', section: 'E', tags: ['regression'],
    prompt: 'Why did you pick the first wine?',
    mode: 'handoff',
    handoffContext: '[RECOMMENDATION CONTEXT] The user asked for dinner pairing recommendations for grilled salmon. Rémy suggested: 1) Grosset Polish Hill Riesling 2022 — crisp acidity pairs well with salmon, 2) Cloudy Bay Sauvignon Blanc 2023 — herbal notes complement the fish.',
    priorTurns: [
      { role: 'user', content: 'Tell me more about these recommendations.' },
      { role: 'assistant', content: 'Bien sûr! These three wines were selected specifically for your grilled salmon. The Grosset leads for its laser-like acidity, the Cloudy Bay for accessibility, and the Leflaive as a premium expression. Would you like me to elaborate on any of them?' },
    ],
    structuralValidators: [
      noEmoji(),
      containsAny(['grosset', 'riesling', 'polish hill', 'acidity', 'salmon', 'pair']),
    ],
    judgeCriteria: 'References the specific first wine (Grosset Polish Hill Riesling). Explains rationale: meal pairing with salmon, acidity, price point. Uses actual wine data.',
  },
  {
    id: 'E1.3', section: 'E', tags: ['regression'],
    prompt: 'Something bolder instead',
    mode: 'handoff',
    handoffContext: '[RECOMMENDATION CONTEXT] The user asked for dinner pairing recommendations for grilled salmon. Rémy suggested white wines. The user wants something bolder.',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['bold', 'red', 'pinot', 'salmon', 'heavier', 'full']),
    ],
    judgeCriteria: 'Calls queryInventory for bolder alternatives. May suggest Pinot Noir (pairs with salmon) or other medium-bodied reds. Respects dinner context (salmon). Compares to original lighter picks.',
  },

  // E2. Party Handoff
  {
    id: 'E2.1', section: 'E', tags: ['regression'],
    prompt: 'Tell me about this party wine plan.',
    mode: 'handoff',
    handoffContext: '[PARTY CONTEXT] Party for 12 guests, casual vibe, BBQ theme. Allocation: 4 bottles red (under $40), 4 bottles white (under $30), 2 bottles sparkling. Total: 10 bottles needed.',
    structuralValidators: [
      noEmoji(),
      containsAny(['party', '12', 'guests', 'bbq', 'bottles', 'allocation', 'red', 'white', 'sparkling']),
      responseLength({ min: 50, max: 600 }),
    ],
    judgeCriteria: 'Remy references total bottles needed (10), the casual BBQ vibe, and the red/white/sparkling allocation. Offers to adjust or provide specific picks. Natural continuation.',
  },
  {
    id: 'E2.2', section: 'E', tags: ['regression'],
    prompt: 'Can we swap the white for something else?',
    mode: 'handoff',
    handoffContext: '[PARTY CONTEXT] Party for 12 guests, casual BBQ. Current plan: 4x Wynns Black Label ($35), 4x Cloudy Bay SB ($28), 2x Jansz Premium Cuvée ($30).',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['white', 'swap', 'alternative', 'instead', 'replace']),
    ],
    judgeCriteria: 'Calls queryInventory for white alternatives. Keeps total bottle count consistent. Suggests alternatives within casual price range (under $30). Considers the BBQ context.',
  },

  // E3. Gift Handoff
  {
    id: 'E3.1', section: 'E', tags: ['regression'],
    prompt: 'Tell me more about this gift recommendation.',
    mode: 'handoff',
    handoffContext: '[GIFT CONTEXT] Birthday gift for a wine enthusiast. Personality: adventurous. Budget: $100-200. Rémy recommended: Antinori Tignanello 2019 ($130) — a Super Tuscan with a story, perfect for an adventurous palate.',
    structuralValidators: [
      noEmoji(),
      containsAny(['gift', 'birthday', 'tignanello', 'antinori', 'adventurous']),
      responseLength({ min: 50, max: 600 }),
    ],
    judgeCriteria: 'Remy references the birthday occasion, recipient personality (adventurous), and the Tignanello recommendation. May offer presentation/wrapping advice. Natural gift-giving context.',
  },
];
