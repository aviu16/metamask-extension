/**
 * Shared types and rendering functions for User Actions and Performance
 * Benchmark sections in the PR announcement comment.
 *
 * Extracted so they can be tested directly without triggering
 * the build-announce index.ts's auto-executing start().
 */
import startCase from 'lodash/startCase';

/**
 * A single benchmark entry from a JSON artifact.
 * Shared across user action and performance benchmark results.
 */
export type BenchmarkEntryResult = {
  testTitle?: string;
  persona?: string;
  mean: Record<string, number>;
  min?: Record<string, number>;
  max?: Record<string, number>;
  stdDev?: Record<string, number>;
  p75?: Record<string, number>;
  p95?: Record<string, number>;
};

/**
 * Renders a single HTML table row cell value, rounding numbers or returning '-'.
 *
 * @param stats - The stats record (e.g. entry.stdDev).
 * @param metric - The metric key.
 * @returns Rounded string or '-'.
 */
function formatCellValue(
  stats: Record<string, number> | undefined,
  metric: string,
): string {
  return stats?.[metric] != null ? Math.round(stats[metric]).toString() : '-';
}

/**
 * Builds table rows from benchmark entries.
 * Shared between user actions and performance tables.
 *
 * @param entries - Array of benchmark entries with names.
 * @returns Array of HTML table row strings.
 */
export function buildTableRows(
  entries: Array<{ benchmarkName: string; entry: BenchmarkEntryResult }>,
): string[] {
  const tableRows: string[] = [];

  for (const { benchmarkName, entry } of entries) {
    const metrics = Object.keys(entry.mean);
    for (let i = 0; i < metrics.length; i++) {
      const metric = metrics[i];
      let row = '';
      if (i === 0) {
        row += `<td rowspan="${metrics.length}">${startCase(benchmarkName)}</td>`;
      }
      row += `<td>${metric}</td>`;
      row += `<td align="right">${Math.round(entry.mean[metric])}</td>`;
      row += `<td align="right">${formatCellValue(entry.stdDev, metric)}</td>`;
      row += `<td align="right">${formatCellValue(entry.p75, metric)}</td>`;
      row += `<td align="right">${formatCellValue(entry.p95, metric)}</td>`;
      tableRows.push(`<tr>${row}</tr>`);
    }
  }

  return tableRows;
}

/**
 * Wraps table rows in a collapsible `<details>` section.
 *
 * @param summary - The summary text for the collapsible header.
 * @param columns - Column headers for the table.
 * @param rows - Pre-built HTML row strings.
 * @returns Full HTML string.
 */
function wrapInDetailsTable(
  summary: string,
  columns: string[],
  rows: string[],
): string {
  const header = `<thead><tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>`;
  const table = `<table>${header}<tbody>${rows.join('')}</tbody></table>`;
  return `<details><summary>${summary}</summary>${table}</details>\n\n`;
}

/**
 * Builds the User Actions benchmark HTML section.
 *
 * @param entries - Parsed benchmark entries.
 * @returns HTML string or empty string if no data.
 */
export function buildUserActionsSection(
  entries: Array<{ benchmarkName: string; entry: BenchmarkEntryResult }>,
): string {
  if (entries.length === 0) {
    return '';
  }
  const rows = buildTableRows(entries);
  return wrapInDetailsTable(
    '🏃 User Actions Benchmark',
    ['Action', 'Metric', 'Mean (ms)', 'Std Dev (ms)', 'P75 (ms)', 'P95 (ms)'],
    rows,
  );
}

/**
 * Builds the Performance Benchmarks HTML section.
 *
 * @param entries - Parsed benchmark entries (may span multiple presets).
 * @returns HTML string or empty string if no data.
 */
export function buildPerformanceBenchmarksSection(
  entries: Array<{ benchmarkName: string; entry: BenchmarkEntryResult }>,
): string {
  if (entries.length === 0) {
    return '';
  }
  const rows = buildTableRows(entries);
  return wrapInDetailsTable(
    '⚡ Performance Benchmarks',
    [
      'Benchmark',
      'Metric',
      'Mean (ms)',
      'Std Dev (ms)',
      'P75 (ms)',
      'P95 (ms)',
    ],
    rows,
  );
}

/**
 * Fetches benchmark JSON artifact for a given preset/platform/buildType.
 * Returns null if the artifact doesn't exist (preset not run or failed).
 *
 * @param hostUrl - Base URL for CI artifacts.
 * @param platform - Browser platform (e.g. 'chrome', 'firefox').
 * @param buildType - Build type (e.g. 'browserify', 'webpack').
 * @param preset - Benchmark preset name.
 * @returns Parsed JSON or null.
 */
export async function fetchBenchmarkJson(
  hostUrl: string,
  platform: string,
  buildType: string,
  preset: string,
): Promise<Record<string, BenchmarkEntryResult> | null> {
  const url = `${hostUrl}/benchmarks/benchmark-${platform}-${buildType}-${preset}.json`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    console.log(
      `No benchmark data found for ${platform}-${buildType}-${preset}`,
    );
    return null;
  }
}

/**
 * Extracts valid benchmark entries from a fetched JSON artifact.
 * Filters out entries that don't have a `mean` object.
 *
 * @param data - Raw parsed JSON from a benchmark artifact.
 * @returns Array of name/entry pairs.
 */
export function extractEntries(
  data: Record<string, BenchmarkEntryResult>,
): Array<{ benchmarkName: string; entry: BenchmarkEntryResult }> {
  return Object.entries(data)
    .filter(([, entry]) => entry.mean && typeof entry.mean === 'object')
    .map(([name, entry]) => ({ benchmarkName: name, entry }));
}
