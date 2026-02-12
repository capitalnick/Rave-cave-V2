import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wine, StoryCard } from '@/types';
import { computePulseStats } from '@/services/pulseService';
import { Heading, Body, MonoLabel } from '@/components/rc';
import { IconButton } from '@/components/rc';
import { ArrowLeft } from 'lucide-react';
import StoryCards from './pulse/StoryCards';
import KPIRow from './pulse/KPIRow';
import PulseEmptyState from './pulse/PulseEmptyState';
import MaturityDonut from './pulse/MaturityDonut';
import TypeBalance from './pulse/TypeBalance';
import DrinkingWindowTimeline from './pulse/DrinkingWindowTimeline';
import DrinkingWindowBar from './pulse/DrinkingWindowBar';
import TopProducers from './pulse/TopProducers';
import { Loader2 } from 'lucide-react';

type PulseView = 'dashboard' | 'story' | 'drinking-window';

interface PulseScreenProps {
  inventory: Wine[];
  onRefreshInventory?: () => void;
  onNavigateToWine?: (wineId: string) => void;
  onScanPress?: () => void;
}

const STALENESS_MS = 5 * 60 * 1000;

const PulseScreen: React.FC<PulseScreenProps> = ({
  inventory,
  onRefreshInventory,
  onNavigateToWine,
  onScanPress,
}) => {
  const [pulseView, setPulseView] = useState<PulseView>('dashboard');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const lastRefreshedAt = useRef(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pull-to-refresh state
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  const stats = useMemo(() => computePulseStats(inventory), [inventory]);

  // Staleness check on tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastRefreshedAt.current;
        if (elapsed > STALENESS_MS && onRefreshInventory) {
          onRefreshInventory();
          lastRefreshedAt.current = Date.now();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [onRefreshInventory]);

  // Update refresh timestamp when inventory changes
  useEffect(() => {
    lastRefreshedAt.current = Date.now();
    setIsRefreshing(false);
  }, [inventory]);

  const handleRefresh = useCallback(() => {
    if (onRefreshInventory && !isRefreshing) {
      setIsRefreshing(true);
      onRefreshInventory();
    }
  }, [onRefreshInventory, isRefreshing]);

  // Pull-to-refresh touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === 0) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && scrollRef.current && scrollRef.current.scrollTop <= 0) {
      setPullDistance(Math.min(delta * 0.5, 80));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 64) {
      handleRefresh();
    }
    setPullDistance(0);
    touchStartY.current = 0;
  }, [pullDistance, handleRefresh]);

  const handleCardTap = useCallback((card: StoryCard) => {
    if (!card.cta) return;
    switch (card.cta.action) {
      case 'view-drinking-window':
        setPulseView('drinking-window');
        break;
      case 'view-wine':
        if (card.cta.payload && onNavigateToWine) {
          onNavigateToWine(card.cta.payload);
        }
        break;
      case 'view-story':
        setSelectedStoryId(card.cta.payload || card.id);
        setPulseView('story');
        break;
      case 'navigate-cellar':
        if (card.cta.payload && onNavigateToWine) {
          onNavigateToWine(card.cta.payload);
        }
        break;
    }
  }, [onNavigateToWine]);

  const handleBack = useCallback(() => {
    setPulseView('dashboard');
    setSelectedStoryId(null);
  }, []);

  // Empty state for small cellars
  if (inventory.length < 3) {
    return <PulseEmptyState onScanPress={onScanPress || (() => {})} />;
  }

  // Story detail sub-view
  if (pulseView === 'story') {
    const story = stats.storyCards.find(c => c.id === selectedStoryId || c.cta?.payload === selectedStoryId);
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-10 space-y-6 pb-24 sm:pb-20">
          <div className="flex items-center gap-3">
            <IconButton icon={ArrowLeft} aria-label="Back to Pulse" onClick={handleBack} />
            <Heading scale="heading">Story</Heading>
          </div>
          {story ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-4"
            >
              <div
                className="w-12 h-12 rounded-sm flex items-center justify-center"
                style={{ backgroundColor: story.accentColor }}
              >
                <MonoLabel
                  size="label"
                  weight="bold"
                  colour={story.accentColor === 'var(--rc-ink-primary)' ? 'on-accent' : 'primary'}
                  className="w-auto! text-center!"
                  uppercase={false}
                >
                  {story.icon}
                </MonoLabel>
              </div>
              <Heading scale="title">{story.headline}</Heading>
              <Body colour="secondary">{story.subtext}</Body>

              {/* Contextual content based on story type */}
              {story.type === 'cellar-diversity' && (
                <TypeBalance distribution={stats.typeDistribution} />
              )}
              {story.type === 'aging-potential' && (
                <DrinkingWindowTimeline
                  windows={stats.drinkingWindows.filter(w => w.maturity === 'Hold')}
                  range={stats.timelineRange}
                  onWineTap={(id) => onNavigateToWine?.(id)}
                  onSeeAll={() => setPulseView('drinking-window')}
                />
              )}
            </motion.div>
          ) : (
            <Body colour="ghost">Story not found.</Body>
          )}
        </div>
      </div>
    );
  }

  // Full drinking window list sub-view
  if (pulseView === 'drinking-window') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 sm:p-10 space-y-6 pb-24 sm:pb-20">
          <div className="flex items-center gap-3">
            <IconButton icon={ArrowLeft} aria-label="Back to Pulse" onClick={handleBack} />
            <Heading scale="heading">All Drinking Windows</Heading>
          </div>
          <div className="space-y-1">
            {stats.drinkingWindows.length === 0 ? (
              <Body colour="ghost">No wines with drinking window data.</Body>
            ) : (
              stats.drinkingWindows.map((w) => (
                <div key={w.wineId} className="flex items-center gap-2">
                  <div className="w-[140px] sm:w-[200px] flex-shrink-0 overflow-hidden">
                    <span
                      className="block font-[var(--rc-font-body)] text-[12px] sm:text-[13px] text-[var(--rc-ink-primary)] truncate cursor-pointer hover:text-[var(--rc-accent-pink)]"
                      onClick={() => onNavigateToWine?.(w.wineId)}
                    >
                      {w.vintage} {w.producer} — {w.name}
                    </span>
                  </div>
                  <div className="flex-1 relative">
                    <DrinkingWindowBar
                      window={w}
                      range={stats.timelineRange}
                      onTap={() => onNavigateToWine?.(w.wineId)}
                    />
                  </div>
                  <span className="font-[var(--rc-font-mono)] text-[10px] text-[var(--rc-ink-ghost)] w-[80px] text-right flex-shrink-0">
                    {w.drinkFrom}–{w.drinkUntil}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div
      data-scroll-container
      ref={scrollRef}
      className="h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: pullDistance }}
        >
          <Loader2
            className="animate-spin text-[var(--rc-accent-pink)]"
            size={20}
            style={{ opacity: Math.min(pullDistance / 64, 1) }}
          />
        </div>
      )}

      {isRefreshing && pullDistance === 0 && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="animate-spin text-[var(--rc-accent-pink)]" size={16} />
        </div>
      )}

      <div className="p-4 sm:p-10 space-y-6 sm:space-y-10 pb-24 sm:pb-20">
        {/* Header */}
        <div className="space-y-2">
          <Heading scale="hero">PULSE</Heading>
          <MonoLabel size="label" colour="ghost">
            Your cellar at a glance
          </MonoLabel>
        </div>

        {/* Story Cards */}
        <StoryCards cards={stats.storyCards} onCardTap={handleCardTap} />

        {/* KPI Row */}
        <KPIRow
          totalBottles={stats.totalBottles}
          totalValue={stats.totalValue}
          bottlesNeedingAttention={stats.bottlesNeedingAttention}
        />

        {/* Charts — masonry on desktop, single-column mobile */}
        <div className="md:columns-2 md:gap-6 space-y-6 md:space-y-0 [&>*]:md:break-inside-avoid [&>*]:md:mb-6">
          <MaturityDonut breakdown={stats.maturityBreakdown} />
          <TypeBalance distribution={stats.typeDistribution} />
        </div>

        {/* Drinking Windows — always full-width */}
        <DrinkingWindowTimeline
          windows={stats.drinkingWindows}
          range={stats.timelineRange}
          onWineTap={(id) => onNavigateToWine?.(id)}
          onSeeAll={() => setPulseView('drinking-window')}
        />

        {/* Top Producers */}
        <TopProducers producers={stats.topProducers} />
      </div>
    </div>
  );
};

export default PulseScreen;
