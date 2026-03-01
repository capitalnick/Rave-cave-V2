import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { getRecommendations, getRecommendationsStream, getSurpriseMe, getPartyRecommendation } from '@/services/recommendService';
import { analyseWineList, reanalyseWineListPicks } from '@/services/wineListService';
import { useWineListCapture } from '@/hooks/useWineListCapture';
import { useRemyThinking } from '@/hooks/useRemyThinking';
import CrowdShortfallError from './recommend/CrowdShortfallError';
import { trackEvent } from '@/config/analytics';
import type {
  OccasionId,
  OccasionContext,
  PartyContext,
  WineListAnalysisContext,
  Recommendation,
  RecommendChatContext,
  WineListAnalysis,
  Wine,
  CrowdAllocation,
  CrowdShortfall,
  SourceMode,
} from '@/types';

export type RecommendView =
  | 'grid' | 'form' | 'loading' | 'results'
  | 'winelist-capture' | 'winelist-loading' | 'winelist-results'
  | 'crowd-shortfall';

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
  const [view, setView] = useState<RecommendView>('grid');
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionId | null>(null);
  const [occasionContext, setOccasionContext] = useState<OccasionContext>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Surprise Me state
  const [surpriseExcludeIds, setSurpriseExcludeIds] = useState<string[]>([]);
  const [surpriseRerollCount, setSurpriseRerollCount] = useState(0);
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  // Wine list state
  const [wineListAnalysis, setWineListAnalysis] = useState<WineListAnalysis | null>(null);
  const [wineListImages, setWineListImages] = useState<string[]>([]);
  const [isReanalysing, setIsReanalysing] = useState(false);
  const wineListCapture = useWineListCapture();
  // Crowd allocation state
  const [crowdAllocation, setCrowdAllocation] = useState<CrowdAllocation | null>(null);
  const [crowdShortfall, setCrowdShortfall] = useState<CrowdShortfall | null>(null);
  // Wine list picks loading (Stage 2 in background)
  const [picksLoading, setPicksLoading] = useState(false);

  const cellarEmpty = inventory.length === 0;
  const isSurprise = selectedOccasion === 'surprise';

  // Track whether we're currently fetching to avoid double-calls
  const fetchingRef = useRef(false);
  // Stream abort ref — persists across view changes, only aborted on nav/unmount
  const streamAbortRef = useRef<AbortController | null>(null);

  // Abort stream on unmount
  useEffect(() => () => { streamAbortRef.current?.abort(); }, []);

  // ── Reset to grid when nav tab re-clicked ──
  const resetKeyRef = useRef(resetKey);
  useEffect(() => {
    if (resetKey !== undefined && resetKey !== resetKeyRef.current) {
      resetKeyRef.current = resetKey;
      handleBack();
    }
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI Fetch Effect ──
  useEffect(() => {
    if (view !== 'loading' || !selectedOccasion || fetchingRef.current) return;
    fetchingRef.current = true;

    const doFetch = async () => {
      try {
        if (selectedOccasion === 'surprise') {
          // Transition immediately — show skeleton on results screen
          setIsStreaming(true);
          setRecommendations([]);
          setView('results');

          const result = await getSurpriseMe(inventory, surpriseExcludeIds);
          setRecommendations([result]);
          setIsStreaming(false);
          setError(null);
        } else if (selectedOccasion === 'party') {
          // Party uses non-streaming crowd allocation
          const allocation = await getPartyRecommendation(occasionContext as PartyContext, inventory);
          setCrowdAllocation(allocation);
          setError(null);
          setView('results');
        } else {
          // ── Progressive streaming with batch fallback ──
          streamAbortRef.current?.abort();
          streamAbortRef.current = new AbortController();
          let streamedCount = 0;

          setIsStreaming(true);
          setRecommendations([]);
          setView('results');

          try {
            await getRecommendationsStream(
              selectedOccasion,
              occasionContext,
              inventory,
              (rec) => { streamedCount++; setRecommendations(prev => [...prev, rec]); },
              streamAbortRef.current.signal
            );
          } catch (streamErr: any) {
            if (streamErr.name === 'AbortError') throw streamErr;
            console.warn('[Recommend] Stream error, falling back:', streamErr.message);
          }

          // Fallback to batch if streaming yielded nothing
          if (streamedCount === 0) {
            console.warn('[Recommend] Stream yielded 0, using batch');
            const results = await getRecommendations(selectedOccasion, occasionContext, inventory);
            setRecommendations(results);
          }

          setIsStreaming(false);
          setError(null);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setIsStreaming(false);
        setError(err.message || 'Something went wrong. Please try again.');
        setView('results');
      } finally {
        fetchingRef.current = false;
      }
    };

    doFetch();
  }, [view, selectedOccasion, occasionContext, inventory, surpriseExcludeIds]);

  // ── Wine List Analysis Effect ──
  useEffect(() => {
    if (view !== 'winelist-loading' || fetchingRef.current || wineListImages.length === 0) return;
    fetchingRef.current = true;

    const doAnalyse = async () => {
      try {
        const result = await analyseWineList(
          wineListImages,
          occasionContext as WineListAnalysisContext,
          inventory,
          undefined,
          (progress) => {
            if (progress.stage === 'extraction-complete') {
              // Transition early — show the wine list while picks generate
              setWineListAnalysis({
                sessionId: crypto.randomUUID(),
                restaurantName: progress.restaurantName,
                entries: progress.entries,
                sections: progress.sections,
                picks: [],
                pageCount: wineListImages.length,
                analysedAt: Date.now(),
              });
              setPicksLoading(true);
              setView('winelist-results');
            }
          }
        );

        // Stage 2 complete — update with picks
        setWineListAnalysis(result);
        setPicksLoading(false);
        setError(null);
      } catch (err: any) {
        setPicksLoading(false);
        setError(err.message || 'Failed to analyse the wine list.');
        setView('winelist-results');
      } finally {
        fetchingRef.current = false;
      }
    };

    doAnalyse();
  }, [view, wineListImages, occasionContext, inventory]);

  const handleSelectOccasion = useCallback((id: OccasionId) => {
    setSelectedOccasion(id);
    setError(null);
    setRecommendations([]);
    if (id === 'surprise') {
      setSurpriseExcludeIds([]);
      setSurpriseRerollCount(0);
      setOccasionContext(null);
      setView('loading');
    } else {
      setView('form');
    }
  }, []);

  const handleFormSubmit = useCallback((context: OccasionContext) => {
    trackEvent('recommend_requested', { occasion: selectedOccasion });
    setOccasionContext(context);
    setError(null);
    setRecommendations([]);
    setCrowdAllocation(null);
    setCrowdShortfall(null);

    if (selectedOccasion === 'analyze_winelist') {
      setView('winelist-capture');
      return;
    }

    // Pre-flight cellar check for party (only when source is cellar-only)
    if (selectedOccasion === 'party') {
      const partyCtx = context as PartyContext;
      if (partyCtx.sourceMode === 'cellar') {
        const totalCellarBottles = inventory.reduce((sum, w) => sum + w.quantity, 0);
        if (totalCellarBottles < partyCtx.totalBottles) {
          setCrowdShortfall({
            needed: partyCtx.totalBottles,
            available: totalCellarBottles,
            originalContext: partyCtx,
          });
          setView('crowd-shortfall');
          return;
        }
      }
    }

    setView('loading');
  }, [selectedOccasion, inventory]);

  const handleWineListAnalyse = useCallback(() => {
    const images = wineListCapture.allBase64;
    if (!images || images.length === 0) return;
    setWineListImages(images);
    fetchingRef.current = false;
    setView('winelist-loading');
  }, [wineListCapture.allBase64]);

  const handleMealContextUpdate = useCallback(async (meal: string) => {
    if (!wineListAnalysis || !occasionContext) return;
    setIsReanalysing(true);
    try {
      const updatedContext = { ...occasionContext, meal } as WineListAnalysisContext;
      setOccasionContext(updatedContext);
      const picks = await reanalyseWineListPicks(
        wineListAnalysis.entries,
        wineListAnalysis.restaurantName,
        updatedContext,
        inventory
      );
      setWineListAnalysis(prev => prev ? { ...prev, picks } : prev);
    } catch (err: any) {
      console.error('[WineList] Reanalysis failed:', err.message);
    } finally {
      setIsReanalysing(false);
    }
  }, [wineListAnalysis, occasionContext, inventory]);

  const handleSearchOutsideCellar = useCallback(() => {
    if (!crowdShortfall) return;
    const updatedContext: PartyContext = { ...crowdShortfall.originalContext, sourceMode: 'both' };
    setOccasionContext(updatedContext);
    setCrowdShortfall(null);
    setCrowdAllocation(null);
    setError(null);
    setRecommendations([]);
    fetchingRef.current = false;
    setView('loading');
  }, [crowdShortfall]);

  const handleBack = useCallback(() => {
    streamAbortRef.current?.abort();
    setIsStreaming(false);
    setView('grid');
    setSelectedOccasion(null);
    setOccasionContext(null);
    setRecommendations([]);
    setError(null);
    fetchingRef.current = false;
    // Wine list cleanup
    setWineListAnalysis(null);
    setWineListImages([]);
    setIsReanalysing(false);
    setPicksLoading(false);
    wineListCapture.clear();
    // Crowd cleanup
    setCrowdAllocation(null);
    setCrowdShortfall(null);
  }, [wineListCapture]);

  const handleRetry = useCallback(() => {
    setError(null);
    setRecommendations([]);
    fetchingRef.current = false;
    setView('loading');
  }, []);

  const handleRetryWithoutCellar = useCallback(() => {
    if (occasionContext && 'sourceMode' in occasionContext) {
      setOccasionContext({ ...occasionContext, sourceMode: 'both' } as any);
    }
    setError(null);
    setRecommendations([]);
    fetchingRef.current = false;
    setView('loading');
  }, [occasionContext]);

  const handleSurpriseReroll = useCallback(() => {
    if (recommendations.length > 0) {
      const lastId = `${recommendations[0].producer}-${recommendations[0].vintage}`;
      setSurpriseExcludeIds(prev => [...prev, lastId]);
    }
    setSurpriseRerollCount(prev => prev + 1);
    setError(null);
    setRecommendations([]);
    fetchingRef.current = false;
    setView('loading');
  }, [recommendations]);

  const handleHandoffToRemy = useCallback((context: RecommendChatContext) => {
    requirePremium('remy', () => {
      onHandoffToRemy?.(context);
    });
  }, [onHandoffToRemy, requirePremium]);

  const sourceMode: SourceMode = occasionContext ? ((occasionContext as any).sourceMode || 'cellar') : 'cellar';

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
