import { assert } from "chai";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
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
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  getSkillRunnerHostBridgePermissionRequest,
  resolveSkillRunnerHostBridgePermissionRequest,
} from "../../src/modules/skillRunnerHostBridgePermissionRegistry";
import {
  resetHostBridgeFileRegistryForTests,
  resolveHostBridgeFileDownload,
} from "../../src/modules/hostBridgeFileRegistry";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../src/utils/runtimeBridge";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { ZipBundleReader } from "../../src/workflows/zipBundleReader";
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
    resetHostBridgeFileRegistryForTests();
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
        selection: {
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
        selection: {
          items: [{ id: parent.id }],
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    assert.strictEqual(parsed.json.result.workflowId, "debug-workflow");
    assert.strictEqual(parsed.json.result.permission.channel, "global");
  });

  it("rejects workflow submit without explicit selection before reading UI selection", async function () {
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
    assert.strictEqual(
      parsed.json.error.code,
      "invalid_workflow_submit_request",
    );
  });

  it("rejects legacy workflow submit input body", async function () {
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

    assert.strictEqual(parsed.status, 400);
    assert.strictEqual(parsed.json.status, "error");
    assert.strictEqual(
      parsed.json.error.code,
      "invalid_workflow_submit_request",
    );
  });

  it("prepares a workflow agent-run handoff bundle without approval or backend submit", async function () {
    this.timeout(5000);
    const entry = workflow("bridge-workflow");
    delete (entry.manifest as { inputs?: unknown }).inputs;
    (entry.manifest as any).request = {
      sequence: {
        steps: [
          {
            id: "digest",
            skill_id: "literature-digest",
          },
          {
            id: "tag",
            skill_id: "tag-regulator",
          },
        ],
      },
    };
    const workflowRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-agent-run-workflow-"),
    );
    fs.writeFileSync(
      path.join(workflowRoot, "workflow.json"),
      JSON.stringify(entry.manifest),
    );
    entry.rootDir = workflowRoot;
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    configureHostBridgeGlobalApprovalHandlerForTests(() => {
      throw new Error("workflow agent-run must not request approval");
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge Agent Run Parent");
    await parent.saveTx();
    const attachmentPath = path.join(workflowRoot, "paper.txt");
    fs.writeFileSync(attachmentPath, "paper body");
    const attachment = await Zotero.Attachments.linkFromFile({
      file: Zotero.File.pathToFile(attachmentPath),
      parentItemID: parent.id,
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: {
          items: [{ id: attachment.id }],
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    assert.strictEqual(parsed.json.result.workflowId, "bridge-workflow");
    assert.strictEqual(parsed.json.result.bundle.mode, "bridge-download");
    assert.strictEqual(parsed.json.result.applyStatus.allowed, true);
    assert.match(parsed.json.result.bundle.file.fileId, /^file-/);
    assert.isAbove(parsed.json.result.bundle.file.size, 0);
    assert.match(
      parsed.json.result.bundle.file.sha256,
      /^sha256:[a-f0-9]{64}$/,
    );
    assert.notInclude(parsed.body, attachmentPath);
    const download = await resolveHostBridgeFileDownload(
      parsed.json.result.bundle.file.fileId,
    );
    assert.strictEqual(
      parsed.json.result.bundle.file.size,
      download.bytes.byteLength,
    );
    assert.strictEqual(
      parsed.json.result.bundle.file.sha256,
      `sha256:${crypto
        .createHash("sha256")
        .update(download.bytes)
        .digest("hex")}`,
    );
    const reader = new ZipBundleReader(download.localPath);
    const workflowJson = JSON.parse(await reader.readText("workflow/workflow.json"));
    const contextJson = await reader.readText("selection/context.json");
    const protocolText = await reader.readText("workflow-protocol.md");
    const selectedFile = await reader.readText("selection/files/001-paper.txt");
    const extractedDir = await reader.getExtractedDir();
    assert.strictEqual(workflowJson.id, "bridge-workflow");
    assert.deepEqual(
      workflowJson.request.sequence.steps.map(
        (step: { skill_id: string }) => step.skill_id,
      ),
      ["literature-digest", "tag-regulator"],
    );
    assert.include(contextJson, "selection/files/001-paper.txt");
    assert.include(contextJson, '"applyStatus"');
    assert.notInclude(contextJson, attachmentPath);
    assert.include(protocolText, "Reading workflow/workflow.json");
    assert.include(protocolText, "Input compatibility and apply readiness");
    assert.include(protocolText, "Sequence workflows");
    assert.isFalse(
      fs.existsSync(path.join(extractedDir, "workflow", "package", "workflow.json")),
    );
    assert.strictEqual(selectedFile, "paper body");
  });

  it("keeps workflow agent-run materialization free of workflow-id-specific branches", function () {
    const source = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "src/modules/hostBridgeWorkflowAgentRun.ts",
      ),
      "utf8",
    );
    assert.notInclude(source, "literature-analysis");
    assert.notInclude(source, "literature-deep-reading");
  });

  it("rejects workflow agent-run runtime options and provider profiles", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: {
          items: [{ key: "ABCD1234", libraryId: 1 }],
        },
        providerProfile: {
          backendId: "backend-1",
        },
      },
    });

    assert.strictEqual(parsed.status, 400);
    assert.strictEqual(parsed.json.status, "error");
    assert.strictEqual(
      parsed.json.error.code,
      "invalid_workflow_agent_run_request",
    );
  });

  it("rejects workflow agent-run when selection does not satisfy inputs unit", async function () {
    const entry = workflow("bridge-workflow");
    entry.manifest.inputs = {
      unit: "attachment",
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge Agent Run Parent Without Attachment");
    await parent.saveTx();

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: {
          items: [{ id: parent.id }],
        },
      },
    });

    assert.strictEqual(parsed.status, 400);
    assert.strictEqual(parsed.json.status, "error");
    assert.strictEqual(
      parsed.json.error.code,
      "invalid_workflow_agent_run_request",
    );
  });

  it("allows workflow-unit agent-run without applying workflow trigger policy", async function () {
    const entry = workflow("bridge-workflow");
    entry.manifest.inputs = {
      unit: "workflow",
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: {
          kind: "none",
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    assert.strictEqual(parsed.json.result.workflowId, "bridge-workflow");
    assert.strictEqual(parsed.json.result.bundle.mode, "bridge-download");
  });

  it("allows workflow agent-run when inputs match but validateSelection disables apply", async function () {
    const entry = workflow("bridge-workflow");
    entry.manifest.inputs = {
      unit: "attachment",
      accepts: {
        mime: ["text/plain"],
      },
    };
    entry.manifest.validateSelection = {
      require: {
        counts: {
          notes: {
            min: 1,
          },
        },
      },
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    const attachmentPath = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "zotero-agent-run-input-")),
      "paper.md",
    );
    fs.writeFileSync(attachmentPath, "paper body");
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge Agent Run Validate Selection Parent");
    await parent.saveTx();
    const attachment = await Zotero.Attachments.linkFromFile({
      file: Zotero.File.pathToFile(attachmentPath),
      parentItemID: parent.id,
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: {
          items: [{ id: attachment.id }],
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    assert.strictEqual(parsed.json.result.applyStatus.allowed, false);
    assert.strictEqual(
      parsed.json.result.applyStatus.reasonCode,
      "selection-count-notes",
    );
  });

  it("describes workflow selection and explicit option drafts", async function () {
    const entry = workflow("bridge-workflow");
    entry.manifest.parameters = {
      language: {
        type: "string",
        default: "zh-CN",
        enum: ["zh-CN", "en-US"],
      },
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/describe",
      body: {
        workflowId: "bridge-workflow",
        workflowOptions: {
          language: "en-US",
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.status, "ok");
    assert.strictEqual(parsed.json.result.workflowId, "bridge-workflow");
    assert.strictEqual(parsed.json.result.selection.inputUnit, "parent");
    assert.deepEqual(parsed.json.result.workflowOptions.normalized, {
      language: "en-US",
    });
    assert.deepEqual(
      parsed.json.result.workflowOptions.schema.map(
        (entry: { key: string }) => entry.key,
      ),
      ["language"],
    );
    assert.strictEqual(
      parsed.json.result.providerProfile.requiresBackendProfile,
      false,
    );
  });

  it("rejects unsafe provider profile fields before workflow describe", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/describe",
      body: {
        workflowId: "bridge-workflow",
        providerProfile: {
          backendId: "backend-1",
          providerOptions: {
            baseUrl: "http://127.0.0.1:9999",
          },
        },
      },
    });

    assert.strictEqual(parsed.status, 400);
    assert.strictEqual(parsed.json.status, "error");
    assert.strictEqual(
      parsed.json.error.code,
      "invalid_workflow_describe_request",
    );
  });

  it("rejects submit provider profile backend incompatible with workflow", async function () {
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
        selection: {
          items: [{ key: "ABCD1234", libraryId: 1 }],
        },
        providerProfile: {
          backendId: "backend-1",
        },
      },
    });

    assert.strictEqual(parsed.status, 400);
    assert.strictEqual(parsed.json.status, "error");
    assert.strictEqual(
      parsed.json.error.code,
      "invalid_workflow_submit_request",
    );
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
        selection: {
          items: [{ key: "ABCD1234", libraryId: 1 }],
        },
      },
    });

    assert.strictEqual(parsed.status, 503);
    assert.strictEqual(parsed.json.error.code, "permission_ui_unavailable");
    assert.strictEqual(parsed.json.error.category, "permission");
  });

  it("submits explicit workflow selection after global approval", async function () {
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
        selection: {
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
        selection: {
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

  it("routes SkillRunner scoped Host Bridge write approval through the SkillRunner run UI model", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    let globalApprovalCalls = 0;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      globalApprovalCalls += 1;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge SkillRunner Scoped Submit Parent");
    await parent.saveTx();

    const pendingSubmit = bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/submit",
      headers: {
        "x-zotero-bridge-scope": JSON.stringify({
          kind: "skillrunner-run",
          requestId: "skillrunner-run-approval-1",
        }),
      },
      body: {
        workflowId: "bridge-workflow",
        selection: {
          items: [{ id: parent.id }],
        },
      },
    });

    let permissionRequestId = "";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const pending = getSkillRunnerHostBridgePermissionRequest(
        "skillrunner-run-approval-1",
      );
      permissionRequestId = pending?.requestId || "";
      if (permissionRequestId) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.isNotEmpty(permissionRequestId);
    assert.strictEqual(globalApprovalCalls, 0);

    resolveSkillRunnerHostBridgePermissionRequest({
      runRequestId: "skillrunner-run-approval-1",
      permissionRequestId,
      outcome: "selected",
      optionId: "approve_once",
    });
    const parsed = await pendingSubmit;

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.permission.channel, "skillrunner-run");
    assert.strictEqual(parsed.json.result.workflowId, "bridge-workflow");
    assert.strictEqual(globalApprovalCalls, 0);
  });

  it("auto-approves ACP scoped workflow submits when the run enables Host Bridge write auto approval", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    upsertAcpSkillRun({
      requestId: "acp-run-auto-approval-1",
      status: "running",
      hostBridgeCli: {
        available: true,
        endpoint: "http://127.0.0.1:26570/bridge/v1",
        pathInjected: true,
        autoApproveWrites: true,
      },
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge ACP Auto Approved Submit Parent");
    await parent.saveTx();

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v1/workflows/submit",
      headers: {
        "x-zotero-bridge-scope": JSON.stringify({
          kind: "acp-skill-run",
          requestId: "acp-run-auto-approval-1",
          autoApproveWrites: true,
        }),
      },
      body: {
        workflowId: "bridge-workflow",
        selection: {
          items: [{ id: parent.id }],
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.permission.outcome, "approved");
    assert.strictEqual(parsed.json.result.permission.channel, "acp-skill-run");
    assert.isNull(
      getAcpSkillRunRecord("acp-run-auto-approval-1")?.pendingPermission ||
        null,
    );
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
