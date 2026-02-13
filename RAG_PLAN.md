# Rave Cave — RAG Implementation Plan v2.1

## Purpose

Replace the full-inventory-in-prompt pattern with Retrieval-Augmented Generation. This document is the single source of truth for implementation. Each phase is a discrete Claude Code session. Complete phases in order — each depends on the last.

---

## Pre-Requisites

Before starting, confirm:

- [x] Phase 8 is stable — stageWine, commitWine, voice, and conversation flow all working without known bugs
- [x] Gemini tool call loop is reliable (even though it's single-round — Phase 0 fixes this)
- [x] You have access to the Firebase console for your project
- [x] Current Firestore structure: flat `wines` collection with Title Case field names
- [x] Current Cloud Functions: `gemini` (AI proxy) and `tts` (ElevenLabs)
- [ ] gcloud CLI installed locally (needed for Phase 5b vector index creation)

---

## Architecture Overview

```
BEFORE (current):
  User message -> buildSystemPrompt(FULL INVENTORY) -> Gemini -> response
  Tool calls: single-round only (one tool call per turn, no chaining)

AFTER (RAG):
  User message -> lightweight system prompt (cellar summary only)
    -> Gemini decides: needs wine data? -> tool call: queryInventory
    -> Cloud Function queries Firestore (structured) or vector search (semantic)
    -> results injected into conversation
    -> Gemini can chain further tool calls (e.g. queryInventory -> stageWine)
    -> final response to user
```

---

## Scope

**In scope:**
- Remy chat path (ChatInterface + useGeminiLive)
- Structured and semantic retrieval for wine queries
- Embedding generation pipeline

**Out of scope (explicitly):**
- Recommend page — has its own Gemini call pattern; RAG can be extended to it later as a follow-on task
- Extraction/scan path — separate Gemini calls for label OCR, unaffected by RAG
- TTS caching — cost optimisation, separate project entirely
- Authentication / multi-tenancy — no changes to user model
- Cloud Run migration — Cloud Functions are fine for current scale

---

## Phase Summary

| Phase | Description | Risk | Depends On |
|-------|-------------|------|------------|
| **0** | Multi-round tool call loop in useGeminiLive.ts | **High — foundational** | — | COMPLETE |
| **1** | Cellar summary function (created alongside existing, NOT replacing yet) | Low | — | COMPLETE |
| **2** | queryInventory Cloud Function | Medium | — | COMPLETE |
| **3** | Wire queryInventory as Gemini tool | Medium | Phase 0, 2 | COMPLETE |
| **4** | Slim down system prompt + swap in cellar summary + add fallback | Low | Phase 1, 3 | COMPLETE |
| **5a** | Embedding generation pipeline | Medium | Phase 2 | COMPLETE |
| **5b** | Vector search in queryInventory | High | Phase 5a | COMPLETE |
| **6** | History truncation (simplified) | Low | Phase 4 | COMPLETE |

---

## Phase 0: Multi-Round Tool Call Loop

**Status:** COMPLETE

**Goal:** Refactor the tool call handling in `useGeminiLive.ts` so Gemini can chain multiple tool calls in sequence within a single user turn (e.g., queryInventory -> stageWine).

**Why this is critical:** The current implementation handles one round of tool calls, then makes a follow-up Gemini call *without tools*, which means Gemini cannot chain tools. queryInventory was previously defined in the system prompt but deliberately removed because the loop couldn't support it. Every subsequent phase depends on this fix.

**Files touched:**
- `src/hooks/useGeminiLive.ts` — refactor sendMessage tool call loop

**Acceptance criteria:**
- Gemini can chain tool calls across multiple rounds in a single turn
- Single tool call scenarios (just stageWine, just commitWine) still work
- A turn with no tool calls works unchanged
- Safety limit (MAX_TOOL_ROUNDS = 5) prevents infinite loops
- Conversation history correctly records all tool calls and results in the chain
- No regressions in voice flow or TTS
- Realistic test: ask Remy about a wine, then say "add that one" — should chain queryInventory -> stageWine

---

## Phase 1: Cellar Summary Function

**Goal:** Create a lightweight summary of the cellar that will eventually replace the full inventory dump in the system prompt (Phase 4 does the actual swap).

**IMPORTANT:** Create `buildCellarSummary` as a NEW function alongside the existing `getCellarSnapshot()`. Do NOT delete or replace `getCellarSnapshot` yet — it stays in use until Phase 4 swaps it out. This prevents a gap where Remy loses wine detail access before queryInventory is wired (Phase 3).

**Files touched:**
- `src/services/inventoryService.ts` — add `buildCellarSummary()` (keep `getCellarSnapshot` untouched)

**Summary should include:**
- Total bottle count
- Breakdown by wine type (count per type)
- Top 5 countries, regions, producers by bottle count
- Price range (min/max)
- Vintage range
- Maturity breakdown (Hold/Drink Now/Past Peak counts)
- 3 most recently added wines (name + vintage only)

**Acceptance criteria:**
- Summary is under 300 tokens for the current cellar
- Summary includes all listed data points
- `getCellarSnapshot()` is NOT removed — still in use
- Console.log the output and verify it reads correctly
- Note: no test infrastructure (vitest/jest) exists — do not attempt unit tests

---

## Phase 2: queryInventory Cloud Function

**Goal:** Create a new Cloud Function that accepts structured filter parameters and returns matching wines from Firestore.

**Files touched:**
- `functions/src/queryInventory.ts` — new file
- `functions/src/index.ts` — export the new function

**The function should:**
1. Be an HTTPS onRequest function (same pattern as `gemini.ts`)
2. Accept POST with JSON body: `wineType`, `country`, `region`, `producer`, `grapeVarieties` (string[]), `vintageMin`, `vintageMax`, `priceMin`, `priceMax`, `maturityStatus` (HOLD/DRINK_NOW/PAST_PEAK), `query` (free text), `sortBy`, `sortOrder`, `limit` (default 10, max 20) — all optional
3. Define its own copy of FIRESTORE_FIELD_MAP (cannot import from client src/)
4. For `query` (free text), do in-memory case-insensitive substring match on Wine Name and Producer
5. For `maturityStatus`, calculate from Drink From/Drink Until against current year
6. Apply same CORS origin allowlist as `gemini.ts`
7. Set `maxInstances: 10`

**Acceptance criteria:**
- Deploys successfully to Firebase Functions
- Correct results via curl/Postman with various filter combinations
- Empty filters return all wines (up to limit)
- Handles edge cases: no results, invalid filter values

---

## Phase 3: Wire queryInventory as a Gemini Tool

**Depends on:** Phase 0 (multi-round loop) and Phase 2 (Cloud Function deployed).

**Files touched:**
- `src/constants.tsx` — add tool definition
- `src/hooks/useGeminiLive.ts` — add tool call handler with fallback

**Tool call handler should:**
- POST args to queryInventory Cloud Function URL (construct from `process.env.FIREBASE_PROJECT_ID`, same pattern as gemini proxy)
- Format results as readable text block
- On failure, return fallback: "queryInventory is temporarily unavailable. Here is a summary of the cellar instead: [buildCellarSummary output]"

**Acceptance criteria:**
- "What Italian reds do I have?" -> queryInventory tool call -> correct results
- "Show me my most expensive bottles" -> uses sortBy: price
- "How are you?" -> does NOT trigger queryInventory
- stageWine and commitWine still work exactly as before
- Temporarily break queryInventory URL -> fallback summary returned gracefully

---

## Phase 4: Slim Down the System Prompt

**Depends on:** Phase 1 (cellar summary created) and Phase 3 (queryInventory wired and working).

**Goal:** NOW swap out the full inventory listing for the compact cellar summary. This is where the token savings kick in.

**Files touched:**
- `src/constants.tsx` — modify `buildSystemPrompt()` to use summary + add RAG guidance
- `src/hooks/useGeminiLive.ts` — update call site to pass `buildCellarSummary(inventory)` instead of full listing
- `src/services/inventoryService.ts` — NOW delete `getCellarSnapshot()` (no longer needed)

**System prompt guidance to add:**
- "You have a high-level summary of the user's cellar below. For specific wine queries, recommendations, or any question about particular bottles, ALWAYS use the queryInventory tool. Do not guess or hallucinate wines."
- "You can answer general cellar questions (total bottles, types, price range) directly from the summary without using the tool."

**Acceptance criteria:**
- Console log shows system prompt under 1,000 tokens (vs previous 5,000-15,000+)
- "What wines do I have?" -> uses queryInventory tool
- "How big is my cellar?" -> answers from summary (no tool call)
- Persona, voice, style unchanged
- stageWine/commitWine flows still work
- No hallucinated wines

---

## Phase 5a: Embedding Generation

**Goal:** Generate text embeddings for each wine to enable semantic search in Phase 5b.

**Files touched:**
- `functions/src/onWineWrite.ts` — new trigger function
- `functions/src/backfillEmbeddings.ts` — new backfill function
- `functions/src/index.ts` — export both

**Key design notes:**
- `onDocumentWritten` trigger on `wines/{wineId}`
- Build text description from: producer, name, vintage, type, region, country, grapes, tasting notes, personal notes, classification, maturity
- Embed with `text-embedding-004` using existing GEMINI_API_KEY
- Store as `embedding` field (array of 768 numbers)
- Only skip re-embedding if ONLY non-descriptive fields changed (quantity, price, etc.)
- The enrichment service populates tasting notes, cepage, and drink windows AFTER initial commit. The trigger will fire twice in quick succession — this is correct. The second embedding (from enriched data) overwrites the first. Do not debounce.
- Backfill function: process in batches of 10 with 1s delay between batches

**Acceptance criteria:**
- Add/edit wine -> embedding appears within seconds
- Backfill -> all existing wines get embeddings
- Embedding is array of 768 numbers
- Quantity-only update does NOT regenerate embedding
- Tasting notes update DOES regenerate embedding

---

## Phase 5b: Vector Search in queryInventory

**Depends on:** Phase 5a + Firestore vector index created.

**Infrastructure pre-requisite:** Deploy embedding function, run backfill, then attempt a vector query. Firebase returns an error with the exact gcloud command to create the index. Run it and wait for build.

**Files touched:**
- `functions/src/queryInventory.ts` — add semantic search branch
- `src/constants.tsx` — update tool definition + prompt guidance

**Key design notes:**
- New `semanticQuery` parameter (string, optional)
- When provided: embed query with text-embedding-004, use `findNearest()` with COSINE distance
- If structured filters also provided: vector search first, then filter results in-memory (this is the EXPECTED approach, not a fallback — Firestore findNearest() has real limitations with compound queries)
- When not provided: existing structured logic unchanged

**Acceptance criteria:**
- "What would pair with mushroom risotto?" -> semanticQuery -> relevant wines
- "Show me my French wines" -> structured (country: France) -> no semantic search
- "A bold red under $50" -> combines semanticQuery + structured filters
- Structured-only queries unchanged (regression check)

---

## Phase 6: History Truncation (Simplified)

**Goal:** Prevent conversation history from growing unboundedly.

**IMPORTANT:** There is NO existing truncation logic in useGeminiLive.ts. `historyRef.current` grows via `.push()` with no pruning. `CONFIG.MAX_HISTORY_TURNS` (value: 15) exists but is never enforced. This phase implements enforcement from scratch.

**Files touched:**
- `src/hooks/useGeminiLive.ts` — add history truncation

**Design:**
- Use existing `CONFIG.MAX_HISTORY_TURNS` (15) — do NOT change the value
- Before each Gemini call, if history exceeds limit, drop oldest turns
- A "turn" = one user message + one model response (including tool calls/results in between)
- Do NOT implement summarisation — adds latency/cost for marginal benefit. Cellar summary + queryInventory make old context recoverable.
- Keep system instruction intact — only truncate conversation turns

**Acceptance criteria:**
- 25+ message conversation -> history stays bounded at 15 turns
- Gemini responds coherently (uses queryInventory to recover wine context if needed)
- Tool calls work within the window

---

## Post-Implementation Checklist

- [ ] **Multi-round tool chain:** "What Barolo do I have?" -> queries -> "Add that one" -> stages -> confirms price -> commits
- [ ] **Structured queries:** "Show me my Italian reds" -> correct results
- [ ] **Semantic queries:** "Something for a cheese board" -> relevant recommendations
- [ ] **Mixed queries:** "A bold red under $50" -> structured + semantic combined
- [ ] **Non-wine chat:** "Tell me a joke" -> no tool call
- [ ] **General cellar questions:** "How many bottles?" -> answers from summary, no tool call
- [ ] **System prompt size:** Under 1,000 tokens
- [ ] **Voice flow:** Full voice conversation works with TTS
- [ ] **stageWine/commitWine:** Label scan ingestion unchanged
- [ ] **Fallback resilience:** Break queryInventory -> graceful fallback to summary
- [ ] **Enrichment + embedding:** Commit wine -> enrichment -> embedding updates automatically

---

## Known Limitations & Future Work

- **Recommend page** — separate Gemini call pattern. RAG can extend to it later using same queryInventory + vector search.
- **Extraction/scan path** — separate Gemini Vision calls for label OCR. Unaffected.
- **TTS caching** — valid cost optimisation, separate project.
- **Full-text search** — in-memory filtering for now. Consider Algolia/Typesense at commercial scale.
- **Composite Firestore indexes** — may be needed for complex structured filters. Firebase error messages include the exact creation commands.
- **Streaming responses** — current request/response pattern maintained. Separate optimisation.

---

## Environment Variables

```bash
# No new env vars needed — queryInventory URL constructed from
# FIREBASE_PROJECT_ID (same pattern as gemini proxy URL).
# Embedding uses existing GEMINI_API_KEY secret.
```
