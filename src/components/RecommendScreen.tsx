import React, { useState, useCallback } from 'react';
import OccasionGrid from './recommend/OccasionGrid';
import OccasionContextForm from './recommend/OccasionContextForm';
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

  const handleSelectOccasion = useCallback((id: OccasionId) => {
    setSelectedOccasion(id);
    setError(null);
    if (id === 'surprise') {
      setSurpriseExcludeIds([]);
      setSurpriseRerollCount(0);
      setView('loading');
    } else {
      setView('form');
    }
  }, []);

  const handleFormSubmit = useCallback((context: OccasionContext) => {
    setOccasionContext(context);
    setError(null);
    setView('loading');
  }, []);

  const handleBack = useCallback(() => {
    if (view === 'form' || view === 'results') {
      setView('grid');
      setSelectedOccasion(null);
      setOccasionContext(null);
      setRecommendations([]);
      setError(null);
    }
  }, [view]);

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
    if (query.occasionId === 'surprise') {
      setSurpriseExcludeIds([]);
      setSurpriseRerollCount(0);
    }
    setView('loading');
  }, []);

  const handleDeleteQuery = useCallback((id: string) => {
    setRecentQueries(prev => {
      const next = prev.filter(q => q.id !== id);
      saveRecentQueries(next);
      return next;
    });
  }, []);

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
        <div className="flex items-center justify-center h-full text-[var(--rc-ink-ghost)]">
          {/* Loading state — wired in PR 6.4 */}
          <p>Loading recommendations...</p>
        </div>
      )}

      {view === 'results' && (
        <div className="flex items-center justify-center h-full text-[var(--rc-ink-ghost)]">
          {/* RecommendResults — wired in PR 6.4 */}
          <p>Results</p>
        </div>
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
