import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  cleanupRuntimePersistenceRetention,
  cleanupRuntimePersistenceCategory,
  getRuntimePersistencePaths,
  scanRuntimePersistenceUsage,
  validateManagedAbsolutePath,
  validateManagedRelativePath,
  validateManagedRelativePathSet,
} from "../../src/modules/runtimePersistence";
import { getTaskHistoryRetentionConfig } from "../../src/modules/taskRetentionPolicy";
import {
  getAcpSkillRunRecord,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import { setDebugModeOverrideForTests } from "../../src/modules/debugMode";
import {
  cleanupPersistenceIssues,
  scanPersistenceIntegrity,
} from "../../src/modules/persistenceIntegrity";
import {
  buildSynthesisKnowledgeGraphPaths,
  buildSynthesisStoragePaths,
} from "../../src/modules/synthesis/foundation";
import {
  PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS,
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

const execFileAsync = promisify(execFile);

async function pathExists(pathRaw: string) {
  try {
    await fs.stat(pathRaw);
    return true;
  } catch {
    return false;
  }
}

describe("runtime persistence governance", function () {
  let previousRoot: string | undefined;
  let tempRoot: string;

  beforeEach(async function () {
    previousRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "zs-runtime-root-"));
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = tempRoot;
    resetPluginStateStoreForTests();
    resetAcpSkillRunsForTests();
    clearRuntimeLogs();
    setDebugModeOverrideForTests(true);
  });

  afterEach(async function () {
    clearRuntimeLogs();
    clearPluginTaskDomain(PLUGIN_TASK_DOMAIN_SKILLRUNNER);
    clearPluginTaskDomain(PLUGIN_TASK_DOMAIN_ACP);
    clearPluginTaskDomain(PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS);
    resetPluginStateStoreForTests();
    resetAcpSkillRunsForTests();
    setDebugModeOverrideForTests();
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
    assert.equal(
      paths.stateDbPath,
      path.join(tempRoot, "state", "zotero-agents.db"),
    );
    assert.equal(paths.dataDir, path.join(tempRoot, "data"));
    assert.equal(
      paths.synthesisDataRoot,
      path.join(tempRoot, "data", "synthesis"),
    );
    assert.equal(paths.runtimeRoot, path.join(tempRoot, "runtime"));
    assert.include(
      paths.acpChatWorkspaceDir.replace(/\\/g, "/"),
      "/acp/chat/workspace",
    );
    assert.include(
      paths.acpChatConversationsDir.replace(/\\/g, "/"),
      "/acp/chat/conversations",
    );
    assert.isFalse(
      paths.acpChatConversationsDir
        .replace(/\\/g, "/")
        .startsWith(`${paths.acpChatWorkspaceDir.replace(/\\/g, "/")}/`),
    );
    // Legacy read/migration fallback only; new private conversation writes use conversations.
    assert.include(
      paths.legacyAcpChatWorkspacesDir.replace(/\\/g, "/"),
      "/acp/chat/workspaces",
    );
    assert.include(
      paths.acpSkillRunsDir.replace(/\\/g, "/"),
      "/acp/skill-runs",
    );
  });

  it("resolves durable synthesis canonical paths under data, not runtime", function () {
    const paths = getRuntimePersistencePaths();
    const topicPaths = buildSynthesisStoragePaths(paths.root, "topic-alpha");
    const topicPathsFromData = buildSynthesisStoragePaths(
      paths.dataDir,
      "topic-alpha",
    );
    const topicPathsFromSynthesisData = buildSynthesisStoragePaths(
      paths.synthesisDataRoot,
      "topic-alpha",
    );
    const graphPaths = buildSynthesisKnowledgeGraphPaths(paths.root);

    assert.equal(topicPaths.synthesisRoot, paths.synthesisDataRoot);
    assert.equal(topicPathsFromData.synthesisRoot, paths.synthesisDataRoot);
    assert.equal(
      topicPathsFromSynthesisData.synthesisRoot,
      paths.synthesisDataRoot,
    );
    assert.equal(graphPaths.synthesisRoot, paths.synthesisDataRoot);
    assert.equal(
      topicPaths.currentManifest,
      path.join(
        paths.synthesisDataRoot,
        "topics",
        "topic-alpha",
        "current",
        "manifest.json",
      ),
    );
    assert.notInclude(
      topicPaths.currentManifest.replace(/\\/g, "/"),
      "/runtime/synthesis/",
    );
  });

  it("uses Zotero DataDirectory scoped zotero-agents root when no override is set", function () {
    delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    const previousDataDirectory = (globalThis as any).Zotero?.DataDirectory;
    const dataDirectory = path.join(tempRoot, "zotero-data");
    const zotero = (globalThis as any).Zotero || {};
    zotero.DataDirectory = { dir: dataDirectory };
    try {
      const paths = getRuntimePersistencePaths();
      assert.equal(paths.root, path.join(dataDirectory, "zotero-agents"));
      assert.equal(
        paths.stateDbPath,
        path.join(dataDirectory, "zotero-agents", "state", "zotero-agents.db"),
      );
    } finally {
      (globalThis as any).Zotero.DataDirectory = previousDataDirectory;
      process.env.ZOTERO_SKILLS_RUNTIME_ROOT = tempRoot;
    }
  });

  it("scans cleanable categories without including user assets", async function () {
    const paths = getRuntimePersistencePaths();
    await fs.mkdir(
      path.join(paths.acpChatConversationsDir, "backend", "conversation"),
      {
        recursive: true,
      },
    );
    await fs.writeFile(
      path.join(
        paths.acpChatConversationsDir,
        "backend",
        "conversation",
        "trace.txt",
      ),
      "hello",
      "utf8",
    );
    await fs.mkdir(path.join(tempRoot, "skills"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, "skills", "user-skill.txt"),
      "no",
      "utf8",
    );
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_SKILLRUNNER, {
      requestId: "skill-req",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId: "acp-chat-req",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });
    upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_ACP, "skill-runs", {
      taskId: "skill-run-row",
      requestId: "acp-skill-run",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });

    const snapshot = await scanRuntimePersistenceUsage();
    const categories = snapshot.categories.map((entry) => entry.category);
    assert.include(categories, "acp-conversations");
    assert.notInclude(categories, "state");
    assert.notInclude(categories, "skills" as any);
    assert.isAbove(
      snapshot.categories.find(
        (entry) => entry.category === "acp-conversations",
      )?.bytes || 0,
      0,
    );
    assert.equal(
      snapshot.categories.find(
        (entry) => entry.category === "skillrunner-ledger",
      )?.recordCount,
      1,
    );
    assert.isAbove(
      snapshot.categories.find(
        (entry) => entry.category === "skillrunner-ledger",
      )?.bytes || 0,
      0,
    );
    assert.equal(
      snapshot.categories.find(
        (entry) => entry.category === "acp-conversations",
      )?.recordCount,
      1,
    );
    assert.isAbove(
      snapshot.categories.find(
        (entry) => entry.category === "acp-conversations",
      )?.bytes || 0,
      0,
    );
    assert.equal(
      snapshot.categories.find((entry) => entry.category === "acp-skill-runs")
        ?.recordCount,
      1,
    );
    assert.isAbove(
      snapshot.categories.find((entry) => entry.category === "acp-skill-runs")
        ?.bytes || 0,
      0,
    );
    assert.equal(snapshot.stateDatabase?.path, paths.stateDbPath);
  });

  it("does not report legacy runtime data as a persistence category", async function () {
    const previousDataDirectory = (globalThis as any).Zotero?.DataDirectory;
    const dataDirectory = path.join(tempRoot, "zotero-data");
    const currentRoot = path.join(dataDirectory, "zotero-agents");
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = currentRoot;
    const zotero = (globalThis as any).Zotero || {};
    zotero.DataDirectory = { dir: dataDirectory };
    try {
      const legacyRoot = path.join(dataDirectory, "zotero-skills");
      await fs.mkdir(legacyRoot, { recursive: true });
      await fs.writeFile(path.join(legacyRoot, "old.txt"), "legacy", "utf8");

      setDebugModeOverrideForTests(false);
      const hiddenSnapshot = await scanRuntimePersistenceUsage();
      assert.notInclude(
        hiddenSnapshot.categories.map((entry) => entry.category),
        "legacy",
      );

      setDebugModeOverrideForTests(true);
      const visibleSnapshot = await scanRuntimePersistenceUsage();
      assert.notInclude(
        visibleSnapshot.categories.map((entry) => entry.category),
        "legacy" as any,
      );
      assert.equal(
        await fs.readFile(path.join(legacyRoot, "old.txt"), "utf8"),
        "legacy",
      );
    } finally {
      (globalThis as any).Zotero.DataDirectory = previousDataDirectory;
      process.env.ZOTERO_SKILLS_RUNTIME_ROOT = tempRoot;
      setDebugModeOverrideForTests(true);
    }
  });

  it("validates managed relative paths without rejecting long managed roots", function () {
    const invalidSamples = [
      "../tags/manifest.json",
      "/tags/manifest.json",
      "C:/tags/manifest.json",
      "tags/CON.json",
      "tags/name .json",
      "tags/has space.json",
      `tags/${"x".repeat(97)}.json`,
      `tags/${"x".repeat(215)}.json`,
    ];
    for (const sample of invalidSamples) {
      assert.isFalse(
        validateManagedRelativePath(sample).ok,
        `expected invalid managed path: ${sample}`,
      );
    }

    assert.isTrue(validateManagedRelativePath("tags/manifest.json").ok);
    const caseCollision = validateManagedRelativePathSet([
      "tags/manifest.json",
      "tags/Manifest.json",
    ]);
    assert.isFalse(caseCollision.ok);
    assert.include(
      caseCollision.diagnostics.map((entry) => entry.code),
      "managed_path_case_collision",
    );

    const longRoot = path.join(tempRoot, "x".repeat(260));
    const absolute = validateManagedAbsolutePath(
      path.join(longRoot, "data", "synthesis", "tags", "manifest.json"),
      { absolutePathWarningLength: 120 },
    );
    assert.isTrue(absolute.ok);
    assert.include(
      absolute.diagnostics.map((entry) => entry.code),
      "managed_absolute_path_long",
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

    assert.lengthOf(
      listPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_ACP, "active"),
      0,
    );
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

  it("cleans expired terminal ACP skill run rows and workspaces by retention", async function () {
    const paths = getRuntimePersistencePaths();
    const retention = getTaskHistoryRetentionConfig();
    const nowMs = Date.parse("2026-06-11T00:00:00.000Z");
    const expiredAt = new Date(
      nowMs - retention.retentionMs - 24 * 60 * 60 * 1000,
    ).toISOString();
    const freshAt = new Date(nowMs - 60 * 60 * 1000).toISOString();
    const expiredWorkspace = path.join(paths.acpSkillRunsDir, "expired-run");
    const freshWorkspace = path.join(paths.acpSkillRunsDir, "fresh-run");
    const activeWorkspace = path.join(paths.acpSkillRunsDir, "active-run");
    for (const workspace of [
      expiredWorkspace,
      freshWorkspace,
      activeWorkspace,
    ]) {
      await fs.mkdir(path.join(workspace, "result"), { recursive: true });
      await fs.writeFile(
        path.join(workspace, "result", "result.json"),
        "{}",
        "utf8",
      );
    }

    upsertAcpSkillRun({
      requestId: "expired-terminal",
      status: "succeeded",
      backendId: "backend-acp",
      backendType: "acp",
      workspaceDir: expiredWorkspace,
      removedAt: expiredAt,
      archivedAt: expiredAt,
      updatedAt: expiredAt,
    });
    upsertAcpSkillRun({
      requestId: "fresh-terminal",
      status: "failed",
      backendId: "backend-acp",
      backendType: "acp",
      workspaceDir: freshWorkspace,
      removedAt: freshAt,
      archivedAt: freshAt,
      updatedAt: freshAt,
    });
    upsertAcpSkillRun({
      requestId: "stale-active",
      status: "running",
      backendId: "backend-acp",
      backendType: "acp",
      workspaceDir: activeWorkspace,
      updatedAt: expiredAt,
    });

    const cleanup = await cleanupRuntimePersistenceRetention({ nowMs });

    assert.isNull(getAcpSkillRunRecord("expired-terminal"));
    assert.isNotNull(getAcpSkillRunRecord("fresh-terminal"));
    assert.isNotNull(getAcpSkillRunRecord("stale-active"));
    assert.isFalse(await pathExists(expiredWorkspace));
    assert.isTrue(await pathExists(freshWorkspace));
    assert.isTrue(await pathExists(activeWorkspace));
    assert.equal((cleanup.details as any).acpSkillRunRowsDeleted, 1);
    assert.deepEqual((cleanup.details as any).acpSkillRunRequestIds, [
      "expired-terminal",
    ]);
  });

  it("keeps durable synthesis data outside runtime cleanup", async function () {
    const paths = getRuntimePersistencePaths();
    await fs.mkdir(paths.synthesisDataRoot, { recursive: true });
    const canonicalFile = path.join(
      paths.synthesisDataRoot,
      "tags",
      "manifest.json",
    );
    await fs.mkdir(path.dirname(canonicalFile), { recursive: true });
    await fs.writeFile(canonicalFile, "{}", "utf8");

    await cleanupRuntimePersistenceCategory("tmp");
    await cleanupRuntimePersistenceCategory("cache");
    await cleanupRuntimePersistenceCategory("logs");

    assert.equal(await fs.readFile(canonicalFile, "utf8"), "{}");
  });

  it("reports SQLite-indexed missing files and orphan runtime assets before cleanup", async function () {
    const paths = getRuntimePersistencePaths();
    const missingPath = path.join(
      paths.runtimeRoot,
      "workflow-products",
      "assets",
      "product-missing",
      "missing.md",
    );
    upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS, "products", {
      taskId: "product-missing",
      requestId: "request",
      backendId: "workflow-product",
      state: "available",
      updatedAt: "2026-05-25T00:00:00.000Z",
      payload: JSON.stringify({
        productId: "product-missing",
        productKey: "product-missing",
        kind: "workflow.product",
        title: "Missing product",
        workflowId: "workflow",
        workflowLabel: "Workflow",
        backendType: "workflow-product",
        requestId: "request",
        storageMode: "cached-bundle",
        assets: [
          {
            assetId: "missing",
            label: "Missing",
            path: "missing.md",
            relativePath: "missing.md",
            sourceKind: "bundle-entry",
            localPath: missingPath,
          },
        ],
        metadata: {},
        createdAt: "2026-05-25T00:00:00.000Z",
        updatedAt: "2026-05-25T00:00:00.000Z",
      }),
    });

    const orphan = path.join(
      paths.runtimeRoot,
      "workflow-products",
      "assets",
      "orphan",
      "asset.txt",
    );
    await fs.mkdir(path.dirname(orphan), { recursive: true });
    await fs.writeFile(orphan, "orphan", "utf8");
    const oldTime = new Date("2026-05-01T00:00:00.000Z");
    await fs.utimes(orphan, oldTime, oldTime);

    const report = await scanPersistenceIntegrity({
      nowMs: Date.parse("2026-05-25T00:00:00.000Z"),
    });
    assert.includeMembers(
      report.issues.map((issue) => issue.type),
      ["missing_file_for_db_row", "orphan_file_without_db_row"],
    );

    const dryRun = await cleanupPersistenceIssues({
      dryRun: true,
      nowMs: Date.parse("2026-05-25T00:00:00.000Z"),
    });
    assert.isTrue(dryRun.dryRun);
    assert.equal(await fs.readFile(orphan, "utf8"), "orphan");

    const cleanup = await cleanupPersistenceIssues({
      dryRun: false,
      nowMs: Date.parse("2026-05-25T00:00:00.000Z"),
    });
    assert.include(cleanup.removedPaths, orphan);
    await fs.access(orphan).then(
      () => assert.fail("expected orphan asset to be removed"),
      () => undefined,
    );
  });

  it("keeps durable synthesis data and state database out of integrity cleanup", async function () {
    const paths = getRuntimePersistencePaths();
    const canonicalFile = path.join(
      paths.synthesisDataRoot,
      "tags",
      "manifest.json",
    );
    const stateFile = paths.stateDbPath;
    const runtimeSynthesisFile = path.join(
      paths.runtimeRoot,
      "synthesis",
      "manifest.json",
    );
    await fs.mkdir(path.dirname(canonicalFile), { recursive: true });
    await fs.writeFile(canonicalFile, "canonical", "utf8");
    await fs.mkdir(path.dirname(stateFile), { recursive: true });
    await fs.writeFile(stateFile, "sqlite", "utf8");
    await fs.mkdir(path.dirname(runtimeSynthesisFile), { recursive: true });
    await fs.writeFile(runtimeSynthesisFile, "legacy", "utf8");

    const report = await scanPersistenceIntegrity();
    assert.include(
      report.issues.map((issue) => issue.type),
      "forbidden_durable_asset_in_runtime",
    );

    const cleanup = await cleanupPersistenceIssues({ dryRun: false });
    assert.notInclude(cleanup.removedPaths, canonicalFile);
    assert.notInclude(cleanup.removedPaths, stateFile);
    const forbiddenIssue = report.issues.find(
      (issue) => issue.type === "forbidden_durable_asset_in_runtime",
    );
    assert.isDefined(forbiddenIssue);
    assert.include(cleanup.skippedIssueIds, forbiddenIssue!.id);
    assert.equal(await fs.readFile(canonicalFile, "utf8"), "canonical");
    assert.equal(await fs.readFile(stateFile, "utf8"), "sqlite");
    assert.equal(await fs.readFile(runtimeSynthesisFile, "utf8"), "legacy");
  });

  it("reports managed path policy issues without making canonical data cleanable", async function () {
    const paths = getRuntimePersistencePaths();
    const reserved = path.join(paths.synthesisDataRoot, "tags", "CON.json");
    const upper = path.join(paths.synthesisDataRoot, "tags", "Alias.json");
    const lower = path.join(paths.synthesisDataRoot, "tags", "alias.json");
    const legacyLong = path.join(
      paths.synthesisDataRoot,
      "citation-graph",
      "works",
      `work_ref_${"x".repeat(100)}.json`,
    );
    for (const file of [reserved, upper, lower, legacyLong]) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, "{}", "utf8");
    }

    const report = await scanPersistenceIntegrity();
    const types = report.issues.map((issue) => issue.type);
    assert.includeMembers(types, [
      "managed_path_reserved_name",
      "managed_path_segment_too_long",
      "legacy_long_canonical_filename",
    ]);
    for (const issue of report.issues.filter((entry) =>
      [
        "managed_path_reserved_name",
        "managed_path_segment_too_long",
        "legacy_long_canonical_filename",
      ].includes(entry.type),
    )) {
      assert.isFalse(issue.eligibleForCleanup);
      assert.isUndefined(issue.path);
      assert.isString(issue.relativePath);
    }
  });

  it("runs the one-shot migration script in dry-run and apply modes", async function () {
    const dataDirectory = path.join(tempRoot, "zotero-data");
    const oldRoot = path.join(dataDirectory, "zotero-skills");
    const newRoot = path.join(dataDirectory, "zotero-agents");
    const oldDb = path.join(oldRoot, "state", "zotero-skills.db");
    const oldCanonical = path.join(
      oldRoot,
      "synthesis",
      "tags",
      "manifest.json",
    );
    await fs.mkdir(path.dirname(oldDb), { recursive: true });
    await fs.writeFile(oldDb, "sqlite", "utf8");
    await fs.mkdir(path.dirname(oldCanonical), { recursive: true });
    await fs.writeFile(oldCanonical, '{"ok":true}\n', "utf8");

    const script = path.join(
      process.cwd(),
      "scripts",
      "migrate-persistence-governance.mjs",
    );
    const dryRun = await execFileAsync(process.execPath, [
      script,
      "--data-directory",
      dataDirectory,
    ]);
    const dryRunPlan = JSON.parse(dryRun.stdout);
    assert.equal(dryRunPlan.mode, "dry-run");
    await fs.access(path.join(newRoot, "state", "zotero-agents.db")).then(
      () => assert.fail("dry-run should not create the target database"),
      () => undefined,
    );

    const applied = await execFileAsync(process.execPath, [
      script,
      "--data-directory",
      dataDirectory,
      "--mode",
      "apply",
    ]);
    const appliedPlan = JSON.parse(applied.stdout);
    assert.equal(appliedPlan.mode, "apply");
    assert.equal(
      await fs.readFile(
        path.join(newRoot, "state", "zotero-agents.db"),
        "utf8",
      ),
      "sqlite",
    );
    assert.equal(
      await fs.readFile(
        path.join(newRoot, "data", "synthesis", "tags", "manifest.json"),
        "utf8",
      ),
      '{"ok":true}\n',
    );
  });
});
