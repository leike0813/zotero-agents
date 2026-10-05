import { assert } from "chai";
import { readFileSync } from "node:fs";
import { config } from "../../package.json";
import type { BackendInstance } from "../../src/backends/types";
import { computeAcpBackendConfigFingerprint } from "../../src/backends/identity";
import {
  createAcpBackendFromPreset,
  createAcpBackendFromPresetOptions,
  ensureManagedAcpBackendEnvironmentDirectories,
  getAcpBackendIsolatedEnvironmentPath,
  listAcpBackendPresets,
} from "../../src/modules/acp/chat/acpBackendPresets";
import {
  collectBackendsFromDialog,
  collectBackendsFromDraftRows,
  getBackendRowActionKindsForType,
  launchSkillRunnerManagementFromRow,
  persistAcpBackendProbeResultFromRow,
  persistBackendsConfig,
  refreshSkillRunnerModelCacheFromRow,
  resolveSkillRunnerManagementLaunchPayloadFromRow,
} from "../../src/modules/workflow/settings/backendManager";
import { buildSkillRunnerManagementUiUrl } from "../../src/modules/skillRunner/surface/skillRunnerManagementDialog";
import {
  createGenericHttpBackendDraftFromPreset,
  listGenericHttpBackendPresets,
} from "../../src/modules/workflow/settings/genericHttpBackendPresets";
import {
  getRuntimePersistencePaths,
  statRuntimePath,
} from "../../src/modules/runtimePersistence";
import { joinPath } from "../../src/utils/path";
import {
  getSkillRunnerBackendHealthState,
  isSkillRunnerBackendAvailable,
  markSkillRunnerBackendHealthFailure,
  markSkillRunnerBackendHealthSuccess,
  registerSkillRunnerBackendForHealthTracking,
  resetSkillRunnerBackendHealthRegistryForTests,
} from "../../src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry";
import { createSkillRunnerBackendToastPayload } from "../../src/modules/skillRunner/surface/skillRunnerBackendToasts";

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
        "claude-code",
        "gemini-cli",
        "hermes",
        "qwen-code",
        "github-copilot",
        "qoder-cli",
        "cursor-agent-acp",
        "deepagents",
        "auggie",
        "kilo",
        "cline",
        "codebuddy",
        "grok",
        "cursor",
        "kimi-code",
        "minimax-code",
        "mistral-vibe",
        "openhands",
        "deepseek-harness",
        "factory-droid",
        "goose",
        "junie",
        "kiro-cli",
        "pi-acp",
        "amp-acp",
        "oh-my-pi",
      ],
    );

    const codex = createAcpBackendFromPreset("codex");
    assert.deepEqual(codex, {
      id: "acp-codex-npx",
      displayName: "Codex ACP (npm)",
      type: "acp",
      baseUrl: "local://acp-codex-npx",
      command: "npx",
      args: ["-y", "@agentclientprotocol/codex-acp@latest"],
      auth: { kind: "none" },
      acp: {
        agentFamily: "codex",
      },
    });

    const gemini = createAcpBackendFromPreset("gemini-cli");
    assert.equal(gemini.id, "acp-gemini-cli");
    assert.equal(gemini.command, "gemini");
    assert.deepEqual(gemini.args, ["--acp"]);
    assert.equal(gemini.acp?.agentFamily, "gemini-cli");
    assert.deepEqual(
      createAcpBackendFromPresetOptions("gemini-cli", { useNpx: true }).args,
      ["-y", "@google/gemini-cli@latest", "--acp"],
    );

    const qwen = createAcpBackendFromPreset("qwen-code");
    assert.equal(qwen.command, "qwen");
    assert.deepEqual(qwen.args, ["--acp"]);
    assert.deepEqual(
      createAcpBackendFromPresetOptions("qwen-code", { useNpx: true }).args,
      ["-y", "@qwen-code/qwen-code@latest", "--acp"],
    );

    const claude = createAcpBackendFromPreset("claude-code");
    assert.equal(claude.id, "acp-claude-code-npx");
    assert.equal(claude.command, "npx");
    assert.deepEqual(claude.args, [
      "-y",
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

    const hermesRequestedNpx = createAcpBackendFromPresetOptions("hermes", {
      useNpx: true,
    });
    assert.equal(hermesRequestedNpx.id, "acp-hermes");
    assert.equal(hermesRequestedNpx.command, "hermes");
    assert.deepEqual(hermesRequestedNpx.args, ["acp"]);
    assert.isFalse(
      presets.find((preset) => preset.id === "hermes")?.supportsNpx,
    );

    const githubCopilot = createAcpBackendFromPreset("github-copilot");
    assert.equal(githubCopilot.id, "acp-github-copilot");
    assert.equal(githubCopilot.command, "copilot");
    assert.deepEqual(githubCopilot.args, ["--acp", "--stdio"]);
    assert.equal(githubCopilot.acp?.agentFamily, "unknown");

    const qoder = createAcpBackendFromPreset("qoder-cli");
    assert.equal(qoder.id, "acp-qoder-cli");
    assert.equal(qoder.command, "qoder");
    assert.deepEqual(qoder.args, ["--acp"]);
    assert.deepEqual(
      createAcpBackendFromPresetOptions("qoder-cli", { useNpx: true }).args,
      ["-y", "@qoder-ai/qodercli@latest", "--acp"],
    );

    const cursor = createAcpBackendFromPreset("cursor-agent-acp");
    assert.equal(cursor.id, "acp-cursor-agent-acp");
    assert.equal(cursor.command, "cursor-agent-acp");
    assert.deepEqual(cursor.args, []);

    const deepagents = createAcpBackendFromPreset("deepagents");
    assert.equal(deepagents.id, "acp-deepagents");
    assert.equal(deepagents.command, "deepagents-acp");
    assert.deepEqual(deepagents.args, []);

    const auggie = createAcpBackendFromPreset("auggie");
    assert.equal(auggie.id, "acp-auggie");
    assert.equal(auggie.command, "auggie");
    assert.deepEqual(auggie.args, ["--acp"]);

    const kilo = createAcpBackendFromPreset("kilo");
    assert.equal(kilo.id, "acp-kilo");
    assert.equal(kilo.command, "kilo");
    assert.deepEqual(kilo.args, ["acp"]);
    assert.equal(kilo.acp?.agentFamily, "kilo");
    assert.isTrue(presets.find((preset) => preset.id === "kilo")?.supportsNpx);

    const kiloNpx = createAcpBackendFromPresetOptions("kilo", {
      useNpx: true,
    });
    assert.equal(kiloNpx.id, "acp-kilo-npx");
    assert.equal(kiloNpx.displayName, "Kilo ACP (npm)");
    assert.equal(kiloNpx.command, "npx");
    assert.deepEqual(kiloNpx.args, ["-y", "@kilocode/cli@latest", "acp"]);

    const cline = createAcpBackendFromPreset("cline");
    assert.equal(cline.id, "acp-cline");
    assert.equal(cline.command, "cline");
    assert.deepEqual(cline.args, ["--acp"]);

    const codebuddy = createAcpBackendFromPreset("codebuddy");
    assert.equal(codebuddy.id, "acp-codebuddy");
    assert.equal(codebuddy.command, "codebuddy");
    assert.deepEqual(codebuddy.args, ["--acp"]);
    assert.equal(codebuddy.acp?.agentFamily, "codebuddy");

    const grok = createAcpBackendFromPreset("grok");
    assert.equal(grok.id, "acp-grok");
    assert.equal(grok.command, "grok");
    assert.deepEqual(grok.args, ["agent", "stdio"]);
  });

  it("builds source-confirmed ACP profiles with local and npm launch options", function () {
    const cases: Array<{
      id: string;
      command: string;
      args: string[];
      npxArgs?: string[];
      defaultNpx?: boolean;
      family?: string;
    }> = [
      { id: "cursor", command: "agent", args: ["acp"] },
      {
        id: "kimi-code",
        command: "kimi",
        args: ["acp"],
        npxArgs: ["-y", "@moonshot-ai/kimi-code@latest", "acp"],
        family: "kimi-code",
      },
      {
        id: "minimax-code",
        command: "mcode",
        args: ["acp"],
        npxArgs: ["-y", "--package", "@minimax-ai/code@latest", "mcode", "acp"],
      },
      { id: "mistral-vibe", command: "vibe-acp", args: [] },
      { id: "openhands", command: "openhands", args: ["acp"] },
      {
        id: "deepseek-harness",
        command: "dsh",
        args: ["--profile", "acp"],
        npxArgs: ["-y", "@deepseek-ai/dsh@latest", "--profile", "acp"],
      },
      {
        id: "factory-droid",
        command: "droid",
        args: ["exec", "--output-format", "acp-daemon"],
        npxArgs: [
          "-y",
          "droid@latest",
          "exec",
          "--output-format",
          "acp-daemon",
        ],
        defaultNpx: true,
      },
      { id: "goose", command: "goose", args: ["acp"] },
      { id: "junie", command: "junie", args: ["--acp=true"] },
      { id: "kiro-cli", command: "kiro-cli", args: ["acp"] },
      {
        id: "pi-acp",
        command: "pi-acp",
        args: [],
        npxArgs: ["-y", "pi-acp@latest"],
        defaultNpx: true,
      },
      {
        id: "amp-acp",
        command: "amp-acp",
        args: [],
        npxArgs: ["-y", "amp-acp@latest"],
        defaultNpx: true,
      },
      { id: "oh-my-pi", command: "omp", args: ["acp"] },
    ];

    for (const entry of cases) {
      const local = createAcpBackendFromPresetOptions(entry.id, {
        useNpx: false,
      });
      assert.equal(local.id, `acp-${entry.id}`);
      assert.equal(local.command, entry.command);
      assert.deepEqual(local.args, entry.args);
      assert.equal(local.acp?.agentFamily, entry.family || "unknown");

      const npm = createAcpBackendFromPresetOptions(entry.id, { useNpx: true });
      assert.equal(npm.command, entry.npxArgs ? "npx" : entry.command);
      assert.deepEqual(npm.args, entry.npxArgs || entry.args);
      assert.equal(npm.id, `acp-${entry.id}${entry.npxArgs ? "-npx" : ""}`);

      const defaultProfile = createAcpBackendFromPreset(entry.id);
      assert.equal(
        defaultProfile.command,
        entry.defaultNpx ? "npx" : entry.command,
      );
      assert.deepEqual(
        defaultProfile.args,
        entry.defaultNpx ? entry.npxArgs : entry.args,
      );
      assert.equal(
        defaultProfile.id,
        `acp-${entry.id}${entry.defaultNpx ? "-npx" : ""}`,
      );
      if (entry.id === "factory-droid") {
        assert.deepEqual(defaultProfile.env, {
          DROID_DISABLE_AUTO_UPDATE: "true",
          FACTORY_DROID_AUTO_UPDATE_ENABLED: "false",
        });
      } else {
        assert.isUndefined(defaultProfile.env, entry.id);
      }
    }
  });

  it("builds the MinerU Official Generic HTTP preset draft without persisting placeholder as token", function () {
    const presets = listGenericHttpBackendPresets();
    assert.deepEqual(presets, [
      {
        id: "mineru-official",
        displayName: "MinerU Official",
        baseUrl: "https://mineru.net",
        authKind: "bearer",
        authTokenPlaceholder: "fill-your-mineru-api-key-here",
        timeoutMs: "600000",
        note: {
          textKey: "backend-manager-generic-http-preset-mineru-note",
          textFallback: "Visit MinerU to get an API Key.",
          linkTextKey: "backend-manager-generic-http-preset-mineru-link",
          linkTextFallback: "https://mineru.net",
          linkUrl: "https://mineru.net",
        },
      },
    ]);

    const draft = createGenericHttpBackendDraftFromPreset("mineru-official");
    assert.deepEqual(draft, {
      internalId: "mineru-official",
      displayName: "MinerU Official",
      type: "generic-http",
      enabled: true,
      baseUrl: "https://mineru.net",
      authKind: "bearer",
      authToken: "",
      authTokenPlaceholder: "fill-your-mineru-api-key-here",
      timeoutMs: "600000",
      command: "",
      args: [],
      env: [],
    });

    const collected = collectBackendsFromDraftRows([
      {
        ...draft,
        authToken: "real-token",
      },
    ]);
    assert.deepEqual(collected.backends, [
      {
        id: "mineru-official",
        displayName: "MinerU Official",
        type: "generic-http",
        baseUrl: "https://mineru.net",
        auth: {
          kind: "bearer",
          token: "real-token",
        },
        defaults: {
          timeout_ms: 600000,
        },
      },
    ]);

    let thrown: unknown = null;
    try {
      collectBackendsFromDraftRows([draft]);
    } catch (error) {
      thrown = error;
    }
    assert.isOk(thrown);
    assert.match(String(thrown), /bearer|required|必填/i);
  });

  it("adds ACP preset display name suffixes for npm and isolated profiles", function () {
    assert.equal(
      createAcpBackendFromPreset("opencode").displayName,
      "OpenCode ACP",
    );
    assert.equal(
      createAcpBackendFromPresetOptions("opencode", {
        useNpx: true,
      }).displayName,
      "OpenCode ACP (npm)",
    );
    assert.equal(
      createAcpBackendFromPresetOptions("opencode", {
        isolated: true,
      }).displayName,
      "OpenCode ACP (Isolated)",
    );
    assert.equal(
      createAcpBackendFromPresetOptions("opencode", {
        useNpx: true,
        isolated: true,
      }).displayName,
      "OpenCode ACP (npm)(Isolated)",
    );
  });

  it("injects inline deny-question configuration into OpenCode and Kilo presets", function () {
    const inlinePermissionConfig = '{"permission":{"question":"deny"}}';
    const opencodeIsolatedPath = getAcpBackendIsolatedEnvironmentPath(
      "acp-opencode-isolated",
    );
    const kiloIsolatedPath =
      getAcpBackendIsolatedEnvironmentPath("acp-kilo-isolated");
    const cases = [
      {
        backend: createAcpBackendFromPreset("opencode"),
        expectedEnv: {
          OPENCODE_CONFIG_CONTENT: inlinePermissionConfig,
        },
      },
      {
        backend: createAcpBackendFromPresetOptions("opencode", {
          useNpx: true,
        }),
        expectedEnv: {
          OPENCODE_CONFIG_CONTENT: inlinePermissionConfig,
        },
      },
      {
        backend: createAcpBackendFromPresetOptions("opencode", {
          isolated: true,
        }),
        expectedEnv: {
          OPENCODE_CONFIG_CONTENT: inlinePermissionConfig,
          OPENCODE_CONFIG_DIR: opencodeIsolatedPath,
        },
      },
      {
        backend: createAcpBackendFromPreset("kilo"),
        expectedEnv: {
          KILO_CONFIG_CONTENT: inlinePermissionConfig,
        },
      },
      {
        backend: createAcpBackendFromPresetOptions("kilo", {
          useNpx: true,
        }),
        expectedEnv: {
          KILO_CONFIG_CONTENT: inlinePermissionConfig,
        },
      },
      {
        backend: createAcpBackendFromPresetOptions("kilo", {
          isolated: true,
        }),
        expectedEnv: {
          KILO_CONFIG_CONTENT: inlinePermissionConfig,
          XDG_CONFIG_HOME: joinPath(kiloIsolatedPath, "config"),
          XDG_DATA_HOME: joinPath(kiloIsolatedPath, "data"),
          XDG_CACHE_HOME: joinPath(kiloIsolatedPath, "cache"),
        },
      },
    ];

    for (const entry of cases) {
      assert.deepEqual(entry.backend.env, entry.expectedEnv);
    }
  });

  it("builds isolated ACP preset backend profiles with managed env roots", function () {
    const expectedRoot = getRuntimePersistencePaths().dataDir;
    const cases = [
      {
        presetId: "opencode",
        backendId: "acp-opencode-isolated",
        displayName: "OpenCode ACP (Isolated)",
        envKey: "OPENCODE_CONFIG_DIR",
        agentFamily: "opencode",
      },
      {
        presetId: "codex",
        backendId: "acp-codex-npx-isolated",
        displayName: "Codex ACP (npm)(Isolated)",
        envKey: "CODEX_HOME",
        agentFamily: "codex",
      },
      {
        presetId: "claude-code",
        backendId: "acp-claude-code-npx-isolated",
        displayName: "Claude Code ACP (npm)(Isolated)",
        envKey: "CLAUDE_CONFIG_DIR",
        agentFamily: "claude-code",
      },
      {
        presetId: "gemini-cli",
        backendId: "acp-gemini-cli-isolated",
        displayName: "Gemini CLI ACP (Isolated)",
        envKey: "GEMINI_CLI_HOME",
        agentFamily: "gemini-cli",
      },
      {
        presetId: "hermes",
        backendId: "acp-hermes-isolated",
        displayName: "Hermes ACP (Isolated)",
        envKey: "HERMES_HOME",
        agentFamily: "hermes",
      },
      {
        presetId: "qoder-cli",
        backendId: "acp-qoder-cli-isolated",
        displayName: "Qoder CLI ACP (Isolated)",
        envKey: "QODER_CONFIG_DIR",
        agentFamily: "unknown",
      },
      {
        presetId: "qwen-code",
        backendId: "acp-qwen-code-isolated",
        displayName: "Qwen Code ACP (Isolated)",
        envKey: "QWEN_HOME",
        agentFamily: "qwen-code",
      },
      {
        presetId: "github-copilot",
        backendId: "acp-github-copilot-isolated",
        displayName: "GitHub Copilot ACP (Isolated)",
        envKey: "COPILOT_HOME",
        agentFamily: "unknown",
      },
      {
        presetId: "cline",
        backendId: "acp-cline-isolated",
        displayName: "Cline ACP (Isolated)",
        envKey: "CLINE_DIR",
        agentFamily: "unknown",
      },
      {
        presetId: "codebuddy",
        backendId: "acp-codebuddy-isolated",
        displayName: "CodeBuddy ACP (Isolated)",
        envKey: "CODEBUDDY_CONFIG_DIR",
        agentFamily: "codebuddy",
      },
      {
        presetId: "grok",
        backendId: "acp-grok-isolated",
        displayName: "Grok ACP (Isolated)",
        envKey: "GROK_HOME",
        agentFamily: "unknown",
      },
    ] as const;

    for (const entry of cases) {
      const backend = createAcpBackendFromPresetOptions(entry.presetId, {
        isolated: true,
      });
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
        ...(entry.presetId === "opencode"
          ? {
              OPENCODE_CONFIG_CONTENT: '{"permission":{"question":"deny"}}',
            }
          : {}),
        [entry.envKey]: expectedPath,
      });
      assert.include(expectedPath, expectedRoot);
      assert.include(expectedPath, "acp-backend-environments");
      assert.include(expectedPath, entry.backendId);
      assert.notProperty(
        createAcpBackendFromPreset(entry.presetId).env || {},
        entry.envKey,
      );
    }
  });

  it("isolates the declared filesystem roots of newly supported ACP agents", function () {
    const cases = [
      ["cursor", "CURSOR_CONFIG_DIR", "acp-cursor-isolated"],
      ["kimi-code", "KIMI_CODE_HOME", "acp-kimi-code-isolated"],
      ["minimax-code", "MINIMAX_DATA_DIR", "acp-minimax-code-isolated"],
      ["mistral-vibe", "VIBE_HOME", "acp-mistral-vibe-isolated"],
      ["deepseek-harness", "DSH_HOME", "acp-deepseek-harness-isolated"],
      ["goose", "GOOSE_PATH_ROOT", "acp-goose-isolated"],
      ["junie", "JUNIE_HOME", "acp-junie-isolated"],
      ["pi-acp", "PI_CODING_AGENT_DIR", "acp-pi-acp-npx-isolated"],
      ["amp-acp", "AMP_ACP_STATE_DIR", "acp-amp-acp-npx-isolated"],
    ];
    for (const [id, envKey, backendId] of cases) {
      const backend = createAcpBackendFromPresetOptions(id, { isolated: true });
      assert.equal(backend.id, backendId);
      assert.deepEqual(backend.env, {
        [envKey]: getAcpBackendIsolatedEnvironmentPath(backendId),
      });
      assert.isUndefined(createAcpBackendFromPreset(id).env);
    }

    const openhands = createAcpBackendFromPresetOptions("openhands", {
      isolated: true,
    });
    const root = getAcpBackendIsolatedEnvironmentPath("acp-openhands-isolated");
    assert.deepEqual(openhands.env, {
      OPENHANDS_PERSISTENCE_DIR: root,
      OPENHANDS_CONVERSATIONS_DIR: joinPath(root, "conversations"),
    });
    assert.isUndefined(createAcpBackendFromPreset("openhands").env);

    for (const id of ["factory-droid", "kiro-cli", "oh-my-pi"]) {
      assert.deepEqual(
        createAcpBackendFromPresetOptions(id, { isolated: true }),
        createAcpBackendFromPreset(id),
      );
    }
  });

  it("prepares managed OpenHands and native/adapter Cursor directories without rewriting saved paths", async function () {
    const previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = joinPath(
      Zotero.DataDirectory.dir,
      "acp-presets-test",
    );
    try {
      const backends = ["openhands", "cursor", "cursor-agent-acp"].map((id) =>
        createAcpBackendFromPresetOptions(id, { isolated: true }),
      );
      const openhandsRoot = getAcpBackendIsolatedEnvironmentPath(
        "acp-openhands-isolated",
      );
      const nativeCursorRoot = getAcpBackendIsolatedEnvironmentPath(
        "acp-cursor-isolated",
      );
      const adapterCursorRoot = getAcpBackendIsolatedEnvironmentPath(
        "acp-cursor-agent-acp-isolated",
      );
      const customPath = joinPath(
        getRuntimePersistencePaths().dataDir,
        "custom-cursor",
      );
      const customized = {
        ...backends[1],
        id: "acp-cursor-custom",
        env: { CURSOR_CONFIG_DIR: customPath },
      };
      const saved = JSON.parse(JSON.stringify(customized));

      await ensureManagedAcpBackendEnvironmentDirectories([
        ...backends,
        customized,
      ]);

      for (const directory of [
        openhandsRoot,
        joinPath(openhandsRoot, "conversations"),
        nativeCursorRoot,
        adapterCursorRoot,
      ]) {
        assert.isTrue((await statRuntimePath(directory)).isDir, directory);
      }
      assert.isFalse((await statRuntimePath(customPath)).exists);
      assert.deepEqual(customized, saved);
    } finally {
      if (previousRoot === undefined) {
        delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      } else {
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
      }
    }
  });

  it("builds isolated Kilo ACP preset backend profiles with XDG env roots", function () {
    const backend = createAcpBackendFromPresetOptions("kilo", {
      isolated: true,
    });
    const expectedPath =
      getAcpBackendIsolatedEnvironmentPath("acp-kilo-isolated");

    assert.equal(backend.id, "acp-kilo-isolated");
    assert.equal(backend.displayName, "Kilo ACP (Isolated)");
    assert.equal(backend.command, "kilo");
    assert.deepEqual(backend.args, ["acp"]);
    assert.deepEqual(backend.env, {
      KILO_CONFIG_CONTENT: '{"permission":{"question":"deny"}}',
      XDG_CONFIG_HOME: joinPath(expectedPath, "config"),
      XDG_DATA_HOME: joinPath(expectedPath, "data"),
      XDG_CACHE_HOME: joinPath(expectedPath, "cache"),
    });
    assert.equal(backend.acp?.agentFamily, "kilo");
  });

  it("builds isolated ACP preset backend profiles with managed session args", function () {
    const backend = createAcpBackendFromPresetOptions("cursor-agent-acp", {
      isolated: true,
    });
    const expectedPath = getAcpBackendIsolatedEnvironmentPath(
      "acp-cursor-agent-acp-isolated",
    );

    assert.equal(backend.id, "acp-cursor-agent-acp-isolated");
    assert.equal(backend.displayName, "Cursor Agent ACP (Isolated)");
    assert.equal(backend.command, "cursor-agent-acp");
    assert.deepEqual(backend.args, ["--session-dir", expectedPath]);
    assert.isUndefined(backend.env);
    assert.equal(backend.acp?.agentFamily, "unknown");
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
        command: "qwen",
        args: ["--acp"],
        acp: {
          agentFamily: "qwen-code",
        },
      },
    ]);
  });

  it("preserves isolated ACP preset env through draft row collection", function () {
    const preset = createAcpBackendFromPresetOptions("codex", {
      isolated: true,
    });
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
        id: "acp-codex-npx-isolated",
        displayName: "Codex ACP (npm)(Isolated)",
        type: "acp",
        baseUrl: "local://acp-codex-npx-isolated",
        command: "npx",
        args: ["-y", "@agentclientprotocol/codex-acp@latest"],
        env: {
          CODEX_HOME: getAcpBackendIsolatedEnvironmentPath(
            "acp-codex-npx-isolated",
          ),
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
    const savedGemini: BackendInstance = {
      id: "acp-gemini-cli",
      displayName: "My Gemini",
      type: "acp",
      baseUrl: "local://acp-gemini-cli",
      command: "/custom/bin/gemini",
      args: ["--experimental-acp", "--model", "custom-model"],
      env: { GEMINI_CLI_HOME: "/custom/gemini-home" },
      auth: { kind: "none" },
      acp: { agentFamily: "gemini-cli" },
    };

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
        savedGemini,
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
      backends?: BackendInstance[];
    };
    assert.equal(parsed.schemaVersion, 2);
    assert.equal(parsed.backends?.[0]?.id, "backend-skillrunner-primary");
    assert.equal(parsed.backends?.[0]?.displayName, "SkillRunner Primary");
    assert.deepEqual(parsed.backends?.[1], savedGemini);
    assert.deepEqual(createAcpBackendFromPreset("gemini-cli").args, ["--acp"]);
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
