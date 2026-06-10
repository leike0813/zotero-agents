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
    INSERT INTO plugin_task_rows VALUES (
      'skillrunner',
      'active',
      'sr-task-1',
      'sr-req-1',
      'skillrunner-backend',
      'waiting_auth',
      '2026-01-01T00:03:00.000Z',
      '${sqlJson({
        requestId: "sr-req-1",
        taskName: "Auth Run",
        workflowLabel: "SkillRunner Workflow",
        status: "waiting_auth",
        pendingAuth: {
          phase: "challenge_active",
          auth_session_id: "auth-1",
          provider_id: "provider-1",
          available_methods: ["api_key"],
          input_kind: "api_key",
        },
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

  it("builds aligned readonly Dashboard and Assistant snapshots from plugin state DB", async function () {
    const fixture = await createPluginStateFixture();
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
      assert.ok((snapshots.acpSkills as any).selectedRuntimeOptions);
      assert.equal(
        (snapshots.skillrunner as any).session.authSessionId,
        "auth-1",
      );
      assert.ok(Array.isArray((snapshots.skillrunner as any).drawer.sections));
      const after = (await stat(fixture.dbPath)).mtimeMs;
      assert.equal(after, before);
    } finally {
      dashboard.close();
      assistant.close();
      await rm(fixture.dir, { recursive: true, force: true });
    }
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
    assert.ok(source.includes('type: "synthesis:topic-detail"'));
    assert.equal(source.includes('type: "synthesis:artifact"'), false);
    assert.ok(source.includes("readonlyReasonForAction(command)"));
    assert.ok(source.includes('action.includes("apply")'));
  });
});
