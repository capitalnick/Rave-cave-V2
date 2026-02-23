import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Check and increment rate limit for a user.
 * Returns true if under limit, false if exceeded.
 * Uses a Firestore doc at rateLimits/{uid}_{bucket}.
 * @param {string} uid The user's UID.
 * @param {string} bucket Rate limit bucket name.
 * @param {RateLimitConfig} config Max requests and window size.
 * @return {Promise<boolean>} Whether the request is allowed.
 */
export async function checkRateLimit(
  uid: string,
  bucket: string,
  config: RateLimitConfig
): Promise<boolean> {
  const docRef = db.collection("rateLimits").doc(`${uid}_${bucket}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const now = Timestamp.now();

      if (!snap.exists) {
        tx.set(docRef, {count: 1, windowStart: now});
        return true;
      }

      const data = snap.data()!;
      const windowStart = data.windowStart as Timestamp;
      const elapsed = now.seconds - windowStart.seconds;

      if (elapsed >= config.windowSeconds) {
        tx.set(docRef, {count: 1, windowStart: now});
        return true;
      }

      if (data.count >= config.maxRequests) {
        return false;
      }

      tx.update(docRef, {count: FieldValue.increment(1)});
      return true;
    });

    return result;
  } catch (e) {
    // Fail open — don't block users due to Firestore issues
    logger.warn("Rate limit check failed, allowing request", {
      uid, bucket, error: e,
    });
    return true;
  }
}

export const RATE_LIMITS = {
  gemini: {maxRequests: 100, windowSeconds: 3600},
  geminiStream: {maxRequests: 50, windowSeconds: 3600},
  queryInventory: {maxRequests: 200, windowSeconds: 3600},
  tts: {maxRequests: 30, windowSeconds: 3600},
  backfill: {maxRequests: 5, windowSeconds: 3600},
  checkout: {maxRequests: 10, windowSeconds: 3600},
};
