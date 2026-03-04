#!/usr/bin/env tsx
/**
 * Remy Eval Harness — CLI Entry Point
 *
 * Usage:
 *   npx tsx evals/run.ts                           # Full suite with judge
 *   npx tsx evals/run.ts --skip-judge               # Structural only (fast)
 *   npx tsx evals/run.ts --tag=regression            # Regression baseline
 *   npx tsx evals/run.ts --section=A,B               # Specific sections
 *   npx tsx evals/run.ts --id=A1.1,B2.1              # Specific tests
 *   npx tsx evals/run.ts --concurrency=5             # Parallel requests
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { EvalRunConfig } from './config/models.js';
import { runEvals, getTestCases } from './engine/runner.js';
import { printProgress, printSummary } from './reporters/console.js';
import { writeMarkdownReport } from './reporters/markdown.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(): EvalRunConfig {
  const args = process.argv.slice(2);
  const config: EvalRunConfig = {};

  for (const arg of args) {
    if (arg.startsWith('--section=')) {
      config.sections = arg.slice('--section='.length).split(',').map(s => s.trim());
    } else if (arg.startsWith('--id=')) {
      config.ids = arg.slice('--id='.length).split(',').map(s => s.trim());
    } else if (arg.startsWith('--tag=')) {
      config.tags = arg.slice('--tag='.length).split(',').map(s => s.trim());
    } else if (arg === '--skip-judge') {
      config.skipJudge = true;
    } else if (arg.startsWith('--concurrency=')) {
      config.concurrency = parseInt(arg.slice('--concurrency='.length), 10);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Remy Eval Harness

Usage:
  npx tsx evals/run.ts [options]

Options:
  --section=A,B      Run specific sections (A-H)
  --id=A1.1,B2.1     Run specific test IDs
  --tag=regression    Run tests with specific tag
  --skip-judge        Skip LLM judge (structural checks only)
  --concurrency=N     Max parallel API calls (default: 3)
  --help, -h          Show this help

Environment:
  GEMINI_API_KEY      Required for running evals (Gemini API key)

Examples:
  npx tsx evals/run.ts --tag=regression --skip-judge    # Fast regression check
  GEMINI_API_KEY=xxx npx tsx evals/run.ts --tag=regression  # Baseline with judge
  GEMINI_API_KEY=xxx npx tsx evals/run.ts               # Full suite
`);
      process.exit(0);
    }
  }

  return config;
}

async function main() {
  const config = parseArgs();

  // Validate API key
  if (!config.skipJudge && !process.env.GEMINI_API_KEY) {
    console.error('\nError: GEMINI_API_KEY environment variable is required.');
    console.error('Set it before running evals, or use --skip-judge for structural checks only.\n');
    process.exit(1);
  }

  // Preview what will run
  const tests = getTestCases(config);
  if (tests.length === 0) {
    console.error('\nNo tests match the given filters.\n');
    process.exit(1);
  }

  console.log(`\n  Remy Eval Harness`);
  console.log(`  ${'='.repeat(40)}`);
  console.log(`  Tests: ${tests.length}`);
  console.log(`  Mode: ${config.skipJudge ? 'Structural only' : 'Structural + LLM Judge'}`);
  console.log(`  Concurrency: ${config.concurrency || 3}`);
  if (config.sections?.length) console.log(`  Sections: ${config.sections.join(', ')}`);
  if (config.tags?.length) console.log(`  Tags: ${config.tags.join(', ')}`);
  if (config.ids?.length) console.log(`  IDs: ${config.ids.join(', ')}`);
  console.log(`  ${'='.repeat(40)}\n`);

  // Run
  const summary = await runEvals(config, printProgress);

  // Print console summary
  printSummary(summary);

  // Write markdown report
  const resultsDir = resolve(__dirname, 'results');
  const reportPath = writeMarkdownReport(summary, resultsDir);
  console.log(`  Report saved: ${reportPath}\n`);

  // Exit with code based on pass rate
  process.exit(summary.passRate >= 85 ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
