import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/firebase';

/**
 * Upload a compressed label image to Firebase Storage.
 * Path: labels/{wineId}.jpg
 */
export async function uploadLabelImage(blob: Blob, wineId: string): Promise<string> {
  const storageRef = ref(storage, `labels/${wineId}.jpg`);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Delete a label image from Firebase Storage (used for undo).
 */
export async function deleteLabelImage(wineId: string): Promise<void> {
  const storageRef = ref(storage, `labels/${wineId}.jpg`);
  try {
    await deleteObject(storageRef);
  } catch (e: any) {
    // Ignore not-found errors (image may not have been uploaded yet)
    if (e?.code !== 'storage/object-not-found') throw e;
  }
}
