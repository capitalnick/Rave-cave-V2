import * as logger from "firebase-functions/logger";
import type {Response} from "express";

interface ErrorResponse {
  error: string;
  code?: string;
  details?: string;
}

/**
 * Standardised Cloud Function error handler.
 * Categorises errors and returns consistent JSON responses.
 */
export function handleFunctionError(
  error: unknown,
  res: Response,
  context?: string
): void {
  const msg = error instanceof Error ? error.message : String(error);

  // Rate limit errors
  if (msg.includes("Rate limit") || msg.includes("429")) {
    logger.warn(`${context ?? "Function"}: rate limited`, {error: msg});
    res.status(429).json({error: "Rate limit exceeded. Try again later."} satisfies ErrorResponse);
    return;
  }

  // Auth errors
  if (msg.includes("Unauthorized") || msg.includes("401") || msg.includes("auth")) {
    logger.warn(`${context ?? "Function"}: auth error`, {error: msg});
    res.status(401).json({error: "Unauthorized"} satisfies ErrorResponse);
    return;
  }

  // Validation errors
  if (msg.includes("Invalid") || msg.includes("Missing") || msg.includes("required")) {
    logger.warn(`${context ?? "Function"}: validation error`, {error: msg});
    res.status(400).json({error: msg} satisfies ErrorResponse);
    return;
  }

  // Everything else is a 500
  logger.error(`${context ?? "Function"}: internal error`, {error: msg});
  res.status(500).json({
    error: "Internal server error",
    details: msg,
  } satisfies ErrorResponse);
}
