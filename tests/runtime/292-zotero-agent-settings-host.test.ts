import { assert } from "chai";
import { createZoteroAgentSettingsSession } from "../../src/modules/workflow/settings/zoteroAgentSettings";
import { createZoteroAgentSettingsOwner } from "../../src/modules/workflow/settings/zoteroAgentSettingsPiAccess";
import { getPref, setPref } from "../../src/utils/prefs";
import {
  installedPiSettings,
  configureInstalledPiBackend,
} from "../helpers/piInstalledPluginDriver";
import { loadPiProviderConfigurationState } from "../../src/modules/piProviderConfiguration";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import {
  applyPiMcpSourceChange,
  loadPiMcpSourceRegistry,
} from "../../src/modules/piMcpSourceRegistry";

describe("Zotero Agent settings host admission and lifetime", function () {
  it("prepares a compatible fixture document before opening settings in an empty profile", async function () {
    const prior = getPref("piProviderConfigurationJson");
    const priorPlugin = (Zotero as any).ZoteroSkills;
    setPref("piProviderConfigurationJson", "");
    let compatible = false;
    (Zotero as any).ZoteroSkills = {
      data: { initialized: true },
      hooks: {
        onPrefsEvent: async () => {
          const state = loadPiProviderConfigurationState();
          assert.isNotEmpty(state.overlayPath);
          assert.isEmpty(state.connections);
          assert.isEmpty(state.configurations);
          compatible = true;
          throw new Error("fixture_open_stopped");
        },
      },
    };
    try {
      try {
        await configureInstalledPiBackend(
          "http://127.0.0.1:8730/v1",
          getRuntimePersistencePaths().tmpDir,
        );
      } catch {
        // Stop at the public settings hook; no fake provider is dispatched.
      }
      assert.isTrue(compatible);
    } finally {
      setPref("piProviderConfigurationJson", prior);
      (Zotero as any).ZoteroSkills = priorPlugin;
    }
  });
  it("drives installed settings with correlated results, current snapshots and the close handshake", async function () {
    const runtime = globalThis as any;
    const originalServices = runtime.Services;
    const originalPlugin = (Zotero as any).ZoteroSkills;
    class WireEvent extends Event {
      data: unknown;
      source: unknown;
      constructor(type: string, init: { data: unknown; source: unknown }) {
        super(type);
        this.data = init.data;
        this.source = init.source;
      }
    }
    const page = Object.assign(new EventTarget(), {
      document: {
        readyState: "complete",
        documentURI:
          "chrome://fixture/content/dashboard/zotero-agent-settings.html",
      },
    });
    const dialog = Object.assign(new EventTarget(), {
      closed: false,
      MessageEvent: WireEvent,
      document: {
        getElementById: () => ({}),
        querySelector: () => ({ contentWindow: page }),
      },
      close() {
        page.dispatchEvent(
          new WireEvent("message", {
            source: dialog,
            data: {
              type: "zotero-agent-settings:request-close",
              payload: { requestId: "close-fixture" },
            },
          }),
        );
      },
    });
    let value = 0;
    const session = createZoteroAgentSettingsSession({
      frame: () => page,
      snapshot: async () => ({
        state: { connections: [], configurations: [], value },
      }),
      post: (data) =>
        page.dispatchEvent(new WireEvent("message", { source: dialog, data })),
      async dispatch(request) {
        if (request.action === "close-window") {
          assert.equal(request.payload.closeRequestId, "close-fixture");
          assert.equal(request.payload.decision, "discard");
          dialog.closed = true;
        } else {
          page.dispatchEvent(
            new WireEvent("message", {
              source: dialog,
              data: {
                type: "zotero-agent-settings:action-result",
                payload: {
                  action: request.action,
                  requestId: "previous-attempt",
                  objectId: request.objectId,
                  ok: false,
                },
              },
            }),
          );
          value++;
        }
        return { ok: true };
      },
    });
    dialog.addEventListener(
      "message",
      (event) =>
        void session.receive(
          event as unknown as { source: unknown; data: unknown },
        ),
    );
    runtime.Services = {
      wm: {
        getEnumerator: () => {
          let visited = false;
          return {
            hasMoreElements: () => !visited,
            getNext: () => {
              visited = true;
              return dialog;
            },
          };
        },
      },
    };
    (Zotero as any).ZoteroSkills = {
      data: { initialized: true },
      hooks: {
        onPrefsEvent: async (action: string) =>
          assert.equal(action, "openZoteroAgentSettings"),
      },
    };
    try {
      const driver = await installedPiSettings();
      await driver.action("pi-catalog-set-auto-update", "catalog", {
        enabled: false,
      });
      assert.equal((driver.snapshot().state as any).value, 1);
      await driver.action("pi-catalog-set-auto-update", "catalog", {
        enabled: true,
      });
      assert.equal((driver.snapshot().state as any).value, 2);
      await driver.close();
      assert.isTrue(dialog.closed);
    } finally {
      session.dispose();
      runtime.Services = originalServices;
      (Zotero as any).ZoteroSkills = originalPlugin;
    }
  });
  it("rejects a full MCP save when its reviewed registry changed", async function () {
    const prior = getPref("piMcpSourceRegistryJson");
    setPref("piMcpSourceRegistryJson", "");
    const owner = await createZoteroAgentSettingsOwner();
    const signal = new AbortController().signal;
    try {
      const json = JSON.stringify({
        mcpServers: { fixture: { url: "https://example.test/mcp" } },
      });
      const preview = await owner.dispatch(
        {
          action: "pi-mcp-preview-import",
          requestId: "preview",
          objectId: "mcp-registry",
          payload: { json, mode: "edit" },
        },
        signal,
      );
      const revision = (preview.result as { preview: { revision?: string } })
        .preview.revision;
      assert.isString(revision);
      await applyPiMcpSourceChange({
        sources: [
          {
            id: "concurrent",
            label: "Concurrent",
            transport: "http",
            url: "https://example.test/other",
            enabled: true,
            authentication: { kind: "none" },
            bindings: [],
          },
        ],
      });
      let rejected = false;
      try {
        await owner.dispatch(
          {
            action: "pi-mcp-import",
            requestId: "save",
            objectId: "mcp-registry",
            payload: { json, mode: "edit", expectedRevision: revision },
          },
          signal,
        );
      } catch {
        rejected = true;
      }
      assert.isTrue(rejected);
      assert.deepEqual(
        loadPiMcpSourceRegistry().sources.map((source) => source.id),
        ["concurrent"],
      );
    } finally {
      owner.dispose();
      setPref("piMcpSourceRegistryJson", prior);
    }
  });
  it("saves connections and cards independently and refuses an unusable default", async function () {
    const prior = getPref("piProviderConfigurationJson");
    setPref("piProviderConfigurationJson", "");
    const owner = await createZoteroAgentSettingsOwner();
    const signal = new AbortController().signal;
    try {
      const saved = await owner.dispatch(
        {
          action: "pi-upsert-configuration",
          requestId: "save",
          objectId: "host-fixture",
          payload: {
            connection: {
              id: "host-fixture",
              kind: "custom",
              label: "Fixture",
              provider: "openai",
              authVariant: "none",
              baseUrl: "http://127.0.0.1:8730/v1",
              api: "openai-completions",
              acceptLocalNetwork: true,
              enabled: true,
            },
          },
        },
        signal,
      );
      assert.isTrue(saved.ok);
      const initial = await owner.snapshot();
      assert.lengthOf(initial.state.connections, 1);
      assert.equal(initial.state.connections[0].kind, "custom");
      assert.isTrue(initial.state.connections[0].localNetworkApproved);
      assert.lengthOf(initial.state.configurations, 0);
      assert.deepEqual(initial.state.defaults, {});
      await owner.dispatch(
        {
          action: "pi-catalog-query",
          requestId: "query",
          objectId: "host-fixture",
          payload: { provider: "openai", query: "gpt" },
        },
        signal,
      );
      const queried = await owner.snapshot();
      assert.isAtMost(queried.models.models.length, 50);
      const document = JSON.parse(
        String(getPref("piProviderConfigurationJson")),
      );
      document.configurations.push({
        id: "host-fixture",
        connectionId: "host-fixture",
        modelId: "original-fixture-model",
        enabled: true,
        reasoning: "off",
      });
      setPref("piProviderConfigurationJson", JSON.stringify(document));
      const added = await owner.dispatch(
        {
          action: "pi-upsert-model",
          requestId: "add",
          objectId: "host-fixture",
          payload: {
            modelId: "missing-fixture-model",
            connectionId: "host-fixture",
            enabled: true,
            reasoning: "off",
          },
        },
        signal,
      );
      assert.isTrue(added.ok);
      const withCard = await owner.snapshot();
      assert.lengthOf(withCard.state.configurations, 2);
      assert.equal(
        withCard.state.configurations.find(
          (entry) => entry.id === "host-fixture",
        )?.modelId,
        "original-fixture-model",
        "adding names a connection and preserves a card with the same ID",
      );
      assert.deepEqual(withCard.state.defaults, {});
      const card = withCard.state.configurations.find(
        (entry) => entry.id !== "host-fixture",
      )!;
      let rejected = false;
      try {
        await owner.dispatch(
          {
            action: "pi-set-defaults",
            requestId: "default",
            objectId: card.id,
            payload: { purpose: "global", configurationId: card.id },
          },
          signal,
        );
      } catch {
        rejected = true;
      }
      assert.isTrue(rejected);
      assert.deepEqual((await owner.snapshot()).state.defaults, {});
    } finally {
      owner.dispose();
      setPref("piProviderConfigurationJson", prior);
    }
  });
  it("projects a public connection without treating its accepted public target as a custom endpoint", async function () {
    const prior = getPref("piProviderConfigurationJson");
    setPref("piProviderConfigurationJson", "");
    const owner = await createZoteroAgentSettingsOwner();
    try {
      await owner.dispatch(
        {
          action: "pi-upsert-configuration",
          requestId: "save-public",
          objectId: "public-fixture",
          payload: {
            connection: {
              id: "public-fixture",
              kind: "api-key",
              label: "Public",
              provider: "openai",
              authVariant: "api-key",
              enabled: true,
            },
          },
        },
        new AbortController().signal,
      );
      const snapshot = await owner.snapshot();
      assert.equal(snapshot.state.connections[0].kind, "api-key");
      assert.isUndefined(snapshot.state.connections[0].baseUrl);
      assert.lengthOf(snapshot.state.configurations, 0);
    } finally {
      owner.dispose();
      setPref("piProviderConfigurationJson", prior);
    }
  });
  it("admits only the actual frame and a complete request identity", async function () {
    const frame = {};
    const calls: string[] = [];
    const messages: unknown[] = [];
    const session = createZoteroAgentSettingsSession({
      frame: () => frame,
      post: (message) => messages.push(message),
      snapshot: async () => ({ connections: [] }),
      dispatch: async (request) => {
        calls.push(request.requestId);
        return { ok: true };
      },
    });
    const data = {
      type: "zotero-agent-settings:action",
      action: "pi-catalog-refresh-public",
      requestId: "public-1",
      objectId: "catalog",
      payload: {},
    };
    await session.receive({ source: {}, data });
    await session.receive({ source: frame, data: { ...data, requestId: "" } });
    await session.receive({
      source: frame,
      data: { ...data, action: "unregistered-action" },
    });
    await session.receive({ source: frame, data });
    assert.deepEqual(calls, ["public-1"]);
    assert.isAbove(messages.length, 0);
    session.dispose();
  });

  it("keeps submitted secrets out of structured failure feedback", async function () {
    const frame = {};
    const messages: any[] = [];
    const session = createZoteroAgentSettingsSession({
      frame: () => frame,
      post: (message) => messages.push(message),
      snapshot: async () => ({}),
      dispatch: async () => {
        throw new Error("private submitted key was rejected");
      },
    });
    await session.receive({
      source: frame,
      data: {
        type: "zotero-agent-settings:action",
        action: "pi-upsert-configuration",
        requestId: "save-1",
        objectId: "connection-1",
        payload: { secret: "private submitted key" },
      },
    });
    assert.equal(messages[0].payload.code, "settings_action_failed");
    assert.notInclude(JSON.stringify(messages), "private submitted key");
    session.dispose();
  });

  it("does not publish obsolete object results or results after closing", async function () {
    const frame = {};
    const messages: any[] = [];
    const pending: Array<(value: { ok: boolean }) => void> = [];
    const signals: AbortSignal[] = [];
    let released = 0;
    const session = createZoteroAgentSettingsSession({
      frame: () => frame,
      post: (message) => messages.push(message),
      snapshot: async () => ({}),
      subscribe: () => () => released++,
      dispatch: async (_, signal) => {
        signals.push(signal);
        return new Promise((resolve) => pending.push(resolve));
      },
    });
    const send = (requestId: string, objectId: string) =>
      session.receive({
        source: frame,
        data: {
          type: "zotero-agent-settings:action",
          action: "pi-web-test-source",
          requestId,
          objectId,
          payload: { id: objectId },
        },
      });
    const first = send("first", "exa");
    const second = send("second", "exa");
    pending[0]({ ok: true });
    await first;
    assert.isFalse(
      messages.some((message) => message.payload?.requestId === "first"),
    );
    pending[1]({ ok: true });
    await second;
    assert.isTrue(
      messages.some((message) => message.payload?.requestId === "second"),
    );
    const closing = send("closing", "tavily");
    session.dispose();
    assert.isTrue(signals[2].aborted);
    pending[2]({ ok: true });
    await closing;
    assert.isFalse(
      messages.some((message) => message.payload?.requestId === "closing"),
    );
    assert.equal(released, 1);
  });
});
