import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  buildSynthesisKnowledgeGraphPaths,
  buildSynthesisStoragePaths,
  createCanonicalEnvelope,
  hashCanonicalJson,
  readProjectionRegistryState,
} from "../../src/modules/synthesis/foundation";
import {
  createSynthesisGitSyncService as createBaseSynthesisGitSyncService,
  type SynthesisGitSyncAdapter,
} from "../../src/modules/synthesis/gitSync";
import {
  readSynthesisGitSyncToken,
  storeSynthesisGitSyncToken,
} from "../../src/modules/synthesis/gitSyncTokenPrefs";
import {
  clearGitSyncToken,
  getGitSyncPrefsStatus,
  saveGitSyncPrefs,
  testGitSyncConfiguration,
} from "../../src/modules/synthesis/gitSyncPrefs";
import {
  createSynthesisGitCommandAdapter,
  defaultSynthesisGitCommandRunner,
  isMissingRemoteBranchResult,
  SynthesisGitCommandInvocation,
  SynthesisGitCommandRunner,
} from "../../src/modules/synthesis/gitSyncCommandAdapter";
import { resolveSynthesisGitExecutable } from "../../src/modules/synthesis/gitExecutableResolver";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import {
  readRuntimeTextFile,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";
import { getPref, setPref } from "../../src/utils/prefs";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-git-sync-"));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createSynthesisGitSyncService(
  options: Parameters<typeof createBaseSynthesisGitSyncService>[0],
) {
  return createBaseSynthesisGitSyncService({
    allowRepositoryCreateForTests: true,
    ...options,
  });
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 3000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await delay(10);
  }
  assert.fail("condition was not reached before timeout");
}

function tagEnvelope(tag: string, note = "") {
  return createCanonicalEnvelope({
    schemaId: "synthesis.test_tag_asset",
    data: {
      tag,
      note,
    },
    now: "2026-05-25T00:00:00.000Z",
  });
}

async function writeTagAsset(root: string, tag: string, note = "") {
  createSynthesisRepository({ runtimeRoot: root }).upsertTagVocabularyEntry({
    tag,
    facet: "field",
    source: "manual",
  });
  const paths = buildSynthesisKnowledgeGraphPaths(root);
  await writeRuntimeTextFile(
    path.join(paths.tagsRoot, "vocabulary.json"),
    `${JSON.stringify(tagEnvelope(tag, note), null, 2)}\n`,
  );
}

async function saveServiceVocabulary(
  service: ReturnType<typeof createSynthesisService>,
  tag: string,
  transactionId: string,
) {
  await service.saveTagVocabulary({
    transactionId,
    entries: [
      {
        tag,
        facet: "field",
        source: "manual",
      },
    ],
  });
}

function artifactNote(args: {
  payloadType: string;
  value: string;
  format?: string;
  updatedAt?: string;
}) {
  const encoded = Buffer.from(args.value, "utf8").toString("base64");
  return {
    key: `${args.payloadType}-note`,
    title: args.payloadType,
    updatedAt: args.updatedAt || "2026-05-10T00:00:00.000Z",
    html: `<span data-zs-block="payload" data-zs-payload="${args.payloadType}" data-zs-version="1" data-zs-format="${args.format || "markdown"}" data-zs-encoding="base64" data-zs-value="${encoded}"></span>`,
  };
}

function registryInput(itemKey: string, digest = `# Digest ${itemKey}`) {
  return {
    libraryId: 1,
    itemKey,
    title: `Paper ${itemKey}`,
    year: "2024",
    itemType: "journalArticle",
    tags: ["topic:git-sync"],
    collections: [],
    notes: [
      artifactNote({
        payloadType: "digest-markdown",
        value: digest,
        format: "markdown",
      }),
      artifactNote({
        payloadType: "references-json",
        value: JSON.stringify({ references: [] }),
        format: "json",
      }),
      artifactNote({
        payloadType: "citation-analysis-json",
        value: JSON.stringify({ citations: [] }),
        format: "json",
      }),
    ],
  };
}

describe("Synthesis git sync", function () {
  this.timeout(12000);

  beforeEach(function () {
    setPref("synthesisGitSyncEnabled", false);
    setPref("synthesisGitSyncRemoteUrl", "");
    setPref("synthesisGitSyncBranch", "main");
    setPref("synthesisGitSyncTokenEncryptedJson", "");
    setPref("synthesisGitSyncTokenMasked", "");
    setPref("synthesisGitSyncTokenUpdatedAt", "");
    setPref("synthesisGitSyncAutoSyncEnabled", false);
    setPref("synthesisGitSyncAutoRetryEnabled", false);
    setPref("synthesisGitSyncConnectionTestJson", "");
  });

  it("exports durable facts from persistence root while reading topic assets from artifact root", async function () {
    const base = await makeRuntimeRoot();
    const persistenceRoot = path.join(base, "zotero-agents");
    const artifactRoot = path.join(persistenceRoot, "data");
    const repository = createSynthesisRepository({
      runtimeRoot: persistenceRoot,
    });
    repository.upsertConcept({
      conceptId: "concept:root-split",
      label: "Root split",
      conceptType: "method",
      domain: "sync",
      status: "accepted",
    });
    repository.upsertCanonicalReference({
      canonicalReferenceId: "canonical:root-split",
      title: "Root Split Paper",
      normalizedTitle: "root split paper",
      status: "active",
    });
    repository.upsertTagVocabularyEntry({
      tag: "field:sync",
      facet: "field",
      source: "manual",
    });
    await writeRuntimeTextFile(
      path.join(
        buildSynthesisStoragePaths(artifactRoot, "topic-root-split")
          .currentRoot,
        "brief.md",
      ),
      "# Root Split\n",
    );
    const service = createBaseSynthesisGitSyncService({
      root: artifactRoot,
      persistenceRoot,
      repository,
      adapter: { merge: () => ({ status: "clean" }) },
    });

    const exported = await service.exportCanonicalSnapshot();
    const manifest = JSON.parse(
      await readRuntimeTextFile(
        path.join(exported.exportRoot, "manifest.json"),
      ),
    );

    assert.includeMembers(
      manifest.assets.map(
        (asset: { bundle_kind?: string }) => asset.bundle_kind,
      ),
      ["concepts", "references", "tags", "topics"],
    );
    assert.isFalse(
      await runtimePathExists(
        path.join(artifactRoot, "state", "zotero-agents.db"),
      ),
    );
    assert.isFalse(
      await runtimePathExists(path.join(artifactRoot, "state", "synthesis.db")),
    );
  });

  it("blocks sync when persistence root points at the artifact data directory", async function () {
    const base = await makeRuntimeRoot();
    const artifactRoot = path.join(base, "zotero-agents", "data");
    const repository = createSynthesisRepository({ runtimeRoot: base });
    let fetchCount = 0;
    const service = createBaseSynthesisGitSyncService({
      root: artifactRoot,
      persistenceRoot: artifactRoot,
      repository,
      adapter: {
        fetch: () => {
          fetchCount += 1;
        },
      },
    });

    const state = await service.runSync();

    assert.equal(state.queue_state, "failed_permanent");
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "git_sync_persistence_root_misaligned",
    );
    assert.equal(fetchCount, 0);
    assert.isFalse(
      await runtimePathExists(
        path.join(artifactRoot, "state", "zotero-agents.db"),
      ),
    );
    assert.isFalse(
      await runtimePathExists(path.join(artifactRoot, "state", "synthesis.db")),
    );
  });

  it("reports an existing shadow database under artifact data root without deleting it", async function () {
    const base = await makeRuntimeRoot();
    const persistenceRoot = path.join(base, "zotero-agents");
    const artifactRoot = path.join(persistenceRoot, "data");
    const shadowDbPath = path.join(artifactRoot, "state", "synthesis.db");
    await writeRuntimeTextFile(shadowDbPath, "shadow");
    const service = createBaseSynthesisGitSyncService({
      root: artifactRoot,
      persistenceRoot,
      repository: createSynthesisRepository({ runtimeRoot: persistenceRoot }),
      adapter: { merge: () => ({ status: "clean" }) },
    });

    const state = await service.loadGitSyncState();

    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "synthesis_root_shadow_database_detected",
    );
    assert.equal(await readRuntimeTextFile(shadowDbPath), "shadow");
  });

  it("stores Git Sync tokens as encrypted prefs without plaintext fallback", async function () {
    const token = "ghp_super-secret-token";

    const stored = await storeSynthesisGitSyncToken(token);
    const encrypted = String(
      getPref("synthesisGitSyncTokenEncryptedJson") || "",
    );
    const read = await readSynthesisGitSyncToken();

    assert.isTrue(stored.stored);
    assert.notInclude(encrypted, token);
    assert.include(String(getPref("synthesisGitSyncTokenMasked") || ""), "...");
    assert.deepEqual(read, { ok: true, token });

    setPref("synthesisGitSyncTokenEncryptedJson", '{"bad":true}');
    const broken = await readSynthesisGitSyncToken();
    assert.isFalse(broken.ok);
    assert.equal(broken.ok ? "" : broken.code, "git_sync_token_decrypt_failed");
    assert.notInclude(JSON.stringify(broken), token);
  });

  it("saves prefs-backed Git Sync config and rejects credential-bearing remotes", function () {
    const saved = saveGitSyncPrefs({
      enabled: true,
      remoteUrl: "https://example.invalid/repo.git",
      branch: "sync",
      autoSyncEnabled: true,
      autoRetryEnabled: false,
    });

    assert.isTrue(saved.ok);
    assert.deepInclude(getGitSyncPrefsStatus(), {
      enabled: true,
      remote_url: "https://example.invalid/repo.git",
      branch: "sync",
      auto_sync_enabled: true,
      auto_retry_enabled: false,
      config_status: "configured",
    });

    const rejected = saveGitSyncPrefs({
      remoteUrl: "https://user:secret@example.invalid/repo.git?token=abc",
    });

    assert.isFalse(rejected.ok);
    assert.equal(
      getGitSyncPrefsStatus().remote_url,
      "https://example.invalid/repo.git",
    );
    assert.include(
      rejected.diagnostics.map((entry) => entry.code),
      "git_sync_remote_url_credentials_rejected",
    );
    assert.notInclude(JSON.stringify(rejected), "secret");
    assert.notInclude(JSON.stringify(rejected), "abc");
  });

  it("clears encrypted Git Sync token prefs through the config facade", async function () {
    await storeSynthesisGitSyncToken("ghp_clear-me");

    const cleared = await clearGitSyncToken();

    assert.isTrue(cleared.ok);
    assert.equal(getPref("synthesisGitSyncTokenEncryptedJson"), "");
    assert.equal(getPref("synthesisGitSyncTokenMasked"), "");
    assert.equal(getPref("synthesisGitSyncTokenUpdatedAt"), "");
  });

  it("tests Git Sync configuration without mutating a worktree", async function () {
    saveGitSyncPrefs({
      enabled: true,
      remoteUrl: "https://example.invalid/repo.git",
      branch: "main",
    });
    const invocations: SynthesisGitCommandInvocation[] = [];
    const result = await testGitSyncConfiguration({
      cwd: "C:/not-a-worktree",
      commandRunner: async (invocation) => {
        invocations.push(invocation);
        if (invocation.args.includes("ls-remote")) {
          return {
            exitCode: 0,
            stdout: "abc123\trefs/heads/main\n",
          };
        }
        return { exitCode: 0, stdout: "git version 2.0.0\n" };
      },
    });

    assert.isTrue(result.ok);
    assert.equal(result.remote_branch_state, "exists");
    assert.deepEqual(
      invocations.map((entry) => entry.args[0]),
      ["--version", "ls-remote"],
    );
    assert.isFalse(
      invocations.some((entry) =>
        ["init", "fetch", "commit", "push"].some((command) =>
          entry.args.includes(command),
        ),
      ),
    );
    const stored = JSON.parse(
      String(getPref("synthesisGitSyncConnectionTestJson")),
    );
    assert.isTrue(stored.ok);
    assert.equal(stored.remote_branch_state, "exists");
  });

  it("treats a missing remote branch as initializable during connection test", async function () {
    saveGitSyncPrefs({
      enabled: true,
      remoteUrl: "https://example.invalid/repo.git",
      branch: "main",
    });
    const result = await testGitSyncConfiguration({
      cwd: "C:/not-a-worktree",
      commandRunner: async (invocation) => {
        if (invocation.args.includes("ls-remote")) {
          return { exitCode: 0, stdout: "" };
        }
        return { exitCode: 0, stdout: "git version 2.0.0\n" };
      },
    });

    assert.isTrue(result.ok);
    assert.equal(result.remote_branch_state, "missing_initializable");
    assert.include(
      result.diagnostics.map((entry) => entry.code),
      "git_sync_token_missing",
    );
    assert.include(
      result.diagnostics.map((entry) => entry.code),
      "git_sync_remote_branch_missing_initializable",
    );
  });

  it("clears stale Git Sync connection test status when configuration changes", async function () {
    saveGitSyncPrefs({
      enabled: true,
      remoteUrl: "https://example.invalid/repo.git",
      branch: "main",
    });
    await testGitSyncConfiguration({
      commandRunner: async (invocation) =>
        invocation.args.includes("ls-remote")
          ? { exitCode: 0, stdout: "abc123\trefs/heads/main\n" }
          : { exitCode: 0, stdout: "git version 2.0.0\n" },
    });

    assert.isDefined(getGitSyncPrefsStatus().connection_test);

    saveGitSyncPrefs({
      branch: "trunk",
    });

    assert.isUndefined(getGitSyncPrefsStatus().connection_test);
  });

  it("reports remote access failures separately from missing branch initialization", async function () {
    saveGitSyncPrefs({
      enabled: true,
      remoteUrl: "https://example.invalid/repo.git",
      branch: "main",
    });
    const result = await testGitSyncConfiguration({
      cwd: "C:/not-a-worktree",
      commandRunner: async (invocation) => {
        if (invocation.args.includes("ls-remote")) {
          return {
            exitCode: 128,
            stderr:
              "fatal: Authentication failed for https://secret@example.invalid/repo.git",
          };
        }
        return { exitCode: 0, stdout: "git version 2.0.0\n" };
      },
    });

    assert.isFalse(result.ok);
    assert.equal(result.remote_branch_state, "unknown");
    assert.include(
      result.diagnostics.map((entry) => entry.code),
      "git_sync_remote_branch_unavailable",
    );
    assert.notInclude(JSON.stringify(result), "secret@example.invalid");
  });

  it("auto-detects Git for Windows from known install paths", async function () {
    const previousZotero = Object.getOwnPropertyDescriptor(
      globalThis,
      "Zotero",
    );
    const previousIOUtils = Object.getOwnPropertyDescriptor(
      globalThis,
      "IOUtils",
    );
    Object.defineProperty(globalThis, "Zotero", {
      configurable: true,
      value: { isWin: true },
    });
    Object.defineProperty(globalThis, "IOUtils", {
      configurable: true,
      value: {
        exists: async (targetPath: string) =>
          /C:\\Program Files\\Git\\cmd\\git\.exe$/i.test(targetPath),
      },
    });
    try {
      const resolved = await resolveSynthesisGitExecutable({
        pathSearch: async () => null,
        platform: "win32",
      });

      assert.isTrue(resolved.available);
      assert.equal(resolved.command, "C:\\Program Files\\Git\\cmd\\git.exe");
      assert.equal(resolved.source, "knownPath");
      assert.include(
        resolved.checkedPaths,
        "C:\\Program Files\\Git\\cmd\\git.exe",
      );
    } finally {
      if (previousZotero) {
        Object.defineProperty(globalThis, "Zotero", previousZotero);
      } else {
        delete (globalThis as { Zotero?: unknown }).Zotero;
      }
      if (previousIOUtils) {
        Object.defineProperty(globalThis, "IOUtils", previousIOUtils);
      } else {
        delete (globalThis as { IOUtils?: unknown }).IOUtils;
      }
    }
  });

  it("runs Git through Mozilla subprocess with the requested worktree cwd", async function () {
    const runtime = globalThis as {
      ChromeUtils?: unknown;
      Zotero?: {
        Utilities?: { Internal?: { subprocess?: unknown } };
      };
    };
    const previousChromeUtils = runtime.ChromeUtils;
    const previousUtilities = runtime.Zotero?.Utilities;
    const calls: Array<Record<string, unknown>> = [];
    let zoteroSubprocessCalled = false;
    runtime.ChromeUtils = {
      importESModule: () => ({
        Subprocess: {
          call: async (args: Record<string, unknown>) => {
            calls.push(args);
            let stdout = "D:/safe/worktree\n";
            return {
              stdout: {
                readString: async () => {
                  const chunk = stdout;
                  stdout = "";
                  return chunk;
                },
              },
              stderr: { readString: async () => "" },
              wait: async () => 0,
            };
          },
        },
      }),
    };
    runtime.Zotero = runtime.Zotero || ({} as any);
    runtime.Zotero.Utilities = {
      Internal: {
        subprocess: async () => {
          zoteroSubprocessCalled = true;
          return "D:/wrong/cwd\n";
        },
      },
    };
    try {
      const result = await defaultSynthesisGitCommandRunner({
        command: "git",
        args: ["rev-parse", "--show-toplevel"],
        cwd: "D:\\safe\\worktree",
      });

      assert.equal(result.exitCode, 0);
      assert.equal(calls[0]?.workdir, "D:\\safe\\worktree");
      assert.deepEqual(calls[0]?.arguments, ["rev-parse", "--show-toplevel"]);
      assert.isFalse(zoteroSubprocessCalled);
    } finally {
      runtime.ChromeUtils = previousChromeUtils;
      if (runtime.Zotero) {
        runtime.Zotero.Utilities = previousUtilities;
      }
    }
  });

  it("drains Mozilla subprocess stderr after process exit", async function () {
    const runtime = globalThis as { ChromeUtils?: unknown };
    const previousChromeUtils = runtime.ChromeUtils;
    let waited = false;
    runtime.ChromeUtils = {
      importESModule: () => ({
        Subprocess: {
          call: async () => {
            let stderr = "fatal: couldn't find remote ref main\n";
            return {
              stdout: { readString: async () => "" },
              stderr: {
                readString: async () => {
                  if (!waited) {
                    return "";
                  }
                  const chunk = stderr;
                  stderr = "";
                  return chunk;
                },
              },
              wait: async () => {
                waited = true;
                return 128;
              },
            };
          },
        },
      }),
    };
    try {
      const result = await defaultSynthesisGitCommandRunner({
        command: "git",
        args: ["fetch", "origin", "main"],
        cwd: "D:\\safe\\worktree",
      });

      assert.equal(result.exitCode, 128);
      assert.include(result.stderr || "", "couldn't find remote ref main");
      assert.isTrue(isMissingRemoteBranchResult(result));
    } finally {
      runtime.ChromeUtils = previousChromeUtils;
    }
  });

  it("initializes disabled state when no Git adapter is configured", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisGitSyncService({ root });

    const state = await service.loadGitSyncState();

    assert.equal(state.queue_state, "disabled");
    assert.isFalse(state.adapter_configured);
    assert.deepEqual(state.allowed_actions, []);
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "git_sync_adapter_missing",
    );
  });

  it("exports only allowlisted canonical assets and redacts sensitive diagnostics", async function () {
    const root = await makeRuntimeRoot();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    await writeTagAsset(root, "model:transformer");
    await writeRuntimeTextFile(
      path.join(paths.sidecarRoot, "tag-index.json"),
      '{"projection":true}\n',
    );
    await writeRuntimeTextFile(
      path.join(paths.tagsRoot, "secret.json"),
      '{"schema_id":"x","schema_version":"1.0.0","data":{"access_token":"abc"}}\n',
    );
    const service = createSynthesisGitSyncService({ root });

    const exported = await service.exportCanonicalSnapshot();

    assert.isTrue(
      await runtimePathExists(
        path.join(exported.exportRoot, "bundles", "tags.json"),
      ),
    );
    assert.isFalse(
      await runtimePathExists(
        path.join(exported.exportRoot, "state", "tag-index.json"),
      ),
    );
    assert.isFalse(
      await runtimePathExists(
        path.join(exported.exportRoot, "tags", "secret.json"),
      ),
    );
    assert.notInclude(
      exported.diagnostics.map((entry) => entry.code),
      "sensitive_asset_rejected",
    );
    assert.notInclude(JSON.stringify(exported), "access_token");
    assert.notInclude(JSON.stringify(exported), "secret.json");
  });

  it("rejects import snapshots with non-allowlisted assets before promotion", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisGitSyncService({ root });
    const candidateRoot = path.join(root, "candidate", "synthesis");
    await writeRuntimeTextFile(
      path.join(candidateRoot, "citation-graph", "cache.json"),
      '{"schema_id":"bad","schema_version":"1.0.0","data":{}}\n',
    );

    const validation =
      await service.validateGitSyncImportSnapshot(candidateRoot);
    const imported = await service.importCanonicalSnapshot({
      synthesisRoot: candidateRoot,
    });

    assert.isFalse(validation.ok);
    assert.include(
      validation.diagnostics.map((entry) => entry.code),
      "projection_asset_rejected",
    );
    assert.isFalse(imported.ok);
  });

  it("reports oversized import bundles with structured size details", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisGitSyncService({ root });
    const candidateRoot = path.join(
      root,
      "candidate-large-bundle",
      "synthesis",
    );
    await writeRuntimeTextFile(
      path.join(candidateRoot, "bundles", "large.json"),
      `${JSON.stringify({
        schema_id: "synthesis.durable_asset_bundle",
        schema_version: "2.0.0",
        bundle_kind: "tags",
        entries: [],
        padding: "x".repeat(5 * 1024 * 1024 + 1),
      })}\n`,
    );

    const validation =
      await service.validateGitSyncImportSnapshot(candidateRoot);
    const diagnostic = validation.diagnostics.find(
      (entry) => entry.code === "bundle_size_limit_exceeded",
    );

    assert.isFalse(validation.ok);
    assert.isOk(diagnostic);
    assert.equal(diagnostic?.asset_path, "bundles/large.json");
    assert.equal(
      (diagnostic?.details as Record<string, unknown>)?.max_bytes,
      5 * 1024 * 1024,
    );
    assert.isAbove(
      Number((diagnostic?.details as Record<string, unknown>)?.bytes || 0),
      5 * 1024 * 1024,
    );
  });

  it("rejects import snapshots with managed path policy violations before promotion", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:local");
    const service = createSynthesisGitSyncService({ root });
    const candidateRoot = path.join(
      root,
      "candidate-managed-path",
      "synthesis",
    );
    await writeRuntimeTextFile(
      path.join(candidateRoot, "tags", "CON.json"),
      `${JSON.stringify(tagEnvelope("model:remote"), null, 2)}\n`,
    );

    const validation =
      await service.validateGitSyncImportSnapshot(candidateRoot);
    const imported = await service.importCanonicalSnapshot({
      synthesisRoot: candidateRoot,
    });
    const local = await readRuntimeTextFile(
      path.join(
        buildSynthesisKnowledgeGraphPaths(root).tagsRoot,
        "vocabulary.json",
      ),
    );

    assert.isFalse(validation.ok);
    assert.include(
      validation.diagnostics.map((entry) => entry.code),
      "managed_path_reserved_name",
    );
    assert.isFalse(imported.ok);
    assert.include(local, "model:local");
    assert.notInclude(local, "model:remote");
  });

  it("runs a successful adapter-backed sync and emits one canonical event", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    const progressReports: Array<{
      status: string;
      phase?: string;
      processedCount?: number;
      totalCount?: number;
    }> = [];
    const adapter: SynthesisGitSyncAdapter = {
      describeRemote: () => ({
        remoteUrl: "https://user:secret@example.invalid/repo.git",
        branch: "main",
      }),
      merge: () => ({ status: "clean" }),
    };
    const service = createSynthesisGitSyncService({
      root,
      adapter,
      now: () => "2026-05-25T00:00:00.000Z",
      progressReporter: (report) => {
        progressReports.push(report);
      },
    });

    const state = await service.runSync();
    const events = createSynthesisRepository({ runtimeRoot: root })
      .listCanonicalStoreRecords({
        recordKinds: ["event"],
        scopes: ["sync"],
      })
      .map((record) => JSON.parse(record.payloadJson));
    const receipts = createSynthesisRepository({ runtimeRoot: root })
      .listCanonicalStoreRecords({
        recordKinds: ["receipt"],
        scopes: ["sync"],
      })
      .map((record) => JSON.parse(record.payloadJson));
    const projections = await readProjectionRegistryState(root);

    assert.equal(state.queue_state, "idle");
    assert.equal(state.last_run?.status, "success");
    assert.equal(
      state.remote_url,
      "https://[redacted]@example.invalid/repo.git",
    );
    assert.lengthOf(events, 1);
    assert.includeMembers(events[0].changed_assets, [
      "sync/sync-manifest.json",
    ]);
    assert.includeMembers(receipts[0].changed_assets, [
      "sync/sync-manifest.json",
    ]);
    assert.isTrue(projections.projections["tag-index"].stale);
    assert.includeMembers(
      progressReports.map((report) => report.phase),
      [
        "lock",
        "export",
        "copy",
        "fetch",
        "merge",
        "validate",
        "push",
        "import",
        "cleanup",
      ],
    );
    assert.deepInclude(progressReports.at(-1), {
      status: "completed",
      phase: "cleanup",
      processedCount: 9,
      totalCount: 9,
    });
  });

  it("blocks conflicts before importing remote changes", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:local");
    const adapter: SynthesisGitSyncAdapter = {
      merge: () => ({
        status: "conflict",
        conflicts: [
          {
            asset_path: "tags/vocabulary.json",
            reason: "both_changed",
            local_hash: "sha256:local",
            remote_hash: "sha256:remote",
          },
        ],
      }),
    };
    const service = createSynthesisGitSyncService({ root, adapter });

    const state = await service.runSync();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const local = await readRuntimeTextFile(
      path.join(paths.tagsRoot, "vocabulary.json"),
    );

    assert.equal(state.queue_state, "blocked_conflict");
    assert.equal(
      state.conflict_report?.conflicts[0]?.asset_path,
      "tags/vocabulary.json",
    );
    assert.include(local, "model:local");
    assert.equal((await readRuntimeTextFile(paths.eventsLog)).trim(), "");
  });

  it("resolves conflict approvals with conservative semantic actions", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:local");
    const service = createSynthesisGitSyncService({
      root,
      adapter: {
        merge: () => ({
          status: "conflict",
          conflicts: [
            {
              asset_path: "tags/vocabulary.json",
              reason: "both_changed",
              local_hash: "sha256:local",
              remote_hash: "sha256:remote",
            },
          ],
        }),
      },
    });

    const blocked = await service.runSync();
    const copied = await service.resolveGitSyncConflict({
      action: "save_remote_copy",
    });
    const unsupported = await service.resolveGitSyncConflict({
      action: "use_remote",
    });
    const kept = await service.resolveGitSyncConflict({
      action: "keep_local",
    });

    assert.equal(blocked.queue_state, "blocked_conflict");
    assert.deepEqual(blocked.conflict_actions, [
      "keep_local",
      "save_remote_copy",
      "clear_after_manual_edit",
    ]);
    assert.equal(copied.queue_state, "blocked_conflict");
    assert.include(
      copied.diagnostics.map((entry) => entry.code),
      "git_sync_remote_conflict_copy_saved",
    );
    assert.include(
      unsupported.diagnostics.map((entry) => entry.code),
      "git_sync_conflict_action_unsupported",
    );
    assert.equal(unsupported.queue_state, "blocked_conflict");
    assert.equal(kept.queue_state, "queued");
    assert.equal(kept.conflict_report?.status, "resolved");
  });

  it("keeps local assets unchanged when import validation fails", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:local");
    const service = createSynthesisGitSyncService({ root });
    const exported = await service.exportCanonicalSnapshot();
    const manifestPath = path.join(
      exported.exportRoot,
      "sync",
      "sync-manifest.json",
    );
    const manifest = JSON.parse(await readRuntimeTextFile(manifestPath));
    manifest.data.manifest_hash = "sha256:bad";
    await writeRuntimeTextFile(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await writeRuntimeTextFile(
      path.join(exported.exportRoot, "tags", "vocabulary.json"),
      `${JSON.stringify(tagEnvelope("model:remote"), null, 2)}\n`,
    );

    const imported = await service.importCanonicalSnapshot({
      synthesisRoot: exported.exportRoot,
    });
    const local = await readRuntimeTextFile(
      path.join(
        buildSynthesisKnowledgeGraphPaths(root).tagsRoot,
        "vocabulary.json",
      ),
    );

    assert.isFalse(imported.ok);
    assert.include(local, "model:local");
    assert.notInclude(local, "model:remote");
  });

  it("rolls back imported assets when promotion fails after partial progress", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:local");
    const service = createSynthesisGitSyncService({ root });
    const exported = await service.exportCanonicalSnapshot();
    try {
      await service.importCanonicalSnapshot({
        synthesisRoot: exported.exportRoot,
        onBeforePromoteAsset(asset) {
          if (asset.relativePath === "sync/sync-manifest.json") {
            throw new Error("promotion failed");
          }
        },
      });
      assert.fail("expected import promotion failure");
    } catch (error) {
      assert.match(
        error instanceof Error ? error.message : String(error),
        /promotion failed/,
      );
    }

    const local = await readRuntimeTextFile(
      path.join(
        buildSynthesisKnowledgeGraphPaths(root).tagsRoot,
        "vocabulary.json",
      ),
    );
    assert.include(local, "model:local");
    assert.notInclude(local, "model:remote");
  });

  it("uses persistent lock files to block concurrent sync and take over stale locks", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    let releaseMerge!: () => void;
    const firstMerge = new Promise<void>((resolve) => {
      releaseMerge = resolve;
    });
    const first = createSynthesisGitSyncService({
      root,
      adapter: {
        merge: async () => {
          await firstMerge;
          return { status: "clean" };
        },
      },
    });
    const firstRun = first.runSync();
    const lockPath = path.join(
      root,
      "runtime",
      "synthesis",
      "git-sync",
      "git-sync-lock.json",
    );
    await waitFor(() => runtimePathExists(lockPath));

    let secondMergeCount = 0;
    const second = createSynthesisGitSyncService({
      root,
      adapter: {
        merge: () => {
          secondMergeCount += 1;
          return { status: "clean" };
        },
      },
    });
    const blocked = await second.runSync();
    assert.equal(blocked.queue_state, "queued");
    assert.equal(secondMergeCount, 0);

    releaseMerge();
    await firstRun;

    await writeRuntimeTextFile(
      lockPath,
      `${JSON.stringify(
        {
          schema_id: "synthesis.git_sync_lock",
          schema_version: "1.0.0",
          run_id: "stale",
          owner: "other",
          acquired_at: "2026-05-25T00:00:00.000Z",
          expires_at: "2026-05-25T00:00:00.000Z",
        },
        null,
        2,
      )}\n`,
    );
    const takeover = await second.runSync();
    assert.equal(takeover.queue_state, "idle");
    assert.equal(secondMergeCount, 1);
    assert.include(
      (takeover.last_run?.diagnostics || []).map((entry) => entry.code),
      "git_sync_stale_lock_takeover",
    );
  });

  it("recovers a persisted syncing state when the lock is stale", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    const timestamp = "2026-06-15T12:30:00.000Z";
    const syncRoot = path.join(root, "runtime", "synthesis", "git-sync");
    const statePath = path.join(syncRoot, "git-sync-state.json");
    const lockPath = path.join(syncRoot, "git-sync-lock.json");
    await writeRuntimeTextFile(
      statePath,
      `${JSON.stringify(
        {
          schema_id: "synthesis.git_sync_state",
          schema_version: "1.0.0",
          queue_state: "syncing",
          paused: true,
          adapter_configured: true,
          remote_url: "",
          branch: "main",
          worktree_path: path.join(
            root,
            "runtime",
            "synthesis",
            "git-sync-worktree",
          ),
          diagnostics: [],
          allowed_actions: ["pauseGitSync"],
          updated_at: "2026-06-15T12:00:00.000Z",
        },
        null,
        2,
      )}\n`,
    );
    await writeRuntimeTextFile(
      lockPath,
      `${JSON.stringify(
        {
          schema_id: "synthesis.git_sync_lock",
          schema_version: "1.0.0",
          run_id: "git-sync-stale",
          owner: "old-owner",
          acquired_at: "2026-06-15T12:00:00.000Z",
          expires_at: "2026-06-15T12:05:00.000Z",
        },
        null,
        2,
      )}\n`,
    );
    const service = createSynthesisGitSyncService({
      root,
      now: () => timestamp,
      adapter: {
        merge: () => ({ status: "clean" }),
      },
    });

    const recovered = await service.loadGitSyncState();

    assert.equal(recovered.queue_state, "failed_retryable");
    assert.isTrue(recovered.paused);
    assert.includeMembers(recovered.allowed_actions, [
      "resumeGitSync",
      "syncNow",
    ]);
    assert.notInclude(recovered.allowed_actions, "pauseGitSync");
    assert.include(
      recovered.diagnostics.map((entry) => entry.code),
      "git_sync_stale_sync_state_recovered",
    );
    assert.isFalse(await runtimePathExists(lockPath));
  });

  it("debounces canonical store change notifications into one worker run", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    let mergeCount = 0;
    const service = createSynthesisGitSyncService({
      root,
      debounceMs: 20,
      adapter: {
        merge: () => {
          mergeCount += 1;
          return { status: "clean" };
        },
      },
    });

    await service.notifyCanonicalStoreChanged();
    await service.notifyCanonicalStoreChanged();
    await service.notifyCanonicalStoreChanged();
    await waitFor(async () => mergeCount === 1);
    await delay(40);

    assert.equal(mergeCount, 1);
  });

  it("autosyncs service-level canonical writes through the debounce worker", async function () {
    this.timeout(30000);
    const root = await makeRuntimeRoot();
    let mergeCount = 0;
    let resolveMergeObserved: () => void = () => undefined;
    const mergeObserved = new Promise<void>((resolve) => {
      resolveMergeObserved = resolve;
    });
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncAutoSyncEnabled: true,
      gitSyncDebounceMs: 20,
      gitSyncAdapter: {
        merge: () => {
          mergeCount += 1;
          resolveMergeObserved();
          return { status: "clean" };
        },
      },
    });

    await saveServiceVocabulary(
      service,
      "field:service_autosync",
      "service-autosync-save",
    );
    await Promise.race([
      mergeObserved,
      delay(25000).then(() =>
        assert.fail("autosync merge was not observed before timeout"),
      ),
    ]);
    await waitFor(async () => {
      const state = await service.loadGitSyncState();
      return state.queue_state === "idle";
    }, 25000);

    const state = await service.loadGitSyncState();
    assert.equal(state.queue_state, "idle");
    assert.equal(mergeCount, 1);
  });

  it("does not autosync service-level canonical writes by default", async function () {
    const root = await makeRuntimeRoot();
    let mergeCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncDebounceMs: 20,
      gitSyncAdapter: {
        merge: () => {
          mergeCount += 1;
          return { status: "clean" };
        },
      },
    });

    await saveServiceVocabulary(
      service,
      "field:service_autosync_default_off",
      "service-autosync-default-off",
    );
    await delay(60);

    const state = await service.loadGitSyncState();
    assert.equal(state.queue_state, "idle");
    assert.equal(mergeCount, 0);
  });

  it("coalesces multiple service-level canonical writes into one autosync run", async function () {
    const root = await makeRuntimeRoot();
    let mergeCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncAutoSyncEnabled: true,
      gitSyncDebounceMs: 40,
      gitSyncAdapter: {
        merge: () => {
          mergeCount += 1;
          return { status: "clean" };
        },
      },
    });

    await saveServiceVocabulary(
      service,
      "field:service_autosync_one",
      "service-autosync-one",
    );
    await saveServiceVocabulary(
      service,
      "field:service_autosync_two",
      "service-autosync-two",
    );
    await waitFor(async () => mergeCount === 1);
    await delay(70);

    assert.equal(mergeCount, 1);
  });

  it("queues service-level autosync while paused and runs after resume", async function () {
    const root = await makeRuntimeRoot();
    let mergeCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncAutoSyncEnabled: true,
      gitSyncDebounceMs: 20,
      gitSyncAdapter: {
        merge: () => {
          mergeCount += 1;
          return { status: "clean" };
        },
      },
    });

    await service.pauseGitSync();
    await saveServiceVocabulary(
      service,
      "field:service_autosync_paused",
      "service-autosync-paused",
    );
    await delay(50);

    const queued = await service.loadGitSyncState();
    assert.equal(queued.queue_state, "queued");
    assert.isTrue(queued.paused);
    assert.equal(mergeCount, 0);

    const resumed = await service.resumeGitSync();
    assert.equal(resumed.queue_state, "idle");
    assert.equal(mergeCount, 1);
  });

  it("runs service-level manual sync immediately when Git Sync is paused", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:manual-sync");
    let mergeCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncAdapter: {
        merge: () => {
          mergeCount += 1;
          return { status: "clean" };
        },
      },
    });

    await service.pauseGitSync();
    const paused = await service.loadGitSyncState();
    assert.isTrue(paused.paused);

    const synced = await service.syncNow();

    assert.equal(synced.queue_state, "idle");
    assert.isFalse(synced.paused);
    assert.equal(mergeCount, 1);
  });

  it("preserves the conflict gate for service-level autosync", async function () {
    const root = await makeRuntimeRoot();
    let mergeCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncAutoSyncEnabled: true,
      gitSyncDebounceMs: 20,
      gitSyncAdapter: {
        merge: () => {
          mergeCount += 1;
          return {
            status: "conflict",
            conflicts: [
              {
                asset_path: "tags/vocabulary.json",
                reason: "both_modified",
              },
            ],
          };
        },
      },
    });

    await saveServiceVocabulary(
      service,
      "field:service_autosync_conflict",
      "service-autosync-conflict",
    );
    await waitFor(async () => {
      const state = await service.loadGitSyncState();
      return mergeCount === 1 && state.queue_state === "blocked_conflict";
    });
    const blocked = await service.loadGitSyncState();
    assert.equal(blocked.queue_state, "blocked_conflict");

    await saveServiceVocabulary(
      service,
      "field:service_autosync_conflict_local",
      "service-autosync-conflict-local",
    );
    await delay(50);

    const stillBlocked = await service.loadGitSyncState();
    assert.equal(stillBlocked.queue_state, "blocked_conflict");
    assert.equal(mergeCount, 1);
  });

  it("keeps service-level canonical writes working when Git Sync is disabled", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({ root, libraryId: 1 });

    await saveServiceVocabulary(
      service,
      "field:service_autosync_disabled",
      "service-autosync-disabled",
    );

    const state = await service.loadGitSyncState();
    assert.equal(state.queue_state, "disabled");
    assert.isFalse(state.adapter_configured);
  });

  it("coalesces maintenance-driven canonical sync after registry workers drain", async function () {
    const root = await makeRuntimeRoot();
    let mergeCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncAutoSyncEnabled: true,
      gitSyncDebounceMs: 20,
      registryInputs: [registryInput("A")],
      gitSyncAdapter: {
        merge: () => {
          mergeCount += 1;
          return { status: "clean" };
        },
      },
    });

    await service.refreshReferenceSidecarNow();
    await service.refreshReferenceSidecarNow();
    await waitFor(async () => mergeCount === 1);
    await delay(70);

    assert.equal(mergeCount, 1);
  });

  it("does not sync Git from projection-only cache refreshes", async function () {
    const root = await makeRuntimeRoot();
    let mergeCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncAutoSyncEnabled: true,
      gitSyncDebounceMs: 20,
      registryInputs: [registryInput("A")],
      gitSyncAdapter: {
        merge: () => {
          mergeCount += 1;
          return { status: "clean" };
        },
      },
    });
    await service.refreshReferenceSidecarNow();
    await waitFor(async () => mergeCount === 1);

    await service.rebuildCitationGraphCacheNow();
    await service.rebuildTagVocabularyIndex();
    await service.rebuildConceptKbIndex();
    await service.rebuildTopicGraphIndex();
    await delay(80);

    assert.equal(mergeCount, 1);
  });

  it("keeps manual sync available while reporting pending canonical maintenance", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncAutoSyncEnabled: true,
      gitSyncDebounceMs: 50,
      registryInputs: [registryInput("A")],
      gitSyncAdapter: {
        merge: () => ({ status: "clean" }),
      },
    });

    await service.refreshReferenceSidecarNow();
    const state = await service.syncNow();

    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "canonical_maintenance_sync_pending",
    );
  });

  it("creates an auto-detected Git adapter without leaking token state", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    await storeSynthesisGitSyncToken("ghp_secret-token");
    setPref("synthesisGitSyncEnabled", true);
    setPref("synthesisGitSyncRemoteUrl", "https://example.invalid/repo.git");
    setPref("synthesisGitSyncBranch", "main");
    const invocations: SynthesisGitCommandInvocation[] = [];
    const runner: SynthesisGitCommandRunner = async (invocation) => {
      invocations.push(invocation);
      return { exitCode: 0, stdout: "" };
    };
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncCommandRunner: runner,
    });
    createSynthesisRepository({ runtimeRoot: root }).upsertOperation({
      operationId: "git-sync-old-running",
      operationType: "git_sync",
      label: "Git Sync",
      status: "running",
      phase: "fetch",
      phaseLabel: "Fetch",
      message: "Previous run did not close.",
      processedCount: 4,
      totalCount: 9,
      progressMode: "determinate",
      updatedAt: "2026-06-14T00:00:00.000Z",
    });

    const state = await service.syncNow();
    const serialized = JSON.stringify(state);

    assert.equal(state.queue_state, "idle");
    assert.isTrue(state.adapter_configured);
    const gitSubcommands = invocations.map((entry) => {
      const commandIndex = entry.args.findIndex((value) =>
        [
          "init",
          "rev-parse",
          "checkout",
          "config",
          "remote",
          "fetch",
          "add",
          "commit",
          "merge",
          "push",
        ].includes(value),
      );
      return commandIndex >= 0 ? entry.args[commandIndex] : entry.args[0];
    });
    assert.deepEqual(gitSubcommands, [
      "rev-parse",
      "init",
      "checkout",
      "config",
      "config",
      "remote",
      "remote",
      "fetch",
      "add",
      "commit",
      "merge",
      "push",
    ]);
    assert.isTrue(
      invocations.some((entry) =>
        entry.args.join(" ").includes("Authorization: Bearer ghp_secret-token"),
      ),
    );
    assert.notInclude(serialized, "ghp_secret-token");
    assert.notInclude(serialized, "Authorization: Bearer");
  });

  it("recovers a persisted disabled Git Sync state after prefs become configured", async function () {
    const root = await makeRuntimeRoot();
    const disabledService = createSynthesisService({
      root,
      libraryId: 1,
    });

    const disabled = await disabledService.loadGitSyncState();

    assert.equal(disabled.queue_state, "disabled");
    assert.isFalse(disabled.adapter_configured);
    assert.include(
      disabled.diagnostics.map((entry) => entry.code),
      "git_sync_adapter_missing",
    );

    await writeTagAsset(root, "model:transformer");
    setPref("synthesisGitSyncEnabled", true);
    setPref("synthesisGitSyncRemoteUrl", "https://example.invalid/repo.git");
    setPref("synthesisGitSyncBranch", "main");
    const invocations: SynthesisGitCommandInvocation[] = [];
    const runner: SynthesisGitCommandRunner = async (invocation) => {
      invocations.push(invocation);
      return { exitCode: 0, stdout: "" };
    };
    const configuredService = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncCommandRunner: runner,
    });

    const configured = await configuredService.loadGitSyncState();

    assert.equal(configured.queue_state, "idle");
    assert.isTrue(configured.adapter_configured);
    assert.notInclude(
      configured.diagnostics.map((entry) => entry.code),
      "git_sync_adapter_missing",
    );
    assert.include(configured.allowed_actions, "syncNow");
    assert.include(configured.allowed_actions, "pauseGitSync");

    const synced = await configuredService.syncNow();

    assert.equal(synced.queue_state, "idle");
    assert.isTrue(invocations.some((entry) => entry.args.includes("fetch")));
    assert.isTrue(invocations.some((entry) => entry.args.includes("push")));
  });

  it("initializes an empty remote branch on first sync without running merge", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    await storeSynthesisGitSyncToken("ghp_secret-token");
    setPref("synthesisGitSyncEnabled", true);
    setPref("synthesisGitSyncRemoteUrl", "https://example.invalid/repo.git");
    setPref("synthesisGitSyncBranch", "main");
    const invocations: SynthesisGitCommandInvocation[] = [];
    const runner: SynthesisGitCommandRunner = async (invocation) => {
      invocations.push(invocation);
      if (invocation.args.includes("fetch")) {
        return {
          exitCode: 128,
          stderr: "fatal: couldn't find remote ref main",
        };
      }
      return { exitCode: 0, stdout: "" };
    };
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncCommandRunner: runner,
    });

    const state = await service.syncNow();
    const subcommands = invocations.map((entry) => {
      const commandIndex = entry.args.findIndex((value) =>
        [
          "init",
          "checkout",
          "config",
          "remote",
          "fetch",
          "add",
          "commit",
          "merge",
          "push",
        ].includes(value),
      );
      return commandIndex >= 0 ? entry.args[commandIndex] : entry.args[0];
    });

    assert.equal(state.queue_state, "idle");
    assert.include(subcommands, "fetch");
    assert.include(subcommands, "push");
    assert.notInclude(subcommands, "merge");
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "git_sync_remote_branch_missing_initializable",
    );
  });

  it("treats empty fetch stderr plus missing ls-remote head as initializable", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    await storeSynthesisGitSyncToken("ghp_secret-token");
    setPref("synthesisGitSyncEnabled", true);
    setPref("synthesisGitSyncRemoteUrl", "https://example.invalid/repo.git");
    setPref("synthesisGitSyncBranch", "main");
    const invocations: SynthesisGitCommandInvocation[] = [];
    const runner: SynthesisGitCommandRunner = async (invocation) => {
      invocations.push(invocation);
      if (invocation.args.includes("rev-parse")) {
        return { exitCode: 128, stderr: "not a git repository" };
      }
      if (invocation.args.includes("fetch")) {
        return { exitCode: 128, stdout: "", stderr: "" };
      }
      if (invocation.args.includes("ls-remote")) {
        return { exitCode: 0, stdout: "" };
      }
      return { exitCode: 0, stdout: "" };
    };
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncCommandRunner: runner,
    });

    const state = await service.syncNow();

    assert.equal(state.queue_state, "idle");
    assert.isTrue(
      invocations.some((entry) => entry.args.includes("ls-remote")),
    );
    assert.isTrue(invocations.some((entry) => entry.args.includes("push")));
    assert.isFalse(invocations.some((entry) => entry.args.includes("merge")));
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "git_sync_remote_branch_missing_initializable",
    );
  });

  it("does not initialize when fetch fails for auth or network reasons", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    await storeSynthesisGitSyncToken("ghp_secret-token");
    setPref("synthesisGitSyncEnabled", true);
    setPref("synthesisGitSyncRemoteUrl", "https://example.invalid/repo.git");
    setPref("synthesisGitSyncBranch", "main");
    const invocations: SynthesisGitCommandInvocation[] = [];
    const runner: SynthesisGitCommandRunner = async (invocation) => {
      invocations.push(invocation);
      if (invocation.args.includes("fetch")) {
        return {
          exitCode: 128,
          stderr:
            "fatal: Authentication failed for https://example.invalid/repo.git",
        };
      }
      if (invocation.args.includes("ls-remote")) {
        return {
          exitCode: 128,
          stderr:
            "fatal: Authentication failed for https://example.invalid/repo.git",
        };
      }
      return { exitCode: 0, stdout: "" };
    };
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncCommandRunner: runner,
    });

    const state = await service.syncNow();
    const serializedCommands = JSON.stringify(
      invocations.map((entry) => entry.args),
    );

    assert.equal(state.queue_state, "failed_retryable");
    assert.notInclude(serializedCommands, '"push"');
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "git_sync_failed",
    );
    assert.isFalse(
      service
        .getSynthesisBackgroundJobRows()
        .some((row) => row.source === "git_sync"),
    );
  });

  it("fails the sync when git push exits non-zero", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    await storeSynthesisGitSyncToken("ghp_secret-token");
    setPref("synthesisGitSyncEnabled", true);
    setPref("synthesisGitSyncRemoteUrl", "https://example.invalid/repo.git");
    setPref("synthesisGitSyncBranch", "main");
    const invocations: SynthesisGitCommandInvocation[] = [];
    const runner: SynthesisGitCommandRunner = async (invocation) => {
      invocations.push(invocation);
      if (invocation.args.includes("rev-parse")) {
        return { exitCode: 128, stderr: "not a git repository" };
      }
      if (invocation.args.includes("fetch")) {
        return {
          exitCode: 128,
          stderr: "fatal: couldn't find remote ref main",
        };
      }
      if (invocation.args.includes("push")) {
        return {
          exitCode: 128,
          stderr:
            "fatal: Authentication failed for https://example.invalid/repo.git",
        };
      }
      return { exitCode: 0, stdout: "" };
    };
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncCommandRunner: runner,
    });

    const state = await service.syncNow();

    assert.equal(state.queue_state, "failed_retryable");
    assert.isTrue(invocations.some((entry) => entry.args.includes("push")));
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "git_sync_failed",
    );
    assert.notEqual(state.last_run?.status, "completed");
  });

  it("rejects Git Sync worktrees inside a parent repository before remote mutation", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    await storeSynthesisGitSyncToken("ghp_secret-token");
    setPref("synthesisGitSyncEnabled", true);
    setPref("synthesisGitSyncRemoteUrl", "https://example.invalid/repo.git");
    setPref("synthesisGitSyncBranch", "main");
    const invocations: SynthesisGitCommandInvocation[] = [];
    const runner: SynthesisGitCommandRunner = async (invocation) => {
      invocations.push(invocation);
      if (invocation.args.includes("rev-parse")) {
        return { exitCode: 0, stdout: `${root}\n` };
      }
      return { exitCode: 0, stdout: "" };
    };
    const service = createSynthesisGitSyncService({
      root,
      adapter: createSynthesisGitCommandAdapter({
        config: {
          enabled: true,
          remoteUrl: "https://example.invalid/repo.git",
          branch: "main",
          autoRetryEnabled: true,
        },
        commandRunner: runner,
      }),
    });

    const state = await service.runSync();
    const serializedCommands = JSON.stringify(
      invocations.map((entry) => entry.args),
    );

    assert.equal(state.queue_state, "failed_permanent");
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "git_sync_worktree_unsafe_parent_repo",
    );
    assert.notInclude(serializedCommands, '"remote","remove"');
    assert.notInclude(serializedCommands, '"remote","add"');
    assert.notInclude(serializedCommands, '"commit"');
    assert.notInclude(serializedCommands, '"push"');
  });

  it("rejects an existing Git repository worktree without a Git Sync sentinel", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    await storeSynthesisGitSyncToken("ghp_secret-token");
    setPref("synthesisGitSyncEnabled", true);
    setPref("synthesisGitSyncRemoteUrl", "https://example.invalid/repo.git");
    setPref("synthesisGitSyncBranch", "main");
    let worktreePath = "";
    const invocations: SynthesisGitCommandInvocation[] = [];
    const runner: SynthesisGitCommandRunner = async (invocation) => {
      invocations.push(invocation);
      if (!worktreePath) {
        worktreePath = invocation.cwd;
      }
      if (invocation.args.includes("rev-parse")) {
        return { exitCode: 0, stdout: `${invocation.cwd}\n` };
      }
      return { exitCode: 0, stdout: "" };
    };
    const service = createSynthesisGitSyncService({
      root,
      adapter: createSynthesisGitCommandAdapter({
        config: {
          enabled: true,
          remoteUrl: "https://example.invalid/repo.git",
          branch: "main",
          autoRetryEnabled: true,
        },
        commandRunner: runner,
      }),
    });

    const state = await service.runSync();
    const serializedCommands = JSON.stringify(
      invocations.map((entry) => entry.args),
    );

    assert.equal(state.queue_state, "failed_permanent");
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "git_sync_worktree_sentinel_missing",
    );
    assert.notInclude(serializedCommands, '"remote","remove"');
    assert.isString(worktreePath);
  });

  it("allows a managed Git Sync worktree and stages deletions with git add -A", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    await storeSynthesisGitSyncToken("ghp_secret-token");
    setPref("synthesisGitSyncEnabled", true);
    setPref("synthesisGitSyncRemoteUrl", "https://example.invalid/repo.git");
    setPref("synthesisGitSyncBranch", "main");
    const invocations: SynthesisGitCommandInvocation[] = [];
    const runner: SynthesisGitCommandRunner = async (invocation) => {
      invocations.push(invocation);
      if (invocation.args.includes("rev-parse")) {
        return { exitCode: 128, stderr: "not a git repository" };
      }
      if (invocation.args.includes("fetch")) {
        return {
          exitCode: 128,
          stderr: "fatal: couldn't find remote ref main",
        };
      }
      return { exitCode: 0, stdout: "" };
    };
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncCommandRunner: runner,
    });

    const state = await service.syncNow();
    const commands = invocations.map((entry) => entry.args);

    assert.equal(state.queue_state, "idle");
    assert.isTrue(
      await runtimePathExists(
        path.join(
          root,
          "runtime",
          "synthesis",
          "git-sync-worktree",
          ".zotero-skills-git-sync-worktree.json",
        ),
      ),
    );
    assert.isTrue(
      commands.some(
        (args) =>
          JSON.stringify(args) === JSON.stringify(["add", "-A", "synthesis"]),
      ),
    );
  });

  it("rejects a Git Sync worktree sentinel for a different remote", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    await storeSynthesisGitSyncToken("ghp_secret-token");
    setPref("synthesisGitSyncEnabled", true);
    setPref("synthesisGitSyncRemoteUrl", "https://example.invalid/repo.git");
    setPref("synthesisGitSyncBranch", "main");
    const worktreeRoot = path.join(
      root,
      "runtime",
      "synthesis",
      "git-sync-worktree",
    );
    await writeRuntimeTextFile(
      path.join(worktreeRoot, ".zotero-skills-git-sync-worktree.json"),
      `${JSON.stringify(
        {
          schema_id: "synthesis.git_sync_worktree_sentinel",
          schema_version: "1.0.0",
          source: "zotero-skills-git-sync",
          remote_url: "https://other.example.invalid/repo.git",
          branch: "main",
        },
        null,
        2,
      )}\n`,
    );
    const invocations: SynthesisGitCommandInvocation[] = [];
    const runner: SynthesisGitCommandRunner = async (invocation) => {
      invocations.push(invocation);
      if (invocation.args.includes("rev-parse")) {
        return { exitCode: 128, stderr: "not a git repository" };
      }
      return { exitCode: 0, stdout: "" };
    };
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncCommandRunner: runner,
    });

    const state = await service.syncNow();

    assert.equal(state.queue_state, "failed_permanent");
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "git_sync_worktree_sentinel_mismatch",
    );
    assert.isFalse(invocations.some((entry) => entry.args.includes("init")));
  });

  it("blocks Git Sync when runtime root falls back to the current repository cwd", async function () {
    const root = await makeRuntimeRoot();
    await fs.mkdir(path.join(root, ".git"));
    const previousCwd = process.cwd();
    const previousRuntimeRoot = process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
    let adapterCallCount = 0;
    try {
      delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      process.chdir(root);
      const service = createSynthesisGitSyncService({
        root,
        adapter: {
          fetch: async () => {
            adapterCallCount += 1;
            return { diagnostics: [] };
          },
          merge: async () => {
            adapterCallCount += 1;
            return { status: "clean" };
          },
          push: async () => {
            adapterCallCount += 1;
            return { diagnostics: [] };
          },
        },
      });

      const state = await service.runSync();

      assert.equal(state.queue_state, "failed_permanent");
      assert.equal(adapterCallCount, 0);
      assert.include(
        state.diagnostics.map((entry) => entry.code),
        "git_sync_runtime_root_unsafe_cwd_fallback",
      );
    } finally {
      process.chdir(previousCwd);
      if (previousRuntimeRoot === undefined) {
        delete process.env.ZOTERO_SKILLS_RUNTIME_ROOT;
      } else {
        process.env.ZOTERO_SKILLS_RUNTIME_ROOT = previousRuntimeRoot;
      }
    }
  });

  it("keeps prefs-configured Git Sync disabled when encrypted token cannot be read", async function () {
    const root = await makeRuntimeRoot();
    setPref("synthesisGitSyncEnabled", true);
    setPref("synthesisGitSyncRemoteUrl", "https://example.invalid/repo.git");
    setPref("synthesisGitSyncTokenEncryptedJson", '{"bad":true}');
    let commandCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncCommandRunner: async () => {
        commandCount += 1;
        return { exitCode: 0 };
      },
    });

    const state = await service.loadGitSyncState();

    assert.equal(state.queue_state, "disabled");
    assert.isFalse(state.adapter_configured);
    assert.equal(commandCount, 0);
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "git_sync_token_decrypt_failed",
    );
  });

  it("rejects credential-bearing Git remote URLs before writing worktree config", async function () {
    const root = await makeRuntimeRoot();
    setPref("synthesisGitSyncEnabled", true);
    setPref(
      "synthesisGitSyncRemoteUrl",
      "https://user:secret@example.invalid/repo.git?token=abc123",
    );
    setPref("synthesisGitSyncTokenEncryptedJson", "");
    let commandCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncCommandRunner: async () => {
        commandCount += 1;
        return { exitCode: 0 };
      },
    });

    const state = await service.syncNow();
    const serialized = JSON.stringify(state);

    assert.equal(state.queue_state, "disabled");
    assert.isFalse(state.adapter_configured);
    assert.equal(commandCount, 0);
    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "git_sync_remote_url_credentials_rejected",
    );
    assert.notInclude(serialized, "secret");
    assert.notInclude(serialized, "abc123");
  });

  it("automatically retries retryable Git Sync failures with backoff", async function () {
    this.timeout(30000);
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    let mergeCount = 0;
    const service = createSynthesisGitSyncService({
      root,
      retryDelaysMs: [20],
      adapter: {
        merge: () => {
          mergeCount += 1;
          if (mergeCount === 1) {
            throw new Error("temporary remote failure");
          }
          return { status: "clean" };
        },
      },
    });

    const failed = await service.runSync();
    assert.equal(failed.queue_state, "failed_retryable");
    assert.equal(failed.retry_attempt, 1);
    assert.isString(failed.next_retry_at);

    await waitFor(async () => {
      const state = await service.loadGitSyncState();
      return mergeCount === 2 && state.queue_state === "idle";
    }, 25000);
  });

  it("manual retry runs immediately and clears scheduled retry metadata", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    let mergeCount = 0;
    const service = createSynthesisGitSyncService({
      root,
      retryDelaysMs: [10000],
      adapter: {
        merge: () => {
          mergeCount += 1;
          if (mergeCount === 1) {
            throw new Error("temporary remote failure");
          }
          return { status: "clean" };
        },
      },
    });

    const failed = await service.runSync();
    assert.equal(failed.queue_state, "failed_retryable");
    assert.isString(failed.next_retry_at);

    const retried = await service.retryGitSync();
    assert.equal(retried.queue_state, "idle");
    assert.isUndefined(retried.next_retry_at);
    assert.equal(mergeCount, 2);
  });

  it("coalesces queued changes and supports pause, resume, and retry actions", async function () {
    const root = await makeRuntimeRoot();
    await writeTagAsset(root, "model:transformer");
    let mergeCount = 0;
    const adapter: SynthesisGitSyncAdapter = {
      merge: () => {
        mergeCount += 1;
        return { status: "clean" };
      },
    };
    const service = createSynthesisGitSyncService({ root, adapter });

    await service.pauseGitSync();
    const queued = await service.notifyCanonicalStoreChanged();
    assert.equal(queued.queue_state, "queued");
    assert.isTrue(queued.paused);

    const resumed = await service.resumeGitSync();
    assert.equal(resumed.queue_state, "idle");
    assert.equal(mergeCount, 1);

    const retry = await service.retryGitSync();
    assert.equal(retry.queue_state, "idle");
    assert.equal(mergeCount, 2);
  });
});
