import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const ALLOWED_ORIGINS = [
  "https://rave-cave-v2.vercel.app",
  "http://localhost:3000",
];

const MODEL_ALLOWLIST = new Set([
  "gemini-3-flash-preview",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-flash-native-audio-preview-12-2025",
]);

const MAX_BODY_SIZE = 2_000_000; // ~2MB (bumped for label image extraction)
const MAX_CONTENTS_TURNS = 50;

type GeminiRequestBody = {
  model: string;
  contents: unknown[];
  systemInstruction?: string;
  tools?: unknown[];
};

export const gemini = onRequest(
  {
    region: "australia-southeast1",
    secrets: [GEMINI_API_KEY],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
  },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
      }

      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey) {
        res.status(500).send("Missing GEMINI_API_KEY secret");
        return;
      }

      const body: GeminiRequestBody = typeof req.body === "string" ?
        (JSON.parse(req.body || "{}") as GeminiRequestBody) :
        ((req.body ?? {}) as GeminiRequestBody);

      const {model, contents, systemInstruction, tools} = body;

      // Validate model against allowlist
      if (!model || !MODEL_ALLOWLIST.has(model)) {
        res.status(400).json({
          error: `Invalid model. Allowed: ${[...MODEL_ALLOWLIST].join(", ")}`,
        });
        return;
      }

      // Validate contents
      if (!Array.isArray(contents) || contents.length === 0) {
        res.status(400).json({error: "Missing or empty contents array"});
        return;
      }

      // Contents length cap
      if (contents.length > MAX_CONTENTS_TURNS) {
        res.status(400).json({
          error: `Too many turns (max ${MAX_CONTENTS_TURNS})`,
        });
        return;
      }

      // Request size cap
      const rawSize = JSON.stringify(body).length;
      if (rawSize > MAX_BODY_SIZE) {
        res.status(400).json({
          error: `Request too large (${rawSize} bytes, max ${MAX_BODY_SIZE})`,
        });
        return;
      }

      // Dynamic import: @google/genai is ESM-only
      const {GoogleGenAI} = await import("@google/genai");
      const ai = new GoogleGenAI({apiKey});

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: Record<string, any> = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;
      if (tools) config.tools = tools;

      const response = await ai.models.generateContent({
        model,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contents: contents as any,
        config,
      });

      res.status(200).json({
        text: response.text ?? null,
        functionCalls: response.functionCalls ?? null,
        candidateContent: response.candidates?.[0]?.content ?? null,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("Gemini proxy failed", {error: msg});
      res.status(500).json({error: "Gemini proxy failed", details: msg});
    }
  }
);
