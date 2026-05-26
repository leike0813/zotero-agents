import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { runtimePathExists } from "../../src/modules/runtimePersistence";
import { buildSynthesisKnowledgeGraphPaths } from "../../src/modules/synthesis/foundation";
import { recordSynthesisZoteroItemNotifications } from "../../src/modules/synthesis/itemObserver";
import { createSynthesisService } from "../../src/modules/synthesis/service";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-synthesis-update-events-"));
}

describe("Synthesis update events", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
  });

  afterEach(function () {
    resetPluginStateStoreForTests();
  });

  it("loads an empty durable queue without creating canonical or projection files", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({ root, libraryId: 1 });

    const state = await service.loadSynthesisUpdateQueueState();
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    assert.equal(state.queue_state, "idle");
    assert.equal(state.pending_count, 0);
    assert.equal(state.startup_reconcile.state, "unknown");
    assert.isFalse(
      await runtimePathExists(
        path.join(paths.stateRoot, "synthesis-update-events.json"),
      ),
    );
  });

  it("records and coalesces events by event type and dirty scope", async function () {
    const root = await makeRuntimeRoot();
    let currentNow = "2026-05-25T00:00:00.000Z";
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => currentNow,
    });

    const first = await service.recordSynthesisUpdateEvent({
      eventType: "digest_applied",
      source: "test",
      scope: { kind: "paper", ref: "paper:A" },
      sourceHash: "hash:a1",
    });
    currentNow = "2026-05-25T00:01:00.000Z";
    const second = await service.recordSynthesisUpdateEvent({
      eventType: "digest_applied",
      source: "test",
      scope: { kind: "paper", ref: "paper:A" },
      sourceHash: "hash:a2",
    });
    await service.recordSynthesisUpdateEvent({
      eventType: "digest_applied",
      source: "test",
      scope: { kind: "paper", ref: "paper:B" },
      sourceHash: "hash:b1",
    });

    const events = await service.listSynthesisUpdateEvents();
    const state = await service.loadSynthesisUpdateQueueState();

    assert.equal(first.event.event_id, second.event.event_id);
    assert.lengthOf(events, 2);
    assert.equal(
      events.find((event) => event.scope.ref === "paper:A")?.coalesced_count,
      2,
    );
    assert.equal(
      events.find((event) => event.scope.ref === "paper:A")?.source_hash,
      "hash:a2",
    );
    assert.equal(state.queue_state, "queued");
    assert.equal(state.pending_count, 2);
  });

  it("keeps different event types for the same scope as distinct dirty events", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({ root, libraryId: 1 });

    await service.recordSynthesisUpdateEvent({
      eventType: "digest_applied",
      source: "test",
      scope: { kind: "paper", ref: "paper:A" },
    });
    await service.recordSynthesisUpdateEvent({
      eventType: "reference_matching_applied",
      source: "test",
      scope: { kind: "paper", ref: "paper:A" },
    });

    const events = await service.listSynthesisUpdateEvents();

    assert.sameMembers(
      events.map((event) => event.event_type),
      ["digest_applied", "reference_matching_applied"],
    );
  });

  it("records events while paused and resumes without processing them", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({ root, libraryId: 1 });

    const paused = await service.pauseSynthesisUpdates();
    await service.recordSynthesisUpdateEvent({
      eventType: "paper_artifact_changed",
      source: "test",
      scope: { kind: "zotero_item", ref: "AAA" },
    });
    const queuedWhilePaused = await service.loadSynthesisUpdateQueueState();
    const resumed = await service.resumeSynthesisUpdates();

    assert.isTrue(paused.paused);
    assert.equal(queuedWhilePaused.queue_state, "paused");
    assert.equal(queuedWhilePaused.pending_count, 1);
    assert.equal(resumed.queue_state, "queued");
    assert.equal(resumed.pending_count, 1);
    assert.lengthOf(await service.listSynthesisUpdateEvents(), 1);
  });

  it("tracks retryable failure backoff and clears scheduled retry on manual retry", async function () {
    const root = await makeRuntimeRoot();
    let currentNow = "2026-05-25T00:00:00.000Z";
    const service = createSynthesisService({
      root,
      libraryId: 1,
      now: () => currentNow,
      synthesisUpdateRetryDelaysMs: [1000],
    });

    await service.recordSynthesisUpdateEvent({
      eventType: "manual_registry_rebuild_requested",
      source: "test",
      scope: { kind: "library", ref: "1" },
    });
    const failed = await service.markSynthesisUpdateQueueFailure({
      retryable: true,
      diagnostic: {
        code: "worker_failed",
        severity: "warning",
        message: "retry later",
      },
    });
    currentNow = "2026-05-25T00:00:02.000Z";
    const retried = await service.retrySynthesisUpdateQueue();

    assert.equal(failed.queue_state, "failed_retryable");
    assert.equal(failed.retry_attempt, 1);
    assert.equal(failed.next_retry_at, "2026-05-25T00:00:01.000Z");
    assert.equal(retried.queue_state, "queued");
    assert.equal(retried.retry_attempt, 0);
    assert.isUndefined(retried.next_retry_at);
    assert.equal(retried.pending_count, 1);
  });

  it("records startup reconcile status without triggering rebuild files", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({ root, libraryId: 1 });

    const state = await service.recordSynthesisStartupReconcileState({
      state: "queued",
      dirtyCount: 3,
      diagnostics: [
        {
          code: "startup_reconcile_dirty",
          severity: "info",
          message: "dirty items detected",
        },
      ],
    });
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    assert.equal(state.startup_reconcile.state, "queued");
    assert.equal(state.startup_reconcile.dirty_count, 3);
    assert.isFalse(
      await runtimePathExists(
        path.join(paths.stateRoot, "literature-registry-job-state.json"),
      ),
    );
    assert.isFalse(
      await runtimePathExists(
        path.join(paths.stateRoot, "citation-graph-index.json"),
      ),
    );
  });

  it("records Zotero item notifications as dirty events without rebuilding", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({ root, libraryId: 1 });
    const previousZotero = (globalThis as { Zotero?: unknown }).Zotero;
    (globalThis as { Zotero?: unknown }).Zotero = {
      Items: {
        get(id: number) {
          return {
            key: id === 1 ? "AAA" : "BBB",
            libraryID: 1,
          };
        },
      },
    };
    try {
      await recordSynthesisZoteroItemNotifications({
        event: "add",
        type: "item",
        ids: [1],
        service,
      });
      await recordSynthesisZoteroItemNotifications({
        event: "modify",
        type: "item",
        ids: [2],
        service,
      });
    } finally {
      (globalThis as { Zotero?: unknown }).Zotero = previousZotero;
    }
    const events = await service.listSynthesisUpdateEvents();
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    assert.sameMembers(
      events.map((event) => event.event_type),
      ["zotero_item_added", "zotero_item_updated"],
    );
    assert.isFalse(
      await runtimePathExists(
        path.join(paths.stateRoot, "literature-registry-index.json"),
      ),
    );
  });

  it("exposes update queue status in snapshot input without writing job state", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({ root, libraryId: 1 });

    await service.recordSynthesisUpdateEvent({
      eventType: "topic_synthesis_applied",
      source: "test",
      scope: { kind: "topic", ref: "topic:demo" },
    });
    const snapshotInput = await service.getSynthesisSnapshotInput();
    const snapshot = await service.getSynthesisSnapshot();
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    assert.equal(snapshotInput.maintenance?.updateQueue?.pending_count, 1);
    assert.equal(snapshot.maintenance.updateQueue.queue_state, "queued");
    assert.isFalse(
      await runtimePathExists(
        path.join(paths.stateRoot, "literature-registry-job-state.json"),
      ),
    );
  });
});
