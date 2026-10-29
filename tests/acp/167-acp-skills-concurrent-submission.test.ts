import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { BackendInstance } from "../../src/backends/types";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../../src/config/defaults";
import {
  appendAcpSkillRunUserReply,
  getAcpSkillRunRecord,
  listAcpSkillRuns,
  readAcpSkillRunTranscriptRegionFromMemoryForTests,
  resetAcpSkillRunsForTests,
  setAcpSkillRunRecoveryHandlerForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acp/skillRun/acpSkillRunStore";
import {
  executeAcpSkillRunnerJob,
  type AcpSkillRunnerDependencies,
} from "../../src/modules/acp/skillRun/acpSkillRunnerOrchestrator";
import {
  createAcpSkillRunnerWorkspace,
  resetAcpWorkflowWorkspaceRegistryForTests,
} from "../../src/modules/acp/skillRun/acpSkillRunnerWorkspace";
import type { AcpConnectionAdapter } from "../../src/modules/acp/transport/acpConnectionAdapter";
import { flushAcpSkillRunAuditTrailWritesForTests } from "../../src/modules/acp/skillRun/acpSkillRunAuditTrail";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { resetWorkflowTasks } from "../../src/modules/taskRuntime";
import { workflowSubmissionQueue } from "../../src/jobQueue/workflowSubmissionQueue";
import {
  cancelAcpSkillRun,
  connectAcpSkillRun,
  disconnectAcpSkillRun,
  replyAcpSkillRun,
} from "../../src/modules/acp/skillRun/acpSkillRunActions";
import {
  hasAcpSkillRunController,
  registerAcpSkillRunController,
  registerAcpSkillRunSetupController,
  unregisterAcpSkillRunSetupController,
} from "../../src/modules/acp/skillRun/acpSkillRunControllerRegistry";
import { readAcpSkillRunWorkspaceRegions } from "../../src/modules/acp/skillRun/acpSkillsWorkspaceSurface";
import { createAcpSkillsWorkspaceOwner } from "../../src/modules/assistant/publication/assistantWorkspacePublication";
import {
  beginAssistantReplySubmission,
  failAssistantReplySubmission,
  finishAssistantReplySubmission,
  getAssistantReplySubmission,
} from "../../src/modules/assistant/workspace/assistantWorkspaceReplySubmission";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function waitFor<T>(read: () => T | null | undefined, label: string) {
  for (let index = 0; index < 80; index += 1) {
    const value = read();
    if (value !== null && typeof value !== "undefined") {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function createSkill(root: string) {
  const skillDir = path.join(root, "skills", "concurrent-skill");
  await fs.mkdir(path.join(skillDir, "assets"), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    "---\nname: concurrent-skill\n---\n\nReturn structured output.\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "output.schema.json"),
    JSON.stringify({
      type: "object",
      required: ["ok"],
      properties: { ok: { const: true } },
      additionalProperties: true,
    }),
    "utf8",
  );
  await fs.writeFile(
    path.join(skillDir, "assets", "runner.json"),
    JSON.stringify({
      id: "concurrent-skill",
      execution_modes: ["auto"],
      runtime: { dependencies: [] },
      schemas: { output: "assets/output.schema.json" },
    }),
    "utf8",
  );
  return {
    skillId: "concurrent-skill",
    description: "Concurrent ACP test skill",
    sourceKind: "user" as const,
    sourceDir: skillDir,
    skillMdPath: path.join(skillDir, "SKILL.md"),
    runnerJsonPath: path.join(skillDir, "assets", "runner.json"),
    checksum: "sha256:concurrent-test",
    diagnostics: [],
  };
}

function createBackend(): BackendInstance {
  return {
    id: "acp-concurrent-test",
    displayName: "ACP Concurrent Test",
    type: "acp",
    baseUrl: "local://acp-concurrent-test",
    command: "fake-acp",
    args: ["acp"],
    auth: { kind: "none" },
  };
}

function createAdapter(args: {
  id: string;
  promptStarted: (id: string) => void;
  releasePrompt: Promise<void>;
  closeCalls?: { value: number };
  stageGates?: Partial<
    Record<"initialize" | "newSession" | "setMode", Promise<void>>
  >;
}) {
  let updateListener: ((event: unknown) => void | Promise<void>) | null = null;
  const closeCalls = args.closeCalls || { value: 0 };
  const adapter: AcpConnectionAdapter = {
    initialize: async () => {
      await args.stageGates?.initialize;
      return {
        authMethods: [],
        agentName: "fake",
        agentVersion: "1",
        commandLabel: "fake",
        commandLine: "fake",
        canLoadSession: true,
        canResumeSession: true,
        canUseHttpMcp: true,
        canUseSseMcp: false,
      };
    },
    onUpdate: (listener) => {
      updateListener = listener;
      return () => {
        updateListener = null;
      };
    },
    onClose: () => () => undefined,
    onDiagnostics: () => () => undefined,
    onPermissionRequest: () => () => undefined,
    newSession: async () => {
      await args.stageGates?.newSession;
      return {
        sessionId: `session-${args.id}`,
        modes: {
          currentModeId: "default",
          availableModes: [
            { id: "default", name: "Default" },
            { id: "plan", name: "Plan" },
          ],
        },
      };
    },
    loadSession: async ({ sessionId }) => ({ sessionId }),
    resumeSession: async ({ sessionId }) => ({ sessionId }),
    prompt: async ({ sessionId }) => {
      args.promptStarted(args.id);
      await args.releasePrompt;
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
    setMode: async () => {
      await args.stageGates?.setMode;
    },
    setModel: async () => undefined,
    authenticate: async () => undefined,
    close: async () => {
      closeCalls.value += 1;
    },
  };
  return adapter;
}

function createDependencies(args: {
  root: string;
  entry: Awaited<ReturnType<typeof createSkill>>;
  scanRegistry?: AcpSkillRunnerDependencies["scanRegistry"];
  createAdapter: AcpSkillRunnerDependencies["createAdapter"];
}) {
  return {
    scanRegistry:
      args.scanRegistry ||
      (async () => ({
        entries: [args.entry],
        entriesById: { [args.entry.skillId]: args.entry },
        diagnostics: [],
      })),
    createWorkspace: (
      workspaceArgs: Parameters<typeof createAcpSkillRunnerWorkspace>[0],
    ) =>
      createAcpSkillRunnerWorkspace({ ...workspaceArgs, rootDir: args.root }),
    createAdapter: args.createAdapter,
    dependencyProbe: async () => ({ ok: true }),
    sharedSkillCatalogRootDir: path.join(args.root, "shared-catalog"),
  } satisfies AcpSkillRunnerDependencies;
}

function execute(args: {
  backend: BackendInstance;
  dependencies: AcpSkillRunnerDependencies;
  orchestrationContext?: {
    submissionId?: string;
    submissionUnitId?: string;
  };
  providerOptions?: Record<string, unknown>;
}) {
  return executeAcpSkillRunnerJob({
    requestKind: ACP_SKILL_RUN_REQUEST_KIND,
    backend: args.backend,
    request: {
      kind: ACP_SKILL_RUN_REQUEST_KIND,
      skill_id: "concurrent-skill",
      fetch_type: "bundle",
      runtime_options: {
        execution_mode: "auto",
        zotero_host_access: { required: false },
      },
    },
    dependencies: args.dependencies,
    orchestrationContext: args.orchestrationContext,
    providerOptions: args.providerOptions,
  });
}

describe("ACP Skills concurrent setup lifecycle", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
    resetWorkflowTasks();
    resetAcpSkillRunsForTests();
  });

  afterEach(async function () {
    await flushAcpSkillRunAuditTrailWritesForTests();
    resetAcpWorkflowWorkspaceRegistryForTests();
    resetAcpSkillRunsForTests();
    resetWorkflowTasks();
    resetPluginStateStoreForTests();
  });

  it("runs two admitted ACP units through independent sessions and prompts", async function () {
    this.timeout(20_000);
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "zs-acp-concurrent-"));
    const entry = await createSkill(root);
    const promptIds: string[] = [];
    const promptStarted = deferred<void>();
    const releasePrompt = deferred<void>();
    const adapters = ["one", "two"].map((id) =>
      createAdapter({
        id,
        promptStarted: (promptId) => {
          promptIds.push(promptId);
          if (new Set(promptIds).size === 2) {
            promptStarted.resolve();
          }
        },
        releasePrompt: releasePrompt.promise,
      }),
    );
    let adapterIndex = 0;
    try {
      const first = execute({
        backend: createBackend(),
        orchestrationContext: {
          submissionId: "submission-concurrent",
          submissionUnitId: "unit-one",
        },
        dependencies: createDependencies({
          root,
          entry,
          createAdapter: async () => adapters[adapterIndex++]!,
        }),
      });
      const second = execute({
        backend: createBackend(),
        orchestrationContext: {
          submissionId: "submission-concurrent",
          submissionUnitId: "unit-two",
        },
        dependencies: createDependencies({
          root,
          entry,
          createAdapter: async () => adapters[adapterIndex++]!,
        }),
      });

      await promptStarted.promise;
      assert.sameMembers(promptIds, ["one", "two"]);
      releasePrompt.resolve();
      const results = await Promise.all([first, second]);
      assert.deepEqual(
        results.map((result) => result.status),
        ["succeeded", "succeeded"],
      );
      const records = listAcpSkillRuns();
      assert.lengthOf(records, 2);
      assert.sameMembers(
        records.map((record) => record.submissionId),
        ["submission-concurrent", "submission-concurrent"],
      );
      assert.sameMembers(
        records.map((record) => record.submissionUnitId),
        ["unit-one", "unit-two"],
      );
      assert.sameMembers(
        records.map((record) => record.sessionId),
        ["session-one", "session-two"],
      );
      for (const record of records) {
        const stages = record.events.map((event) => event.stage);
        for (const stage of [
          "workspace-created",
          "registry-ready",
          "skill-materialized",
          "host-bridge-cli-ready",
          "runtime-dependencies-resolved",
          "adapter-created",
          "transport-spawned",
          "acp-initialized",
          "acp-session-created",
          "prompt-started",
        ]) {
          assert.equal(
            stages.filter((entry) => entry === stage).length,
            1,
            `${record.requestId} should record ${stage} exactly once`,
          );
        }
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("cancels setup before adapter creation without claiming a live connection", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-acp-setup-cancel-"),
    );
    const entry = await createSkill(root);
    const scan = deferred<void>();
    let createAdapterCalls = 0;
    try {
      const execution = execute({
        backend: createBackend(),
        dependencies: createDependencies({
          root,
          entry,
          scanRegistry: async () => {
            await scan.promise;
            return {
              entries: [entry],
              entriesById: { [entry.skillId]: entry },
              diagnostics: [],
            };
          },
          createAdapter: async () => {
            createAdapterCalls += 1;
            throw new Error("adapter creation should not be reached");
          },
        }),
      });
      const requestId = await waitFor(
        () => listAcpSkillRuns()[0]?.requestId,
        "ACP setup run",
      );
      await cancelAcpSkillRun(requestId);
      scan.resolve();
      const result = await execution;
      const record = getAcpSkillRunRecord(requestId);
      assert.equal(result.status, "canceled");
      assert.equal(record?.status, "canceled");
      assert.notEqual(record?.conversationRecoveryState, "connected");
      assert.equal(record?.sessionId, undefined);
      assert.equal(createAdapterCalls, 0);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("keeps terminal sequence conversation outside submission slot admission", async function () {
    const requestId = "terminal-sequence-step-conversation";
    let slotCalls = 0;
    const originalGetSlotCoordinator =
      workflowSubmissionQueue.getSlotCoordinator.bind(workflowSubmissionQueue);
    const queue = workflowSubmissionQueue as unknown as {
      getSlotCoordinator: typeof workflowSubmissionQueue.getSlotCoordinator;
    };
    queue.getSlotCoordinator = (() => ({
      ensureSlot: async () => {
        slotCalls += 1;
        return true;
      },
    })) as typeof workflowSubmissionQueue.getSlotCoordinator;
    try {
      upsertAcpSkillRun({
        requestId,
        status: "succeeded",
        backendStatus: "succeeded",
        backendId: "backend-acp",
        backendType: "acp",
        submissionId: "submission-sequence",
        submissionUnitId: "unit-sequence-step-1",
        sequenceStepId: "step-1",
        sequenceStepIndex: 0,
        sequenceFinalStepId: "step-2",
        sessionId: "session-terminal-sequence-step",
        conversationState: "closed",
        conversationRecoveryState: "available",
        outputConvergenceState: "final",
        applyResultState: "succeeded",
      });
      setAcpSkillRunRecoveryHandlerForTests(async ({ reason }) => {
        assert.equal(reason, "connect");
        registerAcpSkillRunController(
          requestId,
          {
            cancel: async () => undefined,
            reply: async () => undefined,
            disconnect: async () => undefined,
          },
          undefined,
          "post-terminal-conversation",
        );
      });

      await connectAcpSkillRun(requestId);
      await replyAcpSkillRun({ requestId, message: "parallel follow-up" });

      const record = getAcpSkillRunRecord(requestId);
      assert.equal(slotCalls, 0);
      assert.equal(record?.status, "succeeded");
      assert.equal(record?.sequenceStepId, "step-1");
      assert.equal(record?.sequenceStepIndex, 0);
      assert.equal(record?.sequenceFinalStepId, "step-2");
      assert.equal(record?.submissionUnitId, "unit-sequence-step-1");
    } finally {
      await disconnectAcpSkillRun(requestId).catch(() => undefined);
      setAcpSkillRunRecoveryHandlerForTests(null);
      queue.getSlotCoordinator = originalGetSlotCoordinator;
    }
  });

  it("closes an adapter that resolves after setup cancellation", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-acp-late-adapter-"),
    );
    const entry = await createSkill(root);
    const adapterReady = deferred<void>();
    const releaseAdapter = deferred<void>();
    const closeCalls = { value: 0 };
    let adapterPromptCalls = 0;
    const adapter = createAdapter({
      id: "late",
      promptStarted: () => {
        adapterPromptCalls += 1;
      },
      releasePrompt: Promise.resolve(),
      closeCalls,
    });
    try {
      const execution = execute({
        backend: createBackend(),
        dependencies: createDependencies({
          root,
          entry,
          createAdapter: async () => {
            adapterReady.resolve();
            await releaseAdapter.promise;
            return adapter;
          },
        }),
      });
      await adapterReady.promise;
      const requestId = await waitFor(
        () => listAcpSkillRuns()[0]?.requestId,
        "late adapter setup run",
      );
      await cancelAcpSkillRun(requestId);
      releaseAdapter.resolve();
      const result = await execution;
      const record = getAcpSkillRunRecord(requestId);
      assert.equal(result.status, "canceled");
      assert.equal(record?.status, "canceled");
      assert.equal(closeCalls.value, 1);
      assert.equal(adapterPromptCalls, 0);
      assert.notEqual(record?.conversationRecoveryState, "connected");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("keeps setup non-connected and prevents late startup stages from reviving canceled runs", async function () {
    this.timeout(20_000);
    for (const stage of ["initialize", "newSession", "setMode"] as const) {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), `zs-acp-stage-${stage}-`),
      );
      const entry = await createSkill(root);
      const gate = deferred<void>();
      let promptCalls = 0;
      try {
        const execution = execute({
          backend: createBackend(),
          providerOptions: { acpModeId: "plan" },
          dependencies: createDependencies({
            root,
            entry,
            createAdapter: async () =>
              createAdapter({
                id: stage,
                promptStarted: () => {
                  promptCalls += 1;
                },
                releasePrompt: Promise.resolve(),
                stageGates: { [stage]: gate.promise },
              }),
          }),
        });
        const requestId = await waitFor(
          () => listAcpSkillRuns()[0]?.requestId,
          `${stage} setup run`,
        );
        await new Promise((resolve) => setTimeout(resolve, 20));
        assert.notEqual(
          getAcpSkillRunRecord(requestId)?.conversationRecoveryState,
          "connected",
          `${stage} must not publish connected before readiness`,
        );

        await cancelAcpSkillRun(requestId);
        assert.equal(getAcpSkillRunRecord(requestId)?.status, "canceled");
        gate.resolve();
        const result = await execution;
        assert.equal(result.status, "canceled");
        assert.equal(getAcpSkillRunRecord(requestId)?.status, "canceled");
        assert.equal(promptCalls, 0);
        assert.isFalse(hasAcpSkillRunController(requestId));
      } finally {
        await fs.rm(root, { recursive: true, force: true });
        resetAcpSkillRunsForTests();
      }
    }
  });

  it("does not let stale setup cleanup remove a live controller", async function () {
    upsertAcpSkillRun({
      requestId: "controller-identity-test",
      status: "queued",
      statusReason: "create",
      backendId: "acp-concurrent-test",
      backendType: "acp",
      skillId: "concurrent-skill",
    });
    const setupController = { cancel: async () => undefined };
    registerAcpSkillRunSetupController(
      "controller-identity-test",
      setupController,
    );
    assert.isTrue(
      registerAcpSkillRunController(
        "controller-identity-test",
        { cancel: async () => undefined },
        setupController,
      ),
    );
    unregisterAcpSkillRunSetupController(
      "controller-identity-test",
      setupController,
    );
    assert.isTrue(hasAcpSkillRunController("controller-identity-test"));
    registerAcpSkillRunController("controller-identity-test", null);
  });

  it("rejects live-controller promotion after setup cancellation wins", async function () {
    upsertAcpSkillRun({
      requestId: "controller-cancel-race-test",
      status: "queued",
      statusReason: "create",
      backendId: "acp-concurrent-test",
      backendType: "acp",
      skillId: "concurrent-skill",
    });
    const setupCancelEntered = deferred<void>();
    const releaseSetupCancel = deferred<void>();
    const setupController = {
      cancel: async () => {
        setupCancelEntered.resolve();
        await releaseSetupCancel.promise;
      },
    };
    registerAcpSkillRunSetupController(
      "controller-cancel-race-test",
      setupController,
    );

    const cancellation = cancelAcpSkillRun("controller-cancel-race-test");
    await setupCancelEntered.promise;
    let liveCancelCalls = 0;
    assert.isFalse(
      registerAcpSkillRunController(
        "controller-cancel-race-test",
        {
          cancel: async () => {
            liveCancelCalls += 1;
          },
        },
        setupController,
      ),
    );
    releaseSetupCancel.resolve();
    await cancellation;

    assert.equal(liveCancelCalls, 0);
    assert.isFalse(hasAcpSkillRunController("controller-cancel-race-test"));
    assert.equal(
      getAcpSkillRunRecord("controller-cancel-race-test")?.status,
      "canceled",
    );
  });
});
describe("ACP Skills reply submission guarding", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
    resetWorkflowTasks();
    resetAcpSkillRunsForTests();
  });

  afterEach(async function () {
    await flushAcpSkillRunAuditTrailWritesForTests();
    resetAcpWorkflowWorkspaceRegistryForTests();
    resetAcpSkillRunsForTests();
    resetWorkflowTasks();
    resetPluginStateStoreForTests();
  });

  function seedWaitingRun(
    requestId: string,
    pendingInteraction: Record<string, unknown> | null,
    paths?: { workspaceDir: string; runtimeDir: string },
  ) {
    upsertAcpSkillRun({
      requestId,
      backendId: "backend-acp",
      backendType: "acp",
      backendLabel: "ACP Backend",
      status: "waiting_user",
      sessionId: "session-seeded",
      conversationState: "active",
      conversationRecoveryState: "connected",
      connectionActionState: "idle",
      activePrompt: false,
      replyState: "idle",
      pendingInteraction,
      ...(paths || {}),
    });
  }

  async function userRows(requestId: string, probe: string) {
    const region = readAcpSkillRunTranscriptRegionFromMemoryForTests({
      requestId,
    });
    return (region.page?.items || []).filter((item) =>
      String((item as { text?: string }).text || "").includes(probe),
    );
  }

  it("hides the previous waiting controls while a reply is being submitted", async function () {
    const requestId = "acp-skills-submitting-surface";
    seedWaitingRun(requestId, {
      message: "Pick one",
      uiHints: {
        kind: "choose_one",
        prompt: "Pick one",
        options: [{ label: "Continue", value: "continue" }],
      },
    });
    const replyEntered = deferred<void>();
    const releaseReply = deferred<void>();
    let replyCalls = 0;
    registerAcpSkillRunController(requestId, {
      cancel: async () => undefined,
      reply: async () => {
        replyCalls += 1;
        replyEntered.resolve();
        await releaseReply.promise;
      },
    });
    try {
      const before = await readAcpSkillRunWorkspaceRegions({
        requestId,
        kinds: ["owner-control", "composer"],
      });
      assert.equal(before["owner-control"]?.hint.kind, "waiting_user");
      assert.isNotNull(before["owner-control"]?.interaction);

      const reply = replyAcpSkillRun({ requestId, message: "continue" });
      await replyEntered.promise;

      const record = getAcpSkillRunRecord(requestId);
      const regions = await readAcpSkillRunWorkspaceRegions({
        requestId,
        kinds: ["owner-control", "composer"],
      });

      assert.equal(record?.replyState, "accepted");
      assert.notEqual(record?.activePrompt, true);
      assert.notEqual(record?.status, "running");
      assert.notEqual(regions["owner-control"]?.hint.kind, "waiting_user");
      assert.isNull(regions["owner-control"]?.interaction);
      assert.equal(regions["owner-control"]?.execution.canInterrupt, false);
      assert.equal(regions.composer?.reply.status, "submitting");

      releaseReply.resolve();
      await reply;
      assert.equal(replyCalls, 1);
      assert.equal(
        (
          await readAcpSkillRunWorkspaceRegions({
            requestId,
            kinds: ["composer"],
          })
        ).composer?.reply.status,
        "enabled",
      );
    } finally {
      registerAcpSkillRunController(requestId, null);
    }
  });

  it("keeps the composer busy while an active prompt turn runs", async function () {
    const requestId = "acp-skills-active-prompt-surface";
    seedWaitingRun(requestId, null);
    const replyEntered = deferred<void>();
    const releaseReply = deferred<void>();
    registerAcpSkillRunController(requestId, {
      cancel: async () => undefined,
      reply: async () => {
        upsertAcpSkillRun({ requestId, status: "running", activePrompt: true });
        replyEntered.resolve();
        await releaseReply.promise;
      },
    });
    try {
      const reply = replyAcpSkillRun({ requestId, message: "continue" });
      await replyEntered.promise;
      const regions = await readAcpSkillRunWorkspaceRegions({
        requestId,
        kinds: ["composer", "owner-control"],
      });

      assert.equal(regions.composer?.reply.status, "busy");
      assert.equal(regions["owner-control"]?.hint.kind, "running");

      releaseReply.resolve();
      await reply;
    } finally {
      registerAcpSkillRunController(requestId, null);
    }
  });

  it("merges a duplicate reply for the same owner into the in-flight submission", async function () {
    const requestId = "acp-skills-duplicate-reply";
    seedWaitingRun(requestId, {
      message: "Which mode?",
      uiHints: {
        kind: "choose_one",
        prompt: "Which mode?",
        options: [{ label: "Deep", value: "deep" }],
      },
    });
    const recoveryEntered = deferred<void>();
    const releaseRecovery = deferred<void>();
    let replyCalls = 0;
    setAcpSkillRunRecoveryHandlerForTests(
      async ({ requestId: recoveredId }) => {
        recoveryEntered.resolve();
        await releaseRecovery.promise;
        registerAcpSkillRunController(recoveredId, {
          cancel: async () => undefined,
          reply: async (message: string) => {
            replyCalls += 1;
            appendAcpSkillRunUserReply({ requestId: recoveredId, message });
          },
        });
      },
    );
    try {
      const first = replyAcpSkillRun({
        requestId,
        message: "duplicate submission probe",
      });
      await recoveryEntered.promise;
      assert.equal(getAcpSkillRunRecord(requestId)?.replyState, "submitted");

      const duplicate = replyAcpSkillRun({
        requestId,
        message: "duplicate submission probe",
      });

      releaseRecovery.resolve();
      await Promise.all([first, duplicate]);

      assert.equal(replyCalls, 1);
      assert.lengthOf(
        await userRows(requestId, "duplicate submission probe"),
        1,
      );
      assert.equal(getAcpSkillRunRecord(requestId)?.replyState, "idle");
    } finally {
      setAcpSkillRunRecoveryHandlerForTests(null);
      registerAcpSkillRunController(requestId, null);
    }
  });

  it("keeps a reply retryable when the agent turn fails after acceptance", async function () {
    const requestId = "acp-skills-turn-failure";
    seedWaitingRun(requestId, null);
    const owner = createAcpSkillsWorkspaceOwner(requestId);
    assert.isTrue(beginAssistantReplySubmission(owner, "action-turn-failure"));
    let replyCalls = 0;
    registerAcpSkillRunController(requestId, {
      cancel: async () => undefined,
      reply: async (message: string) => {
        replyCalls += 1;
        if (replyCalls > 1) {
          return;
        }
        // The canonical user row lands with the turn, like the orchestrator.
        appendAcpSkillRunUserReply({ requestId, message });
        throw new Error("agent execution failed after acceptance");
      },
    });
    try {
      let caught: unknown;
      try {
        await replyAcpSkillRun({ requestId, message: "first" });
      } catch (error) {
        caught = error;
      }
      assert.match(String(caught), /agent execution failed after acceptance/);

      const failed = getAcpSkillRunRecord(requestId);
      assert.notEqual(failed?.replyState, "rejected");
      assert.isUndefined(failed?.replyError);
      assert.equal(
        getAssistantReplySubmission(owner)?.phase,
        "accepted",
        "the canonical row was linked before the turn failed",
      );
      assert.isTrue(
        (failed?.events || []).some((event) =>
          String(event.message || "").includes(
            "agent execution failed after acceptance",
          ),
        ),
      );

      await replyAcpSkillRun({ requestId, message: "second" });
      assert.equal(replyCalls, 2);
      assert.equal(getAcpSkillRunRecord(requestId)?.replyState, "idle");
    } finally {
      finishAssistantReplySubmission(owner, "action-turn-failure");
      registerAcpSkillRunController(requestId, null);
    }
  });

  it("rejects a submission the controller refuses before the turn starts", async function () {
    const requestId = "acp-skills-refused-submission";
    seedWaitingRun(requestId, null);
    registerAcpSkillRunController(requestId, {
      cancel: async () => undefined,
      reply: async () => {
        throw new Error("controller refused the reply");
      },
    });
    try {
      let caught: unknown;
      try {
        await replyAcpSkillRun({ requestId, message: "first" });
      } catch (error) {
        caught = error;
      }
      assert.match(String(caught), /controller refused the reply/);

      const record = getAcpSkillRunRecord(requestId);
      assert.equal(record?.replyState, "rejected");
      assert.equal(record?.replyError, "controller refused the reply");

      registerAcpSkillRunController(requestId, {
        cancel: async () => undefined,
        reply: async () => undefined,
      });
      await replyAcpSkillRun({ requestId, message: "second" });
      assert.equal(getAcpSkillRunRecord(requestId)?.replyState, "idle");
    } finally {
      registerAcpSkillRunController(requestId, null);
    }
  });

  it("releases the submission lock when no controller is available for the handoff", async function () {
    const requestId = "acp-skills-handoff-release";
    seedWaitingRun(requestId, null);
    setAcpSkillRunRecoveryHandlerForTests(null);
    let caught: unknown;
    try {
      await replyAcpSkillRun({ requestId, message: "first" });
    } catch (error) {
      caught = error;
    }
    assert.match(String(caught), /No active ACP conversation controller/);
    assert.equal(getAcpSkillRunRecord(requestId)?.replyState, "rejected");

    registerAcpSkillRunController(requestId, {
      cancel: async () => undefined,
      reply: async () => undefined,
    });
    try {
      await replyAcpSkillRun({ requestId, message: "second" });
      assert.equal(getAcpSkillRunRecord(requestId)?.replyState, "idle");
    } finally {
      registerAcpSkillRunController(requestId, null);
    }
  });

  it("keeps a rejected submission retryable and links the canonical user row once", async function () {
    const rejectedRequestId = "acp-skills-rejected-submission";
    seedWaitingRun(rejectedRequestId, null);
    setAcpSkillRunRecoveryHandlerForTests(async () => {
      throw new Error("recovery transport unavailable");
    });
    try {
      let caught: unknown;
      try {
        await replyAcpSkillRun({
          requestId: rejectedRequestId,
          message: "first",
        });
      } catch (error) {
        caught = error;
      }
      assert.match(String(caught), /recovery transport unavailable/);
      assert.equal(
        getAcpSkillRunRecord(rejectedRequestId)?.replyState,
        "rejected",
      );
    } finally {
      setAcpSkillRunRecoveryHandlerForTests(null);
    }

    const requestId = "acp-skills-linked-submission";
    seedWaitingRun(requestId, null);
    const owner = createAcpSkillsWorkspaceOwner(requestId);
    assert.isTrue(beginAssistantReplySubmission(owner, "action-linked"));
    registerAcpSkillRunController(requestId, {
      cancel: async () => undefined,
      reply: async (message: string) => {
        appendAcpSkillRunUserReply({ requestId, message });
      },
    });
    try {
      await replyAcpSkillRun({ requestId, message: "linked probe" });
      const [row] = await userRows(requestId, "linked probe");
      const receipt = getAssistantReplySubmission(owner);

      assert.ok(row);
      assert.equal(receipt?.phase, "accepted");
      assert.equal(
        (row as { role?: string }).role,
        "user",
        "the linked row is the canonical user turn",
      );
      assert.equal(
        receipt?.transcriptItemId,
        String((row as { itemId?: string }).itemId || ""),
      );

      seedWaitingRun("acp-skills-plain-append", null);
      appendAcpSkillRunUserReply({
        requestId: "acp-skills-plain-append",
        message: "plain runtime append",
      });
      assert.isNull(
        getAssistantReplySubmission(
          createAcpSkillsWorkspaceOwner("acp-skills-plain-append"),
        ),
      );
    } finally {
      finishAssistantReplySubmission(owner, "action-linked");
      registerAcpSkillRunController(requestId, null);
    }
  });

  it("admits a reply to the next question while the previous submission is in flight", async function () {
    const requestId = "acp-skills-next-question";
    seedWaitingRun(requestId, {
      message: "First question",
      uiHints: { kind: "open_text", prompt: "First question" },
    });
    const release = deferred<void>();
    let replyCalls = 0;
    registerAcpSkillRunController(requestId, {
      cancel: async () => undefined,
      reply: async (message: string) => {
        replyCalls += 1;
        if (replyCalls > 1) {
          return;
        }
        appendAcpSkillRunUserReply({ requestId, message });
        // The agent asks the next question while the first handler stays open.
        upsertAcpSkillRun({
          requestId,
          status: "waiting_user",
          pendingInteraction: {
            message: "Second question",
            uiHints: { kind: "open_text", prompt: "Second question" },
          },
        });
        await release.promise;
      },
    });
    try {
      const first = replyAcpSkillRun({ requestId, message: "first answer" });
      await waitFor(
        () =>
          getAcpSkillRunRecord(requestId)?.pendingInteraction?.message ===
            "Second question" || null,
        "the next pending interaction",
      );

      await replyAcpSkillRun({ requestId, message: "second answer" });
      assert.equal(replyCalls, 2);

      release.resolve();
      await first;
      assert.equal(getAcpSkillRunRecord(requestId)?.replyState, "idle");
    } finally {
      registerAcpSkillRunController(requestId, null);
    }
  });

  it("keeps both rounds when the agent repeats the same question", async function () {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-acp-skill-rounds-"),
    );
    const requestId = "acp-skills-repeated-question";
    const question = {
      message: "Same question",
      uiHints: { kind: "open_text", prompt: "Same question" },
    };
    seedWaitingRun(
      requestId,
      { ...question },
      {
        workspaceDir: root,
        runtimeDir: path.join(root, ".acp"),
      },
    );
    const release = deferred<void>();
    let replyCalls = 0;
    registerAcpSkillRunController(requestId, {
      cancel: async () => undefined,
      reply: async (message: string) => {
        replyCalls += 1;
        appendAcpSkillRunUserReply({ requestId, message });
        if (replyCalls === 1) {
          // The agent asks the identical question again in the next round.
          upsertAcpSkillRun({
            requestId,
            status: "waiting_user",
            pendingInteraction: { ...question },
          });
          await release.promise;
        }
      },
    });
    try {
      const first = replyAcpSkillRun({ requestId, message: "same reply" });
      await waitFor(
        () => getAcpSkillRunRecord(requestId)?.replyState === "idle" || null,
        "the next user round",
      );

      await replyAcpSkillRun({ requestId, message: "same reply" });
      assert.equal(replyCalls, 2);
      assert.lengthOf(await userRows(requestId, "same reply"), 2);

      release.resolve();
      await first;
    } finally {
      registerAcpSkillRunController(requestId, null);
      await flushAcpSkillRunAuditTrailWritesForTests();
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("keeps the guard when the answered question is published again", async function () {
    const requestId = "acp-skills-republished-question";
    const question = {
      message: "Same question",
      uiHints: { kind: "open_text", prompt: "Same question" },
    };
    seedWaitingRun(requestId, { ...question });
    const recoveryEntered = deferred<void>();
    const releaseRecovery = deferred<void>();
    let replyCalls = 0;
    setAcpSkillRunRecoveryHandlerForTests(
      async ({ requestId: recoveredId }) => {
        recoveryEntered.resolve();
        await releaseRecovery.promise;
        registerAcpSkillRunController(recoveredId, {
          cancel: async () => undefined,
          reply: async () => {
            replyCalls += 1;
          },
        });
      },
    );
    try {
      const first = replyAcpSkillRun({ requestId, message: "same answer" });
      await recoveryEntered.promise;
      assert.equal(getAcpSkillRunRecord(requestId)?.replyState, "submitted");

      // The still-waiting request state is upserted again during the handoff.
      upsertAcpSkillRun({
        requestId,
        status: "waiting_user",
        pendingInteraction: { ...question },
      });
      assert.equal(getAcpSkillRunRecord(requestId)?.replyState, "submitted");

      const duplicate = replyAcpSkillRun({ requestId, message: "same answer" });
      releaseRecovery.resolve();
      await Promise.all([first, duplicate]);

      assert.equal(replyCalls, 1);
      assert.equal(getAcpSkillRunRecord(requestId)?.replyState, "idle");
    } finally {
      setAcpSkillRunRecoveryHandlerForTests(null);
      registerAcpSkillRunController(requestId, null);
    }
  });

  it("keeps a replaced receipt from reporting the turn failure as rejected", async function () {
    const requestId = "acp-skills-replaced-receipt";
    seedWaitingRun(requestId, null);
    const owner = createAcpSkillsWorkspaceOwner(requestId);
    assert.isTrue(beginAssistantReplySubmission(owner, "action-first"));
    registerAcpSkillRunController(requestId, {
      cancel: async () => undefined,
      reply: async () => {
        // A permission round takes the owner while this prompt still runs.
        finishAssistantReplySubmission(owner, "action-first");
        assert.isTrue(
          beginAssistantReplySubmission(owner, "action-permission"),
        );
        failAssistantReplySubmission(owner, "permission round failed");
        throw new Error("agent execution failed after acceptance");
      },
    });
    try {
      let caught: unknown;
      try {
        await replyAcpSkillRun({ requestId, message: "first" });
      } catch (error) {
        caught = error;
      }
      assert.match(String(caught), /agent execution failed after acceptance/);

      const record = getAcpSkillRunRecord(requestId);
      assert.notEqual(record?.replyState, "rejected");
      assert.isUndefined(record?.replyError);
    } finally {
      finishAssistantReplySubmission(owner, "action-permission");
      registerAcpSkillRunController(requestId, null);
    }
  });
});
