import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  buildSynthesisKnowledgeGraphPaths,
  createCanonicalEnvelope,
  hashCanonicalJson,
  readProjectionRegistryState,
} from "../../src/modules/synthesis/foundation";
import {
  createSynthesisGitSyncService,
  type SynthesisGitSyncAdapter,
} from "../../src/modules/synthesis/gitSync";
import {
  readSynthesisGitSyncToken,
  storeSynthesisGitSyncToken,
} from "../../src/modules/synthesis/gitSyncTokenPrefs";
import type {
  SynthesisGitCommandInvocation,
  SynthesisGitCommandRunner,
} from "../../src/modules/synthesis/gitSyncCommandAdapter";
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
  const paths = buildSynthesisKnowledgeGraphPaths(root);
  await writeRuntimeTextFile(
    path.join(paths.tagsRoot, "vocabulary.json"),
    `${JSON.stringify(tagEnvelope(tag, note), null, 2)}\n`,
  );
}

async function refreshExportManifest(exportRoot: string) {
  const assetPath = path.join(exportRoot, "tags", "vocabulary.json");
  const manifestPath = path.join(exportRoot, "sync", "sync-manifest.json");
  const manifest = JSON.parse(await readRuntimeTextFile(manifestPath));
  const asset = manifest.data.assets.find(
    (entry: Record<string, unknown>) => entry.path === "tags/vocabulary.json",
  );
  asset.hash = hashCanonicalJson(await readRuntimeTextFile(assetPath));
  const base = {
    generated_at: manifest.data.generated_at,
    asset_count: manifest.data.asset_count,
    assets: manifest.data.assets,
  };
  manifest.data.manifest_hash = hashCanonicalJson(base);
  await writeRuntimeTextFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
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
  beforeEach(function () {
    setPref("synthesisGitSyncEnabled", false);
    setPref("synthesisGitSyncRemoteUrl", "");
    setPref("synthesisGitSyncBranch", "main");
    setPref("synthesisGitSyncGitCommand", "git");
    setPref("synthesisGitSyncTokenEncryptedJson", "");
    setPref("synthesisGitSyncTokenMasked", "");
    setPref("synthesisGitSyncTokenUpdatedAt", "");
    setPref("synthesisGitSyncAutoRetryEnabled", true);
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
      path.join(paths.stateRoot, "tag-index.json"),
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
        path.join(exported.exportRoot, "tags", "vocabulary.json"),
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
    assert.include(
      exported.diagnostics.map((entry) => entry.code),
      "sensitive_asset_rejected",
    );
    assert.notInclude(JSON.stringify(exported), "abc");
  });

  it("rejects import snapshots with non-allowlisted assets before promotion", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisGitSyncService({ root });
    const candidateRoot = path.join(root, "candidate", "synthesis");
    await writeRuntimeTextFile(
      path.join(candidateRoot, "state", "tag-index.json"),
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
      "asset_not_allowlisted",
    );
    assert.isFalse(imported.ok);
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
    });

    const state = await service.runSync();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    const events = (await readRuntimeTextFile(paths.eventsLog))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const receipts = (await readRuntimeTextFile(paths.receiptsLog))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const projections = await readProjectionRegistryState(root);

    assert.equal(state.queue_state, "idle");
    assert.equal(state.last_run?.status, "success");
    assert.equal(
      state.remote_url,
      "https://[redacted]@example.invalid/repo.git",
    );
    assert.lengthOf(events, 1);
    assert.includeMembers(events[0].changed_assets, [
      "tags/vocabulary.json",
      "sync/sync-manifest.json",
    ]);
    assert.includeMembers(receipts[0].changed_assets, [
      "tags/vocabulary.json",
      "sync/sync-manifest.json",
    ]);
    assert.isTrue(projections.projections["tag-index"].stale);
    assert.isTrue(projections.projections["citation-graph-index"].stale);
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
    await writeRuntimeTextFile(
      path.join(exported.exportRoot, "tags", "vocabulary.json"),
      `${JSON.stringify(tagEnvelope("model:remote"), null, 2)}\n`,
    );
    await refreshExportManifest(exported.exportRoot);

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
      buildSynthesisKnowledgeGraphPaths(root).syncRoot,
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
      "field:service_autosync",
      "service-autosync-save",
    );
    await waitFor(async () => {
      const state = await service.loadGitSyncState();
      return mergeCount === 1 && state.queue_state === "idle";
    });

    const state = await service.loadGitSyncState();
    assert.equal(state.queue_state, "idle");
    assert.equal(mergeCount, 1);
  });

  it("coalesces multiple service-level canonical writes into one autosync run", async function () {
    const root = await makeRuntimeRoot();
    let mergeCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
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

  it("preserves the conflict gate for service-level autosync", async function () {
    const root = await makeRuntimeRoot();
    let mergeCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
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
      gitSyncDebounceMs: 20,
      registryInputs: [registryInput("A")],
      gitSyncAdapter: {
        merge: () => {
          mergeCount += 1;
          return { status: "clean" };
        },
      },
    });

    await service.runLiteratureRegistryJobNow();
    await service.runLiteratureRegistryJobNow();
    await waitFor(async () => mergeCount === 1);
    await delay(70);

    assert.equal(mergeCount, 1);
  });

  it("does not sync Git from projection, metrics, layout, or freshness-only writes", async function () {
    const root = await makeRuntimeRoot();
    let mergeCount = 0;
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncDebounceMs: 20,
      registryInputs: [registryInput("A")],
      gitSyncAdapter: {
        merge: () => {
          mergeCount += 1;
          return { status: "clean" };
        },
      },
    });
    await service.runLiteratureRegistryJobNow();
    await waitFor(async () => mergeCount === 1);

    await service.rebuildCitationGraphProjection();
    await service.runCitationGraphComplexMetricsWorker({ timeBudgetMs: 1000 });
    await service.runCitationGraphLayoutWorker({
      preset: "default",
      force: true,
      timeBudgetMs: 1000,
    });
    await service.runTopicFreshnessWorker({
      batchLimit: 5,
      timeBudgetMs: 1000,
    });
    await delay(80);

    assert.equal(mergeCount, 1);
  });

  it("keeps manual sync available while reporting active canonical maintenance", async function () {
    const root = await makeRuntimeRoot();
    let resolveInput!: (value: ReturnType<typeof registryInput>) => void;
    const pendingInput = new Promise<ReturnType<typeof registryInput>>(
      (resolve) => {
        resolveInput = resolve;
      },
    );
    const service = createSynthesisService({
      root,
      libraryId: 1,
      gitSyncDebounceMs: 50,
      gitSyncAdapter: {
        merge: () => ({ status: "clean" }),
      },
      libraryAdapter: {
        getRegistryInputForItem: async () => pendingInput,
      } as any,
    });
    await service.recordSynthesisUpdateEvent({
      eventType: "zotero_item_updated",
      source: "test",
      scope: { kind: "zotero_item", ref: "A" },
    });

    const worker = service.runPaperRegistryIncrementalWorker({
      batchLimit: 1,
      timeBudgetMs: 1000,
    });
    await delay(20);
    const state = await service.syncNow();

    assert.include(
      state.diagnostics.map((entry) => entry.code),
      "canonical_maintenance_active",
    );

    resolveInput(registryInput("A"));
    await worker;
  });

  it("creates a prefs-configured Git command adapter without leaking token state", async function () {
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

    const state = await service.syncNow();
    const serialized = JSON.stringify(state);

    assert.equal(state.queue_state, "idle");
    assert.isTrue(state.adapter_configured);
    const gitSubcommands = invocations.map((entry) => {
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
    assert.deepEqual(gitSubcommands, [
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
    }, 3000);
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
