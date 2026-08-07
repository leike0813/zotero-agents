import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { BackendInstance } from "../../src/backends/types";
import { ACP_SKILL_RUN_REQUEST_KIND } from "../../src/config/defaults";
import {
  cancelAcpSkillRun,
  getAcpSkillRunRecord,
  hasAcpSkillRunController,
  listAcpSkillRuns,
  registerAcpSkillRunController,
  registerAcpSkillRunSetupController,
  resetAcpSkillRunsForTests,
  unregisterAcpSkillRunSetupController,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  executeAcpSkillRunnerJob,
  type AcpSkillRunnerDependencies,
} from "../../src/modules/acpSkillRunnerOrchestrator";
import {
  createAcpSkillRunnerWorkspace,
  resetAcpWorkflowWorkspaceRegistryForTests,
} from "../../src/modules/acpSkillRunnerWorkspace";
import type { AcpConnectionAdapter } from "../../src/modules/acpConnectionAdapter";
import { flushAcpSkillRunAuditTrailWritesForTests } from "../../src/modules/acpSkillRunAuditTrail";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { resetWorkflowTasks } from "../../src/modules/taskRuntime";

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
}) {
  let updateListener: ((event: unknown) => void | Promise<void>) | null = null;
  const closeCalls = args.closeCalls || { value: 0 };
  const adapter: AcpConnectionAdapter = {
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
    onUpdate: (listener) => {
      updateListener = listener;
      return () => {
        updateListener = null;
      };
    },
    onClose: () => () => undefined,
    onDiagnostics: () => () => undefined,
    onPermissionRequest: () => () => undefined,
    newSession: async () => ({ sessionId: `session-${args.id}` }),
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
    setMode: async () => undefined,
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

  it("routes setup cancellation to a controller promoted while cancellation waits", async function () {
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
    registerAcpSkillRunController("controller-cancel-race-test", {
      cancel: async () => {
        liveCancelCalls += 1;
        registerAcpSkillRunController("controller-cancel-race-test", null);
      },
    });
    releaseSetupCancel.resolve();
    await cancellation;

    assert.equal(liveCancelCalls, 1);
    assert.isFalse(hasAcpSkillRunController("controller-cancel-race-test"));
    assert.equal(
      getAcpSkillRunRecord("controller-cancel-race-test")?.status,
      "canceled",
    );
  });
});
