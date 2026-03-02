import { authFetch } from '@/utils/authFetch';
import { FUNCTION_URLS } from '@/config/functionUrls';

export interface GeminiPayload {
  model: string;
  contents: any[];
  systemInstruction?: string;
  tools?: any[];
}

/**
 * Unified Gemini proxy caller. All Gemini API calls go through this.
 */
export async function callGeminiProxy<T = any>(
  payload: GeminiPayload,
  ErrorClass: new (msg: string, code: string) => Error = Error as any,
  signal?: AbortSignal,
): Promise<T> {
  const res = await authFetch(FUNCTION_URLS.gemini, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) {
    throw ErrorClass !== (Error as any)
      ? new ErrorClass(`Gemini proxy error: ${res.status}`, 'PROXY_ERROR')
      : new Error(`Gemini proxy error: ${res.status}`);
  }
  return res.json();
}
