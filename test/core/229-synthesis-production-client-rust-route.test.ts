import { assert } from "chai";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { rebuildSynthesisSidecarObservationEvent } from "../../packages/synthesis-contracts/src/sidecarObservability";
import { inspectSynthesisTopicWorkbenchSurfaceParity } from "../../scripts/check-synthesis-topic-workbench-surface-parity";
import { buildSynthesisUiSnapshot } from "../../src/modules/synthesis/uiModel";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";
import { createSyntheticSynthesisProductionRouteDataset } from "../fixtures/synthesisSyntheticDatasets";
import {
  SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN as CLIENT_TOKEN,
  SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE as EXECUTABLE,
  callSynthesisProductionRoute as call,
  captureSynthesisProductionRouteDurableState as captureDurableState,
  startSynthesisProductionRouteHarness,
  startSynthesisProductionRouteSidecar as start,
  stopSynthesisProductionRouteSidecar as stop,
  synthesisProductionRouteConfig as config,
  waitForSynthesisProductionRouteReceipt,
} from "../helpers/synthesisProductionRouteHarness";
import { executeSynthesisProductionRouteScenarios } from "../helpers/synthesisProductionRouteScenarios";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BASELINE_PRODUCTION_OBSERVABLES = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "test/fixtures/synthesis-sidecar-migration/main-e210997a-production-observables.v1.json",
    ),
    "utf8",
  ),
) as {
  baseline: { commit: string };
  surfaces: Array<{
    id: string;
    cases: Array<{
      id: string;
      operation: string;
      access: "read" | "mutation";
      request: unknown;
      expected: {
        dtoSemantics: string[];
        hostEffects: string[];
        writeExpectation: "zero" | "mutation";
        projection: Record<string, unknown>;
      };
    }>;
  }>;
};
const TOPIC_WORKBENCH_OPERATIONS = [
  "client.applyLiteratureDigestSidecar",
  "client.applyTopicSynthesisResult",
  "client.consumeRelatedItemsSyncEcho",
  "client.deleteTopicArtifact",
  "client.findTopicsByPaperRef",
  "client.getSynthesisBackgroundJobRows",
  "client.getSynthesisWorkbenchChromeInput",
  "client.getSynthesisWorkbenchSurfaceInput",
  "client.getTopicContext",
  "client.getTopicReport",
  "client.listTopics",
  "client.listWorkflowTopicOptions",
  "client.purgeDeletedTopicArtifacts",
  "client.readTopicDetail",
  "client.rejectTopicDiscoveryHint",
  "client.resolveResolver",
  "client.resolveTopicPaperDigest",
  "client.restoreTopicDiscoveryHint",
] as const;

async function waitForMaintenanceOperation(port: number, operationId: string) {
  return waitForSynthesisProductionRouteReceipt({
    operationId,
    attempts: 200,
    intervalMs: 25,
    getOperation: async (candidate) => {
      const response = await call(
        port,
        "client.getPublicMaintenanceOperation",
        { args: [{ operation_id: candidate }] },
      );
      assert.equal(response.status, 200, JSON.stringify(response.body));
      return response.body.data as Record<string, any> & { status: string };
    },
  });
}

function topicApplyRequest(topicId: string) {
  const sourcePaperRef = "1:PRODUCTION";
  const sectionValues: Record<string, unknown> = {
    topic: {
      id: topicId,
      title: "Production Topic",
      definition: "A durable production-route Topic",
      discipline: "Information Science",
      scope: "Topic lifecycle persistence",
    },
    summary: { overview: "A production lifecycle fixture." },
    taxonomy: {
      summary: { text: "One durable research route." },
      nodes: [
        {
          id: "route:durable",
          definition: "Durable lifecycle route",
          core_problem: "Preserve lifecycle facts",
          mechanism: "Transactional repository and canonical storage",
          source_paper_refs: [sourcePaperRef],
          strengths: ["durable"],
          limitations: ["fixture scope"],
          maturity: "validated",
        },
      ],
    },
    improvement_dimensions: [
      {
        id: "dimension:durability",
        analysis: "The lifecycle preserves current and deleted state.",
        source_paper_refs: [sourcePaperRef],
      },
    ],
    claims: [
      {
        id: "claim:durable",
        text: "Topic lifecycle state is durable.",
        analysis: "Repository and canonical state survive process reopen.",
        scope: "Production route fixture",
        source_paper_refs: [sourcePaperRef],
      },
    ],
    timeline_events: {
      summary: { text: "Create, delete, reopen, rebuild, and purge." },
      events: [
        {
          id: "event:lifecycle",
          description: "The lifecycle is exercised through the HTTP boundary.",
          phase: "validation",
          source_paper_refs: [sourcePaperRef],
        },
      ],
    },
    source_papers: [
      {
        paper_ref: sourcePaperRef,
        digest_ref: {
          paper_ref: sourcePaperRef,
          payload_type: "digest-markdown",
        },
      },
    ],
    debates: [],
    coverage: {
      coverage_verdict: "partial",
      coverage_reason:
        "A single bounded fixture source is sufficient for lifecycle validation.",
      coverage_caveats: [
        "This fixture does not represent a literature review.",
      ],
      external_context_summary:
        "External context is outside this lifecycle test.",
      suggested_collection_directions: [],
    },
    future_directions: [
      {
        id: "future:coverage",
        source_paper_refs: [sourcePaperRef],
      },
    ],
    review_outline: {
      topic_importance:
        "Durable deletion protects user-controlled Topic state.",
      writing_strategies: [
        {
          id: "strategy:lifecycle",
          title: "Lifecycle",
          review_thesis: "State remains coherent across lifecycle transitions.",
          writing_strategy: "Follow the transitions in storage order.",
          best_for: "Persistence review",
          risks: "Fixture scope",
          section_plan: ["Create", "Delete", "Purge"],
          source_paper_refs: [sourcePaperRef],
        },
      ],
      recommended_strategy_id: "strategy:lifecycle",
    },
    statistics: {
      paper_count: 1,
      time_span: { start_year: 2026, end_year: 2026 },
      route_coverage: "One fixture route",
      coverage_verdict: "partial",
    },
    synthesis_report: {
      title: "Production Topic Lifecycle",
      source_section_chapters: {
        research_routes: "taxonomy.summary",
        historical_progression: "timeline_events.summary",
      },
      body: "This bounded report records a production Topic lifecycle through the real authenticated sidecar route. It establishes a durable active artifact, archives that artifact under a stable deleted identifier, reopens the process against the same repository and canonical root, rebuilds an active Topic without erasing the tombstone, and finally purges only deleted state. The fixture intentionally keeps its literature claims narrow because the observable contract under test is storage ownership and transition safety. ",
    },
    source_artifacts: [],
    diagnostics: { warnings: [] },
  };
  const sectionAssets = Object.entries(sectionValues).map(([name, value]) => ({
    id: `asset/section/${name}`,
    mediaType: "application/json",
    text: JSON.stringify(value),
  }));
  return {
    bundle: {
      kind: "topic_synthesis",
      operation: "create",
      mode: "create",
      language: "en",
      topic_definition: {
        id: topicId,
        title: "Production Topic",
        definition: "A durable production-route Topic",
      },
      resolver_manifest_path: "asset/resolver",
      analysis_manifest_path: "asset/manifest",
      artifact_metadata: {},
      markdown: "",
    },
    assets: [
      {
        id: "asset/manifest",
        mediaType: "application/json",
        text: JSON.stringify({
          schema_id: "synthesis.topic_analysis_manifest",
          schema_version: "3.0.0",
          operation: "create",
          topic_id: topicId,
          language: "en",
          sections: Object.fromEntries(
            Object.keys(sectionValues).map((name) => [
              name,
              { path: `asset/section/${name}`, content_type: "json" },
            ]),
          ),
          sidecars: Object.fromEntries(
            [
              "topic_interest_metadata",
              "concept_cards_proposal",
              "topic_graph_relation_proposals",
              "prospective_topic_relation_proposals",
            ].map((name) => [
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
      ...sectionAssets,
      {
        id: "asset/resolver",
        mediaType: "application/json",
        text: JSON.stringify({
          resolver: { query: "durable production topic" },
          resolved_paper_set: { papers: [{ paper_ref: sourcePaperRef }] },
        }),
      },
    ],
  };
}

describe("Synthesis Rust production client route", function () {
  this.timeout(20_000);

  it("keeps the Topic and Workbench production surface fixture-backed", function () {
    assert.lengthOf(TOPIC_WORKBENCH_OPERATIONS, 18);
    assert.deepEqual(inspectSynthesisTopicWorkbenchSurfaceParity(), {
      ok: true,
      operations: 18,
      observables: 18,
      errors: [],
    });
  });

  it("replays every fixed-baseline read observable through the real production route", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    assert.equal(
      BASELINE_PRODUCTION_OBSERVABLES.baseline.commit,
      "e210997a11e0054a3cb4ae0656e5cfb96102a09c",
    );
    const cases = BASELINE_PRODUCTION_OBSERVABLES.surfaces
      .flatMap((surface) => surface.cases)
      .filter((entry) => entry.access === "read");
    assert.lengthOf(cases, 17);
    assert.isTrue(
      cases.every(
        (entry) =>
          entry.access === "read" &&
          entry.expected.writeExpectation === "zero" &&
          entry.expected.hostEffects.length === 0,
      ),
    );

    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-baseline-observables-"),
    );
    const reverseHostCalls: string[] = [];
    const reverseHost = http.createServer((request, response) => {
      let requestBody = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        requestBody += chunk;
      });
      request.on("end", () => {
        const hostCall = JSON.parse(requestBody || "{}") as {
          capability?: string;
          payload?: { cursor?: string; limit?: number };
        };
        const capability = String(hostCall.capability || "");
        reverseHostCalls.push(capability);
        const cursor = hostCall.payload?.cursor || "";
        const limit = hostCall.payload?.limit || 100;
        const result =
          capability === "webdav.describe"
            ? { configured: false }
            : capability === "library.items.list_page"
              ? {
                  items: [],
                  cursor,
                  nextCursor: "",
                  hasMore: false,
                  returned: 0,
                  limit,
                  snapshotRevision: "fixture-baseline-observables",
                }
              : capability === "library.items.get_by_ref"
                ? {
                    items: [],
                    missingPaperRefs: ["1:MISSING1"],
                  }
                : capability === "library.artifacts.scan_page"
                  ? {
                      artifacts: [],
                      cursor,
                      nextCursor: "",
                      hasMore: false,
                      returned: 0,
                      limit,
                      snapshotRevision: "fixture-baseline-observables",
                    }
                  : { status: "unavailable", diagnostics: [] };
        const body = JSON.stringify({ ok: true, result });
        response.writeHead(200, {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        });
        response.end(body);
      });
    });
    await new Promise<void>((resolve) =>
      reverseHost.listen(0, "127.0.0.1", resolve),
    );
    const address = reverseHost.address();
    if (!address || typeof address === "string") {
      throw new Error("reverse host unavailable");
    }
    const session = path.join(root, "runtime", "sessions", "baseline");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-baseline-observables",
          reverseHostPort: address.port,
        }),
      ),
    );
    const sidecar = start(configPath);
    try {
      const { port } = await sidecar.listening;
      const warmup = await call(
        port,
        "client.getSynthesisWorkbenchChromeInput",
        { args: [{}] },
      );
      assert.equal(warmup.status, 200, JSON.stringify(warmup.body));

      const observed: string[] = [];
      for (const entry of cases) {
        const before = captureDurableState(root);
        const response = await call(port, entry.operation, entry.request);
        assert.equal(response.status, 200, entry.id);
        assert.isAbove(response.metrics.requestBytes, 0, entry.id);
        assert.isAbove(response.metrics.responseBytes, 0, entry.id);
        if (Array.isArray(entry.expected.projection)) {
          assert.deepEqual(
            response.body.data,
            entry.expected.projection,
            entry.id,
          );
        } else {
          assert.deepInclude(
            response.body.data,
            entry.expected.projection,
            entry.id,
          );
        }
        assert.deepEqual(captureDurableState(root), before, entry.id);
        observed.push(entry.id);
      }
      assert.deepEqual(
        observed,
        cases.map((entry) => entry.id),
      );
      assert.isFalse(
        reverseHostCalls.some((capability) =>
          capability.startsWith("effects."),
        ),
      );
    } finally {
      if (sidecar.child.exitCode === null) {
        await stop(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("moves large Topic and artifact content outside the production control envelope", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-content-route-"),
    );
    const hostCalls: string[] = [];
    const reverseHost = http.createServer((request, response) => {
      let source = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        source += chunk;
      });
      request.on("end", () => {
        const requestCall = JSON.parse(source) as {
          capability: string;
          payload: Record<string, unknown>;
        };
        hostCalls.push(requestCall.capability);
        let result: Record<string, unknown>;
        if (requestCall.capability === "library.artifacts.scan_page") {
          result = {
            artifacts: [
              {
                paperRef: "1:CONTENT1",
                artifactType: "references",
                payloadType: "references-json",
                status: "available",
                locator: "fixture:references:CONTENT1",
                payloadHash: `sha256:${"a".repeat(64)}`,
                estimatedSize: 900_000,
                diagnostics: [],
              },
            ],
            cursor: "",
            nextCursor: "",
            hasMore: false,
            returned: 1,
            limit: 50,
          };
        } else if (requestCall.capability === "library.artifacts.read") {
          result = {
            status: "available",
            payloadHash: requestCall.payload.expectedHash,
            content: {
              kind: "json",
              value: {
                padding: "x".repeat(900_000),
                references: [{ title: "Transferred reference" }],
              },
            },
            diagnostics: [],
          };
        } else if (
          requestCall.capability === "delivery.export.publish_archive"
        ) {
          result = {
            status: "available",
            capability: "paper_artifacts.export_filtered",
            delivery: {
              mode: "bridge-download",
              bundle: {
                fileId: "file-content-1",
                sourceKind: "bridge-export",
                displayName: "paper-artifacts.zip",
                contentType: "application/zip",
                size: 1,
                sha256: `sha256:${"b".repeat(64)}`,
                createdAt: "2026-08-02T00:00:00.000Z",
                expiresAt: "2026-08-02T01:00:00.000Z",
                owner: { capability: "paper_artifacts.export_filtered" },
              },
            },
            diagnostics: [],
          };
        } else {
          result = {};
        }
        const body = JSON.stringify({ ok: true, result });
        response.writeHead(200, {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        });
        response.end(body);
      });
    });
    await new Promise<void>((resolve) =>
      reverseHost.listen(0, "127.0.0.1", resolve),
    );
    const address = reverseHost.address();
    if (!address || typeof address === "string") {
      throw new Error("reverse host unavailable");
    }
    const session = path.join(root, "runtime", "sessions", "content");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-content-route",
          reverseHostPort: address.port,
        }),
      ),
    );
    const sidecar = start(configPath);
    try {
      const { port } = await sidecar.listening;
      const health = (await (
        await fetch(`http://127.0.0.1:${port}/synthesis/v1/health`)
      ).json()) as { serviceInstanceId: string };
      const composition = createNativeSynthesisClientComposition({
        getReadyConnection: () => ({
          discovery: {
            host: "127.0.0.1",
            port,
            profileId: "1".repeat(64),
            serviceInstanceId: health.serviceInstanceId,
          },
          clientToken: CLIENT_TOKEN,
        }),
      });
      const applyRequest = topicApplyRequest("topic-content-transfer");
      applyRequest.assets.push({
        id: "asset/large-padding",
        mediaType: "text/plain",
        text: "p".repeat(900_000),
      });
      const applied =
        await composition.client.workflowApply.applyTopicSynthesisResult(
          applyRequest,
        );
      assert.equal(applied.status, "persisted");

      const artifacts = await composition.client.artifacts.readPaperArtifacts({
        paper_refs: ["1:CONTENT1"],
        artifact_types: ["references"],
      });
      assert.equal(
        (artifacts.artifacts[0].payload as any).value.padding.length,
        900_000,
      );
      assert.notInclude(JSON.stringify(artifacts), "native-transfer:");

      const exported = await composition.client.artifacts.exportFiltered(
        { paper_refs: ["1:CONTENT1"], artifact_types: ["references"] },
        { mode: "remote" },
      );
      assert.deepEqual(exported.delivery, {
        status: "available",
        capability: "paper_artifacts.export_filtered",
        delivery: {
          mode: "bridge-download",
          bundle: {
            fileId: "file-content-1",
            sourceKind: "bridge-export",
            displayName: "paper-artifacts.zip",
            contentType: "application/zip",
            size: 1,
            sha256: `sha256:${"b".repeat(64)}`,
            createdAt: "2026-08-02T00:00:00.000Z",
            expiresAt: "2026-08-02T01:00:00.000Z",
            owner: { capability: "paper_artifacts.export_filtered" },
          },
        },
        diagnostics: [],
      });
      assert.include(hostCalls, "delivery.export.publish_archive");
      assert.notInclude(JSON.stringify(exported), "900000");
      await composition.dispose();
    } finally {
      if (sidecar.child.exitCode === null) {
        await stop(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("executes the closed 96-operation scenario matrix through native composition", async function () {
    this.timeout(120_000);
    const dataset = createSyntheticSynthesisProductionRouteDataset("2k");
    const harness = await startSynthesisProductionRouteHarness({
      id: "scenario-matrix-2k",
      hostFixture: {
        handle({ capability, payload }) {
          if (capability === "library.items.list_page") {
            return dataset.listItemsPage(payload);
          }
          if (capability === "library.items.get_by_ref") {
            const paperRefs = Array.isArray(payload.paperRefs)
              ? payload.paperRefs.filter(
                  (paperRef): paperRef is string =>
                    typeof paperRef === "string",
                )
              : [];
            return { items: [], missingPaperRefs: paperRefs };
          }
          if (capability === "library.artifacts.scan_page") {
            return dataset.scanArtifactsPage(payload);
          }
          if (capability === "library.artifacts.read") {
            return dataset.readArtifact(payload);
          }
          if (capability === "webdav.describe") {
            return { configured: false };
          }
          if (capability.startsWith("effects.")) {
            return { status: "applied" };
          }
          return { status: "unavailable", diagnostics: [] };
        },
      },
    });
    try {
      const observed = await executeSynthesisProductionRouteScenarios(harness);
      assert.lengthOf(observed, 96);
      assert.equal(
        new Set(observed.map(({ operation }) => operation)).size,
        96,
      );
      assert.isTrue(
        harness.recorder.wire.every(
          ({ requestBytes, responseBytes }) =>
            requestBytes > 0 && responseBytes > 0,
        ),
      );
      assert.isAtMost(harness.recorder.maxActiveArtifactReads, 2);
      const queryTerminals = harness
        .observations()
        .filter(
          (event) =>
            event.boundary === "operation" && event.phase === "query-terminal",
        );
      assert.isNotEmpty(queryTerminals);
      assert.isTrue(
        queryTerminals.every(
          (event) =>
            Number.isSafeInteger(event.metrics?.sqlQueryCount) &&
            Number(event.metrics?.sqlQueryCount) >= 0 &&
            Number.isSafeInteger(event.metrics?.sqlWriteCount) &&
            Number(event.metrics?.sqlWriteCount) >= 0,
        ),
      );
    } finally {
      await harness.stop();
    }
  });

  it("persists public Tag vocabulary and staged-suggestion DTOs across reopen", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-rust-tag-dto-"));
    let harness = await startSynthesisProductionRouteHarness({
      id: "tag-dto-initial",
      root,
    });
    try {
      await harness.client.tags.initializeBuiltinTagPolicy();
      const initial = await harness.client.tags.loadTagVocabulary();
      await harness.client.tags.saveTagVocabulary({
        entries: [
          ...((initial.entries as unknown[]) || []),
          {
            tag: "topic:public-dto",
            facet: "topic",
            note: "Saved through the grouped client contract",
            source: "manual",
          },
          {
            tag: "topic:mutation-dto",
            facet: "topic",
            source: "manual",
          },
        ],
        aliases: { "topic:public-alias": "topic:public-dto" },
        abbrev: { pdt: "topic:public-dto" },
        protocol: initial.protocol,
      });
      await harness.client.tags.stageTagSuggestions({
        entries: [
          {
            tag: "method:staged-dto",
            facet: "method",
            note: "Staged through the workflow DTO",
            source_flow: "tag-regulator-suggest",
            parent_bindings: [{ libraryId: 1, itemKey: "TAGDTO1" }],
          },
          {
            tag: "method:discard-dto",
            facet: "method",
            source_flow: "tag-regulator-suggest",
          },
          {
            tag: "method:promote-dto",
            facet: "method",
            source_flow: "tag-regulator-suggest",
          },
        ],
      });
      const updatedStaged = await harness.client.tags.updateStagedTagSuggestion(
        {
          originalTag: "method:staged-dto",
          tag: "method:updated-staged-dto",
          facet: "method",
          note: "Updated through the grouped client contract",
          sourceFlow: "tag-regulator-suggest",
          parentBindings: [{ libraryId: 1, itemKey: "TAGDTO2" }],
        },
      );
      assert.deepInclude(updatedStaged.staged[0], {
        tag: "method:updated-staged-dto",
        parent_bindings: [{ libraryId: 1, itemKey: "TAGDTO2" }],
      });
      assert.deepEqual(
        await harness.client.tags.discardStagedTagSuggestions({
          tags: ["method:discard-dto"],
        }),
        { discarded: ["method:discard-dto"] },
      );
      assert.deepEqual(
        await harness.client.tags.promoteStagedTagSuggestions({
          tags: ["method:promote-dto"],
        }),
        { promoted: ["method:promote-dto"], skipped: [] },
      );
      const updatedEntry = await harness.client.tags.updateTagVocabularyEntry({
        originalTag: "topic:mutation-dto",
        tag: "topic:renamed-dto",
        facet: "topic",
        note: "Renamed through the grouped client contract",
      });
      assert.equal(updatedEntry.mutated, true);
      assert.deepInclude(updatedEntry.updated as Record<string, unknown>, {
        tag: "topic:renamed-dto",
        facet: "topic",
        note: "Renamed through the grouped client contract",
      });
      assert.deepEqual(
        await harness.client.tags.deleteTagVocabularyEntry({
          originalTag: "topic:renamed-dto",
        }),
        { mutated: true, deleted: ["topic:renamed-dto"] },
      );
      const importPayload = JSON.stringify({
        entries: [{ tag: "topic:imported-dto", facet: "topic" }],
      });
      const importPreview =
        await harness.client.tags.previewTagVocabularyImport({
          payload: importPayload,
        });
      assert.include(
        (importPreview.additions as Array<Record<string, unknown>>).map(
          (entry) => entry.tag,
        ),
        "topic:imported-dto",
      );
      await harness.client.tags.applyTagVocabularyImport({
        payload: importPayload,
        action: "merge-non-conflicting",
      });
      assert.deepEqual(
        await harness.client.tags.replaceTagAuditRecords({
          libraryId: 1,
          entries: [
            {
              itemKey: "TAGDTO1",
              compliant: false,
              nonCompliantTags: ["topic:legacy"],
            },
          ],
        }),
        { libraryId: 1, audited: 1 },
      );
      assert.deepEqual(
        await harness.client.tags.replaceTagAuditRecords({
          libraryId: 1,
          entries: [],
        }),
        { libraryId: 1, audited: 0 },
      );

      const saved = await harness.client.tags.loadTagVocabulary();
      assert.deepEqual(saved.aliases, {
        "topic:public-alias": "topic:public-dto",
      });
      assert.deepEqual(saved.abbrev, { pdt: "topic:public-dto" });
      assert.deepInclude(
        (saved.entries as Array<Record<string, unknown>>).find(
          (entry) => entry.tag === "topic:public-dto",
        ),
        {
          tag: "topic:public-dto",
          facet: "topic",
          note: "Saved through the grouped client contract",
          source: "manual",
        },
      );
      assert.deepInclude(
        (await harness.client.tags.listStagedTagSuggestions()).find(
          (entry) => entry.tag === "method:updated-staged-dto",
        ),
        {
          tag: "method:updated-staged-dto",
          facet: "method",
          note: "Updated through the grouped client contract",
          source_flow: "tag-regulator-suggest",
          parent_bindings: [{ libraryId: 1, itemKey: "TAGDTO2" }],
        },
      );
      const workbenchTags = (await harness.call(
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["tags", {}] },
      )) as {
        tags?: {
          staged?: Array<Record<string, unknown>>;
        };
      };
      assert.deepInclude(
        workbenchTags.tags?.staged?.find(
          (entry) => entry.tag === "method:updated-staged-dto",
        ),
        {
          tag: "method:updated-staged-dto",
          facet: "method",
          note: "Updated through the grouped client contract",
          source_flow: "tag-regulator-suggest",
          parent_bindings: [{ libraryId: 1, itemKey: "TAGDTO2" }],
        },
      );

      await harness.stop();
      harness = await startSynthesisProductionRouteHarness({
        id: "tag-dto-reopen",
        root,
      });
      const reopened = await harness.client.tags.loadTagVocabulary();
      assert.include(
        (reopened.entries as Array<Record<string, unknown>>).map(
          (entry) => entry.tag,
        ),
        "topic:public-dto",
      );
      assert.include(
        (reopened.entries as Array<Record<string, unknown>>).map(
          (entry) => entry.tag,
        ),
        "method:promote-dto",
      );
      assert.include(
        (reopened.entries as Array<Record<string, unknown>>).map(
          (entry) => entry.tag,
        ),
        "topic:imported-dto",
      );
      assert.notInclude(
        (reopened.entries as Array<Record<string, unknown>>).map(
          (entry) => entry.tag,
        ),
        "topic:renamed-dto",
      );
      assert.include(
        (await harness.client.tags.listStagedTagSuggestions()).map(
          (entry) => entry.tag,
        ),
        "method:updated-staged-dto",
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("persists Topic delete, rebuild, and purge across production-route reopen", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-topic-lifecycle-"),
    );
    const reverseHostCalls: string[] = [];
    const reverseHost = http.createServer((request, response) => {
      reverseHostCalls.push(String(request.url || ""));
      request.resume();
      request.on("end", () => {
        const body = JSON.stringify({ ok: true, result: {} });
        response.writeHead(200, {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        });
        response.end(body);
      });
    });
    await new Promise<void>((resolve) =>
      reverseHost.listen(0, "127.0.0.1", resolve),
    );
    const address = reverseHost.address();
    if (!address || typeof address === "string") {
      throw new Error("reverse host unavailable");
    }
    const session = path.join(root, "runtime", "sessions", "topic-lifecycle");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-topic-lifecycle",
          reverseHostPort: address.port,
        }),
      ),
    );
    let sidecar = start(configPath);
    try {
      let { port } = await sidecar.listening;
      const topicId = "topic-production-lifecycle";
      const applyRequest = topicApplyRequest(topicId);
      const applied = await call(port, "client.applyTopicSynthesisResult", {
        args: [applyRequest],
      });
      assert.equal(applied.status, 200, JSON.stringify(applied.body));
      assert.equal(applied.body.data.ok, true, JSON.stringify(applied.body));
      assert.deepInclude(applied.body.data, {
        ok: true,
        status: "persisted",
        topicId,
      });

      reverseHostCalls.length = 0;
      const deleted = await call(port, "client.deleteTopicArtifact", {
        args: [{ topicId }],
      });
      assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
      assert.deepInclude(deleted.body.data, {
        ok: true,
        status: "deleted",
        topicId,
      });
      const deletedPathId = String(deleted.body.data.deletedPathId || "");
      assert.isNotEmpty(deletedPathId);

      const deletedProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["topics", { artifacts: {} }] },
      );
      assert.lengthOf(deletedProjection.body.data.artifacts, 0);
      assert.lengthOf(deletedProjection.body.data.deletedArtifacts.rows, 1);
      assert.deepInclude(deletedProjection.body.data.deletedArtifacts.rows[0], {
        topic_id: topicId,
        deleted_path_id: deletedPathId,
      });
      assert.match(
        deletedProjection.body.data.deletedArtifacts.rows[0].deleted_at,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
      );

      const repeatedDelete = await call(port, "client.deleteTopicArtifact", {
        args: [{ topicId }],
      });
      assert.equal(repeatedDelete.status, 200);
      assert.equal(repeatedDelete.body.data.deletedPathId, deletedPathId);
      assert.deepEqual(reverseHostCalls, []);

      await stop(sidecar.child);
      sidecar = start(configPath);
      ({ port } = await sidecar.listening);
      reverseHostCalls.length = 0;
      const reopenedProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["home", { artifacts: {} }] },
      );
      assert.lengthOf(reopenedProjection.body.data.artifacts, 0);
      assert.equal(
        reopenedProjection.body.data.deletedArtifacts.rows[0].deleted_path_id,
        deletedPathId,
      );

      const rebuilt = await call(port, "client.applyTopicSynthesisResult", {
        args: [topicApplyRequest(topicId)],
      });
      assert.equal(rebuilt.status, 200, JSON.stringify(rebuilt.body));
      assert.equal(rebuilt.body.data.status, "persisted");
      const coexistProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["topics", { artifacts: {} }] },
      );
      assert.lengthOf(coexistProjection.body.data.artifacts, 1);
      assert.lengthOf(coexistProjection.body.data.deletedArtifacts.rows, 1);

      const firstPurge = await call(port, "client.purgeDeletedTopicArtifacts", {
        args: [],
      });
      const secondPurge = await call(
        port,
        "client.purgeDeletedTopicArtifacts",
        { args: [] },
      );
      assert.deepInclude(firstPurge.body.data, {
        ok: true,
        status: "purged",
        purged_count: 1,
      });
      assert.deepInclude(secondPurge.body.data, {
        ok: true,
        status: "purged",
        purged_count: 0,
      });
      const activeAfterPurge = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["topics", { artifacts: {} }] },
      );
      assert.lengthOf(activeAfterPurge.body.data.artifacts, 1);
      assert.lengthOf(activeAfterPurge.body.data.deletedArtifacts.rows, 0);
      assert.deepEqual(reverseHostCalls, []);
    } finally {
      if (sidecar.child.exitCode === null) {
        await stop(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("refreshes a non-empty Reference index through the reverse Host", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-reference-route-"),
    );
    const reverseHostCalls: string[] = [];
    let activeArtifactReads = 0;
    let maxActiveArtifactReads = 0;
    const reverseHost = http.createServer((request, response) => {
      let requestBody = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        requestBody += chunk;
      });
      request.on("end", () => {
        const call = JSON.parse(requestBody) as {
          capability: string;
          payload: {
            cursor?: string;
            limit?: number;
            expectedHash?: string;
          };
        };
        reverseHostCalls.push(call.capability);
        if (call.capability === "library.artifacts.read") {
          activeArtifactReads += 1;
          maxActiveArtifactReads = Math.max(
            maxActiveArtifactReads,
            activeArtifactReads,
          );
        }
        const cursor = call.payload.cursor || "";
        const limit = call.payload.limit || 100;
        let result: Record<string, unknown>;
        if (call.capability === "webdav.describe") {
          result = { configured: false };
        } else if (call.capability === "library.items.list_page") {
          result = {
            items: [
              {
                paperRef: "1:HOSTREF1",
                libraryId: 1,
                itemKey: "HOSTREF1",
                itemType: "journalArticle",
                title: "Reverse Host Reference",
                year: "2026",
                metadataHash: "sha256:hostref1",
              },
              {
                paperRef: "1:HOSTREF2",
                libraryId: 1,
                itemKey: "HOSTREF2",
                itemType: "journalArticle",
                title: "Reverse Host Reference Two",
                year: "2026",
                metadataHash: "sha256:hostref2",
              },
              {
                paperRef: "1:HOSTREF3",
                libraryId: 1,
                itemKey: "HOSTREF3",
                itemType: "journalArticle",
                title: "Reverse Host Reference Three",
                year: "2026",
                metadataHash: "sha256:hostref3",
              },
            ],
            cursor,
            nextCursor: "",
            hasMore: false,
            returned: 3,
            limit,
            snapshotRevision: "fixture-revision-1",
          };
        } else if (call.capability === "library.artifacts.scan_page") {
          result = {
            artifacts: [
              {
                paperRef: "1:HOSTREF1",
                artifactType: "digest",
                payloadType: "digest-markdown",
                status: "missing",
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF1",
                artifactType: "references",
                payloadType: "references-json",
                status: "available",
                locator: "fixture:references:HOSTREF1",
                payloadHash: "sha256:references-hostref1",
                estimatedSize: 4_300_000,
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF2",
                artifactType: "digest",
                payloadType: "digest-markdown",
                status: "missing",
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF2",
                artifactType: "references",
                payloadType: "references-json",
                status: "available",
                locator: "fixture:references:HOSTREF2",
                payloadHash: "sha256:references-hostref2",
                estimatedSize: 4_300_000,
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF2",
                artifactType: "citation_analysis",
                payloadType: "citation-analysis-json",
                status: "missing",
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF1",
                artifactType: "citation_analysis",
                payloadType: "citation-analysis-json",
                status: "missing",
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF3",
                artifactType: "digest",
                payloadType: "digest-markdown",
                status: "missing",
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF3",
                artifactType: "references",
                payloadType: "references-json",
                status: "available",
                locator: "fixture:references:HOSTREF3",
                payloadHash: "sha256:references-hostref3",
                estimatedSize: 128,
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF3",
                artifactType: "citation_analysis",
                payloadType: "citation-analysis-json",
                status: "missing",
                diagnostics: [],
              },
            ],
            cursor,
            nextCursor: "",
            hasMore: false,
            returned: 3,
            limit,
            snapshotRevision: "fixture-revision-1",
          };
        } else if (call.capability === "library.artifacts.read") {
          const smallReference = String(call.payload.expectedHash).includes(
            "hostref3",
          );
          result = {
            status: "available",
            payloadHash: call.payload.expectedHash,
            content: {
              kind: "json",
              value: {
                padding: smallReference
                  ? ""
                  : `共享引用 ${"文献".repeat(400_000)}`,
                references: [
                  {
                    title: smallReference
                      ? "Small expanded reference"
                      : "Shared expanded reference",
                    year: "   ",
                    authors: ["研究者"],
                  },
                ],
              },
            },
            diagnostics: [],
          };
        } else {
          result = {};
        }
        const body = JSON.stringify({ ok: true, result });
        const send = () => {
          response.writeHead(200, {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(body),
          });
          response.end(body);
          if (call.capability === "library.artifacts.read") {
            activeArtifactReads -= 1;
          }
        };
        if (call.capability === "library.artifacts.scan_page") {
          setTimeout(send, 2_100);
        } else if (call.capability === "library.artifacts.read") {
          const delay = String(call.payload.expectedHash).includes("hostref1")
            ? 25
            : 5;
          setTimeout(send, delay);
          return;
        } else {
          send();
        }
      });
    });
    await new Promise<void>((resolve) =>
      reverseHost.listen(0, "127.0.0.1", resolve),
    );
    const address = reverseHost.address();
    if (!address || typeof address === "string") {
      throw new Error("reverse host unavailable");
    }
    const session = path.join(root, "runtime", "sessions", "reference");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-reference",
          reverseHostPort: address.port,
        }),
      ),
    );
    const sidecar = start(configPath);
    try {
      const { port } = await sidecar.listening;
      const initialIndexSurface = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            {
              registry: {
                scope: "library",
                expandedSourceRefs: [],
              },
            },
          ],
        },
      );
      assert.equal(initialIndexSurface.status, 200);
      assert.equal(
        initialIndexSurface.body.data.registry.cacheStatus.status,
        "missing",
      );
      assert.lengthOf(initialIndexSurface.body.data.registry.rows, 3);
      assert.equal(
        initialIndexSurface.body.data.registry.rows[0].artifactCoverage,
        "missing",
      );
      reverseHostCalls.length = 0;
      activeArtifactReads = 0;
      maxActiveArtifactReads = 0;

      const refreshTrace = {
        schema: "synthesis-sidecar-observation.v2",
        traceId: "a".repeat(32),
        spanId: "b".repeat(16),
        attempt: 0,
      } as const;
      const layoutTrace = {
        schema: "synthesis-sidecar-observation.v2",
        traceId: "d".repeat(32),
        spanId: "e".repeat(16),
        attempt: 0,
      } as const;
      const receiptStartedAt = Date.now();
      const canceledRefresh = await call(
        port,
        "client.refreshReferenceSidecarNow",
        { args: [] },
        refreshTrace,
      );
      assert.equal(
        canceledRefresh.status,
        200,
        JSON.stringify(canceledRefresh.body),
      );
      assert.isBelow(
        Date.now() - receiptStartedAt,
        1_000,
        "the control RPC must return before the delayed Host artifact page",
      );
      const cancel = await call(
        port,
        "client.controlPublicMaintenanceOperation",
        {
          args: [
            {
              action: "cancel",
              operation_id: canceledRefresh.body.data.operation_id,
            },
          ],
        },
      );
      assert.equal(cancel.status, 200, JSON.stringify(cancel.body));
      assert.equal(
        cancel.body.data.operation_id,
        canceledRefresh.body.data.operation_id,
      );
      const canceled = await waitForMaintenanceOperation(
        port,
        canceledRefresh.body.data.operation_id,
      );
      assert.equal(canceled.status, "canceled", JSON.stringify(canceled));
      assert.equal(canceled.receipt?.retryable, true, JSON.stringify(canceled));

      const canceledIndexSurface = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            {
              registry: {
                scope: "library",
                expandedSourceRefs: [],
              },
            },
          ],
        },
      );
      assert.equal(canceledIndexSurface.status, 200);
      assert.equal(
        canceledIndexSurface.body.data.registry.cacheStatus.status,
        "missing",
        "cancel before promotion must preserve the prior usable projection",
      );

      reverseHostCalls.length = 0;
      activeArtifactReads = 0;
      maxActiveArtifactReads = 0;
      const retryRequest = {
        args: [
          {
            action: "retry",
            operation_id: canceledRefresh.body.data.operation_id,
            retry_key: "reference-route-retry-v1",
          },
        ],
      };
      const refresh = await call(
        port,
        "client.controlPublicMaintenanceOperation",
        retryRequest,
      );
      assert.equal(refresh.status, 200, JSON.stringify(refresh.body));
      assert.notEqual(
        refresh.body.data.operation_id,
        canceledRefresh.body.data.operation_id,
      );
      const replayedRetry = await call(
        port,
        "client.controlPublicMaintenanceOperation",
        retryRequest,
      );
      assert.equal(
        replayedRetry.body.data.operation_id,
        refresh.body.data.operation_id,
        "retry-key replay must resolve to the same successor operation",
      );
      const refreshCompleted = await waitForMaintenanceOperation(
        port,
        refresh.body.data.operation_id,
      );
      assert.equal(refreshCompleted.status, "completed");
      assert.equal(refreshCompleted.receipt.ok, true);
      assert.equal(
        reverseHostCalls.filter(
          (capability) => capability === "library.items.list_page",
        ).length,
        1,
        "one refresh must capture the Host item snapshot once",
      );
      assert.equal(
        reverseHostCalls.filter(
          (capability) => capability === "library.artifacts.scan_page",
        ).length,
        1,
        "one refresh must capture the Host artifact snapshot once",
      );
      assert.equal(
        maxActiveArtifactReads,
        2,
        "artifact reads must exercise and keep the approved two-call concurrency bound",
      );

      const matching = await call(
        port,
        "client.runAdvancedReferenceMatchingNow",
        { args: [] },
        {
          ...refreshTrace,
          spanId: "c".repeat(16),
          parentSpanId: refreshTrace.spanId,
        },
      );
      assert.equal(matching.status, 200, JSON.stringify(matching.body));
      const matchingCompleted = await waitForMaintenanceOperation(
        port,
        matching.body.data.operation_id,
      );
      assert.equal(
        matchingCompleted.receipt.ok,
        true,
        JSON.stringify(matchingCompleted),
      );
      assert.equal(
        matchingCompleted.receipt.status,
        "promoted",
        JSON.stringify(matchingCompleted),
      );

      const chrome = await call(
        port,
        "client.getSynthesisWorkbenchChromeInput",
        {
          args: [{ registry: { scope: "library" } }],
        },
      );
      assert.equal(chrome.status, 200);
      assert.equal(chrome.body.data.maintenance.summary.status, "partial");
      assert.isArray(chrome.body.data.maintenance.backgroundJobs);
      assert.notProperty(chrome.body.data.maintenance, "cacheReadiness");

      const workbenchIndex = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            {
              registry: {
                scope: "library",
                expandedSourceRefs: ["1:HOSTREF3"],
              },
            },
          ],
        },
      );
      assert.equal(workbenchIndex.status, 200);
      assert.equal(
        workbenchIndex.body.data.registry.cacheStatus.status,
        "ready",
      );
      assert.lengthOf(workbenchIndex.body.data.registry.rows, 3);
      assert.deepInclude(workbenchIndex.body.data.registry.rows[0], {
        libraryId: 1,
        itemKey: "HOSTREF1",
        paper_ref: "1:HOSTREF1",
        artifactCoverage: "partial",
        reference_count: 1,
        unbound_reference_count: 1,
      });
      assert.deepEqual(
        workbenchIndex.body.data.registry.rows[0].missing_artifacts,
        ["digest", "citation_analysis"],
      );
      assert.deepEqual(
        workbenchIndex.body.data.registry.rows[0].references,
        [],
      );
      assert.lengthOf(workbenchIndex.body.data.registry.rows[2].references, 1);
      assert.equal(
        workbenchIndex.body.data.registry.rows[2].references[0].title,
        "Small expanded reference",
      );

      const repeatedWorkbenchIndex = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            {
              registry: {
                scope: "library",
                expandedSourceRefs: [],
              },
            },
          ],
        },
      );
      assert.equal(repeatedWorkbenchIndex.status, 200);
      assert.equal(
        repeatedWorkbenchIndex.body.data.registry.cacheStatus.status,
        "ready",
      );
      assert.deepEqual(
        repeatedWorkbenchIndex.body.data.registry.rows.map(
          (row: Record<string, unknown>) => row.paper_ref,
        ),
        ["1:HOSTREF1", "1:HOSTREF2", "1:HOSTREF3"],
      );

      const index = await call(port, "client.getReferenceSidecarIndex", {
        args: [{ includeReferences: false }],
      });
      assert.equal(index.status, 200);
      assert.equal(index.body.data.total, 3);
      assert.equal(index.body.data.returned, 3);
      assert.equal(index.body.data.rows[0].paper_ref, "1:HOSTREF1");
      assert.equal(index.body.data.rows[1].paper_ref, "1:HOSTREF2");
      assert.equal(index.body.data.rows[2].paper_ref, "1:HOSTREF3");

      const rebuildGraph = await call(
        port,
        "client.rebuildCitationGraphCacheNow",
        { args: [] },
      );
      assert.equal(rebuildGraph.status, 200, JSON.stringify(rebuildGraph.body));
      const rebuildGraphCompleted = await waitForMaintenanceOperation(
        port,
        rebuildGraph.body.data.operation_id,
      );
      assert.equal(rebuildGraphCompleted.status, "completed");

      const graphSurface = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: ["graph", { graph: { layoutAlgorithm: "force" } }],
        },
      );
      assert.equal(graphSurface.status, 200, JSON.stringify(graphSurface.body));
      assert.isNotEmpty(
        graphSurface.body.data.graph.graph_hash,
        JSON.stringify({
          rebuildGraph: rebuildGraph.body,
          graphSurface: graphSurface.body,
        }),
      );
      assert.isAbove(graphSurface.body.data.graph.nodes.length, 0);
      assert.isAbove(graphSurface.body.data.graph.edges.length, 0);
      assert.notProperty(
        graphSurface.body.data.graph.nodes[0],
        "literatureItemId",
      );
      assert.notProperty(
        graphSurface.body.data.graph.edges[0],
        "sourceLiteratureItemId",
      );
      const uiSnapshot = buildSynthesisUiSnapshot(graphSurface.body.data);
      assert.isAbove(uiSnapshot.graph.visibleNodes.length, 0);
      assert.isAbove(uiSnapshot.graph.visibleEdges.length, 0);

      const recomputeLayout = await call(
        port,
        "client.recomputeCitationGraphLayout",
        { args: [{ algorithm: "force", force: true }] },
        layoutTrace,
      );
      assert.equal(
        recomputeLayout.status,
        200,
        JSON.stringify(recomputeLayout.body),
      );
      assert.equal(
        (
          await waitForMaintenanceOperation(
            port,
            recomputeLayout.body.data.operation_id,
          )
        ).receipt.status,
        "promoted",
        JSON.stringify(recomputeLayout.body),
      );
      const laidOutGraph = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["graph", { graph: { layoutAlgorithm: "force" } }] },
      );
      assert.equal(
        laidOutGraph.body.data.graph.layoutStatus,
        "ready",
        JSON.stringify({
          recomputeLayout: recomputeLayout.body,
          laidOutGraph: laidOutGraph.body,
        }),
      );
      assert.isTrue(
        laidOutGraph.body.data.graph.nodes.every(
          (node: Record<string, unknown>) =>
            Number.isFinite(node.x) && Number.isFinite(node.y),
        ),
      );

      const overview = await call(port, "client.queryCitationGraph", {
        args: [{}],
      });
      assert.equal(overview.status, 200, JSON.stringify(overview.body));
      assert.equal(
        overview.body.data.graph_hash,
        graphSurface.body.data.graph.graph_hash,
      );
      assert.notProperty(overview.body.data.nodes[0], "literatureItemId");

      const persistedLayout = await call(
        port,
        "client.getCitationGraphLayout",
        { args: [{ scope: "full", algorithm: "force" }] },
      );
      assert.equal(
        persistedLayout.status,
        200,
        JSON.stringify(persistedLayout.body),
      );
      assert.equal(persistedLayout.body.data.status, "ready");
      assert.notProperty(persistedLayout.body.data, "layoutJson");
      const explicitNodeIds = overview.body.data.nodes
        .slice(0, 2)
        .map((node: Record<string, unknown>) => node.node_id);
      const explicitLayout = await call(port, "client.getCitationGraphLayout", {
        args: [{ nodeIds: explicitNodeIds, algorithm: "force" }],
      });
      assert.equal(
        explicitLayout.body.data.status,
        "ready",
        JSON.stringify(explicitLayout.body),
      );
      assert.equal(explicitLayout.body.data.scope, "explicit");
      assert.deepEqual(
        explicitLayout.body.data.nodes
          .map((node: Record<string, unknown>) => node.node_id)
          .sort(),
        [...explicitNodeIds].sort(),
      );
      const oversizedLayout = await call(
        port,
        "client.getCitationGraphLayout",
        { args: [{ scope: "full", algorithm: "force", maxNodes: 1 }] },
      );
      assert.equal(oversizedLayout.body.data.status, "too_large");
      assert.equal(oversizedLayout.body.data.layout_status, "ready");
      assert.equal(oversizedLayout.body.data.diagnostics.layout_found, true);
      assert.deepEqual(oversizedLayout.body.data.nodes, []);
      const truncatedLayout = await call(
        port,
        "client.getCitationGraphLayout",
        {
          args: [
            {
              scope: "full",
              algorithm: "force",
              maxNodes: 1,
              allowTruncated: true,
            },
          ],
        },
      );
      assert.equal(truncatedLayout.body.data.status, "ready");
      assert.equal(truncatedLayout.body.data.diagnostics.truncated, true);
      assert.isAtMost(truncatedLayout.body.data.nodes.length, 1);

      const cluster = await call(port, "client.queryCitationGraphCluster", {
        args: [{}],
      });
      assert.equal(cluster.status, 200, JSON.stringify(cluster.body));
      assert.equal(cluster.body.data.graph_hash, overview.body.data.graph_hash);

      const slice = await call(port, "client.getCitationGraphSlice", {
        args: [
          {
            startNodeId: overview.body.data.nodes[0].node_id,
            direction: "both",
            depth: 1,
            maxNodes: 25,
            maxEdges: 50,
          },
        ],
      });
      assert.equal(slice.status, 200, JSON.stringify(slice.body));
      assert.equal(slice.body.data.ok, true);
      assert.notProperty(slice.body.data.nodes[0], "literatureItemId");

      const refreshMetrics = await call(
        port,
        "client.refreshCitationGraphMetricsNow",
        { args: [{}] },
      );
      assert.equal(
        refreshMetrics.status,
        200,
        JSON.stringify(refreshMetrics.body),
      );
      assert.equal(
        (
          await waitForMaintenanceOperation(
            port,
            refreshMetrics.body.data.operation_id,
          )
        ).receipt.status,
        "promoted",
        JSON.stringify(refreshMetrics.body),
      );
      const metrics = await call(port, "client.getCitationGraphMetrics", {
        args: [{ limit: 10, sortBy: "foundation" }],
      });
      const ranking = await call(port, "client.rankLibraryPapers", {
        args: [{ limit: 10, sortBy: "frontier" }],
      });
      assert.equal(
        metrics.body.data.status,
        "ready",
        JSON.stringify(metrics.body),
      );
      assert.equal(
        ranking.body.data.status,
        "ready",
        JSON.stringify(ranking.body),
      );
      assert.notProperty(metrics.body.data.items[0], "literatureItemId");
      const metricsPage = await call(port, "client.getCitationGraphMetrics", {
        args: [{ limit: 1, sortBy: "pagerank" }],
      });
      assert.equal(metricsPage.body.data.returned, 1);
      assert.equal(metricsPage.body.data.hasMore, true);
      assert.isAbove(metricsPage.body.data.total, 1);
      const metricsByPaper = await call(
        port,
        "client.getCitationGraphMetrics",
        { args: [{ paperRefs: [metricsPage.body.data.items[0].paper_ref] }] },
      );
      assert.equal(metricsByPaper.body.data.total, 1);
      assert.equal(
        metricsByPaper.body.data.items[0].paper_ref,
        metricsPage.body.data.items[0].paper_ref,
      );
      const refreshTraceEvents = sidecar
        .stderr()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          try {
            return rebuildSynthesisSidecarObservationEvent(JSON.parse(line));
          } catch {
            return undefined;
          }
        })
        .filter((event) => event?.traceId === refreshTrace.traceId);
      assert.includeMembers(
        [...new Set(refreshTraceEvents.map((event) => event!.boundary))],
        ["host-rpc", "reverse-host", "operation"],
      );
      const workerCapabilities = refreshTraceEvents
        .filter((event) => event?.boundary === "child-worker")
        .map((event) => event?.identities?.capability)
        .filter((value): value is string => typeof value === "string");
      assert.include(
        refreshTraceEvents.map((event) => event?.boundary),
        "child-worker",
      );
      assert.include(workerCapabilities, "reference_binding.v1");
      assert.include(workerCapabilities, "reference_canonical_dedupe.v1");
      assert.isTrue(
        refreshTraceEvents.some(
          (event) =>
            event?.parentSpanId === refreshTrace.spanId &&
            event.outcome === "succeeded",
        ),
      );
      for (const [traceId, operationId, capability] of [
        [
          refreshTrace.traceId,
          matching.body.data.operation_id,
          "client.runAdvancedReferenceMatchingNow",
        ],
        [
          layoutTrace.traceId,
          recomputeLayout.body.data.operation_id,
          "client.recomputeCitationGraphLayout",
        ],
      ] as const) {
        const lifecycle = sidecar
          .stderr()
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            try {
              return rebuildSynthesisSidecarObservationEvent(JSON.parse(line));
            } catch {
              return undefined;
            }
          })
          .filter(
            (event) =>
              event?.traceId === traceId &&
              event.identities?.operation === operationId,
          );
        assert.includeMembers(
          lifecycle.map((event) => event!.phase),
          [
            "maintenance-started",
            "maintenance-running",
            "maintenance-terminal",
          ],
          capability,
        );
        const terminal = lifecycle.find(
          (event) => event?.phase === "maintenance-terminal",
        );
        assert.equal(terminal?.outcome, "succeeded", capability);
        assert.equal(terminal?.identities?.capability, capability);
      }
      assert.notInclude(sidecar.stderr(), "共享引用");
      assert.notInclude(sidecar.stderr(), "fixture:references:");
      assert.notInclude(sidecar.stderr(), CLIENT_TOKEN);

      await stop(sidecar.child);
      const restarted = start(configPath);
      try {
        const restartedListening = await restarted.listening;
        const reopenedGraph = await call(
          restartedListening.port,
          "client.getSynthesisWorkbenchSurfaceInput",
          { args: ["graph", { graph: { layoutAlgorithm: "force" } }] },
        );
        assert.equal(
          reopenedGraph.status,
          200,
          JSON.stringify(reopenedGraph.body),
        );
        assert.equal(
          reopenedGraph.body.data.graph.graph_hash,
          overview.body.data.graph_hash,
        );
        assert.equal(reopenedGraph.body.data.graph.layoutStatus, "ready");
      } finally {
        if (restarted.child.exitCode === null) {
          await stop(restarted.child);
        }
      }
    } finally {
      if (sidecar.child.exitCode === null) {
        await stop(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
    }
  });

  it("admits and materializes a production literature apply with a large string", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-digest-route-"),
    );
    const reverseHost = http.createServer((request, response) => {
      request.resume();
      request.on("end", () => {
        const body = JSON.stringify({
          ok: true,
          result: { configured: false },
        });
        response.writeHead(200, {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        });
        response.end(body);
      });
    });
    await new Promise<void>((resolve) =>
      reverseHost.listen(0, "127.0.0.1", resolve),
    );
    const address = reverseHost.address();
    if (!address || typeof address === "string") {
      throw new Error("reverse host unavailable");
    }
    const session = path.join(root, "runtime", "sessions", "digest");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-digest",
          reverseHostPort: address.port,
        }),
      ),
    );
    const request = {
      libraryId: 1,
      itemKey: "DIGEST01",
      paperRef: "1:DIGEST01",
      itemType: "journalArticle",
      title: "Large digest apply",
      year: "2026",
      date: "2026-08-01",
      creators: ["Researcher"],
      tags: [],
      collections: [],
      doi: "",
      arxiv: "",
      isbn: "",
      url: "",
      citekey: "digest2026",
      dateAdded: "2026-08-01",
      digest: {
        payloadHash: "sha256:digest-large",
        content: `# Digest\n${"x".repeat(128 * 1024)}`,
      },
      references: {
        payloadHash: "sha256:references-large",
        references: [{ title: "Target", year: "2025", citekey: "target2025" }],
      },
      citationAnalysis: {
        payloadHash: "sha256:citation-large",
        citations: [{ reference_index: 0, role: "background" }],
      },
      literatureMatchingMetadata: { key_terms: ["Large request"] },
      matchedReferences: [
        {
          libraryId: 1,
          itemKey: "TARGET01",
          paperRef: "1:TARGET01",
          title: "Target",
          year: "2025",
          citekey: "target2025",
        },
      ],
    };
    let sidecar = start(configPath);
    try {
      let listening = await sidecar.listening;
      const first = await call(
        listening.port,
        "client.applyLiteratureDigestSidecar",
        { args: [request] },
      );
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.deepInclude(first.body.data, {
        ok: true,
        status: "sidecar_applied",
        sourceRef: "1:DIGEST01",
        source_ref: "1:DIGEST01",
        paperRef: "1:DIGEST01",
        reference_count: 1,
        matched_count: 1,
        idempotent: false,
      });
      const oversizedRequest = structuredClone(request);
      oversizedRequest.digest.content = "x".repeat(1024 * 1024);
      const oversized = await call(
        listening.port,
        "client.applyLiteratureDigestSidecar",
        { args: [oversizedRequest] },
      );
      assert.equal(oversized.status, 413, JSON.stringify(oversized.body));
      assert.equal(oversized.body.error?.code, "request_body_too_large");
      await stop(sidecar.child);

      sidecar = start(configPath);
      listening = await sidecar.listening;
      const repeated = await call(
        listening.port,
        "client.applyLiteratureDigestSidecar",
        { args: [request] },
      );
      assert.equal(repeated.status, 200, JSON.stringify(repeated.body));
      assert.equal(repeated.body.data.status, "sidecar_applied");
      assert.equal(repeated.body.data.idempotent, true);
    } finally {
      if (sidecar.child.exitCode === null) await stop(sidecar.child);
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps an empty refreshed Reference index ready", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-empty-reference-route-"),
    );
    const reverseHost = http.createServer((request, response) => {
      let requestBody = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        requestBody += chunk;
      });
      request.on("end", () => {
        const call = JSON.parse(requestBody) as {
          capability: string;
          payload: { cursor?: string; limit?: number };
        };
        const cursor = call.payload.cursor || "";
        const limit = call.payload.limit || 100;
        const result =
          call.capability === "webdav.describe"
            ? { configured: false }
            : call.capability === "library.items.list_page"
              ? {
                  items: [],
                  cursor,
                  nextCursor: "",
                  hasMore: false,
                  returned: 0,
                  limit,
                  snapshotRevision: "fixture-revision-empty",
                }
              : call.capability === "library.artifacts.scan_page"
                ? {
                    artifacts: [],
                    cursor,
                    nextCursor: "",
                    hasMore: false,
                    returned: 0,
                    limit,
                    snapshotRevision: "fixture-revision-empty",
                  }
                : {};
        const body = JSON.stringify({ ok: true, result });
        response.writeHead(200, {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        });
        response.end(body);
      });
    });
    await new Promise<void>((resolve) =>
      reverseHost.listen(0, "127.0.0.1", resolve),
    );
    const address = reverseHost.address();
    if (!address || typeof address === "string") {
      throw new Error("reverse host unavailable");
    }
    const session = path.join(root, "runtime", "sessions", "reference-empty");
    fs.mkdirSync(session, { recursive: true });
    const configPath = path.join(session, "config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        config({
          root,
          session,
          supervisorInstanceId: "supervisor-reference-empty",
          reverseHostPort: address.port,
        }),
      ),
    );
    const sidecar = start(configPath);
    try {
      const { port } = await sidecar.listening;
      const refresh = await call(port, "client.refreshReferenceSidecarNow", {
        args: [],
      });
      assert.equal(refresh.status, 200, JSON.stringify(refresh.body));
      assert.equal(
        refresh.body.data.schema,
        "synthesis.maintenance_operation.v1",
      );
      assert.include(["pending", "running"], refresh.body.data.status);
      assert.equal(
        refresh.body.data.operation_type,
        "client.refreshReferenceSidecarNow",
      );
      const completed = await waitForMaintenanceOperation(
        port,
        refresh.body.data.operation_id,
      );
      assert.equal(completed.status, "completed");
      assert.equal(completed.receipt.ok, true);

      const missing = await call(port, "client.getPublicMaintenanceOperation", {
        args: [{ operation_id: "maintenance:missing" }],
      });
      assert.equal(missing.status, 200, JSON.stringify(missing.body));
      assert.deepEqual(missing.body.data, {
        schema: "synthesis.maintenance_operation.v1",
        operation_id: "maintenance:missing",
        status: "not_found",
      });
      const missingControl = await call(
        port,
        "client.controlPublicMaintenanceOperation",
        {
          args: [
            {
              action: "cancel",
              operation_id: "maintenance:missing",
            },
          ],
        },
      );
      assert.equal(
        missingControl.status,
        200,
        JSON.stringify(missingControl.body),
      );
      assert.deepEqual(missingControl.body.data, missing.body.data);
      const internal = await call(
        port,
        "client.getPublicMaintenanceOperation",
        { args: [{ operation_id: "reference-job:refresh" }] },
      );
      assert.equal(internal.status, 200, JSON.stringify(internal.body));
      assert.equal(internal.body.data.status, "not_found");

      const index = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            { registry: { scope: "library", expandedSourceRefs: [] } },
          ],
        },
      );
      assert.equal(index.status, 200);
      assert.equal(index.body.data.registry.cacheStatus.status, "ready");
      assert.deepEqual(index.body.data.registry.rows, []);
    } finally {
      if (sidecar.child.exitCode === null) {
        await stop(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
    }
  });

  it("initializes once, holds the production lock, and ignores legacy lifecycle files", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-rust-route-"));
    const legacyFiles = [
      path.join(root, "state", "synthesis-runtime-admission.json"),
      path.join(root, "state", "synthesis-cutover", "receipt.json"),
      path.join(root, "runtime", "synthesis", "service-runtime", "active.json"),
    ];
    for (const file of legacyFiles) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, `legacy:${path.basename(file)}\n`);
    }
    const legacyBefore = legacyFiles.map((file) => fs.readFileSync(file));

    const reverseHost = http.createServer((request, response) => {
      request.resume();
      request.on("end", () => {
        const body = JSON.stringify({
          ok: true,
          result: { configured: false },
        });
        response.writeHead(200, {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        });
        response.end(body);
      });
    });
    await new Promise<void>((resolve) =>
      reverseHost.listen(0, "127.0.0.1", resolve),
    );
    const address = reverseHost.address();
    if (!address || typeof address === "string") {
      throw new Error("reverse host unavailable");
    }

    const firstSession = path.join(root, "runtime", "sessions", "first");
    fs.mkdirSync(firstSession, { recursive: true });
    const firstConfigPath = path.join(firstSession, "config.json");
    fs.writeFileSync(
      firstConfigPath,
      JSON.stringify(
        config({
          root,
          session: firstSession,
          supervisorInstanceId: "supervisor-first",
          reverseHostPort: address.port,
        }),
      ),
    );
    const first = start(firstConfigPath);
    const { port } = await first.listening;
    let firstStopped = false;
    try {
      const topics = await call(port, "client.listTopics", { args: [{}] });
      assert.equal(topics.status, 200);
      assert.deepEqual(topics.body.data.topics, []);

      const secondSession = path.join(root, "runtime", "sessions", "second");
      fs.mkdirSync(secondSession, { recursive: true });
      const secondConfigPath = path.join(secondSession, "config.json");
      fs.writeFileSync(
        secondConfigPath,
        JSON.stringify(
          config({
            root,
            session: secondSession,
            supervisorInstanceId: "supervisor-second",
            reverseHostPort: address.port,
          }),
        ),
      );
      const second = start(secondConfigPath);
      let conflict = "";
      try {
        await second.listening;
      } catch (error) {
        conflict = String(error);
      }
      assert.include(conflict, "production_lock_conflict");

      await stop(first.child);
      firstStopped = true;
      const restartSession = path.join(root, "runtime", "sessions", "restart");
      fs.mkdirSync(restartSession, { recursive: true });
      const restartConfigPath = path.join(restartSession, "config.json");
      fs.writeFileSync(
        restartConfigPath,
        JSON.stringify(
          config({
            root,
            session: restartSession,
            supervisorInstanceId: "supervisor-restart",
            reverseHostPort: address.port,
          }),
        ),
      );
      const restarted = start(restartConfigPath);
      try {
        const restartListening = await restarted.listening;
        const restartedTopics = await call(
          restartListening.port,
          "client.listTopics",
          { args: [{}] },
        );
        assert.equal(restartedTopics.status, 200);
        assert.deepEqual(restartedTopics.body.data.topics, []);
      } finally {
        await stop(restarted.child);
      }
    } finally {
      if (!firstStopped && first.child.exitCode === null) {
        await stop(first.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
    }

    assert.isTrue(fs.existsSync(path.join(root, "state", "synthesis.db")));
    assert.isTrue(fs.existsSync(path.join(root, "data", "synthesis")));
    legacyFiles.forEach((file, index) => {
      assert.deepEqual(fs.readFileSync(file), legacyBefore[index]);
    });
  });
});
