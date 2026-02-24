/**
 * Canvas-based image compression utilities for the Scan & Register pipeline.
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function resizeToCanvas(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number,
  mimeType: string
): Promise<{ canvas: HTMLCanvasElement; blob: Blob }> {
  return new Promise((resolve, reject) => {
    let { width, height } = img;

    if (width > maxDimension || height > maxDimension) {
      const ratio = Math.min(maxDimension / width, maxDimension / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }
        resolve({ canvas, blob });
      },
      mimeType,
      quality
    );
  });
}

/**
 * Compress an image for Gemini extraction: 800px max, JPEG quality 0.8.
 * Returns base64 string (no data URI prefix).
 */
export async function compressImageForExtraction(file: File | Blob): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { canvas } = await resizeToCanvas(img, 800, 0.8, 'image/jpeg');
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    // Strip the "data:image/jpeg;base64," prefix
    return dataUrl.split(',')[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Compress an image for Firebase Storage upload: 1200px max, JPEG quality 0.9.
 * Returns a Blob ready for upload.
 */
export async function compressImageForStorage(file: File | Blob): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { blob } = await resizeToCanvas(img, 1200, 0.9, 'image/jpeg');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Compress an image for thumbnail upload: 400px max, JPEG quality 0.7.
 * Returns a Blob ready for upload (~30-60KB).
 */
export async function compressImageForThumbnail(file: File | Blob): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { blob } = await resizeToCanvas(img, 400, 0.7, 'image/jpeg');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Create a preview URL from a File or Blob. Caller is responsible for revoking.
 */
export function createPreviewUrl(file: File | Blob): string {
  return URL.createObjectURL(file);
}
