import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {Readable} from "stream";
import type {ReadableStream as NodeWebReadableStream} from "stream/web";

const ELEVENLABS_API_KEY = defineSecret("ELEVENLABS_API_KEY");
const ELEVENLABS_VOICE_ID = defineSecret("ELEVENLABS_VOICE_ID");

type VoiceSettings = {
  speed?: number;
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
};

type TtsBody = {
  text?: string;
  voiceId?: string;
  voiceSettings?: VoiceSettings;
};

export const tts = onRequest(
  {
    region: "australia-southeast1",
    secrets: [ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID],
    cors: true,
    timeoutSeconds: 60,
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
      }

      const apiKey = ELEVENLABS_API_KEY.value();
      const defaultVoiceId = ELEVENLABS_VOICE_ID.value();

      if (!apiKey) {
        res.status(500).send("Missing ELEVENLABS_API_KEY secret");
        return;
      }

      const body: TtsBody = typeof req.body === "string" ?
        (JSON.parse(req.body || "{}") as TtsBody) :
        ((req.body ?? {}) as TtsBody);

      const text = body.text;
      const voiceId = body.voiceId;
      const clientSettings = body.voiceSettings;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        res.status(400).json({error: "Missing text"});
        return;
      }

      if (text.length > 2000) {
        res.status(400).json({error: "Text too long (max 2000 chars)"});
        return;
      }

      const chosenVoice = voiceId || defaultVoiceId;

      if (!chosenVoice) {
        res
          .status(400)
          .json({error: "Missing voiceId and no default configured"});
        return;
      }

      const url =
        "https://api.elevenlabs.io/v1/text-to-speech/" +
        encodeURIComponent(chosenVoice);

      const defaultSettings: VoiceSettings = {
        stability: 0.35,
        similarity_boost: 0.8,
        style: 0.25,
        use_speaker_boost: true,
      };

      const mergedSettings = {...defaultSettings, ...clientSettings};

      // ElevenLabs expects speed at the top level, not inside voice_settings
      const {speed, ...voiceSettings} = mergedSettings;

      const elevenBody: Record<string, unknown> = {
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: voiceSettings,
      };
      if (speed !== undefined) {
        elevenBody.speed = speed;
      }

      const elevenResp = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify(elevenBody),
      });

      if (!elevenResp.ok) {
        const details = await elevenResp.text();

        logger.error("ElevenLabs error", {
          status: elevenResp.status,
          details,
        });

        res.status(elevenResp.status).json({
          error: "ElevenLabs error",
          details,
        });
        return;
      }

      if (!elevenResp.body) {
        res.status(500).json({
          error: "ElevenLabs returned empty audio stream",
        });
        return;
      }

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-store");

      // fetch() returns a WHATWG ReadableStream;
      // convert to a Node.js Readable and pipe to the response.
      const webStream =
        elevenResp.body as unknown as NodeWebReadableStream;
      Readable.fromWeb(webStream).pipe(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);

      logger.error("TTS function failed", {error: msg});

      res.status(500).json({
        error: "TTS function failed",
        details: msg,
      });
    }
  }
);
