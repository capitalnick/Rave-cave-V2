import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '@/firebase';
import { requireUid } from '@/utils/authHelpers';

/**
 * Upload a compressed label image + thumbnail to Firebase Storage.
 * Full image: users/{uid}/labels/{wineId}.jpg
 * Thumbnail:  users/{uid}/labels/{wineId}_thumb.jpg
 */
export async function uploadLabelImage(
  blob: Blob,
  thumbnailBlob: Blob,
  wineId: string,
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const uid = requireUid();
  const fullRef = ref(storage, `users/${uid}/labels/${wineId}.jpg`);
  const thumbRef = ref(storage, `users/${uid}/labels/${wineId}_thumb.jpg`);

  await Promise.all([
    uploadBytes(fullRef, blob, { contentType: 'image/jpeg' }),
    uploadBytes(thumbRef, thumbnailBlob, { contentType: 'image/jpeg' }),
  ]);

  const [imageUrl, thumbnailUrl] = await Promise.all([
    getDownloadURL(fullRef),
    getDownloadURL(thumbRef),
  ]);

  return { imageUrl, thumbnailUrl };
}

/**
 * Delete a label image and its thumbnail from Firebase Storage (used for undo).
 */
export async function deleteLabelImage(wineId: string): Promise<void> {
  const uid = requireUid();
  const fullRef = ref(storage, `users/${uid}/labels/${wineId}.jpg`);
  const thumbRef = ref(storage, `users/${uid}/labels/${wineId}_thumb.jpg`);
  const safeDelete = async (r: typeof fullRef) => {
    try { await deleteObject(r); } catch (e: any) {
      if (e?.code !== 'storage/object-not-found') throw e;
    }
  };
  await Promise.all([safeDelete(fullRef), safeDelete(thumbRef)]);
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
