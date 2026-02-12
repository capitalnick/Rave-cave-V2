/**
 * Canvas-based image quality analysis for the post-capture quality gate.
 * Runs Laplacian blur detection, RMS contrast, and glare analysis.
 */

const THRESHOLDS = {
  BLUR_PASS: 500,
  BLUR_WARN: 100,
  CONTRAST_PASS: 0.15,
  CONTRAST_WARN: 0.08,
  GLARE_WARN: 0.12,
  GLARE_FAIL: 0.20,
  ANALYSIS_SIZE: 400,
} as const;

export interface ImageQualityResult {
  blur: number;
  contrast: number;
  glare: number;
  verdict: 'pass' | 'warn' | 'fail';
  reasons: string[];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function toGrayscale(data: Uint8ClampedArray, pixelCount: number): Float32Array {
  const gray = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const off = i * 4;
    gray[i] = 0.299 * data[off] + 0.587 * data[off + 1] + 0.114 * data[off + 2];
  }
  return gray;
}

/** Laplacian variance — higher = sharper */
function computeBlur(gray: Float32Array, width: number, height: number): number {
  // 3x3 Laplacian kernel: [0,1,0 / 1,-4,1 / 0,1,0]
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap =
        gray[idx - width] +
        gray[idx - 1] +
        -4 * gray[idx] +
        gray[idx + 1] +
        gray[idx + width];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  const mean = sum / count;
  return sumSq / count - mean * mean;
}

/** RMS contrast — 0 to ~1 range */
function computeContrast(gray: Float32Array): number {
  const n = gray.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += gray[i];
  const mean = sum / n;

  let sqDiffSum = 0;
  for (let i = 0; i < n; i++) {
    const diff = gray[i] - mean;
    sqDiffSum += diff * diff;
  }
  return Math.sqrt(sqDiffSum / n) / 255;
}

/** Fraction of near-white pixels (luminance > 245) */
function computeGlare(gray: Float32Array): number {
  let bright = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] > 245) bright++;
  }
  return bright / gray.length;
}

function buildVerdict(blur: number, contrast: number, glare: number): { verdict: 'pass' | 'warn' | 'fail'; reasons: string[] } {
  const reasons: string[] = [];
  let hasFail = false;
  let hasWarn = false;

  // Blur
  if (blur < THRESHOLDS.BLUR_WARN) {
    reasons.push('Image is too blurry \u2014 hold steady and try again');
    hasFail = true;
  } else if (blur < THRESHOLDS.BLUR_PASS) {
    reasons.push('Image may be blurry \u2014 retake for best results');
    hasWarn = true;
  }

  // Contrast
  if (contrast < THRESHOLDS.CONTRAST_WARN) {
    reasons.push('Image is too dark or washed out');
    hasFail = true;
  } else if (contrast < THRESHOLDS.CONTRAST_PASS) {
    reasons.push('Low contrast \u2014 better lighting may help');
    hasWarn = true;
  }

  // Glare
  if (glare >= THRESHOLDS.GLARE_FAIL) {
    reasons.push('Heavy glare obscuring the label');
    hasFail = true;
  } else if (glare >= THRESHOLDS.GLARE_WARN) {
    reasons.push('Strong glare detected \u2014 try tilting the bottle');
    hasWarn = true;
  }

  const verdict = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass';
  return { verdict, reasons };
}

export async function analyseImageQuality(file: File): Promise<ImageQualityResult> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    // Resize for speed
    let { width, height } = img;
    const maxDim = THRESHOLDS.ANALYSIS_SIZE;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const gray = toGrayscale(imageData.data, width * height);

    const blur = computeBlur(gray, width, height);
    const contrast = computeContrast(gray);
    const glare = computeGlare(gray);
    const { verdict, reasons } = buildVerdict(blur, contrast, glare);

    if (import.meta.env.DEV) {
      console.log(
        `[ImageQuality] blur=${blur.toFixed(1)} contrast=${contrast.toFixed(3)} glare=${(glare * 100).toFixed(1)}% verdict=${verdict}`
      );
    }

    return { blur, contrast, glare, verdict, reasons };
  } finally {
    URL.revokeObjectURL(url);
  }
}
