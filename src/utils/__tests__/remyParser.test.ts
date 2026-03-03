import { describe, it, expect } from 'vitest';
import { parseRemyContent } from '../remyParser';

describe('parseRemyContent', () => {
  it('returns single markdown segment for plain text', () => {
    const result = parseRemyContent('Hello world');
    expect(result).toEqual([{ type: 'markdown', text: 'Hello world' }]);
  });

  it('parses a single wine fence block', () => {
    const input = '```wine\n{"producer":"Penfolds","name":"Grange"}\n```';
    const result = parseRemyContent(input);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('wine-cards');
    if (result[0].type === 'wine-cards') {
      expect(result[0].wines).toHaveLength(1);
      expect(result[0].wines[0].producer).toBe('Penfolds');
      expect(result[0].wines[0].name).toBe('Grange');
    }
  });

  it('parses wine array inside fence', () => {
    const input =
      '```wine\n[{"producer":"A","name":"B"},{"producer":"C","name":"D"}]\n```';
    const result = parseRemyContent(input);
    expect(result).toHaveLength(1);
    if (result[0].type === 'wine-cards') {
      expect(result[0].wines).toHaveLength(2);
    }
  });

  it('splits markdown before and after wine fence', () => {
    const input =
      'Here are my picks:\n\n```wine\n{"producer":"Penfolds","name":"Grange"}\n```\n\nEnjoy!';
    const result = parseRemyContent(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ type: 'markdown', text: 'Here are my picks:' });
    expect(result[1].type).toBe('wine-cards');
    expect(result[2]).toEqual({ type: 'markdown', text: 'Enjoy!' });
  });

  it('falls back to markdown for invalid JSON in fence', () => {
    const input = '```wine\nnot valid json\n```';
    const result = parseRemyContent(input);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('markdown');
  });

  it('falls back to markdown when wine object lacks producer+name', () => {
    const input = '```wine\n{"vintage":2020}\n```';
    const result = parseRemyContent(input);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('markdown');
  });

  it('filters out invalid wines from array', () => {
    const input =
      '```wine\n[{"producer":"A","name":"B"},{"vintage":2020}]\n```';
    const result = parseRemyContent(input);
    expect(result).toHaveLength(1);
    if (result[0].type === 'wine-cards') {
      expect(result[0].wines).toHaveLength(1);
      expect(result[0].wines[0].producer).toBe('A');
    }
  });

  it('returns empty array for empty string', () => {
    expect(parseRemyContent('')).toEqual([]);
  });

  it('handles multiple wine fences', () => {
    const input =
      'Pick 1:\n```wine\n{"producer":"A","name":"X"}\n```\nPick 2:\n```wine\n{"producer":"B","name":"Y"}\n```';
    const result = parseRemyContent(input);
    expect(result).toHaveLength(4);
    expect(result[0].type).toBe('markdown');
    expect(result[1].type).toBe('wine-cards');
    expect(result[2].type).toBe('markdown');
    expect(result[3].type).toBe('wine-cards');
  });

  it('preserves optional fields on wine data', () => {
    const input =
      '```wine\n{"producer":"P","name":"N","vintage":2020,"region":"Barossa","rating":95}\n```';
    const result = parseRemyContent(input);
    if (result[0].type === 'wine-cards') {
      const wine = result[0].wines[0];
      expect(wine.vintage).toBe(2020);
      expect(wine.region).toBe('Barossa');
      expect(wine.rating).toBe(95);
    }
  });
});
