/**
 * Eval Harness — LLM-as-Judge
 *
 * Uses Gemini to score responses against acceptance criteria.
 * Scoring: 9-10 = PASS, 6-8 = PARTIAL, 1-5 = FAIL.
 */

import type { EvalVerdict, ToolCallRecord } from '../config/models.js';
import { callGeminiJudge } from '../engine/gemini-client.js';

export interface JudgeResult {
  score: number;
  verdict: EvalVerdict;
  rationale: string;
}

const JUDGE_SYSTEM_PROMPT = `You are an expert evaluator for "Rémy", an AI sommelier chatbot in the "Rave Cave" wine app.

Your job is to score a single response against specific acceptance criteria.

SCORING RUBRIC:
- 9-10: EXCELLENT. Meets all acceptance criteria fully. Response is accurate, well-structured, and in character.
- 7-8: GOOD. Meets most criteria. Minor issues (slightly off tone, missing one detail, etc.) but fundamentally correct.
- 5-6: PARTIAL. Meets some criteria but has notable gaps. May be missing key information or have tone issues.
- 3-4: POOR. Fails most criteria. Major issues with accuracy, relevance, or character.
- 1-2: FAIL. Completely off-base. Wrong information, broken character, or nonsensical response.

IMPORTANT CONTEXT:
- Rémy is a warm, professional French sommelier with French flourishes (but not overdone)
- Rémy NEVER uses emoji
- In cellar mode, Rémy must use queryInventory tool for specific wine queries
- In general mode, Rémy must NOT reference the user's cellar or call queryInventory
- Wine cards use \`\`\`wine fenced blocks with JSON
- Response format should use markdown (headings, bold, bullets)

OUTPUT FORMAT:
Respond with ONLY a valid JSON object (no markdown fences, no extra text):
{"score": <number 1-10>, "verdict": "<PASS|PARTIAL|FAIL>", "rationale": "<2-3 sentence explanation>"}`;

function buildJudgePrompt(
  testId: string,
  userPrompt: string,
  response: string,
  criteria: string,
  toolCalls: ToolCallRecord[],
): string {
  const toolSummary = toolCalls.length > 0
    ? toolCalls.map(t => `  - ${t.name}(${JSON.stringify(t.args)}) → ${t.result.slice(0, 200)}${t.result.length > 200 ? '...' : ''}`).join('\n')
    : '  (none)';

  return `TEST ID: ${testId}

USER PROMPT:
"${userPrompt}"

RÉMY'S RESPONSE:
---
${response}
---

TOOL CALLS MADE:
${toolSummary}

ACCEPTANCE CRITERIA:
${criteria}

Score this response against the acceptance criteria. Remember: 9-10 = PASS, 6-8 = PARTIAL, 1-5 = FAIL.`;
}

function scoreToVerdict(score: number): EvalVerdict {
  if (score >= 9) return 'PASS';
  if (score >= 6) return 'PARTIAL';
  return 'FAIL';
}

/**
 * Judge a response against acceptance criteria using Gemini.
 */
export async function judgeResponse(
  testId: string,
  userPrompt: string,
  response: string,
  criteria: string,
  toolCalls: ToolCallRecord[],
): Promise<JudgeResult> {
  const prompt = buildJudgePrompt(testId, userPrompt, response, criteria, toolCalls);

  try {
    const raw = await callGeminiJudge(JUDGE_SYSTEM_PROMPT, prompt);

    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const parsed = JSON.parse(cleaned);
    const score = Math.max(1, Math.min(10, Number(parsed.score) || 1));
    const verdict = scoreToVerdict(score);

    return {
      score,
      verdict,
      rationale: parsed.rationale || 'No rationale provided',
    };
  } catch (err) {
    return {
      score: 0,
      verdict: 'FAIL',
      rationale: `Judge failed to parse response: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
