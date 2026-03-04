import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { FIRESTORE_FIELD_MAP } from '@/types';

const PRICE_CURRENCY_FS_KEY = FIRESTORE_FIELD_MAP['priceCurrency'] || 'Price Currency';
const BATCH_SIZE = 500;

/**
 * Stamp all wines lacking `priceCurrency` with the given currency code.
 * Used when:
 *  1. User changes home currency (stamp with OLD currency before switch)
 *  2. First load after multi-currency feature ships (stamp with current home)
 *
 * Idempotent: only writes to docs where the field is missing/empty.
 * Returns count of wines stamped.
 */
export async function stampMissingCurrency(uid: string, currency: string): Promise<number> {
  const winesRef = collection(db, 'users', uid, 'wines');
  const snap = await getDocs(winesRef);

  const toStamp = snap.docs.filter(d => {
    const data = d.data();
    return !data[PRICE_CURRENCY_FS_KEY];
  });

  if (toStamp.length === 0) return 0;

  // Batch write in chunks of 500
  let stamped = 0;
  for (let i = 0; i < toStamp.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = toStamp.slice(i, i + BATCH_SIZE);
    for (const d of chunk) {
      batch.update(doc(db, 'users', uid, 'wines', d.id), {
        [PRICE_CURRENCY_FS_KEY]: currency,
      });
    }
    await batch.commit();
    stamped += chunk.length;
  }

  return stamped;
}
