import { assert } from "chai";
import { config } from "../../../../package.json";
import { getPref, setPref } from "../../../../src/utils/prefs";
import { closeZoteroAgentSettings } from "../../../../src/modules/workflow/settings/zoteroAgentSettings";
import {
  ensureDiagnosticsDirectory,
  readDiagnosticsEnv,
  writeDiagnosticsText,
} from "../../testDiagnosticsOutput";

type OpenWindow = Window & { closed?: boolean };

/**
 * The settings window is a host dialog, not a main window, so it never shows
 * up in Zotero.getMainWindows(). Enumerate chrome windows instead.
 */
function findSettingsWindow(): OpenWindow | null {
  const windows = (Services as any).wm.getEnumerator(null) as {
    getNext(): OpenWindow | null;
    hasMoreElements(): boolean;
  } | null;
  while (windows?.hasMoreElements()) {
    const win = windows.getNext();
    if (
      win &&
      !win.closed &&
      win.document?.getElementById("zs-agent-settings-root")
    ) {
      return win;
    }
  }
  return null;
}

async function waitForSettingsWindow(timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const win = findSettingsWindow();
    if (win) return win;
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function waitForBuiltInAgentTab(plugin: any) {
  for (let i = 0; i < 100; i++) {
    const frame = plugin.data.dialog?.window?.document.querySelector(
      "[data-zs-role='backend-manager-dialog-frame']",
    ) as HTMLIFrameElement | null;
    const tab =
      frame?.contentDocument?.querySelectorAll(".backend-provider-tab")[3] ||
      null;
    if (tab) return tab as Element;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

async function settingsPage(win: Window) {
  const messages: unknown[] = [];
  const observe = (event: MessageEvent) =>
    messages.push({
      data: event.data,
      sourceIsParent: event.source === observed?.parent,
      sourceIsSelf: event.source === observed,
      sourceIsNull: event.source === null,
    });
  let observed: Window | null = null;
  for (let i = 0; i < 150; i++) {
    const frame = win.document.querySelector(
      "iframe",
    ) as HTMLIFrameElement | null;
    const page = frame?.contentWindow;
    if (page && !observed) {
      observed = page;
      page.addEventListener("message", observe);
    }
    if (
      page?.document.querySelector('[data-testid="nav-overview"]') &&
      page.document.querySelector(".zs-content-body")
    ) {
      page.removeEventListener("message", observe);
      return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const consoleMessages = (Services as any).console
    .getMessageArray()
    .slice(-30)
    .map((entry: any) => String(entry.message || ""))
    .filter((entry: string) =>
      /settings|TypeError|ReferenceError|SyntaxError/.test(entry),
    );
  observed?.removeEventListener("message", observe);
  const output = readDiagnosticsEnv("ZOTERO_AGENT_SETTINGS_UI_OUTPUT");
  if (output) {
    await ensureDiagnosticsDirectory(output);
    await writeDiagnosticsText(
      `${output}/not-ready.json`,
      JSON.stringify(
        { consoleMessages, messages, html: observed?.document.body.innerHTML },
        null,
        2,
      ),
    );
  }
  throw new Error("settings_page_not_ready");
}

async function paint() {
  await new Promise((resolve) => setTimeout(resolve, 200));
}

function control(page: Window, id: string) {
  const node = page.document.querySelector<HTMLElement>(
    `[data-testid="${id}"]`,
  );
  assert.isNotNull(node, `control ${id} is available`);
  return node!;
}

function enter(page: Window, id: string, value: string) {
  const input = control(page, id) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new (page as any).Event("input", { bubbles: true }));
  input.dispatchEvent(
    new (page as any).FocusEvent("focusout", { bubbles: true }),
  );
}

async function captureSettings(page: Window, root: string, name: string) {
  if (!root) return;
  await ensureDiagnosticsDirectory(root);
  const canvas = page.document.createElement("canvas");
  canvas.width = page.innerWidth;
  canvas.height = page.innerHeight;
  const context = canvas.getContext("2d")!;
  const rect = new (page as any).DOMRect(0, 0, canvas.width, canvas.height);
  const bitmap = await (
    page as any
  ).browsingContext.currentWindowGlobal.drawSnapshot(rect, 1, "white");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((value) => resolve(value!), "image/png"),
  );
  await IOUtils.write(
    `${root}/${name}.png`,
    new Uint8Array(await blob.arrayBuffer()),
  );
}

describe("Built-in Agent settings launcher in real Zotero", function () {
  afterEach(function () {
    closeZoteroAgentSettings();
  });

  it("offers only the launcher and opens the independent settings window", async function () {
    this.timeout(60_000);
    const plugin = (Zotero as any)[config.addonInstance];
    assert.isOk(plugin?.data?.initialized, "plugin is initialized");
    const backendsBefore = String(getPref("backendsConfigJson") || "");
    const opened = plugin.hooks.onPrefsEvent("openBackendManager", {
      window: Zotero.getMainWindow(),
    });
    try {
      const tab = await waitForBuiltInAgentTab(plugin);
      assert.isOk(tab, "Built-in Agent tab rendered");
      (tab as HTMLElement).click();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const frame = plugin.data.dialog?.window?.document.querySelector(
        "[data-zs-role='backend-manager-dialog-frame']",
      ) as HTMLIFrameElement;
      const doc = frame.contentDocument!;
      const body = doc.querySelector("[data-zs-role='backend-manager-body']")!;
      const launcher = body.querySelector(
        "[data-zs-action='open-zotero-agent-settings']",
      )!;
      assert.isOk(launcher, "settings launcher rendered");
      assert.lengthOf(
        body.querySelectorAll("button, input, select, textarea"),
        1,
      );
      assert.equal(body.textContent?.trim(), launcher.textContent?.trim());
      await captureSettings(
        frame.contentWindow!,
        readDiagnosticsEnv("ZOTERO_AGENT_SETTINGS_UI_OUTPUT"),
        "backend-manager-built-in-launcher",
      );

      // Detailed built-in Agent editing no longer lives on this surface.
      for (const selector of [
        "[data-pi-field]",
        "[data-pi-action]",
        "[data-mcp-field]",
        "[data-mcp-action]",
        "[data-web-field]",
        "[data-web-action]",
        ".backend-pi-section",
      ]) {
        assert.isNull(doc.querySelector(selector), `${selector} is gone`);
      }

      (launcher as HTMLElement).click();

      const settings = await waitForSettingsWindow();
      assert.isOk(settings, "independent settings window opened");
      assert.notEqual(
        settings,
        plugin.data.dialog?.window,
        "the settings window is not the Backend Manager window",
      );
      // Launching settings neither saves nor discards Backend Profile drafts.
      assert.equal(String(getPref("backendsConfigJson") || ""), backendsBefore);
      assert.isNotNull(
        plugin.data.dialog?.window,
        "Backend Manager stays open",
      );
    } finally {
      plugin.data.dialog?.window?.close();
      await opened;
    }
  });

  it("routes the preferences entry straight to settings without Backend Manager", async function () {
    this.timeout(60_000);
    const plugin = (Zotero as any)[config.addonInstance];
    assert.isOk(plugin?.data?.initialized, "plugin is initialized");
    assert.isUndefined(
      plugin.data.dialog,
      "Backend Manager was not opened as a step",
    );
    await plugin.hooks.onPrefsEvent("openZoteroAgentSettings", {
      window: Zotero.getMainWindow(),
    });
    assert.isOk(await waitForSettingsWindow(), "settings window opened");
    assert.isUndefined(plugin.data.dialog, "Backend Manager stays closed");
  });

  it("preserves real window drafts, page scrolling and input identity across themes and reopening", async function () {
    this.timeout(90_000);
    const plugin = (Zotero as any)[config.addonInstance];
    await plugin.hooks.onPrefsEvent("openZoteroAgentSettings", {
      window: Zotero.getMainWindow(),
    });
    const win = (await waitForSettingsWindow())!;
    assert.isOk(win);
    const page = await settingsPage(win);
    const output = readDiagnosticsEnv("ZOTERO_AGENT_SETTINGS_UI_OUTPUT");
    const observations: object[] = [];
    for (const compact of [false, true]) {
      win.resizeTo(compact ? 760 : 1120, compact ? 580 : 760);
      await paint();
      for (const theme of ["light", "dark"]) {
        page.document.documentElement.setAttribute("data-zs-theme", theme);
        for (const id of [
          "overview",
          "connections",
          "mcp",
          "search",
          "catalog",
        ]) {
          control(page, `nav-${id}`).click();
          await paint();
          assert.isOk(control(page, `settings-page-${id}`));
          const scrollers =
            page.document.querySelectorAll<HTMLElement>(".zs-content-body");
          assert.lengthOf(
            scrollers,
            1,
            "one main scroller belongs to the selected page",
          );
          const scroller = scrollers[0];
          assert.equal(page.getComputedStyle(scroller).overflowY, "auto");
          const header =
            page.document.querySelector<HTMLElement>(".zs-page-header")!;
          const nav = control(page, "settings-nav");
          const headerTop = header.getBoundingClientRect().top;
          const navTop = nav.getBoundingClientRect().top;
          scroller.scrollTop = scroller.scrollHeight;
          await paint();
          assert.closeTo(header.getBoundingClientRect().top, headerTop, 1);
          assert.closeTo(nav.getBoundingClientRect().top, navTop, 1);
          assert.isAtMost(
            page.document.documentElement.scrollHeight,
            page.innerHeight + 1,
          );
          observations.push({
            compact,
            theme,
            page: id,
            width: page.innerWidth,
            height: page.innerHeight,
            scrolls: scroller.scrollHeight > scroller.clientHeight,
          });
          if (id === "catalog") {
            await captureSettings(
              page,
              output,
              `${compact ? "compact" : "normal"}-${theme}-maintenance`,
            );
          }
          scroller.scrollTop = 0;
          await paint();
          await captureSettings(
            page,
            output,
            `${compact ? "compact" : "normal"}-${theme}-${id}`,
          );
        }
      }
    }
    control(page, "nav-mcp").click();
    await paint();
    control(page, "mcp-add").click();
    await paint();
    enter(page, "mcp-editor-label", "Controlled draft");
    const name = control(page, "mcp-editor-label") as HTMLInputElement;
    name.focus();
    name.setSelectionRange(2, 8);
    await plugin.hooks.onPrefsEvent("openZoteroAgentSettings", {
      window: Zotero.getMainWindow(),
    });
    await paint();
    assert.strictEqual(
      await waitForSettingsWindow(),
      win,
      "reopening focuses the same window",
    );
    assert.strictEqual(
      control(page, "mcp-editor-label"),
      name,
      "reopening retains input identity",
    );
    assert.equal(name.value, "Controlled draft");
    assert.equal(name.selectionStart, 2);
    assert.equal(name.selectionEnd, 8);
    const transport = control(
      page,
      "mcp-editor-transport",
    ).querySelector<HTMLButtonElement>("button")!;
    transport.click();
    await paint();
    assert.isOk(control(page, "mcp-editor-transport-option-stdio"));
    control(page, "mcp-editor-transport-option-stdio").click();
    await paint();
    control(page, "mcp-editor-add-arg").click();
    await paint();
    enter(page, "mcp-editor-arg-0", "one argument with spaces");
    assert.equal(
      (control(page, "mcp-editor-arg-0") as HTMLInputElement).value,
      "one argument with spaces",
    );
    await captureSettings(page, output, "stdio-draft");
    control(page, "nav-search").click();
    await paint();
    assert.isOk(control(page, "leave-dialog"));
    control(page, "leave-continue").click();
    await paint();
    assert.strictEqual(
      control(page, "mcp-editor-label"),
      name,
      "continuing preserves the form input",
    );
    win.close();
    await paint();
    assert.isFalse(win.closed, "native close protects the draft");
    assert.isOk(control(page, "leave-dialog"));
    control(page, "leave-continue").click();
    await paint();
    control(page, "mcp-editor-cancel").click();
    await paint();
    control(page, "leave-discard").click();
    await paint();
    control(page, "nav-search").click();
    await paint();
    control(page, "search-configure-brave-http").click();
    await paint();
    await captureSettings(page, output, "search-source-editor");
    control(page, "web-editor-cancel").click();
    await paint();
    control(page, "nav-mcp").click();
    await paint();
    control(page, "mcp-add").click();
    await paint();
    control(page, "mcp-editor-auth")
      .querySelector<HTMLButtonElement>("button")!
      .click();
    await paint();
    control(page, "mcp-editor-auth-option-bearer").click();
    await paint();
    enter(page, "mcp-editor-label", "Controlled HTTP source");
    enter(page, "mcp-editor-address", "https://example.test/mcp");
    enter(page, "mcp-editor-secret", "fixture-only-not-a-real-key");
    await captureSettings(page, output, "bearer-source-editor");
    const sourceInput = control(page, "mcp-editor-label");
    enter(page, "mcp-editor-label", "x".repeat(129));
    control(page, "mcp-editor-save").click();
    await paint();
    assert.isOk(
      control(page, "mcp-editor-failure"),
      "failed adoption is visible in the source form",
    );
    assert.strictEqual(control(page, "mcp-editor-label"), sourceInput);
    assert.equal((sourceInput as HTMLInputElement).value.length, 129);
    control(page, "mcp-editor-cancel").click();
    await paint();
    control(page, "leave-discard").click();
    await paint();
    control(page, "mcp-json-edit").click();
    await paint();
    await captureSettings(page, output, "mcp-json-editor");
    control(page, "mcp-json-cancel").click();
    await paint();
    control(page, "nav-overview").click();
    await paint();
    control(page, "setup-api-key").click();
    await paint();
    const providerChoice = control(page, "connection-editor-provider");
    providerChoice.querySelector<HTMLButtonElement>("button")!.dispatchEvent(
      new (page as any).KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
      }),
    );
    await paint();
    const providerOption = providerChoice.querySelector<HTMLButtonElement>(
      '[role="option"]:not([disabled])',
    )!;
    providerOption.focus();
    providerOption.dispatchEvent(
      new (page as any).KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      }),
    );
    await paint();
    assert.equal(
      providerChoice.querySelector("button")!.getAttribute("aria-expanded"),
      "false",
    );
    await captureSettings(page, output, "public-provider-editor");
    control(page, "connection-editor-cancel").click();
    await paint();
    if (page.document.querySelector('[data-testid="leave-dialog"]')) {
      control(page, "leave-discard").click();
      await paint();
    }
    control(page, "setup-chatgpt").click();
    await paint();
    await captureSettings(page, output, "chatgpt-registration-editor");
    control(page, "connection-editor-cancel").click();
    await paint();
    const configurationBefore = getPref("piProviderConfigurationJson");
    const saveResults: unknown[] = [];
    const observeSave = (event: MessageEvent) => {
      if (event.data?.type === "zotero-agent-settings:action-result")
        saveResults.push(event.data);
    };
    page.addEventListener("message", observeSave);
    try {
      control(page, "setup-custom").click();
      await paint();
      enter(page, "connection-editor-label", "Controlled endpoint");
      await paint();
      enter(page, "connection-editor-endpoint", "https://example.test/v1");
      await paint();
      const keyless = page.document.querySelector<HTMLInputElement>(
        '[data-testid="connection-editor"] input[type="checkbox"]',
      )!;
      if (!keyless.checked) keyless.click();
      await paint();
      await captureSettings(page, output, "keyless-connection-editor");
      control(page, "connection-editor-save").click();
      for (
        let i = 0;
        i < 40 &&
        page.document.querySelector('[data-testid="connection-editor"]');
        i++
      )
        await paint();
      await captureSettings(page, output, "connection-save-result");
      if (output)
        await writeDiagnosticsText(
          `${output}/connection-save-result.json`,
          JSON.stringify(saveResults, null, 2),
        );
      assert.isNull(
        page.document.querySelector('[data-testid="connection-editor"]'),
        "saved connection closes only after adoption",
      );
      const saved = JSON.parse(String(getPref("piProviderConfigurationJson")));
      assert.lengthOf(saved.connections, 1);
      assert.lengthOf(saved.configurations, 0);
      assert.deepEqual(saved.defaults, {});
      const id = saved.connections[0].id;
      for (const compact of [false, true]) {
        win.resizeTo(compact ? 760 : 1120, compact ? 580 : 760);
        await paint();
        const summary = page.document.querySelector<HTMLElement>(
          ".zs-purpose-summary",
        )!;
        const rail = page.document.querySelector<HTMLElement>(
          ".zs-connection-list",
        )!;
        const detail = control(page, `connection-detail-${id}`);
        const summaryBox = summary.getBoundingClientRect();
        const railBox = rail.getBoundingClientRect();
        const detailBox = detail.getBoundingClientRect();
        assert.isAtMost(
          railBox.right,
          detailBox.left + 1,
          "connection navigation stays beside the detail at both host sizes",
        );
        assert.closeTo(
          railBox.top,
          detailBox.top,
          1,
          "the connection rail and detail share a row",
        );
        assert.isAtMost(
          summaryBox.bottom,
          detailBox.top + 1,
          "default purposes stay above both workbench columns",
        );
        assert.isAtMost(
          detailBox.bottom,
          page.innerHeight,
          "the detail is bounded by the window",
        );
        assert.equal(page.getComputedStyle(detail).overflowY, "auto");
        const header =
          page.document.querySelector<HTMLElement>(".zs-page-header")!;
        const headerTop = header.getBoundingClientRect().top;
        detail.scrollTop = detail.scrollHeight;
        await paint();
        assert.closeTo(
          summary.getBoundingClientRect().top,
          summaryBox.top,
          1,
          "detail scrolling preserves purpose summary position",
        );
        assert.closeTo(
          header.getBoundingClientRect().top,
          headerTop,
          1,
          "detail scrolling preserves the header",
        );
        await captureSettings(
          page,
          output,
          `${compact ? "compact" : "normal"}-saved-workbench`,
        );
        observations.push({
          compact,
          workbenchColumns: "side-by-side",
          purposeSummaryFixed: true,
        });
      }
      await captureSettings(page, output, "saved-connection-workbench");
      control(page, `add-model-${id}`).click();
      await paint();
      await captureSettings(page, output, "model-picker");
      control(page, "model-picker-close").click();
      await paint();
    } finally {
      page.removeEventListener("message", observeSave);
      setPref("piProviderConfigurationJson", configurationBefore);
    }
    if (output)
      await writeDiagnosticsText(
        `${output}/behavior.json`,
        JSON.stringify(
          {
            prototype: "revision-7",
            observations,
            draftProtection: true,
            inputIdentity: true,
            repeatedOpen: true,
            failedSave: true,
            providerKeyboard: true,
            keylessSave: true,
          },
          null,
          2,
        ),
      );
  });
});
