import { test } from '@playwright/test';
import { imgSnapshotTest } from '../../helpers/util.ts';

const testOptions = [
  { description: '', options: { logLevel: 1 } },
  { description: 'ELK: ', options: { logLevel: 1, layout: 'elk' } },
  { description: 'HD: ', options: { logLevel: 1, look: 'handDrawn' } },
];

// The 43 single-diagram, assertion-free tests that used to live here are now
// fixtures under e2e/diagrams/er-diagram/release/ (one file per diagram x
// config-variant; the default/{logLevel:1} variant was skipped wherever an
// identical fixture already existed from earlier migration work).
//
// 'should render a simple ER diagram with a title' was deliberately NOT
// converted and stays below: its body's frontmatter has mismatched
// indentation (opening `---` at column 0, closing `  ---` indented 2
// spaces), which mermaid's own frontMatterRegex does not match — so the
// title is likely never actually applied. Needs separate investigation
// before converting.

test.describe('Entity Relationship Diagram Unified', () => {
  testOptions.forEach(({ description, options }) => {
    test(`${description}should render multiple ER diagrams`, async ({ page }, testInfo) => {
      await imgSnapshotTest(
        page,
        testInfo,
        [
          `
      erDiagram
          CUSTOMER ||--o{ ORDER : places
          ORDER ||--|{ LINE-ITEM : contains
        `,
          `
      erDiagram
          CUSTOMER ||--o{ ORDER : places
          ORDER ||--|{ LINE-ITEM : contains
        `,
        ],
        options
      );
    });

    test(`${description}should render a simple ER diagram with a title`, async ({
      page,
    }, testInfo) => {
      await imgSnapshotTest(
        page,
        testInfo,
        `---
  title: simple ER diagram
  ---
  erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE-ITEM : contains
  `,
        options
      );
    });
  });
});
