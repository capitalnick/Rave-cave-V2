import React, { useState, useEffect, useCallback, useRef } from 'react';
import OccasionGrid from './recommend/OccasionGrid';
import OccasionContextForm from './recommend/OccasionContextForm';
import RecommendResults from './recommend/RecommendResults';
import { MonoLabel } from '@/components/rc';
import { getRecommendations, getSurpriseMe } from '@/services/recommendService';
import { SkeletonCard } from '@/components/rc';
import type {
  OccasionId,
  OccasionContext,
  Recommendation,
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

export type RecommendView = 'grid' | 'form' | 'loading' | 'results';

interface RecommendScreenProps {
  inventory: Wine[];
  onHandoffToRemy?: (context: RecommendChatContext) => void;
}

const RecommendScreen: React.FC<RecommendScreenProps> = ({ inventory, onHandoffToRemy }) => {
  const [view, setView] = useState<RecommendView>('grid');
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionId | null>(null);
  const [occasionContext, setOccasionContext] = useState<OccasionContext>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recentQueries, setRecentQueries] = useState<RecentQuery[]>(loadRecentQueries);
  const [error, setError] = useState<string | null>(null);
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
        let results: Recommendation[];
        if (selectedOccasion === 'surprise') {
          const result = await getSurpriseMe(inventory, surpriseExcludeIds);
          results = [result];
        } else {
          results = await getRecommendations(selectedOccasion, occasionContext, inventory);
        }
        setRecommendations(results);
        addRecentQuery(selectedOccasion, occasionContext, results);
        setError(null);
        setView('results');
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.');
        setView('results');
      } finally {
        fetchingRef.current = false;
      }
    };

    doFetch();
  }, [view, selectedOccasion, occasionContext, inventory, surpriseExcludeIds]);

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
    setView('loading');
  }, []);

  const handleBack = useCallback(() => {
    setView('grid');
    setSelectedOccasion(null);
    setOccasionContext(null);
    setRecommendations([]);
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

      {view === 'loading' && (
        <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
          {isSurprise ? (
            <>
              <div className="w-full max-w-md">
                <SkeletonCard />
              </div>
              <MonoLabel size="label" colour="accent-pink" align="centre" className="animate-pulse">
                Rémy is thinking…
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
                Rémy is picking wines…
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
    default:
      return 'Recommendation';
  }
}

export default RecommendScreen;
