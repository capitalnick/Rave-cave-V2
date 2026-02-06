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

/**
 * Convert Google Drive URLs to embeddable thumbnail URLs.
 * The /thumbnail endpoint is the most reliable for cross-origin display.
 */
export function getDirectImageUrl(url: string | undefined): string | undefined {
  if (!url) return url;

  if (url.includes('drive.google.com')) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
  }

  return url;
}
