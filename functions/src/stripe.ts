import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import Stripe from "stripe";
import {validateAuth, AuthError} from "./authMiddleware";
import {ALLOWED_ORIGINS} from "./cors";
import {checkRateLimit, RATE_LIMITS} from "./rateLimit";

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET =
  defineSecret("STRIPE_WEBHOOK_SECRET");
const STRIPE_PRICE_MONTHLY =
  defineSecret("STRIPE_PRICE_MONTHLY");

const db = getFirestore();

// Fix #2: omit apiVersion — let the SDK use its default
/**
 * Create a Stripe client from the secret key.
 * @param {string} key Stripe secret key.
 * @return {Stripe} Stripe client instance.
 */
function getStripe(key: string): Stripe {
  return new Stripe(key, {
    httpClient: Stripe.createNodeHttpClient(),
    timeout: 30000,
    maxNetworkRetries: 3,
  });
}

// Protected fields that only the webhook (Admin SDK) may write
const PROTECTED_FIELDS = [
  "tier",
  "stripeCustomerId",
  "subscriptionId",
  "subscriptionStatus",
  "upgradedAt",
];

// ── createCheckoutSession ──

export const createCheckoutSession = onRequest(
  {
    region: "australia-southeast1",
    cors: ALLOWED_ORIGINS,
    secrets: [STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
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

    const allowed = await checkRateLimit(
      uid, "checkout", RATE_LIMITS.checkout
    );
    if (!allowed) {
      res.status(429).json({
        error: "Rate limit exceeded. Try again later.",
      });
      return;
    }

    const priceId = STRIPE_PRICE_MONTHLY.value();
    if (!priceId) {
      res.status(500).json({error: "Price not configured"});
      return;
    }

    const stripe = getStripe(STRIPE_SECRET_KEY.value());

    try {
      const profileDoc = await db
        .doc(`users/${uid}/profile/preferences`).get();
      const existing =
        profileDoc.data()?.stripeCustomerId;

      const origin =
        req.headers.origin || "https://ravecave.app";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        mode: "subscription",
        line_items: [{price: priceId, quantity: 1}],
        success_url: `${origin}/settings?upgrade=success`,
        cancel_url: `${origin}/settings?upgrade=cancelled`,
        metadata: {firebaseUid: uid},
        subscription_data: {
          metadata: {firebaseUid: uid},
        },
        allow_promotion_codes: true,
      };

      if (existing) {
        params.customer = existing;
      } else {
        const {getAuth} = await import("firebase-admin/auth");
        const user = await getAuth().getUser(uid);
        if (user.email) {
          params.customer_email = user.email;
        }
      }

      const session =
        await stripe.checkout.sessions.create(params);
      res.json({url: session.url});
    } catch (e) {
      const msg = e instanceof Error ?
        e.message : String(e);
      logger.error("createCheckoutSession failed", {
        uid, error: msg,
      });
      res.status(500).json({
        error: "Failed to create checkout session",
      });
    }
  }
);

// ── createPortalSession ──

export const createPortalSession = onRequest(
  {
    region: "australia-southeast1",
    cors: ALLOWED_ORIGINS,
    secrets: [STRIPE_SECRET_KEY],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
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

    const allowed = await checkRateLimit(
      uid, "checkout", RATE_LIMITS.checkout
    );
    if (!allowed) {
      res.status(429).json({
        error: "Rate limit exceeded. Try again later.",
      });
      return;
    }

    try {
      const profileDoc = await db
        .doc(`users/${uid}/profile/preferences`).get();
      const custId =
        profileDoc.data()?.stripeCustomerId;

      if (!custId) {
        res.status(400).json({
          error: "No subscription found",
        });
        return;
      }

      const stripe = getStripe(STRIPE_SECRET_KEY.value());
      const origin =
        req.headers.origin || "https://ravecave.app";

      const session =
        await stripe.billingPortal.sessions.create({
          customer: custId,
          return_url: `${origin}/settings`,
        });

      res.json({url: session.url});
    } catch (e) {
      const msg = e instanceof Error ?
        e.message : String(e);
      logger.error("createPortalSession failed", {
        uid, error: msg,
      });
      res.status(500).json({
        error: "Failed to create portal session",
      });
    }
  }
);

// ── cancelSubscription ──
// Fix #7: included in 6A alongside other Stripe functions

export const cancelSubscription = onRequest(
  {
    region: "australia-southeast1",
    cors: ALLOWED_ORIGINS,
    secrets: [STRIPE_SECRET_KEY],
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
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

    try {
      const profileDoc = await db
        .doc(`users/${uid}/profile/preferences`).get();
      const subId =
        profileDoc.data()?.subscriptionId;

      if (!subId) {
        res.json({
          cancelled: false,
          reason: "No subscription",
        });
        return;
      }

      const stripe = getStripe(STRIPE_SECRET_KEY.value());
      await stripe.subscriptions.cancel(subId);
      res.json({cancelled: true});
    } catch (e) {
      const msg = e instanceof Error ?
        e.message : String(e);
      logger.error("cancelSubscription failed", {
        uid, error: msg,
      });
      res.status(500).json({
        error: "Failed to cancel subscription",
      });
    }
  }
);

// ── Webhook helpers ──

// Fix #3: removed unused stripe param —
// only reads Firestore, never calls Stripe API
/**
 * Resolve Firebase UID from a Stripe subscription.
 * @param {Stripe.Subscription} subscription Stripe sub.
 * @return {Promise<string|null>} Firebase UID or null.
 */
async function getUidFromSubscription(
  subscription: Stripe.Subscription
): Promise<string | null> {
  const uid = subscription.metadata?.firebaseUid;
  if (uid) return uid;

  const customerId =
    typeof subscription.customer === "string" ?
      subscription.customer :
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (subscription.customer as any)?.id;

  if (customerId) {
    const doc = await db
      .collection("stripeCustomers")
      .doc(customerId).get();
    if (doc.exists) {
      return doc.data()?.uid || null;
    }
  }

  logger.warn("Could not resolve UID from subscription", {
    subscriptionId: subscription.id,
  });
  return null;
}

/**
 * Handle checkout.session.completed webhook.
 * @param {Stripe} stripe Stripe client.
 * @param {Stripe.Checkout.Session} session Checkout session.
 */
async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const uid = session.metadata?.firebaseUid;
  if (!uid) {
    logger.error("checkout.session.completed missing uid", {
      sessionId: session.id,
    });
    return;
  }

  const subId =
    typeof session.subscription === "string" ?
      session.subscription :
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.subscription as any)?.id;

  const custId =
    typeof session.customer === "string" ?
      session.customer :
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.customer as any)?.id;

  if (!subId || !custId) {
    logger.error("checkout missing sub or customer", {
      sessionId: session.id,
    });
    return;
  }

  const profileRef = db.doc(`users/${uid}/profile/preferences`);
  await profileRef.set({
    tier: "premium",
    stripeCustomerId: custId,
    subscriptionId: subId,
    subscriptionStatus: "active",
    upgradedAt: FieldValue.serverTimestamp(),
  }, {merge: true});

  // Reverse mapping: stripeCustomerId -> uid
  await db.collection("stripeCustomers")
    .doc(custId).set({uid});

  logger.info("User upgraded to premium", {
    uid, customerId: custId, subscriptionId: subId,
  });
}

/**
 * Handle customer.subscription.updated webhook.
 * @param {Stripe.Subscription} subscription Updated sub.
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  // Fix #3: no getStripe() call needed
  const uid = await getUidFromSubscription(subscription);
  if (!uid) return;

  const status = subscription.status;
  const premiumStatuses = ["active", "trialing", "past_due"];
  const tier = premiumStatuses.includes(status) ?
    "premium" : "free";

  const profileRef = db.doc(`users/${uid}/profile/preferences`);
  await profileRef.set({
    tier,
    subscriptionStatus: status,
  }, {merge: true});

  logger.info("Subscription updated", {
    uid, status, tier,
  });
}

/**
 * Handle customer.subscription.deleted webhook.
 * @param {Stripe.Subscription} subscription Deleted sub.
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  // Fix #3: no getStripe() call needed
  const uid = await getUidFromSubscription(subscription);
  if (!uid) return;

  const profileRef = db.doc(`users/${uid}/profile/preferences`);
  await profileRef.set({
    tier: "free",
    subscriptionStatus: "canceled",
  }, {merge: true});

  logger.info("Subscription deleted — downgraded", {
    uid, subscriptionId: subscription.id,
  });
}

/**
 * Handle invoice.payment_failed webhook.
 * @param {Stripe.Invoice} invoice Failed invoice.
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice
) {
  const customerId =
    typeof invoice.customer === "string" ?
      invoice.customer :
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (invoice.customer as any)?.id;

  if (!customerId) return;

  const doc = await db
    .collection("stripeCustomers")
    .doc(customerId).get();
  const uid = doc.data()?.uid;
  if (!uid) {
    logger.warn("payment_failed — no uid", {customerId});
    return;
  }

  // Don't downgrade — Stripe retries payment.
  // Just update status for warning banner.
  const profileRef = db.doc(`users/${uid}/profile/preferences`);
  await profileRef.set({
    subscriptionStatus: "past_due",
  }, {merge: true});

  logger.warn("Payment failed", {
    uid, customerId, invoiceId: invoice.id,
  });
}

// ── stripeWebhook ──

export const stripeWebhook = onRequest(
  {
    region: "australia-southeast1",
    secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
    // No CORS — called by Stripe servers, not browsers
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const stripe = getStripe(STRIPE_SECRET_KEY.value());
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      res.status(400).send("Missing stripe-signature");
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        STRIPE_WEBHOOK_SECRET.value()
      );
    } catch (e) {
      const msg = e instanceof Error ?
        e.message : String(e);
      logger.warn("Webhook sig verification failed", {
        error: msg,
      });
      res.status(400).send(`Webhook Error: ${msg}`);
      return;
    }

    try {
      switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data
          .object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(stripe, session);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data
          .object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data
          .object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data
          .object as Stripe.Invoice;
        await handlePaymentFailed(inv);
        break;
      }
      default:
        logger.info(`Unhandled event: ${event.type}`);
      }

      res.json({received: true});
    } catch (e) {
      const msg = e instanceof Error ?
        e.message : String(e);
      logger.error(`Webhook handler failed: ${event.type}`, {
        error: msg,
      });
      // Return 200 — avoid Stripe retry loops
      res.json({received: true, error: msg});
    }
  }
);

// Export PROTECTED_FIELDS for reference in rules docs
export {PROTECTED_FIELDS};
