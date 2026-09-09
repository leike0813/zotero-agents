import { assert } from "chai";

import {
  captureRegionSubtrees,
  assertRegionSubtreesPreserved,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import { createBackendManagerController } from "../../src/dashboard/backendManagerApp";
import { createBackendManagerRenderer } from "../../src/dashboard/backendManagerRenderer";
import type { BackendManagerSnapshot } from "../../src/dashboard/components/BackendManagerRegion";

function makeLabels(): Record<string, string> {
  return {
    addProfile: "Add { $provider } Profile",
    addAcpPreset: "Add ACP Preset",
    addGenericHttpPreset: "Add Generic HTTP Preset",
    displayName: "ID",
    enabled: "Enabled",
    baseUrl: "Base URL",
    auth: "Auth",
    token: "Token",
    timeoutMs: "Timeout(ms)",
    command: "Command",
    args: "Args",
    env: "Env",
    authNone: "None",
    authBearer: "Bearer",
    remove: "Remove",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    profileId: "Profile ID",
    agentFamily: "Agent Family",
    acpPresetDialogTitle: "Add ACP Profile from Preset",
    genericHttpPresetDialogTitle: "Add Generic HTTP Profile from Preset",
    acpPresetUseNpx: "Use npx",
    acpPresetIsolated: "Isolated environment",
    acpPresetNpxWarning: "Requires Node.js and npm.",
    acpPresetNodeLink: "Get Node.js",
    acpPresetIsolationWarning:
      "Using an isolated environment requires configuring and authenticating the agent in { $path }.",
    openManagement: "Open Management",
    refreshModelCache: "Refresh Model Cache",
    unreachable: "Unreachable",
    disabled: "Disabled",
    statusModelCacheRefreshed: "Model cache refreshed",
    statusModelCacheRefreshFailed: "Model cache refresh failed",
    statusAcpRuntimeCacheRefreshed: "ACP config cache refreshed",
    statusAcpRuntimeCacheRefreshFailed: "ACP config cache refresh failed",
    refreshAcpRuntimeCache: "Refresh Config Cache",
    testAcpConnection: "Test Connection",
    addArg: "Add Argument",
    addEnv: "Add Environment Variable",
    argPlaceholder: "Argument",
    envKeyPlaceholder: "Variable",
    envValuePlaceholder: "Value",
    noProfiles: "No profiles configured.",
  };
}

function makeSnapshot(
  overrides: Partial<BackendManagerSnapshot> = {},
): BackendManagerSnapshot {
  return {
    title: "Backend Manager",
    help: "Profiles are managed by provider.",
    labels: makeLabels(),
    initialProviderType: "acp",
    // Deliberately unordered: the page pins acp -> skillrunner -> generic-http.
    providers: [
      {
        type: "generic-http",
        label: "Generic HTTP",
        title: "Generic HTTP Profiles",
      },
      { type: "acp", label: "ACP", title: "ACP Profiles" },
      {
        type: "skillrunner",
        label: "SkillRunner",
        title: "SkillRunner Profiles",
      },
    ],
    rows: [
      {
        internalId: "acp-1",
        displayName: "ACP One",
        type: "acp",
        enabled: true,
        baseUrl: "",
        authKind: "none",
        authToken: "",
        authTokenPlaceholder: "",
        timeoutMs: "",
        command: "codex",
        args: ["--acp"],
        env: [{ key: "FOO", value: "bar" }],
      },
      {
        internalId: "sr-1",
        displayName: "SR One",
        type: "skillrunner",
        enabled: true,
        baseUrl: "http://127.0.0.1:8030",
        authKind: "none",
        authToken: "",
        authTokenPlaceholder: "",
        timeoutMs: "600000",
        command: "",
        args: [],
        env: [],
      },
      {
        internalId: "gh-1",
        displayName: "GH One",
        type: "generic-http",
        enabled: true,
        baseUrl: "https://example.com",
        authKind: "bearer",
        authToken: "",
        authTokenPlaceholder: "fill-token",
        timeoutMs: "600000",
        command: "",
        args: [],
        env: [],
      },
    ],
    skillRunnerHealth: {
      "sr-1": { enabled: true, reachable: true, status: "reachable" },
    },
    acpPresets: [
      {
        id: "codex",
        label: "Codex ACP",
        bareCommand: "codex",
        bareArgs: ["--acp"],
        npxPackage: "@agentclientprotocol/codex-acp@latest",
        npxArgs: [],
        defaultEnv: { FOO: "bar" },
        defaultUseNpx: true,
        supportsNpx: true,
        agentFamily: "codex",
        isolation: { envKey: "CODEX_HOME" },
      },
      {
        id: "hermes",
        label: "Hermes ACP",
        bareCommand: "hermes",
        bareArgs: ["acp"],
        defaultUseNpx: false,
        supportsNpx: false,
        agentFamily: "hermes",
      },
    ],
    genericHttpPresets: [
      {
        id: "mineru-official",
        displayName: "MinerU Official",
        baseUrl: "https://mineru.net",
        authKind: "bearer",
        authTokenPlaceholder: "fill-your-mineru-api-key-here",
        timeoutMs: "600000",
        note: {
          text: "Visit MinerU to get an API Key.",
          linkText: "mineru.net",
          linkUrl: "https://mineru.net",
        },
      },
    ],
    acpPresetIsolationRoot: "/data/acp-backend-environments",
    runtimeCommands: { npx: { available: true } },
    ...overrides,
  };
}

type RecordedAction = {
  action: string;
  payload: Record<string, unknown>;
};

function createPage() {
  const actions: RecordedAction[] = [];
  const root = document.createElement("main");
  root.id = "backend-manager-root";
  root.className = "backend-manager-root";
  document.body.appendChild(root);
  const rendererHolder: {
    current?: ReturnType<typeof createBackendManagerRenderer>;
  } = {};
  const controller = createBackendManagerController({
    sendAction: (action, payload) => {
      // Clone like the host does on receipt (normalizeDraftRows), so recorded
      // payloads are immune to later draft mutations.
      actions.push({
        action,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : {},
      });
    },
    renderView: (view, options) => {
      // The controller's status-message timer (5s) can outlive a test; once
      // teardown restores the DOM globals, a late render has no document.
      if (typeof document === "undefined") return;
      rendererHolder.current!.renderView(view, options);
    },
  });
  rendererHolder.current = createBackendManagerRenderer({
    root,
    handlers: controller.handlers,
  });
  controller.renderCurrent();
  return { root, actions, controller };
}

function initPage(
  page: ReturnType<typeof createPage>,
  overrides: Partial<BackendManagerSnapshot> = {},
) {
  page.controller.handleMessage({
    type: "backend-manager-dialog:init",
    payload: makeSnapshot(overrides),
  });
}

function fireInput(element: Element, value: string) {
  (element as HTMLInputElement).value = value;
  element.dispatchEvent(new window.Event("input", { bubbles: true }));
}

function fireChange(element: Element) {
  element.dispatchEvent(new window.Event("change", { bubbles: true }));
}

function clickButton(element: Element | null) {
  assert.ok(element, "button exists");
  (element as HTMLButtonElement).click();
}

function previewValue(panel: Element, label: string): string {
  const rows = Array.from(
    panel.querySelectorAll(".backend-preset-preview-row"),
  );
  for (const row of rows) {
    if (
      row.querySelector(".backend-preset-preview-label")?.textContent === label
    ) {
      return (
        row.querySelector(".backend-preset-preview-value")?.textContent || ""
      );
    }
  }
  return "";
}

describe("dashboard backend-manager page (src/dashboard)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(function () {
    restoreSidebarDomGlobals();
  });

  it("renders loading until init, then sorted tabs and the active provider rows", function () {
    const page = createPage();
    assert.equal(
      page.root.querySelector(".backend-manager-body")?.textContent,
      "Loading...",
    );

    initPage(page);

    assert.deepEqual(
      page.actions.map((entry) => entry.action),
      ["draft-changed"],
    );
    const draftRows = page.actions[0].payload.rows as Array<{
      type: string;
      internalId: string;
    }>;
    assert.equal(draftRows.length, 3);
    assert.equal(draftRows[0].type, "acp");
    assert.equal(draftRows[0].internalId, "acp-1");

    const tabs = Array.from(
      page.root.querySelectorAll(".backend-provider-tab"),
    );
    assert.deepEqual(
      tabs.map((tab) => tab.textContent),
      ["ACP", "SkillRunner", "Generic HTTP"],
    );
    assert.ok(tabs[0].classList.contains("is-active"));
    assert.equal(tabs[0].getAttribute("aria-pressed"), "true");

    assert.equal(
      page.root.querySelector(".backend-provider-title")?.textContent,
      "ACP Profiles",
    );
    const acpCards = page.root.querySelectorAll(".backend-profile-card.is-acp");
    assert.equal(acpCards.length, 1);
    assert.ok(
      acpCards[0].querySelector(".backend-acp-grid"),
      "acp card uses the acp grid",
    );
    // The add-profile button resolves the { $provider } placeholder.
    const actions = Array.from(
      page.root.querySelectorAll(".backend-provider-actions .backend-button"),
    );
    assert.equal(actions[actions.length - 1].textContent, "Add ACP Profile");
    // Footer chrome renders.
    assert.ok(page.root.querySelector(".backend-footer-status"));
  });

  it("posts save/cancel with the current draft rows", function () {
    const page = createPage();
    initPage(page);
    page.actions.length = 0;

    const footerButtons = page.root.querySelectorAll(
      ".backend-footer-actions .backend-button",
    );
    clickButton(footerButtons[0]);
    clickButton(footerButtons[1]);

    assert.deepEqual(
      page.actions.map((entry) => entry.action),
      ["cancel", "save"],
    );
    const rows = page.actions[1].payload.rows as Array<{ internalId: string }>;
    assert.deepEqual(
      rows.map((row) => row.internalId),
      ["acp-1", "sr-1", "gh-1"],
    );
  });

  it("emits draft-changed on text edits without rebuilding, and re-renders on structural edits", function () {
    const page = createPage();
    initPage(page);
    page.actions.length = 0;
    const bodyMount = page.root.querySelector('[data-region-mount="body"]')!;
    const captured = captureRegionSubtrees({ body: bodyMount });

    const idInput = page.root.querySelector(".backend-field-id input")!;
    fireInput(idInput, "Renamed ACP");
    assert.deepEqual(
      page.actions.map((entry) => entry.action),
      ["draft-changed"],
    );
    const rows = page.actions[0].payload.rows as Array<{
      displayName: string;
    }>;
    assert.equal(rows[0].displayName, "Renamed ACP");
    assertRegionSubtreesPreserved({ body: bodyMount }, captured);

    // Structural edit: add an argument row -> re-render + draft-changed.
    page.actions.length = 0;
    clickButton(
      page.root.querySelector(
        ".backend-acp-args .backend-list-header .backend-button",
      ),
    );
    assert.equal(
      page.root.querySelectorAll(".backend-acp-args .backend-list-row").length,
      2,
    );
    const structuredRows = page.actions[0].payload.rows as Array<{
      args: string[];
    }>;
    assert.deepEqual(structuredRows[0].args, ["--acp", ""]);

    // Removing the row entirely drops it from the draft.
    page.actions.length = 0;
    clickButton(
      page.root.querySelector(".backend-acp-actions .backend-button.danger"),
    );
    assert.equal(page.root.querySelectorAll(".backend-profile-card").length, 0);
    assert.equal(
      page.root.querySelector(".backend-empty")?.textContent,
      "No profiles configured.",
    );
    const afterRemove = page.actions[0].payload.rows as Array<unknown>;
    assert.equal(afterRemove.length, 2);
  });

  it("posts refresh-acp-runtime-options and folds the action-result into the chip and footer", function () {
    const page = createPage();
    initPage(page);
    page.actions.length = 0;

    const chip = page.root.querySelector(".backend-status-chip")!;
    assert.equal(chip.textContent, "untested");
    const refreshButton = page.root.querySelector<HTMLButtonElement>(
      ".backend-acp-actions .backend-button",
    )!;
    assert.equal(refreshButton.textContent, "Test Connection");
    refreshButton.click();

    assert.deepEqual(
      page.actions.map((entry) => entry.action),
      ["refresh-acp-runtime-options"],
    );
    assert.equal(page.actions[0].payload.rowIndex, 0);
    assert.equal(
      (page.actions[0].payload.row as { internalId: string }).internalId,
      "acp-1",
    );
    const pendingButton = page.root.querySelector<HTMLButtonElement>(
      ".backend-acp-actions .backend-button",
    )!;
    assert.isTrue(pendingButton.disabled, "refresh disabled while pending");

    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "refresh-acp-runtime-options",
        rowIndex: 0,
        backendId: "acp-1",
        acp: { connectionTest: { status: "passed" } },
        ok: true,
      },
    });

    const passedChip = page.root.querySelector(".backend-status-chip")!;
    assert.equal(passedChip.textContent, "passed");
    assert.ok(passedChip.classList.contains("status-passed"));
    const enabledButton = page.root.querySelector<HTMLButtonElement>(
      ".backend-acp-actions .backend-button",
    )!;
    assert.isFalse(enabledButton.disabled);
    assert.equal(enabledButton.textContent, "Refresh Config Cache");
    const status = page.root.querySelector(".backend-footer-status")!;
    assert.include(status.textContent, "acp-1");
    assert.equal(status.getAttribute("data-tone"), "success");
  });

  it("drives SkillRunner manage/refresh actions from reachability and enabled state", function () {
    const page = createPage();
    initPage(page);
    page.actions.length = 0;

    // Switch to the SkillRunner provider tab.
    const tabs = page.root.querySelectorAll(".backend-provider-tab");
    clickButton(tabs[1]);
    const card = page.root.querySelector(
      ".backend-profile-card.is-skillrunner",
    );
    assert.ok(card, "skillrunner card visible");

    const manageButton = card!.querySelector<HTMLButtonElement>(
      ".backend-http-actions .backend-button",
    )!;
    assert.equal(manageButton.textContent, "Open Management");
    assert.isFalse(manageButton.disabled);
    manageButton.click();
    assert.deepEqual(
      page.actions.map((entry) => entry.action),
      ["open-management"],
    );
    assert.equal(page.actions[0].payload.rowIndex, 1);

    const refreshButton = card!.querySelectorAll<HTMLButtonElement>(
      ".backend-http-actions .backend-button",
    )[1];
    assert.equal(refreshButton.textContent, "Refresh Model Cache");
    refreshButton.click();
    assert.equal(page.actions[1].action, "refresh-model-cache");
    assert.equal(page.actions[1].payload.rowIndex, 1);

    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "refresh-model-cache",
        rowIndex: 1,
        backendId: "sr-1",
        ok: true,
      },
    });
    const status = page.root.querySelector(".backend-footer-status")!;
    assert.include(status.textContent, "sr-1");
    assert.equal(status.getAttribute("data-tone"), "success");

    // Disabling the profile drops reachability and locks both actions.
    const enabledCheckbox = card!.querySelector<HTMLInputElement>(
      ".backend-checkbox-field input",
    )!;
    enabledCheckbox.checked = false;
    fireChange(enabledCheckbox);
    const disabledManage = page.root.querySelector<HTMLButtonElement>(
      ".backend-profile-card.is-skillrunner .backend-http-actions .backend-button",
    )!;
    assert.equal(disabledManage.textContent, "Disabled");
    assert.isTrue(disabledManage.disabled);
  });

  it("builds the ACP preset preview from npx/isolation and posts add-acp-preset", function () {
    const page = createPage();
    initPage(page);
    page.actions.length = 0;

    clickButton(
      page.root.querySelector(".backend-provider-actions .backend-button"),
    );
    const modal = page.root.querySelector(".backend-preset-modal");
    assert.ok(modal, "preset dialog opens");
    const panel = modal!.querySelector(".backend-preset-panel")!;
    assert.equal(
      panel.getAttribute("aria-label"),
      "Add ACP Profile from Preset",
    );

    // Default: first preset, npx on (defaultUseNpx && supportsNpx).
    assert.equal(previewValue(panel, "Profile ID"), "acp-codex-npx");
    assert.equal(previewValue(panel, "Command"), "npx");

    // Selecting a preset without npx support falls back to the bare command.
    const selectorItems = panel.querySelectorAll(
      ".backend-preset-selector-item",
    );
    clickButton(selectorItems[1]);
    assert.equal(previewValue(panel, "Profile ID"), "acp-hermes");
    assert.equal(previewValue(panel, "Command"), "hermes");

    // Back to codex; enabling isolation folds the managed env into the preview.
    clickButton(panel.querySelectorAll(".backend-preset-selector-item")[0]);
    const checkboxes = panel.querySelectorAll<HTMLInputElement>(
      ".backend-preset-options input[type='checkbox']",
    );
    checkboxes[1].checked = true;
    fireChange(checkboxes[1]);
    const updatedPanel = page.root.querySelector(".backend-preset-panel")!;
    assert.equal(
      previewValue(updatedPanel, "Profile ID"),
      "acp-codex-npx-isolated",
    );
    const warning = updatedPanel.querySelector(".backend-preset-note.warning");
    assert.include(
      warning?.textContent,
      "/data/acp-backend-environments/acp-codex-npx-isolated",
    );
    assert.include(previewValue(updatedPanel, "Env"), "CODEX_HOME=");

    const confirm = updatedPanel.querySelector<HTMLButtonElement>(
      ".backend-preset-panel-footer .backend-button.primary",
    )!;
    assert.isFalse(confirm.disabled);
    confirm.click();
    assert.deepEqual(
      page.actions.map((entry) => entry.action),
      ["add-acp-preset"],
    );
    assert.equal(page.actions[0].payload.presetId, "codex");
    assert.equal(page.actions[0].payload.useNpx, true);
    assert.equal(page.actions[0].payload.isolated, true);
    assert.equal(
      (page.actions[0].payload.rows as unknown[]).length,
      3,
      "confirm payload carries the current draft rows",
    );

    // The host replies with the built row: dialog closes, row appended.
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "add-acp-preset",
        row: {
          internalId: "acp-codex-npx-isolated",
          displayName: "Codex ACP (npm)(Isolated)",
          type: "acp",
          command: "npx",
          args: ["-y", "@agentclientprotocol/codex-acp@latest"],
          env: [],
        },
      },
    });
    assert.notOk(
      page.root.querySelector(".backend-preset-modal"),
      "dialog closes on action-result",
    );
    assert.equal(
      page.root.querySelectorAll(".backend-profile-card.is-acp").length,
      2,
    );
    assert.equal(page.actions[page.actions.length - 1].action, "draft-changed");
  });

  it("posts open-preset-link and add-generic-http-preset from the Generic HTTP dialog", function () {
    const page = createPage();
    initPage(page);
    page.actions.length = 0;

    page.controller.handleMessage({
      type: "backend-manager-dialog:select-provider",
      payload: { providerType: "generic-http" },
    });
    assert.equal(
      page.root.querySelector(".backend-provider-title")?.textContent,
      "Generic HTTP Profiles",
    );
    const card = page.root.querySelector(".backend-profile-card.is-http");
    assert.ok(card);
    assert.notOk(card!.classList.contains("is-skillrunner"));
    assert.ok(
      card!.querySelector(".backend-token-input"),
      "token field renders as password input",
    );
    assert.equal(
      card!.querySelector(".backend-token-input")!.getAttribute("type"),
      "password",
    );

    clickButton(
      page.root.querySelector(".backend-provider-actions .backend-button"),
    );
    const panel = page.root.querySelector(".backend-preset-panel")!;
    assert.equal(previewValue(panel, "Profile ID"), "mineru-official");
    assert.equal(previewValue(panel, "Base URL"), "https://mineru.net");

    const noteLink = panel.querySelector(".backend-preset-note-link")!;
    (noteLink as HTMLElement).click();
    assert.deepEqual(
      page.actions.map((entry) => entry.action),
      ["open-preset-link"],
    );
    assert.equal(page.actions[0].payload.url, "https://mineru.net");

    clickButton(
      panel.querySelector(
        ".backend-preset-panel-footer .backend-button.primary",
      ),
    );
    assert.equal(page.actions[1].action, "add-generic-http-preset");
    assert.equal(page.actions[1].payload.presetId, "mineru-official");
    assert.equal((page.actions[1].payload.rows as unknown[]).length, 3);
  });

  it("keeps region subtree identity across equal snapshots and footer-only updates", function () {
    const page = createPage();
    initPage(page);
    const regions = {
      header: page.root.querySelector('[data-region-mount="header"]')!,
      body: page.root.querySelector('[data-region-mount="body"]')!,
      footer: page.root.querySelector('[data-region-mount="footer"]')!,
    };
    const captured = captureRegionSubtrees(regions);

    // Same visible content, fresh object graph: nothing is rebuilt.
    initPage(page);
    assertRegionSubtreesPreserved(regions, captured);

    // A status update touches only the footer region.
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "refresh-model-cache",
        rowIndex: 1,
        backendId: "sr-1",
        ok: true,
      },
    });
    assertRegionSubtreesPreserved(
      { header: regions.header, body: regions.body },
      captured,
    );
    assert.include(
      page.root.querySelector(".backend-footer-status")?.textContent,
      "sr-1",
    );

    // A provider switch rebuilds header + body but not the footer.
    const footerCaptured = captureRegionSubtrees({ footer: regions.footer });
    page.controller.handleMessage({
      type: "backend-manager-dialog:select-provider",
      payload: { providerType: "skillrunner" },
    });
    assertRegionSubtreesPreserved({ footer: regions.footer }, footerCaptured);
    assert.equal(
      page.root.querySelector(".backend-provider-title")?.textContent,
      "SkillRunner Profiles",
    );
  });
});
