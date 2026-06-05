import { assert } from "chai";
import { readFileSync } from "node:fs";
import { config } from "../../package.json";
import type { BackendInstance } from "../../src/backends/types";
import { computeAcpBackendConfigFingerprint } from "../../src/modules/acpBackendProbe";
import {
  createAcpBackendFromPreset,
  listAcpBackendPresets,
  listBuiltinAcpBackends,
} from "../../src/modules/acpBackendPresets";
import {
  collectBackendsFromDialog,
  getBackendRowActionKindsForType,
  launchSkillRunnerManagementFromRow,
  persistAcpBackendProbeResultFromRow,
  persistBackendsConfig,
  refreshSkillRunnerModelCacheFromRow,
  resolveSkillRunnerManagementLaunchPayloadFromRow,
} from "../../src/modules/backendManager";
import {
  getSkillRunnerBackendHealthState,
  registerSkillRunnerBackendForHealthTracking,
  resetSkillRunnerBackendHealthRegistryForTests,
} from "../../src/modules/skillRunnerBackendHealthRegistry";

type FakeControl = {
  value?: string;
  getAttribute: (name: string) => string | null;
};

type FakeRow = {
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  querySelector: (selector: string) => Element | null;
  __controls?: Map<string, FakeControl>;
};

function makeTextControl(value: string): FakeControl {
  return {
    value,
    getAttribute: () => null,
  };
}

function makeChoiceControl(value: string): FakeControl {
  return {
    getAttribute: (name: string) => {
      if (name === "data-zs-choice-control") {
        return "1";
      }
      if (name === "data-zs-choice-value") {
        return value;
      }
      return null;
    },
  };
}

function makeRow(args: {
  type: string;
  internalId?: string;
  displayName: string;
  baseUrl?: string;
  authKind?: "none" | "bearer";
  authToken?: string;
  timeoutMs?: string;
  command?: string;
  argsText?: string;
  envText?: string;
  acp?: BackendInstance["acp"];
}): FakeRow {
  let internalId = String(args.internalId || "").trim();
  let acp = args.acp ? JSON.stringify(args.acp) : "";
  const controls = new Map<string, FakeControl>([
    ["displayName", makeTextControl(args.displayName)],
    ["baseUrl", makeTextControl(args.baseUrl || "")],
    ["authKind", makeChoiceControl(args.authKind || "none")],
    ["authToken", makeTextControl(args.authToken || "")],
    ["timeoutMs", makeTextControl(args.timeoutMs || "")],
    ["command", makeTextControl(args.command || "")],
    ["args", makeTextControl(args.argsText || "")],
    ["env", makeTextControl(args.envText || "")],
  ]);

  return {
    getAttribute: (name: string) => {
      if (name === "data-zs-backend-type") {
        return args.type;
      }
      if (name === "data-zs-backend-internal-id") {
        return internalId;
      }
      if (name === "data-zs-backend-acp") {
        return acp;
      }
      return null;
    },
    setAttribute: (name: string, value: string) => {
      if (name === "data-zs-backend-internal-id") {
        internalId = String(value || "").trim();
      }
      if (name === "data-zs-backend-acp") {
        acp = String(value || "").trim();
      }
    },
    querySelector: (selector: string) => {
      const match = selector.match(/\[data-zs-backend-field="([^"]+)"\]/);
      if (!match) {
        return null;
      }
      return (controls.get(match[1]) || null) as unknown as Element | null;
    },
    __controls: controls,
  };
}

function makeDoc(rows: FakeRow[]) {
  return {
    querySelectorAll: () => rows as unknown as NodeListOf<Element>,
  } as unknown as Document;
}

describe("backend manager risk regression", function () {
  let previousAddon: unknown;

  beforeEach(function () {
    const runtime = globalThis as { addon?: Record<string, unknown> };
    previousAddon = runtime.addon;
    runtime.addon = runtime.addon || {};
    runtime.addon.data = (runtime.addon.data as Record<string, unknown>) || {};
  });

  afterEach(function () {
    const runtime = globalThis as { addon?: unknown };
    runtime.addon = previousAddon;
    resetSkillRunnerBackendHealthRegistryForTests();
  });

  it("keeps backend manager actions outside the scroll region and guards dirty exits", function () {
    const source = readFileSync("src/modules/backendManager.ts", "utf8");
    assert.include(source, 'data-zs-backend-scroll-region", "1"');
    assert.include(source, 'data-zs-backend-action-bar", "1"');
    assert.include(source, "createBackendManagerDraftSignature");
    assert.include(source, "installBackendManagerBeforeUnloadPrompt");
    assert.include(source, "backend-manager-unsaved-exit-confirm");
    assert.notInclude(source, ".addButton(getString(\"backend-manager-save\"");
  });

  it("rejects duplicated backend internal ids during dialog collection", function () {
    const doc = makeDoc([
      makeRow({
        type: "skillrunner",
        internalId: "dup-id",
        displayName: "dup-a",
        baseUrl: "http://127.0.0.1:8030",
        authKind: "none",
        authToken: "",
        timeoutMs: "600000",
      }),
      makeRow({
        type: "generic-http",
        internalId: "dup-id",
        displayName: "dup-b",
        baseUrl: "http://127.0.0.1:8040",
        authKind: "none",
        authToken: "",
        timeoutMs: "600000",
      }),
    ]);

    let thrown: unknown = null;
    try {
      collectBackendsFromDialog(doc);
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    assert.match(String(thrown), /duplicate|重复/i);
  });

  it("generates new internal id for rows without internal id", function () {
    const doc = makeDoc([
      makeRow({
        type: "skillrunner",
        displayName: "SkillRunner Primary",
        baseUrl: "http://127.0.0.1:8030",
        authKind: "none",
        authToken: "",
        timeoutMs: "600000",
      }),
    ]);
    const collected = collectBackendsFromDialog(doc);
    assert.lengthOf(collected.backends, 1);
    assert.match(collected.backends[0].id, /^backend-/);
    assert.equal(collected.backends[0].displayName, "SkillRunner Primary");
  });

  it("allows empty backend profile list from dialog collection", function () {
    const doc = makeDoc([]);
    const collected = collectBackendsFromDialog(doc);
    assert.deepEqual(collected.backends, []);
  });

  it("exposes provider-specific backend row actions", function () {
    assert.deepEqual(getBackendRowActionKindsForType("skillrunner"), [
      "manage-ui",
      "refresh-model-cache",
      "remove",
    ]);
    assert.deepEqual(getBackendRowActionKindsForType("generic-http"), [
      "remove",
    ]);
    assert.deepEqual(getBackendRowActionKindsForType("acp"), [
      "refresh-acp-runtime-options",
      "remove",
    ]);
    assert.deepEqual(getBackendRowActionKindsForType(""), ["remove"]);
  });

  it("collects ACP backend command args and env without requiring http fields", function () {
    const doc = makeDoc([
      makeRow({
        type: "acp",
        internalId: "acp-custom",
        displayName: "Custom ACP",
        command: "node",
        argsText: "agent.js\n--acp",
        envText: "FOO=bar\nEMPTY=\nBAD_LINE",
      }),
    ]);

    const collected = collectBackendsFromDialog(doc);

    assert.lengthOf(collected.backends, 1);
    assert.deepEqual(collected.backends[0], {
      id: "acp-custom",
      displayName: "Custom ACP",
      type: "acp",
      baseUrl: "local://acp-custom",
      command: "node",
      args: ["agent.js", "--acp"],
      env: {
        FOO: "bar",
        EMPTY: "",
      },
    });
  });

  it("builds common ACP preset backend profiles with stable command metadata", function () {
    const presets = listAcpBackendPresets();
    assert.sameMembers(
      presets.map((preset) => preset.id),
      ["opencode", "codex", "claude-code", "gemini-cli", "hermes", "qwen-code"],
    );

    const codex = createAcpBackendFromPreset("codex");
    assert.deepEqual(codex, {
      id: "acp-codex",
      displayName: "Codex ACP",
      type: "acp",
      baseUrl: "local://acp-codex",
      command: "npx",
      args: ["@zed-industries/codex-acp@latest"],
      auth: { kind: "none" },
      acp: {
        agentFamily: "codex",
      },
    });

    const gemini = createAcpBackendFromPreset("gemini-cli");
    assert.equal(gemini.command, "npx");
    assert.deepEqual(gemini.args, [
      "@google/gemini-cli@latest",
      "--experimental-acp",
    ]);
    assert.equal(gemini.acp?.agentFamily, "gemini-cli");

    const hermes = createAcpBackendFromPreset("hermes");
    assert.deepEqual(hermes, {
      id: "acp-hermes",
      displayName: "Hermes ACP",
      type: "acp",
      baseUrl: "local://acp-hermes",
      command: "hermes",
      args: ["acp"],
      auth: { kind: "none" },
      acp: {
        agentFamily: "hermes",
      },
    });
  });

  it("keeps only OpenCode as the auto-created built-in ACP backend", function () {
    const builtins = listBuiltinAcpBackends();

    assert.lengthOf(builtins, 1);
    assert.equal(builtins[0].id, "acp-opencode");
    assert.equal(builtins[0].command, "npx");
    assert.deepEqual(builtins[0].args, ["opencode-ai@latest", "acp"]);
    assert.equal(builtins[0].acp?.agentFamily, "opencode");
  });

  it("collects ACP preset rows through the existing dialog collection path", function () {
    const preset = createAcpBackendFromPreset("qwen-code");
    const doc = makeDoc([
      makeRow({
        type: "acp",
        internalId: preset.id,
        displayName: preset.displayName || "",
        command: preset.command || "",
        argsText: (preset.args || []).join("\n"),
        acp: preset.acp,
      }),
    ]);

    const collected = collectBackendsFromDialog(doc);

    assert.deepEqual(collected.backends, [
      {
        id: "acp-qwen-code",
        displayName: "Qwen Code ACP",
        type: "acp",
        baseUrl: "local://acp-qwen-code",
        command: "npx",
        args: ["@qwen-code/qwen-code@latest", "--acp", "--experimental-skills"],
        acp: {
          agentFamily: "qwen-code",
        },
      },
    ]);
  });

  it("resolves management launch payload from stable internal id", function () {
    const row = makeRow({
      type: "skillrunner",
      internalId: "backend-skillrunner-primary",
      displayName: "SkillRunner Primary",
      baseUrl: "http://127.0.0.1:8030",
      authKind: "none",
      authToken: "",
      timeoutMs: "600000",
    });
    (row.__controls?.get("baseUrl") as { value?: string } | undefined)!.value =
      "http://127.0.0.1:9030/";

    const payload = resolveSkillRunnerManagementLaunchPayloadFromRow(
      row as unknown as Element,
    );
    assert.equal(payload.backendId, "backend-skillrunner-primary");
    assert.equal(payload.baseUrl, "http://127.0.0.1:9030/");
    assert.equal(payload.uiUrl, "http://127.0.0.1:9030/ui");
  });

  it("launches management host with unsaved endpoint edits", async function () {
    const row = makeRow({
      type: "skillrunner",
      internalId: "backend-skillrunner-primary",
      displayName: "SkillRunner Primary",
      baseUrl: "http://127.0.0.1:8030",
      authKind: "none",
      authToken: "",
      timeoutMs: "600000",
    });
    (row.__controls?.get("baseUrl") as { value?: string } | undefined)!.value =
      "http://127.0.0.1:18030";

    const launched: Array<{
      backendId: string;
      baseUrl: string;
      uiUrl: string;
    }> = [];
    await launchSkillRunnerManagementFromRow({
      row: row as unknown as Element,
      openDialog: async (payload) => {
        launched.push(payload);
      },
    });

    assert.lengthOf(launched, 1);
    assert.deepEqual(launched[0], {
      backendId: "backend-skillrunner-primary",
      baseUrl: "http://127.0.0.1:18030",
      uiUrl: "http://127.0.0.1:18030/ui",
    });
  });

  it("refreshes model cache using stable internal id", async function () {
    const row = makeRow({
      type: "skillrunner",
      internalId: "backend-skillrunner-primary",
      displayName: "SkillRunner Primary",
      baseUrl: "http://127.0.0.1:8030",
      authKind: "bearer",
      authToken: "token-123",
      timeoutMs: "600000",
    });
    (row.__controls?.get("baseUrl") as { value?: string } | undefined)!.value =
      "http://127.0.0.1:19030/";

    const calls: Array<{
      id: string;
      type: string;
      baseUrl: string;
      authKind: string;
      authToken?: string;
    }> = [];
    const result = await refreshSkillRunnerModelCacheFromRow({
      row: row as unknown as Element,
      refresh: async ({ backend }) => {
        calls.push({
          id: backend.id,
          type: backend.type,
          baseUrl: backend.baseUrl,
          authKind: String(backend.auth?.kind || "none"),
          authToken: backend.auth?.token,
        });
        return {
          ok: true,
          refreshedAt: "2026-03-11T00:00:00.000Z",
          backendId: backend.id,
        };
      },
    });

    assert.lengthOf(calls, 1);
    assert.deepEqual(calls[0], {
      id: "backend-skillrunner-primary",
      type: "skillrunner",
      baseUrl: "http://127.0.0.1:19030/",
      authKind: "bearer",
      authToken: "token-123",
    });
    assert.deepEqual(result, {
      ok: true,
      refreshedAt: "2026-03-11T00:00:00.000Z",
      backendId: "backend-skillrunner-primary",
    });
  });

  it("rejects bearer backend rows without token", function () {
    const doc = makeDoc([
      makeRow({
        type: "skillrunner",
        internalId: "backend-skillrunner-primary",
        displayName: "SkillRunner Primary",
        baseUrl: "http://127.0.0.1:8030",
        authKind: "bearer",
        authToken: "",
        timeoutMs: "600000",
      }),
    ]);

    let thrown: unknown = null;
    try {
      collectBackendsFromDialog(doc);
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    assert.match(String(thrown), /bearer|必填/i);
  });

  it("persists validated backend config with schemaVersion=2", function () {
    let persistedKey = "";
    let persistedValue = "";
    let refreshCalls = 0;

    persistBackendsConfig(
      [
        {
          id: "backend-skillrunner-primary",
          displayName: "SkillRunner Primary",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
          defaults: { timeout_ms: 600000 },
        },
      ],
      {
        setPref: ((key: string, value: string) => {
          persistedKey = key;
          persistedValue = value;
        }) as any,
        refreshWorkflowMenus: () => {
          refreshCalls += 1;
        },
      },
    );

    assert.equal(persistedKey, "backendsConfigJson");
    const parsed = JSON.parse(persistedValue) as {
      schemaVersion?: number;
      backends?: Array<{ id?: string; displayName?: string }>;
    };
    assert.equal(parsed.schemaVersion, 2);
    assert.equal(parsed.backends?.[0]?.id, "backend-skillrunner-primary");
    assert.equal(parsed.backends?.[0]?.displayName, "SkillRunner Primary");
    assert.equal(refreshCalls, 1);
  });

  it("persists ACP connection test metadata immediately after probe", async function () {
    const prefKey = `${config.prefsPrefix}.backendsConfigJson`;
    const previous = Zotero.Prefs.get(prefKey, true);
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [],
      }),
      true,
    );
    let persisted = "";
    const fingerprint = computeAcpBackendConfigFingerprint({
      id: "backend-acp-tested",
      displayName: "Tested ACP",
      type: "acp",
      baseUrl: "local://backend-acp-tested",
      command: "npx",
      args: ["codex", "acp"],
    });
    const row = makeRow({
      type: "acp",
      internalId: "backend-acp-tested",
      displayName: "Tested ACP",
      command: "npx",
      argsText: "codex\nacp",
      acp: {
        connectionTest: {
          status: "passed",
          testedAt: "2026-04-29T00:00:00.000Z",
          configFingerprint: fingerprint,
        },
        runtimeOptionsCache: {
          refreshedAt: "2026-04-29T00:00:00.000Z",
          modes: [{ id: "default", label: "Default" }],
          currentModeId: "default",
          rawModels: [{ id: "qwen3", label: "Qwen 3" }],
          currentRawModelId: "qwen3",
          displayModels: [{ id: "qwen3", label: "Qwen 3" }],
          currentDisplayModelId: "qwen3",
          reasoningEfforts: [{ id: "default", label: "Default" }],
          currentReasoningEffortId: "default",
        },
      },
    });

    try {
      await persistAcpBackendProbeResultFromRow(row as unknown as Element, {
        setPref: ((_: string, value: string) => {
          persisted = value;
          Zotero.Prefs.set(prefKey, value, true);
        }) as any,
        refreshWorkflowMenus: () => {},
      });
    } finally {
      if (typeof previous === "undefined") {
        Zotero.Prefs.clear(prefKey, true);
      } else {
        Zotero.Prefs.set(prefKey, previous, true);
      }
    }

    const parsed = JSON.parse(persisted) as {
      backends?: Array<{
        id?: string;
        acp?: BackendInstance["acp"];
      }>;
    };
    const backend = parsed.backends?.find(
      (entry) => entry.id === "backend-acp-tested",
    );
    assert.equal(backend?.acp?.connectionTest?.status, "passed");
    assert.equal(
      backend?.acp?.runtimeOptionsCache?.currentDisplayModelId,
      "qwen3",
    );
  });

  it("triggers silent model-cache refresh when a new skillrunner backend is added", function () {
    const prefKey = `${config.prefsPrefix}.backendsConfigJson`;
    const previous = Zotero.Prefs.get(prefKey, true);
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "backend-skillrunner-existing",
            type: "skillrunner",
            baseUrl: "http://127.0.0.1:8030",
            auth: { kind: "none" },
          },
        ],
      }),
      true,
    );
    const refreshedIds: string[] = [];
    try {
      persistBackendsConfig(
        [
          {
            id: "backend-skillrunner-existing",
            displayName: "Existing",
            type: "skillrunner",
            baseUrl: "http://127.0.0.1:8030",
            auth: { kind: "none" },
            defaults: { timeout_ms: 600000 },
          },
          {
            id: "backend-skillrunner-new",
            displayName: "New",
            type: "skillrunner",
            baseUrl: "http://127.0.0.1:9030",
            auth: { kind: "none" },
            defaults: { timeout_ms: 600000 },
          },
        ],
        {
          setPref: (() => {}) as any,
          refreshWorkflowMenus: () => {},
          refreshModelCache: async ({ backend }) => {
            refreshedIds.push(String(backend.id || ""));
            return {
              ok: true,
              backendId: String(backend.id || ""),
            };
          },
        },
      );
    } finally {
      if (typeof previous === "undefined") {
        Zotero.Prefs.clear(prefKey, true);
      } else {
        Zotero.Prefs.set(prefKey, previous, true);
      }
    }
    assert.deepEqual(refreshedIds, ["backend-skillrunner-new"]);
  });

  it("preserves existing management_auth when dialog row omits it", function () {
    const prefKey = `${config.prefsPrefix}.backendsConfigJson`;
    const previous = Zotero.Prefs.get(prefKey, true);
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "backend-skillrunner-primary",
            displayName: "SkillRunner Primary",
            type: "skillrunner",
            baseUrl: "http://127.0.0.1:8030",
            auth: { kind: "none" },
            management_auth: {
              kind: "basic",
              username: "admin",
              password: "secret",
            },
          },
        ],
      }),
      true,
    );

    let persisted = "";
    try {
      persistBackendsConfig(
        [
          {
            id: "backend-skillrunner-primary",
            displayName: "SkillRunner Primary",
            type: "skillrunner",
            baseUrl: "http://127.0.0.1:8030",
            auth: { kind: "none" },
          },
        ],
        {
          setPref: ((_: string, value: string) => {
            persisted = value;
          }) as any,
          refreshWorkflowMenus: () => {},
        },
      );
    } finally {
      if (typeof previous === "undefined") {
        Zotero.Prefs.clear(prefKey, true);
      } else {
        Zotero.Prefs.set(prefKey, previous, true);
      }
    }

    const parsed = JSON.parse(persisted) as {
      schemaVersion?: number;
      backends: Array<{
        management_auth?: { kind?: string; username?: string };
      }>;
    };
    assert.equal(parsed.schemaVersion, 2);
    assert.deepEqual(parsed.backends[0].management_auth, {
      kind: "basic",
      username: "admin",
      password: "secret",
    });
  });

  it("untracks health probing immediately when a backend profile is deleted", function () {
    const prefKey = `${config.prefsPrefix}.backendsConfigJson`;
    const previous = Zotero.Prefs.get(prefKey, true);
    Zotero.Prefs.set(
      prefKey,
      JSON.stringify({
        schemaVersion: 2,
        backends: [
          {
            id: "backend-skillrunner-removed",
            displayName: "Removed Backend",
            type: "skillrunner",
            baseUrl: "http://127.0.0.1:8030",
            auth: { kind: "none" },
          },
        ],
      }),
      true,
    );

    registerSkillRunnerBackendForHealthTracking("backend-skillrunner-removed");
    assert.isOk(
      getSkillRunnerBackendHealthState("backend-skillrunner-removed"),
    );

    try {
      persistBackendsConfig([], {
        setPref: ((_: string, value: string) => {
          Zotero.Prefs.set(prefKey, value, true);
        }) as any,
        refreshWorkflowMenus: () => {},
      });
    } finally {
      if (typeof previous === "undefined") {
        Zotero.Prefs.clear(prefKey, true);
      } else {
        Zotero.Prefs.set(prefKey, previous, true);
      }
    }

    assert.isNull(
      getSkillRunnerBackendHealthState("backend-skillrunner-removed"),
    );
  });
});
