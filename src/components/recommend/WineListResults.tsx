import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, MessageCircle, Pencil } from 'lucide-react';
import { Button, Heading, Body, MonoLabel, Input } from '@/components/rc';
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
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mealInput, setMealInput] = useState(context.meal || '');

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

      {/* Content */}
      <div className="flex-1 px-6 pb-24 space-y-8">

        {/* Rémy's Picks */}
        <section>
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
        </section>

        {/* Meal context button */}
        <section>
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[var(--rc-border-emphasis)] rounded-[var(--rc-radius-md)] text-[var(--rc-ink-secondary)] hover:text-[var(--rc-ink-primary)] hover:border-[var(--rc-accent-pink)] transition-colors"
          >
            {context.meal ? <Pencil size={16} /> : <Plus size={16} />}
            <span className="font-[var(--rc-font-mono)] text-xs uppercase tracking-wider font-bold">
              {context.meal ? 'UPDATE MEAL CONTEXT' : 'ADD MEAL CONTEXT'}
            </span>
          </button>
        </section>

        {/* Full Wine List */}
        <section>
          <Heading scale="subhead" colour="primary" className="mb-3">FULL WINE LIST</Heading>
          <div className="space-y-3">
            {Array.from(sectionEntries.entries()).map(([name, entries]) => (
              <WineListSection key={name} name={name} entries={entries} inventory={inventory} />
            ))}
          </div>
        </section>

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
