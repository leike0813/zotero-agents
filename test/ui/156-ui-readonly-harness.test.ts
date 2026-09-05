import { strict as assert } from "node:assert";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { JSDOM } from "jsdom";

import {
  handleRequest,
  rebuildHarnessBundles,
} from "../../scripts/ui-harness-serve";
import { parseHarnessEnv } from "../../src/modules/harness/env";
import {
  installReadonlyZoteroPrefs,
  parseZoteroPrefs,
} from "../../src/modules/harness/prefsReadonly";
import { filterHarnessVisibleWorkflows } from "../../src/modules/harness/dashboardReadonlyModel";
import { createDashboardReadonlyModel } from "../../src/modules/harness/dashboardReadonlyModel";
import { createAssistantReadonlyPublicationSession } from "../../src/modules/harness/assistantReadonlyPublication";
import {
  ASSISTANT_WORKSPACE_ACTION_REGISTRY,
  ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
  type AssistantWorkspaceOwner,
  type AssistantWorkspacePublication,
} from "../../src/modules/assistantWorkspacePublication";
import { createReadonlySqliteAdapter } from "../../src/modules/harness/sqliteReadonly";
import { createReadonlySqliteDatabase } from "../../src/modules/harness/sqliteReadonly";
import { createSynthesisReadonlyPort } from "../../src/modules/harness/synthesisReadonlyPort";
import { createSynthesisClientFromPort } from "../../src/modules/synthesisClient/clientPortAdapter";
import { createDefaultSynthesisUiState } from "../../src/modules/synthesis/uiModel";
import { toSynthesisWorkbenchReadState } from "../../src/modules/synthesisClient/workbenchUiAdapter";
import { createZoteroReadonlyHostReadPort } from "../../src/modules/harness/zoteroReadonlyLibraryAdapter";
import {
  buildHarnessSynthesisI18nEnvelope,
  resolveHarnessSynthesisLocale,
} from "../../src/modules/harness/synthesisWorkbenchI18nEnvelope";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import { resolveAssistantWorkspaceAuditLogLevel } from "../../src/modules/assistantWorkspaceSidebar";
import {
  ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS,
  ASSISTANT_WORKSPACE_SHELL_ACTIONS,
} from "../../src/shared/assistantWireContract";

async function createDatabase(filePath: string) {
  const sqlite = await import("node:sqlite");
  return new sqlite.DatabaseSync(filePath);
}

function sqlJson(value: unknown) {
  return JSON.stringify(value).replace(/'/g, "''");
}

async function createPluginStateFixture() {
  const dir = await mkdtemp(path.join(tmpdir(), "zs-plugin-state-"));
  const dbPath = path.join(dir, "zotero-agents.db");
  const db = await createDatabase(dbPath);
  db.exec(`
    CREATE TABLE plugin_task_requests (
      domain TEXT NOT NULL,
      request_id TEXT NOT NULL,
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      PRIMARY KEY (domain, request_id)
    );
    CREATE TABLE plugin_task_contexts (
      domain TEXT NOT NULL,
      context_id TEXT NOT NULL,
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      PRIMARY KEY (domain, context_id)
    );
    CREATE TABLE plugin_task_rows (
      domain TEXT NOT NULL,
      scope TEXT NOT NULL,
      task_id TEXT NOT NULL,
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL,
      PRIMARY KEY (domain, scope, task_id)
    );
    CREATE TABLE plugin_skillrunner_runs (
      run_key TEXT PRIMARY KEY,
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
    CREATE TABLE plugin_skillrunner_run_events (
      event_id TEXT PRIMARY KEY,
      run_key TEXT NOT NULL DEFAULT '',
      request_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
    CREATE TABLE plugin_workflow_sequence_runs (
      sequence_run_id TEXT PRIMARY KEY,
      workflow_run_id TEXT NOT NULL DEFAULT '',
      workflow_id TEXT NOT NULL DEFAULT '',
      backend_id TEXT NOT NULL DEFAULT '',
      backend_type TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
    INSERT INTO plugin_task_requests VALUES (
      'acp',
      'frontend',
      'acp-backend',
      'connected',
      '2026-01-01T00:00:00.000Z',
      '${sqlJson({
        activeConversationId: "conv-1",
        backendId: "acp-backend",
        sessions: [
          {
            conversationId: "conv-1",
            title: "Harness ACP Session",
            messageCount: 1,
            status: "connected",
            backendId: "acp-backend",
          },
        ],
      })}'
    );
    INSERT INTO plugin_task_requests VALUES (
      'acp',
      'conv-1',
      'acp-backend',
      'permission-required',
      '2026-01-01T00:01:00.000Z',
      '${sqlJson({
        conversationId: "conv-1",
        conversationTitle: "Harness ACP Session",
        status: "permission-required",
        pendingPermissionRequest: {
          requestId: "perm-1",
          summary: "Allow tool?",
          options: [{ id: "allow", label: "Allow" }],
        },
        authMethods: [{ id: "oauth", label: "OAuth" }],
        authMethodIds: ["oauth"],
        modeOptions: [{ id: "default", label: "Default" }],
        modelOptions: [{ id: "gpt", label: "GPT" }],
        items: [{ id: "msg-1", role: "assistant", text: "Ready" }],
      })}'
    );
    INSERT INTO plugin_task_requests VALUES (
      'acp',
      'conv-2',
      'acp-backend',
      'connected',
      '2026-01-01T00:01:30.000Z',
      '${sqlJson({
        conversationId: "conv-2",
        conversationTitle: "Second ACP Session",
        status: "connected",
        items: [
          { id: "msg-2", role: "assistant", text: "Second conversation" },
        ],
      })}'
    );
    INSERT INTO plugin_task_rows VALUES (
      'acp',
      'skill-runs',
      'acp-run-1',
      'acp-run-1',
      'acp-backend',
      'waiting_user',
      '2026-01-01T00:02:00.000Z',
      '${sqlJson({
        requestId: "acp-run-1",
        status: "waiting_user",
        backendId: "acp-backend",
        backendType: "acp",
        workflowId: "wf-acp",
        workflowLabel: "ACP Workflow",
        skillName: "Demo Skill",
        skillLabel: "Demo Skill Label",
        skillId: "skill.demo",
        conversationRecoveryState: "connected",
        connectionActionState: "idle",
        applyResultState: "pending",
        pendingPermission: {
          requestId: "skill-perm-1",
          summary: "Approve write",
          options: [{ id: "allow", label: "Allow" }],
        },
        selectedRuntimeOptions: {
          modeOptions: [{ id: "default", label: "Default" }],
        },
      })}'
    );
    INSERT INTO plugin_skillrunner_runs VALUES (
      'local:sr-workflow-run:sr-job-1',
      'sr-req-1',
      'skillrunner-backend',
      'waiting_auth',
      '2026-01-01T00:06:00.000Z',
      '${sqlJson({
        schemaVersion: "3.0.0",
        runKey: "local:sr-workflow-run:sr-job-1",
        requestId: "sr-req-1",
        backendId: "skillrunner-backend",
        workflowId: "wf-sr",
        workflowRunId: "sr-workflow-run",
        jobId: "sr-job-1",
        taskName: "Auth Run",
        skillId: "skill.auth",
        status: "waiting_auth",
        submitPhase: "request_ready",
        executionMode: "interactive",
        requestPayload: {
          pendingAuth: {
            phase: "challenge_active",
            auth_session_id: "auth-1",
            provider_id: "provider-1",
            available_methods: ["api_key"],
            input_kind: "api_key",
          },
          messages: [
            {
              seq: 1,
              ts: "2026-01-01T00:03:10.000Z",
              role: "user",
              kind: "message",
              text: "Run the auth skill",
            },
            {
              seq: 2,
              ts: "2026-01-01T00:03:20.000Z",
              role: "assistant",
              kind: "message",
              text: "Authentication is required to continue",
            },
          ],
        },
        apply: {
          state: "running",
          attempt: 1,
          maxAttempt: 3,
          updatedAt: "2026-01-01T00:03:30.000Z",
        },
        createdAt: "2026-01-01T00:03:00.000Z",
        updatedAt: "2026-01-01T00:06:00.000Z",
      })}'
    );
    INSERT INTO plugin_skillrunner_runs VALUES (
      'local:sr-workflow-run:sr-job-pre',
      '',
      'skillrunner-backend',
      'queued',
      '2026-01-01T00:05:00.000Z',
      '${sqlJson({
        schemaVersion: "3.0.0",
        runKey: "local:sr-workflow-run:sr-job-pre",
        backendId: "skillrunner-backend",
        workflowId: "wf-sr",
        workflowRunId: "sr-workflow-run",
        jobId: "sr-job-pre",
        taskName: "Pre Request Run",
        skillId: "skill.pre",
        status: "queued",
        submitPhase: "pre_request",
        executionMode: "auto",
        apply: { state: "idle", attempt: 0 },
        createdAt: "2026-01-01T00:05:00.000Z",
        updatedAt: "2026-01-01T00:05:00.000Z",
      })}'
    );
    INSERT INTO plugin_workflow_sequence_runs VALUES (
      'sr-seq-run',
      'sr-seq-run',
      'wf-sr',
      'skillrunner-backend',
      'skillrunner',
      'running_step',
      '2026-01-01T00:04:00.000Z',
      '${sqlJson({
        schema: "workflow.sequence.state.v2",
        sequenceState: {
          schemaVersion: "2.0.0",
          sequenceRunId: "sr-seq-run",
          workflowId: "wf-sr",
          workflowRunId: "sr-seq-run",
          jobId: "seq-job",
          backendId: "skillrunner-backend",
          backendType: "skillrunner",
          request: {},
          currentStepIndex: 0,
          finalStepId: "step-2",
          status: "running_step",
          steps: [
            {
              stepId: "step-1",
              skillId: "skill.seq",
              skillName: "Sequence Skill",
              index: 0,
              requestId: "sr-req-seq",
              updatedAt: "2026-01-01T00:04:00.000Z",
            },
          ],
          createdAt: "2026-01-01T00:04:00.000Z",
          updatedAt: "2026-01-01T00:04:00.000Z",
        },
      })}'
    );
    INSERT INTO plugin_skillrunner_runs VALUES (
      'local:sr-seq-run:seq-job:step-1',
      'sr-req-seq',
      'skillrunner-backend',
      'running',
      '2026-01-01T00:04:30.000Z',
      '${sqlJson({
        schemaVersion: "3.0.0",
        runKey: "local:sr-seq-run:seq-job:step-1",
        requestId: "sr-req-seq",
        backendId: "skillrunner-backend",
        workflowId: "wf-sr",
        workflowRunId: "sr-seq-run",
        jobId: "seq-job:step-1",
        taskName: "Sequence Run / step-1",
        skillId: "skill.seq",
        sequenceRunId: "sr-seq-run",
        sequenceJobId: "seq-job",
        sequenceStepId: "step-1",
        status: "running",
        submitPhase: "request_ready",
        executionMode: "auto",
        apply: { state: "idle", attempt: 0 },
        createdAt: "2026-01-01T00:04:30.000Z",
        updatedAt: "2026-01-01T00:04:30.000Z",
      })}'
    );
    INSERT INTO plugin_skillrunner_runs VALUES (
      'local:sr-workflow-run:sr-job-done',
      'sr-req-done',
      'skillrunner-backend',
      'succeeded',
      '2026-01-01T00:03:30.000Z',
      '${sqlJson({
        schemaVersion: "3.0.0",
        runKey: "local:sr-workflow-run:sr-job-done",
        requestId: "sr-req-done",
        backendId: "skillrunner-backend",
        workflowId: "wf-sr",
        workflowRunId: "sr-workflow-run",
        jobId: "sr-job-done",
        taskName: "Finished Run",
        skillId: "skill.done",
        status: "succeeded",
        submitPhase: "request_ready",
        executionMode: "auto",
        apply: { state: "succeeded", attempt: 1 },
        createdAt: "2026-01-01T00:03:30.000Z",
        updatedAt: "2026-01-01T00:03:30.000Z",
      })}'
    );
    INSERT INTO plugin_task_rows VALUES (
      'workflow-products',
      'products',
      'product-1',
      'acp-run-1',
      'acp',
      'available',
      '2026-01-01T00:04:00.000Z',
      '${sqlJson({
        productId: "product-1",
        title: "Harness Product",
        workflowId: "wf-acp",
        workflowLabel: "ACP Workflow",
        backendId: "acp-backend",
        backendType: "acp",
        requestId: "acp-run-1",
        assets: [
          {
            assetId: "summary",
            label: "Summary",
            path: "summary.md",
            relativePath: "summary.md",
          },
        ],
      })}'
    );
  `);
  db.close();
  return { dir, dbPath };
}

describe("UI readonly harness", function () {
  it("serves and boots the Dashboard browser bundle through the Harness route", async function () {
    this.timeout(30_000);
    const html = await readFile("addon/content/dashboard/index.html", "utf8");
    const scriptSource = html.match(/<script\s+src="([^"]*app\.js[^"]*)"/);
    assert.ok(scriptSource?.[1]);
    const bundleUrl = new URL(
      scriptSource[1],
      "http://127.0.0.1/content/dashboard/index.html",
    );
    assert.equal(bundleUrl.pathname, "/content/dashboard/app.js");

    assert.equal(await rebuildHarnessBundles("test:dashboard-route"), true);

    const response = {
      statusCode: 0,
      headers: {} as Record<string, string>,
      body: "",
      writeHead(status: number, headers: Record<string, string>) {
        this.statusCode = status;
        this.headers = headers;
      },
      end(body?: string | Buffer) {
        this.body = Buffer.isBuffer(body) ? body.toString("utf8") : body || "";
      },
    };
    await handleRequest(
      {
        method: "GET",
        url: `${bundleUrl.pathname}${bundleUrl.search}`,
      } as unknown as Parameters<typeof handleRequest>[0],
      response as unknown as Parameters<typeof handleRequest>[1],
    );
    assert.equal(response.statusCode, 200);
    assert.equal(
      response.headers["content-type"],
      "text/javascript; charset=utf-8",
    );
    assert.ok(response.body.length > 0);

    const dom = new JSDOM(html, {
      runScripts: "outside-only",
      url: "http://127.0.0.1/content/dashboard/index.html",
    });
    try {
      const messages: unknown[] = [];
      dom.window.addEventListener("message", (event) =>
        messages.push(event.data),
      );
      dom.window.eval(response.body);
      dom.window.postMessage(
        {
          type: "dashboard:snapshot",
          payload: {
            generatedAt: "2026-09-06T00:00:00.000Z",
            title: "Harness Dashboard",
            labels: {},
            selectedTabKey: "home",
            tabs: [{ key: "home", label: "Home", group: "system" }],
            summary: {
              total: 0,
              running: 0,
              succeeded: 0,
              failed: 0,
              canceled: 0,
            },
            runningRows: [],
            homeWorkflows: [],
          },
        },
        "*",
      );
      await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
      assert.ok(
        messages.some(
          (message) =>
            message &&
            typeof message === "object" &&
            (message as { type?: string }).type === "dashboard:action" &&
            (message as { action?: string }).action === "ready",
        ),
      );
      assert.ok(
        dom.window.document.querySelector(
          '[data-region-content="dashboard-tabbar"] button',
        ),
      );
    } finally {
      dom.window.close();
    }
  });

  it("parses path-only .env values without exposing other secrets", function () {
    const env = parseHarnessEnv(`
      # comment
      export ZOTERO_PLUGIN_DATA_DIR = "D:\\\\Workspace\\\\Artifact\\\\Zotero Skills\\\\Data" # inline
      ZOTERO_PLUGIN_PROFILE_PATH = 'C:\\\\Users\\\\me\\\\Zotero Profile'
      GITHUB_TOKEN=should-not-leak
    `);
    assert.equal(
      env.zoteroPluginDataDir,
      "D:\\\\Workspace\\\\Artifact\\\\Zotero Skills\\\\Data",
    );
    assert.equal(
      env.zoteroPluginProfilePath,
      "C:\\\\Users\\\\me\\\\Zotero Profile",
    );
    assert.deepEqual(Object.keys(env.values), [
      "ZOTERO_PLUGIN_DATA_DIR",
      "ZOTERO_PLUGIN_PROFILE_PATH",
    ]);
  });

  it("parses Zotero prefs and blocks pref writes in readonly harness", function () {
    const originalPrefs = (globalThis as any).Zotero?.Prefs;
    const values = parseZoteroPrefs(`
      user_pref("extensions.zotero.zotero-skills.workflowDir", "D:\\\\Workflows");
      user_pref("extensions.zotero.zotero-skills.backendsConfigJson", "{\\"backends\\":[]}");
      user_pref("extensions.zotero.zotero-skills.hostBridgePinnedPort", 23119);
      user_pref("extensions.zotero.zotero-skills.hostBridgeLanEnabled", true);
    `);
    try {
      installReadonlyZoteroPrefs({
        values,
        get(key: string) {
          return values[key];
        },
      });
      assert.equal(
        Zotero.Prefs.get("extensions.zotero.zotero-skills.workflowDir", true),
        "D:\\Workflows",
      );
      assert.equal(
        Zotero.Prefs.get(
          "extensions.zotero.zotero-skills.hostBridgePinnedPort",
          true,
        ),
        23119,
      );
      assert.throws(() => Zotero.Prefs.set("x", "y", true));
      assert.throws(() => Zotero.Prefs.clear("x", true));
    } finally {
      (globalThis as any).Zotero.Prefs = originalPrefs;
    }
  });

  it("filters harness workflows through the plugin debug-mode visibility rule", function () {
    const workflows = [
      {
        manifest: {
          id: "normal-workflow",
          label: "Normal Workflow",
          provider: "acp",
          hooks: {},
        },
        path: "normal",
        workflowSourceKind: "user",
      },
      {
        manifest: {
          id: "debug-workflow",
          label: "Debug Workflow",
          provider: "acp",
          debug_only: true,
          hooks: {},
        },
        path: "debug",
        workflowSourceKind: "user",
      },
    ] as any[];
    try {
      setDebugModeOverrideForTests(false);
      assert.deepEqual(
        filterHarnessVisibleWorkflows(workflows).map(
          (workflow) => workflow.manifest.id,
        ),
        ["normal-workflow"],
      );

      setDebugModeOverrideForTests(true);
      assert.deepEqual(
        filterHarnessVisibleWorkflows(workflows).map(
          (workflow) => workflow.manifest.id,
        ),
        ["normal-workflow", "debug-workflow"],
      );
    } finally {
      setDebugModeOverrideForTests();
    }
  });

  it("rejects mutating SQL statements in readonly adapter", async function () {
    const dir = await mkdtemp(path.join(tmpdir(), "zs-harness-"));
    const dbPath = path.join(dir, "state.db");
    const writer = await createDatabase(dbPath);
    writer.exec("CREATE TABLE rows(id INTEGER PRIMARY KEY, name TEXT)");
    writer.exec("INSERT INTO rows(name) VALUES ('ready')");
    writer.close();
    const adapter = await createReadonlySqliteAdapter(dbPath);
    try {
      assert.equal(adapter.get("SELECT name FROM rows")?.name, "ready");
      assert.equal(
        Number(adapter.get("PRAGMA busy_timeout")?.timeout || 0),
        5000,
      );
      assert.throws(() =>
        adapter.run("INSERT INTO rows(name) VALUES (@name)", { name: "x" }),
      );
      assert.throws(() => adapter.run("UPDATE rows SET name='x'"));
      assert.throws(() => adapter.run("DELETE FROM rows"));
      assert.throws(() => adapter.run("BEGIN IMMEDIATE"));
    } finally {
      adapter.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("opens readonly SQLite adapters through a stable backup snapshot", async function () {
    const dir = await mkdtemp(path.join(tmpdir(), "zs-harness-"));
    const dbPath = path.join(dir, "live.db");
    const writer = await createDatabase(dbPath);
    writer.exec("PRAGMA journal_mode=WAL");
    writer.exec("CREATE TABLE rows(id INTEGER PRIMARY KEY, name TEXT)");
    writer.exec("INSERT INTO rows(name) VALUES ('committed')");
    writer.exec("BEGIN IMMEDIATE");
    writer
      .prepare("INSERT INTO rows(name) VALUES (@name)")
      .run({ name: "pending" });

    const adapter = await createReadonlySqliteAdapter(dbPath);
    try {
      assert.deepEqual(
        adapter.all("SELECT name FROM rows ORDER BY id").map((row) => row.name),
        ["committed"],
      );
      writer.exec("COMMIT");
      assert.deepEqual(
        adapter.all("SELECT name FROM rows ORDER BY id").map((row) => row.name),
        ["committed"],
      );
    } finally {
      adapter.close();
      writer.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("builds aligned readonly Dashboard snapshots from plugin state DB", async function () {
    const fixture = await createPluginStateFixture();
    const originalPrefs = (globalThis as any).Zotero?.Prefs;
    const values = parseZoteroPrefs(`
      user_pref("extensions.zotero.zotero-skills.backendsConfigJson", "{\\"backends\\":[{\\"id\\":\\"skillrunner-backend\\",\\"type\\":\\"skillrunner\\",\\"displayName\\":\\"SkillRunner Backend\\",\\"baseUrl\\":\\"http://127.0.0.1:4317\\"},{\\"id\\":\\"acp-backend\\",\\"type\\":\\"acp\\",\\"displayName\\":\\"ACP Backend\\"}]}");
      user_pref("extensions.zotero.zotero-skills.skillRunnerSkillDisplayRegistryJson", "{\\"skill.auth\\":{\\"skillId\\":\\"skill.auth\\",\\"skillName\\":\\"Auth Skill\\"},\\"skill.pre\\":{\\"skillId\\":\\"skill.pre\\",\\"skillName\\":\\"Pre Skill\\"},\\"skill.done\\":{\\"skillId\\":\\"skill.done\\",\\"skillName\\":\\"Done Skill\\"}}");
    `);
    installReadonlyZoteroPrefs({
      values,
      get(key: string) {
        return values[key];
      },
    });
    const dashboard = await createDashboardReadonlyModel(fixture.dbPath);
    try {
      const before = (await stat(fixture.dbPath)).mtimeMs;
      const dashboardHome = await dashboard.handleAction("ready", {});
      assert.ok(Array.isArray(dashboardHome.tabs));
      assert.ok(
        (dashboardHome.tabs as any[]).some((tab) => tab.key === "products"),
      );
      const products = await dashboard.handleAction("select-tab", {
        tabKey: "products",
      });
      assert.equal(
        (products.productStorageView as any).selectedProduct.productId,
        "product-1",
      );
      const logs = await dashboard.handleAction("open-run", {
        backendId: "acp-backend",
        requestId: "acp-run-1",
      });
      assert.ok(logs);
      const runtimeLogs = await dashboard.handleAction("select-tab", {
        tabKey: "runtime-logs",
      });
      assert.ok(Array.isArray((runtimeLogs.runtimeLogsView as any).logs));
      assert.deepEqual((runtimeLogs.runtimeLogsView as any).filters.levels, [
        "info",
        "warn",
        "error",
      ]);
      assert.equal(
        (runtimeLogs.runtimeLogsView as any).budget.importantEntryCount,
        0,
      );
      assert.equal(
        (runtimeLogs.runtimeLogsView as any).budget.maxImportantEntries,
        0,
      );
      const skillrunnerDashboardRow = (dashboardHome.runningRows as any[]).find(
        (row) => row.backendType === "skillrunner",
      );
      assert.equal(
        skillrunnerDashboardRow.runKey,
        "local:sr-workflow-run:sr-job-1",
      );
      assert.equal(skillrunnerDashboardRow.canOpen, false);
      assert.equal(skillrunnerDashboardRow.backendInteractive, true);
      assert.equal("skillLabel" in skillrunnerDashboardRow, false);
      const preRequestDashboardRow = (dashboardHome.runningRows as any[]).find(
        (row) => row.runKey === "local:sr-workflow-run:sr-job-pre",
      );
      assert.equal(preRequestDashboardRow.requestId, undefined);
      assert.equal(preRequestDashboardRow.submitPhase, "pre_request");
      assert.equal(preRequestDashboardRow.skillName, "Pre Skill");
      assert.equal(
        (dashboardHome.runningRows as any[]).some(
          (row) => row.runKey === "sequence:sr-seq-run",
        ),
        false,
      );
      const backendView = await dashboard.handleAction("select-tab", {
        tabKey: "backend:skillrunner-backend",
      });
      const terminalDashboardRow = (backendView.backendView as any).rows.find(
        (row: any) => row.runKey === "local:sr-workflow-run:sr-job-done",
      );
      assert.equal(terminalDashboardRow.backendInteractive, true);
      assert.equal(terminalDashboardRow.canOpenStream, false);
      assert.equal(terminalDashboardRow.canCancelBackendRun, false);

      const after = (await stat(fixture.dbPath)).mtimeMs;
      assert.equal(after, before);
    } finally {
      dashboard.close();
      (globalThis as any).Zotero.Prefs = originalPrefs;
      await rm(fixture.dir, { recursive: true, force: true });
    }
  });

  function installAssistantHarnessPrefs() {
    const originalPrefs = (globalThis as any).Zotero?.Prefs;
    const values = parseZoteroPrefs(`
      user_pref("extensions.zotero.zotero-skills.backendsConfigJson", "{\\"backends\\":[{\\"id\\":\\"skillrunner-backend\\",\\"type\\":\\"skillrunner\\",\\"displayName\\":\\"SkillRunner Backend\\",\\"baseUrl\\":\\"http://127.0.0.1:4317\\"},{\\"id\\":\\"acp-backend\\",\\"type\\":\\"acp\\",\\"displayName\\":\\"ACP Backend\\"}]}");
      user_pref("extensions.zotero.zotero-skills.skillRunnerSkillDisplayRegistryJson", "{\\"skill.auth\\":{\\"skillId\\":\\"skill.auth\\",\\"skillName\\":\\"Auth Skill\\"},\\"skill.pre\\":{\\"skillId\\":\\"skill.pre\\",\\"skillName\\":\\"Pre Skill\\"},\\"skill.done\\":{\\"skillId\\":\\"skill.done\\",\\"skillName\\":\\"Done Skill\\"}}");
    `);
    installReadonlyZoteroPrefs({
      values,
      get(key: string) {
        return values[key];
      },
    });
    return () => {
      (globalThis as any).Zotero.Prefs = originalPrefs;
    };
  }

  function assertValidPublication(publication: AssistantWorkspacePublication) {
    assert.deepEqual(
      Object.keys(publication).sort(),
      [...ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS].sort(),
    );
    assert.equal(publication.schema, ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA);
    const owner = publication.owner;
    if (owner.ownerKey === null) {
      assert.deepEqual(Object.keys(owner).sort(), ["ownerKey", "source"]);
      return;
    }
    if (owner.source === "acp-chat") {
      assert.equal(
        owner.ownerKey,
        `${owner.backendId}\n${owner.conversationId}`,
      );
    } else if (owner.source === "acp-skills") {
      assert.equal(owner.ownerKey, owner.requestId);
    } else {
      assert.equal(owner.ownerKey, owner.requestId || owner.runKey);
    }
  }

  function publicationsFor(
    publications: AssistantWorkspacePublication[],
    source: AssistantWorkspaceOwner["source"],
  ) {
    return publications.filter(
      (publication) => publication.owner.source === source,
    );
  }

  function selectedOwnerFor(
    publications: AssistantWorkspacePublication[],
    source: AssistantWorkspaceOwner["source"],
  ) {
    const navigation = publications.find(
      (publication) =>
        publication.owner.source === source &&
        publication.publicationKind === "owner-navigation",
    );
    return (navigation?.payload as any)?.selectedOwner || null;
  }

  async function withAssistantSession(
    run: (
      session: Awaited<
        ReturnType<typeof createAssistantReadonlyPublicationSession>
      >,
    ) => Promise<void>,
  ) {
    const fixture = await createPluginStateFixture();
    const restorePrefs = installAssistantHarnessPrefs();
    setDebugModeOverrideForTests(true);
    const session = await createAssistantReadonlyPublicationSession({
      pluginDbPath: fixture.dbPath,
    });
    try {
      await run(session);
    } finally {
      session.close();
      setDebugModeOverrideForTests();
      restorePrefs();
      await rm(fixture.dir, { recursive: true, force: true });
    }
  }

  it("publishes a valid Assistant Workspace initialization sequence from the readonly publication session", async function () {
    await withAssistantSession(async (session) => {
      const result = await session.bootstrap();
      assert.ok(result.scopeKey);
      assert.equal(
        result.configuration.actionRegistry,
        ASSISTANT_WORKSPACE_ACTION_REGISTRY,
      );
      assert.equal(
        result.configuration.transcriptPaginationVirtualizationEnabled,
        true,
      );
      assert.deepEqual(Object.keys(result.surfaceLabels).sort(), [
        "acp-chat",
        "acp-skills",
        "skillrunner",
      ]);
      assert.ok(result.publications.length > 0);
      for (const publication of result.publications) {
        assertValidPublication(publication);
      }
      for (const source of ["acp-chat", "acp-skills", "skillrunner"] as const) {
        const owned = publicationsFor(result.publications, source);
        assert.ok(owned.length > 0, `expected publications for ${source}`);
        assert.equal(owned[0].publicationKind, "owner-navigation");
      }
      const rebootstrap = await session.bootstrap();
      assert.notEqual(rebootstrap.scopeKey, result.scopeKey);
    });
  });

  it("surfaces fixture permission and transcript data through publication payloads", async function () {
    await withAssistantSession(async (session) => {
      const result = await session.bootstrap();
      const chatPermission = result.publications.find(
        (publication) =>
          publication.owner.source === "acp-chat" &&
          publication.publicationKind === "permission",
      );
      assert.equal(
        (chatPermission?.payload as any)?.request?.requestId,
        "perm-1",
      );
      const skillPermission = result.publications.find(
        (publication) =>
          publication.owner.source === "acp-skills" &&
          publication.publicationKind === "permission",
      );
      assert.equal(
        (skillPermission?.payload as any)?.request?.requestId,
        "skill-perm-1",
      );
      const runnerTranscript = result.publications.find(
        (publication) =>
          publication.owner.source === "skillrunner" &&
          publication.publicationKind === "transcript" &&
          publication.publicationForm === "snapshot" &&
          (publication.payload as any).status === "ready",
      );
      assert.ok(runnerTranscript);
      const page = (runnerTranscript.payload as any).page;
      assert.ok(Array.isArray(page.items));
      assert.ok(page.items.length > 0);
      assert.ok(
        page.items.some(
          (item: any) => item.text === "Authentication is required to continue",
        ),
      );
      const runnerControl = result.publications.find(
        (publication) =>
          publication.owner.source === "skillrunner" &&
          publication.publicationKind === "owner-control",
      );
      assert.equal(
        (runnerControl?.payload as any)?.interaction?.auth?.phase,
        "challenge_active",
      );
      assert.equal(
        (runnerControl?.payload as any)?.authentication?.required,
        true,
      );
    });
  });

  it("records write-capable registry actions without executing them", async function () {
    await withAssistantSession(async (session) => {
      const initial = await session.bootstrap();
      const chatOwner = selectedOwnerFor(initial.publications, "acp-chat");
      assert.ok(chatOwner);
      const resolved = await session.handleMessage({
        type: "assistant-workspace:child-action",
        payload: {
          source: "acp-chat",
          action: "resolve-permission",
          actionId: "harness-resolve-permission",
          owner: chatOwner,
          payload: {
            permissionRequestId: "perm-1",
            outcome: "selected",
            optionId: "allow",
          },
        },
      });
      assert.equal(resolved.mockAction?.action, "resolve-permission");
      assert.equal(
        (resolved.mockAction?.payload as any)?.permissionRequestId,
        "perm-1",
      );
      assert.deepEqual(resolved.publications, []);
      const prompted = await session.handleMessage({
        type: "assistant-workspace:child-action",
        payload: {
          source: "acp-chat",
          action: "send-prompt",
          actionId: "harness-send-prompt",
          owner: chatOwner,
          payload: { message: "hello from the harness" },
        },
      });
      assert.equal(prompted.mockAction?.action, "send-prompt");
      assert.deepEqual(prompted.publications, []);
      // Nothing executed: a fresh bootstrap still publishes the pending
      // permission from the untouched fixture DB.
      const reboot = await session.bootstrap();
      const stillPending = reboot.publications.find(
        (publication) =>
          publication.owner.source === "acp-chat" &&
          publication.publicationKind === "permission",
      );
      assert.equal(
        (stillPending?.payload as any)?.request?.requestId,
        "perm-1",
      );
    });
  });

  it("routes owner-selection actions through owner-switch initialization", async function () {
    await withAssistantSession(async (session) => {
      await session.bootstrap();
      const conversationSelected = await session.handleMessage({
        type: "assistant-workspace:child-action",
        payload: {
          source: "acp-chat",
          action: "set-active-conversation",
          actionId: "harness-set-active-conversation",
          owner: {
            source: "acp-chat",
            ownerKey: "acp-backend\nconv-2",
            backendId: "acp-backend",
            conversationId: "conv-2",
          },
          payload: {},
        },
      });
      assert.equal(conversationSelected.mockAction ?? null, null);
      assert.ok(
        conversationSelected.publications.some(
          (publication) =>
            publication.owner.source === "acp-chat" &&
            publication.owner.ownerKey === "acp-backend\nconv-2" &&
            publication.publicationCause === "owner-switch",
        ),
      );
      const taskSelected = await session.handleMessage({
        type: "assistant-workspace:child-action",
        payload: {
          source: "skillrunner",
          action: "select-task",
          actionId: "harness-select-task",
          owner: {
            source: "skillrunner",
            ownerKey: "sr-req-done",
            requestId: "sr-req-done",
            runKey: "local:sr-workflow-run:sr-job-done",
          },
          payload: {},
        },
      });
      assert.equal(taskSelected.mockAction ?? null, null);
      assert.ok(
        taskSelected.publications.some(
          (publication) =>
            publication.owner.source === "skillrunner" &&
            publication.owner.ownerKey === "sr-req-done" &&
            publication.publicationCause === "owner-switch",
        ),
      );
    });
  });

  it("serves transcript page requests and publication acks through the runtime", async function () {
    await withAssistantSession(async (session) => {
      const initial = await session.bootstrap();
      const chatOwner = selectedOwnerFor(initial.publications, "acp-chat");
      assert.ok(chatOwner);
      const paged = await session.handleMessage({
        type: "assistant-workspace:child-action",
        payload: {
          source: "acp-chat",
          action: "load-transcript-page",
          actionId: "harness-load-transcript-page",
          owner: chatOwner,
          payload: { owner: chatOwner, request: { cursor: null, limit: 10 } },
        },
      });
      const pagePublication = paged.publications.find(
        (publication) =>
          publication.publicationKind === "transcript" &&
          publication.publicationCause === "page-request",
      );
      assert.ok(pagePublication);
      assert.equal((pagePublication.payload as any).status, "ready");
      assert.equal(
        (pagePublication.payload as any).owner?.ownerKey,
        chatOwner.ownerKey,
      );
      const target = initial.publications[initial.publications.length - 1];
      const acked = await session.handleMessage({
        type: "assistant-workspace:publication-ack",
        payload: {
          publicationId: target.publicationId,
          stage: "render-complete",
          outcome: "accepted",
          reason: null,
          failure: null,
        },
      });
      assert.deepEqual(acked.publications, []);
      const childAcked = await session.handleMessage({
        type: "assistant-workspace:child-action",
        payload: {
          source: "acp-chat",
          action: "publication-ack",
          actionId: "harness-child-ack",
          owner: chatOwner,
          payload: {
            publicationId: target.publicationId,
            stage: "child-apply",
            outcome: "accepted",
            reason: null,
            failure: null,
          },
        },
      });
      assert.deepEqual(childAcked.publications, []);
    });
  });

  it("exports only lifecycle-ready and failures for workspace UI protocol actions", function () {
    setDebugModeOverrideForTests(true);
    try {
      const events = [
        [
          "shell-set-tab",
          "shell",
          ASSISTANT_WORKSPACE_SHELL_ACTIONS.SET_TAB,
          "ok",
        ],
        [
          "child-publication-ack",
          "acp-chat",
          ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.PUBLICATION_ACK,
          "ok",
        ],
        [
          "child-render-observation",
          "acp-chat",
          ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.PUBLICATION_RENDER_OBSERVATION,
          "ok",
        ],
        [
          "child-load-page",
          "skillrunner",
          ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.LOAD_TRANSCRIPT_PAGE,
          "ok",
        ],
        ["shell-ready", "shell", ASSISTANT_WORKSPACE_SHELL_ACTIONS.READY, "ok"],
        [
          "child-ready",
          "skillrunner",
          ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS.READY,
          "ok",
        ],
        [
          "shell-set-tab-failed",
          "shell",
          ASSISTANT_WORKSPACE_SHELL_ACTIONS.SET_TAB,
          "error",
        ],
      ] as const;
      const exported = events.flatMap(([stage, tab, action, result]) => {
        const level = resolveAssistantWorkspaceAuditLogLevel({
          tab,
          action,
          result,
        });
        return level ? [{ stage, level }] : [];
      });

      assert.deepEqual(exported, [
        { stage: "shell-ready", level: "info" },
        { stage: "child-ready", level: "info" },
        { stage: "shell-set-tab-failed", level: "warn" },
      ]);
      assert.equal(exported.length, 3);
    } finally {
      setDebugModeOverrideForTests(undefined);
    }
  });

  it("keeps the Assistant harness on the publication plane", async function () {
    const host = await readFile(
      "addon/content/harness/harness-host.js",
      "utf8",
    );
    const server = await readFile("scripts/ui-harness-serve.ts", "utf8");
    assert.equal(host.includes("child-snapshot"), false);
    assert.ok(host.includes("assistant-workspace:child-publication"));
    assert.ok(server.includes("assistantReadonlyPublication"));
    assert.equal(server.includes("assistantReadonlyModel"), false);
  });

  it("maps a minimal Zotero DB fixture to synthesis library inputs", async function () {
    const dir = await mkdtemp(path.join(tmpdir(), "zs-zotero-"));
    const dbPath = path.join(dir, "zotero.sqlite");
    const db = await createDatabase(dbPath);
    db.exec(`
      CREATE TABLE itemTypes(itemTypeID INTEGER PRIMARY KEY, typeName TEXT);
      CREATE TABLE items(itemID INTEGER PRIMARY KEY, libraryID INTEGER, key TEXT, itemTypeID INTEGER, dateAdded TEXT, dateModified TEXT);
      CREATE TABLE deletedItems(itemID INTEGER);
      CREATE TABLE itemAttachments(itemID INTEGER);
      CREATE TABLE itemNotes(itemID INTEGER, parentItemID INTEGER, title TEXT, note TEXT);
      CREATE TABLE fields(fieldID INTEGER PRIMARY KEY, fieldName TEXT);
      CREATE TABLE itemData(itemID INTEGER, fieldID INTEGER, valueID INTEGER);
      CREATE TABLE itemDataValues(valueID INTEGER PRIMARY KEY, value TEXT);
      CREATE TABLE creators(creatorID INTEGER PRIMARY KEY, firstName TEXT, lastName TEXT);
      CREATE TABLE itemCreators(itemID INTEGER, creatorID INTEGER, orderIndex INTEGER);
      CREATE TABLE tags(tagID INTEGER PRIMARY KEY, name TEXT);
      CREATE TABLE itemTags(itemID INTEGER, tagID INTEGER);
      CREATE TABLE collections(collectionID INTEGER PRIMARY KEY, libraryID INTEGER, key TEXT, collectionName TEXT);
      CREATE TABLE collectionItems(collectionID INTEGER, itemID INTEGER);
      INSERT INTO itemTypes VALUES (1, 'journalArticle'), (2, 'note');
      INSERT INTO items VALUES (10, 1, 'ABCD1234', 1, '2026-01-01', '2026-01-02');
      INSERT INTO items VALUES (11, 1, 'NOTE1234', 2, '2026-01-01', '2026-01-02');
      INSERT INTO fields VALUES (1, 'title'), (2, 'date'), (3, 'DOI'), (4, 'extra');
      INSERT INTO itemDataValues VALUES (1, 'Harness Paper'), (2, '2024'), (3, '10.1234/example'), (4, 'Citation Key: harness2024');
      INSERT INTO itemData VALUES (10, 1, 1), (10, 2, 2), (10, 3, 3), (10, 4, 4);
      INSERT INTO creators VALUES (1, 'Ada', 'Lovelace');
      INSERT INTO itemCreators VALUES (10, 1, 0);
      INSERT INTO tags VALUES (1, 'synthesis');
      INSERT INTO itemTags VALUES (10, 1);
      INSERT INTO collections VALUES (1, 1, 'COLL1234', 'Harness Collection');
      INSERT INTO collectionItems VALUES (1, 10);
      INSERT INTO itemNotes VALUES (11, 10, 'Digest', '<p>readonly note</p>');
    `);
    db.close();

    const adapter = await createZoteroReadonlyHostReadPort({
      dbPath,
      libraryId: 1,
    });
    try {
      const page = await adapter.library.listItemsPage({
        libraryId: 1,
        limit: 50,
      });
      assert.equal(page.items.length, 1);
      assert.equal(page.items[0].itemKey, "ABCD1234");
      assert.equal(page.items[0].title, "Harness Paper");
      assert.deepEqual(page.items[0].creators, ["Ada Lovelace"]);
      assert.deepEqual(page.items[0].tags, ["synthesis"]);
      assert.deepEqual(page.items[0].collections, ["COLL1234"]);
      assert.equal(Object.hasOwn(page.items[0], "notes"), false);
      const scan = await adapter.artifacts.scanPage({
        libraryId: 1,
        paperRefs: ["1:ABCD1234"],
        artifactTypes: ["digest"],
        limit: 50,
      });
      assert.equal(scan.artifacts[0].paperRef, "1:ABCD1234");
      assert.equal(Object.hasOwn(scan.artifacts[0], "payload"), false);
    } finally {
      adapter.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("serves every Synthesis surface from a bounded readonly port and blocks mutations", async function () {
    const dir = await mkdtemp(path.join(tmpdir(), "zs-synthesis-readonly-"));
    const dbPath = path.join(dir, "synthesis.sqlite");
    const source = await createDatabase(dbPath);
    source.exec(`
      CREATE TABLE snapshot_marker(id INTEGER PRIMARY KEY);
      CREATE TABLE synt_topic_application_state(
        topic_id TEXT, path_id TEXT, title TEXT, definition TEXT, language TEXT,
        operation TEXT, manifest_hash TEXT, artifact_hash TEXT, metadata_hash TEXT,
        bundle_hash TEXT, paper_count INTEGER, topic_definition_json TEXT,
        topic_resolver_json TEXT, resolved_paper_set_json TEXT,
        created_at TEXT, updated_at TEXT
      );
      INSERT INTO synt_topic_application_state VALUES(
        'topic:readonly', 'readonly', 'Readonly Topic', 'Fixture definition',
        'en', 'create', 'manifest', 'artifact', 'metadata', 'bundle', 3,
        '{}', '{}', '{}', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'
      );
      CREATE TABLE synt_reference_source(
        paper_ref TEXT, library_id INTEGER, item_key TEXT, title TEXT, year TEXT,
        metadata_hash TEXT, summary_json TEXT, updated_at TEXT
      );
      INSERT INTO synt_reference_source VALUES(
        '1:ABCD1234', 1, 'ABCD1234', 'Readonly Paper', '2025',
        'sha256:0000000000000000000000000000000000000000000000000000000000000000',
        '{}', '2026-01-02T00:00:00Z'
      );
      CREATE TABLE synt_review_item(status TEXT);
      INSERT INTO synt_review_item VALUES('open'), ('resolved');
      CREATE TABLE synt_tag_vocabulary_entry(
        tag TEXT, facet TEXT, note TEXT, source TEXT, deprecated INTEGER,
        replacement TEXT, aliases_json TEXT, abbrev_json TEXT, usage_count INTEGER,
        last_synced_at TEXT, created_at TEXT, updated_at TEXT
      );
      INSERT INTO synt_tag_vocabulary_entry VALUES(
        'method:survey', 'method', 'Survey', 'fixture', 0, '', '[]', '[]', 2,
        '', '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'
      );
      CREATE TABLE synt_concept(
        concept_id TEXT, label TEXT, aliases_json TEXT, concept_type TEXT,
        domain TEXT, status TEXT, short_definition TEXT, definition TEXT,
        usage_note TEXT, editorial_note TEXT, sense_ids_json TEXT,
        created_at TEXT, updated_at TEXT
      );
      INSERT INTO synt_concept VALUES(
        'concept:readonly', 'Readonly Concept', '[]', 'method', 'research',
        'active', 'Short', 'Definition', '', '', '[]',
        '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'
      );
      CREATE TABLE synt_topic_graph_node(
        topic_id TEXT, title TEXT, definition TEXT, aliases_json TEXT,
        node_type TEXT, definition_status TEXT, current_artifact_path TEXT,
        is_root INTEGER, level TEXT, paper_count INTEGER, last_synthesis_at TEXT,
        created_at TEXT, updated_at TEXT, planning_json TEXT
      );
      INSERT INTO synt_topic_graph_node VALUES(
        'topic:readonly', 'Readonly Topic', 'Fixture definition', '[]',
        'materialized', 'has_synthesis', '', 0, 'normal', 3,
        '2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z',
        '2026-01-02T00:00:00Z', '{}'
      );
      CREATE TABLE synt_citation_graph_application_state(
        singleton_id TEXT, graph_hash TEXT, input_hash TEXT, metrics_hash TEXT,
        node_count INTEGER, edge_count INTEGER, updated_at TEXT
      );
      INSERT INTO synt_citation_graph_application_state VALUES(
        'active',
        'sha256:1111111111111111111111111111111111111111111111111111111111111111',
        'sha256:2222222222222222222222222222222222222222222222222222222222222222',
        '', 1, 0, '2026-01-02T00:00:00Z'
      );
      CREATE TABLE synt_citation_node(
        literature_item_id TEXT, node_status TEXT, has_zotero_binding INTEGER,
        title TEXT, year TEXT, authors_json TEXT, summary_json TEXT, updated_at TEXT
      );
      INSERT INTO synt_citation_node VALUES(
        '1:ABCD1234', 'active', 1, 'Readonly Paper', '2025',
        '["Ada Lovelace"]', '{}', '2026-01-02T00:00:00Z'
      );
    `);
    source.close();
    const database = await createReadonlySqliteDatabase(dbPath);
    try {
      const client = createSynthesisClientFromPort(
        createSynthesisReadonlyPort({ database, libraryId: 1 }),
      );
      const state = toSynthesisWorkbenchReadState(
        createDefaultSynthesisUiState(),
      );
      const chrome = await client.workbench.readChrome({ state });
      assert.equal(chrome.readonly, true);
      for (const surface of [
        "home",
        "topics",
        "index",
        "review",
        "graph",
        "tags",
        "concepts",
        "reader",
      ] as const) {
        try {
          const projection = await client.workbench.readSurface({
            surface,
            state,
          });
          assert.equal(projection.libraryId, 1);
        } catch (error) {
          throw new Error(
            `readonly surface failed: ${surface} ${JSON.stringify((error as any)?.details || {})}`,
            {
              cause: error,
            },
          );
        }
      }
      const home = await client.workbench.readSurface({
        surface: "home",
        state,
      });
      const index = await client.workbench.readSurface({
        surface: "index",
        state,
      });
      const tags = await client.workbench.readSurface({
        surface: "tags",
        state,
      });
      const concepts = await client.workbench.readSurface({
        surface: "concepts",
        state,
      });
      const topics = await client.workbench.readSurface({
        surface: "topics",
        state,
      });
      const graph = await client.workbench.readSurface({
        surface: "graph",
        state,
      });
      assert.deepEqual(
        home.artifacts.map((row) => row.id),
        ["topic:readonly"],
      );
      assert.deepEqual(
        index.registry.rows.map((row) => row.paper_ref),
        ["1:ABCD1234"],
      );
      assert.equal(index.reviews.summary.openCount, 1);
      assert.equal(index.reviews.summary.indexCount, 1);
      assert.deepEqual(
        tags.tags.entries.map((row) => row.tag),
        ["method:survey"],
      );
      assert.deepEqual(
        concepts.concepts.concepts.map((row) => row.concept_id),
        ["concept:readonly"],
      );
      assert.deepEqual(
        topics.topicGraph.nodes.map((row) => row.topic_id),
        ["topic:readonly"],
      );
      assert.deepEqual(
        graph.graph.nodes.map((row) => row.id),
        ["1:ABCD1234"],
      );
      await assert.rejects(
        client.graph.rebuildCitationGraphCacheNow({}),
        (error: any) => error?.code === "unavailable",
      );
    } finally {
      database.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps Synthesis harness bridge aligned with structured topic detail and readonly review actions", async function () {
    const source = await readFile("scripts/ui-harness-serve.ts", "utf8");
    const composition = await readFile(
      "src/modules/harness/synthesisReadonlyClient.ts",
      "utf8",
    );

    assert.ok(source.includes('command === "openTopicArtifact"'));
    assert.ok(source.includes("runtime.client.workbench.readChrome"));
    assert.ok(source.includes("runtime.client.workbench.readSurface"));
    assert.ok(source.includes("runtime.client.workbench.readTopicDetail"));
    assert.ok(source.includes("runtime.client.workbench.readPaperDigest"));
    assert.ok(source.includes("toSynthesisWorkbenchReadState"));
    assert.ok(source.includes("toSynthesisUiSnapshotInput"));
    assert.ok(source.includes("toSynthesisWorkbenchPaperDigestReadRequest"));
    assert.equal(source.includes("function paperDigestReadRequest"), false);
    assert.equal(
      source.includes(
        'toSynthesisJsonObject(runtime.state, "$.workbench.state")',
      ),
      false,
    );
    assert.equal(
      source.includes("input as unknown as SynthesisUiSnapshotInput"),
      false,
    );
    assert.equal(source.includes("runtime.service"), false);
    assert.equal(source.includes("getSynthesisSnapshot"), false);
    assert.ok(composition.includes("createSynthesisClientFromPort"));
    assert.ok(composition.includes("createSynthesisReadonlyPort"));
    assert.equal(composition.includes("legacyComposition"), false);
    assert.equal(composition.includes("synthesis/service"), false);
    assert.equal(composition.includes("synthesis/repository"), false);
    assert.equal(composition.includes("getRuntimePersistencePaths"), false);
    assert.equal(composition.includes("createNativeSynthesisClient"), false);
    assert.ok(source.includes('refreshSynthesisInput(runtime, "concepts")'));
    assert.ok(source.includes('type: "synthesis:topic-detail"'));
    assert.equal(source.includes('type: "synthesis:artifact"'), false);
    assert.ok(source.includes("readonlyReasonForAction(command)"));
    assert.ok(source.includes('action.includes("apply")'));
  });

  it("builds Synthesis readonly harness i18n envelopes from locale FTL files", function () {
    assert.equal(resolveHarnessSynthesisLocale("zh-CN,zh;q=0.9"), "zh-CN");
    assert.equal(resolveHarnessSynthesisLocale("fr-FR,fr;q=0.9"), "fr-FR");
    assert.equal(resolveHarnessSynthesisLocale("es-ES,es;q=0.9"), "es-ES");
    assert.equal(resolveHarnessSynthesisLocale("nl-NL,nl;q=0.9"), "en-US");

    const zh = buildHarnessSynthesisI18nEnvelope("zh-CN");
    assert.equal(zh.locale, "zh-CN");
    assert.equal(zh.messages["synthesis-page-title"], "Synthesis 工作台");
    assert.equal(zh.messages["synthesis-action-clear"], "清除");

    const es = buildHarnessSynthesisI18nEnvelope("es-ES");
    assert.equal(es.locale, "es-ES");
    assert.equal(
      es.messages["synthesis-page-title"],
      "Banco de trabajo de Synthesis",
    );

    const unknown = buildHarnessSynthesisI18nEnvelope("nl-NL");
    assert.equal(unknown.locale, "en-US");
    assert.equal(
      unknown.messages["synthesis-page-title"],
      "Synthesis Workbench",
    );
  });

  it("keeps the Synthesis locale switch in the harness shell and transport boundary", async function () {
    const html = await readFile("addon/content/harness/index.html", "utf8");
    const host = await readFile(
      "addon/content/harness/harness-host.js",
      "utf8",
    );
    const server = await readFile("scripts/ui-harness-serve.ts", "utf8");

    assert.ok(html.includes('id="harness-locale-select"'));
    assert.ok(host.includes("zsReadonlyHarnessLocale"));
    assert.ok(host.includes('"x-zs-harness-locale": state.locale'));
    assert.ok(host.includes('handleSynthesisAction(frame, "ready", {})'));
    assert.ok(server.includes("decorateSynthesisHarnessResult"));
    assert.ok(server.includes("SYNTHESIS_I18N_MESSAGE_TYPES"));
    assert.ok(server.includes("buildHarnessSynthesisI18nEnvelope"));
  });
});
