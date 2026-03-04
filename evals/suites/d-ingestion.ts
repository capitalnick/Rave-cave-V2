/**
 * Section D: Ingestion Flow — 7 automatable tests (D1.1-D1.3, D2.1-D2.3, D2.5)
 * D1.4 (wine list photo) and D2.4 (enrichment verification) are UI/hardware-only.
 */

import type { EvalTestCase } from '../config/models.js';
import {
  noEmoji, hasToolCall, containsAny, responseLength,
} from '../validators/structural.js';

export const sectionD: EvalTestCase[] = [
  // D1. Label Extraction via Chat
  {
    id: 'D1.1', section: 'D', tags: ['regression'],
    prompt: 'I just took a photo of this wine label.',
    mode: 'ingestion',
    // Simulate a clear wine label by describing it in text (no actual image in automated tests)
    priorTurns: [
      { role: 'user', content: '[System: User has uploaded a wine label image showing: Penfolds Bin 28, Kalimna Shiraz, 2021, South Australia. Clear, well-lit photo.]' },
    ],
    structuralValidators: [
      noEmoji(),
      hasToolCall('stageWine'),
      containsAny(['penfolds', 'bin 28', 'shiraz', '2021', 'price', 'how much']),
    ],
    judgeCriteria: 'Remy calls stageWine with extracted data: producer "Penfolds", name "Bin 28" or "Kalimna", vintage 2021, type "Red", grapeVarieties including Shiraz. Wine name follows rules (not duplicating producer). Asks for price.',
  },
  {
    id: 'D1.2', section: 'D', tags: ['regression'],
    prompt: 'Here\'s a photo of this label, but it\'s a bit blurry.',
    mode: 'ingestion',
    priorTurns: [
      { role: 'user', content: '[System: User has uploaded a blurry wine label. Visible: "Ch..." possibly Chardonnay or Château, vintage partially visible "201_", France visible. Much of the text is illegible.]' },
    ],
    structuralValidators: [
      noEmoji(),
      containsAny(['unclear', 'can\'t', 'confirm', 'difficult', 'hard to read', 'blurry', 'make out', 'see', 'certain']),
    ],
    judgeCriteria: 'Remy extracts what it can from the blurry image. Asks user to confirm uncertain fields. Doesn\'t fill in random data. May call stageWine with partial data or ask first.',
  },
  {
    id: 'D1.3', section: 'D', tags: ['regression'],
    prompt: 'What can you tell me about this?',
    mode: 'ingestion',
    priorTurns: [
      { role: 'user', content: '[System: User has uploaded an image that is NOT a wine label — it appears to be a photo of a cat.]' },
    ],
    structuralValidators: [
      noEmoji(),
      containsAny(['wine label', 'not a wine', 'label', 'wine', 'bottle']),
    ],
    judgeCriteria: 'Remy recognizes it\'s not a wine label. Politely asks for a wine label instead. Does NOT call stageWine. Stays in character.',
  },

  // D2. Staging & Commit
  {
    id: 'D2.1', section: 'D', tags: ['regression'],
    prompt: '$35',
    mode: 'ingestion',
    stagedWine: {
      producer: 'Penfolds',
      name: 'Bin 28',
      vintage: 2021,
      type: 'Red',
      grapeVarieties: [{ name: 'Shiraz' }],
      region: 'South Australia',
      country: 'Australia',
    },
    priorTurns: [
      { role: 'user', content: '[System: User uploaded wine label for Penfolds Bin 28 Shiraz 2021]' },
      { role: 'assistant', content: 'Magnifique! I\'ve identified this as a **Penfolds Bin 28 Kalimna Shiraz 2021** from South Australia. A wonderful wine! How much did you pay for this bottle, and how many would you like to add?' },
    ],
    structuralValidators: [
      noEmoji(),
      hasToolCall('commitWine'),
      containsAny(['added', 'cellar', 'success', 'committed', 'welcome', 'collection']),
    ],
    judgeCriteria: 'Remy calls commitWine with price: 35, quantity: 1 (default). Confirms wine added successfully. Stays in character.',
  },
  {
    id: 'D2.2', section: 'D', tags: ['regression'],
    prompt: 'forty dollars for 3 bottles',
    mode: 'ingestion',
    stagedWine: {
      producer: 'Cloudy Bay',
      name: '',
      vintage: 2023,
      type: 'White',
      grapeVarieties: [{ name: 'Sauvignon Blanc' }],
      region: 'Marlborough',
      country: 'New Zealand',
    },
    priorTurns: [
      { role: 'user', content: '[System: User uploaded wine label for Cloudy Bay Sauvignon Blanc 2023]' },
      { role: 'assistant', content: 'Ah, a classic Marlborough Sauvignon Blanc from Cloudy Bay, vintage 2023! How much did you pay, and how many bottles shall I add?' },
    ],
    structuralValidators: [
      noEmoji(),
      hasToolCall('commitWine'),
    ],
    judgeCriteria: 'Remy parses price (40) and quantity (3) from natural language. commitWine called with price: 40, quantity: 3. Confirms addition.',
  },
  {
    id: 'D2.3', section: 'D', tags: ['regression'],
    prompt: 'Actually, the producer is wrong — it should be Shaw and Smith, not Cloudy Bay',
    mode: 'ingestion',
    stagedWine: {
      producer: 'Cloudy Bay',
      name: '',
      vintage: 2023,
      type: 'White',
      grapeVarieties: [{ name: 'Sauvignon Blanc' }],
      region: 'Marlborough',
      country: 'New Zealand',
    },
    priorTurns: [
      { role: 'user', content: '[System: User uploaded wine label]' },
      { role: 'assistant', content: 'I\'ve identified this as Cloudy Bay Sauvignon Blanc 2023 from Marlborough. How much did you pay?' },
    ],
    structuralValidators: [
      noEmoji(),
      containsAny(['shaw', 'smith', 'updated', 'corrected', 'noted', 'changed', 'stage']),
    ],
    judgeCriteria: 'Remy acknowledges the correction. Should update the staged wine data (call stageWine again with corrected producer) before committing. Does NOT just commit the wrong data.',
  },
  {
    id: 'D2.5', section: 'D', tags: ['regression'],
    prompt: '$25',
    mode: 'ingestion',
    stagedWine: {
      producer: 'Test Wine',
      name: '',
      vintage: 2023,
      type: 'Red',
    },
    priorTurns: [
      { role: 'user', content: '[System: User is at 50-bottle cap on free tier. User uploaded wine label.]' },
      { role: 'assistant', content: 'I\'ve identified this as Test Wine Red 2023. How much did you pay?' },
      { role: 'user', content: '[System Note: The user\'s cellar currently has 50 bottles, which is the maximum for the free plan. commitWine will fail with a cap error.]' },
    ],
    structuralValidators: [
      noEmoji(),
      containsAny(['cap', 'limit', 'full', 'upgrade', 'premium', 'maximum', 'cannot', 'can\'t']),
    ],
    judgeCriteria: 'Remy reports bottle cap reached (50 bottles on free plan). Suggests Premium upgrade. Does NOT add the wine. Handles gracefully.',
  },
];
