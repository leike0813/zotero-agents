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
import { issueHostBridgeWriteAutoApprovalGrant } from "../../src/modules/hostBridgeWriteAutoApprovalRegistry";
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
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  getSkillRunnerHostBridgePermissionRequest,
  resolveSkillRunnerHostBridgePermissionRequest,
} from "../../src/modules/skillRunnerHostBridgePermissionRegistry";
import {
  applySkillRunnerRunEvent,
  resetSkillRunnerRunStoreForTests,
} from "../../src/modules/skillRunnerRunStore";
import {
  hasHostBridgeUploadedFileLease,
  registerHostBridgeUploadedFile,
  resetHostBridgeFileRegistryForTests,
  resolveHostBridgeFileDownload,
} from "../../src/modules/hostBridgeFileRegistry";
import { validateWorkflowResourceBindings } from "../../src/modules/hostBridgeWorkflowResources";
import {
  acknowledgeHostBridgeNotificationEvents,
  HOST_BRIDGE_NOTIFICATION_MAX_EVENTS,
  listHostBridgeNotificationEvents,
  projectWorkflowRunNotifications,
  projectSkillRunNotification,
  resetHostBridgeNotificationInboxForTests,
} from "../../src/modules/hostBridgeNotificationInbox";
import {
  getHostBridgeSkillRun,
  getHostBridgeWorkflowRunStatus,
  parseHostBridgeWorkflowSubmitRequest,
  resetHostBridgeNotificationProjectionForTests,
} from "../../src/modules/hostBridgeWorkflowControl";
import { workflowSubmissionQueue } from "../../src/jobQueue/workflowSubmissionQueue";
import { initializeSequenceRunState } from "../../src/modules/workflowExecution/sequenceStateStore";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../src/utils/runtimeBridge";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { ZipBundleReader } from "../../src/workflows/zipBundleReader";
import type { LoadedWorkflow } from "../../src/workflows/types";
import {
  compatibleBackendTypesForManifest,
  projectWorkflowManifestContract,
} from "../../src/workflows/manifestContract";
import type { JobRecord } from "../../src/jobQueue/manager";
import { getPref, setPref } from "../../src/utils/prefs";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import {
  acquireHostBridgeAgentRunApplyLease,
  createHostBridgeAgentRunRecord,
  getHostBridgeAgentRunRecord,
  hostBridgeAgentRunStoreInternalsForTests,
  recoverHostBridgeAgentRunStoreAfterRestart,
  sealHostBridgeAgentRunRecord,
} from "../../src/modules/hostBridgeWorkflowAgentRunStore";
import {
  getHostBridgeOperation,
  hostBridgeOperationStoreInternalsForTests,
  markHostBridgeOperationOutcomeUnknown,
  reserveHostBridgeOperation,
} from "../../src/modules/hostBridgeOperationStore";
import { registerAcpSkillRunController } from "../../src/modules/acpSkillRunControllerRegistry";
import { resolveAcpSkillRunPermissionRequest } from "../../src/modules/acpSkillRunPermissionQueue";

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
      schemaVersion: 2,
      id,
      label: "Bridge Workflow",
      provider: "pass-through",
      version: "1.0.0",
      trigger: {
        requiresSelection: true,
      },
      inputs: {
        member: { kind: "parent" },
        grouping: { mode: "each" },
      },
      validateSelection: {
        select: { policy: "input-member", source: "selected" },
        filters: [],
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

function createAgentRunApplyBody(request: {
  agentRequestId: string;
  namespace: string;
}) {
  const bundleRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "zotero-agent-run-apply-"),
  );
  const resultDir = path.join(bundleRoot, "result", request.namespace);
  const manifestDir = path.join(bundleRoot, "bundle", request.namespace);
  fs.mkdirSync(resultDir, { recursive: true });
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(
    path.join(resultDir, "result.json"),
    JSON.stringify({ status: "ok" }),
  );
  fs.writeFileSync(
    path.join(manifestDir, "manifest.json"),
    JSON.stringify({ namespace: request.namespace }),
  );
  return {
    results: [
      {
        agentRequestId: request.agentRequestId,
        bundle: {
          kind: "local_path",
          path: bundleRoot,
        },
      },
    ],
  };
}

function agentRunRequests(handoff: any) {
  return (
    getHostBridgeAgentRunRecord(handoff.json.result.agentRunId)?.requests || []
  );
}

describe("host bridge workflow control", function () {
  afterEach(function () {
    resetHostBridgeServerForTests();
    resetHostBridgePermissionManagerForTests();
    resetWorkflowTasks();
    resetAcpSkillRunsForTests();
    resetSkillRunnerRunStoreForTests();
    resetTaskDashboardHistory();
    resetHostBridgeFileRegistryForTests();
    resetHostBridgeNotificationInboxForTests();
    resetHostBridgeNotificationProjectionForTests();
    workflowSubmissionQueue.resetForTests();
    resetPluginStateStoreForTests();
    resetRuntimeBridgeOverrideForTests();
    setDebugModeOverrideForTests();
    setPref("hostBridgeDisableWriteApproval", false);
  });

  it("projects one static workflow manifest contract for runtime and catalog consumers", function () {
    const entry = workflow("catalog-contract");
    entry.manifest.provider = "skillrunner";
    entry.manifest.request = {
      kind: "skillrunner.sequence.v1",
      sequence: { steps: [] },
    };
    entry.manifest.executionModes = ["interactive"];
    entry.manifest.supportedInvocationModes = [
      "interactive",
      "non-interactive",
    ];
    entry.manifest.resourceRequirements = [
      {
        id: "source",
        direction: "input",
        kind: "archive",
        cardinality: "one",
        required: true,
        accept: { extensions: [".zip"] },
      },
      {
        id: "result",
        direction: "output",
        kind: "archive",
        cardinality: "one",
        required: true,
        suggestedName: "result.zip",
      },
    ];
    entry.manifest.parameters = {
      scope: { type: "string", required: true },
      language: { type: "string", default: "en-US" },
    };
    entry.manifest.result = {
      fetch: { type: "bundle" },
      expects: {
        result_json: "result/result.json",
        artifacts: ["artifacts/report.md"],
      },
    };

    assert.deepEqual(compatibleBackendTypesForManifest(entry.manifest), [
      "skillrunner",
      "acp",
    ]);
    assert.deepEqual(projectWorkflowManifestContract(entry.manifest), {
      executionModes: ["interactive"],
      supportedInvocationModes: ["interactive", "non-interactive"],
      resourceRequirements: entry.manifest.resourceRequirements,
      providerRequirements: {
        requestKind: "skillrunner.sequence.v1",
        acceptedProviderTypes: ["skillrunner", "acp"],
      },
      requiredWorkflowOptions: ["scope"],
      resultEvidence: {
        fetchType: "bundle",
        resultJson: "result/result.json",
        artifacts: ["artifacts/report.md"],
        applyBack: true,
      },
      selection: {
        acceptsNoSelection: false,
        inputs: entry.manifest.inputs,
        validation: entry.manifest.validateSelection,
      },
    });
    assert.deepEqual(
      compatibleBackendTypesForManifest({
        ...entry.manifest,
        provider: "acp",
      }),
      ["acp", "skillrunner"],
    );
    assert.deepEqual(
      compatibleBackendTypesForManifest({
        ...entry.manifest,
        provider: "generic-http",
      }),
      ["generic-http"],
    );
    assert.deepEqual(
      compatibleBackendTypesForManifest({
        ...entry.manifest,
        provider: "pass-through",
      }),
      ["pass-through"],
    );
  });

  it("lists loaded workflows without exposing implementation paths", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/workflows",
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
      path: "/bridge/v2/workflows",
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
      path: "/bridge/v2/workflows",
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
      path: "/bridge/v2/workflows/submit",
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
      path: "/bridge/v2/workflows/submit",
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
      path: "/bridge/v2/workflows/submit",
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
      path: "/bridge/v2/workflows/submit",
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
    entry.manifest.inputs = {
      member: { kind: "attachment" },
      grouping: { mode: "each" },
    };
    entry.manifest.validateSelection = {
      select: { policy: "input-member", source: "selected" },
      filters: [],
    };
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
      path: "/bridge/v2/workflows/agent-run",
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
    assert.match(parsed.json.result.agentRunId, /^agent-run-/);
    assert.isString(parsed.json.result.expiresAt);
    const preparedRequests = agentRunRequests(parsed);
    assert.notProperty(parsed.json.result, "requests");
    assert.strictEqual(
      parsed.json.result.requestCount,
      preparedRequests.length,
    );
    assert.isAtLeast(preparedRequests.length, 1);
    assert.match(preparedRequests[0].agentRequestId, /^req-/);
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
      download.source.size,
    );
    const downloadBytes = await fs.promises.readFile(download.source.path);
    assert.strictEqual(
      parsed.json.result.bundle.file.sha256,
      `sha256:${crypto
        .createHash("sha256")
        .update(downloadBytes)
        .digest("hex")}`,
    );
    const reader = new ZipBundleReader(download.source.path);
    const workflowJson = JSON.parse(
      await reader.readText("workflow/workflow.json"),
    );
    const agentRunContext = JSON.parse(
      await reader.readText("agent-run/context.json"),
    );
    const outputContract = JSON.parse(
      await reader.readText(
        `agent-run/requests/${preparedRequests[0].agentRequestId}/output-contract.json`,
      ),
    );
    const applyBackText = await reader.readText("APPLY-BACK.md");
    const toolkitCli = await reader.readText(
      "tools/skillrunner-output-contract/skill_runner_contract/cli.py",
    );
    const contextJson = await reader.readText("selection/context.json");
    const protocolText = await reader.readText("workflow-protocol.md");
    const selectedFile = await reader.readText("selection/files/001-paper.txt");
    const extractedDir = await reader.getExtractedDir();
    assert.strictEqual(workflowJson.id, "bridge-workflow");
    assert.strictEqual(
      agentRunContext.agentRunId,
      parsed.json.result.agentRunId,
    );
    assert.strictEqual(
      outputContract.agentRequestId,
      preparedRequests[0].agentRequestId,
    );
    assert.include(applyBackText, "zotero-bridge workflow agent-apply");
    assert.include(toolkitCli, "def cmd_finalize_output");
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
      fs.existsSync(
        path.join(extractedDir, "workflow", "package", "workflow.json"),
      ),
    );
    assert.strictEqual(selectedFile, "paper body");
  });

  it("keeps workflow agent-run materialization free of workflow-id-specific branches", function () {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/modules/hostBridgeWorkflowAgentRun.ts"),
      "utf8",
    );
    assert.notInclude(source, "literature-analysis");
    assert.notInclude(source, "literature-deep-reading");
  });

  it("applies finalized workflow agent-run bundles once through workflow applyResult", async function () {
    const entry = workflow("bridge-workflow");
    let applyCalls = 0;
    entry.hooks.applyResult = async () => {
      applyCalls += 1;
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    configureHostBridgeGlobalApprovalHandlerForTests((request) => ({
      outcome: "approved",
      requestId: request.requestId,
      channel: "global",
    }));
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge Agent Apply Parent");
    await parent.saveTx();

    const handoff = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: {
          items: [{ id: parent.id }],
        },
      },
    });
    assert.strictEqual(handoff.status, 200);
    const request = agentRunRequests(handoff)[0];
    const applyBody = createAgentRunApplyBody(request);

    const applied = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply`,
      body: applyBody,
    });

    assert.strictEqual(applied.status, 200);
    assert.strictEqual(applied.json.status, "ok");
    assert.strictEqual(applied.json.result.summary.succeeded, 1);
    assert.strictEqual(applyCalls, 1);

    const second = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply`,
      body: applyBody,
    });
    assert.strictEqual(second.status, 409);
    assert.strictEqual(second.json.error.code, "agent_run_already_consumed");
  });

  it("replays a durable operation receipt without repeating an apply", async function () {
    const entry = workflow("bridge-workflow");
    let applyCalls = 0;
    entry.hooks.applyResult = async () => {
      applyCalls += 1;
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "operation-token",
    });
    configureHostBridgeGlobalApprovalHandlerForTests((request) => ({
      outcome: "approved",
      requestId: request.requestId,
      channel: "global",
    }));
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Durable Operation Parent");
    await parent.saveTx();
    const handoff = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
      headers: { "x-zotero-bridge-operation-id": "prepare-operation-1" },
      body: {
        workflowId: "bridge-workflow",
        selection: { items: [{ id: parent.id }] },
      },
    });
    const path = `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply`;
    const body = createAgentRunApplyBody(agentRunRequests(handoff)[0]);
    const headers = { "x-zotero-bridge-operation-id": "apply-operation-1" };
    const first = await bridgeRequest({
      token,
      method: "POST",
      path,
      headers,
      body,
    });
    const replay = await bridgeRequest({
      token,
      method: "POST",
      path,
      headers,
      body,
    });
    assert.strictEqual(first.status, 200);
    assert.deepEqual(replay.json, first.json);
    assert.strictEqual(applyCalls, 1);

    const receipt = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/operations/apply-operation-1",
    });
    assert.strictEqual(receipt.status, 200);
    assert.strictEqual(receipt.json.result.state, "completed");
    assert.strictEqual(receipt.json.result.stateChange, "changed");

    const conflict = await bridgeRequest({
      token,
      method: "POST",
      path,
      headers,
      body: { results: [] },
    });
    assert.strictEqual(conflict.status, 409);
    assert.strictEqual(conflict.json.error.code, "idempotency_conflict");
  });

  it("retains operation and agent-run recovery records for thirty days", function () {
    const reserved = reserveHostBridgeOperation({
      operationId: "retained-operation",
      requestDigest: "request-digest",
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
    });
    assert.strictEqual(reserved.kind, "reserved");
    const unknown = markHostBridgeOperationOutcomeUnknown("retained-operation");
    assert.strictEqual(unknown?.state, "outcome_unknown");
    assert.strictEqual(unknown?.stateChange, "unknown");

    const agentRun = createHostBridgeAgentRunRecord({
      workflowId: "bridge-workflow",
      selection: { kind: "none" },
      requests: [],
    });
    const afterRetention =
      Date.now() + hostBridgeOperationStoreInternalsForTests.RETENTION_MS + 1;
    hostBridgeOperationStoreInternalsForTests.cleanup(afterRetention);
    hostBridgeAgentRunStoreInternalsForTests.cleanupRetained(afterRetention);

    assert.isNull(getHostBridgeOperation("retained-operation"));
    assert.isNull(getHostBridgeAgentRunRecord(agentRun.agentRunId));
    assert.strictEqual(
      hostBridgeOperationStoreInternalsForTests.RETENTION_MS,
      30 * 24 * 60 * 60 * 1000,
    );
    assert.strictEqual(
      hostBridgeAgentRunStoreInternalsForTests.RETENTION_MS,
      hostBridgeOperationStoreInternalsForTests.RETENTION_MS,
    );
  });

  it("prevents a concurrent apply after the first apply seals the handle", async function () {
    const entry = workflow("bridge-workflow");
    let applyCalls = 0;
    let releaseApply!: () => void;
    let markEntered!: () => void;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseApply = resolve;
    });
    entry.hooks.applyResult = async () => {
      applyCalls += 1;
      markEntered();
      await release;
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "concurrent-token",
    });
    configureHostBridgeGlobalApprovalHandlerForTests((request) => ({
      outcome: "approved",
      requestId: request.requestId,
      channel: "global",
    }));
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Concurrent Apply Parent");
    await parent.saveTx();
    const handoff = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: { items: [{ id: parent.id }] },
      },
    });
    const path = `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply`;
    const body = createAgentRunApplyBody(agentRunRequests(handoff)[0]);
    const firstPending = bridgeRequest({ token, method: "POST", path, body });
    await entered;
    const second = await bridgeRequest({ token, method: "POST", path, body });
    releaseApply();
    const first = await firstPending;

    assert.strictEqual(first.status, 200);
    assert.strictEqual(second.status, 409);
    assert.strictEqual(second.json.error.code, "agent_run_already_consumed");
    assert.strictEqual(second.json.error.handleConsumption, "consumed");
    assert.strictEqual(applyCalls, 1);
  });

  it("recovers durable preflight and sealed apply states after restart", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "recovery-token",
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Restart Recovery Parent");
    await parent.saveTx();
    const handoff = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: { items: [{ id: parent.id }] },
      },
    });
    const agentRunId = handoff.json.result.agentRunId;

    assert.isOk(acquireHostBridgeAgentRunApplyLease(agentRunId));
    recoverHostBridgeAgentRunStoreAfterRestart();
    assert.strictEqual(
      getHostBridgeAgentRunRecord(agentRunId)?.state,
      "prepared",
    );

    assert.isOk(acquireHostBridgeAgentRunApplyLease(agentRunId));
    assert.isOk(sealHostBridgeAgentRunRecord(agentRunId));
    recoverHostBridgeAgentRunStoreAfterRestart();
    const recovered = getHostBridgeAgentRunRecord(agentRunId);
    assert.strictEqual(recovered?.state, "outcome_unknown");
    assert.strictEqual(recovered?.applyReceipt?.stateChange, "unknown");
    assert.strictEqual(recovered?.applyReceipt?.handleConsumption, "consumed");
  });

  it("preflights every agent-run bundle before approval or handle consumption", async function () {
    const entry = workflow("bridge-workflow");
    let applyCalls = 0;
    let approvalCalls = 0;
    entry.hooks.applyResult = async () => {
      applyCalls += 1;
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "preflight-token",
    });
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalCalls += 1;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Preflight Parent");
    await parent.saveTx();
    const handoff = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: { items: [{ id: parent.id }] },
      },
    });
    const request = agentRunRequests(handoff)[0];
    const invalid = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply`,
      body: {
        results: [
          {
            agentRequestId: request.agentRequestId,
            bundle: {
              kind: "local_path",
              path: path.join(os.tmpdir(), "missing-agent-bundle"),
            },
          },
        ],
      },
    });
    assert.strictEqual(invalid.status, 422);
    assert.strictEqual(invalid.json.error.code, "invalid_bundle");
    assert.strictEqual(approvalCalls, 0);
    assert.strictEqual(applyCalls, 0);

    const receipt = await bridgeRequest({
      token,
      method: "GET",
      path: `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply`,
    });
    assert.strictEqual(receipt.status, 200);
    assert.strictEqual(receipt.json.result.handleConsumption, "unconsumed");
    assert.isTrue(receipt.json.result.recoverable);

    const retry = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply`,
      body: createAgentRunApplyBody(request),
    });
    assert.strictEqual(retry.status, 200);
    assert.strictEqual(applyCalls, 1);
  });

  it("keeps a queryable partial receipt when one preflighted apply result fails", async function () {
    const entry = workflow("bridge-workflow");
    let applyCalls = 0;
    entry.hooks.applyResult = async () => {
      applyCalls += 1;
      if (applyCalls === 2) throw new Error("second apply failed");
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({ token: "receipt-token" });
    configureHostBridgeGlobalApprovalHandlerForTests((request) => ({
      outcome: "approved",
      requestId: request.requestId,
      channel: "global",
    }));
    const parents = [];
    for (const title of ["Receipt One", "Receipt Two"]) {
      const item = new Zotero.Item("journalArticle");
      item.setField("title", title);
      await item.saveTx();
      parents.push(item);
    }
    const handoff = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: { items: parents.map((item) => ({ id: item.id })) },
      },
    });
    const preparedRequests = agentRunRequests(handoff);
    assert.lengthOf(preparedRequests, 2);
    const bodies = preparedRequests.map(createAgentRunApplyBody);
    const applied = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply`,
      body: { results: bodies.flatMap((body: any) => body.results) },
    });
    assert.strictEqual(applied.status, 200);
    assert.deepEqual(applied.json.result.summary, {
      total: 2,
      succeeded: 1,
      failed: 1,
    });
    assert.notProperty(applied.json.result, "results");
    assert.notProperty(applied.json.result, "warnings");
    assert.include(
      applied.json.result.receiptUrl,
      handoff.json.result.agentRunId,
    );

    const firstReceiptPage = await bridgeRequest({
      token,
      method: "GET",
      path: `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply?limit=1`,
    });
    assert.strictEqual(firstReceiptPage.json.result.status, "partial");
    assert.strictEqual(firstReceiptPage.json.result.stateChange, "changed");
    assert.strictEqual(
      firstReceiptPage.json.result.handleConsumption,
      "consumed",
    );
    assert.isFalse(firstReceiptPage.json.result.recoverable);
    assert.lengthOf(firstReceiptPage.json.result.results, 1);
    assert.isTrue(firstReceiptPage.json.result.hasMore);
    assert.isString(firstReceiptPage.json.result.nextCursor);
    assert.strictEqual(firstReceiptPage.json.result.returned, 1);
    assert.strictEqual(firstReceiptPage.json.result.total, 2);
    assert.strictEqual(firstReceiptPage.json.result.limit, 1);

    const secondReceiptPage = await bridgeRequest({
      token,
      method: "GET",
      path: `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply?limit=1&cursor=${encodeURIComponent(firstReceiptPage.json.result.nextCursor)}`,
    });
    assert.lengthOf(secondReceiptPage.json.result.results, 1);
    assert.isFalse(secondReceiptPage.json.result.hasMore);
    assert.strictEqual(secondReceiptPage.json.result.nextCursor, "");
    assert.notEqual(
      firstReceiptPage.json.result.results[0].agentRequestId,
      secondReceiptPage.json.result.results[0].agentRequestId,
    );
  });

  it("renews or abandons an unconsumed agent run through explicit lifecycle endpoints", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "agent-run-lifecycle-token",
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Agent Run Lifecycle Parent");
    await parent.saveTx();
    const handoff = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: { items: [{ id: parent.id }] },
      },
    });
    const agentRunId = handoff.json.result.agentRunId;

    const renewed = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/agent-runs/${agentRunId}/renew`,
      body: {},
    });
    assert.strictEqual(renewed.status, 200);
    assert.strictEqual(renewed.json.result.agentRunId, agentRunId);
    assert.isTrue(renewed.json.result.renewable);
    assert.isTrue(renewed.json.result.abandonable);

    const abandoned = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/agent-runs/${agentRunId}/abandon`,
      body: {},
    });
    assert.strictEqual(abandoned.status, 200);
    assert.strictEqual(abandoned.json.result.state, "abandoned");
    assert.isFalse(abandoned.json.result.renewable);
    assert.isFalse(abandoned.json.result.abandonable);

    const apply = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/agent-runs/${agentRunId}/apply`,
      body: createAgentRunApplyBody(agentRunRequests(handoff)[0]),
    });
    assert.strictEqual(apply.status, 409);
    assert.strictEqual(apply.json.error.code, "agent_run_lifecycle_conflict");
  });

  it("can disable workflow agent-run apply approval from the Host Bridge preference switch", async function () {
    const entry = workflow("bridge-workflow");
    let applyCalls = 0;
    entry.hooks.applyResult = async () => {
      applyCalls += 1;
    };
    installWorkflowRegistryForTests([entry]);
    setPref("hostBridgeDisableWriteApproval", true);
    const token = configureHostBridgeServerForTests({
      token: "workflow-agent-apply-no-approval-token",
    });
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "denied",
        requestId: request.requestId,
        channel: "global",
        reason: "approval should not be requested",
      };
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge Agent Apply Without Approval");
    await parent.saveTx();

    const handoff = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: {
          items: [{ id: parent.id }],
        },
      },
    });
    assert.strictEqual(handoff.status, 200);
    const request = agentRunRequests(handoff)[0];

    const applied = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply`,
      body: createAgentRunApplyBody(request),
    });

    assert.strictEqual(applied.status, 200);
    assert.strictEqual(applied.json.result.permission.outcome, "approved");
    assert.strictEqual(applied.json.result.permission.channel, "global");
    assert.strictEqual(applyCalls, 1);
    assert.isNull(approvalRequest);
  });

  it("returns stable workflow agent-run apply errors before consuming the agent run", async function () {
    const entry = workflow("bridge-workflow");
    entry.manifest.validateSelection = {
      require: {
        selection: {
          counts: {
            notes: {
              min: 1,
            },
          },
        },
      },
      select: { policy: "input-member", source: "selected" },
      filters: [],
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    configureHostBridgeGlobalApprovalHandlerForTests(() => {
      throw new Error("apply_not_allowed must not request approval");
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge Agent Apply Rejected Parent");
    await parent.saveTx();

    const handoff = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
      body: {
        workflowId: "bridge-workflow",
        selection: {
          items: [{ id: parent.id }],
        },
      },
    });
    assert.strictEqual(handoff.status, 200);
    const request = agentRunRequests(handoff)[0];

    const deniedByApplyStatus = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply`,
      body: {
        results: [
          {
            agentRequestId: request.agentRequestId,
            bundle: {
              kind: "local_path",
              path: "unused",
            },
          },
        ],
      },
    });
    assert.strictEqual(deniedByApplyStatus.status, 409);
    assert.strictEqual(
      deniedByApplyStatus.json.error.code,
      "apply_not_allowed",
    );

    const unknownRequest = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/agent-runs/${handoff.json.result.agentRunId}/apply`,
      body: {
        results: [
          {
            agentRequestId: "missing-request",
            bundle: {
              kind: "local_path",
              path: "unused",
            },
          },
        ],
      },
    });
    assert.strictEqual(unknownRequest.status, 400);
    assert.strictEqual(unknownRequest.json.error.code, "unknown_request");
  });

  it("rejects workflow agent-run runtime options and provider profiles", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
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

  it("rejects workflow agent-run when selection does not produce an input member", async function () {
    const entry = workflow("bridge-workflow");
    entry.manifest.inputs = {
      member: { kind: "attachment" },
      grouping: { mode: "each" },
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
      path: "/bridge/v2/workflows/agent-run",
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

  it("allows selection-member agent-run without applying workflow trigger policy", async function () {
    const entry = workflow("bridge-workflow");
    entry.manifest.inputs = {
      member: { kind: "selection" },
      grouping: { mode: "all" },
    };
    entry.manifest.validateSelection = {
      select: { policy: "selection" },
      filters: [],
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/agent-run",
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
      member: {
        kind: "attachment",
        accepts: {
          mime: ["text/plain"],
        },
      },
      grouping: { mode: "each" },
    };
    entry.manifest.validateSelection = {
      require: {
        selection: {
          counts: {
            notes: {
              min: 1,
            },
          },
        },
      },
      select: { policy: "input-member", source: "selected" },
      filters: [],
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
      path: "/bridge/v2/workflows/agent-run",
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
      path: "/bridge/v2/workflows/describe",
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
    assert.strictEqual(
      parsed.json.result.selection.inputs.member.kind,
      "parent",
    );
    assert.deepEqual(parsed.json.result.workflowOptions.normalized, {
      language: "en-US",
    });
    assert.deepEqual(
      parsed.json.result.workflowOptions.schema.map(
        (entry: { key: string }) => entry.key,
      ),
      ["language"],
    );
    assert.notProperty(parsed.json.result, "providerProfile");
    assert.property(parsed.json.result, "providerRequirements");
    assert.deepEqual(parsed.json.result.resultEvidence, {
      artifacts: [],
      applyBack: true,
    });
    assert.deepInclude(parsed.json.result.executionModes.hostOwned, {
      supported: true,
      acceptsWorkflowOptions: true,
      monitorable: true,
      requiresApplyBack: false,
    });
    assert.deepInclude(parsed.json.result.executionModes.agentOwned, {
      supported: true,
      acceptsWorkflowOptions: false,
      monitorable: false,
      requiresApplyBack: true,
    });
  });

  it("uses the shared static projection in workflow list and describe", async function () {
    const entry = workflow("projected-workflow");
    entry.manifest.provider = "skillrunner";
    entry.manifest.request = {
      kind: "skillrunner.job.v1",
      skill_id: "projected-workflow",
    };
    entry.manifest.parameters = {
      scope: { type: "string", required: true },
    };
    entry.manifest.result = {
      fetch: { type: "result" },
      expects: {
        result_json: "result/result.json",
        artifacts: ["artifacts/report.md"],
      },
    };
    const projection = projectWorkflowManifestContract(entry.manifest);
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const listed = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/workflows",
    });
    const described = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/describe",
      body: { workflowId: "projected-workflow" },
    });

    assert.deepEqual(
      listed.json.result.workflows[0].resultEvidence,
      projection.resultEvidence,
    );
    assert.deepEqual(
      described.json.result.resultEvidence,
      projection.resultEvidence,
    );
    assert.deepInclude(
      described.json.result.providerRequirements,
      projection.providerRequirements,
    );
    assert.deepEqual(
      described.json.result.executionModes.agentOwned.requiredParameters,
      projection.requiredWorkflowOptions,
    );
  });

  it("validates workflow input and reports requirements without starting a run", async function () {
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

    const requirements = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/requirements",
      body: {
        workflowId: "bridge-workflow",
      },
    });
    assert.strictEqual(requirements.status, 200);
    assert.strictEqual(requirements.json.result.workflowId, "bridge-workflow");
    assert.strictEqual(
      requirements.json.result.selection.inputs.member.kind,
      "parent",
    );

    const validate = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/validate",
      body: {
        workflowId: "bridge-workflow",
        selection: {
          items: [{ key: "ABCD1234", libraryId: 1 }],
        },
        workflowOptions: {
          language: "en-US",
        },
      },
    });

    assert.strictEqual(validate.status, 200);
    assert.deepInclude(validate.json.result, {
      workflowId: "bridge-workflow",
      ready: true,
    });
    assert.deepEqual(validate.json.result.workflowOptions, {
      language: "en-US",
    });
    assert.notProperty(validate.json.result, "providerProfile");
    assert.notInclude(JSON.stringify(validate.json.result), "requestId");
  });

  it("describes required workflow parameters and rejects missing values before submit", async function () {
    const entry = workflow("required-workflow");
    entry.manifest.parameters = {
      scope: {
        type: "string",
        required: true,
      },
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const requirements = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/requirements",
      body: { workflowId: "required-workflow" },
    });
    assert.strictEqual(requirements.status, 200);
    assert.isTrue(requirements.json.result.workflowOptions.schema[0].required);
    assert.isFalse(
      requirements.json.result.executionModes.agentOwned.supported,
    );
    assert.deepEqual(
      requirements.json.result.executionModes.agentOwned.requiredParameters,
      ["scope"],
    );

    const validate = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/validate",
      body: {
        workflowId: "required-workflow",
        selection: {
          items: [{ key: "ABCD1234", libraryId: 1 }],
        },
        workflowOptions: { scope: "   " },
      },
    });
    assert.strictEqual(validate.status, 400);
    assert.strictEqual(
      validate.json.error.code,
      "missing_required_workflow_parameter",
    );
    assert.deepEqual(validate.json.error.details.requiredFields, ["scope"]);
  });

  it("lists, describes, and validates ACP provider profiles without workflow context", async function () {
    const previousBackends = getPref("backendsConfigJson");
    try {
      setPref(
        "backendsConfigJson",
        JSON.stringify({
          schemaVersion: 2,
          backends: [
            {
              id: "acp-opencode",
              displayName: "OpenCode ACP",
              type: "acp",
              baseUrl: "local://acp-opencode",
              command: "opencode",
              args: ["acp"],
              auth: { kind: "none" },
            },
          ],
        }),
      );
      const token = configureHostBridgeServerForTests({
        token: "workflow-token",
      });

      const listed = await bridgeRequest({
        token,
        method: "GET",
        path: "/bridge/v2/workflows/provider-profiles",
      });
      assert.strictEqual(listed.status, 200);
      assert.deepInclude(listed.json.result.profiles[0], {
        backendId: "acp-opencode",
        providerId: "acp",
      });

      const described = await bridgeRequest({
        token,
        method: "POST",
        path: "/bridge/v2/workflows/provider-profiles/describe",
        body: {
          backendId: "acp-opencode",
        },
      });

      assert.strictEqual(described.status, 200);
      assert.strictEqual(described.json.status, "ok");
      assert.strictEqual(described.json.result.providerId, "acp");
      assert.strictEqual(described.json.result.backend.id, "acp-opencode");
      assert.notProperty(described.json.result, "workflowId");
      assert.include(
        described.json.result.options.map(
          (entry: { key: string }) => entry.key,
        ),
        "autoApproveAcpPermissions",
      );

      const validated = await bridgeRequest({
        token,
        method: "POST",
        path: "/bridge/v2/workflows/provider-profiles/validate",
        body: {
          providerProfile: {
            backendId: "acp-opencode",
            providerOptions: { autoApproveAcpPermissions: true },
          },
        },
      });
      assert.strictEqual(validated.status, 200);
      assert.strictEqual(
        validated.json.result.normalizedProfile.backendId,
        "acp-opencode",
      );
      assert.deepEqual(
        validated.json.result.normalizedProfile.providerOptions,
        { autoApproveAcpPermissions: true },
      );
      assert.notProperty(validated.json.result, "workflowId");

      const unavailable = await bridgeRequest({
        token,
        method: "POST",
        path: "/bridge/v2/workflows/provider-profiles/validate",
        body: {
          providerProfile: {
            backendId: "acp-opencode",
            providerOptions: { acpModelId: "unverified-model" },
          },
        },
      });
      assert.strictEqual(unavailable.status, 400);
      assert.strictEqual(
        unavailable.json.error.code,
        "provider_profile_option_unavailable",
      );
    } finally {
      setPref("backendsConfigJson", previousBackends);
    }
  });

  it("describes and validates SkillRunner profiles from the selected backend", async function () {
    const previousBackends = getPref("backendsConfigJson");
    try {
      setPref(
        "backendsConfigJson",
        JSON.stringify({
          schemaVersion: 2,
          backends: [
            {
              id: "skillrunner-local",
              displayName: "Local SkillRunner",
              type: "skillrunner",
              baseUrl: "http://127.0.0.1:8123",
              auth: { kind: "none" },
            },
          ],
        }),
      );
      const token = configureHostBridgeServerForTests({
        token: "workflow-token",
      });
      const described = await bridgeRequest({
        token,
        method: "POST",
        path: "/bridge/v2/workflows/provider-profiles/describe",
        body: { backendId: "skillrunner-local" },
      });
      assert.strictEqual(described.status, 200);
      assert.strictEqual(described.json.result.providerId, "skillrunner");
      assert.include(
        described.json.result.options.map(
          (entry: { key: string }) => entry.key,
        ),
        "engine",
      );

      const validated = await bridgeRequest({
        token,
        method: "POST",
        path: "/bridge/v2/workflows/provider-profiles/validate",
        body: {
          providerProfile: {
            backendId: "skillrunner-local",
            providerOptions: { no_cache: true, hard_timeout_seconds: 30 },
          },
        },
      });
      assert.strictEqual(validated.status, 200);
      assert.deepInclude(
        validated.json.result.normalizedProfile.providerOptions,
        { no_cache: true, hard_timeout_seconds: 30 },
      );
    } finally {
      setPref("backendsConfigJson", previousBackends);
    }
  });

  it("rejects unsafe provider profile fields through provider validation", async function () {
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/provider-profiles/validate",
      body: {
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
    assert.strictEqual(parsed.json.error.code, "invalid_provider_profile");
  });

  it("rejects provider profile input on workflow describe and validate", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    for (const [path, body] of [
      [
        "/bridge/v2/workflows/describe",
        { workflowId: "bridge-workflow", providerProfile: {} },
      ],
      [
        "/bridge/v2/workflows/validate",
        {
          workflowId: "bridge-workflow",
          selection: { items: [{ key: "ABCD1234", libraryId: 1 }] },
          providerProfile: {},
        },
      ],
    ] as const) {
      const parsed = await bridgeRequest({ token, method: "POST", path, body });
      assert.strictEqual(parsed.status, 400);
      assert.match(parsed.json.error.code, /^invalid_workflow_/);
    }
  });

  it("rejects submit provider profile backend incompatible with workflow", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/submit",
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
      "workflow_provider_incompatible",
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
      path: "/bridge/v2/workflows/submit",
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

  it("parses request-scoped Host queue options through the workflow settings contract", function () {
    const parsed = parseHostBridgeWorkflowSubmitRequest({
      workflowId: "bridge-workflow",
      selection: { kind: "none" },
      hostOptions: { queue: { maxConcurrency: 2 } },
    });
    assert.deepEqual(parsed.executionOptions.hostOptions, {
      queue: { maxConcurrency: 2 },
    });
    assert.throws(
      () =>
        parseHostBridgeWorkflowSubmitRequest({
          workflowId: "bridge-workflow",
          selection: { kind: "none" },
          hostOptions: { queue: { maxConcurrency: -1 } },
        }),
      /non-negative safe integer/,
    );
  });

  it("parses opaque workflow resource bindings without accepting paths", function () {
    const parsed = parseHostBridgeWorkflowSubmitRequest({
      workflowId: "bridge-workflow",
      selection: { kind: "none" },
      resourceBindings: {
        schema: "zotero-bridge.workflow-resources.v1",
        inputs: {
          source: { fileIds: ["file-upload-1"] },
        },
        outputs: {
          result: { delivery: "bridge-download" },
        },
      },
    });

    assert.deepEqual(parsed.resourceBindings, {
      schema: "zotero-bridge.workflow-resources.v1",
      inputs: {
        source: { fileIds: ["file-upload-1"] },
      },
      outputs: {
        result: { delivery: "bridge-download" },
      },
    });
    try {
      parseHostBridgeWorkflowSubmitRequest({
        workflowId: "bridge-workflow",
        selection: { kind: "none" },
        resourceBindings: {
          inputs: { source: { path: "/tmp/source.zip" } },
        },
      });
      assert.fail("expected path-like resource binding to be rejected");
    } catch (error) {
      assert.strictEqual(
        (error as { code?: string }).code,
        "invalid_workflow_resource_bindings",
      );
    }
  });

  it("validates workflow resource handles without leasing or consuming them", async function () {
    const entry = workflow("resource-validation");
    entry.manifest.supportedInvocationModes = [
      "interactive",
      "non-interactive",
    ];
    entry.manifest.resourceRequirements = [
      {
        id: "source",
        direction: "input",
        kind: "archive",
        cardinality: "one",
        required: true,
        accept: { extensions: [".zip"] },
      },
      {
        id: "result",
        direction: "output",
        kind: "archive",
        cardinality: "one",
        required: true,
      },
    ];
    const upload = await registerHostBridgeUploadedFile({
      bytes: new Uint8Array([1, 2, 3]),
      displayName: "source.zip",
      contentType: "application/zip",
    });
    const validation = await validateWorkflowResourceBindings({
      manifest: entry.manifest,
      raw: {
        inputs: { source: { fileIds: [upload.fileId] } },
        outputs: { result: { delivery: "bridge-download" } },
      },
    });

    assert.strictEqual(validation.inputs.source[0].fileId, upload.fileId);
    assert.isFalse(hasHostBridgeUploadedFileLease(upload.fileId));
    assert.strictEqual(
      (await resolveHostBridgeFileDownload(upload.fileId)).descriptor.fileId,
      upload.fileId,
    );

    for (const testCase of [
      {
        raw: {
          inputs: { source: { fileIds: [upload.fileId] } },
          outputs: {},
        },
        code: "workflow_resource_missing",
      },
      {
        raw: {
          inputs: {
            source: { fileIds: [upload.fileId] },
            unknown: { fileIds: [upload.fileId] },
          },
          outputs: { result: { delivery: "bridge-download" } },
        },
        code: "invalid_workflow_resource_bindings",
      },
    ]) {
      try {
        await validateWorkflowResourceBindings({
          manifest: entry.manifest,
          raw: testCase.raw,
        });
        assert.fail(`expected ${testCase.code}`);
      } catch (error) {
        assert.strictEqual((error as { code?: string }).code, testCase.code);
      }
      assert.isFalse(hasHostBridgeUploadedFileLease(upload.fileId));
    }
  });

  it("rejects explicitly interactive-only workflows before resource resolution", async function () {
    const entry = workflow("interactive-only");
    entry.manifest.supportedInvocationModes = ["interactive"];
    try {
      await validateWorkflowResourceBindings({
        manifest: entry.manifest,
        raw: undefined,
      });
      assert.fail("expected non-interactive eligibility rejection");
    } catch (error) {
      assert.strictEqual(
        (error as { code?: string }).code,
        "workflow_resource_ineligible",
      );
    }
  });

  it("accepts an omitted binding set when every resource slot is optional", async function () {
    const entry = workflow("optional-resources");
    entry.manifest.supportedInvocationModes = [
      "interactive",
      "non-interactive",
    ];
    entry.manifest.resourceRequirements = [
      {
        id: "research-materialized-files",
        direction: "input",
        kind: "file",
        cardinality: "many",
        required: false,
      },
    ];

    const validation = await validateWorkflowResourceBindings({
      manifest: entry.manifest,
      raw: undefined,
    });

    assert.strictEqual(validation.bindings, undefined);
    assert.deepEqual(validation.inputs, {});
  });

  it("lists native queued units, inspects their active submission, and cancels only pending units", async function () {
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const handle = workflowSubmissionQueue.enqueueSubmission({
      backend: { backendType: "skillrunner", backendId: "backend-a" },
      workflow: {
        workflowId: "bridge-workflow",
        workflowLabel: "Bridge Workflow",
      },
      units: ["u1", "u2"].map((unitId, order) => ({
        unit: unitId,
        display: {
          unitId,
          order,
          taskName: `Task ${unitId}`,
          inputUnitIdentity: `private:${unitId}`,
        },
      })),
      maxConcurrency: 1,
      executeUnit: async (unitId) => {
        if (unitId === "u1") await firstGate;
        return { status: "succeeded" };
      },
    });

    const queued = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/workflows/queue",
    });
    assert.strictEqual(queued.status, 200);
    assert.lengthOf(queued.json.result.units, 1);
    assert.notInclude(queued.body, "private:");
    const secondQueueId = queued.json.result.units[0].queueId;

    await Promise.resolve();
    await Promise.resolve();
    const submission = await bridgeRequest({
      token,
      method: "GET",
      path: `/bridge/v2/workflows/submissions/${handle.submissionId}`,
    });
    assert.strictEqual(submission.status, 200);
    assert.strictEqual(
      submission.json.result.submissionId,
      handle.submissionId,
    );
    assert.strictEqual(submission.json.result.admitted, 1);
    assert.strictEqual(submission.json.result.pending, 1);
    assert.notInclude(submission.body, "private:");
    const admittedQueueId = submission.json.result.units.find(
      (unit: { state: string }) => unit.state === "admitted",
    ).queueId;

    const canceled = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/queue/${secondQueueId}/cancel`,
      headers: { "x-zotero-bridge-operation-id": "cancel-queue-u2" },
      body: {},
    });
    assert.strictEqual(canceled.status, 200);
    assert.strictEqual(canceled.json.result.status, "canceled");

    const cancelAdmitted = await bridgeRequest({
      token,
      method: "POST",
      path: `/bridge/v2/workflows/queue/${admittedQueueId}/cancel`,
      headers: { "x-zotero-bridge-operation-id": "cancel-queue-u1" },
      body: {},
    });
    assert.strictEqual(cancelAdmitted.status, 409);
    assert.strictEqual(
      cancelAdmitted.json.error.code,
      "queue_unit_not_pending",
    );
    releaseFirst();
    await handle.completion;
  });

  it("filters workflow tasks by opaque submission lineage", async function () {
    const token = configureHostBridgeServerForTests({
      token: "workflow-token",
    });
    const now = new Date().toISOString();
    for (const [jobId, submissionId] of [
      ["job-a", "workflow-submission-a"],
      ["job-b", "workflow-submission-b"],
    ]) {
      recordWorkflowTaskUpdate({
        id: jobId,
        workflowId: "bridge-workflow",
        request: {},
        meta: {
          runId: `run-${jobId}`,
          workflowLabel: "Bridge Workflow",
          taskName: jobId,
          backendType: "generic-http",
          backendId: "backend-a",
          submissionId,
          submissionUnitId: `unit-${jobId}`,
        },
        state: "running",
        createdAt: now,
        updatedAt: now,
      });
    }

    const parsed = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/tasks?submissionId=workflow-submission-a",
    });
    assert.strictEqual(parsed.status, 200);
    assert.deepEqual(
      parsed.json.result.items.map((task: { jobId: string }) => task.jobId),
      ["job-a"],
    );
    assert.strictEqual(
      parsed.json.result.items[0].submissionUnitId,
      "unit-job-a",
    );
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
      path: "/bridge/v2/workflows/submit",
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
    assert.strictEqual(parsed.json.result.admission, "direct");
    assert.isString(parsed.json.result.workflowRunId);
    assert.notProperty(parsed.json.result, "runId");
    assert.notProperty(parsed.json.result, "jobIds");
    assert.notProperty(parsed.json.result, "tasks");
    assert.include(parsed.json.result.runUrl, parsed.json.result.workflowRunId);
    assert.include(
      parsed.json.result.tasksUrl,
      parsed.json.result.workflowRunId,
    );
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

  it("returns downloadable resource outputs from a direct workflow submission", async function () {
    const entry = workflow("bridge-output-workflow");
    entry.manifest.supportedInvocationModes = [
      "interactive",
      "non-interactive",
    ];
    entry.manifest.resourceRequirements = [
      {
        id: "report",
        direction: "output",
        kind: "file",
        cardinality: "one",
        required: true,
        suggestedName: "report.txt",
      },
    ];
    entry.hooks.applyResult = async ({ runtime }: any) => {
      const output = await runtime.hostApi.resources.allocateOutput({
        slotId: "report",
        suggestedName: "report.txt",
        contentType: "text/plain",
      });
      await runtime.hostApi.file.writeText(output.path, "remote report\n");
      return runtime.hostApi.resources.publishOutput({
        slotId: "report",
        path: output.path,
        displayName: "report.txt",
        contentType: "text/plain",
      });
    };
    installWorkflowRegistryForTests([entry]);
    const token = configureHostBridgeServerForTests({
      token: "workflow-output-token",
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge Output Workflow Parent");
    await parent.saveTx();
    configureHostBridgeGlobalApprovalHandlerForTests((request) => ({
      outcome: "approved",
      requestId: request.requestId,
      channel: "global",
    }));

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/submit",
      body: {
        workflowId: "bridge-output-workflow",
        selection: { items: [{ id: parent.id }] },
        resourceBindings: {
          schema: "zotero-bridge.workflow-resources.v1",
          outputs: { report: { delivery: "bridge-download" } },
        },
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.admission, "direct");
    const descriptor = parsed.json.result.resourceOutputs[0];
    assert.strictEqual(descriptor.slotId, "report");
    assert.strictEqual(descriptor.displayName, "report.txt");
    assert.strictEqual(descriptor.contentType, "text/plain");
    assert.isString(descriptor.fileId);
    assert.isNumber(descriptor.size);
    assert.isString(descriptor.sha256);
    assert.isString(descriptor.expiresAt);
    assert.include(descriptor.downloadCommand, descriptor.fileId);

    const download = await resolveHostBridgeFileDownload(descriptor.fileId);
    assert.strictEqual(
      fs.readFileSync(download.source.path, "utf8"),
      "remote report\n",
    );
  });

  it("returns queued admission without fabricated workflow run or job handles", async function () {
    const previousBackends = getPref("backendsConfigJson");
    try {
      setPref(
        "backendsConfigJson",
        JSON.stringify({
          schemaVersion: 2,
          backends: [
            {
              id: "skillrunner-queue",
              displayName: "Queued SkillRunner",
              type: "skillrunner",
              baseUrl: "http://127.0.0.1:9",
              auth: { kind: "none" },
            },
          ],
        }),
      );
      const entry = workflow("queued-workflow");
      entry.manifest.provider = "skillrunner";
      entry.manifest.request = {
        kind: "skillrunner.job.v1",
        skill_id: "queued-workflow",
      };
      entry.hooks.buildRequest = async ({ selectionContext }: any) => ({
        kind: "skillrunner.job.v1",
        skill_id: "queued-workflow",
        task_name: "Queued workflow unit",
        selection_context: selectionContext,
      });
      installWorkflowRegistryForTests([entry]);
      const token = configureHostBridgeServerForTests({
        token: "workflow-token",
      });
      const parent = new Zotero.Item("journalArticle");
      parent.setField("title", "Queued Workflow Submit Parent");
      await parent.saveTx();
      configureHostBridgeGlobalApprovalHandlerForTests((request) => ({
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      }));

      const parsed = await bridgeRequest({
        token,
        method: "POST",
        path: "/bridge/v2/workflows/submit",
        body: {
          workflowId: "queued-workflow",
          selection: { items: [{ id: parent.id }] },
          providerProfile: { backendId: "skillrunner-queue" },
          hostOptions: { queue: { maxConcurrency: 1 } },
        },
      });

      assert.strictEqual(parsed.status, 202);
      assert.strictEqual(parsed.json.result.admission, "host-queue");
      assert.isString(parsed.json.result.submissionId);
      assert.strictEqual(parsed.json.result.queuedUnits, 1);
      assert.strictEqual(parsed.json.result.totalUnits, 1);
      assert.notProperty(parsed.json.result, "workflowRunId");
      assert.notProperty(parsed.json.result, "jobIds");
      assert.include(
        parsed.json.result.submissionUrl,
        parsed.json.result.submissionId,
      );
      assert.strictEqual(
        parsed.json.result.queueUrl,
        "/bridge/v2/workflows/queue",
      );
    } finally {
      setPref("backendsConfigJson", previousBackends);
    }
  });

  it("can disable workflow submit approval from the Host Bridge preference switch", async function () {
    installWorkflowRegistryForTests([workflow("bridge-workflow")]);
    setPref("hostBridgeDisableWriteApproval", true);
    const token = configureHostBridgeServerForTests({
      token: "workflow-no-approval-token",
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge Workflow Submit Without Approval");
    await parent.saveTx();
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "denied",
        requestId: request.requestId,
        channel: "global",
        reason: "approval should not be requested",
      };
    });

    const manifest = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/manifest",
    });
    assert.strictEqual(
      manifest.json.result.workflowControl.submitRequiresApproval,
      false,
    );

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/submit",
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
    assert.strictEqual(parsed.json.result.permission.outcome, "approved");
    assert.strictEqual(parsed.json.result.permission.channel, "global");
    assert.isNull(approvalRequest);
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
      path: "/bridge/v2/tasks?runId=run-redacted",
    });
    const run = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/workflows/runs/run-redacted",
    });

    for (const parsed of [tasks, run]) {
      assert.strictEqual(parsed.status, 200);
      assert.notInclude(parsed.body, "attachment-path:");
      assert.notMatch(parsed.body, /[A-Za-z]:\\/);
      assert.notInclude(parsed.body, "/home/a/evidence.log");
      assert.include(parsed.body, "[redacted-path]");
    }
    const task = tasks.json.result.items[0];
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
        providerId: "generic-http",
        backendId: "backend-1",
        backendType: "generic-http",
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
        path: `/bridge/v2/tasks?${query}`,
      });

      assert.strictEqual(parsed.status, 200);
      assert.deepEqual(
        parsed.json.result.items.map((task: { jobId: string }) => task.jobId),
        ["job-active"],
      );
      assert.deepEqual(
        parsed.json.result.items.map((task: { state: string }) => task.state),
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
      path: "/bridge/v2/workflows/submit",
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
    const pendingPermission =
      getAcpSkillRunRecord("acp-run-approval-1")?.pendingPermission;
    assert.strictEqual(pendingPermission?.source, "host-bridge-cli");
    assert.strictEqual(pendingPermission?.approvalKind, "zotero-write");

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
      path: "/bridge/v2/workflows/submit",
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
    assert.strictEqual(
      parsed.json.result.permission.channel,
      "skillrunner-run",
    );
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
        endpoint: "http://127.0.0.1:26570/bridge/v2",
        pathInjected: true,
        autoApproveWrites: true,
      },
    });
    const parent = new Zotero.Item("journalArticle");
    parent.setField("title", "Bridge ACP Auto Approved Submit Parent");
    await parent.saveTx();
    const grantId = issueHostBridgeWriteAutoApprovalGrant({
      requestId: "acp-run-auto-approval-1",
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/submit",
      headers: {
        "x-zotero-bridge-scope": JSON.stringify({
          kind: "acp-skill-run",
          requestId: "acp-run-auto-approval-1",
          autoApproveWrites: true,
          grantId,
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
        backendType: "generic-http",
        providerId: "generic-http",
      },
      state: "running",
      createdAt: now,
      updatedAt: now,
    };
    recordWorkflowTaskUpdate(job);

    const run = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/workflows/runs/run-bridge-1",
    });
    assert.strictEqual(run.status, 200);
    assert.strictEqual(run.json.result.runId, "run-bridge-1");
    assert.strictEqual(run.json.result.workflowRunId, "run-bridge-1");
    assert.strictEqual(run.json.result.state, "running");
    assert.strictEqual(run.json.result.liveness, "active");
    assert.lengthOf(run.json.result.tasks, 1);
    assert.lengthOf(run.json.result.skillRuns, 1);
    assert.strictEqual(run.json.result.currentSkillRunId, "request-1");
    assert.strictEqual(run.json.result.skillRuns[0].skillRunId, "request-1");
    assert.strictEqual(run.json.result.skillRuns[0].sequenceRole, "single");
    assert.deepInclude(run.json.result.skillRuns[0].actions, {
      canReply: false,
      canConnect: false,
      canCancelWorkflow: true,
      isFailedRetriable: false,
    });

    const tasks = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/tasks?workflowId=bridge-workflow&backendId=backend-1",
    });
    assert.strictEqual(tasks.status, 200);
    assert.lengthOf(tasks.json.result.items, 1);
    assert.strictEqual(tasks.json.result.items[0].requestId, "request-1");
  });

  it("resolves sequence task monitoring from the submitted workflow run id", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    const now = new Date().toISOString();
    initializeSequenceRunState({
      request: {
        kind: "skillrunner.sequence.v1",
        steps: [
          {
            id: "digest",
            skill_id: "digest-skill",
          },
        ],
        final_step_id: "digest",
      },
      backend: {
        id: "backend-1",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8030",
      },
      workflowId: "literature-analysis",
      workflowLabel: "Literature Analysis",
      workflowRunId: "run-sequence",
      jobId: "job-1",
    });
    const run = applySkillRunnerRunEvent({
      type: "submit.local_created",
      init: {
        backendId: "backend-1",
        workflowId: "literature-analysis",
        workflowRunId: "run-sequence",
        jobId: "job-1:digest",
        taskName: "Digest",
        sequenceRunId: "run-sequence",
        sequenceJobId: "job-1",
        sequenceStepId: "digest",
        createdAt: now,
        updatedAt: now,
      },
    });
    assert.isNotNull(run);
    applySkillRunnerRunEvent({
      type: "backend.snapshot",
      runKey: run!.runKey,
      state: "running",
      updatedAt: now,
    });

    const runStatus = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/workflows/runs/run-sequence",
    });
    assert.strictEqual(runStatus.status, 200);
    assert.strictEqual(runStatus.json.result.runId, "run-sequence");
    assert.strictEqual(runStatus.json.result.state, "running");
    assert.strictEqual(runStatus.json.result.currentSkillRunId, run!.runKey);
    assert.lengthOf(runStatus.json.result.tasks, 1);
    assert.lengthOf(runStatus.json.result.skillRuns, 1);
    assert.strictEqual(runStatus.json.result.tasks[0].runId, "run-sequence");
    assert.strictEqual(
      runStatus.json.result.skillRuns[0].skillRunId,
      run!.runKey,
    );
    assert.strictEqual(
      runStatus.json.result.skillRuns[0].sequenceStepId,
      "digest",
    );
    assert.strictEqual(runStatus.json.result.skillRuns[0].sequenceStepIndex, 0);
    assert.strictEqual(
      runStatus.json.result.skillRuns[0].sequenceRole,
      "sequence_step",
    );

    const tasks = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/tasks?runId=run-sequence",
    });
    assert.strictEqual(tasks.status, 200);
    assert.lengthOf(tasks.json.result.items, 1);
    assert.strictEqual(tasks.json.result.items[0].jobId, "job-1:digest");
  });

  it("lists lightweight active tasks without private payload fields", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    const now = new Date().toISOString();
    recordWorkflowTaskUpdate({
      id: "job-running",
      workflowId: "bridge-workflow",
      request: {},
      meta: {
        runId: "run-active-1",
        workflowLabel: "Bridge Workflow",
        taskName: "Running Task",
        requestId: "request-running",
        backendId: "backend-1",
        backendType: "generic-http",
        providerId: "generic-http",
      },
      state: "running",
      createdAt: now,
      updatedAt: now,
    });
    recordWorkflowTaskUpdate({
      id: "job-succeeded",
      workflowId: "bridge-workflow",
      request: {},
      meta: {
        runId: "run-terminal-1",
        workflowLabel: "Bridge Workflow",
        taskName: "Done Task",
        requestId: "request-done",
        backendId: "backend-1",
        backendType: "generic-http",
        providerId: "generic-http",
      },
      state: "succeeded",
      createdAt: now,
      updatedAt: now,
    });
    upsertAcpSkillRun({
      requestId: "acp-retriable-1",
      status: "failed_retriable",
      runId: "run-acp-retriable",
      workflowId: "bridge-workflow",
      taskName: "Recoverable ACP Task",
      backendId: "backend-acp",
      conversationRecoveryState: "available",
      error: "Private backend error should not be exposed here",
      workspaceDir: "D:/Workspace/private/run",
      createdAt: now,
      updatedAt: now,
    });

    const parsed = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/tasks/active",
    });

    assert.strictEqual(parsed.status, 200);
    const rows = parsed.json.result.tasks as Array<Record<string, unknown>>;
    assert.sameMembers(
      rows.map((row) => row.skillRunId),
      ["request-running", "acp-retriable-1"],
    );
    for (const row of rows) {
      assert.hasAllKeys(row, [
        "workflowRunId",
        "skillRunId",
        "workflowId",
        "taskName",
        "state",
        "liveness",
        "updatedAt",
        "actions",
      ]);
      assert.notProperty(row, "error");
      assert.notProperty(row, "workspaceDir");
      assert.notProperty(row, "transcript");
    }
    const retriable = rows.find((row) => row.skillRunId === "acp-retriable-1")!;
    assert.strictEqual(retriable.liveness, "failed_retriable");
    assert.deepInclude(retriable.actions as Record<string, unknown>, {
      canConnect: true,
      isFailedRetriable: true,
    });
  });

  it("reports workflow status from ACP run summaries without task carrier rows", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    const now = new Date().toISOString();
    upsertAcpSkillRun({
      requestId: "acp-status-only-1",
      status: "waiting_user",
      runId: "run-acp-status-only",
      workflowId: "bridge-workflow",
      workflowLabel: "Bridge Workflow",
      taskName: "Waiting ACP Task",
      backendId: "backend-acp",
      backendType: "acp",
      createdAt: now,
      updatedAt: now,
    });

    const parsed = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/workflows/runs/run-acp-status-only",
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.found, true);
    assert.strictEqual(parsed.json.result.state, "waiting");
    assert.strictEqual(parsed.json.result.summary.total, 1);
    assert.strictEqual(parsed.json.result.summary.waiting_user, 1);
    assert.strictEqual(parsed.json.result.tasks.length, 0);
    assert.strictEqual(
      parsed.json.result.skillRuns[0].skillRunId,
      "acp-status-only-1",
    );
  });

  it("keeps terminal ACP task liveness separate from conversation actions", function () {
    const requestId = "acp-terminal-conversation-host";
    upsertAcpSkillRun({
      requestId,
      status: "failed",
      backendStatus: "failed",
      runId: "run-acp-terminal-conversation-host",
      workflowId: "bridge-workflow",
      taskName: "Failed ACP Task",
      backendId: "backend-acp",
      backendType: "acp",
      sessionId: "session-acp-terminal-conversation-host",
      conversationState: "closed",
      conversationRecoveryState: "available",
      applyResultState: "failed",
      error: "original workflow failure",
    });

    const detached = getHostBridgeSkillRun(requestId);
    assert.equal(detached.state, "failed");
    assert.equal(detached.liveness, "terminal");
    assert.deepInclude(detached.actions, {
      canReply: false,
      canConnect: true,
      canCancelWorkflow: false,
      isFailedRetriable: false,
    });

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
    const connected = getHostBridgeSkillRun(requestId);
    assert.equal(connected.state, "failed");
    assert.equal(connected.liveness, "terminal");
    assert.deepInclude(connected.actions, {
      canReply: true,
      canConnect: false,
      canCancelWorkflow: false,
      isFailedRetriable: false,
    });
  });

  it("reports ACP sequence workflow status from root state and concrete step runs only", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    const now = new Date().toISOString();
    initializeSequenceRunState({
      request: {
        kind: "skillrunner.sequence.v1",
        steps: [
          {
            id: "digest",
            skill_id: "digest-skill",
          },
        ],
        final_step_id: "digest",
      },
      backend: {
        id: "backend-acp",
        type: "acp",
        baseUrl: "http://127.0.0.1:8031",
      },
      workflowId: "bridge-sequence-workflow",
      workflowLabel: "Bridge Sequence Workflow",
      workflowRunId: "run-acp-sequence",
      jobId: "job-sequence-root",
    });
    upsertAcpSkillRun({
      requestId: "acp-sequence-step-1",
      status: "waiting_user",
      runId: "run-acp-sequence",
      jobId: "job-sequence-root:digest",
      workflowId: "bridge-sequence-workflow",
      workflowLabel: "Bridge Sequence Workflow",
      taskName: "Bridge Sequence Workflow / digest",
      backendId: "backend-acp",
      backendType: "acp",
      sequenceStepId: "digest",
      sequenceStepIndex: 0,
      sequenceFinalStepId: "digest",
      skillId: "digest-skill",
      createdAt: now,
      updatedAt: now,
    });

    const runStatus = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/workflows/runs/run-acp-sequence",
    });

    assert.strictEqual(runStatus.status, 200);
    assert.strictEqual(runStatus.json.result.found, true);
    assert.strictEqual(runStatus.json.result.state, "waiting");
    assert.strictEqual(runStatus.json.result.liveness, "waiting");
    assert.lengthOf(runStatus.json.result.tasks, 0);
    assert.lengthOf(runStatus.json.result.skillRuns, 1);
    assert.strictEqual(
      runStatus.json.result.skillRuns[0].skillRunId,
      "acp-sequence-step-1",
    );
    assert.strictEqual(
      runStatus.json.result.skillRuns[0].workflowRunId,
      "run-acp-sequence",
    );
    assert.strictEqual(
      runStatus.json.result.skillRuns[0].jobId,
      "job-sequence-root:digest",
    );
    assert.strictEqual(
      runStatus.json.result.skillRuns[0].sequenceStepId,
      "digest",
    );
    assert.strictEqual(
      runStatus.json.result.skillRuns[0].sequenceFinalStepId,
      "digest",
    );

    const active = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/tasks/active",
    });
    assert.strictEqual(active.status, 200);
    assert.deepEqual(
      active.json.result.tasks.map((row: any) => row.skillRunId),
      ["acp-sequence-step-1"],
    );

    assert.throws(
      () => getHostBridgeSkillRun("run-acp-sequence"),
      /Skill run not found/,
    );
  });

  it("lists recent runs and skill-run lifecycle events without transcript payloads", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    const now = new Date().toISOString();
    recordWorkflowTaskUpdate({
      id: "job-recent-running",
      workflowId: "bridge-workflow",
      request: {},
      meta: {
        runId: "run-recent-1",
        workflowLabel: "Bridge Workflow",
        taskName: "Recent Task",
        requestId: "request-recent-1",
        backendId: "backend-1",
        backendType: "generic-http",
        providerId: "generic-http",
      },
      state: "running",
      createdAt: now,
      updatedAt: now,
    });
    recordWorkflowTaskUpdate({
      id: "job-recent-done",
      workflowId: "bridge-workflow",
      request: {},
      meta: {
        runId: "run-recent-2",
        workflowLabel: "Bridge Workflow",
        taskName: "Done Task",
        requestId: "request-recent-2",
        backendId: "backend-1",
        backendType: "generic-http",
        providerId: "generic-http",
      },
      state: "succeeded",
      createdAt: now,
      updatedAt: now,
    });
    upsertAcpSkillRun({
      requestId: "acp-events-1",
      status: "waiting_user",
      runId: "run-events-1",
      workflowId: "bridge-workflow",
      taskName: "Waiting ACP Events",
      backendId: "backend-acp",
      workspaceDir: "D:/private/workspace",
      transcriptFile: "D:/private/transcript.jsonl",
      createdAt: now,
      updatedAt: now,
    });

    const recentTasks = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/tasks/recent?workflowId=bridge-workflow&limit=5",
    });
    assert.strictEqual(recentTasks.status, 200);
    assert.isAtLeast(recentTasks.json.result.items.length, 2);
    assert.notInclude(JSON.stringify(recentTasks.json.result), "transcript");
    assert.notInclude(JSON.stringify(recentTasks.json.result), "workspace");

    const workflowRuns = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/workflows/runs?workflowId=bridge-workflow&limit=5",
    });
    assert.strictEqual(workflowRuns.status, 200);
    assert.include(
      workflowRuns.json.result.runs.map(
        (entry: Record<string, unknown>) => entry.workflowRunId,
      ),
      "run-recent-1",
    );

    const skillRuns = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/skill-runs/recent?state=waiting_user&limit=5",
    });
    assert.strictEqual(skillRuns.status, 200);
    assert.include(
      skillRuns.json.result.skillRuns.map(
        (entry: Record<string, unknown>) => entry.skillRunId,
      ),
      "acp-events-1",
    );

    const events = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/skill-runs/acp-events-1/events?limit=5",
    });
    assert.strictEqual(events.status, 200);
    assert.include(
      events.json.result.events.map(
        (entry: Record<string, unknown>) => entry.type,
      ),
      "skill_run.waiting_user",
    );
    assert.notInclude(JSON.stringify(events.json.result), "transcript");
    assert.notInclude(JSON.stringify(events.json.result), "D:/private");
  });

  it("lists and acknowledges lightweight workflow notifications", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    const now = new Date().toISOString();
    recordWorkflowTaskUpdate({
      id: "job-notify-running",
      workflowId: "bridge-workflow",
      request: {},
      meta: {
        runId: "run-notify-1",
        workflowLabel: "Bridge Workflow",
        taskName: "Notify Task",
        requestId: "request-notify-1",
        backendId: "backend-1",
        backendType: "generic-http",
        providerId: "generic-http",
      },
      state: "running",
      createdAt: now,
      updatedAt: now,
    });
    recordWorkflowTaskUpdate({
      id: "job-notify-other",
      workflowId: "bridge-workflow",
      request: {},
      meta: {
        runId: "run-notify-other",
        workflowLabel: "Other Workflow",
        taskName: "Other Notify Task",
        requestId: "request-notify-other",
        backendId: "backend-1",
        backendType: "generic-http",
        providerId: "generic-http",
      },
      state: "running",
      createdAt: now,
      updatedAt: now,
    });

    const unprojected = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/notifications?workflowRunId=run-notify-1&acknowledged=false",
    });
    assert.strictEqual(unprojected.status, 200);
    assert.deepEqual(unprojected.json.result.notifications, []);

    projectWorkflowRunNotifications(
      getHostBridgeWorkflowRunStatus("run-notify-1"),
    );

    const listed = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/notifications?workflowRunId=run-notify-1&acknowledged=false",
    });

    assert.strictEqual(listed.status, 200);
    const notifications = listed.json.result.notifications as Array<
      Record<string, unknown>
    >;
    assert.sameMembers(
      notifications.map((entry) => entry.type),
      ["skill_run.started", "workflow.run.started"],
    );
    for (const notification of notifications) {
      assert.isString(notification.eventId);
      assert.strictEqual(notification.workflowRunId, "run-notify-1");
      assert.strictEqual(notification.acknowledgedAt, null);
      assert.notProperty(notification, "workspaceDir");
      assert.notProperty(notification, "transcript");
      assert.notProperty(notification, "providerPayload");
    }
    assert.isTrue(
      notifications.every((entry) => entry.workflowRunId === "run-notify-1"),
    );

    const repeated = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/notifications?workflowRunId=run-notify-1&acknowledged=false",
    });
    assert.strictEqual(repeated.status, 200);
    assert.deepEqual(
      repeated.json.result.notifications.map(
        (entry: Record<string, unknown>) => entry.eventId,
      ),
      notifications.map((entry) => entry.eventId),
    );

    const unfiltered = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/notifications?acknowledged=false",
    });
    const unfilteredAgain = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/notifications?acknowledged=false",
    });
    assert.deepEqual(
      unfilteredAgain.json.result.notifications.map(
        (entry: Record<string, unknown>) => entry.eventId,
      ),
      unfiltered.json.result.notifications.map(
        (entry: Record<string, unknown>) => entry.eventId,
      ),
    );

    const clientFirst = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/notifications?acknowledged=false&clientId=client-a",
    });
    const clientSecond = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/notifications?acknowledged=false&clientId=client-a",
    });
    const otherClient = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/notifications?acknowledged=false&clientId=client-b",
    });
    assert.deepEqual(
      clientFirst.json.result.notifications.map(
        (entry: Record<string, unknown>) => entry.eventId,
      ),
      notifications.map((entry) => entry.eventId),
    );
    assert.deepEqual(clientSecond.json.result.notifications, []);
    assert.deepEqual(
      otherClient.json.result.notifications.map(
        (entry: Record<string, unknown>) => entry.eventId,
      ),
      notifications.map((entry) => entry.eventId),
    );

    const eventId = String(notifications[0].eventId);
    const ack = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/notifications/ack",
      body: { eventIds: [eventId], clientId: "client-a" },
    });
    assert.strictEqual(ack.status, 200);
    assert.deepEqual(ack.json.result.acknowledged, [eventId]);

    const acknowledged = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/notifications?workflowRunId=run-notify-1&acknowledged=true",
    });
    assert.strictEqual(acknowledged.status, 200);
    assert.deepEqual(
      acknowledged.json.result.notifications.map(
        (entry: Record<string, unknown>) => entry.eventId,
      ),
      [eventId],
    );
    assert.isString(acknowledged.json.result.notifications[0].acknowledgedAt);
  });

  it("bounds notification inbox events and clears pruned deduplication keys", function () {
    const base = Date.now() - HOST_BRIDGE_NOTIFICATION_MAX_EVENTS * 1000;
    for (
      let index = 0;
      index < HOST_BRIDGE_NOTIFICATION_MAX_EVENTS + 5;
      index += 1
    ) {
      projectSkillRunNotification({
        skillRunId: `prune-${index}`,
        workflowRunId: "run-prune",
        workflowId: "bridge-workflow",
        taskName: `Prune Task ${index}`,
        state: "running",
        liveness: "active",
        updatedAt: new Date(base + index * 1000).toISOString(),
        actions: {
          canReply: false,
          canConnect: false,
          canCancelWorkflow: true,
          isFailedRetriable: false,
        },
      });
    }

    const prunedAck = acknowledgeHostBridgeNotificationEvents([
      "hb-notification-1",
    ]);
    assert.deepEqual(prunedAck.missing, ["hb-notification-1"]);
    assert.deepEqual(
      listHostBridgeNotificationEvents({ skillRunId: "prune-0" }).notifications,
      [],
    );

    projectSkillRunNotification({
      skillRunId: "prune-0",
      workflowRunId: "run-prune",
      workflowId: "bridge-workflow",
      taskName: "Prune Task 0",
      state: "running",
      liveness: "active",
      updatedAt: new Date().toISOString(),
      actions: {
        canReply: false,
        canConnect: false,
        canCancelWorkflow: true,
        isFailedRetriable: false,
      },
    });

    const reprojected = listHostBridgeNotificationEvents({
      skillRunId: "prune-0",
    });
    assert.strictEqual(reprojected.returned, 1);
    assert.notStrictEqual(
      reprojected.notifications[0]?.eventId,
      "hb-notification-1",
    );
  });

  it("projects waiting and recoverable ACP skill-run notifications", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    const now = new Date().toISOString();
    upsertAcpSkillRun({
      requestId: "acp-wait-notify",
      status: "waiting_user",
      runId: "run-wait-notify",
      workflowId: "bridge-workflow",
      taskName: "Waiting ACP Task",
      backendId: "backend-acp",
      createdAt: now,
      updatedAt: now,
    });
    upsertAcpSkillRun({
      requestId: "acp-retriable-notify",
      status: "failed_retriable",
      runId: "run-retriable-notify",
      workflowId: "bridge-workflow",
      taskName: "Recoverable ACP Task",
      backendId: "backend-acp",
      conversationRecoveryState: "available",
      workspaceDir: "D:/private/workspace",
      error: "private backend error",
      createdAt: now,
      updatedAt: now,
    });
    projectSkillRunNotification(getHostBridgeSkillRun("acp-wait-notify"));
    projectSkillRunNotification(getHostBridgeSkillRun("acp-retriable-notify"));

    const waiting = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/notifications?skillRunId=acp-wait-notify",
    });
    assert.strictEqual(waiting.status, 200);
    assert.deepInclude(waiting.json.result.notifications[0], {
      type: "skill_run.waiting_user",
      skillRunId: "acp-wait-notify",
      workflowRunId: "run-wait-notify",
      state: "waiting_user",
      liveness: "waiting",
    });
    assert.deepInclude(waiting.json.result.notifications[0].actions, {
      canReply: true,
    });

    const retriable = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/notifications?skillRunId=acp-retriable-notify",
    });
    assert.strictEqual(retriable.status, 200);
    assert.deepInclude(retriable.json.result.notifications[0], {
      type: "skill_run.failed_retriable",
      skillRunId: "acp-retriable-notify",
      workflowRunId: "run-retriable-notify",
      state: "failed",
      liveness: "failed_retriable",
    });
    assert.deepInclude(retriable.json.result.notifications[0].actions, {
      canConnect: true,
      isFailedRetriable: true,
    });
    assert.notProperty(retriable.json.result.notifications[0], "workspaceDir");
    assert.notProperty(retriable.json.result.notifications[0], "error");
  });

  it("records workflow cancel as an intent against workflow-level handles", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    let cancelCalls = 0;
    upsertAcpSkillRun({
      requestId: "acp-cancel-1",
      status: "running",
      runId: "run-cancel-1",
      workflowId: "bridge-workflow",
      taskName: "Cancelable ACP Task",
      backendId: "backend-acp",
    });
    registerAcpSkillRunController("acp-cancel-1", {
      cancel: async () => {
        cancelCalls += 1;
      },
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/runs/run-cancel-1/cancel",
      headers: {
        "x-zotero-bridge-scope": JSON.stringify({
          kind: "acp-skill-run",
          requestId: "acp-cancel-1",
        }),
      },
      body: {
        reason: "test",
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.accepted, true);
    assert.strictEqual(parsed.json.result.workflowRunId, "run-cancel-1");
    assert.strictEqual(parsed.json.result.permission.channel, "acp-skill-run");
    assert.strictEqual(
      parsed.json.result.affectedSkillRuns[0].skillRunId,
      "acp-cancel-1",
    );
    assert.strictEqual(cancelCalls, 1);
  });

  it("can disable unscoped workflow cancel approval from the Host Bridge preference switch", async function () {
    setPref("hostBridgeDisableWriteApproval", true);
    const token = configureHostBridgeServerForTests({
      token: "task-cancel-no-approval-token",
    });
    let cancelCalls = 0;
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "denied",
        requestId: request.requestId,
        channel: "global",
        reason: "approval should not be requested",
      };
    });
    upsertAcpSkillRun({
      requestId: "acp-cancel-no-approval",
      status: "running",
      runId: "run-cancel-no-approval",
      workflowId: "bridge-workflow",
      taskName: "Cancelable ACP Task",
      backendId: "backend-acp",
    });
    registerAcpSkillRunController("acp-cancel-no-approval", {
      cancel: async () => {
        cancelCalls += 1;
      },
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/workflows/runs/run-cancel-no-approval/cancel",
      body: {
        reason: "test",
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.accepted, true);
    assert.strictEqual(parsed.json.result.permission.outcome, "approved");
    assert.strictEqual(parsed.json.result.permission.channel, "global");
    assert.strictEqual(cancelCalls, 1);
    assert.isNull(approvalRequest);
  });

  it("exposes permission projections for approved cache invalidation", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    let permissionRequestId = "";
    let approve: (() => void) | null = null;
    configureHostBridgeGlobalApprovalHandlerForTests(
      (request) =>
        new Promise((resolve) => {
          permissionRequestId = request.requestId;
          approve = () =>
            resolve({
              outcome: "approved",
              requestId: request.requestId,
              channel: "global",
            });
        }),
    );

    const pendingInvalidate = bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/synthesis/cache/invalidate",
      body: {
        scope: "graph",
        id: "metrics",
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.match(permissionRequestId, /^host-bridge-permission-/);
    const pending = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/permissions/pending",
    });
    assert.strictEqual(pending.status, 200);
    assert.deepInclude(pending.json.result.permissions[0], {
      permissionRequestId,
      action: "synthesis.cache.invalidate",
      state: "pending",
    });
    assert.notProperty(pending.json.result.permissions[0], "payload");

    approve?.();
    const invalidated = await pendingInvalidate;
    assert.strictEqual(invalidated.status, 200);
    assert.deepInclude(invalidated.json.result, {
      invalidated: true,
      scope: "graph",
      id: "metrics",
      effect: "default_synthesis_service_invalidated",
      effectScope: "default_synthesis_service",
      scopedInvalidationApplied: false,
    });

    const resolved = await bridgeRequest({
      token,
      method: "GET",
      path: `/bridge/v2/permissions/${permissionRequestId}`,
    });
    assert.strictEqual(resolved.status, 200);
    assert.deepInclude(resolved.json.result.permission, {
      permissionRequestId,
      action: "synthesis.cache.invalidate",
      state: "approved",
    });
  });

  it("rejects unsupported cache invalidation scopes before approval", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    let requested = false;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      requested = true;
      return {
        outcome: "approved",
        requestId: request.requestId,
        channel: "global",
      };
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/synthesis/cache/invalidate",
      body: {
        scope: "sql",
      },
    });

    assert.strictEqual(parsed.status, 422);
    assert.strictEqual(parsed.json.error.code, "unsupported_cache_scope");
    assert.strictEqual(requested, false);
  });

  it("can disable synthesis cache invalidation approval from the Host Bridge preference switch", async function () {
    setPref("hostBridgeDisableWriteApproval", true);
    const token = configureHostBridgeServerForTests({
      token: "cache-invalidate-no-approval-token",
    });
    let approvalRequest: any = null;
    configureHostBridgeGlobalApprovalHandlerForTests((request) => {
      approvalRequest = request;
      return {
        outcome: "denied",
        requestId: request.requestId,
        channel: "global",
        reason: "approval should not be requested",
      };
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/synthesis/cache/invalidate",
      body: {
        scope: "graph",
      },
    });
    const pending = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/permissions/pending",
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.invalidated, true);
    assert.deepEqual(pending.json.result.permissions, []);
    assert.isNull(approvalRequest);
  });

  it("targets skill-run reply by explicit skillRunId", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    let receivedMessage = "";
    upsertAcpSkillRun({
      requestId: "acp-reply-1",
      status: "waiting_user",
      runId: "run-reply-1",
      workflowId: "bridge-workflow",
      taskName: "Interactive ACP Task",
      backendId: "backend-acp",
      pendingInteraction: {
        kind: "message",
        message: "Need input",
      },
    });
    registerAcpSkillRunController("acp-reply-1", {
      cancel: async () => undefined,
      reply: async (message: string) => {
        receivedMessage = message;
      },
    });

    const parsed = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/skill-runs/acp-reply-1/reply",
      body: {
        message: "continue",
      },
    });

    assert.strictEqual(parsed.status, 200);
    assert.strictEqual(parsed.json.result.skillRunId, "acp-reply-1");
    assert.strictEqual(receivedMessage, "continue");

    const rejected = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/skill-runs/acp-reply-1/reply",
      body: {
        message: "",
      },
    });
    assert.strictEqual(rejected.status, 400);
    assert.strictEqual(rejected.json.error.code, "invalid_request_body");
  });

  it("returns stable errors for unsupported or non-waiting skill-run interactions", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    const now = new Date().toISOString();
    const skillRunnerRun = applySkillRunnerRunEvent({
      type: "submit.local_created",
      init: {
        runKey: "skillrunner-run-1",
        backendId: "backend-sr",
        workflowId: "bridge-workflow",
        workflowRunId: "run-skillrunner-1",
        jobId: "job-skillrunner",
        taskName: "SkillRunner Task",
        createdAt: now,
        updatedAt: now,
      },
    });
    assert.isNotNull(skillRunnerRun);
    applySkillRunnerRunEvent({
      type: "backend.snapshot",
      runKey: "skillrunner-run-1",
      state: "waiting_user",
      updatedAt: now,
    });
    upsertAcpSkillRun({
      requestId: "acp-running-1",
      status: "running",
      runId: "run-acp-running",
      workflowId: "bridge-workflow",
      taskName: "Running ACP Task",
      backendId: "backend-acp",
    });

    const unsupported = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/skill-runs/skillrunner-run-1/reply",
      body: {
        message: "continue",
      },
    });
    assert.strictEqual(unsupported.status, 422);
    assert.strictEqual(
      unsupported.json.error.code,
      "unsupported_interaction_backend",
    );

    const notWaiting = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/skill-runs/acp-running-1/reply",
      body: {
        message: "continue",
      },
    });
    assert.strictEqual(notWaiting.status, 409);
    assert.strictEqual(notWaiting.json.error.code, "skill_run_not_waiting");

    const missing = await bridgeRequest({
      token,
      method: "GET",
      path: "/bridge/v2/skill-runs/missing-run",
    });
    assert.strictEqual(missing.status, 404);
    assert.strictEqual(missing.json.error.code, "skill_run_not_found");
  });

  it("connects only ACP recoverable failed skill runs", async function () {
    const token = configureHostBridgeServerForTests({ token: "task-token" });
    upsertAcpSkillRun({
      requestId: "acp-connect-1",
      status: "failed_retriable",
      runId: "run-connect-1",
      workflowId: "bridge-workflow",
      taskName: "Recoverable ACP Task",
      backendId: "backend-acp",
      conversationRecoveryState: "available",
    });
    registerAcpSkillRunController("acp-connect-1", {
      cancel: async () => undefined,
    });
    upsertAcpSkillRun({
      requestId: "acp-connect-running-1",
      status: "running",
      runId: "run-connect-running-1",
      workflowId: "bridge-workflow",
      taskName: "Running ACP Task",
      backendId: "backend-acp",
    });

    const connected = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/skill-runs/acp-connect-1/connect",
    });
    assert.strictEqual(connected.status, 200);
    assert.strictEqual(connected.json.result.skillRunId, "acp-connect-1");
    assert.strictEqual(connected.json.result.actions.canConnect, true);

    const rejected = await bridgeRequest({
      token,
      method: "POST",
      path: "/bridge/v2/skill-runs/acp-connect-running-1/connect",
    });
    assert.strictEqual(rejected.status, 409);
    assert.strictEqual(rejected.json.error.code, "skill_run_not_recoverable");
  });
});
