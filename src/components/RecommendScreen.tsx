import React, { useCallback } from 'react';
import { useTierGate } from '@/hooks/useTierGate';
import UpgradePrompt from '@/components/UpgradePrompt';
import OccasionGrid from './recommend/OccasionGrid';
import OccasionContextForm from './recommend/OccasionContextForm';
import RecommendResults from './recommend/RecommendResults';
import WineListCapture from './recommend/WineListCapture';
import WineListLoading from './recommend/WineListLoading';
import WineListResults from './recommend/WineListResults';
import PartyLoading from './recommend/PartyLoading';
import { Heading, Spinner } from '@/components/rc';
import { useRemyThinking } from '@/hooks/useRemyThinking';
import CrowdShortfallError from './recommend/CrowdShortfallError';
import { useRecommendationsFetch } from '@/hooks/useRecommendationsFetch';
import type {
  PartyContext,
  WineListAnalysisContext,
  Recommendation,
  RecommendChatContext,
  Wine,
} from '@/types';

interface RecommendScreenProps {
  inventory: Wine[];
  resetKey?: number;
  onHandoffToRemy?: (context: RecommendChatContext) => void;
  onAddToCellar?: (recommendation: Recommendation) => void;
  onViewWine?: (wine: Wine) => void;
  onUpdateWine?: (wine: Wine, key: string, value: string) => Promise<void>;
}

const RecommendScreen: React.FC<RecommendScreenProps> = ({ inventory, resetKey, onHandoffToRemy, onAddToCellar, onViewWine, onUpdateWine }) => {
  const { text: thinkingText, fading: thinkingFading } = useRemyThinking();
  const { requirePremium, upgradePromptOpen, upgradeFeature, closeUpgradePrompt } = useTierGate();

  const {
    view, selectedOccasion, occasionContext, recommendations, error,
    isStreaming, isSurprise, cellarEmpty, sourceMode, surpriseRerollCount,
    wineListAnalysis, wineListImages, wineListCapture, isReanalysing, picksLoading,
    crowdAllocation, crowdShortfall,
    handleSelectOccasion, handleFormSubmit, handleWineListAnalyse,
    handleMealContextUpdate, handleSearchOutsideCellar, handleBack,
    handleRetry, handleRetryWithoutCellar, handleSurpriseReroll,
    setCrowdShortfall, setView,
  } = useRecommendationsFetch(inventory, resetKey);

  const handleHandoffToRemy = useCallback((context: RecommendChatContext) => {
    requirePremium('remy', () => {
      onHandoffToRemy?.(context);
    });
  }, [onHandoffToRemy, requirePremium]);

  return (
    <div className="h-full overflow-hidden">
      {view === 'grid' && (
        <OccasionGrid
          onSelectOccasion={handleSelectOccasion}
          cellarEmpty={cellarEmpty}
        />
      )}

      {view === 'form' && selectedOccasion && selectedOccasion !== 'surprise' && (
        <OccasionContextForm
          occasionId={selectedOccasion}
          onSubmit={handleFormSubmit}
          onBack={handleBack}
          inventory={inventory}
        />
      )}

      {view === 'winelist-capture' && (
        <WineListCapture
          pages={wineListCapture.pages}
          canAdd={wineListCapture.canAdd}
          onAddPage={wineListCapture.addPage}
          onAddPages={wineListCapture.addPages}
          onRemovePage={wineListCapture.removePage}
          onAnalyse={handleWineListAnalyse}
          onBack={handleBack}
        />
      )}

      {view === 'winelist-loading' && (
        <WineListLoading pageCount={wineListImages.length} />
      )}

      {view === 'winelist-results' && wineListAnalysis && (
        <WineListResults
          analysis={wineListAnalysis}
          context={occasionContext as WineListAnalysisContext}
          inventory={inventory}
          error={error}
          onStartOver={handleBack}
          onHandoffToRemy={handleHandoffToRemy}
          onMealContextUpdate={handleMealContextUpdate}
          isReanalysing={isReanalysing}
          picksLoading={picksLoading}
        />
      )}

      {view === 'winelist-results' && !wineListAnalysis && error && (
        <WineListResults
          analysis={{ sessionId: '', restaurantName: null, entries: [], sections: [], picks: [], pageCount: 0, analysedAt: 0 }}
          context={occasionContext as WineListAnalysisContext}
          inventory={inventory}
          error={error}
          onStartOver={handleBack}
          onHandoffToRemy={handleHandoffToRemy}
          onMealContextUpdate={handleMealContextUpdate}
          isReanalysing={false}
        />
      )}

      {view === 'crowd-shortfall' && crowdShortfall && (
        <CrowdShortfallError
          needed={crowdShortfall.needed}
          available={crowdShortfall.available}
          onSearchOutside={handleSearchOutsideCellar}
          onAdjust={() => { setCrowdShortfall(null); setView('form'); }}
        />
      )}

      {view === 'loading' && (
        <>
          {selectedOccasion === 'party' && occasionContext ? (
            <PartyLoading context={occasionContext as PartyContext} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
              <Spinner size="lg" tone="pink" />
              <Heading
                scale="subhead"
                colour="secondary"
                align="centre"
                className={`transition-opacity duration-300 ${thinkingFading ? 'opacity-0' : 'opacity-100'}`}
              >
                {thinkingText}
              </Heading>
            </div>
          )}
        </>
      )}

      {view === 'results' && selectedOccasion && (
        <RecommendResults
          occasionId={selectedOccasion}
          recommendations={recommendations}
          inventory={inventory}
          sourceMode={sourceMode}
          error={error}
          isStreaming={isStreaming}
          onStartOver={handleBack}
          onHandoffToRemy={handleHandoffToRemy}
          onRetry={handleRetry}
          onRetryWithoutCellar={handleRetryWithoutCellar}
          contextInputs={occasionContext}
          isSurprise={isSurprise}
          surpriseRerollCount={surpriseRerollCount}
          onSurpriseReroll={handleSurpriseReroll}
          onAddToCellar={onAddToCellar}
          onViewWine={(wineId) => {
            const wine = inventory.find(w => w.id === wineId);
            if (wine) onViewWine?.(wine);
          }}
          onUpdateQuantity={onUpdateWine ? (wineId, quantity) => {
            const wine = inventory.find(w => w.id === wineId);
            if (wine) onUpdateWine(wine, 'quantity', quantity.toString());
          } : undefined}
          crowdAllocation={crowdAllocation}
        />
      )}

      {upgradePromptOpen && (
        <UpgradePrompt variant="modal" feature={upgradeFeature} onDismiss={closeUpgradePrompt} />
      )}
    </div>
  );
};

export default RecommendScreen;
