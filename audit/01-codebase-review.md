# Remy Sommelier AI — Codebase Review

**Date**: 2026-02-16
**Scope**: Static analysis of the Remy conversational pipeline — system prompt, tool loop, data flow, response parsing, and supporting services.

---

## 1. Architecture Overview

Remy's pipeline has 5 key stages:

```
User Input → useGeminiLive.sendMessage()
  → Gemini Proxy (Cloud Function)
    → [Tool Call Loop: queryInventory / stageWine / commitWine]
  → Final Response (markdown + wine cards)
    → remyParser.ts → RemyWineCard rendering
    → TTS pipeline (ElevenLabs / browser fallback)
```

**Key files:**
| File | Role |
|------|------|
| `src/hooks/useGeminiLive.ts` | Core chat hook — tool loop, history, TTS |
| `src/constants.tsx:78-140` | `buildSystemPrompt()` — Remy's personality + instructions |
| `functions/src/queryInventory.ts` | Cloud Function — structured + semantic wine search |
| `src/utils/remyParser.ts` | Parses ` ```wine ` fenced blocks into card data |
| `src/components/remy/RemyWineCard.tsx` | Renders wine recommendation cards |
| `src/services/inventoryService.ts` | Client-side cellar operations + summary builder |
| `src/services/recommendService.ts` | Separate recommendation pipeline (Recommend tab) |
| `functions/src/onWineWrite.ts` | Embedding pipeline — generates vectors on wine write |
| `src/services/enrichmentService.ts` | Post-commit enrichment (tasting notes, drink window, cepage, rating) |

---

## 2. System Prompt Analysis

**Location**: `src/constants.tsx:78-140` — `buildSystemPrompt(inventoryContext, stagedWineJson?)`

### What It Does Well
- Clear persona definition ("Rémy, expert French sommelier")
- Explicit wine name rules (prevents producer/cepage duplication in `name`)
- Ingestion flow is well-documented (stage → confirm → price → commit)
- Response format instructions with wine card JSON schema
- Tool descriptions with usage guidance (structured vs semantic)

### Gaps Identified

| Gap | Impact | Lines |
|-----|--------|-------|
| **No enforcement that Remy must query before recommending** | Model can answer from summary alone, hallucinating specific bottles | 108 |
| **"Use Drink Now to drive recommendations" is vague** | No instruction on HOW to prioritize maturity | 128 |
| **No price-tier guidance** | Remy doesn't know if $20 is cheap or $200 is expensive in this cellar | — |
| **No diversity instruction** | Nothing prevents recommending the same wines repeatedly | — |
| **No quantity awareness** | Remy might recommend a wine the user only has 1 bottle of for a party of 8 | — |
| **Summary description says "general cellar questions"** but doesn't define the boundary | Model decides when to search vs answer from memory | 107-108 |
| **No instruction to surface ALL relevant data** | Even if Remy gets rich data, nothing tells it to mention tasting notes or drink windows in its response | — |

### Cellar Summary Injection

The prompt injects `inventoryContext` (from `buildCellarSummary()`) which contains:
- Total bottles, type breakdown, top 5 countries/regions/producers
- Price range, vintage range, maturity breakdown
- 3 most recent additions

**No individual wines are listed.** This is by design — prevents token bloat — but means Remy has zero knowledge of specific bottles without calling `queryInventory`.

---

## 3. Tool Declarations

**Location**: `useGeminiLive.ts:324-364`

### queryInventory
- **Parameters**: wineType, country, region, producer, grapeVarieties, vintageMin/Max, priceMin/Max, maturityStatus, query, sortBy, sortOrder, limit, semanticQuery
- **Description**: Tells model to "Always use this tool rather than relying on the cellar summary for specific wine queries"
- **Observation**: Good parameter coverage. The `semanticQuery` parameter enables vector search, which is the right approach for pairing/mood queries.

### stageWine
- **Parameters**: producer (req), vintage (req), type (req), name, cepage, region, country, appellation, tastingNotes, drinkFrom, drinkUntil, format
- **Observation**: Rich schema — covers all enrichable fields. Good.

### commitWine
- **Parameters**: price (req), quantity
- **Observation**: Minimal, correct.

---

## 4. queryInventory Cloud Function — What It Returns

**Location**: `functions/src/queryInventory.ts`

The CF uses `docToWine()` (line 73-82) which maps ALL Firestore fields to client keys via `FIELD_MAP`. The returned wine objects contain:

```
id, producer, name, vintage, type, cepage, appellation, region, country,
quantity, drinkFrom, drinkUntil, maturity, tastingNotes, myRating,
vivinoRating, personalNote, imageUrl, price, format, processingStatus
```

**This is the full wine object.** Every field that exists in Firestore is returned.

### Two Search Paths

1. **Semantic path** (when `semanticQuery` is provided): Embeds the query with `gemini-embedding-001` (768 dims), runs `findNearest` on Firestore vector index, fetches `candidateLimit = min(limit * 3, 60)` candidates, then applies in-memory filters.

2. **Structured path** (no `semanticQuery`): Fetches all wines where Producer != "", applies all filters in-memory (avoids composite index requirements).

Both paths apply identical in-memory filtering: wineType, country, region, producer (partial match), grapeVarieties (partial match on cepage), vintage range, price range, maturityStatus (computed from drinkFrom/Until), query (text search across 5 fields), sort, then limit.

---

## 5. Tool Result Formatting — THE CRITICAL DATA LOSS

**Location**: `useGeminiLive.ts:236-238`

```typescript
const formatted = wines.map((w: any) =>
  `${w.producer}${w.name ? ' ' + w.name : ''} ${w.vintage || 'NV'} — ${w.type || ''}, ${w.region || ''}${w.country ? ', ' + w.country : ''} — $${w.price || 0} — Qty: ${w.quantity || 1} — ${w.maturity || 'Unknown'}`
).join('\n');
```

### What Remy SEES (after formatting):
```
Penfolds Bin 389 2019 — Red, South Australia, Australia — $85 — Qty: 2 — Drink Now
```

### What queryInventory RETURNED (before formatting):
```json
{
  "id": "abc123",
  "producer": "Penfolds",
  "name": "Bin 389",
  "vintage": 2019,
  "type": "Red",
  "cepage": "Cabernet Sauvignon / Shiraz",
  "appellation": "South Australia",
  "region": "South Australia",
  "country": "Australia",
  "quantity": 2,
  "drinkFrom": 2024,
  "drinkUntil": 2035,
  "maturity": "Drink Now",
  "tastingNotes": "Structured, dark fruit, graphite, firm tannins, long finish",
  "vivinoRating": 88,
  "price": 85,
  "format": "750ml"
}
```

### Fields DISCARDED by formatting:
| Field | What Remy Loses |
|-------|----------------|
| `tastingNotes` | Cannot describe flavour profiles without hallucinating |
| `cepage` | Cannot identify grape varieties or make varietal-based pairings |
| `vivinoRating` | Cannot compare quality or recommend "best" wines |
| `drinkFrom` / `drinkUntil` | Cannot give specific drink window advice (only gets "Drink Now/Hold/Past Peak") |
| `appellation` | Cannot discuss classification or terroir specificity |
| `format` | Cannot account for magnum vs standard |
| `myRating` | Cannot use user's own ratings for personalization |
| `personalNote` | Cannot reference user's own tasting notes |

**This is the single biggest problem.** The system prompt at line 137 says "ALWAYS include tastingNotes and drinkFrom/drinkUntil" in wine cards, but Remy never receives this data from tool results. It is forced to hallucinate or omit these fields.

### How Tool Results Are Injected

**Location**: `useGeminiLive.ts:381`

```typescript
historyRef.current.push({
  role: 'user',
  parts: [{ text: `Tool Output: ${JSON.stringify(toolResults)}` }]
});
```

Tool results are injected as **user messages**, not as proper function response parts. The Gemini API supports `functionResponse` parts, but this implementation wraps them in a user turn with `Tool Output:` prefix. This may reduce the model's ability to distinguish tool data from user conversation.

---

## 6. Response Parsing

**Location**: `src/utils/remyParser.ts`

### Wine Card Extraction
- Uses regex to find ` ```wine ` fenced code blocks
- Parses JSON inside the fence
- Validates: `typeof w.producer === 'string' && typeof w.name === 'string'` (line 52-53)

### Name Validation Issue
The filter `typeof w.name === 'string'` passes for empty string `""`. This means:
- Wine cards with `name: ""` pass validation
- `RemyWineCard.tsx:15-17` displays `displayName = wine.vintage ? `${wine.name} ${wine.vintage}` : wine.name`
- When `name` is empty: displayName = `" 2019"` (leading space + vintage) or `""` (no vintage)

### RemyWineData Interface
```typescript
interface RemyWineData {
  producer: string;        // required
  name: string;            // required (but can be empty)
  vintage?: number;
  region?: string;
  country?: string;
  type?: string;
  cepage?: string;
  rating?: number;
  tastingNotes?: string;
  drinkFrom?: number;
  drinkUntil?: number;
  note?: string;
}
```

The interface supports rich data. But since Remy doesn't receive tastingNotes/cepage/rating/drinkFrom/drinkUntil from tool results, these fields are hallucinated when included.

---

## 7. RemyWineCard Display

**Location**: `src/components/remy/RemyWineCard.tsx`

```typescript
const displayName = wine.vintage
  ? `${wine.name} ${wine.vintage}`
  : wine.name;

const meta = [wine.producer, wine.region, wine.type].filter(Boolean).join(' / ');
```

**Problem**: When `name` is empty, the heading shows just the vintage number (e.g., "2019") or nothing. The producer is pushed to the `meta` line below. This creates confusing card layouts where the headline is meaningless.

**Fix**: Use `wine.name || wine.producer` as the display name, with producer removed from `meta` when used as fallback.

---

## 8. Cellar Summary Builders

**Location**: `src/services/inventoryService.ts:86-150`

### buildCellarSummary (used by Remy chat)
Returns statistics only: total bottles, type/country/region/producer breakdowns, price/vintage ranges, maturity breakdown, 3 most recent. **No individual wines.**

### getCellarSnapshot (used by Recommend service)
Returns up to 40 individual wines with: vintage, producer, name, type, price, qty, maturity. **No tasting notes, cepage, rating, or drink window.**

The Recommend service (`recommendService.ts`) uses `getCellarSnapshot` which lists individual wines but with limited fields. This is a separate pipeline from Remy chat and has its own limitations.

---

## 9. Embedding Pipeline

**Location**: `functions/src/onWineWrite.ts`

### What Goes Into Embeddings
```typescript
const DESCRIPTIVE_FIELDS = {
  producer, name, vintage, type, cepage, appellation,
  region, country, tastingNotes, personalNote, maturity,
  drinkFrom, drinkUntil
};
```

The embedding text is built from these fields joined with ". " separator. This means:
- **Vector search captures tasting notes and drink windows** in the embedding
- **Semantic queries like "bold earthy red" correctly match wines with those tasting notes**
- **But the results are stripped before Remy sees them** (Finding #1)

This creates an ironic situation: the semantic search pipeline correctly uses tasting notes to find relevant wines, but when those wines are returned to Remy, the tasting notes are thrown away. Remy then has to guess what the tasting notes are.

---

## 10. History Management

**Location**: `useGeminiLive.ts:309-320`

- Counts user-role messages as turn boundaries
- `CONFIG.MAX_HISTORY_TURNS = 15` (from constants.tsx:27)
- Truncates by slicing from the Nth-last user message index
- Tool outputs are injected as user messages (line 381), so they count toward the turn limit
- A single tool loop round consumes 2 entries: model's functionCall + user's tool output

**Implication**: Heavy tool use conversations exhaust the 15-turn limit faster. A 3-round tool call on the first question consumes 6 of 15 turns for history. This is generally fine but worth noting for multi-question sessions.

---

## 11. Recommend Service Comparison

**Location**: `src/services/recommendService.ts`

| Aspect | Remy Chat | Recommend Service |
|--------|-----------|-------------------|
| Wine data | queryInventory CF (full fields, but stripped) | `getCellarSnapshot()` (40 wines, limited fields) |
| Search | Semantic + structured via queryInventory | None — full snapshot in prompt |
| Tool use | Multi-round tool loop | Single prompt, no tools |
| Response | Markdown + wine cards | Structured JSON only |
| Token limit | Summary + tool results per round | Full 40-wine snapshot in prompt |
| Hallucination risk | Medium-high (stripped data) | Low (wines in prompt, cellarOnly flag) |

The Recommend service takes a fundamentally different approach: dump up to 40 wines into the prompt context and ask for picks. This is simpler and less prone to hallucination (the wines are right there), but limited to 40 wines and lacks the rich pairing intelligence that semantic search could provide.

---

## 12. Consolidated Findings

| # | Finding | Severity | Root Cause | Location |
|---|---------|----------|------------|----------|
| 1 | **Tool results strip rich data** — tastingNotes, cepage, vivinoRating, drinkFrom, drinkUntil, appellation all discarded | **Critical** | Format string only includes producer, name, vintage, type, region, country, price, qty, maturity | `useGeminiLive.ts:236-238` |
| 2 | **Wine card empty name** — parser validates `typeof name === 'string'` which passes for `""`, creating broken display | Medium | Loose validation + no display fallback | `remyParser.ts:52-53`, `RemyWineCard.tsx:15-17` |
| 3 | **Cellar summary has no individual wines** — correct by design but means zero bottle knowledge without tool use | Design | Intentional token management | `inventoryService.ts:86-138` |
| 4 | **No enforcement that Remy queries first** — prompt says "ALWAYS use queryInventory" but nothing prevents answering from summary alone | High | Prompt instruction is advisory, not enforced | `constants.tsx:108` |
| 5 | **Tool results injected as user messages** — not proper `functionResponse` parts | Low | Implementation shortcut; may confuse model about data provenance | `useGeminiLive.ts:381` |
| 6 | **No diversity tracking** — nothing prevents repeated recommendations of the same wines across conversation turns | Medium | No tracking mechanism exists | — |
| 7 | **No price-tier guidance** — Remy doesn't know the cellar's price distribution | Low | Missing from prompt | `constants.tsx:78-140` |
| 8 | **"Drink Now" instruction is vague** — says "use it to drive recommendations" but not HOW | Low | Incomplete instruction | `constants.tsx:128` |
| 9 | **Recommend service uses 40-wine snapshot only** — no queryInventory, no semantic search, limited fields | Medium | Separate pipeline, different design | `recommendService.ts` |

### Priority-Ordered Fix List

1. **Fix #1 (Critical)**: Enrich tool result formatting at `useGeminiLive.ts:236-238` — 3-line change
2. **Fix #4 (High)**: Add "NEVER recommend without querying" enforcement to prompt
3. **Fix #2 (Medium)**: Display name fallback in `RemyWineCard.tsx`
4. **Fix #6 (Medium)**: Add diversity instruction to prompt
5. **Fix #7-8 (Low)**: Add price-tier and maturity priority guidance to prompt
6. **Fix #5 (Low)**: Consider switching to proper `functionResponse` parts (requires testing)

---

## Appendix: Data Flow Diagram

```
User: "What goes well with lamb?"
  │
  ├─ buildSystemPrompt(cellarSummary)
  │   └─ Summary: "85 bottles. Types: Red: 45, White: 25..."
  │
  ├─ Gemini receives: system prompt + history + user query
  │
  ├─ Gemini decides: call queryInventory(semanticQuery: "wine for lamb")
  │   │
  │   ├─ CF: embed "wine for lamb" → 768-dim vector
  │   ├─ CF: findNearest on Firestore → top 30 candidates
  │   ├─ CF: apply filters → 10 results
  │   ├─ CF: return FULL wine objects ← ✅ Rich data here
  │   │
  │   └─ Client: format to string ← ❌ DATA LOSS HERE
  │       "Penfolds Bin 389 2019 — Red, South Australia, Australia — $85 — Qty: 2 — Drink Now"
  │       (tastingNotes, cepage, vivinoRating, drinkFrom, drinkUntil → GONE)
  │
  ├─ Gemini receives: stripped tool results as user message
  │
  ├─ Gemini generates response with wine cards
  │   └─ Must HALLUCINATE: tastingNotes, cepage, rating, drinkFrom, drinkUntil
  │      (prompt says "ALWAYS include" but data was never provided)
  │
  └─ remyParser.ts extracts wine cards → RemyWineCard renders
```
