import { authFetch } from '@/utils/authFetch';
import { firebaseConfig } from '@/config/firebaseConfig';

const TTS_URL =
  process.env.TTS_FUNCTION_URL ||
  `https://australia-southeast1-${firebaseConfig.projectId}.cloudfunctions.net/tts`;

export const CHUNK_TIMEOUT_FIRST_MS = 8000;
export const CHUNK_TIMEOUT_MS = 5000;
const ELEVENLABS_VOICE_ID = 'EnyVcN59clJmkHKhiykg';

/**
 * Voice settings sent to the Cloud Function → ElevenLabs.
 * Tweak these to adjust pacing and naturalness.
 */
export const TTS_VOICE_SETTINGS = {
  speed: 1.15,
  stability: 0.45,
  similarity_boost: 0.70,
  style: 0.25,
  use_speaker_boost: true,
};

/**
 * Fetches audio for a single text chunk from the ElevenLabs Cloud Function.
 * Returns a blob URL pointing to the audio/mpeg response.
 */
export async function fetchElevenLabsAudio(
  text: string,
  signal?: AbortSignal
): Promise<string> {
  const response = await authFetch(TTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voiceId: ELEVENLABS_VOICE_ID,
      voiceSettings: TTS_VOICE_SETTINGS,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`TTS Cloud Function error: ${response.status}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Plays an audio/mpeg blob URL via HTMLAudioElement.
 * Resolves when playback ends. Rejects on error or abort.
 * Cleans up the blob URL in all paths.
 */
export function playAudioUrl(
  blobUrl: string,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(blobUrl);

    const cleanup = () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      // Disconnect source before revoking to prevent ERR_FILE_NOT_FOUND
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(blobUrl);
    };

    const onEnded = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('Audio playback error')); };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    if (signal) {
      signal.addEventListener('abort', () => {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }

    audio.play().catch((e) => { cleanup(); reject(e); });
  });
}
