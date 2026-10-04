import { assert } from "chai";
import { createZoteroAgentSettingsSession } from "../../src/modules/workflow/settings/zoteroAgentSettings";
import { createZoteroAgentSettingsOwner } from "../../src/modules/workflow/settings/zoteroAgentSettingsPiAccess";
import { getPref, setPref } from "../../src/utils/prefs";
import {
  applyPiMcpSourceChange,
  loadPiMcpSourceRegistry,
} from "../../src/modules/piMcpSourceRegistry";

describe("Zotero Agent settings host admission and lifetime", function () {
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
