
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, Mic, MicOff, Send, VolumeX } from 'lucide-react';
import { useGeminiLive } from '@/hooks/useGeminiLive';
import VoiceWaveform from './VoiceWaveform';
import FollowUpChips from './recommend/FollowUpChips';
import { Wine, Message, RecommendChatContext } from '@/types';
import { inventoryService } from '@/services/inventoryService';
import { getRandomGreeting } from '@/greetings';
import { Heading, MonoLabel, Body, IconButton } from '@/components/rc';
import { cn } from '@/lib/utils';

const CONTEXT_PREFIX = '[RECOMMEND_CONTEXT]';

interface ChatInterfaceProps {
  inventory: Wine[];
  isSynced: boolean;
  recommendContext?: RecommendChatContext | null;
  onRecommendContextConsumed?: () => void;
  onAddToCellar?: (wine: Partial<Wine>) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  inventory,
  isSynced,
  recommendContext,
  onRecommendContextConsumed,
  onAddToCellar,
}) => {
  const cellarSnapshot = useMemo(() => inventoryService.getCellarSnapshot(inventory), [inventory]);

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
  const [dragOver, setDragOver] = useState(false);
  const [imageIntent, setImageIntent] = useState<'label' | 'list'>('label');
  const [showFollowUpChips, setShowFollowUpChips] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const contextConsumedRef = useRef(false);
  // Track transcript length to detect new assistant messages after context injection
  const transcriptLenAtInjection = useRef<number | null>(null);

  // Stable greeting — computed once on mount, displayed as synthetic first message
  const [greeting] = useState(() => getRandomGreeting());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript, isProcessing, showFollowUpChips]);

  // ── Recommend Context Injection ──
  useEffect(() => {
    if (!recommendContext || contextConsumedRef.current) return;
    contextConsumedRef.current = true;

    const wineList = recommendContext.recommendations
      .map(r => `${r.rank}. ${r.vintage} ${r.producer} ${r.name} (${r.type}) — ${r.rationale}`)
      .join('\n');

    const contextMessage = `${CONTEXT_PREFIX}
The user just used the Recommend feature for: ${recommendContext.occasionTitle}.
Here are the recommendations that were shown:
${wineList}

Greet the user warmly referencing their ${recommendContext.occasionTitle.toLowerCase()} occasion. Say something like "I picked these based on your ${recommendContext.occasionTitle.toLowerCase()}. Want me to explain any of them in more detail, or should we look at alternatives?" Keep it brief and conversational.`;

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

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
      setShowFollowUpChips(false);
    }
  };

  const handleChipClick = (question: string) => {
    sendMessage(question);
    setShowFollowUpChips(false);
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      const prompt = imageIntent === 'label'
        ? "Analyze this wine label to add to cellar."
        : "Analyze this wine list and suggest pairings from my inventory.";
      sendMessage(prompt, base64);
    };
    reader.readAsDataURL(file);
  };

  // Filter out context injection messages from display
  const visibleTranscript = transcript.filter(
    msg => !msg.content.startsWith(CONTEXT_PREFIX)
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
              {isRecording ? 'Listening...' : 'Text Ready'}
            </MonoLabel>
            {stagedWine && (
              <span className="flex items-center gap-2">
                <span className="bg-[var(--rc-accent-acid)] text-[var(--rc-ink-primary)] px-2 py-0.5 rounded-[var(--rc-radius-sm)] font-[var(--rc-font-mono)] text-[9px] font-bold animate-pulse">
                  WINE STAGED: {stagedWine.producer}
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
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="flex items-center gap-2 bg-[var(--rc-accent-pink)] border border-[var(--rc-ink-primary)] px-3 py-1.5 hover:brightness-110 transition-all animate-pulse shadow-[2px_2px_0_rgba(0,0,0,1)] rounded-[var(--rc-radius-sm)]"
          >
            <VolumeX size={18} />
            <MonoLabel size="micro" weight="bold" colour="on-accent" as="span" className="w-auto">Stop Rémy</MonoLabel>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {/* Greeting — synthetic first message, not part of Gemini transcript */}
        {visibleTranscript.length === 0 && !isProcessing && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-[var(--rc-radius-md)] bg-[var(--rc-accent-pink)] text-[var(--rc-ink-on-accent)]">
              <Body size="caption" colour="on-accent" as="p" className="whitespace-pre-wrap w-auto">{greeting}</Body>
            </div>
          </div>
        )}
        {visibleTranscript.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={cn(
              "max-w-[80%] p-4 rounded-[var(--rc-radius-md)]",
              msg.role === 'user'
                ? "bg-[var(--rc-surface-elevated,#3d3d3d)] text-[var(--rc-ink-on-accent)]"
                : "bg-[var(--rc-accent-pink)] text-[var(--rc-ink-on-accent)]"
            )}>
              <Body size="caption" colour="on-accent" as="p" className="whitespace-pre-wrap w-auto">{msg.content}</Body>
            </div>
          </div>
        ))}
        {isProcessing && (
          <MonoLabel size="micro" colour="accent-acid" as="span" className="w-auto animate-pulse">
            Rémy is thinking...
          </MonoLabel>
        )}
      </div>

      {/* Follow-up Chips */}
      {showFollowUpChips && <FollowUpChips onChipClick={handleChipClick} />}

      {/* Input Area */}
      <div className="p-6 bg-[var(--rc-surface-elevated,#2d2d2d)] border-t border-[var(--rc-border-emphasis)]">
        <div className="max-w-3xl mx-auto space-y-4">

          <div className="flex items-center gap-4 bg-[var(--rc-ink-primary)] p-2 border border-[var(--rc-border-emphasis)] rounded-[var(--rc-radius-sm)]">
            <button
              onClick={() => setImageIntent(imageIntent === 'label' ? 'list' : 'label')}
              className={cn(
                "px-3 py-1 font-[var(--rc-font-mono)] text-[10px] uppercase border border-[var(--rc-ink-primary)] transition-colors rounded-[var(--rc-radius-sm)]",
                imageIntent === 'label'
                  ? "bg-[var(--rc-accent-acid)] text-[var(--rc-ink-primary)]"
                  : "bg-[var(--rc-surface-elevated,#3d3d3d)] text-[var(--rc-ink-on-accent)]"
              )}
            >
              Mode: {imageIntent === 'label' ? 'Label Ingest' : 'Wine List'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
            <IconButton
              icon={Camera}
              aria-label="Upload image"
              onClick={() => fileRef.current?.click()}
              className="bg-[var(--rc-surface-elevated,#3d3d3d)] text-[var(--rc-ink-on-accent)] hover:bg-[var(--rc-accent-pink)] w-12 h-12"
            />

            {isRecording ? (
              <div className="flex-1 flex items-center bg-[var(--rc-ink-primary)] border border-[var(--rc-accent-pink)] px-4 py-3 rounded-[var(--rc-radius-md)]">
                <VoiceWaveform />
                <button
                  onClick={stopRecording}
                  className="ml-3 text-[var(--rc-accent-pink)] transition-colors shrink-0"
                >
                  <MicOff size={20} />
                </button>
              </div>
            ) : (
              <div className="flex-1 relative">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Message Rémy..."
                  className="w-full bg-[var(--rc-ink-primary)] border border-[var(--rc-border-emphasis)] px-4 py-3 font-[var(--rc-font-mono)] text-sm text-[var(--rc-ink-on-accent)] placeholder:text-[var(--rc-ink-ghost)] focus:border-[var(--rc-accent-pink)] outline-none rounded-[var(--rc-radius-md)]"
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
