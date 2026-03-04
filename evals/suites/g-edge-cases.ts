/**
 * Section G: Edge Cases & Robustness — 11 automatable tests
 * G1.5 (empty message) is UI-only. G2.3 (network error) and G2.4 (tool loop max)
 * are handled differently in eval (G2.3 tests simulator fallback, G2.4 tests max rounds).
 */

import type { EvalTestCase } from '../config/models.js';
import {
  noEmoji, hasFrenchFlourish, responseLength,
  containsAny, hasToolCall, noToolCalls, redirectsToWine,
} from '../validators/structural.js';

export const sectionG: EvalTestCase[] = [
  // G1. Conversation Flow
  {
    id: 'G1.1', section: 'G', tags: ['regression'],
    prompt: 'What wine should I have with dinner tonight?',
    mode: 'cellar',
    priorTurns: [
      // Simulate 8 prior exchanges to test context handling
      { role: 'user', content: 'Hi Rémy!' },
      { role: 'assistant', content: 'Bonsoir! Welcome to the Rave Cave. How may I assist you tonight?' },
      { role: 'user', content: 'How many bottles do I have?' },
      { role: 'assistant', content: 'You have a lovely collection of about 75 bottles across various styles.' },
      { role: 'user', content: 'What types do I have the most of?' },
      { role: 'assistant', content: 'Reds dominate your cellar, followed by whites and a nice selection of sparkling and dessert wines.' },
      { role: 'user', content: 'Tell me about my French wines.' },
      { role: 'assistant', content: 'Your French selection is magnifique — Château Margaux, DRC Échezeaux, Domaine Tempier from Bandol, Domaine Leflaive from Burgundy, Trimbach from Alsace, and the stunning Château d\'Yquem. A very impressive collection!' },
      { role: 'user', content: 'What about Italian wines?' },
      { role: 'assistant', content: 'You have the wonderful Antinori Tignanello 2019 from Tuscany — a Super Tuscan blend.' },
      { role: 'user', content: 'I want to try something Spanish tonight.' },
      { role: 'assistant', content: 'Excellent choice! Your Spanish cellar features the Vega Sicilia Unico 2012 and the Lustau Palo Cortado sherry.' },
      { role: 'user', content: 'Tell me more about the Vega Sicilia.' },
      { role: 'assistant', content: 'The Vega Sicilia Unico 2012 is a legendary Ribera del Duero — mostly Tempranillo, rated 96/100. Dried fruits, balsamic, cigar box complexity. A magnificent wine.' },
    ],
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      responseLength({ min: 30, max: 600 }),
    ],
    judgeCriteria: 'After 8 prior exchanges, Remy handles the new question coherently. Doesn\'t reference messages that should be outside the sliding window. No errors or confusion. Calls queryInventory for dinner recommendation.',
  },
  {
    id: 'G1.2', section: 'G', tags: ['regression'],
    prompt: 'What is Riesling?',
    mode: 'general',
    priorTurns: [
      { role: 'user', content: 'What is Riesling?' },
      { role: 'assistant', content: 'Riesling is one of the world\'s great white grape varieties, originating from Germany\'s Rhine region. Known for its piercing acidity, floral aromatics, and incredible versatility — from bone-dry to lusciously sweet.' },
      { role: 'user', content: 'What is Riesling?' },
      { role: 'assistant', content: 'As I mentioned, Riesling is a noble white grape from Germany. Its hallmarks are vibrant acidity, aromatic intensity, and the ability to express terroir beautifully across many styles.' },
    ],
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      containsAny(['riesling', 'grape', 'white', 'german', 'acidity']),
    ],
    judgeCriteria: 'Consistent answers across 3 asks. Doesn\'t get confused or loop. May acknowledge the repeated question naturally. Doesn\'t contradict previous answers.',
  },
  {
    id: 'G1.3', section: 'G', tags: ['regression'],
    prompt: 'Now show me my Australian reds.',
    mode: 'cellar',
    priorTurns: [
      { role: 'user', content: 'What is Pinot Noir?' },
      { role: 'assistant', content: 'Pinot Noir is the heartbreak grape — difficult to grow but capable of producing the most ethereal wines in the world. Burgundy is its spiritual home. Want me to check your Rave Cave for any Pinot Noir?' },
      { role: 'user', content: 'Yes please!' },
      { role: 'assistant', content: 'Très bien! I found 2 Pinot Noirs in your cellar: the magnificent DRC Échezeaux 2018 and a lovely Cloudy Bay Pinot Noir 2020 from Central Otago.' },
    ],
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['australia', 'penfolds', 'henschke', 'torbreck', 'wynns', 'yellow tail']),
    ],
    judgeCriteria: 'Handles transition from general to cellar mode smoothly. Calls queryInventory with country: "Australia", wineType: "Red". Doesn\'t lose context or reference Pinot Noir query inappropriately.',
  },
  {
    id: 'G1.4', section: 'G', tags: ['regression'],
    prompt: 'I\'ve been thinking a lot about wine lately and I want to understand more about the relationship between soil composition, specifically limestone and clay-based soils versus volcanic terroir, and how these different geological foundations influence the mineral character, tannin structure, and aging potential of Cabernet Sauvignon wines across different regions like Bordeaux, Napa Valley, Coonawarra, and emerging high-altitude regions in Argentina. Can you give me a comprehensive comparison with specific examples of how terroir translates to flavor profiles?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      responseLength({ min: 100, max: 800 }),
    ],
    judgeCriteria: 'Handles very long message (500+ chars) gracefully. Response is proportionate — detailed but not excessively long. Addresses the key points (soil types, regions, Cabernet). Organized and coherent.',
  },
  {
    id: 'G1.6', section: 'G', tags: ['regression'],
    prompt: 'do i hav any shraz or cabarnet in my sellr?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['shiraz', 'cabernet']),
    ],
    judgeCriteria: 'Remy understands intent despite typos (shraz → Shiraz, cabarnet → Cabernet, sellr → cellar). Calls queryInventory correctly. Reports actual results.',
  },

  // G2. Tool Failure Scenarios
  {
    id: 'G2.1', section: 'G', tags: ['regression'],
    prompt: 'Show me my German Rieslings',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['no', 'none', 'don\'t', 'not found', 'couldn\'t find', 'no german']),
    ],
    judgeCriteria: 'Calls queryInventory with country: "Germany" or similar. Gets 0 results (no German wines in fixture). Acknowledges nothing found. Doesn\'t fabricate wines. May suggest broadening search or noting existing Alsace Riesling.',
  },
  {
    id: 'G2.2', section: 'G', tags: ['regression'],
    prompt: 'Show me my Craft Beer collection',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      containsAny(['beer', 'wine', 'type', 'not', 'sommelier']),
    ],
    judgeCriteria: 'Either redirects to wine (beer isn\'t a wine type) or queries and reports no matches. Doesn\'t fabricate results. May suggest correct wine types.',
  },

  // G3. Personality & Tone
  {
    id: 'G3.1', section: 'G', tags: ['regression'],
    prompt: "What's a good wine for a romantic dinner?",
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      hasFrenchFlourish(),
      noToolCalls(),
      responseLength({ min: 50, max: 500 }),
    ],
    judgeCriteria: 'French flourishes present naturally (not forced). Warm, sophisticated tone. Romantic dinner context embraced. Personality comes through. At least one French phrase.',
  },
  {
    id: 'G3.2', section: 'G', tags: ['regression'],
    prompt: 'Recommend a wine for pasta night',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      responseLength({ min: 30, max: 500 }),
    ],
    judgeCriteria: 'ZERO emoji in response. This test ONLY checks for emoji — ignore all other aspects like cellar references, bridge offers, or tone. Check every character for emoji. If zero emoji found, score 9-10.',
  },
  {
    id: 'G3.4', section: 'G', tags: ['regression'],
    prompt: 'Is Burgundy better than Bordeaux?',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
      containsAny(['burgundy', 'bordeaux', 'opinion', 'both', 'different', 'prefer']),
      responseLength({ min: 60, max: 600 }),
    ],
    judgeCriteria: 'Gives opinionated but balanced take. Shows personality ("In my humble French opinion..." or similar). Doesn\'t refuse to answer. Acknowledges both regions\' strengths.',
  },
  {
    id: 'G3.5', section: 'G', tags: ['regression'],
    prompt: 'Tell me a funny wine joke',
    mode: 'general',
    structuralValidators: [
      noEmoji(),
      noToolCalls(),
    ],
    judgeCriteria: 'Shows wit within sommelier character. Tells a wine-related joke or humorous anecdote. Doesn\'t break persona. Stays as Rémy.',
  },
];
