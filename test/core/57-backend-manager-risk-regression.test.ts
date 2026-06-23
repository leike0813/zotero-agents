import { assert } from "chai";
import { readFileSync } from "node:fs";
import { config } from "../../package.json";
import type { BackendInstance } from "../../src/backends/types";
import { computeAcpBackendConfigFingerprint } from "../../src/modules/acpBackendProbe";
import {
  createAcpBackendFromPreset,
  getAcpBackendIsolatedEnvironmentPath,
  listAcpBackendPresets,
  listBuiltinAcpBackends,
} from "../../src/modules/acpBackendPresets";
import {
  collectBackendsFromDialog,
  collectBackendsFromDraftRows,
  getBackendRowActionKindsForType,
  launchSkillRunnerManagementFromRow,
  persistAcpBackendProbeResultFromRow,
  persistBackendsConfig,
  refreshSkillRunnerModelCacheFromRow,
  resolveSkillRunnerManagementLaunchPayloadFromRow,
} from "../../src/modules/backendManager";
import { buildSkillRunnerManagementUiUrl } from "../../src/modules/skillRunnerManagementDialog";
import { getRuntimePersistencePaths } from "../../src/modules/runtimePersistence";
import {
  getSkillRunnerBackendHealthState,
  isSkillRunnerBackendAvailable,
  markSkillRunnerBackendHealthFailure,
  markSkillRunnerBackendHealthSuccess,
  registerSkillRunnerBackendForHealthTracking,
  resetSkillRunnerBackendHealthRegistryForTests,
} from "../../src/modules/skillRunnerBackendHealthRegistry";
import { createSkillRunnerBackendToastPayload } from "../../src/modules/skillRunnerBackendToasts";

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
    const html = readFileSync(
      "addon/content/dashboard/backend-manager.html",
      "utf8",
    );
    const js = readFileSync(
      "addon/content/dashboard/backend-manager.js",
      "utf8",
    );
    const css = readFileSync(
      "addon/content/dashboard/backend-manager.css",
      "utf8",
    );
    assert.include(source, "backend-manager-dialog-frame");
    assert.include(source, "backend-manager-dialog:init");
    assert.include(source, "backend-manager-dialog:action");
    assert.include(source, "collectBackendsFromDraftRows");
    assert.include(source, "_currentBackendDraftSignature");
    assert.include(source, "fitContent: false");
    assert.include(source, "width: 1180");
    assert.include(source, "height: 700");
    assert.include(source, 'minWidth: "1040px"');
    assert.include(source, 'minHeight: "620px"');
    assert.include(source, 'frame.style.display = "block"');
    assert.include(source, 'frame.style.flex = "1 1 auto"');
    assert.include(source, "frame.src = resolveBackendManagerPageUrl()");
    assert.include(source, 'frame.addEventListener("load"');
    assert.include(source, "const targetWindow = resolveFrameWindow(frame)");
    assert.include(source, "targetWindow.postMessage");
    assert.include(
      source,
      "const currentFrameWindow = resolveFrameWindow(frame)",
    );
    assert.notInclude(
      source,
      "root.appendChild(frame);\n      frameWindow = resolveFrameWindow(frame);\n      frame.src",
    );
    assert.include(
      source,
      'dialogWindow?.addEventListener("message", onMessage)',
    );
    assert.include(source, "createBackendManagerDraftSignature");
    assert.include(source, "installBackendManagerBeforeUnloadPrompt");
    assert.include(source, "backend-manager-unsaved-exit-confirm");
    assert.include(html, 'class="backend-manager-page"');
    assert.include(html, 'id="backend-manager-root"');
    assert.include(html, "../shared/theme.css");
    assert.include(html, "../shared/icons.css");
    assert.include(html, "../components/custom-select.css");
    assert.include(html, "../components/custom-select.js");
    assert.include(html, "./backend-manager.css");
    assert.include(html, "./backend-manager.js");
    assert.include(js, "backend-manager-dialog:action");
    assert.include(
      js,
      'PROVIDER_ORDER = ["acp", "skillrunner", "generic-http"]',
    );
    assert.include(js, "backend-provider-tabs");
    assert.include(js, "renderAcpPresetSelect");
    assert.include(
      js,
      "function renderProvider(provider) {\n    const l = labels();",
    );
    assert.include(js, 'el("p", "backend-empty", l.noProfiles');
    assert.include(js, "window.createCustomSelect");
    assert.include(js, "state.acpSelectedPresetId");
    assert.include(js, "backend-http-grid");
    assert.include(js, "backend-acp-grid");
    assert.include(js, 'input.type = "password"');
    assert.include(js, 'input.autocomplete = "off"');
    assert.include(js, "state.scrollByProvider");
    assert.include(js, "state.pendingModelCacheRows");
    assert.include(js, "state.skillRunnerReachableById");
    assert.include(js, "syncSkillRunnerReachabilityFromSnapshot");
    assert.include(js, "showStatusMessage");
    assert.include(js, "rememberScroll");
    assert.include(js, "restoreScroll");
    assert.include(js, "preventDefault");
    assert.include(js, "providerAddLabel");
    assert.include(js, "/\\{\\s*\\$provider\\s*\\}/g");
    assert.include(js, "renderArgEditor");
    assert.include(js, "renderEnvEditor");
    assert.include(js, "draft-changed");
    assert.include(css, ".backend-manager-root");
    assert.include(css, ".backend-manager-page body");
    assert.include(css, "height: 100%");
    assert.include(css, "overflow: hidden");
    assert.include(css, ".backend-provider-tabs");
    assert.include(css, ".backend-provider-tab.is-active");
    assert.include(css, ".backend-preset-select");
    assert.include(css, ".backend-preset-select .custom-select-menu");
    assert.include(css, ".backend-manager-body");
    assert.include(css, ".backend-footer");
    assert.include(css, ".backend-footer-status");
    assert.include(css, ".backend-footer-actions");
    assert.include(css, ".backend-list-editor");
    assert.include(css, ".backend-http-grid");
    assert.include(css, ".backend-acp-grid");
    assert.include(css, ".backend-acp-grid > *");
    assert.include(css, ".backend-acp-grid > * + *");
    assert.include(css, "padding: 10px 14px");
    assert.include(css, "border-left: 1px solid var(--zs-border)");
    assert.include(css, "background: transparent");
    assert.include(css, "font-size: 13px");
    assert.notInclude(js, "backend-token-toggle");
    assert.notInclude(js, "backend-preset-menu");
    assert.notInclude(css, "backend-token-toggle");
    assert.notInclude(css, ".backend-preset-menu");
    assert.notInclude(source, '.addButton(getString("backend-manager-save"');
    assert.notInclude(
      source,
      '"backend-manager-refresh-acp-runtime-cache-success"',
    );
    assert.include(source, "getSkillRunnerBackendHealthState");
    assert.include(source, "markSkillRunnerBackendHealthSuccess");
    assert.include(source, "backend-manager-status-unreachable");
    assert.include(source, "skillRunnerHealth");
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

  it("collects structured ACP args and env while discarding blank draft items", function () {
    const collected = collectBackendsFromDraftRows([
      {
        type: "acp",
        internalId: "acp-structured",
        displayName: "Structured ACP",
        command: "npx",
        args: ["codex-acp", " ", "--fast"],
        env: [
          { key: "PATH", value: "C:\\Tools" },
          { key: "", value: "" },
          { key: "EMPTY", value: "" },
        ],
      },
    ]);

    assert.deepEqual(collected.backends, [
      {
        id: "acp-structured",
        displayName: "Structured ACP",
        type: "acp",
        baseUrl: "local://acp-structured",
        command: "npx",
        args: ["codex-acp", "--fast"],
        env: {
          PATH: "C:\\Tools",
          EMPTY: "",
        },
      },
    ]);
  });

  it("rejects structured ACP env values without a variable name", function () {
    let thrown: unknown = null;
    try {
      collectBackendsFromDraftRows([
        {
          type: "acp",
          internalId: "acp-bad-env",
          displayName: "Bad ACP",
          command: "npx",
          args: [],
          env: [{ key: "", value: "secret" }],
        },
      ]);
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    assert.match(
      String(thrown),
      /backend-manager-error-env-key-required|env-key|required/i,
    );
  });

  it("builds common ACP preset backend profiles with stable command metadata", function () {
    const presets = listAcpBackendPresets();
    assert.sameMembers(
      presets.map((preset) => preset.id),
      [
        "opencode",
        "codex",
        "codex-isolated",
        "claude-code",
        "claude-code-isolated",
        "gemini-cli",
        "gemini-cli-isolated",
        "hermes",
        "hermes-isolated",
        "qwen-code",
      ],
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

    const claude = createAcpBackendFromPreset("claude-code");
    assert.equal(claude.command, "npx");
    assert.deepEqual(claude.args, [
      "@agentclientprotocol/claude-agent-acp@latest",
    ]);
    assert.equal(claude.acp?.agentFamily, "claude-code");

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

  it("builds isolated ACP preset backend profiles with managed env roots", function () {
    const expectedRoot = getRuntimePersistencePaths().dataDir;
    const cases = [
      {
        presetId: "codex-isolated",
        backendId: "acp-codex-isolated",
        displayName: "Codex ACP (Isolated Environment)",
        envKey: "CODEX_HOME",
        agentFamily: "codex",
      },
      {
        presetId: "claude-code-isolated",
        backendId: "acp-claude-code-isolated",
        displayName: "Claude Code ACP (Isolated Environment)",
        envKey: "CLAUDE_CONFIG_DIR",
        agentFamily: "claude-code",
      },
      {
        presetId: "gemini-cli-isolated",
        backendId: "acp-gemini-cli-isolated",
        displayName: "Gemini CLI ACP (Isolated Environment)",
        envKey: "GEMINI_CLI_HOME",
        agentFamily: "gemini-cli",
      },
      {
        presetId: "hermes-isolated",
        backendId: "acp-hermes-isolated",
        displayName: "Hermes ACP (Isolated Environment)",
        envKey: "HERMES_HOME",
        agentFamily: "hermes",
      },
    ] as const;

    for (const entry of cases) {
      const backend = createAcpBackendFromPreset(entry.presetId);
      const expectedPath = getAcpBackendIsolatedEnvironmentPath(
        entry.backendId,
      );
      assert.equal(backend.id, entry.backendId);
      assert.equal(backend.displayName, entry.displayName);
      assert.equal(backend.type, "acp");
      assert.equal(backend.baseUrl, `local://${entry.backendId}`);
      assert.equal(backend.auth?.kind, "none");
      assert.equal(backend.acp?.agentFamily, entry.agentFamily);
      assert.deepEqual(backend.env, {
        [entry.envKey]: expectedPath,
      });
      assert.include(expectedPath, expectedRoot);
      assert.include(expectedPath, "acp-backend-environments");
      assert.include(expectedPath, entry.backendId);
    }
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

  it("preserves isolated ACP preset env through draft row collection", function () {
    const preset = createAcpBackendFromPreset("codex-isolated");
    const collected = collectBackendsFromDraftRows([
      {
        type: "acp",
        internalId: preset.id,
        displayName: preset.displayName || "",
        command: preset.command || "",
        args: preset.args || [],
        env: Object.entries(preset.env || {}).map(([key, value]) => ({
          key,
          value,
        })),
        acp: preset.acp,
      },
    ]);

    assert.deepEqual(collected.backends, [
      {
        id: "acp-codex-isolated",
        displayName: "Codex ACP (Isolated Environment)",
        type: "acp",
        baseUrl: "local://acp-codex-isolated",
        command: "npx",
        args: ["@zed-industries/codex-acp@latest"],
        env: {
          CODEX_HOME:
            getAcpBackendIsolatedEnvironmentPath("acp-codex-isolated"),
        },
        acp: {
          agentFamily: "codex",
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

  it("builds management ui url under the configured base url path", function () {
    assert.equal(
      buildSkillRunnerManagementUiUrl("http://127.0.0.1:8030"),
      "http://127.0.0.1:8030/ui",
    );
    assert.equal(
      buildSkillRunnerManagementUiUrl("http://127.0.0.1:8030/api/"),
      "http://127.0.0.1:8030/api/ui",
    );
    assert.equal(
      buildSkillRunnerManagementUiUrl("http://127.0.0.1:8030/ui"),
      "http://127.0.0.1:8030/ui",
    );
  });

  it("routes SkillRunner management through Dashboard instead of standalone dialog", function () {
    const backendManagerSource = readFileSync(
      "src/modules/backendManager.ts",
      "utf8",
    );
    const dashboardSource = readFileSync(
      "src/modules/taskManagerDialog.ts",
      "utf8",
    );
    const managementSource = readFileSync(
      "src/modules/skillRunnerManagementDialog.ts",
      "utf8",
    );

    assert.include(backendManagerSource, "openZoteroSkillsWorkspaceTab");
    assert.include(backendManagerSource, 'initialView: "dashboard"');
    assert.include(
      backendManagerSource,
      'initialDashboardBackendSubview: "management"',
    );
    assert.notInclude(backendManagerSource, "openTaskManagerDialog");
    assert.notInclude(backendManagerSource, "openSkillRunnerManagementDialog");
    assert.include(
      dashboardSource,
      'state.selectedBackendSubviewById.set(backend.id, "management")',
    );
    assert.include(
      dashboardSource,
      'state.selectedBackendSubviewById.set(backend.id, "runs")',
    );
    assert.notInclude(managementSource, "new ztoolkit.Dialog");
    assert.notInclude(managementSource, "createXULElement");
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

  it("does not treat unknown SkillRunner backends as submit-available", function () {
    assert.isFalse(isSkillRunnerBackendAvailable("unknown-skillrunner"));
  });

  it("registers SkillRunner backend health as tracked but not confirmed reachable", function () {
    const state = registerSkillRunnerBackendForHealthTracking(
      "backend-skillrunner-unconfirmed",
    );

    assert.isOk(state);
    assert.isFalse(state?.reachable);
    assert.equal(state?.status, "unknown");
    assert.isFalse(
      isSkillRunnerBackendAvailable("backend-skillrunner-unconfirmed"),
    );
    markSkillRunnerBackendHealthSuccess("backend-skillrunner-unconfirmed");
    assert.isTrue(
      isSkillRunnerBackendAvailable("backend-skillrunner-unconfirmed"),
    );
  });

  it("buffers one SkillRunner health probe failure before gating a reachable backend", function () {
    registerSkillRunnerBackendForHealthTracking("backend-skillrunner-buffered");
    markSkillRunnerBackendHealthSuccess("backend-skillrunner-buffered");

    const firstFailure = markSkillRunnerBackendHealthFailure({
      backendId: "backend-skillrunner-buffered",
      error: new Error("probe timeout"),
    });

    assert.equal(firstFailure?.status, "reachable");
    assert.isTrue(firstFailure?.reachable);
    assert.equal(firstFailure?.failureStreak, 1);
    assert.isTrue(
      isSkillRunnerBackendAvailable("backend-skillrunner-buffered"),
    );

    const secondFailure = markSkillRunnerBackendHealthFailure({
      backendId: "backend-skillrunner-buffered",
      error: new Error("probe timeout"),
    });

    assert.equal(secondFailure?.status, "unreachable");
    assert.isFalse(secondFailure?.reachable);
    assert.equal(secondFailure?.failureStreak, 2);
    assert.isFalse(
      isSkillRunnerBackendAvailable("backend-skillrunner-buffered"),
    );
  });

  it("tracks SkillRunner backend health immediately when profiles are saved", function () {
    const prefKey = `${config.prefsPrefix}.backendsConfigJson`;
    const previous = Zotero.Prefs.get(prefKey, true);
    try {
      persistBackendsConfig(
        [
          {
            id: "backend-skillrunner-added",
            displayName: "Added Backend",
            type: "skillrunner",
            baseUrl: "http://127.0.0.1:8030",
            auth: { kind: "none" },
          },
        ],
        {
          setPref: ((_: string, value: string) => {
            Zotero.Prefs.set(prefKey, value, true);
          }) as any,
          refreshWorkflowMenus: () => {},
          refreshModelCache: async () => ({
            ok: true,
            backendId: "backend-skillrunner-added",
            baseUrl: "http://127.0.0.1:8030",
            refreshedAt: "2026-06-20T00:00:00.000Z",
          }),
        },
      );
    } finally {
      if (typeof previous === "undefined") {
        Zotero.Prefs.clear(prefKey, true);
      } else {
        Zotero.Prefs.set(prefKey, previous, true);
      }
    }

    const state = getSkillRunnerBackendHealthState("backend-skillrunner-added");
    assert.isOk(state);
    assert.isFalse(state?.reachable);
    assert.equal(state?.status, "unknown");
    assert.isFalse(isSkillRunnerBackendAvailable("backend-skillrunner-added"));
  });

  it("persists disabled SkillRunner backend profiles and marks them disabled", function () {
    const prefKey = `${config.prefsPrefix}.backendsConfigJson`;
    const previous = Zotero.Prefs.get(prefKey, true);
    try {
      const collected = collectBackendsFromDraftRows([
        {
          internalId: "backend-skillrunner-disabled",
          displayName: "Disabled Backend",
          type: "skillrunner",
          enabled: false,
          baseUrl: "http://127.0.0.1:8030",
          authKind: "none",
          authToken: "",
          timeoutMs: "",
          command: "",
          args: [],
          env: [],
        },
      ]);
      assert.equal(collected.backends[0].enabled, false);
      persistBackendsConfig(collected.backends, {
        setPref: ((_: string, value: string) => {
          Zotero.Prefs.set(prefKey, value, true);
        }) as any,
        refreshWorkflowMenus: () => {},
        refreshModelCache: async () => ({
          ok: true,
          backendId: "backend-skillrunner-disabled",
          baseUrl: "http://127.0.0.1:8030",
          refreshedAt: "2026-06-20T00:00:00.000Z",
        }),
      });
    } finally {
      if (typeof previous === "undefined") {
        Zotero.Prefs.clear(prefKey, true);
      } else {
        Zotero.Prefs.set(prefKey, previous, true);
      }
    }

    const state = getSkillRunnerBackendHealthState(
      "backend-skillrunner-disabled",
    );
    assert.equal(state?.status, "disabled");
    assert.isFalse(
      isSkillRunnerBackendAvailable("backend-skillrunner-disabled"),
    );
  });

  it("builds auto-disable backend toasts with display names and dedup keys", function () {
    const payload = createSkillRunnerBackendToastPayload({
      kind: "auto-disabled",
      backendId: "backend-skillrunner-remote",
      displayName: "Remote Runner",
    });

    assert.isOk(payload);
    assert.equal(payload?.displayName, "Remote Runner");
    assert.include(payload?.text || "", "Remote Runner");
    assert.include(payload?.dedupKey || "", "auto-disabled");
    assert.include(payload?.dedupKey || "", "backend-skillrunner-remote");
    assert.isAbove(payload?.dedupWindowMs || 0, 0);
  });

  it("suppresses generic backend toasts for the managed local backend", function () {
    const payload = createSkillRunnerBackendToastPayload({
      kind: "auto-disabled",
      backendId: "local-skillrunner-backend",
      displayName: "Local Backend",
    });

    assert.isNull(payload);
  });
});
