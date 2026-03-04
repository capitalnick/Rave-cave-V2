/**
 * Section A: General Wine Questions (No Cellar Access) — 17 tests
 */

import type { EvalTestCase } from '../config/models.js';
import {
  noEmoji, hasFrenchFlourish, responseLength, noToolCalls,
  noCellarReferences, hasCellarBridgeOffer, containsAny,
  containsAll, redirectsToWine,
} from '../validators/structural.js';

export const sectionA: EvalTestCase[] = [
  // A1. Basic Wine Knowledge
  {
    id: 'A1.1', section: 'A', tags: ['regression'],
    prompt: "What's the difference between Cabernet Sauvignon and Merlot?",
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      hasFrenchFlourish(),
      noToolCalls(),
      containsAny(['tannin', 'body', 'fruit', 'bold', 'soft', 'medium']),
      responseLength({ min: 50, max: 500 }),
    ],
    judgeCriteria: 'Accurate varietal comparison. Mentions body, tannins, fruit profile differences. French flourishes present. Informative but not overly academic.',
  },
  {
    id: 'A1.2', section: 'A', tags: ['regression'],
    prompt: 'How should I store wine at home?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      containsAny(['temperature', 'humidity', 'light', 'horizontal', 'vibration', 'cool', 'dark']),
      responseLength({ min: 50, max: 500 }),
    ],
    judgeCriteria: 'Mentions temperature (12-14°C ideally), humidity, light avoidance, vibration, horizontal storage. Practical tone. Not overly technical.',
  },
  {
    id: 'A1.3', section: 'A', tags: ['regression'],
    prompt: "What does 'terroir' mean?",
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      containsAny(['soil', 'climate', 'geography', 'environment', 'land', 'terrain']),
    ],
    judgeCriteria: 'Clear, accessible explanation. References soil, climate, geography. Not overly academic. Shows personality.',
  },
  {
    id: 'A1.4', section: 'A', tags: ['regression'],
    prompt: 'Is screw cap wine bad?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      containsAny(['quality', 'cork', 'tradition', 'convenience', 'seal']),
    ],
    judgeCriteria: 'Balanced answer. Explains no correlation with quality. Mentions convenience + tradition debate. Not dismissive of either closure.',
  },
  {
    id: 'A1.5', section: 'A', tags: ['regression'],
    prompt: "What's a natural wine?",
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      containsAny(['intervention', 'sulfite', 'organic', 'minimal', 'additive']),
    ],
    judgeCriteria: 'Explains minimal intervention, low/no sulfites, organic grapes. Mentions controversy/spectrum fairly. Balanced.',
  },

  // A2. Food Pairing (General)
  {
    id: 'A2.1', section: 'A', tags: ['regression'],
    prompt: 'What wine goes with sushi?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      hasFrenchFlourish(),
      noToolCalls(),
      containsAny(['champagne', 'sparkling', 'riesling', 'pinot noir', 'sauvignon blanc', 'grüner']),
    ],
    judgeCriteria: 'Suggests Champagne/sparkling, dry Riesling, light Pinot Noir, or similar. Explains why (acidity, weight, delicacy). Not just one answer.',
  },
  {
    id: 'A2.2', section: 'A', tags: ['regression'],
    prompt: 'Best wine for a cheese board?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      responseLength({ min: 60, max: 600 }),
    ],
    judgeCriteria: 'Varies by cheese type. Mentions hard cheeses (Cab/Merlot), soft (Chardonnay), blue (Port/Sauternes). Not just one answer. Shows knowledge of pairings.',
  },
  {
    id: 'A2.3', section: 'A', tags: ['regression'],
    prompt: "I'm making lamb shanks tonight, what should I pair?",
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      containsAny(['shiraz', 'syrah', 'grenache', 'nebbiolo', 'cabernet', 'red', 'bold', 'rhône']),
    ],
    judgeCriteria: 'Bold red suggestions (Shiraz, Grenache, Nebbiolo, Rhône blends). Mentions braising liquid synergy or rich flavour matching. Specific and confident.',
  },
  {
    id: 'A2.4', section: 'A', tags: ['regression'],
    prompt: 'What wine pairs with chocolate dessert?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      containsAny(['port', 'banyuls', 'brachetto', 'sweet', 'maury', 'pedro ximénez', 'dessert']),
    ],
    judgeCriteria: 'Sweet reds (Banyuls, Ruby Port), possibly Brachetto or PX Sherry. Explains tannin-chocolate interaction or sweetness matching.',
  },

  // A3. Buying Advice (General)
  {
    id: 'A3.1', section: 'A', tags: ['regression'],
    prompt: "What's a good wine under $20 for a weeknight dinner?",
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      responseLength({ min: 40, max: 400 }),
    ],
    judgeCriteria: 'Specific producer/region suggestions at realistic $20 price point. Not vague ("any red"). Names actual wines or regions known for value.',
  },
  {
    id: 'A3.2', section: 'A', tags: ['regression'],
    prompt: 'Best Champagne for under $100?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      containsAny(['bollinger', 'pol roger', 'veuve', 'moët', 'taittinger', 'billecart', 'ruinart', 'perrier-jouët', 'charles heidsieck', 'nv', 'non-vintage']),
    ],
    judgeCriteria: 'Names actual Champagne producers. Distinguishes NV vs vintage where relevant. Realistic at under $100.',
  },
  {
    id: 'A3.3', section: 'A', tags: ['regression'],
    prompt: 'Is Penfolds Grange worth the price?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      containsAny(['penfolds', 'grange', 'shiraz', 'icon', 'premium', 'age', 'cellar']),
    ],
    judgeCriteria: 'Honest assessment. Mentions history, quality, iconic status. Also mentions alternatives at lower price. Not just "yes" or "no".',
  },
  {
    id: 'A3.4', section: 'A', tags: ['regression'],
    prompt: "What's the best wine region in the world?",
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      responseLength({ min: 60, max: 500 }),
    ],
    judgeCriteria: 'Subjective but informed. Mentions multiple regions. Doesn\'t give a single answer. Shows personality and French bias perhaps.',
  },

  // A4. Cellar Bridge Offer
  {
    id: 'A4.1', section: 'A', tags: ['regression'],
    prompt: "What's a good Pinot Noir?",
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      hasFrenchFlourish(),
      noToolCalls(),
      hasCellarBridgeOffer(),
      containsAny(['pinot noir', 'burgundy', 'oregon', 'central otago', 'willamette']),
    ],
    judgeCriteria: 'Answers from expertise about Pinot Noir (regions, styles). At end, offers ONCE: "Want me to check your Rave Cave?" or similar bridge. Bridge is natural, not forced.',
  },
  {
    id: 'A4.2', section: 'A', tags: ['regression'],
    prompt: 'Tell me about Burgundy',
    mode: 'general',
    priorTurns: [
      { role: 'user', content: "What's a good Pinot Noir?" },
      { role: 'assistant', content: "Ah, Pinot Noir — the heartbreak grape! Burgundy is the spiritual home, producing ethereal, complex wines. Oregon's Willamette Valley offers excellent New World expressions, and New Zealand's Central Otago delivers vibrant, fruit-forward styles. For value, try Bourgogne-level Burgundy or Chilean Pinot from Casablanca. Want me to check your Rave Cave for any Pinot Noir?" },
    ],
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      noCellarReferences(),
      containsAny(['burgundy', 'bourgogne', 'côte', 'terroir', 'pinot', 'chardonnay']),
    ],
    judgeCriteria: 'Answers normally about Burgundy. Does NOT re-offer the cellar bridge (already offered once). No cellar references.',
  },

  // A5. Out-of-Scope Handling
  {
    id: 'A5.1', section: 'A', tags: ['regression'],
    prompt: "What's the weather like today?",
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      redirectsToWine(),
    ],
    judgeCriteria: 'Politely redirects to wine topics. Stays in character as Rémy. Not rude or dismissive. May make a wine-weather joke.',
  },
  {
    id: 'A5.2', section: 'A', tags: ['regression'],
    prompt: 'Can you write me a poem?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
    ],
    judgeCriteria: 'Redirects to wine, OR writes a wine-themed poem. Either is acceptable. Stays in character.',
  },
  {
    id: 'A5.3', section: 'A', tags: ['regression'],
    prompt: 'How do I make beer?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      redirectsToWine(),
    ],
    judgeCriteria: 'Politely notes expertise is wine. May briefly mention beer-wine similarities. Redirects to wine topics.',
  },
  {
    id: 'A5.4', section: 'A', tags: ['regression'],
    prompt: 'Is wine good for my health?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      containsAny(['moderation', 'moderate', 'health', 'responsib']),
    ],
    judgeCriteria: 'General info only. Should NOT give medical advice. Mentions moderation prominently. May reference resveratrol or Mediterranean studies but with caveats.',
  },
];
