import { describe, it, expect } from 'vitest';
import {
  buildPrTierSpecPattern,
  SPEC_BASE_DIR,
  MMD_SNAPSHOTS_SPEC,
  OTHER_PR_DIR,
} from './e2e-pr-tier-scope.mjs';

// The tests run in the repo root, so the pr/ subfolders created by the file
// reorganisation are present on disk — no mocking needed.

describe('buildPrTierSpecPattern', () => {
  it('always includes the global mmd snapshot runner', () => {
    expect(buildPrTierSpecPattern().split(',')).toContain(MMD_SNAPSHOTS_SPEC);
  });

  it('includes at least one diagram pr subfolder', () => {
    const patterns = buildPrTierSpecPattern().split(',');
    expect(patterns.some((p) => p.startsWith(`${SPEC_BASE_DIR}/`) && p.endsWith('/pr/'))).toBe(
      true
    );
  });

  it('includes the cross-cutting e2e/other/pr specs', () => {
    expect(buildPrTierSpecPattern().split(',')).toContain(`${OTHER_PR_DIR}/`);
  });

  it('returns patterns that Playwright can compile as regular expressions', () => {
    for (const pattern of buildPrTierSpecPattern().split(',')) {
      expect(() => new RegExp(pattern, 'gi')).not.toThrow();
    }
  });

  it('returns a sorted, de-duplicated, comma-separated list', () => {
    const patterns = buildPrTierSpecPattern().split(',');
    expect(patterns).toEqual([...new Set(patterns)].sort());
  });

  it('returns just the runner and e2e/other/pr when the spec base dir has no diagram folders', () => {
    expect(buildPrTierSpecPattern('e2e/does-not-exist').split(',')).toEqual(
      [`${OTHER_PR_DIR}/`, MMD_SNAPSHOTS_SPEC].sort()
    );
  });
});
