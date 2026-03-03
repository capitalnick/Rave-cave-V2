import { describe, it, expect } from 'vitest';
import { AppError, ExtractionError, RecommendError, InventoryError } from '../errors';

describe('AppError', () => {
  it('sets message, code, and retryable', () => {
    const err = new AppError('Something broke', 'BROKEN', true);
    expect(err.message).toBe('Something broke');
    expect(err.code).toBe('BROKEN');
    expect(err.retryable).toBe(true);
    expect(err.name).toBe('AppError');
  });

  it('defaults retryable to false', () => {
    const err = new AppError('fail', 'CODE');
    expect(err.retryable).toBe(false);
  });

  it('is instance of Error', () => {
    expect(new AppError('x', 'X')).toBeInstanceOf(Error);
  });
});

describe('ExtractionError', () => {
  it('has correct name and inherits from AppError', () => {
    const err = new ExtractionError('Bad image');
    expect(err.name).toBe('ExtractionError');
    expect(err.code).toBe('UNKNOWN');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it('accepts custom code and retryable', () => {
    const err = new ExtractionError('Timeout', 'TIMEOUT', true);
    expect(err.code).toBe('TIMEOUT');
    expect(err.retryable).toBe(true);
  });
});

describe('RecommendError', () => {
  it('has correct name and inherits from AppError', () => {
    const err = new RecommendError('No recs');
    expect(err.name).toBe('RecommendError');
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('InventoryError', () => {
  it('has correct name and inherits from AppError', () => {
    const err = new InventoryError('Not found');
    expect(err.name).toBe('InventoryError');
    expect(err).toBeInstanceOf(AppError);
  });
});
