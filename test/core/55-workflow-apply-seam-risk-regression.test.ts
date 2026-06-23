import { assert } from "chai";
import { runWorkflowApplySeam } from "../../src/modules/workflowExecution/applySeam";
import {
  listActiveWorkflowTasks,
  resetWorkflowTasks,
} from "../../src/modules/taskRuntime";
import {
  attachSkillRunnerRequestId,
  createSkillRunnerRun,
  getSkillRunnerRunRecordByRequest,
  updateSkillRunnerRunStateByRunKey,
} from "../../src/modules/skillRunnerRunStore";

function createMessageFormatter() {
  return {
    summary: () => "",
    failureReasonsTitle: "Failure reasons:",
    overflow: (count: number) => `...and ${count} more`,
    unknownError: "unknown error",
    startToast: () => "",
    waitingToast: () => "",
    jobToastSuccess: () => "",
    jobToastFailed: () => "",
    jobToastCanceled: () => "",
  };
}

function createRunState(args: {
  requests: unknown[];
  jobIds: string[];
  jobsById: Record<string, unknown>;
  workflowManifest?: Record<string, unknown>;
}) {
  const queue = {
    getJob: (jobId: string) => {
      const job = args.jobsById[jobId];
      return job ? { ...(job as Record<string, unknown>) } : null;
    },
  };

  return {
    workflow: {
      manifest: {
        id: "hr-02-apply-seam",
        label: "HR-02 Apply Seam",
        ...(args.workflowManifest || {}),
      },
    },
    requests: args.requests,
    queue,
    jobIds: args.jobIds,
    runId: "run-hr-02",
    totalJobs: args.jobIds.length,
    idlePromise: Promise.resolve(),
  } as any;
}

function persistSkillRunnerRequestReadyRun(args: {
  requestId: string;
  jobId: string;
  backendId?: string;
}) {
  const now = "2026-06-20T00:00:00.000Z";
  const run = createSkillRunnerRun({
    backendId: args.backendId || "",
    workflowId: "hr-02-apply-seam",
    workflowRunId: "run-hr-02",
    jobId: args.jobId,
    taskName: "auto.md",
    fetchType: "result",
    executionMode: "auto",
    createdAt: now,
    updatedAt: now,
  });
  if (!run) {
    return;
  }
  const attached =
    attachSkillRunnerRequestId({
      runKey: run.runKey,
      requestId: args.requestId,
      updatedAt: now,
    }) || run;
  updateSkillRunnerRunStateByRunKey({
    runKey: attached.runKey,
    state: "request_ready",
    backendStatus: "running",
    updatedAt: now,
  });
}

describe("workflow apply seam risk regression", function () {
  beforeEach(function () {
    resetWorkflowTasks();
  });

  afterEach(function () {
    resetWorkflowTasks();
  });

  it("Risk: HR-02 marks missing queue record as failed with job-missing diagnostic", async function () {
    const runtimeStages: string[] = [];

    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [{ taskName: "missing-record.md", targetParentID: 1 }],
          jobIds: ["job-1"],
          jobsById: {},
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
      },
    );

    assert.equal(summary.succeeded, 0);
    assert.equal(summary.failed, 1);
    assert.include(summary.failureReasons[0], "record missing");
    assert.equal(summary.jobOutcomes[0].reason, "record missing");
    assert.include(runtimeStages, "job-missing");
  });

  it("Risk: HR-02 marks unresolved target parent as failed before apply", async function () {
    const runtimeStages: string[] = [];
    let applyCalls = 0;

    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [{ taskName: "parent-unresolved.md" }],
          jobIds: ["job-2"],
          jobsById: {
            "job-2": {
              id: "job-2",
              state: "succeeded",
              meta: {},
              result: { requestId: "req-2" },
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
        executeApplyResult: async () => {
          applyCalls += 1;
          return { ok: true };
        },
      },
    );

    assert.equal(summary.succeeded, 0);
    assert.equal(summary.failed, 1);
    assert.include(summary.failureReasons[0], "cannot resolve target parent");
    assert.equal(summary.jobOutcomes[0].reason, "cannot resolve target parent");
    assert.equal(applyCalls, 0);
    assert.include(runtimeStages, "apply-parent-missing");
  });

  it("Risk: HR-02 marks provider result without requestId as failed", async function () {
    const runtimeStages: string[] = [];
    let applyCalls = 0;

    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [{ taskName: "missing-request-id.md", targetParentID: 9 }],
          jobIds: ["job-3"],
          jobsById: {
            "job-3": {
              id: "job-3",
              state: "succeeded",
              meta: {
                targetParentID: 9,
              },
              result: {},
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
        executeApplyResult: async () => {
          applyCalls += 1;
          return { ok: true };
        },
      },
    );

    assert.equal(summary.succeeded, 0);
    assert.equal(summary.failed, 1);
    assert.include(
      summary.failureReasons[0],
      "missing requestId in execution result",
    );
    assert.equal(
      summary.jobOutcomes[0].reason,
      "missing requestId in execution result",
    );
    assert.equal(applyCalls, 0);
    assert.include(runtimeStages, "provider-result-missing-request-id");
  });

  it("marks deferred backend job as pending instead of failed", async function () {
    const runtimeStages: string[] = [];
    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [{ taskName: "interactive.md", targetParentID: 3 }],
          jobIds: ["job-4"],
          jobsById: {
            "job-4": {
              id: "job-4",
              state: "waiting_user",
              meta: {
                requestId: "req-deferred-4",
                targetParentID: 3,
              },
              result: {
                status: "deferred",
                requestId: "req-deferred-4",
                backendStatus: "waiting_user",
              },
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
      },
    );

    assert.equal(summary.succeeded, 0);
    assert.equal(summary.failed, 0);
    assert.equal(summary.pending, 1);
    assert.lengthOf(summary.failureReasons, 0);
    assert.include(runtimeStages, "job-pending");
  });

  it("keeps succeeded queue job pending when provider result is deferred", async function () {
    const runtimeStages: string[] = [];
    let applyCalls = 0;

    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [{ taskName: "interactive-succeeded-deferred.md" }],
          jobIds: ["job-succeeded-deferred"],
          jobsById: {
            "job-succeeded-deferred": {
              id: "job-succeeded-deferred",
              state: "succeeded",
              meta: {
                requestId: "req-succeeded-deferred",
              },
              result: {
                status: "deferred",
                requestId: "req-succeeded-deferred",
                backendStatus: "waiting_user",
              },
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
        executeApplyResult: async () => {
          applyCalls += 1;
          return { ok: true };
        },
      },
    );

    assert.equal(summary.succeeded, 0);
    assert.equal(summary.failed, 0);
    assert.equal(summary.pending, 1);
    assert.lengthOf(summary.failureReasons, 0);
    assert.equal(applyCalls, 0);
    assert.include(runtimeStages, "provider-result-deferred-after-succeeded-job");
    assert.notInclude(runtimeStages, "apply-start");
  });

  it("applies foreground skillrunner auto succeeded job without reconciler ownership", async function () {
    const runtimeStages: string[] = [];
    let applyCalls = 0;
    persistSkillRunnerRequestReadyRun({
      requestId: "req-auto-1",
      jobId: "job-auto-1",
      backendId: "backend-apply-1",
    });

    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [
            {
              kind: "skillrunner.job.v1",
              targetParentID: 3,
              runtime_options: {
                execution_mode: "auto",
              },
            },
          ],
          jobIds: ["job-auto-1"],
          jobsById: {
            "job-auto-1": {
              id: "job-auto-1",
              state: "succeeded",
              meta: {
                requestId: "req-auto-1",
                providerId: "skillrunner",
                backendId: "backend-apply-1",
                backendType: "skillrunner",
                backendBaseUrl: "http://127.0.0.1:8030",
                targetParentID: 3,
              },
              result: {
                status: "succeeded",
                requestId: "req-auto-1",
                fetchType: "result",
              },
            },
          },
          workflowManifest: {
            provider: "skillrunner",
            request: {
              kind: "skillrunner.job.v1",
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
        executeApplyResult: async () => {
          applyCalls += 1;
          return { ok: true };
        },
      },
    );

    assert.equal(applyCalls, 1);
    assert.equal(summary.succeeded, 1);
    assert.equal(summary.failed, 0);
    assert.equal(summary.pending, 0);
    assert.lengthOf(summary.jobOutcomes, 1);
    assert.include(runtimeStages, "apply-succeeded");
    const persisted = getSkillRunnerRunRecordByRequest({
      backendId: "backend-apply-1",
      requestId: "req-auto-1",
    });
    assert.equal(persisted?.status, "succeeded");
    assert.equal(persisted?.apply.state, "succeeded");
    assert.notInclude(
      listActiveWorkflowTasks().map((entry) => entry.requestId),
      "req-auto-1",
    );
  });

  it("records foreground skillrunner apply failure without losing backend success", async function () {
    const runtimeStages: string[] = [];
    persistSkillRunnerRequestReadyRun({
      requestId: "req-auto-apply-failed-1",
      jobId: "job-auto-apply-failed-1",
      backendId: "backend-apply-1",
    });

    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [
            {
              kind: "skillrunner.job.v1",
              targetParentID: 3,
              runtime_options: {
                execution_mode: "auto",
              },
            },
          ],
          jobIds: ["job-auto-apply-failed-1"],
          jobsById: {
            "job-auto-apply-failed-1": {
              id: "job-auto-apply-failed-1",
              state: "succeeded",
              meta: {
                requestId: "req-auto-apply-failed-1",
                providerId: "skillrunner",
                backendId: "backend-apply-1",
                backendType: "skillrunner",
                backendBaseUrl: "http://127.0.0.1:8030",
                targetParentID: 3,
              },
              result: {
                status: "succeeded",
                requestId: "req-auto-apply-failed-1",
                fetchType: "result",
              },
            },
          },
          workflowManifest: {
            provider: "skillrunner",
            request: {
              kind: "skillrunner.job.v1",
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
        executeApplyResult: async () => {
          throw new Error("apply exploded");
        },
      },
    );

    assert.equal(summary.succeeded, 0);
    assert.equal(summary.failed, 1);
    assert.equal(summary.pending, 0);
    assert.include(runtimeStages, "apply-failed");
    const persisted = getSkillRunnerRunRecordByRequest({
      backendId: "backend-apply-1",
      requestId: "req-auto-apply-failed-1",
    });
    assert.equal(persisted?.status, "failed");
    assert.equal(persisted?.backendStatus, "succeeded");
    assert.equal(persisted?.apply.state, "failed");
  });

  it("does not skip foreground apply for ACP skillrunner-compatible auto succeeded job", async function () {
    const runtimeStages: string[] = [];
    let applyCalls = 0;

    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [
            {
              kind: "skillrunner.job.v1",
              targetParentID: 3,
              runtime_options: {
                execution_mode: "auto",
              },
            },
          ],
          jobIds: ["job-acp-auto-1"],
          jobsById: {
            "job-acp-auto-1": {
              id: "job-acp-auto-1",
              state: "succeeded",
              meta: {
                requestId: "acp-auto-1",
                targetParentID: 3,
                providerId: "acp",
                backendType: "acp",
              },
              result: {
                status: "succeeded",
                requestId: "acp-auto-1",
                fetchType: "result",
                resultJson: {
                  digest_path: "result/digest.md",
                },
                responseJson: {
                  provider: "acp",
                  workspaceDir: "C:/tmp/acp-auto-1",
                },
              },
            },
          },
          workflowManifest: {
            provider: "skillrunner",
            request: {
              kind: "skillrunner.job.v1",
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
        executeApplyResult: async () => {
          applyCalls += 1;
          return { ok: true };
        },
      },
    );

    assert.equal(applyCalls, 1);
    assert.equal(summary.succeeded, 1);
    assert.equal(summary.failed, 0);
    assert.equal(summary.pending, 0);
    assert.notInclude(runtimeStages, "foreground-apply-skipped-auto");
    assert.include(runtimeStages, "apply-succeeded");
  });

  it("keeps ACP disconnected skill runs pending instead of applying workflow results", async function () {
    const runtimeStages: string[] = [];
    let applyCalls = 0;

    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [
            {
              kind: "acp.skill.run.v1",
              targetParentID: 3,
              skill_id: "demo-skill",
            },
          ],
          jobIds: ["job-acp-disconnected-1"],
          jobsById: {
            "job-acp-disconnected-1": {
              id: "job-acp-disconnected-1",
              state: "succeeded",
              meta: {
                requestId: "acp-disconnected-1",
                targetParentID: 3,
                providerId: "acp",
                backendType: "acp",
              },
              result: {
                status: "succeeded",
                requestId: "acp-disconnected-1",
                fetchType: "result",
                responseJson: {
                  provider: "acp",
                  requestId: "acp-disconnected-1",
                  status: "disconnected",
                },
              },
            },
          },
          workflowManifest: {
            provider: "acp",
            request: {
              kind: "acp.skill.run.v1",
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
        executeApplyResult: async () => {
          applyCalls += 1;
          return { ok: true };
        },
      },
    );

    assert.equal(applyCalls, 0);
    assert.equal(summary.succeeded, 0);
    assert.equal(summary.failed, 0);
    assert.equal(summary.pending, 1);
    assert.lengthOf(summary.jobOutcomes, 0);
    assert.include(runtimeStages, "foreground-apply-skipped-acp-recoverable");
    assert.notInclude(runtimeStages, "apply-start");
    assert.notInclude(runtimeStages, "apply-succeeded");
  });

  it("fails pre-ready skillrunner auto job instead of keeping it pending", async function () {
    const runtimeStages: string[] = [];

    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [
            {
              kind: "skillrunner.job.v1",
              targetParentID: 3,
              runtime_options: {
                execution_mode: "auto",
              },
            },
          ],
          jobIds: ["job-auto-recoverable-1"],
          jobsById: {
            "job-auto-recoverable-1": {
              id: "job-auto-recoverable-1",
              state: "running",
              error: "backend polling temporarily failed",
              meta: {
                requestId: "req-auto-recoverable-1",
                providerId: "skillrunner",
                targetParentID: 3,
              },
            },
          },
          workflowManifest: {
            provider: "skillrunner",
            request: {
              kind: "skillrunner.job.v1",
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
      },
    );

    assert.equal(summary.succeeded, 0);
    assert.equal(summary.failed, 1);
    assert.equal(summary.pending, 0);
    assert.include(
      summary.failureReasons[0],
      "backend polling temporarily failed",
    );
    assert.notInclude(
      runtimeStages,
      "job-pending-recoverable-dispatch-failure",
    );
    assert.include(runtimeStages, "job-failed");
  });

  it("keeps request-ready skillrunner auto job pending when local dispatch fails after backend ownership", async function () {
    const runtimeStages: string[] = [];

    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [
            {
              kind: "skillrunner.job.v1",
              targetParentID: 3,
              runtime_options: {
                execution_mode: "auto",
              },
            },
          ],
          jobIds: ["job-auto-recoverable-ready-1"],
          jobsById: {
            "job-auto-recoverable-ready-1": {
              id: "job-auto-recoverable-ready-1",
              state: "running",
              error: "backend polling temporarily failed",
              meta: {
                requestId: "req-auto-recoverable-ready-1",
                providerId: "skillrunner",
                targetParentID: 3,
                skillRunnerRequestReady: true,
              },
            },
          },
          workflowManifest: {
            provider: "skillrunner",
            request: {
              kind: "skillrunner.job.v1",
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
      },
    );

    assert.equal(summary.succeeded, 0);
    assert.equal(summary.failed, 0);
    assert.equal(summary.pending, 1);
    assert.lengthOf(summary.failureReasons, 0);
    assert.lengthOf(summary.jobOutcomes, 0);
    assert.include(runtimeStages, "job-pending-recoverable-dispatch-failure");
  });

  it("does not keep terminal skillrunner run error pending for reconciler", async function () {
    const runtimeStages: string[] = [];

    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [
            {
              kind: "skillrunner.job.v1",
              targetParentID: 3,
              runtime_options: {
                execution_mode: "auto",
              },
            },
          ],
          jobIds: ["job-auto-terminal-1"],
          jobsById: {
            "job-auto-terminal-1": {
              id: "job-auto-terminal-1",
              state: "failed",
              error: "SkillRunner upload step failed: status=422",
              meta: {
                requestId: "req-auto-terminal-1",
                providerId: "skillrunner",
                targetParentID: 3,
                skillRunnerTerminalRunError: true,
              },
            },
          },
          workflowManifest: {
            provider: "skillrunner",
            request: {
              kind: "skillrunner.job.v1",
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          runtimeStages.push(entry.stage);
        },
      },
    );

    assert.equal(summary.succeeded, 0);
    assert.equal(summary.pending, 0);
    assert.equal(summary.failed, 1);
    assert.notInclude(
      runtimeStages,
      "job-pending-recoverable-dispatch-failure",
    );
  });

  it("propagates explicit bundle-entry path error into failureReasons", async function () {
    const summary = await runWorkflowApplySeam(
      {
        runState: createRunState({
          requests: [{ taskName: "path-resolution.md", targetParentID: 7 }],
          jobIds: ["job-path-1"],
          jobsById: {
            "job-path-1": {
              id: "job-path-1",
              state: "succeeded",
              meta: {
                targetParentID: 7,
              },
              result: {
                requestId: "req-path-1",
              },
            },
          },
        }),
        messageFormatter: createMessageFormatter(),
      },
      {
        executeApplyResult: async () => {
          throw new Error(
            '[digest_path] bundle entry not found; raw_path=uploads/inputs/source_path/artifacts/digest.md; candidates=["uploads/inputs/source_path/artifacts/digest.md","artifacts/digest.md"]',
          );
        },
      },
    );

    assert.equal(summary.succeeded, 0);
    assert.equal(summary.failed, 1);
    assert.notInclude(summary.failureReasons[0], "unknown error");
    assert.include(
      summary.failureReasons[0],
      "[digest_path] bundle entry not found",
    );
    assert.include(
      summary.failureReasons[0],
      "uploads/inputs/source_path/artifacts/digest.md",
    );
  });
});
