import { useState, useCallback, useRef, useEffect } from 'react';
import { WINELIST_MAX_PAGES } from '@/constants';
import { uploadWineListPage } from '@/services/storageService';

export interface CapturedPage {
  pageIndex: number;
  file: File;
  previewUrl: string;
  base64: string | null;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'error';
  storageUrl: string | null;
}

/**
 * Compress an image file to a target width (for Gemini extraction).
 * Returns base64-encoded JPEG (without data URI prefix).
 */
function compressImage(file: File, maxWidth = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

export function useWineListCapture() {
  const [pages, setPages] = useState<CapturedPage[]>([]);
  const sessionIdRef = useRef(crypto.randomUUID());

  // Progressive upload: when a page is added, start uploading in background
  const startUpload = useCallback(async (page: CapturedPage) => {
    try {
      setPages(prev => prev.map(p =>
        p.pageIndex === page.pageIndex ? { ...p, uploadStatus: 'uploading' as const } : p
      ));
      const url = await uploadWineListPage(page.file, sessionIdRef.current, page.pageIndex);
      setPages(prev => prev.map(p =>
        p.pageIndex === page.pageIndex ? { ...p, uploadStatus: 'uploaded' as const, storageUrl: url } : p
      ));
    } catch {
      setPages(prev => prev.map(p =>
        p.pageIndex === page.pageIndex ? { ...p, uploadStatus: 'error' as const } : p
      ));
    }
  }, []);

  const addPage = useCallback(async (file: File) => {
    setPages(prev => {
      if (prev.length >= WINELIST_MAX_PAGES) return prev;
      const pageIndex = prev.length;
      const previewUrl = URL.createObjectURL(file);
      const newPage: CapturedPage = {
        pageIndex,
        file,
        previewUrl,
        base64: null,
        uploadStatus: 'pending',
        storageUrl: null,
      };

      // Compress in background, then update base64 and start upload
      compressImage(file).then(b64 => {
        setPages(p => p.map(pg =>
          pg.pageIndex === pageIndex ? { ...pg, base64: b64 } : pg
        ));
        startUpload({ ...newPage, base64: b64 });
      });

      return [...prev, newPage];
    });
  }, [startUpload]);

  const addPages = useCallback((files: File[]) => {
    files.forEach(f => addPage(f));
  }, [addPage]);

  const removePage = useCallback((index: number) => {
    setPages(prev => {
      const page = prev[index];
      if (page) URL.revokeObjectURL(page.previewUrl);
      // Re-index remaining pages
      return prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, pageIndex: i }));
    });
  }, []);

  const clear = useCallback(() => {
    setPages(prev => {
      prev.forEach(p => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    sessionIdRef.current = crypto.randomUUID();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pages.forEach(p => URL.revokeObjectURL(p.previewUrl));
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allBase64 = pages.every(p => p.base64 !== null)
    ? pages.map(p => p.base64!)
    : null;

  return {
    pages,
    addPage,
    addPages,
    removePage,
    clear,
    sessionId: sessionIdRef.current,
    allBase64,
    canAdd: pages.length < WINELIST_MAX_PAGES,
    pageCount: pages.length,
  };
}
