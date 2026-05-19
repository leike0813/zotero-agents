import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { BackendInstance } from "../../src/backends/types";
import {
  ACP_OPENCODE_BACKEND_ID,
  ACP_SKILL_RUN_REQUEST_KIND,
} from "../../src/config/defaults";
import {
  buildAcpSkillInjectionPlan,
  resolveAcpAgentFamily,
} from "../../src/modules/acpAgentFamilyResolver";
import {
  buildAcpSkillRunPanelSnapshot,
  cancelAcpSkillRun,
  archiveAcpSkillRun,
  connectAcpSkillRun,
  disconnectAcpSkillRun,
  endAcpSkillRunSession,
  getAcpSkillRunRecord,
  interruptAcpSkillRunCurrentTurn,
  listAcpSkillRuns,
  recordAcpSkillRunSessionUpdate,
  registerAcpSkillRunController,
  replyAcpSkillRun,
  resolveAcpSkillRunPermissionRequest,
  resetAcpSkillRunsForTests,
  setAcpSkillRunMode,
  setAcpSkillRunModel,
  setAcpSkillRunRecoveryHandlerForTests,
  setAcpSkillRunPermissionRequest,
  setAcpSkillRunReasoningEffort,
  setAcpSkillRunRuntimeOptions,
  subscribeAcpSkillRunSnapshots,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import { insertAcpSkillProxyPatchBlock } from "../../src/modules/acpSkillReferenceRewriter";
import {
  buildAcpRuntimeDependencyPlan,
  defaultAcpRuntimeDependencyProbe,
  wrapAcpBackendWithUv,
} from "../../src/modules/acpRuntimeDependencyWrapper";
import {
  executeAcpSkillRunnerJob,
  recoverAcpSkillRunConversation,
} from "../../src/modules/acpSkillRunnerOrchestrator";
import {
  ACP_SKILL_PATCH_TEMPLATES,
  loadAcpSkillPatchTemplate,
} from "../../src/modules/acpSkillPatchTemplates";
import {
  ACP_RUNTIME_PROMPT_TEMPLATES,
  ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID,
  loadAcpRuntimePromptTemplate,
  renderAcpRuntimePromptTemplate,
} from "../../src/modules/acpRuntimePromptTemplates";
import { buildAcpSkillOutputRepairPrompt } from "../../src/modules/acpSkillOutputValidator";
import { createAcpSkillRunnerWorkspace } from "../../src/modules/acpSkillRunnerWorkspace";
import { resolveProvider } from "../../src/providers/registry";
import type { AcpConnectionAdapter } from "../../src/modules/acpConnectionAdapter";
import { createAcpMcpGatewayConnection } from "../../src/modules/acpMcpGateway";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import {
  writeMcpContextInjectionDiagnostics,
} from "../../src/modules/mcpContextDiagnostics";
import { appendRuntimeLog } from "../../src/modules/runtimeLogManager";

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-skillrunner-"));
}

function redefineGlobalProperty(key: string, value: unknown) {
  const runtime = globalThis as Record<string, unknown>;
  const previous = Object.getOwnPropertyDescriptor(runtime, key);
  Object.defineProperty(runtime, key, {
    value,
    writable: true,
    configurable: true,
  });
  return previous;
}

function restoreGlobalProperty(key: string, descriptor?: PropertyDescriptor) {
  const runtime = globalThis as Record<string, unknown>;
  if (!descriptor) {
    delete runtime[key];
    return;
  }
  Object.defineProperty(runtime, key, descriptor);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createSkill(
  root: string,
  args?: {
    dependencies?: string[];
    executionModes?: string[];
    declareSchemas?: boolean;
    mcpRequiredTools?: string[];
  },
) {
  const skillDir = path.join(root, "skills", "demo-skill");
  await fs.mkdir(path.join(skillDir, "assets"), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    "# Demo Skill\n\nReturn structured output.\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "output.schema.json"),
    JSON.stringify({
      type: "object",
      required: ["ok"],
      properties: {
        ok: { const: true },
      },
      additionalProperties: true,
    }),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "runner.json"),
    JSON.stringify({
      id: "demo-skill",
      execution_modes: args?.executionModes || ["auto"],
      runtime: {
        dependencies: args?.dependencies || [],
      },
      ...(args?.mcpRequiredTools
        ? {
            mcp: {
              required_tools: args.mcpRequiredTools,
            },
          }
        : {}),
      ...(args?.declareSchemas === false
        ? {}
        : {
            schemas: {
              output: "assets/output.schema.json",
            },
          }),
    }),
    "utf8",
  );
  return {
    skillDir,
    entry: {
      skillId: "demo-skill",
      sourceKind: "user" as const,
      sourceDir: skillDir,
      skillMdPath: path.join(skillDir, "SKILL.md"),
      runnerJsonPath: path.join(skillDir, "assets", "runner.json"),
      checksum: "sha256:test",
      diagnostics: [],
    },
  };
}

function createBackend(args: Partial<BackendInstance> = {}): BackendInstance {
  return {
    id: "acp-codex",
    displayName: "Codex ACP",
    type: "acp",
    baseUrl: "local://acp-codex",
    command: "npx",
    args: ["codex", "acp"],
    auth: { kind: "none" },
    ...args,
  };
}

describe("ACP SkillRunner-compatible runner", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
    resetAcpSkillRunsForTests();
  });

  afterEach(function () {
    resetAcpSkillRunsForTests();
    resetPluginStateStoreForTests();
  });

  it("resolves agent family from backend metadata and builds skill roots", async function () {
    const root = await mkTempRoot();
    const codex = createBackend();
    assert.equal(resolveAcpAgentFamily(codex), "codex");
    assert.deepEqual(
      buildAcpSkillInjectionPlan({ backend: codex, workspaceDir: root }).skillRoots
        .map((entry) => entry.replace(/\\/g, "/"))
        .map((entry) => entry.slice(root.replace(/\\/g, "/").length + 1)),
      [".agents/skills", ".codex/skills"],
    );

    const claude = createBackend({
      id: "backend-acp-claude-code",
      command: "npx",
      args: ["@zed-industries/claude-code-acp@latest"],
    });
    assert.equal(resolveAcpAgentFamily(claude), "claude-code");

    const overridden = createBackend({
      acp: {
        agentFamily: "qwen-code",
        skillRoots: [".custom/skills"],
      },
    });
    const plan = buildAcpSkillInjectionPlan({
      backend: overridden,
      workspaceDir: root,
    });
    assert.equal(plan.family, "qwen-code");
    assert.match(plan.skillRoots[0].replace(/\\/g, "/"), /\.custom\/skills$/);
  });

  it("keeps ACP skill run listing stable by creation time and interrupts without canceling the run", async function () {
    upsertAcpSkillRun({
      requestId: "run-old",
      skillId: "demo-skill",
      taskName: "Older",
      status: "running",
      createdAt: "2026-05-15T08:00:00.000Z",
      updatedAt: "2026-05-15T08:10:00.000Z",
    });
    upsertAcpSkillRun({
      requestId: "run-new",
      skillId: "demo-skill",
      taskName: "Newer",
      status: "running",
      createdAt: "2026-05-15T09:00:00.000Z",
      updatedAt: "2026-05-15T09:00:00.000Z",
    });
    upsertAcpSkillRun({
      requestId: "run-old",
      updatedAt: "2026-05-15T10:00:00.000Z",
      event: { stage: "transcript-update", message: "Updated", level: "info" },
    });
    assert.deepEqual(
      listAcpSkillRuns().map((entry) => entry.requestId),
      ["run-new", "run-old"],
    );

    let interrupted = false;
    registerAcpSkillRunController("run-new", {
      cancel: async () => {
        interrupted = true;
      },
    });
    await interruptAcpSkillRunCurrentTurn("run-new");
    const interruptedRun = getAcpSkillRunRecord("run-new");
    assert.isTrue(interrupted);
    assert.equal(interruptedRun?.status, "running");
    assert.equal(interruptedRun?.events.at(-1)?.stage, "interrupt-requested");
    assert.isUndefined(interruptedRun?.removedAt);
  });

  it("builds Skill-Runner-aligned ACP repair prompts with target contract details", function () {
    const prompt = buildAcpSkillOutputRepairPrompt({
      executionMode: "interactive",
      previousCandidate: "{\"ui_hints\":{\"choices\":[]}}",
      errors: ["pending output requires ui_hints object"],
      repairRound: 1,
      maxRepairRounds: 3,
      outputContractDetails: [
        "### Output Contract Details",
        "#### Pending Branch Contract",
        "- `ui_hints.options`: optional array for choose_one.",
      ].join("\n"),
    });
    assert.include(prompt, "Your previous output did not satisfy the Skill Runner output contract.");
    assert.include(prompt, "Previous candidate:");
    assert.include(prompt, "{\"ui_hints\":{\"choices\":[]}}");
    assert.include(prompt, "Validation errors:");
    assert.include(prompt, "- pending output requires ui_hints object");
    assert.include(prompt, "Target output contract details:");
    assert.include(prompt, "`ui_hints.options`");
    assert.include(prompt, "Do not hand-write result/result.json.");
    assert.include(prompt, "runtime-generated file is allowed");
    assert.include(prompt, "Do not output explanations.");
    assert.include(prompt, "Do not output Markdown fences.");
    assert.notInclude(prompt, "Repair round 1 of 3");
    assert.notInclude(prompt, "Do not use tool calls for this repair");
  });

  it("loads ACP Skill patch templates from packaged asset files", async function () {
    assert.isAtLeast(ACP_SKILL_PATCH_TEMPLATES.length, 9);
    for (const template of ACP_SKILL_PATCH_TEMPLATES) {
      const content = await loadAcpSkillPatchTemplate(template);
      assert.isNotEmpty(content, template.filename);
    }
    const materializerSource = await fs.readFile(
      path.join(process.cwd(), "src/modules/acpThinProxySkillMaterializer.ts"),
      "utf8",
    );
    assert.notInclude(
      materializerSource,
      "This skill is running in interactive mode. A human operator is available and may respond when needed.",
    );
    assert.notInclude(
      materializerSource,
      "To ensure system compatibility, you MUST operate as a headless data provider",
    );
    assert.notInclude(
      materializerSource,
      "The directives below are injected by the runtime execution environment",
    );
  });

  it("loads ACP runtime prompt templates separately from ACP Skill patch templates", async function () {
    assert.sameMembers(
      ACP_RUNTIME_PROMPT_TEMPLATES.map((template) => template.id),
      [
        "mcp_callable_smoke",
        "mcp_required_guard",
        "recovered_continuation_guard",
      ],
    );
    for (const template of ACP_RUNTIME_PROMPT_TEMPLATES) {
      const content = await loadAcpRuntimePromptTemplate(template);
      assert.isNotEmpty(content, template.filename);
    }

    const smokePrompt = renderAcpRuntimePromptTemplate({
      template: await loadAcpRuntimePromptTemplate(
        ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.mcp_callable_smoke,
      ),
      replacements: {
        REQUIRED_TOOLS: "- synthesis.list_topics",
        TIMEOUT_SECONDS: "60",
      },
      requiredPlaceholders: ["REQUIRED_TOOLS", "TIMEOUT_SECONDS"],
    });
    assert.include(smokePrompt, "hard timeout of 60 seconds");
    assert.include(smokePrompt, "- synthesis.list_topics");
    assert.include(smokePrompt, "Do not read project files");
    assert.include(smokePrompt, "search MCP configuration");
    assert.include(smokePrompt, "use shell commands");
    assert.include(smokePrompt, "try CLI/HTTP/file bridge alternatives");

    const guardPrompt = renderAcpRuntimePromptTemplate({
      template: await loadAcpRuntimePromptTemplate(
        ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.mcp_required_guard,
      ),
      replacements: {
        REQUIRED_TOOLS_INLINE: "synthesis.list_topics",
      },
      requiredPlaceholders: ["REQUIRED_TOOLS_INLINE"],
    });
    assert.include(guardPrompt, "The host has already completed MCP availability checks");
    assert.include(guardPrompt, "Required MCP tools: synthesis.list_topics");

    const continuationPrompt = renderAcpRuntimePromptTemplate({
      template: await loadAcpRuntimePromptTemplate(
        ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.recovered_continuation_guard,
      ),
      replacements: {
        EXECUTION_MODE: "interactive",
        INPUT_MANIFEST_PATH: "input.json",
        OUTPUT_BRANCH_INSTRUCTION: "- Return the pending or final branch.",
        REQUESTED_SKILL_ID: "demo-skill",
        RESULT_JSON_PATH: "result/result.json",
        USER_MESSAGE: "continue",
        WORKSPACE_DIR: "workspace",
      },
      requiredPlaceholders: [
        "EXECUTION_MODE",
        "INPUT_MANIFEST_PATH",
        "OUTPUT_BRANCH_INSTRUCTION",
        "REQUESTED_SKILL_ID",
        "RESULT_JSON_PATH",
        "USER_MESSAGE",
        "WORKSPACE_DIR",
      ],
    });
    assert.include(continuationPrompt, "ACP Skills continuation guard");
    assert.include(continuationPrompt, "same remote ACP session");
    assert.include(continuationPrompt, "continue");
  });

  it("inserts ACP proxy patch after YAML frontmatter, including CRLF frontmatter", function () {
    const content = [
      "---\r\n",
      "name: Demo Skill\r\n",
      "---\r\n",
      "# Demo Skill\r\n",
      "\r\n",
      "Return structured output.\r\n",
    ].join("");
    const patched = insertAcpSkillProxyPatchBlock({
      rewrittenSkillMd: content,
      headerPatchBlock: "<!-- zotero-skills-acp-thin-proxy:start -->\nRESOURCE\n<!-- zotero-skills-acp-thin-proxy:end -->",
      footerPatchBlock: "<!-- zotero-skills-acp-runtime-patch:start -->\nRUNTIME\n<!-- zotero-skills-acp-runtime-patch:end -->",
    });

    assert.match(patched, /^---\r?\nname: Demo Skill\r?\n---\r?\n\r?\n<!-- zotero-skills-acp-thin-proxy:start -->/);
    assert.isBelow(
      patched.indexOf("<!-- zotero-skills-acp-thin-proxy:start -->"),
      patched.indexOf("# Demo Skill"),
    );
    assert.isBelow(
      patched.indexOf("# Demo Skill"),
      patched.indexOf("<!-- zotero-skills-acp-runtime-patch:start -->"),
    );
  });

  it("falls back to assets/output.schema.json when runner.json omits schemas.output", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, { declareSchemas: false });
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: (listener: (event: any) => void | Promise<void>) => {
        updateListener = listener;
        return () => {
          updateListener = null;
        };
      },
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => ({ sessionId: "session-fallback-schema" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: JSON.stringify({ __SKILL_DONE__: true, ok: true }),
            },
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => undefined,
    };
    const result = await executeAcpSkillRunnerJob({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backend: createBackend(),
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "demo-skill",
        fetch_type: "bundle",
      },
      dependencies: {
        scanRegistry: async () => ({
          entries: [entry],
          entriesById: { "demo-skill": entry },
          diagnostics: [],
        }),
        createWorkspace: (args) =>
          import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
            mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
          ),
        createAdapter: async () => fakeAdapter,
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    });
    const response = result.responseJson as { requestedSkillProxyPath?: string };
    const proxySkillMd = await fs.readFile(
      path.join(response.requestedSkillProxyPath || "", "SKILL.md"),
      "utf8",
    );
    assert.include(proxySkillMd, "Output schema path:");
    assert.include(proxySkillMd.replace(/\\/g, "/"), "/assets/output.schema.json");
    assert.include(proxySkillMd, "| `ok` | const true | yes | Must equal true. |");
    assert.notInclude(proxySkillMd, "Output schema path: (not declared)");
    assert.notInclude(proxySkillMd, "| `(schema)` | object | yes | Final payload must satisfy the output schema. |");
  });

  it("wraps workflow ACP launch with uv only when dependencies exist", async function () {
    const backend = createBackend({
      command: "npx",
      args: ["codex", "acp"],
      env: { FOO: "bar" },
    });
    assert.deepEqual(
      wrapAcpBackendWithUv({ backend, dependencies: [] }),
      backend,
    );
    const wrapped = wrapAcpBackendWithUv({
      backend,
      dependencies: ["pandas", "numpy==2.0.0"],
    });
    assert.equal(wrapped.command, "uv");
    assert.deepEqual(wrapped.args, [
      "run",
      "--isolated",
      "--with",
      "pandas",
      "--with",
      "numpy==2.0.0",
      "--",
      "npx",
      "codex",
      "acp",
    ]);
    assert.deepEqual(wrapped.env, { FOO: "bar" });
  });

  it("does not wrap dependency plan by default when ACP uv wrapper is disabled", async function () {
    const plan = await buildAcpRuntimeDependencyPlan({
      backend: createBackend(),
      cwd: await mkTempRoot(),
      runnerJson: {
        runtime: {
          dependencies: ["missing-lib"],
        },
      },
      probe: async () => ({ ok: false, summary: "uv missing" }),
    });
    assert.equal(plan.wrapperMode, "disabled");
    assert.equal(plan.probeRequired, false);
    assert.equal(plan.diagnostic?.code, "runtime_dependencies_wrapper_disabled");
    assert.equal(plan.wrappedBackend.command, "npx");
  });

  it("fails required MCP preflight before creating an ACP session when HTTP MCP is unavailable", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      mcpRequiredTools: ["synthesis.list_topics"],
    });
    let newSessionCount = 0;
    let promptCount = 0;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: false,
        canUseSseMcp: false,
      }),
      onUpdate: () => () => undefined,
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => {
        newSessionCount += 1;
        return { sessionId: "session-should-not-start" };
      },
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async () => {
        promptCount += 1;
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => undefined,
    };

    try {
      await executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "bundle",
        },
        dependencies: {
          scanRegistry: async () => ({
            entries: [entry],
            entriesById: { "demo-skill": entry },
            diagnostics: [],
          }),
          createWorkspace: (args) =>
            import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
              mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
            ),
          createAdapter: async () => fakeAdapter,
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });
      assert.fail("expected required MCP preflight to fail");
    } catch (error) {
      assert.include(
        error instanceof Error ? error.message : String(error),
        "HTTP MCP support",
      );
    }
    assert.equal(newSessionCount, 0);
    assert.equal(promptCount, 0);
    const run = listAcpSkillRuns()[0];
    assert.equal(run.status, "failed");
    assert.include(run.error || "", "HTTP MCP support");
    assert.isTrue(
      run.events.some((event) => event.stage === "mcp-preflight-failed"),
    );
  });

  it("fails required MCP preflight before prompt when a declared tool is missing", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      mcpRequiredTools: ["synthesis.missing_tool"],
    });
    let newSessionCount = 0;
    let promptCount = 0;
    let observedRequiredTools: string[] = [];
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: () => () => undefined,
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => {
        newSessionCount += 1;
        return { sessionId: "session-should-not-start" };
      },
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async () => {
        promptCount += 1;
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => undefined,
    };

    try {
      await executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "bundle",
        },
        dependencies: {
          scanRegistry: async () => ({
            entries: [entry],
            entriesById: { "demo-skill": entry },
            diagnostics: [],
          }),
          createWorkspace: (args) =>
            import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
              mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
            ),
          createAdapter: async () => fakeAdapter,
          mcpPreflight: async ({ requiredTools }) => {
            observedRequiredTools = requiredTools;
            return {
              ok: false,
              availableTools: ["synthesis.list_topics"],
              missingTools: ["synthesis.missing_tool"],
              message: "Required Zotero MCP tools are missing: synthesis.missing_tool",
            };
          },
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });
      assert.fail("expected required MCP preflight to fail");
    } catch (error) {
      assert.include(
        error instanceof Error ? error.message : String(error),
        "synthesis.missing_tool",
      );
    }
    assert.deepEqual(observedRequiredTools, ["synthesis.missing_tool"]);
    assert.equal(newSessionCount, 0);
    assert.equal(promptCount, 0);
    const run = listAcpSkillRuns()[0];
    assert.equal(run.status, "failed");
    assert.include(run.error || "", "synthesis.missing_tool");
  });

  it("uses workflow-declared MCP tools for preflight, callable smoke, and the guarded business prompt", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    const promptMessages: string[] = [];
    const order: string[] = [];
    let observedPreflightTools: string[] = [];
    let observedSmokeTools: string[] = [];
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: (listener: (event: any) => void | Promise<void>) => {
        updateListener = listener;
        return () => {
          updateListener = null;
        };
      },
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => ({ sessionId: "session-workflow-mcp" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId, message }) => {
        order.push("prompt");
        promptMessages.push(message);
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: JSON.stringify({ __SKILL_DONE__: true, ok: true }),
            },
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => undefined,
    };

    const result = await executeAcpSkillRunnerJob({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backend: createBackend(),
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "demo-skill",
        fetch_type: "bundle",
        runtime_options: {
          workflow_mcp: {
            required_tools: [
              "synthesis.list_topics",
              "synthesis.export_filtered_paper_artifacts",
            ],
          },
        },
      },
      dependencies: {
        scanRegistry: async () => ({
          entries: [entry],
          entriesById: { "demo-skill": entry },
          diagnostics: [],
        }),
        createWorkspace: (args) =>
          import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
            mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
          ),
        createAdapter: async () => fakeAdapter,
        mcpPreflight: async ({ requiredTools }) => {
          observedPreflightTools = requiredTools;
          return {
            ok: true,
            availableTools: requiredTools,
            missingTools: [],
          };
        },
        mcpCallableSmoke: async ({ requiredTools }) => {
          order.push("smoke");
          observedSmokeTools = requiredTools;
          return {
            ok: true,
            reachedTools: requiredTools,
            missingTools: [],
          };
        },
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    });

    assert.equal(result.status, "succeeded");
    assert.deepEqual(observedPreflightTools, [
      "synthesis.list_topics",
      "synthesis.export_filtered_paper_artifacts",
    ]);
    assert.deepEqual(observedSmokeTools, observedPreflightTools);
    assert.deepEqual(order, ["smoke", "prompt"]);
    assert.lengthOf(promptMessages, 1);
    assert.include(
      promptMessages[0],
      "The host has already completed MCP availability checks",
    );
    assert.include(promptMessages[0], "Do not search MCP configuration");
    assert.include(promptMessages[0], "demo-skill");
  });

  it("fails required MCP runs when callable smoke exceeds the hard timeout", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    let promptCount = 0;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: () => () => undefined,
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => ({ sessionId: "session-workflow-mcp-timeout" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async () => {
        promptCount += 1;
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => undefined,
    };

    try {
      await executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "bundle",
          runtime_options: {
            workflow_mcp: {
              required_tools: ["synthesis.list_topics"],
            },
          },
        },
        dependencies: {
          scanRegistry: async () => ({
            entries: [entry],
            entriesById: { "demo-skill": entry },
            diagnostics: [],
          }),
          createWorkspace: (args) =>
            import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
              mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
            ),
          createAdapter: async () => fakeAdapter,
          mcpPreflight: async ({ requiredTools }) => ({
            ok: true,
            availableTools: requiredTools,
            missingTools: [],
          }),
          mcpCallableSmoke: async () => new Promise(() => undefined),
          mcpCallableSmokeTimeoutMs: 5,
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });
      assert.fail("expected MCP callable smoke timeout to fail the run");
    } catch (error) {
      assert.include(
        error instanceof Error ? error.message : String(error),
        "timed out",
      );
    }
    assert.equal(promptCount, 0, "business prompt should not be sent after smoke timeout");
    const run = listAcpSkillRuns()[0];
    assert.equal(run.status, "failed");
    assert.include(run.error || "", "timed out");
    assert.include(run.error || "", "Diagnostic classification");
    const failedEvent = run.events.find((event) => event.stage === "mcp-smoke-failed");
    assert.equal(
      failedEvent?.details?.diagnosticClassification,
      "descriptor_not_injected",
    );
    assert.isString(failedEvent?.details?.diagnosticFile);
    assert.isString(failedEvent?.details?.evidenceFile);
  });

  it("cancels the active ACP turn when gateway MCP smoke observation times out", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      mcpRequiredTools: ["synthesis.list_topics"],
    });
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: path.join(root, "gateway-timeout"),
      disableHttpServer: true,
    });
    let promptCount = 0;
    let cancelCount = 0;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: () => () => undefined,
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      startMcpSmokeSpan: (args) => gateway.startMcpSmokeSpan(args),
      getMcpGatewayConnectionId: () => gateway.connectionId,
      getMcpGatewayTransportKinds: () => ["http"],
      newSession: async () => ({ sessionId: "session-gateway-timeout" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async () => {
        promptCount += 1;
        return new Promise(() => undefined);
      },
      cancel: async () => {
        cancelCount += 1;
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        await gateway.close();
      },
    };

    try {
      await executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "bundle",
        },
        dependencies: {
          scanRegistry: async () => ({
            entries: [entry],
            entriesById: { "demo-skill": entry },
            diagnostics: [],
          }),
          createWorkspace: (args) =>
            import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
              mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
            ),
          createAdapter: async () => fakeAdapter,
          mcpPreflight: async ({ requiredTools }) => ({
            ok: true,
            availableTools: requiredTools,
            missingTools: [],
          }),
          mcpCallableSmokeTimeoutMs: 5,
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });
      assert.fail("expected gateway smoke timeout");
    } catch (error) {
      assert.include(
        error instanceof Error ? error.message : String(error),
        "timed out",
      );
    }

    assert.equal(promptCount, 1);
    assert.equal(cancelCount, 1);
    const run = listAcpSkillRuns()[0];
    const failedEvent = run.events.find((event) => event.stage === "mcp-smoke-failed");
    assert.equal(failedEvent?.details?.decisionSource, "mcp-gateway");
    assert.deepEqual(failedEvent?.details?.missingTools, ["synthesis.list_topics"]);
  });

  it("passes required MCP smoke from gateway observations without transcript or runtime logs", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      mcpRequiredTools: ["synthesis.list_topics"],
    });
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: path.join(root, "gateway"),
      disableHttpServer: true,
    });
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let promptCount = 0;
    let smokePrompt = "";
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: (listener: (event: any) => void | Promise<void>) => {
        updateListener = listener;
        return () => {
          updateListener = null;
        };
      },
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      startMcpSmokeSpan: (args) => gateway.startMcpSmokeSpan(args),
      getMcpGatewayConnectionId: () => gateway.connectionId,
      getMcpGatewayTransportKinds: () => ["http"],
      newSession: async () => ({ sessionId: "session-runtime-smoke" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId, message }) => {
        promptCount += 1;
        if (promptCount === 1) {
          smokePrompt = message;
          gateway.observeToolCall({
            toolName: "synthesis.list_topics",
            connectionId: gateway.connectionId,
          });
          return { stopReason: "end_turn" };
        }
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: JSON.stringify({ __SKILL_DONE__: true, ok: true }),
            },
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        await gateway.close();
      },
    };

    const result = await executeAcpSkillRunnerJob({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backend: createBackend(),
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "demo-skill",
        fetch_type: "bundle",
      },
      dependencies: {
        scanRegistry: async () => ({
          entries: [entry],
          entriesById: { "demo-skill": entry },
          diagnostics: [],
        }),
        createWorkspace: (args) =>
          import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
            mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
          ),
        createAdapter: async () => fakeAdapter,
        mcpPreflight: async ({ requiredTools }) => ({
          ok: true,
          availableTools: requiredTools,
          missingTools: [],
        }),
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    });

    assert.equal(result.status, "succeeded");
    const run = listAcpSkillRuns()[0];
    const smokeEvent = run.events.find((event) => event.stage === "mcp-smoke-ok");
    assert.deepEqual(smokeEvent?.details?.reachedTools, ["synthesis.list_topics"]);
    assert.deepEqual(smokeEvent?.details?.missingTools, []);
    assert.equal(smokeEvent?.details?.decisionSource, "mcp-gateway");
    assert.equal(smokeEvent?.details?.connectionId, gateway.connectionId);
    assert.include(smokePrompt, "mcp__zotero__synthesis_list_topics");
    assert.include(smokePrompt, "Do not invent dotted callable names");
    assert.include(smokePrompt, "mcp__zotero__synthesis.list_topics");
  });

  it("clears the MCP smoke timeout as soon as gateway observation is complete", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      mcpRequiredTools: ["synthesis.list_topics"],
    });
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: path.join(root, "gateway-clear-timeout"),
      disableHttpServer: true,
    });
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let promptCount = 0;
    let cancelCount = 0;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: (listener: (event: any) => void | Promise<void>) => {
        updateListener = listener;
        return () => {
          updateListener = null;
        };
      },
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      startMcpSmokeSpan: (args) => gateway.startMcpSmokeSpan(args),
      getMcpGatewayConnectionId: () => gateway.connectionId,
      getMcpGatewayTransportKinds: () => ["http"],
      newSession: async () => ({ sessionId: "session-clear-timeout" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        promptCount += 1;
        if (promptCount === 1) {
          gateway.observeToolCall({
            toolName: "synthesis.list_topics",
            connectionId: gateway.connectionId,
          });
          await delay(30);
          return { stopReason: "end_turn" };
        }
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: JSON.stringify({ __SKILL_DONE__: true, ok: true }),
            },
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => {
        cancelCount += 1;
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        await gateway.close();
      },
    };

    const result = await executeAcpSkillRunnerJob({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backend: createBackend(),
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "demo-skill",
        fetch_type: "bundle",
      },
      dependencies: {
        scanRegistry: async () => ({
          entries: [entry],
          entriesById: { "demo-skill": entry },
          diagnostics: [],
        }),
        createWorkspace: (args) =>
          import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
            mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
          ),
        createAdapter: async () => fakeAdapter,
        mcpPreflight: async ({ requiredTools }) => ({
          ok: true,
          availableTools: requiredTools,
          missingTools: [],
        }),
        mcpCallableSmokeTimeoutMs: 5,
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    });

    assert.equal(result.status, "succeeded");
    assert.equal(cancelCount, 0);
    assert.equal(promptCount, 2);
  });

  it("does not use global runtime logs as MCP smoke decision evidence", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const gateway = createAcpMcpGatewayConnection({
      runtimeDir: path.join(root, "gateway-runtime-log"),
      disableHttpServer: true,
    });
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: () => () => undefined,
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      startMcpSmokeSpan: (args) => gateway.startMcpSmokeSpan(args),
      getMcpGatewayConnectionId: () => gateway.connectionId,
      getMcpGatewayTransportKinds: () => ["http"],
      newSession: async () => ({ sessionId: "session-partial-smoke-timeout" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async () => {
        appendRuntimeLog({
          level: "info",
          scope: "provider",
          component: "zotero-mcp",
          stage: "tool.finished",
          message: "Zotero MCP tool.finished",
          details: {
            jsonrpcMethod: "tools/call",
            toolName: "synthesis.list_topics",
            toolOutcome: "success",
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        await gateway.close();
      },
    };

    try {
      await executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "bundle",
          runtime_options: {
            workflow_mcp: {
              required_tools: [
                "synthesis.list_topics",
                "synthesis.get_library_index",
              ],
            },
          },
        },
        dependencies: {
          scanRegistry: async () => ({
            entries: [entry],
            entriesById: { "demo-skill": entry },
            diagnostics: [],
          }),
          createWorkspace: (args) =>
            import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
              mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
            ),
          createAdapter: async () => fakeAdapter,
          mcpPreflight: async ({ requiredTools }) => ({
            ok: true,
            availableTools: requiredTools,
            missingTools: [],
          }),
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });
      assert.fail("expected MCP callable smoke to fail without gateway observation");
    } catch (error) {
      assert.include(
        error instanceof Error ? error.message : String(error),
        "synthesis.list_topics",
      );
    }

    const run = listAcpSkillRuns()[0];
    const failedEvent = run.events.find((event) => event.stage === "mcp-smoke-failed");
    assert.deepEqual(failedEvent?.details?.reachedTools, []);
    assert.deepEqual(failedEvent?.details?.missingTools, [
      "synthesis.list_topics",
      "synthesis.get_library_index",
    ]);
    assert.equal(failedEvent?.details?.decisionSource, "mcp-gateway");
    assert.equal(
      failedEvent?.details?.diagnosticClassification,
      "smoke_timeout_unclassified",
    );
  });

  it("writes backend-agnostic MCP diagnostics from provider discovery evidence", async function () {
    const root = await mkTempRoot();
    const workspaceDir = path.join(root, "run");
    await fs.mkdir(workspaceDir, { recursive: true });
    upsertAcpSkillRun({
      requestId: "run-mcp-diagnostics",
      backendId: "backend-claude",
      backendType: "acp",
      agentFamily: "claude-code",
      workspaceDir,
      event: {
        stage: "acp-mcp_server_injected",
        message: "Injected embedded Zotero MCP server",
        level: "info",
        details: {
          detail: JSON.stringify({
            name: "zotero",
            type: "http",
            url: "http://127.0.0.1:26531/mcp",
            headers: [{ name: "Authorization", value: "Bearer secret-token" }],
          }),
        },
      },
    });

    const result = await writeMcpContextInjectionDiagnostics({
      backend: createBackend({
        id: "backend-claude",
        type: "acp",
      }),
      requestId: "run-mcp-diagnostics",
      sessionId: "session-1",
      workspaceDir,
      preflight: {
        ok: true,
        availableTools: ["synthesis.list_topics"],
        missingTools: [],
      },
      smoke: {
        ok: false,
        reachedTools: [],
        missingTools: ["synthesis.list_topics"],
        decisionSource: "mcp-gateway",
        connectionId: "connection-1",
        smokeAttemptId: "smoke-1",
        transportKinds: ["http"],
      },
      timeoutMs: 120000,
      adapterDiagnostics: [
        {
          id: "diag-1",
          ts: new Date().toISOString(),
          kind: "backend-debug",
          level: "error",
          message: 'MCP server "zotero" Failed to fetch tools: terminated',
          detail: 'HTTP connection dropped after 0s uptime Authorization: Bearer secret-token',
        },
      ],
    });

    assert.equal(result.diagnostics.classification, "smoke_timeout_unclassified");
    assert.equal(result.diagnostics.callableSmoke.decisionSource, "mcp-gateway");
    const diagnosticText = await fs.readFile(result.diagnosticFile, "utf8");
    const evidenceText = await fs.readFile(result.evidenceFile, "utf8");
    assert.notInclude(diagnosticText, "secret-token");
    assert.notInclude(evidenceText, "secret-token");
    assert.include(diagnosticText, "nonDecisionEvidence");
    assert.include(
      JSON.stringify(result.diagnostics.nonDecisionEvidence),
      "Failed to fetch tools",
    );
  });

  it("retains transcript tool absence only as non-decision evidence", async function () {
    const root = await mkTempRoot();
    const workspaceDir = path.join(root, "run");
    await fs.mkdir(workspaceDir, { recursive: true });
    upsertAcpSkillRun({
      requestId: "run-mcp-absent",
      backendId: "backend-any",
      backendType: "acp",
      workspaceDir,
      event: {
        stage: "acp-mcp_server_injected",
        message: "Injected embedded Zotero MCP server",
        level: "info",
      },
    });
    upsertAcpSkillRun({
      requestId: "run-mcp-absent",
      event: {
        stage: "transcript-observed",
        message:
          "No such tool available: mcp__zotero__synthesis_list_topics",
        level: "error",
      },
    });

    const result = await writeMcpContextInjectionDiagnostics({
      backend: createBackend({ id: "backend-any" }),
      requestId: "run-mcp-absent",
      sessionId: "session-absent",
      workspaceDir,
      preflight: {
        ok: true,
        availableTools: ["synthesis.list_topics"],
        missingTools: [],
      },
      smoke: {
        ok: false,
        reachedTools: [],
        missingTools: ["synthesis.list_topics"],
        decisionSource: "mcp-gateway",
        connectionId: "connection-absent",
        smokeAttemptId: "smoke-absent",
        transportKinds: ["http"],
      },
      timeoutMs: 120000,
    });

    assert.equal(result.diagnostics.classification, "smoke_timeout_unclassified");
    assert.include(
      JSON.stringify(result.diagnostics.nonDecisionEvidence),
      "No such tool available",
    );
  });

  it("does not classify observed MCP tool calls as descriptor injection failure", async function () {
    const root = await mkTempRoot();
    const workspaceDir = path.join(root, "run");
    await fs.mkdir(workspaceDir, { recursive: true });
    upsertAcpSkillRun({
      requestId: "run-mcp-observed",
      backendId: "backend-any",
      backendType: "acp",
      workspaceDir,
    });

    const result = await writeMcpContextInjectionDiagnostics({
      backend: createBackend({ id: "backend-any" }),
      requestId: "run-mcp-observed",
      sessionId: "session-observed",
      workspaceDir,
      preflight: {
        ok: true,
        availableTools: ["synthesis.list_topics"],
        missingTools: [],
      },
      smoke: {
        ok: false,
        reachedTools: ["synthesis.list_topics"],
        missingTools: [],
      },
      timeoutMs: 60000,
      adapterDiagnostics: [
        {
          id: "diag-tool-call",
          ts: new Date().toISOString(),
          kind: "zotero_mcp_tool_call",
          level: "info",
          message: "Zotero MCP tool call synthesis.list_topics",
          detail: JSON.stringify({ ok: true }),
        },
      ],
    });

    assert.equal(
      result.diagnostics.classification,
      "tool_call_observed_but_smoke_failed",
    );
    assert.isTrue(
      result.diagnostics.observedToolEvents.some((event) =>
        event.tags.includes("tool_call_observed"),
      ),
    );
  });

  it("documents bounded MCP callable smoke behavior in the smoke prompt", async function () {
    const smokePrompt = await loadAcpRuntimePromptTemplate(
      ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.mcp_callable_smoke,
    );
    const orchestratorSource = await fs.readFile(
      "src/modules/acpSkillRunnerOrchestrator.ts",
      "utf8",
    );

    assert.include(orchestratorSource, "MCP_CALLABLE_SMOKE_TIMEOUT_MS = 120_000");
    assert.include(orchestratorSource, "claudeStyleZoteroMcpCallableAlias");
    assert.include(orchestratorSource, "mcp__zotero__");
    assert.include(orchestratorSource, "loadAcpRuntimePromptTemplate");
    assert.notInclude(
      orchestratorSource,
      "try CLI/HTTP/file bridge alternatives.",
    );
    assert.include(smokePrompt, "hard timeout");
    assert.include(smokePrompt, "Only try the listed tool callables");
    assert.include(smokePrompt, "Do not invent dotted callable names");
    assert.include(smokePrompt, "replace punctuation with underscores");
    assert.include(smokePrompt, "search MCP configuration");
    assert.include(smokePrompt, "use shell commands");
    assert.include(smokePrompt, "try CLI/HTTP/file bridge alternatives");
    assert.include(smokePrompt, "repeatedly try alternate access paths");
  });

  it("fails dependency plan when explicit uv probe-and-wrap mode fails", async function () {
    const plan = await buildAcpRuntimeDependencyPlan({
      backend: createBackend(),
      cwd: await mkTempRoot(),
      mode: "probe-and-wrap",
      runnerJson: {
        runtime: {
          dependencies: ["missing-lib"],
        },
      },
      probe: async () => ({ ok: false, summary: "uv missing" }),
    });
    assert.equal(plan.wrapperMode, "probe-and-wrap");
    assert.equal(plan.diagnostic?.code, "runtime_dependencies_injection_failed");
    assert.equal(plan.wrappedBackend.command, "npx");
  });

  it("wraps dependency plan only in explicit uv probe-and-wrap mode", async function () {
    const plan = await buildAcpRuntimeDependencyPlan({
      backend: createBackend(),
      cwd: await mkTempRoot(),
      mode: "probe-and-wrap",
      runnerJson: {
        runtime: {
          dependencies: ["pandas"],
        },
      },
      probe: async () => ({ ok: true }),
    });
    assert.equal(plan.wrapperMode, "probe-and-wrap");
    assert.equal(plan.diagnostic?.code, "runtime_dependencies_injection_ready");
    assert.equal(plan.wrappedBackend.command, "uv");
  });

  it("resolves the original ACP command before passing it to uv", async function () {
    const root = await mkTempRoot();
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
    });
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      exists: async (targetPath: string) =>
        /C:\\Program Files\\nodejs\\npx\.cmd$/i.test(targetPath),
    });
    try {
      const plan = await buildAcpRuntimeDependencyPlan({
        backend: createBackend({
          command: "npx",
          args: ["codex", "acp"],
        }),
        cwd: root,
        mode: "probe-and-wrap",
        runnerJson: {
          runtime: {
            dependencies: ["pandas"],
          },
        },
        probe: async () => ({ ok: true }),
      });

      assert.equal(plan.wrappedBackend.command, "uv");
      assert.deepEqual(plan.wrappedBackend.args?.slice(0, 5), [
        "run",
        "--isolated",
        "--with",
        "pandas",
        "--",
      ]);
      assert.equal(
        plan.wrappedBackend.args?.[5],
        "C:\\Program Files\\nodejs\\npx.cmd",
      );
      assert.deepEqual(plan.wrappedBackend.args?.slice(6), ["codex", "acp"]);
    } finally {
      restoreGlobalProperty("IOUtils", previousIOUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("uses Zotero Mozilla Subprocess for the default uv dependency probe", async function () {
    const root = await mkTempRoot();
    const resolvedUvPath = path.join(
      root,
      process.platform === "win32" ? "uv.cmd" : "uv",
    );
    await fs.writeFile(resolvedUvPath, "", "utf8");
    const calls: Array<{
      command: string;
      arguments?: string[];
      environment?: Record<string, string>;
      environmentAppend?: boolean;
      workdir?: string;
    }> = [];
    const previousChromeUtils = redefineGlobalProperty("ChromeUtils", {
      import: () => ({
        Subprocess: {
          pathSearch: async (command: string) =>
            command === "uv" ? resolvedUvPath : null,
          call: async (args: {
            command: string;
            arguments?: string[];
            environment?: Record<string, string>;
            environmentAppend?: boolean;
            workdir?: string;
          }) => {
            calls.push(args);
            return {
              stdout: { readString: async () => "" },
              stderr: { readString: async () => "" },
              wait: async () => ({ exitCode: 0 }),
              kill: () => undefined,
            };
          },
        },
      }),
    });
    try {
      const result = await defaultAcpRuntimeDependencyProbe({
        dependencies: ["pandas"],
        cwd: root,
        env: { FOO: "bar" },
        timeoutMs: 1000,
      });
      assert.equal(result.ok, true);
      assert.lengthOf(calls, 1);
      if (process.platform === "win32") {
        assert.match(calls[0].command, /cmd\.exe$/i);
        assert.deepEqual(calls[0].arguments?.slice(0, 2), ["/d", "/c"]);
        assert.include(calls[0].arguments?.[2] || "", "uv run --isolated --with pandas");
        assert.include(calls[0].arguments?.[2] || "", "python --version");
      } else {
        assert.equal(calls[0].command, resolvedUvPath);
        assert.deepEqual(calls[0].arguments, [
          "run",
          "--isolated",
          "--with",
          "pandas",
          "--",
          "python",
          "--version",
        ]);
      }
      assert.equal(calls[0].environment?.FOO, "bar");
      assert.equal(calls[0].environmentAppend, true);
    } finally {
      restoreGlobalProperty("ChromeUtils", previousChromeUtils);
    }
  });

  it("resolves uv from user-local bin for Zotero internal subprocess probes", async function () {
    const root = await mkTempRoot();
    const previousUserProfile = process.env.USERPROFILE;
    process.env.USERPROFILE = "C:\\Users\\tester";
    const calls: Array<{ command: string; args?: string[] }> = [];
    const previousZotero = redefineGlobalProperty("Zotero", {
      isWin: true,
      Utilities: {
        Internal: {
          subprocess: async (command: string, args?: string[]) => {
            calls.push({ command, args });
            if (/powershell|pwsh/i.test(command)) {
              throw new Error("PowerShell path search intentionally unavailable");
            }
            return "Python 3.13.0";
          },
        },
      },
    });
    const previousIOUtils = redefineGlobalProperty("IOUtils", {
      exists: async (targetPath: string) =>
        /C:\\Users\\tester\\.local\\bin\\uv\.exe$/i.test(targetPath),
    });
    try {
      const result = await defaultAcpRuntimeDependencyProbe({
        dependencies: ["pandas"],
        cwd: root,
        env: {},
        timeoutMs: 1000,
      });

      assert.equal(result.ok, true);
      assert.isAtLeast(calls.length, 1);
      const probeCall = calls[calls.length - 1];
      assert.equal(probeCall.command, "C:\\Users\\tester\\.local\\bin\\uv.exe");
      assert.deepEqual(probeCall.args, [
        "run",
        "--isolated",
        "--with",
        "pandas",
        "--",
        "python",
        "--version",
      ]);
    } finally {
      if (previousUserProfile === undefined) {
        delete process.env.USERPROFILE;
      } else {
        process.env.USERPROFILE = previousUserProfile;
      }
      restoreGlobalProperty("IOUtils", previousIOUtils);
      restoreGlobalProperty("Zotero", previousZotero);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("allows acp.skill.run.v1 to resolve to ACP provider for ACP backend", function () {
    const provider = resolveProvider({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backend: createBackend(),
    });
    assert.equal(provider.id, "acp");
  });

  it("keeps physical ACP skill run workspace short and independent from task labels", async function () {
    const root = await mkTempRoot();
    try {
      const workspace = await createAcpSkillRunnerWorkspace({
        rootDir: root,
        backendId: "backend-acp-claude-code-acp-e29l768mbmft",
        workflowId: "literature-digest",
        jobId: "Lin 等 - 2021 - DETR for crowd pedestrian detection.md",
      });

      const normalized = workspace.workspaceDir.replace(/\\/g, "/");
      assert.match(normalized, /\/acp-skill-[^/]+$/);
      assert.notInclude(normalized, "backend-acp-claude-code");
      assert.notInclude(normalized, "literature-digest");
      assert.notInclude(normalized, "DETR-for-crowd");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("exposes and resolves ACP permission requests through the run store", function () {
    let resolved: unknown = null;
    setAcpSkillRunPermissionRequest("run-permission", {
      requestId: "permission-1",
      sessionId: "session-1",
      toolCallId: "tool-1",
      toolTitle: "Run shell command",
      requestedAt: "2026-04-28T00:00:00.000Z",
      options: [
        {
          optionId: "approve",
          kind: "allow_once",
          name: "Approve",
        },
      ],
      resolve: (outcome) => {
        resolved = outcome;
      },
    });
    const pending = buildAcpSkillRunPanelSnapshot({
      selectedRequestId: "run-permission",
    }).selectedRun;
    assert.equal(pending?.pendingPermission?.requestId, "permission-1");
    assert.equal(pending?.pendingPermission?.toolTitle, "Run shell command");
    const pendingPermissionItems = (pending?.transcriptItems || []).filter(
      (item: any) => item.kind === "permission",
    );
    assert.lengthOf(pendingPermissionItems, 1);
    assert.equal((pendingPermissionItems[0] as any).status, "pending");
    assert.equal((pendingPermissionItems[0] as any).summary, "Run shell command");

    resolveAcpSkillRunPermissionRequest({
      runRequestId: "run-permission",
      permissionRequestId: "permission-1",
      outcome: "selected",
      optionId: "approve",
    });
    assert.deepEqual(resolved, {
      outcome: "selected",
      optionId: "approve",
    });
    const resolvedSnapshot = buildAcpSkillRunPanelSnapshot({
      selectedRequestId: "run-permission",
    }).selectedRun;
    assert.isNull(resolvedSnapshot?.pendingPermission);
    const resolvedPermissionItems = (resolvedSnapshot?.transcriptItems || []).filter(
      (item: any) => item.kind === "permission",
    );
    assert.lengthOf(resolvedPermissionItems, 1);
    assert.equal((resolvedPermissionItems[0] as any).status, "approved");
    assert.isFalse(
      (resolvedSnapshot?.transcriptItems || []).some(
        (item: any) => item.kind === "status" && item.label === "permission-resolved",
      ),
    );
  });

  it("allows ACP skill run mode changes during active prompts but rejects model and reasoning changes", async function () {
    const requestId = "run-runtime-active";
    const modeSelections: string[] = [];
    const modelSelections: string[] = [];
    upsertAcpSkillRun({
      requestId,
      status: "running",
      sessionId: "session-runtime-active",
      conversationState: "active",
      conversationRecoveryState: "connected",
      activePrompt: true,
      acpModeId: "code",
      acpModelId: "gpt-5",
      acpReasoningEffort: "medium",
      acpRawModelId: "gpt-5@medium",
    });
    setAcpSkillRunRuntimeOptions(requestId, {
      modeOptions: [
        { id: "code", label: "Code" },
        { id: "plan", label: "Plan" },
      ],
      modelOptions: [
        { id: "gpt-5@medium", label: "GPT-5 Medium" },
        { id: "gpt-5@high", label: "GPT-5 High" },
      ],
      displayModelOptions: [{ id: "gpt-5", label: "GPT-5" }],
      reasoningEffortOptions: [
        { id: "medium", label: "Medium" },
        { id: "high", label: "High" },
      ],
    });
    registerAcpSkillRunController(requestId, {
      cancel: async () => undefined,
      setMode: async ({ sessionId, modeId }) => {
        modeSelections.push(`${sessionId}:${modeId}`);
      },
      setModel: async ({ sessionId, modelId }) => {
        modelSelections.push(`${sessionId}:${modelId}`);
      },
    });

    await setAcpSkillRunMode({ requestId, modeId: "plan" });
    assert.deepEqual(modeSelections, ["session-runtime-active:plan"]);
    assert.equal(getAcpSkillRunRecord(requestId)?.acpModeId, "plan");

    try {
      await setAcpSkillRunModel({ requestId, modelId: "gpt-5" });
      assert.fail("expected active prompt model change to be rejected");
    } catch (error) {
      assert.include(
        error instanceof Error ? error.message : String(error),
        "prompt is running",
      );
    }
    try {
      await setAcpSkillRunReasoningEffort({ requestId, effortId: "high" });
      assert.fail("expected active prompt reasoning change to be rejected");
    } catch (error) {
      assert.include(
        error instanceof Error ? error.message : String(error),
        "prompt is running",
      );
    }
    assert.deepEqual(modelSelections, []);
  });

  it("maps ACP skill run model and reasoning changes to raw model ids outside active prompts", async function () {
    const requestId = "run-runtime-idle";
    const modelSelections: string[] = [];
    upsertAcpSkillRun({
      requestId,
      status: "waiting_user",
      sessionId: "session-runtime-idle",
      conversationState: "active",
      conversationRecoveryState: "connected",
      activePrompt: false,
      acpModeId: "code",
      acpModelId: "gpt-5",
      acpReasoningEffort: "medium",
      acpRawModelId: "gpt-5@medium",
    });
    setAcpSkillRunRuntimeOptions(requestId, {
      modeOptions: [{ id: "code", label: "Code" }],
      modelOptions: [
        { id: "gpt-5@medium", label: "GPT-5 Medium" },
        { id: "gpt-5@high", label: "GPT-5 High" },
        { id: "claude-4@default", label: "Claude 4 Default" },
        { id: "claude-4@high", label: "Claude 4 High" },
      ],
      displayModelOptions: [
        { id: "gpt-5", label: "GPT-5" },
        { id: "claude-4", label: "Claude 4" },
      ],
      reasoningEffortOptions: [
        { id: "default", label: "Default" },
        { id: "medium", label: "Medium" },
        { id: "high", label: "High" },
      ],
    });
    registerAcpSkillRunController(requestId, {
      cancel: async () => undefined,
      setModel: async ({ sessionId, modelId }) => {
        modelSelections.push(`${sessionId}:${modelId}`);
      },
    });

    await setAcpSkillRunReasoningEffort({ requestId, effortId: "high" });
    assert.deepEqual(modelSelections, ["session-runtime-idle:gpt-5@high"]);
    assert.equal(getAcpSkillRunRecord(requestId)?.acpReasoningEffort, "high");
    assert.equal(getAcpSkillRunRecord(requestId)?.acpRawModelId, "gpt-5@high");

    await setAcpSkillRunModel({ requestId, modelId: "claude-4" });
    assert.deepEqual(modelSelections, [
      "session-runtime-idle:gpt-5@high",
      "session-runtime-idle:claude-4@high",
    ]);
    assert.equal(getAcpSkillRunRecord(requestId)?.acpModelId, "claude-4");
    assert.equal(getAcpSkillRunRecord(requestId)?.acpReasoningEffort, "high");
    assert.equal(getAcpSkillRunRecord(requestId)?.acpRawModelId, "claude-4@high");
  });

  it("marks tool updates with output payload as completed when ACP omits status", function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-tool-output",
      status: "running",
      backendId: "backend-acp",
      backendType: "acp",
    });
    recordAcpSkillRunSessionUpdate("run-tool-output", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Run command",
        status: "pending",
        input: { command: "echo ok" },
      },
    } as any);
    recordAcpSkillRunSessionUpdate("run-tool-output", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: "tool-1",
        output: { ok: true },
      },
    } as any);

    const tool = getAcpSkillRunRecord("run-tool-output")?.transcriptItems.find(
      (item) => item.kind === "tool_call" && item.toolCallId === "tool-1",
    );
    assert.equal(tool?.kind, "tool_call");
    if (tool?.kind === "tool_call") {
      assert.equal(tool.state, "completed");
      assert.include(tool.resultSummary || "", "ok");
    }
  });

  it("surfaces workspace activity as visible status while ACP prompt is active", function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-workspace-activity",
      status: "running",
      backendId: "backend-acp",
      backendType: "acp",
      activePrompt: true,
      event: {
        stage: "workspace-activity",
        message: "Workspace file updated while agent is working: digest_payload.json",
        level: "info",
        details: {
          path: "D:/runtime/acp/skill-runs/run-1/result/digest_payload.json",
          relativePath: "result/digest_payload.json",
        },
      },
    });

    const statusItem = getAcpSkillRunRecord("run-workspace-activity")?.transcriptItems.find(
      (item) => item.kind === "status" && item.label === "workspace-activity",
    );
    assert.equal(statusItem?.kind, "status");
    if (statusItem?.kind === "status") {
      assert.equal((statusItem as any).details?.relativePath, "result/digest_payload.json");
      assert.equal(statusItem.text, "result/digest_payload.json");
    }
  });

  it("keeps assistant streaming message contiguous around workspace activity", function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-stream-workspace-activity",
      status: "running",
      backendId: "backend-acp",
      backendType: "acp",
      activePrompt: true,
    });
    recordAcpSkillRunSessionUpdate("run-stream-workspace-activity", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "first " },
      },
    } as any);
    upsertAcpSkillRun({
      requestId: "run-stream-workspace-activity",
      event: {
        stage: "workspace-activity",
        message: "result/output.json",
        level: "info",
        details: { relativePath: "result/output.json" },
      },
    });
    recordAcpSkillRunSessionUpdate("run-stream-workspace-activity", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "second" },
      },
    } as any);

    const transcript = getAcpSkillRunRecord("run-stream-workspace-activity")?.transcriptItems || [];
    const assistantMessages = transcript.filter(
      (item) => item.kind === "message" && item.role === "assistant",
    );
    assert.lengthOf(assistantMessages, 1);
    assert.equal(assistantMessages[0].text, "first second");
    assert.isTrue(
      transcript.some((item) => item.kind === "status" && item.label === "workspace-activity"),
    );
  });

  it("keeps tool calls as assistant streaming message boundaries around workspace activity", function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-stream-tool-boundary",
      status: "running",
      backendId: "backend-acp",
      backendType: "acp",
      activePrompt: true,
    });
    recordAcpSkillRunSessionUpdate("run-stream-tool-boundary", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "first thinking" },
      },
    } as any);
    recordAcpSkillRunSessionUpdate("run-stream-tool-boundary", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "tool_call",
        toolCallId: "tool-1",
        title: "Edit file",
        status: "pending",
      },
    } as any);
    recordAcpSkillRunSessionUpdate("run-stream-tool-boundary", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "second " },
      },
    } as any);
    upsertAcpSkillRun({
      requestId: "run-stream-tool-boundary",
      event: {
        stage: "workspace-activity",
        message: "runtime/file.json",
        level: "info",
        details: { relativePath: "runtime/file.json" },
      },
    });
    recordAcpSkillRunSessionUpdate("run-stream-tool-boundary", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "thinking" },
      },
    } as any);

    const transcript = getAcpSkillRunRecord("run-stream-tool-boundary")?.transcriptItems || [];
    const assistantMessages = transcript.filter(
      (item) => item.kind === "message" && item.role === "assistant",
    );
    assert.lengthOf(assistantMessages, 2);
    assert.equal(assistantMessages[0].text, "first thinking");
    assert.equal(assistantMessages[0].state, "complete");
    assert.equal(assistantMessages[1].text, "second thinking");
    assert.isTrue(transcript.some((item) => item.kind === "tool_call" && item.toolCallId === "tool-1"));
    assert.isTrue(
      transcript.some((item) => item.kind === "status" && item.label === "workspace-activity"),
    );
  });

  it("keeps low-signal ACP skill success events out of transcript", function () {
    resetAcpSkillRunsForTests();
    for (const stage of [
      "acp-session-created",
      "acp-prompt-finished",
      "output-validation-succeeded",
      "recovered-output-validation-succeeded",
      "repair-validation-succeeded",
    ]) {
      upsertAcpSkillRun({
        requestId: "run-noise",
        status: "running",
        backendId: "backend-acp",
        backendType: "acp",
        event: {
          stage,
          message: `${stage} message`,
          level: "info",
        },
      });
    }
    const transcript = getAcpSkillRunRecord("run-noise")?.transcriptItems || [];
    assert.isFalse(
      transcript.some((item: any) =>
        item.kind === "status" && [
          "acp-session-created",
          "acp-prompt-finished",
          "output-validation-succeeded",
          "recovered-output-validation-succeeded",
          "repair-validation-succeeded",
        ].includes(item.label),
      ),
    );
  });

  it("keeps ACP Skills panel run list lightweight while selectedRun stays complete", function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-lightweight-list-a",
      status: "running",
      backendId: "backend-acp",
      backendType: "acp",
      workflowLabel: "Workflow A",
      taskName: "Task A",
      event: {
        stage: "created",
        message: "Created run A.",
        level: "info",
      },
    });
    recordAcpSkillRunSessionUpdate("run-lightweight-list-a", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_thought_chunk",
        content: { type: "text", text: "Thinking A" },
      },
    } as any);
    upsertAcpSkillRun({
      requestId: "run-lightweight-list-b",
      status: "failed",
      backendId: "backend-acp",
      backendType: "acp",
      workflowLabel: "Workflow B",
      taskName: "Task B",
      event: {
        stage: "failed",
        message: "Failed run B.",
        level: "error",
      },
    });

    const snapshot = buildAcpSkillRunPanelSnapshot({
      selectedRequestId: "run-lightweight-list-a",
    });
    assert.equal(snapshot.selectedRun?.requestId, "run-lightweight-list-a");
    assert.isAtLeast(snapshot.selectedRun?.transcriptItems.length || 0, 1);
    assert.isAtLeast(snapshot.selectedRun?.events.length || 0, 1);
    const listed = snapshot.runs.find((run) => run.requestId === "run-lightweight-list-a") as any;
    assert.equal(listed.workflowLabel, "Workflow A");
    assert.equal(listed.taskName, "Task A");
    assert.notProperty(listed, "transcriptItems");
    assert.notProperty(listed, "events");
    assert.notProperty(listed, "outputRevisions");
    assert.notProperty(listed, "resultJson");
  });

  it("coalesces high-frequency ACP skill session update notifications without dropping transcript data", async function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-coalesced-updates",
      status: "running",
      backendId: "backend-acp",
      backendType: "acp",
    });
    let notifications = 0;
    const unsubscribe = subscribeAcpSkillRunSnapshots(() => {
      notifications += 1;
    });
    try {
      recordAcpSkillRunSessionUpdate("run-coalesced-updates", {
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_thought_chunk",
          content: { type: "text", text: "A" },
        },
      } as any);
      recordAcpSkillRunSessionUpdate("run-coalesced-updates", {
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_thought_chunk",
          content: { type: "text", text: "B" },
        },
      } as any);
      recordAcpSkillRunSessionUpdate("run-coalesced-updates", {
        sessionId: "session-1",
        update: {
          sessionUpdate: "agent_thought_chunk",
          content: { type: "text", text: "C" },
        },
      } as any);
      assert.equal(notifications, 0);
      await delay(120);
      assert.equal(notifications, 1);
      const thought = getAcpSkillRunRecord("run-coalesced-updates")?.transcriptItems.find(
        (item) => item.kind === "thought",
      );
      assert.equal(thought?.kind, "thought");
      if (thought?.kind === "thought") {
        assert.equal(thought.text, "ABC");
      }
    } finally {
      unsubscribe();
    }
  });

  it("records reply visibility and recovers a missing controller before reply", async function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-recover-reply",
      status: "waiting_user",
      backendId: "backend-acp",
      backendType: "acp",
      sessionId: "session-1",
      conversationState: "closed",
      conversationRecoveryState: "available",
    });
    let recovered = false;
    let replied = "";
    setAcpSkillRunRecoveryHandlerForTests(async ({ requestId, reason }) => {
      assert.equal(requestId, "run-recover-reply");
      assert.equal(reason, "reply");
      recovered = true;
      registerAcpSkillRunController(requestId, {
        cancel: async () => undefined,
        reply: async (message) => {
          replied = message;
        },
        disconnect: async () => undefined,
      });
    });

    await replyAcpSkillRun({
      requestId: "run-recover-reply",
      message: "continue",
    });

    const record = getAcpSkillRunRecord("run-recover-reply");
    assert.isTrue(recovered);
    assert.equal(replied, "continue");
    assert.equal(record?.replyState, "idle");
    assert.includeMembers(
      (record?.events || []).map((event) => event.stage),
      ["reply-submitted", "reply-accepted"],
    );
  });

  it("allows a recoverable failed pending run to submit a reply", async function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-failed-pending-reply",
      status: "failed",
      backendId: "backend-acp",
      backendType: "acp",
      sessionId: "session-1",
      conversationState: "closed",
      conversationRecoveryState: "available",
      applyResultState: "pending",
      pendingInteraction: {
        message: "Need more information.",
        uiHints: {
          prompt: "Please answer.",
        },
        candidateText: "{\"__SKILL_DONE__\":false}",
      },
    });
    let recovered = false;
    let replied = "";
    setAcpSkillRunRecoveryHandlerForTests(async ({ requestId, reason }) => {
      assert.equal(requestId, "run-failed-pending-reply");
      assert.equal(reason, "reply");
      recovered = true;
      registerAcpSkillRunController(requestId, {
        cancel: async () => undefined,
        reply: async (message) => {
          replied = message;
        },
        disconnect: async () => undefined,
      });
    });

    await replyAcpSkillRun({
      requestId: "run-failed-pending-reply",
      message: "more context",
    });

    const record = getAcpSkillRunRecord("run-failed-pending-reply");
    assert.isTrue(recovered);
    assert.equal(replied, "more context");
    assert.equal(record?.replyState, "idle");
    assert.includeMembers(
      (record?.events || []).map((event) => event.stage),
      ["reply-submitted", "reply-accepted"],
    );
  });

  it("wraps recovered workflow replies with a continuation guard", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, { executionModes: ["interactive"] });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      workflowId: "demo-skill",
      jobId: "job",
    });
    let capturedMessage = "";
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: true,
        canResumeSession: true,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: (listener: (event: any) => void | Promise<void>) => {
        updateListener = listener;
        return () => {
          updateListener = null;
        };
      },
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => ({ sessionId: "unused" }),
      loadSession: async ({ sessionId }) => ({ sessionId }),
      resumeSession: async ({ sessionId }) => ({ sessionId }),
      prompt: async ({ sessionId, message }) => {
        capturedMessage = message;
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: JSON.stringify({
                __SKILL_DONE__: false,
                message: "Still need input.",
                ui_hints: { prompt: "Continue?" },
              }),
            },
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => undefined,
    };
    try {
      resetAcpSkillRunsForTests();
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "waiting_user",
        backendId: ACP_OPENCODE_BACKEND_ID,
        backendType: "acp",
        skillId: "demo-skill",
        requestedSkillId: "demo-skill",
        sessionId: "session-recovered",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        primarySkillDir: entry.sourceDir,
        runnerJson: { execution_modes: ["interactive"] },
        executionMode: "interactive",
        conversationState: "closed",
        conversationRecoveryState: "available",
        pendingInteraction: {
          message: "Need user input.",
          uiHints: { prompt: "Reply" },
          candidateText: "{\"__SKILL_DONE__\":false}",
        },
      });
      await recoverAcpSkillRunConversation({
        requestId: workspace.requestId,
        reason: "reply",
        dependencies: {
          createAdapter: async () => fakeAdapter,
          dependencyProbe: async () => ({ ok: true }),
        },
      });
      await replyAcpSkillRun({
        requestId: workspace.requestId,
        message: "continue from here",
      });

      assert.include(capturedMessage, "ACP Skills continuation guard");
      assert.include(capturedMessage, "same remote ACP session");
      assert.include(capturedMessage, "Do not restart the task");
      assert.include(capturedMessage, "return exactly one JSON object");
      assert.include(capturedMessage, "`__SKILL_DONE__: false`");
      assert.include(capturedMessage, "`ui_hints`");
      assert.include(capturedMessage, "`ui_hints.options`");
      assert.include(capturedMessage, "Do not hand-write");
      assert.include(capturedMessage, "runtime render action");
      assert.include(capturedMessage, "Do not output explanations.");
      assert.include(capturedMessage, "Do not output Markdown fences.");
      assert.include(capturedMessage, "continue from here");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("starts a fresh recovered prompt after a previous reply rejected", async function () {
    const root = await mkTempRoot();
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      workflowId: "demo-skill",
      jobId: "job",
    });
    let promptCalls = 0;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: true,
        canResumeSession: true,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: () => () => undefined,
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => ({ sessionId: "unused" }),
      loadSession: async ({ sessionId }) => ({ sessionId }),
      resumeSession: async ({ sessionId }) => ({ sessionId }),
      prompt: async () => {
        promptCalls += 1;
        if (promptCalls === 1) {
          throw new Error("first recovered prompt failed");
        }
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => undefined,
    };
    try {
      resetAcpSkillRunsForTests();
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "succeeded",
        backendId: ACP_OPENCODE_BACKEND_ID,
        backendType: "acp",
        skillId: "demo-skill",
        requestedSkillId: "demo-skill",
        sessionId: "session-recovered-chain",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        conversationState: "closed",
        conversationRecoveryState: "available",
      });
      await recoverAcpSkillRunConversation({
        requestId: workspace.requestId,
        reason: "reply",
        dependencies: {
          createAdapter: async () => fakeAdapter,
          dependencyProbe: async () => ({ ok: true }),
        },
      });

      try {
        await replyAcpSkillRun({
          requestId: workspace.requestId,
          message: "first",
        });
        assert.fail("expected first recovered reply to fail");
      } catch (error) {
        assert.include(
          error instanceof Error ? error.message : String(error),
          "first recovered prompt failed",
        );
      }

      await replyAcpSkillRun({
        requestId: workspace.requestId,
        message: "second",
      });

      assert.equal(promptCalls, 2);
      assert.equal(getAcpSkillRunRecord(workspace.requestId)?.replyState, "idle");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("connect and disconnect actions recover then detach without ending session", async function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-connect",
      status: "succeeded",
      backendId: "backend-acp",
      backendType: "acp",
      sessionId: "session-1",
      conversationState: "closed",
      conversationRecoveryState: "available",
    });
    let disconnected = false;
    setAcpSkillRunRecoveryHandlerForTests(async ({ requestId, reason }) => {
      assert.equal(requestId, "run-connect");
      assert.equal(reason, "connect");
      registerAcpSkillRunController(requestId, {
        cancel: async () => undefined,
        reply: async () => undefined,
        disconnect: async () => {
          disconnected = true;
        },
      });
    });

    await connectAcpSkillRun("run-connect");
    assert.equal(getAcpSkillRunRecord("run-connect")?.conversationRecoveryState, "connected");

    await disconnectAcpSkillRun("run-connect");
    const record = getAcpSkillRunRecord("run-connect");
    assert.isTrue(disconnected);
    assert.equal(record?.conversationState, "closed");
    assert.equal(record?.conversationRecoveryState, "available");
  });

  it("cancels and hides a detached recoverable run without requiring a live controller", async function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-detached-cancel",
      status: "running",
      backendId: "backend-acp",
      backendType: "acp",
      sessionId: "session-detached",
      conversationState: "closed",
      conversationRecoveryState: "available",
    });

    await cancelAcpSkillRun("run-detached-cancel");

    const record = getAcpSkillRunRecord("run-detached-cancel");
    assert.equal(record?.status, "canceled");
    assert.equal(record?.conversationState, "ended");
    assert.equal(record?.conversationRecoveryState, "unavailable");
    assert.isString(record?.removedAt);
    const snapshot = buildAcpSkillRunPanelSnapshot({
      selectedRequestId: "run-detached-cancel",
    });
    assert.isUndefined(snapshot.selectedRun);
    assert.isFalse(snapshot.runs.some((run) => run.requestId === "run-detached-cancel"));
  });

  it("archives terminal ACP skill runs without deleting persisted diagnostics", function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-terminal-archive",
      status: "succeeded",
      backendId: "backend-acp",
      backendType: "acp",
      conversationState: "ended",
      conversationRecoveryState: "unavailable",
      event: {
        stage: "finished",
        message: "Finished.",
        level: "info",
      },
    });

    archiveAcpSkillRun("run-terminal-archive");

    const record = getAcpSkillRunRecord("run-terminal-archive");
    assert.equal(record?.status, "succeeded");
    assert.isString(record?.archivedAt);
    assert.isString(record?.removedAt);
    assert.isAtLeast(record?.events.length || 0, 2);
    const snapshot = buildAcpSkillRunPanelSnapshot({
      selectedRequestId: "run-terminal-archive",
    });
    assert.isUndefined(snapshot.selectedRun);
    assert.isFalse(snapshot.runs.some((run) => run.requestId === "run-terminal-archive"));
  });

  it("materializes skill, repairs invalid turn output, and returns provider result", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, { dependencies: ["pandas"] });
    let promptCount = 0;
    let newSessionCount = 0;
    let closeCount = 0;
    const promptSessionIds: string[] = [];
    const promptMessages: string[] = [];
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let launchedBackend: BackendInstance | null = null;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: (listener: (event: any) => void | Promise<void>) => {
        updateListener = listener;
        return () => {
          updateListener = null;
        };
      },
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => {
        newSessionCount += 1;
        return { sessionId: "session-shared" };
      },
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId, message }) => {
        promptSessionIds.push(sessionId);
        promptMessages.push(message);
        promptCount += 1;
        await updateListener?.({
          sessionId: `session-${promptCount}`,
          update: {
            sessionUpdate: "agent_thought_chunk",
            content: { type: "text", text: "I will run the skill." },
          },
        });
        await updateListener?.({
          sessionId: `session-${promptCount}`,
          update: {
            sessionUpdate: "tool_call",
            toolCallId: "tool-1",
            title: "Run skill",
            status: "pending",
            name: "run_skill",
            input: { skill: "demo-skill" },
          },
        });
        await updateListener?.({
          sessionId: `session-${promptCount}`,
          update: {
            sessionUpdate: "plan",
            entries: [{ content: "Generate structured result", status: "in_progress" }],
          },
        });
        await updateListener?.({
          sessionId: `session-${promptCount}`,
          update: {
            sessionUpdate: "tool_call_update",
            toolCallId: "tool-1",
            title: "Run skill",
            status: "completed",
            output: { ok: true },
          },
        });
        await updateListener?.({
          sessionId: `session-${promptCount}`,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text:
                promptCount === 1
                  ? "This is not JSON."
                  : JSON.stringify({ __SKILL_DONE__: true, ok: true }),
            },
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        closeCount += 1;
      },
    };
    const result = await executeAcpSkillRunnerJob({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backend: createBackend(),
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "demo-skill",
        fetch_type: "bundle",
      },
      dependencies: {
        scanRegistry: async () => ({
          entries: [entry],
          entriesById: { "demo-skill": entry },
          diagnostics: [],
        }),
        createWorkspace: (args) =>
          import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
            mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
          ),
        createAdapter: async (args) => {
          launchedBackend = args.backend;
          return fakeAdapter;
        },
        dependencyProbe: async () => ({ ok: true }),
        maxRepairRounds: 3,
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    });
    assert.equal(result.status, "succeeded");
    assert.equal(result.fetchType, "result");
    assert.equal((result.resultJson as { ok?: boolean }).ok, true);
    assert.equal(promptCount, 2);
    assert.equal(newSessionCount, 1);
    assert.deepEqual(promptSessionIds, ["session-shared", "session-shared"]);
    assert.equal(closeCount, 0);
    assert.equal(launchedBackend?.command, "uv");
    assert.deepEqual(launchedBackend?.args?.slice(0, 5), [
      "run",
      "--isolated",
      "--with",
      "pandas",
      "--",
    ]);
    assert.match(
      String(launchedBackend?.args?.[5] || ""),
      /(?:^npx$|[\\/]npx\.(cmd|exe|bat)$)/i,
    );
    assert.deepEqual(launchedBackend?.args?.slice(6), ["codex", "acp"]);
    const response = result.responseJson as {
      skillRoots?: string[];
      runtimeDependencies?: string[];
      resultResolution?: string;
      resultJsonPath?: string;
      workspaceDir?: string;
      sharedSkillCatalogPath?: string;
      proxySkillCount?: number;
      proxySkillRoots?: string[];
      requestedSkillProxyPath?: string;
      runExecutionInstructionsPath?: string;
    };
    assert.deepEqual(response.runtimeDependencies, ["pandas"]);
    assert.equal(response.resultResolution, "workflow-result-context");
    assert.isString(response.resultJsonPath);
    assert.isString(response.workspaceDir);
    assert.isAtLeast(response.skillRoots?.length || 0, 1);
    assert.isString(response.sharedSkillCatalogPath);
    assert.equal(response.proxySkillCount, 2);
    assert.isAtLeast(response.proxySkillRoots?.length || 0, 1);
    assert.isString(response.requestedSkillProxyPath);
    assert.isString(response.runExecutionInstructionsPath);
    assert.include(promptMessages[0] || "", "$demo-skill");
    assert.include(promptMessages[0] || "", "# Inputs");
    assert.include(promptMessages[0] || "", "# Parameters");
    assert.include(promptMessages[0] || "", "ACP run context:");
    assert.include(promptMessages[0] || "", "Requested skill proxy:");
    assert.notInclude(promptMessages[0] || "", "Target output contract details:");
    assert.include(
      promptMessages[1] || "",
      "Your previous output did not satisfy the Skill Runner output contract.",
    );
    const runInstructions = await fs.readFile(
      path.join(response.workspaceDir || "", "AGENTS.md"),
      "utf8",
    );
    assert.include(runInstructions, "# Run Execution Instructions");
    assert.include(runInstructions, "Engine workspace directory: `./.codex`");
    assert.include(runInstructions, "Engine skill directory: `./.codex/skills`");
    assert.include(runInstructions, "runtime-patched `SKILL.md`");
    const proxySkillMd = await fs.readFile(
      path.join(response.requestedSkillProxyPath || "", "SKILL.md"),
      "utf8",
    );
    const resourceIndex = proxySkillMd.indexOf("## Zotero Skills ACP Thin Proxy Resource Mapping");
    const originalBodyIndex = proxySkillMd.indexOf("# Demo Skill");
    const runtimeIndex = proxySkillMd.indexOf("Runtime Enforcement");
    const outputIndex = proxySkillMd.indexOf("## Output Format Contract");
    const detailsIndex = proxySkillMd.indexOf("### Output Contract Details");
    const modeIndex = proxySkillMd.indexOf("## Execution Mode: AUTO (Non-Interactive)");
    assert.isTrue(
      [resourceIndex, originalBodyIndex, runtimeIndex, outputIndex, detailsIndex, modeIndex].every(
        (index) => index >= 0,
      ),
      proxySkillMd,
    );
    assert.isBelow(resourceIndex, originalBodyIndex);
    assert.isBelow(originalBodyIndex, runtimeIndex);
    assert.isBelow(runtimeIndex, outputIndex);
    assert.isBelow(outputIndex, detailsIndex);
    assert.isBelow(detailsIndex, modeIndex);
    assert.notInclude(proxySkillMd, "Proxy mode:");
    assert.notInclude(proxySkillMd, "Input manifest:");
    assert.notInclude(proxySkillMd, "Runner result envelope path:");
    assert.notInclude(proxySkillMd, "Do not write the runner result envelope yourself.");
    assert.notInclude(proxySkillMd, "Put additional artifacts under the run workspace");
    assert.include(proxySkillMd, "Shared catalog skill root:");
    assert.include(proxySkillMd, "- Resource root assets: `<shared catalog skill root>/assets`");
    assert.notInclude(proxySkillMd, "## Runtime Output Overrides");
    assert.notInclude(proxySkillMd, "## Execution Mode: INTERACTIVE");
    assert.include(proxySkillMd, "`__SKILL_DONE__`");
    assert.include(proxySkillMd, "Markdown code fences");
    const panelSnapshot = buildAcpSkillRunPanelSnapshot({
      selectedRequestId: result.requestId,
    });
    assert.isObject(panelSnapshot.mcpServer);
    assert.isObject(panelSnapshot.mcpHealth);
    assert.equal(panelSnapshot.selectedRun?.requestId, result.requestId);
    assert.equal(panelSnapshot.selectedRun?.status, "succeeded");
    assert.equal(panelSnapshot.selectedRun?.workflowId, "demo-skill");
    assert.equal(panelSnapshot.selectedRun?.conversationState, "active");
    assert.equal(panelSnapshot.selectedRun?.applyResultState, "pending");
    assert.equal(panelSnapshot.selectedRun?.agentFamily, "codex");
    assert.deepEqual(panelSnapshot.selectedRun?.runtimeDependencies, ["pandas"]);
    assert.isString(panelSnapshot.selectedRun?.sharedSkillCatalogPath);
    assert.equal(panelSnapshot.selectedRun?.proxySkillCount, 2);
    assert.isString(panelSnapshot.selectedRun?.requestedSkillProxyPath);
    assert.equal(panelSnapshot.selectedRun?.repairRounds, 1);
    assert.equal(panelSnapshot.selectedRun?.validationStatus, "valid");
    assert.deepEqual(
      panelSnapshot.selectedRun?.outputRevisions.map((entry) => entry.status),
      ["invalid", "final"],
    );
    assert.include(panelSnapshot.selectedRun?.outputRevisions[0]?.candidateText || "", "This is not JSON.");
    assert.include(panelSnapshot.selectedRun?.outputRevisions[0]?.replacementReason || "", "final");
    assert.isAtLeast(panelSnapshot.selectedRun?.skillRoots?.length || 0, 1);
    assert.isAtLeast(panelSnapshot.selectedRun?.events.length || 0, 5);
    const transcript = panelSnapshot.selectedRun?.transcriptItems || [];
    assert.isAtLeast(transcript.length, 3);
    assert.isTrue(transcript.some((item) => item.kind === "thought"));
    assert.isTrue(transcript.some((item) => item.kind === "message"));
    const assistantMessages = transcript.filter(
      (item) => item.kind === "message" && item.role === "assistant",
    );
    assert.isTrue(
      assistantMessages.some((item) => item.text.includes("```json") && item.text.includes('"ok": true')),
    );
    assert.isFalse(assistantMessages.some((item) => item.text.includes("__SKILL_DONE__")));
    assert.isFalse(assistantMessages.some((item) => item.text.includes("This is not JSON.")));
    assert.isTrue(assistantMessages.some((item) => item.revision?.count === 2));
    const toolRows = transcript.filter((item) => item.kind === "tool_call");
    assert.lengthOf(toolRows, 1);
    assert.equal(toolRows[0].state, "completed");
    assert.equal(toolRows[0].inputSummary, "{\"skill\":\"demo-skill\"}");
    assert.equal(
      panelSnapshot.selectedRun?.planEntries?.[0]?.content,
      "Generate structured result",
    );

    await replyAcpSkillRun({
      requestId: result.requestId,
      message: "Explain the generated digest.",
    });
    assert.equal(promptCount, 3);
    assert.deepEqual(promptSessionIds, [
      "session-shared",
      "session-shared",
      "session-shared",
    ]);
    const afterReply = buildAcpSkillRunPanelSnapshot({
      selectedRequestId: result.requestId,
    }).selectedRun;
    assert.isTrue(
      (afterReply?.transcriptItems || []).some(
        (item) =>
          item.kind === "message" &&
          item.role === "user" &&
          item.text === "Explain the generated digest.",
      ),
    );
    assert.equal(afterReply?.status, "succeeded");
    assert.equal(afterReply?.conversationState, "active");
    assert.equal(closeCount, 0);

    await endAcpSkillRunSession(result.requestId);
    assert.equal(closeCount, 1);
    const ended = buildAcpSkillRunPanelSnapshot({
      selectedRequestId: result.requestId,
    }).selectedRun;
    assert.equal(ended?.status, "succeeded");
    assert.equal(ended?.conversationState, "ended");
  });

  it("keeps interactive pending turn out of apply until a final reply arrives", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, { executionModes: ["interactive"] });
    let promptCount = 0;
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    const promptSessionIds: string[] = [];
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: (listener: (event: any) => void | Promise<void>) => {
        updateListener = listener;
        return () => {
          updateListener = null;
        };
      },
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => ({ sessionId: "session-interactive" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        promptSessionIds.push(sessionId);
        promptCount += 1;
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text:
                promptCount === 1
                  ? JSON.stringify({
                      __SKILL_DONE__: false,
                      message: "Need user confirmation.",
                      ui_hints: {
                        kind: "confirm",
                        prompt: "Confirm completion?",
                        hint: "Choose an option or type a reply.",
                        options: ["Please finish."],
                      },
                    })
                  : JSON.stringify({ __SKILL_DONE__: true, ok: true }),
            },
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => undefined,
    };
    let capturedWaiting:
      | NonNullable<ReturnType<typeof buildAcpSkillRunPanelSnapshot>["selectedRun"]>
      | null = null;
    let autoReplied = false;
    let autoReplyError: Error | null = null;
    const unsubscribe = subscribeAcpSkillRunSnapshots(() => {
      const waiting = buildAcpSkillRunPanelSnapshot({}).selectedRun;
      if (autoReplied || waiting?.status !== "waiting_user") {
        return;
      }
      autoReplied = true;
      capturedWaiting = waiting;
      void replyAcpSkillRun({
        requestId: waiting.requestId || "",
        message: "Please finish.",
      }).catch((error) => {
        autoReplyError = error instanceof Error ? error : new Error(String(error));
      });
    });
    const runPromise = executeAcpSkillRunnerJob({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backend: createBackend(),
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "demo-skill",
        fetch_type: "bundle",
        runtime_options: { execution_mode: "interactive" },
      },
      dependencies: {
        scanRegistry: async () => ({
          entries: [entry],
          entriesById: { "demo-skill": entry },
          diagnostics: [],
        }),
        createWorkspace: (args) =>
          import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
            mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
          ),
        createAdapter: async () => fakeAdapter,
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    });
    const result = await runPromise.finally(() => unsubscribe());
    if (autoReplyError) throw autoReplyError;
    assert.equal(capturedWaiting?.status, "waiting_user");
    assert.equal(capturedWaiting?.conversationState, "active");
    assert.equal(capturedWaiting?.applyResultState, undefined);
    assert.deepEqual(capturedWaiting?.pendingInteraction?.uiHints, {
      kind: "confirm",
      prompt: "Confirm completion?",
      hint: "Choose an option or type a reply.",
      options: ["Please finish."],
    });
    const pendingResponse = result.responseJson as { requestedSkillProxyPath?: string };
    const pendingProxySkillMd = await fs.readFile(
      path.join(pendingResponse.requestedSkillProxyPath || "", "SKILL.md"),
      "utf8",
    );
    assert.include(pendingProxySkillMd, "## Execution Mode: INTERACTIVE");
    assert.notInclude(pendingProxySkillMd, "## Execution Mode: AUTO (Non-Interactive)");
    assert.include(pendingProxySkillMd, "Pending Branch Contract");
    assert.include(pendingProxySkillMd, "Supported `ui_hints.kind` values");
    assert.include(pendingProxySkillMd, "`open_text | choose_one | confirm | upload_files`");
    assert.include(pendingProxySkillMd, "`ui_hints.options`");
    assert.include(pendingProxySkillMd, '"kind": "choose_one"');
    assert.include(pendingProxySkillMd, '"label": "Continue"');
    assert.include(pendingProxySkillMd, '"value": "continue"');
    assert.notInclude(pendingProxySkillMd, "## Runtime Output Overrides");
    const pendingAssistantMessages = capturedWaiting?.transcriptItems.filter(
      (item) => item.kind === "message" && item.role === "assistant",
    ) || [];
    assert.isTrue(pendingAssistantMessages.some((item) => item.text === "Need user confirmation."));
    assert.isFalse(pendingAssistantMessages.some((item) => item.text.includes("__SKILL_DONE__")));
    assert.isFalse(pendingAssistantMessages.some((item) => item.text.includes("ui_hints")));
    assert.deepEqual(capturedWaiting?.outputRevisions.map((entry) => entry.status), ["pending"]);
    assert.isTrue(pendingAssistantMessages.some((item) => item.revision?.count === 1));
    assert.equal(result.status, "succeeded");
    assert.equal((result.resultJson as { ok?: boolean }).ok, true);
    assert.deepEqual(promptSessionIds, [
      "session-interactive",
      "session-interactive",
    ]);
    const finished = buildAcpSkillRunPanelSnapshot({
      selectedRequestId: result.requestId,
    }).selectedRun;
    assert.equal(finished?.status, "succeeded");
    assert.equal(finished?.conversationState, "active");
    assert.equal(finished?.applyResultState, "pending");
    assert.equal(finished?.pendingInteraction, undefined);
    const finalAssistantMessages = finished?.transcriptItems.filter(
      (item) => item.kind === "message" && item.role === "assistant",
    ) || [];
    assert.isTrue(
      finalAssistantMessages.some((item) => item.text.includes("```json") && item.text.includes('"ok": true')),
    );
    assert.isFalse(finalAssistantMessages.some((item) => item.text.includes("__SKILL_DONE__")));
    assert.deepEqual(finished?.outputRevisions.map((entry) => entry.status), ["pending", "final"]);
    assert.isTrue(
      await fs
        .access(path.join(finished?.workspaceDir || "", "result", "result.json"))
        .then(() => true)
        .catch(() => false),
    );
  });

  it("allows a repair round to converge to pending without completing the workflow", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, { executionModes: ["interactive"] });
    let promptCount = 0;
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let capturedWaiting:
      | NonNullable<ReturnType<typeof buildAcpSkillRunPanelSnapshot>["selectedRun"]>
      | null = null;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: false,
        canResumeSession: false,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      }),
      onUpdate: (listener: (event: any) => void | Promise<void>) => {
        updateListener = listener;
        return () => {
          updateListener = null;
        };
      },
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => ({ sessionId: "session-repair-pending" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        promptCount += 1;
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text:
                promptCount === 1
                  ? "not valid json"
                  : promptCount === 2
                    ? JSON.stringify({
                        __SKILL_DONE__: false,
                        message: "Need one more answer.",
                        ui_hints: { prompt: "One more answer?", options: ["continue"] },
                      })
                    : JSON.stringify({ __SKILL_DONE__: true, ok: true }),
            },
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => undefined,
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => undefined,
    };
    let autoReplied = false;
    const unsubscribe = subscribeAcpSkillRunSnapshots(() => {
      const waiting = buildAcpSkillRunPanelSnapshot({}).selectedRun;
      if (autoReplied || waiting?.status !== "waiting_user") return;
      autoReplied = true;
      capturedWaiting = waiting;
      void replyAcpSkillRun({
        requestId: waiting.requestId,
        message: "continue",
      });
    });
    const result = await executeAcpSkillRunnerJob({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backend: createBackend(),
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "demo-skill",
        fetch_type: "bundle",
        runtime_options: { execution_mode: "interactive" },
      },
      dependencies: {
        scanRegistry: async () => ({
          entries: [entry],
          entriesById: { "demo-skill": entry },
          diagnostics: [],
        }),
        createWorkspace: (args) =>
          import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
            mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
          ),
        createAdapter: async () => fakeAdapter,
        maxRepairRounds: 3,
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    }).finally(() => unsubscribe());
    assert.equal(capturedWaiting?.status, "waiting_user");
    assert.equal(capturedWaiting?.repairRounds, 1);
    assert.equal(capturedWaiting?.applyResultState, undefined);
    assert.equal(capturedWaiting?.resultJson, undefined);
    assert.equal(capturedWaiting?.pendingInteraction?.message, "Need one more answer.");
    assert.deepEqual(capturedWaiting?.outputRevisions.map((entry) => entry.status), ["invalid", "pending"]);
    assert.include(capturedWaiting?.outputRevisions[0]?.replacementReason || "", "pending");
    const waitingMessages = capturedWaiting?.transcriptItems.filter(
      (item) => item.kind === "message" && item.role === "assistant",
    ) || [];
    assert.isFalse(waitingMessages.some((item) => item.text.includes("not valid json")));
    assert.isTrue(waitingMessages.some((item) => item.revision?.count === 2));
    assert.equal(result.status, "succeeded");
    assert.equal(promptCount, 3);
  });
});
