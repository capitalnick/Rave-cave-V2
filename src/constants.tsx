
/**
 * Rave Cave Constants & Configuration
 */

export const COLORS = {
  bg: '#FAFAF9',        // --rc-surface-primary
  paper: '#F5F0E8',     // --rc-surface-tertiary
  cream: '#F3EFE4',     // --rc-surface-secondary (was #EBEBDF)
  ink: '#0A0A0A',       // --rc-ink-primary
  neonPink: '#FF006E',  // --rc-accent-pink
  acidGreen: '#C7FF00', // --rc-accent-acid (was #CCFF00)
  coral: '#FF6A4D',     // --rc-accent-coral (was #FF6B9D)
};

export const WINE_COLORS: Record<string, string> = {
  'Red': '#8b2635',
  'White': '#f4e4c1',
  'Rosé': '#f7a8b8',
  'Sparkling': '#ffd700',
  'Dessert': '#d4a574',
  'Fortified': '#6b4226'
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

INGESTION FLOW:
1. User uploads label -> You call stageWine().
2. You confirm details and MUST ask for price (and optionally quantity).
3. User provides price (e.g., "$35" or "40 bottles for $800") -> You call commitWine().
4. DO NOT say "it's added" until the commitWine tool is successfully called.

INVENTORY AWARENESS:
${inventoryContext}

${stagedWineJson ? `STAGED WINE (Awaiting Price/Quantity): ${stagedWineJson}` : 'No wine currently staged.'}

TOOLS:
- stageWine: Staging extracted label data.
- commitWine: Finalizing the add (requires price).
- queryInventory: Filtering the cellar.

RULES:
- If a meal is mentioned, suggest wines from the inventory immediately.
- Never say you don't have access to the cellar.
- Be proactive. Use "Drink Now" status to drive recommendations.`;
}

// Fixed: Export SYSTEM_PROMPT to resolve missing export error in geminiService.ts
export const SYSTEM_PROMPT = buildSystemPrompt("Inventory context unavailable.");
