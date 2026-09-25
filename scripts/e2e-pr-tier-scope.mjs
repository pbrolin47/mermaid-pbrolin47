#!/usr/bin/env node
/**
 * Builds the Playwright spec pattern for a "pr tier" e2e run: every
 * diagram's curated pr-subfolder hand-written specs under e2e/rendering,
 * the cross-cutting specs under e2e/other/pr (xss, ghsa, configuration,
 * etc.), plus the global mmd snapshot runner (which is separately
 * tier-filtered to each diagram's pr-subfolder fixtures under e2e/diagrams
 * at runtime, via MERMAID_E2E_FIXTURE_TIER).
 *
 * Convention: every diagram folder under e2e/rendering may have a pr
 * subfolder. No hardcoded diagram list — discovered at runtime, same as
 * scripts/e2e-diagram-scope.mjs.
 *
 * Used by .github/workflows/e2e.yml's detect-scope job when a PR on this
 * fork carries the "run pr tests" label (or is freshly opened, since that
 * label defaults to on).
 *
 * CLI usage:
 *   node scripts/e2e-pr-tier-scope.mjs
 *
 * Module usage:
 *   import { buildPrTierSpecPattern } from './e2e-pr-tier-scope.mjs';
 */

import { existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';

export const SPEC_BASE_DIR = 'e2e/rendering';
export const MMD_SNAPSHOTS_SPEC = `${SPEC_BASE_DIR}/mmd-snapshots.spec.ts`;
// e2e/other/ holds cross-cutting specs (xss, ghsa, configuration, iife,
// interaction, rerender, external-diagrams) — not a per-diagram folder, so
// it isn't discovered by the e2e/rendering scan below and is checked
// explicitly instead.
export const OTHER_PR_DIR = 'e2e/other/pr';

/**
 * @param {string} [specBaseDir]
 * @returns {string} Comma-separated, sorted spec pattern for `playwright test`.
 */
export function buildPrTierSpecPattern(specBaseDir = SPEC_BASE_DIR) {
  const specs = new Set();

  let entries;
  try {
    entries = readdirSync(specBaseDir, { withFileTypes: true });
  } catch {
    entries = [];
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const prDir = `${specBaseDir}/${entry.name}/pr`;
    if (existsSync(prDir)) {
      specs.add(`${prDir}/`);
    }
  }

  if (existsSync(OTHER_PR_DIR)) {
    specs.add(`${OTHER_PR_DIR}/`);
  }

  specs.add(MMD_SNAPSHOTS_SPEC);

  return [...specs].sort().join(',');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(buildPrTierSpecPattern());
}
