/**
 * Base error class for all Rave Cave service errors.
 * Provides a machine-readable code and retryable flag.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ExtractionError extends AppError {
  constructor(message: string, code = 'UNKNOWN', retryable = false) {
    super(message, code, retryable);
    this.name = 'ExtractionError';
  }
}

export class RecommendError extends AppError {
  constructor(message: string, code = 'UNKNOWN', retryable = false) {
    super(message, code, retryable);
    this.name = 'RecommendError';
  }
}

export class InventoryError extends AppError {
  constructor(message: string, code = 'UNKNOWN', retryable = false) {
    super(message, code, retryable);
    this.name = 'InventoryError';
  }
}
