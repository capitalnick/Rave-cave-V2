import {onSchedule} from "firebase-functions/v2/scheduler";
import {getFirestore} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";

const db = getFirestore();

/**
 * Runs daily at 9:00 AM Sydney time.
 * Finds wines entering their drinking window this year and
 * sends push notifications to the owner's registered FCM tokens.
 *
 * Uses Title Case Firestore field names (matches FIRESTORE_FIELD_MAP).
 * Tracks `notifiedForYear` (number) instead of a boolean so that
 * changing a wine's drink window allows re-notification in a new year.
 */
export const drinkingWindowNotifier = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Australia/Sydney",
    region: "australia-southeast1",
  },
  async () => {
    const currentYear = new Date().getFullYear();

    // Iterate all users
    const usersRef = db.collection("users");
    const userDocs = await usersRef.listDocuments();

    for (const userDoc of userDocs) {
      const uid = userDoc.id;

      try {
        // Query wines where Drink From == currentYear
        const winesSnap = await db
          .collection("users")
          .doc(uid)
          .collection("wines")
          .where("Drink From", "==", currentYear)
          .get();

        if (winesSnap.empty) continue;

        // Filter out wines already notified for this year
        const eligibleWines = winesSnap.docs.filter((d) => {
          const data = d.data();
          return data.notifiedForYear !== currentYear;
        });

        if (eligibleWines.length === 0) continue;

        // Look up FCM tokens
        const tokensSnap = await db
          .collection("users")
          .doc(uid)
          .collection("fcmTokens")
          .get();

        const tokens = tokensSnap.docs
          .map((d) => d.data().token as string)
          .filter(Boolean);

        // Build notification content
        if (tokens.length > 0) {
          let title: string;
          let body: string;

          if (eligibleWines.length === 1) {
            const wine = eligibleWines[0].data();
            const wineName = wine["Wine name"] || wine["Producer"] || "A wine";
            title = "Ready to drink";
            body = `${wineName} (${wine["Vintage"] || ""}) has entered its drinking window.`;
          } else {
            const first = eligibleWines[0].data();
            const second = eligibleWines[1].data();
            const firstName = first["Wine name"] || first["Producer"] || "Wine";
            const secondName = second["Wine name"] || second["Producer"] || "Wine";
            title = `${eligibleWines.length} wines ready to drink`;
            body = `${firstName}, ${secondName}${eligibleWines.length > 2 ? ` and ${eligibleWines.length - 2} more` : ""} have entered their drinking window.`;
          }

          const message = {
            tokens,
            notification: {title, body},
            data: {
              wineId: eligibleWines[0].id,
              type: "drinking_window",
            },
          };

          const response = await getMessaging().sendEachForMulticast(message);

          // Clean up invalid tokens
          const invalidTokenIndices: number[] = [];
          response.responses.forEach((resp, idx) => {
            if (
              resp.error &&
              (resp.error.code === "messaging/invalid-registration-token" ||
                resp.error.code ===
                  "messaging/registration-token-not-registered")
            ) {
              invalidTokenIndices.push(idx);
            }
          });

          if (invalidTokenIndices.length > 0) {
            const batch = db.batch();
            for (const idx of invalidTokenIndices) {
              const staleToken = tokens[idx];
              batch.delete(
                db
                  .collection("users")
                  .doc(uid)
                  .collection("fcmTokens")
                  .doc(staleToken)
              );
            }
            await batch.commit();
          }
        }

        // Mark wines as notified for this year (even if no tokens — avoids daily re-query)
        const batch = db.batch();
        for (const wineDoc of eligibleWines) {
          batch.update(wineDoc.ref, {notifiedForYear: currentYear});
        }
        await batch.commit();
      } catch (err) {
        console.error(`[drinkingWindowNotifier] Error for user ${uid}:`, err);
      }
    }
  }
);
