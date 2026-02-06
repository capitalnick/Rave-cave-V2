
import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { inventoryService } from '../services/inventoryService';
import { Wine, StagedWine, Message, IngestionState } from '../types';
import { buildSystemPrompt, CONFIG } from '../constants';

/**
 * CADENCE & CLEANING RULES:
 * Removes punctuation patterns that cause long pauses or stuttering.
 */
const cleanTextForSpeech = (text: string): string => {
  return text
    .replace(/\.\.\./g, '.')           // Collapse ellipses
    .replace(/--/g, ',')               // Em-dash to comma
    .replace(/(\r\n|\n|\r)+/gm, ' ')   // Collapse newlines
    .replace(/[*#_]/g, '')             // Strip markdown artifacts
    .trim();
};

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
  
  // FIX: Sync transcription with UI input
  const onTranscriptionUpdate = useRef<(text: string) => void>(() => {});

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
   * Splits and kicks off immediate playback.
   */
  const speak = useCallback((text: string) => {
    stopSpeaking(); // Cancel any current or pending speech
    const cleaned = cleanTextForSpeech(text);
    const chunks = chunkText(cleaned);
    ttsQueueRef.current = chunks;
    processTTSQueue();
  }, [stopSpeaking, processTTSQueue]);

  // Handle voice submission cleanup and cancellation
  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  const handleToolCalls = useCallback(async (calls: any[]) => {
    const results = [];
    for (const call of calls) {
      if (call.name === 'stageWine') {
        const args = call.args;
        setStagedWine({ ...args, stagedId: Date.now().toString() });
        setIngestionState('STAGED');
        results.push({ result: "Wine staged. Now ask the user for price and quantity." });
      } else if (call.name === 'commitWine') {
        if (!stagedWine) {
          results.push({ result: "Error: No wine staged." });
        } else {
          const finalWine = {
            ...stagedWine,
            price: call.args.price,
            quantity: call.args.quantity || 1,
            name: stagedWine.name || "Unknown Label"
          };
          const id = await inventoryService.addWine(finalWine as any);
          setIngestionState('COMMITTED');
          setStagedWine(null);
          results.push({ result: `Success! Wine added to cellar with ID ${id}.` });
        }
      }
    }
    return results;
  }, [stagedWine]);

  const sendMessage = useCallback(async (text: string, imageBase64?: string, isVoice: boolean = false) => {
    if (!text && !imageBase64) return;
    setIsProcessing(true);
    stopSpeaking();

    // Create a new instance right before the call to ensure up-to-date config
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

      const response = await ai.models.generateContent({
        model: CONFIG.MODELS.TEXT,
        contents: historyRef.current,
        config: {
          systemInstruction: prompt,
          tools: [{ functionDeclarations: [
            { name: 'stageWine', parameters: { type: Type.OBJECT, properties: { producer: { type: Type.STRING }, vintage: { type: Type.NUMBER }, type: { type: Type.STRING } } } },
            { name: 'commitWine', parameters: { type: Type.OBJECT, properties: { price: { type: Type.NUMBER }, quantity: { type: Type.NUMBER } }, required: ['price'] } }
          ] }]
        }
      });

      const candidate = response.candidates?.[0];
      // FIX: Use response.functionCalls property directly as per guidelines
      const toolCalls = response.functionCalls;

      let finalContent = response.text || "";

      if (toolCalls && toolCalls.length > 0) {
        const toolResults = await handleToolCalls(toolCalls);
        historyRef.current.push(candidate.content);
        historyRef.current.push({ role: 'user', parts: [{ text: `Tool Output: ${JSON.stringify(toolResults)}` }] });
        
        const finalRes = await ai.models.generateContent({
          model: CONFIG.MODELS.TEXT,
          contents: historyRef.current,
          config: { systemInstruction: prompt }
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
  }, [cellarSnapshot, stagedWine, handleToolCalls, speak, stopSpeaking]);

  const startRecording = useCallback((onUpdate: (t: string) => void) => {
    onTranscriptionUpdate.current = onUpdate;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Mic toggle cancels current speech
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
      setLiveTranscript(current);
      // Calls the passed in onUpdate (setInput) from ChatInterface
      onTranscriptionUpdate.current(current);
    };

    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, [stopSpeaking]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    if (liveTranscript) {
      sendMessage(liveTranscript, undefined, true);
    }
    setLiveTranscript('');
  }, [liveTranscript, sendMessage]);

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
