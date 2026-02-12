/**
 * TTS Text Formatter
 *
 * Transforms AI markdown responses into TTS-optimized plain text for
 * ElevenLabs eleven_multilingual_v2. Applied ONLY to text sent to TTS —
 * UI text is never modified.
 *
 * Core rules:
 *  - ALL "." → ", " (eliminates long pauses)
 *  - ALL ":" → ", " (eliminates long pauses)
 *  - ALL newlines/paragraphs → ", "
 *  - "!" and "?" preserved exactly (inflection)
 *  - **bold** → comma-wrapped emphasis (", text,")
 *  - Abbreviations and decimals protected via placeholders
 *  - Em-dashes kept as natural micro-pauses
 */

// ── Protection patterns ─────────────────────────────────────────────
const ABBREV = /\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|vs|etc|e\.g|i\.e|approx|vol|no)\./gi;
const DECIMAL_VERSION = /\d+\.\d+/g;
const PLACEHOLDER = '\x00';

export function formatForSpeech(text: string): string {
  let s = text;

  // ── Strip fenced code blocks (wine JSON, etc.) ────────────────────
  s = s.replace(/```[\s\S]*?```/g, '');

  // ── Bold → comma-wrapped emphasis ─────────────────────────────────
  // Must run BEFORE italic strip so **text** isn't caught by *text*
  // When ! or ? follows bold, skip trailing comma to preserve inflection
  s = s.replace(/\*\*(.+?)\*\*([!?])/g, ', $1$2');
  s = s.replace(/\*\*(.+?)\*\*/g, ', $1,');

  // ── Markdown cleanup ──────────────────────────────────────────────
  s = s.replace(/\*(.+?)\*/g, '$1');            // Italic *text* → text
  s = s.replace(/_(.+?)_/g, '$1');              // Underscore _text_ → text
  s = s.replace(/^#{1,6}\s+/gm, '');            // Heading markers

  // ── Remove double-quote characters ────────────────────────────────
  s = s.replace(/["\u201C\u201D]/g, '');

  // ── Parentheticals → comma-separated ──────────────────────────────
  s = s.replace(/\(\s*([^)]+?)\s*\)/g, ', $1');

  // ── Collapse excess punctuation ───────────────────────────────────
  s = s.replace(/\.{2,}/g, '.');
  s = s.replace(/!{2,}/g, '!');
  s = s.replace(/\?{2,}/g, '?');

  // ── Normalize ! and ? whitespace ──────────────────────────────────
  s = s.replace(/!\s+/g, '! ');
  s = s.replace(/\?\s+/g, '? ');

  // ── Dash handling ─────────────────────────────────────────────────
  s = s.replace(/--/g, '\u2014');                // double hyphen → em-dash
  // Keep em-dashes as-is — they create natural micro-pauses

  // ── Colon → comma (all cases) ─────────────────────────────────────
  s = s.replace(/:\s*/g, ', ');

  // ── Newlines → comma ──────────────────────────────────────────────
  s = s.replace(/\n\s*\n/g, ', ');              // paragraph breaks
  s = s.replace(/\n/g, ', ');                   // single newlines

  // ── Protect abbreviations and decimals ────────────────────────────
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

  // ── ALL sentence-ending periods → comma ───────────────────────────
  s = s.replace(/\.\s*/g, ', ');

  // ── Restore protected spots ───────────────────────────────────────
  for (let i = protectedSpots.length - 1; i >= 0; i--) {
    const token = PLACEHOLDER.repeat(i + 1);
    s = s.split(token).join(protectedSpots[i]);
  }

  // ── Common contractions ───────────────────────────────────────────
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
  s = s.replace(/,\s*,+/g, ',');               // collapse multiple commas
  s = s.replace(/\s{2,}/g, ' ');               // collapse multiple spaces
  s = s.replace(/\s+([.,;:?!])/g, '$1');       // space before punctuation
  s = s.replace(/([,;])\s*([.,;])/g, '$1');    // adjacent soft punctuation
  s = s.replace(/^[,\s]+/, '');                 // leading commas/spaces
  s = s.replace(/[,\s]+$/, '');                 // trailing commas/spaces
  // Restore space after punctuation where missing
  s = s.replace(/([,;!?])([A-Za-z])/g, '$1 $2');

  return s.trim();
}
