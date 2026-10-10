import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { canonicalSynthesisTopicPathId } from "../../packages/synthesis-application/src/topicCanonical";
import { SynthesisClientError } from "../../packages/synthesis-contracts/src";
import type { SynthesisTopicApplyRequest } from "../../packages/synthesis-contracts/src";
import { SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID } from "../../packages/synthesis-contracts/src/debugMaintenance";
import {
  canonicalizeSynthesisContractJson,
  hashSynthesisContractCanonicalJson,
} from "../../packages/synthesis-contracts/src/canonicalJson";
import {
  SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE as EXECUTABLE,
  captureSynthesisProductionRouteDurableState,
  startSynthesisProductionRouteHarness,
  type SynthesisProductionRouteHarness,
  type SynthesisProductionRouteHostFixture,
} from "../helpers/synthesisProductionRouteHarness";

const CONTROL_TARGET_BYTES = 786_432;
const REVIEW_BODY_CHARS = 65_000;
const REVIEW_EVENT_CHARS = 60_000;

function sha256(value: unknown) {
  return hashSynthesisContractCanonicalJson(value).replace("sha256:", "");
}

/** Canonical digests the store verifies against are `sha256:`-prefixed. */
function digest(value: unknown) {
  return hashSynthesisContractCanonicalJson(value);
}

type FixtureArtifact = {
  paperRef: string;
  artifactType: string;
  payloadType: string;
  scanStatus?: string;
  readStatus?: string;
  diagnostics?: string[];
  content: Record<string, unknown>;
};

/**
 * One healthy paper carrying all four artifact types next to one paper whose
 * digest note cannot be decoded and whose references note is gone. The broken
 * entries are what a real library accumulates; the healthy neighbors are what
 * a public read must keep serving.
 */
function artifactFixtures(): FixtureArtifact[] {
  return [
    {
      paperRef: "1:VALID1",
      artifactType: "digest",
      payloadType: "digest-markdown",
      content: {
        kind: "text",
        text: "# Valid digest\n\nThe decoded digest body of 1:VALID1.",
        mediaType: "text/markdown",
      },
    },
    {
      paperRef: "1:VALID1",
      artifactType: "references",
      payloadType: "references-json",
      content: {
        kind: "json",
        value: { references: [{ title: "Valid reference title" }] },
      },
    },
    {
      paperRef: "1:VALID1",
      artifactType: "citation_analysis",
      payloadType: "citation-analysis-json",
      content: {
        kind: "json",
        value: { citations: [{ cited_title: "Valid reference title" }] },
      },
    },
    {
      paperRef: "1:VALID1",
      artifactType: "literature_score",
      payloadType: "literature-score-json",
      content: {
        kind: "json",
        value: { schema: "literature_score.v1", overall_score: 0.8 },
      },
    },
    {
      paperRef: "1:MIXED1",
      artifactType: "digest",
      payloadType: "digest-markdown",
      readStatus: "decode_error",
      diagnostics: ["note_payload_decode_failed"],
      content: {
        kind: "text",
        text: "undecodable",
        mediaType: "text/markdown",
      },
    },
    {
      paperRef: "1:MIXED1",
      artifactType: "references",
      payloadType: "references-json",
      scanStatus: "missing",
      diagnostics: ["note_missing"],
      content: { kind: "json", value: { references: [] } },
    },
  ];
}

function artifactHostFixture(): SynthesisProductionRouteHostFixture {
  const fixtures = artifactFixtures();
  return {
    handle({ capability, payload }) {
      if (capability === "webdav.describe") return { configured: false };
      if (capability === "library.items.list_page") {
        return {
          items: [],
          cursor: String(payload.cursor || ""),
          nextCursor: "",
          hasMore: false,
          returned: 0,
          limit: Number(payload.limit || 100),
          snapshotRevision: "read-projections",
        };
      }
      if (capability === "library.artifacts.scan_page") {
        const refs = Array.isArray(payload.paperRefs) ? payload.paperRefs : [];
        const types = Array.isArray(payload.artifactTypes)
          ? payload.artifactTypes
          : [];
        const artifacts = fixtures
          .filter(
            (fixture) =>
              (!refs.length || refs.includes(fixture.paperRef)) &&
              (!types.length || types.includes(fixture.artifactType)),
          )
          .map((fixture) => ({
            paperRef: fixture.paperRef,
            artifactType: fixture.artifactType,
            payloadType: fixture.payloadType,
            status: fixture.scanStatus ?? "available",
            locator: `fixture:${fixture.paperRef}:${fixture.artifactType}`,
            payloadHash: `sha256:${sha256(fixture.content)}`,
            diagnostics: fixture.diagnostics ?? [],
          }));
        return {
          artifacts,
          cursor: String(payload.cursor || ""),
          nextCursor: "",
          hasMore: false,
          returned: artifacts.length,
          limit: Number(payload.limit || 50),
          snapshotRevision: "read-projections",
        };
      }
      if (capability === "library.artifacts.read") {
        const fixture = fixtures.find(
          (row) =>
            `fixture:${row.paperRef}:${row.artifactType}` === payload.locator,
        );
        if (!fixture) return { status: "missing", diagnostics: [] };
        if (fixture.readStatus) {
          return {
            status: fixture.readStatus,
            payloadHash: payload.expectedHash,
            diagnostics: fixture.diagnostics ?? [],
          };
        }
        return {
          status: "available",
          payloadHash: payload.expectedHash,
          content: fixture.content,
          diagnostics: [],
        };
      }
      return { status: "unavailable", diagnostics: [] };
    },
  };
}

describe("Synthesis public read projections", function () {
  this.timeout(180_000);

  before(function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
  });

  describe("artifact manifest and artifact read", function () {
    let harness: SynthesisProductionRouteHarness;

    beforeEach(async function () {
      harness = await startSynthesisProductionRouteHarness({
        id: "artifact-read-projections",
        hostFixture: artifactHostFixture(),
      });
    });

    afterEach(async function () {
      await harness.stop();
    });

    it("reads a nonempty manifest for all four artifact types and bounds bad neighbors", async function () {
      const durableBefore = captureSynthesisProductionRouteDurableState(
        harness.root,
      );
      const manifest = await harness.client.artifacts.getManifest({
        paper_refs: ["1:VALID1", "1:MIXED1"],
      });
      assert.equal(manifest.total, 6);

      const valid = manifest.artifacts.filter(
        (row) => row.paper_ref === "1:VALID1",
      );
      assert.deepEqual(
        valid.map((row) => row.artifact_type),
        ["digest", "references", "citation_analysis", "literature_score"],
      );
      for (const row of valid) {
        assert.equal(row.status, "available");
        assert.match(String(row.payload_hash), /^sha256:[a-f0-9]{64}$/);
        assert.isDefined(row.payload_type);
        assert.deepEqual([...row.payload_types_seen].sort(), [
          "citation-analysis-json",
          "digest-markdown",
          "literature-score-json",
          "references-json",
        ]);
        // The manifest is a content-free index; content belongs to the read.
        assert.notProperty(row, "payload");
        assert.notProperty(row, "markdown");
        assert.notProperty(row, "decoded_text");
      }

      const mixed = manifest.artifacts.filter(
        (row) => row.paper_ref === "1:MIXED1",
      );
      assert.deepEqual(
        mixed.map((row) => row.status),
        ["invalid", "missing"],
      );
      assert.include(mixed[0].diagnostics, "note_payload_decode_failed");
      assert.include(mixed[1].diagnostics, "note_missing");
      assert.deepEqual([...manifest.diagnostics].sort(), [
        "note_missing",
        "note_payload_decode_failed",
      ]);
      // A bad entry must not strip the healthy payload types of its paper.
      assert.deepEqual(
        mixed.map((row) => row.payload_types_seen.length),
        [2, 2],
      );

      const filtered = await harness.client.artifacts.getManifest({
        paper_refs: ["1:VALID1"],
        artifact_types: ["references", "literature_score"],
      });
      assert.deepEqual(
        filtered.artifacts.map((row) => row.artifact_type),
        ["references", "literature_score"],
      );
      assert.equal(filtered.total, 2);

      let missing: unknown;
      try {
        await harness.client.artifacts.getManifest({
          paper_refs: ["1:ABSENT1"],
        });
      } catch (error) {
        missing = error;
      }
      assert.instanceOf(missing, SynthesisClientError);
      assert.equal(
        (missing as SynthesisClientError).details?.sidecarReason,
        "paper_artifacts_not_found",
      );

      assert.deepEqual(
        captureSynthesisProductionRouteDurableState(harness.root),
        durableBefore,
      );
      assert.isFalse(
        harness.recorder.hostCalls.some(({ capability }) =>
          capability.startsWith("effects."),
        ),
      );
    });

    it("reads healthy artifact content beside malformed and missing entries", async function () {
      const durableBefore = captureSynthesisProductionRouteDurableState(
        harness.root,
      );
      const read = await harness.client.artifacts.readPaperArtifacts({
        paper_refs: ["1:VALID1", "1:MIXED1"],
      });
      const byKey = new Map(
        read.artifacts.map((row) => [
          `${row.paper_ref}/${row.artifact_type}`,
          row,
        ]),
      );

      const digest = byKey.get("1:VALID1/digest")!;
      assert.equal(digest.status, "available");
      assert.equal(digest.markdown, digest.decoded_text);
      assert.include(
        String(digest.markdown),
        "The decoded digest body of 1:VALID1.",
      );
      assert.deepEqual(
        (byKey.get("1:VALID1/references")!.payload as any).references,
        [{ title: "Valid reference title" }],
      );
      assert.equal(
        (byKey.get("1:VALID1/citation_analysis")!.payload as any).citations[0]
          .cited_title,
        "Valid reference title",
      );
      assert.equal(
        (byKey.get("1:VALID1/literature_score")!.payload as any).schema,
        "literature_score.v1",
      );

      const broken = byKey.get("1:MIXED1/digest")!;
      assert.equal(broken.status, "invalid");
      assert.notProperty(broken, "payload");
      assert.include(broken.diagnostics, "note_payload_decode_failed");
      const gone = byKey.get("1:MIXED1/references")!;
      assert.equal(gone.status, "missing");
      assert.notProperty(gone, "payload");
      assert.include(read.diagnostics, "note_payload_decode_failed");

      assert.deepEqual(
        captureSynthesisProductionRouteDurableState(harness.root),
        durableBefore,
      );
      assert.isFalse(
        harness.recorder.hostCalls.some(({ capability }) =>
          capability.startsWith("effects."),
        ),
      );
    });
  });

  describe("debug projections", function () {
    let harness: SynthesisProductionRouteHarness;
    const topicId = "read-projection-topic";
    const topicTitle = "Read projection Topic";
    const topicMetadata = { data: { topic_id: topicId } };
    const caches = [
      {
        cache_key: "citation-graph:library",
        cache_kind: "citation-graph",
        status: "ready",
        updated_at: "2026-02-02T00:00:00.000Z",
      },
      {
        cache_key: "reference-sidecar:library",
        cache_kind: "reference-sidecar",
        status: "stale",
        updated_at: "2026-02-03T00:00:00.000Z",
      },
      {
        cache_key: "tag-vocabulary:library",
        cache_kind: "tag-vocabulary",
        status: "ready",
        updated_at: "2026-02-01T00:00:00.000Z",
      },
    ];
    const operations = [
      {
        operation_id: "operation:read-projection-a",
        operation_type: "citation_graph.rebuild",
        status: "completed",
        updated_at: "2026-02-04T00:00:00.000Z",
      },
      {
        operation_id: "operation:read-projection-b",
        operation_type: "reference.refresh",
        status: "running",
        updated_at: "2026-02-05T00:00:00.000Z",
      },
      {
        operation_id: "operation:read-projection-c",
        operation_type: "tag_vocabulary.rebuild",
        status: "failed",
        updated_at: "2026-02-06T00:00:00.000Z",
      },
    ];
    const topicArtifact = { topic: { id: topicId, title: topicTitle } };
    const topicArtifactHash = digest(topicArtifact);
    const topicManifest = {
      topic_id: topicId,
      artifact_hash: topicArtifactHash,
      metadata_hash: digest(topicMetadata),
      sections: { topic: { path: "topic.json" } },
      section_hashes: { topic: digest(topicArtifact.topic) },
    };

    before(async function () {
      harness = await startSynthesisProductionRouteHarness({
        id: "debug-read-projections",
        hostFixture: artifactHostFixture(),
      });
      const database = new DatabaseSync(
        path.join(harness.root, "state", "synthesis.db"),
      );
      try {
        const insertCache = database.prepare(
          `INSERT INTO synt_cache_basis
            (cache_key,cache_kind,scope_kind,scope_ref,status,updated_at)
           VALUES (?,?,?,?,?,?)`,
        );
        for (const cache of caches) {
          insertCache.run(
            cache.cache_key,
            cache.cache_kind,
            "library",
            `${harness.root}/private-scope-${cache.cache_key}`,
            cache.status,
            cache.updated_at,
          );
        }
        const insertOperation = database.prepare(
          `INSERT INTO synt_operation
            (operation_id,operation_type,status,label,message,updated_at)
           VALUES (?,?,?,?,?,?)`,
        );
        for (const operation of operations) {
          insertOperation.run(
            operation.operation_id,
            operation.operation_type,
            operation.status,
            `private label ${operation.operation_id}`,
            `private message under ${harness.root}/private-run`,
            operation.updated_at,
          );
        }
        const pathId = canonicalSynthesisTopicPathId(topicId);
        const current = path.join(
          harness.root,
          "data",
          "synthesis",
          "topics",
          pathId,
          "current",
        );
        fs.mkdirSync(path.join(current, "sections"), { recursive: true });
        for (const [name, value] of Object.entries({
          "manifest.json": topicManifest,
          "artifact.json": topicArtifact,
          "metadata.json": topicMetadata,
          "sections/topic.json": topicArtifact.topic,
        })) {
          fs.writeFileSync(
            path.join(current, name),
            `${canonicalizeSynthesisContractJson(value)}\n`,
          );
        }
        database
          .prepare(
            `INSERT INTO synt_topic_application_state
              (topic_id,path_id,title,operation,manifest_hash,artifact_hash,metadata_hash,
               bundle_hash,topic_definition_json,topic_resolver_json,resolved_paper_set_json,updated_at)
            VALUES (?,?,?,'update_full',?,?,?,'fixture-bundle',?,?,?,'2026-02-01T00:00:00.000Z')`,
          )
          .run(
            topicId,
            pathId,
            topicTitle,
            hashSynthesisContractCanonicalJson(topicManifest),
            topicArtifactHash,
            digest(topicMetadata),
            JSON.stringify(topicArtifact.topic),
            JSON.stringify({
              paper_refs: [],
              collection_key: [],
              combine: "union",
            }),
            JSON.stringify({ papers: [] }),
          );
      } finally {
        database.close();
      }
    });

    after(async function () {
      await harness.stop();
    });

    it("projects a bounded sorted snapshot without private repository columns", async function () {
      const durableBefore = captureSynthesisProductionRouteDurableState(
        harness.root,
      );
      const snapshot = await harness.client.debug.snapshot();
      assert.equal(snapshot.status, "ready");
      assert.equal(snapshot.schemaId, "synthesis.debug-maintenance.v1");
      assert.match(String(snapshot.basis.revision), /^[a-f0-9]{64}$/);
      assert.deepEqual(snapshot.diagnostics, []);

      assert.deepEqual(
        snapshot.caches.items,
        caches
          .map((cache) => ({
            cacheKey: cache.cache_key,
            cacheKind: cache.cache_kind,
            status: cache.status,
            updatedAt: cache.updated_at,
          }))
          .sort((left, right) => left.cacheKey.localeCompare(right.cacheKey)),
      );
      assert.deepEqual(
        snapshot.operations.items,
        operations
          .map((operation) => ({
            operationId: operation.operation_id,
            operationType: operation.operation_type,
            status: operation.status,
            updatedAt: operation.updated_at,
          }))
          .sort((left, right) =>
            left.operationId.localeCompare(right.operationId),
          ),
      );
      assert.deepEqual(snapshot.topics.items, [
        {
          topicId,
          status: "ready",
          manifestHash: digest(topicManifest),
          artifactHash: topicArtifactHash,
          metadataHash: digest(topicMetadata),
          sectionCount: 1,
          diagnostics: [],
        },
      ]);

      const projected = JSON.stringify(snapshot);
      assert.notInclude(projected, harness.root);
      assert.notInclude(projected, "private-scope");
      assert.notInclude(projected, "private label");
      assert.notInclude(projected, "private message");

      assert.deepEqual(
        captureSynthesisProductionRouteDurableState(harness.root),
        durableBefore,
      );
    });

    it("pages cached and operation rows without rebuilding anything", async function () {
      const durableBefore = captureSynthesisProductionRouteDurableState(
        harness.root,
      );
      const hostOffset = harness.recorder.hostCalls.length;

      const firstCaches = await harness.client.debug.listCache({ limit: 2 });
      assert.equal(firstCaches.total, 3);
      assert.equal(firstCaches.limit, 2);
      assert.isTrue(firstCaches.truncated);
      assert.isTrue(firstCaches.has_more);
      assert.equal(firstCaches.cursor, "0");
      assert.equal(firstCaches.next_cursor, "2");
      assert.deepEqual(
        firstCaches.rows.map((row) => row.cacheKey),
        ["citation-graph:library", "reference-sidecar:library"],
      );

      const secondCaches = await harness.client.debug.listCache({
        cursor: firstCaches.next_cursor,
        limit: 2,
      });
      assert.deepEqual(
        secondCaches.rows.map((row) => row.cacheKey),
        ["tag-vocabulary:library"],
      );
      assert.isFalse(secondCaches.has_more);
      assert.equal(secondCaches.next_cursor, "");

      const firstOperations = await harness.client.debug.listOperations({
        limit: 1,
      });
      assert.equal(firstOperations.total, 3);
      assert.isTrue(firstOperations.truncated);
      assert.deepEqual(
        firstOperations.rows.map((row) => row.operationId),
        ["operation:read-projection-a"],
      );
      const lastOperations = await harness.client.debug.listOperations({
        cursor: "2",
        limit: 1,
      });
      assert.deepEqual(
        lastOperations.rows.map((row) => row.operationId),
        ["operation:read-projection-c"],
      );
      assert.isFalse(lastOperations.truncated);

      assert.deepEqual(harness.recorder.hostCalls.slice(hostOffset), []);
      assert.deepEqual(
        captureSynthesisProductionRouteDurableState(harness.root),
        durableBefore,
      );
    });

    it("inspects an existing topic and reports a missing one as absent", async function () {
      const durableBefore = captureSynthesisProductionRouteDurableState(
        harness.root,
      );
      const ready = await harness.client.debug.inspectTopic({ topicId });
      assert.equal(ready.topicId, topicId);
      assert.equal(ready.status, "ready");
      assert.equal(ready.artifactHash, topicArtifactHash);
      assert.equal(ready.metadataHash, digest(topicMetadata));
      assert.equal(ready.sectionCount, 1);
      assert.deepEqual(ready.diagnostics, []);

      const absent = await harness.client.debug.inspectTopic({
        topicId: "read-projection-missing",
      });
      assert.equal(absent.status, "absent");
      assert.equal(absent.sectionCount, 0);
      assert.isNull(absent.artifactHash);

      assert.deepEqual(
        captureSynthesisProductionRouteDurableState(harness.root),
        durableBefore,
      );
    });

    it("serves the current schema identities and redaction declaration read-only", async function () {
      const durableBefore = captureSynthesisProductionRouteDurableState(
        harness.root,
      );
      const hostOffset = harness.recorder.hostCalls.length;
      const schemas = await harness.client.maintenance.getSchemas({});
      assert.equal(
        schemas.schema,
        "synthesis-artifact-library-debug-schemas.v1",
      );
      assert.equal(
        schemas.schemas.debug_snapshot,
        SYNTHESIS_DEBUG_MAINTENANCE_SCHEMA_ID,
      );
      assert.deepEqual(Object.keys(schemas.schemas).sort(), [
        "artifact_manifest",
        "canonical_metadata",
        "debug_snapshot",
        "library_index",
        "result_bundle",
      ]);
      assert.deepEqual(schemas.redaction, {
        local_paths: "[redacted-path]",
        credentials: "omitted",
        host_objects: "omitted",
      });
      const projected = JSON.stringify(schemas);
      assert.notInclude(projected, harness.root);
      assert.notInclude(projected, "private-scope");
      assert.deepEqual(harness.recorder.hostCalls.slice(hostOffset), []);
      assert.deepEqual(
        captureSynthesisProductionRouteDurableState(harness.root),
        durableBefore,
      );
    });
  });

  describe("oversized review input", function () {
    let harness: SynthesisProductionRouteHarness;
    const topicId = "oversized-review-topic";
    const paperRef = "1:OVERSIZED1";

    before(async function () {
      harness = await startSynthesisProductionRouteHarness({
        id: "review-read-projection",
        hostFixture: {
          handle({ capability, payload }) {
            if (capability === "webdav.describe") return { configured: false };
            if (capability === "library.items.list_page") {
              return {
                items: [
                  {
                    paperRef,
                    libraryId: 1,
                    itemKey: "OVERSIZED1",
                    itemType: "journalArticle",
                    title: "Oversized review source",
                    year: "2026",
                    metadataHash: `sha256:${"d".repeat(64)}`,
                  },
                ],
                cursor: String(payload.cursor || ""),
                nextCursor: "",
                hasMore: false,
                returned: 1,
                limit: Number(payload.limit || 100),
                snapshotRevision: "review-read-projection",
              };
            }
            return { status: "unavailable", diagnostics: [] };
          },
        },
      });
      const applied =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          oversizedTopicApplyRequest(topicId, paperRef),
        );
      assert.equal(applied.status, "persisted");
    });

    after(async function () {
      await harness.stop();
    });

    it("serves a control-bound-breaking review input through the content transfer plane", async function () {
      const durableBefore = captureSynthesisProductionRouteDurableState(
        harness.root,
      );
      const wireOffset = harness.recorder.wire.length;
      const review = await harness.client.workflowReview.getInput({
        topicId,
        maxChars: 40_000,
      });
      const wire = harness.recorder.wire.slice(wireOffset);
      const primary = wire.filter(
        (sample) => sample.capability === "client.getReviewInput",
      );
      assert.lengthOf(primary, 1);
      assert.isBelow(primary[0].responseBytes, CONTROL_TARGET_BYTES);
      assert.isTrue(
        wire.some((sample) => sample.capability.startsWith("transfer.")),
        "the oversized review payload must leave the control plane",
      );

      assert.equal(review.kind, "synthesis.review_workflow_input");
      assert.equal(review.topic.topic_id, topicId);
      assert.equal(review.topic.markdown.length, 40_000);
      assert.equal(
        review.structured_topic?.artifact?.synthesis_report?.body?.length,
        REVIEW_BODY_CHARS,
      );
      assert.equal(review.structured_topic?.timeline_events?.events?.length, 8);
      assert.deepEqual(review.resolved_paper_set.papers, [
        { paper_ref: paperRef, match_reasons: [] },
      ]);

      const second = await harness.client.workflowReview.getInput({
        topicId,
        maxChars: 40_000,
      });
      assert.equal(second.input_hash, review.input_hash);
      assert.deepEqual(
        captureSynthesisProductionRouteDurableState(harness.root),
        durableBefore,
      );
      assert.isFalse(
        harness.recorder.hostCalls.some(({ capability }) =>
          capability.startsWith("effects."),
        ),
      );
    });
  });
});

function oversizedTopicApplyRequest(
  topicId: string,
  paperRef: string,
): SynthesisTopicApplyRequest {
  const sections: Record<string, unknown> = {
    topic: {
      id: topicId,
      title: "Oversized Review Topic",
      definition: "A Topic whose review input exceeds the control envelope.",
      discipline: "Information Science",
      scope: "Read projection bounds",
    },
    summary: { overview: "A bounded fixture with an oversized report body." },
    taxonomy: {
      summary: { text: "One durable route." },
      nodes: [
        {
          id: "route:oversized",
          definition: "Oversized read route",
          core_problem: "Keep large review inputs off the control plane",
          mechanism: "Content transfer with a locator envelope",
          source_paper_refs: [paperRef],
          strengths: ["bounded"],
          limitations: ["fixture scope"],
          maturity: "validated",
        },
      ],
    },
    improvement_dimensions: [
      {
        id: "dimension:oversized",
        analysis:
          "Large review payloads stay readable through the transfer plane.",
        source_paper_refs: [paperRef],
      },
    ],
    claims: [
      {
        id: "claim:oversized",
        text: "Oversized review inputs remain complete.",
        analysis: "The locator envelope is resolved by the public client.",
        scope: "Read projection fixture",
        source_paper_refs: [paperRef],
      },
    ],
    timeline_events: {
      summary: { text: "Create, publish, and read back." },
      events: Array.from({ length: 8 }, (_, index) => ({
        id: `event:oversized-${index}`,
        description: `Historical step ${index}. ${"h".repeat(REVIEW_EVENT_CHARS)}`,
        phase: "validation",
        source_paper_refs: [paperRef],
      })),
    },
    source_papers: [
      {
        paper_ref: paperRef,
        digest_ref: { paper_ref: paperRef, payload_type: "digest-markdown" },
      },
    ],
    debates: [],
    statistics: {
      paper_count: 1,
      time_span: { start_year: 2026, end_year: 2026 },
      route_coverage: "One fixture route",
      coverage_verdict: "partial",
    },
    coverage: {
      coverage_verdict: "partial",
      coverage_reason: "One bounded fixture source.",
      coverage_caveats: ["Fixture scope."],
      external_context_summary: "Outside this fixture.",
      suggested_collection_directions: [],
    },
    future_directions: [
      { id: "future:oversized", source_paper_refs: [paperRef] },
    ],
    review_outline: {
      topic_importance: "Bounded reads stay usable for large Topics.",
      writing_strategies: [
        {
          id: "strategy:oversized",
          title: "Oversized",
          review_thesis: "Large payloads are transported, not truncated away.",
          writing_strategy:
            "Read the structured artifact, not the truncated markdown.",
          best_for: "Review input coverage",
          risks: "Fixture scope",
          section_plan: ["Create", "Read back"],
          source_paper_refs: [paperRef],
        },
      ],
      recommended_strategy_id: "strategy:oversized",
    },
    synthesis_report: {
      title: "Oversized Route",
      source_section_chapters: {
        research_routes: "taxonomy.summary",
        historical_progression: "timeline_events.summary",
      },
      body: "r".repeat(REVIEW_BODY_CHARS),
    },
    source_artifacts: [
      {
        paper_ref: paperRef,
        artifact_type: "digest",
        payload_type: "digest-markdown",
        status: "available",
        hash: `sha256:${"e".repeat(64)}`,
      },
    ],
    diagnostics: { warnings: [] },
  };
  const sidecars: Record<string, unknown> = {
    topic_interest_metadata: {
      schema: "topic_interest_metadata.v1",
      topic_id: topicId,
      include_terms: ["oversized review input"],
    },
    concept_cards_proposal: {
      schema_id: "synthesis.concept_cards_proposal",
      schema_version: "1.0.0",
      cards: [
        {
          label: "Oversized review input",
          aliases: [],
          concept_type: "method",
          domain: "information-science",
          short_definition: "A review input that leaves the control plane.",
          definition:
            "A review input served through the content transfer plane.",
          topic_relevance: "Keeps large review reads complete.",
          confidence: "high",
          evidence: [{ paper_ref: paperRef }],
          relations: [],
        },
      ],
    },
    topic_graph_relation_proposals: {
      schema_id: "synthesis.topic_graph_relation_proposals",
      proposals: [],
    },
    prospective_topic_relation_proposals: {
      schema_id: "synthesis.prospective_topic_relation_proposals",
      proposals: [],
    },
  };
  const assets = [
    {
      id: "asset/artifact-manifest",
      mediaType: "application/json" as const,
      text: JSON.stringify({
        topic_analysis: "asset/manifest",
        resolver_manifest: "asset/resolver",
      }),
    },
    {
      id: "asset/manifest",
      mediaType: "application/json" as const,
      text: JSON.stringify({
        schema_id: "synthesis.topic_analysis_manifest",
        schema_version: "3.0.0",
        operation: "create",
        topic_id: topicId,
        language: "en",
        sections: Object.fromEntries(
          Object.keys(sections).map((name) => [
            name,
            { path: `asset/section/${name}`, content_type: "json" },
          ]),
        ),
        sidecars: Object.fromEntries(
          Object.keys(sidecars).map((name) => [
            name,
            {
              path: `asset/sidecar/${name}`,
              content_type: "json",
              schema_id: `fixture.${name}`,
            },
          ]),
        ),
      }),
    },
    {
      id: "asset/resolver",
      mediaType: "application/json" as const,
      text: JSON.stringify({
        resolver: {
          paper_refs: [paperRef],
          collection_key: [],
          combine: "union",
        },
        resolved_paper_set: { papers: [{ paper_ref: paperRef }] },
      }),
    },
    ...Object.entries(sections).map(([name, value]) => ({
      id: `asset/section/${name}`,
      mediaType: "application/json" as const,
      text: JSON.stringify(value),
    })),
    ...Object.entries(sidecars).map(([name, value]) => ({
      id: `asset/sidecar/${name}`,
      mediaType: "application/json" as const,
      text: JSON.stringify(value),
    })),
  ];
  return {
    bundle: {
      kind: "topic_synthesis",
      operation: "create",
      mode: "create",
      language: "en",
      topic_definition: {
        id: topicId,
        title: "Oversized Review Topic",
        definition: "A Topic whose review input exceeds the control envelope.",
      },
      artifact_manifest_path: "asset/artifact-manifest",
      artifact_metadata: {
        runtime: "split-skill",
        topic_id: topicId,
        depends_on: { papers: [paperRef], artifacts: ["digest-markdown"] },
      },
    },
    assets,
  } as unknown as SynthesisTopicApplyRequest;
}
