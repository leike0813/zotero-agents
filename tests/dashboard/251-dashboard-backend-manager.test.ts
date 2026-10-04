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

  it("keeps Built-in Agent actions separate from Backend Profile rows", function () {
    const page = createPage();
    initPage(page, {
      builtinAgent: {
        configurations: [],
        configurationStatus: {},
        credentials: [],
        mcpSources: [],
        mcpCredentials: [],
        mcpDiscovered: {},
        defaults: {},
        overlayPath: "",
        catalog: {
          status: "ready",
          revision: "r1",
          modelCount: 1,
          providers: ["openai"],
        },
        models: [],
      },
    } as Partial<BackendManagerSnapshot>);
    const tabs = Array.from(
      page.root.querySelectorAll(".backend-provider-tab"),
    );
    assert.equal(tabs[tabs.length - 1].textContent, "Built-in Agent");
    page.actions.length = 0;
    clickButton(tabs[tabs.length - 1]);
    assert.isOk(page.root.querySelector(".backend-pi-unavailable"));
    assert.isOk(page.root.querySelector("[data-pi-field='default-auxiliary']"));
    clickButton(page.root.querySelector("[data-pi-action='add']"));
    assert.ok(page.root.querySelector("[data-pi-field='provider']"));
    clickButton(page.root.querySelector("[data-pi-action='save']"));
    assert.equal(page.actions.at(-1)?.action, "pi-upsert-configuration");
    // C18: the global diagnostic export lives on the Built-in Agent surface
    // and is entirely independent of the Backend Profile rows.
    clickButton(
      page.root.querySelector("[data-pi-action='export-diagnostics']"),
    );
    assert.deepEqual(page.actions.at(-1), {
      action: "pi-export-diagnostics",
      payload: {},
    });
    for (const [field, value] of [
      ["id", "mcp-fixture"],
      ["label", "MCP fixture"],
      ["url", "https://example.org/mcp"],
    ]) {
      const input = page.root.querySelector(
        `[data-mcp-field='${field}']`,
      ) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    }
    clickButton(page.root.querySelector("[data-mcp-action='save-source']"));
    assert.equal(page.actions.at(-1)?.action, "pi-mcp-upsert-source");
    assert.equal(page.controller.state.rows.length, 3);
    assert.isFalse(page.actions.some((entry) => entry.action === "save"));
  });

  it("saves the latest ChatGPT configuration draft after an input event", async function () {
    const page = createPage();
    initPage(page, {
      builtinAgent: {
        configurations: [
          {
            id: "chatgpt-config",
            label: "Fixture ChatGPT",
            provider: "openai",
            api: "openai-responses",
            modelId: "fixture-model",
            authVariant: "chatgpt",
            credentialRef: "registration-a",
            enabled: true,
          },
        ],
        configurationStatus: { "chatgpt-config": "configured" },
        credentials: [],
        chatgptRegistrations: [],
        mcpSources: [],
        mcpCredentials: [],
        mcpDiscovered: {},
        defaults: {},
        overlayPath: "",
        catalog: {
          status: "ready",
          revision: "r1",
          modelCount: 1,
          providers: ["openai"],
        },
        models: [{ provider: "openai", id: "fixture-model", name: "Fixture" }],
      } as Partial<BackendManagerSnapshot>["builtinAgent"],
    });
    clickButton(page.root.querySelectorAll(".backend-provider-tab")[3]);
    clickButton(page.root.querySelector("[data-pi-field='configuration']"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    clickButton(
      page.root.querySelector("[data-choice-value='chatgpt-config']"),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    fireInput(
      page.root.querySelector("[data-pi-field='label']")!,
      "Edited fixture",
    );
    // Browser input and click are separate native events; let Preact's queued
    // state update commit between the two simulated events.
    await Promise.resolve();
    clickButton(page.root.querySelector("[data-pi-action='save']"));

    const saved = page.actions.find(
      (entry) => entry.action === "pi-upsert-configuration",
    );
    assert.equal(saved?.payload.configuration.label, "Edited fixture");
    assert.equal(saved?.payload.configuration.credentialRef, "registration-a");
  });

  it("ignores an older MCP discovery result for the same source", function () {
    const page = createPage();
    initPage(page, {
      builtinAgent: {
        configurations: [],
        configurationStatus: {},
        credentials: [],
        mcpSources: [
          {
            id: "mcp-fixture",
            label: "MCP fixture",
            transport: "http",
            url: "https://example.org/mcp",
            enabled: true,
            credentialSlots: {},
            selectedTools: {},
          },
        ],
        mcpCredentials: [],
        mcpDiscovered: {},
        defaults: {},
        overlayPath: "",
        catalog: {
          status: "ready",
          revision: "r1",
          modelCount: 0,
          providers: [],
        },
        models: [],
      },
    });
    const tabs = Array.from(
      page.root.querySelectorAll(".backend-provider-tab"),
    );
    clickButton(tabs[tabs.length - 1]);
    const test = page.root.querySelectorAll(
      ".backend-pi-credential-row button",
    )[1];
    clickButton(test);
    clickButton(test);
    const requests = page.actions.filter(
      (entry) => entry.action === "pi-mcp-test-source",
    );
    assert.lengthOf(requests, 2);
    assert.notEqual(
      requests[0].payload.requestId,
      requests[1].payload.requestId,
    );
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "pi-mcp-test-source",
        ok: true,
        id: "mcp-fixture",
        requestId: requests[0].payload.requestId,
        tools: [{ name: "old", digest: "old" }],
      },
    });
    assert.deepEqual(
      page.controller.state.snapshot!.builtinAgent!.mcpDiscovered,
      {},
    );
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "pi-mcp-test-source",
        ok: true,
        id: "mcp-fixture",
        requestId: requests[1].payload.requestId,
        tools: [{ name: "current", digest: "current" }],
      },
    });
    assert.equal(
      page.controller.state.snapshot!.builtinAgent!.mcpDiscovered[
        "mcp-fixture"
      ][0].name,
      "current",
    );
  });

  it("submits API keys once and starts connection tests only on click", async function () {
    const page = createPage();
    initPage(page, {
      builtinAgent: {
        configurations: [
          {
            id: "pi-config",
            label: "Pi",
            provider: "openai",
            modelId: "test-model",
            authVariant: "api-key",
            enabled: true,
          },
        ],
        configurationStatus: { "pi-config": "needs-auth" },
        credentials: [],
        mcpSources: [],
        mcpCredentials: [],
        mcpDiscovered: {},
        defaults: {},
        overlayPath: "",
        catalog: {
          status: "ready",
          revision: "r1",
          modelCount: 1,
          providers: ["openai"],
        },
        models: [{ provider: "openai", id: "test-model", name: "Test" }],
      },
    });
    const tabs = Array.from(
      page.root.querySelectorAll(".backend-provider-tab"),
    );
    clickButton(tabs[tabs.length - 1]);
    clickButton(page.root.querySelector("[data-pi-field='configuration']"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    clickButton(page.root.querySelector("[data-choice-value='pi-config']"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.isFalse(
      page.actions.some((entry) => entry.action === "pi-test-connection"),
    );
    fireInput(
      page.root.querySelector("[data-pi-field='credential-label']")!,
      "Personal",
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireInput(
      page.root.querySelector("[data-pi-field='credential-secret']")!,
      "private-secret",
    );
    clickButton(page.root.querySelector("[data-pi-action='credential-save']"));
    const submitted = page.actions.find(
      (entry) => entry.action === "pi-put-credential",
    );
    assert.isOk(submitted);
    assert.equal(submitted?.payload.secret, "private-secret");
    assert.notInclude(
      JSON.stringify(page.controller.state.snapshot),
      "private-secret",
    );
    assert.equal(
      (
        page.root.querySelector(
          "[data-pi-field='credential-secret']",
        ) as HTMLInputElement
      ).value,
      "",
    );
    clickButton(page.root.querySelector("[data-pi-action='connection-test']"));
    const tested = page.actions.find(
      (entry) => entry.action === "pi-test-connection",
    );
    assert.isOk(tested);
    assert.equal(tested?.payload.configurationId, "pi-config");
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "pi-test-connection",
        requestId: tested?.payload.requestId,
        ok: false,
        code: "provider_auth_failed",
      },
    });
    assert.include(
      page.root.querySelector(".backend-footer-status")?.textContent || "",
      "Connection unavailable",
    );
    assert.notInclude(page.root.textContent || "", "provider_auth_failed");
    const snapshot = page.controller.state.snapshot!;
    page.controller.handleMessage({
      type: "backend-manager-dialog:snapshot",
      payload: {
        ...snapshot,
        builtinAgent: {
          ...snapshot.builtinAgent!,
          credentials: [
            {
              id: "saved-key",
              label: "Personal",
              kind: "api-key",
              masked: "••••",
              updatedAt: "2026-09-28T00:00:00.000Z",
            },
          ],
        },
      },
    });
    const clear = page.root.querySelector(".backend-pi-credential-row button");
    clickButton(clear);
    assert.equal(
      page.actions.find((entry) => entry.action === "pi-delete-credential")
        ?.payload.id,
      "saved-key",
    );
    assert.equal(page.controller.state.rows.length, 3);
  });

  it("publishes bounded directory state and correlates every directory action", async function () {
    const page = createPage();
    initPage(page, {
      builtinAgent: {
        configurations: [],
        configurationStatus: {},
        credentials: [],
        mcpSources: [],
        mcpCredentials: [],
        mcpDiscovered: {},
        defaults: {},
        overlayPath: "/data/omp/models.yml",
        catalog: {
          status: "ready",
          revision: "sha256-current",
          modelCount: 12,
          providers: ["openai"],
          state: {
            source: "current",
            revision: "sha256-current",
            schemaVersion: 1,
            runtimeVersion: "1.0.0",
            status: "idle",
            checkedAt: "2026-10-03T01:00:00.000Z",
            updatedAt: "2026-10-03T00:00:00.000Z",
            autoUpdate: true,
            canRestore: false,
            overlayStatus: "cached",
          },
        },
        models: [],
      },
    });
    const tabs = Array.from(
      page.root.querySelectorAll(".backend-provider-tab"),
    );
    clickButton(tabs[tabs.length - 1]);
    assert.include(
      page.root.querySelector("[data-pi-catalog-summary]")?.textContent || "",
      "sha256-current",
    );
    // Only safe source state reaches the page: no directory models, no secrets,
    // no private overlay path.
    assert.notInclude(page.root.textContent || "", "/data/omp/models.yml");

    clickButton(
      page.root.querySelector("[data-pi-action='catalog-refresh-public']"),
    );
    clickButton(
      page.root.querySelector("[data-pi-action='catalog-refresh-public']"),
    );
    const refreshes = page.actions.filter(
      (entry) => entry.action === "pi-catalog-refresh-public",
    );
    assert.lengthOf(refreshes, 2);
    assert.notEqual(
      refreshes[0].payload.requestId,
      refreshes[1].payload.requestId,
    );

    // A superseded result must not paint over a newer one.
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "pi-catalog-refresh-public",
        ok: true,
        requestId: refreshes[0].payload.requestId,
      },
    });
    assert.notInclude(
      page.controller.state.statusMessage?.text || "",
      "Catalog updated",
    );
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "pi-catalog-refresh-public",
        ok: true,
        requestId: refreshes[1].payload.requestId,
      },
    });
    assert.include(
      page.controller.state.statusMessage?.text || "",
      "Catalog updated",
    );

    const autoUpdate = page.root.querySelector(
      "[data-pi-field='catalog-auto-update']",
    ) as HTMLInputElement;
    assert.isTrue(autoUpdate.checked);
    autoUpdate.checked = false;
    autoUpdate.dispatchEvent(new window.Event("change", { bubbles: true }));
    const auto = page.actions.find(
      (entry) => entry.action === "pi-catalog-set-auto-update",
    );
    assert.isOk(auto);
    assert.isFalse(auto?.payload.enabled);
    assert.isOk(auto?.payload.requestId);

    // Recovery stays unavailable until the owner reports a previous snapshot.
    const restore = page.root.querySelector(
      "[data-pi-action='catalog-restore-previous']",
    ) as HTMLButtonElement;
    assert.isTrue(restore.disabled);
    page.controller.handleMessage({
      type: "backend-manager-dialog:snapshot",
      payload: {
        ...page.controller.state.snapshot!,
        builtinAgent: {
          ...page.controller.state.snapshot!.builtinAgent!,
          catalog: {
            ...page.controller.state.snapshot!.builtinAgent!.catalog,
            state: {
              ...page.controller.state.snapshot!.builtinAgent!.catalog.state!,
              canRestore: true,
            },
          },
        },
      },
    });
    clickButton(
      page.root.querySelector("[data-pi-action='catalog-restore-previous']"),
    );
    assert.isOk(
      page.actions.find(
        (entry) => entry.action === "pi-catalog-restore-previous",
      )?.payload.requestId,
    );
    clickButton(page.root.querySelector("[data-pi-action='overlay-remove']"));
    assert.isOk(
      page.actions.find((entry) => entry.action === "pi-catalog-remove-overlay")
        ?.payload.requestId,
    );

    // A refresh that resolves with retained data must still report failure,
    // and only the safe state code may reach the page.
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "pi-catalog-refresh-public",
        ok: false,
        error: "network",
        requestId: refreshes[1].payload.requestId,
      },
    });
    assert.include(
      page.root.querySelector("[data-pi-catalog-summary]")?.textContent || "",
      "sha256-current",
    );
    assert.include(
      page.root.querySelector(".backend-footer-status")?.textContent || "",
      "unavailable",
    );
    assert.notInclude(page.root.textContent || "", "TypeError");
  });

  it("keeps an unsaved draft, defaults and selection when the directory changes", async function () {
    const page = createPage();
    initPage(page, {
      builtinAgent: {
        configurations: [
          {
            id: "pi-config",
            label: "Pi",
            provider: "openai",
            modelId: "chosen-model",
            authVariant: "api-key",
            enabled: true,
          },
        ],
        configurationStatus: { "pi-config": "configured" },
        credentials: [],
        mcpSources: [],
        mcpCredentials: [],
        mcpDiscovered: {},
        defaults: { global: { configurationId: "pi-config" } },
        overlayPath: "",
        catalog: {
          status: "ready",
          revision: "sha256-current",
          modelCount: 2,
          providers: ["openai"],
          state: {
            source: "current",
            revision: "sha256-current",
            schemaVersion: 1,
            runtimeVersion: "1.0.0",
            status: "idle",
            autoUpdate: true,
            canRestore: true,
            overlayStatus: "none",
          },
        },
        models: [
          { provider: "openai", id: "chosen-model", name: "Chosen" },
          { provider: "openai", id: "other-model", name: "Other" },
        ],
      },
    });
    const tabs = Array.from(
      page.root.querySelectorAll(".backend-provider-tab"),
    );
    clickButton(tabs[tabs.length - 1]);
    clickButton(page.root.querySelector("[data-pi-field='configuration']"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    clickButton(page.root.querySelector("[data-choice-value='pi-config']"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireInput(page.root.querySelector("[data-pi-field='label']")!, "Unsaved");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const regions = {
      header: page.root.querySelector('[data-region-mount="header"]')!,
      footer: page.root.querySelector('[data-region-mount="footer"]')!,
    };
    const captured = captureRegionSubtrees(regions);

    // A lifecycle check publishes "checking" through the subscriber.
    page.controller.handleMessage({
      type: "backend-manager-dialog:snapshot",
      payload: {
        ...page.controller.state.snapshot!,
        builtinAgent: {
          ...page.controller.state.snapshot!.builtinAgent!,
          catalog: {
            ...page.controller.state.snapshot!.builtinAgent!.catalog,
            state: {
              ...page.controller.state.snapshot!.builtinAgent!.catalog.state!,
              status: "checking",
            },
          },
        },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(
      (page.root.querySelector("[data-pi-field='label']") as HTMLInputElement)
        .value,
      "Unsaved",
    );
    assert.isTrue(
      (
        page.root.querySelector(
          "[data-pi-action='catalog-refresh-public']",
        ) as HTMLButtonElement
      ).disabled,
    );

    // The candidate disappears and the directory falls back to the seed.
    page.controller.handleMessage({
      type: "backend-manager-dialog:snapshot",
      payload: {
        ...page.controller.state.snapshot!,
        builtinAgent: {
          ...page.controller.state.snapshot!.builtinAgent!,
          catalog: {
            status: "ready",
            revision: "seed",
            modelCount: 1,
            providers: ["openai"],
            state: {
              source: "seed",
              revision: "seed",
              schemaVersion: 1,
              runtimeVersion: "1.0.0",
              status: "offline",
              error: "network",
              autoUpdate: false,
              canRestore: true,
              overlayStatus: "none",
            },
          },
          models: [{ provider: "openai", id: "other-model", name: "Other" }],
        },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(
      (page.root.querySelector("[data-pi-field='label']") as HTMLInputElement)
        .value,
      "Unsaved",
    );
    // A vanished candidate is never silently replaced by the first remaining one.
    assert.equal(
      (page.root.querySelector("[data-pi-field='modelId']") as HTMLInputElement)
        .value,
      "chosen-model",
    );
    assert.equal(
      page.root
        .querySelector("[data-pi-field='configuration']")
        ?.getAttribute("aria-label"),
      "Configurations: Pi",
    );
    assert.isOk(page.root.querySelector("[data-pi-catalog-error]"));
    assertRegionSubtreesPreserved(regions, captured);
  });

  it("shows request-bound ChatGPT progress without exposing authorization material", async function () {
    const page = createPage();
    initPage(page, {
      builtinAgent: {
        configurations: [
          {
            id: "chatgpt-config",
            label: "ChatGPT",
            provider: "openai",
            modelId: "fixture-model",
            api: "openai-responses",
            authVariant: "chatgpt",
            credentialRef: "registration-a",
            enabled: true,
          },
        ],
        configurationStatus: { "chatgpt-config": "configured" },
        credentials: [
          {
            id: "registration-a",
            label: "Personal",
            kind: "chatgpt",
            namespace: "model-provider",
            masked: "••••",
            updatedAt: "2026-10-03T00:00:00.000Z",
          },
        ],
        chatgptRegistrations: [
          {
            id: "registration-a",
            label: "Personal",
            email: "person@example.com",
            clientId: "client-a",
            signedIn: true,
            planEnabled: true,
            paused: false,
            reauthorizationRequired: false,
            welcomeAccepted: true,
          },
          {
            id: "registration-b",
            label: "Work",
            email: "person@example.com",
            clientId: "client-b",
            signedIn: false,
            planEnabled: false,
            paused: true,
            reauthorizationRequired: false,
            welcomeAccepted: false,
          },
        ],
        mcpSources: [],
        mcpCredentials: [],
        mcpDiscovered: {},
        defaults: {},
        overlayPath: "",
        catalog: {
          status: "ready",
          revision: "r1",
          modelCount: 1,
          providers: ["openai"],
        },
        models: [{ provider: "openai", id: "fixture-model", name: "Fixture" }],
      } as Partial<BackendManagerSnapshot>["builtinAgent"],
    });
    const tabs = Array.from(
      page.root.querySelectorAll(".backend-provider-tab"),
    );
    clickButton(tabs[tabs.length - 1]);
    clickButton(page.root.querySelector("[data-pi-field='configuration']"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    clickButton(
      page.root.querySelector("[data-choice-value='chatgpt-config']"),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.include(page.root.textContent || "", "Continue with ChatGPT");
    assert.include(page.root.textContent || "", "person@example.com");
    assert.include(page.root.textContent || "", "Personal");
    assert.include(page.root.textContent || "", "Work");
    assert.include(page.root.textContent || "", "Manage Usage");
    assert.include(page.root.textContent || "", "Usage paused");
    assert.include(page.root.textContent || "", "Signed out");
    assert.isNull(page.root.querySelector("[data-pi-action*='verification']"));
    assert.notInclude(page.root.textContent || "", "user code");
    assert.notInclude(page.root.textContent || "", "verification URL");

    clickButton(page.root.querySelector("[data-pi-field='credential']"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    clickButton(
      page.root.querySelector("[data-choice-value='registration-b']"),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    const refresh = page.actions
      .filter((entry) => entry.action === "pi-chatgpt-refresh-models")
      .at(-1)!;
    assert.equal(refresh.payload.registrationId, "registration-b");

    clickButton(page.root.querySelector("[data-pi-action='chatgpt-connect']"));
    const connect = page.actions.find(
      (entry) => entry.action === "pi-chatgpt-connect",
    )!;
    assert.equal(connect.payload.registrationId, "registration-b");
    assert.isString(connect.payload.requestId);
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "pi-chatgpt-connect",
        requestId: connect.payload.requestId,
        status: "waiting_browser",
        ok: true,
        access: "must-not-cross-the-page-boundary",
        verificationUrl: "https://auth.openai.com/private",
        userCode: "PRIVATE-CODE",
      },
    });
    assert.include(page.root.textContent || "", "Waiting");
    assert.notInclude(page.root.textContent || "", "PRIVATE-CODE");
    assert.notInclude(page.root.textContent || "", "auth.openai.com");
    assert.notInclude(
      JSON.stringify(page.controller.state.snapshot),
      "must-not-cross-the-page-boundary",
    );
    assert.notInclude(
      JSON.stringify(page.controller.state),
      "must-not-cross-the-page-boundary",
    );

    clickButton(page.root.querySelector("[data-pi-action='chatgpt-connect']"));
    assert.equal(
      page.actions.filter((entry) => entry.action === "pi-chatgpt-connect")
        .length,
      1,
    );
    clickButton(page.root.querySelector("[data-pi-action='chatgpt-cancel']"));
    assert.equal(page.actions.at(-1)?.action, "pi-chatgpt-cancel");
    assert.equal(
      page.actions.at(-1)?.payload.requestId,
      connect.payload.requestId,
    );
    page.controller.dispose();
  });

  it("starts a new ChatGPT registration when the configuration points at an API key", async function () {
    const page = createPage();
    initPage(page, {
      builtinAgent: {
        configurations: [
          {
            id: "chatgpt-config",
            label: "ChatGPT",
            provider: "openai",
            modelId: "fixture-model",
            api: "openai-responses",
            authVariant: "chatgpt",
            credentialRef: "api-key-ref",
            enabled: true,
          },
        ],
        configurationStatus: { "chatgpt-config": "needs-auth" },
        credentials: [
          {
            id: "api-key-ref",
            label: "Existing API key",
            kind: "api-key",
            namespace: "model-provider",
            masked: "••••",
            updatedAt: "2026-10-03T00:00:00.000Z",
          },
        ],
        chatgptRegistrations: [],
        mcpSources: [],
        mcpCredentials: [],
        mcpDiscovered: {},
        defaults: {},
        overlayPath: "",
        catalog: {
          status: "ready",
          revision: "r1",
          modelCount: 1,
          providers: ["openai"],
        },
        models: [{ provider: "openai", id: "fixture-model", name: "Fixture" }],
      } as Partial<BackendManagerSnapshot>["builtinAgent"],
    });
    const tabs = Array.from(
      page.root.querySelectorAll(".backend-provider-tab"),
    );
    clickButton(tabs[tabs.length - 1]);
    clickButton(page.root.querySelector("[data-pi-field='configuration']"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    clickButton(
      page.root.querySelector("[data-choice-value='chatgpt-config']"),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const credentialChoice = page.root.querySelector(
      "[data-pi-field='credential']",
    );
    clickButton(credentialChoice);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.isNull(page.root.querySelector("[data-choice-value='api-key-ref']"));
    assert.include(page.root.textContent || "", "New ChatGPT registration");

    clickButton(page.root.querySelector("[data-pi-action='chatgpt-connect']"));
    const connect = page.actions.find(
      (entry) => entry.action === "pi-chatgpt-connect",
    )!;
    assert.equal(connect.payload.registrationId, "");
    page.controller.dispose();
  });

  it("does not expose the retired Codex device-code flow", async function () {
    const page = createPage();
    initPage(page, {
      builtinAgent: {
        configurations: [
          {
            id: "chatgpt-config",
            label: "ChatGPT",
            provider: "openai",
            modelId: "fixture-model",
            api: "openai-responses",
            authVariant: "chatgpt",
            credentialRef: "registration-a",
            enabled: true,
          },
        ],
        configurationStatus: { "chatgpt-config": "needs-auth" },
        credentials: [],
        chatgptRegistrations: [],
        mcpSources: [],
        mcpCredentials: [],
        mcpDiscovered: {},
        defaults: {},
        overlayPath: "",
        catalog: {
          status: "ready",
          revision: "r1",
          modelCount: 1,
          providers: ["openai"],
        },
        models: [{ provider: "openai", id: "fixture-model", name: "Fixture" }],
      },
    });
    const tabs = Array.from(
      page.root.querySelectorAll(".backend-provider-tab"),
    );
    clickButton(tabs[tabs.length - 1]);
    clickButton(page.root.querySelector("[data-pi-field='configuration']"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    clickButton(
      page.root.querySelector("[data-choice-value='chatgpt-config']"),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.isNull(page.root.querySelector("[data-pi-action='codex-connect']"));
    assert.isNull(page.root.querySelector("[data-pi-action='codex-cancel']"));
    assert.isNull(
      page.root.querySelector("[data-pi-action='codex-open-verification']"),
    );
    assert.include(page.root.textContent || "", "ChatGPT");
    assert.notInclude(page.root.textContent || "", "device code");
    assert.notInclude(page.root.textContent || "", "verification URL");
    assert.isUndefined(
      page.actions.find((entry) => entry.action.startsWith("pi-codex-")),
    );
    page.controller.dispose();
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
  it("manages Web Search Sources without touching Backend Profile rows", async function () {
    const page = createPage();
    initPage(page, {
      builtinAgent: {
        configurations: [
          {
            id: "pi-config",
            label: "Pi",
            provider: "openai",
            modelId: "gpt-search",
            authVariant: "api-key",
            enabled: true,
          },
        ],
        configurationStatus: { "pi-config": "configured" },
        credentials: [],
        mcpSources: [],
        mcpCredentials: [],
        mcpDiscovered: {},
        defaults: {},
        overlayPath: "",
        catalog: {
          status: "ready",
          revision: "r1",
          modelCount: 1,
          providers: ["openai"],
        },
        models: [],
        webSources: [
          { id: "exa", kind: "exa-mcp", label: "Exa", enabled: true },
          { id: "tavily", kind: "tavily-mcp", label: "Tavily", enabled: false },
          {
            id: "searxng",
            kind: "searxng",
            label: "SearXNG",
            enabled: false,
            endpoint: "https://searx.example",
          },
          {
            id: "brave-mcp",
            kind: "brave-mcp",
            label: "Brave (MCP)",
            enabled: false,
          },
          {
            id: "openai-native",
            kind: "openai-native",
            label: "OpenAI Web Search",
            enabled: false,
          },
          {
            id: "anthropic-native",
            kind: "anthropic-native",
            label: "Anthropic Web Search",
            enabled: false,
          },
        ],
        webCredentials: [
          {
            id: "web-key",
            label: "Web key",
            kind: "web-secret",
            namespace: "web-source",
            masked: "••••",
            updatedAt: "2026-09-30T00:00:00.000Z",
          },
        ],
        webTestResults: {},
      },
    } as Partial<BackendManagerSnapshot>);
    const tabs = Array.from(
      page.root.querySelectorAll(".backend-provider-tab"),
    );
    clickButton(tabs[tabs.length - 1]);
    page.actions.length = 0;

    assert.equal(page.root.querySelectorAll("[data-web-source]").length, 6);
    assert.isOk(
      page.root.querySelector(
        "[data-web-source='tavily'] [data-web-badge='paid']",
      ),
    );
    assert.notOk(
      page.root.querySelector(
        "[data-web-source='exa'] [data-web-badge='paid']",
      ),
    );
    assert.include(
      page.root.querySelector("[data-pi-web-sources]")?.textContent || "",
      "2.1.4",
    );

    const saved = () =>
      page.actions
        .filter((entry) => entry.action === "pi-web-save-sources")
        .at(-1)!.payload.sources as Array<Record<string, unknown>>;
    const savedById = (id: string) =>
      saved().find((source) => source.id === id) as Record<string, unknown>;

    const tavilyEnabled = page.root.querySelector(
      "[data-web-source='tavily'] .backend-checkbox-field input",
    )!;
    (tavilyEnabled as HTMLInputElement).checked = true;
    fireChange(tavilyEnabled);
    assert.isTrue(savedById("tavily").enabled);

    clickButton(
      page.root.querySelector(
        "[data-web-source='tavily'] [data-web-action='up']",
      ),
    );
    assert.deepEqual(
      saved().map((source) => source.id),
      [
        "tavily",
        "exa",
        "searxng",
        "brave-mcp",
        "openai-native",
        "anthropic-native",
      ],
    );

    fireInput(
      page.root.querySelector("[data-web-field='endpoint:searxng']")!,
      "https://searx.internal",
    );
    assert.equal(savedById("searxng").endpoint, "https://searx.internal");

    clickButton(
      page.root.querySelector("[data-web-field='model:openai-native']"),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    clickButton(page.root.querySelector("[data-choice-value='pi-config']"));
    assert.equal(savedById("openai-native").modelConfigurationId, "pi-config");
    fireInput(
      page.root.querySelector("[data-web-field='search-model:openai-native']")!,
      "gpt-5-search",
    );
    assert.equal(savedById("openai-native").searchModelId, "gpt-5-search");

    const codeExecution = page.root.querySelector(
      "[data-web-field='code-execution:brave-mcp']",
    )!;
    (codeExecution as HTMLInputElement).checked = true;
    fireChange(codeExecution);
    assert.isTrue(savedById("brave-mcp").codeExecutionApproved);

    clickButton(
      page.root.querySelector(
        "[data-web-source='exa'] [data-web-action='test']",
      ),
    );
    const request = page.actions
      .filter((entry) => entry.action === "pi-web-test-source")
      .at(-1)!;
    assert.isString(request.payload.requestId);
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "pi-web-test-source",
        ok: true,
        sourceId: "exa",
        requestId: "stale-request",
        status: "available",
      },
    });
    assert.notOk(
      page.root.querySelector("[data-web-source='exa'] [data-web-status]"),
    );
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "pi-web-test-source",
        ok: true,
        sourceId: "exa",
        requestId: request.payload.requestId,
        status: "unavailable",
        code: "provider_unavailable",
      },
    });
    const status = page.root.querySelector(
      "[data-web-source='exa'] [data-web-status]",
    )!;
    assert.equal(
      page.controller.state.snapshot!.builtinAgent!.webTestResults["exa"]
        ?.status,
      "unavailable",
    );
    assert.equal(status.getAttribute("data-web-status"), "unavailable");
    assert.include(status.textContent || "", "provider_unavailable");
    page.controller.handleMessage({
      type: "backend-manager-dialog:action-result",
      payload: {
        action: "pi-web-test-source",
        ok: true,
        sourceId: "exa",
        requestId: request.payload.requestId,
        status: "available",
        toolDigest: `sha256:${"a".repeat(64)}`,
      },
    });
    clickButton(
      page.root.querySelector(
        "[data-web-source='exa'] [data-web-action='review']",
      ),
    );
    assert.equal(
      savedById("exa").reviewedToolDigest,
      `sha256:${"a".repeat(64)}`,
    );

    page.controller.handleMessage({
      type: "backend-manager-dialog:snapshot",
      payload: {
        ...page.controller.state.snapshot!,
        builtinAgent: {
          ...page.controller.state.snapshot!.builtinAgent!,
          webTestResults: {},
        },
      },
    });
    assert.isOk(
      page.root.querySelector("[data-web-source='exa'] [data-web-status]"),
    );

    fireInput(
      page.root.querySelector("[data-web-field='secret-id']")!,
      "web-key",
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireInput(
      page.root.querySelector("[data-web-field='secret-label']")!,
      "Web key",
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireInput(
      page.root.querySelector("[data-web-field='secret']")!,
      "web-secret-value",
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    clickButton(page.root.querySelector("[data-web-action='save-secret']"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const secretAction = page.actions.find(
      (entry) => entry.action === "pi-web-put-secret",
    );
    assert.isOk(secretAction);
    assert.equal(secretAction?.payload.id, "web-key");
    assert.equal(secretAction?.payload.secret, "web-secret-value");
    assert.notInclude(
      JSON.stringify(page.controller.state.snapshot),
      "web-secret-value",
    );
    assert.equal(
      (page.root.querySelector("[data-web-field='secret']") as HTMLInputElement)
        .value,
      "",
    );
    assert.isFalse(page.actions.some((entry) => entry.action === "save"));
  });
});
