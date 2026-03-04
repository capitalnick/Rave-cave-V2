/**
 * Eval Harness — Test Runner
 *
 * Executes test cases with concurrency control, structural validation,
 * and optional LLM judge scoring.
 */

import type {
  EvalTestCase, EvalResult, EvalRunConfig, EvalRunSummary, EvalVerdict,
} from '../config/models.js';
import { runEvalConversation } from './conversation.js';
import { judgeResponse } from '../validators/judge.js';

// Import all suites
import { sectionA } from '../suites/a-general.js';
import { sectionB } from '../suites/b-cellar.js';
import { sectionC } from '../suites/c-mixed.js';
import { sectionD } from '../suites/d-ingestion.js';
import { sectionE } from '../suites/e-handoff.js';
import { sectionF } from '../suites/f-wine-brief.js';
import { sectionG } from '../suites/g-edge-cases.js';
import { sectionH } from '../suites/h-voice.js';

const ALL_SUITES: Record<string, EvalTestCase[]> = {
  A: sectionA,
  B: sectionB,
  C: sectionC,
  D: sectionD,
  E: sectionE,
  F: sectionF,
  G: sectionG,
  H: sectionH,
};

/**
 * Get all test cases, optionally filtered.
 */
export function getTestCases(config: EvalRunConfig): EvalTestCase[] {
  let tests: EvalTestCase[] = [];

  if (config.sections && config.sections.length > 0) {
    for (const section of config.sections) {
      const upper = section.toUpperCase();
      if (ALL_SUITES[upper]) {
        tests.push(...ALL_SUITES[upper]);
      }
    }
  } else {
    for (const suite of Object.values(ALL_SUITES)) {
      tests.push(...suite);
    }
  }

  if (config.ids && config.ids.length > 0) {
    const idSet = new Set(config.ids.map(id => id.toUpperCase()));
    tests = tests.filter(t => idSet.has(t.id.toUpperCase()));
  }

  if (config.tags && config.tags.length > 0) {
    const tagSet = new Set(config.tags);
    tests = tests.filter(t => t.tags.some(tag => tagSet.has(tag)));
  }

  return tests;
}

/**
 * Run a single test case and return the result.
 */
async function runSingleTest(
  test: EvalTestCase,
  skipJudge: boolean,
): Promise<EvalResult> {
  try {
    // Run conversation
    const response = await runEvalConversation(test);

    // Run structural validators
    const structuralResults = test.structuralValidators.map(v => v.check(response));
    const structuralFailCount = structuralResults.filter(r => !r.passed).length;

    // Run LLM judge (unless skipped)
    let judgeScore: number | null = null;
    let judgeVerdict: EvalVerdict | null = null;
    let judgeRationale: string | null = null;

    if (!skipJudge) {
      const judge = await judgeResponse(
        test.id,
        test.prompt,
        response.text,
        test.judgeCriteria,
        response.toolCalls,
      );
      judgeScore = judge.score;
      judgeVerdict = judge.verdict;
      judgeRationale = judge.rationale;
    }

    // Compute final verdict
    let verdict: EvalVerdict;
    if (skipJudge) {
      // Structural-only mode
      if (structuralFailCount === 0) verdict = 'PASS';
      else if (structuralFailCount <= 2) verdict = 'PARTIAL';
      else verdict = 'FAIL';
    } else {
      // Combined mode
      const allStructuralPass = structuralFailCount === 0;
      if (allStructuralPass && judgeVerdict === 'PASS') {
        verdict = 'PASS';
      } else if (judgeVerdict === 'FAIL' || structuralFailCount > 2) {
        verdict = 'FAIL';
      } else {
        verdict = 'PARTIAL';
      }
    }

    return {
      testId: test.id,
      section: test.section,
      verdict,
      structuralResults,
      judgeScore,
      judgeVerdict,
      judgeRationale,
      rawResponse: response.text,
      toolCalls: response.toolCalls,
      turnCount: response.turnCount,
      latencyMs: response.latencyMs,
    };
  } catch (err) {
    return {
      testId: test.id,
      section: test.section,
      verdict: 'FAIL',
      structuralResults: [],
      judgeScore: null,
      judgeVerdict: null,
      judgeRationale: null,
      rawResponse: '',
      toolCalls: [],
      turnCount: 0,
      latencyMs: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Run tests in batches with concurrency control.
 */
async function runBatched(
  tests: EvalTestCase[],
  concurrency: number,
  skipJudge: boolean,
  onProgress: (result: EvalResult, index: number, total: number) => void,
): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  let completed = 0;

  for (let i = 0; i < tests.length; i += concurrency) {
    const batch = tests.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(test => runSingleTest(test, skipJudge))
    );

    for (const settled of batchResults) {
      const result = settled.status === 'fulfilled'
        ? settled.value
        : {
            testId: 'unknown',
            section: '?',
            verdict: 'FAIL' as EvalVerdict,
            structuralResults: [],
            judgeScore: null,
            judgeVerdict: null,
            judgeRationale: null,
            rawResponse: '',
            toolCalls: [],
            turnCount: 0,
            latencyMs: 0,
            error: settled.reason?.message || 'Unknown error',
          };
      results.push(result);
      completed++;
      onProgress(result, completed, tests.length);
    }
  }

  return results;
}

/**
 * Main entry point for running evals.
 */
export async function runEvals(
  config: EvalRunConfig,
  onProgress?: (result: EvalResult, index: number, total: number) => void,
): Promise<EvalRunSummary> {
  const startTime = Date.now();
  const tests = getTestCases(config);
  const concurrency = config.concurrency || 3;
  const skipJudge = config.skipJudge || false;

  const progressFn = onProgress || (() => {});

  const results = await runBatched(tests, concurrency, skipJudge, progressFn);

  const pass = results.filter(r => r.verdict === 'PASS').length;
  const partial = results.filter(r => r.verdict === 'PARTIAL').length;
  const fail = results.filter(r => r.verdict === 'FAIL' && !r.error).length;
  const error = results.filter(r => !!r.error).length;

  return {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    pass,
    partial,
    fail,
    error,
    passRate: results.length > 0 ? Math.round((pass / results.length) * 100) : 0,
    durationMs: Date.now() - startTime,
    results,
    config,
  };
}
