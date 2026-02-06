
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, Mic, MicOff, Send, VolumeX, ShieldCheck, Loader2, X, Upload } from 'lucide-react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import VoiceWaveform from './VoiceWaveform';
import { Wine, Message } from '../types';
import { inventoryService } from '../services/inventoryService';
import { getRandomGreeting } from '../greetings';

interface ChatInterfaceProps {
  inventory: Wine[];
  isSynced: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ inventory, isSynced }) => {
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const greeting = getRandomGreeting();
    // Injects greeting without triggering state machine
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript, isProcessing]);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
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

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 border-b-4 border-black bg-[#2d2d2d] flex items-center justify-between shrink-0">
        <div className="flex-1">
          <h2 className="text-3xl font-display text-[#9d4edd]">Rémy Sommelier</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="font-mono text-[10px] uppercase text-gray-400">
              {isRecording ? 'Listening...' : 'Text Ready'}
            </p>
            {stagedWine && (
              <span className="bg-[#CCFF00] text-black px-2 py-0.5 rounded-sm font-mono text-[9px] font-bold animate-pulse">
                WINE STAGED: {stagedWine.producer}
              </span>
            )}
          </div>
        </div>
        
        {/* IMPROVED UX: Stop Speaking Control */}
        {isSpeaking && (
          <button 
            onClick={stopSpeaking} 
            className="flex items-center gap-2 bg-[#FF006E] border-2 border-black px-3 py-1.5 hover:bg-[#ff4d94] transition-all animate-pulse shadow-[2px_2px_0_rgba(0,0,0,1)]"
          >
            <VolumeX size={18} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-tight">Stop Rémy</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {transcript.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] border-4 border-black p-4 shadow-[4px_4px_0_rgba(0,0,0,0.3)] ${msg.role === 'user' ? 'bg-[#3d3d3d]' : 'bg-[#9d4edd]'}`}>
              <p className="text-sm font-grotesk whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isProcessing && <div className="text-[#CCFF00] font-mono text-xs animate-pulse">Rémy is thinking...</div>}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-[#2d2d2d] border-t-4 border-black">
        <div className="max-w-3xl mx-auto space-y-4">
          
          <div className="flex items-center gap-4 bg-[#1a1a1a] p-2 border-4 border-black">
            <button 
              onClick={() => setImageIntent(imageIntent === 'label' ? 'list' : 'label')}
              className={`px-3 py-1 font-mono text-[10px] uppercase border-2 border-black transition-colors ${imageIntent === 'label' ? 'bg-[#CCFF00] text-black' : 'bg-[#3d3d3d]'}`}
            >
              Mode: {imageIntent === 'label' ? 'Label Ingest' : 'Wine List'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} className="w-12 h-12 flex items-center justify-center bg-[#3d3d3d] border-4 border-black hover:bg-[#9d4edd]">
              <Camera size={24} />
            </button>

            {isRecording ? (
              <div className="flex-1 flex items-center bg-[#1a1a1a] border-4 border-[#9d4edd] px-4 py-3">
                <VoiceWaveform />
                <button
                  onClick={stopRecording}
                  className="ml-3 text-[#FF006E] transition-colors shrink-0"
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
                  className="w-full bg-[#1a1a1a] border-4 border-black px-4 py-3 font-mono text-sm focus:border-[#9d4edd] outline-none"
                />
                <button
                  onClick={() => startRecording()}
                  className="absolute right-3 top-3 text-gray-500 transition-colors"
                >
                  <Mic size={20} />
                </button>
              </div>
            )}

            <button onClick={handleSend} disabled={!input.trim()} className="w-12 h-12 bg-[#9d4edd] border-4 border-black flex items-center justify-center disabled:opacity-50 hover:bg-[#b565f2] transition-colors">
              <Send size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
