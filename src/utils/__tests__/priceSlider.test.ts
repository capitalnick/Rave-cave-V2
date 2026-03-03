import { describe, it, expect } from 'vitest';
import { positionToPrice, priceToPosition, MAX_POSITION, ABSOLUTE_MAX_PRICE } from '../priceSlider';

describe('positionToPrice', () => {
  it('maps position 0 to $0', () => {
    expect(positionToPrice(0)).toBe(0);
  });

  it('maps position 20 to $100', () => {
    expect(positionToPrice(20)).toBe(100);
  });

  it('maps position 10 to $50', () => {
    expect(positionToPrice(10)).toBe(50);
  });

  it('maps position 21 to $125', () => {
    expect(positionToPrice(21)).toBe(125);
  });

  it('maps position 22 to $150', () => {
    expect(positionToPrice(22)).toBe(150);
  });

  it('maps position 24 (max) to $200', () => {
    expect(positionToPrice(24)).toBe(200);
  });

  it('clamps negative positions to 0', () => {
    expect(positionToPrice(-5)).toBe(0);
  });

  it('clamps positions above max to $200', () => {
    expect(positionToPrice(30)).toBe(200);
  });

  it('rounds fractional positions', () => {
    expect(positionToPrice(10.4)).toBe(50);
    expect(positionToPrice(10.6)).toBe(55);
  });
});

describe('priceToPosition', () => {
  it('maps $0 to position 0', () => {
    expect(priceToPosition(0)).toBe(0);
  });

  it('maps $100 to position 20', () => {
    expect(priceToPosition(100)).toBe(20);
  });

  it('maps $50 to position 10', () => {
    expect(priceToPosition(50)).toBe(10);
  });

  it('maps $125 to position 21', () => {
    expect(priceToPosition(125)).toBe(21);
  });

  it('maps $200 to position 24', () => {
    expect(priceToPosition(200)).toBe(24);
  });

  it('clamps negative prices to position 0', () => {
    expect(priceToPosition(-10)).toBe(0);
  });

  it('clamps prices above $200 to position 24', () => {
    expect(priceToPosition(500)).toBe(MAX_POSITION);
  });

  it('rounds to nearest position in $5 range', () => {
    expect(priceToPosition(12)).toBe(2); // rounds to $10
    expect(priceToPosition(13)).toBe(3); // rounds to $15
  });

  it('rounds to nearest position in $25 range', () => {
    expect(priceToPosition(110)).toBe(20); // rounds to $100
    expect(priceToPosition(115)).toBe(21); // rounds to $125
  });
});

describe('round-trip invariants', () => {
  it('positionToPrice → priceToPosition is identity for all valid positions', () => {
    for (let pos = 0; pos <= MAX_POSITION; pos++) {
      const price = positionToPrice(pos);
      expect(priceToPosition(price)).toBe(pos);
    }
  });
});

describe('constants', () => {
  it('MAX_POSITION is 24', () => {
    expect(MAX_POSITION).toBe(24);
  });

  it('ABSOLUTE_MAX_PRICE is 200', () => {
    expect(ABSOLUTE_MAX_PRICE).toBe(200);
  });
});
