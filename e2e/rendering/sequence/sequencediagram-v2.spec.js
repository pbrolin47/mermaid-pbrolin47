import { test, expect } from '@playwright/test';
import { renderGraph } from '../../helpers/util.ts';

// Every other test that used to live here (all participant/interaction types,
// creation/destruction, notes, parallel/alt/loop blocks, boxes, font
// settings, and the two "Special Cases" renders) is now fixtures under
// e2e/diagrams/sequence/release/v2-*.mmd. What remains below asserts SVG
// width/style attributes, which a screenshot-only fixture can't express.

test.describe('Sequence Diagram Special Cases', () => {
  test.describe('svg size', () => {
    test('should render a sequence diagram when useMaxWidth is true (default)', async ({
      page,
    }, testInfo) => {
      await renderGraph(
        page,
        testInfo,
        `
      sequenceDiagram
        actor Alice
        participant Bob@{ "type" : "boundary" }
        participant John@{ "type" : "control" }
        Alice ->> Bob: Hello Bob, how are you?
        Bob-->>John: How about you John?
        Bob--x Alice: I am good thanks!
        Bob-x John: I am good thanks!
        Note right of John: Bob thinks a long<br/>long time, so long<br/>that the text does<br/>not fit on a row.
        Bob-->Alice: Checking with John...
        alt either this
          Alice->>John: Yes
        else or this
          Alice->>John: No
        else or this will happen
          Alice->John: Maybe
        end
        par this happens in parallel
          Alice -->> Bob: Parallel message 1
        and
          Alice -->> John: Parallel message 2
        end
      `,
        { sequence: { useMaxWidth: true } }
      );
      const svg = page.locator('svg');
      await expect(svg).toHaveAttribute('width', '100%');
      const style = await svg.getAttribute('style');
      expect(style).toMatch(/^max-width: [\d.]+px;$/);
      const maxWidthValue = parseFloat(style.match(/[\d.]+/g).join(''));
      expect(maxWidthValue).toBeGreaterThanOrEqual(820 * 0.95);
      expect(maxWidthValue).toBeLessThanOrEqual(820 * 1.05);
    });

    test('should render a sequence diagram when useMaxWidth is false', async ({
      page,
    }, testInfo) => {
      await renderGraph(
        page,
        testInfo,
        `
      sequenceDiagram
        actor Alice
        participant Bob@{ "type" : "boundary" }
        participant John@{ "type" : "control" }
        Alice ->> Bob: Hello Bob, how are you?
        Bob-->>John: How about you John?
        Bob--x Alice: I am good thanks!
        Bob-x John: I am good thanks!
        Note right of John: Bob thinks a long<br/>long time, so long<br/>that the text does<br/>not fit on a row.
        Bob-->Alice: Checking with John...
        alt either this
          Alice->>John: Yes
        else or this
          Alice->>John: No
        else or this will happen
          Alice->John: Maybe
        end
        par this happens in parallel
          Alice -->> Bob: Parallel message 1
        and
          Alice -->> John: Parallel message 2
        end
      `,
        { sequence: { useMaxWidth: false } }
      );
      const svg = page.locator('svg');
      const width = parseFloat((await svg.getAttribute('width')) ?? '0');
      expect(width).toBeGreaterThanOrEqual(820 * 0.95);
      expect(width).toBeLessThanOrEqual(820 * 1.05);
      await expect(svg).not.toHaveAttribute('style');
    });
  });
});
