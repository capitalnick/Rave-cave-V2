import {getAuth} from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";

/**
 * Validates a Firebase Auth ID token from the Authorization header.
 * Returns the UID on success, throws AuthError on failure.
 */
export async function validateAuth(
  req: {headers: Record<string, string | string[] | undefined>}
): Promise<string> {
  const authHeader = req.headers.authorization;
  if (
    !authHeader ||
    typeof authHeader !== "string" ||
    !authHeader.startsWith("Bearer ")
  ) {
    throw new AuthError("Missing or malformed Authorization header");
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("Auth token verification failed", {error: msg});
    throw new AuthError("Invalid or expired token");
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
