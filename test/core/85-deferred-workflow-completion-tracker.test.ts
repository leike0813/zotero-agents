import { assert } from "chai";
import {
  registerDeferredWorkflowCompletion,
  resetDeferredWorkflowCompletionTrackerForTests,
  settleDeferredWorkflowCompletion,
  setDeferredWorkflowCompletionTrackerDepsForTests,
} from "../../src/modules/workflowExecution/deferredCompletionTracker";

function createFormatter() {
  return {
    summary: ({ workflowLabel, succeeded, failed, skipped }: any) =>
      `Workflow ${workflowLabel} finished. succeeded=${succeeded}, failed=${failed}, skipped=${skipped}`,
    failureReasonsTitle: "Failure reasons:",
    overflow: (count: number) => `...and ${count} more`,
    unknownError: "unknown error",
    startToast: () => "",
    waitingToast: () => "",
    jobToastSuccess: ({ taskLabel, index, total }: any) =>
      `job ${index}/${total} succeeded: ${taskLabel}`,
    jobToastFailed: ({ taskLabel, index, total, reason }: any) =>
      `job ${index}/${total} failed: ${taskLabel} (${reason})`,
    jobToastCanceled: ({ taskLabel, index, total }: any) =>
      `job ${index}/${total} canceled: ${taskLabel}`,
  };
}

describe("deferred workflow completion tracker", function () {
  beforeEach(function () {
    resetDeferredWorkflowCompletionTrackerForTests();
    setDeferredWorkflowCompletionTrackerDepsForTests({
      emitWorkflowJobToasts: () => undefined,
      emitWorkflowFinishSummary: () => undefined,
      appendRuntimeLog: () => undefined,
    });
  });

  afterEach(function () {
    resetDeferredWorkflowCompletionTrackerForTests();
    setDeferredWorkflowCompletionTrackerDepsForTests();
  });

  it("emits deferred job toasts and final summary exactly once when tracked run completes", function () {
    const deferredJobToasts: any[] = [];
    const summaries: string[] = [];
    const runtimeStages: string[] = [];
    const runtimeLogs: Array<{ stage?: string; runId?: string }> = [];
    setDeferredWorkflowCompletionTrackerDepsForTests({
      emitWorkflowJobToasts: (payload) => {
        deferredJobToasts.push(payload);
      },
      emitWorkflowFinishSummary: (payload) => {
        summaries.push(
          `succeeded=${payload.succeeded};failed=${payload.failed};skipped=${payload.skipped};reasons=${payload.failureReasons.length}`,
        );
      },
      appendRuntimeLog: (entry) => {
        runtimeStages.push(String(entry.stage || ""));
        runtimeLogs.push(entry);
      },
    });

    const registered = registerDeferredWorkflowCompletion({
      runId: "run-auto-1",
      win: {} as _ZoteroTypes.MainWindow,
      workflowId: "literature-digest",
      workflowLabel: "Literature Digest",
      totalJobs: 2,
      skipped: 0,
      succeeded: 0,
      failed: 0,
      failureReasons: [],
      pendingJobs: [
        {
          index: 0,
          taskLabel: "paper-a.md",
          succeeded: true,
          terminalState: "succeeded",
          jobId: "job-1",
          requestId: "req-1",
        },
        {
          index: 1,
          taskLabel: "paper-b.md",
          succeeded: true,
          terminalState: "succeeded",
          jobId: "job-2",
          requestId: "req-2",
        },
      ],
      messageFormatter: createFormatter() as any,
    });

    assert.isTrue(registered);

    const first = settleDeferredWorkflowCompletion({
      runId: "run-auto-1",
      requestId: "req-1",
      succeeded: true,
      terminalState: "succeeded",
    });
    assert.deepEqual(first, {
      handled: true,
      completed: false,
    });
    assert.lengthOf(deferredJobToasts, 0);
    assert.lengthOf(summaries, 0);

    const second = settleDeferredWorkflowCompletion({
      runId: "run-auto-1",
      requestId: "req-2",
      succeeded: false,
      terminalState: "failed",
      reason: "apply failed",
    });
    assert.deepEqual(second, {
      handled: true,
      completed: true,
    });
    assert.lengthOf(deferredJobToasts, 1);
    assert.lengthOf(deferredJobToasts[0].outcomes, 1);
    assert.equal(deferredJobToasts[0].outcomes[0].requestId, "req-2");
    assert.lengthOf(summaries, 1);
    assert.include(summaries[0], "succeeded=1");
    assert.include(summaries[0], "failed=1");
    assert.include(runtimeStages, "deferred-run-summary-emitted");
    assert.equal(
      String(
        runtimeLogs.find(
          (entry) => String(entry.stage || "") === "deferred-run-summary-emitted",
        )?.runId || "",
      ),
      "run-auto-1",
    );

    const after = settleDeferredWorkflowCompletion({
      runId: "run-auto-1",
      requestId: "req-2",
      succeeded: true,
      terminalState: "succeeded",
    });
    assert.deepEqual(after, {
      handled: false,
      completed: false,
    });
    assert.lengthOf(deferredJobToasts, 1);
    assert.lengthOf(summaries, 1);
  });

  it("replays buffered terminal outcome when settle arrives before register", function () {
    const deferredJobToasts: any[] = [];
    const summaries: string[] = [];
    const runtimeStages: string[] = [];
    setDeferredWorkflowCompletionTrackerDepsForTests({
      emitWorkflowJobToasts: (payload) => {
        deferredJobToasts.push(payload);
      },
      emitWorkflowFinishSummary: (payload) => {
        summaries.push(
          `succeeded=${payload.succeeded};failed=${payload.failed};skipped=${payload.skipped};reasons=${payload.failureReasons.length}`,
        );
      },
      appendRuntimeLog: (entry) => {
        runtimeStages.push(String(entry.stage || ""));
      },
    });

    const settledBeforeRegister = settleDeferredWorkflowCompletion({
      runId: "run-buffered-1",
      requestId: "req-buffered-1",
      succeeded: true,
      terminalState: "succeeded",
    });
    assert.deepEqual(settledBeforeRegister, {
      handled: true,
      completed: false,
    });
    assert.lengthOf(deferredJobToasts, 0);
    assert.lengthOf(summaries, 0);
    assert.include(runtimeStages, "deferred-outcome-buffered-before-register");

    const registered = registerDeferredWorkflowCompletion({
      runId: "run-buffered-1",
      win: {} as _ZoteroTypes.MainWindow,
      workflowId: "literature-digest",
      workflowLabel: "Literature Digest",
      totalJobs: 1,
      skipped: 0,
      succeeded: 0,
      failed: 0,
      failureReasons: [],
      pendingJobs: [
        {
          index: 0,
          taskLabel: "paper-buffered.md",
          succeeded: true,
          terminalState: "succeeded",
          jobId: "job-buffered-1",
          requestId: "req-buffered-1",
        },
      ],
      messageFormatter: createFormatter() as any,
    });

    assert.isTrue(registered);
    assert.lengthOf(deferredJobToasts, 1);
    assert.lengthOf(deferredJobToasts[0].outcomes, 1);
    assert.equal(deferredJobToasts[0].outcomes[0].requestId, "req-buffered-1");
    assert.lengthOf(summaries, 0);
    assert.include(runtimeStages, "deferred-outcome-replayed-after-register");
    assert.include(runtimeStages, "deferred-run-summary-emitted");
  });

  it("replays buffered outcomes together with later settles and preserves index order", function () {
    const deferredJobToasts: any[] = [];
    const summaries: string[] = [];
    const runtimeStages: string[] = [];
    setDeferredWorkflowCompletionTrackerDepsForTests({
      emitWorkflowJobToasts: (payload) => {
        deferredJobToasts.push(payload);
      },
      emitWorkflowFinishSummary: (payload) => {
        summaries.push(
          `succeeded=${payload.succeeded};failed=${payload.failed};skipped=${payload.skipped};reasons=${payload.failureReasons.length}`,
        );
      },
      appendRuntimeLog: (entry) => {
        runtimeStages.push(String(entry.stage || ""));
      },
    });

    const bufferedFailure = settleDeferredWorkflowCompletion({
      runId: "run-buffered-mixed",
      requestId: "req-buffered-2",
      succeeded: false,
      terminalState: "failed",
      reason: "apply failed early",
    });
    assert.deepEqual(bufferedFailure, {
      handled: true,
      completed: false,
    });

    const registered = registerDeferredWorkflowCompletion({
      runId: "run-buffered-mixed",
      win: {} as _ZoteroTypes.MainWindow,
      workflowId: "literature-digest",
      workflowLabel: "Literature Digest",
      totalJobs: 2,
      skipped: 0,
      succeeded: 0,
      failed: 0,
      failureReasons: [],
      pendingJobs: [
        {
          index: 0,
          taskLabel: "paper-a.md",
          succeeded: true,
          terminalState: "succeeded",
          jobId: "job-a",
          requestId: "req-live-1",
        },
        {
          index: 1,
          taskLabel: "paper-b.md",
          succeeded: true,
          terminalState: "succeeded",
          jobId: "job-b",
          requestId: "req-buffered-2",
        },
      ],
      messageFormatter: createFormatter() as any,
    });

    assert.isTrue(registered);
    assert.lengthOf(deferredJobToasts, 0);
    assert.lengthOf(summaries, 0);
    assert.include(runtimeStages, "deferred-outcome-replayed-after-register");

    const settledLater = settleDeferredWorkflowCompletion({
      runId: "run-buffered-mixed",
      requestId: "req-live-1",
      succeeded: true,
      terminalState: "succeeded",
    });
    assert.deepEqual(settledLater, {
      handled: true,
      completed: true,
    });
    assert.lengthOf(deferredJobToasts, 1);
    assert.deepEqual(
      deferredJobToasts[0].outcomes.map((entry: { requestId: string }) => entry.requestId),
      ["req-buffered-2"],
    );
    assert.lengthOf(summaries, 1);
    assert.include(summaries[0], "succeeded=1");
    assert.include(summaries[0], "failed=1");
    assert.include(runtimeStages, "deferred-run-summary-emitted");
  });

  it("keeps buffered settle idempotent for the same run and request", function () {
    const deferredJobToasts: any[] = [];
    const summaries: string[] = [];
    const runtimeStages: string[] = [];
    setDeferredWorkflowCompletionTrackerDepsForTests({
      emitWorkflowJobToasts: (payload) => {
        deferredJobToasts.push(payload);
      },
      emitWorkflowFinishSummary: (payload) => {
        summaries.push(
          `succeeded=${payload.succeeded};failed=${payload.failed};skipped=${payload.skipped};reasons=${payload.failureReasons.length}`,
        );
      },
      appendRuntimeLog: (entry) => {
        runtimeStages.push(String(entry.stage || ""));
      },
    });

    const firstBuffered = settleDeferredWorkflowCompletion({
      runId: "run-idempotent-1",
      requestId: "req-idempotent-1",
      succeeded: true,
      terminalState: "succeeded",
    });
    const secondBuffered = settleDeferredWorkflowCompletion({
      runId: "run-idempotent-1",
      requestId: "req-idempotent-1",
      succeeded: true,
      terminalState: "succeeded",
    });
    assert.deepEqual(firstBuffered, {
      handled: true,
      completed: false,
    });
    assert.deepEqual(secondBuffered, {
      handled: true,
      completed: false,
    });

    const registered = registerDeferredWorkflowCompletion({
      runId: "run-idempotent-1",
      win: {} as _ZoteroTypes.MainWindow,
      workflowId: "literature-digest",
      workflowLabel: "Literature Digest",
      totalJobs: 1,
      skipped: 0,
      succeeded: 0,
      failed: 0,
      failureReasons: [],
      pendingJobs: [
        {
          index: 0,
          taskLabel: "paper-idempotent.md",
          succeeded: true,
          terminalState: "succeeded",
          jobId: "job-idempotent-1",
          requestId: "req-idempotent-1",
        },
      ],
      messageFormatter: createFormatter() as any,
    });

    assert.isTrue(registered);
    assert.lengthOf(
      runtimeStages.filter((stage) => stage === "deferred-outcome-buffered-before-register"),
      1,
    );
    assert.lengthOf(deferredJobToasts, 1);
    assert.lengthOf(deferredJobToasts[0].outcomes, 1);
    assert.lengthOf(summaries, 0);

    const settledAfterCompletion = settleDeferredWorkflowCompletion({
      runId: "run-idempotent-1",
      requestId: "req-idempotent-1",
      succeeded: true,
      terminalState: "succeeded",
    });
    assert.deepEqual(settledAfterCompletion, {
      handled: false,
      completed: false,
    });
    assert.lengthOf(deferredJobToasts, 1);
    assert.lengthOf(summaries, 0);
  });

  it("drops orphan buffered outcomes that do not match registered pending jobs", function () {
    const deferredJobToasts: any[] = [];
    const summaries: string[] = [];
    const runtimeStages: string[] = [];
    setDeferredWorkflowCompletionTrackerDepsForTests({
      emitWorkflowJobToasts: (payload) => {
        deferredJobToasts.push(payload);
      },
      emitWorkflowFinishSummary: (payload) => {
        summaries.push(
          `succeeded=${payload.succeeded};failed=${payload.failed};skipped=${payload.skipped};reasons=${payload.failureReasons.length}`,
        );
      },
      appendRuntimeLog: (entry) => {
        runtimeStages.push(String(entry.stage || ""));
      },
    });

    const bufferedOrphan = settleDeferredWorkflowCompletion({
      runId: "run-orphan-1",
      requestId: "req-orphan-1",
      succeeded: false,
      terminalState: "failed",
      reason: "stale terminal outcome",
    });
    assert.deepEqual(bufferedOrphan, {
      handled: true,
      completed: false,
    });

    const registered = registerDeferredWorkflowCompletion({
      runId: "run-orphan-1",
      win: {} as _ZoteroTypes.MainWindow,
      workflowId: "literature-digest",
      workflowLabel: "Literature Digest",
      totalJobs: 1,
      skipped: 0,
      succeeded: 0,
      failed: 0,
      failureReasons: [],
      pendingJobs: [
        {
          index: 0,
          taskLabel: "paper-live.md",
          succeeded: true,
          terminalState: "succeeded",
          jobId: "job-live-1",
          requestId: "req-live-2",
        },
      ],
      messageFormatter: createFormatter() as any,
    });

    assert.isTrue(registered);
    assert.lengthOf(deferredJobToasts, 0);
    assert.lengthOf(summaries, 0);
    assert.include(runtimeStages, "deferred-outcome-buffer-dropped");

    const settledLive = settleDeferredWorkflowCompletion({
      runId: "run-orphan-1",
      requestId: "req-live-2",
      succeeded: true,
      terminalState: "succeeded",
    });
    assert.deepEqual(settledLive, {
      handled: true,
      completed: true,
    });
    assert.lengthOf(deferredJobToasts, 1);
    assert.lengthOf(summaries, 0);
  });
});
