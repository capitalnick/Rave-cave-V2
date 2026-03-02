import { useState, useEffect, useCallback, useRef } from 'react';
import { getRecommendations, getRecommendationsStream, getSurpriseMe, getPartyRecommendation } from '@/services/recommendService';
import { analyseWineList, reanalyseWineListPicks } from '@/services/wineListService';
import { useWineListCapture } from '@/hooks/useWineListCapture';
import { trackEvent } from '@/config/analytics';
import type {
  OccasionId,
  OccasionContext,
  PartyContext,
  WineListAnalysisContext,
  Recommendation,
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

export function useRecommendationsFetch(inventory: Wine[], resetKey?: number) {
  const [view, setView] = useState<RecommendView>('grid');
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionId | null>(null);
  const [occasionContext, setOccasionContext] = useState<OccasionContext>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [surpriseExcludeIds, setSurpriseExcludeIds] = useState<string[]>([]);
  const [surpriseRerollCount, setSurpriseRerollCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [wineListAnalysis, setWineListAnalysis] = useState<WineListAnalysis | null>(null);
  const [wineListImages, setWineListImages] = useState<string[]>([]);
  const [isReanalysing, setIsReanalysing] = useState(false);
  const wineListCapture = useWineListCapture();
  const [crowdAllocation, setCrowdAllocation] = useState<CrowdAllocation | null>(null);
  const [crowdShortfall, setCrowdShortfall] = useState<CrowdShortfall | null>(null);
  const [picksLoading, setPicksLoading] = useState(false);

  const cellarEmpty = inventory.length === 0;
  const isSurprise = selectedOccasion === 'surprise';
  const sourceMode: SourceMode = occasionContext ? ((occasionContext as any).sourceMode || 'cellar') : 'cellar';

  const fetchingRef = useRef(false);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Abort stream on unmount
  useEffect(() => () => { streamAbortRef.current?.abort(); }, []);

  // Reset to grid when nav tab re-clicked
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
          setIsStreaming(true);
          setRecommendations([]);
          setView('results');

          const result = await getSurpriseMe(inventory, surpriseExcludeIds);
          setRecommendations([result]);
          setIsStreaming(false);
          setError(null);
        } else if (selectedOccasion === 'party') {
          const allocation = await getPartyRecommendation(occasionContext as PartyContext, inventory);
          setCrowdAllocation(allocation);
          setError(null);
          setView('results');
        } else {
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

  // ── Handlers ──

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
    setWineListAnalysis(null);
    setWineListImages([]);
    setIsReanalysing(false);
    setPicksLoading(false);
    wineListCapture.clear();
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

  return {
    // State
    view,
    selectedOccasion,
    occasionContext,
    recommendations,
    error,
    isStreaming,
    isSurprise,
    cellarEmpty,
    sourceMode,
    surpriseRerollCount,
    wineListAnalysis,
    wineListImages,
    wineListCapture,
    isReanalysing,
    picksLoading,
    crowdAllocation,
    crowdShortfall,
    // Handlers
    handleSelectOccasion,
    handleFormSubmit,
    handleWineListAnalyse,
    handleMealContextUpdate,
    handleSearchOutsideCellar,
    handleBack,
    handleRetry,
    handleRetryWithoutCellar,
    handleSurpriseReroll,
    setCrowdShortfall,
    setView,
  };
}
