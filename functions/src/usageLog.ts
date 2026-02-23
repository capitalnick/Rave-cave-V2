import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

/**
 * Increment a per-user monthly usage counter.
 * Writes to users/{uid}/usage/{YYYY-MM}.
 * Fire-and-forget — errors are logged but never block the caller.
 * @param {string} uid The user's UID.
 * @param {string} metric Counter field name (e.g. "geminiCalls").
 */
export function logUsage(uid: string, metric: string): void {
  const month = new Date().toISOString().slice(0, 7); // '2026-02'
  const ref = db.collection("users").doc(uid).collection("usage").doc(month);
  ref.set(
    {[metric]: FieldValue.increment(1), lastUpdated: FieldValue.serverTimestamp()},
    {merge: true}
  ).catch((e) => {
    logger.warn("Usage log failed", {uid, metric, error: e});
  });
}
