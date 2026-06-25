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
  reconcileAcpSkillRunWorkflowTasksOnStartup,
  registerAcpSkillRunController,
  replyAcpSkillRun,
  resolveAcpSkillRunPermissionRequest,
  resetAcpSkillRunsForTests,
  selectAcpSkillRun,
  setAcpSkillRunMode,
  setAcpSkillRunModel,
  setAcpSkillRunRecoveryHandlerForTests,
  setAcpSkillRunPermissionRequest,
  setAcpSkillRunReasoningEffort,
  setAcpSkillRunRuntimeOptions,
  shutdownAcpSkillRunConversations,
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
  type AcpSkillRunnerDependencies,
  executeAcpSkillRunnerJob,
  recoverAcpSkillRunConversation,
  resolveAcpSkillRunEffectiveRuntimeOptions,
} from "../../src/modules/acpSkillRunnerOrchestrator";
import {
  applyHostBridgeCliEnvToBackend,
  materializeHostBridgeCliRunInjection,
} from "../../src/modules/hostBridgeCliInjection";
import {
  initializeSequenceRunState,
  recordSequenceStepRequestCreated,
} from "../../src/modules/workflowExecution/sequenceStateStore";
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
import { rescanWorkflowRegistry } from "../../src/modules/workflowRuntime";
import {
  buildAcpSkillOutputRepairPrompt,
  validateAcpSkillFinalPayload,
} from "../../src/modules/acpSkillOutputValidator";
import { validateAcpSkillRunRequestAgainstSchemas } from "../../src/modules/acpSkillSchemaAssets";
import { resolveAcpSkillResultFileFallback } from "../../src/modules/acpSkillResultFileFallback";
import {
  createAcpSkillRunnerWorkspace,
  resetAcpWorkflowWorkspaceRegistryForTests,
} from "../../src/modules/acpSkillRunnerWorkspace";
import { resolveProvider } from "../../src/providers/registry";
import type { AcpConnectionAdapter } from "../../src/modules/acpConnectionAdapter";
import { RequestError } from "../../src/modules/acpProtocol";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import {
  SKILL_RUN_FEEDBACK_ASSET_ID,
  listSkillRunFeedbackProducts,
  readProductAssetPreview,
} from "../../src/modules/workflowProductStore";
import {
  listActiveWorkflowTasks,
  listWorkflowTasks,
  recordWorkflowTaskUpdate,
  resetWorkflowTasks,
} from "../../src/modules/taskRuntime";
import type { JobRecord } from "../../src/jobQueue/manager";

async function mkTempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-skillrunner-"));
}

function formatPortablePathForTest(value: string) {
  return value.replace(/\\/g, "/");
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

function makeAcpWorkflowTaskJob(args: {
  requestId: string;
  state?: JobRecord["state"];
  updatedAt?: string;
  workflowId?: string;
  backendId?: string;
}) {
  const updatedAt = args.updatedAt || "2026-05-23T01:00:00.000Z";
  return {
    id: "job-" + args.requestId,
    workflowId: args.workflowId || "demo-acp-workflow",
    request: {},
    meta: {
      runId: "run-" + args.requestId,
      workflowLabel: "Demo ACP Workflow",
      taskName: "Demo ACP Task",
      providerId: "acp",
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backendId: args.backendId || "backend-acp",
      backendType: "acp",
      requestId: args.requestId,
    },
    state: args.state || "running",
    createdAt: "2026-05-23T00:59:00.000Z",
    updatedAt,
  } satisfies JobRecord;
}

async function createSkill(
  root: string,
  args?: {
    dependencies?: string[];
    executionModes?: string[];
    declareSchemas?: boolean;
    mcpRequiredTools?: string[];
    skillId?: string;
    runtimeDefaultOptions?: Record<string, unknown>;
  },
) {
  const skillId = args?.skillId || "demo-skill";
  const skillDir = path.join(root, "skills", skillId);
  await fs.mkdir(path.join(skillDir, "assets"), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "---",
      `name: ${skillId}`,
      "---",
      "",
      "# Demo Skill",
      "",
      "Return structured output.",
      "",
    ].join("\n"),
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
      id: skillId,
      execution_modes: args?.executionModes || ["auto"],
      runtime: {
        dependencies: args?.dependencies || [],
        ...(args?.runtimeDefaultOptions
          ? { default_options: args.runtimeDefaultOptions }
          : {}),
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
      skillId,
      description: "Demo skill description",
      sourceKind: "user" as const,
      sourceDir: skillDir,
      skillMdPath: path.join(skillDir, "SKILL.md"),
      runnerJsonPath: path.join(skillDir, "assets", "runner.json"),
      checksum: "sha256:test",
      diagnostics: [],
    },
  };
}

async function createRecoveryApplyWorkflowRoot(
  root: string,
  args?: { finalSkillId?: string },
) {
  const workflowId = "recovered-sequence-apply-workflow";
  const finalSkillId = args?.finalSkillId || "topic-synthesis-finalize";
  const workflowsDir = path.join(root, "workflows");
  const workflowDir = path.join(workflowsDir, workflowId);
  await fs.mkdir(path.join(workflowDir, "hooks"), { recursive: true });
  await fs.writeFile(
    path.join(workflowDir, "workflow.json"),
    JSON.stringify({
      id: workflowId,
      label: "Recovered Sequence Apply Workflow",
      provider: "acp",
      trigger: { requiresSelection: false },
      request: {
        kind: "skillrunner.sequence.v1",
        sequence: {
          steps: [
            {
              id: "finalize",
              skill_id: finalSkillId,
              mode: "interactive",
              workspace: "reuse-workflow",
            },
          ],
        },
      },
      result: { final_step_id: "finalize" },
      hooks: { applyResult: "hooks/applyResult.mjs" },
    }),
    "utf8",
  );
  await fs.writeFile(
    path.join(workflowDir, "hooks", "applyResult.mjs"),
    [
      "export async function applyResult({ manifest, runResult }) {",
      "  return { ok: true, workflowId: manifest.id, kind: runResult.resultJson?.kind || '' };",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );
  return { workflowsDir, workflowId };
}

function createFinalOutputAdapter(resultJson: Record<string, unknown>) {
  let updateListener: ((event: any) => void | Promise<void>) | null = null;
  return {
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
    loadSession: async ({ sessionId }: { sessionId: string }) => ({
      sessionId,
    }),
    resumeSession: async ({ sessionId }: { sessionId: string }) => ({
      sessionId,
    }),
    prompt: async ({ sessionId }: { sessionId: string }) => {
      await updateListener?.({
        sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: JSON.stringify({
              __SKILL_DONE__: true,
              ...resultJson,
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
  } satisfies AcpConnectionAdapter;
}

function createPromptStopAdapter(args: {
  stopReason?: string;
  assistantText?: string | ((promptCount: number) => string | undefined);
  updates?: any[] | ((promptCount: number) => any[]);
  promptError?: Error;
  cancelRequested?: boolean | ((promptCount: number) => boolean);
  backendError?: {
    message: string;
    name?: string;
    code?: string | number;
    data?: unknown;
    source?: "request_error" | "session_update" | "connection";
  };
}) {
  let updateListener: ((event: any) => void | Promise<void>) | null = null;
  let promptCount = 0;
  const adapter = {
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
    newSession: async () => ({ sessionId: "session-prompt-stop" }),
    loadSession: async ({ sessionId }: { sessionId: string }) => ({
      sessionId,
    }),
    resumeSession: async ({ sessionId }: { sessionId: string }) => ({
      sessionId,
    }),
    prompt: async ({ sessionId }: { sessionId: string }) => {
      promptCount += 1;
      if (args.promptError) {
        throw args.promptError;
      }
      const updates =
        typeof args.updates === "function"
          ? args.updates(promptCount)
          : args.updates || [];
      for (const update of updates) {
        await updateListener?.({
          sessionId,
          update,
        });
      }
      const assistantText =
        typeof args.assistantText === "function"
          ? args.assistantText(promptCount)
          : args.assistantText;
      if (typeof assistantText === "string") {
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: assistantText,
            },
          },
        });
      }
      const cancelRequested =
        typeof args.cancelRequested === "function"
          ? args.cancelRequested(promptCount)
          : args.cancelRequested;
      return {
        stopReason: args.stopReason || "end_turn",
        cancelRequested,
        backendError: args.backendError,
      };
    },
    cancel: async () => undefined,
    setMode: async () => undefined,
    setModel: async () => undefined,
    authenticate: async () => undefined,
    close: async () => undefined,
  } satisfies AcpConnectionAdapter;
  return {
    adapter,
    getPromptCount: () => promptCount,
  };
}

async function runDemoAcpSkill(args: {
  root: string;
  entry: Awaited<ReturnType<typeof createSkill>>["entry"];
  adapter: AcpConnectionAdapter;
  backend?: BackendInstance;
  providerOptions?: Record<string, unknown>;
  createWorkspace?: AcpSkillRunnerDependencies["createWorkspace"];
}) {
  return executeAcpSkillRunnerJob({
    requestKind: ACP_SKILL_RUN_REQUEST_KIND,
    backend: args.backend || createBackend(),
    providerOptions: args.providerOptions,
    request: {
      kind: ACP_SKILL_RUN_REQUEST_KIND,
      skill_id: "demo-skill",
      fetch_type: "bundle",
    },
    dependencies: {
      scanRegistry: async () => ({
        entries: [args.entry],
        entriesById: { "demo-skill": args.entry },
        diagnostics: [],
      }),
      createWorkspace:
        args.createWorkspace ||
        ((workspaceArgs) =>
          createAcpSkillRunnerWorkspace({
            ...workspaceArgs,
            rootDir: args.root,
          })),
      createAdapter: async () => args.adapter,
      sharedSkillCatalogRootDir: path.join(args.root, "shared-catalog"),
    },
  });
}

function createRuntimeModelAdapter(args: {
  currentModelId?: string;
  setModelCalls: string[];
}) {
  let updateListener: ((event: any) => void | Promise<void>) | null = null;
  return {
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
    newSession: async () => ({
      sessionId: "session-runtime-model",
      models: {
        currentModelId: args.currentModelId || "",
        availableModels: [],
      },
    }),
    loadSession: async ({ sessionId }: { sessionId: string }) => ({
      sessionId,
    }),
    resumeSession: async ({ sessionId }: { sessionId: string }) => ({
      sessionId,
    }),
    prompt: async ({ sessionId }: { sessionId: string }) => {
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
    setModel: async ({ modelId }: { sessionId: string; modelId: string }) => {
      args.setModelCalls.push(modelId);
    },
    authenticate: async () => undefined,
    close: async () => undefined,
  } satisfies AcpConnectionAdapter;
}

function createBackendWithRuntimeModels(args: {
  currentRawModelId: string;
  currentDisplayModelId?: string;
}) {
  return createBackend({
    acp: {
      runtimeOptionsCache: {
        refreshedAt: "2026-06-12T00:00:00.000Z",
        modes: [],
        currentModeId: "",
        rawModels: [
          {
            id: args.currentRawModelId,
            label: args.currentRawModelId,
          },
          {
            id: "alibaba-coding-plan:qwen3.6-plus",
            label: "qwen3.6-plus",
          },
        ],
        currentRawModelId: args.currentRawModelId,
        displayModels: [
          {
            id: args.currentDisplayModelId || args.currentRawModelId,
            label: args.currentDisplayModelId || args.currentRawModelId,
          },
          {
            id: "alibaba-coding-plan:qwen3.6-plus",
            label: "qwen3.6-plus",
          },
        ],
        currentDisplayModelId:
          args.currentDisplayModelId || args.currentRawModelId,
        reasoningEfforts: [],
        currentReasoningEffortId: "",
      },
    },
  });
}

async function createHostBridgeWrapperSkill(root: string) {
  const skillId = "zotero-bridge-cli";
  const skillDir = path.join(root, "skills_builtin", skillId);
  await fs.mkdir(path.join(skillDir, "assets"), { recursive: true });
  await fs.mkdir(path.join(skillDir, "references"), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "---",
      `name: ${skillId}`,
      "description: Host Bridge CLI wrapper",
      "---",
      "",
      "# Zotero Bridge CLI",
      "",
      "Read references/host-bridge-cli.md.",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "references", "host-bridge-cli.md"),
    "# Host Bridge CLI Reference\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "output.schema.json"),
    JSON.stringify({ type: "object", additionalProperties: true }),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "runner.json"),
    JSON.stringify({
      id: skillId,
      execution_modes: ["auto"],
      schemas: { output: "assets/output.schema.json" },
    }),
    "utf8",
  );
  return {
    skillDir,
    entry: {
      skillId,
      description: "Host Bridge CLI wrapper",
      sourceKind: "builtin" as const,
      sourceDir: skillDir,
      skillMdPath: path.join(skillDir, "SKILL.md"),
      runnerJsonPath: path.join(skillDir, "assets", "runner.json"),
      checksum: "sha256:host-bridge-wrapper",
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
    resetWorkflowTasks();
    resetAcpSkillRunsForTests();
  });

  afterEach(function () {
    resetAcpSkillRunsForTests();
    resetWorkflowTasks();
    resetPluginStateStoreForTests();
  });

  it("resolves agent family from backend metadata and builds skill roots", async function () {
    const root = await mkTempRoot();
    const codex = createBackend();
    assert.equal(resolveAcpAgentFamily(codex), "codex");
    assert.deepEqual(
      buildAcpSkillInjectionPlan({ backend: codex, workspaceDir: root })
        .skillRoots.map((entry) => entry.replace(/\\/g, "/"))
        .map((entry) => entry.slice(root.replace(/\\/g, "/").length + 1)),
      [".agents/skills", ".codex/skills"],
    );

    const claude = createBackend({
      id: "backend-acp-claude-code",
      command: "npx",
      args: ["@agentclientprotocol/claude-agent-acp@latest"],
    });
    assert.equal(resolveAcpAgentFamily(claude), "claude-code");

    const legacyClaude = createBackend({
      id: "backend-acp-legacy-claude-code",
      command: "npx",
      args: ["@zed-industries/claude-code-acp@latest"],
    });
    assert.equal(resolveAcpAgentFamily(legacyClaude), "claude-code");

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

  it("skips initial ACP model setting when the session already reports the target raw model", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const setModelCalls: string[] = [];
    const currentModelId = "alibaba-coding-plan:qwen3.7-plus";
    const adapter = createRuntimeModelAdapter({
      currentModelId,
      setModelCalls,
    });

    const result = await runDemoAcpSkill({
      root,
      entry,
      adapter,
      backend: createBackendWithRuntimeModels({
        currentRawModelId: currentModelId,
      }),
      providerOptions: {
        acpModelId: currentModelId,
      },
    });

    assert.equal(result.status, "succeeded");
    assert.deepEqual(setModelCalls, []);
  });

  it("keeps initial ACP model setting when the requested raw model differs from the session current model", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const setModelCalls: string[] = [];
    const adapter = createRuntimeModelAdapter({
      currentModelId: "alibaba-coding-plan:qwen3.7-plus",
      setModelCalls,
    });

    const result = await runDemoAcpSkill({
      root,
      entry,
      adapter,
      backend: createBackendWithRuntimeModels({
        currentRawModelId: "alibaba-coding-plan:qwen3.7-plus",
      }),
      providerOptions: {
        acpModelId: "alibaba-coding-plan:qwen3.6-plus",
      },
    });

    assert.equal(result.status, "succeeded");
    assert.deepEqual(setModelCalls, ["alibaba-coding-plan:qwen3.6-plus"]);
  });

  it("synthesizes ACP effective runtime hard timeout like SkillRunner", function () {
    const request = {
      kind: ACP_SKILL_RUN_REQUEST_KIND,
      skill_id: "demo-skill",
      runtime_options: {},
    };
    const runnerJson = {
      runtime: {
        default_options: {
          hard_timeout_seconds: 45,
          unknown_key: 1,
        },
      },
    };

    const fromRunner = resolveAcpSkillRunEffectiveRuntimeOptions({
      request,
      runnerJson,
    });
    assert.equal(fromRunner.hardTimeoutSeconds, 45);
    assert.equal(fromRunner.hardTimeoutSource, "runner");
    assert.notProperty(fromRunner.runtimeOptions, "unknown_key");
    assert.notProperty(request.runtime_options, "hard_timeout_seconds");

    const fromRequest = resolveAcpSkillRunEffectiveRuntimeOptions({
      request: {
        ...request,
        runtime_options: { hard_timeout_seconds: 9 },
      },
      runnerJson,
    });
    assert.equal(fromRequest.hardTimeoutSeconds, 9);
    assert.equal(fromRequest.hardTimeoutSource, "request");

    const fromProviderOption = resolveAcpSkillRunEffectiveRuntimeOptions({
      request,
      runnerJson,
      providerOptions: { hard_timeout_seconds: 7 },
    });
    assert.equal(fromProviderOption.hardTimeoutSeconds, 7);
    assert.equal(fromProviderOption.hardTimeoutSource, "request");

    const providerOptionWinsRequest = resolveAcpSkillRunEffectiveRuntimeOptions(
      {
        request: {
          ...request,
          runtime_options: { hard_timeout_seconds: 9 },
        },
        runnerJson,
        providerOptions: { hard_timeout_seconds: 7 },
      },
    );
    assert.equal(providerOptionWinsRequest.hardTimeoutSeconds, 7);
    assert.equal(providerOptionWinsRequest.hardTimeoutSource, "request");

    const fallback = resolveAcpSkillRunEffectiveRuntimeOptions({
      request: {
        ...request,
        runtime_options: { hard_timeout_seconds: "bad" },
      },
      runnerJson: {},
    });
    assert.equal(fallback.hardTimeoutSeconds, 1200);
    assert.equal(fallback.hardTimeoutSource, "default");
  });

  it("disconnects auto ACP skill runs recoverably when hard timeout expires", async function () {
    this.timeout(5000);
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["auto"],
    });
    let cancelCount = 0;
    let closeCount = 0;
    let releasePrompt: (() => void) | null = null;
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
      newSession: async () => ({ sessionId: "session-hard-timeout" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async () => {
        await new Promise<void>((resolve) => {
          releasePrompt = resolve;
        });
        return { stopReason: "cancelled", cancelRequested: true };
      },
      cancel: async () => {
        cancelCount += 1;
        releasePrompt?.();
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        closeCount += 1;
        releasePrompt?.();
      },
    };

    try {
      const result = await executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "result",
          runtime_options: {
            execution_mode: "auto",
            hard_timeout_seconds: 1,
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
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });

      const record = getAcpSkillRunRecord(result.requestId);
      const stages = (record?.events || []).map((event) => event.stage);
      assert.equal(result.status, "deferred");
      assert.equal(record?.status, "running");
      assert.equal(record?.conversationState, "closed");
      assert.equal(record?.conversationRecoveryState, "available");
      assert.notEqual(record?.status, "failed");
      assert.notEqual(record?.status, "canceled");
      assert.equal(cancelCount, 1);
      assert.equal(closeCount, 1);
      assert.include(stages, "hard-timeout-disconnect-requested");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("starts initial ACP hard timeout after session setup reaches prompt", async function () {
    this.timeout(6000);
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["auto"],
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
      newSession: async () => {
        await delay(1200);
        return { sessionId: "session-slow-initial-setup" };
      },
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
              text: JSON.stringify({
                __SKILL_DONE__: true,
                ok: true,
              }),
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
      close: async () => undefined,
    };

    try {
      const result = await executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "result",
          runtime_options: {
            execution_mode: "auto",
            hard_timeout_seconds: 1,
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
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });

      const record = getAcpSkillRunRecord(result.requestId);
      const stages = (record?.events || []).map((event) => event.stage);
      assert.equal(promptCount, 1);
      assert.equal(cancelCount, 0);
      assert.equal(record?.status, "succeeded");
      assert.notInclude(stages, "hard-timeout-disconnect-requested");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("settles received ACP transcript before hard timeout disconnect cleanup", async function () {
    this.timeout(5000);
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["auto"],
    });
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let releasePrompt: (() => void) | null = null;
    const transcriptText = "received transcript before timeout";
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
      newSession: async () => ({ sessionId: "session-timeout-transcript" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: transcriptText,
            },
          },
        });
        await new Promise<void>((resolve) => {
          releasePrompt = resolve;
        });
        return { stopReason: "cancelled", cancelRequested: true };
      },
      cancel: async () => {
        releasePrompt?.();
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        releasePrompt?.();
      },
    };

    try {
      const result = await executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "result",
          runtime_options: {
            execution_mode: "auto",
            hard_timeout_seconds: 1,
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
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });

      const record = getAcpSkillRunRecord(result.requestId);
      const transcriptItems = record?.transcriptItems || [];
      const messageIndex = transcriptItems.findIndex(
        (item: any) =>
          item.kind === "message" &&
          item.role === "assistant" &&
          item.text === transcriptText,
      );
      const message = transcriptItems[messageIndex] as any;
      const noticeIndex = transcriptItems.findIndex(
        (item: any) =>
          item.kind === "status" && item.label === "hard-timeout-disconnect",
      );
      const notice = transcriptItems[noticeIndex] as any;
      const stages = (record?.events || []).map((event) => event.stage);
      assert.equal(result.status, "deferred");
      assert.equal(record?.conversationState, "closed");
      assert.equal(message?.state, "complete");
      assert.isAbove(noticeIndex, messageIndex);
      assert.include(notice?.text || "", "Job Timeout");
      assert.include(stages, "hard-timeout-disconnect-requested");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("pauses ACP hard timeout while a permission request is pending and restarts after resolution", async function () {
    this.timeout(7000);
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["auto"],
    });
    let permissionListener: ((request: any) => void | Promise<void>) | null =
      null;
    let requestId = "";
    let cancelCount = 0;
    let closeCount = 0;
    let releasePrompt: (() => void) | null = null;
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
      onPermissionRequest: (
        listener: (request: any) => void | Promise<void>,
      ) => {
        permissionListener = listener;
        return () => {
          permissionListener = null;
        };
      },
      newSession: async () => ({ sessionId: "session-permission-timeout" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        await permissionListener?.({
          requestId: "permission-timeout-pause",
          sessionId,
          toolCallId: "tool-timeout-pause",
          toolTitle: "Run protected tool",
          source: "acp-tool-call",
          summary: "Run protected tool.",
          requestedAt: "2026-06-05T00:00:00.000Z",
          options: [
            {
              optionId: "approve",
              kind: "allow_once",
              name: "Approve",
            },
          ],
          resolve: () => undefined,
        });
        await new Promise<void>((resolve) => {
          releasePrompt = resolve;
        });
        return { stopReason: "cancelled", cancelRequested: true };
      },
      cancel: async () => {
        cancelCount += 1;
        releasePrompt?.();
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        closeCount += 1;
        releasePrompt?.();
      },
    };

    try {
      const execution = executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "result",
          runtime_options: {
            execution_mode: "auto",
            hard_timeout_seconds: 1,
          },
        },
        dependencies: {
          scanRegistry: async () => ({
            entries: [entry],
            entriesById: { "demo-skill": entry },
            diagnostics: [],
          }),
          createWorkspace: async (workspaceArgs) => {
            const workspace = await createAcpSkillRunnerWorkspace({
              ...workspaceArgs,
              rootDir: root,
            });
            requestId = workspace.requestId;
            return workspace;
          },
          createAdapter: async () => fakeAdapter,
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });

      await delay(1200);
      const pausedRecord = getAcpSkillRunRecord(requestId);
      const pausedStages = (pausedRecord?.events || []).map(
        (event) => event.stage,
      );
      assert.isOk(pausedRecord?.pendingPermission);
      assert.equal(cancelCount, 0);
      assert.equal(closeCount, 0);
      assert.notInclude(pausedStages, "hard-timeout-disconnect-requested");

      resolveAcpSkillRunPermissionRequest({
        runRequestId: requestId,
        permissionRequestId: "permission-timeout-pause",
        outcome: "selected",
        optionId: "approve",
      });

      const result = await execution;
      const resumedRecord = getAcpSkillRunRecord(result.requestId);
      const resumedStages = (resumedRecord?.events || []).map(
        (event) => event.stage,
      );
      assert.equal(result.status, "deferred");
      assert.equal(cancelCount, 1);
      assert.equal(closeCount, 1);
      assert.include(resumedStages, "hard-timeout-disconnect-requested");
      assert.isNull(resumedRecord?.pendingPermission || null);
    } finally {
      releasePrompt?.();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("keeps workflow active task rows synchronized with terminal ACP skill runs", function () {
    recordWorkflowTaskUpdate(
      makeAcpWorkflowTaskJob({
        requestId: "acp-terminal-sync",
        state: "running",
      }),
    );
    assert.sameMembers(
      listActiveWorkflowTasks().map((entry) => entry.requestId),
      ["acp-terminal-sync"],
    );

    upsertAcpSkillRun({
      requestId: "acp-terminal-sync",
      backendId: "backend-acp",
      backendType: "acp",
      status: "succeeded",
    });

    assert.notInclude(
      listActiveWorkflowTasks().map((entry) => entry.requestId),
      "acp-terminal-sync",
    );
    const persisted = listWorkflowTasks().find(
      (entry) => entry.requestId === "acp-terminal-sync",
    );
    assert.equal(persisted?.state, "succeeded");
  });

  it("removes workflow task rows when ACP skill runs are archived or removed", function () {
    recordWorkflowTaskUpdate(
      makeAcpWorkflowTaskJob({
        requestId: "acp-archived-sync",
        state: "running",
      }),
    );
    upsertAcpSkillRun({
      requestId: "acp-archived-sync",
      backendId: "backend-acp",
      backendType: "acp",
      status: "running",
    });

    upsertAcpSkillRun({
      requestId: "acp-archived-sync",
      archivedAt: "2026-05-23T01:01:00.000Z",
    });

    assert.isUndefined(
      listWorkflowTasks().find(
        (entry) => entry.requestId === "acp-archived-sync",
      ),
    );
  });

  it("preserves recoverable ACP skill run workflow tasks on startup", function () {
    recordWorkflowTaskUpdate(
      makeAcpWorkflowTaskJob({
        requestId: "acp-recoverable-startup",
        state: "running",
      }),
    );
    upsertAcpSkillRun({
      requestId: "acp-recoverable-startup",
      backendId: "backend-acp",
      backendType: "acp",
      status: "running",
      conversationState: "active",
      conversationRecoveryState: "connected",
      activePrompt: true,
    });

    const result = reconcileAcpSkillRunWorkflowTasksOnStartup();

    assert.equal(result.recoverableCount, 1);
    assert.equal(result.failedCount, 0);
    assert.sameMembers(
      listActiveWorkflowTasks().map((entry) => entry.requestId),
      ["acp-recoverable-startup"],
    );
    const run = getAcpSkillRunRecord("acp-recoverable-startup");
    assert.equal(run?.status, "running");
    assert.equal(run?.conversationState, "closed");
    assert.equal(run?.conversationRecoveryState, "available");
    assert.equal(run?.activePrompt, false);
  });

  it("fails non-recoverable ACP skill run workflow tasks on startup", function () {
    recordWorkflowTaskUpdate(
      makeAcpWorkflowTaskJob({
        requestId: "acp-nonrecoverable-startup",
        state: "running",
      }),
    );
    upsertAcpSkillRun({
      requestId: "acp-nonrecoverable-startup",
      backendId: "backend-acp",
      backendType: "acp",
      status: "running",
      conversationRecoveryState: "unavailable",
    });

    const result = reconcileAcpSkillRunWorkflowTasksOnStartup();

    assert.equal(result.failedCount, 1);
    assert.deepEqual(
      listActiveWorkflowTasks().map((entry) => entry.requestId),
      [],
    );
    const run = getAcpSkillRunRecord("acp-nonrecoverable-startup");
    assert.equal(run?.status, "failed");
    const task = listWorkflowTasks().find(
      (entry) => entry.requestId === "acp-nonrecoverable-startup",
    );
    assert.equal(task?.state, "failed");
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

    let canceled = false;
    let interrupted = false;
    registerAcpSkillRunController("run-new", {
      cancel: async () => {
        canceled = true;
      },
      interruptTurn: async () => {
        interrupted = true;
        upsertAcpSkillRun({
          requestId: "run-new",
          conversationState: "closed",
          conversationRecoveryState: "available",
        });
      },
    });
    await interruptAcpSkillRunCurrentTurn("run-new");
    const interruptedRun = getAcpSkillRunRecord("run-new");
    assert.isFalse(canceled);
    assert.isTrue(interrupted);
    assert.equal(interruptedRun?.status, "waiting_user");
    assert.equal(interruptedRun?.conversationState, "closed");
    assert.equal(interruptedRun?.conversationRecoveryState, "available");
    assert.equal(interruptedRun?.events.at(-1)?.stage, "interrupt-requested");
    assert.isUndefined(interruptedRun?.removedAt);
  });

  it("interrupts an active ACP skill prompt without closing the live adapter", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let resolvePromptStarted: () => void = () => undefined;
    let rejectPrompt: ((error: Error) => void) | null = null;
    const promptStarted = new Promise<void>((resolve) => {
      resolvePromptStarted = resolve;
    });
    let cancelCalls = 0;
    let closeCalls = 0;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
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
      newSession: async () => ({ sessionId: "session-interrupt" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: "Working on the skill.",
            },
          },
        });
        return await new Promise<never>((_resolve, reject) => {
          rejectPrompt = reject;
          resolvePromptStarted();
        });
      },
      cancel: async () => {
        cancelCalls += 1;
        rejectPrompt?.(new Error("prompt interrupted"));
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        closeCalls += 1;
      },
    };

    const runPromise = executeAcpSkillRunnerJob({
      requestKind: ACP_SKILL_RUN_REQUEST_KIND,
      backend: createBackend(),
      request: {
        kind: ACP_SKILL_RUN_REQUEST_KIND,
        skill_id: "demo-skill",
        fetch_type: "result",
      },
      dependencies: {
        scanRegistry: async () => ({
          entries: [entry],
          entriesById: { "demo-skill": entry },
          diagnostics: [],
        }),
        createWorkspace: (args) =>
          createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
        createAdapter: async () => fakeAdapter,
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    });
    await promptStarted;

    const requestId = listAcpSkillRuns()[0]?.requestId || "";
    assert.isNotEmpty(requestId);
    assert.equal(getAcpSkillRunRecord(requestId)?.activePrompt, true);

    await interruptAcpSkillRunCurrentTurn(requestId);
    const result = await runPromise;
    const record = getAcpSkillRunRecord(requestId);

    assert.equal(cancelCalls, 1);
    assert.equal(closeCalls, 0);
    assert.equal(result.status, "deferred");
    assert.equal(
      (result as { backendStatus?: string }).backendStatus,
      "waiting_user",
    );
    assert.deepInclude(result.responseJson as Record<string, unknown>, {
      provider: "acp",
      requestId,
      status: "interrupted",
    });
    assert.equal(record?.status, "waiting_user");
    assert.equal(record?.activePrompt, false);
    assert.equal(record?.replyState, "idle");
    assert.equal(record?.conversationState, "active");
    assert.equal(record?.conversationRecoveryState, "connected");
    assert.isUndefined(record?.removedAt);
  });

  it("ignores stale assistant text returned after current turn cancel", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let resolvePromptStarted: () => void = () => undefined;
    let releasePrompt: (() => void) | null = null;
    const promptStarted = new Promise<void>((resolve) => {
      resolvePromptStarted = resolve;
    });
    let promptCalls = 0;
    let cancelCalls = 0;
    let closeCalls = 0;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
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
      newSession: async () => ({ sessionId: "session-interrupt-return" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        promptCalls += 1;
        if (promptCalls === 1) {
          await updateListener?.({
            sessionId,
            update: {
              sessionUpdate: "agent_message_chunk",
              content: {
                type: "text",
                text: "not valid json after cancel",
              },
            },
          });
          resolvePromptStarted();
          await new Promise<void>((resolve) => {
            releasePrompt = resolve;
          });
          return { stopReason: "cancelled" };
        }
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: JSON.stringify({ ok: true, __SKILL_DONE__: true }),
            },
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => {
        cancelCalls += 1;
        releasePrompt?.();
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        closeCalls += 1;
      },
    };

    try {
      const runPromise = executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "result",
        },
        dependencies: {
          scanRegistry: async () => ({
            entries: [entry],
            entriesById: { "demo-skill": entry },
            diagnostics: [],
          }),
          createWorkspace: (args) =>
            createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
          createAdapter: async () => fakeAdapter,
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });
      await promptStarted;
      const requestId = listAcpSkillRuns()[0]?.requestId || "";

      await interruptAcpSkillRunCurrentTurn(requestId);
      const result = await runPromise;
      const record = getAcpSkillRunRecord(requestId);
      const stages = (record?.events || []).map((event) => event.stage);

      assert.equal(result.status, "deferred");
      assert.equal(
        (result as { backendStatus?: string }).backendStatus,
        "waiting_user",
      );
      assert.deepInclude(result.responseJson as Record<string, unknown>, {
        status: "interrupted",
      });
      assert.equal(record?.status, "waiting_user");
      assert.equal(record?.conversationRecoveryState, "connected");
      assert.equal(cancelCalls, 1);
      assert.equal(closeCalls, 0);
      assert.notInclude(stages, "output-validation-failed");
      assert.notInclude(stages, "result-file-fallback-skipped");
      assert.notInclude(stages, "repair-started");

      await replyAcpSkillRun({
        requestId,
        message: "continue after turn cancel",
      });
      assert.equal(promptCalls, 2);
      assert.equal(getAcpSkillRunRecord(requestId)?.replyState, "idle");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("fails recoverably without output repair when end_turn returns no assistant output", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
    });
    try {
      let caught: unknown;
      try {
        await runDemoAcpSkill({ root, entry, adapter });
      } catch (error) {
        caught = error;
      }
      const record = listAcpSkillRuns()[0];
      const stages = (record?.events || []).map((event) => event.stage);

      assert.instanceOf(caught, Error);
      assert.equal(getPromptCount(), 1);
      assert.equal(record?.status, "failed");
      assert.equal(record?.conversationState, "closed");
      assert.equal(record?.conversationRecoveryState, "available");
      assert.equal(record?.repairRounds, 0);
      assert.deepEqual(record?.outputRevisions, []);
      assert.include(stages, "acp-prompt-no-output");
      assert.notInclude(stages, "output-validation-failed");
      assert.notInclude(stages, "repair-started");
      assert.isTrue(
        (record?.transcriptItems || []).some(
          (item) =>
            item.kind === "status" && item.label === "acp-prompt-no-output",
        ),
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("accepts adapter-projected Claude raw SDK assistant text after empty standard chunks", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
      updates: [
        {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: "",
          },
        },
      ],
      assistantText: JSON.stringify({ __SKILL_DONE__: true, ok: true }),
    });
    try {
      const result = await runDemoAcpSkill({ root, entry, adapter });
      const record = listAcpSkillRuns()[0];
      const stages = (record?.events || []).map((event) => event.stage);

      assert.equal(result.status, "succeeded");
      assert.equal(getPromptCount(), 1);
      assert.equal(record?.status, "succeeded");
      assert.equal(record?.repairRounds, 0);
      assert.equal(record?.validationStatus, "valid");
      assert.notInclude(stages, "acp-prompt-no-output");
      assert.notInclude(stages, "repair-started");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("repairs invalid adapter-projected Claude raw SDK assistant text", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
      updates: [
        {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: "",
          },
        },
      ],
      assistantText: (promptCount) =>
        promptCount === 1
          ? "non-contract fallback text"
          : JSON.stringify({ __SKILL_DONE__: true, ok: true }),
    });
    try {
      const result = await runDemoAcpSkill({ root, entry, adapter });
      const record = listAcpSkillRuns()[0];
      const stages = (record?.events || []).map((event) => event.stage);

      assert.equal(result.status, "succeeded");
      assert.equal(getPromptCount(), 2);
      assert.equal(record?.status, "succeeded");
      assert.equal(record?.repairRounds, 1);
      assert.include(stages, "output-validation-failed");
      assert.include(stages, "repair-started");
      assert.notInclude(stages, "acp-prompt-no-output");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("uses output repair when empty end_turn had observable ACP activity", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
      updates: (promptCount) =>
        promptCount === 1
          ? [
              {
                sessionUpdate: "agent_thought_chunk",
                content: {
                  type: "text",
                  text: "I inspected the source material.",
                },
              },
              {
                sessionUpdate: "plan",
                entries: [
                  {
                    content: "Confirm next step with structured output",
                    status: "in_progress",
                  },
                ],
              },
            ]
          : [],
      assistantText: (promptCount) =>
        promptCount === 2
          ? JSON.stringify({ __SKILL_DONE__: true, ok: true })
          : undefined,
    });
    try {
      const result = await runDemoAcpSkill({ root, entry, adapter });
      const record = listAcpSkillRuns()[0];
      const stages = (record?.events || []).map((event) => event.stage);

      assert.equal(result.status, "succeeded");
      assert.equal(getPromptCount(), 2);
      assert.equal(record?.status, "succeeded");
      assert.equal(record?.repairRounds, 1);
      assert.include(stages, "output-validation-failed");
      assert.include(stages, "repair-started");
      assert.notInclude(stages, "acp-prompt-no-output");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  for (const stopReason of [
    "max_tokens",
    "max_turn_requests",
    "refusal",
    "cancelled",
  ]) {
    it(`fails recoverably without output repair when ACP stopReason is ${stopReason}`, async function () {
      const root = await mkTempRoot();
      const { entry } = await createSkill(root);
      const { adapter, getPromptCount } = createPromptStopAdapter({
        stopReason,
        assistantText: "partial non-contract output",
      });
      try {
        let caught: unknown;
        try {
          await runDemoAcpSkill({ root, entry, adapter });
        } catch (error) {
          caught = error;
        }
        const record = listAcpSkillRuns()[0];
        const stages = (record?.events || []).map((event) => event.stage);

        assert.instanceOf(caught, Error);
        assert.equal(getPromptCount(), 1);
        assert.equal(record?.status, "failed");
        assert.equal(record?.conversationState, "closed");
        assert.equal(record?.conversationRecoveryState, "available");
        assert.equal(record?.repairRounds, 0);
        assert.deepEqual(record?.outputRevisions, []);
        assert.include(stages, "acp-prompt-stopped");
        assert.notInclude(stages, "output-validation-failed");
        assert.notInclude(stages, "repair-started");
        assert.equal(
          (record?.events || []).find(
            (event) => event.stage === "acp-prompt-stopped",
          )?.details?.stopReason,
          stopReason,
        );
      } finally {
        await fs.rm(root, { recursive: true, force: true });
      }
    });
  }

  it("fails recoverably without output repair when ACP prompt raises a request error", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { adapter, getPromptCount } = createPromptStopAdapter({
      promptError: new RequestError(-32000, "backend prompt failed", {
        reason: "provider",
      }),
    });
    try {
      let caught: unknown;
      try {
        await runDemoAcpSkill({ root, entry, adapter });
      } catch (error) {
        caught = error;
      }
      const record = listAcpSkillRuns()[0];
      const stages = (record?.events || []).map((event) => event.stage);

      assert.instanceOf(caught, Error);
      assert.equal(getPromptCount(), 1);
      assert.equal(record?.status, "failed");
      assert.equal(record?.conversationState, "closed");
      assert.equal(record?.conversationRecoveryState, "available");
      assert.equal(record?.repairRounds, 0);
      assert.deepEqual(record?.outputRevisions, []);
      assert.include(stages, "acp-prompt-failed");
      assert.notInclude(stages, "output-validation-failed");
      assert.notInclude(stages, "repair-started");
      assert.equal(
        (record?.events || []).find(
          (event) => event.stage === "acp-prompt-failed",
        )?.details?.code,
        -32000,
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("fails recoverably without output repair when adapter exposes backend prompt error without assistant output", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
      backendError: {
        message: "backend stream failed",
        name: "BackendStreamError",
        code: "stream_error",
        source: "session_update",
      },
    });
    try {
      let caught: unknown;
      try {
        await runDemoAcpSkill({ root, entry, adapter });
      } catch (error) {
        caught = error;
      }
      const record = listAcpSkillRuns()[0];
      const stages = (record?.events || []).map((event) => event.stage);

      assert.instanceOf(caught, Error);
      assert.equal(getPromptCount(), 1);
      assert.equal(record?.status, "failed");
      assert.equal(record?.conversationState, "closed");
      assert.equal(record?.conversationRecoveryState, "available");
      assert.equal(record?.repairRounds, 0);
      assert.deepEqual(record?.outputRevisions, []);
      assert.include(stages, "acp-prompt-failed");
      assert.notInclude(stages, "output-validation-failed");
      assert.notInclude(stages, "repair-started");
      assert.isTrue(
        (record?.transcriptItems || []).some(
          (item) =>
            item.kind === "status" && item.label === "acp-prompt-failed",
        ),
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("does not let session update backend diagnostics override valid assistant output", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
      assistantText: JSON.stringify({ __SKILL_DONE__: true, ok: true }),
      backendError: {
        message: "backend stream failed",
        name: "BackendStreamError",
        code: "stream_error",
        source: "session_update",
      },
    });
    try {
      const result = await runDemoAcpSkill({ root, entry, adapter });
      const record = listAcpSkillRuns()[0];
      const stages = (record?.events || []).map((event) => event.stage);

      assert.equal(result.status, "succeeded");
      assert.equal(getPromptCount(), 1);
      assert.equal(record?.status, "succeeded");
      assert.equal(record?.repairRounds, 0);
      assert.notInclude(stages, "acp-prompt-failed");
      assert.notInclude(stages, "repair-started");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("keeps failed ACP tool updates output-governed when final JSON is valid", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
      updates: [
        {
          sessionUpdate: "tool_call",
          toolCallId: "tool-1",
          title: "read",
          status: "pending",
        },
        {
          sessionUpdate: "tool_call_update",
          toolCallId: "tool-1",
          title: "read",
          status: "failed",
          rawOutput: {
            error: "File not found",
          },
        },
      ],
      assistantText: JSON.stringify({ __SKILL_DONE__: true, ok: true }),
    });
    try {
      const result = await runDemoAcpSkill({ root, entry, adapter });
      const record = listAcpSkillRuns()[0];
      const stages = (record?.events || []).map((event) => event.stage);

      assert.equal(result.status, "succeeded");
      assert.equal(getPromptCount(), 1);
      assert.equal(record?.status, "succeeded");
      assert.equal(record?.repairRounds, 0);
      assert.notInclude(stages, "acp-prompt-failed");
      assert.notInclude(stages, "repair-started");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("repairs invalid assistant output after failed ACP tool updates", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
      updates: (promptCount) =>
        promptCount === 1
          ? [
              {
                sessionUpdate: "tool_call",
                toolCallId: "tool-1",
                title: "glob",
                status: "pending",
              },
              {
                sessionUpdate: "tool_call_update",
                toolCallId: "tool-1",
                title: "glob",
                status: "failed",
                rawOutput: {
                  error: "ripgrep execution failed",
                },
              },
            ]
          : [],
      assistantText: (promptCount) =>
        promptCount === 1
          ? "not valid JSON"
          : JSON.stringify({ __SKILL_DONE__: true, ok: true }),
    });
    try {
      const result = await runDemoAcpSkill({ root, entry, adapter });
      const record = listAcpSkillRuns()[0];
      const stages = (record?.events || []).map((event) => event.stage);

      assert.equal(result.status, "succeeded");
      assert.equal(getPromptCount(), 2);
      assert.equal(record?.status, "succeeded");
      assert.equal(record?.repairRounds, 1);
      assert.include(stages, "output-validation-failed");
      assert.include(stages, "repair-started");
      assert.notInclude(stages, "acp-prompt-failed");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("fails recoverably without output repair when ACP prompt connection closes", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { adapter, getPromptCount } = createPromptStopAdapter({
      promptError: new Error("ACP connection closed"),
    });
    try {
      let caught: unknown;
      try {
        await runDemoAcpSkill({ root, entry, adapter });
      } catch (error) {
        caught = error;
      }
      const record = listAcpSkillRuns()[0];
      const stages = (record?.events || []).map((event) => event.stage);

      assert.instanceOf(caught, Error);
      assert.equal(getPromptCount(), 1);
      assert.equal(record?.status, "failed");
      assert.equal(record?.conversationState, "closed");
      assert.equal(record?.conversationRecoveryState, "available");
      assert.equal(record?.repairRounds, 0);
      assert.deepEqual(record?.outputRevisions, []);
      assert.include(stages, "acp-prompt-failed");
      assert.notInclude(stages, "output-validation-failed");
      assert.notInclude(stages, "repair-started");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("recovers valid result files before failing an empty end_turn prompt", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
    });
    try {
      const result = await runDemoAcpSkill({
        root,
        entry,
        adapter,
        createWorkspace: async (workspaceArgs) => {
          const workspace = await createAcpSkillRunnerWorkspace({
            ...workspaceArgs,
            rootDir: root,
          });
          await fs.writeFile(
            path.join(workspace.workspaceDir, "demo-skill.result.json"),
            JSON.stringify({ ok: true }),
            "utf8",
          );
          return workspace;
        },
      });
      const record = listAcpSkillRuns()[0];
      const stages = (record?.events || []).map((event) => event.stage);

      assert.equal(result.status, "succeeded");
      assert.equal(getPromptCount(), 1);
      assert.equal(record?.status, "succeeded");
      assert.equal(record?.repairRounds, 0);
      assert.include(stages, "result-file-fallback-succeeded");
      assert.notInclude(stages, "acp-prompt-no-output");
      assert.notInclude(stages, "repair-started");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("builds Skill-Runner-aligned ACP repair prompts with target contract details", function () {
    const prompt = buildAcpSkillOutputRepairPrompt({
      executionMode: "interactive",
      previousCandidate: '{"ui_hints":{"choices":[]}}',
      errors: ["pending output requires ui_hints object"],
      repairRound: 1,
      maxRepairRounds: 3,
      outputContractDetails: [
        "### Output Contract Details",
        "#### Pending Branch Contract",
        "- `ui_hints.options`: optional array for choose_one.",
      ].join("\n"),
    });
    assert.include(
      prompt,
      "Your previous output did not satisfy the Skill Runner output contract.",
    );
    assert.include(prompt, "Previous candidate:");
    assert.include(prompt, '{"ui_hints":{"choices":[]}}');
    assert.include(prompt, "Validation errors:");
    assert.include(prompt, "- pending output requires ui_hints object");
    assert.include(prompt, "Target output contract details:");
    assert.include(prompt, "`ui_hints.options`");
    assert.include(
      prompt,
      "Do not hand-write the runner-owned result JSON path.",
    );
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
      ["mcp_required_guard", "recovered_continuation_guard"],
    );
    for (const template of ACP_RUNTIME_PROMPT_TEMPLATES) {
      const content = await loadAcpRuntimePromptTemplate(template);
      assert.isNotEmpty(content, template.filename);
    }

    const guardPrompt = renderAcpRuntimePromptTemplate({
      template: await loadAcpRuntimePromptTemplate(
        ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.mcp_required_guard,
      ),
      replacements: {
        REQUIRED_TOOLS_INLINE: "topics.list",
      },
      requiredPlaceholders: ["REQUIRED_TOOLS_INLINE"],
    });
    assert.include(
      guardPrompt,
      "The host has already completed MCP availability preflight",
    );
    assert.include(guardPrompt, "Required MCP tools: topics.list");

    const continuationPrompt = renderAcpRuntimePromptTemplate({
      template: await loadAcpRuntimePromptTemplate(
        ACP_RUNTIME_PROMPT_TEMPLATES_BY_ID.recovered_continuation_guard,
      ),
      replacements: {
        EXECUTION_MODE: "interactive",
        INPUT_MANIFEST_PATH: "input.json",
        OUTPUT_BRANCH_INSTRUCTION: "- Return the pending or final branch.",
        REQUESTED_SKILL_ID: "demo-skill",
        RESULT_JSON_PATH: "result/demo-skill.1/result.json",
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

    const orchestratorSource = await fs.readFile(
      "src/modules/acpSkillRunnerOrchestrator.ts",
      "utf8",
    );
    assert.notInclude(orchestratorSource, "mcp_callable_smoke");
    assert.notInclude(orchestratorSource, "mcp-callable-smoke");
    assert.notInclude(orchestratorSource, "mcp-smoke");
  });

  it("keeps ACP MCP descriptor injection available through explicit compatibility mode", async function () {
    const adapterSource = await fs.readFile(
      "src/modules/acpConnectionAdapter.ts",
      "utf8",
    );
    assert.include(adapterSource, "explicit_descriptor_injection");
    assert.include(adapterSource, "mcp_compat_disabled");
    assert.include(adapterSource, "mcp_compat_descriptor_injected");
    assert.include(adapterSource, "return [descriptor];");
    assert.notInclude(adapterSource, "wrapMcpServersForSession");
    assert.notInclude(adapterSource, "startMcpSmokeSpan");
    assert.notInclude(adapterSource, "mcp-gateway");
  });

  it("materializes Host Bridge CLI run profile, runtime README, and env without leaking token", async function () {
    const root = await mkTempRoot();
    const cliPath = path.join(
      root,
      "bin",
      process.platform === "win32" ? "zotero-bridge.exe" : "zotero-bridge",
    );
    await fs.mkdir(path.dirname(cliPath), { recursive: true });
    await fs.writeFile(cliPath, "", "utf8");

    const injection = await materializeHostBridgeCliRunInjection({
      workspaceDir: root,
      requestId: "run-host-bridge-cli",
      ensureServer: async () => ({
        status: "running",
        protocol: "host-bridge.v1",
        host: "127.0.0.1",
        port: 26570,
        endpoint: "http://127.0.0.1:26570/bridge/v1",
        bindMode: "loopback",
        lanEnabled: false,
        portMode: "random",
        pinPortEnabled: false,
        pinnedPort: 26570,
        supervised: true,
        restartCount: 0,
        lastRecoveryReason: "",
        authRequired: true,
        tokenMasked: "secret...oken",
        lastRequestMethod: "",
        lastResponseStatus: 0,
        lastError: "",
        requestCount: 0,
        updatedAt: "2026-05-20T00:00:00.000Z",
      }),
      getToken: () => "secret-token",
      resolveCli: async () => ({
        available: true,
        binaryPath: cliPath,
        cliDir: path.dirname(cliPath),
        source: "env",
      }),
    });

    const profile = JSON.parse(
      await fs.readFile(injection.profilePath, "utf8"),
    );
    const readme = await fs.readFile(injection.readmePath, "utf8");

    assert.isTrue(injection.available);
    assert.isFalse(injection.autoApproveWrites);
    assert.strictEqual(profile.auth.tokenEnv, "ZOTERO_BRIDGE_TOKEN");
    assert.strictEqual(profile.scope.kind, "acp-skill-run");
    assert.isUndefined(profile.scope.autoApproveWrites);
    assert.notInclude(JSON.stringify(profile), "secret-token");
    assert.include(
      readme,
      "Host Bridge CLI guidance is provided by the built-in `zotero-bridge-cli` wrapper skill.",
    );
    assert.include(readme, "references/host-bridge-cli.md");
    assert.notInclude(readme, "zotero-bridge item search");
    assert.notInclude(readme, "secret-token");
    assert.strictEqual(injection.env.ZOTERO_BRIDGE_TOKEN, "secret-token");
    assert.isString(injection.shimDir);
    const shellShim = await fs.readFile(
      path.join(injection.shimDir || "", "zotero-bridge"),
      "utf8",
    );
    const cmdShim = await fs.readFile(
      path.join(injection.shimDir || "", "zotero-bridge.cmd"),
      "utf8",
    );
    assert.include(shellShim, formatPortablePathForTest(cliPath));
    assert.include(cmdShim, cliPath);
    assert.include(injection.env.PATH, injection.shimDir || "");
    assert.include(injection.env.PATH, path.dirname(cliPath));
    assert.strictEqual(injection.env.Path, injection.env.PATH);

    const wrapped = applyHostBridgeCliEnvToBackend({
      backend: createBackend({
        env: {
          PATH: "existing-path",
        },
      }),
      injection,
    });
    assert.include(wrapped.env?.PATH || "", path.dirname(cliPath));
    assert.include(wrapped.env?.PATH || "", injection.shimDir || "");
    assert.include(wrapped.env?.PATH || "", "existing-path");
    assert.strictEqual(wrapped.env?.Path, wrapped.env?.PATH);

    const previousPath = process.env.PATH;
    process.env.PATH = "system-path";
    try {
      const inheritedPathWrapped = applyHostBridgeCliEnvToBackend({
        backend: createBackend({ env: {} }),
        injection,
      });
      assert.include(
        inheritedPathWrapped.env?.PATH || "",
        path.dirname(cliPath),
      );
      assert.include(inheritedPathWrapped.env?.PATH || "", "system-path");
      assert.strictEqual(
        inheritedPathWrapped.env?.Path,
        inheritedPathWrapped.env?.PATH,
      );
    } finally {
      if (typeof previousPath === "string") {
        process.env.PATH = previousPath;
      } else {
        delete process.env.PATH;
      }
    }
  });

  it("materializes Host Bridge CLI auto-approve write scope when requested", async function () {
    const root = await mkTempRoot();
    const injection = await materializeHostBridgeCliRunInjection({
      workspaceDir: root,
      requestId: "run-auto-approve-writes",
      autoApproveWrites: true,
      ensureServer: async () =>
        ({
          status: "running",
          protocol: "host-bridge.v1",
          host: "127.0.0.1",
          port: 26570,
          endpoint: "http://127.0.0.1:26570/bridge/v1",
          bindMode: "loopback",
          lanEnabled: false,
          portMode: "random",
          pinPortEnabled: false,
          pinnedPort: 26570,
          supervised: true,
          restartCount: 0,
          lastRecoveryReason: "",
          authRequired: true,
          tokenMasked: "secret...oken",
          lastRequestMethod: "",
          lastResponseStatus: 0,
          lastError: "",
          requestCount: 0,
          updatedAt: "2026-05-20T00:00:00.000Z",
        }) as any,
      getToken: () => "secret-token",
      resolveCli: async () => ({
        available: false,
        code: "cli_binary_unavailable",
        message: "missing",
        checkedPaths: [],
      }),
    });

    const profile = JSON.parse(
      await fs.readFile(injection.profilePath, "utf8"),
    );
    const readme = await fs.readFile(injection.readmePath, "utf8");

    assert.strictEqual(profile.scope.requestId, "run-auto-approve-writes");
    assert.isTrue(profile.scope.autoApproveWrites);
    assert.isTrue(injection.autoApproveWrites);
    assert.include(readme, "Auto-approve Zotero writes for this run: enabled.");
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
      headerPatchBlock:
        "<!-- zotero-skills-acp-thin-proxy:start -->\nRESOURCE\n<!-- zotero-skills-acp-thin-proxy:end -->",
      footerPatchBlock:
        "<!-- zotero-skills-acp-runtime-patch:start -->\nRUNTIME\n<!-- zotero-skills-acp-runtime-patch:end -->",
    });

    assert.match(
      patched,
      /^---\r?\nname: Demo Skill\r?\n---\r?\n\r?\n<!-- zotero-skills-acp-thin-proxy:start -->/,
    );
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
    const response = result.responseJson as {
      requestedSkillProxyPath?: string;
    };
    const proxySkillMd = await fs.readFile(
      path.join(response.requestedSkillProxyPath || "", "SKILL.md"),
      "utf8",
    );
    assert.include(proxySkillMd, "Output schema path:");
    assert.include(
      proxySkillMd.replace(/\\/g, "/"),
      "/assets/output.schema.json",
    );
    assert.include(
      proxySkillMd,
      "| `ok` | const true | yes | Must equal true. |",
    );
    assert.notInclude(proxySkillMd, "Output schema path: (not declared)");
    assert.notInclude(
      proxySkillMd,
      "| `(schema)` | object | yes | Final payload must satisfy the output schema. |",
    );
  });

  it("validates final output against default assets/output.schema.json", async function () {
    const root = await mkTempRoot();
    try {
      const { skillDir } = await createSkill(root, { declareSchemas: false });
      const runnerJson = JSON.parse(
        await fs.readFile(path.join(skillDir, "assets", "runner.json"), "utf8"),
      );

      const invalid = await validateAcpSkillFinalPayload({
        payload: {},
        runnerJson,
        primarySkillDir: skillDir,
      });
      const valid = await validateAcpSkillFinalPayload({
        payload: { ok: true },
        runnerJson,
        primarySkillDir: skillDir,
      });

      assert.isFalse(invalid.ok);
      assert.include(invalid.errors.join("\n"), "required");
      assert.isTrue(valid.ok);
      assert.include(
        formatPortablePathForTest(valid.schemaPath || ""),
        "/assets/output.schema.json",
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("validates ACP artifact-manifest output files as flat manifests", async function () {
    const root = await mkTempRoot();
    try {
      const { skillDir } = await createSkill(root);
      const runnerJson = JSON.parse(
        await fs.readFile(path.join(skillDir, "assets", "runner.json"), "utf8"),
      );
      await fs.writeFile(
        path.join(skillDir, "assets", "output.schema.json"),
        JSON.stringify({
          type: "object",
          required: ["ok", "artifact_manifest_path"],
          additionalProperties: false,
          properties: {
            ok: { const: true },
            artifact_manifest_path: {
              type: "string",
              "x-type": "artifact-manifest",
              "x-role": "artifact-manifest",
            },
          },
        }),
        "utf8",
      );

      const manifestPath = path.join(
        root,
        "workspace",
        "result",
        "artifacts.json",
      );
      const nested = await validateAcpSkillFinalPayload({
        payload: {
          ok: true,
          artifact_manifest_path: manifestPath,
        },
        runnerJson,
        primarySkillDir: skillDir,
        readArtifactText: async () =>
          JSON.stringify({
            artifacts: {
              digest: { path: path.join(root, "workspace", "result", "d.md") },
            },
          }),
      });
      const flat = await validateAcpSkillFinalPayload({
        payload: {
          ok: true,
          artifact_manifest_path: manifestPath,
        },
        runnerJson,
        primarySkillDir: skillDir,
        readArtifactText: async () =>
          JSON.stringify({
            digest: path.join(root, "workspace", "result", "d.md"),
            notes: "result/notes.md",
          }),
      });

      assert.isFalse(nested.ok);
      assert.include(
        nested.errors.join("\n"),
        "artifact_manifest_path.artifacts",
      );
      assert.isTrue(flat.ok, flat.errors.join("; "));
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("falls back from an invalid declared output schema path", async function () {
    const root = await mkTempRoot();
    try {
      const { skillDir } = await createSkill(root);
      const runnerJson = {
        id: "demo-skill",
        schemas: { output: "../outside.schema.json" },
      };

      const validation = await validateAcpSkillFinalPayload({
        payload: { ok: true },
        runnerJson,
        primarySkillDir: skillDir,
      });

      assert.isTrue(validation.ok);
      assert.include(
        formatPortablePathForTest(validation.schemaPath || ""),
        "/assets/output.schema.json",
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("fails final output validation when no output schema can be resolved", async function () {
    const root = await mkTempRoot();
    try {
      const { skillDir } = await createSkill(root, { declareSchemas: false });
      await fs.rm(path.join(skillDir, "assets", "output.schema.json"));
      const runnerJson = JSON.parse(
        await fs.readFile(path.join(skillDir, "assets", "runner.json"), "utf8"),
      );

      const validation = await validateAcpSkillFinalPayload({
        payload: { ok: true },
        runnerJson,
        primarySkillDir: skillDir,
      });

      assert.isFalse(validation.ok);
      assert.include(validation.errors.join("\n"), "output schema is missing");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("rejects literature-analysis selected markdown representative image without markdown_src_hint", async function () {
    const skillDir = path.join(
      process.cwd(),
      "skills_builtin",
      "literature-analysis",
    );
    const runnerJson = JSON.parse(
      await fs.readFile(path.join(skillDir, "assets", "runner.json"), "utf8"),
    );

    const validation = await validateAcpSkillFinalPayload({
      payload: {
        digest_path: "digest.md",
        references_path: "references.json",
        citation_analysis_path: "citation-analysis.json",
        provenance: { generated_at: "2026-05-22T00:00:00.000Z" },
        warnings: [],
        error: null,
        representative_image: {
          status: "selected",
          source_kind: "markdown_image_ref",
          label: "Figure 1",
          caption_quote: "overview",
          selection_reason: "representative overview",
          confidence: "medium",
        },
      },
      runnerJson,
      primarySkillDir: skillDir,
    });

    assert.isFalse(validation.ok);
    assert.include(validation.errors.join("\n"), "markdown_src_hint");
  });

  it("validates ACP request input and parameter schemas with local file paths", async function () {
    const root = await mkTempRoot();
    try {
      const { skillDir } = await createSkill(root);
      const sourcePath = path.join(root, "paper.md");
      await fs.writeFile(sourcePath, "# Paper\n", "utf8");
      await fs.writeFile(
        path.join(skillDir, "assets", "input.schema.json"),
        JSON.stringify({
          type: "object",
          required: ["source_path", "note"],
          properties: {
            source_path: { type: "string", "x-input-source": "file" },
            note: { type: "string", "x-input-source": "inline" },
          },
          additionalProperties: false,
        }),
        "utf8",
      );
      await fs.writeFile(
        path.join(skillDir, "assets", "parameter.schema.json"),
        JSON.stringify({
          type: "object",
          required: ["language"],
          properties: { language: { type: "string" } },
          additionalProperties: false,
        }),
        "utf8",
      );
      const runnerJson = JSON.parse(
        await fs.readFile(path.join(skillDir, "assets", "runner.json"), "utf8"),
      );

      const valid = await validateAcpSkillRunRequestAgainstSchemas({
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          input: { source_path: sourcePath, note: "inline note" },
          parameter: { language: "zh-CN" },
        },
        runnerJson,
        skillDir,
        workspaceDir: root,
      });
      const invalid = await validateAcpSkillRunRequestAgainstSchemas({
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          input: {
            source_path: "inputs/source_path/paper.md",
            note: "inline note",
          },
          parameter: { language: "zh-CN" },
        },
        runnerJson,
        skillDir,
        workspaceDir: root,
      });

      assert.isTrue(valid.ok);
      assert.deepEqual(valid.inputContext, {
        source_path: sourcePath,
        note: "inline note",
      });
      assert.deepEqual(valid.parameterContext, { language: "zh-CN" });
      assert.isFalse(invalid.ok);
      assert.include(invalid.errors.join("\n"), "absolute local path");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("recovers valid output from package result-file fallback", async function () {
    const root = await mkTempRoot();
    try {
      const { skillDir } = await createSkill(root);
      const runnerJson = JSON.parse(
        await fs.readFile(path.join(skillDir, "assets", "runner.json"), "utf8"),
      );
      await fs.writeFile(
        path.join(root, "demo-skill.result.json"),
        JSON.stringify({ ok: true }),
        "utf8",
      );

      const fallback = await resolveAcpSkillResultFileFallback({
        skillId: "demo-skill",
        runnerJson,
        workspaceDir: root,
        validator: (payload) =>
          validateAcpSkillFinalPayload({
            payload,
            runnerJson,
            primarySkillDir: skillDir,
          }),
      });

      assert.deepEqual(fallback.payload, { ok: true });
      assert.equal(
        fallback.warnings.at(-1)?.code,
        "OUTPUT_RECOVERED_FROM_RESULT_FILE",
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
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
    assert.equal(
      plan.diagnostic?.code,
      "runtime_dependencies_wrapper_disabled",
    );
    assert.equal(plan.wrappedBackend.command, "npx");
  });

  it("does not run runner-declared MCP preflight by default when HTTP MCP is unavailable", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      mcpRequiredTools: ["topics.list"],
    });
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let newSessionCount = 0;
    let promptCount = 0;
    let mcpPreflightCalled = false;
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
        return { sessionId: "session-should-not-start" };
      },
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
        mcpPreflight: async () => {
          mcpPreflightCalled = true;
          throw new Error("MCP preflight should be disabled by default");
        },
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    });
    assert.equal(result.status, "succeeded");
    assert.isFalse(mcpPreflightCalled);
    assert.equal(newSessionCount, 1);
    assert.equal(promptCount, 1);
    const run = listAcpSkillRuns()[0];
    assert.equal(run.status, "succeeded");
    assert.isFalse(
      run.events.some((event) => event.stage === "mcp-preflight-failed"),
    );
    const hostAccess = run.events.find(
      (event) => event.stage === "host-access-mode",
    );
    assert.deepInclude(hostAccess?.details as any, {
      primary: "host_bridge_cli",
      mcpCompatibility: "disabled_by_default",
    });
  });

  it("does not block default runs when declared MCP tools are missing", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      mcpRequiredTools: ["topics.missing_tool"],
    });
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let newSessionCount = 0;
    let promptCount = 0;
    let mcpPreflightCalled = false;
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
        return { sessionId: "session-should-not-start" };
      },
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
        mcpPreflight: async () => {
          mcpPreflightCalled = true;
          throw new Error("MCP preflight should be disabled by default");
        },
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    });
    assert.equal(result.status, "succeeded");
    assert.isFalse(mcpPreflightCalled);
    assert.equal(newSessionCount, 1);
    assert.equal(promptCount, 1);
    const run = listAcpSkillRuns()[0];
    assert.equal(run.status, "succeeded");
    assert.isFalse(
      run.events.some((event) => event.stage === "mcp-preflight-failed"),
    );
  });

  it("records workflow-declared MCP tools without preflight or guarded business prompt by default", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    const { entry: wrapperEntry } = await createHostBridgeWrapperSkill(root);
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    const promptMessages: string[] = [];
    const order: string[] = [];
    let mcpPreflightCalled = false;
    let hostBridgeInjectionCalled = 0;
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
            required_tools: ["topics.list", "paper_artifacts.export_filtered"],
          },
          zotero_host_access: {
            auto_approve_writes: true,
          },
        },
      },
      dependencies: {
        scanRegistry: async () => ({
          entries: [entry, wrapperEntry],
          entriesById: {
            "demo-skill": entry,
            "zotero-bridge-cli": wrapperEntry,
          },
          diagnostics: [],
        }),
        createWorkspace: (args) =>
          import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
            mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
          ),
        createAdapter: async () => fakeAdapter,
        mcpPreflight: async () => {
          mcpPreflightCalled = true;
          throw new Error("MCP preflight should be disabled by default");
        },
        hostBridgeCliInjection: async (input) => {
          assert.isTrue(input.autoApproveWrites);
          hostBridgeInjectionCalled += 1;
          return {
            available: true,
            endpoint: "http://127.0.0.1:26570/bridge/v1",
            tokenMasked: "token",
            profilePath: ".zotero-bridge/profile.json",
            readmePath: ".zotero-bridge/README.md",
            pathInjected: true,
            autoApproveWrites: true,
            env: {
              ZOTERO_BRIDGE_PROFILE: ".zotero-bridge/profile.json",
              ZOTERO_BRIDGE_TOKEN: "secret",
            },
          };
        },
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    });

    assert.equal(result.status, "succeeded");
    assert.equal(hostBridgeInjectionCalled, 1);
    assert.isFalse(mcpPreflightCalled);
    assert.deepEqual(order, ["prompt"]);
    assert.lengthOf(promptMessages, 1);
    assert.notInclude(
      promptMessages[0],
      "The host has already completed MCP availability preflight",
    );
    assert.notInclude(promptMessages[0], "Do not search MCP configuration");
    assert.include(promptMessages[0], "demo-skill");
    assert.notInclude(promptMessages[0], "[Zotero Host Bridge CLI]");
    const response = result.responseJson as {
      workspaceDir?: string;
      sharedSkillCatalogPath?: string;
    };
    const runInstructions = await fs.readFile(
      path.join(response.workspaceDir || "", "AGENTS.md"),
      "utf8",
    );
    assert.notInclude(runInstructions, "[Zotero Host Bridge CLI]");
    const wrapperSkill = await fs.readFile(
      path.join(
        response.workspaceDir || "",
        ".codex",
        "skills",
        "zotero-bridge-cli",
        "SKILL.md",
      ),
      "utf8",
    );
    const wrapperReference = await fs.readFile(
      path.join(
        response.sharedSkillCatalogPath || "",
        "skills",
        "zotero-bridge-cli",
        "references",
        "host-bridge-cli.md",
      ),
      "utf8",
    );
    assert.include(wrapperSkill, "Zotero Bridge CLI");
    assert.include(wrapperReference, "Host Bridge CLI Reference");
    const run = listAcpSkillRuns().find(
      (entry) => entry.requestId === result.requestId,
    );
    assert.isTrue(run?.hostBridgeCli?.autoApproveWrites);
    const hostAccess = run?.events.find(
      (event) => event.stage === "host-access-mode",
    );
    assert.deepEqual((hostAccess?.details as any)?.requiredMcpTools, [
      "topics.list",
      "paper_artifacts.export_filtered",
    ]);
    assert.equal(
      (hostAccess?.details as any)?.mcpCompatibility,
      "disabled_by_default",
    );
  });

  it("skips Host Bridge materialization and env when Zotero host access is disabled", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    const promptMessages: string[] = [];
    let hostBridgeInjectionCalled = false;
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
      newSession: async () => ({ sessionId: "session-host-disabled" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId, message }) => {
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
          zotero_host_access: {
            required: false,
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
        createAdapter: async (args) => {
          launchedBackend = args.backend;
          return fakeAdapter;
        },
        hostBridgeCliInjection: async () => {
          hostBridgeInjectionCalled = true;
          throw new Error("Host Bridge injection should be disabled");
        },
        sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
      },
    });

    assert.equal(result.status, "succeeded");
    assert.isFalse(hostBridgeInjectionCalled);
    assert.notProperty(launchedBackend?.env || {}, "ZOTERO_BRIDGE_PROFILE");
    assert.notInclude(promptMessages[0] || "", "[Zotero Host Bridge CLI]");
    const response = result.responseJson as { workspaceDir?: string };
    let bridgeDirExists = true;
    try {
      await fs.stat(path.join(response.workspaceDir || "", ".zotero-bridge"));
    } catch {
      bridgeDirExists = false;
    }
    assert.isFalse(bridgeDirExists);
    const runInstructions = await fs.readFile(
      path.join(response.workspaceDir || "", "AGENTS.md"),
      "utf8",
    );
    assert.notInclude(runInstructions, "Host Bridge CLI");
    const run = listAcpSkillRuns().find(
      (entry) => entry.requestId === result.requestId,
    );
    const hostAccess = run?.events.find(
      (event) => event.stage === "host-access-mode",
    );
    assert.equal((hostAccess?.details as any)?.status, "disabled");
    assert.isFalse((hostAccess?.details as any)?.zoteroHostAccess?.required);
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
    assert.equal(
      plan.diagnostic?.code,
      "runtime_dependencies_injection_failed",
    );
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
        assert.include(
          calls[0].arguments?.[2] || "",
          "uv run --isolated --with pandas",
        );
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
              throw new Error(
                "PowerShell path search intentionally unavailable",
              );
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
        skillId: "literature-analysis",
        workflowId: "literature-analysis",
        jobId: "Lin 等 - 2021 - DETR for crowd pedestrian detection.md",
      });

      const normalized = workspace.workspaceDir.replace(/\\/g, "/");
      assert.match(normalized, /\/acp-skill-[^/]+$/);
      assert.notInclude(normalized, "backend-acp-claude-code");
      assert.notInclude(normalized, "literature-analysis");
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
    assert.equal(
      (pendingPermissionItems[0] as any).summary,
      "Run shell command",
    );

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
    const resolvedPermissionItems = (
      resolvedSnapshot?.transcriptItems || []
    ).filter((item: any) => item.kind === "permission");
    assert.lengthOf(resolvedPermissionItems, 1);
    assert.equal((resolvedPermissionItems[0] as any).status, "approved");
    assert.isFalse(
      (resolvedSnapshot?.transcriptItems || []).some(
        (item: any) =>
          item.kind === "status" && item.label === "permission-resolved",
      ),
    );
  });

  it("auto-approves ACP tool permission requests when the runtime option is enabled", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    try {
      async function runScenario(args: {
        source?: string;
        options: Array<{ optionId: string; kind: string; name: string }>;
        expectedAutoOptionId?: string;
      }) {
        let updateListener: ((event: any) => void | Promise<void>) | null =
          null;
        let permissionListener:
          | ((request: any) => void | Promise<void>)
          | null = null;
        let requestId = "";
        let resolvedOutcome: unknown = null;
        let pendingBeforeManualCancel: unknown = null;
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
          onPermissionRequest: (
            listener: (request: any) => void | Promise<void>,
          ) => {
            permissionListener = listener;
            return () => {
              permissionListener = null;
            };
          },
          newSession: async () => ({
            sessionId: `session-${args.options[0].optionId}`,
          }),
          loadSession: async () => ({ sessionId: "loaded" }),
          resumeSession: async () => ({ sessionId: "resumed" }),
          prompt: async ({ sessionId }) => {
            let resolvePermission: ((outcome: any) => void) | undefined;
            const outcomePromise = new Promise((resolve) => {
              resolvePermission = (outcome) => {
                resolvedOutcome = outcome;
                resolve(outcome);
              };
            });
            await permissionListener?.({
              requestId: `permission-${args.options[0].optionId}`,
              sessionId,
              toolCallId: "tool-1",
              toolTitle: "Run tool",
              source: args.source || "acp-tool-call",
              summary: "Run tool with permission.",
              requestedAt: "2026-06-05T00:00:00.000Z",
              options: args.options,
              resolve: resolvePermission,
            });
            if (args.expectedAutoOptionId) {
              assert.deepEqual(await outcomePromise, {
                outcome: "selected",
                optionId: args.expectedAutoOptionId,
              });
            } else {
              pendingBeforeManualCancel =
                getAcpSkillRunRecord(requestId)?.pendingPermission || null;
              resolvePermission?.({ outcome: "cancelled" });
              await outcomePromise;
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
          close: async () => undefined,
        };

        await executeAcpSkillRunnerJob({
          requestKind: ACP_SKILL_RUN_REQUEST_KIND,
          backend: createBackend(),
          request: {
            kind: ACP_SKILL_RUN_REQUEST_KIND,
            skill_id: "demo-skill",
            fetch_type: "bundle",
          },
          providerOptions: {
            autoApproveAcpPermissions: true,
          },
          dependencies: {
            scanRegistry: async () => ({
              entries: [entry],
              entriesById: { "demo-skill": entry },
              diagnostics: [],
            }),
            createWorkspace: async (workspaceArgs) => {
              const workspace = await createAcpSkillRunnerWorkspace({
                ...workspaceArgs,
                rootDir: root,
              });
              requestId = workspace.requestId;
              return workspace;
            },
            createAdapter: async () => fakeAdapter,
            sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
          },
        });

        if (args.expectedAutoOptionId) {
          assert.deepEqual(resolvedOutcome, {
            outcome: "selected",
            optionId: args.expectedAutoOptionId,
          });
          const permissionItems = (
            buildAcpSkillRunPanelSnapshot({ selectedRequestId: requestId })
              .selectedRun?.transcriptItems || []
          ).filter((item: any) => item.kind === "permission");
          assert.equal((permissionItems[0] as any)?.status, "approved");
          assert.isNull(
            getAcpSkillRunRecord(requestId)?.pendingPermission || null,
          );
        } else {
          assert.isOk(pendingBeforeManualCancel);
          assert.deepEqual(resolvedOutcome, { outcome: "cancelled" });
        }
      }

      await runScenario({
        options: [{ optionId: "approve", kind: "allow_once", name: "Approve" }],
        expectedAutoOptionId: "approve",
      });
      await runScenario({
        options: [
          { optionId: "allow-once", kind: "allow_once", name: "Allow Once" },
        ],
        expectedAutoOptionId: "allow-once",
      });
      await runScenario({
        options: [{ optionId: "deny", kind: "deny", name: "Deny" }],
      });
      await runScenario({
        source: "zotero-mcp-write",
        options: [{ optionId: "approve", kind: "allow_once", name: "Approve" }],
      });
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("clears restored ACP permission requests when their live resolver is gone", function () {
    let resolved = false;
    upsertAcpSkillRun({
      requestId: "run-stale-permission",
      status: "running",
      activePrompt: true,
      conversationState: "active",
      conversationRecoveryState: "connected",
    });
    setAcpSkillRunPermissionRequest("run-stale-permission", {
      requestId: "permission-stale",
      sessionId: "session-stale",
      toolCallId: "tool-stale",
      toolTitle: "Run stale command",
      requestedAt: "2026-04-28T00:00:00.000Z",
      options: [
        {
          optionId: "approve",
          kind: "allow_once",
          name: "Approve",
        },
      ],
      resolve: () => {
        resolved = true;
      },
    });
    registerAcpSkillRunController("run-stale-permission", null);

    assert.doesNotThrow(() =>
      resolveAcpSkillRunPermissionRequest({
        runRequestId: "run-stale-permission",
        permissionRequestId: "permission-stale",
        outcome: "selected",
        optionId: "approve",
      }),
    );

    const record = getAcpSkillRunRecord("run-stale-permission");
    assert.isFalse(resolved);
    assert.isNull(record?.pendingPermission);
    assert.equal(record?.status, "waiting_user");
    assert.isFalse(record?.activePrompt);
    assert.equal(record?.replyState, "idle");
    const permissionItems = (record?.transcriptItems || []).filter(
      (item: any) => item.kind === "permission",
    );
    assert.lengthOf(permissionItems, 1);
    assert.equal((permissionItems[0] as any).status, "cancelled");
  });

  it("drops stale recovered permission prompts when a run reconnects", function () {
    setAcpSkillRunPermissionRequest("run-stale-reconnect", {
      requestId: "permission-reconnect",
      sessionId: "session-reconnect",
      toolCallId: "tool-reconnect",
      toolTitle: "Reconnect command",
      requestedAt: "2026-04-28T00:00:00.000Z",
      options: [
        {
          optionId: "approve",
          kind: "allow_once",
          name: "Approve",
        },
      ],
      resolve: () => undefined,
    });
    upsertAcpSkillRun({
      requestId: "run-stale-reconnect",
      status: "running",
      activePrompt: true,
    });
    registerAcpSkillRunController("run-stale-reconnect", null);

    registerAcpSkillRunController("run-stale-reconnect", {
      cancel: async () => undefined,
      reply: async () => undefined,
      disconnect: async () => undefined,
    });

    const record = getAcpSkillRunRecord("run-stale-reconnect");
    assert.isNull(record?.pendingPermission);
    assert.equal(record?.status, "waiting_user");
    assert.isFalse(record?.activePrompt);
    assert.equal(record?.conversationRecoveryState, "connected");
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
    assert.equal(
      getAcpSkillRunRecord(requestId)?.acpRawModelId,
      "claude-4@high",
    );
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
        message:
          "Workspace file updated while agent is working: digest_payload.json",
        level: "info",
        details: {
          path: "D:/runtime/acp/skill-runs/run-1/result/digest_payload.json",
          relativePath: "result/digest_payload.json",
        },
      },
    });

    const statusItem = getAcpSkillRunRecord(
      "run-workspace-activity",
    )?.transcriptItems.find(
      (item) => item.kind === "status" && item.label === "workspace-activity",
    );
    assert.equal(statusItem?.kind, "status");
    if (statusItem?.kind === "status") {
      assert.equal(
        (statusItem as any).details?.relativePath,
        "result/digest_payload.json",
      );
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

    const transcript =
      getAcpSkillRunRecord("run-stream-workspace-activity")?.transcriptItems ||
      [];
    const assistantMessages = transcript.filter(
      (item) => item.kind === "message" && item.role === "assistant",
    );
    assert.lengthOf(assistantMessages, 1);
    assert.equal(assistantMessages[0].text, "first second");
    assert.isTrue(
      transcript.some(
        (item) => item.kind === "status" && item.label === "workspace-activity",
      ),
    );
  });

  it("keeps run updatedAt stable while appending streaming text chunks", function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-stream-updated-at-stable",
      status: "running",
      backendId: "backend-acp",
      backendType: "acp",
      activePrompt: true,
      updatedAt: "2026-06-18T00:00:00.000Z",
    });
    recordAcpSkillRunSessionUpdate("run-stream-updated-at-stable", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "first " },
      },
    } as any);
    recordAcpSkillRunSessionUpdate("run-stream-updated-at-stable", {
      sessionId: "session-1",
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: "second" },
      },
    } as any);

    const run = getAcpSkillRunRecord("run-stream-updated-at-stable");
    assert.equal(run?.updatedAt, "2026-06-18T00:00:00.000Z");
    const assistantMessages =
      run?.transcriptItems.filter(
        (item) => item.kind === "message" && item.role === "assistant",
      ) || [];
    assert.lengthOf(assistantMessages, 1);
    assert.equal(assistantMessages[0].text, "first second");
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

    const transcript =
      getAcpSkillRunRecord("run-stream-tool-boundary")?.transcriptItems || [];
    const assistantMessages = transcript.filter(
      (item) => item.kind === "message" && item.role === "assistant",
    );
    assert.lengthOf(assistantMessages, 2);
    assert.equal(assistantMessages[0].text, "first thinking");
    assert.equal(assistantMessages[0].state, "complete");
    assert.equal(assistantMessages[1].text, "second thinking");
    assert.isTrue(
      transcript.some(
        (item) => item.kind === "tool_call" && item.toolCallId === "tool-1",
      ),
    );
    assert.isTrue(
      transcript.some(
        (item) => item.kind === "status" && item.label === "workspace-activity",
      ),
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
      transcript.some(
        (item: any) =>
          item.kind === "status" &&
          [
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
    const listed = snapshot.runs.find(
      (run) => run.requestId === "run-lightweight-list-a",
    ) as any;
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
      const thought = getAcpSkillRunRecord(
        "run-coalesced-updates",
      )?.transcriptItems.find((item) => item.kind === "thought");
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

  it("clears stale ACP close errors when a canceled run accepts a continuation reply", async function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-canceled-continue",
      status: "canceled",
      backendId: "backend-acp",
      backendType: "acp",
      sessionId: "session-closed",
      conversationState: "active",
      conversationRecoveryState: "connected",
      error: "File Closed",
      conversationError: "File Closed",
      lastRecoveryError: "File Closed",
      replyError: "File Closed",
    });
    let replied = "";
    registerAcpSkillRunController("run-canceled-continue", {
      cancel: async () => undefined,
      reply: async (message) => {
        replied = message;
      },
      disconnect: async () => undefined,
    });

    await replyAcpSkillRun({
      requestId: "run-canceled-continue",
      message: "continue with the next step",
    });

    const record = getAcpSkillRunRecord("run-canceled-continue");
    assert.equal(replied, "continue with the next step");
    assert.equal(record?.replyState, "idle");
    assert.equal(record?.conversationState, "active");
    assert.equal(record?.conversationRecoveryState, "connected");
    assert.isUndefined(record?.error);
    assert.isUndefined(record?.conversationError);
    assert.isUndefined(record?.lastRecoveryError);
    assert.isUndefined(record?.replyError);
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
        candidateText: '{"__SKILL_DONE__":false}',
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
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
    });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "demo-skill",
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
          candidateText: '{"__SKILL_DONE__":false}',
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

  it("auto-continues a detached recoverable running run after explicit connect", async function () {
    this.timeout(6000);
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
      skillId: "topic-synthesis-finalize",
    });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "topic-synthesis-finalize",
      workflowId: "topic-synthesis-finalize",
      jobId: "job-finalize-auto",
    });
    const recoveryWorkflow = await createRecoveryApplyWorkflowRoot(root);
    const previousWorkflowDir = process.env.ZOTERO_TEST_WORKFLOW_DIR;
    const promptMessages: string[] = [];
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
        promptMessages.push(message);
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: JSON.stringify({
                __SKILL_DONE__: true,
                kind: "auto_recovered",
                ok: true,
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
      process.env.ZOTERO_TEST_WORKFLOW_DIR = recoveryWorkflow.workflowsDir;
      await rescanWorkflowRegistry({
        workflowsDir: recoveryWorkflow.workflowsDir,
      });
      recordWorkflowTaskUpdate(
        makeAcpWorkflowTaskJob({
          requestId: workspace.requestId,
          workflowId: recoveryWorkflow.workflowId,
          backendId: ACP_OPENCODE_BACKEND_ID,
          state: "running",
        }),
      );
      resetAcpSkillRunsForTests();
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "running",
        backendId: ACP_OPENCODE_BACKEND_ID,
        backendType: "acp",
        workflowId: "topic-synthesis-finalize",
        skillId: "topic-synthesis-finalize",
        requestedSkillId: "topic-synthesis-finalize",
        sessionId: "session-recovered-auto-final",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        primarySkillDir: entry.sourceDir,
        runnerJson: {
          execution_modes: ["interactive"],
          schemas: { output: "assets/output.schema.json" },
        },
        executionMode: "interactive",
        conversationState: "closed",
        conversationRecoveryState: "available",
        applyResultState: "pending",
        requestPayload: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "topic-synthesis-finalize",
          fetch_type: "result",
        },
      });
      setAcpSkillRunRecoveryHandlerForTests(({ requestId, reason }) =>
        recoverAcpSkillRunConversation({
          requestId,
          reason,
          dependencies: {
            createAdapter: async () => fakeAdapter,
            dependencyProbe: async () => ({ ok: true }),
          },
        }),
      );

      await connectAcpSkillRun(workspace.requestId);
      for (let index = 0; index < 40; index += 1) {
        if (
          getAcpSkillRunRecord(workspace.requestId)?.applyResultState ===
          "succeeded"
        ) {
          break;
        }
        await delay(25);
      }

      const recovered = getAcpSkillRunRecord(workspace.requestId);
      const stages = (recovered?.events || []).map((event) => event.stage);
      assert.equal(recovered?.status, "succeeded");
      assert.equal(recovered?.applyResultState, "succeeded");
      assert.lengthOf(promptMessages, 1);
      assert.include(promptMessages[0], "ACP Skills continuation guard");
      assert.include(
        promptMessages[0],
        "Continue the interrupted ACP Skills workflow",
      );
      assert.include(stages, "recovered-auto-continuation-started");
      assert.include(stages, "recovered-output-validation-succeeded");
      assert.isFalse(
        (recovered?.transcriptItems || []).some(
          (item: any) =>
            item.kind === "message" &&
            item.role === "user" &&
            item.text.includes("Continue the interrupted ACP Skills workflow"),
        ),
      );
    } finally {
      process.env.ZOTERO_TEST_WORKFLOW_DIR = previousWorkflowDir;
      setAcpSkillRunRecoveryHandlerForTests(null);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("does not auto-continue a detached recoverable run with pending user interaction", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
    });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "demo-skill",
      workflowId: "demo-skill",
      jobId: "job-pending-connect",
    });
    let promptCount = 0;
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
      resetAcpSkillRunsForTests();
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "waiting_user",
        backendId: ACP_OPENCODE_BACKEND_ID,
        backendType: "acp",
        skillId: "demo-skill",
        requestedSkillId: "demo-skill",
        sessionId: "session-recovered-pending",
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
          candidateText: '{"__SKILL_DONE__":false}',
        },
      });
      setAcpSkillRunRecoveryHandlerForTests(({ requestId, reason }) =>
        recoverAcpSkillRunConversation({
          requestId,
          reason,
          dependencies: {
            createAdapter: async () => fakeAdapter,
            dependencyProbe: async () => ({ ok: true }),
          },
        }),
      );

      await connectAcpSkillRun(workspace.requestId);
      await delay(50);

      const recovered = getAcpSkillRunRecord(workspace.requestId);
      assert.equal(promptCount, 0);
      assert.equal(recovered?.status, "waiting_user");
      assert.equal(recovered?.conversationState, "active");
      assert.equal(recovered?.conversationRecoveryState, "connected");
      assert.equal(recovered?.pendingInteraction?.message, "Need user input.");
    } finally {
      setAcpSkillRunRecoveryHandlerForTests(null);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("restarts hard timeout for automatic continuation after reconnect", async function () {
    this.timeout(5000);
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["auto"],
    });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "demo-skill",
      workflowId: "demo-skill",
      jobId: "job-reconnect-hard-timeout",
    });
    let releasePrompt: (() => void) | null = null;
    let cancelCalls = 0;
    let closeCalls = 0;
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
        await new Promise<void>((resolve) => {
          releasePrompt = resolve;
        });
        return { stopReason: "cancelled", cancelRequested: true };
      },
      cancel: async () => {
        cancelCalls += 1;
        releasePrompt?.();
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        closeCalls += 1;
        releasePrompt?.();
      },
    };
    try {
      resetAcpSkillRunsForTests();
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "running",
        backendId: ACP_OPENCODE_BACKEND_ID,
        backendType: "acp",
        workflowId: "demo-skill",
        skillId: "demo-skill",
        requestedSkillId: "demo-skill",
        sessionId: "session-reconnect-hard-timeout",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        primarySkillDir: entry.sourceDir,
        runnerJson: {
          execution_modes: ["auto"],
          schemas: { output: "assets/output.schema.json" },
        },
        executionMode: "auto",
        conversationState: "closed",
        conversationRecoveryState: "available",
        applyResultState: "pending",
        requestPayload: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "result",
          runtime_options: {
            execution_mode: "auto",
            hard_timeout_seconds: 1,
          },
        },
      });
      setAcpSkillRunRecoveryHandlerForTests(({ requestId, reason }) =>
        recoverAcpSkillRunConversation({
          requestId,
          reason,
          dependencies: {
            createAdapter: async () => fakeAdapter,
            dependencyProbe: async () => ({ ok: true }),
          },
        }),
      );

      await connectAcpSkillRun(workspace.requestId);
      for (let index = 0; index < 50; index += 1) {
        const record = getAcpSkillRunRecord(workspace.requestId);
        const stages = (record?.events || []).map((event) => event.stage);
        if (stages.includes("disconnect-completed")) {
          break;
        }
        await delay(25);
      }

      const record = getAcpSkillRunRecord(workspace.requestId);
      const stages = (record?.events || []).map((event) => event.stage);
      assert.equal(cancelCalls, 1);
      assert.equal(closeCalls, 1);
      assert.equal(record?.conversationState, "closed");
      assert.equal(record?.conversationRecoveryState, "available");
      assert.include(stages, "recovered-auto-continuation-started");
      assert.include(stages, "hard-timeout-disconnect-requested");
      assert.include(stages, "disconnect-completed");
    } finally {
      setAcpSkillRunRecoveryHandlerForTests(null);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("runs output repair after a recovered workflow reply returns invalid output", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
    });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "demo-skill",
      workflowId: "demo-skill",
      jobId: "job",
    });
    let promptCount = 0;
    const promptMessages: string[] = [];
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
        promptCount += 1;
        promptMessages.push(message);
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text:
                promptCount === 1
                  ? "not valid json"
                  : JSON.stringify({
                      __SKILL_DONE__: false,
                      message: "Need one more recovered answer.",
                      ui_hints: {
                        prompt: "Continue recovered task?",
                        options: ["continue"],
                      },
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
        status: "running",
        backendId: ACP_OPENCODE_BACKEND_ID,
        backendType: "acp",
        skillId: "demo-skill",
        requestedSkillId: "demo-skill",
        sessionId: "session-recovered-repair",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        primarySkillDir: entry.sourceDir,
        runnerJson: {
          execution_modes: ["interactive"],
          schemas: { output: "assets/output.schema.json" },
        },
        executionMode: "interactive",
        conversationState: "closed",
        conversationRecoveryState: "available",
      });
      await recoverAcpSkillRunConversation({
        requestId: workspace.requestId,
        reason: "reply",
        dependencies: {
          createAdapter: async () => fakeAdapter,
          dependencyProbe: async () => ({ ok: true }),
          maxRepairRounds: 3,
        },
      });

      await replyAcpSkillRun({
        requestId: workspace.requestId,
        message: "continue after restart",
      });

      const recovered = getAcpSkillRunRecord(workspace.requestId);
      assert.equal(promptCount, 2);
      assert.equal(recovered?.status, "waiting_user");
      assert.equal(recovered?.repairRounds, 1);
      assert.equal(recovered?.validationStatus, "pending");
      assert.equal(recovered?.outputConvergenceState, "pending");
      assert.equal(
        recovered?.pendingInteraction?.message,
        "Need one more recovered answer.",
      );
      assert.include(promptMessages[0] || "", "continue after restart");
      assert.include(promptMessages[1] || "", "ACP Skills continuation guard");
      assert.include(
        promptMessages[1] || "",
        "Your previous output did not satisfy the Skill Runner output contract.",
      );
      assert.deepEqual(
        recovered?.outputRevisions.map((entry) => entry.status),
        ["invalid", "pending"],
      );
      assert.includeMembers(
        (recovered?.events || []).map((event) => event.stage),
        [
          "recovered-output-validation-failed",
          "repair-started",
          "waiting-user",
        ],
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("fails recovered workflow replies recoverably without repair on empty end_turn", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
    });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "demo-skill",
      workflowId: "demo-skill",
      jobId: "job",
    });
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
    });
    try {
      resetAcpSkillRunsForTests();
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "running",
        backendId: ACP_OPENCODE_BACKEND_ID,
        backendType: "acp",
        skillId: "demo-skill",
        requestedSkillId: "demo-skill",
        sessionId: "session-recovered-empty",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        primarySkillDir: entry.sourceDir,
        runnerJson: {
          execution_modes: ["interactive"],
          schemas: { output: "assets/output.schema.json" },
        },
        executionMode: "interactive",
        conversationState: "closed",
        conversationRecoveryState: "available",
      });
      await recoverAcpSkillRunConversation({
        requestId: workspace.requestId,
        reason: "reply",
        dependencies: {
          createAdapter: async () => adapter,
          dependencyProbe: async () => ({ ok: true }),
          maxRepairRounds: 3,
        },
      });

      let caught: unknown;
      try {
        await replyAcpSkillRun({
          requestId: workspace.requestId,
          message: "continue after restart",
        });
      } catch (error) {
        caught = error;
      }

      const recovered = getAcpSkillRunRecord(workspace.requestId);
      const stages = (recovered?.events || []).map((event) => event.stage);
      assert.instanceOf(caught, Error);
      assert.equal(getPromptCount(), 1);
      assert.equal(recovered?.status, "failed");
      assert.equal(recovered?.conversationState, "closed");
      assert.equal(recovered?.conversationRecoveryState, "available");
      assert.equal(recovered?.repairRounds, 0);
      assert.deepEqual(recovered?.outputRevisions, []);
      assert.include(stages, "acp-prompt-no-output");
      assert.notInclude(stages, "recovered-output-validation-failed");
      assert.notInclude(stages, "repair-started");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("treats recovered end_turn as interrupted when adapter reports cancelRequested", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
    });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "demo-skill",
      workflowId: "demo-skill",
      jobId: "job",
    });
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
      cancelRequested: true,
    });
    try {
      resetAcpSkillRunsForTests();
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "running",
        backendId: ACP_OPENCODE_BACKEND_ID,
        backendType: "acp",
        skillId: "demo-skill",
        requestedSkillId: "demo-skill",
        sessionId: "session-recovered-cancel-end-turn",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        primarySkillDir: entry.sourceDir,
        runnerJson: {
          execution_modes: ["interactive"],
          schemas: { output: "assets/output.schema.json" },
        },
        executionMode: "interactive",
        conversationState: "closed",
        conversationRecoveryState: "available",
      });
      await recoverAcpSkillRunConversation({
        requestId: workspace.requestId,
        reason: "reply",
        dependencies: {
          createAdapter: async () => adapter,
          dependencyProbe: async () => ({ ok: true }),
          maxRepairRounds: 3,
        },
      });

      await replyAcpSkillRun({
        requestId: workspace.requestId,
        message: "continue after restart",
      });

      const recovered = getAcpSkillRunRecord(workspace.requestId);
      const stages = (recovered?.events || []).map((event) => event.stage);
      assert.equal(getPromptCount(), 1);
      assert.equal(recovered?.status, "waiting_user");
      assert.equal(recovered?.conversationState, "active");
      assert.equal(recovered?.conversationRecoveryState, "connected");
      assert.equal(recovered?.activePrompt, false);
      assert.equal(recovered?.replyState, "idle");
      assert.equal(recovered?.repairRounds, 0);
      assert.include(stages, "interrupt-completed");
      assert.notInclude(stages, "acp-prompt-no-output");
      assert.notInclude(stages, "recovered-output-validation-failed");
      assert.notInclude(stages, "repair-started");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("repairs recovered workflow replies when empty end_turn had observable ACP activity", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
    });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "demo-skill",
      workflowId: "demo-skill",
      jobId: "job",
    });
    const { adapter, getPromptCount } = createPromptStopAdapter({
      stopReason: "end_turn",
      updates: (promptCount) =>
        promptCount === 1
          ? [
              {
                sessionUpdate: "tool_call",
                toolCallId: "tool-1",
                title: "Inspect source",
                status: "pending",
                name: "inspect_source",
                input: {},
              },
              {
                sessionUpdate: "tool_call_update",
                toolCallId: "tool-1",
                title: "Inspect source",
                status: "completed",
                output: { ok: true },
              },
            ]
          : [],
      assistantText: (promptCount) =>
        promptCount === 2
          ? JSON.stringify({
              __SKILL_DONE__: false,
              message: "Need one more recovered answer.",
              ui_hints: {
                prompt: "Continue recovered task?",
                options: ["continue"],
              },
            })
          : undefined,
    });
    try {
      resetAcpSkillRunsForTests();
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "running",
        backendId: ACP_OPENCODE_BACKEND_ID,
        backendType: "acp",
        skillId: "demo-skill",
        requestedSkillId: "demo-skill",
        sessionId: "session-recovered-empty-with-activity",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        primarySkillDir: entry.sourceDir,
        runnerJson: {
          execution_modes: ["interactive"],
          schemas: { output: "assets/output.schema.json" },
        },
        executionMode: "interactive",
        conversationState: "closed",
        conversationRecoveryState: "available",
      });
      await recoverAcpSkillRunConversation({
        requestId: workspace.requestId,
        reason: "reply",
        dependencies: {
          createAdapter: async () => adapter,
          dependencyProbe: async () => ({ ok: true }),
          maxRepairRounds: 3,
        },
      });

      await replyAcpSkillRun({
        requestId: workspace.requestId,
        message: "continue after restart",
      });

      const recovered = getAcpSkillRunRecord(workspace.requestId);
      const stages = (recovered?.events || []).map((event) => event.stage);
      assert.equal(getPromptCount(), 2);
      assert.equal(recovered?.status, "waiting_user");
      assert.equal(recovered?.repairRounds, 1);
      assert.equal(recovered?.validationStatus, "pending");
      assert.include(stages, "recovered-output-validation-failed");
      assert.include(stages, "repair-started");
      assert.notInclude(stages, "acp-prompt-no-output");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("records parent workflow identity from host orchestration context for sequence steps", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
      skillId: "topic-synthesis-finalize",
    });
    try {
      const result = await executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "topic-synthesis-finalize",
          fetch_type: "result",
          parameter: { language: "zh-CN" },
        },
        orchestrationContext: {
          workflowId: "create-topic-synthesis",
          workflowLabel: "Create Topic Synthesis",
          workflowRunId: "workflow-run-create-1",
          jobId: "job-create-1",
          sequenceStepId: "finalize",
          finalStepId: "finalize",
        },
        dependencies: {
          scanRegistry: async () => ({
            entries: [entry],
            entriesById: { "topic-synthesis-finalize": entry },
            diagnostics: [],
          }),
          createWorkspace: (args) =>
            import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
              mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
            ),
          createAdapter: async () => createFinalOutputAdapter({ ok: true }),
          dependencyProbe: async () => ({ ok: true }),
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });

      assert.equal(result.status, "succeeded");
      const record = getAcpSkillRunRecord(result.requestId);
      assert.equal(record?.workflowId, "create-topic-synthesis");
      assert.equal(record?.workflowLabel, "Create Topic Synthesis");
      assert.equal(record?.runId, "workflow-run-create-1");
      assert.equal(record?.jobId, "job-create-1");
      assert.equal(record?.skillId, "topic-synthesis-finalize");
      assert.equal(
        (record?.requestPayload as { parameter?: Record<string, unknown> })
          ?.parameter?.workflowId,
        undefined,
      );
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("recovers sequence final-step apply from workflow task ownership when stored workflow id is the skill id", async function () {
    this.timeout(6000);
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
      skillId: "topic-synthesis-finalize",
    });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "topic-synthesis-finalize",
      workflowId: "topic-synthesis-finalize",
      jobId: "job-finalize",
    });
    const recoveryWorkflow = await createRecoveryApplyWorkflowRoot(root);
    const previousWorkflowDir = process.env.ZOTERO_TEST_WORKFLOW_DIR;
    process.env.ZOTERO_TEST_WORKFLOW_DIR = recoveryWorkflow.workflowsDir;
    try {
      await rescanWorkflowRegistry({
        workflowsDir: recoveryWorkflow.workflowsDir,
      });
      recordWorkflowTaskUpdate(
        makeAcpWorkflowTaskJob({
          requestId: workspace.requestId,
          workflowId: recoveryWorkflow.workflowId,
          backendId: ACP_OPENCODE_BACKEND_ID,
          state: "running",
        }),
      );
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "running",
        backendId: ACP_OPENCODE_BACKEND_ID,
        backendType: "acp",
        workflowId: "topic-synthesis-finalize",
        skillId: "topic-synthesis-finalize",
        requestedSkillId: "topic-synthesis-finalize",
        sessionId: "session-recovered-finalize",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        primarySkillDir: entry.sourceDir,
        runnerJson: {
          execution_modes: ["interactive"],
          schemas: { output: "assets/output.schema.json" },
        },
        executionMode: "interactive",
        conversationState: "closed",
        conversationRecoveryState: "available",
        applyResultState: "pending",
        requestPayload: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "topic-synthesis-finalize",
          fetch_type: "result",
        },
      });
      resetAcpWorkflowWorkspaceRegistryForTests();

      await recoverAcpSkillRunConversation({
        requestId: workspace.requestId,
        reason: "reply",
        dependencies: {
          createAdapter: async () => createFinalOutputAdapter({ ok: true }),
          dependencyProbe: async () => ({ ok: true }),
        },
      });
      await replyAcpSkillRun({
        requestId: workspace.requestId,
        message: "continue finalize",
      });

      const recovered = getAcpSkillRunRecord(workspace.requestId);
      assert.equal(recovered?.status, "succeeded");
      assert.equal(recovered?.applyResultState, "succeeded");
      assert.equal(recovered?.workflowId, "topic-synthesis-finalize");
      assert.includeMembers(
        (recovered?.events || []).map((event) => event.stage),
        ["recovered-output-validation-succeeded", "apply-succeeded"],
      );
      assert.equal(
        listWorkflowTasks().find(
          (task) => task.requestId === workspace.requestId,
        )?.state,
        "succeeded",
      );
    } finally {
      if (typeof previousWorkflowDir === "string") {
        process.env.ZOTERO_TEST_WORKFLOW_DIR = previousWorkflowDir;
      } else {
        delete process.env.ZOTERO_TEST_WORKFLOW_DIR;
      }
      await rescanWorkflowRegistry();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("continues downstream sequence steps after a recovered non-final step succeeds", async function () {
    this.timeout(6000);
    const root = await mkTempRoot();
    const prepare = await createSkill(root, {
      executionModes: ["interactive"],
      skillId: "prepare-skill",
    });
    const core = await createSkill(root, {
      executionModes: ["interactive"],
      skillId: "core-skill",
    });
    const finalize = await createSkill(root, {
      executionModes: ["interactive"],
      skillId: "finalize-skill",
    });
    const recoveryWorkflow = await createRecoveryApplyWorkflowRoot(root, {
      finalSkillId: "finalize-skill",
    });
    const previousWorkflowDir = process.env.ZOTERO_TEST_WORKFLOW_DIR;
    process.env.ZOTERO_TEST_WORKFLOW_DIR = recoveryWorkflow.workflowsDir;
    const backend = createBackend({ id: ACP_OPENCODE_BACKEND_ID });
    const workflowRunId = "workflow-run-sequence-recovery";
    const jobId = "job-sequence-recovery";
    const sequenceRequest = {
      kind: "skillrunner.sequence.v1" as const,
      steps: [
        {
          id: "prepare",
          skill_id: "prepare-skill",
          mode: "interactive",
          workspace: "new" as const,
        },
        {
          id: "core",
          skill_id: "core-skill",
          mode: "interactive",
          workspace: "reuse-workflow" as const,
        },
        {
          id: "finalize",
          skill_id: "finalize-skill",
          mode: "interactive",
          workspace: "reuse-workflow" as const,
        },
      ],
      final_step_id: "finalize",
    };
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: ACP_OPENCODE_BACKEND_ID,
      skillId: "prepare-skill",
      workflowId: recoveryWorkflow.workflowId,
      jobId,
      workflowWorkspace: {
        mode: "new",
        workflowRunId,
      },
    });
    const adapterOutputs = [
      { ok: true, step: "prepare" },
      { ok: true, step: "core" },
      { ok: true, step: "finalize" },
    ];
    const foregroundSelectedRequestIds: string[] = [];
    const foregroundOpenedRequestIds: string[] = [];
    try {
      await rescanWorkflowRegistry({
        workflowsDir: recoveryWorkflow.workflowsDir,
      });
      initializeSequenceRunState({
        request: sequenceRequest,
        backend,
        providerOptions: { mode: "sequence-test" },
        workflowId: recoveryWorkflow.workflowId,
        workflowLabel: "Recovered Sequence Apply Workflow",
        workflowRunId,
        jobId,
      });
      recordSequenceStepRequestCreated({
        sequenceRunId: workflowRunId,
        stepIndex: 0,
        requestId: workspace.requestId,
      });
      recordWorkflowTaskUpdate(
        makeAcpWorkflowTaskJob({
          requestId: workspace.requestId,
          workflowId: recoveryWorkflow.workflowId,
          backendId: ACP_OPENCODE_BACKEND_ID,
          state: "running",
        }),
      );
      upsertAcpSkillRun({
        requestId: workspace.requestId,
        status: "running",
        backendId: ACP_OPENCODE_BACKEND_ID,
        backendType: "acp",
        workflowId: recoveryWorkflow.workflowId,
        workflowLabel: "Recovered Sequence Apply Workflow",
        runId: workflowRunId,
        jobId,
        sequenceStepId: "prepare",
        sequenceFinalStepId: "finalize",
        skillId: "prepare-skill",
        requestedSkillId: "prepare-skill",
        sessionId: "session-recovered-prepare",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        primarySkillDir: prepare.entry.sourceDir,
        runnerJson: {
          execution_modes: ["interactive"],
          schemas: { output: "assets/output.schema.json" },
        },
        executionMode: "interactive",
        conversationState: "closed",
        conversationRecoveryState: "available",
        applyResultState: "pending",
        requestPayload: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "prepare-skill",
          fetch_type: "result",
        },
      });

      await recoverAcpSkillRunConversation({
        requestId: workspace.requestId,
        reason: "reply",
        dependencies: {
          scanRegistry: async () => ({
            entries: [prepare.entry, core.entry, finalize.entry],
            entriesById: {
              "prepare-skill": prepare.entry,
              "core-skill": core.entry,
              "finalize-skill": finalize.entry,
            },
            diagnostics: [],
          }),
          createWorkspace: (args) =>
            import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
              mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
            ),
          createAdapter: async () =>
            createFinalOutputAdapter(adapterOutputs.shift() || { ok: true }),
          dependencyProbe: async () => ({ ok: true }),
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
          acpSkillRunForeground: {
            selectAcpSkillRun: (requestId) => {
              foregroundSelectedRequestIds.push(requestId);
              selectAcpSkillRun(requestId);
            },
            openAssistantWorkspaceSidebar: async (input) => {
              foregroundOpenedRequestIds.push(
                String(input?.requestId || "").trim(),
              );
              return true;
            },
          },
        },
      });
      await replyAcpSkillRun({
        requestId: workspace.requestId,
        message: "continue prepare",
      });

      const runs = listAcpSkillRuns();
      const coreRun = runs.find((run) => run.sequenceStepId === "core");
      const finalizeRun = runs.find((run) => run.sequenceStepId === "finalize");
      assert.equal(
        getAcpSkillRunRecord(workspace.requestId)?.status,
        "succeeded",
      );
      assert.equal(coreRun?.status, "succeeded");
      assert.equal(finalizeRun?.status, "succeeded");
      assert.equal(coreRun?.workspaceDir, workspace.workspaceDir);
      assert.equal(finalizeRun?.workspaceDir, workspace.workspaceDir);
      assert.deepEqual(foregroundSelectedRequestIds, [
        coreRun?.requestId,
        finalizeRun?.requestId,
      ]);
      assert.deepEqual(foregroundOpenedRequestIds, [
        coreRun?.requestId,
        finalizeRun?.requestId,
      ]);
      assert.equal(
        buildAcpSkillRunPanelSnapshot({}).selectedRun?.requestId,
        finalizeRun?.requestId,
      );
      assert.equal(finalizeRun?.applyResultState, "succeeded");
      assert.equal(coreRun?.workflowId, recoveryWorkflow.workflowId);
      assert.equal(finalizeRun?.workflowId, recoveryWorkflow.workflowId);
      assert.equal(coreRun?.sequenceFinalStepId, "finalize");
      assert.equal(finalizeRun?.skillId, "finalize-skill");
      assert.equal(
        listWorkflowTasks().find(
          (task) => task.requestId === workspace.requestId,
        )?.state,
        "succeeded",
      );
    } finally {
      if (typeof previousWorkflowDir === "string") {
        process.env.ZOTERO_TEST_WORKFLOW_DIR = previousWorkflowDir;
      } else {
        delete process.env.ZOTERO_TEST_WORKFLOW_DIR;
      }
      await rescanWorkflowRegistry();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("starts a fresh recovered prompt after a previous reply rejected", async function () {
    const root = await mkTempRoot();
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "demo-skill",
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
      assert.equal(
        getAcpSkillRunRecord(workspace.requestId)?.replyState,
        "idle",
      );
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
    assert.equal(
      getAcpSkillRunRecord("run-connect")?.conversationRecoveryState,
      "connected",
    );

    await disconnectAcpSkillRun("run-connect");
    const record = getAcpSkillRunRecord("run-connect");
    assert.isTrue(disconnected);
    assert.equal(record?.conversationState, "closed");
    assert.equal(record?.conversationRecoveryState, "available");
  });

  it("does not mark connect succeeded after recovery already detached the session", async function () {
    resetAcpSkillRunsForTests();
    upsertAcpSkillRun({
      requestId: "run-connect-timeout",
      status: "running",
      backendId: "backend-acp",
      backendType: "acp",
      sessionId: "session-connect-timeout",
      conversationState: "closed",
      conversationRecoveryState: "available",
    });
    setAcpSkillRunRecoveryHandlerForTests(async ({ requestId, reason }) => {
      assert.equal(requestId, "run-connect-timeout");
      assert.equal(reason, "connect");
      upsertAcpSkillRun({
        requestId,
        activePrompt: false,
        conversationState: "closed",
        conversationRecoveryState: "available",
        connectionActionState: "idle",
        event: {
          stage: "disconnect-completed",
          message: "ACP skill run local connection detached.",
          level: "info",
          details: { recovered: true },
        },
      });
    });

    try {
      await connectAcpSkillRun("run-connect-timeout");

      const record = getAcpSkillRunRecord("run-connect-timeout");
      const stages = (record?.events || []).map((event) => event.stage);
      assert.equal(record?.conversationState, "closed");
      assert.equal(record?.conversationRecoveryState, "available");
      assert.include(stages, "disconnect-completed");
      assert.notInclude(stages, "connect-succeeded");
    } finally {
      setAcpSkillRunRecoveryHandlerForTests(null);
    }
  });

  it("interrupts a recovered active prompt without detaching the session", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
    });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "demo-skill",
      workflowId: "demo-skill",
      jobId: "job-recovered-interrupt",
    });
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let resolvePromptStarted: () => void = () => undefined;
    let releasePrompt: (() => void) | null = null;
    const promptStarted = new Promise<void>((resolve) => {
      resolvePromptStarted = resolve;
    });
    let cancelCalls = 0;
    let closeCalls = 0;
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
      prompt: async ({ sessionId }) => {
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: "late text after interrupt" },
          },
        });
        resolvePromptStarted();
        await new Promise<void>((resolve) => {
          releasePrompt = resolve;
        });
        return { stopReason: "cancelled" };
      },
      cancel: async () => {
        cancelCalls += 1;
        releasePrompt?.();
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        closeCalls += 1;
      },
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
        sessionId: "session-recovered-interrupt",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        primarySkillDir: entry.sourceDir,
        runnerJson: { execution_modes: ["interactive"] },
        executionMode: "interactive",
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
      const replyPromise = replyAcpSkillRun({
        requestId: workspace.requestId,
        message: "continue recovered prompt",
      });
      await promptStarted;

      await interruptAcpSkillRunCurrentTurn(workspace.requestId);
      await replyPromise;

      const record = getAcpSkillRunRecord(workspace.requestId);
      const stages = (record?.events || []).map((event) => event.stage);
      assert.equal(cancelCalls, 1);
      assert.equal(closeCalls, 0);
      assert.equal(record?.conversationState, "active");
      assert.equal(record?.conversationRecoveryState, "connected");
      assert.equal(record?.activePrompt, false);
      assert.equal(record?.status, "waiting_user");
      assert.notEqual(record?.status, "canceled");
      assert.include(stages, "interrupt-turn-requested");
      assert.include(stages, "interrupt-completed");
      assert.notInclude(stages, "recovered-output-validation-failed");
      assert.notInclude(stages, "repair-started");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("disconnects a recovered active prompt recoverably when hard timeout expires", async function () {
    this.timeout(5000);
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
    });
    const workspace = await createAcpSkillRunnerWorkspace({
      rootDir: root,
      backendId: "backend-acp",
      skillId: "demo-skill",
      workflowId: "demo-skill",
      jobId: "job-recovered-hard-timeout",
    });
    let releasePrompt: (() => void) | null = null;
    let cancelCalls = 0;
    let closeCalls = 0;
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
        await new Promise<void>((resolve) => {
          releasePrompt = resolve;
        });
        return { stopReason: "cancelled", cancelRequested: true };
      },
      cancel: async () => {
        cancelCalls += 1;
        releasePrompt?.();
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        closeCalls += 1;
        releasePrompt?.();
      },
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
        sessionId: "session-recovered-hard-timeout",
        workspaceDir: workspace.workspaceDir,
        runtimeDir: workspace.runtimeDir,
        inputManifestPath: workspace.inputManifestPath,
        resultJsonPath: workspace.resultJsonPath,
        primarySkillDir: entry.sourceDir,
        runnerJson: { execution_modes: ["interactive"] },
        executionMode: "interactive",
        conversationState: "closed",
        conversationRecoveryState: "available",
        requestPayload: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "result",
          runtime_options: {
            execution_mode: "interactive",
            hard_timeout_seconds: 1,
          },
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
        message: "continue recovered prompt",
      });

      const record = getAcpSkillRunRecord(workspace.requestId);
      const stages = (record?.events || []).map((event) => event.stage);
      assert.equal(cancelCalls, 1);
      assert.equal(closeCalls, 1);
      assert.equal(record?.conversationState, "closed");
      assert.equal(record?.conversationRecoveryState, "available");
      assert.notEqual(record?.status, "failed");
      assert.notEqual(record?.status, "canceled");
      assert.include(stages, "hard-timeout-disconnect-requested");
      assert.include(stages, "disconnect-completed");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("disconnects an active ACP skill prompt without validating stale output", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root);
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let resolvePromptStarted: () => void = () => undefined;
    let releasePrompt: (() => void) | null = null;
    const promptStarted = new Promise<void>((resolve) => {
      resolvePromptStarted = resolve;
    });
    let cancelCalls = 0;
    let closeCalls = 0;
    const fakeAdapter: AcpConnectionAdapter = {
      initialize: async () => ({
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
      newSession: async () => ({ sessionId: "session-disconnect-active" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: "not valid json after disconnect",
            },
          },
        });
        resolvePromptStarted();
        await new Promise<void>((resolve) => {
          releasePrompt = resolve;
        });
        return { stopReason: "cancelled" };
      },
      cancel: async () => {
        cancelCalls += 1;
        releasePrompt?.();
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => {
        closeCalls += 1;
      },
    };

    try {
      const runPromise = executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "result",
        },
        dependencies: {
          scanRegistry: async () => ({
            entries: [entry],
            entriesById: { "demo-skill": entry },
            diagnostics: [],
          }),
          createWorkspace: (args) =>
            createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
          createAdapter: async () => fakeAdapter,
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });
      await promptStarted;
      const requestId = listAcpSkillRuns()[0]?.requestId || "";

      await disconnectAcpSkillRun(requestId);
      const result = await runPromise;
      const record = getAcpSkillRunRecord(requestId);
      const stages = (record?.events || []).map((event) => event.stage);

      assert.equal(result.status, "deferred");
      assert.equal(result.backendStatus, "running");
      assert.deepInclude(result.responseJson as Record<string, unknown>, {
        status: "disconnected",
      });
      assert.equal(record?.status, "running");
      assert.equal(record?.conversationState, "closed");
      assert.equal(record?.conversationRecoveryState, "available");
      assert.equal(cancelCalls, 1);
      assert.equal(closeCalls, 1);
      assert.notInclude(stages, "output-validation-failed");
      assert.notInclude(stages, "result-file-fallback-skipped");
      assert.notInclude(stages, "repair-started");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
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
    assert.isFalse(
      snapshot.runs.some((run) => run.requestId === "run-detached-cancel"),
    );
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
    assert.isFalse(
      snapshot.runs.some((run) => run.requestId === "run-terminal-archive"),
    );
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
            entries: [
              { content: "Generate structured result", status: "in_progress" },
            ],
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
    assert.notInclude(
      promptMessages[0] || "",
      "Target output contract details:",
    );
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
    assert.include(
      runInstructions,
      "Engine skill directory: `./.codex/skills`",
    );
    assert.include(runInstructions, "runtime-patched `SKILL.md`");
    const proxySkillMd = await fs.readFile(
      path.join(response.requestedSkillProxyPath || "", "SKILL.md"),
      "utf8",
    );
    const resourceIndex = proxySkillMd.indexOf(
      "## Zotero Agents ACP Thin Proxy Resource Mapping",
    );
    const originalBodyIndex = proxySkillMd.indexOf("# Demo Skill");
    const runtimeIndex = proxySkillMd.indexOf("Runtime Enforcement");
    const outputIndex = proxySkillMd.indexOf("## Output Format Contract");
    const detailsIndex = proxySkillMd.indexOf("### Output Contract Details");
    const modeIndex = proxySkillMd.indexOf(
      "## Execution Mode: AUTO (Non-Interactive)",
    );
    assert.isTrue(
      [
        resourceIndex,
        originalBodyIndex,
        runtimeIndex,
        outputIndex,
        detailsIndex,
        modeIndex,
      ].every((index) => index >= 0),
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
    assert.notInclude(
      proxySkillMd,
      "Do not write the runner result envelope yourself.",
    );
    assert.notInclude(
      proxySkillMd,
      "Put additional artifacts under the run workspace",
    );
    assert.include(proxySkillMd, "Shared catalog skill root:");
    assert.include(
      proxySkillMd,
      "- Resource root assets: `<shared catalog skill root>/assets`",
    );
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
    assert.deepEqual(panelSnapshot.selectedRun?.runtimeDependencies, [
      "pandas",
    ]);
    assert.isString(panelSnapshot.selectedRun?.sharedSkillCatalogPath);
    assert.equal(panelSnapshot.selectedRun?.proxySkillCount, 2);
    assert.isString(panelSnapshot.selectedRun?.requestedSkillProxyPath);
    assert.equal(panelSnapshot.selectedRun?.repairRounds, 1);
    assert.equal(panelSnapshot.selectedRun?.validationStatus, "valid");
    assert.deepEqual(
      panelSnapshot.selectedRun?.outputRevisions.map((entry) => entry.status),
      ["invalid", "final"],
    );
    assert.include(
      panelSnapshot.selectedRun?.outputRevisions[0]?.candidateText || "",
      "This is not JSON.",
    );
    assert.include(
      panelSnapshot.selectedRun?.outputRevisions[0]?.replacementReason || "",
      "final",
    );
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
      assistantMessages.some((item) => item.text.includes("- ok: true")),
    );
    assert.isFalse(
      assistantMessages.some((item) => item.text.includes("```json")),
    );
    assert.isFalse(
      assistantMessages.some((item) => item.text.includes("__SKILL_DONE__")),
    );
    assert.isFalse(
      assistantMessages.some((item) => item.text.includes("This is not JSON.")),
    );
    assert.isTrue(assistantMessages.some((item) => item.revision?.count === 2));
    const toolRows = transcript.filter((item) => item.kind === "tool_call");
    assert.lengthOf(toolRows, 1);
    assert.equal(toolRows[0].state, "completed");
    assert.equal(toolRows[0].inputSummary, '{"skill":"demo-skill"}');
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
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
    });
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
    let capturedWaiting: NonNullable<
      ReturnType<typeof buildAcpSkillRunPanelSnapshot>["selectedRun"]
    > | null = null;
    let autoReplied = false;
    let autoReplyError: Error | null = null;
    const unsubscribe = subscribeAcpSkillRunSnapshots(() => {
      const snapshot = buildAcpSkillRunPanelSnapshot({});
      const waitingSummary = snapshot.runs.find(
        (entry) => entry.status === "waiting_user",
      );
      const waiting = waitingSummary
        ? buildAcpSkillRunPanelSnapshot({
            selectedRequestId: waitingSummary.requestId,
          }).selectedRun
        : snapshot.selectedRun;
      if (autoReplied || waiting?.status !== "waiting_user") {
        return;
      }
      autoReplied = true;
      capturedWaiting = waiting;
      void replyAcpSkillRun({
        requestId: waiting.requestId || "",
        message: "Please finish.",
      }).catch((error) => {
        autoReplyError =
          error instanceof Error ? error : new Error(String(error));
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
    const pendingResponse = result.responseJson as {
      requestedSkillProxyPath?: string;
    };
    const pendingProxySkillMd = await fs.readFile(
      path.join(pendingResponse.requestedSkillProxyPath || "", "SKILL.md"),
      "utf8",
    );
    assert.include(pendingProxySkillMd, "## Execution Mode: INTERACTIVE");
    assert.notInclude(
      pendingProxySkillMd,
      "## Execution Mode: AUTO (Non-Interactive)",
    );
    assert.include(pendingProxySkillMd, "Pending Branch Contract");
    assert.include(pendingProxySkillMd, "Supported `ui_hints.kind` values");
    assert.include(
      pendingProxySkillMd,
      "`open_text | choose_one | confirm | upload_files`",
    );
    assert.include(pendingProxySkillMd, "`ui_hints.options`");
    assert.include(pendingProxySkillMd, '"kind": "choose_one"');
    assert.include(pendingProxySkillMd, '"label": "Continue"');
    assert.include(pendingProxySkillMd, '"value": "continue"');
    assert.notInclude(pendingProxySkillMd, "## Runtime Output Overrides");
    const pendingAssistantMessages =
      capturedWaiting?.transcriptItems.filter(
        (item) => item.kind === "message" && item.role === "assistant",
      ) || [];
    assert.isTrue(
      pendingAssistantMessages.some(
        (item) => item.text === "Need user confirmation.",
      ),
    );
    assert.isFalse(
      pendingAssistantMessages.some((item) =>
        item.text.includes("__SKILL_DONE__"),
      ),
    );
    assert.isFalse(
      pendingAssistantMessages.some((item) => item.text.includes("ui_hints")),
    );
    assert.deepEqual(
      capturedWaiting?.outputRevisions.map((entry) => entry.status),
      ["pending"],
    );
    assert.isTrue(
      pendingAssistantMessages.some((item) => item.revision?.count === 1),
    );
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
    const finalAssistantMessages =
      finished?.transcriptItems.filter(
        (item) => item.kind === "message" && item.role === "assistant",
      ) || [];
    assert.isTrue(
      finalAssistantMessages.some((item) => item.text.includes("- ok: true")),
    );
    assert.isFalse(
      finalAssistantMessages.some((item) => item.text.includes("```json")),
    );
    assert.isFalse(
      finalAssistantMessages.some((item) =>
        item.text.includes("__SKILL_DONE__"),
      ),
    );
    assert.deepEqual(
      finished?.outputRevisions.map((entry) => entry.status),
      ["pending", "final"],
    );
    assert.isTrue(
      await fs
        .access(finished?.resultJsonPath || "")
        .then(() => true)
        .catch(() => false),
    );
  });

  it("pauses interactive hard timeout while waiting for user reply and restarts next turn", async function () {
    this.timeout(6000);
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
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
      newSession: async () => ({ sessionId: "session-interactive-timeout" }),
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
                  ? JSON.stringify({
                      __SKILL_DONE__: false,
                      message: "Need user confirmation.",
                    })
                  : JSON.stringify({ __SKILL_DONE__: true, ok: true }),
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
      close: async () => undefined,
    };
    let replied = false;
    let replyError: Error | null = null;
    const unsubscribe = subscribeAcpSkillRunSnapshots(() => {
      const waiting = buildAcpSkillRunPanelSnapshot({}).runs.find(
        (entry) => entry.status === "waiting_user",
      );
      if (!waiting || replied) {
        return;
      }
      replied = true;
      setTimeout(() => {
        void replyAcpSkillRun({
          requestId: waiting.requestId,
          message: "Continue.",
        }).catch((error) => {
          replyError =
            error instanceof Error ? error : new Error(String(error));
        });
      }, 1300);
    });
    try {
      const result = await executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "result",
          runtime_options: {
            execution_mode: "interactive",
            hard_timeout_seconds: 1,
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
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });
      if (replyError) throw replyError;
      assert.equal(result.status, "succeeded");
      assert.equal(promptCount, 2);
      assert.equal(cancelCount, 0);
      const record = getAcpSkillRunRecord(result.requestId);
      const stages = (record?.events || []).map((event) => event.stage);
      assert.notInclude(stages, "hard-timeout-disconnect-requested");
    } finally {
      unsubscribe();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("keeps a waiting interactive ACP skill run deferred when Zotero shutdown detaches the session", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
    });
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
      newSession: async () => ({ sessionId: "session-shutdown-pending" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: JSON.stringify({
                __SKILL_DONE__: false,
                message: "Need user confirmation before final output.",
                ui_hints: {
                  kind: "confirm",
                  prompt: "Confirm?",
                  hint: "Reply to continue.",
                },
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
    let capturedWaiting: NonNullable<
      ReturnType<typeof buildAcpSkillRunPanelSnapshot>["selectedRun"]
    > | null = null;
    let shutdownStarted = false;
    let shutdownError: Error | null = null;
    try {
      resetAcpSkillRunsForTests();
      const unsubscribe = subscribeAcpSkillRunSnapshots(() => {
        const snapshot = buildAcpSkillRunPanelSnapshot({});
        const waitingSummary = snapshot.runs.find(
          (entry) => entry.status === "waiting_user",
        );
        if (!waitingSummary || shutdownStarted) {
          return;
        }
        const waiting = buildAcpSkillRunPanelSnapshot({
          selectedRequestId: waitingSummary.requestId,
        }).selectedRun;
        if (waiting?.status !== "waiting_user") {
          return;
        }
        shutdownStarted = true;
        capturedWaiting = waiting;
        void shutdownAcpSkillRunConversations().catch((error) => {
          shutdownError =
            error instanceof Error ? error : new Error(String(error));
        });
      });
      const result = await executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend: createBackend(),
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "demo-skill",
          fetch_type: "result",
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
      }).finally(() => unsubscribe());
      if (shutdownError) throw shutdownError;

      const record = getAcpSkillRunRecord(result.requestId);
      const stages = (record?.events || []).map((event) => event.stage);
      assert.equal(result.status, "deferred");
      assert.equal(result.requestId, record?.requestId);
      assert.equal(result.backendStatus, "waiting_user");
      assert.equal(record?.status, "waiting_user");
      assert.equal(record?.conversationState, "closed");
      assert.equal(record?.conversationRecoveryState, "available");
      assert.equal(record?.activePrompt, false);
      assert.equal(record?.replyState, "idle");
      assert.equal(record?.outputConvergenceState, "pending");
      assert.equal(record?.applyResultState, undefined);
      assert.equal(
        record?.pendingInteraction?.message,
        "Need user confirmation before final output.",
      );
      assert.equal(capturedWaiting?.status, "waiting_user");
      assert.include(stages, "conversation-detached");
      assert.notInclude(stages, "succeeded");
      assert.notInclude(stages, "apply-succeeded");
    } finally {
      await shutdownAcpSkillRunConversations().catch(() => undefined);
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("converges a live deferred reply final output and continues sequence apply", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
      skillId: "topic-synthesis-finalize",
    });
    const recoveryWorkflow = await createRecoveryApplyWorkflowRoot(root);
    const previousWorkflowDir = process.env.ZOTERO_TEST_WORKFLOW_DIR;
    const backend = createBackend({ id: ACP_OPENCODE_BACKEND_ID });
    const workflowRunId = "workflow-run-live-deferred-final";
    const jobId = "job-live-deferred-final";
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let promptCount = 0;
    let resolveFirstPromptStarted: (() => void) | null = null;
    let resolveCancelledPrompt: (() => void) | null = null;
    const firstPromptStarted = new Promise<void>((resolve) => {
      resolveFirstPromptStarted = resolve;
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
      onUpdate: (listener: (event: any) => void | Promise<void>) => {
        updateListener = listener;
        return () => {
          updateListener = null;
        };
      },
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => ({ sessionId: "session-live-deferred-final" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        promptCount += 1;
        if (promptCount === 1) {
          resolveFirstPromptStarted?.();
          await new Promise<void>((resolve) => {
            resolveCancelledPrompt = resolve;
          });
          return { stopReason: "cancelled", cancelRequested: true };
        }
        const resultJsonPath =
          getAcpSkillRunRecord(requestId)?.resultJsonPath || "";
        if (resultJsonPath) {
          await fs.mkdir(path.dirname(resultJsonPath), { recursive: true });
          await fs.writeFile(
            path.join(path.dirname(resultJsonPath), "_skill_run_feedback.md"),
            "## Recovered live reply feedback\n\nDetached continuation reached apply.",
            "utf8",
          );
        }
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text: JSON.stringify({
                __SKILL_DONE__: true,
                kind: "live_deferred_final",
                ok: true,
              }),
            },
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => {
        resolveCancelledPrompt?.();
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => undefined,
    };
    const sequenceRequest = {
      kind: "skillrunner.sequence.v1" as const,
      steps: [
        {
          id: "finalize",
          skill_id: "topic-synthesis-finalize",
          mode: "interactive",
          workspace: "reuse-workflow" as const,
        },
      ],
      final_step_id: "finalize",
    };
    let requestId = "";
    try {
      resetAcpSkillRunsForTests();
      resetWorkflowTasks();
      process.env.ZOTERO_TEST_WORKFLOW_DIR = recoveryWorkflow.workflowsDir;
      await rescanWorkflowRegistry({
        workflowsDir: recoveryWorkflow.workflowsDir,
      });
      initializeSequenceRunState({
        request: sequenceRequest,
        backend,
        providerOptions: { mode: "live-deferred-final-test" },
        workflowId: recoveryWorkflow.workflowId,
        workflowLabel: "Recovered Sequence Apply Workflow",
        workflowRunId,
        jobId,
      });
      const execution = executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend,
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "topic-synthesis-finalize",
          fetch_type: "result",
          runtime_options: {
            execution_mode: "interactive",
            collect_skill_run_feedback: true,
          },
        },
        orchestrationContext: {
          workflowId: recoveryWorkflow.workflowId,
          workflowLabel: "Recovered Sequence Apply Workflow",
          workflowRunId,
          jobId,
          sequenceStepId: "finalize",
          finalStepId: "finalize",
        },
        onProgress: (event) => {
          if (event.type !== "request-created") {
            return;
          }
          requestId = String(event.requestId);
          recordSequenceStepRequestCreated({
            sequenceRunId: workflowRunId,
            stepIndex: 0,
            requestId,
          });
          recordWorkflowTaskUpdate(
            makeAcpWorkflowTaskJob({
              requestId,
              workflowId: recoveryWorkflow.workflowId,
              backendId: ACP_OPENCODE_BACKEND_ID,
              state: "running",
            }),
          );
        },
        dependencies: {
          scanRegistry: async () => ({
            entries: [entry],
            entriesById: { "topic-synthesis-finalize": entry },
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
      await firstPromptStarted;
      assert.isNotEmpty(requestId);
      await interruptAcpSkillRunCurrentTurn(requestId);
      const deferred = await execution;
      assert.equal(deferred.status, "deferred");
      assert.equal(deferred.backendStatus, "waiting_user");

      await replyAcpSkillRun({
        requestId,
        message: "continue to final",
      });

      const finished = buildAcpSkillRunPanelSnapshot({
        selectedRequestId: requestId,
      }).selectedRun;
      assert.equal(finished?.status, "succeeded");
      assert.equal(finished?.applyResultState, "succeeded");
      assert.equal(finished?.outputConvergenceState, "final");
      assert.deepEqual(
        finished?.outputRevisions.map((entry) => entry.status),
        ["final"],
      );
      const assistantMessages =
        finished?.transcriptItems.filter(
          (item) => item.kind === "message" && item.role === "assistant",
        ) || [];
      assert.isTrue(
        assistantMessages.some((item) =>
          item.text.includes("- kind: live_deferred_final"),
        ),
      );
      assert.isFalse(
        assistantMessages.some((item) => item.text.includes("```json")),
      );
      assert.isFalse(
        assistantMessages.some((item) => item.text.includes("__SKILL_DONE__")),
      );
      assert.equal(
        listWorkflowTasks().find((task) => task.requestId === requestId)?.state,
        "succeeded",
      );
      const feedbackProducts = listSkillRunFeedbackProducts(
        "topic-synthesis-finalize",
      );
      assert.lengthOf(feedbackProducts, 1);
      assert.equal(feedbackProducts[0].metadata.requestId, requestId);
      assert.equal(feedbackProducts[0].metadata.sequenceStepId, "finalize");
      const feedbackPreview = await readProductAssetPreview(
        feedbackProducts[0].productId,
        SKILL_RUN_FEEDBACK_ASSET_ID,
      );
      assert.include(
        feedbackPreview.text,
        "Detached continuation reached apply",
      );
      assert.equal(promptCount, 2);
    } finally {
      if (typeof previousWorkflowDir === "string") {
        process.env.ZOTERO_TEST_WORKFLOW_DIR = previousWorkflowDir;
      } else {
        delete process.env.ZOTERO_TEST_WORKFLOW_DIR;
      }
      await shutdownAcpSkillRunConversations().catch(() => undefined);
      await rescanWorkflowRegistry();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("repairs invalid output from a live deferred reply before sequence apply", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
      skillId: "topic-synthesis-finalize",
    });
    const recoveryWorkflow = await createRecoveryApplyWorkflowRoot(root);
    const previousWorkflowDir = process.env.ZOTERO_TEST_WORKFLOW_DIR;
    const backend = createBackend({ id: ACP_OPENCODE_BACKEND_ID });
    const workflowRunId = "workflow-run-live-deferred-repair";
    const jobId = "job-live-deferred-repair";
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let promptCount = 0;
    let resolveFirstPromptStarted: (() => void) | null = null;
    let resolveCancelledPrompt: (() => void) | null = null;
    const firstPromptStarted = new Promise<void>((resolve) => {
      resolveFirstPromptStarted = resolve;
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
      onUpdate: (listener: (event: any) => void | Promise<void>) => {
        updateListener = listener;
        return () => {
          updateListener = null;
        };
      },
      onClose: () => () => undefined,
      onDiagnostics: () => () => undefined,
      onPermissionRequest: () => () => undefined,
      newSession: async () => ({ sessionId: "session-live-deferred-repair" }),
      loadSession: async () => ({ sessionId: "loaded" }),
      resumeSession: async () => ({ sessionId: "resumed" }),
      prompt: async ({ sessionId }) => {
        promptCount += 1;
        if (promptCount === 1) {
          resolveFirstPromptStarted?.();
          await new Promise<void>((resolve) => {
            resolveCancelledPrompt = resolve;
          });
          return { stopReason: "cancelled", cancelRequested: true };
        }
        await updateListener?.({
          sessionId,
          update: {
            sessionUpdate: "agent_message_chunk",
            content: {
              type: "text",
              text:
                promptCount === 2
                  ? "not valid json"
                  : JSON.stringify({
                      __SKILL_DONE__: true,
                      kind: "live_deferred_repaired",
                      ok: true,
                    }),
            },
          },
        });
        return { stopReason: "end_turn" };
      },
      cancel: async () => {
        resolveCancelledPrompt?.();
      },
      setMode: async () => undefined,
      setModel: async () => undefined,
      authenticate: async () => undefined,
      close: async () => undefined,
    };
    const sequenceRequest = {
      kind: "skillrunner.sequence.v1" as const,
      steps: [
        {
          id: "finalize",
          skill_id: "topic-synthesis-finalize",
          mode: "interactive",
          workspace: "reuse-workflow" as const,
        },
      ],
      final_step_id: "finalize",
    };
    let requestId = "";
    try {
      resetAcpSkillRunsForTests();
      resetWorkflowTasks();
      process.env.ZOTERO_TEST_WORKFLOW_DIR = recoveryWorkflow.workflowsDir;
      await rescanWorkflowRegistry({
        workflowsDir: recoveryWorkflow.workflowsDir,
      });
      initializeSequenceRunState({
        request: sequenceRequest,
        backend,
        providerOptions: { mode: "live-deferred-repair-test" },
        workflowId: recoveryWorkflow.workflowId,
        workflowLabel: "Recovered Sequence Apply Workflow",
        workflowRunId,
        jobId,
      });
      const execution = executeAcpSkillRunnerJob({
        requestKind: ACP_SKILL_RUN_REQUEST_KIND,
        backend,
        request: {
          kind: ACP_SKILL_RUN_REQUEST_KIND,
          skill_id: "topic-synthesis-finalize",
          fetch_type: "result",
          runtime_options: { execution_mode: "interactive" },
        },
        orchestrationContext: {
          workflowId: recoveryWorkflow.workflowId,
          workflowLabel: "Recovered Sequence Apply Workflow",
          workflowRunId,
          jobId,
          sequenceStepId: "finalize",
          finalStepId: "finalize",
        },
        onProgress: (event) => {
          if (event.type !== "request-created") {
            return;
          }
          requestId = String(event.requestId);
          recordSequenceStepRequestCreated({
            sequenceRunId: workflowRunId,
            stepIndex: 0,
            requestId,
          });
          recordWorkflowTaskUpdate(
            makeAcpWorkflowTaskJob({
              requestId,
              workflowId: recoveryWorkflow.workflowId,
              backendId: ACP_OPENCODE_BACKEND_ID,
              state: "running",
            }),
          );
        },
        dependencies: {
          scanRegistry: async () => ({
            entries: [entry],
            entriesById: { "topic-synthesis-finalize": entry },
            diagnostics: [],
          }),
          createWorkspace: (args) =>
            import("../../src/modules/acpSkillRunnerWorkspace").then((mod) =>
              mod.createAcpSkillRunnerWorkspace({ ...args, rootDir: root }),
            ),
          createAdapter: async () => fakeAdapter,
          maxRepairRounds: 2,
          sharedSkillCatalogRootDir: path.join(root, "shared-catalog"),
        },
      });
      await firstPromptStarted;
      assert.isNotEmpty(requestId);
      await interruptAcpSkillRunCurrentTurn(requestId);
      const deferred = await execution;
      assert.equal(deferred.status, "deferred");
      assert.equal(deferred.backendStatus, "waiting_user");

      await replyAcpSkillRun({
        requestId,
        message: "continue and repair",
      });

      const finished = buildAcpSkillRunPanelSnapshot({
        selectedRequestId: requestId,
      }).selectedRun;
      assert.equal(finished?.status, "succeeded");
      assert.equal(finished?.applyResultState, "succeeded");
      assert.equal(finished?.repairRounds, 1);
      assert.deepEqual(
        finished?.outputRevisions.map((entry) => entry.status),
        ["invalid", "final"],
      );
      assert.equal(
        listWorkflowTasks().find((task) => task.requestId === requestId)?.state,
        "succeeded",
      );
      assert.equal(promptCount, 3);
    } finally {
      if (typeof previousWorkflowDir === "string") {
        process.env.ZOTERO_TEST_WORKFLOW_DIR = previousWorkflowDir;
      } else {
        delete process.env.ZOTERO_TEST_WORKFLOW_DIR;
      }
      await shutdownAcpSkillRunConversations().catch(() => undefined);
      await rescanWorkflowRegistry();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("allows a repair round to converge to pending without completing the workflow", async function () {
    const root = await mkTempRoot();
    const { entry } = await createSkill(root, {
      executionModes: ["interactive"],
    });
    let promptCount = 0;
    let updateListener: ((event: any) => void | Promise<void>) | null = null;
    let capturedWaiting: NonNullable<
      ReturnType<typeof buildAcpSkillRunPanelSnapshot>["selectedRun"]
    > | null = null;
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
                        ui_hints: {
                          prompt: "One more answer?",
                          options: ["continue"],
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
    assert.equal(
      capturedWaiting?.pendingInteraction?.message,
      "Need one more answer.",
    );
    assert.deepEqual(
      capturedWaiting?.outputRevisions.map((entry) => entry.status),
      ["invalid", "pending"],
    );
    assert.include(
      capturedWaiting?.outputRevisions[0]?.replacementReason || "",
      "pending",
    );
    const waitingMessages =
      capturedWaiting?.transcriptItems.filter(
        (item) => item.kind === "message" && item.role === "assistant",
      ) || [];
    assert.isFalse(
      waitingMessages.some((item) => item.text.includes("not valid json")),
    );
    assert.isTrue(waitingMessages.some((item) => item.revision?.count === 2));
    assert.equal(result.status, "succeeded");
    assert.equal(promptCount, 3);
  });
});
