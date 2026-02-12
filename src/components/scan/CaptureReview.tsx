import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { MonoLabel, Body, Button } from '@/components/rc';
import { analyseImageQuality, type ImageQualityResult } from '@/utils/imageQuality';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface CaptureReviewProps {
  file: File;
  previewUrl: string;
  onAccept: () => void;
  onRetake: () => void;
}

const CaptureReview: React.FC<CaptureReviewProps> = ({ file, previewUrl, onAccept, onRetake }) => {
  const [result, setResult] = useState<ImageQualityResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acceptedRef = useRef(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    analyseImageQuality(file).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => { cancelled = true; };
  }, [file]);

  // Auto-submit on pass
  useEffect(() => {
    if (!result || result.verdict !== 'pass') return;
    const delay = reducedMotion ? 0 : 600;
    timerRef.current = setTimeout(() => {
      if (!acceptedRef.current) {
        acceptedRef.current = true;
        onAccept();
      }
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [result, onAccept, reducedMotion]);

  const handleRetake = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    acceptedRef.current = true;
    onRetake();
  };

  const handleUsePhoto = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!acceptedRef.current) {
      acceptedRef.current = true;
      onAccept();
    }
  };

  const analysing = !result;

  return (
    <div className="flex flex-col items-center min-h-[60vh] sm:min-h-[50vh] px-6 py-8">
      {/* Preview */}
      <div className="flex-1 flex items-center justify-center w-full">
        <img
          src={previewUrl}
          alt="Captured label"
          className="max-h-[60vh] max-w-full object-contain rounded-xl"
        />
      </div>

      {/* Status area */}
      <div className="w-full max-w-sm mt-6 space-y-4">
        {analysing && (
          <div className="flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-[var(--rc-ink-ghost)]" />
            <MonoLabel size="micro" colour="ghost">
              Checking image quality...
            </MonoLabel>
          </div>
        )}

        {result?.verdict === 'pass' && (
          <div className="flex items-center justify-center gap-2">
            <Body size="body" weight="bold" className="text-[var(--rc-accent-acid)]">
              Looks good
            </Body>
          </div>
        )}

        {result?.verdict === 'warn' && (
          <div
            className="flex items-center gap-2 justify-center"
            style={{ animation: 'qualityPulse 2s ease-in-out infinite' }}
          >
            <AlertTriangle size={18} className="text-[var(--rc-accent-coral)] flex-shrink-0" />
            <Body size="body" className="text-[var(--rc-accent-coral)]">
              {result.reasons[0]}
            </Body>
          </div>
        )}

        {result?.verdict === 'fail' && (
          <div className="flex items-center gap-2 justify-center">
            <AlertTriangle size={20} className="text-[var(--rc-accent-coral)] flex-shrink-0" />
            <Body size="body" weight="bold" className="text-[var(--rc-accent-coral)]">
              {result.reasons[0]}
            </Body>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 w-full pt-2">
          <Button variantType="Secondary" label="RETAKE" onClick={handleRetake} className="flex-1" />
          <Button variantType="Primary" label="USE PHOTO" onClick={handleUsePhoto} className="flex-1" />
        </div>
      </div>
    </div>
  );
};

export default CaptureReview;
