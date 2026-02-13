import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Camera, ImageIcon } from 'lucide-react';
import OccasionGrid from './recommend/OccasionGrid';
import OccasionContextForm from './recommend/OccasionContextForm';
import RecommendResults from './recommend/RecommendResults';
import { MonoLabel, Heading, Body, IconButton } from '@/components/rc';
import { getRecommendations, getSurpriseMe, getMenuScanRecommendations } from '@/services/recommendService';
import { SkeletonCard } from '@/components/rc';
import type {
  OccasionId,
  OccasionContext,
  ScanMenuContext,
  Recommendation,
  MenuScanRecommendation,
  RecentQuery,
  RecommendChatContext,
  Wine,
} from '@/types';

const RECENT_QUERIES_KEY = 'rave-cave-recent-queries';

function loadRecentQueries(): RecentQuery[] {
  try {
    const raw = localStorage.getItem(RECENT_QUERIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentQueries(queries: RecentQuery[]) {
  localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(queries.slice(0, 5)));
}

export type RecommendView = 'grid' | 'form' | 'scan-capture' | 'loading' | 'results';

interface RecommendScreenProps {
  inventory: Wine[];
  onHandoffToRemy?: (context: RecommendChatContext) => void;
  onAddToCellar?: (recommendation: Recommendation) => void;
}

const RecommendScreen: React.FC<RecommendScreenProps> = ({ inventory, onHandoffToRemy, onAddToCellar }) => {
  const [view, setView] = useState<RecommendView>('grid');
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionId | null>(null);
  const [occasionContext, setOccasionContext] = useState<OccasionContext>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>(loadRecentQueries);
  const [error, setError] = useState<string | null>(null);
  // Scan menu state
  const [menuImage, setMenuImage] = useState<string | null>(null);
  const [menuResults, setMenuResults] = useState<MenuScanRecommendation[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  // Surprise Me state
  const [surpriseExcludeIds, setSurpriseExcludeIds] = useState<string[]>([]);
  const [surpriseRerollCount, setSurpriseRerollCount] = useState(0);

  const cellarEmpty = inventory.length === 0;
  const isSurprise = selectedOccasion === 'surprise';

  // Track whether we're currently fetching to avoid double-calls
  const fetchingRef = useRef(false);

  // ── AI Fetch Effect ──
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
          addRecentQuery(selectedOccasion, occasionContext, results);
          setError(null);
          setView('results');
        } else if (selectedOccasion === 'surprise') {
          const result = await getSurpriseMe(inventory, surpriseExcludeIds);
          setRecommendations([result]);
          addRecentQuery(selectedOccasion, null, [result]);
          setError(null);
          setView('results');
        } else {
          const results = await getRecommendations(selectedOccasion, occasionContext, inventory);
          setRecommendations(results);
          addRecentQuery(selectedOccasion, occasionContext, results);
          setError(null);
          setView('results');
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.');
        setView('results');
      } finally {
        fetchingRef.current = false;
      }
    };

    doFetch();
  }, [view, selectedOccasion, occasionContext, inventory, surpriseExcludeIds, menuImage]);

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

  const handleBack = useCallback(() => {
    setView('grid');
    setSelectedOccasion(null);
    setOccasionContext(null);
    setRecommendations([]);
    setMenuResults([]);
    setMenuImage(null);
    setError(null);
    fetchingRef.current = false;
  }, []);

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

  const addRecentQuery = useCallback((occasionId: OccasionId, context: OccasionContext, results: Recommendation[]) => {
    const queryText = buildQueryText(occasionId, context);
    const query: RecentQuery = {
      id: Date.now().toString(),
      occasionId,
      queryText,
      resultCount: results.length,
      resultSetId: Date.now().toString(),
      timestamp: Date.now(),
      contextInputs: context,
    };
    setRecentQueries(prev => {
      const next = [query, ...prev.filter(q => q.id !== query.id)].slice(0, 5);
      saveRecentQueries(next);
      return next;
    });
  }, []);

  const handleReplayQuery = useCallback((query: RecentQuery) => {
    setSelectedOccasion(query.occasionId);
    setOccasionContext(query.contextInputs);
    setError(null);
    setRecommendations([]);
    if (query.occasionId === 'surprise') {
      setSurpriseExcludeIds([]);
      setSurpriseRerollCount(0);
    }
    fetchingRef.current = false;
    setView('loading');
  }, []);

  const handleDeleteQuery = useCallback((id: string) => {
    setRecentQueries(prev => {
      const next = prev.filter(q => q.id !== id);
      saveRecentQueries(next);
      return next;
    });
  }, []);

  const cellarOnly = occasionContext ? (occasionContext as any).cellarOnly !== false : true;

  return (
    <div className="h-full overflow-hidden">
      {view === 'grid' && (
        <OccasionGrid
          onSelectOccasion={handleSelectOccasion}
          cellarEmpty={cellarEmpty}
          recentQueries={recentQueries}
          onReplayQuery={handleReplayQuery}
          onDeleteQuery={handleDeleteQuery}
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
              <Heading scale="heading">SCAN A WINE LIST</Heading>
              <Body size="caption" colour="ghost">Photograph the wine list</Body>
            </div>

            <div className="flex flex-col items-center gap-4">
              <IconButton
                icon={Camera}
                aria-label="Take photo of wine list"
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
          onStartOver={handleBack}
          onHandoffToRemy={handleHandoffToRemy}
          onRetry={handleRetry}
          onRetryWithoutCellar={handleRetryWithoutCellar}
          contextInputs={occasionContext}
          isSurprise={isSurprise}
          surpriseRerollCount={surpriseRerollCount}
          onSurpriseReroll={handleSurpriseReroll}
          onAddToCellar={onAddToCellar}
        />
      )}
    </div>
  );
};

// ── Helpers ──

function buildQueryText(occasionId: OccasionId, context: OccasionContext): string {
  if (!context) return 'Surprise Me';
  switch (occasionId) {
    case 'dinner':
      return (context as any).meal ? `${(context as any).meal} dinner` : 'Dinner pairing';
    case 'party':
      return `Party for ${(context as any).guests}`;
    case 'gift':
      return (context as any).recipient ? `Gift for ${(context as any).recipient}` : 'Wine gift';
    case 'cheese':
      return (context as any).cheeses ? `Cheese: ${(context as any).cheeses}` : 'Cheese board';
    case 'scan_menu':
      return 'Wine list scan';
    default:
      return 'Recommendation';
  }
}

export default RecommendScreen;
