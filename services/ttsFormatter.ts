/**
 * TTS Text Formatter — Prosody-aware
 *
 * Converts rich/markdown AI responses into TTS-friendly plain text.
 * Designed for ElevenLabs eleven_multilingual_v2 which produces
 * excessively long pauses after full stops but valuable inflection
 * on ! and ? — so we soften periods while preserving those marks.
 *
 * Rules are intentionally simple and deterministic — no NLP.
 */

export type SofteningLevel = 'OFF' | 'LOW' | 'MED' | 'HIGH';

export const TTS_PROSODY_CONFIG = {
  softeningLevel: 'MED' as SofteningLevel,
};

// ── Protection patterns (must NOT be altered) ───────────────────────
const ABBREV = /\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|vs|etc|e\.g|i\.e|approx|vol|no)\./gi;
const DECIMAL_VERSION = /\d+\.\d+/g;
const PLACEHOLDER = '\x00';

// ── Connector words that signal continuation ────────────────────────
const CONNECTORS = /^(?:And|But|So|Then|Also|Now|However|Still|Plus|Next|Or|Yet)\b/i;

export function formatForSpeech(
  text: string,
  level?: SofteningLevel,
): string {
  const softening = level ?? TTS_PROSODY_CONFIG.softeningLevel;
  let s = text;

  // ── Markdown cleanup ──────────────────────────────────────────────
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');        // Bold **text** → text
  s = s.replace(/\*(.+?)\*/g, '$1');            // Italic *text* → text
  s = s.replace(/_(.+?)_/g, '$1');              // Underscore _text_ → text
  s = s.replace(/^#{1,6}\s+/gm, '');            // Heading markers

  // ── Remove only double-quote characters ───────────────────────────
  s = s.replace(/["\u201C\u201D]/g, '');

  // ── Parentheticals → comma-separated ──────────────────────────────
  s = s.replace(/\(\s*([^)]+?)\s*\)/g, ', $1');

  // ── Collapse excess punctuation ───────────────────────────────────
  s = s.replace(/\.{2,}/g, '.');
  s = s.replace(/!{2,}/g, '!');
  s = s.replace(/\?{2,}/g, '?');

  // ── Preserve ! and ? inflection ───────────────────────────────────
  // Normalize whitespace after ! and ? to exactly one space
  s = s.replace(/!\s+/g, '! ');
  s = s.replace(/\?\s+/g, '? ');

  // ── Dash handling ─────────────────────────────────────────────────
  s = s.replace(/\u2014/g, ' \u2014 ');         // em-dash: normalize spacing
  s = s.replace(/--/g, ' \u2014 ');             // double hyphen → em-dash

  // ── Colon handling (context-sensitive) ─────────────────────────────
  // Heading-style colon (followed by newline or at end of short fragment)
  s = s.replace(/:(\s*\n)/g, ',$1');
  // Colon followed by space + lowercase → comma
  s = s.replace(/:\s+([a-z])/g, ', $1');
  // Colon followed by space + uppercase → keep (ElevenLabs handles well)

  // ── Newline handling (strength-aware) ─────────────────────────────
  // Double newline — stronger break
  if (softening === 'OFF' || softening === 'LOW') {
    s = s.replace(/\n\s*\n/g, '. ');
  } else if (softening === 'MED') {
    s = s.replace(/\n\s*\n/g, ', ');
  } else {
    // HIGH
    s = s.replace(/\n\s*\n/g, ', ');
  }
  // Single newline → comma at all levels
  s = s.replace(/\n/g, ', ');

  // ── Full-stop softening — the core logic ──────────────────────────
  if (softening !== 'OFF') {
    // Phase 1: Protect abbreviations and decimals
    const protectedSpots: string[] = [];
    let protectIdx = 0;

    s = s.replace(ABBREV, (match) => {
      protectedSpots[protectIdx] = match;
      const token = PLACEHOLDER.repeat(protectIdx + 1);
      protectIdx++;
      return token;
    });
    s = s.replace(DECIMAL_VERSION, (match) => {
      protectedSpots[protectIdx] = match;
      const token = PLACEHOLDER.repeat(protectIdx + 1);
      protectIdx++;
      return token;
    });

    // Phase 2: Split on sentence boundaries (period followed by whitespace)
    const parts = s.split(/\.\s+/);

    if (parts.length > 1) {
      // Phase 3: Decide replacement per boundary
      let consecutiveSoft = 0;
      const result: string[] = [];

      for (let i = 0; i < parts.length - 1; i++) {
        const next = parts[i + 1];
        const isLast = i === parts.length - 2;
        const nextLen = next.length;
        const startsWithConnector = CONNECTORS.test(next);

        let sep: string;

        // Phase 4: Cadence rule (HIGH only)
        if (softening === 'HIGH' && consecutiveSoft >= 3) {
          sep = '. ';
          consecutiveSoft = 0;
        } else if (startsWithConnector) {
          // Connectors always get comma (except OFF, handled above)
          sep = ', ';
          consecutiveSoft++;
        } else if (softening === 'LOW') {
          sep = '. ';
        } else if (softening === 'MED') {
          if (nextLen <= 40) {
            sep = ', ';
            consecutiveSoft++;
          } else if (nextLen <= 80) {
            sep = '; ';
            consecutiveSoft++;
          } else {
            sep = '. ';
            consecutiveSoft = 0;
          }
        } else {
          // HIGH
          if (nextLen <= 80) {
            sep = ', ';
            consecutiveSoft++;
          } else {
            sep = '; ';
            consecutiveSoft++;
          }
        }

        result.push(parts[i]);
        result.push(sep);
      }
      // Phase 5: Keep final segment as-is (preserves final punctuation)
      result.push(parts[parts.length - 1]);
      s = result.join('');
    }

    // Restore protected spots
    for (let i = protectedSpots.length - 1; i >= 0; i--) {
      const token = PLACEHOLDER.repeat(i + 1);
      s = s.split(token).join(protectedSpots[i]);
    }
  }

  // ── Common contractions for natural cadence ───────────────────────
  const contractions: [RegExp, string][] = [
    [/\bIt is\b/g, "It's"],
    [/\bit is\b/g, "it's"],
    [/\bI have\b/g, "I've"],
    [/\bI am\b/g, "I'm"],
    [/\bdo not\b/g, "don't"],
    [/\bDo not\b/g, "Don't"],
    [/\bcannot\b/g, "can't"],
    [/\bCannot\b/g, "Can't"],
    [/\bwill not\b/g, "won't"],
    [/\bWill not\b/g, "Won't"],
    [/\bthat is\b/g, "that's"],
    [/\bThat is\b/g, "That's"],
    [/\bwhat is\b/g, "what's"],
    [/\bWhat is\b/g, "What's"],
    [/\byou are\b/g, "you're"],
    [/\bYou are\b/g, "You're"],
    [/\bthey are\b/g, "they're"],
    [/\bThey are\b/g, "They're"],
    [/\bwe are\b/g, "we're"],
    [/\bWe are\b/g, "We're"],
    [/\bthere is\b/g, "there's"],
    [/\bThere is\b/g, "There's"],
    [/\bhere is\b/g, "here's"],
    [/\bHere is\b/g, "Here's"],
    [/\byou would\b/g, "you'd"],
    [/\bYou would\b/g, "You'd"],
    [/\bwould not\b/g, "wouldn't"],
    [/\bWould not\b/g, "Wouldn't"],
    [/\bshould not\b/g, "shouldn't"],
    [/\bShould not\b/g, "Shouldn't"],
    [/\bcould not\b/g, "couldn't"],
    [/\bCould not\b/g, "Couldn't"],
  ];
  for (const [pattern, replacement] of contractions) {
    s = s.replace(pattern, replacement);
  }

  // ── Whitespace & punctuation cleanup ──────────────────────────────
  s = s.replace(/\s{2,}/g, ' ');              // collapse multiple spaces
  s = s.replace(/,\s*,/g, ',');               // double commas
  s = s.replace(/,\s*\./g, '.');              // comma before period
  s = s.replace(/\.\s*\./g, '.');             // double periods
  s = s.replace(/;\s*;/g, ';');               // double semicolons
  s = s.replace(/\s+([.,;:?!])/g, '$1');      // space before punctuation
  s = s.replace(/([.,;:?!])\s*([.,;:?!])/g, '$1'); // adjacent punctuation

  return s.trim();
}
