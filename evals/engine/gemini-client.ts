/**
 * Eval Harness — Direct Gemini Client
 *
 * Bypasses the Cloud Function auth proxy — calls Gemini directly via
 * the @google/genai SDK for eval purposes (testing prompt quality, not the proxy).
 */

import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-3-flash-preview';

let _ai: InstanceType<typeof GoogleGenAI> | null = null;

function getClient(): InstanceType<typeof GoogleGenAI> {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required. Set it before running evals.');
  }
  _ai = new GoogleGenAI({ apiKey });
  return _ai;
}

export interface GeminiRequest {
  contents: any[];
  systemInstruction: string;
  tools?: any[];
  model?: string;
}

export interface GeminiResponse {
  text: string;
  functionCalls: any[] | null;
  candidateContent: any | null;
}

/**
 * Calls Gemini directly, mirroring the cloud function's generateContent pattern.
 */
export async function callGeminiDirect(req: GeminiRequest): Promise<GeminiResponse> {
  const ai = getClient();
  const model = req.model || MODEL;

  const response = await ai.models.generateContent({
    model,
    contents: req.contents,
    config: {
      systemInstruction: req.systemInstruction,
      tools: req.tools,
    },
  });

  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text);
  const text = textParts.join('');

  const functionCalls = parts
    .filter((p: any) => p.functionCall)
    .map((p: any) => ({
      name: p.functionCall.name,
      args: p.functionCall.args || {},
    }));

  return {
    text,
    functionCalls: functionCalls.length > 0 ? functionCalls : null,
    candidateContent: candidate?.content || null,
  };
}

/**
 * Lightweight Gemini call for the LLM judge (no tools).
 */
export async function callGeminiJudge(systemPrompt: string, userPrompt: string): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
    },
  });

  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  return parts.filter((p: any) => p.text).map((p: any) => p.text).join('');
}
