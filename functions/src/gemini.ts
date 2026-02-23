import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {validateAuth, AuthError} from "./authMiddleware";
import {ALLOWED_ORIGINS} from "./cors";
import {checkRateLimit, RATE_LIMITS} from "./rateLimit";
import {logUsage} from "./usageLog";

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

const MODEL_ALLOWLIST = new Set([
  "gemini-3-flash-preview",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-flash-native-audio-preview-12-2025",
]);

const MAX_BODY_SIZE = 10_000_000; // ~10MB (multi-page wine list image payloads)
const MAX_CONTENTS_TURNS = 50;

type GeminiRequestBody = {
  model: string;
  contents: unknown[];
  systemInstruction?: string;
  tools?: unknown[];
};

// eslint-disable-next-line valid-jsdoc
/** Shared validation + setup used by both gemini and geminiStream */
async function parseAndValidate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any, res: any
): Promise<{ body: GeminiRequestBody; apiKey: string; uid: string } | null> {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return null;
  }

  let uid: string;
  try {
    uid = await validateAuth(req);
  } catch (e) {
    if (e instanceof AuthError) {
      res.status(401).json({error: "Unauthorized"});
      return null;
    }
    throw e;
  }

  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) {
    res.status(500).send("Missing GEMINI_API_KEY secret");
    return null;
  }

  const body: GeminiRequestBody = typeof req.body === "string" ?
    (JSON.parse(req.body || "{}") as GeminiRequestBody) :
    ((req.body ?? {}) as GeminiRequestBody);

  const {model, contents} = body;

  if (!model || !MODEL_ALLOWLIST.has(model)) {
    res.status(400).json({
      error: `Invalid model. Allowed: ${[...MODEL_ALLOWLIST].join(", ")}`,
    });
    return null;
  }

  if (!Array.isArray(contents) || contents.length === 0) {
    res.status(400).json({error: "Missing or empty contents array"});
    return null;
  }

  if (contents.length > MAX_CONTENTS_TURNS) {
    res.status(400).json({
      error: `Too many turns (max ${MAX_CONTENTS_TURNS})`,
    });
    return null;
  }

  const rawSize = JSON.stringify(body).length;
  if (rawSize > MAX_BODY_SIZE) {
    res.status(400).json({
      error: `Request too large (${rawSize} bytes, max ${MAX_BODY_SIZE})`,
    });
    return null;
  }

  return {body, apiKey, uid};
}

// ── Non-streaming endpoint (used by Remy chat, scan, enrichment) ──

export const gemini = onRequest(
  {
    region: "australia-southeast1",
    secrets: [GEMINI_API_KEY],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
  },
  async (req, res) => {
    try {
      const result = await parseAndValidate(req, res);
      if (!result) return;
      const {body, apiKey, uid} = result;

      const allowed = await checkRateLimit(uid, "gemini", RATE_LIMITS.gemini);
      if (!allowed) {
        res.status(429).json({error: "Rate limit exceeded. Try again later."});
        return;
      }
      const {model, contents, systemInstruction, tools} = body;

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

      logUsage(uid, "geminiCalls");
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

// ── Streaming SSE endpoint (used by recommendations) ──

export const geminiStream = onRequest(
  {
    region: "australia-southeast1",
    secrets: [GEMINI_API_KEY],
    cors: ALLOWED_ORIGINS,
    timeoutSeconds: 60,
  },
  async (req, res) => {
    try {
      const result = await parseAndValidate(req, res);
      if (!result) return;
      const {body, apiKey, uid} = result;

      const allowed = await checkRateLimit(
        uid, "geminiStream", RATE_LIMITS.geminiStream
      );
      if (!allowed) {
        res.status(429).json({error: "Rate limit exceeded. Try again later."});
        return;
      }
      const {model, contents, systemInstruction} = body;

      const {GoogleGenAI} = await import("@google/genai");
      const ai = new GoogleGenAI({apiKey});

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config: Record<string, any> = {};
      if (systemInstruction) config.systemInstruction = systemInstruction;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      try {
        const streamResponse = await ai.models.generateContentStream({
          model,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contents: contents as any,
          config,
        });

        // Bracket-depth tracker to extract top-level JSON objects
        let buffer = "";
        let depth = 0;
        let inString = false;
        let escaped = false;
        let objStart = -1;
        let objectCount = 0;

        for await (const chunk of streamResponse) {
          const text = chunk.text ?? "";
          if (!text) continue;

          for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            buffer += ch;

            if (escaped) {
              escaped = false;
              continue;
            }
            if (ch === "\\") {
              escaped = true;
              continue;
            }
            if (ch === "\"") {
              inString = !inString;
              continue;
            }
            if (inString) continue;

            if (ch === "{") {
              if (depth === 0) objStart = buffer.length - 1;
              depth++;
            } else if (ch === "}") {
              depth--;
              if (depth === 0 && objStart >= 0) {
                const objStr = buffer.substring(objStart);
                try {
                  const parsed = JSON.parse(objStr);
                  res.write(`data: ${JSON.stringify(parsed)}\n\n`);
                  objectCount++;
                } catch {
                  // incomplete/invalid — skip
                }
                objStart = -1;
              }
            }
          }
        }

        // If no objects extracted, send full text as fallback
        if (objectCount === 0) {
          res.write(`data: ${JSON.stringify({_fallback: buffer})}\n\n`);
        }

        logUsage(uid, "geminiStreamCalls");
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (streamErr: unknown) {
        const streamMsg = streamErr instanceof Error ?
          streamErr.message : String(streamErr);
        logger.error("Gemini stream failed", {error: streamMsg});
        res.write(
          `event: error\ndata: ${JSON.stringify({error: streamMsg})}\n\n`
        );
        res.end();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.error("Gemini stream proxy failed", {error: msg});
      res.status(500).json({error: "Gemini stream failed", details: msg});
    }
  }
);
