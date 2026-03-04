import { authFetch } from '@/utils/authFetch';
import { FUNCTION_URLS } from '@/config/functionUrls';

export interface FeedbackPayload {
  message: string;
  category: 'bug' | 'suggestion' | null;
  route: string;
  userAgent: string;
  appVersion: string;
  isPremium: boolean;
}

export async function submitFeedback(data: FeedbackPayload): Promise<void> {
  const res = await authFetch(FUNCTION_URLS.submitFeedback, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(body.error || `Feedback error: ${res.status}`);
  }
}
