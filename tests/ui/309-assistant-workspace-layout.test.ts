import { assert } from "chai";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { chromium, type Browser, type Page } from "playwright";

const root = process.cwd();
const shellHtmlPath = "addon/content/sidebar/assistant-workspace.html";

async function productionShellMarkup() {
  const html = await readFile(shellHtmlPath, "utf8");
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*>/gi, "");
}

async function mountShell(page: Page, shellBundle: string) {
  await page.setContent(await productionShellMarkup(), {
    waitUntil: "domcontentloaded",
  });
  // tsx compiles this file with esbuild's keepNames helper, so functions
  // handed to page.evaluate() are wrapped in __name() at runtime.
  await page.addScriptTag({
    content:
      "globalThis.__name = globalThis.__name || function (fn) { return fn; };",
  });
  await page.addStyleTag({
    path: path.join(root, "addon/content/shared/theme.css"),
  });
  await page.addStyleTag({
    path: path.join(root, "addon/content/sidebar/assistant-workspace.css"),
  });
  await page.evaluate(() => {
    (window as Record<string, unknown>).__zsAssistantWorkspaceBridge = {
      postMessage: () => ({ ok: true }),
    };
  });
  await page.addScriptTag({ content: shellBundle });
  await page.evaluate(() => {
    document.dispatchEvent(new Event("DOMContentLoaded"));
  });
  await page.waitForSelector("#assistant-lane-conversations");
}

describe("Assistant Workspace production layout", function () {
  this.timeout(30_000);

  let browser: Browser;
  let shellBundle: string;

  before(async function () {
    const result = await build({
      entryPoints: [path.join(root, "src/sidebar/assistantWorkspaceShell.js")],
      bundle: true,
      write: false,
      format: "iife",
      jsx: "automatic",
      jsxImportSource: "preact",
      platform: "browser",
      target: "firefox115",
      keepNames: true,
    });
    shellBundle = result.outputFiles[0].text;
    browser = await chromium.launch();
  });

  after(async function () {
    await browser?.close();
  });

  it("keeps the five child frames and mounts Pi Skill Runs on its own page", async function () {
    const page = await browser.newPage({
      viewport: { width: 460, height: 720 },
    });
    try {
      await mountShell(page, shellBundle);
      const frames = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLIFrameElement>(
            "iframe.assistant-frame",
          ),
        ).map((frame) => ({
          id: frame.id,
          source: frame.getAttribute("src"),
        })),
      );
      assert.deepEqual(frames.map((frame) => frame.id).sort(), [
        "assistant-frame-acp-chat",
        "assistant-frame-acp-skills",
        "assistant-frame-pi-conversations",
        "assistant-frame-pi-skill-runs",
        "assistant-frame-skillrunner",
      ]);
      const piSkillRuns = frames.find(
        (frame) => frame.id === "assistant-frame-pi-skill-runs",
      );
      assert.ok(piSkillRuns);

      const child = await browser.newPage({
        viewport: { width: 460, height: 720 },
      });
      try {
        await child.goto(
          pathToFileURL(
            path.join(root, "addon/content/sidebar/pi-skill-runs.html"),
          ).href,
        );
        const childSource = await child.evaluate(() =>
          document.body.getAttribute("data-source"),
        );
        assert.equal(childSource, "pi-skill-runs");
        assert.equal(
          (await child.evaluate(
            () => document.querySelectorAll("main [data-role]").length,
          )) > 0,
          true,
        );
      } finally {
        await child.close();
      }
    } finally {
      await page.close();
    }
  });

  for (const width of [460, 360]) {
    for (const theme of ["light", "dark"] as const) {
      it(`keeps two navigation rows without vertical overflow at ${width}px in ${theme} mode`, async function () {
        const page = await browser.newPage({
          viewport: { width, height: 720 },
        });
        try {
          await mountShell(page, shellBundle);
          await page.evaluate((nextTheme) => {
            document.documentElement.dataset.zsTheme = nextTheme;
          }, theme);
          await page.locator("#assistant-lane-skill-runs").click();
          await page.waitForSelector("#assistant-tab-pi-skill-runs");

          const geometry = await page.evaluate(() => {
            const element = (selector: string) => {
              const match = document.querySelector<HTMLElement>(selector);
              if (!match) throw new Error(`missing ${selector}`);
              return match;
            };
            const rect = (node: Element) => node.getBoundingClientRect();
            const lanes = element("#assistant-workspace-lanes");
            const sources = element("#assistant-workspace-sources");
            const close = element("#assistant-workspace-close");
            const shell = element("main.assistant-workspace-shell");
            const laneButtons = Array.from(
              lanes.querySelectorAll<HTMLElement>("[data-lane]"),
            );
            const sourceButtons = Array.from(
              sources.querySelectorAll<HTMLElement>("[data-tab]"),
            );
            const counts = sourceButtons.map(
              (button) =>
                button.querySelector(".assistant-nav-count")?.textContent,
            );
            return {
              laneRect: rect(lanes),
              sourceRect: rect(sources),
              closeRect: rect(close),
              shellClientHeight: shell.clientHeight,
              shellScrollHeight: shell.scrollHeight,
              sourceClientHeight: sources.clientHeight,
              sourceScrollHeight: sources.scrollHeight,
              sourceScrollWidth: sources.scrollWidth,
              sourceClientWidth: sources.clientWidth,
              laneWidths: laneButtons.map((button) => rect(button).width),
              sourceRects: sourceButtons.map((button) => rect(button)),
              counts,
            };
          });

          assert.equal(geometry.laneWidths.length, 2);
          assert.isAtMost(
            Math.abs(geometry.laneWidths[0] - geometry.laneWidths[1]),
            1,
          );
          assert.isAtLeast(
            geometry.sourceRect.top,
            geometry.laneRect.bottom - 1,
            "sources must sit below the lane row",
          );
          assert.isBelow(
            geometry.closeRect.top,
            geometry.sourceRect.top,
            "close must stay in the first row",
          );
          assert.isAtLeast(
            geometry.closeRect.left,
            geometry.laneRect.right - 1,
            "close must sit to the right of the lane switcher",
          );
          assert.isAtMost(
            geometry.sourceScrollHeight,
            geometry.sourceClientHeight + 1,
          );
          assert.isAtMost(
            geometry.shellScrollHeight,
            geometry.shellClientHeight + 1,
          );
          if (width === 360) {
            assert.isAtLeast(
              geometry.sourceScrollWidth,
              geometry.sourceClientWidth,
            );
          }
          for (const source of geometry.sourceRects) {
            assert.isAtLeast(source.top, geometry.sourceRect.top - 1);
            assert.isAtMost(source.bottom, geometry.sourceRect.bottom + 1);
          }
          assert.isAtMost(
            Math.max(...geometry.sourceRects.map((rect) => rect.top)) -
              Math.min(...geometry.sourceRects.map((rect) => rect.top)),
            1,
            "source entries must remain on one horizontal row",
          );
          assert.lengthOf(geometry.counts, 3);
          assert.notInclude(geometry.counts, undefined);

          await page
            .locator("main.assistant-workspace-shell")
            .click({ position: { x: 2, y: 2 } });
          await page.keyboard.press("Tab");
          const focusOutline = await page.evaluate(() => {
            const active = document.activeElement as HTMLElement;
            const style = getComputedStyle(active);
            return {
              id: active.id,
              focusVisible: active.matches(":focus-visible"),
              outlineStyle: style.outlineStyle,
              outlineWidth: style.outlineWidth,
            };
          });
          assert.include(focusOutline.id, "assistant-");
          assert.isTrue(focusOutline.focusVisible);
          assert.notEqual(focusOutline.outlineStyle, "none");
          assert.notEqual(focusOutline.outlineWidth, "0px");
        } finally {
          await page.close();
        }
      });
    }
  }

  for (const controlCount of [2, 3]) {
    it(`fills the reply control row with ${controlCount} equal columns`, async function () {
      const page = await browser.newPage({
        viewport: { width: 460, height: 360 },
      });
      try {
        const controls = Array.from(
          { length: controlCount },
          (_, index) =>
            `<label class="assistant-panel-selector"><span class="assistant-panel-selector-label">Control ${index + 1}</span><select class="assistant-panel-select"><option>Value</option></select></label>`,
        ).join("");
        await page.setContent(
          `<!doctype html><html><body><main class="asst-panel-shell"><section class="asst-reply-surface"><div class="assistant-panel-reply-footer"><div class="assistant-panel-reply-primary"><button class="asst-button assistant-panel-reply-submit">Send</button></div><div class="assistant-panel-reply-controls">${controls}</div><div class="assistant-panel-reply-secondary"></div></div></section></main></body></html>`,
        );
        await page.addStyleTag({
          path: path.join(root, "addon/content/shared/theme.css"),
        });
        await page.addStyleTag({
          path: path.join(
            root,
            "addon/content/shared/assistant/assistant-panel-shared.css",
          ),
        });
        const metrics = await page.evaluate(() => {
          const controls = document.querySelector<HTMLElement>(
            ".assistant-panel-reply-controls",
          )!;
          const children = Array.from(controls.children).map((child) =>
            child.getBoundingClientRect(),
          );
          return {
            width: controls.getBoundingClientRect().width,
            left: controls.getBoundingClientRect().left,
            right: controls.getBoundingClientRect().right,
            children,
          };
        });
        assert.lengthOf(metrics.children, controlCount);
        const widths = metrics.children.map((rect) => rect.width);
        assert.isAtMost(Math.max(...widths) - Math.min(...widths), 1);
        assert.isAtMost(Math.abs(metrics.children[0].left - metrics.left), 1);
        assert.isAtMost(
          Math.abs(metrics.children[controlCount - 1].right - metrics.right),
          1,
        );
      } finally {
        await page.close();
      }
    });
  }
});
