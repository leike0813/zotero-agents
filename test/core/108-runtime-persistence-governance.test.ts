import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  cleanupRuntimePersistenceCategory,
  getRuntimePersistencePaths,
  scanRuntimePersistenceUsage,
} from "../../src/modules/runtimePersistence";
import {
  PLUGIN_TASK_DOMAIN_ACP,
  PLUGIN_TASK_DOMAIN_SKILLRUNNER,
  clearPluginTaskDomain,
  inspectPluginStateStoreCounts,
  listPluginTaskRowEntries,
  resetPluginStateStoreForTests,
  upsertPluginTaskRequestEntry,
  upsertPluginTaskRowEntry,
} from "../../src/modules/pluginStateStore";
import {
  appendRuntimeLog,
  clearRuntimeLogs,
  flushRuntimeLogsPersistence,
  listRuntimeLogs,
} from "../../src/modules/runtimeLogManager";

describe("runtime persistence governance", function () {
  let previousRoot: string | undefined;
  let tempRoot: string;

  beforeEach(async function () {
    previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-runtime-root-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = tempRoot;
    resetPluginStateStoreForTests();
    clearRuntimeLogs();
  });

  afterEach(async function () {
    clearRuntimeLogs();
    clearPluginTaskDomain(PLUGIN_TASK_DOMAIN_SKILLRUNNER);
    clearPluginTaskDomain(PLUGIN_TASK_DOMAIN_ACP);
    resetPluginStateStoreForTests();
    if (typeof previousRoot === "undefined") {
      delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    } else {
      process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRoot;
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("resolves a managed root with semantic subdirectories", function () {
    const paths = getRuntimePersistencePaths();
    assert.equal(paths.root, tempRoot);
    assert.equal(paths.stateDbPath, path.join(tempRoot, "state", "zotero-skills.db"));
    assert.include(paths.acpChatWorkspaceDir.replace(/\\/g, "/"), "/acp/chat/workspace");
    assert.include(paths.acpChatConversationsDir.replace(/\\/g, "/"), "/acp/chat/conversations");
    assert.isFalse(
      paths.acpChatConversationsDir
        .replace(/\\/g, "/")
        .startsWith(`${paths.acpChatWorkspaceDir.replace(/\\/g, "/")}/`),
    );
    // Legacy read/migration fallback only; new private conversation writes use conversations.
    assert.include(paths.legacyAcpChatWorkspacesDir.replace(/\\/g, "/"), "/acp/chat/workspaces");
    assert.include(paths.acpSkillRunsDir.replace(/\\/g, "/"), "/acp/skill-runs");
  });

  it("scans cleanable categories without including user assets", async function () {
    const paths = getRuntimePersistencePaths();
    await fs.mkdir(path.join(paths.acpChatConversationsDir, "backend", "conversation"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(paths.acpChatConversationsDir, "backend", "conversation", "trace.txt"),
      "hello",
      "utf8",
    );
    await fs.mkdir(path.join(tempRoot, "skills"), { recursive: true });
    await fs.writeFile(path.join(tempRoot, "skills", "user-skill.txt"), "no", "utf8");

    const snapshot = await scanRuntimePersistenceUsage();
    const categories = snapshot.categories.map((entry) => entry.category);
    assert.include(categories, "acp-conversations");
    assert.notInclude(categories, "skills" as any);
    assert.isAbove(
      snapshot.categories.find((entry) => entry.category === "acp-conversations")
        ?.bytes || 0,
      0,
    );
  });

  it("cleans logs and state domains by category", async function () {
    appendRuntimeLog({
      level: "error",
      scope: "system",
      stage: "runtime-persistence-test",
      message: "test log",
    });
    await flushRuntimeLogsPersistence();
    assert.lengthOf(listRuntimeLogs(), 1);

    await cleanupRuntimePersistenceCategory("logs");
    assert.lengthOf(listRuntimeLogs(), 0);

    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_SKILLRUNNER, {
      requestId: "skill-req",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId: "acp-req",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });

    await cleanupRuntimePersistenceCategory("skillrunner-ledger");
    assert.equal(inspectPluginStateStoreCounts().requestCount, 1);

    await cleanupRuntimePersistenceCategory("acp-conversations");
    assert.equal(inspectPluginStateStoreCounts().requestCount, 0);
  });

  it("cleans ACP conversations without deleting ACP skill run rows", async function () {
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId: "acp-chat-request",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });
    upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_ACP, "active", {
      taskId: "chat-row",
      requestId: "acp-chat-request",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });
    upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_ACP, "skill-runs", {
      taskId: "skill-run-row",
      requestId: "acp-skill-run",
      backendId: "backend",
      state: "succeeded",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });

    await cleanupRuntimePersistenceCategory("acp-conversations");

    assert.lengthOf(listPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_ACP, "active"), 0);
    assert.lengthOf(
      listPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_ACP, "skill-runs"),
      1,
    );

    await cleanupRuntimePersistenceCategory("acp-skill-runs");

    assert.lengthOf(
      listPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_ACP, "skill-runs"),
      0,
    );
  });
});
