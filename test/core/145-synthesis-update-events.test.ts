import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  listPluginTaskRowEntries,
  resetPluginStateStoreForTests,
  upsertPluginTaskRowEntry,
} from "../../src/modules/pluginStateStore";
import {
  getRuntimePersistencePaths,
  runtimePathExists,
} from "../../src/modules/runtimePersistence";
import { buildSynthesisKnowledgeGraphPaths } from "../../src/modules/synthesis/foundation";
import { recordSynthesisZoteroItemNotifications } from "../../src/modules/synthesis/itemObserver";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import {
  createSynthesisService,
  SYNTHESIS_CLEAN_INSTALL_RESET_CONFIRMATION_TEXT,
} from "../../src/modules/synthesis/service";

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
    const runtimePaths = getRuntimePersistencePaths(root);
    const paths = buildSynthesisKnowledgeGraphPaths(
      runtimePaths.synthesisDataRoot,
    );

    assert.equal(state.queue_state, "idle");
    assert.equal(state.pending_count, 0);
    assert.equal(state.startup_reconcile.state, "unknown");
    assert.isFalse(
      await runtimePathExists(
        path.join(paths.stateRoot, "synthesis-update-events.json"),
      ),
    );
  });

  it("exposes bounded debug queue and job diagnostics through the service", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => "2026-05-28T00:00:00.000Z",
    });
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      now: () => "2026-05-28T00:00:00.000Z",
    });

    await service.recordSynthesisUpdateEvent({
      eventType: "paper_artifact_changed",
      source: "test",
      scope: { kind: "zotero_item", ref: "ABC123" },
    });
    repository.upsertJobProgress({
      jobName: "debug-stale-job",
      source: "test",
      label: "Debug stale job",
      status: "running",
      progressMode: "indeterminate",
      heartbeatAt: "2026-05-27T00:00:00.000Z",
      updatedAt: "2026-05-27T00:00:00.000Z",
    });

    const snapshot = await service.debugSynthesisSnapshot({
      includeUiSnapshot: false,
      limit: 5,
    });
    assert.equal(snapshot.schema, "host_bridge.debug.synthesis.snapshot.v1");
    assert.equal(snapshot.queue.pending_count, 1);
    assert.isAtLeast(snapshot.tableCounts.synt_dirty_event, 1);

    const stale = await service.debugSynthesisJobsClearStale({
      staleBefore: "2026-05-27T12:00:00.000Z",
    });
    assert.lengthOf(stale.staleRows, 1);
    assert.equal(
      repository.getJobProgress("debug-stale-job")?.status,
      "failed_retryable",
    );

    const dryRun = await service.debugSynthesisQueueClear({ dryRun: true });
    assert.equal(dryRun.wouldDelete, 1);
    assert.lengthOf(await service.listSynthesisUpdateEvents(), 1);

    const cleared = await service.debugSynthesisQueueClear({
      dryRun: false,
      confirmationText: "CLEAR SYNTHESIS DEBUG QUEUE",
    });
    assert.isTrue(cleared.ok);
    assert.lengthOf(await service.listSynthesisUpdateEvents(), 0);
  });

  it("clean-install reset clears Synthesis DB state and deletes JSON canonical data", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
    });
    await service.recordSynthesisUpdateEvent({
      eventType: "paper_registry_incremental",
      scope: { kind: "paper", ref: "paper:reset" },
      reason: "test",
    });
    repository.upsertJobProgress({
      jobName: "debug-reset-job",
      runId: "run-reset",
      source: "test",
      label: "Reset job",
      status: "running",
      updatedAt: "2026-05-29T00:00:00.000Z",
    });
    const runtimePaths = getRuntimePersistencePaths(root);
    const paths = buildSynthesisKnowledgeGraphPaths(
      runtimePaths.synthesisDataRoot,
    );
    const canonicalFile = path.join(paths.tagsRoot, "manifest.json");
    await fs.mkdir(path.dirname(canonicalFile), { recursive: true });
    await fs.writeFile(canonicalFile, "{}", "utf8");

    const rejected = await service.debugSynthesisCleanInstallReset({
      dryRun: false,
      confirmationText: "RESET",
    });
    assert.isFalse(rejected.ok);
    assert.isFalse(await runtimePathExists(runtimePaths.synthesisDataRoot));
    assert.isTrue(await runtimePathExists(paths.synthesisRoot));
    assert.lengthOf(await service.listSynthesisUpdateEvents(), 1);

    const reset = await service.debugSynthesisCleanInstallReset({
      dryRun: false,
      confirmationText: SYNTHESIS_CLEAN_INSTALL_RESET_CONFIRMATION_TEXT,
    });
    assert.isTrue(reset.ok);
    assert.isFalse(reset.removedSynthesisDataRoot);
    assert.isTrue(reset.removedSynthesisRuntimeRoot);
    assert.isFalse(await runtimePathExists(runtimePaths.synthesisDataRoot));
    assert.isFalse(await runtimePathExists(paths.synthesisRoot));
    assert.lengthOf(await service.listSynthesisUpdateEvents(), 0);
    assert.equal(
      repository.listActiveJobProgress({ includeCompleted: true }).length,
      0,
    );
  });

  it("does not create data-root synthesis files during index rebuild", async function () {
    const root = await makeRuntimeRoot();
    const runtimePaths = getRuntimePersistencePaths(root);
    const service = createSynthesisService({
      root: runtimePaths.dataDir,
      runtimeRoot: root,
      libraryId: 1,
    });

    await service.runLiteratureRegistryJobNow();

    assert.isFalse(await runtimePathExists(runtimePaths.synthesisDataRoot));
    assert.isTrue(
      await runtimePathExists(
        buildSynthesisKnowledgeGraphPaths(runtimePaths.dataDir).synthesisRoot,
      ),
    );
  });

  it("ignores legacy plugin task row synthesis queue residue", async function () {
    const root = await makeRuntimeRoot();
    upsertPluginTaskRowEntry("synthesis-updates", "synthesis-update-events", {
      taskId: "legacy-event",
      requestId: "legacy-event",
      backendId: "topic:legacy",
      state: "queued",
      updatedAt: "2026-05-25T00:00:00.000Z",
      payload: JSON.stringify({
        schema_id: "synthesis.update_event",
        schema_version: "1.0.0",
        library_id: 1,
        event_id: "legacy-event",
        event_type: "topic_freshness_dirty",
        source: "legacy",
        scope: { kind: "topic", ref: "topic:legacy" },
        status: "queued",
        coalesced_count: 1,
        created_at: "2026-05-25T00:00:00.000Z",
        updated_at: "2026-05-25T00:00:00.000Z",
      }),
    });
    upsertPluginTaskRowEntry("synthesis-updates", "synthesis-update-state", {
      taskId: "queue:1",
      requestId: "queue:1",
      backendId: "synthesis",
      state: "queued",
      updatedAt: "2026-05-25T00:00:00.000Z",
      payload: JSON.stringify({
        schema_id: "synthesis.update_queue_state",
        schema_version: "1.0.0",
        library_id: 1,
        queue_state: "queued",
        startup_reconcile: {
          state: "queued",
          dirty_count: 1,
          diagnostics: [],
        },
        updated_at: "2026-05-25T00:00:00.000Z",
      }),
    });
    const service = createSynthesisService({ root, libraryId: 1 });

    const state = await service.loadSynthesisUpdateQueueState();
    const events = await service.listSynthesisUpdateEvents();
    const snapshot = await service.getSynthesisSnapshot();

    assert.equal(state.queue_state, "idle");
    assert.equal(state.pending_count, 0);
    assert.equal(state.startup_reconcile.state, "unknown");
    assert.lengthOf(events, 0);
    assert.notIncludeMembers(
      snapshot.maintenance.backgroundJobs.rows.map((job) => job.source),
      ["update_queue", "dirty_event", "startup_reconcile"],
    );
  });

  it("does not project stale legacy literature job state into background jobs", async function () {
    const root = await makeRuntimeRoot();
    const paths = buildSynthesisKnowledgeGraphPaths(root);
    await fs.mkdir(paths.stateRoot, { recursive: true });
    await fs.writeFile(
      path.join(paths.stateRoot, "literature-registry-job-state.json"),
      JSON.stringify({
        schema_id: "synthesis.literature_registry_job_state",
        schema_version: "1.0.0",
        queue_state: "queued",
        source_hash: "legacy",
        updated_at: "2026-05-25T00:00:00.000Z",
      }),
      "utf8",
    );
    const service = createSynthesisService({ root, libraryId: 1 });

    const snapshot = await service.getSynthesisSnapshot();

    assert.notInclude(
      snapshot.maintenance.backgroundJobs.rows.map((job) => job.source),
      "literature_registry",
    );
  });

  it("records and coalesces events by event type and dirty scope", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({ runtimeRoot: root });
    let currentNow = "2026-05-25T00:00:00.000Z";
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
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
    assert.equal(repository.countRows("synt_dirty_event"), 2);
    assert.lengthOf(
      listPluginTaskRowEntries("synthesis-updates", "synthesis-update-events"),
      0,
    );
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

  it("reset clears repository queue state and legacy synthesis task row scopes", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({ root, libraryId: 1 });
    upsertPluginTaskRowEntry("synthesis-updates", "synthesis-update-events", {
      taskId: "legacy-event",
      requestId: "legacy-event",
      backendId: "topic:legacy",
      state: "queued",
      updatedAt: "2026-05-25T00:00:00.000Z",
      payload: "{}",
    });
    upsertPluginTaskRowEntry("synthesis-updates", "synthesis-update-state", {
      taskId: "queue:1",
      requestId: "queue:1",
      backendId: "synthesis",
      state: "queued",
      updatedAt: "2026-05-25T00:00:00.000Z",
      payload: "{}",
    });
    await service.recordSynthesisUpdateEvent({
      eventType: "topic_freshness_dirty",
      source: "test",
      scope: { kind: "topic", ref: "topic:demo" },
    });
    await service.recordSynthesisStartupReconcileState({
      state: "queued",
      dirtyCount: 1,
    });

    const result = await service.resetSynthesisDatabase({
      confirmationText: "RESET SYNTHESIS DATABASE",
    });
    const state = await service.loadSynthesisUpdateQueueState();

    assert.isTrue(result.ok);
    assert.equal(state.queue_state, "idle");
    assert.equal(state.startup_reconcile.state, "unknown");
    assert.lengthOf(await service.listSynthesisUpdateEvents(), 0);
    assert.lengthOf(
      listPluginTaskRowEntries("synthesis-updates", "synthesis-update-events"),
      0,
    );
    assert.lengthOf(
      listPluginTaskRowEntries("synthesis-updates", "synthesis-update-state"),
      0,
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

  it("projects queued update events and startup reconcile into background jobs", async function () {
    const root = await makeRuntimeRoot();
    const service = createSynthesisService({ root, libraryId: 1 });

    await service.recordSynthesisUpdateEvent({
      eventType: "topic_synthesis_applied",
      source: "test",
      scope: { kind: "topic", ref: "topic:demo" },
    });
    await service.recordSynthesisStartupReconcileState({
      state: "queued",
      dirtyCount: 1,
    });

    const snapshot = await service.getSynthesisSnapshot();
    const jobs = snapshot.maintenance.backgroundJobs.rows;

    assert.includeMembers(
      jobs.map((job) => job.source),
      ["update_queue", "dirty_event", "startup_reconcile"],
    );
    assert.equal(snapshot.maintenance.backgroundJobs.queuedCount, 3);
    assert.isTrue(jobs.every((job) => job.progress?.mode === "indeterminate"));
  });

  it("records bounded dirty-event worker progress", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => "2026-05-28T00:00:00.000Z",
    });
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      now: () => "2026-05-28T00:00:00.000Z",
    });

    for (const ref of ["paper:A", "paper:B", "paper:C", "paper:D", "paper:E"]) {
      await service.recordSynthesisUpdateEvent({
        eventType: "paper_artifact_changed",
        source: "test",
        scope: { kind: "paper", ref },
      });
    }

    const result = await service.runPaperRegistryIncrementalWorker({
      batchLimit: 3,
      timeBudgetMs: 10000,
    });
    const job = repository
      .listActiveJobProgress({ includeCompleted: true })
      .find(
        (row) => row.jobName === "synthesis:paper-registry-incremental-worker",
      );

    assert.deepInclude(result, {
      processed: 3,
      failed: 3,
    });
    assert.deepInclude(job, {
      status: "completed",
      processedCount: 3,
      failedCount: 3,
      totalCount: 3,
      progressMode: "determinate",
    });
  });

  it("projects repository job progress ahead of queue fallbacks", async function () {
    const root = await makeRuntimeRoot();
    const repository = createSynthesisRepository({
      runtimeRoot: root,
      now: () => "2026-05-28T00:00:00.000Z",
    });
    repository.upsertJobProgress({
      jobName: "synthesis:paper-registry-incremental-worker",
      source: "update_queue",
      label: "Paper registry incremental worker",
      status: "running",
      processedCount: 2,
      totalCount: 5,
      progressMode: "determinate",
      message: "2/5 dirty paper event(s) processed",
    });
    const service = createSynthesisService({
      root,
      runtimeRoot: root,
      libraryId: 1,
      synthesisRepository: repository,
      now: () => "2026-05-28T00:00:00.000Z",
    });
    await service.recordSynthesisUpdateEvent({
      eventType: "paper_artifact_changed",
      source: "test",
      scope: { kind: "paper", ref: "paper:A" },
    });

    const snapshot = await service.getSynthesisSnapshot();
    const job = snapshot.maintenance.backgroundJobs.rows.find(
      (row) => row.job_id === "synthesis:paper-registry-incremental-worker",
    );

    assert.equal(job?.status, "running");
    assert.deepInclude(job?.progress || {}, {
      mode: "determinate",
      current: 2,
      total: 5,
      percent: 40,
    });
    assert.notInclude(
      snapshot.maintenance.backgroundJobs.rows.map((row) => row.job_id),
      "synthesis:update-queue",
    );
  });
});
