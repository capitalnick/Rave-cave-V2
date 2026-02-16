import React, { useRef, useState } from 'react';
import { ArrowLeft, Camera, ImageIcon, X } from 'lucide-react';
import { Button, Heading, Body, MonoLabel, IconButton } from '@/components/rc';
import { WINELIST_MAX_PAGES } from '@/constants';
import { cn } from '@/lib/utils';
import type { CapturedPage } from '@/hooks/useWineListCapture';

interface WineListCaptureProps {
  pages: CapturedPage[];
  canAdd: boolean;
  onAddPage: (file: File) => void;
  onAddPages: (files: File[]) => void;
  onRemovePage: (index: number) => void;
  onAnalyse: () => void;
  onBack: () => void;
}

const WineListCapture: React.FC<WineListCaptureProps> = ({
  pages,
  canAdd,
  onAddPage,
  onAddPages,
  onRemovePage,
  onAnalyse,
  onBack,
}) => {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const handleBack = () => {
    if (pages.length > 0) {
      if (window.confirm('Discard captured pages?')) onBack();
    } else {
      onBack();
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAddPage(file);
    e.target.value = '';
  };

  const handleGalleryCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onAddPages(Array.from(files));
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
          <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider">Back</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6 pb-24">
        <div className="text-center space-y-1 mb-6">
          <Heading scale="heading">CAPTURE WINE LIST</Heading>
          <Body size="caption" colour="ghost">
            Photograph each page of the wine list
          </Body>
        </div>

        {/* Thumbnail strip */}
        {pages.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {pages.map((page, i) => (
                <div
                  key={page.pageIndex}
                  className="relative shrink-0 w-12 h-16 rounded-[var(--rc-radius-sm)] overflow-hidden border border-[var(--rc-border-subtle)] cursor-pointer group"
                  onClick={() => setPreviewIndex(i)}
                >
                  <img
                    src={page.previewUrl}
                    alt={`Page ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Page number badge */}
                  <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-[var(--rc-font-mono)] font-bold text-center py-px">
                    {i + 1}
                  </span>
                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemovePage(i); }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--rc-accent-coral)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove page ${i + 1}`}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            <MonoLabel size="micro" colour="ghost" className="w-auto mt-2">
              {pages.length} page{pages.length !== 1 ? 's' : ''} captured
              {pages.length >= WINELIST_MAX_PAGES && ' (max)'}
            </MonoLabel>
          </div>
        )}

        {/* Capture buttons */}
        <div className="flex flex-col items-center gap-4 mb-8">
          {canAdd && (
            <>
              <IconButton
                icon={Camera}
                aria-label="Take photo of wine list"
                onClick={() => cameraRef.current?.click()}
                className="w-20 h-20 bg-[var(--rc-surface-secondary)] hover:bg-[var(--rc-accent-pink)] hover:text-white"
              />
              <MonoLabel size="label" colour="ghost">Take photo</MonoLabel>

              <button
                onClick={() => galleryRef.current?.click()}
                className="flex items-center gap-2 text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)] transition-colors"
              >
                <ImageIcon size={16} />
                <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider underline">
                  Choose from gallery
                </span>
              </button>
            </>
          )}
        </div>

        {/* Analyse CTA */}
        <div className="mt-auto pt-6">
          <Button
            variantType="Primary"
            label="ANALYSE WINE LIST"
            onClick={onAnalyse}
            disabled={pages.length === 0}
            className={cn("w-full", pages.length === 0 && "opacity-50")}
          />
        </div>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGalleryCapture}
      />

      {/* Full-screen preview */}
      {previewIndex !== null && pages[previewIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setPreviewIndex(null)}
        >
          <img
            src={pages[previewIndex].previewUrl}
            alt={`Page ${previewIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setPreviewIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center"
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default WineListCapture;
