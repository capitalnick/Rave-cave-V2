
import { useState, useRef, useCallback, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { Wine, StagedWine, Message, IngestionState } from '../types';
import { buildSystemPrompt, CONFIG } from '../constants';
import { fetchElevenLabsAudio, playAudioUrl, CHUNK_TIMEOUT_FIRST_MS, CHUNK_TIMEOUT_MS } from '../services/ttsService';
import { formatForSpeech } from '../services/ttsFormatter';
import { enrichWine } from '@/services/enrichmentService';
import { sanitizeWineName } from '@/utils/wineNameGuard';
import { callGeminiProxy } from '@/utils/geminiProxy';
import { authFetch } from '@/utils/authFetch';
import { FUNCTION_URLS } from '@/config/functionUrls';
import { useProfile } from '@/context/ProfileContext';
import { WEB_SPEECH_RATE, SILENCE_TIMEOUT_MS } from '@/config/ttsConfig';

const MAX_TOOL_ROUNDS = 5;

// ── Intent Detection ──

const CELLAR_INTENT_PATTERNS = [
  /\bdo i have\b/i,
  /\bin my (cellar|cave|collection|rave cave)\b/i,
  /\bmy (reds|whites|bottles|wines|collection)\b/i,
  /\bwhat('s| is) in\b/i,
  /\badd (this|it|a bottle)\b/i,
  /\bdrink tonight\b/i,
  /\brecommend (from|out of) my\b/i,
  /\bhow many (do i|bottles)\b/i,
  /\bmy inventory\b/i,
  /\bcheck (my|the) (cellar|cave)\b/i,
  /\bsomething (similar|like that) (in|from) my\b/i,
];

const AFFIRMATIVE_PATTERNS = [/^(yes|yeah|sure|yep|ok|okay|go ahead|do it|please)[\s!.]*$/i];

function detectCellarIntent(message: string): boolean {
  return CELLAR_INTENT_PATTERNS.some(pattern => pattern.test(message));
}

function isAffirmative(message: string): boolean {
  return AFFIRMATIVE_PATTERNS.some(p => p.test(message.trim()));
}


/**
 * ANTI-GAP CHUNKING:
 * Splits text into small, manageable chunks for back-to-back queueing.
 */
const chunkText = (text: string): string[] => {
  const chunks: string[] = [];
  // Split primarily on sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

  for (let sentence of sentences) {
    sentence = sentence.trim();
    if (!sentence) continue;

    // Sub-split if sentence is too long (> 160 chars)
    if (sentence.length > 160) {
      const parts = sentence.split(/([,;:])/).filter(p => p.trim().length > 0);
      let currentPart = "";
      for (const p of parts) {
        if ((currentPart + p).length > 220) {
          chunks.push(currentPart.trim());
          currentPart = p;
        } else {
          currentPart += p;
        }
      }
      if (currentPart) chunks.push(currentPart.trim());
    } else {
      chunks.push(sentence);
    }
  }
  return chunks;
};

export const useGeminiLive = (localCellar: Wine[], cellarSnapshot: string) => {
  const { isPremium } = useProfile();
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [stagedWine, setStagedWine] = useState<StagedWine | null>(null);
  const [ingestionState, setIngestionState] = useState<IngestionState>('IDLE');
  
  // Chat mode — general (no cellar) or cellar (full inventory)
  const [chatMode, setChatMode] = useState<'general' | 'cellar'>('general');
  const hasOfferedCellarBridge = useRef(false);
  const awaitingCellarConfirmation = useRef(false);

  const historyRef = useRef<any[]>([]);
  const recognitionRef = useRef<any>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const stagedWineRef = useRef<StagedWine | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSubmittedRef = useRef(false);
  const liveTranscriptRef = useRef('');

  /**
   * VOICE SELECTION (STRICT HEURISTIC)
   */
  const getBestFrenchVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    let bestVoice: SpeechSynthesisVoice | null = null;
    let highestScore = -100;

    for (const voice of voices) {
      let score = 0;
      const name = voice.name.toLowerCase();
      const lang = voice.lang;

      if (lang.startsWith('fr')) score += 50;
      if (lang === 'fr-FR') score += 25;

      // Male markers heuristic
      const maleMarkers = ["male", "homme", "masculin", "thomas", "daniel", "paul", "nicolas", "claude"];
      const femaleMarkers = ["female", "femme", "marie", "alice", "julie", "sophie"];

      if (maleMarkers.some(m => name.includes(m))) score += 15;
      if (femaleMarkers.some(f => name.includes(f))) score -= 10;

      if (score > highestScore) {
        highestScore = score;
        bestVoice = voice;
      }
    }

    if (bestVoice) {
      console.log(`Rémy's Chosen Voice: ${bestVoice.name} [${bestVoice.lang}] - Score: ${highestScore}`);
    }
    return bestVoice;
  }, []);

  const stopSpeaking = useCallback(() => {
    // Cancel ElevenLabs pipeline
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Cancel browser TTS fallback
    window.speechSynthesis.cancel();
    ttsQueueRef.current = [];
    currentUtteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  /**
   * PROCESS TTS QUEUE: Back-to-back playback
   */
  const processTTSQueue = useCallback(() => {
    if (ttsQueueRef.current.length === 0) {
      setIsSpeaking(false);
      return;
    }

    const nextText = ttsQueueRef.current.shift()!;
    const utterance = new SpeechSynthesisUtterance(nextText);
    
    utterance.voice = getBestFrenchVoice();
    utterance.rate = WEB_SPEECH_RATE;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => processTTSQueue();
    utterance.onerror = () => processTTSQueue();

    currentUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [getBestFrenchVoice]);

  /**
   * QUEUE SPEECH:
   * ElevenLabs primary, browser SpeechSynthesis fallback.
   */
  const speak = useCallback(async (text: string) => {
    stopSpeaking();

    const cleaned = formatForSpeech(text);
    const chunks = chunkText(cleaned).filter(c => c.length > 0);
    if (chunks.length === 0) return;

    setIsSpeaking(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let elevenLabsFailed = false;
    let remainingChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (controller.signal.aborted) return;

      if (!elevenLabsFailed) {
        try {
          const timeoutMs = i === 0 ? CHUNK_TIMEOUT_FIRST_MS : CHUNK_TIMEOUT_MS;
          const blobUrl = await Promise.race([
            fetchElevenLabsAudio(chunks[i], controller.signal),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('TTS_TIMEOUT')), timeoutMs)
            ),
          ]);

          if (controller.signal.aborted) return;
          await playAudioUrl(blobUrl, controller.signal);
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.warn(`ElevenLabs chunk ${i} failed, falling back to browser TTS`, err);
          elevenLabsFailed = true;
          remainingChunks = chunks.slice(i);
        }
      }
    }

    if (elevenLabsFailed && remainingChunks.length > 0 && !controller.signal.aborted) {
      ttsQueueRef.current = remainingChunks;
      processTTSQueue();
      return;
    }

    if (!controller.signal.aborted) {
      setIsSpeaking(false);
    }
  }, [stopSpeaking, processTTSQueue]);

  // Handle voice submission cleanup and cancellation
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [stopSpeaking]);

  const handleToolCalls = useCallback(async (calls: any[]) => {
    const results: { result: string }[] = [];
    for (const call of calls) {
      if (call.name === 'queryInventory') {
        try {
          const res = await authFetch(FUNCTION_URLS.queryInventory, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(call.args),
          });
          if (!res.ok) throw new Error(`queryInventory error: ${res.status}`);
          const data = await res.json();
          const wines = data.wines || [];
          if (wines.length === 0) {
            results.push({ result: `No wines found matching those criteria. Total in cellar: ${data.total || 0}.` });
          } else {
            const formatted = wines.map((w: any) => {
              const parts = [
                `${w.producer}${w.name ? ' ' + w.name : ''} ${w.vintage || 'NV'}`,
                `${w.type || ''}, ${w.region || ''}${w.country ? ', ' + w.country : ''}`,
                `$${w.price || 0} — Qty: ${w.quantity || 1}`,
                `Maturity: ${w.maturity || 'Unknown'}`,
              ];
              if (w.grapeVarieties?.length) parts.push(`Grape: ${w.grapeVarieties.map((g: any) => g.name).join(', ')}`);
              if (w.tastingNotes) parts.push(`Notes: ${w.tastingNotes}`);
              if (w.vivinoRating) parts.push(`Rating: ${w.vivinoRating}/100`);
              if (w.drinkFrom || w.drinkUntil) parts.push(`Window: ${w.drinkFrom || '?'}–${w.drinkUntil || '?'}`);
              if (w.appellation) parts.push(`Appellation: ${w.appellation}`);
              return parts.join(' — ');
            }).join('\n');
            results.push({ result: `Found ${data.total} wines (showing ${wines.length}):\n${formatted}` });
          }
        } catch (err) {
          console.error('queryInventory call failed, using fallback:', err);
          const fallback = inventoryService.buildCellarSummary(localCellar);
          results.push({ result: `queryInventory is temporarily unavailable. Here is a summary of the cellar instead: ${fallback}` });
        }
      } else if (call.name === 'stageWine') {
        const args = sanitizeWineName(call.args);
        const staged = { ...args, stagedId: Date.now().toString() };
        stagedWineRef.current = staged;
        setStagedWine(staged);
        setIngestionState('STAGED');
        results.push({ result: "Wine staged. Now ask the user for price and quantity." });
      } else if (call.name === 'commitWine') {
        const currentStaged = stagedWineRef.current;
        if (!currentStaged) {
          results.push({ result: "Error: No wine staged." });
        } else {
          // Defensive bottle cap check (Rémy is premium-only, but guard anyway)
          const totalBottles = localCellar.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0);
          if (!isPremium && totalBottles + (call.args.quantity || 1) > CONFIG.FREE_TIER.MAX_BOTTLES) {
            results.push({ result: "Cannot add wine — cellar is full on the free plan. The user needs to upgrade to Premium." });
          } else {
            const finalWine = {
              ...currentStaged,
              price: call.args.price,
              quantity: call.args.quantity || 1,
              name: currentStaged.name || ''
            };
            const id = await inventoryService.addWine(finalWine as any);
            if (id) {
              enrichWine(id, finalWine as Partial<Wine>).catch(err =>
                console.error('Post-commit enrichment failed (non-blocking):', err));
            }
            setIngestionState('COMMITTED');
            stagedWineRef.current = null;
            setStagedWine(null);
            results.push({ result: `Success! Wine added to cellar with ID ${id}.` });
          }
        }
      }
    }
    return results;
  }, [localCellar, isPremium]);

  const sendMessage = useCallback(async (text: string, imageBase64?: string, isVoice: boolean = false) => {
    if (!text && !imageBase64) return;
    setIsProcessing(true);
    stopSpeaking();

    // ── Mode detection ──
    // Images always trigger cellar mode (label scan → stageWine flow needs inventory)
    let effectiveMode: 'general' | 'cellar' = chatMode;
    if (imageBase64) {
      effectiveMode = 'cellar';
      setChatMode('cellar');
    } else if (chatMode === 'general') {
      if (awaitingCellarConfirmation.current && isAffirmative(text)) {
        effectiveMode = 'cellar';
        setChatMode('cellar');
        awaitingCellarConfirmation.current = false;
      } else if (detectCellarIntent(text)) {
        effectiveMode = 'cellar';
        setChatMode('cellar');
      }
    }

    let localPrice: number | null = null;
    let localQty: number | null = null;
    const priceMatch = text.match(/\$(\d+(\.\d{2})?)/);
    const qtyMatch = text.match(/(\d+)\s*bottles?/i);
    if (priceMatch) localPrice = parseFloat(priceMatch[1]);
    if (qtyMatch) localQty = parseInt(qtyMatch[1]);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      image: imageBase64
    };
    setTranscript(prev => [...prev, userMessage]);

    try {
      const parts: any[] = [{ text: text || "Analyze this label." }];
      if (imageBase64) parts.push({ inlineData: { data: imageBase64, mimeType: 'image/jpeg' } });
      if (localPrice || localQty) {
        parts.push({ text: `[System Note: User provided potential values - Price: ${localPrice}, Qty: ${localQty}]` });
      }

      historyRef.current.push({ role: 'user', parts });

      // Enforce history turn limit to prevent unbounded context growth.
      const maxTurns = CONFIG.MAX_HISTORY_TURNS;
      const userIndices: number[] = [];
      historyRef.current.forEach((entry, i) => {
        if (entry.role === 'user') userIndices.push(i);
      });
      if (userIndices.length > maxTurns) {
        const cutIndex = userIndices[userIndices.length - maxTurns];
        historyRef.current = historyRef.current.slice(cutIndex);
      }

      // Build prompt with mode-aware inventory injection
      const includeBridge = effectiveMode === 'general' && !hasOfferedCellarBridge.current;
      const prompt = buildSystemPrompt(
        effectiveMode === 'cellar' ? cellarSnapshot : null,
        JSON.stringify(stagedWine),
        includeBridge
      );

      const toolDeclarations = [{ functionDeclarations: [
        { name: 'queryInventory', description: "Search the user's wine cellar. Use this whenever you need to find specific wines, answer questions about inventory, make food pairing recommendations, or check what's available. Always use this tool rather than relying on the cellar summary for specific wine queries.", parameters: {
          type: "OBJECT",
          properties: {
            wineType: { type: "STRING", description: "Wine type filter: Red, White, Rosé, Sparkling, Dessert, Fortified" },
            country: { type: "STRING", description: "Country filter" },
            region: { type: "STRING", description: "Region filter" },
            producer: { type: "STRING", description: "Producer name filter (partial match)" },
            grapeVarieties: { type: "ARRAY", items: { type: "STRING" }, description: "Grape variety filter" },
            vintageMin: { type: "NUMBER", description: "Minimum vintage year" },
            vintageMax: { type: "NUMBER", description: "Maximum vintage year" },
            priceMin: { type: "NUMBER", description: "Minimum price" },
            priceMax: { type: "NUMBER", description: "Maximum price" },
            maturityStatus: { type: "STRING", description: "Maturity filter: HOLD, DRINK_NOW, or PAST_PEAK" },
            query: { type: "STRING", description: "Free text search across producer, name, grape varieties, region, appellation" },
            sortBy: { type: "STRING", description: "Sort field: vintage, price, or rating" },
            sortOrder: { type: "STRING", description: "Sort direction: asc or desc" },
            limit: { type: "NUMBER", description: "Max results to return (default 10, max 20)" },
            semanticQuery: { type: "STRING", description: "Natural language description of what you're looking for. Use for food pairing queries, mood-based requests, or characteristic descriptions. Examples: 'bold earthy red for braised meat', 'crisp refreshing white for seafood'. Can be combined with structured filters." },
          },
        } },
        { name: 'stageWine', parameters: {
          type: "OBJECT",
          properties: {
            producer: { type: "STRING", description: "Wine producer/house name" },
            vintage: { type: "NUMBER", description: "Vintage year" },
            type: { type: "STRING", description: "Wine type: Red, White, Rosé, Sparkling, Dessert, Fortified" },
            name: { type: "STRING", description: "Cuvee/bottling name only — must NOT duplicate producer or grape variety" },
            grapeVarieties: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING", description: "Variety name, e.g. Shiraz" }, pct: { type: "NUMBER", description: "Percentage (optional). Integer 1-100." } }, required: ["name"] }, description: "Grape varieties, ordered by dominance. Max 5." },
            region: { type: "STRING", description: "Wine region" },
            country: { type: "STRING", description: "Country of origin" },
            appellation: { type: "STRING", description: "Appellation or classification" },
            tastingNotes: { type: "STRING", description: "Comma-separated flavour adjectives (5-8 descriptors)" },
            drinkFrom: { type: "NUMBER", description: "Suggested drink-from year" },
            drinkUntil: { type: "NUMBER", description: "Suggested drink-until year" },
            format: { type: "STRING", description: "Bottle format e.g. 750ml, 1.5L" },
          },
          required: ['producer', 'vintage', 'type'],
        } },
        { name: 'commitWine', parameters: { type: "OBJECT", properties: { price: { type: "NUMBER" }, quantity: { type: "NUMBER" } }, required: ['price'] } }
      ] }];

      // Multi-round tool call loop
      let response = await callGeminiProxy({
        model: CONFIG.MODELS.TEXT,
        contents: historyRef.current,
        systemInstruction: prompt,
        tools: toolDeclarations,
      });

      let finalContent = response.text || "";
      let toolRound = 0;

      while (response.functionCalls?.length > 0 && response.candidateContent && toolRound < MAX_TOOL_ROUNDS) {
        toolRound++;
        const calls = response.functionCalls;
        const toolResults = await handleToolCalls(calls);
        historyRef.current.push(response.candidateContent);
        historyRef.current.push({
          role: 'function',
          parts: calls.map((call: any, i: number) => ({
            functionResponse: {
              name: call.name,
              response: toolResults![i],
            },
          })),
        });

        response = await callGeminiProxy({
          model: CONFIG.MODELS.TEXT,
          contents: historyRef.current,
          systemInstruction: prompt,
          tools: toolDeclarations,
        });
        finalContent = response.text || finalContent || "Processed.";
      }

      historyRef.current.push({ role: 'model', parts: [{ text: finalContent }] });
      setTranscript(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: finalContent, timestamp: new Date() }]);

      // Track bridge offer — after first general response, mark as offered
      if (effectiveMode === 'general' && !hasOfferedCellarBridge.current) {
        hasOfferedCellarBridge.current = true;
        awaitingCellarConfirmation.current = true;
      }

      /**
       * SPEECH REQUIREMENT:
       * Speak ONLY when mic mode was used.
       */
      if (CONFIG.FEATURES.TTS_ENABLED && isVoice && finalContent) {
        speak(finalContent);
      }

    } catch (e) {
      console.error("Chat Error", e);
    } finally {
      setIsProcessing(false);
    }
  }, [cellarSnapshot, chatMode, handleToolCalls, speak, stopSpeaking]);

  const finalizeAndSubmitVoice = useCallback(() => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);

    const finalText = liveTranscriptRef.current.trim();
    if (finalText) {
      sendMessage(finalText, undefined, true);
    }

    setLiveTranscript('');
    liveTranscriptRef.current = '';
  }, [sendMessage]);

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    hasSubmittedRef.current = false;
    liveTranscriptRef.current = '';
    setLiveTranscript('');

    stopSpeaking();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }
      liveTranscriptRef.current = fullTranscript;
      setLiveTranscript(fullTranscript);

      // Reset silence timer on every result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(finalizeAndSubmitVoice, SILENCE_TIMEOUT_MS);
    };

    recognition.onend = () => {
      if (!hasSubmittedRef.current) {
        const text = liveTranscriptRef.current.trim();
        if (text) {
          finalizeAndSubmitVoice();
        } else {
          setIsRecording(false);
          setLiveTranscript('');
          liveTranscriptRef.current = '';
        }
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setLiveTranscript('');
      liveTranscriptRef.current = '';
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, [stopSpeaking, finalizeAndSubmitVoice]);

  const stopRecording = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const currentText = liveTranscriptRef.current.trim();

    if (currentText) {
      hasSubmittedRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecording(false);
      sendMessage(currentText, undefined, true);
      setLiveTranscript('');
      liveTranscriptRef.current = '';
    } else {
      hasSubmittedRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecording(false);
      setLiveTranscript('');
      liveTranscriptRef.current = '';
      stopSpeaking();
    }
  }, [sendMessage, stopSpeaking]);

  return {
    transcript,
    isSpeaking,
    isRecording,
    isProcessing,
    stagedWine,
    ingestionState,
    startRecording,
    stopRecording,
    sendMessage,
    stopSpeaking
  };
};
