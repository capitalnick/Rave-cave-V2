
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Mic, Send, VolumeX } from 'lucide-react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import VoiceWaveform from './VoiceWaveform';
import FollowUpChips from './recommend/FollowUpChips';
import { RemyMessage, UserMessage, WineBriefActions } from './remy';
import { Wine, Message, RecommendChatContext, WineBriefContext } from '@/types';
import { inventoryService } from '@/services/inventoryService';
import { getRandomGreeting } from '@/greetings';
import { CONFIG } from '@/constants';
import { Heading, MonoLabel, Body, IconButton } from '@/components/rc';
import { useRemyThinking } from '@/hooks/useRemyThinking';
import type { RemyWineData } from '@/utils/remyParser';

const CONTEXT_PREFIX = '[RECOMMEND_CONTEXT]';
const WINE_BRIEF_PREFIX = '[WINE_BRIEF_CONTEXT]';

interface ChatInterfaceProps {
  inventory: Wine[];
  isSynced: boolean;
  recommendContext?: RecommendChatContext | null;
  onRecommendContextConsumed?: () => void;
  wineBriefContext?: WineBriefContext | null;
  onWineBriefContextConsumed?: () => void;
  onAddToCellar?: (wine: Partial<Wine>) => void;
  onViewWine?: (wine: Wine) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  inventory,
  isSynced,
  recommendContext,
  onRecommendContextConsumed,
  wineBriefContext,
  onWineBriefContextConsumed,
  onAddToCellar,
  onViewWine,
}) => {
  const { text: thinkingText, fading: thinkingFading } = useRemyThinking();
  const cellarSnapshot = useMemo(() => inventoryService.buildCellarSummary(inventory), [inventory]);

  const {
    transcript,
    isSpeaking,
    isRecording,
    isProcessing,
    stagedWine,
    startRecording,
    stopRecording,
    sendMessage,
    stopSpeaking
  } = useGeminiLive(inventory, cellarSnapshot);

  const [input, setInput] = useState('');
  const [showFollowUpChips, setShowFollowUpChips] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextConsumedRef = useRef(false);
  // Track transcript length to detect new assistant messages after context injection
  const transcriptLenAtInjection = useRef<number | null>(null);

  // Wine Brief state
  const briefConsumedRef = useRef(false);
  const transcriptLenAtBriefInjection = useRef<number | null>(null);
  const [showBriefActions, setShowBriefActions] = useState(false);
  const [briefFields, setBriefFields] = useState<Partial<Wine> | null>(null);

  // Stable greeting — computed once on mount, displayed as synthetic first message
  const [greeting] = useState(() => getRandomGreeting());

  // Scroll behavior: user messages → bottom, assistant messages → top of new message
  const prevTranscriptLen = useRef(0);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const len = transcript.length;
    const lastMsg = len > 0 ? transcript[len - 1] : null;

    if (lastMsg && lastMsg.role === 'assistant' && len > prevTranscriptLen.current) {
      // New assistant message — scroll to its top so user reads from the start
      requestAnimationFrame(() => {
        const messages = container.querySelectorAll('[data-msg-id]');
        const lastEl = messages[messages.length - 1];
        if (lastEl) {
          lastEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    } else {
      // User message, processing indicator, or follow-up chips — scroll to bottom
      container.scrollTop = container.scrollHeight;
    }

    prevTranscriptLen.current = len;
  }, [transcript, isProcessing, showFollowUpChips]);

  // ── Recommend Context Injection ──
  useEffect(() => {
    if (!recommendContext || contextConsumedRef.current) return;
    contextConsumedRef.current = true;

    let contextMessage: string;

    if (recommendContext.wineListAnalysis) {
      const analysis = recommendContext.wineListAnalysis;
      const entryMap = new Map(analysis.entries.map(e => [e.entryId, e]));

      const wineListText = analysis.entries
        .slice(0, 30)
        .map(e => `- ${e.producer} ${e.name} ${e.vintage ?? 'NV'} (${e.type ?? '?'}) ${e.priceBottle != null ? `$${e.priceBottle}` : ''}`)
        .join('\n');

      const picksText = analysis.picks.map(p => {
        const entry = entryMap.get(p.entryId);
        if (!entry) return '';
        return `${p.rank}. ${entry.producer} ${entry.name} ${entry.vintage ?? 'NV'} — ${p.rationale}`;
      }).filter(Boolean).join('\n');

      contextMessage = `${CONTEXT_PREFIX}
The user just analysed a wine list${analysis.restaurantName ? ` from ${analysis.restaurantName}` : ''}.
${analysis.entries.length} wines were extracted across ${analysis.pageCount} page${analysis.pageCount !== 1 ? 's' : ''}.

Extracted wines (showing up to 30):
${wineListText}

Rémy's picks:
${picksText}

Greet the user warmly referencing the wine list analysis. Say something like "I've gone through the wine list — here are my thoughts. Want me to dive deeper into any of my picks, or help you decide based on what you're eating?" Keep it brief and conversational.`;
    } else {
      const wineList = recommendContext.recommendations
        .map(r => `${r.rank}. ${r.vintage} ${r.producer} ${r.name} (${r.type}) — ${r.rationale}`)
        .join('\n');

      contextMessage = `${CONTEXT_PREFIX}
The user just used the Recommend feature for: ${recommendContext.occasionTitle}.
Here are the recommendations that were shown:
${wineList}

Greet the user warmly referencing their ${recommendContext.occasionTitle.toLowerCase()} occasion. Say something like "I picked these based on your ${recommendContext.occasionTitle.toLowerCase()}. Want me to explain any of them in more detail, or should we look at alternatives?" Keep it brief and conversational.`;
    }

    transcriptLenAtInjection.current = transcript.length;
    sendMessage(contextMessage);
    onRecommendContextConsumed?.();
  }, [recommendContext]);

  // Show follow-up chips after Rémy responds to context injection
  useEffect(() => {
    if (transcriptLenAtInjection.current === null) return;
    // Check if a new assistant message appeared after the injection
    const newMessages = transcript.slice(transcriptLenAtInjection.current);
    const hasAssistantReply = newMessages.some(m => m.role === 'assistant' && !m.content.startsWith(CONTEXT_PREFIX));
    if (hasAssistantReply) {
      setShowFollowUpChips(true);
      transcriptLenAtInjection.current = null;
    }
  }, [transcript]);

  // Reset context consumed ref when recommendContext changes to a new value
  useEffect(() => {
    if (recommendContext) {
      contextConsumedRef.current = false;
    }
  }, [recommendContext?.resultSetId]);

  // ── Wine Brief Context Injection ──
  useEffect(() => {
    if (!wineBriefContext || briefConsumedRef.current) return;
    briefConsumedRef.current = true;

    const wineJson = JSON.stringify(wineBriefContext.fields, null, 2);
    const briefMessage = `${WINE_BRIEF_PREFIX}
The user just scanned a wine label and wants your expert assessment. Here is the staged wine data:

${wineJson}

Respond with a full Wine Brief (6 sections as described in your system prompt). End with a \`\`\`wine fence block containing the wine data.`;

    transcriptLenAtBriefInjection.current = transcript.length;
    setBriefFields(wineBriefContext.fields);
    sendMessage(briefMessage);
    onWineBriefContextConsumed?.();
  }, [wineBriefContext]);

  // Show brief actions after Rémy responds to brief injection
  useEffect(() => {
    if (transcriptLenAtBriefInjection.current === null) return;
    const newMessages = transcript.slice(transcriptLenAtBriefInjection.current);
    const hasAssistantReply = newMessages.some(m => m.role === 'assistant' && !m.content.startsWith(WINE_BRIEF_PREFIX));
    if (hasAssistantReply) {
      setShowBriefActions(true);
      transcriptLenAtBriefInjection.current = null;
    }
  }, [transcript]);

  // Reset brief consumed ref when briefId changes
  useEffect(() => {
    if (wineBriefContext) {
      briefConsumedRef.current = false;
    }
  }, [wineBriefContext?.briefId]);

  const resizeTextarea = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 6 * 16)}px`; // max ~4 lines
  };

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
      setShowFollowUpChips(false);
      setShowBriefActions(false);
      // Reset textarea height to single line
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) ta.style.height = 'auto';
      });
    }
  };

  const handleChipClick = (question: string) => {
    sendMessage(question);
    setShowFollowUpChips(false);
  };

  const handleWineCardAddToCellar = (wine: RemyWineData) => {
    // Handle both new grapeVarieties array and legacy cepage string from model output
    const grapeVarieties = wine.grapeVarieties?.length
      ? wine.grapeVarieties
      : wine.cepage
        ? wine.cepage.split(/[\/,&]/).map(s => ({ name: s.trim(), pct: null })).filter(g => g.name)
        : [];
    onAddToCellar?.({
      producer: wine.producer,
      name: wine.name,
      vintage: wine.vintage,
      type: wine.type as Wine['type'],
      region: wine.region,
      country: wine.country,
      grapeVarieties,
      tastingNotes: wine.tastingNotes || wine.note || '',
      drinkFrom: wine.drinkFrom,
      drinkUntil: wine.drinkUntil,
    });
  };

  // Spacing between messages: Remy→User 24px, User→Remy 32px, same role 32px
  const getMessageGap = (prev: Message | null, curr: Message): string => {
    if (!prev) return '';
    if (prev.role === 'assistant' && curr.role === 'user') return 'mt-6'; // 24px
    return 'mt-8'; // 32px
  };

  // Synthetic greeting as a Message for RemyMessage
  const syntheticGreeting: Message = useMemo(() => ({
    id: 'greeting',
    role: 'assistant' as const,
    content: greeting,
    timestamp: new Date(),
  }), [greeting]);

  // Filter out context injection messages from display
  const visibleTranscript = transcript.filter(
    msg => !msg.content.startsWith(CONTEXT_PREFIX) && !msg.content.startsWith(WINE_BRIEF_PREFIX)
  );

  return (
    <div className="flex flex-col h-full bg-[var(--rc-ink-primary)] text-[var(--rc-ink-on-accent)] overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--rc-border-emphasis)] bg-[var(--rc-surface-elevated,#2d2d2d)] flex items-center justify-between shrink-0">
        <div className="flex-1">
          <Heading scale="heading" colour="accent-pink" as="h2" className="text-3xl!">
            Rémy Sommelier
          </Heading>
          <div className="flex items-center gap-2 mt-1">
            <MonoLabel size="micro" colour="ghost" as="span" className="w-auto">
              {isRecording ? "I'm listening" : 'Text Ready'}
            </MonoLabel>
            {stagedWine && (
              <span className="flex items-center gap-2">
                <span className="bg-[var(--rc-accent-acid)] text-[var(--rc-ink-primary)] px-2 py-0.5 rounded-[var(--rc-radius-sm)] font-[var(--rc-font-mono)] text-[9px] font-bold animate-pulse">
                  Bottle ready to review
                </span>
                <button
                  onClick={() => onAddToCellar?.(stagedWine)}
                  className="text-[var(--rc-accent-pink)] font-[var(--rc-font-mono)] text-[9px] font-bold uppercase tracking-wider underline underline-offset-2"
                >
                  ADD TO CELLAR →
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Stop Speaking Control */}
        {CONFIG.FEATURES.TTS_ENABLED && isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="flex items-center gap-2 bg-[var(--rc-accent-pink)] border border-[var(--rc-ink-primary)] px-3 py-1.5 hover:brightness-110 transition-all animate-pulse shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-[var(--rc-radius-sm)]"
          >
            <VolumeX size={18} />
            <MonoLabel size="micro" weight="bold" colour="on-accent" as="span" className="w-auto">Mute</MonoLabel>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[var(--rc-surface-primary)] custom-scrollbar">
        <div className="max-w-[720px] mx-auto px-6 py-8">
          {/* Greeting — synthetic first message, not part of Gemini transcript */}
          {visibleTranscript.length === 0 && !isProcessing && (
            <RemyMessage message={syntheticGreeting} inventory={inventory} onAddToCellar={handleWineCardAddToCellar} onViewWine={onViewWine} />
          )}
          {visibleTranscript.map((msg, i) => {
            const prev = i > 0 ? visibleTranscript[i - 1] : null;
            const gap = getMessageGap(prev, msg);
            return msg.role === 'user' ? (
              <div key={msg.id} data-msg-id={msg.id} className={gap}>
                <UserMessage message={msg} />
              </div>
            ) : (
              <div key={msg.id} data-msg-id={msg.id} className={gap}>
                <RemyMessage message={msg} inventory={inventory} onAddToCellar={handleWineCardAddToCellar} onViewWine={onViewWine} />
              </div>
            );
          })}
          {isProcessing && (
            <MonoLabel
              size="micro"
              colour="secondary"
              as="span"
              className={`w-auto animate-pulse mt-6 block transition-opacity duration-300 ${thinkingFading ? 'opacity-0' : 'opacity-100'}`}
            >
              {thinkingText}
            </MonoLabel>
          )}
        </div>
      </div>

      {/* Follow-up Chips (hidden when brief actions are showing) */}
      {showFollowUpChips && !showBriefActions && <FollowUpChips onChipClick={handleChipClick} />}

      {/* Wine Brief Actions */}
      {showBriefActions && briefFields && (
        <WineBriefActions
          fields={briefFields}
          onAddToCellar={(wine) => {
            onAddToCellar?.(wine);
            setShowBriefActions(false);
          }}
          onDismiss={() => {
            setShowBriefActions(false);
            setBriefFields(null);
          }}
        />
      )}

      {/* Input Area */}
      <div className="px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-4 bg-[var(--rc-surface-elevated,#2d2d2d)] border-t border-[var(--rc-border-emphasis)] shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3">
            {isRecording ? (
              <div className="flex-1 flex items-center bg-[var(--rc-ink-primary)] border border-[var(--rc-accent-acid)] px-4 py-3 rounded-[var(--rc-radius-md)]">
                <VoiceWaveform />
                <button
                  onClick={stopRecording}
                  className="ml-3 w-9 h-9 rounded-full bg-[var(--rc-accent-acid)] text-[var(--rc-ink-primary)] flex items-center justify-center transition-colors shrink-0"
                >
                  <Mic size={18} />
                </button>
              </div>
            ) : (
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); resizeTextarea(); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Message Rémy..."
                  rows={1}
                  className="w-full bg-[var(--rc-ink-primary)] border border-[var(--rc-border-emphasis)] px-4 py-3 pr-12 font-[var(--rc-font-mono)] text-sm text-[var(--rc-ink-on-accent)] placeholder:text-[var(--rc-ink-ghost)] focus:border-[var(--rc-accent-pink)] outline-none rounded-[var(--rc-radius-md)] resize-none overflow-y-auto"
                />
                <button
                  onClick={() => startRecording()}
                  className="absolute right-3 top-3 text-[var(--rc-ink-ghost)] hover:text-[var(--rc-accent-pink)] transition-colors"
                >
                  <Mic size={20} />
                </button>
              </div>
            )}

            <IconButton
              icon={Send}
              aria-label="Send message"
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-[var(--rc-accent-pink)] text-[var(--rc-ink-on-accent)] w-12 h-12 disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
