# Remy Sommelier AI — Test Analysis

**Date**: 2026-02-16
**Model**: gemini-3-flash-preview
**Tests**: 30 | **Passed (AVG >= 3.0)**: 14 | **Failed**: 16
**Cellar**: 42 wines (39 bottles), 17 producers, $18-$365 range

---

## Executive Summary

Remy scored **2.7/5.0 overall** — below acceptable. Two systemic issues account for nearly all failures:

1. **The Firestore vector index is missing in production.** Every `semanticQuery` call to queryInventory crashes with `FAILED_PRECONDITION`. This killed 13 of 30 tests (100% of Food Pairing and Style/Mood categories). In production, the fallback silently returns cellar summary stats, forcing Remy to hallucinate recommendations.

2. **Tool result formatting strips rich data** (Finding #1 from codebase review). Even on tests that succeeded, Remy hallucinated tasting notes, cepage, ratings, and drink windows because the tool results don't include them.

If both issues were fixed, projected score would be ~4.0-4.5/5.0.

---

## Scores Table

### By Category

| Category | RA | REL | RQ | DIV | RF | AVG | n |
|----------|-----|------|-----|------|-----|------|---|
| **Food Pairing** | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | **1.0** | 5 |
| **Occasion** | 2.8 | 3.4 | 4.0 | 3.8 | 2.4 | **3.3** | 5 |
| **Style/Mood** | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | **1.0** | 5 |
| **Inventory Retrieval** | 3.4 | 5.0 | 4.6 | 4.8 | 3.2 | **4.2** | 5 |
| **Contextual Intelligence** | 2.4 | 4.0 | 4.0 | 4.2 | 2.2 | **3.4** | 5 |
| **Edge Cases** | 2.8 | 3.2 | 3.6 | 3.4 | 2.6 | **3.1** | 5 |
| **OVERALL** | **2.2** | **2.9** | **3.0** | **3.0** | **2.1** | **2.7** | 30 |

**Legend**: RA = Retrieval Accuracy, REL = Relevance, RQ = Reasoning Quality, DIV = Diversity, RF = Red Flags (5 = no flags)

### By Dimension (weakest to strongest)

| Dimension | Score | Issue |
|-----------|-------|-------|
| Red Flags | 2.1 | Hallucinated wines, missing tool calls |
| Retrieval Accuracy | 2.2 | Vector search broken, fallback inadequate |
| Relevance | 2.9 | Good when data exists, zero when vector search fails |
| Diversity | 3.0 | Reasonable when not system-blocked |
| Reasoning Quality | 3.0 | Sommelier persona is strong when given data |

### Excluding Vector Index Failures (17 tests)

When we remove the 13 tests that crashed due to the missing vector index, the remaining 17 tests average:

| Dimension | Score |
|-----------|-------|
| RA | 3.1 |
| REL | 4.2 |
| RQ | 4.4 |
| DIV | 4.4 |
| RF | 3.1 |
| **AVG** | **3.8** |

This confirms: Remy's sommelier reasoning is solid (RQ=4.4), but retrieval accuracy and red flags drag the score down due to data quality issues.

---

## Tool Call Analysis

### Call Volume

| Metric | Value |
|--------|-------|
| Total tool calls across all tests | 18 |
| Tests with tool calls | 15/30 |
| Tests requiring tool calls | 27 |
| Tests requiring AND using tool calls | 14/27 (52%) |
| Semantic queries attempted | 13 (all failed) |
| Structured queries executed | 18 |

### Tool Call Patterns

**Good patterns:**
- OC-01 (birthday $50): Used `priceMin: 40, priceMax: 60` — excellent structured filter usage
- IR-04 (sparkling): Used `wineType: "Sparkling"` — correct structured query
- IR-05 (Penfolds): Used `producer: "Penfolds"` — correct producer filter
- CI-01 (drink now): Used `maturityStatus: "DRINK_NOW"` — correct maturity filter
- EC-03 (under $10): Used `priceMax: 10` — handled empty results gracefully

**Bad patterns:**
- 13 tests used `semanticQuery` and ALL failed (vector index missing)
- EC-01 (weather): Called queryInventory for an off-topic question instead of declining
- OC-03 (impress boss): Queried correctly but then hallucinated wines not in results
- CI-05 (beginner tour): Used semanticQuery for a broad overview — should have used structured with high limit

### semanticQuery vs Structured Filter Selection

The model **strongly prefers semanticQuery** for any subjective or pairing query. This is the intended design — but since the vector index is broken, it means the entire pairing/mood recommendation flow is non-functional.

| Query Type | Model's Preferred Tool Args | Would Work? |
|------------|---------------------------|-------------|
| Food pairing | `semanticQuery` | NO (vector index missing) |
| Style/mood | `semanticQuery` | NO |
| Occasion | Mixed (structured for price, semantic for vibe) | Partial |
| Inventory retrieval | Structured filters | YES |
| Contextual intelligence | Mixed | Partial |

---

## Hallucination Analysis

### Wine Card Verification

Of the 17 tests that produced responses, I identified wine cards in the responses and checked them against the cellar manifest (20 wines returned from queryInventory).

| Test | Wines Recommended | In Cellar? | Hallucination? |
|------|------------------|------------|----------------|
| OC-01 | Riecine Riserva 2016, Domaine Naturaliste Purus 2021, Bassermann-Jordan Kalkofen 2016 | Riecine & Naturaliste confirmed in tool results; BJ in cellar but "Kalkofen" name may be fabricated | **Partial** — name details hallucinated |
| OC-03 | Quintessa 2016, Riecine Riserva 2016 | Quintessa appeared in tool results (sorted by rating); Riecine not in returned set | **Partial** — Riecine likely from memory of earlier imagined results |
| OC-04 | Quintessa 2016, Chatagnier La Sybarite 2021, Giboulot Terres Burgondes 2020 | Quintessa in cellar; Chatagnier and Giboulot need verification | **Likely partial** |
| IR-01 | Listed Italian wines | Showed what tool returned | **OK** |
| IR-03 | Most expensive bottle | Listed from tool results | **OK** |
| CI-01 | Drink now wines | Listed from maturity filter | **OK** |
| CI-04 | Two expensive reds | From tool sort | **OK** |

### Hallucination Sources

1. **Tasting notes**: Always hallucinated. Tool results never include `tastingNotes`, so every tasting descriptor in wine cards is fabricated from the model's training data. Sometimes these are plausible (Sangiovese with "cherry, leather"), sometimes generic.

2. **Cepage/grape varieties**: Always hallucinated. Tool results don't include `cepage`, so "Cabernet Sauvignon Blend" for Quintessa is inferred from general knowledge, not cellar data.

3. **Ratings**: Always hallucinated. Tool results don't include `vivinoRating`, so ratings like "4.9" are fabricated.

4. **Drink windows**: Always hallucinated. Tool results don't include `drinkFrom`/`drinkUntil`, so year ranges like "2022-2038" are inferred from general knowledge.

5. **Wine names/cuvee**: Sometimes hallucinated. When tool results show "Bassermann-Jordan" with no name, model may fabricate "Kalkofen" from general knowledge of the producer's vineyard portfolio.

**Root cause**: All five hallucination types trace directly to **Finding #1** — the tool result formatting at `useGeminiLive.ts:236-238` strips these fields. The data exists in Firestore and is returned by the queryInventory CF, but never reaches the model.

---

## Wine Card Format Analysis

Of the responses that included wine cards (fenced ` ```wine ` blocks):

| Metric | Value |
|--------|-------|
| Responses with wine cards | ~10 of 17 |
| Valid JSON parse rate | ~100% (model consistently produces valid JSON) |
| Cards with empty `name: ""` | ~3-4 (e.g., Quintessa) |
| Cards with fabricated tasting notes | 100% (no real data available) |
| Cards with fabricated ratings | 100% |
| Cards with fabricated drink windows | 100% |

The model reliably produces well-formatted wine card JSON. The issue is not format — it's data provenance.

---

## Failure Pattern Grouping

### Pattern 1: Vector Index Missing (13 tests, 43%)

**Root cause**: Firestore vector index on `wines.embedding` not configured in production.
**Affected**: ALL Food Pairing (5), ALL Style/Mood (5), OC-02, CI-05, EC-02
**Impact**: Complete failure — error propagated, empty response in harness. In production, fallback to cellar summary → hallucinated recommendations.
**Fix**: Recreate the vector index. See improvement plan.

### Pattern 2: Hallucinated Wine Details (all successful tests with wine cards)

**Root cause**: Tool result formatting discards tastingNotes, cepage, vivinoRating, drinkFrom, drinkUntil.
**Affected**: Every test that produced wine card recommendations
**Impact**: Tasting notes, ratings, grape varieties, and drink windows are fabricated from model training data, not cellar data.
**Fix**: Enrich the format string at `useGeminiLive.ts:236-238`.

### Pattern 3: Model Recommends Wines Not Verifiably In Results (3 tests)

**Root cause**: Some tests (OC-03, CI-04) show the model appearing to recommend wines not obviously in the tool result snippet. This may be because the tool returned more wines than the judge had in its ground truth (only first 20 wines), or the model is confabulating from the cellar summary.
**Affected**: OC-03, OC-04, CI-03
**Impact**: Judge marks low retrieval accuracy even when wines may actually exist in the full cellar.
**Fix**: Stronger prompt instructions to only recommend wines explicitly returned by queryInventory.

### Pattern 4: Off-Topic Tool Usage (1 test)

**Root cause**: EC-01 (weather in Paris) triggered a queryInventory call instead of politely declining.
**Affected**: EC-01
**Impact**: Minor — model redirected to wine after, but wasted a tool call.
**Fix**: Prompt addition: "For questions unrelated to wine, respond without calling tools."

---

## Production vs Harness Behavior Difference

A critical note: the harness **propagates errors** when queryInventory fails, resulting in empty responses. In production, the fallback at `useGeminiLive.ts:241-244` returns the cellar summary:

```
queryInventory is temporarily unavailable. Here is a summary of the cellar instead: 39 bottles. Types: Red: 12, Dessert: 4, White: 23...
```

This means in production, users DON'T see an error. Instead, Remy receives summary stats and **silently hallucinate recommendations** — recommending wines from training data as if they're in the cellar. This is arguably worse than a visible error because the user trusts the recommendations.

---

## Top 3 Failure Patterns (Priority Order)

| Priority | Pattern | Impact | Fix Effort |
|----------|---------|--------|------------|
| **P0** | Vector index missing — semantic search 100% broken | 43% of tests failed, all pairing/mood queries broken | Recreate index (1 command) |
| **P1** | Tool results strip rich data — hallucinated details on every recommendation | Every wine card contains fabricated tasting notes, ratings, drink windows | 3-line code change |
| **P2** | No enforcement that model must verify wines exist before recommending | Occasional hallucinated wines not in cellar | Prompt enhancement |

---

## Appendix: Cellar Profile

From Step 0 queryInventory:

- **42 wines total**, 39 bottles (some qty > 1)
- **Types**: Red (8 unique), White (9 unique), Dessert (3 unique)
- **Countries**: Australia (15), France (3), Germany (1)
- **Price range**: $18-$105 (excluding Quintessa at $365)
- **Notable producers**: Angullong, Aurélien Chatagnier, Bloodwood, Colmar Estate, Crawford River, Cullarin, De Taillevent, Domaine Emmanuel Giboulot, Domaine Naturaliste, Geheimer Rat Dr. von Bassermann-Jordan, Montague, Nick O'Leary, Riecine, 1847 Wines, Amour/Amour Wines
- **Regions**: Predominantly Orange NSW, Tasmania, Henty, Margaret River, Pfalz, Burgundy, Northern Rhône
- **Maturity**: Mix of Drink Now, Hold, and Unknown (many wines lack drink window data)
