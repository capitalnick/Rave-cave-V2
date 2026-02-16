/**
 * Remy Sommelier AI — Test Harness
 *
 * Replicates the exact production tool loop from useGeminiLive.ts,
 * runs 30 test cases, and uses LLM-as-judge for scoring.
 *
 * Usage: npx tsx audit/02-test-harness.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Configuration ──

const PROJECT_ID = 'rave-cave-prod';
const REGION = 'australia-southeast1';
const BASE_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;
const GEMINI_PROXY_URL = `${BASE_URL}/gemini`;
const QUERY_INVENTORY_URL = `${BASE_URL}/queryInventory`;
const MODEL = 'gemini-3-flash-preview';
const MAX_TOOL_ROUNDS = 5;
const DELAY_BETWEEN_TESTS_MS = 2000;

// ── Types ──

interface TestCase {
  id: string;
  category: string;
  query: string;
  expectedBehavior: string;
  requiresToolCall: boolean;
  expectedToolArgs: Record<string, any> | null;
}

interface ToolCall {
  round: number;
  name: string;
  args: Record<string, any>;
  resultSummary: string;
  wineCount: number;
}

interface JudgeScores {
  retrievalAccuracy: number;
  relevance: number;
  reasoningQuality: number;
  diversity: number;
  redFlags: number;
  notes: string;
}

interface TestResult {
  id: string;
  category: string;
  query: string;
  finalResponse: string;
  toolCalls: ToolCall[];
  toolRounds: number;
  scores: JudgeScores;
  error: string | null;
  durationMs: number;
}

interface CellarManifest {
  totalWines: number;
  wines: Record<string, any>[];
  types: Record<string, number>;
  countries: Record<string, number>;
  priceRange: { min: number; max: number };
  producers: string[];
}

// ── Gemini Proxy ──

async function callGeminiProxy(body: {
  model: string;
  contents: any[];
  systemInstruction?: string;
  tools?: any[];
}): Promise<any> {
  const res = await fetch(GEMINI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini proxy error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── queryInventory CF ──

async function callQueryInventory(args: Record<string, any>): Promise<any> {
  const res = await fetch(QUERY_INVENTORY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`queryInventory error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── System Prompt (exact copy from constants.tsx) ──

function buildSystemPrompt(inventoryContext: string): string {
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

No wine currently staged.

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
- CASUAL PRICE CAPS: When the occasion is casual (BBQ, weeknight, easy-drinking, relaxed), enforce strict price limits — white wines must be under $30 and red wines must be under $40. Use priceMax in your queryInventory call to enforce this.
- QUANTITY CHECK: For group occasions, verify the wine has enough bottles (Qty field). Don't suggest a wine with Qty: 1 for a party of 8.
- DIVERSITY: When recommending multiple wines, vary by type, region, and price point. Don't recommend three wines from the same producer or region unless the user specifically asks for that.
- USE THE DATA: When queryInventory returns tasting notes, grape varieties, ratings, and drink windows — USE them in your response. Quote the actual tasting notes, mention the actual grape variety, cite the actual rating. Do not substitute your own guesses.

TOOLS:
- queryInventory: Search the cellar. Parameters include wineType, country, region, producer, grapeVarieties, vintageMin/Max, priceMin/Max, maturityStatus, query, sortBy, sortOrder, limit, semanticQuery.
- stageWine: Stage extracted label data. Include ALL visible fields: producer (required), vintage (required), type (required), name (cuvee only), cepage, region, country, appellation, tastingNotes, drinkFrom, drinkUntil, format.
- commitWine: Finalize the add (requires price, optional quantity).

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
- Do NOT use wine blocks for casual wine mentions — only explicit recommendations.`;
}

// ── Tool Declarations (exact copy from useGeminiLive.ts) ──

const TOOL_DECLARATIONS = [{ functionDeclarations: [
  {
    name: 'queryInventory',
    description: "Search the user's wine cellar. Use this whenever you need to find specific wines, answer questions about inventory, make food pairing recommendations, or check what's available. Always use this tool rather than relying on the cellar summary for specific wine queries.",
    parameters: {
      type: "OBJECT",
      properties: {
        wineType: { type: "STRING", description: "Wine type filter: Red, White, Rosé, Sparkling, Dessert, Fortified" },
        country: { type: "STRING", description: "Country filter" },
        region: { type: "STRING", description: "Region filter" },
        producer: { type: "STRING", description: "Producer name filter (partial match)" },
        grapeVarieties: { type: "ARRAY", items: { type: "STRING" }, description: "Grape variety filter" },
        vintageMin: { type: "NUMBER", description: "Minimum vintage year" },
        vintageMax: { type: "NUMBER", description: "Maximum vintage year" },
        priceMin: { type: "NUMBER", description: "Minimum price" },
        priceMax: { type: "NUMBER", description: "Maximum price" },
        maturityStatus: { type: "STRING", description: "Maturity filter: HOLD, DRINK_NOW, or PAST_PEAK" },
        query: { type: "STRING", description: "Free text search across producer, name, cepage, region, appellation" },
        sortBy: { type: "STRING", description: "Sort field: vintage, price, or rating" },
        sortOrder: { type: "STRING", description: "Sort direction: asc or desc" },
        limit: { type: "NUMBER", description: "Max results to return (default 10, max 20)" },
        semanticQuery: { type: "STRING", description: "Natural language description of what you're looking for. Use for food pairing queries, mood-based requests, or characteristic descriptions. Examples: 'bold earthy red for braised meat', 'crisp refreshing white for seafood'. Can be combined with structured filters." },
      },
    },
  },
  // We only declare queryInventory for audit tests — stageWine and commitWine are not relevant
] }];

// ── Tool Result Formatting (EXACT copy from useGeminiLive.ts:236-238) ──

function formatToolResult(data: any): string {
  const wines = data.wines || [];
  if (wines.length === 0) {
    return `No wines found matching those criteria. Total in cellar: ${data.total || 0}.`;
  }
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
  return `Found ${data.total} wines (showing ${wines.length}):\n${formatted}`;
}

// ── Build Cellar Summary (mirrors inventoryService.buildCellarSummary) ──

function buildCellarSummary(wines: Record<string, any>[]): string {
  if (wines.length === 0) return "Cellar is empty.";

  const totalBottles = wines.reduce((sum, w) => sum + (Number(w.quantity) || 0), 0);

  const types: Record<string, number> = {};
  wines.forEach(w => { types[w.type] = (types[w.type] || 0) + (Number(w.quantity) || 0); });
  const typeStr = Object.entries(types).map(([t, n]) => `${t}: ${n}`).join(', ');

  const top5 = (acc: Record<string, number>) =>
    Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v})`).join(', ');

  const countries: Record<string, number> = {};
  const regions: Record<string, number> = {};
  const producers: Record<string, number> = {};
  wines.forEach(w => {
    const qty = Number(w.quantity) || 0;
    if (w.country) countries[w.country] = (countries[w.country] || 0) + qty;
    if (w.region) regions[w.region] = (regions[w.region] || 0) + qty;
    if (w.producer) producers[w.producer] = (producers[w.producer] || 0) + qty;
  });

  const prices = wines.map(w => Number(w.price) || 0).filter(p => p > 0);
  const priceRange = prices.length > 0 ? `$${Math.min(...prices)}-$${Math.max(...prices)}` : 'N/A';

  const vintages = wines.map(w => Number(w.vintage) || 0).filter(v => v > 0);
  const vintageRange = vintages.length > 0 ? `${Math.min(...vintages)}-${Math.max(...vintages)}` : 'N/A';

  const maturity: Record<string, number> = { 'Drink Now': 0, Hold: 0, 'Past Peak': 0, Unknown: 0 };
  wines.forEach(w => {
    const m = w.maturity || 'Unknown';
    maturity[m] = (maturity[m] || 0) + (Number(w.quantity) || 0);
  });
  const maturityStr = Object.entries(maturity).filter(([, n]) => n > 0).map(([k, v]) => `${k}: ${v}`).join(', ');

  const recent = wines.slice(-3).reverse().map(w => `${w.vintage} ${w.producer}${w.name ? ' ' + w.name : ''}`).join('; ');

  return [
    `${totalBottles} bottles.`,
    `Types: ${typeStr}.`,
    `Countries: ${top5(countries)}.`,
    `Regions: ${top5(regions)}.`,
    `Producers: ${top5(producers)}.`,
    `Prices: ${priceRange}. Vintages: ${vintageRange}.`,
    `Maturity: ${maturityStr}.`,
    `Recent: ${recent}.`,
  ].join(' ');
}

// ── LLM-as-Judge ──

async function judgeResponse(
  testCase: TestCase,
  response: string,
  toolCalls: ToolCall[],
  cellarManifest: CellarManifest,
): Promise<JudgeScores> {
  const cellarSummaryForJudge = cellarManifest.wines.slice(0, 20).map(w =>
    `${w.producer}${w.name ? ' ' + w.name : ''} ${w.vintage || 'NV'} — ${w.type}, ${w.region}, ${w.country} — $${w.price} — ${w.cepage || 'unknown grape'} — ${w.tastingNotes || 'no notes'} — ${w.maturity}`
  ).join('\n');

  const toolCallSummary = toolCalls.length > 0
    ? toolCalls.map(tc => `Round ${tc.round}: ${tc.name}(${JSON.stringify(tc.args)}) → ${tc.wineCount} wines`).join('\n')
    : 'No tool calls made.';

  const judgePrompt = `You are an expert wine AI evaluator. Score the following AI sommelier response on 5 dimensions (1-5 each).

## Test Case
- **ID**: ${testCase.id}
- **Category**: ${testCase.category}
- **User Query**: "${testCase.query}"
- **Expected Behavior**: ${testCase.expectedBehavior}
- **Requires Tool Call**: ${testCase.requiresToolCall}

## AI Tool Calls Made
${toolCallSummary}

## AI Response
${response}

## Actual Cellar Contents (ground truth, first 20 wines)
${cellarSummaryForJudge}

## Scoring Rubric

**1. Retrieval Accuracy (1-5)**
- 5: Used queryInventory appropriately, all mentioned wines exist in cellar
- 3: Used tool but some wines may not exist, or missed obvious search opportunity
- 1: No tool call when clearly needed, or recommended wines not in cellar

**2. Relevance (1-5)**
- 5: Response directly answers the question, wines are perfect for the context
- 3: Partially relevant, some wines fit but reasoning is generic
- 1: Completely off-topic or irrelevant wines

**3. Reasoning Quality (1-5)**
- 5: Explains WHY each wine fits, demonstrates sommelier expertise, mentions tasting notes/pairing logic
- 3: Basic reasoning, mentions type/region but no depth
- 1: No explanation or wrong reasoning

**4. Diversity (1-5)**
- 5: Varied recommendations (different types, regions, price points when appropriate)
- 3: Some variety but could be more diverse
- 1: All same type/region/price, or only one recommendation when multiple expected

**5. Red Flags (1-5, where 5 = no red flags)**
- 5: No hallucinated wines, no wrong pairings, no missing tool calls, proper format
- 3: Minor issues (e.g., slightly wrong vintage, generic tasting notes that may be hallucinated)
- 1: Major issues (hallucinated wines not in cellar, dangerous pairings, prompt leak, broken format)

Respond with ONLY valid JSON (no markdown fences):
{"retrievalAccuracy": <1-5>, "relevance": <1-5>, "reasoningQuality": <1-5>, "diversity": <1-5>, "redFlags": <1-5>, "notes": "<brief explanation of scores>"}`;

  try {
    const judgeResponse = await callGeminiProxy({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: judgePrompt }] }],
    });

    const rawText = (judgeResponse?.text || '').trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(rawText);
  } catch (err) {
    console.error(`  Judge error: ${err}`);
    return {
      retrievalAccuracy: 0,
      relevance: 0,
      reasoningQuality: 0,
      diversity: 0,
      redFlags: 0,
      notes: `Judge call failed: ${err}`,
    };
  }
}

// ── Run Single Test ──

async function runTest(
  testCase: TestCase,
  cellarSummary: string,
  cellarManifest: CellarManifest,
): Promise<TestResult> {
  const startTime = Date.now();
  const toolCalls: ToolCall[] = [];
  let finalResponse = '';
  let error: string | null = null;

  try {
    const prompt = buildSystemPrompt(cellarSummary);
    const history: any[] = [{ role: 'user', parts: [{ text: testCase.query }] }];

    let response = await callGeminiProxy({
      model: MODEL,
      contents: history,
      systemInstruction: prompt,
      tools: TOOL_DECLARATIONS,
    });

    finalResponse = response.text || '';
    let toolRound = 0;

    while (response.functionCalls?.length > 0 && response.candidateContent && toolRound < MAX_TOOL_ROUNDS) {
      toolRound++;

      for (const call of response.functionCalls) {
        if (call.name === 'queryInventory') {
          const data = await callQueryInventory(call.args);
          const resultStr = formatToolResult(data);

          toolCalls.push({
            round: toolRound,
            name: call.name,
            args: call.args,
            resultSummary: resultStr.substring(0, 200),
            wineCount: data.wines?.length || 0,
          });

          // Inject tool result exactly as production does
          history.push(response.candidateContent);
          history.push({
            role: 'user',
            parts: [{ text: `Tool Output: ${JSON.stringify([{ result: resultStr }])}` }],
          });
        }
      }

      response = await callGeminiProxy({
        model: MODEL,
        contents: history,
        systemInstruction: prompt,
        tools: TOOL_DECLARATIONS,
      });
      finalResponse = response.text || finalResponse || 'Processed.';
    }
  } catch (err: any) {
    error = err.message || String(err);
    console.error(`  Error: ${error}`);
  }

  // Score with LLM-as-judge
  const scores = await judgeResponse(testCase, finalResponse, toolCalls, cellarManifest);

  return {
    id: testCase.id,
    category: testCase.category,
    query: testCase.query,
    finalResponse,
    toolCalls,
    toolRounds: toolCalls.length > 0 ? Math.max(...toolCalls.map(tc => tc.round)) : 0,
    scores,
    error,
    durationMs: Date.now() - startTime,
  };
}

// ── Build Cellar Manifest ──

async function buildCellarManifest(): Promise<CellarManifest> {
  console.log('Step 0: Reading cellar via queryInventory...');

  const data = await callQueryInventory({ limit: 20 });
  const wines = data.wines || [];

  const types: Record<string, number> = {};
  const countries: Record<string, number> = {};
  const producers: string[] = [];

  wines.forEach((w: any) => {
    types[w.type] = (types[w.type] || 0) + 1;
    if (w.country) countries[w.country] = (countries[w.country] || 0) + 1;
    if (w.producer && !producers.includes(w.producer)) producers.push(w.producer);
  });

  const prices = wines.map((w: any) => Number(w.price) || 0).filter((p: number) => p > 0);

  const manifest: CellarManifest = {
    totalWines: data.total || wines.length,
    wines,
    types,
    countries,
    priceRange: prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 },
    producers,
  };

  console.log(`  Found ${manifest.totalWines} wines total (${wines.length} returned)`);
  console.log(`  Types: ${JSON.stringify(types)}`);
  console.log(`  Countries: ${JSON.stringify(countries)}`);
  console.log(`  Price range: $${manifest.priceRange.min}-$${manifest.priceRange.max}`);
  console.log(`  Producers: ${producers.slice(0, 10).join(', ')}${producers.length > 10 ? '...' : ''}`);

  return manifest;
}

// ── Main ──

async function main() {
  console.log('=== Remy Sommelier AI Audit — Test Harness ===\n');

  // Step 0: Build cellar manifest
  const manifest = await buildCellarManifest();

  // Also fetch a broader set for the summary
  const broadData = await callQueryInventory({ limit: 20 });
  const cellarSummary = buildCellarSummary(broadData.wines || []);
  console.log(`\nCellar summary: ${cellarSummary.substring(0, 200)}...\n`);

  // Load test cases
  const testCasesPath = resolve(__dirname, '03-test-cases.json');
  const testCases: TestCase[] = JSON.parse(readFileSync(testCasesPath, 'utf-8'));
  console.log(`Loaded ${testCases.length} test cases.\n`);

  // Run tests
  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`[${i + 1}/${testCases.length}] ${tc.id}: ${tc.query.substring(0, 60)}...`);

    const result = await runTest(tc, cellarSummary, manifest);
    results.push(result);

    const avgScore = (
      result.scores.retrievalAccuracy +
      result.scores.relevance +
      result.scores.reasoningQuality +
      result.scores.diversity +
      result.scores.redFlags
    ) / 5;

    console.log(`  Tools: ${result.toolCalls.length} calls in ${result.toolRounds} rounds`);
    console.log(`  Scores: RA=${result.scores.retrievalAccuracy} REL=${result.scores.relevance} RQ=${result.scores.reasoningQuality} DIV=${result.scores.diversity} RF=${result.scores.redFlags} AVG=${avgScore.toFixed(1)}`);
    console.log(`  Duration: ${result.durationMs}ms`);
    if (result.error) console.log(`  ERROR: ${result.error}`);
    console.log('');

    // Rate limiting
    if (i < testCases.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_TESTS_MS));
    }
  }

  // Write results
  const outputPath = resolve(__dirname, '04-results.json');
  writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    cellarManifest: {
      totalWines: manifest.totalWines,
      types: manifest.types,
      countries: manifest.countries,
      priceRange: manifest.priceRange,
      producerCount: manifest.producers.length,
    },
    model: MODEL,
    testCount: results.length,
    results,
  }, null, 2));

  console.log(`\n=== Results written to ${outputPath} ===`);

  // Print summary
  const categories = [...new Set(results.map(r => r.category))];
  console.log('\n=== Summary by Category ===\n');
  console.log('Category                | RA  | REL | RQ  | DIV | RF  | AVG');
  console.log('------------------------|-----|-----|-----|-----|-----|----');

  let overallSum = { ra: 0, rel: 0, rq: 0, div: 0, rf: 0, count: 0 };

  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const avg = (dim: keyof JudgeScores) => {
      const vals = catResults.map(r => Number(r.scores[dim]) || 0);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    const ra = avg('retrievalAccuracy');
    const rel = avg('relevance');
    const rq = avg('reasoningQuality');
    const div = avg('diversity');
    const rf = avg('redFlags');
    const overall = (ra + rel + rq + div + rf) / 5;

    overallSum.ra += ra * catResults.length;
    overallSum.rel += rel * catResults.length;
    overallSum.rq += rq * catResults.length;
    overallSum.div += div * catResults.length;
    overallSum.rf += rf * catResults.length;
    overallSum.count += catResults.length;

    console.log(`${cat.padEnd(24)}| ${ra.toFixed(1)} | ${rel.toFixed(1)} | ${rq.toFixed(1)} | ${div.toFixed(1)} | ${rf.toFixed(1)} | ${overall.toFixed(1)}`);
  }

  const n = overallSum.count;
  const oRA = overallSum.ra / n;
  const oREL = overallSum.rel / n;
  const oRQ = overallSum.rq / n;
  const oDIV = overallSum.div / n;
  const oRF = overallSum.rf / n;
  const oAVG = (oRA + oREL + oRQ + oDIV + oRF) / 5;
  console.log('------------------------|-----|-----|-----|-----|-----|----');
  console.log(`${'OVERALL'.padEnd(24)}| ${oRA.toFixed(1)} | ${oREL.toFixed(1)} | ${oRQ.toFixed(1)} | ${oDIV.toFixed(1)} | ${oRF.toFixed(1)} | ${oAVG.toFixed(1)}`);

  // Tool call analysis
  const totalToolCalls = results.reduce((s, r) => s + r.toolCalls.length, 0);
  const testsWithToolCalls = results.filter(r => r.toolCalls.length > 0).length;
  const testsRequiringToolCalls = results.filter(r => {
    const tc = testCases.find(t => t.id === r.id);
    return tc?.requiresToolCall;
  }).length;
  const testsRequiringAndUsing = results.filter(r => {
    const tc = testCases.find(t => t.id === r.id);
    return tc?.requiresToolCall && r.toolCalls.length > 0;
  }).length;

  const semanticCalls = results.flatMap(r => r.toolCalls).filter(tc => tc.args.semanticQuery).length;
  const structuredOnlyCalls = results.flatMap(r => r.toolCalls).filter(tc => !tc.args.semanticQuery).length;

  console.log('\n=== Tool Call Analysis ===\n');
  console.log(`Total tool calls: ${totalToolCalls}`);
  console.log(`Tests with tool calls: ${testsWithToolCalls}/${results.length}`);
  console.log(`Tests requiring tool calls: ${testsRequiringToolCalls}`);
  console.log(`Tests requiring AND using tool calls: ${testsRequiringAndUsing}/${testsRequiringToolCalls}`);
  console.log(`Semantic queries: ${semanticCalls}`);
  console.log(`Structured-only queries: ${structuredOnlyCalls}`);

  // Error summary
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.log(`\n=== Errors (${errors.length}) ===\n`);
    errors.forEach(r => console.log(`  ${r.id}: ${r.error}`));
  }

  console.log('\n=== Audit Complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
