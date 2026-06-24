import { assert } from "chai";
import { readFile } from "fs/promises";
import { handlers } from "../../src/handlers";
import { executeWorkflowFromCurrentSelection } from "../../src/modules/workflowExecute";
import {
  clearRuntimeLogs,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";
import {
  closeVisibleWorkflowToasts,
  emitWorkflowFinishSummary,
  emitWorkflowJobToasts,
  emitWorkflowStartToast,
  resetWorkflowToastStateForTests,
  selectWorkflowJobOutcomesForToasts,
  showWorkflowToast,
  shouldEmitWorkflowFinishSummaryToast,
} from "../../src/modules/workflowExecution/feedbackSeam";
import { createLocalizedMessageFormatter } from "../../src/modules/workflowExecution/messageFormatter";
import { runWorkflowPreparationSeam } from "../../src/modules/workflowExecution/preparationSeam";
import { runWorkflowApplySeam } from "../../src/modules/workflowExecution/applySeam";
import { runWorkflowExecutionSeam } from "../../src/modules/workflowExecution/runSeam";
import { buildWorkflowTaskRecordFromJob } from "../../src/modules/taskRuntime";
import {
  listSkillRunnerRunRecords,
  projectSkillRunnerRun,
} from "../../src/modules/skillRunnerRunStore";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { joinPath, mkTempDir, writeUtf8 } from "./workflow-test-utils";

async function createWorkflowRoot(args: {
  id: string;
  buildRequestBody?: string;
  applyResultBody?: string;
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
  it("uses the startup toast icon path for workflow toast lines", async function () {
    const feedback = await readFile(
      "src/modules/workflowExecution/feedbackSeam.ts",
      "utf8",
    );
    const ztoolkit = await readFile("src/utils/ztoolkit.ts", "utf8");

    assert.include(feedback, 'type: payload.type || "default"');
    assert.include(feedback, "updateIcons");
    assert.include(feedback, "progress: 100");
    assert.include(feedback, "resolveWorkflowToastIconURI");
    assert.include(feedback, "content/icons/favicon.png");
    assert.include(ztoolkit, "setIconURI(");
    assert.include(ztoolkit, '"default"');
  });

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

  it("resolves SkillRunner skill display metadata during preparation", async function () {
    const fakeWorkflow = {
      manifest: {
        id: "seam-prepare-skill-display",
        label: "Seam Prepare Skill Display",
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
      requestKind: "skillrunner.sequence.v1",
      workflowParams: {},
      providerOptions: {},
      providerId: "skillrunner",
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
        messageFormatter: createLocalizedMessageFormatter(),
        suppressUiFeedback: true,
      },
      {
        appendRuntimeLog: () => undefined,
        resolveWorkflowExecutionContext: async () =>
          fakeExecutionContext as any,
        resolveWorkflowExecutionOptionsPreview: () =>
          ({
            workflowParams: {},
            providerOptions: {},
            runOptions: {},
          }) as any,
        buildSelectionContext: async () => ({ items: [] }) as any,
        executeBuildRequests: async () =>
          [
            {
              kind: "skillrunner.sequence.v1",
              steps: [
                { id: "digest", skill_id: "literature-analysis" },
                { id: "tag", skill_id: "tag-regulator" },
              ],
              final_step_id: "tag",
            },
          ] as any,
        scanPluginSkillRegistry: async () =>
          ({
            entries: [],
            entriesById: {
              "literature-analysis": {
                skillId: "literature-analysis",
                skillName: "Literature Analysis",
              },
              "tag-regulator": {
                skillId: "tag-regulator",
                skillName: "Tag Regulator",
              },
            },
            diagnostics: [],
          }) as any,
      },
    );

    assert.equal(result.status, "ready");
    if (result.status !== "ready") {
      return;
    }
    assert.deepEqual(result.prepared.skillDisplayById, {
      "literature-analysis": {
        skillId: "literature-analysis",
        skillName: "Literature Analysis",
      },
      "tag-regulator": {
        skillId: "tag-regulator",
        skillName: "Tag Regulator",
      },
    });
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
              skill_id: "literature-analysis",
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
        skill_id: "literature-analysis",
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

  it("translates required ZoteroHostAccess into SkillRunner runtime env", async function () {
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
                env: {
                  KEEP_ME: "yes",
                  ZOTERO_BRIDGE_ENDPOINT: "http://old.example/bridge/v1",
                  ZOTERO_BRIDGE_CONNECTION_MODE: "local",
                },
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
        buildSkillRunnerHostBridgeEnv: async (args) => {
          assert.deepEqual(args, { backendUrl: "http://127.0.0.1:8030" });
          return {
            ok: true,
            endpoint: "http://127.0.0.1:27655/bridge/v1",
            connectionMode: "local",
            env: {
              ZOTERO_BRIDGE_ENDPOINT: "http://127.0.0.1:27655/bridge/v1",
              ZOTERO_BRIDGE_TOKEN: "runtime-token",
              ZOTERO_BRIDGE_CONNECTION_MODE: "local",
            },
          };
        },
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
    const runtimeOptions = (result.prepared.requests[0] as any).runtime_options;
    assert.equal(runtimeOptions.execution_mode, "interactive");
    assert.isTrue(runtimeOptions.no_cache);
    assert.notProperty(runtimeOptions, "workspace");
    const env = runtimeOptions.env;
    const scope = JSON.parse(env.ZOTERO_BRIDGE_SCOPE);
    assert.deepEqual(
      { ...env, ZOTERO_BRIDGE_SCOPE: undefined },
      {
        KEEP_ME: "yes",
        ZOTERO_BRIDGE_ENDPOINT: "http://127.0.0.1:27655/bridge/v1",
        ZOTERO_BRIDGE_TOKEN: "runtime-token",
        ZOTERO_BRIDGE_CONNECTION_MODE: "local",
        ZOTERO_BRIDGE_SCOPE: undefined,
      },
    );
    assert.equal(scope.kind, "skillrunner-run");
    assert.match(scope.frontendScopeId, /^skillrunner-scope-/);
    assert.notProperty(scope, "requestId");
    assert.notProperty(scope, "runId");
    assert.include(
      logs.map((entry) => entry.stage),
      "skillrunner_zotero_host_access_env_injected",
    );
    assert.isUndefined(
      (result.prepared.requests[0] as any).runtime_options.zotero_host_access,
    );
  });

  it("translates sequence ZoteroHostAccess into SkillRunner runtime env", async function () {
    const fakeWorkflow = {
      manifest: {
        id: "seam-skillrunner-sequence-zotero-host-access",
        label: "Seam SkillRunner Sequence ZoteroHostAccess",
        provider: "skillrunner",
        execution: {
          zoteroHostAccess: {
            required: true,
          },
        },
        request: { kind: "skillrunner.sequence.v1" },
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
      requestKind: "skillrunner.sequence.v1",
      workflowParams: {},
      providerOptions: {},
      providerId: "skillrunner",
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
              kind: "skillrunner.sequence.v1",
              steps: [
                {
                  id: "one",
                  skill_id: "debug-sequence-probe-emit",
                  mode: "auto",
                },
              ],
              final_step_id: "one",
              runtime_options: {
                env: {
                  KEEP_ME: "yes",
                  ZOTERO_BRIDGE_TOKEN: "old-token",
                },
                zotero_host_access: {
                  required: true,
                },
              },
            },
          ] as any,
        resolveWorkflowExecutionContext: async () =>
          fakeExecutionContext as any,
        buildSkillRunnerHostBridgeEnv: async () => ({
          ok: true,
          endpoint: "http://127.0.0.1:27655/bridge/v1",
          connectionMode: "local",
          env: {
            ZOTERO_BRIDGE_ENDPOINT: "http://127.0.0.1:27655/bridge/v1",
            ZOTERO_BRIDGE_TOKEN: "runtime-token",
            ZOTERO_BRIDGE_CONNECTION_MODE: "local",
          },
        }),
        alertWindow: () => undefined,
        appendRuntimeLog: () => undefined,
      },
    );

    assert.equal(result.status, "ready");
    if (result.status !== "ready") {
      return;
    }
    const runtimeOptions = (result.prepared.requests[0] as any).runtime_options;
    assert.isTrue(runtimeOptions.no_cache);
    assert.notProperty(runtimeOptions, "workspace");
    const env = runtimeOptions.env;
    const scope = JSON.parse(env.ZOTERO_BRIDGE_SCOPE);
    assert.deepEqual(
      { ...env, ZOTERO_BRIDGE_SCOPE: undefined },
      {
        KEEP_ME: "yes",
        ZOTERO_BRIDGE_ENDPOINT: "http://127.0.0.1:27655/bridge/v1",
        ZOTERO_BRIDGE_TOKEN: "runtime-token",
        ZOTERO_BRIDGE_CONNECTION_MODE: "local",
        ZOTERO_BRIDGE_SCOPE: undefined,
      },
    );
    assert.equal(scope.kind, "skillrunner-run");
    assert.match(scope.frontendScopeId, /^skillrunner-scope-/);
    assert.notProperty(scope, "requestId");
    assert.notProperty(scope, "runId");
  });

  it("does not translate sequence ZoteroHostAccess for ACP backends", async function () {
    const fakeWorkflow = {
      manifest: {
        id: "seam-acp-sequence-zotero-host-access",
        label: "Seam ACP Sequence ZoteroHostAccess",
        provider: "skillrunner",
        execution: {
          zoteroHostAccess: {
            required: true,
          },
        },
        request: { kind: "skillrunner.sequence.v1" },
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
      requestKind: "skillrunner.sequence.v1",
      workflowParams: {},
      providerOptions: {},
      providerId: "acp",
    };
    let envBuilderCalled = false;

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
              kind: "skillrunner.sequence.v1",
              steps: [
                {
                  id: "one",
                  skill_id: "debug-sequence-probe-emit",
                  mode: "auto",
                },
              ],
              final_step_id: "one",
              runtime_options: {
                zotero_host_access: {
                  required: true,
                },
              },
            },
          ] as any,
        resolveWorkflowExecutionContext: async () =>
          fakeExecutionContext as any,
        buildSkillRunnerHostBridgeEnv: async () => {
          envBuilderCalled = true;
          return {
            ok: false,
            code: "should_not_be_called",
            message: "ACP backend must not use SkillRunner env injection",
          };
        },
        alertWindow: () => undefined,
        appendRuntimeLog: () => undefined,
      },
    );

    assert.equal(result.status, "ready");
    assert.equal(envBuilderCalled, false);
    if (result.status !== "ready") {
      return;
    }
    assert.deepEqual((result.prepared.requests[0] as any).runtime_options, {
      zotero_host_access: {
        required: true,
      },
    });
  });

  it("halts SkillRunner preparation when required Host Bridge env is unavailable", async function () {
    const alerts: string[] = [];
    const fakeWorkflow = {
      manifest: {
        id: "seam-skillrunner-zotero-host-access-missing-env",
        label: "Seam SkillRunner Missing Host Bridge Env",
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
      providerId: "skillrunner",
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
      },
      {
        buildSelectionContext: async () => ({ items: { attachments: [] } }),
        executeBuildRequests: async () =>
          [
            {
              kind: "skillrunner.job.v1",
              skill_id: "literature-search-ingest",
              runtime_options: {
                zotero_host_access: {
                  required: true,
                },
              },
            },
          ] as any,
        resolveWorkflowExecutionContext: async () =>
          fakeExecutionContext as any,
        buildSkillRunnerHostBridgeEnv: async () => ({
          ok: false,
          code: "host_bridge_remote_lan_disabled",
          message: "LAN access is disabled",
          details: {
            backendUrl: "http://192.168.13.10:9813",
            advertisedHostSource: "auto",
            token: "must-not-appear",
          },
        }),
        alertWindow: (_win, message) => {
          alerts.push(message);
        },
        appendRuntimeLog: (entry) => {
          if (entry.stage === "skillrunner-host-bridge-env-unavailable") {
            assert.include(
              JSON.stringify(entry.details),
              "advertisedHostSource",
            );
            assert.notInclude(JSON.stringify(entry.details), "must-not-appear");
          }
        },
      },
    );

    assert.equal(result.status, "halted");
    assert.include(alerts[0], "host_bridge_remote_lan_disabled");
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
    assert.isFalse(
      toasts.some((entry) => /job 1\/2 succeeded/i.test(entry)),
      `success job toast should be summarized instead: ${JSON.stringify(toasts)}`,
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
      if (runtime.addon?.data) {
        if (typeof previousAddonToolkit === "undefined") {
          delete runtime.addon.data.ztoolkit;
        } else {
          runtime.addon.data.ztoolkit = previousAddonToolkit;
        }
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

  it("auto-closes the workflow start toast", function () {
    resetWorkflowToastStateForTests();
    const runtime = globalThis as { ztoolkit?: Record<string, unknown> };
    const createdToolkit = !runtime.ztoolkit;
    runtime.ztoolkit = runtime.ztoolkit || {};
    const originalProgressWindow = runtime.ztoolkit.ProgressWindow;
    const closeTimers: number[] = [];
    const showCloseTimes: Array<number | undefined> = [];
    const options: Array<Record<string, unknown> | undefined> = [];

    runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
      constructor(_title: string, ctorOptions?: Record<string, unknown>) {
        options.push(ctorOptions);
      }

      createLine() {
        return this;
      }

      show(closeTime?: number) {
        showCloseTimes.push(closeTime);
        return this;
      }

      startCloseTimer(ms: number) {
        closeTimers.push(ms);
        return this;
      }
    };

    try {
      emitWorkflowStartToast({
        workflowLabel: "Seam Feedback",
        totalJobs: 2,
        messageFormatter: createLocalizedMessageFormatter(),
      });
    } finally {
      resetWorkflowToastStateForTests();
      if (createdToolkit) {
        delete runtime.ztoolkit;
      } else {
        runtime.ztoolkit!.ProgressWindow = originalProgressWindow;
      }
    }

    assert.deepEqual(closeTimers, [2000]);
    assert.deepEqual(showCloseTimes, [2000]);
    assert.equal(options[0]?.closeTime, 2000);
  });

  it("prefixes workflow toast text with semantic emoji without duplicating existing prefixes", function () {
    resetWorkflowToastStateForTests();
    const runtime = globalThis as { ztoolkit?: Record<string, unknown> };
    const createdToolkit = !runtime.ztoolkit;
    runtime.ztoolkit = runtime.ztoolkit || {};
    const originalProgressWindow = runtime.ztoolkit.ProgressWindow;
    const texts: string[] = [];
    const icons: string[] = [];
    const types: string[] = [];
    let updateIconCalls = 0;
    const registeredIcons: Array<[string, string]> = [];

    runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
      private text = "";

      static setIconURI(key: string, uri: string) {
        registeredIcons.push([key, uri]);
      }

      createLine(args: { text?: string; icon?: string; type?: string }) {
        this.text = String(args?.text || "");
        texts.push(this.text);
        icons.push(String(args?.icon || ""));
        types.push(String(args?.type || ""));
        return this;
      }

      updateIcons() {
        updateIconCalls += 1;
        return this;
      }

      show() {
        return this;
      }

      startCloseTimer() {
        return this;
      }
    };

    try {
      showWorkflowToast({
        text: "Workflow started.",
        type: "default",
        semantic: "start",
      });
      showWorkflowToast({
        text: "Workflow succeeded.",
        type: "success",
      });
      showWorkflowToast({
        text: "✅ Already prefixed.",
        type: "success",
      });
    } finally {
      resetWorkflowToastStateForTests();
      if (createdToolkit) {
        delete runtime.ztoolkit;
      } else {
        runtime.ztoolkit!.ProgressWindow = originalProgressWindow;
      }
    }

    assert.deepEqual(texts, [
      "🚀 Workflow started.",
      "✅ Workflow succeeded.",
      "✅ Already prefixed.",
    ]);
    assert.deepEqual(types, ["default", "success", "success"]);
    assert.equal(updateIconCalls, 3);
    assert.isTrue(
      registeredIcons.every(
        ([key, icon]) =>
          ["default", "success", "error"].includes(key) &&
          icon.endsWith("/content/icons/favicon.png"),
      ),
      `workflow toast should register plugin favicon on current ProgressWindow: ${JSON.stringify(registeredIcons)}`,
    );
    assert.isTrue(
      icons.every((icon) => icon.endsWith("/content/icons/favicon.png")),
      `workflow toast icons should use plugin favicon: ${JSON.stringify(icons)}`,
    );
  });

  it("keeps apply completion summary visible while suppressing successful per-job noise", function () {
    const outcomes = [
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
    ];

    assert.deepEqual(
      selectWorkflowJobOutcomesForToasts({
        outcomes,
        totalJobs: 2,
        skipped: 0,
      }),
      [outcomes[1]],
    );
    assert.isTrue(
      shouldEmitWorkflowFinishSummaryToast({
        outcomes: [outcomes[0]],
        totalJobs: 1,
        skipped: 0,
      }),
      "single successful apply should still emit a finish summary toast",
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

  it("deduplicates workflow toasts by key and clears dedup state on reset or close", function () {
    resetWorkflowToastStateForTests();
    const runtime = globalThis as { ztoolkit?: Record<string, unknown> };
    const createdToolkit = !runtime.ztoolkit;
    runtime.ztoolkit = runtime.ztoolkit || {};
    const originalProgressWindow = runtime.ztoolkit.ProgressWindow;
    const shown: string[] = [];

    runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
      private text = "";

      createLine(args: { text?: string }) {
        this.text = String(args?.text || "");
        return this;
      }

      show() {
        shown.push(this.text);
        return this;
      }

      startCloseTimer() {
        return this;
      }

      close() {
        return this;
      }
    };

    try {
      showWorkflowToast({
        text: "first",
        type: "default",
        dedupKey: "backend:one",
        dedupWindowMs: 60_000,
      });
      showWorkflowToast({
        text: "duplicate",
        type: "default",
        dedupKey: "backend:one",
        dedupWindowMs: 60_000,
      });
      showWorkflowToast({
        text: "second backend",
        type: "default",
        dedupKey: "backend:two",
        dedupWindowMs: 60_000,
      });
      resetWorkflowToastStateForTests();
      showWorkflowToast({
        text: "after reset",
        type: "default",
        dedupKey: "backend:one",
        dedupWindowMs: 60_000,
      });
      closeVisibleWorkflowToasts();
      showWorkflowToast({
        text: "after close",
        type: "default",
        dedupKey: "backend:one",
        dedupWindowMs: 60_000,
      });
    } finally {
      resetWorkflowToastStateForTests();
      if (createdToolkit) {
        delete runtime.ztoolkit;
      } else {
        runtime.ztoolkit!.ProgressWindow = originalProgressWindow;
      }
    }

    assert.deepEqual(shown, [
      "first",
      "second backend",
      "after reset",
      "after close",
    ]);
  });

  it("closes visible workflow toasts when the plugin window unloads", function () {
    resetWorkflowToastStateForTests();
    const runtime = globalThis as { ztoolkit?: Record<string, unknown> };
    const createdToolkit = !runtime.ztoolkit;
    runtime.ztoolkit = runtime.ztoolkit || {};
    const originalProgressWindow = runtime.ztoolkit.ProgressWindow;
    const closed: string[] = [];

    runtime.ztoolkit.ProgressWindow = class MockProgressWindow {
      private text = "";

      createLine(args: { text?: string }) {
        this.text = String(args?.text || "");
        return this;
      }

      show() {
        return this;
      }

      startCloseTimer() {
        return this;
      }

      close() {
        closed.push(this.text);
        return this;
      }
    };

    try {
      showWorkflowToast(
        {
          text: "one",
          type: "default",
        },
        {
          sticky: true,
          bounded: true,
        },
      );
      showWorkflowToast(
        {
          text: "two",
          type: "default",
        },
        {
          sticky: true,
          bounded: true,
        },
      );

      closeVisibleWorkflowToasts();
      closeVisibleWorkflowToasts();
    } finally {
      resetWorkflowToastStateForTests();
      if (createdToolkit) {
        delete runtime.ztoolkit;
      } else {
        runtime.ztoolkit!.ProgressWindow = originalProgressWindow;
      }
    }

    assert.deepEqual(closed, ["one", "two"]);
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

  it("carries single SkillRunner request skill id into task metadata", function () {
    const enqueuedJobs: any[] = [];
    const queueStub = {
      enqueue(job: any) {
        enqueuedJobs.push(job);
        return `job-${enqueuedJobs.length}`;
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
              id: "seam-single-skillrunner-skill",
              label: "Seam Single SkillRunner Skill",
            },
          } as any,
          requests: [
            {
              kind: "skillrunner.job.v1",
              skill_id: "literature-analysis",
              taskName: "Selected Paper",
            },
          ],
          skillDisplayById: {
            "literature-analysis": {
              skillId: "literature-analysis",
              skillName: "Literature Analysis",
            },
          },
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
        createQueue: () => queueStub as any,
      },
    );

    assert.deepEqual(runState.jobIds, ["job-1"]);
    assert.equal(enqueuedJobs[0].meta.skillId, "literature-analysis");
    assert.equal(enqueuedJobs[0].meta.skillName, "Literature Analysis");
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

  it("projects SkillRunner sequence steps as independent task rows", async function () {
    const taskUpdates: any[] = [];
    const historyUpdates: any[] = [];
    const focusCalls: Array<Record<string, unknown>> = [];
    const runState = runWorkflowExecutionSeam(
      {
        prepared: {
          workflow: {
            manifest: {
              id: "seam-skillrunner-sequence-step-tasks",
              label: "Seam SkillRunner Sequence Step Tasks",
              provider: "skillrunner",
            },
          } as any,
          requests: [
            {
              kind: "skillrunner.sequence.v1",
              steps: [
                {
                  id: "digest",
                  skill_id: "literature-analysis",
                  mode: "auto",
                },
                {
                  id: "tag",
                  skill_id: "tag-regulator",
                  mode: "auto",
                  workspace: "reuse-workflow",
                },
              ],
              final_step_id: "tag",
            },
          ],
          skillDisplayById: {
            "literature-analysis": {
              skillId: "literature-analysis",
              skillName: "Literature Analysis",
            },
            "tag-regulator": {
              skillId: "tag-regulator",
              skillName: "Tag Regulator",
            },
          },
          skippedByFilter: 0,
          executionContext: {
            providerId: "skillrunner",
            requestKind: "skillrunner.sequence.v1",
            providerOptions: {},
            backend: {
              id: "skillrunner-backend",
              type: "skillrunner",
              baseUrl: "http://127.0.0.1:8030",
            },
          },
        },
      },
      {
        executeWithProvider: async ({ request, onProgress }) => {
          const skillId = String((request as any).skill_id || "");
          onProgress?.({
            type: "request-created",
            requestId: `${skillId}-request`,
          });
          onProgress?.({
            type: "request-ready",
            requestId: `${skillId}-request`,
          });
          return {
            status: "succeeded",
            requestId: `${skillId}-request`,
            fetchType: "result",
            resultJson: { skillId },
            responseJson: {},
          };
        },
        recordWorkflowTaskUpdate: (job: any) => {
          taskUpdates.push(job);
          return buildWorkflowTaskRecordFromJob(job);
        },
        recordTaskDashboardHistoryFromJob: (job: any) => {
          historyUpdates.push(job);
          return null as any;
        },
        focusSkillRunnerWorkspace: async (args) => {
          focusCalls.push(args as unknown as Record<string, unknown>);
        },
      },
    );

    await runState.idlePromise;

    assert.notInclude(
      taskUpdates.map((job) => job.id),
      "job-1",
    );
    assert.notIncludeMembers(
      taskUpdates.map((job) => job.id),
      ["job-1:digest", "job-1:tag"],
    );
    const projectedSteps = listSkillRunnerRunRecords()
      .filter((row) => row.sequenceJobId === "job-1")
      .map((run) => projectSkillRunnerRun({ run }))
      .sort((a, b) =>
        String(a.sequenceStepId || "").localeCompare(
          String(b.sequenceStepId || ""),
        ),
      );
    assert.deepEqual(
      projectedSteps.map((row) => ({
        id: row.id,
        runKey: row.runKey,
        requestId: row.requestId,
        skillId: row.skillId,
        skillName: row.skillName,
        sequenceStepId: row.sequenceStepId,
        state: row.state,
        submitPhase: row.submitPhase,
      })),
      [
        {
          id: `local:${runState.runId}-job-1:job-1:digest`,
          runKey: `local:${runState.runId}-job-1:job-1:digest`,
          requestId: "literature-analysis-request",
          skillId: "literature-analysis",
          skillName: "Literature Analysis",
          sequenceStepId: "digest",
          state: "succeeded",
          submitPhase: "request_ready",
        },
        {
          id: `local:${runState.runId}-job-1:job-1:tag`,
          runKey: `local:${runState.runId}-job-1:job-1:tag`,
          requestId: "tag-regulator-request",
          skillId: "tag-regulator",
          skillName: "Tag Regulator",
          sequenceStepId: "tag",
          state: "succeeded",
          submitPhase: "request_ready",
        },
      ],
    );
    assert.lengthOf(historyUpdates, 0);
    const focusedSteps = focusCalls
      .map((entry) => ({
        runKey: String(entry.runKey || ""),
        selectionChanged: entry.selectionChanged,
      }))
      .filter((entry) => entry.runKey.includes(":job-1:"));
    assert.includeMembers(
      focusedSteps.map((entry) => entry.runKey),
      [
        `local:${runState.runId}-job-1:job-1:digest`,
        `local:${runState.runId}-job-1:job-1:tag`,
      ],
    );
    assert.isTrue(
      focusedSteps.some(
        (entry) =>
          entry.runKey.endsWith(":job-1:digest") &&
          entry.selectionChanged === true,
      ),
      JSON.stringify(focusedSteps),
    );
    assert.isTrue(
      focusedSteps.some(
        (entry) =>
          entry.runKey.endsWith(":job-1:tag") &&
          entry.selectionChanged === true,
      ),
      JSON.stringify(focusedSteps),
    );
  });

  it("stores sequence step auto-reply runtime facts without providerOptions", async function () {
    const runState = runWorkflowExecutionSeam(
      {
        prepared: {
          workflow: {
            manifest: {
              id: "seam-skillrunner-sequence-auto-reply",
              label: "Seam SkillRunner Sequence Auto Reply",
              provider: "skillrunner",
            },
          } as any,
          requests: [
            {
              kind: "skillrunner.sequence.v1",
              steps: [
                {
                  id: "interactive",
                  skill_id: "interactive-skill",
                  mode: "interactive",
                },
              ],
              final_step_id: "interactive",
            },
          ],
          skippedByFilter: 0,
          executionContext: {
            providerId: "skillrunner",
            requestKind: "skillrunner.sequence.v1",
            providerOptions: {
              interactive_auto_reply: true,
              interactive_reply_timeout_sec: 30,
            },
            backend: {
              id: "skillrunner-backend-auto-reply",
              type: "skillrunner",
              baseUrl: "http://127.0.0.1:8030",
            },
          },
        },
      },
      {
        executeWithProvider: async ({ request, onProgress }) => {
          const skillId = String((request as any).skill_id || "");
          onProgress?.({
            type: "request-created",
            requestId: `${skillId}-request`,
          });
          onProgress?.({
            type: "request-ready",
            requestId: `${skillId}-request`,
          });
          return {
            status: "succeeded",
            requestId: `${skillId}-request`,
            fetchType: "result",
            resultJson: { skillId },
            responseJson: {},
          };
        },
        openAssistantWorkspaceSidebar: async () => undefined,
      } as any,
    );

    await runState.idlePromise;

    const stepRun = listSkillRunnerRunRecords().find(
      (row) =>
        row.sequenceRunId === `${runState.runId}-job-1` &&
        row.sequenceStepId === "interactive",
    );
    const payload = stepRun?.requestPayload as any;
    assert.isOk(stepRun);
    assert.isUndefined(payload?.providerOptions);
    assert.equal(payload?.runtime_options?.execution_mode, "interactive");
    assert.equal(payload?.runtime_options?.interactive_auto_reply, true);
    assert.equal(payload?.runtime_options?.interactive_reply_timeout_sec, 30);
  });

  it("does not register ACP-compatible runs for SkillRunner settlement", async function () {
    const selectedAcpRuns: string[] = [];
    const taskUpdates: any[] = [];
    const runState = runWorkflowExecutionSeam(
      {
        prepared: {
          workflow: {
            manifest: {
              id: "seam-acp-compatible-skillrunner-provider",
              label: "Seam ACP Compatible SkillRunner Provider",
              provider: "skillrunner",
            },
          } as any,
          requests: [
            {
              kind: "acp.skill.run.v1",
              skill_id: "debug-host-bridge-connectivity-probe",
            },
          ],
          skippedByFilter: 0,
          executionContext: {
            providerId: "skillrunner",
            requestKind: "acp.skill.run.v1",
            providerOptions: {},
            backend: {
              id: "acp-backend",
              type: "acp",
              baseUrl: "http://127.0.0.1:8031",
            },
          },
        },
      },
      {
        executeWithProvider: async ({ onProgress }) => {
          onProgress?.({
            type: "request-ready",
            requestId: "acp-skill-compatible-request",
          });
          return {
            status: "succeeded",
            requestId: "acp-skill-compatible-request",
            fetchType: "result",
            resultJson: { ok: true },
            responseJson: { provider: "acp" },
          };
        },
        recordWorkflowTaskUpdate: (job: any) => {
          taskUpdates.push(job);
        },
        recordTaskDashboardHistoryFromJob: () => null as any,
        selectAcpSkillRun: (requestId: string) => {
          selectedAcpRuns.push(requestId);
        },
      },
    );

    await runState.idlePromise;

    assert.deepEqual(selectedAcpRuns, ["acp-skill-compatible-request"]);
    assert.isTrue(taskUpdates.every((job) => job.meta.backendType === "acp"));
  });

  it("skips final apply when the final sequence step owns applyResult", async function () {
    let applyCalled = false;
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
            requestId: "final-request",
            fetchType: "result",
            resultJson: { ok: true },
            responseJson: {},
            sequence: {
              workflow_run_id: "workflow-run-1",
              final_step_id: "final",
              steps: [
                {
                  step_id: "final",
                  request_id: "final-request",
                  output: { ok: true },
                  result: {
                    status: "succeeded",
                    requestId: "final-request",
                    fetchType: "result",
                    resultJson: { ok: true },
                    responseJson: {},
                  },
                  apply_result: {
                    status: "succeeded",
                    workflow_id: "final-workflow",
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
          requests: [
            {
              kind: "skillrunner.sequence.v1",
              targetParentID: 123,
              final_step_id: "final",
              steps: [
                {
                  id: "final",
                  skill_id: "final-skill",
                  mode: "auto",
                  apply_result: { workflow_id: "final-workflow" },
                },
              ],
            },
          ],
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
        executeApplyResult: async () => {
          applyCalled = true;
          return { ok: true };
        },
      },
    );

    assert.equal(summary.succeeded, 1);
    assert.equal(applyCalled, false);
    assert.deepInclude(
      summary.jobOutcomes[0].structuredApplyResult as Record<string, unknown>,
      { skipped_final_apply: true },
    );
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

  it("selects auto SkillRunner tasks on submit without opening the Assistant shell", function () {
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
              id: "seam-skillrunner-auto-focus",
              label: "Seam SkillRunner Auto Focus",
            },
          } as any,
          requests: [
            { targetParentID: 3, runtime_options: { execution_mode: "auto" } },
          ],
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
        workflowId: "seam-skillrunner-auto-focus",
        request: {
          targetParentID: 3,
          runtime_options: { execution_mode: "auto" },
        },
        meta: {
          index: 0,
          runId: "run-sr-auto-focus",
          providerId: "skillrunner",
          requestKind: "skillrunner.job.v1",
          backendId: "backend-1",
          backendType: "skillrunner",
          backendBaseUrl: "http://127.0.0.1:8030",
        },
        state: "running",
        createdAt: "2026-04-17T00:00:00.000Z",
        updatedAt: "2026-04-17T00:00:00.000Z",
      },
      {
        type: "request-creating",
      },
    );

    assert.lengthOf(assistantCalls, 0);
    assert.lengthOf(focusCalls, 1);
    assert.match(String(focusCalls[0].runKey || ""), /^local:run-[^:]+:job-1$/);
    assert.isUndefined(focusCalls[0].taskId);
    assert.isUndefined(focusCalls[0].localRunId);
    assert.isUndefined(focusCalls[0].requestId);

    const onJobUpdated = capturedQueueConfig?.onJobUpdated as
      | ((job: Record<string, unknown>) => void)
      | undefined;
    assert.isFunction(onJobUpdated);
    const readyJob = {
      id: "job-1",
      workflowId: "seam-skillrunner-auto-focus",
      request: {
        targetParentID: 3,
        runtime_options: { execution_mode: "auto" },
      },
      meta: {
        index: 0,
        runId: "run-sr-auto-focus",
        providerId: "skillrunner",
        requestKind: "skillrunner.job.v1",
        backendId: "backend-1",
        backendType: "skillrunner",
        backendBaseUrl: "http://127.0.0.1:8030",
        requestId: "req-auto-focus",
      },
      state: "running",
      createdAt: "2026-04-17T00:00:00.000Z",
      updatedAt: "2026-04-17T00:00:00.000Z",
    };
    onJobProgress?.(readyJob, {
      type: "request-ready",
      requestId: "req-auto-focus",
    });
    onJobUpdated?.(readyJob);

    assert.lengthOf(assistantCalls, 0);
    assert.lengthOf(focusCalls, 1);
  });

  it("opens interactive SkillRunner tasks in the Assistant shell on submit", function () {
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
            },
          } as any,
          requests: [
            {
              targetParentID: 3,
              runtime_options: { execution_mode: "interactive" },
            },
          ],
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
    const onJobUpdated = capturedQueueConfig?.onJobUpdated as
      | ((job: Record<string, unknown>) => void)
      | undefined;
    assert.isFunction(onJobProgress);
    assert.isFunction(onJobUpdated);

    onJobProgress?.(
      {
        id: "job-1",
        workflowId: "seam-skillrunner-interactive-sidebar",
        request: {
          targetParentID: 3,
          runtime_options: { execution_mode: "interactive" },
        },
        meta: {
          index: 0,
          runId: "run-sr-interactive-focus",
          providerId: "skillrunner",
          requestKind: "skillrunner.job.v1",
          backendId: "backend-1",
          backendType: "skillrunner",
          backendBaseUrl: "http://127.0.0.1:8030",
        },
        state: "running",
        createdAt: "2026-04-17T00:00:00.000Z",
        updatedAt: "2026-04-17T00:00:00.000Z",
      },
      {
        type: "request-creating",
      },
    );

    assert.lengthOf(focusCalls, 0);
    assert.lengthOf(assistantCalls, 1);
    assert.equal(assistantCalls[0].tab, "skillrunner");
    assert.match(
      String(assistantCalls[0].runKey || ""),
      /^local:run-[^:]+:job-1$/,
    );
    assert.isUndefined(assistantCalls[0].taskId);
    assert.isUndefined(assistantCalls[0].localRunId);
    assert.isUndefined(assistantCalls[0].requestId);

    const readyJob = {
      id: "job-1",
      workflowId: "seam-skillrunner-interactive-sidebar",
      request: {
        targetParentID: 3,
        runtime_options: { execution_mode: "interactive" },
      },
      meta: {
        index: 0,
        runId: "run-sr-interactive-focus",
        providerId: "skillrunner",
        requestKind: "skillrunner.job.v1",
        backendId: "backend-1",
        backendType: "skillrunner",
        backendBaseUrl: "http://127.0.0.1:8030",
        requestId: "req-1",
      },
      state: "running",
      createdAt: "2026-04-17T00:00:00.000Z",
      updatedAt: "2026-04-17T00:00:00.000Z",
    };
    onJobProgress?.(readyJob, {
      type: "request-ready",
      requestId: "req-1",
    });
    onJobUpdated?.(readyJob);

    assert.lengthOf(focusCalls, 0);
    assert.lengthOf(assistantCalls, 1);
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
            },
          } as any,
          requests: [
            { targetParentID: 3, runtime_options: { execution_mode: "auto" } },
          ],
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
        request: {
          targetParentID: 3,
          runtime_options: { execution_mode: "auto" },
        },
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
            },
          } as any,
          requests: [
            {
              targetParentID: 3,
              runtime_options: { execution_mode: "interactive" },
            },
          ],
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
