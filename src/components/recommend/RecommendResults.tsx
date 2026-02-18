import React from 'react';
import { ArrowRight } from 'lucide-react';
import RecommendResultCard from './RecommendResultCard';
import { Button, Heading, MonoLabel, InlineMessage, SkeletonCard } from '@/components/rc';
import { OCCASIONS, getRandomRemyState } from '@/constants';
import type { OccasionId, Recommendation, RecommendChatContext, OccasionContext } from '@/types';

interface RecommendResultsProps {
  occasionId: OccasionId;
  recommendations: Recommendation[];
  cellarOnly: boolean;
  error: string | null;
  isStreaming?: boolean;
  onStartOver: () => void;
  onHandoffToRemy: (context: RecommendChatContext) => void;
  onRetry: () => void;
  onRetryWithoutCellar: () => void;
  contextInputs: OccasionContext;
  // Surprise Me
  isSurprise: boolean;
  surpriseRerollCount: number;
  onSurpriseReroll: () => void;
  onAddToCellar?: (recommendation: Recommendation) => void;
  onViewWine?: (wineId: string) => void;
}

const RecommendResults: React.FC<RecommendResultsProps> = ({
  occasionId,
  recommendations,
  cellarOnly,
  error,
  isStreaming = false,
  onStartOver,
  onHandoffToRemy,
  onRetry,
  onRetryWithoutCellar,
  contextInputs,
  isSurprise,
  surpriseRerollCount,
  onSurpriseReroll,
  onAddToCellar,
  onViewWine,
}) => {
  const occasion = OCCASIONS.find(o => o.id === occasionId);
  const occasionTitle = occasion?.title || 'Recommendation';

  const handleAskRemy = () => {
    const ctx: RecommendChatContext = {
      resultSetId: Date.now().toString(),
      occasionId,
      occasionTitle,
      contextInputs,
      recommendations,
    };
    onHandoffToRemy(ctx);
  };

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 gap-6">
        <InlineMessage tone="error" message={error} />
        <div className="flex gap-3">
          <Button variantType="Secondary" label="Start Over" onClick={onStartOver} />
          <Button variantType="Primary" label="Try Again" onClick={onRetry} />
        </div>
      </div>
    );
  }

  // Empty state (cellar-only with no matches) — only show when not still streaming
  if (recommendations.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 gap-6 text-center">
        <Heading scale="heading" align="centre">YOUR CELLAR'S A BIT QUIET.</Heading>
        <MonoLabel size="label" colour="ghost" align="centre">
          Rémy couldn't find a strong match in your collection.
        </MonoLabel>
        <div className="flex flex-col items-center gap-3">
          <Button variantType="Primary" label="SCAN A LABEL" onClick={onStartOver} />
          <button
            onClick={onRetryWithoutCellar}
            className="text-[var(--rc-accent-pink)] underline underline-offset-4 font-[var(--rc-font-mono)] text-xs uppercase tracking-wider"
          >
            Try without cellar filter →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 sm:p-10 gap-6">
      {/* Header */}
      <div className="space-y-1">
        <Heading scale="heading">{occasionTitle}</Heading>
        <MonoLabel size="label" colour={isStreaming ? 'secondary' : 'ghost'} className={isStreaming ? 'animate-pulse' : ''}>
          {isStreaming
            ? getRandomRemyState()
            : isSurprise
              ? "Rémy's surprise pick"
              : `Rémy's top ${recommendations.length} pick${recommendations.length !== 1 ? 's' : ''} ${cellarOnly ? 'from your cellar' : 'from the wine world'}`
          }
        </MonoLabel>
      </div>

      {/* Cards + skeleton placeholders */}
      <div className="grid grid-cols-1 gap-4">
        {recommendations.map((rec, i) => (
          <RecommendResultCard
            key={`${rec.producer}-${rec.vintage}-${rec.rank}`}
            recommendation={rec}
            isSurprise={isSurprise}
            isSingleResult={recommendations.length === 1 && !isStreaming}
            index={i}
            onAddToCellar={onAddToCellar}
            onViewWine={onViewWine}
          />
        ))}
        {isStreaming && Array.from({ length: 3 - recommendations.length }, (_, i) => (
          <SkeletonCard key={`skeleton-${i}`} />
        ))}
      </div>

      {/* Surprise Me re-roll */}
      {isSurprise && !isStreaming && (
        <div className="text-center">
          {surpriseRerollCount < 3 ? (
            <button
              onClick={onSurpriseReroll}
              className="text-[var(--rc-accent-pink)] underline underline-offset-4 font-[var(--rc-font-mono)] text-xs uppercase tracking-wider"
            >
              Not feeling it? →
            </button>
          ) : (
            <MonoLabel size="micro" colour="ghost" align="centre">
              That's all Rémy's got for now.
            </MonoLabel>
          )}
        </div>
      )}

      {/* Actions — hidden while streaming */}
      {!isStreaming && (
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <Button variantType="Secondary" label="Start Over" onClick={onStartOver} className="flex-1" />
          <Button
            variantType="Primary"
            label="Refine with Rémy"
            iconAsset={ArrowRight}
            iconPosition="Trailing"
            onClick={handleAskRemy}
            className="flex-1"
          />
        </div>
      )}

      {/* Slide-in keyframes */}
      <style>{`
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default RecommendResults;
