/**
 * Eval Harness — Structural Validators
 *
 * Deterministic regex/pattern checks that don't require LLM evaluation.
 * Each factory returns a StructuralValidator with a name and check function.
 */

import type { StructuralValidator, EvalResponse } from '../config/models.js';

// Unicode emoji regex — matches most common emoji ranges
const EMOJI_RE = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/u;

const FRENCH_PHRASES = [
  'magnifique', 'merveilleux', 'parfait', 'bien sûr', 'voilà',
  's\'il vous plaît', 'mon ami', 'très bien', 'bonsoir', 'bonjour',
  'formidable', 'extraordinaire', 'superbe', 'délicieux', 'bienvenue',
  'ah,', 'ah!', 'oh là là', 'c\'est', 'mais oui', 'bravo',
  'santé', 'chapeau', 'incroyable', 'fantastique', 'enchanté',
  'merci', 'rémy', 'n\'est-ce pas',
];

const WINE_FENCE_RE = /```wine\s*\n([\s\S]*?)```/g;

/**
 * Ensures ZERO emoji in the response.
 */
export function noEmoji(): StructuralValidator {
  return {
    name: 'noEmoji',
    check: (response) => {
      const match = response.text.match(EMOJI_RE);
      return {
        name: 'noEmoji',
        passed: !match,
        detail: match ? `Found emoji: ${match[0]}` : 'No emoji found',
      };
    },
  };
}

/**
 * Checks for at least one French flourish in the response.
 */
export function hasFrenchFlourish(): StructuralValidator {
  return {
    name: 'hasFrenchFlourish',
    check: (response) => {
      const lower = response.text.toLowerCase();
      const found = FRENCH_PHRASES.filter(p => lower.includes(p));
      return {
        name: 'hasFrenchFlourish',
        passed: found.length > 0,
        detail: found.length > 0 ? `Found: ${found.join(', ')}` : 'No French flourishes found',
      };
    },
  };
}

/**
 * Validates response word count is within bounds.
 */
export function responseLength(opts: { min?: number; max?: number }): StructuralValidator {
  return {
    name: 'responseLength',
    check: (response) => {
      const words = response.text.split(/\s+/).filter(Boolean).length;
      const minOk = opts.min === undefined || words >= opts.min;
      const maxOk = opts.max === undefined || words <= opts.max;
      return {
        name: 'responseLength',
        passed: minOk && maxOk,
        detail: `${words} words (bounds: ${opts.min ?? 0}-${opts.max ?? '∞'})`,
      };
    },
  };
}

/**
 * Verifies no tool calls were made.
 */
export function noToolCalls(): StructuralValidator {
  return {
    name: 'noToolCalls',
    check: (response) => {
      return {
        name: 'noToolCalls',
        passed: response.toolCalls.length === 0,
        detail: response.toolCalls.length === 0
          ? 'No tool calls'
          : `${response.toolCalls.length} tool calls: ${response.toolCalls.map(t => t.name).join(', ')}`,
      };
    },
  };
}

/**
 * Verifies a specific tool was called, optionally with matching args.
 */
export function hasToolCall(
  toolName: string,
  argChecks?: Record<string, unknown>,
): StructuralValidator {
  return {
    name: `hasToolCall(${toolName})`,
    check: (response) => {
      const matching = response.toolCalls.filter(t => t.name === toolName);
      if (matching.length === 0) {
        return {
          name: `hasToolCall(${toolName})`,
          passed: false,
          detail: `Tool ${toolName} was not called. Calls: ${response.toolCalls.map(t => t.name).join(', ') || 'none'}`,
        };
      }

      if (argChecks) {
        const argsMatch = matching.some(call => {
          return Object.entries(argChecks).every(([key, value]) => {
            const actual = call.args[key];
            if (typeof value === 'string' && typeof actual === 'string') {
              return actual.toLowerCase().includes(value.toLowerCase());
            }
            return JSON.stringify(actual) === JSON.stringify(value);
          });
        });
        return {
          name: `hasToolCall(${toolName})`,
          passed: argsMatch,
          detail: argsMatch
            ? `${toolName} called with expected args`
            : `${toolName} called but args didn't match. Expected: ${JSON.stringify(argChecks)}, Got: ${JSON.stringify(matching[0].args)}`,
        };
      }

      return {
        name: `hasToolCall(${toolName})`,
        passed: true,
        detail: `${toolName} called ${matching.length} time(s)`,
      };
    },
  };
}

/**
 * Checks that response contains at least one of the given terms (case-insensitive).
 */
export function containsAny(terms: string[]): StructuralValidator {
  return {
    name: 'containsAny',
    check: (response) => {
      const lower = response.text.toLowerCase();
      const found = terms.filter(t => lower.includes(t.toLowerCase()));
      return {
        name: 'containsAny',
        passed: found.length > 0,
        detail: found.length > 0
          ? `Found: ${found.join(', ')}`
          : `None of [${terms.join(', ')}] found`,
      };
    },
  };
}

/**
 * Checks that response contains all of the given terms (case-insensitive).
 */
export function containsAll(terms: string[]): StructuralValidator {
  return {
    name: 'containsAll',
    check: (response) => {
      const lower = response.text.toLowerCase();
      const missing = terms.filter(t => !lower.includes(t.toLowerCase()));
      return {
        name: 'containsAll',
        passed: missing.length === 0,
        detail: missing.length === 0
          ? `All terms present`
          : `Missing: ${missing.join(', ')}`,
      };
    },
  };
}

/**
 * Checks for ```wine fenced blocks containing valid JSON wine cards.
 */
export function hasWineCards(opts?: { minCount?: number; maxCount?: number }): StructuralValidator {
  return {
    name: 'hasWineCards',
    check: (response) => {
      const matches = [...response.text.matchAll(WINE_FENCE_RE)];
      let totalCards = 0;

      for (const match of matches) {
        try {
          const parsed = JSON.parse(match[1].trim());
          const wines = Array.isArray(parsed) ? parsed : [parsed];
          const valid = wines.filter(
            (w: any) => typeof w.producer === 'string' && typeof w.name === 'string'
          );
          totalCards += valid.length;
        } catch {
          // Invalid JSON — don't count
        }
      }

      const minOk = opts?.minCount === undefined || totalCards >= opts.minCount;
      const maxOk = opts?.maxCount === undefined || totalCards <= opts.maxCount;

      return {
        name: 'hasWineCards',
        passed: minOk && maxOk,
        detail: `${totalCards} wine cards (bounds: ${opts?.minCount ?? 0}-${opts?.maxCount ?? '∞'})`,
      };
    },
  };
}

/**
 * Checks that specific markdown ## headers are present.
 */
export function hasMarkdownSections(headers: string[]): StructuralValidator {
  return {
    name: 'hasMarkdownSections',
    check: (response) => {
      const missing = headers.filter(h => {
        const re = new RegExp(`^##\\s+${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'mi');
        return !re.test(response.text);
      });
      return {
        name: 'hasMarkdownSections',
        passed: missing.length === 0,
        detail: missing.length === 0
          ? `All ${headers.length} sections present`
          : `Missing sections: ${missing.join(', ')}`,
      };
    },
  };
}

/**
 * Ensures no cellar/inventory references in general mode responses.
 */
export function noCellarReferences(): StructuralValidator {
  const cellarTerms = [
    'your cellar', 'your collection', 'your inventory',
    'in your cave', 'your rave cave', 'your wines',
    'you have in', 'you own',
  ];
  return {
    name: 'noCellarReferences',
    check: (response) => {
      const lower = response.text.toLowerCase();
      const found = cellarTerms.filter(t => lower.includes(t));
      return {
        name: 'noCellarReferences',
        passed: found.length === 0,
        detail: found.length === 0
          ? 'No cellar references'
          : `Found cellar references: ${found.join(', ')}`,
      };
    },
  };
}

/**
 * Checks for a cellar bridge offer (invitation to check the user's cellar).
 */
export function hasCellarBridgeOffer(): StructuralValidator {
  const bridgePhrases = [
    'rave cave', 'check your', 'your cellar', 'your collection',
    'look in your', 'search your', 'want me to check',
    'shall i check', 'would you like me to check',
    'see what you have', 'see if you have',
  ];
  return {
    name: 'hasCellarBridgeOffer',
    check: (response) => {
      const lower = response.text.toLowerCase();
      const found = bridgePhrases.filter(t => lower.includes(t));
      return {
        name: 'hasCellarBridgeOffer',
        passed: found.length > 0,
        detail: found.length > 0
          ? `Bridge offer found: ${found.join(', ')}`
          : 'No cellar bridge offer detected',
      };
    },
  };
}

/**
 * Checks that the response redirects to wine topics (for out-of-scope queries).
 */
export function redirectsToWine(): StructuralValidator {
  const wineTerms = ['wine', 'sommelier', 'bottle', 'vineyard', 'cellar', 'grape', 'vintage'];
  return {
    name: 'redirectsToWine',
    check: (response) => {
      const lower = response.text.toLowerCase();
      const found = wineTerms.filter(t => lower.includes(t));
      return {
        name: 'redirectsToWine',
        passed: found.length > 0,
        detail: found.length > 0
          ? `Wine redirect terms: ${found.join(', ')}`
          : 'No wine-related redirect found',
      };
    },
  };
}
