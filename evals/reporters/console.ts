/**
 * Eval Harness — Console Reporter
 *
 * Colored terminal output with section summaries and failure details.
 */

import type { EvalResult, EvalRunSummary, EvalVerdict } from '../config/models.js';

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

function verdictColor(verdict: EvalVerdict): string {
  switch (verdict) {
    case 'PASS': return COLORS.green;
    case 'PARTIAL': return COLORS.yellow;
    case 'FAIL': return COLORS.red;
  }
}

function verdictIcon(verdict: EvalVerdict): string {
  switch (verdict) {
    case 'PASS': return 'o';
    case 'PARTIAL': return '~';
    case 'FAIL': return 'x';
  }
}

/**
 * Print a single test result as it completes (progress output).
 */
export function printProgress(result: EvalResult, index: number, total: number): void {
  const color = verdictColor(result.verdict);
  const icon = verdictIcon(result.verdict);
  const time = result.latencyMs > 0 ? ` ${(result.latencyMs / 1000).toFixed(1)}s` : '';
  const error = result.error ? ` ERROR: ${result.error.slice(0, 80)}` : '';
  process.stdout.write(
    `  ${color}[${icon}]${COLORS.reset} ${result.testId.padEnd(6)} ${result.verdict.padEnd(7)}${time}${error} ${COLORS.dim}(${index}/${total})${COLORS.reset}\n`
  );
}

/**
 * Print the full summary after all tests complete.
 */
export function printSummary(summary: EvalRunSummary): void {
  const { pass, partial, fail, error, totalTests, passRate, durationMs } = summary;

  console.log('\n' + '='.repeat(60));
  console.log(`${COLORS.bold}${COLORS.cyan}  REMY EVAL RESULTS${COLORS.reset}`);
  console.log('='.repeat(60));

  // Section breakdown
  const sections: Record<string, EvalResult[]> = {};
  for (const result of summary.results) {
    const sec = result.section;
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(result);
  }

  const sectionNames: Record<string, string> = {
    A: 'General',
    B: 'Cellar',
    C: 'Mixed',
    D: 'Ingestion',
    E: 'Handoff',
    F: 'Wine Brief',
    G: 'Edge Cases',
    H: 'Voice',
  };

  console.log('\n  Section Breakdown:');
  console.log('  ' + '-'.repeat(56));
  console.log(`  ${'Section'.padEnd(20)} ${'Total'.padEnd(6)} ${'Pass'.padEnd(6)} ${'Part'.padEnd(6)} ${'Fail'.padEnd(6)} Rate`);
  console.log('  ' + '-'.repeat(56));

  for (const [sec, results] of Object.entries(sections).sort(([a], [b]) => a.localeCompare(b))) {
    const p = results.filter(r => r.verdict === 'PASS').length;
    const pt = results.filter(r => r.verdict === 'PARTIAL').length;
    const f = results.filter(r => r.verdict === 'FAIL').length;
    const rate = Math.round((p / results.length) * 100);
    const name = `${sec}. ${sectionNames[sec] || sec}`;
    const rateColor = rate >= 85 ? COLORS.green : rate >= 60 ? COLORS.yellow : COLORS.red;
    console.log(
      `  ${name.padEnd(20)} ${String(results.length).padEnd(6)} ${COLORS.green}${String(p).padEnd(6)}${COLORS.reset} ${COLORS.yellow}${String(pt).padEnd(6)}${COLORS.reset} ${COLORS.red}${String(f).padEnd(6)}${COLORS.reset} ${rateColor}${rate}%${COLORS.reset}`
    );
  }

  console.log('  ' + '-'.repeat(56));

  // Overall
  const overallColor = passRate >= 85 ? COLORS.green : passRate >= 60 ? COLORS.yellow : COLORS.red;
  console.log(`\n  ${COLORS.bold}Overall:${COLORS.reset} ${COLORS.green}${pass} PASS${COLORS.reset} / ${COLORS.yellow}${partial} PARTIAL${COLORS.reset} / ${COLORS.red}${fail} FAIL${COLORS.reset}${error > 0 ? ` / ${COLORS.red}${error} ERROR${COLORS.reset}` : ''}`);
  console.log(`  ${COLORS.bold}Pass Rate:${COLORS.reset} ${overallColor}${passRate}%${COLORS.reset} ${passRate >= 85 ? '(TARGET MET)' : '(below 85% target)'}`);
  console.log(`  ${COLORS.bold}Duration:${COLORS.reset} ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`  ${COLORS.bold}Tests:${COLORS.reset} ${totalTests}`);

  // Print failures
  const failures = summary.results.filter(r => r.verdict === 'FAIL');
  if (failures.length > 0) {
    console.log(`\n  ${COLORS.red}${COLORS.bold}FAILURES:${COLORS.reset}`);
    for (const f of failures) {
      console.log(`\n  ${COLORS.red}[x] ${f.testId}${COLORS.reset}`);
      if (f.error) {
        console.log(`    ${COLORS.dim}Error: ${f.error}${COLORS.reset}`);
      }
      const failedStructural = f.structuralResults.filter(s => !s.passed);
      if (failedStructural.length > 0) {
        console.log(`    Structural failures:`);
        for (const s of failedStructural) {
          console.log(`      - ${s.name}: ${s.detail}`);
        }
      }
      if (f.judgeRationale) {
        console.log(`    Judge (${f.judgeScore}/10): ${f.judgeRationale}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}
