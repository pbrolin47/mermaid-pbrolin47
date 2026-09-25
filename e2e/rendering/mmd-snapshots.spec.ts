import { readFileSync } from 'node:fs';
import { test } from '@playwright/test';
import {
  assertUniqueSnapshotNames,
  buildFixtureTree,
  collectMmdFixtures,
  DIAGRAMS_DIR,
  fixtureBaseName,
  fixturePath,
  readFixtureMetadata,
  type FixtureTree,
} from '../helpers/mmd-snapshots.ts';
import { imgSnapshotTest } from '../helpers/util.ts';

// Set by CI (.github/workflows/e2e.yml) to 'pr' when a PR's e2e run is
// scoped to the pr tier — narrows fixture collection to each diagram's
// pr/ subfolder instead of every tier.
const fixtureTier = process.env.MERMAID_E2E_FIXTURE_TIER;
const fixtures = await collectMmdFixtures(
  DIAGRAMS_DIR,
  fixtureTier ? `*/${fixtureTier}/**/*.mmd` : undefined
);
// Fail fast if two fixtures would share a screenshot baseline (see helper).
assertUniqueSnapshotNames(fixtures);
const fixtureTree = buildFixtureTree(fixtures);

// Gantt fixtures are dated around 1010-10-10 and several of them exercise the
// today marker, which the renderer places at `new Date()`. Pin the browser
// clock to that date (as `rendering/gantt/gantt.spec.js` does) so the marker
// lands inside the chart instead of billions of pixels to the right.
const FIXED_CLOCKS: Record<string, string> = {
  gantt: '1010-10-10',
};

const fixedClockFor = (relativePath: string): string | undefined =>
  FIXED_CLOCKS[relativePath.split('/')[0]];

const registerFixtureNode = (node: FixtureTree): void => {
  for (const segment of [...node.children.keys()].sort()) {
    test.describe(segment, () => {
      registerFixtureNode(node.children.get(segment)!);
    });
  }

  for (const relativePath of [...node.fixtures].sort()) {
    // Read at registration time (sync, like the fixture file itself below):
    // `tag` has to be a static option on the `test()` call, not something
    // decided from inside the async test body.
    const metadata = readFixtureMetadata(relativePath);
    const tags = metadata?.tags?.map((tag) => (tag.startsWith('@') ? tag : `@${tag}`));

    test(fixtureBaseName(relativePath), { tag: tags }, async ({ page }, testInfo) => {
      if (metadata?.description) {
        testInfo.annotations.push({ type: 'description', description: metadata.description });
      } else {
        // Not a failure — most fixtures don't have one yet — but flagged in the
        // report rather than left silent, since a missing sidecar is otherwise
        // invisible short of opening the fixture's folder directly.
        testInfo.annotations.push({ type: 'metadata', description: 'No metadata found for test' });
      }

      let source: string;
      try {
        source = readFileSync(fixturePath(relativePath), 'utf8');
      } catch (error) {
        throw new Error(
          `Failed to read mmd fixture ${relativePath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      const fixedClock = fixedClockFor(relativePath);
      if (fixedClock) {
        await page.clock.install({ time: new Date(fixedClock) });
      }
      // Mirror the fixture's storage path so Argos sheets group by diagram
      // folder (e.g. diagrams/packet) rather than the runner spec file.
      await imgSnapshotTest(page, testInfo, source, {
        screenshotPath: `diagrams/${relativePath.replace(/\.mmd$/i, '')}`,
      });
    });
  }
};

test.describe('mmd snapshots', () => {
  registerFixtureNode(fixtureTree);
});
