import { assert } from "chai";

import {
  assertRegionSubtreesPreserved,
  captureRegionSubtrees,
  createSidebarDomEnvironment,
  installSidebarDomGlobals,
  restoreSidebarDomGlobals,
} from "../helpers/sidebarDomEnv";
import { createZoteroAgentSettingsController } from "../../src/dashboard/zoteroAgentSettingsApp";
import { createZoteroAgentSettingsRenderer } from "../../src/dashboard/zoteroAgentSettingsRenderer";
import type { ZoteroAgentSettingsSnapshot } from "../../src/shared/zoteroAgentSettingsWireContract";

type RecordedAction = {
  action: string;
  requestId: string;
  objectId: string;
  payload: Record<string, unknown>;
};

function baseSnapshot(): ZoteroAgentSettingsSnapshot {
  return {
    revision: "1",
    state: {
      connections: [],
      configurations: [],
      defaults: {},
      overlayPath: "",
    },
    credentials: [],
    registrations: [],
    mcpSources: [],
    mcpCredentials: [],
    mcpTestIdentity: {},
    webSources: [],
    webCredentials: [],
    catalog: {
      revision: "rev-1",
      modelCount: 2,
      providers: [
        { id: "openai", label: "OpenAI", modelCount: 2, configurable: true },
        {
          id: "anthropic",
          label: "Anthropic",
          modelCount: 1,
          configurable: true,
        },
        {
          id: "github-copilot",
          label: "GitHub Copilot",
          modelCount: 1,
          configurable: false,
          unavailableReason: "unsupported_login",
        },
      ],
      state: {
        source: "current",
        revision: "rev-1",
        schemaVersion: 1,
        runtimeVersion: "1",
        status: "idle",
        autoUpdate: true,
        canRestore: true,
        overlayStatus: "none",
      },
      overlayLabel: "",
    },
    models: {
      // The page shows a directory page only to the request that asked for it,
      // so a fixture states the binding it answers.
      query: "",
      provider: "",
      models: [
        {
          provider: "openai",
          id: "gpt-x",
          name: "GPT X",
          api: "openai-responses",
          baseUrl: "https://api.openai.com/v1",
          contextWindow: 128000,
          maxTokens: 4096,
          input: ["text"],
          supportsTools: true,
          reasoning: ["low", "medium"],
          source: "bundled",
          configurable: true,
        },
        {
          provider: "github-copilot",
          id: "copilot-x",
          name: "Copilot X",
          api: "openai-completions",
          baseUrl: "https://api.githubcopilot.com",
          contextWindow: 0,
          maxTokens: 0,
          input: ["text"],
          supportsTools: false,
          reasoning: [],
          source: "bundled",
          configurable: false,
          reason: "unsupported_login",
        },
      ],
      total: 2,
      offset: 0,
      pageSize: 50,
    },
    labels: {},
  };
}

function withConnection(): ZoteroAgentSettingsSnapshot {
  const snapshot = baseSnapshot();
  snapshot.state.connections = [
    {
      id: "conn-1",
      kind: "api-key",
      label: "OpenAI",
      provider: "openai",
      authVariant: "api-key",
      credentialRef: "cred-1",
      enabled: true,
      baseUrl: "https://api.openai.com/v1",
      availability: { code: "ready", ready: true },
      discovery: { status: "ready" },
      modelCount: 2,
    },
    {
      id: "conn-2",
      kind: "chatgpt",
      label: "ChatGPT",
      provider: "openai",
      authVariant: "chatgpt",
      registrationId: "reg-1",
      enabled: true,
      availability: { code: "plan_permission_missing", ready: false },
      discovery: { status: "ready" },
      modelCount: 1,
    },
  ];
  snapshot.state.configurations = [
    {
      id: "card-1",
      connectionId: "conn-1",
      provider: "openai",
      modelId: "gpt-x",
      name: "GPT X",
      enabled: true,
      reasoning: "medium",
      reasoningLevels: ["low", "medium", "high"],
      availability: { usable: true },
      bindingIdentity: "card-1-binding",
    },
    {
      id: "card-2",
      connectionId: "conn-1",
      provider: "openai",
      modelId: "gpt-y",
      name: "GPT Y",
      enabled: true,
      availability: { usable: true },
      bindingIdentity: "card-2-binding",
    },
  ];
  snapshot.state.defaults = { global: { configurationId: "card-1" } };
  snapshot.registrations = [
    {
      id: "reg-1",
      label: "Personal",
      email: "reader@example.test",
      workspace: "Personal",
      clientId: "client-1",
      signedIn: true,
      planEnabled: false,
      paused: false,
      reauthorizationRequired: false,
      welcomeAccepted: false,
      identity: "reg-1-identity",
    },
  ];
  snapshot.credentials = [
    {
      id: "cred-1",
      label: "OpenAI key",
      kind: "api-key",
      namespace: "model-provider",
      masked: "sk-…1234",
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
  ];
  return snapshot;
}

// Pages are unmounted before the DOM globals are restored: a passive effect
// that is still queued when jsdom disappears would run against a document that
// no longer exists.
const createdPages: { dispose?: () => void }[] = [];

function createPage(snapshot: ZoteroAgentSettingsSnapshot) {
  const actions: RecordedAction[] = [];
  const root = document.createElement("div");
  root.id = "zs-agent-settings-root";
  root.className = "zs-root";
  root.innerHTML =
    '<div data-zs-region="nav"></div>' +
    '<div data-zs-region="page"></div>' +
    '<div data-zs-region="status"></div>' +
    '<div data-zs-region="dialog"></div>';
  document.body.appendChild(root);
  const holder: {
    current?: ReturnType<typeof createZoteroAgentSettingsRenderer>;
  } = {};
  const controller = createZoteroAgentSettingsController({
    sendAction: (action, requestId, objectId, payload) => {
      actions.push({
        action,
        requestId,
        objectId,
        payload: JSON.parse(JSON.stringify(payload ?? {})),
      });
    },
    renderView: (view) => {
      if (typeof document === "undefined") return;
      holder.current?.renderView(view);
    },
  });
  holder.current = createZoteroAgentSettingsRenderer({
    root,
    handlers: controller.handlers,
  });
  createdPages.push(holder.current);
  controller.handleMessage({
    data: { type: "zotero-agent-settings:snapshot", payload: snapshot },
  });
  const settle = (
    action: RecordedAction,
    ok = true,
    code?: string,
    result: Record<string, unknown> = {},
  ) => {
    controller.handleMessage({
      data: {
        type: "zotero-agent-settings:action-result",
        payload: {
          action: action.action,
          requestId: action.requestId,
          objectId: action.objectId,
          ok,
          ...(code ? { code } : {}),
          result,
        },
      },
    });
  };
  return { root, actions, controller, settle };
}

// Preact flushes a component's own state update on a microtask, so a test that
// drives in-component state (an open menu) has to let that microtask run before
// it asserts. It also keeps a pending render from leaking past teardown, where it
// would touch a document that no longer exists.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function byTestId(root: ParentNode, id: string): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-testid="' + id + '"]');
}

function click(root: ParentNode, id: string): void {
  const node = byTestId(root, id);
  assert.ok(node, "element " + id + " exists");
  (node as HTMLElement).click();
}

function type(root: ParentNode, id: string, value: string): void {
  const node = byTestId(root, id);
  assert.ok(node, "input " + id + " exists");
  const input = node as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
}

// A real browser commits a field when it loses focus, and the commit has to
// see the same draft the keystroke just patched. Preact's compat layer routes
// an input's onBlur to the bubbling `focusout`, so a test drives that name: a
// commit that re-rendered from a stale draft would write the old value back
// onto the element before the page ever read the new one.
function commitField(root: ParentNode, id: string): void {
  const node = byTestId(root, id);
  assert.ok(node, "input " + id + " exists");
  node!.dispatchEvent(new window.Event("focusout", { bubbles: true }));
}

function typeAndCommit(root: ParentNode, id: string, value: string): void {
  type(root, id, value);
  commitField(root, id);
}

describe("zotero agent settings page (src/dashboard)", function () {
  beforeEach(function () {
    installSidebarDomGlobals(createSidebarDomEnvironment());
  });

  afterEach(async function () {
    // Drain pending effects before the document goes away: a passive effect that
    // runs after teardown would touch a jsdom window that no longer exists.
    await flush();
    while (createdPages.length) createdPages.pop()?.dispose?.();
    await flush();
    restoreSidebarDomGlobals();
  });

  it("renders five pages with one content scroller and a fixed header", function () {
    const page = createPage(baseSnapshot());
    for (const id of ["overview", "connections", "mcp", "search", "catalog"]) {
      assert.ok(byTestId(page.root, "nav-" + id), "nav entry " + id);
    }
    const scrollers = page.root.querySelectorAll(".zs-content-body");
    assert.equal(scrollers.length, 1, "exactly one main content scroller");
    const header = byTestId(page.root, "settings-page-overview");
    assert.ok(header, "page host");
    assert.ok(
      header!.querySelector(".zs-page-header"),
      "the page header is inside the page",
    );
    const nav = byTestId(page.root, "settings-nav")!;
    assert.equal(
      nav.className.includes("zs-nav-region"),
      false,
      "the navigation is its own region container",
    );
  });

  it("offers the three onboarding choices without assigning a default", function () {
    const page = createPage(baseSnapshot());
    assert.ok(
      byTestId(page.root, "overview-setup"),
      "setup choices are offered",
    );
    assert.equal(
      page.actions.filter((entry) => entry.action === "pi-set-defaults").length,
      0,
      "onboarding assigns no default purpose",
    );
  });

  it("saves a connection form once and clears the secret only after it settles", function () {
    const page = createPage(baseSnapshot());
    page.controller.handleMessage({
      data: {
        type: "zotero-agent-settings:snapshot",
        payload: withConnection(),
      },
    });
    page.controller.handlers.startAddConnection("api-key");
    type(page.root, "connection-editor-label", "My service");
    type(page.root, "connection-editor-secret", "sk-secret-value");
    click(page.root, "connection-editor-save");
    const save = page.actions.find(
      (entry) => entry.action === "pi-upsert-configuration",
    );
    assert.ok(save, "a connection save is sent");
    assert.equal(
      save!.payload.secret,
      "sk-secret-value",
      "the key travels once",
    );
    assert.ok(
      !JSON.stringify(page.root.textContent || "").includes("sk-secret-value"),
      "the submitted secret is never projected into the page",
    );
    // A failed save keeps the form and what the user typed.
    page.settle(save!, false, "persistence_failed");
    assert.ok(
      byTestId(page.root, "connection-editor"),
      "the editor stays open",
    );
    assert.equal(
      (byTestId(page.root, "connection-editor-secret") as HTMLInputElement)
        .value,
      "sk-secret-value",
      "a failed save keeps the draft secret for a retry",
    );
    click(page.root, "connection-editor-save");
    const retry = page.actions.filter(
      (entry) => entry.action === "pi-upsert-configuration",
    )[1];
    page.settle(retry);
    assert.equal(
      byTestId(page.root, "connection-editor"),
      null,
      "a settled save closes the editor",
    );
  });

  it("asks before leaving an unsaved form and honors continue, discard and save", function () {
    const page = createPage(baseSnapshot());
    page.controller.handleMessage({
      data: {
        type: "zotero-agent-settings:snapshot",
        payload: withConnection(),
      },
    });
    page.controller.handlers.navigate("mcp");
    page.controller.handlers.startAddConnection("api-key");
    type(page.root, "connection-editor-label", "Draft service");
    page.controller.handlers.navigate("search");
    assert.ok(
      byTestId(page.root, "leave-dialog"),
      "an unsaved draft is protected",
    );
    click(page.root, "leave-continue");
    assert.ok(
      byTestId(page.root, "connection-editor"),
      "continue editing keeps the draft open",
    );
    page.controller.handlers.navigate("search");
    click(page.root, "leave-discard");
    assert.equal(
      byTestId(page.root, "leave-dialog"),
      null,
      "discarding resolves the guard",
    );
    assert.ok(
      !page.actions.some((entry) => entry.action === "pi-upsert-configuration"),
      "discard never saves",
    );
  });

  it("keeps the guarded form's input, focus and selection across continue", async function () {
    const page = createPage(baseSnapshot());
    page.controller.handleMessage({
      data: {
        type: "zotero-agent-settings:snapshot",
        payload: withConnection(),
      },
    });
    page.controller.handlers.navigate("mcp");
    page.controller.handlers.addMcpSource();
    type(page.root, "mcp-editor-label", "Draft tool service");
    const input = byTestId(page.root, "mcp-editor-address") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(0, 0);
    page.controller.handlers.navigate("search");
    assert.ok(byTestId(page.root, "leave-dialog"), "the guard opens");
    assert.ok(
      byTestId(page.root, "mcp-editor-label"),
      "the editor stays mounted under the guard",
    );
    const guarded = byTestId(page.root, "mcp-editor-address");
    click(page.root, "leave-continue");
    await flush();
    const after = byTestId(page.root, "mcp-editor-address");
    assert.strictEqual(
      after,
      guarded,
      "the same input node survives the guard, so caret and selection survive too",
    );
    assert.equal(
      (byTestId(page.root, "mcp-editor-label") as HTMLInputElement).value,
      "Draft tool service",
      "the draft is untouched",
    );
  });

  it("asks the owner for a bounded directory page when the catalog opens", function () {
    const page = createPage(baseSnapshot());
    page.controller.handlers.navigate("catalog");
    const query = page.actions.find(
      (entry) => entry.action === "pi-catalog-query",
    );
    assert.ok(query, "opening the directory asks for its first page");
    assert.equal(query!.objectId, "catalog");
    assert.equal(
      page.actions.filter((entry) => entry.action === "pi-catalog-query")
        .length,
      1,
      "one bounded query, not a second one per render",
    );
  });

  it("ignores a directory page that answers another query", function () {
    const page = createPage(baseSnapshot());
    page.controller.handleMessage({
      data: {
        type: "zotero-agent-settings:snapshot",
        payload: withConnection(),
      },
    });
    page.controller.handlers.navigate("catalog");
    const stale = withConnection();
    stale.models = {
      ...stale.models,
      query: "something else",
      models: [],
      total: 0,
    };
    page.controller.handleMessage({
      data: { type: "zotero-agent-settings:snapshot", payload: stale },
    });
    assert.ok(
      !byTestId(page.root, "catalog-models")?.textContent?.includes("GPT X"),
      "a page bound to another query is not shown",
    );
    const current = withConnection();
    current.models = { ...current.models, query: "" };
    page.controller.handleMessage({
      data: { type: "zotero-agent-settings:snapshot", payload: current },
    });
    assert.ok(
      byTestId(page.root, "catalog-models")?.textContent?.includes("GPT X"),
      "the page that answers the current query is shown",
    );
  });

  it("keeps failed MCP input mounted while cancellation asks for a decision", function () {
    const page = createPage(baseSnapshot());
    page.controller.handlers.navigate("mcp");
    page.controller.handlers.addMcpSource();
    page.controller.handlers.patchMcpDraft({
      label: "Draft",
      address: "https://example.test/mcp",
    });
    page.controller.handlers.saveMcpDraft();
    const save = page.actions.find(
      (entry) => entry.action === "pi-mcp-upsert-source",
    )!;
    page.settle(save, false, "settings_action_failed");
    const input = byTestId(page.root, "mcp-editor-label");
    page.controller.handlers.cancelDialog();
    assert.ok(byTestId(page.root, "leave-dialog"));
    assert.strictEqual(byTestId(page.root, "mcp-editor-label"), input);
    page.controller.handlers.resolveLeave("continue");
    assert.strictEqual(byTestId(page.root, "mcp-editor-label"), input);
  });

  it("answers the host close guard with its own request id", function () {
    const page = createPage(baseSnapshot());
    page.controller.handleMessage({
      data: {
        type: "zotero-agent-settings:request-close",
        payload: { requestId: "close-1" },
      },
    });
    const answer = page.actions.find(
      (entry) => entry.action === "close-window",
    );
    assert.ok(answer, "a clean window answers immediately");
    assert.equal(answer!.payload.closeRequestId, "close-1");
    assert.equal(answer!.payload.decision, "discard", "nothing to lose");
  });

  it("keeps one card's test result off another card's DOM", function () {
    const page = createPage(withConnection());
    page.controller.handlers.navigate("connections");
    const regions = { other: byTestId(page.root, "card-card-2")! };
    const cardBefore = captureRegionSubtrees(regions);
    click(page.root, "test-card-1");
    const dialog = page.actions.length;
    assert.ok(dialog >= 0);
    click(page.root, "test-send");
    const test = page.actions.find(
      (entry) => entry.action === "pi-test-connection",
    );
    assert.ok(test, "a per-model test is sent");
    assert.equal(test!.objectId, "card-1", "the card owns its own request");
    assert.equal(test!.payload.configurationId, "card-1");
    page.settle(test!);
    assertRegionSubtreesPreserved(regions, cardBefore);
  });

  it("assigns a card purpose on the card itself and clears it by clicking again", function () {
    const page = createPage(withConnection());
    page.controller.handlers.navigate("connections");
    click(page.root, "purpose-card-2-auxiliary");
    const assign = page.actions.find(
      (entry) => entry.action === "pi-set-defaults",
    );
    assert.ok(assign);
    assert.equal(assign!.objectId, "card-2");
    assert.equal(assign!.payload.purpose, "auxiliary");
    assert.equal(assign!.payload.configurationId, "card-2");
    page.settle(assign!);
    // The owner republishes the saved purpose; clicking it again clears it
    // rather than choosing some other card.
    const updated = withConnection();
    updated.state.defaults.auxiliary = { configurationId: "card-2" };
    page.controller.handleMessage({
      data: { type: "zotero-agent-settings:snapshot", payload: updated },
    });
    click(page.root, "purpose-card-2-auxiliary");
    const clear = page.actions.filter(
      (entry) => entry.action === "pi-set-defaults",
    )[1];
    assert.ok(clear, "clicking an assigned purpose sends a change");
    assert.equal(
      clear!.payload.configurationId,
      undefined,
      "an assigned purpose is cleared, never replaced",
    );
  });

  it("previews a removal effect before removing a model", function () {
    const page = createPage(withConnection());
    page.controller.handlers.navigate("connections");
    click(page.root, "remove-card-1");
    assert.ok(
      byTestId(page.root, "confirm-effects"),
      "the effect is shown first",
    );
    assert.ok(
      (byTestId(page.root, "confirm-effects")!.textContent || "").length > 0,
      "the confirmation lists what changes",
    );
    click(page.root, "confirm-accept");
    const remove = page.actions.find(
      (entry) => entry.action === "pi-remove-model",
    );
    assert.ok(remove);
    assert.equal(remove!.objectId, "card-1", "the card id is the object key");
  });

  it("shows why an unsupported provider cannot be added", function () {
    const page = createPage(baseSnapshot());
    page.controller.handlers.navigate("catalog");
    assert.ok(
      byTestId(page.root, "catalog-add-provider") === null ||
        byTestId(page.root, "catalog-provider"),
      "the directory lists providers",
    );
    const rows = page.root.querySelectorAll('[data-testid^="catalog-models"]');
    assert.ok(rows.length > 0, "catalog models render");
    assert.ok(
      (page.root.textContent || "").includes("Copilot X"),
      "the unsupported row stays visible with its reason",
    );
  });

  it("keeps the three maintenance sections folded and reports failure in place", async function () {
    const page = createPage(baseSnapshot());
    page.controller.handlers.navigate("catalog");
    for (const id of ["directory", "overlay", "diagnostics"]) {
      const section = byTestId(page.root, "maintenance-" + id);
      assert.ok(section, "section " + id);
      assert.equal(
        section!.tagName.toLowerCase(),
        "details",
        "initially folded",
      );
    }
    click(page.root, "maintenance-directory-refresh");
    const refresh = page.actions.find(
      (entry) => entry.action === "pi-catalog-refresh-public",
    );
    assert.ok(refresh);
    page.settle(refresh!, false, "provider_network_error");
    assert.ok(
      byTestId(page.root, "maintenance-feedback-directory"),
      "the section that owns the operation reports the failure",
    );
    assert.equal(
      byTestId(page.root, "maintenance-feedback-overlay"),
      null,
      "another section does not report it",
    );
    await flush();
  });

  it("never refills a saved MCP secret and tests a source without enabling it", function () {
    const snapshot = baseSnapshot();
    snapshot.mcpSources = [
      {
        id: "mcp-1",
        label: "Research tools",
        transport: "http",
        url: "https://tools.example.test/mcp",
        enabled: false,
        authentication: { kind: "bearer", field: "Authorization" },
        credentialSlots: { Authorization: "cred-mcp-1" },
      },
    ];
    snapshot.mcpCredentials = [
      {
        id: "cred-mcp-1",
        label: "MCP token",
        kind: "mcp-secret",
        namespace: "mcp-source",
        masked: "…abcd",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    ];
    snapshot.mcpTestIdentity = { "mcp-1": "identity-1" };
    const page = createPage(snapshot);
    page.controller.handlers.navigate("mcp");
    assert.ok(
      !(page.root.textContent || "").includes("abcd"),
      "a saved secret never appears in the page",
    );
    click(page.root, "mcp-test-mcp-1");
    click(page.root, "test-send");
    const test = page.actions.find(
      (entry) => entry.action === "pi-mcp-test-source",
    );
    assert.ok(test, "an optional source test is sent");
    page.settle(test!);
    const enable = page.root.querySelector<HTMLInputElement>(
      '[data-testid="mcp-source-mcp-1"] input[type="checkbox"]',
    );
    assert.equal(enable?.checked, false, "testing does not enable the source");
  });

  it("drives a provider menu with the keyboard and keeps an unavailable entry unselectable", async function () {
    const page = createPage(baseSnapshot());
    page.controller.handlers.navigate("catalog");
    const trigger = byTestId(page.root, "catalog-provider")!.querySelector(
      "button",
    ) as HTMLButtonElement;
    trigger.click();
    await flush();
    const listbox = page.root.querySelector<HTMLElement>('[role="listbox"]');
    assert.ok(listbox, "the menu opens for mouse and keyboard alike");
    const openai = byTestId(page.root, "catalog-provider-option-openai");
    assert.ok(openai, "the current provider is listed");
    // ArrowDown moves to the next entry and Enter applies it.
    openai!.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    await flush();
    listbox!.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await flush();
    // The keyboard choice is the newest directory query; the page also asked
    // for its first page when it opened.
    const queries = page.actions.filter(
      (entry) => entry.action === "pi-catalog-query",
    );
    const query = queries[queries.length - 1];
    assert.ok(query, "a keyboard selection queries the directory");
    assert.equal(
      query!.payload.provider,
      "openai",
      "Enter applies the highlighted entry",
    );
    // The unavailable provider is offered with its reason and cannot be chosen.
    trigger.click();
    await flush();
    const unavailable = byTestId(
      page.root,
      "catalog-provider-option-github-copilot",
    ) as HTMLButtonElement;
    assert.ok(unavailable, "an unavailable provider is still listed");
    assert.equal(
      unavailable.disabled,
      true,
      "an entry with no admitted adapter cannot be selected",
    );
    assert.equal(unavailable.getAttribute("aria-disabled"), "true");
    // Escape closes the menu without changing anything.
    page.root
      .querySelector<HTMLElement>('[role="listbox"]')!
      .dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    await flush();
    // The disabled entry is skipped: with "openai" now selected, an arrow wraps
    // past the unavailable provider to the first entry.
    trigger.click();
    await flush();
    byTestId(page.root, "catalog-provider-option-openai")!.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    await flush();
    page.root
      .querySelector<HTMLElement>('[role="listbox"]')!
      .dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    await flush();
    assert.equal(
      page.actions.filter((entry) => entry.action === "pi-catalog-query")
        .length,
      3,
      "the wrap lands on the first entry, not on the unavailable one",
    );
    trigger.click();
    await flush();
    const menu = page.root.querySelector<HTMLElement>('[role="listbox"]')!;
    menu.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await flush();
    assert.equal(
      page.root.querySelector('[role="listbox"]'),
      null,
      "Escape closes the menu",
    );
  });

  it("completes a login once and leaves that account's refresh to the owner", function () {
    const page = createPage(withConnection());
    page.controller.handlers.startAddConnection("chatgpt");
    page.controller.handlers.connectAccount("conn-2", "reg-1", false);
    const connect = page.actions.find(
      (entry) => entry.action === "pi-chatgpt-connect",
    );
    assert.ok(connect, "one browser authorization is requested");
    page.settle(
      {
        action: "pi-chatgpt-connect",
        requestId: connect!.requestId,
        objectId: connect!.objectId,
        payload: {},
        // the owner answers a completed login with the registration it created
      } as never,
      true,
      undefined,
    );
    // The completed attempt must not open a second browser authorization.
    assert.equal(
      page.actions.filter((entry) => entry.action === "pi-chatgpt-connect")
        .length,
      1,
      "a settled login is never retried",
    );
    // The owner that completed the sign-in already refreshes the models it
    // discovered. The page queues no refresh of its own, so the account's
    // facts are fetched once per login instead of twice.
    assert.equal(
      page.actions.filter(
        (entry) => entry.action === "pi-chatgpt-refresh-models",
      ).length,
      0,
      "a completed login does not ask for the same account twice",
    );
  });

  it("refreshes an account's models when the user asks for it", function () {
    const page = createPage(withConnection());
    page.controller.handlers.navigate("connections");
    page.controller.handlers.selectConnection("conn-2");
    click(page.root, "refresh-conn-2");
    const refresh = page.actions.find(
      (entry) => entry.action === "pi-chatgpt-refresh-models",
    );
    assert.ok(refresh, "an explicit refresh is still the user's to make");
    assert.equal(
      refresh!.objectId,
      "reg-1",
      "the refresh is keyed by the registration, so two connections on one account share it",
    );
  });

  it("keeps the model picker open until the owner adopts the model", async function () {
    const page = createPage(withConnection());
    page.controller.handlers.navigate("connections");
    page.controller.handlers.openModelPicker("conn-1");
    const pickerQuery = page.actions.find(
      (entry) => entry.action === "pi-catalog-query",
    );
    assert.ok(
      pickerQuery,
      "the picker asks the owner for that provider's models",
    );
    assert.equal(
      pickerQuery!.payload.provider,
      "openai",
      "the picker is scoped to its own connection's provider",
    );
    page.controller.handlers.addModelFromPicker("gpt-x");
    const add = page.actions.find(
      (entry) => entry.action === "pi-upsert-model",
    );
    assert.ok(add, "the add is sent");
    assert.ok(
      byTestId(page.root, "model-picker"),
      "the picker stays open until the result settles",
    );
    page.settle(add!);
    assert.equal(
      byTestId(page.root, "model-picker"),
      null,
      "a settled add closes the picker",
    );
    await flush();
  });

  it("keeps a failed model add in place so it can be retried", async function () {
    const page = createPage(withConnection());
    page.controller.handlers.navigate("connections");
    page.controller.handlers.openModelPicker("conn-1");
    page.controller.handlers.addModelFromPicker("gpt-x");
    const add = page.actions.find(
      (entry) => entry.action === "pi-upsert-model",
    );
    assert.ok(add, "the add is sent");
    page.settle(add!, false, "persistence_failed");
    assert.ok(
      byTestId(page.root, "model-picker"),
      "a failed add keeps the list open",
    );
    assert.ok(
      byTestId(page.root, "model-picker-failure"),
      "the failure is reported in the picker itself",
    );
    assert.ok(
      !byTestId(page.root, "model-card-added"),
      "no card is shown before the owner adopted the model",
    );
    page.controller.handlers.addModelFromPicker("gpt-y");
    const retry = page.actions.filter(
      (entry) => entry.action === "pi-upsert-model",
    )[1];
    assert.ok(retry, "the same list can be retried");
    await flush();
  });

  it("reorders search sources by saving the whole saved order", function () {
    const snapshot = baseSnapshot();
    snapshot.webSources = [
      {
        id: "exa",
        kind: "exa-mcp",
        label: "Exa",
        enabled: true,
        billable: false,
        configured: true,
        bindingIdentity: "exa-1",
      },
      {
        id: "tavily",
        kind: "tavily-mcp",
        label: "Tavily",
        enabled: false,
        billable: true,
        configured: false,
        missing: ["credentialId"],
        bindingIdentity: "tavily-1",
      },
    ];
    const page = createPage(snapshot);
    page.controller.handlers.navigate("search");
    click(page.root, "search-down-exa");
    const save = page.actions.find(
      (entry) => entry.action === "pi-web-save-sources",
    );
    assert.ok(save);
    const sources = save!.payload.sources as { id: string }[];
    assert.deepEqual(
      sources.map((entry) => entry.id),
      ["tavily", "exa"],
      "the saved order is the payload order",
    );
    assert.equal(
      sources[1].enabled,
      true,
      "a move does not change any source's enabled state",
    );
  });

  it("saves a keyless custom connection without a secret and with the local approval it asked for", async function () {
    const page = createPage(baseSnapshot());
    page.controller.handlers.startAddConnection("custom");
    typeAndCommit(page.root, "connection-editor-label", "Local gateway");
    typeAndCommit(
      page.root,
      "connection-editor-endpoint",
      "http://127.0.0.1:8730/v1",
    );
    const approve = byTestId(
      page.root,
      "connection-editor-local-approve",
    ) as HTMLInputElement;
    assert.ok(approve, "a local endpoint asks for the approval first");
    approve.click();
    const keyless = byTestId(
      page.root,
      "connection-editor-keyless",
    ) as HTMLInputElement;
    assert.ok(keyless, "a custom connection can be keyless");
    assert.equal(
      keyless.checked,
      true,
      "a custom endpoint offers keyless access by default",
    );
    // A keyless connection has no authorization to send, so the interface is
    // the one API that admits it. The form offers that API by its real name,
    // because that name is what the executor reads.
    const dialect = byTestId(page.root, "connection-editor-dialect")!;
    assert.ok(dialect, "a custom connection states which interface it speaks");
    assert.equal(
      dialect.querySelectorAll('[role="option"]').length > 0,
      false,
      "the interface menu is closed until it is opened",
    );
    (dialect.querySelector("button") as HTMLButtonElement).click();
    await flush();
    const completions = byTestId(
      page.root,
      "connection-editor-dialect-option-openai-completions",
    );
    assert.ok(
      completions,
      "a keyless connection is offered the API that takes no key",
    );
    assert.equal(
      byTestId(page.root, "connection-editor-dialect-option-openai-responses"),
      null,
      "an API that requires authorization is not offered for a keyless connection",
    );
    completions!.click();
    await flush();
    click(page.root, "connection-editor-save");
    const save = page.actions.find(
      (entry) => entry.action === "pi-upsert-configuration",
    );
    assert.ok(save, "the connection is saved");
    const connection = save!.payload.connection as Record<string, unknown>;
    assert.equal(
      connection.authVariant,
      "none",
      "the transport fact is the keyless variant, not the form kind",
    );
    assert.equal(
      connection.api,
      "openai-completions",
      "the saved API is the executor's own name, not a form-local shorthand",
    );
    assert.equal(connection.requiresLocalNetwork, true);
    assert.equal(
      connection.baseUrl,
      "http://127.0.0.1:8730/v1",
      "the address the user committed is the address that is saved",
    );
    assert.equal(
      connection.acceptLocalNetwork,
      true,
      "the local approval the user gave travels with the save",
    );
    assert.equal(
      save!.payload.secret,
      undefined,
      "a keyless connection submits no secret",
    );
  });

  it("picks a provider in the connection editor with the keyboard", async function () {
    const page = createPage(baseSnapshot());
    page.controller.handlers.startAddConnection("api-key");
    typeAndCommit(page.root, "connection-editor-label", "Anthropic service");
    const trigger = byTestId(
      page.root,
      "connection-editor-provider",
    )!.querySelector("button") as HTMLButtonElement;
    trigger.click();
    await flush();
    const first = byTestId(
      page.root,
      "connection-editor-provider-option-openai",
    );
    assert.ok(first, "the menu lists the current provider");
    first!.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    await flush();
    page.root
      .querySelector<HTMLElement>('[role="listbox"]')!
      .dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    await flush();
    type(page.root, "connection-editor-secret", "sk-ant-value");
    click(page.root, "connection-editor-save");
    const save = page.actions.find(
      (entry) => entry.action === "pi-upsert-configuration",
    );
    assert.ok(save, "the connection is saved");
    assert.equal(
      (save!.payload.connection as Record<string, unknown>).provider,
      "anthropic",
      "Enter applies the highlighted provider",
    );
  });

  it("offers a model picker for every connection the owner calls ready", function () {
    const pickerSnapshot = withConnection();
    pickerSnapshot.state.connections.push({
      id: "conn-3",
      kind: "custom",
      label: "Local gateway",
      provider: "openai",
      authVariant: "none",
      enabled: true,
      baseUrl: "http://127.0.0.1:8730/v1",
      api: "openai-completions",
      availability: { code: "ready", ready: true },
      discovery: { status: "ready" },
      modelCount: 0,
    });
    pickerSnapshot.state.connections.push({
      id: "conn-4",
      kind: "custom",
      label: "Broken gateway",
      provider: "openai",
      authVariant: "api-key",
      enabled: true,
      baseUrl: "https://models.example.test/v1",
      api: "openai-responses",
      availability: { code: "provider_unreachable", ready: false },
      discovery: { status: "failed" },
      modelCount: 0,
    });
    const pickerPage = createPage(pickerSnapshot);
    pickerPage.controller.handlers.navigate("connections");
    // The form a connection was created with says nothing about whether it can
    // list models: a keyless custom endpoint lists its provider's directory
    // exactly like a keyed one.
    for (const id of ["conn-1", "conn-3"]) {
      pickerPage.controller.handlers.selectConnection(id);
      assert.ok(
        byTestId(pickerPage.root, "add-model-" + id),
        "a ready connection offers its model picker",
      );
    }
    // A connection the owner has not admitted offers nothing rather than a
    // picker that would fail.
    pickerPage.controller.handlers.selectConnection("conn-4");
    assert.equal(
      byTestId(pickerPage.root, "add-model-conn-4"),
      null,
      "an unavailable connection offers no picker",
    );
    assert.equal(
      byTestId(pickerPage.root, "add-model-conn-2"),
      null,
      "an account without its plan permission offers no picker",
    );
  });

  it("keeps a committed service address, its node and its focus through the commit", async function () {
    const page = createPage(baseSnapshot());
    page.controller.handlers.startAddConnection("custom");
    typeAndCommit(page.root, "connection-editor-label", "Remote gateway");
    const address = byTestId(
      page.root,
      "connection-editor-endpoint",
    ) as HTMLInputElement;
    assert.ok(address, "the address field is on a custom connection");
    // One keystroke event carries the whole value, exactly as a paste or a
    // fast typist does. If the commit ran before the draft was patched, the
    // re-render would put the previous value back and the page would then read
    // that restored value, silently losing the address.
    address.focus();
    address.value = "https://models.example.test/v1";
    address.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();
    commitField(page.root, "connection-editor-endpoint");
    await flush();
    const after = byTestId(
      page.root,
      "connection-editor-endpoint",
    ) as HTMLInputElement;
    assert.strictEqual(
      after,
      address,
      "the commit re-renders the same input, so focus and caret survive it",
    );
    assert.equal(
      after.value,
      "https://models.example.test/v1",
      "the committed address is still the one on screen",
    );
    assert.equal(
      document.activeElement,
      after,
      "committing a field does not move focus out of it",
    );
    click(page.root, "connection-editor-save");
    const save = page.actions.find(
      (entry) => entry.action === "pi-upsert-configuration",
    );
    assert.ok(save, "the connection can be saved from the committed address");
    assert.equal(
      (save!.payload.connection as Record<string, unknown>).baseUrl,
      "https://models.example.test/v1",
      "the draft holds the committed address, not the one it started with",
    );
  });

  it("saves an edited MCP source with its ordered argv and empty secret slots", function () {
    const snapshot = baseSnapshot();
    snapshot.mcpSources = [
      {
        id: "mcp-1",
        label: "Local tools",
        transport: "stdio",
        executable: "/opt/tools/server",
        argv: ["--stdio", "--quiet"],
        cwd: "/opt/tools",
        enabled: true,
        authentication: { kind: "none" },
        credentialSlots: { MCP_TOKEN: "cred-mcp-1" },
      },
    ];
    snapshot.mcpCredentials = [
      {
        id: "cred-mcp-1",
        label: "Local token",
        kind: "mcp-secret",
        namespace: "mcp-source",
        masked: "…wxyz",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    ];
    const page = createPage(snapshot);
    page.controller.handlers.navigate("mcp");
    page.controller.handlers.editMcpSource("mcp-1");
    assert.equal(
      (byTestId(page.root, "mcp-editor-arg-0") as HTMLInputElement).value,
      "--stdio",
      "the saved argv is shown in order",
    );
    click(page.root, "mcp-editor-save");
    const save = page.actions.find(
      (entry) => entry.action === "pi-mcp-upsert-source",
    );
    assert.ok(save, "the source is saved");
    const source = save!.payload.source as Record<string, unknown>;
    assert.deepEqual(source.argv, ["--stdio", "--quiet"]);
    assert.equal(source.executable, "/opt/tools/server");
    assert.deepEqual(
      source.bindings,
      [{ field: "MCP_TOKEN" }],
      "a saved slot is resubmitted as an empty row, never as a value",
    );
  });

  it("keeps a failed MCP source save editable and never refills its secret", function () {
    const snapshot = baseSnapshot();
    snapshot.mcpSources = [
      {
        id: "mcp-1",
        label: "Tools",
        transport: "http",
        url: "https://tools.example.test/mcp",
        enabled: true,
        authentication: { kind: "bearer", field: "Authorization" },
        credentialSlots: { Authorization: "cred-mcp-1" },
      },
    ];
    const page = createPage(snapshot);
    page.controller.handlers.navigate("mcp");
    page.controller.handlers.editMcpSource("mcp-1");
    assert.equal(
      (byTestId(page.root, "mcp-editor-secret") as HTMLInputElement).value,
      "",
      "a saved secret is never refilled into the control",
    );
    type(page.root, "mcp-editor-label", "Renamed tools");
    click(page.root, "mcp-editor-save");
    const save = page.actions.find(
      (entry) => entry.action === "pi-mcp-upsert-source",
    );
    assert.ok(save);
    page.settle(save!, false, "persistence_failed");
    assert.ok(byTestId(page.root, "mcp-editor"), "the editor stays open");
    assert.ok(
      byTestId(page.root, "mcp-editor-failure"),
      "the failure is reported where it happened",
    );
    assert.equal(
      (byTestId(page.root, "mcp-editor-label") as HTMLInputElement).value,
      "Renamed tools",
      "the draft survives so the user can retry",
    );
  });

  it("carries a source's authentication identity into the whole-document edit and adopts the preview's revision", function () {
    const snapshot = baseSnapshot();
    snapshot.mcpSources = [
      {
        id: "mcp-1",
        label: "Tools",
        transport: "http",
        url: "https://tools.example.test/mcp",
        enabled: true,
        authentication: { kind: "bearer", field: "Authorization" },
        credentialSlots: { Authorization: "cred-mcp-1" },
      },
    ];
    const page = createPage(snapshot);
    page.controller.handlers.navigate("mcp");
    page.controller.handlers.openMcpJson("edit");
    const document_ = (byTestId(page.root, "mcp-json-text") as
      | HTMLTextAreaElement
      | undefined)!.value;
    const parsed = JSON.parse(document_) as {
      mcpServers: Record<
        string,
        { authentication?: unknown; headers?: unknown }
      >;
    };
    const entry = parsed.mcpServers["mcp-1"];
    assert.deepEqual(
      entry.authentication,
      { kind: "bearer", field: "Authorization" },
      "a full-document save keeps whether the slot is a bearer or a key",
    );
    assert.deepEqual(
      entry.headers,
      { Authorization: "" },
      "the slot itself stays empty",
    );
    type(page.root, "mcp-json-text", document_.replace("Tools", "Renamed"));
    const preview = page.actions.find(
      (entry) => entry.action === "pi-mcp-preview-import",
    );
    assert.ok(preview, "an edited document is previewed before it is adopted");
    page.settle(preview!, true, undefined, {
      preview: {
        revision: "rev-7",
        added: 0,
        changed: 1,
        removed: 0,
        conflicts: [],
        grants: [],
        secretSlots: [{ sourceId: "mcp-1", field: "Authorization" }],
        problems: [],
      },
    });
    click(page.root, "mcp-json-save");
    const adopt = page.actions.find(
      (entry) => entry.action === "pi-mcp-import",
    );
    assert.ok(adopt, "the document is adopted");
    assert.equal(
      adopt!.payload.expectedRevision,
      "rev-7",
      "the revision the preview was prepared against is the concurrency basis",
    );
  });
});
