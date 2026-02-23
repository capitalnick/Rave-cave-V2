#!/usr/bin/env node

/**
 * Migrate wines from flat collection to user subcollections.
 *
 * Usage:
 *   node scripts/migrate-to-subcollections.mjs \
 *     --uid=<FIREBASE_AUTH_UID> \
 *     --service-account=./serviceAccount.json \
 *     [--delete-originals]
 *
 * Storage migration (labels + winelists) runs automatically.
 *
 * Requires firebase-admin (uses functions/node_modules).
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const require = createRequire(import.meta.url);
let admin, FieldValue;
try {
  admin = require('firebase-admin');
  FieldValue = admin.firestore.FieldValue;
} catch {
  console.error('firebase-admin not found. Run from project root or install it.');
  process.exit(1);
}

// ── Parse CLI args ──
const args = process.argv.slice(2);
function getArg(name) {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : null;
}
const uid = getArg('uid');
const saPath = getArg('service-account');
const deleteOriginals = args.includes('--delete-originals');

if (!uid || !saPath) {
  console.error('Required: --uid=<UID> --service-account=<path>');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(resolve(saPath), 'utf-8'));

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
});

const db = app.firestore();
const bucket = app.storage().bucket();

// ── Part 1: Firestore Migration ──
async function migrateFirestore() {
  console.log('\n=== Firestore Migration ===\n');

  const snapshot = await db.collection('wines').get();
  console.log(`Found ${snapshot.size} documents in flat wines collection.\n`);

  let succeeded = 0;
  let failed = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const docId = docSnap.id;
    const label = `${data['Vintage'] || ''} ${data['Producer'] || docId}`.trim();

    try {
      // Handle embedding vector field
      const writeData = { ...data };
      if (data.embedding) {
        // VectorValue from Admin SDK — convert to FieldValue.vector()
        const arr = typeof data.embedding.toArray === 'function'
          ? data.embedding.toArray()
          : Array.isArray(data.embedding)
            ? data.embedding
            : null;

        if (arr && arr.length > 0) {
          writeData.embedding = FieldValue.vector(arr);
        } else {
          // Remove if we can't convert — better than writing invalid data
          console.warn(`  Warning: Could not convert embedding for ${docId}, skipping field`);
          delete writeData.embedding;
        }
      }

      await db.collection('users').doc(uid).collection('wines').doc(docId).set(writeData);
      succeeded++;
      console.log(`  Migrated ${succeeded}/${snapshot.size}: ${label}`);
    } catch (e) {
      failed++;
      console.error(`  FAILED ${docId} (${label}): ${e.message}`);
    }
  }

  console.log(`\nFirestore migration complete: ${succeeded}/${snapshot.size} succeeded, ${failed} failed.\n`);
  return { succeeded, failed, docIds: snapshot.docs.map(d => d.id) };
}

// ── Part 2: Storage Migration ──
async function migrateStorage() {
  console.log('\n=== Storage Migration ===\n');

  let labelsMigrated = 0;
  let labelsSkipped = 0;
  let winelistsMigrated = 0;

  // --- Labels ---
  console.log('Migrating label images...');
  const [labelFiles] = await bucket.getFiles({ prefix: 'labels/' });

  for (const file of labelFiles) {
    const filename = file.name.replace('labels/', '');
    if (!filename) continue; // skip the directory marker itself

    const newPath = `users/${uid}/labels/${filename}`;

    try {
      // Check if destination already exists
      const [destExists] = await bucket.file(newPath).exists();
      if (destExists) {
        labelsSkipped++;
        continue;
      }

      // Download and re-upload
      const [contents] = await file.download();
      await bucket.file(newPath).save(contents, {
        metadata: { contentType: 'image/jpeg' },
      });

      // Get new download URL (signed URL valid for 10 years)
      const [signedUrl] = await bucket.file(newPath).getSignedUrl({
        action: 'read',
        expires: '03-01-2036',
      });

      // Update Firestore doc with new image URL
      const wineId = filename.replace('.jpg', '');
      const wineRef = db.collection('users').doc(uid).collection('wines').doc(wineId);
      const wineDoc = await wineRef.get();
      if (wineDoc.exists) {
        await wineRef.update({ 'Label image': signedUrl });
      }

      labelsMigrated++;
      console.log(`  Migrated image: labels/${filename} -> ${newPath}`);
    } catch (e) {
      console.error(`  FAILED image labels/${filename}: ${e.message}`);
    }
  }

  console.log(`Labels: ${labelsMigrated} migrated, ${labelsSkipped} already existed.\n`);

  // --- Wine lists ---
  console.log('Migrating wine list pages...');
  const [winelistFiles] = await bucket.getFiles({ prefix: 'winelists/' });

  for (const file of winelistFiles) {
    const relativePath = file.name.replace('winelists/', '');
    if (!relativePath) continue;

    const newPath = `users/${uid}/winelists/${relativePath}`;

    try {
      const [destExists] = await bucket.file(newPath).exists();
      if (destExists) continue;

      const [contents] = await file.download();
      await bucket.file(newPath).save(contents, {
        metadata: { contentType: 'image/jpeg' },
      });

      winelistsMigrated++;
      console.log(`  Migrated: winelists/${relativePath} -> ${newPath}`);
    } catch (e) {
      console.error(`  FAILED winelists/${relativePath}: ${e.message}`);
    }
  }

  console.log(`\nStorage: ${labelsMigrated} label images, ${winelistsMigrated} wine list pages migrated.\n`);
  return { labelsMigrated, winelistsMigrated };
}

// ── Part 3: Delete Originals (optional) ──
async function cleanupOriginals(docIds) {
  console.log('\n=== Deleting Originals ===\n');

  // Delete Firestore docs
  let docsDeleted = 0;
  for (const docId of docIds) {
    try {
      await db.collection('wines').doc(docId).delete();
      docsDeleted++;
    } catch (e) {
      console.error(`  Failed to delete wines/${docId}: ${e.message}`);
    }
  }
  console.log(`Deleted ${docsDeleted}/${docIds.length} source documents.`);

  // Delete Storage files
  const [labelFiles] = await bucket.getFiles({ prefix: 'labels/' });
  let filesDeleted = 0;
  for (const file of labelFiles) {
    try {
      await file.delete();
      filesDeleted++;
    } catch (e) {
      console.error(`  Failed to delete ${file.name}: ${e.message}`);
    }
  }

  const [winelistFiles] = await bucket.getFiles({ prefix: 'winelists/' });
  for (const file of winelistFiles) {
    try {
      await file.delete();
      filesDeleted++;
    } catch (e) {
      console.error(`  Failed to delete ${file.name}: ${e.message}`);
    }
  }

  console.log(`Deleted ${filesDeleted} source storage files.\n`);
}

// ── Run ──
async function main() {
  console.log(`Target user UID: ${uid}`);
  console.log(`Delete originals: ${deleteOriginals}\n`);

  const { succeeded, failed, docIds } = await migrateFirestore();
  await migrateStorage();

  if (deleteOriginals && failed === 0) {
    await cleanupOriginals(docIds);
  } else if (deleteOriginals && failed > 0) {
    console.warn('Skipping cleanup — some Firestore migrations failed. Fix and re-run.');
  }

  console.log('=== Done ===');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
