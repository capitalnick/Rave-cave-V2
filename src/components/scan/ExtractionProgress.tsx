import React from 'react';
import { RefreshCw, PenLine } from 'lucide-react';
import { Heading, MonoLabel, Body, Button } from '@/components/rc';

interface ExtractionProgressProps {
  previewUrl: string | null;
  error: string | null;
  onRetake: () => void;
  onManualEntry: () => void;
}

const SHIMMER_FIELDS = ['Producer', 'Wine Name', 'Vintage', 'Type', 'Region', 'Grape'];

const ExtractionProgress: React.FC<ExtractionProgressProps> = ({
  previewUrl,
  error,
  onRetake,
  onManualEntry,
}) => {
  return (
    <div className="flex flex-col items-center px-6 py-8 space-y-6 min-h-[60vh] sm:min-h-[50vh]">
      {/* Thumbnail */}
      {previewUrl && (
        <div className="w-40 h-40 rounded-[var(--rc-radius-md)] overflow-hidden border border-[var(--rc-border-emphasis)] bg-[var(--rc-surface-secondary)] flex-shrink-0">
          <img
            src={previewUrl}
            alt="Captured label"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {error ? (
        /* Error State */
        <div className="text-center space-y-4 flex-1 flex flex-col items-center justify-center">
          <Heading scale="heading">COULDN&apos;T READ THE LABEL</Heading>
          <Body size="body" colour="ghost" className="max-w-xs">
            {error}
          </Body>
          <div className="flex gap-3 pt-2">
            <Button variant="Secondary" onClick={onRetake}>
              <RefreshCw size={16} className="mr-2" />
              RETAKE
            </Button>
            <Button variant="Primary" onClick={onManualEntry}>
              <PenLine size={16} className="mr-2" />
              ENTER MANUALLY
            </Button>
          </div>
        </div>
      ) : (
        /* Loading State */
        <div className="w-full max-w-sm space-y-5 flex-1">
          <div className="text-center space-y-1">
            <Heading scale="heading">READING LABEL</Heading>
            <MonoLabel size="caption" colour="ghost">Extracting wine details...</MonoLabel>
          </div>

          {/* Progress bar */}
          <div className="w-full h-[2px] bg-[var(--rc-surface-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--rc-accent-acid)] rounded-full animate-progress-sweep"
              style={{
                animation: 'progress-sweep 2.5s ease-in-out infinite',
              }}
            />
          </div>

          {/* Shimmer field placeholders */}
          <div className="space-y-3">
            {SHIMMER_FIELDS.map((label, i) => (
              <div
                key={label}
                className="flex items-center gap-3"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <MonoLabel size="micro" colour="ghost" className="w-20 flex-shrink-0">
                  {label}
                </MonoLabel>
                <div
                  className="flex-1 h-4 rounded-[var(--rc-radius-sm)] bg-[var(--rc-surface-secondary)] animate-shimmer overflow-hidden relative"
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--rc-surface-primary)] to-transparent"
                    style={{
                      animation: 'shimmer 1.5s ease-in-out infinite',
                      animationDelay: `${i * 150}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inline keyframes via style tag */}
      <style>{`
        @keyframes progress-sweep {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-shimmer, .animate-progress-sweep {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ExtractionProgress;
