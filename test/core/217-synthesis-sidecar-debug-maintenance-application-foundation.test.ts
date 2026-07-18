import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_DEBUG_PAGE_LIMIT,
  SYNTHESIS_MAINTENANCE_PAGE_LIMIT,
  buildSynthesisDebugPage,
  diffSynthesisDebugSnapshots,
  synthesisDebugPageLimit,
  type SynthesisDebugIsolatedSnapshot,
} from "../../packages/synthesis-contracts/src/debugMaintenance";
import {
  SynthesisDebugMaintenanceApplicationError,
  createSynthesisDebugMaintenanceApplication,
  type SynthesisDebugRepositoryCapture,
} from "../../packages/synthesis-application/src/debugMaintenanceApplication";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";
import { openSynthesisSidecarTopicCanonicalStore } from "../../apps/synthesis-service/src/topicCanonicalStoreNode";
import { createSynthesisSidecarDebugMaintenanceApplication } from "../../apps/synthesis-service/src/debugMaintenanceApplicationNode";

const capture = (revision = "one"): SynthesisDebugRepositoryCapture => ({
  basis: { schemaVersion: "repository.v1", revision },
  schema: {
    schemaVersion: "repository.v1",
    aggregateCount: 10,
    diagnostics: [],
  },
  caches: [
    {
      cacheKey: "z-cache",
      cacheKind: "graph",
      status: "ready",
      updatedAt: "2026-07-18T00:00:00.000Z",
    },
    {
      cacheKey: "a-cache",
      cacheKind: "reference",
      status: "stale",
      updatedAt: "2026-07-18T00:00:00.000Z",
    },
  ],
  operations: [],
  topicIds: ["topic-b", "topic-a"],
});

const canonicalStore = {
  inspect({ topicId }: { topicId: string }) {
    return {
      status: topicId === "topic-a" ? ("ready" as const) : ("absent" as const),
      topicId,
      pathId: topicId,
      manifestHash: null,
      artifactHash: null,
      metadataHash: null,
      sections: [],
      diagnostics: [],
    };
  },
};

describe("Synthesis sidecar debug/maintenance application foundation", function () {
  it("enforces ordinary/debug bounds, stable cursors, JSON safety, and truncation", function () {
    assert.equal(
      synthesisDebugPageLimit(10_000),
      SYNTHESIS_MAINTENANCE_PAGE_LIMIT,
    );
    assert.equal(
      synthesisDebugPageLimit(10_000, true),
      SYNTHESIS_DEBUG_PAGE_LIMIT,
    );
    const page = buildSynthesisDebugPage({
      items: Array.from({ length: 105 }, (_, index) => ({ index })),
      limit: 100,
    });
    assert.deepEqual(Object.keys(page).sort(), [
      "cursor",
      "diagnostics",
      "items",
      "limit",
      "nextCursor",
      "truncated",
    ]);
    assert.equal(page.items.length, 100);
    assert.equal(page.nextCursor, "100");
    assert.isTrue(page.truncated);
    assert.throws(() =>
      buildSynthesisDebugPage({ items: [{ execute() {} }] as never }),
    );
  });

  it("returns a stable bounded snapshot and represents absent canonical state", function () {
    let writes = 0;
    const application = createSynthesisDebugMaintenanceApplication({
      repository: { capture: () => capture() },
      canonicalStore,
    });
    const result = application.snapshot();
    assert.equal(result.status, "ready");
    if (result.status !== "ready") return;
    assert.deepEqual(
      result.caches.items.map((item) => item.cacheKey),
      ["a-cache", "z-cache"],
    );
    assert.deepEqual(
      result.topics.items.map((item) => [item.topicId, item.status]),
      [
        ["topic-a", "ready"],
        ["topic-b", "absent"],
      ],
    );
    assert.equal(writes, 0);
    writes += 0;
  });

  it("returns superseded rather than a mixed repository/canonical snapshot", function () {
    let reads = 0;
    const application = createSynthesisDebugMaintenanceApplication({
      repository: { capture: () => capture(++reads === 1 ? "one" : "two") },
      canonicalStore,
    });
    const result = application.snapshot();
    assert.deepEqual(result, {
      schemaId: "synthesis.debug-maintenance.v1",
      status: "superseded",
      diagnostics: [{ code: "repository_basis_superseded", severity: "info" }],
    });
    assert.notProperty(result, "topics");
  });

  it("diffs snapshots purely and defaults the Node profiler contract to unavailable", async function () {
    const application = createSynthesisDebugMaintenanceApplication({
      repository: { capture: () => capture() },
      canonicalStore,
    });
    const before = application.snapshot() as SynthesisDebugIsolatedSnapshot;
    const after = structuredClone(before);
    after.caches.items[0] = { ...after.caches.items[0], status: "ready" };
    assert.deepEqual(diffSynthesisDebugSnapshots(before, after), {
      added: [],
      removed: [],
      changed: ["cache:a-cache"],
      diagnostics: [],
    });
    assert.deepEqual(await application.inspectProfiler(), {
      status: "unavailable",
      diagnostics: [],
    });
  });

  it("enforces single-active admission and drains before shutdown completes", async function () {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const application = createSynthesisDebugMaintenanceApplication({
      repository: { capture: () => capture() },
      canonicalStore,
      maintenance: {
        async durable() {
          await gate;
          return { status: "completed" };
        },
      },
    });
    const active = application.runMaintenance("durable", {});
    await Promise.resolve();
    let busy: unknown;
    try {
      await application.runMaintenance("durable", {});
    } catch (error) {
      busy = error;
    }
    assert.instanceOf(busy, SynthesisDebugMaintenanceApplicationError);
    assert.equal(
      (busy as SynthesisDebugMaintenanceApplicationError).code,
      "busy",
    );
    const shutdown = application.shutdown();
    let drained = false;
    void shutdown.then(() => {
      drained = true;
    });
    await Promise.resolve();
    assert.isFalse(drained);
    release();
    await Promise.all([active, shutdown]);
    assert.isTrue(drained);
    let stopping: unknown;
    try {
      await application.runMaintenance("durable", {});
    } catch (error) {
      stopping = error;
    }
    assert.instanceOf(stopping, SynthesisDebugMaintenanceApplicationError);
    assert.equal(
      (stopping as SynthesisDebugMaintenanceApplicationError).code,
      "stopping",
    );
  });

  it("runs read-only against an isolated SQLite/root composition", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "synthesis-debug-"));
    const profileId = "a".repeat(64);
    const dataRootId = "b".repeat(64);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId,
      dataRootId,
    });
    const canonical = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot: root,
      profileId,
      dataRootId,
    });
    try {
      const application = createSynthesisSidecarDebugMaintenanceApplication({
        repository: repository.store,
        canonicalStore: canonical,
      });
      const before = repository.store.captureDebugProjection().basis;
      const result = application.snapshot();
      const after = repository.store.captureDebugProjection().basis;
      assert.equal(result.status, "ready");
      assert.deepEqual(after, before);
      assert.deepEqual(await application.inspectProfiler(), {
        status: "unavailable",
        diagnostics: [],
      });
      await application.shutdown();
    } finally {
      canonical.close();
      repository.close();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
