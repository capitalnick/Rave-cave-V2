
import { GoogleGenAI, Type, FunctionDeclaration, Modality } from "@google/genai";
import { SYSTEM_PROMPT, buildSystemPrompt } from "../constants";
import { Wine } from "../types";
import { inventoryService } from "./inventoryService";

const stageWineTool: FunctionDeclaration = {
  name: 'stageWine',
  description: 'Stages wine details extracted from a label for confirmation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      producer: { type: Type.STRING },
      name: { type: Type.STRING },
      vintage: { type: Type.NUMBER },
      type: { type: Type.STRING, enum: ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified'] },
      cepage: { type: Type.STRING },
      region: { type: Type.STRING },
      country: { type: Type.STRING },
      drinkFrom: { type: Type.NUMBER },
      drinkUntil: { type: Type.NUMBER },
      maturity: { type: Type.STRING, enum: ['Hold', 'Drink Now', 'Past Peak'] },
      tastingNotes: { type: Type.STRING },
    },
    required: ['producer', 'name', 'vintage', 'type']
  }
};

const queryInventoryTool: FunctionDeclaration = {
  name: 'queryInventory',
  description: 'Search the wine cellar inventory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING },
      country: { type: Type.STRING },
      producer: { type: Type.STRING },
      maturity: { type: Type.STRING },
    }
  }
};

const commitWineTool: FunctionDeclaration = {
  name: 'commitWine',
  description: 'Commits a staged wine to the cellar.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      price: { type: Type.NUMBER },
      quantity: { type: Type.NUMBER }
    },
    required: ['price']
  }
};

// Fixed: Using gemini-3-flash-preview as per guidelines for basic text tasks
const GEMINI_MODEL = 'gemini-3-flash-preview';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export class GeminiService {
  private stagedWine: Partial<Wine> | null = null;
  private history: any[] = [];
  private MAX_HISTORY = 10;
  inventoryContext: string = "";
  // Fixed: Corrected initialization with named parameter as per @google/genai guidelines
  private ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  private browserSpeak(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang.startsWith('fr') || v.name.includes('Thomas'));
    if (frVoice) utterance.voice = frVoice;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  private async generateSpeech(text: string): Promise<string | undefined> {
    try {
      const response = await this.ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: `Say this with a sophisticated, charming, energetic French male sommelier accent. You are Rémy: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e: any) {
      console.error("TTS Error:", e);
      if (e.message?.includes('429')) {
        this.browserSpeak(text);
      }
      return undefined;
    }
  }

  async sendMessage(
    message: string,
    imageBase64?: string,
    shouldGenerateAudio: boolean = true
  ): Promise<{ text: string; audioData?: string; staged?: Partial<Wine> }> {
    try {
      if (this.history.length > this.MAX_HISTORY) {
        this.history = this.history.slice(-this.MAX_HISTORY);
      }

      const currentParts: any[] = [];
      if (imageBase64) {
        currentParts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
      }
      currentParts.push({ text: message || "Analyze this image or respond to me." });
      
      const contents = [...this.history, { role: 'user', parts: currentParts }];

      const result = await this.ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction: this.inventoryContext
            ? buildSystemPrompt(this.inventoryContext)
            : SYSTEM_PROMPT,
          tools: [{ functionDeclarations: [stageWineTool, queryInventoryTool, commitWineTool] }]
        }
      });

      const candidate = result.candidates?.[0];
      // Fixed: Directly access functionCalls from result object as per @google/genai guidelines
      const functionCalls = result.functionCalls;

      let responseText = result.text || "";

      if (functionCalls && functionCalls.length > 0 && candidate?.content) {
        let followUpMessage = "";

        for (const call of functionCalls) {
          if (call.name === 'stageWine') {
            this.stagedWine = call.args as Partial<Wine>;
            followUpMessage = `The wine has been staged: ${JSON.stringify(this.stagedWine)}. Acknowledge this details as Rémy the Sommelier and ask the user for the price to finalize.`;
          } else if (call.name === 'queryInventory') {
            const inventory = await inventoryService.getInventory();
            const args = call.args as any;
            const filtered = inventory.filter(w => {
              if (args.type && w.type !== args.type) return false;
              if (args.maturity && w.maturity !== args.maturity) return false;
              if (args.country && w.country !== args.country) return false;
              return true;
            }).slice(0, 5);
            followUpMessage = `Inventory search result: ${JSON.stringify(filtered)}. Summarize this for the user with your French sommelier flair.`;
          } else if (call.name === 'commitWine') {
            if (this.stagedWine) {
              const args = call.args as any;
              const final = {
                ...this.stagedWine,
                price: args.price,
                quantity: args.quantity || 1,
                name: this.stagedWine.name || "Unknown Label"
              } as Omit<Wine, 'id'>;
              await inventoryService.addWine(final);
              this.stagedWine = null;
              followUpMessage = "The wine is successfully added to the cellar database. Confirm this with joy and appreciation.";
            } else {
              followUpMessage = "Ah, it seems no wine was staged. Please show me the label again, s'il vous plaît.";
            }
          }
        }

        const systemPrompt = this.inventoryContext
          ? buildSystemPrompt(this.inventoryContext)
          : SYSTEM_PROMPT;

        const toolRes = await this.ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [...contents, candidate.content, { role: 'user', parts: [{ text: followUpMessage }] }],
          config: { systemInstruction: systemPrompt }
        });

        responseText = toolRes.text || "I have processed your request.";
        this.history.push({ role: 'user', parts: currentParts });
        this.history.push({ role: 'model', parts: toolRes.candidates?.[0]?.content?.parts || [{ text: responseText }] });
      } else {
        this.history.push({ role: 'user', parts: currentParts });
        this.history.push({ role: 'model', parts: [{ text: responseText }] });
      }

      let audioData: string | undefined = undefined;
      if (shouldGenerateAudio && responseText) {
        audioData = await this.generateSpeech(responseText);
      }
      
      return { text: responseText, audioData, staged: this.stagedWine || undefined };
    } catch (error: any) {
      console.error("Gemini Brain Error:", error);
      if (error.message?.includes('429')) {
        return { text: "Désolé, my brain is a bit over-tasted at the moment! I've reached my quota limits. One moment, s'il vous plaît.", staged: this.stagedWine || undefined };
      }
      throw error;
    }
  }
}
