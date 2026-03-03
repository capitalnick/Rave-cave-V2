import { describe, it, expect } from 'vitest';
import { sanitizeWineName } from '../wineNameGuard';

describe('sanitizeWineName', () => {
  it('returns fields unchanged when name differs from producer', () => {
    const fields = { producer: 'Penfolds', name: 'Grange' };
    expect(sanitizeWineName(fields)).toEqual(fields);
  });

  it('clears name when it exactly matches producer (case-insensitive)', () => {
    const result = sanitizeWineName({ producer: 'Penfolds', name: 'penfolds' });
    expect(result.name).toBe('');
  });

  it('clears name when producer includes name', () => {
    const result = sanitizeWineName({ producer: 'Penfolds Estate', name: 'penfolds' });
    expect(result.name).toBe('');
  });

  it('clears name when name includes producer', () => {
    const result = sanitizeWineName({ producer: 'Penfolds', name: 'Penfolds Bin 389' });
    expect(result.name).toBe('');
  });

  it('clears name when it matches a grape variety', () => {
    const result = sanitizeWineName({
      producer: 'Torbreck',
      name: 'Shiraz',
      grapeVarieties: [{ name: 'Shiraz' }],
    });
    expect(result.name).toBe('');
  });

  it('clears name when grape variety includes name', () => {
    const result = sanitizeWineName({
      producer: 'Torbreck',
      name: 'Shiraz',
      grapeVarieties: [{ name: 'Old Vine Shiraz' }],
    });
    expect(result.name).toBe('');
  });

  it('preserves name when it does not match any grape variety', () => {
    const fields = {
      producer: 'Torbreck',
      name: 'The Struie',
      grapeVarieties: [{ name: 'Shiraz' }],
    };
    expect(sanitizeWineName(fields)).toEqual(fields);
  });

  it('returns fields unchanged when name is empty', () => {
    const fields = { producer: 'Penfolds', name: '' };
    expect(sanitizeWineName(fields)).toEqual(fields);
  });

  it('handles missing grapeVarieties', () => {
    const fields = { producer: 'Penfolds', name: 'Grange' };
    expect(sanitizeWineName(fields)).toEqual(fields);
  });

  it('does not mutate original object', () => {
    const fields = { producer: 'Penfolds', name: 'penfolds' };
    const result = sanitizeWineName(fields);
    expect(result).not.toBe(fields);
    expect(fields.name).toBe('penfolds');
  });
});
