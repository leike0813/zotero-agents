import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_ID,
  SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_ID,
  rebuildSynthesisWebDavSyncState,
  rebuildSynthesisWebDavSnapshotPointer,
  synthesisWebDavRemotePath,
  synthesisWebDavSnapshotId,
  type SynthesisWebDavSyncState,
} from "../../packages/synthesis-contracts/src/webDavSync";
import { createSynthesisWebDavSyncApplication } from "../../packages/synthesis-application/src/webDavSyncApplication";
import { openSynthesisSidecarWebDavSyncStateStore } from "../../apps/synthesis-service/src/webDavSyncApplicationNode";

const HASH = `sha256:${"a".repeat(64)}`;
const NOW = "2026-07-18T12:00:00.000Z";

function availableDescription(overrides: Record<string, unknown> = {}) {
  return {
    status: "available",
    configStatus: "configured",
    autoSyncEnabled: false,
    autoRetryEnabled: false,
    baseUrl: "https://dav.example.test/root",
    remotePath: "zotero-agents",
    username: "alice",
    diagnostics: [],
    ...overrides,
  };
}

function exportResult() {
  return {
    manifest: {
      manifest_schema_id: "synthesis.durable_sync_manifest",
      manifest_schema_version: "2.0.0",
      bundle_kind: "synthesis-durable-state",
      capability: "webdav-sync.v1",
      generated_at: NOW,
      producer_version: "0.1.0",
      domain_schema_versions: {},
      assets: [
        {
          path: "bundles/concept-0001.json",
          hash: HASH,
          bytes: 2,
          entry_count: 0,
        },
      ],
      total_assets: 1,
      total_bytes: 2,
      manifest_hash: HASH,
    },
    manifestText: '{"manifest":true}',
    assets: [
      {
        path: "bundles/concept-0001.json",
        text: "{}",
        bundle: {},
      },
    ],
    entries: [],
    summary: {
      bundleCount: 1,
      entityCount: 0,
      topicCount: 0,
      manifestHash: HASH,
    },
  } as never;
}

function memoryStateStore(initial: SynthesisWebDavSyncState | null = null) {
  let current = initial;
  return {
    async load() {
      return current;
    },
    async save(state: SynthesisWebDavSyncState) {
      current = structuredClone(state);
    },
    current() {
      return current;
    },
  };
}

describe("Synthesis sidecar WebDAV Sync application foundation", function () {
  it("strictly rebuilds pointers and canonicalizes managed remote identities", function () {
    assert.deepEqual(
      rebuildSynthesisWebDavSnapshotPointer({
        schema_id: SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_ID,
        schema_version: "1.0.0",
        snapshot_id: "2026-07-18T12-00-00-000Z-aaaaaaaaaaaa",
        manifest_hash: HASH,
        updated_at: NOW,
      }),
      {
        schema_id: SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_ID,
        schema_version: "1.0.0",
        snapshot_id: "2026-07-18T12-00-00-000Z-aaaaaaaaaaaa",
        manifest_hash: HASH,
        updated_at: NOW,
      },
    );
    assert.equal(
      synthesisWebDavSnapshotId(NOW, HASH),
      "2026-07-18T12-00-00-000Z-aaaaaaaaaaaa",
    );
    assert.equal(
      synthesisWebDavRemotePath(
        "snapshots",
        "2026-07-18T12-00-00-000Z-aaaaaaaaaaaa",
        "manifest.json",
      ),
      "snapshots/2026-07-18T12-00-00-000Z-aaaaaaaaaaaa/manifest.json",
    );
    for (const invalid of [
      { snapshot_id: "../escape" },
      { manifest_hash: "sha256:short" },
      { updated_at: "1760788800000" },
      { ignored: true },
    ]) {
      assert.throws(() =>
        rebuildSynthesisWebDavSnapshotPointer({
          schema_id: SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_ID,
          schema_version: "1.0.0",
          snapshot_id: "snapshot-safe",
          manifest_hash: HASH,
          updated_at: NOW,
          ...invalid,
        }),
      );
    }
  });

  it("strictly rebuilds persisted state before any remote read or write", async function () {
    const state = rebuildSynthesisWebDavSyncState({
      schema_id: SYNTHESIS_WEBDAV_SYNC_STATE_SCHEMA_ID,
      schema_version: "1.0.0",
      queue_state: "idle",
      paused: false,
      adapter_configured: true,
      config_status: "configured",
      base_url: "https://dav.example.test/root",
      remote_path: "zotero-agents",
      diagnostics: [],
      allowed_actions: ["syncWebDavNow"],
      updated_at: NOW,
    });
    assert.equal(state.queue_state, "idle");
    assert.throws(() =>
      rebuildSynthesisWebDavSyncState({ ...state, unknown_field: true }),
    );
    for (const invalid of [
      { updated_at: "1760788800000" },
      { next_retry_at: `${NOW}+60000ms` },
      {
        last_run: {
          run_id: "run:invalid-order",
          status: "completed",
          started_at: "2026-07-18T12:00:01.000Z",
          completed_at: NOW,
          diagnostics: [],
        },
      },
      { progress: { updated_at: "2026-07-18" } },
    ]) {
      assert.throws(() =>
        rebuildSynthesisWebDavSyncState({ ...state, ...invalid }),
      );
    }
    assert.throws(() =>
      rebuildSynthesisWebDavSyncState({
        ...state,
        connection_test: { execute() {} },
      }),
    );

    let remoteEffects = 0;
    const application = createSynthesisWebDavSyncApplication({
      now: () => NOW,
      stateStore: {
        load() {
          return { ...state, queue_state: "not-a-state" };
        },
        save() {
          throw new Error("invalid state must not be saved");
        },
      },
      hostPort: {
        async describe() {
          return availableDescription() as never;
        },
        async readText() {
          remoteEffects += 1;
          return { status: "missing", diagnostics: [] };
        },
        async ensureCollection() {
          remoteEffects += 1;
          return { status: "ready", diagnostics: [] };
        },
        async writeText() {
          remoteEffects += 1;
          return { status: "written", diagnostics: [] };
        },
      },
      durable: {
        async buildExport() {
          throw new Error("invalid state must fail before export");
        },
        async previewImport() {
          throw new Error("invalid state must fail before preview");
        },
        async applyImport() {
          throw new Error("invalid state must fail before apply");
        },
        async discardImport() {
          return false;
        },
      },
    });
    let failure: unknown;
    try {
      await application.runSync();
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, Error);
    assert.include((failure as Error).message, "webdav_sync_state_invalid");
    assert.equal(remoteEffects, 0);
  });

  it("publishes stable bundles, manifest, then HEAD for an empty remote", async function () {
    const events: string[] = [];
    const store = memoryStateStore();
    const application = createSynthesisWebDavSyncApplication({
      now: () => NOW,
      stateStore: store,
      hostPort: {
        async describe() {
          return availableDescription() as never;
        },
        async readText(request) {
          events.push(`read:${request.path}`);
          return { status: "missing", diagnostics: [] };
        },
        async ensureCollection(request) {
          events.push(`ensure:${request.path}`);
          return { status: "ready", diagnostics: [] };
        },
        async writeText(request) {
          events.push(`write:${request.path}:${request.text}`);
          return { status: "written", diagnostics: [] };
        },
      },
      durable: {
        async buildExport() {
          return exportResult();
        },
        async previewImport() {
          throw new Error("remote is empty");
        },
        async applyImport() {
          throw new Error("remote is empty");
        },
        async discardImport() {
          return false;
        },
      },
    });

    const state = await application.runSync();
    const writes = events.filter((event) => event.startsWith("write:"));
    assert.equal(state.queue_state, "idle");
    assert.include(writes[0], "/bundles/concept-0001.json:{}");
    assert.include(writes[1], '/manifest.json:{"manifest":true}');
    assert.include(writes[2], "write:HEAD.json:");
    assert.deepInclude(store.current()?.last_run, {
      status: "completed",
      manifest_hash: HASH,
    });
  });

  it("blocks unbased updates unless the composition explicitly acknowledges them", async function () {
    const make = (acknowledgeUnbasedUpdates: boolean) => {
      let applied = 0;
      const app = createSynthesisWebDavSyncApplication({
        now: () => NOW,
        acknowledgeUnbasedUpdates,
        stateStore: memoryStateStore(),
        hostPort: {
          async describe() {
            return availableDescription() as never;
          },
          async readText(request) {
            if (request.path === "HEAD.json") {
              return {
                status: "available",
                text: JSON.stringify({
                  schema_id: SYNTHESIS_WEBDAV_SYNC_HEAD_SCHEMA_ID,
                  schema_version: "1.0.0",
                  snapshot_id: "remote-snapshot",
                  manifest_hash: HASH,
                  updated_at: NOW,
                }),
                etag: '"head"',
                diagnostics: [],
              } as const;
            }
            return { status: "available", text: "{}", diagnostics: [] };
          },
          async ensureCollection() {
            return { status: "ready", diagnostics: [] };
          },
          async writeText() {
            return { status: "written", diagnostics: [] };
          },
        },
        durable: {
          async buildExport() {
            return exportResult();
          },
          async previewImport(source) {
            assert.equal(await source.readManifestText(), "{}");
            return {
              ok: true,
              additions: 0,
              updates: 0,
              unbasedUpdates: 1,
              unchanged: 0,
              tombstones: 0,
              conflicts: [],
              manifestHash: HASH,
              receiptId: "receipt:1",
              diagnostics: [],
            };
          },
          async applyImport(request) {
            applied += 1;
            assert.equal(
              request.acknowledgeUnbasedUpdates,
              acknowledgeUnbasedUpdates,
            );
            return { status: "committed", manifestHash: HASH, imported: 1 };
          },
          async discardImport() {
            return true;
          },
        },
      });
      return { app, applied: () => applied };
    };

    const strict = make(false);
    assert.equal((await strict.app.runSync()).queue_state, "blocked_conflict");
    assert.equal(strict.applied(), 0);

    const legacy = make(true);
    assert.equal((await legacy.app.runSync()).queue_state, "idle");
    assert.equal(legacy.applied(), 1);
  });

  it("binds private persisted state to one profile and data root identity", function () {
    const runtimeRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "synthesis-webdav-state-"),
    );
    try {
      const first = openSynthesisSidecarWebDavSyncStateStore({
        profileRuntimeRoot: runtimeRoot,
        profileId: "profile-a",
        dataRootId: "data-a",
      });
      assert.equal(
        first.root,
        path.join(runtimeRoot, "shadow-webdav-sync", "data-a"),
      );
      assert.doesNotThrow(() =>
        openSynthesisSidecarWebDavSyncStateStore({
          profileRuntimeRoot: runtimeRoot,
          profileId: "profile-a",
          dataRootId: "data-a",
        }),
      );
      assert.throws(
        () =>
          openSynthesisSidecarWebDavSyncStateStore({
            profileRuntimeRoot: runtimeRoot,
            profileId: "profile-b",
            dataRootId: "data-a",
          }),
        "webdav_sync_identity_mismatch",
      );
    } finally {
      fs.rmSync(runtimeRoot, { recursive: true, force: true });
    }
  });

  it("stops admission and drains the active sync before shutdown completes", async function () {
    let releaseBuild:
      | ((value: ReturnType<typeof exportResult>) => void)
      | null = null;
    let buildStarted: (() => void) | null = null;
    const enteredBuild = new Promise<void>((resolve) => {
      buildStarted = resolve;
    });
    const application = createSynthesisWebDavSyncApplication({
      now: () => NOW,
      stateStore: memoryStateStore(),
      hostPort: {
        async describe() {
          return availableDescription() as never;
        },
        async readText() {
          return { status: "missing", diagnostics: [] };
        },
        async ensureCollection() {
          return { status: "ready", diagnostics: [] };
        },
        async writeText() {
          return { status: "written", diagnostics: [] };
        },
      },
      durable: {
        async buildExport() {
          buildStarted?.();
          return new Promise<ReturnType<typeof exportResult>>((resolve) => {
            releaseBuild = resolve;
          });
        },
        async previewImport() {
          throw new Error("remote is empty");
        },
        async applyImport() {
          throw new Error("remote is empty");
        },
        async discardImport() {
          return false;
        },
      },
    });

    const active = application.runSync();
    await enteredBuild;
    let drained = false;
    const shutdown = application.shutdown().then(() => {
      drained = true;
    });
    await Promise.resolve();
    assert.isFalse(drained);
    assert.isFunction(releaseBuild);
    releaseBuild?.(exportResult());
    await Promise.all([active, shutdown]);
    assert.isTrue(drained);

    let failure: unknown;
    try {
      await application.runSync();
    } catch (error) {
      failure = error;
    }
    assert.instanceOf(failure, Error);
    assert.equal((failure as Error).message, "stopping");
  });

  it("bounds retry chains to four attempts and cancels pending callbacks on abort", async function () {
    const durable = {
      async buildExport() {
        throw new Error("transport failure must stop before export");
      },
      async previewImport() {
        throw new Error("transport failure must stop before preview");
      },
      async applyImport() {
        throw new Error("transport failure must stop before apply");
      },
      async discardImport() {
        return false;
      },
    };
    let boundedReads = 0;
    let reachedBound: (() => void) | null = null;
    const bounded = new Promise<void>((resolve) => {
      reachedBound = resolve;
    });
    const application = createSynthesisWebDavSyncApplication({
      now: () => NOW,
      retryDelaysMs: [0, 0, 0, 0],
      stateStore: memoryStateStore(),
      hostPort: {
        async describe() {
          return availableDescription({ autoRetryEnabled: true }) as never;
        },
        async readText() {
          boundedReads += 1;
          if (boundedReads === 5) reachedBound?.();
          return {
            status: "unavailable",
            diagnostics: ["webdav_sync_transport_unavailable"],
          };
        },
        async ensureCollection() {
          throw new Error("transport failure must stop before collection");
        },
        async writeText() {
          throw new Error("transport failure must stop before write");
        },
      },
      durable,
    });
    await application.triggerWebDavSync();
    await bounded;
    await new Promise<void>((resolve) => setImmediate(resolve));
    assert.equal(boundedReads, 5);
    await application.shutdown();

    let abortListener: (() => void) | undefined;
    const abortSignal = {
      aborted: false,
      addEventListener(
        _type: "abort",
        listener: () => void,
        _options?: { once?: boolean },
      ) {
        abortListener = listener;
      },
    };
    let canceledReads = 0;
    const canceled = createSynthesisWebDavSyncApplication({
      now: () => NOW,
      retryDelaysMs: [25],
      abortSignal,
      stateStore: memoryStateStore(),
      hostPort: {
        async describe() {
          return availableDescription({ autoRetryEnabled: true }) as never;
        },
        async readText() {
          canceledReads += 1;
          return {
            status: "unavailable",
            diagnostics: ["webdav_sync_transport_unavailable"],
          };
        },
        async ensureCollection() {
          throw new Error("transport failure must stop before collection");
        },
        async writeText() {
          throw new Error("transport failure must stop before write");
        },
      },
      durable,
    });
    await canceled.triggerWebDavSync();
    abortSignal.aborted = true;
    abortListener?.();
    await new Promise<void>((resolve) => setTimeout(resolve, 60));
    assert.equal(canceledReads, 1);
    await canceled.shutdown();
  });

  it("keeps the Rust WebDAV owner typed and represented in the parity corpus", function () {
    const projectRoot = path.resolve(process.cwd());
    const source = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs",
      ),
      "utf8",
    );
    const corpus = JSON.parse(
      fs.readFileSync(
        path.join(
          projectRoot,
          "packages/synthesis-contracts/contract-set/synthesis-checkpoint-bundle-webdav-debug-application-parity-v1/corpus.json",
        ),
        "utf8",
      ),
    );
    assert.include(source, "pub trait WebDavHostPort");
    assert.include(source, "pub trait WebDavRetrySchedulerPort");
    assert.include(source, "pub fn trigger_webdav_sync");
    assert.include(source, "pub fn resolve_webdav_sync_conflict");
    assert.include(
      corpus.coverage.webDavSync,
      "four_attempt_abort_drain_reopen",
    );
  });
});
