import React, { useRef, useCallback } from 'react';
import { Camera, PenLine, ImageIcon, FileSpreadsheet } from 'lucide-react';
import { Heading, MonoLabel, Body } from '@/components/rc';
import { hapticLight } from '@/utils/haptics';

interface ModeSelectorProps {
  onCameraCapture: (file: File) => void;
  onGalleryCapture: (file: File) => void;
  onManualEntry: () => void;
  onImport?: () => void;
}

/**
 * Opens a native file picker by creating a temporary <input type="file">.
 * This avoids having hidden file inputs in the DOM that can be auto-triggered
 * by focus traps (e.g. Radix Dialog) on Chrome Android / Desktop.
 *
 * IMPORTANT: Must be called within a direct user gesture (click/tap handler)
 * for reliable behaviour on mobile browsers. Do NOT call from
 * requestAnimationFrame, setTimeout, or useEffect.
 */
export function openFilePicker(
  opts: { capture?: boolean },
  onFile: (file: File) => void,
) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (opts.capture) input.setAttribute('capture', 'environment');
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) onFile(file);
  });
  input.click();
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ onCameraCapture, onGalleryCapture, onManualEntry, onImport }) => {
  const handleCamera = useCallback(() => {
    hapticLight();
    openFilePicker({ capture: true }, onCameraCapture);
  }, [onCameraCapture]);

  const handleGallery = useCallback(() => {
    hapticLight();
    openFilePicker({ capture: false }, onGalleryCapture);
  }, [onGalleryCapture]);

  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-16 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <Heading scale="title">Add to Cellar</Heading>
        <MonoLabel size="micro" colour="ghost">
          Capture a bottle label
        </MonoLabel>
      </div>

      {/* Options */}
      <div className="w-full max-w-sm space-y-3">
        {/* Scan a Label — triggers camera */}
        <button
          onClick={handleCamera}
          className="w-full flex items-center gap-4 p-5 border-2 border-[var(--rc-ink-primary)] bg-[var(--rc-surface-primary)] hover:bg-[var(--rc-surface-secondary)] transition-colors rounded-[var(--rc-radius-md)] text-left group"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--rc-accent-pink)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Camera size={24} className="text-white" />
          </div>
          <div>
            <Body size="body" weight="bold">SCAN A LABEL</Body>
            <MonoLabel size="micro" colour="ghost">Take a photo of the wine label</MonoLabel>
          </div>
        </button>

        {/* Choose from gallery */}
        <button
          onClick={handleGallery}
          className="w-full flex items-center gap-4 p-5 border border-[var(--rc-border-emphasis)] bg-[var(--rc-surface-primary)] hover:bg-[var(--rc-surface-secondary)] transition-colors rounded-[var(--rc-radius-md)] text-left group"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--rc-surface-secondary)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <ImageIcon size={24} className="text-[var(--rc-ink-primary)]" />
          </div>
          <div>
            <Body size="body" weight="bold">CHOOSE FROM GALLERY</Body>
            <MonoLabel size="micro" colour="ghost">Select an existing photo</MonoLabel>
          </div>
        </button>

        {/* Enter Manually */}
        <button
          onClick={onManualEntry}
          className="w-full flex items-center gap-4 p-5 border border-[var(--rc-border-emphasis)] bg-[var(--rc-surface-primary)] hover:bg-[var(--rc-surface-secondary)] transition-colors rounded-[var(--rc-radius-md)] text-left group"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--rc-surface-secondary)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <PenLine size={24} className="text-[var(--rc-ink-primary)]" />
          </div>
          <div>
            <Body size="body" weight="bold">ENTER MANUALLY</Body>
            <MonoLabel size="micro" colour="ghost">Type wine details by hand</MonoLabel>
          </div>
        </button>

        {/* Import Spreadsheet */}
        {onImport && (
          <button
            onClick={() => { hapticLight(); onImport(); }}
            className="w-full flex items-center gap-4 p-5 border border-[var(--rc-border-emphasis)] bg-[var(--rc-surface-primary)] hover:bg-[var(--rc-surface-secondary)] transition-colors rounded-[var(--rc-radius-md)] text-left group"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--rc-surface-secondary)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <FileSpreadsheet size={24} className="text-[var(--rc-ink-primary)]" />
            </div>
            <div>
              <Body size="body" weight="bold">IMPORT SPREADSHEET</Body>
              <MonoLabel size="micro" colour="ghost">CSV from Vivino, CellarTracker, etc.</MonoLabel>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default ModeSelector;
