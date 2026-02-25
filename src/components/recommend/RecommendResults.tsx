import React from 'react';
import RecommendResultCard from './RecommendResultCard';
import CrowdAllocationResults from './CrowdAllocationResults';
import { Button, Heading, MonoLabel, InlineMessage, SkeletonCard } from '@/components/rc';
import { OCCASIONS } from '@/constants';
import { useRemyThinking } from '@/hooks/useRemyThinking';
import { getDirectImageUrl } from '@/utils/imageUrl';
import type { OccasionId, Recommendation, RecommendChatContext, OccasionContext, Wine, CrowdAllocation } from '@/types';

interface RecommendResultsProps {
  occasionId: OccasionId;
  recommendations: Recommendation[];
  inventory: Wine[];
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
  onUpdateQuantity?: (wineId: string, quantity: number) => void;
  crowdAllocation?: CrowdAllocation | null;
}

const RecommendResults: React.FC<RecommendResultsProps> = ({
  occasionId,
  recommendations,
  inventory,
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
  onUpdateQuantity,
  crowdAllocation,
}) => {
  const { text: thinkingText, fading: thinkingFading } = useRemyThinking();
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

  // Party → crowd allocation results
  if (occasionId === 'party' && crowdAllocation) {
    return (
      <CrowdAllocationResults
        allocation={crowdAllocation}
        cellarOnly={cellarOnly}
        onStartOver={onStartOver}
        onHandoffToRemy={handleAskRemy}
      />
    );
  }

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
          <Button variantType="Tertiary" label="Try without cellar filter →" onClick={onRetryWithoutCellar} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 sm:p-10 gap-6">
      {/* Header */}
      <div className="space-y-1">
        <Heading scale="heading">{occasionTitle}</Heading>
        <MonoLabel
          size="label"
          colour={isStreaming ? 'secondary' : 'ghost'}
          className={`transition-opacity duration-300 ${isStreaming ? (thinkingFading ? 'opacity-0 animate-pulse' : 'opacity-100 animate-pulse') : ''}`}
        >
          {isStreaming
            ? thinkingText
            : isSurprise
              ? "Rémy's surprise pick"
              : `Rémy's top ${recommendations.length} pick${recommendations.length !== 1 ? 's' : ''} ${cellarOnly ? 'from your cellar' : 'from the wine world'}`
          }
        </MonoLabel>
      </div>

      {/* Cards + skeleton placeholders */}
      <div className="grid grid-cols-1 gap-4">
        {recommendations.map((rec, i) => {
          const matchedWine = rec.isFromCellar && rec.wineId ? inventory.find(w => w.id === rec.wineId) : undefined;
          const imageUrl = matchedWine ? getDirectImageUrl(matchedWine.resolvedImageUrl || matchedWine.imageUrl) : undefined;
          return (
            <RecommendResultCard
              key={`${rec.producer}-${rec.vintage}-${rec.rank}`}
              recommendation={rec}
              matchedWine={matchedWine}
              imageUrl={imageUrl}
              isSurprise={isSurprise}
              isSingleResult={recommendations.length === 1 && !isStreaming}
              index={i}
              onAddToCellar={onAddToCellar}
              onViewWine={onViewWine}
              onUpdateQuantity={onUpdateQuantity}
            />
          );
        })}
        {isStreaming && Array.from({ length: 3 - recommendations.length }, (_, i) => (
          <SkeletonCard key={`skeleton-${i}`} />
        ))}
      </div>

      {/* Surprise Me re-roll */}
      {isSurprise && !isStreaming && (
        <div className="text-center">
          {surpriseRerollCount < 3 ? (
            <Button variantType="Tertiary" label="Not feeling it? →" onClick={onSurpriseReroll} />
          ) : (
            <MonoLabel size="micro" colour="ghost" align="centre">
              That's all Rémy's got for now.
            </MonoLabel>
          )}
        </div>
      )}

      {/* Actions — hidden while streaming */}
      {!isStreaming && (
        <div className="flex flex-col gap-2 pb-8 mt-[var(--rc-space-2xl)]">
          <button
            onClick={handleAskRemy}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-[var(--rc-button-radius)] border border-[var(--rc-ink-primary)] bg-transparent text-[var(--rc-ink-primary)] font-[var(--rc-font-mono)] text-[11px] font-bold uppercase tracking-[0.08em] transition-colors hover:bg-[var(--rc-surface-secondary)]"
          >
            <span className="w-[18px] h-[18px] rounded-full bg-[var(--rc-accent-pink)] flex items-center justify-center font-[var(--rc-font-mono)] text-[9px] font-bold text-white leading-none">R</span>
            REFINE WITH RÉMY
          </button>
          <button
            onClick={onStartOver}
            className="w-full flex items-center justify-center h-10 bg-transparent font-[var(--rc-font-mono)] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--rc-ink-ghost)] transition-colors hover:text-[var(--rc-ink-tertiary)]"
          >
            START OVER
          </button>
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
