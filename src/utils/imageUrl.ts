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
 * Strip revoked tokens from legacy Firebase Storage URLs.
 */
export function getDirectImageUrl(url: string | undefined): string | undefined {
  if (!url) return url;

  if (url.includes('drive.google.com')) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
  }

  // Legacy Firebase Storage URLs at /labels/ (pre user-scoping) have revoked
  // tokens. Strip the token so Firebase falls back to rule-based access.
  if (url.includes('/o/labels%2F') && !url.includes('/o/users%2F')) {
    try {
      const u = new URL(url);
      u.searchParams.delete('token');
      return u.toString();
    } catch {
      // URL parse failed — return as-is
    }
  }

  return url;
}
