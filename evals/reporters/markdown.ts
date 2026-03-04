/**
 * Eval Harness — Markdown Reporter
 *
 * Generates a full .md report matching REMY_TEST_SUITE.md summary format,
 * with collapsible raw responses and tool call details.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { EvalRunSummary, EvalResult } from '../config/models.js';

const SECTION_NAMES: Record<string, string> = {
  A: 'General Wine Questions',
  B: 'Cellar-Specific Questions',
  C: 'Mixed Questions',
  D: 'Ingestion Flow',
  E: 'Recommend → Remy Handoff',
  F: 'Wine Brief Mode',
  G: 'Edge Cases & Robustness',
  H: 'Voice Input',
};

function verdictEmoji(verdict: string): string {
  switch (verdict) {
    case 'PASS': return 'PASS';
    case 'PARTIAL': return 'PARTIAL';
    case 'FAIL': return 'FAIL';
    default: return verdict;
  }
}

export function generateMarkdownReport(summary: EvalRunSummary): string {
  const lines: string[] = [];

  lines.push('# Remy Eval Report');
  lines.push('');
  lines.push(`**Date:** ${new Date(summary.timestamp).toLocaleString()}`);
  lines.push(`**Duration:** ${(summary.durationMs / 1000).toFixed(1)}s`);
  lines.push(`**Judge:** ${summary.config.skipJudge ? 'Skipped (structural only)' : 'Gemini LLM-as-Judge'}`);
  if (summary.config.sections?.length) lines.push(`**Sections:** ${summary.config.sections.join(', ')}`);
  if (summary.config.tags?.length) lines.push(`**Tags:** ${summary.config.tags.join(', ')}`);
  if (summary.config.ids?.length) lines.push(`**IDs:** ${summary.config.ids.join(', ')}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Section | Total | Pass | Partial | Fail | Score % |');
  lines.push('|---------|-------|------|---------|------|---------|');

  const sections: Record<string, EvalResult[]> = {};
  for (const result of summary.results) {
    if (!sections[result.section]) sections[result.section] = [];
    sections[result.section].push(result);
  }

  for (const [sec, results] of Object.entries(sections).sort(([a], [b]) => a.localeCompare(b))) {
    const p = results.filter(r => r.verdict === 'PASS').length;
    const pt = results.filter(r => r.verdict === 'PARTIAL').length;
    const f = results.filter(r => r.verdict === 'FAIL').length;
    const rate = Math.round((p / results.length) * 100);
    lines.push(`| ${sec}. ${SECTION_NAMES[sec] || sec} | ${results.length} | ${p} | ${pt} | ${f} | ${rate}% |`);
  }

  lines.push(`| **TOTAL** | **${summary.totalTests}** | **${summary.pass}** | **${summary.partial}** | **${summary.fail}** | **${summary.passRate}%** |`);
  lines.push('');
  lines.push(`**Target: >85% PASS rate** — ${summary.passRate >= 85 ? 'MET' : 'NOT MET'}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Per-test details
  lines.push('## Test Details');
  lines.push('');

  let currentSection = '';
  for (const result of summary.results.sort((a, b) => a.testId.localeCompare(b.testId))) {
    if (result.section !== currentSection) {
      currentSection = result.section;
      lines.push(`### Section ${currentSection}: ${SECTION_NAMES[currentSection] || currentSection}`);
      lines.push('');
    }

    const verdict = verdictEmoji(result.verdict);
    lines.push(`#### ${result.testId} — ${verdict}`);
    lines.push('');

    if (result.error) {
      lines.push(`> **Error:** ${result.error}`);
      lines.push('');
      continue;
    }

    // Structural results
    if (result.structuralResults.length > 0) {
      lines.push('**Structural Validators:**');
      for (const s of result.structuralResults) {
        const icon = s.passed ? '[x]' : '[ ]';
        lines.push(`- ${icon} **${s.name}**: ${s.detail}`);
      }
      lines.push('');
    }

    // Judge result
    if (result.judgeScore !== null) {
      lines.push(`**Judge Score:** ${result.judgeScore}/10 (${result.judgeVerdict})`);
      lines.push(`**Judge Rationale:** ${result.judgeRationale}`);
      lines.push('');
    }

    // Tool calls
    if (result.toolCalls.length > 0) {
      lines.push('<details>');
      lines.push(`<summary>Tool Calls (${result.toolCalls.length})</summary>`);
      lines.push('');
      for (const tc of result.toolCalls) {
        lines.push(`**Round ${tc.round}: ${tc.name}**`);
        lines.push('```json');
        lines.push(JSON.stringify(tc.args, null, 2));
        lines.push('```');
        lines.push(`Result: ${tc.result.slice(0, 500)}${tc.result.length > 500 ? '...' : ''}`);
        lines.push('');
      }
      lines.push('</details>');
      lines.push('');
    }

    // Raw response (collapsible)
    lines.push('<details>');
    lines.push(`<summary>Raw Response (${result.turnCount} turns, ${(result.latencyMs / 1000).toFixed(1)}s)</summary>`);
    lines.push('');
    lines.push('```');
    lines.push(result.rawResponse);
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Write the markdown report to the results directory.
 */
export function writeMarkdownReport(summary: EvalRunSummary, resultsDir: string): string {
  mkdirSync(resultsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `eval-${timestamp}.md`;
  const filepath = join(resultsDir, filename);
  writeFileSync(filepath, generateMarkdownReport(summary), 'utf-8');
  return filepath;
}
