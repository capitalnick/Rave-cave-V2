import React, { useRef, useEffect } from 'react';
import { Camera, PenLine, ImageIcon } from 'lucide-react';
import { Heading, MonoLabel, Body } from '@/components/rc';

interface ModeSelectorProps {
  onCapture: (file: File) => void;
  onManualEntry: () => void;
  autoCapture?: boolean;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ onCapture, onManualEntry, autoCapture }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Auto-open camera for multi-scan session flow
  useEffect(() => {
    if (autoCapture) {
      requestAnimationFrame(() => cameraInputRef.current?.click());
    }
  }, [autoCapture]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[50vh] px-6 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <Heading scale="title">REGISTER WINE</Heading>
        <MonoLabel size="caption" colour="ghost">
          Scan a label or enter details manually
        </MonoLabel>
      </div>

      {/* Options */}
      <div className="w-full max-w-sm space-y-3">
        {/* Scan a Label — triggers camera */}
        <button
          onClick={() => cameraInputRef.current?.click()}
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
          onClick={() => galleryInputRef.current?.click()}
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
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Take photo of wine label"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Choose photo from gallery"
      />
    </div>
  );
};

export default ModeSelector;
