
import { useState, useCallback, useRef, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { Wine } from '../types';

const gemini = new GeminiService();

/**
 * Decodes raw PCM audio data into an AudioBuffer.
 * The Gemini TTS API returns raw 16-bit PCM data at 24000Hz.
 */
async function decodeRawPCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert 16-bit signed integer to float range [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const useRemy = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; id: string }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);
  // Fix: Use number for browser-side setTimeout reference
  const silenceTimerRef = useRef<number | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        // We detect speech, so reset silence timer
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        
        // Start silence timer
        silenceTimerRef.current = window.setTimeout(() => {
          stopRecordingAndSend(transcript);
        }, 2000);
      };

      recognition.onerror = (event: any) => {
        console.error("Recognition Error", event.error);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const stopRecordingAndSend = (text: string) => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    if (text.trim()) {
      sendMessage(text);
    }
  };

  const playAudio = async (base64: string) => {
    try {
      if (!audioContextRef.current) {
        // Gemini 2.5 TTS uses 24000Hz sample rate
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      // Stop previous audio
      if (currentAudioSourceRef.current) {
        try {
          currentAudioSourceRef.current.stop();
        } catch (e) {
          // Ignore errors if already stopped
        }
      }

      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Use custom decoder for raw PCM data returned by Gemini TTS
      const audioBuffer = await decodeRawPCM(bytes, audioContextRef.current, 24000, 1);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      currentAudioSourceRef.current = source;
    } catch (err) {
      console.error("Audio Playback Error:", err);
    }
  };

  const sendMessage = useCallback(async (text: string, imageBase64?: string) => {
    const messageId = Date.now().toString();
    setMessages(prev => [...prev, { role: 'user', text: text || "[Image]", id: messageId }]);
    setIsThinking(true);

    try {
      const response = await gemini.sendMessage(text, imageBase64);
      setMessages(prev => [...prev, { role: 'model', text: response.text, id: `model-${Date.now()}` }]);
      if (response.audioData) {
        playAudio(response.audioData);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Pardonnez-moi, I had a slight technological hiccup. Could you repeat that?", id: `error-${Date.now()}` }]);
    } finally {
      setIsThinking(false);
    }
  }, []);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return {
    messages,
    isThinking,
    isRecording,
    volume,
    sendMessage,
    startRecording,
    stopRecording
  };
};
