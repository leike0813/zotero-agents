import { strict as assert } from "node:assert";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { parseHarnessEnv } from "../../src/modules/harness/env";
import {
  installReadonlyZoteroPrefs,
  parseZoteroPrefs,
} from "../../src/modules/harness/prefsReadonly";
import { filterHarnessVisibleWorkflows } from "../../src/modules/harness/dashboardReadonlyModel";
import { createDashboardReadonlyModel } from "../../src/modules/harness/dashboardReadonlyModel";
import { createAssistantReadonlyModel } from "../../src/modules/harness/assistantReadonlyModel";
import { createReadonlySqliteAdapter } from "../../src/modules/harness/sqliteReadonly";
import { createZoteroReadonlyLibraryAdapter } from "../../src/modules/harness/zoteroReadonlyLibraryAdapter";
import {
  buildHarnessSynthesisI18nEnvelope,
  resolveHarnessSynthesisLocale,
} from "../../src/modules/harness/synthesisWorkbenchI18nEnvelope";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";

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
    INSERT INTO plugin_skillrunner_runs VALUES (
      'sequence:sr-seq-run',
      '',
      'skillrunner-backend',
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
              updatedAt: "2026-01-01T00:04:00.000Z"
            }
          ],
          createdAt: "2026-01-01T00:04:00.000Z",
          updatedAt: "2026-01-01T00:04:00.000Z"
        }
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

  it("builds aligned readonly Dashboard and Assistant snapshots from plugin state DB", async function () {
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
    const assistant = await createAssistantReadonlyModel(fixture.dbPath);
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

      const snapshots = assistant.snapshot();
      assert.ok((snapshots.acpChat as any).activeSnapshot);
      assert.equal(
        (snapshots.acpChat as any).activeSnapshot.pendingPermissionRequest
          .requestId,
        "perm-1",
      );
      assert.equal(
        (snapshots.acpSkills as any).selectedRun.pendingPermission.requestId,
        "skill-perm-1",
      );
      assert.equal((snapshots.acpSkills as any).selectedRun.skillName, "Demo Skill");
      assert.equal((snapshots.acpSkills as any).selectedRun.skillId, "skill.demo");
      assert.ok((snapshots.acpSkills as any).selectedRuntimeOptions);
      assert.equal(
        (snapshots.skillrunner as any).session.authSessionId,
        "auth-1",
      );
      assert.equal((snapshots.skillrunner as any).session.applyState, "running");
      assert.equal((snapshots.skillrunner as any).session.applyAttempt, 1);
      assert.equal(
        (snapshots.skillrunner as any).session.runKey,
        "local:sr-workflow-run:sr-job-1",
      );
      assert.equal("skillLabel" in (snapshots.skillrunner as any).session, false);
      assert.ok(Array.isArray((snapshots.skillrunner as any).drawer.sections));
      const activeTasks = (snapshots.skillrunner as any).drawer.sections[0]
        .groups[0].activeTasks;
      assert.equal(activeTasks[0].skillName, "Auth Skill");
      assert.equal(
        activeTasks[0].key,
        "local:sr-workflow-run:sr-job-1",
      );
      assert.equal(activeTasks[0].applyState, "running");
      assert.equal(activeTasks[0].skillId, "skill.auth");
      assert.equal("skillLabel" in activeTasks[0], false);
      const preRequestTask = activeTasks.find(
        (task: any) => task.key === "local:sr-workflow-run:sr-job-pre",
      );
      assert.equal(preRequestTask.selectable, true);
      assert.equal(preRequestTask.requestId, undefined);
      const sequenceTask = activeTasks.find(
        (task: any) => task.key === "local:sr-seq-run:seq-job:step-1",
      );
      assert.equal(sequenceTask.skillName, "Sequence Skill");
      const after = (await stat(fixture.dbPath)).mtimeMs;
      assert.equal(after, before);
    } finally {
      dashboard.close();
      assistant.close();
      (globalThis as any).Zotero.Prefs = originalPrefs;
      await rm(fixture.dir, { recursive: true, force: true });
    }
  });

  it("keeps SkillRunner connection audit renderer read-only in the Dashboard app", async function () {
    const source = await readFile(
      path.join(process.cwd(), "addon/content/dashboard/app.js"),
      "utf8",
    );
    assert.match(source, /skillrunner-connection-audit/);
    assert.match(source, /function renderSkillRunnerConnectionAudit/);
    assert.match(source, /copyTextToClipboard\(JSON\.stringify\(view, null, 2\)\)/);
    assert.doesNotMatch(source, /skillrunner-connection-audit[\s\S]{0,800}abortSkillRunnerConnections/);
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

    const adapter = await createZoteroReadonlyLibraryAdapter({
      dbPath,
      libraryId: 1,
    });
    try {
      const inputs = await adapter.getRegistryInputs();
      assert.equal(inputs.length, 1);
      assert.equal(inputs[0].itemKey, "ABCD1234");
      assert.equal(inputs[0].title, "Harness Paper");
      assert.deepEqual(inputs[0].creators, ["Ada Lovelace"]);
      assert.deepEqual(inputs[0].tags, ["synthesis"]);
      assert.deepEqual(inputs[0].collections, ["COLL1234"]);
      assert.equal(inputs[0].notes?.[0].key, "NOTE1234");
      const index = await adapter.getLibraryIndex();
      assert.equal(index.papers[0].paper_ref, "1:ABCD1234");
      assert.equal(index.collections[0].name, "Harness Collection");
    } finally {
      adapter.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps Synthesis harness bridge aligned with structured topic detail and readonly review actions", async function () {
    const source = await readFile("scripts/ui-harness-serve.ts", "utf8");

    assert.ok(source.includes('command === "openTopicArtifact"'));
    assert.ok(source.includes("runtime.service.readTopicDetail"));
    assert.ok(source.includes('refreshSynthesisInput(runtime, "concepts")'));
    assert.ok(source.includes('type: "synthesis:topic-detail"'));
    assert.equal(source.includes('type: "synthesis:artifact"'), false);
    assert.ok(source.includes("readonlyReasonForAction(command)"));
    assert.ok(source.includes('action.includes("apply")'));
  });

  it("builds Synthesis readonly harness i18n envelopes from locale FTL files", function () {
    assert.equal(resolveHarnessSynthesisLocale("zh-CN,zh;q=0.9"), "zh-CN");
    assert.equal(resolveHarnessSynthesisLocale("fr-FR,fr;q=0.9"), "fr-FR");
    assert.equal(resolveHarnessSynthesisLocale("es-ES,es;q=0.9"), "en-US");

    const zh = buildHarnessSynthesisI18nEnvelope("zh-CN");
    assert.equal(zh.locale, "zh-CN");
    assert.equal(zh.messages["synthesis-page-title"], "Synthesis 工作台");
    assert.equal(zh.messages["synthesis-action-clear"], "清除");

    const unknown = buildHarnessSynthesisI18nEnvelope("es-ES");
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
