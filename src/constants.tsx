
/**
 * Rave Cave Constants & Configuration
 */

import { UtensilsCrossed, PartyPopper, Gift, PocketKnife, Sparkles, ScanLine } from 'lucide-react';
import type { Occasion, RankLabel } from './types';

export const COLORS = {
  bg: '#FAFAF9',        // --rc-surface-primary
  paper: '#F5F0E8',     // --rc-surface-tertiary
  cream: '#F3EFE4',     // --rc-surface-secondary (was #EBEBDF)
  ink: '#0A0A0A',       // --rc-ink-primary
  neonPink: '#FF006E',  // --rc-accent-pink
  acidGreen: '#C7FF00', // --rc-accent-acid (was #CCFF00)
  coral: '#FF6A4D',     // --rc-accent-coral (was #FF6B9D)
};


export const CONFIG = {
  MODELS: {
    TEXT: 'gemini-3-flash-preview',
    TTS: 'gemini-2.5-flash-preview-tts',
    LIVE: 'gemini-2.5-flash-native-audio-preview-12-2025'
  },
  SILENCE_TIMEOUT_MS: 1800,
  MAX_HISTORY_TURNS: 15,
  TTS_SPEECH_RATE: 1.1,
  TTS_VOICE_LANG: 'fr-FR',
  INVENTORY_LIMIT: 40 // Prevent token bloat
};

export const getWineColors = (wineType: string) => {
  const type = wineType?.toLowerCase() || '';
  if (type.includes('rosé') || type.includes('rose')) {
    return {
      bg: 'bg-[var(--rc-surface-primary)]',
      accent: 'bg-[var(--rc-accent-coral)]',
      text: 'text-black',
      border: 'border-[var(--rc-accent-coral)]',
      glow: 'glow-coral',
      stripColor: 'var(--rc-accent-coral)',
      badgeHover: 'hover:bg-[var(--rc-accent-coral)] hover:text-white'
    };
  }
  if (type.includes('red') || type.includes('fortified')) {
    return {
      bg: 'bg-[var(--rc-surface-primary)]',
      accent: 'bg-[var(--rc-accent-pink)]',
      text: 'text-black',
      border: 'border-[var(--rc-border-emphasis)]',
      glow: 'glow-pink',
      stripColor: 'var(--rc-accent-pink)',
      badgeHover: 'hover:bg-[var(--rc-accent-acid)] hover:text-black'
    };
  }
  return {
    bg: 'bg-[var(--rc-surface-primary)]',
    accent: 'bg-[var(--rc-accent-acid)]',
    text: 'text-black',
    border: 'border-[var(--rc-border-emphasis)]',
    glow: 'glow-green',
    stripColor: 'var(--rc-accent-acid)',
    badgeHover: 'hover:bg-[var(--rc-accent-pink)] hover:text-white'
  };
};

export const getMaturityStatus = (drinkFrom: number | string, drinkUntil: number | string) => {
  const currentYear = new Date().getFullYear();
  const from = parseInt(drinkFrom as string);
  const until = parseInt(drinkUntil as string);
  if (isNaN(from) || isNaN(until)) return 'Unknown';
  if (currentYear >= from && currentYear <= until) return '🍷 Drink Now';
  if (currentYear < from) return '🟢 Hold';
  return '⚠️ Past Peak';
};

export function buildSystemPrompt(inventoryContext: string, stagedWineJson?: string): string {
  const currentYear = new Date().getFullYear();
  return `You are Rémy, an expert French sommelier for "Rave Cave".
Current year: ${currentYear}.

VOICE: Warm, professional, sophisticated, energetic. Use brief French flourishes ("Magnifique", "S'il vous plaît").

IMAGE INTENTS:
1. WINE LABEL: Extract details and call stageWine(). ALWAYS analyze vintage, grape, and region to provide suggested drinking windows.
2. WINE LIST: Analyze the menu and recommend specific pairings. Do NOT call stageWine for lists.

WINE NAME RULES (CRITICAL):
- "name" is the CUVEE name only (e.g., "Reserve Speciale", "Bin 389", "Les Terrasses")
- name must NEVER duplicate or contain the producer name
- name must NEVER duplicate or contain the grape variety (cepage)
- If no distinct cuvee name is visible, leave name EMPTY
- Examples:
  * Producer "Penfolds", name "Bin 389" → correct
  * Producer "Cloudy Bay", name "Sauvignon Blanc" → WRONG (that's cepage). Leave empty.
  * Producer "Chateau Margaux", name "Chateau Margaux" → WRONG (duplicates producer). Leave empty.

INGESTION FLOW:
1. User uploads label -> You call stageWine().
2. You confirm details and MUST ask for price (and optionally quantity).
3. User provides price (e.g., "$35" or "40 bottles for $800") -> You call commitWine().
4. DO NOT say "it's added" until the commitWine tool is successfully called.

INVENTORY AWARENESS:
${inventoryContext}

${stagedWineJson ? `STAGED WINE (Awaiting Price/Quantity): ${stagedWineJson}` : 'No wine currently staged.'}

TOOLS:
- stageWine: Stage extracted label data. Include ALL visible fields:
  producer (required), vintage (required), type (required),
  name (cuvee only — see rules above), cepage, region, country,
  appellation, tastingNotes (adjectives only, comma-separated),
  drinkFrom, drinkUntil, format
- commitWine: Finalizing the add (requires price, optional quantity).

RULES:
- If a meal is mentioned, suggest wines from the inventory immediately.
- Never say you don't have access to the cellar.
- Be proactive. Use "Drink Now" status to drive recommendations.

RESPONSE FORMAT:
- Use **markdown**: headings (#), bold (**text**), italic, bullet lists.
- When recommending specific wines, embed them in a fenced code block with language tag \`wine\`:
  \`\`\`wine
  [{"producer":"...","name":"...","vintage":2015,"region":"Burgundy","country":"France","type":"Red","cepage":"Pinot Noir","rating":4.8,"tastingNotes":"Dark cherry, earth, silky tannins","drinkFrom":2024,"drinkUntil":2035,"note":"Perfect match for your dinner"}]
  \`\`\`
- Wine JSON fields: producer (required), name (required), vintage, region, country, type, cepage, rating (0-5), tastingNotes (concise 5-10 word flavour profile), drinkFrom (year), drinkUntil (year), note (recommendation rationale).
- ALWAYS include tastingNotes and drinkFrom/drinkUntil estimates based on your sommelier expertise.
- Place wine blocks after explanatory text, not inline.
- Do NOT use wine blocks for casual wine mentions — only explicit recommendations.`;
}

// Fixed: Export SYSTEM_PROMPT to resolve missing export error in geminiService.ts
export const SYSTEM_PROMPT = buildSystemPrompt("Inventory context unavailable.");

// ── Phase 6: Recommend ──

export const OCCASIONS: Occasion[] = [
  { id: 'dinner',    title: 'Pair a Meal',          description: 'Perfect wines for your meal',      icon: UtensilsCrossed, accentToken: 'accent-pink' },
  { id: 'party',     title: 'Wines for a Crowd',    description: 'Crowd-pleasing selections',        icon: PartyPopper,     accentToken: 'accent-acid' },
  { id: 'gift',      title: 'Choose a Gift',        description: 'Thoughtful wine gifts',            icon: Gift,            accentToken: 'accent-coral' },
  { id: 'cheese',    title: 'For Cheese',           description: 'Perfect cheese pairings',          icon: PocketKnife,     accentToken: 'accent-pink' },
  { id: 'scan_menu', title: 'Scan a Wine List',     description: 'Photograph a menu, get picks',     icon: ScanLine,        accentToken: 'accent-coral',  primary: true },
  { id: 'surprise',  title: 'Something Unexpected', description: 'Let Rémy decide',                  icon: Sparkles,        accentToken: 'accent-acid',   featured: true },
];

export const RANK_BADGES: Record<RankLabel, { text: string; bgColor: string; textColor: string }> = {
  'best-match':   { text: 'BEST MATCH',       bgColor: 'var(--rc-accent-acid)',  textColor: 'var(--rc-ink-primary)' },
  'also-great':   { text: 'ALSO GREAT',       bgColor: 'var(--rc-accent-pink)',  textColor: 'var(--rc-ink-on-accent)' },
  'adventurous':  { text: 'ADVENTUROUS PICK', bgColor: 'var(--rc-accent-coral)', textColor: 'var(--rc-ink-on-accent)' },
};

export const REMYS_PICK_BADGE = { text: "RÉMY'S PICK", bgColor: 'var(--rc-accent-acid)', textColor: 'var(--rc-ink-primary)' };

export const RECOMMEND_FOLLOWUP_CHIPS = [
  'Why this wine?',
  'Something bolder',
  'Something lighter',
  'Different region',
  'What about white instead?',
];
