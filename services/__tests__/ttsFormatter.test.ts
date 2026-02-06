import { describe, it, expect } from 'vitest';
import { formatForSpeech } from '../ttsFormatter';

describe('formatForSpeech', () => {
  // ── ! and ? preservation (THE critical rule) ──────────────────────
  it('preserves ! inflection', () => {
    expect(formatForSpeech('What a wine!')).toBe('What a wine!');
  });

  it('preserves ! before continuation', () => {
    expect(formatForSpeech('Great pick! Try it tonight')).toBe(
      'Great pick! Try it tonight',
    );
  });

  it('preserves ? inflection', () => {
    expect(formatForSpeech('Is this good?')).toBe('Is this good?');
  });

  it('preserves ? before continuation', () => {
    expect(formatForSpeech('Really? That one?')).toBe('Really? That one?');
  });

  it('collapses !!! to single !', () => {
    expect(formatForSpeech('Wow!!!')).toBe('Wow!');
  });

  it('collapses ??? to single ?', () => {
    expect(formatForSpeech('Really???')).toBe('Really?');
  });

  // ── ALL periods → comma ───────────────────────────────────────────
  it('converts sentence-ending period to comma', () => {
    expect(formatForSpeech('First sentence. Second sentence')).toBe(
      'First sentence, Second sentence',
    );
  });

  it('converts multiple periods to commas', () => {
    expect(formatForSpeech('One. Two. Three')).toBe('One, Two, Three');
  });

  it('collapses ellipsis then converts', () => {
    expect(formatForSpeech('Wait... really')).toBe('Wait, really');
  });

  // ── ALL colons → comma ────────────────────────────────────────────
  it('converts colon to comma', () => {
    expect(formatForSpeech('The choice: Riesling')).toBe(
      'The choice, Riesling',
    );
  });

  it('converts colon before lowercase', () => {
    expect(formatForSpeech('here: good wine')).toBe('here, good wine');
  });

  // ── ALL newlines → comma ──────────────────────────────────────────
  it('converts paragraph break to comma', () => {
    expect(formatForSpeech('First\n\nSecond')).toBe('First, Second');
  });

  it('converts single newline to comma', () => {
    expect(formatForSpeech('Line one\nLine two')).toBe(
      'Line one, Line two',
    );
  });

  // ── Bold → comma-wrapped emphasis ─────────────────────────────────
  it('wraps bold text with commas for emphasis', () => {
    expect(formatForSpeech('Try **Drink Now** today')).toBe(
      'Try, Drink Now, today',
    );
  });

  it('handles bold at start of text', () => {
    const result = formatForSpeech('**The Top Choice** is Riesling');
    expect(result).toBe('The Top Choice, is Riesling');
  });

  // ── Dash handling ─────────────────────────────────────────────────
  it('converts double hyphen to em-dash', () => {
    expect(formatForSpeech('bold--smooth')).toBe('bold\u2014smooth');
  });

  it('keeps em-dash as natural micro-pause', () => {
    expect(formatForSpeech('bold\u2014smooth')).toBe('bold\u2014smooth');
  });

  // ── Abbreviation protection ───────────────────────────────────────
  it('does not break Dr.', () => {
    expect(formatForSpeech('Call Dr. Smith')).toMatch(/Dr\./);
  });

  it('does not break e.g.', () => {
    expect(formatForSpeech('Use e.g. this one')).toMatch(/e\.g\./);
  });

  it('does not break etc.', () => {
    expect(formatForSpeech('Wine, cheese, etc. are good')).toMatch(/etc\./);
  });

  // ── Decimal/version protection ────────────────────────────────────
  it('does not break decimal 94.5', () => {
    expect(formatForSpeech('Rated 94.5 points')).toMatch(/94\.5/);
  });

  it('does not break version 2.0', () => {
    expect(formatForSpeech('Version 2.0 released')).toMatch(/2\.0/);
  });

  // ── Markdown removal ──────────────────────────────────────────────
  it('strips italic markers', () => {
    expect(formatForSpeech('This is *italic* text')).toBe(
      'This is italic text',
    );
  });

  it('strips underscore emphasis', () => {
    expect(formatForSpeech('This is _emphasized_ text')).toBe(
      'This is emphasized text',
    );
  });

  it('strips heading markers', () => {
    expect(formatForSpeech('### My Heading')).toBe('My Heading');
  });

  // ── Quotes ────────────────────────────────────────────────────────
  it('removes double quotes', () => {
    expect(formatForSpeech('the "Rave Cave" cellar')).toBe(
      'the Rave Cave cellar',
    );
  });

  it('removes curly double quotes', () => {
    expect(formatForSpeech('The \u201Cbig\u201D one')).toBe('The big one');
  });

  // ── Apostrophes preserved ─────────────────────────────────────────
  it('preserves apostrophes in contractions', () => {
    expect(formatForSpeech("it's great")).toContain("it's");
  });

  it('preserves French apostrophes', () => {
    expect(formatForSpeech("S'il vous pla\u00EEt")).toContain("S'il");
  });

  // ── Parentheticals ────────────────────────────────────────────────
  it('converts parentheticals to comma-separated', () => {
    expect(formatForSpeech('Penfolds (2021)')).toBe('Penfolds, 2021');
  });

  // ── Contractions ──────────────────────────────────────────────────
  it('contracts common phrases', () => {
    expect(formatForSpeech('It is great')).toBe("It's great");
    expect(formatForSpeech('I have tried it')).toBe("I've tried it");
    expect(formatForSpeech('do not miss it')).toBe("don't miss it");
    expect(formatForSpeech('will not work')).toBe("won't work");
  });

  // ── Whitespace cleanup ────────────────────────────────────────────
  it('collapses multiple spaces', () => {
    expect(formatForSpeech('too   many   spaces')).toBe('too many spaces');
  });

  it('removes leading commas', () => {
    expect(formatForSpeech('**Bold** start')).toBe('Bold, start');
  });

  // ── Edge cases ────────────────────────────────────────────────────
  it('handles empty string', () => {
    expect(formatForSpeech('')).toBe('');
  });

  it('handles plain text with no formatting', () => {
    expect(formatForSpeech('Just a simple sentence')).toBe(
      'Just a simple sentence',
    );
  });

  // ── Reference sample (verbatim from spec) ─────────────────────────
  it('transforms the reference sample with correct prosody', () => {
    const input =
      `Ah, curry! *Magnifique.* The vibrant spices and aromatics demand a wine that can dance alongside those bold flavors without being overwhelmed. Looking into your "Rave Cave," I have found two stellar options for you:\n\n` +
      `**The Top Choice: 2020 Puddleduck Vineyard TGR Riesling**\n` +
      `*S'il vous plaît*, this is the one! Riesling is the classic partner for curry. The bright acidity and touch of fruitiness in this bottle will balance the heat and harmonize with the spices perfectly. It is in its prime\u2014**Drink Now**!\n\n` +
      `**The Red Alternative: 2021 Cirillo 'The Vincent' Grenache**\n` +
      `If you prefer a red wine, this Grenache is your best friend. It is fruit-forward with soft tannins, meaning it won't clash with the spice of your dish like a heavier Cabernet might. It is also ready to enjoy tonight (**Drink Now**).\n\n` +
      `Shall I help you locate one of these in the cellar, or perhaps you'd like a third option? *Bon appétit!*`;

    const result = formatForSpeech(input);

    // ! inflection preserved
    expect(result).toContain('curry!');
    expect(result).toContain('the one!');
    expect(result).toContain('Drink Now!');
    expect(result).toContain('appétit!');

    // ? inflection preserved
    expect(result).toContain('third option?');

    // No periods remain (except in protected abbreviations/decimals)
    // All "." should have been converted to ","
    expect(result).not.toMatch(/\.\s+[A-Z]/); // no ". X" patterns

    // No colons remain
    expect(result).not.toContain(':');

    // No newlines remain
    expect(result).not.toContain('\n');

    // Bold text preserved as words (markers removed)
    expect(result).not.toContain('**');
    expect(result).toContain('Drink Now');
    expect(result).toContain('The Top Choice');

    // Apostrophes/contractions preserved
    expect(result).toContain("won't");
    expect(result).toContain("S'il");
    expect(result).toContain("you'd");
    expect(result).toContain("It's"); // "It is" → "It's"

    // French preserved
    expect(result).toContain('Magnifique');
    expect(result).toContain('Bon appétit!');

    // No markdown artifacts
    expect(result).not.toMatch(/\*\*/);
    expect(result).not.toMatch(/^#{1,6}\s/m);
  });
});
