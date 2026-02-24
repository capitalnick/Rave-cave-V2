/**
 * Extract a Google Drive file ID from various URL formats.
 */
function extractDriveFileId(url: string): string | null {
  // Format: /file/d/FILE_ID/view
  const viewMatch = url.match(/\/file\/d\/([^\/]+)/);
  if (viewMatch) return viewMatch[1];

  // Format: /uc?id=FILE_ID or ?id=FILE_ID
  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (idMatch) return idMatch[1];

  // Format: /thumbnail?id=FILE_ID
  const thumbMatch = url.match(/\/thumbnail\?.*id=([^&]+)/);
  if (thumbMatch) return thumbMatch[1];

  return null;
}

import { auth } from '@/firebase';

/**
 * Convert Google Drive URLs to embeddable thumbnail URLs.
 * Rewrite legacy Firebase Storage label URLs to the correct user-scoped path.
 */
export function getDirectImageUrl(url: string | undefined): string | undefined {
  if (!url) return url;

  if (url.includes('drive.google.com')) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
  }

  // Legacy Firebase Storage URLs point to labels/{id}.jpg but files live at
  // users/{uid}/labels/{id}.jpg. Rewrite the path and drop the stale token.
  if (url.includes('/o/labels%2F') && !url.includes('/o/users%2F')) {
    const uid = auth.currentUser?.uid;
    if (uid) {
      const fileMatch = url.match(/labels%2F([^?&]+)/);
      if (fileMatch) {
        const bucket = url.match(/\/b\/([^/]+)\//)?.[1] || 'rave-cave-prod.firebasestorage.app';
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/users%2F${uid}%2Flabels%2F${fileMatch[1]}?alt=media`;
      }
    }
  }

  return url;
}
