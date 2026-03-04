/**
 * Section H: Voice Input — 2 text-proxy tests (H1.1, H1.3)
 * H1.2 (background noise) and H1.4 (TTS quality) are hardware-only.
 */

import type { EvalTestCase } from '../config/models.js';
import {
  noEmoji, hasToolCall, containsAny,
} from '../validators/structural.js';

export const sectionH: EvalTestCase[] = [
  {
    id: 'H1.1', section: 'H', tags: [],
    prompt: 'What wines do I have?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      // In cellar mode, this should either answer from summary or call queryInventory
      containsAny(['bottle', 'cellar', 'collection', 'wine', 'red', 'white']),
    ],
    judgeCriteria: 'Simulates speech-to-text input "What wines do I have?". Cellar intent detected correctly. Responds with cellar overview or calls queryInventory. Accurate to fixture data.',
  },
  {
    id: 'H1.3', section: 'H', tags: [],
    prompt: 'Do I have any Château Margaux or Côtes du Rhône?',
    mode: 'cellar',
    structuralValidators: [
      noEmoji(),
      hasToolCall('queryInventory'),
      containsAny(['margaux', 'château']),
    ],
    judgeCriteria: 'French wine names (Château Margaux, Côtes du Rhône) recognized correctly. Calls queryInventory. Should find Château Margaux but not Côtes du Rhône. Reports accurately.',
  },
];
