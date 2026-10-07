import { assert } from "chai";
import * as hostRead from "../../packages/synthesis-contracts/src/hostRead";
import { SynthesisClientError } from "../../packages/synthesis-contracts/src/common";
import {
  SYNTHESIS_INVALIDATION_BATCH_SIZE,
  collectSynthesisInvalidationPaperRefs,
  recordSynthesisZoteroItemNotifications,
} from "../../src/modules/synthesis/itemObserver";

type FakeItem = {
  key: string;
  libraryID: number;
  parentID?: number;
  itemType?: string;
};

function stubZoteroItems(items: Record<string, FakeItem>) {
  // The shared Zotero mock defines this global non-writable, so redefine it.
  Object.defineProperty(globalThis, "Zotero", {
    value: {
      Items: {
        get: (id: number) => {
          const item = items[String(id)];
          return item ? { ...item } : null;
        },
      },
    },
    writable: true,
    configurable: true,
  });
}

describe("Synthesis Host evidence source contracts", function () {
  it("rebuilds bounded source pages with portable identities", function () {
    const result = hostRead.rebuildSynthesisHostEvidenceSourcesResult({
      scope: { libraryIds: [1] },
      descriptors: [
        {
          itemRef: { libraryId: 1, key: "ABCD1234" },
          source: { kind: "metadata", field: "title" },
          sourceVersion: "opaque:metadata-v1",
          format: "text",
          contentLength: 7,
        },
      ],
      nextCursor: null,
      hasMore: false,
      issues: [],
    });
    assert.deepEqual(result.scope, { libraryIds: [1] });
    assert.deepEqual(result.descriptors[0].itemRef, {
      libraryId: 1,
      key: "ABCD1234",
    });
    assert.throws(() =>
      hostRead.rebuildSynthesisHostEvidenceSourcesResult({
        scope: { libraryIds: [1] },
        descriptors: [],
        nextCursor: null,
        hasMore: false,
        issues: [],
        localPath: "/private/library.pdf",
      }),
    );
  });

  it("preserves empty source-kind selection and rejects unresolved result scope", function () {
    assert.deepEqual(
      hostRead.rebuildSynthesisHostEvidenceSourcesRequest({
        scope: {},
        sourceKinds: [],
        limit: 100,
      }),
      { scope: {}, sourceKinds: [], limit: 100 },
    );
    assert.deepEqual(
      hostRead.rebuildSynthesisHostEvidenceSourcesRequest({
        scope: { libraryIds: [1] },
        sourceKinds: ["metadata", "metadata", "analysis"],
      }).sourceKinds,
      ["metadata", "analysis"],
    );
    assert.throws(() =>
      hostRead.rebuildSynthesisHostEvidenceSourcesResult({
        scope: { libraryIds: [] },
        descriptors: [],
        nextCursor: null,
        hasMore: false,
        issues: [],
      }),
    );
  });

  it("preserves typed source scan budget exhaustion", function () {
    const result = hostRead.rebuildSynthesisHostEvidenceSourcesResult({
      scope: { libraryIds: [1] },
      descriptors: [],
      nextCursor: "opaque-cursor",
      hasMore: true,
      issues: [
        {
          code: "scan_budget_exhausted",
          sourceKind: null,
          affectedCount: 1,
        },
      ],
    });
    assert.equal(result.issues[0].code, "scan_budget_exhausted");
  });

  it("requires exact UTF-16 descriptor facts when reading a source", function () {
    const descriptor = {
      itemRef: { libraryId: 1, key: "ABCD1234" },
      source: {
        kind: "fulltext",
        attachmentRef: { libraryId: 1, key: "EFGH5678" },
      },
      sourceVersion: "sha256:abc",
      format: "markdown",
      contentLength: 42,
    };
    assert.deepEqual(
      hostRead.rebuildSynthesisHostEvidenceReadRequest({
        scope: { libraryIds: [1] },
        descriptor,
        location: {
          unit: "paragraph",
          field: null,
          range: { start: 1, end: 8 },
        },
      }).location?.range,
      { start: 1, end: 8 },
    );
    assert.throws(() =>
      hostRead.rebuildSynthesisHostEvidenceReadRequest({
        scope: { libraryIds: [1] },
        descriptor: { ...descriptor, contentLength: 262145 },
      }),
    );
    assert.throws(() =>
      hostRead.rebuildSynthesisHostEvidenceReadResult({
        outcome: "source_changed",
        content: "stale text",
      }),
    );
  });

  it("requires analysis locations to identify a canonical JSON field", function () {
    const descriptor = {
      itemRef: { libraryId: 1, key: "ABCD1234" },
      source: {
        kind: "analysis",
        artifactType: "references",
        noteRef: { libraryId: 1, key: "EFGH5678" },
      },
      sourceVersion: "sha256:abc",
      format: "text",
      contentLength: 16,
    };
    assert.throws(() =>
      hostRead.rebuildSynthesisHostEvidenceReadRequest({
        scope: { libraryIds: [1] },
        descriptor,
        location: {
          unit: "analysis_field",
          field: null,
          range: { start: 0, end: 4 },
        },
      }),
    );
    assert.deepEqual(
      hostRead.rebuildSynthesisHostEvidenceReadRequest({
        scope: { libraryIds: [1] },
        descriptor,
        location: {
          unit: "analysis_field",
          field: "/summary",
          range: { start: 0, end: 4 },
        },
      }).location?.field,
      "/summary",
    );
  });
});

describe("Synthesis Host retrieval invalidation signals", function () {
  it("maps a deleted paper through notifier extraData", function () {
    stubZoteroItems({});
    const { paperRefs, unresolved } = collectSynthesisInvalidationPaperRefs({
      ids: [10],
      extraData: {
        "10": { libraryID: 3, key: "PAPER1", itemType: "journalArticle" },
      },
    });
    assert.deepEqual(paperRefs, [{ libraryId: 3, key: "PAPER1" }]);
    assert.equal(unresolved, 0);
  });

  it("resolves an attachment child to its owning paper, never the attachment key", function () {
    stubZoteroItems({
      "20": { key: "PAPER2", libraryID: 1 },
      "30": {
        key: "ATTACH1",
        libraryID: 1,
        parentID: 20,
        itemType: "attachment",
      },
    });
    const { paperRefs } = collectSynthesisInvalidationPaperRefs({ ids: [30] });
    assert.deepEqual(paperRefs, [{ libraryId: 1, key: "PAPER2" }]);
  });

  it("counts an unresolvable child instead of emitting an attachment identity", function () {
    stubZoteroItems({
      "40": {
        key: "ATTACH2",
        libraryID: 1,
        parentID: 99,
        itemType: "attachment",
      },
    });
    const { paperRefs, unresolved } = collectSynthesisInvalidationPaperRefs({
      ids: [40],
    });
    assert.deepEqual(paperRefs, []);
    assert.equal(unresolved, 1);
  });

  it("keeps group-library identity and dedupes repeated ids", function () {
    stubZoteroItems({
      "50": { key: "G1", libraryID: 12345 },
      "60": { key: "G1", libraryID: 12345 },
    });
    const { paperRefs } = collectSynthesisInvalidationPaperRefs({
      ids: [50, 60],
    });
    assert.deepEqual(paperRefs, [{ libraryId: 12345, key: "G1" }]);
  });

  it("bounds invalidation batches and reports an all-success summary", async function () {
    const items: Record<string, FakeItem> = {};
    const ids: number[] = [];
    for (let index = 1; index <= 300; index += 1) {
      items[String(index)] = { key: `K${index}`, libraryID: 1 };
      ids.push(index);
    }
    stubZoteroItems(items);
    const batches: number[] = [];
    const result = await recordSynthesisZoteroItemNotifications({
      event: "delete",
      type: "item",
      ids,
      retrievalPort: {
        async invalidate(input) {
          batches.push(input.paperRefs.length);
        },
      },
    });
    assert.deepEqual(batches, [SYNTHESIS_INVALIDATION_BATCH_SIZE, 44]);
    assert.deepEqual(result.invalidation, {
      paperRefs: 300,
      invalidated: 300,
      unresolved: 0,
      failures: 0,
      unavailable: 0,
    });
  });

  it("ignores an absent service but counts other failures observably", async function () {
    stubZoteroItems({ "70": { key: "PAPER3", libraryID: 1 } });
    const absent = await recordSynthesisZoteroItemNotifications({
      event: "delete",
      type: "item",
      ids: [70],
      retrievalPort: {
        async invalidate() {
          throw new SynthesisClientError("unavailable", "no service");
        },
      },
    });
    assert.deepEqual(absent.invalidation, {
      paperRefs: 1,
      invalidated: 0,
      unresolved: 0,
      failures: 1,
      unavailable: 1,
    });
    const broken = await recordSynthesisZoteroItemNotifications({
      event: "delete",
      type: "item",
      ids: [70],
      retrievalPort: {
        async invalidate() {
          throw new SynthesisClientError("internal", "broken");
        },
      },
    });
    assert.deepEqual(broken.invalidation, {
      paperRefs: 1,
      invalidated: 0,
      unresolved: 0,
      failures: 1,
      unavailable: 0,
    });
  });

  it("does no work for unrelated events or non-item types", async function () {
    stubZoteroItems({ "80": { key: "PAPER4", libraryID: 1 } });
    let calls = 0;
    const retrievalPort = {
      async invalidate() {
        calls += 1;
      },
    };
    const unrelated = await recordSynthesisZoteroItemNotifications({
      event: "select",
      type: "item",
      ids: [80],
      retrievalPort,
    });
    const nonItem = await recordSynthesisZoteroItemNotifications({
      event: "modify",
      type: "collection",
      ids: [80],
      retrievalPort,
    });
    assert.equal(calls, 0);
    assert.equal(unrelated.invalidation.paperRefs, 0);
    assert.equal(nonItem.invalidation.paperRefs, 0);
  });
});
