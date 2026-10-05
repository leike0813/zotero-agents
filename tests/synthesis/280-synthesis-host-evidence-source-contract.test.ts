import { assert } from "chai";
import * as hostRead from "../../packages/synthesis-contracts/src/hostRead";

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
