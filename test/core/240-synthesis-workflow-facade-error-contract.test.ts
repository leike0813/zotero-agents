import { assert } from "chai";
import {
  rebuildTagAuditStagingEntries,
  SynthesisClientError,
  type SynthesisClient,
} from "../../packages/synthesis-contracts/src/index";
import { createWorkflowSynthesisHostApi } from "../../src/modules/synthesisClient/workflowHostClient";
import {
  createZoteroHostCapabilityBroker,
  resetZoteroHostMutationRuntimeForTests,
} from "../../src/modules/zoteroHostCapabilityBroker";
import {
  resetZoteroLibraryPageQueryAdapterForTests,
  setZoteroLibraryPageQueryAdapterForTests,
} from "../../src/modules/zoteroLibraryPageQuery";
import { createMockZoteroLibraryPageQueryAdapter } from "../helpers/zoteroLibraryPageQueryAdapter";
import type {
  SynthesisWorkbenchSidecarChangeEvent,
  SynthesisWorkbenchSidecarChangeResult,
} from "../../src/modules/synthesisWorkbenchInvalidation";

const AUDIT_IDENTITY = {
  hostInstanceId: "host-1",
  principal: {
    packageId: "package-1",
    workflowId: "workflow-1",
    contentDigest: "content-1",
  },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function auditClient(overrides: Record<string, unknown> = {}) {
  return {
    tags: {
      async beginTagAuditRun() {
        throw new SynthesisClientError("unavailable", "not configured");
      },
      async abortTagAuditRun() {
        return { outcome: "aborted" };
      },
      ...overrides,
    },
  } as unknown as SynthesisClient;
}

async function captureHostError(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    return error as Error & {
      code?: string;
      schema?: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
    };
  }
  assert.fail("expected the facade call to fail");
}

async function waitFor(condition: () => boolean) {
  for (let attempt = 0; attempt < 1000 && !condition(); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  assert.isTrue(condition(), "timed out waiting for the expected call");
}

function recordNotification(
  notifications: Array<{ reason?: string }>,
  event: SynthesisWorkbenchSidecarChangeEvent,
): SynthesisWorkbenchSidecarChangeResult {
  notifications.push(event);
  return {
    invalidatedListeners: 0,
    invalidatedSurfaces: event.invalidatedSurfaces,
    reason: event.reason,
    sourceRefs: [],
  };
}

describe("Synthesis workflow facade error contract", function () {
  it("maps a same-library audit begin conflict to the closed conflict taxonomy", async function () {
    const client = auditClient({
      async beginTagAuditRun() {
        throw new SynthesisClientError(
          "unavailable",
          "The native Synthesis request failed",
          {
            sidecarCode: "internal_error",
            sidecarReason: "tag_audit_operation_in_progress",
          },
        );
      },
    });
    const api = createWorkflowSynthesisHostApi({
      resolveClient: async () => client,
      resolveAuditExecutionIdentity: async () => AUDIT_IDENTITY,
    });

    const error = await captureHostError(() =>
      api.tags.withAuditRun(
        { libraryId: 1, vocabularyHash: "vocabulary-1" },
        {},
        async () => {
          assert.fail("callback must not run when begin fails");
        },
      ),
    );
    assert.equal(error.schema, "zotero-agents.workflow-host-error.v1");
    assert.equal(error.code, "conflict");
    assert.deepEqual(error.details, { reason: "operation_in_progress" });
    assert.isFalse(error.retryable);
  });

  it("maps sidecar vocabulary and target conflicts to closed conflict details", async function () {
    for (const sidecarReason of [
      "tag_audit_vocabulary_conflict",
      "tag_audit_target_conflict",
    ]) {
      const client = auditClient({
        async beginTagAuditRun() {
          throw new SynthesisClientError(
            "unavailable",
            "The native Synthesis request failed",
            { sidecarCode: "internal_error", sidecarReason },
          );
        },
      });
      const api = createWorkflowSynthesisHostApi({
        resolveClient: async () => client,
        resolveAuditExecutionIdentity: async () => AUDIT_IDENTITY,
      });
      const error = await captureHostError(() =>
        api.tags.withAuditRun(
          { libraryId: 1, vocabularyHash: "vocabulary-1" },
          {},
          async () => {
            assert.fail("callback must not run when begin fails");
          },
        ),
      );
      assert.equal(error.code, "conflict");
      assert.deepEqual(error.details, { reason: "concurrent_modification" });
    }
  });

  it("normalizes unclassified facade failures without leaking open details", async function () {
    const internalClient = {
      tags: {
        async loadTagVocabulary() {
          throw new SynthesisClientError("internal", "sidecar exploded", {
            location: "$.tags",
          });
        },
      },
    } as unknown as SynthesisClient;
    const unavailableClient = {
      topics: {
        async getTopicReport() {
          throw new SynthesisClientError("timeout", "sidecar timed out");
        },
      },
    } as unknown as SynthesisClient;
    const api = createWorkflowSynthesisHostApi({
      resolveClient: async () => internalClient,
    });
    const internalError = await captureHostError(() =>
      api.tags.loadVocabulary(),
    );
    assert.equal(internalError.code, "execution_failed");
    assert.deepEqual(internalError.details, {
      phase: "adapter",
      recovery: "none",
    });

    const unavailableApi = createWorkflowSynthesisHostApi({
      resolveClient: async () => unavailableClient,
    });
    const unavailableError = await captureHostError(() =>
      unavailableApi.topics.getReport({ topicId: "topic-a" } as never),
    );
    assert.equal(unavailableError.code, "unavailable");
    assert.deepEqual(unavailableError.details, { reason: "runtime" });
  });

  it("tracks process-local active audit runs across serialized begins", async function () {
    const beginRequests: Array<{ activeRunIds?: string[] }> = [];
    const begun: Array<ReturnType<typeof deferred<void>>> = [];
    let runSequence = 0;
    const client = auditClient({
      async beginTagAuditRun(request: { activeRunIds?: string[] }) {
        beginRequests.push(request);
        const gate = deferred<void>();
        begun.push(gate);
        await gate.promise;
        runSequence += 1;
        return {
          outcome: "ready",
          run: {
            auditRunId: `audit-run-${runSequence}`,
            leaseToken: `lease-${runSequence}`,
          },
        };
      },
    });
    const api = createWorkflowSynthesisHostApi({
      resolveClient: async () => client,
      resolveAuditExecutionIdentity: async () => AUDIT_IDENTITY,
    });
    const canceledTraversal = () =>
      ({
        outcome: "canceled",
        libraryId: 1,
        visitedItems: 0,
        visitedBatches: 0,
      }) as const;

    const first = api.tags.withAuditRun(
      { libraryId: 1, vocabularyHash: "vocabulary-1" },
      {},
      async () => {
        await waitFor(() => beginRequests.length >= 2);
        return canceledTraversal();
      },
    );
    await waitFor(() => begun.length >= 1);
    begun[0]!.resolve();
    const second = api.tags.withAuditRun(
      { libraryId: 1, vocabularyHash: "vocabulary-1" },
      {},
      async () => canceledTraversal(),
    );
    await waitFor(() => begun.length >= 2);
    begun[1]!.resolve();
    await Promise.all([first, second]);
    const third = api.tags.withAuditRun(
      { libraryId: 1, vocabularyHash: "vocabulary-1" },
      {},
      async () => canceledTraversal(),
    );
    await waitFor(() => begun.length >= 3);
    begun[2]!.resolve();
    await third;

    assert.equal(beginRequests.length, 3);
    assert.deepEqual(beginRequests[0]!.activeRunIds, []);
    assert.deepEqual(beginRequests[1]!.activeRunIds, ["audit-run-1"]);
    assert.deepEqual(beginRequests[2]!.activeRunIds, []);
  });

  it("notifies the workbench only after a confirmed audit publication", async function () {
    setZoteroLibraryPageQueryAdapterForTests(
      createMockZoteroLibraryPageQueryAdapter(),
    );
    try {
      const item = new Zotero.Item("journalArticle");
      item.setField("title", "Facade publication notification");
      await item.saveTx();
      const broker = createZoteroHostCapabilityBroker();

      for (const promoteOutcome of ["published", "conflicted"] as const) {
        const notifications: Array<{ reason?: string }> = [];
        const client = auditClient({
          async beginTagAuditRun() {
            return {
              outcome: "ready",
              run: { auditRunId: "audit-run-1", leaseToken: "lease-1" },
            };
          },
          async appendTagAuditRun(request: { entries: unknown[] }) {
            return {
              outcome: "appended",
              stagedItems: request.entries.length,
            };
          },
          async promoteTagAuditRun(request: { coverageDigest: string }) {
            if (promoteOutcome === "conflicted") {
              return {
                outcome: "conflicted",
                auditedItems: 1,
                conflictCount: 1,
                conflicts: [],
                retryable: true,
              };
            }
            return {
              outcome: "published",
              snapshot: {
                schema: "zotero-agents.tag-audit-snapshot.v1",
                libraryId: item.libraryID,
                snapshotRevision: "snapshot-1",
                vocabularyHash: "vocabulary-1",
                basisDigest: "basis-1",
                coverageDigest: request.coverageDigest,
                auditedItems: 1,
                needsRegulation: 0,
                publishedAt: "2026-08-30T00:00:00.000Z",
                updatedAt: "2026-08-30T00:00:00.000Z",
              },
            };
          },
        });
        const api = createWorkflowSynthesisHostApi({
          resolveClient: async () => client,
          resolveAuditExecutionIdentity: async () => AUDIT_IDENTITY,
          notifyChanged: (event) => recordNotification(notifications, event),
        });

        const result = await api.tags.withAuditRun(
          { libraryId: item.libraryID, vocabularyHash: "vocabulary-1" },
          {},
          (writer) =>
            broker.library.traverseItems(
              { scope: "top-level-regular", pageSize: 50 },
              {},
              (batch) =>
                writer.append(
                  batch.items.map((entry) => ({
                    target: {
                      libraryId: entry.ref.libraryId,
                      itemKey: entry.ref.key,
                    },
                    auditedRevision: entry.revision,
                    auditedTagDigest: entry.tagDigest,
                    auditedTags: entry.tags,
                    evaluation: { state: "compliant" as const },
                  })),
                ),
            ),
        );
        assert.equal(result.outcome, promoteOutcome);
        if (promoteOutcome === "published") {
          assert.deepEqual(notifications, [
            { invalidatedSurfaces: ["tags"], reason: "tag_audit_publish" },
          ]);
        } else {
          assert.deepEqual(notifications, []);
        }
      }
    } finally {
      resetZoteroLibraryPageQueryAdapterForTests();
    }
  });

  it("throws a stable canceled error for a pre-acceptance aborted acknowledgement", async function () {
    const api = createWorkflowSynthesisHostApi({
      resolveClient: async () => auditClient(),
    });
    const controller = new AbortController();
    controller.abort();
    const error = await captureHostError(() =>
      api.tags.acknowledgeRegulation(
        {
          target: { libraryId: 1, key: "AAAA1111" },
          mutationReceipt: {} as never,
        },
        { signal: controller.signal },
      ),
    );
    assert.equal(error.schema, "zotero-agents.workflow-host-error.v1");
    assert.equal(error.code, "canceled");
    assert.deepEqual(error.details, { reason: "caller_signal" });
  });

  it("notifies the workbench only after a confirmed regulation acknowledgement", async function () {
    const item = new Zotero.Item("journalArticle");
    Object.assign(item, {
      version: 1,
      dateAdded: "2026-08-30T00:00:00.000Z",
      dateModified: "2026-08-30T00:00:00.000Z",
    });
    item.setField("title", "Facade acknowledgement notification");
    await item.saveTx();
    const broker = createZoteroHostCapabilityBroker();
    try {
      const mutation = await broker.mutations.execute(
        {
          operation: "item.updateTags",
          operationId: "facade-ack-notify-tags",
          itemRef: { libraryId: item.libraryID, key: item.key },
          add: ["method:regulated"],
          remove: [],
        },
        { ownerId: "facade-ack-notify-test" },
      );
      assert.include(["committed", "unchanged"], mutation.outcome);
      const change = mutation.receipt.changes[0]!;
      const notifications: Array<{ reason?: string }> = [];
      const client = auditClient({
        async prepareTagRegulationAcknowledgement() {
          return {
            outcome: "ready",
            target: { libraryId: item.libraryID, itemKey: item.key },
            snapshotRevision: "snapshot-1",
            auditedRevision: change.before!.revision,
            vocabularyHash: "vocabulary-1",
            nonCompliantTags: [],
          };
        },
        async commitTagRegulationAcknowledgement() {
          return {
            outcome: "acknowledged",
            snapshotRevision: "snapshot-2",
            remainingNeedsRegulation: 0,
          };
        },
      });
      const api = createWorkflowSynthesisHostApi({
        resolveClient: async () => client,
        resolveHostBroker: () => broker,
        notifyChanged: (event) => recordNotification(notifications, event),
      });

      const acknowledged = await api.tags.acknowledgeRegulation({
        target: { libraryId: item.libraryID, key: item.key },
        mutationReceipt: mutation.receipt,
      });
      assert.equal(acknowledged.outcome, "acknowledged");
      assert.deepEqual(notifications, [
        {
          invalidatedSurfaces: ["tags"],
          reason: "tag_regulation_acknowledge",
        },
      ]);
    } finally {
      resetZoteroHostMutationRuntimeForTests();
    }
  });

  it("orders audit tags by code units so non-ASCII batches match the sidecar", function () {
    const entry = (auditedTags: string[]) => ({
      target: { libraryId: 1, itemKey: "AAAA1111" },
      auditedRevision: "revision-1",
      auditedTagDigest: "digest-1",
      auditedTags,
      evaluation: { state: "compliant" as const },
    });

    // Code-unit order: "Zebra" < "apple" < "zeta" < "état"; a locale-aware
    // comparison would interleave them differently.
    const canonical = ["Zebra", "apple", "zeta", "état"];
    assert.deepEqual(
      rebuildTagAuditStagingEntries([entry(canonical)])[0]!.auditedTags,
      canonical,
    );
    assert.throws(
      () => rebuildTagAuditStagingEntries([entry(["état", "zeta"])]),
      SynthesisClientError,
    );
    assert.throws(
      () => rebuildTagAuditStagingEntries([entry(["apple", "Zebra"])]),
      SynthesisClientError,
    );
  });
});
