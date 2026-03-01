import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, MessageCircle, Pencil } from 'lucide-react';
import { Button, Heading, Body, MonoLabel, Input, SkeletonCard } from '@/components/rc';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import WineListPickCard from './WineListPickCard';
import WineListSection from './WineListSection';
import type {
  WineListAnalysis,
  WineListAnalysisContext,
  WineListEntry,
  RecommendChatContext,
  Wine,
} from '@/types';

interface WineListResultsProps {
  analysis: WineListAnalysis;
  context: WineListAnalysisContext;
  inventory: Wine[];
  error: string | null;
  onStartOver: () => void;
  onHandoffToRemy: (context: RecommendChatContext) => void;
  onMealContextUpdate: (meal: string) => void;
  isReanalysing: boolean;
  picksLoading?: boolean;
}

const WineListResults: React.FC<WineListResultsProps> = ({
  analysis,
  context,
  inventory,
  error,
  onStartOver,
  onHandoffToRemy,
  onMealContextUpdate,
  isReanalysing,
  picksLoading,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mealInput, setMealInput] = useState(context.meal || '');
  const [activeTab, setActiveTab] = useState<'picks' | 'list'>(
    picksLoading ? 'list' : 'picks'
  );

  // Auto-switch to picks tab when picks arrive
  useEffect(() => {
    if (!picksLoading && analysis.picks.length > 0) {
      setActiveTab('picks');
    }
  }, [picksLoading, analysis.picks.length]);

  const entryMap = useMemo(
    () => new Map(analysis.entries.map(e => [e.entryId, e])),
    [analysis.entries]
  );

  // Group entries by section
  const sectionEntries = useMemo(() => {
    const map = new Map<string, WineListEntry[]>();
    for (const section of analysis.sections) {
      const entries = section.entryIds
        .map(id => entryMap.get(id))
        .filter((e): e is WineListEntry => e != null);
      if (entries.length > 0) map.set(section.name, entries);
    }
    return map;
  }, [analysis.sections, entryMap]);

  const handleMealSubmit = () => {
    if (mealInput.trim()) {
      onMealContextUpdate(mealInput.trim());
      setSheetOpen(false);
    }
  };

  const handleAskRemy = () => {
    const chatContext: RecommendChatContext = {
      resultSetId: analysis.sessionId,
      occasionId: 'analyze_winelist',
      occasionTitle: 'Analyse a Wine List',
      contextInputs: context,
      recommendations: [],
      wineListAnalysis: analysis,
    };
    onHandoffToRemy(chatContext);
  };

  if (error) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <button
            onClick={onStartOver}
            className="flex items-center gap-1 text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)] transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider">Back</span>
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <Heading scale="subhead" colour="primary">ANALYSIS FAILED</Heading>
          <Body size="body" colour="secondary" className="text-center max-w-sm">{error}</Body>
          <Button variantType="Primary" label="TRY AGAIN" onClick={onStartOver} className="mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-2">
        <button
          onClick={onStartOver}
          className="flex items-center gap-1 text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)] transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider">Back</span>
        </button>
      </div>

      <div className="px-6 pb-4">
        {analysis.restaurantName && (
          <Heading scale="heading">{analysis.restaurantName.toUpperCase()}</Heading>
        )}
        <MonoLabel size="label" colour="ghost" className="w-auto mt-1">
          {analysis.entries.length} wines across {analysis.pageCount} page{analysis.pageCount !== 1 ? 's' : ''}
        </MonoLabel>
      </div>

      {/* Tab bar */}
      <div className="flex px-6 border-b border-[var(--rc-border-subtle)]">
        <button
          onClick={() => setActiveTab('picks')}
          className={`flex-1 py-2.5 font-[var(--rc-font-mono)] text-xs uppercase tracking-wider font-bold text-center border-b-2 transition-colors ${
            activeTab === 'picks'
              ? 'border-[var(--rc-accent-pink)] text-[var(--rc-ink-primary)]'
              : 'border-transparent text-[var(--rc-ink-ghost)] hover:text-[var(--rc-ink-secondary)]'
          }`}
        >
          {picksLoading ? "R\u00c9MY\u2019S PICKS\u2026" : "R\u00c9MY\u2019S PICKS"}
          {picksLoading && (
            <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-[var(--rc-accent-acid)] animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 font-[var(--rc-font-mono)] text-xs uppercase tracking-wider font-bold text-center border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-[var(--rc-accent-pink)] text-[var(--rc-ink-primary)]'
              : 'border-transparent text-[var(--rc-ink-ghost)] hover:text-[var(--rc-ink-secondary)]'
          }`}
        >
          FULL LIST ({analysis.entries.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-24 space-y-8 pt-4">

        {/* Rémy's Picks tab */}
        {activeTab === 'picks' && (
          <section>
            {picksLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--rc-accent-acid)] animate-pulse" />
                  <MonoLabel size="micro" colour="ghost" className="w-auto">
                    R\u00e9my is selecting the best options...
                  </MonoLabel>
                </div>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : analysis.picks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Body size="body" colour="secondary" className="text-center">
                  No picks available yet.
                </Body>
              </div>
            ) : (
              <>
                <Heading scale="subhead" colour="primary" className="mb-3">
                  {isReanalysing ? 'UPDATING PICKS\u2026' : "R\u00c9MY\u2019S PICKS"}
                </Heading>
                <div className={`space-y-3 ${isReanalysing ? 'opacity-50 animate-pulse' : ''}`}>
                  {analysis.picks.map(pick => {
                    const entry = entryMap.get(pick.entryId);
                    if (!entry) return null;
                    return <WineListPickCard key={pick.entryId} pick={pick} entry={entry} />;
                  })}
                </div>
              </>
            )}

            {/* Meal context button — only show when picks are loaded */}
            {!picksLoading && (
              <div className="pt-6">
                <button
                  onClick={() => setSheetOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[var(--rc-border-emphasis)] rounded-[var(--rc-radius-md)] text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)] hover:border-[var(--rc-accent-pink)] transition-colors"
                >
                  {context.meal ? <Pencil size={16} /> : <Plus size={16} />}
                  <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider font-bold">
                    {context.meal ? 'UPDATE MEAL CONTEXT' : 'ADD MEAL CONTEXT'}
                  </span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* Full Wine List tab */}
        {activeTab === 'list' && (
          <section>
            <div className="space-y-3">
              {Array.from(sectionEntries.entries()).map(([name, entries]) => (
                <WineListSection key={name} name={name} entries={entries} inventory={inventory} />
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        <section className="flex gap-3 pt-4 pb-8">
          <Button
            variantType="Secondary"
            label="START OVER"
            onClick={onStartOver}
            className="flex-1"
          />
          <Button
            variantType="Primary"
            label="ASK R\u00c9MY MORE"
            onClick={handleAskRemy}
            className="flex-1"
            disabled={picksLoading}
          />
        </section>
      </div>

      {/* Meal context drawer */}
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        snapPoint="half"
        title="Meal Context"
        description="Tell R\u00e9my what you're eating for better pairing picks"
      >
        <div className="px-6 py-4 space-y-4">
          <MonoLabel size="label" colour="secondary" className="w-auto">WHAT ARE YOU EATING?</MonoLabel>
          <Input
            typeVariant="Textarea"
            placeholder="e.g., Grilled lamb chops with mint\u2026"
            value={mealInput}
            onChange={(e) => setMealInput(e.target.value)}
          />
          <Button
            variantType="Primary"
            label={isReanalysing ? 'UPDATING\u2026' : 'UPDATE PICKS'}
            onClick={handleMealSubmit}
            disabled={!mealInput.trim() || isReanalysing}
            className="w-full"
          />
        </div>
      </BottomSheet>
    </div>
  );
};

export default WineListResults;
