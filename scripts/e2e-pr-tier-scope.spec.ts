import { describe, it, expect } from 'vitest';
import { buildPrTierSpecPattern, SPEC_BASE_DIR, MMD_SNAPSHOTS_SPEC } from './e2e-pr-tier-scope.mjs';

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

  it('returns patterns that Playwright can compile as regular expressions', () => {
    for (const pattern of buildPrTierSpecPattern().split(',')) {
      expect(() => new RegExp(pattern, 'gi')).not.toThrow();
    }
  });

  it('returns a sorted, de-duplicated, comma-separated list', () => {
    const patterns = buildPrTierSpecPattern().split(',');
    expect(patterns).toEqual([...new Set(patterns)].sort());
  });

  it('returns just the runner when the spec base dir has no diagram folders', () => {
    expect(buildPrTierSpecPattern('e2e/does-not-exist')).toBe(MMD_SNAPSHOTS_SPEC);
  });
});
