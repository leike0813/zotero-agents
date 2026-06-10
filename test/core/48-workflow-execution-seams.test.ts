import { assert } from "chai";
import { handlers } from "../../src/handlers";
import { executeWorkflowFromCurrentSelection } from "../../src/modules/workflowExecute";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";
import {
  emitWorkflowFinishSummary,
  emitWorkflowJobToasts,
  emitWorkflowStartToast,
  resetWorkflowToastStateForTests,
  showWorkflowToast,
} from "../../src/modules/workflowExecution/feedbackSeam";
import { createLocalizedMessageFormatter } from "../../src/modules/workflowExecution/messageFormatter";
import { runWorkflowPreparationSeam } from "../../src/modules/workflowExecution/preparationSeam";
import { runWorkflowApplySeam } from "../../src/modules/workflowExecution/applySeam";
import { runWorkflowExecutionSeam } from "../../src/modules/workflowExecution/runSeam";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { joinPath, mkTempDir, writeUtf8 } from "./workflow-test-utils";

async function createWorkflowRoot(args: {
  id: string;
  buildRequestBody?: string;
  applyResultBody?: string;
  filterInputsBody?: string;
  parameters?: Record<string, unknown>;
  execution?: Record<string, unknown>;
}) {
  const root = await mkTempDir(`zotero-skills-seam-${args.id}`);
  const workflowRoot = joinPath(root, args.id);
  await writeUtf8(
    joinPath(workflowRoot, "workflow.json"),
    JSON.stringify(
      {
        id: args.id,
        label: `Seam ${args.id}`,
        provider: "pass-through",
        ...(args.execution ? { execution: args.execution } : {}),
        ...(args.parameters ? { parameters: args.parameters } : {}),
        hooks: {
          ...(args.filterInputsBody
            ? { filterInputs: "hooks/filterInputs.js" }
            : {}),
          ...(args.buildRequestBody
            ? { buildRequest: "hooks/buildRequest.js" }
            : {}),
          applyResult: "hooks/applyResult.js",
        },
      },
      null,
      2,
    ),
  );
  if (args.filterInputsBody) {
    await writeUtf8(
      joinPath(workflowRoot, "hooks", "filterInputs.js"),
      args.filterInputsBody,
    );
  }
  if (args.buildRequestBody) {
    await writeUtf8(
      joinPath(workflowRoot, "hooks", "buildRequest.js"),
      args.buildRequestBody,
    );
  }
  await writeUtf8(
    joinPath(workflowRoot, "hooks", "applyResult.js"),
    args.applyResultBody ||
      [
        "export async function applyResult() {",
        "  return { ok: true };",
        "}",
        "",
      ].join("\n"),
  );
  return root;
}

describe("workflow execution seams", function () {
  beforeEach(function () {
    clearRuntimeLogs();
    resetWorkflowToastStateForTests();
  });

  it("supports deterministic preparation testing via injected seam dependencies", async function () {
    const alerts: string[] = [];
    const logs: string[] = [];
    const fakeWorkflow = {
      manifest: {
        id: "seam-prepare-no-valid",
        label: "Seam Prepare No Valid",
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      },
    } as any;
    const fakeExecutionContext = {
      backend: {
        id: "pass-through-local",
        type: "pass-through",
        baseUrl: "local://pass-through",
        auth: { kind: "none" },
      },
      requestKind: "pass-through.run.v1",
      workflowParams: {},
      providerOptions: {},
      providerId: "pass-through",
    };

    const result = await runWorkflowPreparationSeam(
      {
        win: {
          ZoteroPane: {
            getSelectedItems: () => [{ id: 1 }],
          },
          alert: (message: string) => {
            alerts.push(message);
          },
        } as unknown as _ZoteroTypes.MainWindow,
        workflow: fakeWorkflow,
        messageFormatter: createLocalizedMessageFormatter(),
      },
      {
        appendRuntimeLog: (entry) => {
          logs.push(entry.stage);
        },
        resolveWorkflowExecutionContext: async () =>
          fakeExecutionContext as any,
        buildSelectionContext: async () => ({}),
        executeBuildRequests: async () => {
          const error = new Error("skip all");
          (error as any).code = "NO_VALID_INPUT_UNITS";
          (error as any).skippedUnits = 2;
          throw error;
        },
        alertWindow: (_win, message) => {
          alerts.push(message);
        },
      },
    );

    assert.equal(result.status, "halted");
    assert.include(alerts[0], "skipped=2");
    assert.include(logs, "trigger-no-valid-input");
  });

  it("adapts SkillRunner-style requests to ACP skill run requests during preparation", async function () {
    const fakeWorkflow = {
      manifest: {
        id: "seam-acp-adapt",
        label: "Seam ACP Adapt",
        request: { kind: "skillrunner.job.v1" },
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      },
    } as any;
    const fakeExecutionContext = {
      backend: {
        id: "acp-local",
        type: "acp",
        baseUrl: "local://acp",
        auth: { kind: "none" },
      },
      requestKind: "acp.skill.run.v1",
      workflowParams: {},
      providerOptions: {},
      providerId: "acp",
    };

    const result = await runWorkflowPreparationSeam(
      {
        win: {
          ZoteroPane: {
            getSelectedItems: () => [{ id: 1 }],
          },
          alert: () => undefined,
        } as unknown as _ZoteroTypes.MainWindow,
        workflow: fakeWorkflow,
      },
      {
        buildSelectionContext: async () => ({ items: { attachments: [] } }),
        executeBuildRequests: async () =>
          [
            {
              kind: "skillrunner.job.v1",
              skill_id: "literature-digest",
              taskName: "Example",
              upload_files: [
                { key: "source_path", path: "D:/real/example.md" },
              ],
              input: {
                source_path: "inputs/source_path/example.md",
              },
            },
          ] as any,
        resolveWorkflowExecutionContext: async () => fakeExecutionContext,
        alertWindow: () => undefined,
        appendRuntimeLog: () => undefined,
      },
    );

    assert.equal(result.status, "ready");
    if (result.status !== "ready") {
      return;
    }
    assert.equal(
      result.prepared.executionContext.requestKind,
      "acp.skill.run.v1",
    );
    assert.deepEqual(result.prepared.requests, [
      {
        kind: "acp.skill.run.v1",
        skill_id: "literature-digest",
        taskName: "Example",
        input: {
          source_path: "D:/real/example.md",
        },
        runtime_options: {
          zotero_host_access: {
            required: true,
          },
        },
      },
    ]);
  });

  it("strips ZoteroHostAccess runtime options and logs a compatibility warning for SkillRunner backends", async function () {
    const fakeWorkflow = {
      manifest: {
        id: "seam-skillrunner-zotero-host-access",
        label: "Seam SkillRunner ZoteroHostAccess",
        provider: "skillrunner",
        execution: {
          zoteroHostAccess: {
            required: true,
          },
        },
        request: { kind: "skillrunner.job.v1" },
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      },
    } as any;
    const fakeExecutionContext = {
      backend: {
        id: "skillrunner-local",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8030",
        auth: { kind: "none" },
      },
      requestKind: "skillrunner.job.v1",
      workflowParams: {},
      providerOptions: {},
      runOptions: {
        zoteroHostAccess: {
          autoApproveWrites: true,
        },
      },
      providerId: "skillrunner",
    };
    const logs: Array<{ stage: string; details?: unknown }> = [];

    const result = await runWorkflowPreparationSeam(
      {
        win: {
          ZoteroPane: {
            getSelectedItems: () => [{ id: 1 }],
          },
          alert: () => undefined,
        } as unknown as _ZoteroTypes.MainWindow,
        workflow: fakeWorkflow,
      },
      {
        buildSelectionContext: async () => ({ items: { attachments: [] } }),
        executeBuildRequests: async () =>
          [
            {
              kind: "skillrunner.job.v1",
              skill_id: "literature-search-ingest",
              runtime_options: {
                execution_mode: "interactive",
                zotero_host_access: {
                  required: true,
                  auto_approve_writes: true,
                },
              },
              parameter: { query: "exact paper" },
            },
          ] as any,
        resolveWorkflowExecutionContext: async () =>
          fakeExecutionContext as any,
        alertWindow: () => undefined,
        appendRuntimeLog: (entry) => {
          logs.push({ stage: entry.stage, details: entry.details });
        },
      },
    );

    assert.equal(result.status, "ready");
    if (result.status !== "ready") {
      return;
    }
    assert.deepEqual((result.prepared.requests[0] as any).runtime_options, {
      execution_mode: "interactive",
    });
    assert.include(
      logs.map((entry) => entry.stage),
      "skillrunner_zotero_host_access_runtime_option_stripped",
    );
  });

  it("keeps request-build failure messaging parity through seam entrypoint", async function () {
    const root = await createWorkflowRoot({
      id: "seam-build-failed",
      buildRequestBody: [
        "export async function buildRequest() {",
        "  throw new Error('build request exploded');",
        "}",
        "",
      ].join("\n"),
    });
    const loaded = await loadWorkflowManifests(root);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "seam-build-failed",
    );
    assert.isOk(workflow);

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Seam Build Failed Parent" },
    });
    const toasts: string[] = [];
    const runtime = globalThis as { ztoolkit?: Record<string, unknown> };
    const createdToolkit = !runtime.ztoolkit;
    runtime.ztoolkit = runtime.ztoolkit || {};
    const originalProgressWindow = runtime.ztoolkit.ProgressWindow;
    runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
      createLine(args: { text?: string }) {
        toasts.push(String(args?.text || ""));
        return this;
      }
      show() {
        return this;
      }
      startCloseTimer() {
        return this;
      }
      close() {
        return this;
      }
    };
    const win = {
      ZoteroPane: {
        getSelectedItems: () => [parent],
      },
      alert: (message: string) => {
        throw new Error(`unexpected modal alert: ${message}`);
      },
    } as unknown as _ZoteroTypes.MainWindow;

    try {
      await executeWorkflowFromCurrentSelection({
        win,
        workflow: workflow!,
      });
    } finally {
      if (createdToolkit) {
        delete runtime.ztoolkit;
      } else {
        runtime.ztoolkit!.ProgressWindow = originalProgressWindow;
      }
    }

    assert.isTrue(
      toasts.some(
        (entry) =>
          /cannot run/.test(entry) && /build request exploded/.test(entry),
      ),
      `missing build failure toast: ${JSON.stringify(toasts)}`,
    );
  });

  it("keeps mixed success/failure summary parity after seam refactor", async function () {
    const root = await createWorkflowRoot({
      id: "seam-mixed-outcomes",
      applyResultBody: [
        "export async function applyResult({ parent, runtime }) {",
        "  const item = runtime.helpers.resolveItemRef(parent);",
        "  const title = String(item.getField?.('title') || '');",
        "  if (/Fail/.test(title)) {",
        "    throw new Error('forced apply failure');",
        "  }",
        "  await runtime.handlers.parent.addNote(item, {",
        "    content: '<p data-zs-seam-mixed=\"ok\">ok</p>',",
        "  });",
        "  return { ok: true };",
        "}",
        "",
      ].join("\n"),
    });
    const loaded = await loadWorkflowManifests(root);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "seam-mixed-outcomes",
    );
    assert.isOk(workflow);

    const parentA = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Seam Mixed Success Parent" },
    });
    const parentB = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Seam Mixed Fail Parent" },
    });
    const toasts: string[] = [];
    const runtime = globalThis as { ztoolkit?: Record<string, unknown> };
    const createdToolkit = !runtime.ztoolkit;
    runtime.ztoolkit = runtime.ztoolkit || {};
    const originalProgressWindow = runtime.ztoolkit.ProgressWindow;
    runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
      createLine(args: { text?: string }) {
        toasts.push(String(args?.text || ""));
        return this;
      }
      show() {
        return this;
      }
      startCloseTimer() {
        return this;
      }
    };
    const win = {
      ZoteroPane: {
        getSelectedItems: () => [parentA, parentB],
      },
      alert: (message: string) => {
        throw new Error(`unexpected modal alert: ${message}`);
      },
    } as unknown as _ZoteroTypes.MainWindow;

    try {
      await executeWorkflowFromCurrentSelection({
        win,
        workflow: workflow!,
      });
    } finally {
      if (createdToolkit) {
        delete runtime.ztoolkit;
      } else {
        runtime.ztoolkit!.ProgressWindow = originalProgressWindow;
      }
    }

    assert.isTrue(
      toasts.some((entry) => /started\. jobs=2/i.test(entry)),
      `missing start toast: ${JSON.stringify(toasts)}`,
    );
    assert.isTrue(
      toasts.some((entry) => /job 1\/2 succeeded/i.test(entry)),
      `missing success job toast: ${JSON.stringify(toasts)}`,
    );
    assert.isTrue(
      toasts.some((entry) => /job 2\/2 failed/i.test(entry)),
      `missing failed job toast: ${JSON.stringify(toasts)}`,
    );
    assert.isTrue(
      toasts.some(
        (entry) =>
          /succeeded=1/.test(entry) &&
          /failed=1/.test(entry) &&
          /Failure reasons:/.test(entry) &&
          /job-1 .*forced apply failure/.test(entry),
      ),
      `missing summary toast: ${JSON.stringify(toasts)}`,
    );
  });

  it("suppresses workflow execution toasts when showNotifications is false", async function () {
    const root = await createWorkflowRoot({
      id: "seam-notifications-disabled",
      execution: {
        feedback: {
          showNotifications: false,
        },
      },
    });
    const loaded = await loadWorkflowManifests(root);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "seam-notifications-disabled",
    );
    assert.isOk(workflow);

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Seam Notifications Disabled Parent" },
    });
    const toasts: string[] = [];
    const runtime = globalThis as { ztoolkit?: Record<string, unknown> };
    const createdToolkit = !runtime.ztoolkit;
    runtime.ztoolkit = runtime.ztoolkit || {};
    const originalProgressWindow = runtime.ztoolkit.ProgressWindow;
    runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
      createLine(args: { text?: string }) {
        toasts.push(String(args?.text || ""));
        return this;
      }
      show() {
        return this;
      }
      startCloseTimer() {
        return this;
      }
      close() {
        return this;
      }
    };
    const win = {
      ZoteroPane: {
        getSelectedItems: () => [parent],
      },
      alert: (message: string) => {
        throw new Error(`unexpected modal alert: ${message}`);
      },
    } as unknown as _ZoteroTypes.MainWindow;

    try {
      await executeWorkflowFromCurrentSelection({
        win,
        workflow: workflow!,
      });
    } finally {
      if (createdToolkit) {
        delete runtime.ztoolkit;
      } else {
        runtime.ztoolkit!.ProgressWindow = originalProgressWindow;
      }
    }

    assert.deepEqual(toasts, []);
    const logs = listRuntimeLogs({
      workflowId: "seam-notifications-disabled",
    });
    assert.isTrue(
      logs.some((entry) => entry.stage === "trigger-finished"),
      "expected runtime logs to remain available",
    );
  });

  it("surfaces configurable workflow settings-gate failures instead of silently no-oping", async function () {
    const root = await createWorkflowRoot({
      id: "seam-configurable-gate-failure",
      parameters: {
        mode: {
          type: "string",
          default: "strict",
        },
      },
    });
    const loaded = await loadWorkflowManifests(root);
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "seam-configurable-gate-failure",
    );
    assert.isOk(workflow);

    const parent = await handlers.item.create({
      itemType: "journalArticle",
      fields: { title: "Seam Configurable Gate Failure Parent" },
    });
    const toasts: string[] = [];
    const runtime = globalThis as typeof globalThis & {
      ztoolkit?: Record<string, unknown>;
      addon?: { data?: { ztoolkit?: Record<string, unknown> } };
    };
    const previousToolkit = runtime.ztoolkit;
    const previousAddonToolkit = runtime.addon?.data?.ztoolkit;
    runtime.ztoolkit = runtime.ztoolkit || {};
    runtime.ztoolkit.Dialog = class MockFailingDialog {
      addCell() {
        return this;
      }
      setDialogData() {
        return this;
      }
      open() {
        throw new Error("dialog exploded");
      }
    };
    runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
      createLine(args: { text?: string }) {
        toasts.push(String(args?.text || ""));
        return this;
      }
      show() {
        return this;
      }
      startCloseTimer() {
        return this;
      }
      close() {
        return this;
      }
    };
    runtime.addon = runtime.addon || {};
    runtime.addon.data = runtime.addon.data || {};
    runtime.addon.data.ztoolkit = runtime.ztoolkit;

    try {
      await executeWorkflowFromCurrentSelection({
        win: {
          ZoteroPane: {
            getSelectedItems: () => [parent],
          },
          alert: (message: string) => {
            throw new Error(`unexpected modal alert: ${message}`);
          },
        } as unknown as _ZoteroTypes.MainWindow,
        workflow: workflow!,
        requireSettingsGate: true,
      });
    } finally {
      if (typeof previousToolkit === "undefined") {
        delete runtime.ztoolkit;
      } else {
        runtime.ztoolkit = previousToolkit;
      }
      if (!runtime.addon?.data) {
        return;
      }
      if (typeof previousAddonToolkit === "undefined") {
        delete runtime.addon.data.ztoolkit;
      } else {
        runtime.addon.data.ztoolkit = previousAddonToolkit;
      }
    }

    assert.isTrue(
      toasts.some(
        (entry) =>
          /settings gate failed/.test(entry) && /dialog exploded/.test(entry),
      ),
      `missing settings gate failure toast: ${JSON.stringify(toasts)}`,
    );

    const logs = listRuntimeLogs({
      workflowId: "seam-configurable-gate-failure",
    });
    const failureLog = logs.find(
      (entry) => entry.stage === "settings-gate-failed",
    );
    const failureDetails = (failureLog?.details || {}) as Record<
      string,
      unknown
    >;
    assert.isOk(failureLog);
    assert.equal(failureDetails.workflowSource, "");
    assert.equal(failureDetails.gateStage, "dialog-open");
  });

  it("supports feedback seam verification without UI runtime", function () {
    const toasts: string[] = [];
    const formatter = createLocalizedMessageFormatter();
    emitWorkflowStartToast(
      {
        workflowLabel: "Seam Feedback",
        totalJobs: 2,
        messageFormatter: formatter,
      },
      {
        showToast: (payload) => toasts.push(payload.text),
      },
    );
    emitWorkflowJobToasts(
      {
        workflowLabel: "Seam Feedback",
        totalJobs: 2,
        outcomes: [
          {
            index: 0,
            taskLabel: "task-a",
            succeeded: true,
            jobId: "job-1",
          },
          {
            index: 1,
            taskLabel: "task-b",
            succeeded: false,
            reason: "failed",
            jobId: "job-2",
          },
        ],
        messageFormatter: formatter,
      },
      {
        showToast: (payload) => toasts.push(payload.text),
      },
    );
    emitWorkflowFinishSummary(
      {
        win: {} as _ZoteroTypes.MainWindow,
        workflowLabel: "Seam Feedback",
        succeeded: 1,
        failed: 1,
        skipped: 0,
        failureReasons: ["job-1: failed"],
        messageFormatter: formatter,
      },
      {
        showToast: (payload) => toasts.push(payload.text),
      },
    );

    assert.lengthOf(toasts, 4);
    assert.include(
      toasts,
      formatter.startToast({
        workflowLabel: "Seam Feedback",
        totalJobs: 2,
      }),
    );
    assert.include(
      toasts,
      formatter.jobToastSuccess({
        workflowLabel: "Seam Feedback",
        taskLabel: "task-a",
        index: 1,
        total: 2,
      }),
    );
    assert.include(
      toasts,
      formatter.jobToastFailed({
        workflowLabel: "Seam Feedback",
        taskLabel: "task-b",
        index: 2,
        total: 2,
        reason: "failed",
      }),
    );
    assert.include(
      toasts,
      formatter.summary({
        workflowLabel: "Seam Feedback",
        succeeded: 1,
        failed: 1,
        skipped: 0,
      }) +
        "\n" +
        formatter.failureReasonsTitle +
        "\n" +
        "1. job-1: failed",
    );
  });

  it("caps visible workflow execution toasts at three newest sticky notifications", function () {
    resetWorkflowToastStateForTests();
    const runtime = globalThis as { ztoolkit?: Record<string, unknown> };
    const createdToolkit = !runtime.ztoolkit;
    runtime.ztoolkit = runtime.ztoolkit || {};
    const originalProgressWindow = runtime.ztoolkit.ProgressWindow;
    const shown: string[] = [];
    const closed: string[] = [];
    const closeTimers: number[] = [];
    const options: Array<Record<string, unknown> | undefined> = [];

    runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
      private text = "";

      constructor(_title: string, ctorOptions?: Record<string, unknown>) {
        options.push(ctorOptions);
      }

      createLine(args: { text?: string }) {
        this.text = String(args?.text || "");
        return this;
      }

      show() {
        shown.push(this.text);
        return this;
      }

      startCloseTimer(ms: number) {
        closeTimers.push(ms);
        return this;
      }

      close() {
        closed.push(this.text);
        return this;
      }
    };

    try {
      for (const text of ["one", "two", "three", "four"]) {
        showWorkflowToast(
          {
            text,
            type: "default",
          },
          {
            sticky: true,
            bounded: true,
          },
        );
      }
    } finally {
      resetWorkflowToastStateForTests();
      if (createdToolkit) {
        delete runtime.ztoolkit;
      } else {
        runtime.ztoolkit!.ProgressWindow = originalProgressWindow;
      }
    }

    assert.deepEqual(shown, ["one", "two", "three", "four"]);
    assert.deepEqual(closed, ["one"]);
    assert.deepEqual(closeTimers, []);
    assert.isTrue(options.every((entry) => entry?.closeOnClick === true));
    assert.isTrue(options.every((entry) => entry?.closeTime === 0));
  });

  it("uses full-parallel queue concurrency for backend-backed providers", function () {
    let capturedConcurrency = -1;
    let enqueueCount = 0;
    const queueStub = {
      enqueue() {
        enqueueCount += 1;
        return `job-${enqueueCount}`;
      },
      waitForIdle() {
        return Promise.resolve();
      },
    };

    const runState = runWorkflowExecutionSeam(
      {
        prepared: {
          workflow: {
            manifest: {
              id: "seam-skillrunner-parallel",
              label: "Seam SkillRunner Parallel",
            },
          } as any,
          requests: [{ id: 1 }, { id: 2 }, { id: 3 }],
          skippedByFilter: 0,
          executionContext: {
            providerId: "skillrunner",
            requestKind: "skillrunner.job.v1",
            providerOptions: {},
            backend: {
              id: "backend-1",
              type: "skillrunner",
              baseUrl: "http://127.0.0.1:8030",
            },
          },
        },
      },
      {
        createQueue: (config) => {
          capturedConcurrency = config.concurrency;
          return queueStub as any;
        },
      },
    );

    assert.equal(capturedConcurrency, 3);
    assert.deepEqual(runState.jobIds, ["job-1", "job-2", "job-3"]);
  });

  it("passes sequence step result contexts to applyResult hooks", async function () {
    let capturedSequence: any;
    const queueStub = {
      getJob() {
        return {
          id: "job-1",
          state: "succeeded",
          meta: {
            targetParentID: 123,
            backendId: "acp-backend",
            backendType: "acp",
            providerId: "acp",
            runId: "run-1",
          },
          result: {
            status: "succeeded",
            requestId: "tag-request",
            fetchType: "result",
            resultJson: { ok: true },
            responseJson: {},
            sequence: {
              workflow_run_id: "workflow-run-1",
              final_step_id: "tag",
              steps: [
                {
                  step_id: "digest",
                  request_id: "digest-request",
                  output: { digest_path: "D:/workspace/result/digest.md" },
                  result: {
                    status: "succeeded",
                    requestId: "digest-request",
                    fetchType: "result",
                    resultJson: {
                      digest_path: "D:/workspace/result/digest.md",
                    },
                    responseJson: {},
                  },
                },
                {
                  step_id: "tag",
                  request_id: "tag-request",
                  output: { add_tags: ["topic:sequence"] },
                  result: {
                    status: "succeeded",
                    requestId: "tag-request",
                    fetchType: "result",
                    resultJson: {
                      add_tags: ["topic:sequence"],
                    },
                    responseJson: {},
                  },
                },
              ],
            },
          },
        };
      },
    };

    const summary = await runWorkflowApplySeam(
      {
        runState: {
          workflow: {
            manifest: {
              id: "sequence-apply",
              label: "Sequence Apply",
              provider: "acp",
              request: { kind: "skillrunner.sequence.v1" },
              hooks: { applyResult: "hooks/applyResult.js" },
            },
          } as any,
          requests: [{ targetParentID: 123 }],
          queue: queueStub as any,
          jobIds: ["job-1"],
          runId: "run-1",
          totalJobs: 1,
          idlePromise: Promise.resolve(),
        },
        messageFormatter: createLocalizedMessageFormatter(),
      },
      {
        appendRuntimeLog: () => undefined as any,
        executeApplyResult: async (args) => {
          capturedSequence = (args.runResult as any).sequence;
          return { ok: true };
        },
      },
    );

    assert.equal(summary.succeeded, 1);
    assert.equal(capturedSequence?.steps?.[0]?.step_id, "digest");
    assert.deepEqual(capturedSequence.steps[0].resultContext.resultJson, {
      digest_path: "D:/workspace/result/digest.md",
    });
    assert.deepEqual(capturedSequence.steps[1].resultContext.resultJson, {
      add_tags: ["topic:sequence"],
    });
  });

  it("uses full-parallel queue concurrency for generic-http providers", function () {
    let capturedConcurrency = -1;
    const queueStub = {
      enqueue() {
        return "job-1";
      },
      waitForIdle() {
        return Promise.resolve();
      },
    };

    runWorkflowExecutionSeam(
      {
        prepared: {
          workflow: {
            manifest: {
              id: "seam-generic-http-parallel",
              label: "Seam Generic HTTP Parallel",
            },
          } as any,
          requests: [{ id: 1 }, { id: 2 }],
          skippedByFilter: 0,
          executionContext: {
            providerId: "generic-http",
            requestKind: "generic-http.request.v1",
            providerOptions: {},
            backend: {
              id: "backend-gh",
              type: "generic-http",
              baseUrl: "https://example.test",
            },
          },
        },
      },
      {
        createQueue: (config) => {
          capturedConcurrency = config.concurrency;
          return queueStub as any;
        },
      },
    );

    assert.equal(capturedConcurrency, 2);
  });

  it("keeps serialized queue concurrency for pass-through providers", function () {
    let capturedConcurrency = -1;
    const queueStub = {
      enqueue() {
        return "job-1";
      },
      waitForIdle() {
        return Promise.resolve();
      },
    };

    runWorkflowExecutionSeam(
      {
        prepared: {
          workflow: {
            manifest: {
              id: "seam-pass-through-serial",
              label: "Seam PassThrough Serial",
            },
          } as any,
          requests: [{ id: 1 }, { id: 2 }, { id: 3 }],
          skippedByFilter: 0,
          executionContext: {
            providerId: "pass-through",
            requestKind: "pass-through.run.v1",
            providerOptions: {},
            backend: {
              id: "backend-pt",
              type: "pass-through",
              baseUrl: "local://pass-through",
            },
          },
        },
      },
      {
        createQueue: (config) => {
          capturedConcurrency = config.concurrency;
          return queueStub as any;
        },
      },
    );

    assert.equal(capturedConcurrency, 1);
  });

  it("routes interactive skillrunner request-created openings to the Assistant shell skillrunner tab", function () {
    let capturedQueueConfig: Record<string, unknown> | undefined;
    const assistantCalls: Array<Record<string, unknown>> = [];
    const focusCalls: Array<Record<string, unknown>> = [];
    const queueStub = {
      enqueue() {
        return "job-1";
      },
      waitForIdle() {
        return Promise.resolve();
      },
    };

    runWorkflowExecutionSeam(
      {
        prepared: {
          workflow: {
            manifest: {
              id: "seam-skillrunner-interactive-sidebar",
              label: "Seam SkillRunner Interactive Sidebar",
              execution: {
                skillrunner_mode: "interactive",
              },
            },
          } as any,
          requests: [{ targetParentID: 3 }],
          skippedByFilter: 0,
          executionContext: {
            providerId: "skillrunner",
            requestKind: "skillrunner.job.v1",
            providerOptions: {},
            backend: {
              id: "backend-1",
              type: "skillrunner",
              baseUrl: "http://127.0.0.1:8030",
            },
          },
        },
      },
      {
        createQueue: (config) => {
          capturedQueueConfig = config as unknown as Record<string, unknown>;
          return queueStub as any;
        },
        openAssistantWorkspaceSidebar: (args) => {
          assistantCalls.push(args as unknown as Record<string, unknown>);
          return Promise.resolve();
        },
        focusSkillRunnerWorkspace: (args) => {
          focusCalls.push(args as unknown as Record<string, unknown>);
          return Promise.resolve();
        },
      } as any,
    );

    assert.isOk(capturedQueueConfig);
    const onJobProgress = capturedQueueConfig?.onJobProgress as
      | ((job: Record<string, unknown>, event: Record<string, unknown>) => void)
      | undefined;
    assert.isFunction(onJobProgress);
    onJobProgress?.(
      {
        id: "job-1",
        workflowId: "seam-skillrunner-interactive-sidebar",
        request: { targetParentID: 3 },
        meta: { index: 0 },
        state: "running",
        createdAt: "2026-04-17T00:00:00.000Z",
        updatedAt: "2026-04-17T00:00:00.000Z",
      },
      {
        type: "request-created",
        requestId: "req-1",
      },
    );

    assert.lengthOf(focusCalls, 1);
    assert.equal(focusCalls[0].requestId, "req-1");
    assert.lengthOf(assistantCalls, 1);
    assert.equal(assistantCalls[0].tab, "skillrunner");
    assert.equal(assistantCalls[0].requestId, "req-1");
    assert.equal(
      (assistantCalls[0].backend as { id?: string }).id,
      "backend-1",
    );
  });

  it("selects auto ACP skill runs without opening the Assistant shell", function () {
    let capturedQueueConfig: Record<string, unknown> | undefined;
    const selectedRequestIds: string[] = [];
    const assistantCalls: Array<Record<string, unknown>> = [];
    const queueStub = {
      enqueue() {
        return "job-1";
      },
      waitForIdle() {
        return Promise.resolve();
      },
    };

    runWorkflowExecutionSeam(
      {
        prepared: {
          workflow: {
            manifest: {
              id: "seam-acp-auto-select",
              label: "Seam ACP Auto Select",
              execution: {
                skillrunner_mode: "auto",
              },
            },
          } as any,
          requests: [{ targetParentID: 3 }],
          skippedByFilter: 0,
          executionContext: {
            providerId: "acp",
            requestKind: "acp.skill.run.v1",
            providerOptions: {},
            backend: {
              id: "backend-acp",
              type: "acp",
              baseUrl: "local://backend-acp",
            },
          },
        },
      },
      {
        createQueue: (config) => {
          capturedQueueConfig = config as unknown as Record<string, unknown>;
          return queueStub as any;
        },
        selectAcpSkillRun: (requestId) => {
          selectedRequestIds.push(String(requestId));
        },
        openAssistantWorkspaceSidebar: (args) => {
          assistantCalls.push(args as unknown as Record<string, unknown>);
          return Promise.resolve();
        },
      } as any,
    );

    const onJobProgress = capturedQueueConfig?.onJobProgress as
      | ((job: Record<string, unknown>, event: Record<string, unknown>) => void)
      | undefined;
    onJobProgress?.(
      {
        id: "job-1",
        workflowId: "seam-acp-auto-select",
        request: { targetParentID: 3 },
        meta: { index: 0 },
        state: "running",
        createdAt: "2026-04-17T00:00:00.000Z",
        updatedAt: "2026-04-17T00:00:00.000Z",
      },
      {
        type: "request-created",
        requestId: "acp-req-1",
      },
    );

    assert.deepEqual(selectedRequestIds, ["acp-req-1"]);
    assert.lengthOf(assistantCalls, 0);
  });

  it("opens interactive ACP skill runs in the Assistant shell ACP Skills tab", function () {
    let capturedQueueConfig: Record<string, unknown> | undefined;
    const selectedRequestIds: string[] = [];
    const assistantCalls: Array<Record<string, unknown>> = [];
    const queueStub = {
      enqueue() {
        return "job-1";
      },
      waitForIdle() {
        return Promise.resolve();
      },
    };

    runWorkflowExecutionSeam(
      {
        prepared: {
          workflow: {
            manifest: {
              id: "seam-acp-interactive-open",
              label: "Seam ACP Interactive Open",
              execution: {
                skillrunner_mode: "interactive",
              },
            },
          } as any,
          requests: [{ targetParentID: 3 }],
          skippedByFilter: 0,
          executionContext: {
            providerId: "acp",
            requestKind: "acp.skill.run.v1",
            providerOptions: {},
            backend: {
              id: "backend-acp",
              type: "acp",
              baseUrl: "local://backend-acp",
            },
          },
        },
      },
      {
        createQueue: (config) => {
          capturedQueueConfig = config as unknown as Record<string, unknown>;
          return queueStub as any;
        },
        selectAcpSkillRun: (requestId) => {
          selectedRequestIds.push(String(requestId));
        },
        openAssistantWorkspaceSidebar: (args) => {
          assistantCalls.push(args as unknown as Record<string, unknown>);
          return Promise.resolve();
        },
      } as any,
    );

    const onJobProgress = capturedQueueConfig?.onJobProgress as
      | ((job: Record<string, unknown>, event: Record<string, unknown>) => void)
      | undefined;
    onJobProgress?.(
      {
        id: "job-1",
        workflowId: "seam-acp-interactive-open",
        request: { targetParentID: 3 },
        meta: { index: 0 },
        state: "running",
        createdAt: "2026-04-17T00:00:00.000Z",
        updatedAt: "2026-04-17T00:00:00.000Z",
      },
      {
        type: "request-created",
        requestId: "acp-req-2",
      },
    );

    assert.deepEqual(selectedRequestIds, ["acp-req-2"]);
    assert.lengthOf(assistantCalls, 1);
    assert.equal(assistantCalls[0].tab, "acp-skills");
    assert.equal(assistantCalls[0].requestId, "acp-req-2");
  });
});
