import { assert } from "chai";
import path from "node:path";
import { pathToFileURL } from "node:url";

describe("markdown reader html contract", function () {
  it("loads markdown through the injected bridge without parent postMessage", async function () {
    this.timeout(30000);

    const { chromium } = await import("playwright");
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(5000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });

    await page.addInitScript(`
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async () => undefined },
      });
      window.__openedByBridge = false;
      window.__sidebarOpen = false;
      window.__zoteroSkillsMarkdownReaderBridge = {
        requestDocument: async () => ({
          itemID: "reader-contract",
          itemKey: "READERCONTRACT",
          title: "Reader Contract",
          filePath: "D:\\\\Library\\\\reader.md",
          baseFileUri: "file:///D%3A/Library/reader.md",
          markdown: "# Reader Contract\\n\\n## Section\\n\\nBody",
          locale: "zh-CN",
          messages: {
            searchPlaceholder: "搜索文档",
            refresh: "刷新文档",
            copyMarkdown: "复制 Markdown 内容",
            openFolder: "在文件管理器中打开",
            copied: "已复制",
            copyFailed: "复制失败",
            fontSmaller: "缩小字号",
            fontLarger: "放大字号",
            width: "切换阅读宽度",
            widthWide: "使用宽版阅读宽度",
            widthNarrow: "使用舒适阅读宽度",
            searchPrevious: "上一项",
            searchNext: "下一项",
            clearSearch: "清空搜索",
            top: "回到顶部",
            openDefault: "用系统默认方式打开",
            openSidebar: "打开助手侧栏",
            closeSidebar: "关闭助手侧栏",
            noOutline: "无目录",
            outlineTitle: "目录",
          },
        }),
        refresh: async () => ({
          itemID: "reader-contract",
          itemKey: "READERCONTRACT",
          title: "Reader Contract Refreshed",
          filePath: "D:\\\\Library\\\\reader.md",
          baseFileUri: "file:///D%3A/Library/reader.md",
          markdown: "# Reader Contract Refreshed\\n\\nFresh body",
          locale: "zh-CN",
          messages: {
            searchPlaceholder: "搜索文档",
            refresh: "刷新文档",
            copyMarkdown: "复制 Markdown 内容",
            openFolder: "在文件管理器中打开",
            copied: "已复制",
            copyFailed: "复制失败",
            fontSmaller: "缩小字号",
            fontLarger: "放大字号",
            width: "切换阅读宽度",
            widthWide: "使用宽版阅读宽度",
            widthNarrow: "使用舒适阅读宽度",
            searchPrevious: "上一项",
            searchNext: "下一项",
            clearSearch: "清空搜索",
            top: "回到顶部",
            openDefault: "用系统默认方式打开",
            openSidebar: "打开助手侧栏",
            closeSidebar: "关闭助手侧栏",
          },
        }),
        openSystem: async () => {
          window.__openedByBridge = true;
        },
        openFolder: async () => {
          window.__openedFolder = true;
        },
        isSidebarOpen: async () => window.__sidebarOpen,
        openSidebar: async () => {
          window.__sidebarOpened = true;
          window.__sidebarOpen = true;
          return true;
        },
        closeSidebar: () => {
          window.__sidebarClosed = true;
          window.__sidebarOpen = false;
          return true;
        },
      };
    `);

    try {
      await page.goto(
        pathToFileURL(
          path.join(process.cwd(), "addon/content/markdown-reader/index.html"),
        ).href,
        { waitUntil: "domcontentloaded" },
      );
      await page.waitForFunction(
        () =>
          document.querySelector("#reader-document h1") ||
          document.querySelector(".reader-error"),
      );
      const initialState = await page.evaluate(() => ({
        html: document.getElementById("reader-document")?.innerHTML || "",
        hasBridge: Boolean((window as any).__zoteroSkillsMarkdownReaderBridge),
        hasRenderer: Boolean((window as any).ZoteroSkillsMarkdownRenderer),
      }));
      assert.include(initialState.html, "<h1", JSON.stringify(initialState));

      assert.equal(
        await page.locator("#reader-title").innerText(),
        "Reader Contract",
      );
      assert.equal(
        await page.locator("#reader-document h1").innerText(),
        "Reader Contract",
      );
      assert.equal(await page.locator("#reader-outline a").count(), 2);
      assert.equal(
        await page.locator("#reader-search").getAttribute("placeholder"),
        "搜索文档",
      );
      assert.equal(
        await page.locator("#reader-refresh").getAttribute("aria-label"),
        "刷新文档",
      );
      assert.equal(
        await page.locator("#reader-search-prev").getAttribute("aria-label"),
        "上一项",
      );
      assert.equal(
        await page.locator("#reader-search-next").getAttribute("aria-label"),
        "下一项",
      );
      assert.equal(
        await page.locator("#reader-search-clear").getAttribute("aria-label"),
        "清空搜索",
      );
      assert.isTrue(await page.locator("#reader-search-prev").isDisabled());
      assert.isTrue(await page.locator("#reader-search-next").isDisabled());
      assert.isTrue(await page.locator("#reader-search-clear").isHidden());
      assert.equal(
        await page.locator("#reader-copy").getAttribute("title"),
        "复制 Markdown 内容",
      );
      assert.equal(
        await page.locator("#reader-open-folder").getAttribute("aria-label"),
        "在文件管理器中打开",
      );
      assert.include(
        (await page.locator("#reader-width-icon").getAttribute("src")) || "",
        "open_in_full.svg",
      );
      assert.equal(
        await page.locator("#reader-width").getAttribute("aria-label"),
        "使用宽版阅读宽度",
      );
      assert.equal(
        await page.locator("#reader-open-system").getAttribute("aria-label"),
        "用系统默认方式打开",
      );
      await page.waitForFunction(
        () =>
          !document
            .getElementById("reader-open-sidebar")
            ?.classList.contains("is-hidden"),
      );
      assert.equal(
        await page.locator("#reader-open-sidebar").getAttribute("aria-label"),
        "打开助手侧栏",
      );
      assert.deepEqual(
        await page
          .locator(".reader-icon-button")
          .evaluateAll((buttons) => buttons.map((button) => button.id)),
        [
          "reader-search-prev",
          "reader-search-next",
          "reader-refresh",
          "reader-font-smaller",
          "reader-font-larger",
          "reader-width",
          "reader-top",
          "reader-copy",
          "reader-open-folder",
          "reader-open-system",
          "reader-open-sidebar",
        ],
      );
      assert.deepEqual(
        await page.locator(".reader-icon-button").evaluateAll((buttons) =>
          buttons.map((button) => ({
            text: (button.textContent || "").trim(),
            hasIcon: Boolean(button.querySelector("img")),
          })),
        ),
        [
          { text: "", hasIcon: true },
          { text: "", hasIcon: true },
          { text: "", hasIcon: true },
          { text: "", hasIcon: true },
          { text: "", hasIcon: true },
          { text: "", hasIcon: true },
          { text: "", hasIcon: true },
          { text: "", hasIcon: true },
          { text: "", hasIcon: true },
          { text: "", hasIcon: true },
          { text: "", hasIcon: true },
        ],
      );
      await page.fill("#reader-search", "Reader");
      assert.isFalse(await page.locator("#reader-search-prev").isDisabled());
      assert.isFalse(await page.locator("#reader-search-next").isDisabled());
      assert.isFalse(await page.locator("#reader-search-clear").isHidden());
      assert.equal(
        await page.locator("mark[data-reader-search-hit].is-active").count(),
        1,
      );
      await page.click("#reader-search-next");
      assert.equal(
        await page.locator("mark[data-reader-search-hit].is-active").count(),
        1,
      );
      await page.click("#reader-search-clear");
      assert.equal(await page.locator("#reader-search").inputValue(), "");
      assert.isTrue(await page.locator("#reader-search-prev").isDisabled());
      assert.isTrue(await page.locator("#reader-search-next").isDisabled());
      assert.isTrue(await page.locator("#reader-search-clear").isHidden());
      assert.equal(
        await page.locator("mark[data-reader-search-hit]").count(),
        0,
      );
      await page.click("#reader-copy");
      await page.waitForSelector("#reader-toast.is-visible");
      assert.equal(await page.locator("#reader-toast").innerText(), "已复制");
      await page.click("#reader-width");
      assert.include(
        (await page.locator("#reader-width-icon").getAttribute("src")) || "",
        "close_fullscreen.svg",
      );
      assert.equal(
        await page.locator("#reader-width").getAttribute("aria-label"),
        "使用舒适阅读宽度",
      );
      assert.deepEqual(
        await page.locator("#reader-outline a").evaluateAll((links) =>
          links.map((link) => ({
            text: (link.textContent || "").trim(),
            depth: Array.from(link.classList).find((name) =>
              name.startsWith("depth-"),
            ),
          })),
        ),
        [
          { text: "Reader Contract", depth: "depth-1" },
          { text: "Section", depth: "depth-2" },
        ],
      );

      await page.click("#reader-refresh");
      await page.waitForFunction(() =>
        document
          .querySelector("#reader-document h1")
          ?.textContent?.includes("Reader Contract Refreshed"),
      );
      assert.equal(
        await page.locator("#reader-title").innerText(),
        "Reader Contract Refreshed",
      );

      await page.click("#reader-open-system");
      assert.isTrue(
        await page.evaluate(() => (window as any).__openedByBridge),
      );
      await page.click("#reader-open-sidebar");
      assert.isTrue(
        await page.evaluate(() => Boolean((window as any).__sidebarOpened)),
      );
      await page.waitForFunction(
        () =>
          document
            .getElementById("reader-open-sidebar")
            ?.getAttribute("aria-label") === "关闭助手侧栏",
      );
      assert.include(
        (await page.locator("#reader-open-sidebar img").getAttribute("src")) ||
          "",
        "right_panel_close.svg",
      );
      await page.click("#reader-open-sidebar");
      assert.isTrue(
        await page.evaluate(() => Boolean((window as any).__sidebarClosed)),
      );
      await page.waitForFunction(
        () =>
          document
            .getElementById("reader-open-sidebar")
            ?.getAttribute("aria-label") === "打开助手侧栏",
      );
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
});
