import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { BackendInstance } from "../../src/backends/types";
import { ACP_OPENCODE_BACKEND_ID } from "../../src/config/defaults";
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
  recordAcpSkillRunSessionUpdate,
  registerAcpSkillRunController,
  replyAcpSkillRun,
  resolveAcpSkillRunPermissionRequest,
  resetAcpSkillRunsForTests,
  setAcpSkillRunRecoveryHandlerForTests,
  setAcpSkillRunPermissionRequest,
  subscribeAcpSkillRunSnapshots,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  buildAcpRuntimeDependencyPlan,
  defaultAcpRuntimeDependencyProbe,
  wrapAcpBackendWithUv,
} from "../../src/modules/acpRuntimeDependencyWrapper";
import {
  executeAcpSkillRunnerJob,
  recoverAcpSkillRunConversation,
} from "../../src/modules/acpSkillRunnerOrchestrator";
import { createAcpSkillRunnerWorkspace } from "../../src/modules/acpSkillRunnerWorkspace";
import { resolveProvider } from "../../src/providers/registry";
import type { AcpConnectionAdapter } from "../../src/modules/acpConnectionAdapter";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";

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
  args?: { dependencies?: string[]; executionModes?: string[] },
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
      schemas: {
        output: "assets/output.schema.json",
      },
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

  it("allows skillrunner.job.v1 to resolve to ACP provider for ACP backend", function () {
    const provider = resolveProvider({
      requestKind: "skillrunner.job.v1",
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
      },
    });

    const statusItem = getAcpSkillRunRecord("run-workspace-activity")?.transcriptItems.find(
      (item) => item.kind === "status" && item.label === "workspace-activity",
    );
    assert.equal(statusItem?.kind, "status");
    if (statusItem?.kind === "status") {
      assert.include(statusItem.text, "digest_payload.json");
    }
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
      assert.include(capturedMessage, "continue from here");
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
      requestKind: "skillrunner.job.v1",
      backend: createBackend(),
      request: {
        kind: "skillrunner.job.v1",
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
      requestKind: "skillrunner.job.v1",
      backend: createBackend(),
      request: {
        kind: "skillrunner.job.v1",
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
      requestKind: "skillrunner.job.v1",
      backend: createBackend(),
      request: {
        kind: "skillrunner.job.v1",
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
