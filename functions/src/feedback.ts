import {onRequest} from "firebase-functions/v2/https";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {validateAuth, AuthError} from "./authMiddleware";
import {ALLOWED_ORIGINS} from "./cors";
import {checkRateLimit, RATE_LIMITS} from "./rateLimit";
import {logUsage} from "./usageLog";
import {REGION} from "./config";

const db = getFirestore();

const VALID_CATEGORIES = ["bug", "suggestion"] as const;

interface FeedbackBody {
  message?: unknown;
  category?: unknown;
  route?: unknown;
  userAgent?: unknown;
  appVersion?: unknown;
  isPremium?: unknown;
  screenshotUrl?: unknown;
}

export const submitFeedback = onRequest(
  {
    region: REGION,
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
      }

      let uid: string;
      try {
        uid = await validateAuth(req);
      } catch (e) {
        if (e instanceof AuthError) {
          res.status(401).json({error: "Unauthorized"});
          return;
        }
        throw e;
      }

      const rateLimitAllowed = await checkRateLimit(
        uid, "feedback", RATE_LIMITS.feedback
      );
      if (!rateLimitAllowed) {
        res.status(429).json({error: "Rate limit exceeded. Try again later."});
        return;
      }

      const body: FeedbackBody = typeof req.body === "string" ?
        (JSON.parse(req.body || "{}") as FeedbackBody) :
        ((req.body ?? {}) as FeedbackBody);

      // Validate message
      const message = typeof body.message === "string" ?
        body.message.trim() : "";
      if (message.length === 0 || message.length > 500) {
        res.status(400).json({
          error: "Message is required and must be 1-500 characters",
        });
        return;
      }

      // Validate category
      const rawCategory = body.category;
      const category = typeof rawCategory === "string" &&
        (VALID_CATEGORIES as readonly string[]).includes(rawCategory) ?
        rawCategory : null;

      // Optional metadata (strings)
      const route = typeof body.route === "string" ?
        body.route.slice(0, 200) : null;
      const userAgent = typeof body.userAgent === "string" ?
        body.userAgent.slice(0, 500) : null;
      const appVersion = typeof body.appVersion === "string" ?
        body.appVersion.slice(0, 20) : null;
      const isPremium = typeof body.isPremium === "boolean" ?
        body.isPremium : false;

      // Validate screenshot URL — must be a Firebase Storage URL
      const rawScreenshot = body.screenshotUrl;
      const screenshotUrl = typeof rawScreenshot === "string" &&
        rawScreenshot.startsWith("https://firebasestorage.googleapis.com/") ?
        rawScreenshot.slice(0, 2000) : null;

      await db.collection("feedback").add({
        uid,
        message,
        category,
        route,
        userAgent,
        appVersion,
        isPremium,
        screenshotUrl,
        createdAt: FieldValue.serverTimestamp(),
      });

      logUsage(uid, "feedbackSubmissions");

      res.status(200).json({success: true});
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("Feedback function failed", {error: msg});
      res.status(500).json({error: "Feedback submission failed"});
    }
  }
);
