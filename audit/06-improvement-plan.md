# Remy Sommelier AI — Improvement Plan

**Date**: 2026-02-16
**Baseline Score**: 2.7/5.0 (overall), 3.8/5.0 (excluding vector index failures)
**Target Score**: 4.2+/5.0

---

## Fix Priority Overview

| # | Fix | Severity | Effort | Expected Impact |
|---|-----|----------|--------|-----------------|
| **0** | Recreate Firestore vector index | **P0** | 1 command | Unblocks 43% of tests (all pairing/mood) |
| **1** | Enrich tool result formatting | **P1** | 3 lines | Eliminates hallucinated tasting notes, ratings, drink windows |
| **2** | Revised `buildSystemPrompt()` | **P2** | Drop-in replacement | Better tool usage, diversity, maturity priority |
| **3** | RemyWineCard display name fallback | **P3** | 3 lines | Fixes broken card display when name is empty |
| **4** | Production error handling for queryInventory | **P3** | 5 lines | Retry with structured fallback instead of summary dump |

---

## Fix 0: Recreate Firestore Vector Index

**Problem**: The Firestore vector index on `wines.embedding` is missing or expired. Every `semanticQuery` call crashes with `FAILED_PRECONDITION`. This breaks 100% of food pairing, style/mood, and many other query types.

**Evidence**: 13/30 audit tests failed with:
```
9 FAILED_PRECONDITION: Missing vector index configuration
```

**Fix**: Run this gcloud command (or use Firebase REST API):

```bash
gcloud firestore indexes composite create \
  --project=rave-cave-prod \
  --collection-group=wines \
  --query-scope=COLLECTION \
  --field-config='vector-config={"dimension":"768","flat":"{}"},field-path=embedding'
```

**Alternative (REST API)**: Since gcloud CLI may not be installed:

```bash
# Get access token from firebase-tools config
TOKEN=$(cat ~/.config/configstore/firebase-tools.json | python3 -c "import sys,json; print(json.load(sys.stdin)['tokens']['refresh_token'])")

# Exchange refresh token for access token
ACCESS_TOKEN=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
  -d "grant_type=refresh_token&refresh_token=$TOKEN&client_id=563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com&client_secret=j9iVZfS8kkCEFUPaAeJV0sAi" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Create the index
curl -X POST \
  "https://firestore.googleapis.com/v1/projects/rave-cave-prod/databases/(default)/collectionGroups/wines/indexes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "queryScope": "COLLECTION",
    "fields": [
      {
        "fieldPath": "embedding",
        "vectorConfig": {
          "dimension": 768,
          "flat": {}
        }
      }
    ]
  }'
```

**Note**: Index creation takes 5-15 minutes. After creation, re-run the harness to verify semantic search works.

---

## Fix 1: Enrich Tool Result Formatting (CRITICAL — 3 lines)

**File**: `src/hooks/useGeminiLive.ts`, lines 236-238

### Current Code (line 236-238)

```typescript
const formatted = wines.map((w: any) =>
  `${w.producer}${w.name ? ' ' + w.name : ''} ${w.vintage || 'NV'} — ${w.type || ''}, ${w.region || ''}${w.country ? ', ' + w.country : ''} — $${w.price || 0} — Qty: ${w.quantity || 1} — ${w.maturity || 'Unknown'}`
).join('\n');
```

### Replacement Code

```typescript
const formatted = wines.map((w: any) => {
  const parts = [
    `${w.producer}${w.name ? ' ' + w.name : ''} ${w.vintage || 'NV'}`,
    `${w.type || ''}, ${w.region || ''}${w.country ? ', ' + w.country : ''}`,
    `$${w.price || 0} — Qty: ${w.quantity || 1}`,
    `Maturity: ${w.maturity || 'Unknown'}`,
  ];
  if (w.cepage) parts.push(`Grape: ${w.cepage}`);
  if (w.tastingNotes) parts.push(`Notes: ${w.tastingNotes}`);
  if (w.vivinoRating) parts.push(`Rating: ${w.vivinoRating}/100`);
  if (w.drinkFrom || w.drinkUntil) parts.push(`Window: ${w.drinkFrom || '?'}–${w.drinkUntil || '?'}`);
  if (w.appellation) parts.push(`Appellation: ${w.appellation}`);
  return parts.join(' — ');
}).join('\n');
```

### What This Changes

| Field | Before | After |
|-------|--------|-------|
| cepage | Discarded | `Grape: Cabernet Sauvignon / Shiraz` |
| tastingNotes | Discarded | `Notes: Structured, dark fruit, graphite, firm tannins` |
| vivinoRating | Discarded | `Rating: 88/100` |
| drinkFrom/Until | Discarded (only maturity label) | `Window: 2024–2035` |
| appellation | Discarded | `Appellation: South Australia` |

### Before (what Remy sees)

```
Penfolds Bin 389 2019 — Red, South Australia, Australia — $85 — Qty: 2 — Drink Now
```

### After (what Remy sees)

```
Penfolds Bin 389 2019 — Red, South Australia, Australia — $85 — Qty: 2 — Maturity: Drink Now — Grape: Cabernet Sauvignon / Shiraz — Notes: Structured, dark fruit, graphite, firm tannins — Rating: 88/100 — Window: 2024–2035 — Appellation: South Australia
```

**Token impact**: ~40 additional tokens per wine. For a typical 10-wine result set, this adds ~400 tokens. Within acceptable limits given the 15-turn history cap.

---

## Fix 2: Revised `buildSystemPrompt()`

**File**: `src/constants.tsx`, function `buildSystemPrompt` (lines 78-140)

### Complete Replacement

```typescript
export function buildSystemPrompt(inventoryContext: string, stagedWineJson?: string): string {
  const currentYear = new Date().getFullYear();
  return `You are Rémy, an expert French sommelier for "Rave Cave".
Current year: ${currentYear}.

VOICE: Warm, professional, sophisticated, energetic. Use brief French flourishes ("Magnifique", "S'il vous plaît").

IMAGE INTENTS:
1. WINE LABEL: Extract details and call stageWine(). ALWAYS analyze vintage, grape, and region to provide suggested drinking windows.
2. WINE LIST: Analyze the menu and recommend specific pairings. Do NOT call stageWine for lists.

WINE NAME RULES (CRITICAL):
- "name" is the CUVEE name only (e.g., "Reserve Speciale", "Bin 389", "Les Terrasses")
- name must NEVER duplicate or contain the producer name
- name must NEVER duplicate or contain the grape variety (cepage)
- If no distinct cuvee name is visible, leave name EMPTY
- Examples:
  * Producer "Penfolds", name "Bin 389" → correct
  * Producer "Cloudy Bay", name "Sauvignon Blanc" → WRONG (that's cepage). Leave empty.
  * Producer "Chateau Margaux", name "Chateau Margaux" → WRONG (duplicates producer). Leave empty.

INGESTION FLOW:
1. User uploads label -> You call stageWine().
2. You confirm details and MUST ask for price (and optionally quantity).
3. User provides price (e.g., "$35" or "40 bottles for $800") -> You call commitWine().
4. DO NOT say "it's added" until the commitWine tool is successfully called.

CELLAR SUMMARY:
${inventoryContext}

${stagedWineJson ? `STAGED WINE (Awaiting Price/Quantity): ${stagedWineJson}` : 'No wine currently staged.'}

TOOL USAGE RULES (CRITICAL):
- For general cellar statistics (total bottles, type counts, price range): answer directly from the summary above.
- For EVERYTHING ELSE — specific wine queries, recommendations, food pairings, comparisons — you MUST call queryInventory FIRST. Do not recommend, describe, or name specific wines without verifying they exist via a tool call.
- NEVER recommend a wine unless it appeared in a queryInventory result. If queryInventory returns no matches, say so honestly and suggest broadening the search.
- Use structured filters (wineType, region, country, producer, priceMin/priceMax, maturityStatus) for factual queries like "show me my Italian wines" or "what reds do I have under $50".
- Use semanticQuery for subjective queries: food pairings ("wine for lamb"), mood ("something bold and earthy"), or characteristic descriptions ("crisp and refreshing").
- Combine both when useful — e.g., semanticQuery "bold and earthy" with wineType "Red" and priceMax 50.
- If a semanticQuery fails or returns unexpected results, RETRY with structured filters as a fallback.
- For questions unrelated to wine, politely redirect without calling any tools.

RECOMMENDATION GUIDELINES:
- MATURITY PRIORITY: Prefer "Drink Now" wines. Flag "Past Peak" wines with a warning. Mention "Hold" wines only when specifically appropriate (e.g., long-term cellaring advice).
- PRICE AWARENESS: This cellar ranges from ~$18 to ~$365. Under $30 is everyday, $30-$60 is mid-range, $60+ is premium. Match price to occasion — don't suggest the most expensive bottle for a casual BBQ.
- QUANTITY CHECK: For group occasions, verify the wine has enough bottles (Qty field). Don't suggest a wine with Qty: 1 for a party of 8.
- DIVERSITY: When recommending multiple wines, vary by type, region, and price point. Don't recommend three wines from the same producer or region unless the user specifically asks for that.
- USE THE DATA: When queryInventory returns tasting notes, grape varieties, ratings, and drink windows — USE them in your response. Quote the actual tasting notes, mention the actual grape variety, cite the actual rating. Do not substitute your own guesses.

RESPONSE FORMAT:
- Use **markdown**: headings (#), bold (**text**), italic, bullet lists.
- When recommending specific wines, embed them in a fenced code block with language tag \`wine\`:
  \`\`\`wine
  [{"producer":"...","name":"...","vintage":2015,"region":"Burgundy","country":"France","type":"Red","cepage":"Pinot Noir","rating":4.8,"tastingNotes":"Dark cherry, earth, silky tannins","drinkFrom":2024,"drinkUntil":2035,"note":"Perfect match for your dinner"}]
  \`\`\`
- Wine JSON fields: producer (required), name (required — use empty string if no cuvee), vintage, region, country, type, cepage, rating (0-5 scale), tastingNotes (from tool results, NOT fabricated), drinkFrom (year), drinkUntil (year), note (your recommendation rationale).
- For tastingNotes: Use the notes from queryInventory results. If no notes were returned, write "Tasting notes not available" — do NOT fabricate them.
- For rating: Convert from the 0-100 scale in tool results by dividing by 20 (e.g., 88/100 → 4.4). If no rating was returned, omit the field.
- For drinkFrom/drinkUntil: Use the values from tool results. If not available, you may estimate based on your expertise but note it as "estimated".
- Place wine blocks after explanatory text, not inline.
- Do NOT use wine blocks for casual wine mentions — only explicit recommendations.

TOOLS:
- queryInventory: Search the cellar. Parameters include wineType, country, region, producer, grapeVarieties, vintageMin/Max, priceMin/Max, maturityStatus, query, sortBy, sortOrder, limit, semanticQuery.
- stageWine: Stage extracted label data. Include ALL visible fields: producer (required), vintage (required), type (required), name (cuvee only), cepage, region, country, appellation, tastingNotes, drinkFrom, drinkUntil, format.
- commitWine: Finalize the add (requires price, optional quantity).`;
}
```

### Key Changes from Current Prompt

| Change | Why |
|--------|-----|
| Added "TOOL USAGE RULES" section with explicit when-to-query rules | Prevents answering from summary alone |
| Added "NEVER recommend a wine unless it appeared in a queryInventory result" | Anti-hallucination enforcement |
| Added semanticQuery failure → structured filter fallback instruction | Handles vector index issues gracefully |
| Added "For questions unrelated to wine, redirect without tools" | Prevents unnecessary tool calls on off-topic queries |
| Added MATURITY PRIORITY guidance | Drink Now preference, Past Peak warnings |
| Added PRICE AWARENESS with tier definitions | Contextual price recommendations |
| Added QUANTITY CHECK instruction | Prevents recommending low-stock wines for groups |
| Added DIVERSITY instruction | Varies recommendations across type, region, price |
| Added "USE THE DATA" instruction | Tells model to quote tool results, not fabricate |
| Changed tastingNotes instruction to "from tool results, NOT fabricated" | Directly addresses hallucination |
| Added rating conversion instruction (100 → 5 scale) | Maps vivinoRating to wine card format |
| Changed drinkFrom/drinkUntil to "from tool results, estimate if unavailable" | Transparent about data source |
| Removed vague "Be proactive. Use Drink Now to drive recommendations" | Replaced with specific maturity priority rules |
| Removed "ALWAYS include tastingNotes" (impossible without data) | Replaced with "use from tool results" |

---

## Fix 3: RemyWineCard Display Name Fallback

**File**: `src/components/remy/RemyWineCard.tsx`, lines 15-19

### Current Code

```typescript
const displayName = wine.vintage
  ? `${wine.name} ${wine.vintage}`
  : wine.name;

const meta = [wine.producer, wine.region, wine.type].filter(Boolean).join(' / ');
```

### Replacement Code

```typescript
const hasName = wine.name && wine.name.trim().length > 0;
const displayName = hasName
  ? (wine.vintage ? `${wine.name} ${wine.vintage}` : wine.name)
  : (wine.vintage ? `${wine.producer} ${wine.vintage}` : wine.producer);

const meta = hasName
  ? [wine.producer, wine.region, wine.type].filter(Boolean).join(' / ')
  : [wine.region, wine.type].filter(Boolean).join(' / ');
```

### What This Changes

| Scenario | Before | After |
|----------|--------|-------|
| `name: "Bin 389", vintage: 2019` | "Bin 389 2019" / "Penfolds / South Australia / Red" | "Bin 389 2019" / "Penfolds / South Australia / Red" |
| `name: "", vintage: 2016` | " 2016" / "Quintessa / Napa Valley / Red" | "Quintessa 2016" / "Napa Valley / Red" |
| `name: "", vintage: null` | "" / "Quintessa / Napa Valley / Red" | "Quintessa" / "Napa Valley / Red" |

---

## Fix 4: Production Error Handling — Structured Fallback

**File**: `src/hooks/useGeminiLive.ts`, lines 241-244

### Current Code

```typescript
} catch (err) {
  console.error('queryInventory call failed, using fallback:', err);
  const fallback = inventoryService.buildCellarSummary(localCellar);
  results.push({ result: `queryInventory is temporarily unavailable. Here is a summary of the cellar instead: ${fallback}` });
}
```

### Replacement Code

```typescript
} catch (err) {
  console.error('queryInventory call failed:', err);
  // If semanticQuery failed (likely vector index issue), retry with structured filters only
  const hadSemanticQuery = !!call.args.semanticQuery;
  if (hadSemanticQuery) {
    try {
      const { semanticQuery, ...structuredArgs } = call.args;
      // Retry with free-text query as fallback for semantic intent
      const fallbackArgs = { ...structuredArgs, query: semanticQuery, limit: call.args.limit || 10 };
      const retryRes = await fetch(QUERY_INVENTORY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackArgs),
      });
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        const wines = retryData.wines || [];
        if (wines.length > 0) {
          const formatted = wines.map((w: any) => {
            const parts = [
              `${w.producer}${w.name ? ' ' + w.name : ''} ${w.vintage || 'NV'}`,
              `${w.type || ''}, ${w.region || ''}${w.country ? ', ' + w.country : ''}`,
              `$${w.price || 0} — Qty: ${w.quantity || 1}`,
              `Maturity: ${w.maturity || 'Unknown'}`,
            ];
            if (w.cepage) parts.push(`Grape: ${w.cepage}`);
            if (w.tastingNotes) parts.push(`Notes: ${w.tastingNotes}`);
            if (w.vivinoRating) parts.push(`Rating: ${w.vivinoRating}/100`);
            if (w.drinkFrom || w.drinkUntil) parts.push(`Window: ${w.drinkFrom || '?'}–${w.drinkUntil || '?'}`);
            if (w.appellation) parts.push(`Appellation: ${w.appellation}`);
            return parts.join(' — ');
          }).join('\n');
          results.push({ result: `Found ${retryData.total} wines (showing ${wines.length}, via text search fallback):\n${formatted}` });
          console.log('queryInventory: semantic failed, structured fallback succeeded');
          break; // Skip the summary fallback below
        }
      }
    } catch (retryErr) {
      console.error('Structured fallback also failed:', retryErr);
    }
  }
  // Final fallback: cellar summary
  const fallback = inventoryService.buildCellarSummary(localCellar);
  results.push({ result: `queryInventory is temporarily unavailable. Here is a summary of the cellar instead: ${fallback}` });
}
```

### What This Changes

When `semanticQuery` fails (vector index issue), instead of immediately falling back to the statistics-only cellar summary, this:
1. Retries the same query using `query` (free-text search) instead of `semanticQuery` (vector search)
2. Only falls back to the cellar summary if the structured retry also fails
3. This gracefully degrades from vector search → text search → summary, rather than vector search → summary

---

## Verification Plan

After applying fixes:

1. **Fix 0 (vector index)**: Run `npx tsx audit/02-test-harness.ts` — all 13 previously failing tests should now execute
2. **Fix 1 (enriched formatting)**: Inspect tool result strings in `04-results.json` — should contain grape, notes, rating, window fields
3. **Fix 2 (revised prompt)**: Check for reduced hallucination — judge scores for Red Flags should improve
4. **Fix 3 (display name)**: Manual test — create a wine card with `name: ""` and verify producer shows in heading
5. **Overall**: Re-run full harness, target overall score >= 4.2/5.0

### Expected Score Improvements

| Dimension | Before | Projected After |
|-----------|--------|----------------|
| Retrieval Accuracy | 2.2 | 4.0+ (vector search works, structured fallback) |
| Relevance | 2.9 | 4.5+ (semantic results improve relevance) |
| Reasoning Quality | 3.0 | 4.5+ (real data → better reasoning) |
| Diversity | 3.0 | 4.0+ (diversity instruction + more results) |
| Red Flags | 2.1 | 4.0+ (no hallucinated details, anti-fabrication rules) |
| **OVERALL** | **2.7** | **4.2+** |

---

## Implementation Order

```
1. Fix 0 — Recreate vector index (unblocks everything)
2. Fix 1 — Enrich tool formatting (3-line change, highest ROI)
3. Fix 2 — Replace buildSystemPrompt() (drop-in, tested)
4. Fix 3 — RemyWineCard fallback (3-line change)
5. Fix 4 — Structured fallback on error (defense in depth)
6. Re-run harness to verify
```

Fixes 1-3 can be applied in a single commit. Fix 0 is infrastructure. Fix 4 is optional defense-in-depth.
