import { globby } from 'globby';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { load } from 'js-yaml';

export const DIAGRAMS_DIR = 'e2e/diagrams';

/**
 * Free-form, test-tooling-only metadata for a fixture — kept separate from the
 * diagram's own YAML frontmatter (`config`/`title`/`displayMode`), which is
 * mermaid's rendering config and not a place to park test documentation. Not
 * validated beyond "is a YAML mapping": `description` and `tags` are the two
 * fields the runner currently does anything with, but authors can add others
 * (e.g. `relatedIssue`, `coveredShapes`) for humans reading the file.
 */
export interface FixtureMetadata {
  description?: string;
  tags?: string[];
  [key: string]: unknown;
}

/** Sidecar path for a fixture's metadata */
export const metadataPath = (relativePath: string, diagramsDir = DIAGRAMS_DIR): string =>
  join(diagramsDir, relativePath.replace(/\.mmd$/i, '.meta.yaml'));

/**
 * Reads a fixture's sidecar metadata file, if one exists. Returns `undefined`
 * when there is none — that is the expected, unremarkable case for most
 * fixtures today, not an error. A *malformed* metadata file (bad YAML, or YAML
 * that isn't a mapping) throws rather than being silently discarded, since
 * that means someone got the file wrong and would want to know.
 */
export const readFixtureMetadata = (
  relativePath: string,
  diagramsDir = DIAGRAMS_DIR
): FixtureMetadata | undefined => {
  const path = metadataPath(relativePath, diagramsDir);
  if (!existsSync(path)) {
    return undefined;
  }
  const parsed: unknown = load(readFileSync(path, 'utf8'));
  if (parsed === null || parsed === undefined) {
    return {};
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      `Fixture metadata at ${path} must be a YAML mapping, got: ${JSON.stringify(parsed)}`
    );
  }
  return parsed as FixtureMetadata;
};

export interface FixtureTree {
  fixtures: string[];
  children: Map<string, FixtureTree>;
}

export const fixtureBaseName = (relativePath: string): string =>
  basename(relativePath).replace(/\.mmd$/i, '');

export const buildFixtureTree = (relativePaths: readonly string[]): FixtureTree => {
  const root: FixtureTree = { fixtures: [], children: new Map() };

  for (const relativePath of relativePaths) {
    const segments = relativePath.split('/');
    const fileName = segments.pop();
    if (!fileName) {
      continue;
    }

    let node = root;
    for (const segment of segments) {
      let child = node.children.get(segment);
      if (!child) {
        child = { fixtures: [], children: new Map() };
        node.children.set(segment, child);
      }
      node = child;
    }
    node.fixtures.push(relativePath);
  }

  return root;
};

export const collectMmdFixtures = async (diagramsDir = DIAGRAMS_DIR): Promise<string[]> => {
  return globby('**/*.mmd', { cwd: diagramsDir, onlyFiles: true });
};

export const fixturePath = (relativePath: string, diagramsDir = DIAGRAMS_DIR): string =>
  join(diagramsDir, relativePath);

/**
 * Mirrors the snapshot-name flattening in helpers/util.ts: the screenshot name
 * is the test's title path (folder segments + base name) with every run of
 * non `[\w.-]` characters — including the `/` folder separators — collapsed to
 * `-`. So `a/b/c` and `a/b-c` flatten to the same name. Used to detect fixtures
 * that would share a baseline.
 */
export const snapshotNameKey = (relativePath: string): string =>
  relativePath.replace(/\.mmd$/i, '').replace(/[^\w.-]+/g, '-');

/**
 * Throws if two fixtures collapse to the same snapshot name — otherwise they
 * would write/compare the same screenshot and one would silently mask the
 * other (and churn the Argos baseline). Called once at test registration.
 */
export const assertUniqueSnapshotNames = (relativePaths: readonly string[]): void => {
  const byKey = new Map<string, string[]>();
  for (const relativePath of relativePaths) {
    const key = snapshotNameKey(relativePath);
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.push(relativePath);
    } else {
      byKey.set(key, [relativePath]);
    }
  }
  const collisions = [...byKey.values()].filter((paths) => paths.length > 1);
  if (collisions.length > 0) {
    throw new Error(
      'mmd fixtures collapse to the same snapshot name (one would mask another):\n' +
        collisions.map((paths) => `  ${paths.join('  ==  ')}`).join('\n')
    );
  }
};
