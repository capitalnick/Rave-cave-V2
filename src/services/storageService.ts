import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '@/firebase';
import { requireUid } from '@/utils/authHelpers';

/**
 * Upload a compressed label image to Firebase Storage.
 * Path: labels/{wineId}.jpg
 */
export async function uploadLabelImage(blob: Blob, wineId: string): Promise<string> {
  const uid = requireUid();
  const storageRef = ref(storage, `users/${uid}/labels/${wineId}.jpg`);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Delete a label image from Firebase Storage (used for undo).
 */
export async function deleteLabelImage(wineId: string): Promise<void> {
  const uid = requireUid();
  const storageRef = ref(storage, `users/${uid}/labels/${wineId}.jpg`);
  try {
    await deleteObject(storageRef);
  } catch (e: any) {
    // Ignore not-found errors (image may not have been uploaded yet)
    if (e?.code !== 'storage/object-not-found') throw e;
  }
}

/**
 * Upload a wine list page image to Firebase Storage.
 * Path: winelists/{sessionId}/page-{pageIndex}.jpg
 */
export async function uploadWineListPage(blob: Blob, sessionId: string, pageIndex: number): Promise<string> {
  const uid = requireUid();
  const storageRef = ref(storage, `users/${uid}/winelists/${sessionId}/page-${pageIndex}.jpg`);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Delete all images for a wine list session.
 */
export async function deleteWineListSession(sessionId: string): Promise<void> {
  const uid = requireUid();
  const folderRef = ref(storage, `users/${uid}/winelists/${sessionId}`);
  try {
    const list = await listAll(folderRef);
    await Promise.all(list.items.map(item => deleteObject(item)));
  } catch (e: any) {
    if (e?.code !== 'storage/object-not-found') throw e;
  }
}
