import { assert } from "chai";
import {
  configureHostBridgeServerForTests,
  handleHostBridgeHttpRequestForTests,
  resetHostBridgeServerForTests,
} from "../../src/modules/hostBridgeServer";
import {
  configureHostBridgeGlobalApprovalHandlerForTests,
  resetHostBridgePermissionManagerForTests,
} from "../../src/modules/hostBridgePermissionManager";
import {
  recordWorkflowTaskUpdate,
  resetWorkflowTasks,
} from "../../src/modules/taskRuntime";
import {
  recordTaskDashboardHistoryFromJob,
  resetTaskDashboardHistory,
} from "../../src/modules/taskDashboardHistory";
import {
  getAcpSkillRunRecord,
  resetAcpSkillRunsForTests,
  resolveAcpSkillRunPermissionRequest,
} from "../../src/modules/acpSkillRunStore";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../src/utils/runtimeBridge";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import type { LoadedWorkflow } from "../../src/workflows/types";
import type { JobRecord } from "../../src/jobQueue/manager";

function parseRawHttpResponse(raw: string) {
  const splitIndex = raw.indexOf("\r\n\r\n");
  const head = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const body = splitIndex >= 0 ? raw.slice(splitIndex + 4) : "";
  const status = Number(head.match(/^HTTP\/1\.1\s+(\d+)/)?.[1] || 0);
  return {
    status,
    body,
    json: JSON.parse(body),
  };
}

function installWorkflowRegistryForTests(workflows: LoadedWorkflow[]) {
  installRuntimeBridgeOverrideForTests({
    addon: {
      data: {
        workflow: {
          workflowsDir: "test-workflows",
          builtinWorkflowsDir: "builtin-workflows",
          workflowSourceById: Object.fromEntries(
            workflows.map((entry) => [
              entry.manifest.id,
              entry.workflowSourceKind || "user",
            ]),
          ),
          loaded: {
            workflows,
            manifests: workflows.map((entry) => entry.manifest),
            warnings: [],
            errors: [],
            diagnostics: [],
          },
          loadedFromBuiltin: {
            workflows: [],
            manifests: [],
            warnings: [],
            errors: [],
            diagnostics: [],
          },
          loadedFromUser: {
            workflows,
            manifests: workflows.map((entry) => entry.manifest),
            warnings: [],
            errors: [],
            diagnostics: [],
          },
          latestBuiltinSync: null,
        },
      },
    },
  });
}

function workflow(id: string): LoadedWorkflow {
  return {
    manifest: {
      id,
      label: "Bridge Workflow",
      provider: "pass-through",
      version: "1.0.0",
      inputs: {
        unit: "parent",
      },
      hooks: {
        applyResult: "apply",
      },
    },
    rootDir: "redacted-test-root",
    packageId: "test-package",
    workflowSourceKind: "user",
    hooks: {
      applyResult: async () => undefined,
    },
    buildStrategy: "hook",
  };
}

function debugWorkflow(id: string): LoadedWorkflow {
  const entry = workflow(id);
  return {
    ...entry,
    manifest: {
      ...entry.manifest,
      debug_only: true,
    },
  };
}

async function bridgeRequest(args: {
  token: string;
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  return parseRawHttpResponse(
    await handleHostBridgeHttpRequestForTests({
      method: args.method,
      path: args.path,
      headers: {
        authorization: `Bearer ${args.token}`,
        ...(args.headers || {}),
      },
      body:
        typeof args.body === "undefined"
          ? undefined
          : JSON.stringify(args.body),
    }),
  );
}

describe("host bridge workflow control", function () {
  afterEach(function () {
    resetHostBridgeServerForTests();
    resetHostBridgePermissionManagerForTests();
    resetWorkflowTasks();
    resetAcpSkillRunsForTests();
    resetTaskDashboardHistory();
    resetRuntimeBridgeOverrideForTests();
    setDebugModeOverrideForTests();
  });

  it("lists loaded workflows without exposing implementation paths", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v1/workflows",
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    assert.deepInclude(parsed.json.result.workflows[0], {
      id: "bridge-workflow",
      label: "Bridge Workflow",
      provider: "pass-through",
      sourceKind: "user",
    });
    assert.notInclude(parsed.body, "redacted-test-root");
    assert.notInclude(parsed.body, "hooks");
  });

  it("hides debug-only workflows from Host Bridge list when debug mode is disabled", async function () {
    setDebugModeOverrideForTests(false);
    installWorkflowRegistryForTests([
      workflow("normal-workflow"),
      debugWorkflow("debug-workflow"),
    ]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v1/workflows",
    });

    assert.strictEqual(parsed.status, 200);
    const ids = parsed.json.result.workflows.map(
      (entry: { id: string }) => entry.id,
    );
    assert.deepEqual(ids, ["normal-workflow"]);
  });

  it("lists debug-only workflows from Host Bridge when debug mode is enabled", async function () {
    setDebugModeOverrideForTests(true);
    installWorkflowRegistryForTests([
      workflow("normal-workflow"),
      debugWorkflow("debug-workflow"),
    ]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v1/workflows",
    });

    assert.strictEqual(parsed.status, 200);
    const ids = parsed.json.result.workflows.map(
      (entry: { id: string }) => entry.id,
    );
    assert.sameMembers(ids, ["normal-workflow", "debug-workflow"]);
  });

  it("rejects direct debug-only workflow submit when debug mode is disabled", async function () {
    setDebugModeOverrideForTests(false);
    installWorkflowRegistryForTests([debugWorkflow("debug-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/submit",
      body: {
        workflowId: "debug-workflow",
        input: {
          items: [{ key: "ABCD1234", libraryId: 1 }],
        },
      },
    });

    assert.strictEqual(parsed.status, 404);
    assert.strictEqual(parsed.json.status, "error");
    assert.strictEqual(parsed.json.error.code, "workflow_not_found");
  });

  it("submits debug-only workflow input when debug mode is enabled", async function () {
    setDebugModeOverrideForTests(true);
    installWorkflowRegistryForTests([debugWorkflow("debug-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge Debug Workflow Submit Parent");
    await parent.saveTx();
    configureHostBridgeGlobalApprovalHandlerForTests((request) => ({
      outcome: "approved",
      requestId: request.requestId,
      channel: "global",
    }));

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/submit",
      body: {
        workflowId: "debug-workflow",
        input: {
          items: [{ id: parent.id }],
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    assert.strictEqual(parsed.json.result.workflowId, "debug-workflow");
    assert.strictEqual(parsed.json.result.permission.channel, "global");
  });

  it("rejects workflow submit without explicit input before reading UI selection", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/submit",
      body: {
        workflowId: "bridge-workflow",
      },
    });

    assert.strictEqual(parsed.status, 400);
    assert.strictEqual(parsed.json.status, "error");
    assert.strictEqual(parsed.json.error.code, "invalid_workflow_input");
  });

  it("requires Zotero-side approval for explicit workflow submit", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/submit",
      body: {
        workflowId: "bridge-workflow",
        input: {
          items: [{ key: "ABCD1234", libraryId: 1 }],
        },
      },
    });

    assert.strictEqual(parsed.status, 503);
    assert.strictEqual(parsed.json.error.code, "permission_ui_unavailable");
    assert.strictEqual(parsed.json.error.category, "permission");
  });

  it("submits explicit workflow input after global approval", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge Workflow Submit Parent");
    await parent.saveTx();
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/submit",
      body: {
        workflowId: "bridge-workflow",
        input: {
          items: [{ id: parent.id }],
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    assert.strictEqual(parsed.json.result.workflowId, "bridge-workflow");
    assert.isString(parsed.json.result.runId);
    assert.lengthOf(parsed.json.result.jobIds, 1);
    assert.strictEqual(parsed.json.result.permission.channel, "global");
    assert.notInclude(parsed.body, "attachment-path:");
    assert.notMatch(parsed.body, /[A-Za-z]:\\/);
    assert.include(approvalRequest.title, "workflow run");
    assert.include(approvalRequest.summary, "Bridge Workflow");
    assert.include(approvalRequest.detail, "Input: 1 explicit Zotero item");
    assert.include(approvalRequest.detail, "Source: zotero-bridge CLI");
    assert.notInclude(approvalRequest.detail, '"workflowId"');
    assert.notInclude(approvalRequest.detail, "{");
  });

  it("redacts path-like task fields from Host Bridge task and run responses", async function () {
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    const now = new Date().toISOString();
    const job: JobRecord = {
      id: "job-1",
      workflowId: "bridge-workflow",
      request: {},
      meta: {
        runId: "run-redacted",
        workflowLabel: "Bridge Workflow",
        taskName: "Path Task",
        inputUnitIdentity:
          "attachment-path:D:/Workspace/Artifact/paper folder/paper.md",
        inputUnitLabel: "paper.md",
        providerId: "acp",
        backendId: "backend-1",
        backendType: "acp",
      },
      state: "failed",
      error:
        "Diagnostic file: C:\\Users\\A\\AppData\\Local\\diag.json. Evidence file: /home/a/evidence.log.",
      createdAt: now,
      updatedAt: now,
    };
    recordWorkflowTaskUpdate(job);
    recordTaskDashboardHistoryFromJob(job);

    const tasks = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v1/tasks?runId=run-redacted",
    });
    const run = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v1/workflows/runs/run-redacted",
    });

    for (const parsed of [tasks, run]) {
      assert.strictEqual(parsed.status, 200);
      assert.notInclude(parsed.body, "attachment-path:");
      assert.notMatch(parsed.body, /[A-Za-z]:\\/);
      assert.notInclude(parsed.body, "/home/a/evidence.log");
      assert.include(parsed.body, "[redacted-path]");
    }
    const task = tasks.json.result.tasks[0];
    assert.strictEqual(task.runId, "run-redacted");
    assert.strictEqual(task.jobId, "job-1");
    assert.strictEqual(task.workflowId, "bridge-workflow");
    assert.strictEqual(task.state, "failed");
    assert.strictEqual(task.inputUnitLabel, "paper.md");
    assert.notProperty(task, "inputUnitIdentity");
  });

  it("treats active-only task filters as task state filters", async function () {
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    const now = new Date().toISOString();
    const baseJob: JobRecord = {
      id: "job-active",
      workflowId: "bridge-workflow",
      request: {},
      meta: {
        runId: "run-active",
        workflowLabel: "Bridge Workflow",
        taskName: "Active Task",
        providerId: "skillrunner",
        backendId: "backend-1",
        backendType: "skillrunner",
      },
      state: "running",
      createdAt: now,
      updatedAt: now,
    };
    recordWorkflowTaskUpdate(baseJob);
    recordWorkflowTaskUpdate({
      ...baseJob,
      id: "job-terminal",
      meta: {
        ...baseJob.meta,
        runId: "run-terminal",
        taskName: "Terminal Task",
      },
      state: "failed",
    });

    for (const query of [
      "activeOnly=true",
      "active-only=true",
      "includeHistory=false",
    ]) {
      const parsed = await bridgeRequest({
        token,
        method: "GET",
        path: `/bridge/v1/tasks?${query}`,
      });

      assert.strictEqual(parsed.status, 200);
      assert.deepEqual(
        parsed.json.result.tasks.map((task: { jobId: string }) => task.jobId),
        ["job-active"],
      );
      assert.deepEqual(
        parsed.json.result.tasks.map((task: { state: string }) => task.state),
        ["running"],
      );
    }
  });

  it("routes ACP scoped approval requests through the ACP skill run UI model", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge ACP Scoped Submit Parent");
    await parent.saveTx();

    const pendingSubmit = bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/submit",
      headers: {
        "x-zotero-bridge-scope": JSON.stringify({
          kind: "acp-skill-run",
          requestId: "acp-run-approval-1",
        }),
      },
      body: {
        workflowId: "bridge-workflow",
        input: {
          items: [{ id: parent.id }],
        },
      },
    });

    let permissionRequestId = "";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const record = getAcpSkillRunRecord("acp-run-approval-1");
      permissionRequestId = record?.pendingPermission?.requestId || "";
      if (permissionRequestId) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.isNotEmpty(permissionRequestId);

    resolveAcpSkillRunPermissionRequest({
      runRequestId: "acp-run-approval-1",
      permissionRequestId,
      outcome: "selected",
      optionId: "approve_once",
    });
    const parsed = await pendingSubmit;

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.permission.channel, "acp-skill-run");
    assert.strictEqual(parsed.json.result.workflowId, "bridge-workflow");
  });

  it("returns run status and task filters from task runtime", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    const now = new Date().toISOString();
    const job: JobRecord = {
      id: "job-1",
      workflowId: "bridge-workflow",
      request: {},
      meta: {
        runId: "run-bridge-1",
        workflowLabel: "Bridge Workflow",
        taskName: "Bridge Task",
        requestId: "request-1",
        backendId: "backend-1",
        backendType: "skillrunner",
        providerId: "skillrunner",
      },
      state: "running",
      createdAt: now,
      updatedAt: now,
    };
    recordWorkflowTaskUpdate(job);

    const run = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v1/workflows/runs/run-bridge-1",
    });
    assert.strictEqual(run.status, 200);
    assert.strictEqual(run.json.result.runId, "run-bridge-1");
    assert.strictEqual(run.json.result.state, "running");
    assert.lengthOf(run.json.result.tasks, 1);

    const tasks = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v1/tasks?workflowId=bridge-workflow&backendId=backend-1",
    });
    assert.strictEqual(tasks.status, 200);
    assert.lengthOf(tasks.json.result.tasks, 1);
    assert.strictEqual(tasks.json.result.tasks[0].requestId, "request-1");
  });
});
