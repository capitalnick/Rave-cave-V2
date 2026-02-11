import React from 'react';
import type { ExtractionConfidence } from '@/types';

interface ConfidenceIndicatorProps {
  confidence: ExtractionConfidence | null;
}

/**
 * Visual confidence indicator for extracted fields:
 * - High (>0.85): 6px accent-acid dot
 * - Medium (0.5-0.85): 1px accent-coral underline
 * - Low (<0.5): 2px accent-coral underline + "?" suffix
 * - null/empty: accent-coral label text
 */
const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({ confidence }) => {
  if (!confidence) return null;

  switch (confidence) {
    case 'high':
      return (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--rc-accent-acid)] ml-1 flex-shrink-0"
          title="High confidence"
        />
      );
    case 'medium':
      return (
        <span
          className="inline-block w-3 h-[1px] bg-[var(--rc-accent-coral)] ml-1 flex-shrink-0 self-end mb-0.5"
          title="Medium confidence"
        />
      );
    case 'low':
      return (
        <span className="inline-flex items-center ml-1 flex-shrink-0" title="Low confidence">
          <span className="inline-block w-4 h-[2px] bg-[var(--rc-accent-coral)]" />
          <span className="text-[var(--rc-accent-coral)] text-[10px] font-bold ml-0.5">?</span>
        </span>
      );
    default:
      return null;
  }
};

export default ConfidenceIndicator;
