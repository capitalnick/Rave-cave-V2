import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Camera, ImageIcon } from 'lucide-react';
import OccasionGrid from './recommend/OccasionGrid';
import OccasionContextForm from './recommend/OccasionContextForm';
import RecommendResults from './recommend/RecommendResults';
import WineListCapture from './recommend/WineListCapture';
import WineListLoading from './recommend/WineListLoading';
import WineListResults from './recommend/WineListResults';
import { MonoLabel, Heading, Body, IconButton } from '@/components/rc';
import { getRecommendations, getRecommendationsStream, getSurpriseMe, getMenuScanRecommendations } from '@/services/recommendService';
import { analyseWineList, reanalyseWineListPicks } from '@/services/wineListService';
import { useWineListCapture } from '@/hooks/useWineListCapture';
import { SkeletonCard } from '@/components/rc';
import type {
  OccasionId,
  OccasionContext,
  ScanMenuContext,
  WineListAnalysisContext,
  Recommendation,
  MenuScanRecommendation,
  RecommendChatContext,
  WineListAnalysis,
  Wine,
} from '@/types';

export type RecommendView =
  | 'grid' | 'form' | 'scan-capture' | 'loading' | 'results'
  | 'winelist-capture' | 'winelist-loading' | 'winelist-results';

interface RecommendScreenProps {
  inventory: Wine[];
  onHandoffToRemy?: (context: RecommendChatContext) => void;
  onAddToCellar?: (recommendation: Recommendation) => void;
  onViewWine?: (wine: Wine) => void;
}

const RecommendScreen: React.FC<RecommendScreenProps> = ({ inventory, onHandoffToRemy, onAddToCellar, onViewWine }) => {
  const [view, setView] = useState<RecommendView>('grid');
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionId | null>(null);
  const [occasionContext, setOccasionContext] = useState<OccasionContext>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Scan menu state
  const [menuImage, setMenuImage] = useState<string | null>(null);
  const [menuResults, setMenuResults] = useState<MenuScanRecommendation[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
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

  const cellarEmpty = inventory.length === 0;
  const isSurprise = selectedOccasion === 'surprise';

  // Track whether we're currently fetching to avoid double-calls
  const fetchingRef = useRef(false);
  // Stream abort ref — persists across view changes, only aborted on nav/unmount
  const streamAbortRef = useRef<AbortController | null>(null);

  // Abort stream on unmount
  useEffect(() => () => { streamAbortRef.current?.abort(); }, []);

  // ── AI Fetch Effect (existing occasions) ──
  useEffect(() => {
    if (view !== 'loading' || !selectedOccasion || fetchingRef.current) return;
    fetchingRef.current = true;

    const doFetch = async () => {
      try {
        if (selectedOccasion === 'scan_menu' && menuImage) {
          const scanResults = await getMenuScanRecommendations(menuImage, occasionContext as ScanMenuContext, inventory);
          setMenuResults(scanResults);
          // Convert to Recommendation[] for results view compatibility
          const results: Recommendation[] = scanResults.map(r => ({
            wineId: r.wineId,
            producer: r.producer,
            name: r.name,
            vintage: r.vintage ?? new Date().getFullYear(),
            type: r.type,
            rank: r.rank as 1 | 2 | 3,
            rankLabel: r.rankLabel,
            rationale: r.rationale,
            isFromCellar: r.isFromCellar,
            maturity: 'DRINK_NOW',
            rating: null,
          }));
          setRecommendations(results);
          setError(null);
          setView('results');
        } else if (selectedOccasion === 'surprise') {
          const result = await getSurpriseMe(inventory, surpriseExcludeIds);
          setRecommendations([result]);
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
  }, [view, selectedOccasion, occasionContext, inventory, surpriseExcludeIds, menuImage]);

  // ── Wine List Analysis Effect ──
  useEffect(() => {
    if (view !== 'winelist-loading' || fetchingRef.current || wineListImages.length === 0) return;
    fetchingRef.current = true;

    const doAnalyse = async () => {
      try {
        const result = await analyseWineList(
          wineListImages,
          occasionContext as WineListAnalysisContext,
          inventory
        );
        setWineListAnalysis(result);
        setError(null);
        setView('winelist-results');
      } catch (err: any) {
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
    setOccasionContext(context);
    setError(null);
    setRecommendations([]);
    if (selectedOccasion === 'scan_menu') {
      setView('scan-capture');
      return;
    }
    if (selectedOccasion === 'analyze_winelist') {
      setView('winelist-capture');
      return;
    }
    setView('loading');
  }, [selectedOccasion]);

  const handleImageCapture = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setMenuImage(base64);
      fetchingRef.current = false;
      setView('loading');
    };
    reader.readAsDataURL(file);
  }, []);

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

  const handleBack = useCallback(() => {
    streamAbortRef.current?.abort();
    setIsStreaming(false);
    setView('grid');
    setSelectedOccasion(null);
    setOccasionContext(null);
    setRecommendations([]);
    setMenuResults([]);
    setMenuImage(null);
    setError(null);
    fetchingRef.current = false;
    // Wine list cleanup
    setWineListAnalysis(null);
    setWineListImages([]);
    setIsReanalysing(false);
    wineListCapture.clear();
  }, [wineListCapture]);

  const handleRetry = useCallback(() => {
    setError(null);
    setRecommendations([]);
    fetchingRef.current = false;
    setView('loading');
  }, []);

  const handleRetryWithoutCellar = useCallback(() => {
    if (occasionContext && 'cellarOnly' in occasionContext) {
      setOccasionContext({ ...occasionContext, cellarOnly: false } as any);
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
    onHandoffToRemy?.(context);
  }, [onHandoffToRemy]);

  const cellarOnly = occasionContext ? (occasionContext as any).cellarOnly !== false : true;

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
        />
      )}

      {view === 'scan-capture' && (
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="flex items-center gap-3 px-6 pt-6 pb-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)] transition-colors"
              aria-label="Back to occasions"
            >
              <ArrowLeft size={20} />
              <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider">Back</span>
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 pb-24">
            <div className="text-center space-y-1">
              <Heading scale="heading">SCAN A MENU</Heading>
              <Body size="caption" colour="ghost">Photograph the menu</Body>
            </div>

            <div className="flex flex-col items-center gap-4">
              <IconButton
                icon={Camera}
                aria-label="Take photo of menu"
                onClick={() => cameraInputRef.current?.click()}
                className="w-20 h-20 bg-[var(--rc-surface-secondary)] hover:bg-[var(--rc-accent-pink)] hover:text-white"
              />
              <MonoLabel size="label" colour="ghost">Take photo</MonoLabel>
            </div>

            <button
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center gap-2 text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)] transition-colors"
            >
              <ImageIcon size={16} />
              <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider underline">
                Choose from gallery
              </span>
            </button>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageCapture(e.target.files[0])}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageCapture(e.target.files[0])}
            />
          </div>
        </div>
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

      {view === 'loading' && (
        <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
          {isSurprise ? (
            <>
              <div className="w-full max-w-md">
                <SkeletonCard />
              </div>
              <MonoLabel size="label" colour="accent-pink" align="centre" className="animate-pulse">
                Let me think.
              </MonoLabel>
            </>
          ) : (
            <>
              <div className="w-full max-w-md space-y-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
              <MonoLabel size="label" colour="accent-pink" align="centre" className="animate-pulse">
                Let me think.
              </MonoLabel>
            </>
          )}
        </div>
      )}

      {view === 'results' && selectedOccasion && (
        <RecommendResults
          occasionId={selectedOccasion}
          recommendations={recommendations}
          cellarOnly={cellarOnly}
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
        />
      )}
    </div>
  );
};

export default RecommendScreen;
