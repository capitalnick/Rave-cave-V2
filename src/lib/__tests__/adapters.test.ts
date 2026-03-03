import { describe, it, expect, vi } from 'vitest';
import { toRCWineType, toRCWineCardProps } from '../adapters';
import type { Wine } from '@/types';

// Mock maturityUtils to avoid date-dependent behavior
vi.mock('@/utils/maturityUtils', () => ({
  getMaturityKebab: () => 'drink-now',
}));

function makeWine(overrides: Partial<Wine> = {}): Wine {
  return {
    id: 'w1',
    producer: 'Penfolds',
    name: 'Grange',
    vintage: 2019,
    type: 'Red',
    grapeVarieties: [{ name: 'Shiraz', pct: 100 }],
    region: 'Barossa',
    country: 'Australia',
    quantity: 1,
    drinkFrom: 2020,
    drinkUntil: 2030,
    maturity: 'Drink Now',
    tastingNotes: '',
    price: 850,
    format: '750ml',
    ...overrides,
  };
}

describe('toRCWineType', () => {
  it('maps Red → red', () => expect(toRCWineType('Red')).toBe('red'));
  it('maps White → white', () => expect(toRCWineType('White')).toBe('white'));
  it('maps Rosé → rose', () => expect(toRCWineType('Rosé')).toBe('rose'));
  it('maps Sparkling → sparkling', () => expect(toRCWineType('Sparkling')).toBe('sparkling'));
  it('maps Dessert → dessert', () => expect(toRCWineType('Dessert')).toBe('dessert'));
  it('maps Fortified → red (closest match)', () => expect(toRCWineType('Fortified')).toBe('red'));
  it('defaults unknown types to red', () => expect(toRCWineType('Natural')).toBe('red'));
  it('defaults empty string to red', () => expect(toRCWineType('')).toBe('red'));
});

describe('toRCWineCardProps', () => {
  it('maps Wine to RC card shape', () => {
    const wine = makeWine();
    const props = toRCWineCardProps(wine);
    expect(props.id).toBe('w1');
    expect(props.producer).toBe('Penfolds');
    expect(props.varietal).toBe('Shiraz');
    expect(props.vintage).toBe('2019');
    expect(props.type).toBe('red');
    expect(props.maturity).toBe('drink-now');
  });

  it('falls back to wine type when no grape varieties', () => {
    const wine = makeWine({ grapeVarieties: [] });
    const props = toRCWineCardProps(wine);
    expect(props.varietal).toBe('Red');
  });

  it('prefers thumbnailUrl for image', () => {
    const wine = makeWine({ thumbnailUrl: 'thumb.jpg', resolvedImageUrl: 'full.jpg' });
    expect(toRCWineCardProps(wine).image).toBe('thumb.jpg');
  });

  it('falls back to resolvedImageUrl', () => {
    const wine = makeWine({ thumbnailUrl: undefined, resolvedImageUrl: 'full.jpg', imageUrl: 'legacy.jpg' });
    expect(toRCWineCardProps(wine).image).toBe('full.jpg');
  });

  it('falls back to imageUrl', () => {
    const wine = makeWine({ thumbnailUrl: undefined, resolvedImageUrl: undefined, imageUrl: 'legacy.jpg' });
    expect(toRCWineCardProps(wine).image).toBe('legacy.jpg');
  });

  it('uses empty string when no image available', () => {
    const wine = makeWine({ thumbnailUrl: undefined, resolvedImageUrl: undefined, imageUrl: undefined });
    expect(toRCWineCardProps(wine).image).toBe('');
  });
});
