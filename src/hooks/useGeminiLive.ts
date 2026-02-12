
import { useState, useRef, useCallback, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { Wine, StagedWine, Message, IngestionState } from '../types';
import { buildSystemPrompt, CONFIG } from '../constants';
import { fetchElevenLabsAudio, playAudioUrl, CHUNK_TIMEOUT_FIRST_MS, CHUNK_TIMEOUT_MS } from '../services/ttsService';
import { formatForSpeech } from '../services/ttsFormatter';

const GEMINI_PROXY_URL = process.env.GEMINI_PROXY_URL ||
  `https://australia-southeast1-${process.env.FIREBASE_PROJECT_ID}.cloudfunctions.net/gemini`;

async function callGeminiProxy(body: { model: string; contents: any[]; systemInstruction?: string; tools?: any[] }) {
  const res = await fetch(GEMINI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini proxy error: ${res.status}`);
  return res.json();
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
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [stagedWine, setStagedWine] = useState<StagedWine | null>(null);
  const [ingestionState, setIngestionState] = useState<IngestionState>('IDLE');
  
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
    utterance.rate = 1.25; // SNAPPY CADENCE
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
      if (call.name === 'stageWine') {
        const args = call.args;
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
          const finalWine = {
            ...currentStaged,
            price: call.args.price,
            quantity: call.args.quantity || 1,
            name: currentStaged.name || "Unknown Label"
          };
          const id = await inventoryService.addWine(finalWine as any);
          setIngestionState('COMMITTED');
          stagedWineRef.current = null;
          setStagedWine(null);
          results.push({ result: `Success! Wine added to cellar with ID ${id}.` });
        }
      }
    }
    return results;
  }, []);

  const sendMessage = useCallback(async (text: string, imageBase64?: string, isVoice: boolean = false) => {
    if (!text && !imageBase64) return;
    setIsProcessing(true);
    stopSpeaking();

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
      const prompt = buildSystemPrompt(cellarSnapshot, JSON.stringify(stagedWine));

      const response = await callGeminiProxy({
        model: CONFIG.MODELS.TEXT,
        contents: historyRef.current,
        systemInstruction: prompt,
        tools: [{ functionDeclarations: [
          { name: 'stageWine', parameters: { type: "OBJECT", properties: { producer: { type: "STRING" }, vintage: { type: "NUMBER" }, type: { type: "STRING" } } } },
          { name: 'commitWine', parameters: { type: "OBJECT", properties: { price: { type: "NUMBER" }, quantity: { type: "NUMBER" } }, required: ['price'] } }
        ] }]
      });

      const toolCalls = response.functionCalls;
      let finalContent = response.text || "";

      if (toolCalls && toolCalls.length > 0 && response.candidateContent) {
        const toolResults = await handleToolCalls(toolCalls);
        historyRef.current.push(response.candidateContent);
        historyRef.current.push({ role: 'user', parts: [{ text: `Tool Output: ${JSON.stringify(toolResults)}` }] });

        const finalRes = await callGeminiProxy({
          model: CONFIG.MODELS.TEXT,
          contents: historyRef.current,
          systemInstruction: prompt,
        });
        finalContent = finalRes.text || "Processed.";
      }

      historyRef.current.push({ role: 'model', parts: [{ text: finalContent }] });
      setTranscript(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: finalContent, timestamp: new Date() }]);

      /**
       * SPEECH REQUIREMENT:
       * Speak ONLY when mic mode was used.
       */
      if (isVoice && finalContent) {
        speak(finalContent);
      }

    } catch (e) {
      console.error("Chat Error", e);
    } finally {
      setIsProcessing(false);
    }
  }, [cellarSnapshot, handleToolCalls, speak, stopSpeaking]);

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
      let current = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      liveTranscriptRef.current = current;
      setLiveTranscript(current);

      // Reset silence timer on every result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(finalizeAndSubmitVoice, 2000);
    };

    recognition.onend = () => {
      if (!hasSubmittedRef.current) {
        setIsRecording(false);
        setLiveTranscript('');
        liveTranscriptRef.current = '';
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

    if (liveTranscriptRef.current.trim()) {
      finalizeAndSubmitVoice();
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
  }, [finalizeAndSubmitVoice, stopSpeaking]);

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
