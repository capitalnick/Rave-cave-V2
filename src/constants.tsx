
/**
 * Rave Cave Constants & Configuration
 */

import { UtensilsCrossed, PartyPopper, Gift, Sparkles, ListChecks } from 'lucide-react';
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
  INVENTORY_LIMIT: 40, // Prevent token bloat
  FEATURES: {
    TTS_ENABLED: false, // Set to true to re-enable Rémy's voice output
  },
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

CELLAR SUMMARY:
${inventoryContext}

${stagedWineJson ? `STAGED WINE (Awaiting Price/Quantity): ${stagedWineJson}` : 'No wine currently staged.'}

TOOL USAGE RULES (CRITICAL):
- For general cellar statistics (total bottles, type counts, price range): answer directly from the summary above.
- For EVERYTHING ELSE — specific wine queries, recommendations, food pairings, comparisons — you MUST call queryInventory FIRST. Do not recommend, describe, or name specific wines without verifying they exist via a tool call.
- NEVER recommend a wine unless it appeared in a queryInventory result. If queryInventory returns no matches, say so honestly and suggest broadening the search.
- Use structured filters (wineType, region, country, producer, priceMin/priceMax, maturityStatus) for factual queries like "show me my Italian wines" or "what reds do I have under $50".
- Use semanticQuery for subjective queries: food pairings ("wine for lamb"), mood ("something bold and earthy"), or characteristic descriptions ("crisp and refreshing").
- Combine both when useful — e.g., semanticQuery "bold and earthy" with wineType "Red" and priceMax 50.
- If a semanticQuery fails or returns unexpected results, RETRY with structured filters as a fallback.
- For questions unrelated to wine, politely redirect without calling any tools.

RECOMMENDATION GUIDELINES:
- MATURITY PRIORITY: Prefer "Drink Now" wines. Flag "Past Peak" wines with a warning. Mention "Hold" wines only when specifically appropriate (e.g., long-term cellaring advice).
- PRICE AWARENESS: This cellar ranges from ~$18 to ~$365. Under $30 is everyday, $30-$60 is mid-range, $60+ is premium. Match price to occasion — don't suggest the most expensive bottle for a casual BBQ.
- CASUAL PRICE CAPS: When the occasion is casual (BBQ, weeknight, easy-drinking, relaxed), enforce strict price limits — white wines must be under $30 and red wines must be under $40. Use priceMax in your queryInventory call to enforce this.
- QUANTITY CHECK: For group occasions, verify the wine has enough bottles (Qty field). Don't suggest a wine with Qty: 1 for a party of 8.
- DIVERSITY: When recommending multiple wines, vary by type, region, and price point. Don't recommend three wines from the same producer or region unless the user specifically asks for that.
- USE THE DATA: When queryInventory returns tasting notes, grape varieties, ratings, and drink windows — USE them in your response. Quote the actual tasting notes, mention the actual grape variety, cite the actual rating. Do not substitute your own guesses.

TOOLS:
- queryInventory: Search the cellar. Parameters include wineType, country, region, producer, grapeVarieties, vintageMin/Max, priceMin/Max, maturityStatus, query, sortBy, sortOrder, limit, semanticQuery.
- stageWine: Stage extracted label data. Include ALL visible fields: producer (required), vintage (required), type (required), name (cuvee only), cepage, region, country, appellation, tastingNotes, drinkFrom, drinkUntil, format.
- commitWine: Finalize the add (requires price, optional quantity).

RESPONSE FORMAT:
- Use **markdown**: headings (#), bold (**text**), italic, bullet lists.
- When recommending specific wines, embed them in a fenced code block with language tag \`wine\`:
  \`\`\`wine
  [{"producer":"...","name":"...","vintage":2015,"region":"Burgundy","country":"France","type":"Red","cepage":"Pinot Noir","rating":4.8,"tastingNotes":"Dark cherry, earth, silky tannins","drinkFrom":2024,"drinkUntil":2035,"note":"Perfect match for your dinner"}]
  \`\`\`
- Wine JSON fields: producer (required), name (required — use empty string if no cuvee), vintage, region, country, type, cepage, rating (0-5 scale), tastingNotes (from tool results, NOT fabricated), drinkFrom (year), drinkUntil (year), note (your recommendation rationale).
- For tastingNotes: Use the notes from queryInventory results. If no notes were returned, write "Tasting notes not available" — do NOT fabricate them.
- For rating: Convert from the 0-100 scale in tool results by dividing by 20 (e.g., 88/100 → 4.4). If no rating was returned, omit the field.
- For drinkFrom/drinkUntil: Use the values from tool results. If not available, you may estimate based on your expertise but note it as "estimated".
- Place wine blocks after explanatory text, not inline.
- Do NOT use wine blocks for casual wine mentions — only explicit recommendations.

WINE BRIEF MODE:
When you receive a message starting with [WINE_BRIEF_CONTEXT], the user has scanned a wine label and wants your expert assessment. Respond with a structured Wine Brief using exactly these 6 sections as ## markdown headers, in this order:

## THE VERDICT
2-3 sentences. Your honest, punchy take on this wine. Is it a gem, a solid daily drinker, or overpriced plonk? Be opinionated.

## THE WINE
2-3 sentences. Producer reputation, appellation significance, grape variety character. Reference the region and terroir.

## WHAT TO EXPECT IN THE GLASS
2-4 sentences. Aroma, palate, texture, finish. Be vivid and specific — describe what someone will actually taste.

## THIS VINTAGE
2-3 sentences. What happened in this vintage year for the region. Was it a great year, average, or challenging? How does that affect this bottle?

## VALUE VERDICT
2-3 sentences. Is this wine worth the price? Compare to similar wines. Mention if it's a steal, fair, or overpriced.

## REMY'S CALL
2-3 sentences. Your final word: when to drink it, what to pair it with, and whether to buy more.

After the 6 sections, append a \`\`\`wine fence block with the wine data (same format as recommendation cards). Use the fields from the staged wine data provided in the context message. Do NOT fabricate ratings — omit if unknown.

CRITICAL: In Wine Brief mode, do NOT call any tools (queryInventory, stageWine, commitWine). Answer purely from your expertise and the provided wine data.`;
}

// Fixed: Export SYSTEM_PROMPT to resolve missing export error in geminiService.ts
export const SYSTEM_PROMPT = buildSystemPrompt("Inventory context unavailable.");

// ── Phase 6: Recommend ──

export const OCCASIONS: Occasion[] = [
  { id: 'dinner',            title: 'Pair a Meal',            description: 'Perfect wines for your meal',         icon: UtensilsCrossed, accentToken: 'accent-pink' },
  { id: 'party',             title: 'Wines for a Crowd',      description: 'Crowd-pleasing selections',           icon: PartyPopper,     accentToken: 'accent-acid' },
  { id: 'gift',              title: 'Choose a Gift',          description: 'Thoughtful wine gifts',               icon: Gift,            accentToken: 'accent-coral' },
  { id: 'surprise',          title: 'Something Unexpected',   description: 'Let Rémy decide',                     icon: Sparkles,        accentToken: 'accent-acid' },
  { id: 'analyze_winelist',  title: 'Analyse a Wine List',    description: 'Multi-page scan with deep analysis',  icon: ListChecks,      accentToken: 'accent-pink',  primary: true },
];

export const RANK_BADGES: Record<RankLabel, { text: string; bgColor: string; textColor: string }> = {
  'best-match':   { text: 'BEST MATCH',       bgColor: 'var(--rc-accent-acid)',  textColor: 'var(--rc-ink-primary)' },
  'also-great':   { text: 'ALSO GREAT',       bgColor: 'var(--rc-accent-pink)',  textColor: 'var(--rc-ink-on-accent)' },
  'adventurous':  { text: 'ADVENTUROUS PICK', bgColor: 'var(--rc-accent-coral)', textColor: 'var(--rc-ink-on-accent)' },
  'value':        { text: 'VALUE PICK',        bgColor: 'transparent',            textColor: 'var(--rc-accent-acid)' },
  'pairing':      { text: 'PAIRING PICK',      bgColor: 'var(--rc-accent-pink)',  textColor: 'var(--rc-ink-on-accent)' },
};

export const REMYS_PICK_BADGE = { text: "RÉMY'S PICK", bgColor: 'var(--rc-accent-acid)', textColor: 'var(--rc-ink-primary)' };

export const RECOMMEND_FOLLOWUP_CHIPS = [
  'Why this wine?',
  'Something bolder',
  'Something lighter',
  'Different region',
  'What about white instead?',
];

// ── Wine List Analysis ──

export const WINELIST_MAX_PAGES = 10;

export const WINELIST_STATUS_MESSAGES = [
  'Reading the wine list\u2026',
  'Identifying producers & vintages\u2026',
  'Checking your cellar for matches\u2026',
  'Selecting R\u00e9my\u2019s picks\u2026',
  'Finalising analysis\u2026',
];

export const WINELIST_FOLLOWUP_CHIPS = [
  'Why this pick?',
  'Something cheaper',
  'Best value on the list?',
  'What pairs with my meal?',
  'Any wines from my cellar?',
];

// ── Rémy Thinking States ──

export const REMY_THINKING_STATES = [
  // Wine-related (~70%)
  'R\u00e9my is decanting thoughts\u2026',
  'R\u00e9my is aerating\u2026',
  'R\u00e9my is swirling the data\u2026',
  'R\u00e9my is checking the terroir\u2026',
  'R\u00e9my is sampling the vintage\u2026',
  'R\u00e9my is nosing the bouquet\u2026',
  'R\u00e9my is consulting the cellar\u2026',
  'R\u00e9my is letting it breathe\u2026',
  'R\u00e9my is uncorking ideas\u2026',
  'R\u00e9my is reading the legs\u2026',
  'R\u00e9my is fermenting ideas\u2026',
  'R\u00e9my is checking the oak\u2026',
  'R\u00e9my is tasting blind\u2026',
  'R\u00e9my is inspecting the robe\u2026',
  // Deep thought (~30%)
  'R\u00e9my is ruminating\u2026',
  'R\u00e9my is cogitating\u2026',
  'R\u00e9my is deliberating\u2026',
  'R\u00e9my is pondering\u2026',
  'R\u00e9my is mulling it over\u2026',
  'R\u00e9my is contemplating\u2026',
] as const;

export function getRandomRemyState(): string {
  return REMY_THINKING_STATES[Math.floor(Math.random() * REMY_THINKING_STATES.length)];
}
