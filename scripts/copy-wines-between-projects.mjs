#!/usr/bin/env node

/**
 * Copy wines collection between Firebase projects.
 *
 * Usage:
 *   SRC_SERVICE_ACCOUNT=./src-sa.json DST_SERVICE_ACCOUNT=./dst-sa.json node scripts/copy-wines-between-projects.mjs
 *
 * Options:
 *   DRY_RUN=true   — log what would be copied without writing
 *
 * Requires firebase-admin:
 *   npm install firebase-admin (or use from functions/node_modules)
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Try to load firebase-admin from functions dir or root
const require = createRequire(import.meta.url);
let admin;
try {
  admin = require('firebase-admin');
} catch {
  console.error('firebase-admin not found. Install it or run from functions dir.');
  process.exit(1);
}

const SRC_SA = process.env.SRC_SERVICE_ACCOUNT;
const DST_SA = process.env.DST_SERVICE_ACCOUNT;
const DRY_RUN = process.env.DRY_RUN === 'true';
const COLLECTION = 'wines';
const BATCH_SIZE = 400;

if (!SRC_SA || !DST_SA) {
  console.error('Set SRC_SERVICE_ACCOUNT and DST_SERVICE_ACCOUNT env vars to service account JSON paths.');
  process.exit(1);
}

function loadSA(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf-8'));
}

const srcApp = admin.initializeApp(
  { credential: admin.credential.cert(loadSA(SRC_SA)) },
  'source'
);
const dstApp = admin.initializeApp(
  { credential: admin.credential.cert(loadSA(DST_SA)) },
  'destination'
);

const srcDb = srcApp.firestore();
const dstDb = dstApp.firestore();

async function copyCollection() {
  const snapshot = await srcDb.collection(COLLECTION).get();
  console.log(`Found ${snapshot.size} docs in source ${COLLECTION}`);

  if (DRY_RUN) {
    snapshot.docs.forEach((doc) => {
      console.log(`  [DRY RUN] Would copy: ${doc.id}`);
    });
    console.log('Dry run complete.');
    return;
  }

  // Batch writes (max 500 per batch, using 400 for safety)
  let batch = dstDb.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const ref = dstDb.collection(COLLECTION).doc(doc.id);
    batch.set(ref, doc.data());
    count++;

    if (count % BATCH_SIZE === 0) {
      await batch.commit();
      console.log(`  Committed ${count} docs...`);
      batch = dstDb.batch();
    }
  }

  // Commit remaining
  if (count % BATCH_SIZE !== 0) {
    await batch.commit();
  }

  console.log(`Done. Copied ${count} docs to destination ${COLLECTION}.`);
}

copyCollection()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
