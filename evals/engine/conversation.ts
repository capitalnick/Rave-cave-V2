/**
 * Eval Harness — Conversation Engine
 *
 * Multi-round tool loop mirroring useGeminiLive.ts pattern.
 * Calls Gemini directly and dispatches tool calls to the simulator.
 */

import type { EvalTestCase, EvalResponse, ToolCallRecord } from '../config/models.js';
import { buildCellarSnapshot, FIXTURE_WINES } from '../config/fixtures.js';
import { callGeminiDirect } from './gemini-client.js';
import { handleToolCall } from './tool-simulator.js';

const MAX_TOOL_ROUNDS = 5;

/**
 * Tool declarations — duplicated from useGeminiLive.ts (which we cannot import/modify).
 */
const TOOL_DECLARATIONS = [{ functionDeclarations: [
  {
    name: 'queryInventory',
    description: "Search the user's wine cellar. Use this whenever you need to find specific wines, answer questions about inventory, make food pairing recommendations, or check what's available. Always use this tool rather than relying on the cellar summary for specific wine queries.",
    parameters: {
      type: 'OBJECT',
      properties: {
        wineType: { type: 'STRING', description: 'Wine type filter: Red, White, Rosé, Sparkling, Dessert, Fortified' },
        country: { type: 'STRING', description: 'Country filter' },
        region: { type: 'STRING', description: 'Region filter' },
        producer: { type: 'STRING', description: 'Producer name filter (partial match)' },
        grapeVarieties: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Grape variety filter' },
        vintageMin: { type: 'NUMBER', description: 'Minimum vintage year' },
        vintageMax: { type: 'NUMBER', description: 'Maximum vintage year' },
        priceMin: { type: 'NUMBER', description: 'Minimum price' },
        priceMax: { type: 'NUMBER', description: 'Maximum price' },
        maturityStatus: { type: 'STRING', description: 'Maturity filter: HOLD, DRINK_NOW, or PAST_PEAK' },
        query: { type: 'STRING', description: 'Free text search across producer, name, grape varieties, region, appellation' },
        sortBy: { type: 'STRING', description: 'Sort field: vintage, price, or rating' },
        sortOrder: { type: 'STRING', description: 'Sort direction: asc or desc' },
        limit: { type: 'NUMBER', description: 'Max results to return (default 10, max 20)' },
        semanticQuery: { type: 'STRING', description: "Natural language description of what you're looking for. Use for food pairing queries, mood-based requests, or characteristic descriptions. Examples: 'bold earthy red for braised meat', 'crisp refreshing white for seafood'. Can be combined with structured filters." },
      },
    },
  },
  {
    name: 'stageWine',
    parameters: {
      type: 'OBJECT',
      properties: {
        producer: { type: 'STRING', description: 'Wine producer/house name' },
        vintage: { type: 'NUMBER', description: 'Vintage year' },
        type: { type: 'STRING', description: 'Wine type: Red, White, Rosé, Sparkling, Dessert, Fortified' },
        name: { type: 'STRING', description: 'Cuvee/bottling name only — must NOT duplicate producer or grape variety' },
        grapeVarieties: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'Variety name, e.g. Shiraz' },
              pct: { type: 'NUMBER', description: 'Percentage (optional). Integer 1-100.' },
            },
            required: ['name'],
          },
          description: 'Grape varieties, ordered by dominance. Max 5.',
        },
        region: { type: 'STRING', description: 'Wine region' },
        country: { type: 'STRING', description: 'Country of origin' },
        appellation: { type: 'STRING', description: 'Appellation or classification' },
        tastingNotes: { type: 'STRING', description: 'Comma-separated flavour adjectives (5-8 descriptors)' },
        drinkFrom: { type: 'NUMBER', description: 'Suggested drink-from year' },
        drinkUntil: { type: 'NUMBER', description: 'Suggested drink-until year' },
        format: { type: 'STRING', description: 'Bottle format e.g. 750ml, 1.5L' },
      },
      required: ['producer', 'vintage', 'type'],
    },
  },
  {
    name: 'commitWine',
    parameters: {
      type: 'OBJECT',
      properties: {
        price: { type: 'NUMBER' },
        quantity: { type: 'NUMBER' },
      },
      required: ['price'],
    },
  },
] }];

/**
 * Build the system prompt for the given test mode.
 * Imports buildSystemPrompt from constants.tsx via dynamic path.
 */
function buildPromptForMode(
  mode: string,
  stagedWineJson?: string,
  wineBriefContext?: string,
  handoffContext?: string,
): string {
  // We inline the buildSystemPrompt logic here to avoid needing Vite path aliases at runtime.
  // This is a faithful reproduction from src/constants.tsx.
  const currentYear = new Date().getFullYear();
  const cellarSnapshot = buildCellarSnapshot(FIXTURE_WINES);
  const hasCellar = mode === 'cellar' || mode === 'ingestion' || mode === 'handoff';
  const includeBridge = mode === 'general';

  const cellarSection = hasCellar
    ? `CELLAR SUMMARY:
${cellarSnapshot}

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
- CASUAL PRICE CAPS: When the occasion is casual (BBQ, weeknight, easy-drinking, relaxed), enforce strict price limits — white wines must be under $30 and red wines must be under $40. Use priceMax in your queryInventory call to enforce this.
- QUANTITY CHECK: For group occasions, verify the wine has enough bottles (Qty field). Don't suggest a wine with Qty: 1 for a party of 8.
- DIVERSITY: When recommending multiple wines, vary by type, region, and price point. Don't recommend three wines from the same producer or region unless the user specifically asks for that.
- USE THE DATA: When queryInventory returns tasting notes, grape varieties, ratings, and drink windows — USE them in your response. Quote the actual tasting notes, mention the actual grape variety, cite the actual rating. Do not substitute your own guesses.`
    : `CELLAR ACCESS:
You do not currently have access to the user's cellar inventory. Answer as a knowledgeable sommelier based on general wine expertise. Do NOT call queryInventory — it is not available in this mode. You may still use stageWine and commitWine if the user uploads a wine label.`;

  const bridgeInstruction = includeBridge
    ? `\nCELLAR BRIDGE (IMPORTANT):
After answering the user's wine question, append a single brief friendly line inviting the user to check their Rave Cave — for example to find a similar bottle or to add this wine to their collection. Example: "Want me to check your Rave Cave for something similar?" — Keep it natural. Only offer this ONCE. Do NOT repeat it on subsequent messages.`
    : '';

  const wineBriefSection = mode === 'wine-brief'
    ? `\nWINE BRIEF MODE:
When you receive a message starting with [WINE_BRIEF_CONTEXT], the user has scanned a wine label and wants your expert assessment. Respond with a structured Wine Brief using exactly these 6 sections as ## markdown headers, in this order:

## THE VERDICT
2-3 sentences. Your honest, punchy take on this wine. Is it a gem, a solid daily drinker, or overpriced plonk? Be opinionated.

## THE WINE
2-3 sentences. Producer reputation, appellation significance, grape variety character. Reference the region and terroir.

## WHAT TO EXPECT IN THE GLASS
2-4 sentences. Aroma, palate, texture, finish. Be vivid and specific — describe what someone will actually taste.

## THIS VINTAGE
2-3 sentences. What happened in this vintage year for the region. Was it a great year, average, or challenging? How does that affect this bottle?

## VALUE VERDICT
2-3 sentences. Is this wine worth the price? Compare to similar wines. Mention if it's a steal, fair, or overpriced.

## REMY'S CALL
2-3 sentences. Your final word: when to drink it, what to pair it with, and whether to buy more.

After the 6 sections, append a \`\`\`wine fence block with the wine data (same format as recommendation cards). Use the fields from the staged wine data provided in the context message. Do NOT fabricate ratings — omit if unknown.

CRITICAL: In Wine Brief mode, do NOT call any tools (queryInventory, stageWine, commitWine). Answer purely from your expertise and the provided wine data.`
    : '';

  return `You are Rémy, an expert French sommelier for "Rave Cave".
Current year: ${currentYear}.

VOICE: Warm, professional, sophisticated, energetic. Use brief French flourishes ("Magnifique", "S'il vous plaît").

IMAGE INTENTS:
1. WINE LABEL: Extract details and call stageWine(). ALWAYS analyze vintage, grape, and region to provide suggested drinking windows.
2. WINE LIST: Analyze the menu and recommend specific pairings. Do NOT call stageWine for lists.

WINE NAME RULES (CRITICAL):
- "name" is the CUVEE name only (e.g., "Reserve Speciale", "Bin 389", "Les Terrasses")
- name must NEVER duplicate or contain the producer name
- name must NEVER duplicate or contain the grape variety
- If no distinct cuvee name is visible, leave name EMPTY
- Examples:
  * Producer "Penfolds", name "Bin 389" → correct
  * Producer "Cloudy Bay", name "Sauvignon Blanc" → WRONG (that's a grape variety). Leave empty.
  * Producer "Chateau Margaux", name "Chateau Margaux" → WRONG (duplicates producer). Leave empty.

INGESTION FLOW:
1. User uploads label -> You call stageWine().
2. You confirm details and MUST ask for price (and optionally quantity).
3. User provides price (e.g., "$35" or "40 bottles for $800") -> You call commitWine().
4. DO NOT say "it's added" until the commitWine tool is successfully called.

${cellarSection}
${bridgeInstruction}
${wineBriefSection}

TOOLS:
- queryInventory: Search the cellar. Parameters include wineType, country, region, producer, grapeVarieties, vintageMin/Max, priceMin/Max, maturityStatus, query, sortBy, sortOrder, limit, semanticQuery.
- stageWine: Stage extracted label data. Include ALL visible fields: producer (required), vintage (required), type (required), name (cuvee only), grapeVarieties (array of {name, pct?}), region, country, appellation, tastingNotes, drinkFrom, drinkUntil, format.
- commitWine: Finalize the add (requires price, optional quantity).

RESPONSE FORMAT:
- Use **markdown**: headings (#), bold (**text**), italic, bullet lists.
- When recommending specific wines, embed them in a fenced code block with language tag \`wine\`:
  \`\`\`wine
  [{"producer":"...","name":"...","vintage":2015,"region":"Burgundy","country":"France","type":"Red","grapeVarieties":[{"name":"Pinot Noir"}],"rating":4.8,"tastingNotes":"Dark cherry, earth, silky tannins","drinkFrom":2024,"drinkUntil":2035,"note":"Perfect match for your dinner"}]
  \`\`\`
- Wine JSON fields: producer (required), name (required — use empty string if no cuvee), vintage, region, country, type, grapeVarieties (array of {name, pct?}), rating (0-5 scale), tastingNotes (from tool results, NOT fabricated), drinkFrom (year), drinkUntil (year), note (your recommendation rationale).
- For tastingNotes: Use the notes from queryInventory results. If no notes were returned, write "Tasting notes not available" — do NOT fabricate them.
- For rating: Convert from the 0-100 scale in tool results by dividing by 20 (e.g., 88/100 → 4.4). If no rating was returned, omit the field.
- For drinkFrom/drinkUntil: Use the values from tool results. If not available, you may estimate based on your expertise but note it as "estimated".
- Place wine blocks after explanatory text, not inline.
- Do NOT use wine blocks for casual wine mentions — only explicit recommendations.`;
}

/**
 * Run a full eval conversation for a single test case.
 * Returns the final response with all tool call records.
 */
export async function runEvalConversation(test: EvalTestCase): Promise<EvalResponse> {
  const startTime = Date.now();
  const allToolCalls: ToolCallRecord[] = [];
  let turnCount = 0;

  // Build system prompt
  const stagedWineJson = test.stagedWine ? JSON.stringify(test.stagedWine) : undefined;
  const systemPrompt = buildPromptForMode(
    test.mode,
    stagedWineJson,
    test.wineBriefContext,
    test.handoffContext,
  );

  // Build conversation history
  const history: any[] = [];

  // Inject prior turns
  if (test.priorTurns) {
    for (const turn of test.priorTurns) {
      history.push({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      });
    }
  }

  // Build the user message
  const userParts: any[] = [];

  // Prepend handoff context if present
  if (test.handoffContext) {
    userParts.push({ text: test.handoffContext + '\n\n' + test.prompt });
  } else if (test.wineBriefContext) {
    userParts.push({ text: test.wineBriefContext + '\n\n' + test.prompt });
  } else {
    userParts.push({ text: test.prompt });
  }

  // Add image if present
  if (test.imageBase64) {
    userParts.push({ inlineData: { data: test.imageBase64, mimeType: 'image/jpeg' } });
  }

  history.push({ role: 'user', parts: userParts });

  // Determine tools based on mode
  const tools = test.mode === 'wine-brief' ? undefined : TOOL_DECLARATIONS;

  // First call
  let response = await callGeminiDirect({
    contents: history,
    systemInstruction: systemPrompt,
    tools,
  });
  turnCount++;

  let finalContent = response.text || '';

  // Multi-round tool loop
  let toolRound = 0;
  while (response.functionCalls && response.functionCalls.length > 0 && response.candidateContent && toolRound < MAX_TOOL_ROUNDS) {
    toolRound++;
    const calls = response.functionCalls;

    // Execute tool calls
    const toolResults = calls.map((call: any) => {
      const result = handleToolCall(call.name, call.args);
      allToolCalls.push({
        name: call.name,
        args: call.args,
        result,
        round: toolRound,
      });
      return { result };
    });

    // Add to history
    history.push(response.candidateContent);
    history.push({
      role: 'function',
      parts: calls.map((call: any, i: number) => ({
        functionResponse: {
          name: call.name,
          response: toolResults[i],
        },
      })),
    });

    // Next round
    response = await callGeminiDirect({
      contents: history,
      systemInstruction: systemPrompt,
      tools,
    });
    turnCount++;
    finalContent = response.text || finalContent || 'Processed.';
  }

  return {
    text: finalContent,
    toolCalls: allToolCalls,
    turnCount,
    latencyMs: Date.now() - startTime,
  };
}
