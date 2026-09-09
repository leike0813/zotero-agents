import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

describe("shared markdown renderer contract", function () {
  it("preserves transcript line breaks and sanitizes document HTML", async function () {
    const { chromium } = await import("playwright");
    const root = process.cwd();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "zs-md-renderer-"));
    const htmlPath = path.join(tempDir, "renderer.html");
    const script = (relativePath: string) =>
      `<script src="${pathToFileURL(path.join(root, relativePath)).href}"></script>`;
    await fs.writeFile(
      htmlPath,
      [
        "<!doctype html>",
        '<meta charset="utf-8" />',
        script("addon/content/shared/vendor/markdown-it/markdown-it.min.js"),
        script("addon/content/shared/vendor/katex/katex.min.js"),
        script(
          "addon/content/shared/vendor/markdown-it-texmath/texmath.min.js",
        ),
        script("addon/content/shared/vendor/highlight/highlight.min.js"),
        script("addon/content/shared/markdown-renderer.js"),
        '<div id="root"></div>',
      ].join("\n"),
      "utf8",
    );

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto(pathToFileURL(htmlPath).href);
      const result = await page.evaluate(() => {
        const renderer = (window as any).ZoteroSkillsMarkdownRenderer;
        const transcript = renderer.renderToHtml(
          "alpha\nbeta\n\n```js\nx\n```",
          {
            profile: "transcript",
          },
        );
        const documentHtml = renderer.renderToHtml(
          '# Title\n\n<a href="javascript:alert(1)" onclick="bad()">bad</a>\n\n<script>bad()</script>',
          { profile: "document" },
        );
        const root = document.getElementById("root")!;
        renderer.renderInto(root, "# Title\n\n## Child", {
          profile: "document",
          headingIdPrefix: "contract",
        });
        const outline = renderer.buildOutline(root, {
          title: "Outline",
        });
        return {
          transcript,
          documentHtml,
          headingIds: Array.from(root.querySelectorAll("h1, h2")).map(
            (node) => (node as HTMLElement).id,
          ),
          outlineLinks: outline?.querySelectorAll("a").length || 0,
        };
      });

      assert.include(result.transcript, "alpha<br>");
      assert.include(result.transcript, "<pre><code");
      assert.notInclude(result.documentHtml, "<script");
      assert.notInclude(result.documentHtml, "onclick");
      assert.notInclude(result.documentHtml, "javascript:");
      assert.deepEqual(result.headingIds, ["contract-title", "contract-child"]);
      assert.equal(result.outlineLinks, 2);
    } finally {
      await browser.close();
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
