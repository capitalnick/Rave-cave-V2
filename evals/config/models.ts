/**
 * Eval Harness — Type Definitions
 */

export type EvalVerdict = 'PASS' | 'PARTIAL' | 'FAIL';

export type EvalMode = 'general' | 'cellar' | 'wine-brief' | 'ingestion' | 'handoff';

export interface StructuralValidatorResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface StructuralValidator {
  name: string;
  check: (response: EvalResponse) => StructuralValidatorResult;
}

export interface EvalTestCase {
  id: string;
  section: string;
  prompt: string;
  mode: EvalMode;
  structuralValidators: StructuralValidator[];
  judgeCriteria: string;
  tags: string[];
  /** Multi-turn: prior conversation turns before the test prompt */
  priorTurns?: { role: 'user' | 'assistant'; content: string }[];
  /** Base64 image to include with the prompt */
  imageBase64?: string;
  /** Pre-staged wine data for commit tests */
  stagedWine?: Record<string, unknown>;
  /** Handoff context injected before the prompt (E-section) */
  handoffContext?: string;
  /** Wine brief context injected before the prompt (F-section) */
  wineBriefContext?: string;
}

export interface EvalResponse {
  text: string;
  toolCalls: ToolCallRecord[];
  turnCount: number;
  latencyMs: number;
}

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: string;
  round: number;
}

export interface JudgeResult {
  score: number;
  verdict: EvalVerdict;
  rationale: string;
}

export interface EvalResult {
  testId: string;
  section: string;
  verdict: EvalVerdict;
  structuralResults: StructuralValidatorResult[];
  judgeScore: number | null;
  judgeVerdict: EvalVerdict | null;
  judgeRationale: string | null;
  rawResponse: string;
  toolCalls: ToolCallRecord[];
  turnCount: number;
  latencyMs: number;
  error?: string;
}

export interface EvalRunConfig {
  sections?: string[];
  ids?: string[];
  tags?: string[];
  skipJudge?: boolean;
  concurrency?: number;
}

export interface EvalRunSummary {
  timestamp: string;
  totalTests: number;
  pass: number;
  partial: number;
  fail: number;
  error: number;
  passRate: number;
  durationMs: number;
  results: EvalResult[];
  config: EvalRunConfig;
}
