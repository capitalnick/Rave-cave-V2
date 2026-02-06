import { describe, it, expect } from 'vitest';
import { formatForSpeech, TTS_PROSODY_CONFIG } from '../ttsFormatter';

describe('formatForSpeech', () => {
  // ── ! and ? preservation ──────────────────────────────────────────
  it('preserves ! inflection (not converted to period)', () => {
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

  it('collapses ... to single .', () => {
    // At MED, "really" is short (≤40 chars) so the period is softened to comma
    expect(formatForSpeech('Wait... really', 'OFF')).toBe('Wait. really');
    expect(formatForSpeech('Wait... really', 'MED')).toBe('Wait, really');
  });

  // ── Full-stop softening (MED) ─────────────────────────────────────
  it('softens full-stop before connector word at MED', () => {
    expect(formatForSpeech('Done. And now more.', 'MED')).toBe(
      'Done, And now more.',
    );
  });

  it('softens full-stop before short sentence (≤40 chars) at MED', () => {
    expect(formatForSpeech('First. Second part.', 'MED')).toBe(
      'First, Second part.',
    );
  });

  it('uses semicolon before medium sentence (≤80 chars) at MED', () => {
    const medium = 'A'.repeat(50); // 50 chars — between 40 and 80
    expect(formatForSpeech(`Start. ${medium}.`, 'MED')).toMatch(
      /^Start; /,
    );
  });

  it('keeps full-stop before long sentence (>80 chars) at MED', () => {
    const long = 'A'.repeat(85);
    expect(formatForSpeech(`Start. ${long}.`, 'MED')).toMatch(
      /^Start\. /,
    );
  });

  // ── Full-stop softening (OFF) — passthrough ──────────────────────
  it('OFF level passes through all full stops unchanged', () => {
    expect(formatForSpeech('One. Two. Three.', 'OFF')).toBe(
      'One. Two. Three.',
    );
  });

  // ── Full-stop softening (LOW) — only connectors ──────────────────
  it('LOW level softens connectors but keeps other full stops', () => {
    expect(formatForSpeech('Done. But wait. More.', 'LOW')).toBe(
      'Done, But wait. More.',
    );
  });

  // ── Full-stop softening (HIGH) — cadence rule ────────────────────
  it('HIGH level forces hard stop after 3 consecutive soft boundaries', () => {
    // 5 sentences, 4 boundaries: first 3 soften to comma, 4th gets hard stop (consecutiveSoft >= 3)
    const input = 'A. B. C. D. E.';
    const result = formatForSpeech(input, 'HIGH');
    // boundary 0→B: comma (soft=1), 1→C: comma (soft=2), 2→D: comma (soft=3), 3→E: hard stop (soft≥3)
    expect(result).toBe('A, B, C, D. E.');
  });

  // ── Abbreviation protection ───────────────────────────────────────
  it('does not break abbreviations like Dr.', () => {
    expect(formatForSpeech('Call Dr. Smith today.')).toMatch(/Dr\./);
  });

  it('does not break e.g.', () => {
    expect(formatForSpeech('Use e.g. this one.')).toMatch(/e\.g\./);
  });

  // ── Decimal/version protection ────────────────────────────────────
  it('does not break decimal numbers like 94.5', () => {
    expect(formatForSpeech('Rated 94.5 points.')).toMatch(/94\.5/);
  });

  it('does not break version numbers like 2.0', () => {
    expect(formatForSpeech('Version 2.0 released.')).toMatch(/2\.0/);
  });

  // ── Markdown removal ──────────────────────────────────────────────
  it('strips bold markers', () => {
    expect(formatForSpeech('This is **bold** text')).toBe(
      'This is bold text',
    );
  });

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
    expect(formatForSpeech('# Top Level')).toBe('Top Level');
  });

  // ── Quotes ────────────────────────────────────────────────────────
  it('removes double quotes', () => {
    expect(formatForSpeech('He said "hello" today')).toBe(
      'He said hello today',
    );
  });

  it('removes curly double quotes', () => {
    expect(formatForSpeech('The \u201Cbig\u201D one')).toBe('The big one');
  });

  // ── Apostrophes and single quotes preserved ───────────────────────
  it('preserves apostrophes in contractions', () => {
    const result = formatForSpeech("it's a great wine");
    expect(result).toContain("it's");
  });

  it('preserves French apostrophes', () => {
    const result = formatForSpeech("s'il vous pla\u00EEt");
    expect(result).toContain("s'il");
  });

  // ── Parentheticals ────────────────────────────────────────────────
  it('converts parentheticals to comma-separated', () => {
    expect(formatForSpeech('Penfolds (2021)')).toBe('Penfolds, 2021');
  });

  // ── Dash handling ─────────────────────────────────────────────────
  it('converts em-dash to spaced em-dash (not comma)', () => {
    expect(formatForSpeech('bold\u2014smooth')).toBe('bold \u2014 smooth');
  });

  it('converts double hyphen to spaced em-dash', () => {
    expect(formatForSpeech('bold--smooth')).toBe('bold \u2014 smooth');
  });

  // ── Colon handling (context-sensitive) ─────────────────────────────
  it('softens colon before lowercase', () => {
    expect(formatForSpeech('here is the thing: good wine')).toBe(
      "here's the thing, good wine",
    );
  });

  it('keeps colon before uppercase (list/explanation)', () => {
    expect(formatForSpeech('The Top Choice: 2020 Riesling')).toBe(
      'The Top Choice: 2020 Riesling',
    );
  });

  // ── Newline handling ──────────────────────────────────────────────
  it('double newline treated as stronger break (MED → em-dash)', () => {
    const result = formatForSpeech('First\n\nSecond', 'MED');
    expect(result).toBe('First, Second');
  });

  it('double newline at OFF/LOW → period', () => {
    expect(formatForSpeech('First\n\nSecond', 'OFF')).toBe(
      'First. Second',
    );
  });

  it('single newline → comma at all levels', () => {
    expect(formatForSpeech('Line one\nLine two', 'MED')).toBe(
      'Line one, Line two',
    );
    expect(formatForSpeech('Line one\nLine two', 'OFF')).toBe(
      'Line one, Line two',
    );
  });

  // ── Contractions ──────────────────────────────────────────────────
  it('contracts common phrases', () => {
    expect(formatForSpeech('It is a great wine')).toBe("It's a great wine");
    expect(formatForSpeech('I have tried it')).toBe("I've tried it");
    expect(formatForSpeech('do not miss it')).toBe("don't miss it");
    expect(formatForSpeech('You are going to love it')).toBe(
      "You're going to love it",
    );
  });

  it('contracts you would and would not', () => {
    expect(formatForSpeech('you would like it')).toBe("you'd like it");
    expect(formatForSpeech('would not work')).toBe("wouldn't work");
  });

  // ── Whitespace cleanup ────────────────────────────────────────────
  it('collapses multiple spaces', () => {
    expect(formatForSpeech('too   many   spaces')).toBe('too many spaces');
  });

  it('removes space before punctuation', () => {
    expect(formatForSpeech('hello , world')).toBe('hello, world');
  });

  it('collapses adjacent punctuation', () => {
    expect(formatForSpeech('end,.')).toBe('end.');
  });

  // ── Edge cases ────────────────────────────────────────────────────
  it('handles empty string', () => {
    expect(formatForSpeech('')).toBe('');
  });

  it('handles plain text with no formatting', () => {
    expect(formatForSpeech('Just a simple sentence.')).toBe(
      'Just a simple sentence.',
    );
  });

  // ── Reference sample ─────────────────────────────────────────────
  it('transforms the reference sample preserving ! and ? inflection', () => {
    const input =
      `**Ah, curry!** Magnifique — the vibrant spices and aromatics demand a wine that can dance alongside those bold flavors without being overwhelmed. Looking into your Rave Cave, I've found two stellar options for you.\n\n` +
      `### The Top Choice: 2020 Puddleduck Vineyard TGR Riesling\n` +
      `— s'il vous plaît, this is the one! Riesling is the classic partner for curry. The bright acidity and touch of fruitiness in this bottle will balance the heat and harmonize with the spices perfectly. It is in its prime — *Drink Now!*\n\n` +
      `### The Red Alternative: 2021 Cirillo The Vincent Grenache\n` +
      `— if you prefer a red wine, this Grenache is your best friend. It is fruit-forward with soft tannins, meaning it will not clash with the spice of your dish like a heavier Cabernet might. It is also ready to enjoy tonight. *Drink Now.*\n\n` +
      `Shall I help you locate one of these in the cellar, or perhaps you would like a third option? Bon appétit!`;

    const result = formatForSpeech(input);

    // ! inflection preserved
    expect(result).toContain('curry!');
    expect(result).toContain('the one!');
    expect(result).toContain('Drink Now!');
    expect(result).toContain('appétit!');
    // ? inflection preserved
    expect(result).toContain('third option?');
    // Apostrophes preserved (It is → It's with capital)
    expect(result).toContain("It's");
    expect(result).toContain("won't");
    expect(result).toContain("s'il");
    expect(result).toContain("you'd");
    // French text preserved
    expect(result).toContain('Magnifique');
    expect(result).toContain('Bon appétit!');
    // No ** or ### or " remain
    expect(result).not.toMatch(/\*\*/);
    expect(result).not.toMatch(/^#{1,6}\s/m);
  });
});
