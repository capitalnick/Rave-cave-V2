/**
 * One-time Firestore migration: Cépage + Blend % → Grape Varieties
 *
 * Reads all wine documents across all users, converts the legacy flat
 * 'Cépage' and 'Blend %' fields into a 'Grape Varieties' array of
 * { name, pct } objects.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/migrateGrapeVarieties.mjs
 *
 * Safe: skips documents that already have 'Grape Varieties'.
 * Does NOT delete legacy fields (safe rollback for 2 weeks).
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Initialize with service account
const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account key path');
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function migrateLegacyFields(cepage, blendPercent) {
  if (!cepage || !cepage.trim()) return [];
  const names = cepage.split(/[\/,]/).map(s => s.trim()).filter(Boolean);
  const pcts = blendPercent
    ? blendPercent.split(/[\/,]/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0)
    : [];
  return names.map((name, i) => ({ name, pct: pcts[i] ?? null }));
}

async function migrate() {
  // Get all user docs
  const usersSnap = await db.collection('users').get();
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const userDoc of usersSnap.docs) {
    const winesRef = db.collection('users').doc(userDoc.id).collection('wines');
    const winesSnap = await winesRef.get();

    if (winesSnap.empty) continue;

    const batch = db.batch();
    let batchCount = 0;

    for (const wineDoc of winesSnap.docs) {
      const data = wineDoc.data();

      // Skip if already migrated
      if (data['Grape Varieties'] !== undefined && Array.isArray(data['Grape Varieties']) && data['Grape Varieties'].length > 0) {
        totalSkipped++;
        continue;
      }

      const grapeVarieties = migrateLegacyFields(data['Cépage'], data['Blend %']);

      batch.update(wineDoc.ref, { 'Grape Varieties': grapeVarieties });
      batchCount++;
      totalUpdated++;

      // Firestore batch limit is 500
      if (batchCount >= 450) {
        await batch.commit();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  }

  console.log(`Migration complete. Updated: ${totalUpdated}, Skipped: ${totalSkipped}`);
}

migrate().catch(console.error);
