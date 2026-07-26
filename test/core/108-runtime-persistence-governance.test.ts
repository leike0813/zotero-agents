import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  RUNTIME_APPEND_CHUNK_CODE_UNITS,
  appendRuntimeTextFile,
  cleanupRuntimePersistenceRetention,
  cleanupRuntimePersistenceCategory,
  getRuntimePersistencePaths,
  getSynthesisSidecarLifecyclePaths,
  replacePrivateRuntimeTextFileAtomically,
  registerRuntimeLogClearer,
  replaceRuntimeTextFileAtomically,
  scanRuntimePersistenceUsage,
  validateManagedAbsolutePath,
  validateManagedRelativePath,
  validateManagedRelativePathSet,
} from "../../src/modules/runtimePersistence";
import { getTaskHistoryRetentionConfig } from "../../src/modules/taskRetentionPolicy";
import { RuntimeFileIoError } from "../../src/modules/runtimeFileRangeReader";
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
import type { WorkflowProductRecord } from "../../src/modules/workflowProductStore";
import {
  buildSynthesisKnowledgeGraphPaths,
  buildSynthesisStoragePaths,
} from "../../src/modules/synthesis/foundation";
import {
  cleanupRetiredSynthesisGitSyncRuntime,
  RETIRED_SYNTHESIS_GIT_SYNC_PREFS,
} from "../../src/modules/synthesis/syncRuntimeCleanup";
import {
  PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS,
  PLUGIN_TASK_DOMAIN_ACP,
  PLUGIN_TASK_DOMAIN_SKILLRUNNER,
  appendPluginRunEventStoreEntry,
  clearPluginTaskDomain,
  inspectPluginStateStoreCounts,
  listPluginTaskContextEntries,
  listPluginTaskRequestEntries,
  listPluginRunEventStoreEntries,
  listPluginRunStoreEntries,
  listPluginTaskRowEntries,
  resetPluginStateStoreForTests,
  upsertPluginRunStoreEntry,
  upsertPluginTaskContextEntry,
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
const tsxCli = path.join(
  process.cwd(),
  "node_modules",
  "tsx",
  "dist",
  "cli.mjs",
);

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
    await clearRuntimeLogs();
    setDebugModeOverrideForTests(true);
  });

  afterEach(async function () {
    await clearRuntimeLogs();
    await flushRuntimeLogsPersistence();
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

  it("serializes chunked Zotero IOUtils appends without splitting Unicode", async function () {
    const runtime = globalThis as any;
    const processDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "process",
    );
    const ioUtilsDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "IOUtils",
    );
    const writes: Array<{ content: string; options: unknown }> = [];
    let releaseFirst!: () => void;
    let markFirstStarted!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    const firstRelease = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let writeCalls = 0;
    try {
      Object.defineProperty(globalThis, "process", {
        configurable: true,
        writable: true,
        value: undefined,
      });
      Object.defineProperty(globalThis, "IOUtils", {
        configurable: true,
        writable: true,
        value: {
          makeDirectory: async () => undefined,
          stat: async () => ({ type: "directory", size: 0 }),
          writeUTF8: async (
            _path: string,
            content: string,
            options: unknown,
          ) => {
            writeCalls += 1;
            if (writeCalls === 1) {
              markFirstStarted();
              await firstRelease;
            }
            writes.push({ content, options });
          },
        },
      });
      const prefix = "a".repeat(RUNTIME_APPEND_CHUNK_CODE_UNITS - 1);
      const first = `${prefix}😀tail`;
      const firstAppend = appendRuntimeTextFile(
        path.join(tempRoot, "runtime", "ordered.ndjson"),
        first,
      );
      await firstStarted;
      const secondAppend = appendRuntimeTextFile(
        path.join(tempRoot, "runtime", "ordered.ndjson"),
        "second",
      );
      releaseFirst();
      await Promise.all([firstAppend, secondAppend]);

      assert.equal(
        writes.map((entry) => entry.content).join(""),
        `${first}second`,
      );
      assert.isAtLeast(writes.length, 3);
      for (const entry of writes) {
        assert.deepEqual(entry.options, { mode: "appendOrCreate" });
        assert.notMatch(entry.content, /^\uDE00/);
        assert.notMatch(entry.content, /\uD83D$/);
      }
    } finally {
      releaseFirst?.();
      if (processDescriptor) {
        Object.defineProperty(globalThis, "process", processDescriptor);
      }
      if (ioUtilsDescriptor) {
        Object.defineProperty(globalThis, "IOUtils", ioUtilsDescriptor);
      } else {
        delete runtime.IOUtils;
      }
    }
  });

  it("fails structurally when Zotero async append is unavailable", async function () {
    const runtime = globalThis as any;
    const processDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "process",
    );
    const ioUtilsDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "IOUtils",
    );
    try {
      Object.defineProperty(globalThis, "process", {
        configurable: true,
        writable: true,
        value: undefined,
      });
      Object.defineProperty(globalThis, "IOUtils", {
        configurable: true,
        writable: true,
        value: {
          makeDirectory: async () => undefined,
          stat: async () => ({ type: "directory", size: 0 }),
        },
      });
      let failure: unknown;
      try {
        await appendRuntimeTextFile(
          path.join(tempRoot, "runtime", "unavailable.ndjson"),
          "entry\n",
        );
      } catch (error) {
        failure = error;
      }
      assert.instanceOf(failure, RuntimeFileIoError);
      assert.equal(
        (failure as RuntimeFileIoError).code,
        "runtime_async_file_io_unavailable",
      );
      assert.equal((failure as RuntimeFileIoError).operation, "append");
    } finally {
      if (processDescriptor) {
        Object.defineProperty(globalThis, "process", processDescriptor);
      }
      if (ioUtilsDescriptor) {
        Object.defineProperty(globalThis, "IOUtils", ioUtilsDescriptor);
      } else {
        delete runtime.IOUtils;
      }
    }
  });

  it("atomically replaces text from ordered bounded fragments without damaging Unicode", async function () {
    const targetPath = path.join(tempRoot, "logs", "atomic.json");
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, '{"old":true}', "utf8");
    const largeText = `${"a".repeat(RUNTIME_APPEND_CHUNK_CODE_UNITS - 1)}😀tail`;

    await replaceRuntimeTextFileAtomically({
      targetPath,
      fragments: ['{"entries":["', largeText, '"]}'],
    });

    const persisted = await fs.readFile(targetPath, "utf8");
    assert.deepEqual(JSON.parse(persisted), { entries: [largeText] });
    assert.deepEqual(await fs.readdir(path.dirname(targetPath)), [
      "atomic.json",
    ]);
  });

  it("keeps the previous target and removes its temporary file when fragment production fails", async function () {
    const targetPath = path.join(tempRoot, "logs", "atomic-failure.json");
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, '{"old":true}', "utf8");
    function* failingFragments() {
      yield '{"entries":[';
      throw new Error("controlled fragment failure");
    }

    let failure: unknown;
    try {
      await replaceRuntimeTextFileAtomically({
        targetPath,
        fragments: failingFragments(),
      });
    } catch (error) {
      failure = error;
    }

    assert.match(String(failure), /controlled fragment failure/);
    assert.equal(await fs.readFile(targetPath, "utf8"), '{"old":true}');
    assert.deepEqual(await fs.readdir(path.dirname(targetPath)), [
      "atomic-failure.json",
    ]);
  });

  it("keeps every Zotero physical append within the surrogate-safe chunk policy", async function () {
    const runtime = globalThis as any;
    const processDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "process",
    );
    const ioUtilsDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "IOUtils",
    );
    const files = new Map<string, string>();
    const writes: string[] = [];
    const targetPath = path.join(tempRoot, "logs", "bounded.json");
    files.set(targetPath, "old");
    try {
      Object.defineProperty(globalThis, "process", {
        configurable: true,
        writable: true,
        value: undefined,
      });
      Object.defineProperty(globalThis, "IOUtils", {
        configurable: true,
        writable: true,
        value: {
          exists: async (filePath: string) => files.has(filePath),
          makeDirectory: async () => undefined,
          writeUTF8: async (
            filePath: string,
            content: string,
            options: { mode: string },
          ) => {
            assert.deepEqual(options, { mode: "appendOrCreate" });
            writes.push(content);
            files.set(filePath, `${files.get(filePath) || ""}${content}`);
          },
          move: async (sourcePath: string, destinationPath: string) => {
            files.set(destinationPath, files.get(sourcePath) || "");
            files.delete(sourcePath);
          },
          remove: async (filePath: string) => {
            files.delete(filePath);
          },
        },
      });
      const text = `${"x".repeat(RUNTIME_APPEND_CHUNK_CODE_UNITS - 1)}😀${"y".repeat(
        RUNTIME_APPEND_CHUNK_CODE_UNITS,
      )}`;

      await replaceRuntimeTextFileAtomically({
        targetPath,
        fragments: ["prefix", text, "suffix"],
      });

      assert.equal(files.get(targetPath), `prefix${text}suffix`);
      assert.isAtLeast(writes.length, 3);
      for (const content of writes) {
        assert.isAtMost(content.length, RUNTIME_APPEND_CHUNK_CODE_UNITS);
        assert.notMatch(content, /^\uDE00/);
        assert.notMatch(content, /\uD83D$/);
      }
      assert.equal(
        [...files.keys()].filter((filePath) => filePath !== targetPath).length,
        0,
      );
    } finally {
      if (processDescriptor) {
        Object.defineProperty(globalThis, "process", processDescriptor);
      }
      if (ioUtilsDescriptor) {
        Object.defineProperty(globalThis, "IOUtils", ioUtilsDescriptor);
      } else {
        delete runtime.IOUtils;
      }
    }
  });

  it("awaits the asynchronous runtime log clearer before deleting log storage", async function () {
    const paths = getRuntimePersistencePaths();
    await fs.mkdir(paths.logsDir, { recursive: true });
    await fs.writeFile(
      path.join(paths.logsDir, "pending.log"),
      "pending",
      "utf8",
    );
    let release!: () => void;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    registerRuntimeLogClearer(async () => {
      markStarted();
      await blocked;
    });
    try {
      let completed = false;
      const cleanup = cleanupRuntimePersistenceCategory("logs").then(() => {
        completed = true;
      });
      await started;
      assert.isTrue(await pathExists(paths.logsDir));
      assert.isFalse(completed);
      release();
      await cleanup;
      assert.isFalse(await pathExists(paths.logsDir));
    } finally {
      release?.();
      registerRuntimeLogClearer(clearRuntimeLogs);
    }
  });

  it("resolves a managed root with semantic subdirectories", function () {
    const paths = getRuntimePersistencePaths();
    assert.equal(paths.root, tempRoot);
    assert.equal(
      paths.stateDbPath,
      path.join(tempRoot, "state", "zotero-agents.db"),
    );
    assert.equal(
      paths.synthesisDbPath,
      path.join(tempRoot, "state", "synthesis.db"),
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
    assert.include(
      paths.workflowProductsDir.replace(/\\/g, "/"),
      "/workflow-products",
    );
  });

  it("keeps sidecar lifecycle sessions profile-scoped and private", async function () {
    const runtimeRoot = getRuntimePersistencePaths().runtimeRoot;
    const lifecycle = getSynthesisSidecarLifecyclePaths({
      runtimeRoot,
      profileId: "a".repeat(64),
      supervisorInstanceId: "sup-test",
    });
    assert.equal(
      path.relative(runtimeRoot, lifecycle.configPath).replace(/\\/g, "/"),
      `synthesis/service-runtime/profiles/${"a".repeat(64)}/sessions/sup-test/config.json`,
    );
    await replacePrivateRuntimeTextFileAtomically(lifecycle.configPath, "{}\n");
    assert.equal(await fs.readFile(lifecycle.configPath, "utf8"), "{}\n");
    if (process.platform !== "win32") {
      assert.equal((await fs.stat(lifecycle.configPath)).mode & 0o777, 0o600);
    }
    assert.throws(() =>
      getSynthesisSidecarLifecyclePaths({
        runtimeRoot,
        profileId: "../outside",
        supervisorInstanceId: "sup-test",
      }),
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
    assert.equal(
      topicPaths.currentTopicDetailHtml,
      path.join(
        paths.synthesisDataRoot,
        "topics",
        "topic-alpha",
        "current",
        "assets",
        "topic-detail.html",
      ),
    );
    assert.equal(
      topicPaths.currentTopicDetailHtmlMetadata,
      path.join(
        paths.synthesisDataRoot,
        "topics",
        "topic-alpha",
        "current",
        "assets",
        "topic-detail.html.metadata.json",
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

  it("uses a temporary fallback instead of Windows AppData when no durable root is available", function () {
    delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    const prefKey = "extensions.zotero.zotero-skills.runtimeRoot";
    const previousPref = (globalThis as any).Zotero.Prefs.get(prefKey, true);
    const previousDataDirectory = (globalThis as any).Zotero?.DataDirectory;
    const previousLocalAppData = process.env.LOCALAPPDATA;
    const previousAppData = process.env.APPDATA;
    const previousTmpDir = process.env.TMPDIR;
    const previousTemp = process.env.TEMP;
    const previousTmp = process.env.TMP;
    const fallbackTemp = path.join(tempRoot, "system-temp");
    const appDataRoot = path.join(tempRoot, "local-app-data");
    try {
      (globalThis as any).Zotero.Prefs.clear(prefKey, true);
      delete (globalThis as any).Zotero.DataDirectory;
      process.env.LOCALAPPDATA = appDataRoot;
      process.env.APPDATA = path.join(tempRoot, "roaming-app-data");
      delete process.env.TMPDIR;
      process.env.TEMP = fallbackTemp;
      delete process.env.TMP;

      const paths = getRuntimePersistencePaths();

      assert.equal(paths.root, path.join(fallbackTemp, "zotero-agents"));
      assert.notEqual(paths.root, path.join(appDataRoot, "zotero-agents"));
    } finally {
      if (typeof previousPref === "undefined") {
        (globalThis as any).Zotero.Prefs.clear(prefKey, true);
      } else {
        (globalThis as any).Zotero.Prefs.set(prefKey, previousPref, true);
      }
      (globalThis as any).Zotero.DataDirectory = previousDataDirectory;
      if (typeof previousLocalAppData === "undefined") {
        delete process.env.LOCALAPPDATA;
      } else {
        process.env.LOCALAPPDATA = previousLocalAppData;
      }
      if (typeof previousAppData === "undefined") {
        delete process.env.APPDATA;
      } else {
        process.env.APPDATA = previousAppData;
      }
      if (typeof previousTemp === "undefined") {
        delete process.env.TEMP;
      } else {
        process.env.TEMP = previousTemp;
      }
      if (typeof previousTmpDir === "undefined") {
        delete process.env.TMPDIR;
      } else {
        process.env.TMPDIR = previousTmpDir;
      }
      if (typeof previousTmp === "undefined") {
        delete process.env.TMP;
      } else {
        process.env.TMP = previousTmp;
      }
      process.env.ZOTERO_SKILLS_RUNTIME_ROOT = tempRoot;
    }
  });

  it("uses the launcher-patched runtimeRoot pref before Zotero DataDirectory", function () {
    delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    const prefKey = "extensions.zotero.zotero-skills.runtimeRoot";
    const previousPref = (globalThis as any).Zotero.Prefs.get(prefKey, true);
    const previousDataDirectory = (globalThis as any).Zotero?.DataDirectory;
    const prefRoot = path.join(tempRoot, "pref-runtime-root");
    const dataDirectory = path.join(tempRoot, "zotero-data");
    const zotero = (globalThis as any).Zotero || {};
    zotero.DataDirectory = { dir: dataDirectory };
    zotero.Prefs.set(prefKey, prefRoot, true);
    try {
      const paths = getRuntimePersistencePaths();
      assert.equal(paths.root, prefRoot);
      assert.equal(paths.dataDir, path.join(prefRoot, "data"));
    } finally {
      if (typeof previousPref === "undefined") {
        (globalThis as any).Zotero.Prefs.clear(prefKey, true);
      } else {
        (globalThis as any).Zotero.Prefs.set(prefKey, previousPref, true);
      }
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
    upsertPluginRunStoreEntry("skillrunner", {
      runKey: "skillrunner-run",
      requestId: "skillrunner-request",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: '{"kind":"skillrunner"}',
    });
    appendPluginRunEventStoreEntry("skillrunner", {
      eventId: "skillrunner-event",
      runKey: "skillrunner-run",
      requestId: "skillrunner-request",
      backendId: "backend",
      type: "request.ready",
      createdAt: "2026-04-28T00:00:01.000Z",
      payload: '{"event":true}',
    });
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId: "conversation-index:acp-test",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: JSON.stringify({ activeConversationId: "conversation-a" }),
    });
    upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_ACP, "skill-runs", {
      taskId: "skill-run-row",
      requestId: "acp-skill-run",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });
    upsertPluginRunStoreEntry("acp", {
      runKey: "acp-run",
      requestId: "acp-run-request",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: '{"kind":"acp"}',
    });
    appendPluginRunEventStoreEntry("acp", {
      eventId: "acp-event",
      runKey: "acp-run",
      requestId: "acp-run-request",
      backendId: "backend",
      type: "request.ready",
      createdAt: "2026-04-28T00:00:01.000Z",
      payload: '{"event":true}',
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
      3,
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
      3,
    );
    assert.isAbove(
      snapshot.categories.find((entry) => entry.category === "acp-skill-runs")
        ?.bytes || 0,
      0,
    );
    assert.equal(snapshot.stateDatabase?.path, paths.stateDbPath);
    assert.deepEqual(
      snapshot.stateDatabases?.map((entry) => entry.path),
      [paths.stateDbPath, paths.synthesisDbPath],
    );
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
    upsertPluginRunStoreEntry("skillrunner", {
      runKey: "skillrunner-cleanup-run",
      requestId: "skillrunner-cleanup-request",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: '{"kind":"skillrunner"}',
    });
    appendPluginRunEventStoreEntry("skillrunner", {
      eventId: "skillrunner-cleanup-event",
      runKey: "skillrunner-cleanup-run",
      requestId: "skillrunner-cleanup-request",
      backendId: "backend",
      type: "request.ready",
      createdAt: "2026-04-28T00:00:01.000Z",
      payload: "{}",
    });
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId: "conversation:acp-test:conversation-cleanup",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: JSON.stringify({ conversationId: "conversation-cleanup" }),
    });

    const skillRunnerCleanup =
      await cleanupRuntimePersistenceCategory("skillrunner-ledger");
    assert.equal(inspectPluginStateStoreCounts().requestCount, 1);
    assert.equal(inspectPluginStateStoreCounts().skillRunnerRunCount, 0);
    assert.equal(
      listPluginRunEventStoreEntries({
        kind: "skillrunner",
        runKey: "skillrunner-cleanup-run",
      }).length,
      0,
    );
    assert.equal(skillRunnerCleanup.details.runStoreRowsDeleted, 2);
    assert.equal(skillRunnerCleanup.details.legacyRowsDeleted, 1);

    await cleanupRuntimePersistenceCategory("acp-conversations");
    assert.equal(inspectPluginStateStoreCounts().requestCount, 0);
  });

  it("scans and cleans workflow product runtime data", async function () {
    const paths = getRuntimePersistencePaths();
    const productAsset = path.join(
      paths.workflowProductsDir,
      "assets",
      "product-cleanup",
      "draft",
      "intro.md",
    );
    await fs.mkdir(path.dirname(productAsset), { recursive: true });
    await fs.writeFile(productAsset, "# Product", "utf8");
    upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS, "products", {
      taskId: "product-cleanup",
      requestId: "request",
      backendId: "workflow-product",
      state: "available",
      updatedAt: "2026-05-25T00:00:00.000Z",
      payload: JSON.stringify({
        productId: "product-cleanup",
        productKey: "product-cleanup",
        kind: "workflow.product",
        title: "Product cleanup",
        workflowId: "workflow",
        workflowLabel: "Workflow",
        backendType: "workflow-product",
        requestId: "request",
        storageMode: "persistent-cache",
        cacheDir: path.dirname(path.dirname(productAsset)),
        assets: [
          {
            assetId: "intro",
            label: "Intro",
            path: "draft/intro.md",
            relativePath: "draft/intro.md",
            sourceKind: "product-cache",
            localPath: productAsset,
          },
        ],
        metadata: {},
        createdAt: "2026-05-25T00:00:00.000Z",
        updatedAt: "2026-05-25T00:00:00.000Z",
      }),
    });

    const snapshot = await scanRuntimePersistenceUsage();
    const category = snapshot.categories.find(
      (entry) => entry.category === "workflow-products",
    );
    assert.isDefined(category);
    assert.equal(category?.recordCount, 1);
    assert.isAtLeast(category?.bytes || 0, "# Product".length);

    const cleanup =
      await cleanupRuntimePersistenceCategory("workflow-products");
    assert.equal((cleanup.details as any).rowsDeleted, 1);
    assert.isFalse(await pathExists(paths.workflowProductsDir));
    assert.lengthOf(
      listPluginTaskRowEntries(
        PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS,
        "products",
      ),
      0,
    );
  });

  it("cleans ACP conversations without deleting ACP skill run rows", async function () {
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId: "conversation-index:acp-kilo-npx",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: JSON.stringify({ activeConversationId: "conversation-a" }),
    });
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId: "conversation:acp-kilo-npx:conversation-a",
      backendId: "backend",
      state: "idle",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: JSON.stringify({ conversationId: "conversation-a" }),
    });
    upsertPluginTaskRequestEntry(PLUGIN_TASK_DOMAIN_ACP, {
      requestId: "acp-other-request",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });
    upsertPluginTaskContextEntry(PLUGIN_TASK_DOMAIN_ACP, {
      contextId: "chat-context-by-request",
      requestId: "conversation:acp-kilo-npx:conversation-a",
      backendId: "backend",
      state: "active",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });
    upsertPluginTaskContextEntry(PLUGIN_TASK_DOMAIN_ACP, {
      contextId: "chat-context-by-payload",
      requestId: "other-chat-request",
      backendId: "backend",
      state: "active",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: JSON.stringify({ conversationId: "conversation-a" }),
    });
    upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_ACP, "active", {
      taskId: "chat-row",
      requestId: "conversation:acp-kilo-npx:conversation-a",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: "{}",
    });
    upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_ACP, "active", {
      taskId: "chat-row-by-payload",
      requestId: "other-chat-request",
      backendId: "backend",
      state: "running",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: JSON.stringify({ conversationId: "conversation-a" }),
    });
    upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_ACP, "skill-runs", {
      taskId: "skill-run-row",
      requestId: "acp-skill-run",
      backendId: "backend",
      state: "succeeded",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: JSON.stringify({ conversationId: "skill-run-conversation" }),
    });
    upsertPluginRunStoreEntry("acp", {
      runKey: "acp-skill-run-store",
      requestId: "acp-skill-run-store-request",
      backendId: "backend",
      state: "succeeded",
      updatedAt: "2026-04-28T00:00:00.000Z",
      payload: '{"kind":"acp"}',
    });
    appendPluginRunEventStoreEntry("acp", {
      eventId: "acp-skill-run-store-event",
      runKey: "acp-skill-run-store",
      requestId: "acp-skill-run-store-request",
      backendId: "backend",
      type: "apply.succeeded",
      createdAt: "2026-04-28T00:00:01.000Z",
      payload: "{}",
    });

    await cleanupRuntimePersistenceCategory("acp-conversations");

    assert.equal(inspectPluginStateStoreCounts().requestCount, 1);
    assert.deepEqual(
      listPluginTaskRequestEntries(PLUGIN_TASK_DOMAIN_ACP).map(
        (entry) => entry.requestId,
      ),
      ["acp-other-request"],
    );
    assert.lengthOf(listPluginTaskContextEntries(PLUGIN_TASK_DOMAIN_ACP), 0);
    assert.lengthOf(
      listPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_ACP, "active"),
      0,
    );
    assert.lengthOf(
      listPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_ACP, "skill-runs"),
      1,
    );
    assert.lengthOf(listPluginRunStoreEntries("acp"), 1);

    await cleanupRuntimePersistenceCategory("acp-skill-runs");

    assert.lengthOf(
      listPluginTaskRowEntries(PLUGIN_TASK_DOMAIN_ACP, "skill-runs"),
      0,
    );
    assert.lengthOf(listPluginRunStoreEntries("acp"), 0);
    assert.lengthOf(
      listPluginRunEventStoreEntries({
        kind: "acp",
        runKey: "acp-skill-run-store",
      }),
      0,
    );
  });

  it("runs standalone cleanup scripts through runtime persistence internals", async function () {
    this.timeout(10_000);
    const root = path.join(tempRoot, "standalone-cleanup-root");
    const env = {
      ...process.env,
      ZOTERO_SKILLS_RUNTIME_ROOT: root,
    };
    process.env.ZOTERO_SKILLS_RUNTIME_ROOT = root;
    resetPluginStateStoreForTests();
    const paths = getRuntimePersistencePaths(root);
    await fs.mkdir(path.join(paths.acpChatRoot, "conversations"), {
      recursive: true,
    });
    await fs.mkdir(path.join(paths.acpSkillRunsDir, "run-a"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(paths.acpChatRoot, "conversations", "chat.json"),
      "{}",
      "utf8",
    );
    await fs.writeFile(
      path.join(paths.acpSkillRunsDir, "run-a", "transcript.json"),
      "{}",
      "utf8",
    );
    await fs.mkdir(path.dirname(paths.stateDbPath), { recursive: true });
    const sqlite = (await import("node:sqlite")) as any;
    const readDbCount = (sql: string) => {
      const db = new sqlite.DatabaseSync(paths.stateDbPath);
      try {
        return Number(db.prepare(sql).get().value || 0);
      } finally {
        db.close();
      }
    };
    const seedDb = new sqlite.DatabaseSync(paths.stateDbPath);
    try {
      seedDb.exec(`
        CREATE TABLE plugin_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
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
        CREATE TABLE plugin_acp_skill_runs (
          run_key TEXT PRIMARY KEY,
          request_id TEXT NOT NULL DEFAULT '',
          backend_id TEXT NOT NULL DEFAULT '',
          state TEXT NOT NULL DEFAULT '',
          updated_at TEXT NOT NULL DEFAULT '',
          payload_json TEXT NOT NULL
        );
        CREATE TABLE plugin_acp_skill_run_events (
          event_id TEXT PRIMARY KEY,
          run_key TEXT NOT NULL DEFAULT '',
          request_id TEXT NOT NULL DEFAULT '',
          backend_id TEXT NOT NULL DEFAULT '',
          type TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT '',
          payload_json TEXT NOT NULL
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
        INSERT INTO plugin_meta(key, value)
        VALUES
          ('migration_task_state_v1', 'done'),
          ('agent_run_separated_store_hard_cut_reset_v2', 'done');
        INSERT INTO plugin_task_requests
          (domain, request_id, backend_id, state, updated_at, payload_json)
        VALUES
          ('acp', 'conversation-index:acp-kilo-npx', 'backend', 'idle', '2026-04-28T00:00:00.000Z', '{"activeConversationId":"conversation-a"}'),
          ('acp', 'conversation:acp-kilo-npx:conversation-a', 'backend', 'idle', '2026-04-28T00:00:00.000Z', '{"conversationId":"conversation-a"}'),
          ('acp', 'acp-other-request', 'backend', 'running', '2026-04-28T00:00:00.000Z', '{}'),
          ('skillrunner', 'skill-req', 'backend', 'running', '2026-04-28T00:00:00.000Z', '{}');
        INSERT INTO plugin_task_contexts
          (domain, context_id, request_id, backend_id, state, updated_at, payload_json)
        VALUES
          ('acp', 'chat-context', 'other-request', 'backend', 'active', '2026-04-28T00:00:00.000Z', '{"conversationId":"conversation-a"}');
        INSERT INTO plugin_task_rows
          (domain, scope, task_id, request_id, backend_id, state, updated_at, payload_json)
        VALUES
          ('acp', 'active', 'chat-row', 'conversation:acp-kilo-npx:conversation-a', 'backend', 'running', '2026-04-28T00:00:00.000Z', '{}'),
          ('acp', 'skill-runs', 'skill-row', 'acp-skill-run', 'backend', 'succeeded', '2026-04-28T00:00:00.000Z', '{"conversationId":"not-chat"}');
        INSERT INTO plugin_acp_skill_runs
          (run_key, request_id, backend_id, state, updated_at, payload_json)
        VALUES
          ('acp-skill-run-store', 'acp-skill-run-store-request', 'backend', 'succeeded', '2026-04-28T00:00:00.000Z', '{"kind":"acp"}');
        INSERT INTO plugin_acp_skill_run_events
          (event_id, run_key, request_id, backend_id, type, created_at, payload_json)
        VALUES
          ('acp-skill-run-store-event', 'acp-skill-run-store', 'acp-skill-run-store-request', 'backend', 'apply.succeeded', '2026-04-28T00:00:01.000Z', '{}');
        INSERT INTO plugin_skillrunner_runs
          (run_key, request_id, backend_id, state, updated_at, payload_json)
        VALUES
          ('skillrunner-cleanup-run', 'skillrunner-cleanup-request', 'backend', 'running', '2026-04-28T00:00:00.000Z', '{"kind":"skillrunner"}');
        INSERT INTO plugin_skillrunner_run_events
          (event_id, run_key, request_id, backend_id, type, created_at, payload_json)
        VALUES
          ('skillrunner-cleanup-event', 'skillrunner-cleanup-run', 'skillrunner-cleanup-request', 'backend', 'request.ready', '2026-04-28T00:00:01.000Z', '{}');
      `);
    } finally {
      seedDb.close();
    }

    const chatCleanup = await execFileAsync(
      process.execPath,
      [
        tsxCli,
        path.join(process.cwd(), "scripts", "clear-acp-chat-records.ts"),
        "--root",
        root,
      ],
      { env },
    );
    assert.equal(JSON.parse(chatCleanup.stdout).category, "acp-conversations");
    assert.equal(
      readDbCount(
        "SELECT COUNT(*) AS value FROM plugin_task_requests WHERE domain='acp'",
      ),
      1,
    );
    assert.equal(
      readDbCount("SELECT COUNT(*) AS value FROM plugin_task_contexts"),
      0,
    );
    assert.equal(
      readDbCount(
        "SELECT COUNT(*) AS value FROM plugin_task_rows WHERE scope='active'",
      ),
      0,
    );
    assert.equal(
      readDbCount(
        "SELECT COUNT(*) AS value FROM plugin_task_rows WHERE scope='skill-runs'",
      ),
      1,
    );
    assert.equal(
      readDbCount("SELECT COUNT(*) AS value FROM plugin_acp_skill_runs"),
      1,
    );
    assert.isFalse(await pathExists(paths.acpChatRoot));

    const acpSkillsCleanup = await execFileAsync(
      process.execPath,
      [
        tsxCli,
        path.join(process.cwd(), "scripts", "clear-acp-skills-records.ts"),
        "--root",
        root,
      ],
      { env },
    );
    assert.equal(
      JSON.parse(acpSkillsCleanup.stdout).category,
      "acp-skill-runs",
    );
    assert.equal(
      readDbCount(
        "SELECT COUNT(*) AS value FROM plugin_task_rows WHERE scope='skill-runs'",
      ),
      0,
    );
    assert.equal(
      readDbCount("SELECT COUNT(*) AS value FROM plugin_acp_skill_runs"),
      0,
    );
    assert.equal(
      readDbCount("SELECT COUNT(*) AS value FROM plugin_acp_skill_run_events"),
      0,
    );
    assert.equal(
      readDbCount(
        "SELECT COUNT(*) AS value FROM plugin_task_requests WHERE domain='skillrunner'",
      ),
      1,
    );
    assert.isFalse(await pathExists(paths.acpSkillRunsDir));

    const skillRunnerCleanup = await execFileAsync(
      process.execPath,
      [
        tsxCli,
        path.join(process.cwd(), "scripts", "clear-skillrunner-records.ts"),
        "--root",
        root,
      ],
      { env },
    );
    assert.equal(
      JSON.parse(skillRunnerCleanup.stdout).category,
      "skillrunner-ledger",
    );
    assert.equal(
      readDbCount(
        "SELECT COUNT(*) AS value FROM plugin_task_requests WHERE domain='skillrunner'",
      ),
      0,
    );
    assert.equal(
      readDbCount("SELECT COUNT(*) AS value FROM plugin_skillrunner_runs"),
      0,
    );
    assert.equal(
      readDbCount(
        "SELECT COUNT(*) AS value FROM plugin_skillrunner_run_events",
      ),
      0,
    );
  });

  it("loads ZOTERO_PLUGIN_DATA_DIR from .env for standalone cleanup scripts", async function () {
    const scriptCwd = path.join(tempRoot, "dotenv-script-cwd");
    const zoteroDataDir = path.join(tempRoot, "dotenv-zotero-data");
    await fs.mkdir(scriptCwd, { recursive: true });
    await fs.writeFile(
      path.join(scriptCwd, ".env"),
      `ZOTERO_PLUGIN_DATA_DIR = "${zoteroDataDir}"\n`,
      "utf8",
    );
    const env = { ...process.env };
    delete env.ZOTERO_SKILLS_RUNTIME_ROOT;
    delete env.ZOTERO_PLUGIN_DATA_DIR;

    const cleanup = await execFileAsync(
      process.execPath,
      [
        tsxCli,
        path.join(process.cwd(), "scripts", "clear-acp-chat-records.ts"),
      ],
      {
        cwd: scriptCwd,
        env,
      },
    );

    assert.equal(
      JSON.parse(cleanup.stdout).usage.root,
      path.join(zoteroDataDir, "zotero-agents"),
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
    const runtimeOnlyDir = path.join(paths.acpSkillRunsDir, "runtime-only-run");
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
    const expiredRuntimeDir = path.join(expiredWorkspace, ".acp");
    const freshRuntimeDir = path.join(freshWorkspace, ".acp");
    const runtimeOnlyAcpDir = path.join(runtimeOnlyDir, ".acp");
    for (const runtimeDir of [
      expiredRuntimeDir,
      freshRuntimeDir,
      runtimeOnlyAcpDir,
    ]) {
      await fs.mkdir(runtimeDir, { recursive: true });
      await fs.writeFile(
        path.join(runtimeDir, "transcript.jsonl"),
        '{"seq":1}\n',
        "utf8",
      );
      await fs.writeFile(
        path.join(runtimeDir, "output-revisions.jsonl"),
        '{"seq":1}\n',
        "utf8",
      );
      await fs.writeFile(
        path.join(runtimeDir, "run-context.json"),
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
      runtimeDir: expiredRuntimeDir,
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
      runtimeDir: freshRuntimeDir,
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
    upsertAcpSkillRun({
      requestId: "expired-runtime-only",
      status: "succeeded",
      backendId: "backend-acp",
      backendType: "acp",
      runtimeDir: runtimeOnlyAcpDir,
      removedAt: expiredAt,
      archivedAt: expiredAt,
      updatedAt: expiredAt,
    });

    const cleanup = await cleanupRuntimePersistenceRetention({ nowMs });

    assert.isNull(getAcpSkillRunRecord("expired-terminal"));
    assert.isNull(getAcpSkillRunRecord("expired-runtime-only"));
    assert.isNotNull(getAcpSkillRunRecord("fresh-terminal"));
    assert.isNotNull(getAcpSkillRunRecord("stale-active"));
    assert.isFalse(await pathExists(expiredWorkspace));
    assert.isFalse(
      await pathExists(path.join(expiredRuntimeDir, "transcript.jsonl")),
    );
    assert.isFalse(
      await pathExists(path.join(expiredRuntimeDir, "output-revisions.jsonl")),
    );
    assert.isFalse(
      await pathExists(path.join(expiredRuntimeDir, "run-context.json")),
    );
    assert.isFalse(
      await pathExists(path.join(runtimeOnlyAcpDir, "transcript.jsonl")),
    );
    assert.isTrue(await pathExists(freshWorkspace));
    assert.isTrue(
      await pathExists(path.join(freshRuntimeDir, "transcript.jsonl")),
    );
    assert.isTrue(
      await pathExists(path.join(freshRuntimeDir, "output-revisions.jsonl")),
    );
    assert.isTrue(
      await pathExists(path.join(freshRuntimeDir, "run-context.json")),
    );
    assert.isTrue(await pathExists(activeWorkspace));
    assert.equal((cleanup.details as any).acpSkillRunRowsDeleted, 2);
    assert.deepEqual((cleanup.details as any).acpSkillRunRequestIds.sort(), [
      "expired-runtime-only",
      "expired-terminal",
    ]);
  });

  it("cleans expired runtime tmp, cache, and log assets by retention", async function () {
    const paths = getRuntimePersistencePaths();
    const nowMs = Date.parse("2026-06-11T00:00:00.000Z");
    const expiredAt = new Date("2026-04-01T00:00:00.000Z");
    const freshAt = new Date("2026-06-10T23:00:00.000Z");
    const expiredTmp = path.join(paths.tmpDir, "expired.tmp");
    const freshTmp = path.join(paths.tmpDir, "fresh.tmp");
    const expiredCache = path.join(paths.cacheDir, "expired-cache.json");
    const freshCache = path.join(paths.cacheDir, "fresh-cache.json");
    const expiredLog = path.join(paths.logsDir, "expired.log");
    const freshLog = path.join(paths.logsDir, "fresh.log");
    for (const file of [
      expiredTmp,
      freshTmp,
      expiredCache,
      freshCache,
      expiredLog,
      freshLog,
    ]) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, "runtime", "utf8");
    }
    for (const file of [expiredTmp, expiredCache, expiredLog]) {
      await fs.utimes(file, expiredAt, expiredAt);
    }
    for (const file of [freshTmp, freshCache, freshLog]) {
      await fs.utimes(file, freshAt, freshAt);
    }

    const cleanup = await cleanupRuntimePersistenceRetention({ nowMs });

    assert.isFalse(await pathExists(expiredTmp));
    assert.isFalse(await pathExists(expiredCache));
    assert.isFalse(await pathExists(expiredLog));
    assert.isTrue(await pathExists(freshTmp));
    assert.isTrue(await pathExists(freshCache));
    assert.isTrue(await pathExists(freshLog));
    assert.equal((cleanup.details as any).expiredRuntimeAssetCount, 3);
    assert.deepEqual((cleanup.details as any).expiredRuntimeAssetsDeleted, {
      tmp: 1,
      cache: 1,
      logs: 1,
    });
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
    const missingProduct: WorkflowProductRecord = {
      schemaVersion: 2,
      productId: "product-missing",
      productKey: "product-missing",
      kind: "workflow.product",
      title: "Missing product",
      workflowId: "workflow",
      workflowLabel: "Workflow",
      backendType: "workflow-product",
      requestId: "request",
      storageRevision: "0123456789abcdef",
      assets: [
        {
          assetId: "missing",
          label: "Missing",
          relativePath: "missing.md",
          availability: "available",
          size: 1,
        },
      ],
      metadata: {},
      createdAt: "2026-05-25T00:00:00.000Z",
      updatedAt: "2026-05-25T00:00:00.000Z",
    };
    upsertPluginTaskRowEntry(PLUGIN_TASK_DOMAIN_WORKFLOW_PRODUCTS, "products", {
      taskId: "product-missing",
      requestId: "request",
      backendId: "workflow-product",
      state: "available",
      updatedAt: "2026-05-25T00:00:00.000Z",
      payload: JSON.stringify(missingProduct),
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

  it("does not report the WebDAV Sync workspace as a misplaced durable asset", async function () {
    const paths = getRuntimePersistencePaths();
    const syncFiles = [
      path.join(
        paths.runtimeRoot,
        "synthesis",
        "webdav-sync",
        "webdav-sync-state.json",
      ),
    ];
    for (const file of syncFiles) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, "{}", "utf8");
    }

    const report = await scanPersistenceIntegrity();

    assert.notInclude(
      report.issues.map((issue) => issue.type),
      "forbidden_durable_asset_in_runtime",
    );
  });

  it("cleans only the two retired Git runtime roots and nine prefs idempotently", async function () {
    const paths = getRuntimePersistencePaths();
    const retiredRoots = [
      path.join(paths.runtimeRoot, "synthesis", "git-sync"),
      path.join(paths.runtimeRoot, "synthesis", "git-sync-worktree"),
    ];
    const externalRoot = path.join(tempRoot, "external-git-repository");
    const webDavRoot = path.join(paths.runtimeRoot, "synthesis", "webdav-sync");
    for (const root of [...retiredRoots, externalRoot, webDavRoot]) {
      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(path.join(root, "sentinel.txt"), root, "utf8");
    }
    for (const key of RETIRED_SYNTHESIS_GIT_SYNC_PREFS) {
      (globalThis as any).Zotero.Prefs.set(
        `extensions.zotero.zotero-skills.${key}`,
        key === "synthesisGitSyncRemoteUrl"
          ? `file://${externalRoot}`
          : "retired",
        true,
      );
    }

    const first = await cleanupRetiredSynthesisGitSyncRuntime(
      paths.runtimeRoot,
    );
    const second = await cleanupRetiredSynthesisGitSyncRuntime(
      paths.runtimeRoot,
    );

    assert.sameMembers(first.removedPaths, retiredRoots);
    assert.deepEqual(second.removedPaths, []);
    for (const root of retiredRoots) {
      assert.isFalse(await pathExists(root));
    }
    assert.isTrue(await pathExists(path.join(externalRoot, "sentinel.txt")));
    assert.isTrue(await pathExists(path.join(webDavRoot, "sentinel.txt")));
    for (const key of RETIRED_SYNTHESIS_GIT_SYNC_PREFS) {
      assert.isUndefined(
        (globalThis as any).Zotero.Prefs.get(
          `extensions.zotero.zotero-skills.${key}`,
          true,
        ),
      );
    }
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
