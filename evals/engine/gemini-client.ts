/**
 * Eval Harness — Direct Gemini Client
 *
 * Bypasses the Cloud Function auth proxy — calls Gemini directly via
 * the @google/genai SDK for eval purposes (testing prompt quality, not the proxy).
 */

import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const MODEL = 'gemini-3-flash-preview';

let _ai: InstanceType<typeof GoogleGenAI> | null = null;

/**
 * Load GEMINI_API_KEY from environment or .env.local file automatically.
 */
function loadApiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  // Auto-load from .env.local at project root
  try {
    const __dir = dirname(fileURLToPath(import.meta.url));
    const envPath = resolve(__dir, '../../.env.local');
    const content = readFileSync(envPath, 'utf-8');
    const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
    if (match) {
      process.env.GEMINI_API_KEY = match[1].trim();
      return match[1].trim();
    }
  } catch { /* file not found — fall through */ }

  throw new Error('GEMINI_API_KEY not found. Add it to .env.local or set it as an environment variable.');
}

function getClient(): InstanceType<typeof GoogleGenAI> {
  if (_ai) return _ai;
  const apiKey = loadApiKey();
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
