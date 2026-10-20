import { SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION } from "../helpers/synthesisProductionRouteHarness";
import { assert } from "chai";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  SYNTHESIS_REVERSE_HOST_LIMITS,
  SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES,
  SynthesisClientError,
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisSidecarObservationEvent,
  toSynthesisJsonObject,
  type SynthesisCitationGraphLayoutReadResult,
  type SynthesisCitationGraphSliceResult,
} from "../../packages/synthesis-contracts/src";
import { inspectSynthesisTopicWorkbenchSurfaceParity } from "../../scripts/synthesis/check-synthesis-topic-workbench-surface-parity";
import { checkSynthesisCrossLanguageContracts } from "../../scripts/synthesis/check-synthesis-cross-language-contracts";
import {
  appendSynthesisProtocolExecutionEvidence,
  appendSynthesisProtocolObservation,
  readSynthesisProtocolExecutionEvidence,
  readSynthesisProtocolObservations,
  synthesisProtocolExecutionIdentity,
} from "../../scripts/synthesis/synthesisProtocolExecutionEvidence";
import type { StructureCoverageInput } from "../../scripts/synthesis/synthesisProtocolStructureCoverage";
import {
  recordSynthesisReverseHostRequestEvidence,
  recordSynthesisReverseHostResultAcceptance,
  recordSynthesisReverseHostResultRejection,
  recordSynthesisReverseHostErrorEvidence,
} from "../helpers/synthesisReverseHostProtocolEvidence";
import protocolRegistry from "../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json" with { type: "json" };
import productionOperations from "../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json" with { type: "json" };
import reverseHostSchema from "../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/reverse-host.schema.json" with { type: "json" };
import { synthesisProductionOperationPolicy } from "../../src/modules/synthesis/production/synthesisProductionRpcPolicy";
import {
  buildSynthesisCitationGraphBuildTransferManifest,
  buildSynthesisCitationGraphBuildTransferPage,
} from "../../packages/synthesis-engine/src/citationGraphBuildTransfer";
import {
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
} from "../../src/modules/synthesis/uiModel";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";
import {
  toSynthesisUiSnapshotInput,
  toSynthesisWorkbenchReadState,
} from "../../src/modules/synthesisClient/workbenchUiAdapter";
import {
  SynthesisSidecarRpcError,
  createSynthesisSidecarRpcClient,
} from "../../src/modules/synthesis/sidecar/synthesisSidecarRpcClient";
import { consumeSynthesisSidecarOutputJson } from "../../src/modules/synthesis/sidecar/synthesisSidecarTransferClient";
import {
  createSynthesisHostExportDeliveryPort,
  createSynthesisHostRunWorkspaceMaterializationPort,
} from "../../src/modules/synthesis/exportDeliveryAdapter";
import { createSyntheticSynthesisProductionRouteDataset } from "../fixtures/synthesisSyntheticDatasets";
import { buildTestSynthesisHostItemSummary } from "../helpers/synthesisHostReadPort";
import {
  SYNTHESIS_PRODUCTION_ROUTE_CLIENT_TOKEN as CLIENT_TOKEN,
  buildTestSynthesisLibrarySnapshotPage,
  SYNTHESIS_PRODUCTION_ROUTE_EXECUTABLE as EXECUTABLE,
  callSynthesisProductionRoute as call,
  captureSynthesisProductionRouteDurableState as captureDurableState,
  startSynthesisProductionRouteHarness,
  startSynthesisProductionRouteSidecar as start,
  stopSynthesisProductionRouteSidecar as stop,
  synthesisProductionRouteConfig as config,
  waitForSynthesisProductionRouteEvidence,
  waitForSynthesisProductionRouteReceipt,
} from "../helpers/synthesisProductionRouteHarness";
import {
  buildSynthesisProductionRouteCorpusCases,
  createSynthesisProductionRouteSampleCollector,
  executeSynthesisProductionRouteScenarios,
  inspectSynthesisProductionRouteCorpusCoverage,
} from "../helpers/synthesisProductionRouteScenarios";
import { createWorkflowHostApi } from "../../src/workflows/hostApi";
import { createWorkflowSynthesisHostApi } from "../../src/modules/synthesisClient/workflowHostClient";
import { executeHostBridgeCapability } from "../../src/modules/hostBridgeCapabilityRegistry";
import { handleZoteroMcpJsonRpc } from "../../src/modules/hostBridge/mcp/zoteroMcpProtocol";
import { matchHostBridgeCapabilityRoute } from "../../src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes";
import { prepareRuntimeHttpResponse } from "../../src/modules/hostBridge/server/runtimeHttpResponse";
import {
  resolveCurrentHostBridgeCli,
  withHostBridgeCliHarness,
} from "../helpers/hostBridgeCliHarness";
import type {
  SynthesisTopicSearchRequest,
  SynthesisTopicSearchResult,
} from "../../packages/synthesis-contracts/src/search";

const ROOT = path.resolve(import.meta.dirname, "../..");

function workbenchState(overrides: Record<string, any> = {}) {
  const state = toSynthesisWorkbenchReadState(createDefaultSynthesisUiState());
  return {
    ...state,
    ...overrides,
    registry: { ...state.registry, ...overrides.registry },
    reviews: { ...state.reviews, ...overrides.reviews },
    reader: { ...state.reader, ...overrides.reader },
    graph: { ...state.graph, ...overrides.graph },
  };
}
const BASELINE_PRODUCTION_OBSERVABLES = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "tests/fixtures/synthesis-sidecar-migration/main-e210997a-production-observables.v1.json",
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
  "client.searchTopics",
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
  "client.getTopicPlanningContext",
  "client.applyTopicPlan",
  "client.purgeDeletedTopicArtifacts",
  "client.readTopicDetail",
  "client.rejectTopicDiscoveryHint",
  "client.resolveResolver",
  "client.resolveTopicPaperDigest",
  "client.restoreTopicDiscoveryHint",
] as const;

type CanonicalReferenceFixture = {
  sourceReferenceId: string;
  title: string;
  year: number | null;
  authors?: string[];
  raw?: string;
  matching?: {
    DOI?: string;
    url?: string;
    ISBN?: string;
    ISSN?: string;
    citekey?: string;
  };
};

function canonicalReferenceArtifact(
  entries: readonly CanonicalReferenceFixture[],
) {
  return {
    schema: "source_reference_artifact.v1",
    references: entries.map((entry) => ({
      sourceReferenceId: entry.sourceReferenceId,
      extraction: {
        raw: entry.raw ?? entry.title,
        confidence: 1,
      },
      bibliography: {
        title: entry.title,
        authors: entry.authors ?? ["Researcher"],
        year: entry.year,
        itemType: "journalArticle",
      },
      matching: entry.matching ?? {},
    })),
  };
}

function canonicalCitationAnalysisArtifact(
  sourceReferenceIds: readonly string[],
) {
  return {
    schema: "citation_analysis_artifact.v1",
    meta: {
      language: "en",
      scope: { section_title: null, line_start: null, line_end: null },
      scope_source: null,
      scope_decision: {
        selection_reason: null,
        covered_sections: [],
        fallback_from: null,
        fallback_reason: null,
      },
      mapping_reliability: "normal",
      reference_extraction: { status: "completed" },
    },
    summary: "",
    timeline: {
      early: { summary: "", sourceReferenceIds: [] },
      mid: { summary: "", sourceReferenceIds: [] },
      recent: { summary: "", sourceReferenceIds: [...sourceReferenceIds] },
    },
    items: sourceReferenceIds.map((sourceReferenceId) => ({
      sourceReferenceId,
      function: "background",
      role_in_context: "background",
      topic: null,
      usage: null,
      keywords: [],
      summary: null,
      key_reference_reason: null,
      confidence: 1,
      mentions: [],
    })),
    unresolved: [],
  };
}

async function createProductionRouteNativeComposition(
  port: number,
  id: string,
) {
  const health = (await (
    await fetch(`http://127.0.0.1:${port}/synthesis/v1/health`)
  ).json()) as { serviceInstanceId: string };
  return createNativeSynthesisClientComposition({
    getReadyConnection: () => ({
      discovery: {
        host: "127.0.0.1",
        port,
        profileId: "1".repeat(64),
        serviceInstanceId: health.serviceInstanceId,
      },
      clientToken: CLIENT_TOKEN,
    }),
    rpcClient: createSynthesisSidecarRpcClient({
      requestIdPrefix: `production-route:${id}`,
    }),
  });
}

async function waitForMaintenanceOperation(
  port: number,
  operationId: string,
  attempts = 200,
) {
  return waitForSynthesisProductionRouteReceipt({
    operationId,
    attempts,
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

function topicApplyRequest(
  topicId: string,
  options: { matrixText?: string; operation?: "create" | "update_full" } = {},
) {
  const operation = options.operation ?? "create";
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
    source_artifacts: [
      {
        paper_ref: sourcePaperRef,
        artifact_type: "digest",
        payload_type: "digest-markdown",
        status: "available",
        hash: "sha256:topic-fixture-digest",
      },
      {
        paper_ref: sourcePaperRef,
        artifact_type: "references",
        payload_type: "references-json",
        status: "available",
        hash: "sha256:topic-fixture-references",
      },
      {
        paper_ref: sourcePaperRef,
        artifact_type: "citation_analysis",
        payload_type: "citation-analysis-json",
        status: "available",
        hash: "sha256:topic-fixture-citation-analysis",
      },
    ],
    diagnostics: { warnings: [] },
  };
  if (options.matrixText !== undefined) {
    sectionValues.comparison_matrix = {
      columns: ["Mechanism"],
      rows: [
        {
          id: "matrix:mechanism",
          title: options.matrixText,
          values: { mechanism: options.matrixText },
        },
      ],
    };
  }
  const sectionAssets = Object.entries(sectionValues).map(([name, value]) => ({
    id: `asset/section/${name}`,
    mediaType: "application/json",
    text: JSON.stringify(value),
  }));
  return {
    bundle: {
      kind: "topic_synthesis",
      operation,
      mode: operation,
      language: "en",
      topic_definition: {
        id: topicId,
        title: "Production Topic",
        definition: "A durable production-route Topic",
      },
      artifact_manifest_path: "asset/artifact-manifest",
      artifact_metadata: {
        runtime: "split-skill",
        topic_id: topicId,
        depends_on: {
          papers: [sourcePaperRef],
          artifacts: ["digest-markdown"],
        },
      },
      markdown: "",
    },
    assets: [
      {
        id: "asset/artifact-manifest",
        mediaType: "application/json",
        text: JSON.stringify({
          topic_analysis: "asset/manifest",
          resolver_manifest: "asset/resolver",
        }),
      },
      {
        id: "asset/manifest",
        mediaType: "application/json",
        text: JSON.stringify({
          schema_id: "synthesis.topic_analysis_manifest",
          schema_version: "3.0.0",
          operation,
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
          resolver: {
            paper_refs: [sourcePaperRef],
            collection_key: [],
            combine: "union",
          },
          resolved_paper_set: { papers: [{ paper_ref: sourcePaperRef }] },
        }),
      },
      {
        id: "asset/sidecar/concept_cards_proposal",
        mediaType: "application/json",
        text: JSON.stringify({
          schema_id: "synthesis.concept_cards_proposal",
          schema_version: "1.0.0",
          cards: [
            {
              label: "Production concept",
              aliases: ["Durable concept"],
              concept_type: "method",
              domain: "information-science",
              short_definition: "A concept projected by Topic apply.",
              definition:
                "A durable Concept KB fact produced through the Topic proposal boundary.",
              topic_relevance: "Defines the production lifecycle fixture.",
              confidence: "high",
              evidence: [{ paper_ref: sourcePaperRef }],
              relations: [],
            },
            {
              label: "Production review concept",
              aliases: [],
              concept_type: "method",
              domain: "information-science",
              short_definition: "A low-confidence review fixture.",
              definition:
                "A Concept proposal that must remain pending until reviewed.",
              topic_relevance: "Exercises the native Concept review route.",
              confidence: "low",
              evidence: [{ paper_ref: sourcePaperRef }],
              relations: [],
            },
          ],
        }),
      },
      {
        id: "asset/sidecar/topic_interest_metadata",
        mediaType: "application/json",
        text: JSON.stringify({
          schema: "topic_interest_metadata.v1",
          topic_id: topicId,
          include_terms: ["production lifecycle"],
        }),
      },
      {
        id: "asset/sidecar/topic_graph_relation_proposals",
        mediaType: "application/json",
        text: JSON.stringify({
          schema_id: "synthesis.topic_graph_relation_proposals",
          proposals: [],
        }),
      },
      {
        id: "asset/sidecar/prospective_topic_relation_proposals",
        mediaType: "application/json",
        text: JSON.stringify({
          schema_id: "synthesis.prospective_topic_relation_proposals",
          proposals: [],
        }),
      },
    ],
  };
}

function canonicalAutosyncHostFixture(options?: {
  autoSyncEnabled?: boolean;
  failRead?: boolean;
}) {
  return {
    handle({ capability }: { capability: string }) {
      if (capability === "webdav.describe") {
        const enabled = options?.autoSyncEnabled !== false;
        return {
          status: enabled ? "available" : "disabled",
          configStatus: enabled ? "configured" : "disabled",
          autoSyncEnabled: enabled,
          autoRetryEnabled: false,
          baseUrl: enabled ? "https://webdav.invalid" : "",
          remotePath: "zotero-agents",
          username: "",
          credentialUpdatedAt: "",
          diagnostics: enabled ? [] : ["webdav_sync_disabled"],
        };
      }
      if (capability === "webdav.read_text") {
        return options?.failRead
          ? { status: "unavailable", diagnostics: ["fixture_read_failed"] }
          : { status: "missing", diagnostics: [] };
      }
      if (capability === "webdav.ensure_collection") {
        return { status: "ready", diagnostics: [] };
      }
      if (capability === "webdav.write_text") {
        return { status: "written", etag: "fixture-etag", diagnostics: [] };
      }
      if (capability.startsWith("effects.")) {
        return { status: "applied" };
      }
      return { status: "unavailable", diagnostics: [] };
    },
  };
}

describe("Synthesis Rust production client route", function () {
  this.timeout(20_000);

  it("replays structural read acceptance and attributed request rejections through the production Rust decoder", async function () {
    this.timeout(180_000);
    type Witness = Parameters<
      NonNullable<StructureCoverageInput["onWitness"]>
    >[0];
    const requests = new Map<
      string,
      {
        capability: string;
        value: unknown;
        seedValue: unknown;
        expectValid: boolean;
        obligations: string[];
      }
    >();
    const routes = new Map(
      protocolRegistry.capabilities
        .filter(
          (entry) =>
            entry.capability.startsWith("client.") &&
            synthesisProductionOperationPolicy(entry.capability as never)
              .receipt === "inline",
        )
        .map((entry) => [entry.requestSchemaRef, entry.capability]),
    );
    await checkSynthesisCrossLanguageContracts((witness: Witness) => {
      const capability = routes.get(witness.root.schemaRef);
      if (!capability) return;
      if (witness.expectValid) {
        if (
          !witness.root.valid ||
          productionOperations.access[
            capability as keyof typeof productionOperations.access
          ] !== "read"
        )
          return;
      } else if (witness.root.valid || !witness.keyword) return;
      if (
        !witness.expectValid &&
        !witness.root.errors?.some(
          (error) =>
            (error.keyword === witness.keyword ||
              (witness.keyword === "unevaluatedProperties" &&
                error.keyword === "additionalProperties")) &&
            error.instancePath === witness.instancePath,
        )
      )
        return;
      const key = JSON.stringify([capability, witness.root.value]);
      // Larger bounds require transfer-specific native tests; they stay uncovered here.
      if (Buffer.byteLength(key) > 512 * 1024) return;
      const existing = requests.get(key);
      if (existing) existing.obligations.push(witness.obligationId);
      else
        requests.set(key, {
          capability,
          value: witness.root.value,
          seedValue: witness.root.seedValue,
          expectValid: witness.expectValid,
          obligations: [witness.obligationId],
        });
    });
    assert.isAbove(requests.size, 0);
    const identity = synthesisProtocolExecutionIdentity();
    assert.isString(identity);
    const harness = await startSynthesisProductionRouteHarness({
      id: "recursive-request-rejections",
    });
    const divergences: string[] = [];
    const seeds = new Map<string, boolean>();
    let verified = 0;
    let accepted = 0;
    const observe = async (capability: string, value: unknown) =>
      (await call(harness.port, capability, value)).body;
    const isRejection = (capability: string, result: Record<string, any>) =>
      (result.ok === false && result.error?.code === "invalid_request") ||
      (capability === "client.resolveResolver" &&
        result.data?.ok === false &&
        result.data?.diagnostics?.rejected === true) ||
      (capability === "client.applyTopicSynthesisResult" &&
        result.data?.status === "invalid_request");
    try {
      for (const payload of [[[]], [[], "extra"]]) {
        const result = await observe("client.listTopics", payload);
        assert.isFalse(result.ok);
        assert.equal(result.error.code, "invalid_request");
      }
      for (const request of requests.values()) {
        const seedKey = JSON.stringify([request.capability, request.seedValue]);
        if (!seeds.has(seedKey))
          seeds.set(
            seedKey,
            !isRejection(
              request.capability,
              await observe(request.capability, request.seedValue),
            ),
          );
        // A domain-invalid seed cannot establish that its mutation caused rejection.
        if (!seeds.get(seedKey)) continue;
        const result = await observe(request.capability, request.value);
        if (request.expectValid) {
          // A failed domain lookup cannot prove the positive structural branch.
          if (!result.ok || isRejection(request.capability, result)) continue;
          accepted += 1;
          appendSynthesisProtocolObservation(
            identity!,
            protocolRegistry.capabilities.find(
              (entry) => entry.capability === request.capability,
            )!.requestSchemaRef,
            request.value,
          );
          continue;
        }
        // These two public APIs transport domain rejection as a declared result.
        const rejected = isRejection(request.capability, result);
        if (rejected)
          appendSynthesisProtocolExecutionEvidence(
            identity!,
            `${request.capability}:request`,
            "rejected",
          );
        if (rejected) verified += request.obligations.length;
        for (const id of request.obligations)
          appendSynthesisProtocolExecutionEvidence(
            identity!,
            `structure:${id}`,
            rejected ? "verified" : "diverged",
          );
        if (!rejected)
          divergences.push(
            `${request.capability}:${JSON.stringify(result)}:${request.obligations.join(",")}`,
          );
      }
    } finally {
      await harness.stop();
    }
    assert.isAbove(verified, 0);
    assert.isAbove(accepted, 0);
    assert.isEmpty(divergences, divergences.join("\n"));
  });

  it("reads generated Topic fields through the real native context client", async function () {
    const runtime = await startSynthesisProductionRouteHarness({
      id: "generated-topic-context",
    });
    try {
      const request = topicApplyRequest("topic:generated-context");
      const definition = {
        ...request.bundle.topic_definition,
        research_area: "Tunnel construction",
        scope_boundary: {
          include: ["lining"],
          exclude: [],
          notes: "Generated scope",
        },
      };
      const summary = {
        brief: "Brief",
        summary: "Full overview",
        key_takeaways: ["One"],
      };
      Object.assign(request.bundle.topic_definition, definition);
      for (const asset of request.assets) {
        if (asset.id === "asset/section/topic")
          asset.text = JSON.stringify(definition);
        if (asset.id === "asset/section/summary")
          asset.text = JSON.stringify(summary);
      }
      const applied =
        await runtime.client.workflowApply.applyTopicSynthesisResult(request);
      assert.equal(applied.status, "persisted");
      for (const view of ["semantic", "digest"] as const) {
        const result = await runtime.client.topics.getContext({
          topicId: request.bundle.topic_definition.id,
          view,
        });
        assert.deepEqual(result[view]?.summary, summary);
        if (view === "semantic")
          assert.deepEqual(result.semantic?.topic, definition);
      }
    } finally {
      await runtime.stop();
    }
  });

  it("preserves canonical Topic search and stale nonmatch cursors through every public projection", async function () {
    this.timeout(120_000);
    const runtime = await startSynthesisProductionRouteHarness({
      id: "topic-search-projections",
      hostFixture: {
        handle({ capability }) {
          if (capability === "webdav.describe")
            return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
          return { status: "unavailable", diagnostics: [] };
        },
      },
    });
    const client = runtime.client;
    const workflow = createWorkflowHostApi({
      synthesis: createWorkflowSynthesisHostApi({
        resolveClient: async () => client,
      }),
    });
    const context = {
      getStatus: () => ({}) as never,
      connectionMode: "local" as const,
      resolveSynthesisClient: () => client,
    };
    const routedRequests: string[] = [];
    const bridgeServer = http.createServer(async (request, response) => {
      let body = "";
      for await (const chunk of request) body += chunk;
      const encoded = new TextEncoder().encode(body);
      const route = matchHostBridgeCapabilityRoute(
        {
          method: request.method ?? "POST",
          path: request.url ?? "",
          headers: {},
          query: {},
          body,
          bodyBytes: encoded,
          bodyByteLength: encoded.length,
        },
        {
          resolveSynthesisClient: () => client,
          getStatus: context.getStatus,
          getConnectionMode: () => "local",
          getOperationId: () => "",
          getPermissionScope: () => null,
          navigationScopeAllowed: () => false,
          getWorkflowCallControl: () => undefined,
          respond(status, reason, data) {
            const encoded = JSON.stringify(data);
            response.writeHead(status, {
              "content-type": "application/json",
              "content-length": Buffer.byteLength(encoded),
            });
            response.end(encoded);
            return prepareRuntimeHttpResponse({ status, reason, body: data });
          },
        },
      );
      if (!route) {
        response.writeHead(404);
        response.end();
        return;
      }
      routedRequests.push(String(JSON.parse(body).capability));
      await route.handle();
    });
    await new Promise<void>((resolve) =>
      bridgeServer.listen(0, "127.0.0.1", resolve),
    );
    const address = bridgeServer.address();
    assert.isNotNull(address);
    if (!address || typeof address === "string")
      throw new Error("Topic Bridge route did not bind");
    const endpoint = `http://127.0.0.1:${address.port}/bridge/v2`;
    try {
      const seeds = new Map<
        string,
        Awaited<
          ReturnType<typeof client.workflowApply.applyTopicSynthesisResult>
        >
      >();
      for (const [id, text] of [
        ["topic:search-a", "Photonic transition"],
        ["topic:search-b", "Photonic transition"],
        ["topic:search-c", "Unrelated mechanism"],
      ]) {
        const seeded = await client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest(id, { matrixText: text }),
        );
        assert.equal(seeded.status, "persisted");
        seeds.set(id, seeded);
      }
      await resolveCurrentHostBridgeCli();
      const request: SynthesisTopicSearchRequest = {
        query: "PHOTONIC transition",
        sections: ["comparison_matrix"],
        limit: 1,
        maxResults: 10,
      };
      const expected = await client.topics.search({ ...request, limit: 10 });
      assert.equal(expected.total, 2);
      assert.deepEqual(
        expected.results.map((match) => match.topicId),
        ["topic:search-a", "topic:search-b"],
      );
      assert.deepEqual(Object.keys(expected).sort(), [
        "coverage",
        "hasMore",
        "issues",
        "method",
        "nextCursor",
        "results",
        "status",
        "total",
      ]);
      assert.deepEqual(expected.coverage, {
        kind: "topic",
        sections: [{ section: "comparison_matrix", status: "complete" }],
      });
      assert.isFalse(
        /"(?:score|path|blockId)":/.test(JSON.stringify(expected)),
      );
      const cursors: string[] = [];
      const searches = [
        (input: SynthesisTopicSearchRequest) => client.topics.search(input),
        (input: SynthesisTopicSearchRequest) =>
          workflow.synthesis.topics.search(input),
        async (input: SynthesisTopicSearchRequest) =>
          (await executeHostBridgeCapability(
            "topics.search",
            input,
            context,
          )) as SynthesisTopicSearchResult,
      ];
      for (const search of searches) {
        const page = await search(request);
        assert.equal(page.status, "completed");
        assert.equal(page.total, 2);
        assert.deepEqual(page.results, expected.results.slice(0, 1));
        assert.isString(page.nextCursor);
        cursors.push(page.nextCursor!);
        const next = await search({ ...request, cursor: page.nextCursor! });
        assert.deepEqual(next.results, expected.results.slice(1));
        assert.isFalse(next.hasMore);
        assert.isNull(next.nextCursor);
        const empty = await search({ ...request, query: "unmatchable" });
        assert.equal(empty.status, "completed");
        assert.equal(empty.total, 0);
        assert.isEmpty(empty.results);
        let invalid: unknown;
        try {
          await search({ ...request, sections: ["private_notes"] });
        } catch (error) {
          invalid = error;
        }
        assert.isDefined(invalid);
      }
      const read = await workflow.synthesis.topics.getContext({
        topicId: expected.results[0].topicId,
        view: "semantic",
      });
      assert.equal(read.topic_id, "topic:search-a");
      assert.equal(read.semantic?.topic_id, "topic:search-a");
      assert.equal(
        read.semantic?.comparison_matrix?.rows?.[0].values?.mechanism,
        "Photonic transition",
      );
      const mcpSearch = async (input: SynthesisTopicSearchRequest) =>
        (await handleZoteroMcpJsonRpc(
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "topics.search", arguments: input },
          },
          context,
        )) as any;
      const mcp = await mcpSearch(request);
      assert.isFalse(mcp.result.isError ?? false);
      assert.deepEqual(
        mcp.result.structuredContent.data.results,
        expected.results.slice(0, 1),
      );
      const mcpCursor = mcp.result.structuredContent.data.nextCursor as string;
      assert.deepEqual(
        (await mcpSearch({ ...request, cursor: mcpCursor })).result
          .structuredContent.data.results,
        expected.results.slice(1),
      );
      assert.equal(
        (await mcpSearch({ ...request, query: "unmatchable" })).result
          .structuredContent.data.total,
        0,
      );
      const invalidMcp = await mcpSearch({
        ...request,
        sections: ["private_notes"],
      });
      assert.isTrue(!!invalidMcp.error || !!invalidMcp.result?.isError);

      await withHostBridgeCliHarness({}, async (cli) => {
        const run = (input: SynthesisTopicSearchRequest) =>
          cli.runCli([
            "--endpoint",
            endpoint,
            "synthesis",
            "topic",
            "search",
            "--query",
            JSON.stringify(input),
          ]);
        const page = await run(request);
        assert.equal(page.exitCode, 0, JSON.stringify(page.output));
        const cliPage = (
          page.output.data as { data: SynthesisTopicSearchResult }
        ).data;
        assert.deepEqual(cliPage.results, expected.results.slice(0, 1));
        const continued = await run({
          ...request,
          cursor: cliPage.nextCursor!,
        });
        assert.equal(continued.exitCode, 0, continued.stderr);
        assert.deepEqual(
          (continued.output.data as { data: SynthesisTopicSearchResult }).data
            .results,
          expected.results.slice(1),
        );
        assert.equal(
          (
            (await run({ ...request, query: "unmatchable" })).output.data as {
              data: SynthesisTopicSearchResult;
            }
          ).data.total,
          0,
        );
        assert.notEqual(
          (await run({ ...request, sections: ["private_notes"] })).exitCode,
          0,
        );

        const update = topicApplyRequest("topic:search-c", {
          matrixText: "Photonic transition",
          operation: "update_full",
        });
        Object.assign(update.bundle, {
          base_hashes: seeds.get("topic:search-c")!.hashes,
        });
        const changed =
          await client.workflowApply.applyTopicSynthesisResult(update);
        assert.equal(changed.status, "persisted");
        for (let index = 0; index < searches.length; index++) {
          let failure: any;
          try {
            await searches[index]({ ...request, cursor: cursors[index] });
          } catch (error) {
            failure = error;
          }
          assert.isDefined(failure);
          assert.equal(failure.code, "conflict");
          assert.match(
            JSON.stringify(failure.details),
            /stale|basis_mismatch|revision_mismatch/,
          );
        }
        const staleMcp = await mcpSearch({ ...request, cursor: mcpCursor });
        assert.isTrue(!!staleMcp.error || !!staleMcp.result?.isError);
        assert.match(JSON.stringify(staleMcp), /stale|basis_mismatch/);
        const count = routedRequests.length;
        const staleCli = await run({ ...request, cursor: cliPage.nextCursor! });
        assert.notEqual(staleCli.exitCode, 0);
        assert.match(JSON.stringify(staleCli.output), /stale|basis_mismatch/);
        assert.equal(
          routedRequests.length,
          count + 1,
          "continuation is not automatically replayed",
        );
      });
    } finally {
      await new Promise<void>((resolve, reject) =>
        bridgeServer.close((error) => (error ? reject(error) : resolve())),
      );
      await runtime.stop();
    }
  });

  it("keeps the Topic and Workbench production surface fixture-backed", function () {
    assert.lengthOf(TOPIC_WORKBENCH_OPERATIONS, 21);
    assert.deepEqual(inspectSynthesisTopicWorkbenchSurfaceParity(), {
      ok: true,
      operations: 21,
      observables: 21,
      errors: [],
    });
  });

  it("projects the strict Workbench Index registry through native composition", async function () {
    this.timeout(60_000);
    const dataset = createSyntheticSynthesisProductionRouteDataset("2k");
    let injection = "success";
    let injectedCapability = "library.artifacts.readiness";
    const harness = await startSynthesisProductionRouteHarness({
      id: "strict-workbench-index-registry",
      hostFixture: {
        error({ capability }) {
          if (capability !== injectedCapability) return undefined;
          if (injection === "typed-error")
            return {
              code: "unavailable",
              details: { reason: "readiness_fixture_unavailable" },
            };
          if (injection === "malformed-error") return {};
          return undefined;
        },
        handle({ capability, payload }) {
          if (capability === "library.items.sync_snapshot")
            return buildTestSynthesisLibrarySnapshotPage({
              items: [],
              batchSize: Number(payload.batchSize),
            });
          if (capability === "library.items.list_page") {
            return dataset.listItemsPage(payload);
          }
          if (capability === "library.artifacts.scan_page") {
            return dataset.scanArtifactsPage(payload);
          }
          if (capability === "library.artifacts.read") {
            return dataset.readArtifact(payload);
          }
          if (capability === "library.artifacts.readiness") {
            return {
              ...(injection === "malformed-result"
                ? { __unexpected: true }
                : {}),
              artifacts: [
                {
                  paperRef: "1:SYN0000001",
                  artifactType: "literature_score",
                  payloadType: "literature-score-json",
                  status: "available",
                  diagnostics: [],
                  literatureQuality: {
                    status: "available",
                    schema: "literature_score.v1",
                    rubric_id: "default-v1",
                    paper_type: "empirical",
                    overall_score: 68,
                    confidence: 0.8,
                    confidence_adjusted_score: 64.4,
                    quality_prior: 0.644,
                    diagnostics: [],
                  },
                },
              ],
            };
          }
          if (capability === "library.items.get_audit_state") {
            return { states: [] };
          }
          if (capability === "webdav.describe")
            return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
          return { status: "unavailable", diagnostics: [] };
        },
      },
    });
    try {
      const accepted =
        await harness.client.references.refreshReferenceSidecarNow();
      const receipt = await waitForSynthesisProductionRouteReceipt({
        operationId: accepted.operation_id,
        getOperation: (operationId) =>
          harness.client.maintenance.getOperation({
            operation_id: operationId,
          }),
      });
      assert.equal(receipt.status, "completed");
      const state = createDefaultSynthesisUiState();
      state.registry.expandedSourceRefs = ["1:SYN0000001"];
      const projection = await harness.client.workbench.readSurface({
        surface: "index",
        state: toSynthesisWorkbenchReadState(state),
      });
      const registry = projection.registry as {
        cacheStatus: { status: string };
        rows: Array<Record<string, unknown>>;
      };
      assert.sameMembers(Object.keys(registry), ["rows", "cacheStatus"]);
      assert.equal(registry.cacheStatus.status, "ready");
      assert.isNotEmpty(registry.rows);
      assert.sameMembers(Object.keys(registry.rows[0]), [
        "paper_ref",
        "library_id",
        "item_key",
        "title",
        "year",
        "metadata_hash",
        "updated_at",
        "artifactCoverage",
        "missing_artifacts",
        "reference_count",
        "unbound_reference_count",
        "references",
        "ratingScore",
      ]);
      assert.equal(registry.rows[0].paper_ref, "1:SYN0000001");
      assert.equal(registry.rows[0].ratingScore, 68);
      recordSynthesisReverseHostRequestEvidence(
        harness,
        "library.artifacts.readiness",
      );
      recordSynthesisReverseHostResultAcceptance(
        harness,
        "library.artifacts.readiness",
      );
      assert.isTrue(
        readSynthesisProtocolObservations().some(
          (sample) =>
            sample.schemaRef ===
              protocolRegistry.capabilities.find(
                (entry) => entry.capability === "library.artifacts.readiness",
              )!.resultSchemaRef &&
            JSON.stringify(sample.value) ===
              JSON.stringify(
                harness.recorder.hostCalls
                  .filter(
                    (entry) =>
                      entry.capability === "library.artifacts.readiness",
                  )
                  .at(-1)!.result,
              ),
        ),
      );
      recordSynthesisReverseHostResultAcceptance(
        harness,
        "library.artifacts.scan_page",
      );
      for (const capability of [
        "library.artifacts.readiness",
        "library.artifacts.scan_page",
      ])
        assert.include(
          readSynthesisProtocolExecutionEvidence().map(
            (entry) => `${entry.slot}:${entry.outcome}`,
          ),
          `${capability}:result:accepted`,
        );
      assert.match(
        String(registry.rows[0].metadata_hash),
        /^sha256:[a-f0-9]{64}$/,
      );
      assert.isArray(registry.rows[0].references);
      for (const mode of [
        "malformed-result",
        "typed-error",
        "malformed-error",
      ]) {
        injection = mode;
        const failed = await call(
          harness.port,
          "client.getSynthesisWorkbenchSurfaceInput",
          {
            args: ["index", toSynthesisWorkbenchReadState(state)],
          },
        );
        assert.isFalse(failed.body.ok, JSON.stringify(failed.body));
        if (mode === "malformed-result") {
          assert.equal(
            failed.body.error.details?.reason,
            "reverse_host_result_invalid",
          );
          recordSynthesisReverseHostResultRejection({
            harness,
            capability: "library.artifacts.readiness",
            nativeFailureCode: "reverse_host_result_invalid",
          });
        } else {
          const code =
            mode === "typed-error"
              ? "readiness_fixture_unavailable"
              : "reverse_host_response_envelope_invalid";
          assert.equal(failed.body.error.details?.reason, code);
          recordSynthesisReverseHostErrorEvidence({
            harness,
            capability: "library.artifacts.readiness",
            nativeFailureCode: code,
          });
        }
      }
      injection = "success";
      injectedCapability = "library.artifacts.scan_page";
      for (const mode of ["typed-error", "malformed-error"]) {
        injection = mode;
        const admitted =
          await harness.client.references.refreshReferenceSidecarNow();
        const terminal = await waitForMaintenanceOperation(
          harness.port,
          admitted.operation_id,
        );
        assert.equal(terminal.status, "failed");
        assert.isFalse(terminal.receipt.state_changed);
        const code =
          mode === "typed-error"
            ? "readiness_fixture_unavailable"
            : "reverse_host_response_envelope_invalid";
        assert.include(
          terminal.receipt.diagnostics.map(
            (entry: { code: string }) => entry.code,
          ),
          code,
        );
        recordSynthesisReverseHostErrorEvidence({
          harness,
          capability: "library.artifacts.scan_page",
          nativeFailureCode: code,
        });
      }
      injection = "success";
      const reviewProjection = await harness.client.workbench.readSurface({
        surface: "review",
        state: toSynthesisWorkbenchReadState(state),
      });
      const reviewSnapshot = buildSynthesisUiSnapshot(
        toSynthesisUiSnapshotInput(reviewProjection),
        state,
      );
      assert.equal(reviewSnapshot.registry.cacheStatus.status, "ready");
    } finally {
      await harness.stop();
    }
  });

  it("projects persisted real-data Review rows through native composition", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-reference-review-projection-"),
    );
    let harness = await startSynthesisProductionRouteHarness({
      id: "reference-review-projection-initialize",
      root,
    });
    try {
      await harness.stop();
      const database = new DatabaseSync(
        path.join(root, "state", "synthesis.db"),
      );
      const now = "2026-08-27T00:00:00.000Z";
      database
        .prepare(
          `INSERT INTO synt_reference_match_proposal(
             proposal_id,kind,status,source_canonical_reference_id,
             source_raw_reference_ids_json,target_canonical_reference_id,
             target_library_id,target_item_key,confidence,score,reasons_json,
             evidence_json,diagnostics_json,basis_hash,source_hash,created_at,updated_at
           ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          "proposal:rich-evidence",
          "canonical_merge",
          "open",
          "cref:source",
          '["rawref:source"]',
          "cref:target",
          0,
          "",
          "high",
          0.95,
          '["normalized_title_year"]',
          JSON.stringify({
            source: {
              canonical_reference_id: "cref:source",
              title: "Source title",
              normalized_title: "source title",
              year: "2024",
              selected_title_candidate: { storage: "only" },
              raw_sample: "storage-only",
            },
            target: {
              canonical_reference_id: "cref:target",
              title: "Target title",
              normalized_title: "target title",
              year: "2024",
            },
            token_dice: 0.95,
            year_delta: 0,
            source_record: { storage: "only" },
            representative: { storage: "only" },
          }),
          '[{"code":"review_required","message":"storage-only"}]',
          "basis:review",
          "source:review",
          now,
          now,
        );
      database
        .prepare(
          `INSERT INTO synt_concept_review_item(
             review_id,status,reason,topic_id,topic_path_id,label,confidence,
             candidate_concept_ids_json,proposal_json,target_concept_id,
             created_at,updated_at,resolved_at
           ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          "review:legacy-concept",
          "open",
          "low_confidence",
          "topic:legacy",
          "legacy-topic",
          "Legacy concept",
          "low",
          "[]",
          JSON.stringify({
            label: "Legacy concept",
            aliases: [],
            concept_type: "method",
            domain: "synthesis",
            short_definition: "Short definition",
            definition: "Definition",
            topic_relevance: "Relevant",
            confidence: "low",
            evidence: [],
            relations: [],
            merge_hints: [],
          }),
          "",
          now,
          now,
          "",
        );
      database
        .prepare(
          `INSERT INTO synt_topic_graph_review_item(
             review_id,status,source_topic_id,target_topic_id,target_title,
             relation,confidence,provenance_json,evidence_refs_json,
             created_at,updated_at,resolved_at
           ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          "review:topic-graph",
          "open",
          "topic:source",
          "topic:target",
          "Target topic",
          "related_to",
          0.8,
          "[]",
          "[]",
          now,
          now,
          "",
        );
      database.close();

      harness = await startSynthesisProductionRouteHarness({
        id: "reference-review-projection-reopen",
        root,
      });
      const state = createDefaultSynthesisUiState();
      const readState = toSynthesisWorkbenchReadState(state);
      const projection = await harness.client.workbench.readSurface({
        surface: "review",
        state: readState,
      });
      assert.lengthOf(projection.registry.matchProposals, 1);
      const proposal = projection.registry.matchProposals[0];
      if (proposal.kind !== "canonical_merge") {
        throw new Error(`Unexpected proposal kind: ${proposal.kind}`);
      }
      const evidence = proposal.evidence;
      assert.deepInclude(evidence, {
        token_dice: 0.95,
        year_delta: 0,
      });
      assert.notProperty(evidence, "source_record");
      assert.notProperty(evidence.source, "selected_title_candidate");
      assert.deepEqual(proposal.diagnostics, [{ code: "review_required" }]);

      const conceptState = {
        ...readState,
        reviews: {
          ...readState.reviews,
          activeTab: "concepts" as const,
        },
      };
      const conceptProjection = await harness.client.workbench
        .readSurface({ surface: "review", state: conceptState })
        .catch((error) => {
          throw new Error(`Concept Review failed: ${JSON.stringify(error)}`, {
            cause: error,
          });
        });
      assert.lengthOf(conceptProjection.concepts.reviewItems, 1);
      assert.deepInclude(conceptProjection.concepts.reviewItems[0], {
        review_id: "review:legacy-concept",
        concept_type: "method",
        short_definition: "Short definition",
        topic_relevance: "Relevant",
      });
      assert.notProperty(conceptProjection.concepts.reviewItems[0], "proposal");

      const topicGraphProjection = await harness.client.workbench.readSurface({
        surface: "review",
        state: {
          ...readState,
          reviews: { ...readState.reviews, activeTab: "topic_graph" },
        },
      });
      assert.deepInclude(topicGraphProjection.topicGraph.reviewItems[0], {
        review_id: "review:topic-graph",
        source_topic_id: "topic:source",
        target_topic_id: "topic:target",
      });
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("repairs a legacy canonical redirect cycle before loading the Workbench Index", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-redirect-repair-"),
    );
    let harness = await startSynthesisProductionRouteHarness({
      id: "redirect-repair-initialize",
      root,
    });
    try {
      await harness.stop();
      const databasePath = path.join(root, "state", "synthesis.db");
      const database = new DatabaseSync(databasePath);
      const now = "2026-08-10T00:00:00.000Z";
      database.exec("BEGIN IMMEDIATE");
      database
        .prepare("DELETE FROM synt_schema_meta WHERE key=?")
        .run("reference_redirect_graph_schema_version");
      database.exec(`
        INSERT INTO synt_reference_canonical(
          canonical_reference_id,title,normalized_title,year,authors_json,
          identifiers_json,metadata_hash,status,created_at,updated_at
        ) VALUES
          ('canonical:a','A','a','','[]','{}','sha256:a','active','${now}','${now}'),
          ('canonical:b','B','b','','[]','{}','sha256:b','active','${now}','${now}');
      `);
      const insertRedirect = database.prepare(
        `INSERT INTO synt_reference_redirect(
           from_canonical_reference_id,to_canonical_reference_id,reason,
           diagnostics_json,created_at,updated_at
         ) VALUES(?,?,?,?,?,?)`,
      );
      insertRedirect.run(
        "canonical:a",
        "canonical:b",
        "reference_matching",
        "[]",
        now,
        now,
      );
      insertRedirect.run(
        "canonical:b",
        "canonical:a",
        "reference_matching",
        "[]",
        now,
        now,
      );
      const insertProposal = database.prepare(
        `INSERT INTO synt_reference_match_proposal(
           proposal_id,kind,status,source_canonical_reference_id,
           source_raw_reference_ids_json,target_canonical_reference_id,
           target_library_id,target_item_key,confidence,score,reasons_json,
           evidence_json,diagnostics_json,basis_hash,source_hash,created_at,updated_at
         ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      );
      insertProposal.run(
        "proposal:forward",
        "canonical_merge",
        "accepted",
        "canonical:a",
        "[]",
        "canonical:b",
        0,
        "",
        "automatic",
        1,
        '["automatic_match"]',
        "[]",
        "[]",
        "basis:forward",
        "source:forward",
        now,
        now,
      );
      insertProposal.run(
        "proposal:reverse",
        "canonical_merge",
        "accepted",
        "canonical:b",
        "[]",
        "canonical:a",
        0,
        "",
        "manual",
        1,
        '["reverse_accept"]',
        "[]",
        "[]",
        "basis:reverse",
        "source:reverse",
        now,
        "2026-08-10T00:01:00.000Z",
      );
      database.exec("COMMIT");
      database.close();

      harness = await startSynthesisProductionRouteHarness({
        id: "redirect-repair-reopen",
        root,
      });
      const index = (await harness.call(
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
          ],
        },
      )) as { registry: { rows: unknown[] } };
      assert.deepEqual(index.registry.rows, []);

      const repaired = new DatabaseSync(databasePath, { readOnly: true });
      const redirects = repaired
        .prepare(
          `SELECT from_canonical_reference_id AS source,
                  to_canonical_reference_id AS target
           FROM synt_reference_redirect ORDER BY source`,
        )
        .all() as Array<{ source: string; target: string }>;
      assert.deepEqual(redirects, [
        { source: "canonical:b", target: "canonical:a" },
      ]);
      assert.equal(
        (
          repaired
            .prepare(
              `SELECT COUNT(*) AS count FROM synt_operation
               WHERE operation_type='canonical_redirect_repair'
                 AND status='completed'`,
            )
            .get() as { count: number }
        ).count,
        1,
      );
      repaired.close();
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
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
    assert.lengthOf(cases, 19);
    assert.isTrue(
      cases.every(
        (entry) =>
          entry.access === "read" &&
          entry.expected.writeExpectation === "zero" &&
          (entry.expected.hostEffects.length === 0 ||
            (entry.operation === "client.getTopicPlanningContext" &&
              entry.expected.hostEffects.includes("library-index-read"))),
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
            ? SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION
            : capability === "library.items.list_page"
              ? {
                  items: [],
                  cursor,
                  nextCursor: "",
                  hasMore: false,
                  returned: 0,
                  limit,
                  total: 0,
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
        {
          args: [
            toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
          ],
        },
      );
      assert.equal(warmup.status, 200, JSON.stringify(warmup.body));

      const observed: string[] = [];
      for (const entry of cases) {
        const before = captureDurableState(root);
        const currentRequest = {
          "case:workbench-chrome-missing": { args: [workbenchState()] },
          "case:workbench-topics-empty": { args: ["topics", workbenchState()] },
          "case:topic-empty-page": { args: [{ cursor: "", limit: 50 }] },
          "case:topic-find-missing-paper": {
            args: [{ paper_refs: ["1:MISSING1"] }],
          },
          "case:resolver-empty-match": {
            args: [
              {
                paper_refs: ["1:MISSING1"],
                collection_key: [],
                combine: "union",
                cursor: 0,
                limit: 25,
              },
            ],
          },
          "case:topic-paper-digest-unavailable": {
            args: [
              {
                paper_ref: "1:MISSING1",
                include_representative_image: false,
              },
            ],
          },
        }[entry.id];
        const response = await call(
          port,
          entry.operation,
          currentRequest ?? entry.request,
        );
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

  it("resolves Topic digest representative images through the real grouped client route", async function () {
    const imageCalls: Array<Record<string, unknown>> = [];
    let artifactMode:
      | "available"
      | "malformed-result"
      | "typed-error"
      | "malformed-error" = "available";
    let imageMode:
      | "available"
      | "absent"
      | "unavailable"
      | "malformed-result"
      | "typed-error"
      | "malformed-error" = "available";
    const harness = await startSynthesisProductionRouteHarness({
      id: "topic-representative-image",
      hostFixture: {
        error({ capability }) {
          if (capability === "library.artifacts.read") {
            if (artifactMode === "typed-error")
              return {
                code: "unavailable",
                details: { reason: "artifact_fixture_unavailable" },
              };
            if (artifactMode === "malformed-error") return {};
            return undefined;
          }
          if (capability !== "library.representative_image.read")
            return undefined;
          if (imageMode === "typed-error")
            return {
              code: "unavailable",
              details: { reason: "image_fixture_unavailable" },
            };
          if (imageMode === "malformed-error") return {};
          return undefined;
        },
        handle({ capability, payload }) {
          if (capability === "webdav.describe")
            return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
          if (capability === "library.artifacts.read") {
            if (artifactMode === "malformed-result") return { status: 123 };
            return {
              status: "available",
              payloadHash: payload.expectedHash,
              currentHash: payload.expectedHash,
              content: {
                kind: "text",
                text: "# Production digest",
                mediaType: "text/markdown",
              },
              diagnostics: [],
            };
          }
          if (capability === "library.representative_image.read") {
            imageCalls.push(payload);
            if (imageMode === "malformed-result")
              return { status: "__invalid" };
            if (imageMode === "absent") {
              return { status: "absent", diagnostics: [] };
            }
            if (imageMode === "unavailable") {
              return {
                status: "unavailable",
                diagnostics: ["representative_image_attachment_not_found"],
              };
            }
            return {
              status: "available",
              attachmentKey: "IMAGE001",
              mimeType: "image/png",
              contentBase64: "aGVsbG8=",
              alt: "Figure",
              caption: "Production figure",
              width: 640,
              height: 480,
              compressedBytes: 5,
              sourceKind: "attachment",
              strategy: "explicit",
              diagnostics: [],
            };
          }
          return { status: "unavailable", diagnostics: [] };
        },
      },
    });
    const request = {
      paperRef: "1:DIGEST01",
      digestRef: {
        paperRef: "1:DIGEST01",
        libraryId: 1,
        noteKey: "NOTE0001",
        locator: "fixture:digest:DIGEST01",
        payloadHash: "sha256:digest-production",
      },
      includeRepresentativeImage: true,
    };
    try {
      const available =
        await harness.client.artifacts.resolveTopicPaperDigest(request);
      assert.deepEqual(imageCalls, [{ libraryId: 1, noteKey: "NOTE0001" }]);
      assert.deepInclude(available.representative_image as object, {
        status: "available",
        attachment_key: "IMAGE001",
        mime_type: "image/png",
        data_url: "data:image/png;base64,aGVsbG8=",
        width: 640,
        height: 480,
        compressed_bytes: 5,
      });
      recordSynthesisReverseHostRequestEvidence(
        harness,
        "library.representative_image.read",
      );
      recordSynthesisReverseHostResultAcceptance(
        harness,
        "library.representative_image.read",
      );
      recordSynthesisReverseHostRequestEvidence(
        harness,
        "library.artifacts.read",
      );
      recordSynthesisReverseHostResultAcceptance(
        harness,
        "library.artifacts.read",
      );

      imageMode = "malformed-result";
      const invalid =
        await harness.client.artifacts.resolveTopicPaperDigest(request);
      assert.deepEqual(invalid.representative_image, {
        status: "unavailable",
        diagnostics: ["representative_image_host_result_invalid"],
      });
      recordSynthesisReverseHostResultRejection({
        harness,
        capability: "library.representative_image.read",
        nativeFailureCode: "representative_image_host_result_invalid",
      });
      for (const [mode, reason] of [
        ["typed-error", "image_fixture_unavailable"],
        ["malformed-error", "reverse_host_response_envelope_invalid"],
      ] as const) {
        imageMode = mode;
        const failure =
          await harness.client.artifacts.resolveTopicPaperDigest(request);
        assert.equal(failure.markdown, available.markdown);
        assert.deepEqual(failure.representative_image, {
          status: "unavailable",
          diagnostics: ["representative_image_host_read_failed"],
        });
        recordSynthesisReverseHostErrorEvidence({
          harness,
          capability: "library.representative_image.read",
          nativeFailureCode: reason,
        });
      }

      imageMode = "absent";
      const absent =
        await harness.client.artifacts.resolveTopicPaperDigest(request);
      assert.notProperty(absent, "representative_image");

      imageMode = "unavailable";
      const unavailable =
        await harness.client.artifacts.resolveTopicPaperDigest(request);
      assert.deepEqual(unavailable.representative_image, {
        status: "unavailable",
        diagnostics: ["representative_image_attachment_not_found"],
      });

      const beforeOptOut = imageCalls.length;
      const optedOut = await harness.client.artifacts.resolveTopicPaperDigest({
        ...request,
        includeRepresentativeImage: false,
      });
      assert.notProperty(optedOut, "representative_image");
      assert.equal(imageCalls.length, beforeOptOut);
      const beforeFailures = captureDurableState(harness.root);
      for (artifactMode of [
        "malformed-result",
        "typed-error",
        "malformed-error",
      ]) {
        let failure: unknown;
        try {
          await harness.client.artifacts.resolveTopicPaperDigest({
            ...request,
            includeRepresentativeImage: false,
          });
        } catch (error) {
          failure = error;
        }
        assert.instanceOf(failure, SynthesisClientError);
        const code = String(
          (failure as SynthesisClientError).details?.sidecarReason || "",
        );
        assert.equal(
          code,
          artifactMode === "malformed-result"
            ? "reverse_host_result_invalid"
            : artifactMode === "typed-error"
              ? "artifact_fixture_unavailable"
              : "reverse_host_response_envelope_invalid",
        );
        if (artifactMode === "malformed-result")
          recordSynthesisReverseHostResultRejection({
            harness,
            capability: "library.artifacts.read",
            nativeFailureCode: code,
          });
        else
          recordSynthesisReverseHostErrorEvidence({
            harness,
            capability: "library.artifacts.read",
            nativeFailureCode: code,
          });
        assert.deepEqual(captureDurableState(harness.root), beforeFailures);
      }
    } finally {
      await harness.stop();
    }
  });

  it("returns the fixed-baseline recursive workflow review input through the real route", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "workflow-review-input",
      hostFixture: {
        handle({ capability, payload }) {
          if (capability === "webdav.describe") {
            return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
          }
          if (capability === "library.items.list_page") {
            const cursor = String(payload.cursor || "");
            const limit = Number(payload.limit || 100);
            return {
              items: [
                {
                  ...buildTestSynthesisHostItemSummary({
                    libraryId: 1,
                    itemKey: "PRODUCTION",
                    title: "Production Topic Source",
                  }),
                  paperRef: "1:PRODUCTION",
                  libraryId: 1,
                  itemKey: "PRODUCTION",
                  itemType: "journalArticle",
                  title: "Production Topic Source",
                  year: "2026",
                  metadataHash: "sha256:production-topic-source",
                },
              ],
              cursor,
              nextCursor: "",
              hasMore: false,
              returned: 1,
              limit,
              total: 1,
              snapshotRevision: "workflow-review-input",
            };
          }
          return {};
        },
      },
    });
    try {
      const topicId = "topic-workflow-review-input";
      const applied =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest(topicId),
        );
      assert.equal(applied.status, "persisted");

      const review = await harness.client.workflowReview.getInput({ topicId });
      assert.equal(review.kind, "synthesis.review_workflow_input");
      assert.deepEqual(review.topic.metadata.depends_on, {
        papers: ["1:PRODUCTION"],
        artifacts: ["digest-markdown"],
      });
      assert.equal(
        review.topic_timeline.content.events[0].id,
        "event:lifecycle",
      );
      assert.deepEqual(review.resolved_paper_set.snapshot.papers, [
        { paper_ref: "1:PRODUCTION", match_reasons: [] },
      ]);
      assert.equal(
        review.structured_topic?.metadata?.structured_hash,
        review.structured_topic?.metadata?.artifact_hash,
      );
      assert.equal(
        review.structured_topic?.metadata?.external_literature_count,
        0,
      );
    } finally {
      await harness.stop();
    }
  });

  for (const [paperCount, mode, delayed] of [
    [15, "local", false],
    [16, "local", false],
    [24, "local", true],
    [63, "local", false],
    [64, "local", false],
    [100, "local", false],
    [100, "remote", false],
  ] as const) {
    it(`completes a ${paperCount}-paper artifact export in ${mode} mode${delayed ? " after cumulative Host reads exceed ten seconds" : ""}`, async function () {
      this.timeout(30_000);
      const refs = Array.from(
        { length: paperCount },
        (_, index) => `1:DELAY${String(index).padStart(3, "0")}`,
      );
      let reads = 0;
      let deliveredEntries = 0;
      const harness = await startSynthesisProductionRouteHarness({
        id: "delayed-artifact-export",
        hostFixture: {
          async handle({ capability, payload }) {
            if (capability === "library.items.list_page") {
              return {
                items: [],
                cursor: "",
                nextCursor: "",
                hasMore: false,
                returned: 0,
                limit: 100,
              };
            }
            if (capability === "library.artifacts.scan_page") {
              const descriptors = refs.flatMap((paperRef) =>
                [
                  "digest",
                  "references",
                  "citation_analysis",
                  "literature_score",
                ].map((artifactType) => ({
                  paperRef,
                  artifactType,
                  payloadType:
                    artifactType === "digest"
                      ? "digest-markdown"
                      : `${artifactType.replaceAll("_", "-")}-json`,
                  status: "available",
                  locator: `synthetic:${paperRef}:${artifactType}`,
                  payloadHash: `sha256:${"a".repeat(64)}`,
                  estimatedSize: 100,
                  ...(paperCount === 100
                    ? { noteTitle: "m".repeat(1500) }
                    : {}),
                  diagnostics: [],
                })),
              );
              const offset = Number(payload.cursor || 0);
              const artifacts = descriptors.slice(offset, offset + 100);
              const next = offset + artifacts.length;
              return {
                artifacts,
                cursor: payload.cursor || "",
                nextCursor: next < descriptors.length ? String(next) : "",
                hasMore: next < descriptors.length,
                returned: artifacts.length,
                limit: 100,
              };
            }
            if (capability === "library.artifacts.read") {
              if (++reads === 80 && delayed)
                await new Promise((resolve) => setTimeout(resolve, 10_500));
              return {
                status: "available",
                payloadHash: payload.expectedHash,
                content: {
                  kind: "json",
                  value: {
                    content: "## Summary\nSynthetic paper\n",
                    references: [],
                    report_md:
                      "## Citation report\n### Analysis\nSynthetic citation\n",
                  },
                },
                diagnostics: [],
              };
            }
            if (capability.startsWith("delivery.export.")) {
              const health = await (
                await fetch(
                  `http://127.0.0.1:${harness.port}/synthesis/v1/health`,
                )
              ).json();
              const content = toSynthesisJsonObject(
                await consumeSynthesisSidecarOutputJson({
                  rpcClient: createSynthesisSidecarRpcClient(),
                  connection: {
                    baseUrl: `http://127.0.0.1:${harness.port}`,
                    profileId: "1".repeat(64),
                    clientToken: CLIENT_TOKEN,
                    serviceInstanceId: health.serviceInstanceId,
                  },
                  reference: payload.contentTransfer as never,
                  target: "host_export_entries",
                  capability: "paper_artifacts.export_filtered",
                  cancelAfterRead: false,
                }),
              );
              const entries = content.entries as Array<{
                path: string;
                text: string;
              }>;
              const manifest = JSON.parse(
                entries.find((entry) =>
                  entry.path.endsWith("paper-artifacts-manifest.json"),
                )!.text,
              );
              assert.deepEqual(manifest.paper_refs, refs);
              assert.lengthOf(manifest.papers, paperCount);
              assert.isTrue(
                manifest.papers.every(
                  (paper: { artifacts: unknown[] }) =>
                    paper.artifacts.length === 4,
                ),
              );
              for (const paper of manifest.papers) {
                for (const artifact of paper.artifacts) {
                  const content = entries.find(
                    (entry) => entry.path === artifact.content_file,
                  );
                  assert.exists(content);
                  assert.equal(
                    artifact.content_hash,
                    `sha256:${crypto.createHash("sha256").update(content!.text).digest("hex")}`,
                  );
                }
              }
              deliveredEntries = entries.length;
              if (capability === "delivery.export.publish_archive") {
                return createSynthesisHostExportDeliveryPort({
                  runtimeRoot: harness.root,
                }).publishArchive({
                  capability: "paper_artifacts.export_filtered",
                  displayName: String(payload.displayName),
                  entries,
                });
              }
              return createSynthesisHostRunWorkspaceMaterializationPort({
                runtimeRoot: harness.root,
              }).materialize({
                capability: "paper_artifacts.export_filtered",
                runRoot: String(payload.runRoot),
                entries,
              });
            }
            return {};
          },
        },
      });
      try {
        const runRoot = `${harness.root}/runtime/acp/skill-runs/acp-skill-delayed`;
        if (paperCount === 100 && mode === "local") {
          const manifest = await harness.client.artifacts.getManifest({
            paper_refs: refs,
          });
          assert.equal(manifest.total, 100);
          assert.lengthOf(manifest.papers, 100);
          assert.lengthOf(manifest.artifacts, 400);
          assert.isAbove(
            Buffer.byteLength(JSON.stringify(manifest)),
            1_048_576,
          );
        }
        const result = await harness.client.artifacts.exportFiltered(
          {
            paper_refs: refs,
            ...(mode === "local" ? { run_root: runRoot } : {}),
          },
          { mode },
        );
        assert.deepEqual(result.paper_refs, refs);
        assert.lengthOf(result.artifact_statuses, paperCount * 4);
        assert.equal(deliveredEntries, paperCount * 4 + 1);
        if (mode === "local") {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(runRoot, result.manifest_file), "utf8"),
          );
          assert.deepEqual(manifest.paper_refs, refs);
        } else {
          assert.equal(result.delivery?.mode, "bridge-download");
        }
      } finally {
        await harness.stop();
      }
    });
  }

  it("moves large Topic and artifact content outside the production control envelope", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-content-route-"),
    );
    const hostCalls: string[] = [];
    let publishedEntries: Array<{ path: string; text: string }> = [];
    let maxExportControlBytes = 0;
    const exportTransferSessionIds: string[] = [];
    let rejectNextExportDelivery = false;
    let transferConnection: {
      baseUrl: string;
      profileId: string;
      clientToken: string;
      serviceInstanceId: string;
    } | null = null;
    const transferRpcClient = createSynthesisSidecarRpcClient();
    const largeReferenceTitle = `Transferred reference ${"x".repeat(1_100_000)}`;
    const readExportEntries = async (payload: Record<string, unknown>) => {
      if (!transferConnection)
        throw new Error("transfer connection unavailable");
      const content = toSynthesisJsonObject(
        await consumeSynthesisSidecarOutputJson({
          rpcClient: transferRpcClient,
          connection: transferConnection,
          reference: payload.contentTransfer as never,
          target: "host_export_entries",
          capability: "paper_artifacts.export_filtered",
          cancelAfterRead: false,
        }),
        "$.testExportTransfer",
      );
      return content.entries as Array<{ path: string; text: string }>;
    };
    const reverseHost = http.createServer((request, response) => {
      let source = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        source += chunk;
      });
      request.on("end", async () => {
        const requestCall = JSON.parse(source) as {
          capability: string;
          payload: Record<string, unknown>;
        };
        hostCalls.push(requestCall.capability);
        if (requestCall.capability.startsWith("delivery.export.")) {
          maxExportControlBytes = Math.max(
            maxExportControlBytes,
            Buffer.byteLength(source),
          );
          assert.notProperty(requestCall.payload, "entries");
          exportTransferSessionIds.push(
            String(
              (requestCall.payload.contentTransfer as { sessionId: string })
                .sessionId,
            ),
          );
        }
        let result: Record<string, unknown>;
        if (requestCall.capability === "library.items.list_page") {
          result = {
            items: [],
            cursor: "",
            nextCursor: "",
            hasMore: false,
            returned: 0,
            limit: 500,
            total: 0,
            snapshotRevision: "content-route-library",
          };
        } else if (requestCall.capability === "library.artifacts.scan_page") {
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
                references: [{ title: largeReferenceTitle }],
              },
            },
            diagnostics: [],
          };
        } else if (
          requestCall.capability === "delivery.export.materialize_run_workspace"
        ) {
          const runRoot = String(requestCall.payload.runRoot || "");
          const entries = await readExportEntries(requestCall.payload);
          for (const entry of entries) {
            const target = path.join(runRoot, entry.path);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            fs.writeFileSync(target, entry.text, "utf8");
          }
          result = {
            status: "materialized",
            capability: "paper_artifacts.export_filtered",
            entryCount: entries.length,
          };
        } else if (
          requestCall.capability === "delivery.export.publish_archive"
        ) {
          publishedEntries = await readExportEntries(requestCall.payload);
          result = rejectNextExportDelivery
            ? {
                status: "unavailable",
                capability: "paper_artifacts.export_filtered",
                diagnostics: ["injected_export_delivery_failure"],
              }
            : {
                status: "available",
                capability: "paper_artifacts.export_filtered",
                delivery: {
                  mode: "bridge-download",
                  bundle: {
                    fileId: "file-content-1",
                    sourceKind: "bridge-export",
                    displayName: requestCall.payload.displayName,
                    contentType: "application/zip",
                    size: 1,
                    sha256: `sha256:${"b".repeat(64)}`,
                    createdAt: "2026-08-02T00:00:00.000Z",
                    expiresAt: "2026-08-02T01:00:00.000Z",
                    owner: { capability: "paper_artifacts.export_filtered" },
                  },
                  downloadCommand:
                    "zotero-bridge file download file-content-1 --output paper-artifacts-1_CONTENT1.zip",
                  unpackHint: "unzip paper-artifacts-1_CONTENT1.zip -d .",
                },
                diagnostics: [],
              };
          rejectNextExportDelivery = false;
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
      transferConnection = {
        baseUrl: `http://127.0.0.1:${port}`,
        profileId: "1".repeat(64),
        clientToken: CLIENT_TOKEN,
        serviceInstanceId: health.serviceInstanceId,
      };
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

      const planned = await composition.client.workflowApply.applyTopicPlan({
        kind: "topic_plan",
        operation: "reconcile",
        base_graph_hash: `sha256:${"1".repeat(64)}`,
        library_index_hash: `sha256:${"2".repeat(64)}`,
        topic_actions: [],
        relation_proposals: [],
        coverage_manifest_path: "coverage/large-topic-plan.json",
        recommended_updates: Array.from(
          { length: 250 },
          (_, index) => `${index}:${"x".repeat(3990)}`,
        ),
      });
      assert.equal(planned.status, "conflict");
      assert.lengthOf(planned.recommended_updates, 250);
      assert.notInclude(JSON.stringify(planned), "native-transfer:");

      const artifacts = await composition.client.artifacts.readPaperArtifacts({
        paper_refs: ["1:CONTENT1"],
        artifact_types: ["references"],
      });
      assert.equal(
        (artifacts.artifacts[0].payload as any).padding.length,
        900_000,
      );
      assert.notInclude(JSON.stringify(artifacts), "native-transfer:");

      const runRoot = path.join(
        root,
        "runtime",
        "acp",
        "skill-runs",
        "acp-skill-content-export",
      );
      const localExport = await composition.client.artifacts.exportFiltered(
        {
          run_root: runRoot,
          paper_refs: ["1:CONTENT1"],
          artifact_types: ["references"],
        },
        { mode: "local" },
      );
      assert.notProperty(localExport, "delivery");
      assert.equal(
        localExport.manifest_file,
        "runtime/payloads/paper-artifacts-manifest.json",
      );
      const localManifestText = fs.readFileSync(
        path.join(runRoot, localExport.manifest_file as string),
        "utf8",
      );
      const localManifest = JSON.parse(localManifestText);
      assert.equal(localManifest.schema_version, "1.1.0");
      assert.equal(localManifest.papers[0].paper_ref, "1:CONTENT1");
      assert.match(
        localManifest.papers[0].artifacts[0].content_hash,
        /^sha256:[a-f0-9]{64}$/,
      );
      const referencesPath = localManifest.papers[0].artifacts[0].content_file;
      assert.equal(
        referencesPath,
        "runtime/payloads/artifacts/1_CONTENT1/references.json",
      );
      const localReferencesText = fs.readFileSync(
        path.join(runRoot, referencesPath),
        "utf8",
      );
      assert.equal(
        localManifest.papers[0].artifacts[0].content_hash,
        `sha256:${crypto.createHash("sha256").update(localReferencesText).digest("hex")}`,
      );
      const localReferences = JSON.parse(localReferencesText);
      assert.equal(localReferences.references[0].title, largeReferenceTitle);
      assert.isAbove(Buffer.byteLength(localReferencesText), 1024 * 1024);
      assert.notInclude(hostCalls, "delivery.export.publish_archive");

      const exported = await composition.client.artifacts.exportFiltered(
        { paper_refs: ["1:CONTENT1"], artifact_types: ["references"] },
        { mode: "remote" },
      );
      assert.deepEqual(exported.delivery, {
        mode: "bridge-download",
        bundle: {
          fileId: "file-content-1",
          sourceKind: "bridge-export",
          displayName: "paper-artifacts-1_CONTENT1.zip",
          contentType: "application/zip",
          size: 1,
          sha256: `sha256:${"b".repeat(64)}`,
          createdAt: "2026-08-02T00:00:00.000Z",
          expiresAt: "2026-08-02T01:00:00.000Z",
          owner: { capability: "paper_artifacts.export_filtered" },
        },
        downloadCommand:
          "zotero-bridge file download file-content-1 --output paper-artifacts-1_CONTENT1.zip",
        unpackHint: "unzip paper-artifacts-1_CONTENT1.zip -d .",
      });
      assert.include(hostCalls, "delivery.export.publish_archive");
      assert.deepEqual(
        publishedEntries.map((entry) => entry.path),
        ["runtime/payloads/paper-artifacts-manifest.json", referencesPath],
      );
      assert.equal(publishedEntries[1].text, localReferencesText);
      const remoteManifest = JSON.parse(publishedEntries[0].text);
      delete remoteManifest.exported_at;
      delete localManifest.exported_at;
      assert.deepEqual(remoteManifest, localManifest);
      assert.notInclude(JSON.stringify(exported), "900000");
      assert.isBelow(
        maxExportControlBytes,
        SYNTHESIS_REVERSE_HOST_LIMITS.requestBodyBytes,
      );
      rejectNextExportDelivery = true;
      let rejectedExport: unknown;
      try {
        await composition.client.artifacts.exportFiltered(
          { paper_refs: ["1:CONTENT1"], artifact_types: ["references"] },
          { mode: "remote" },
        );
      } catch (error) {
        rejectedExport = error;
      }
      assert.exists(rejectedExport);
      assert.lengthOf(exportTransferSessionIds, 3);
      for (const sessionId of exportTransferSessionIds) {
        let failure: unknown;
        try {
          await transferRpcClient.call({
            connection: transferConnection,
            capability: "transfer.content",
            payload: { action: "status", sessionId },
            rebuildResult: (value) => value,
          });
        } catch (error) {
          failure = error;
        }
        assert.exists(failure, `${sessionId} must be canceled by Rust`);
      }
      await composition.dispose();
    } finally {
      if (sidecar.child.exitCode === null) {
        await stop(sidecar.child);
      }
      await new Promise<void>((resolve) => reverseHost.close(() => resolve()));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("executes the closed production-operation scenario matrix and captures its real protocol corpus samples", async function () {
    this.timeout(120_000);
    const dataset = createSyntheticSynthesisProductionRouteDataset("2k");
    const collector = createSynthesisProductionRouteSampleCollector();
    const harness = await startSynthesisProductionRouteHarness({
      id: "scenario-matrix-2k",
      onProtocolSample: collector.onSample,
      hostFixture: {
        handle({ capability, payload }) {
          if (capability === "library.evidence.sources") {
            return {
              scope: {
                libraryIds: [1],
                itemRefs: [{ libraryId: 1, key: "MISSING1" }],
              },
              descriptors: [],
              nextCursor: null,
              hasMore: false,
              issues: [],
            };
          }
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
          if (capability === "library.items.get_audit_state") {
            return { states: [] };
          }
          if (capability === "webdav.describe") {
            return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
          }
          if (capability.startsWith("effects.")) {
            return { status: "applied" };
          }
          return { status: "unavailable", diagnostics: [] };
        },
      },
    });
    try {
      const seeded =
        await harness.client.workflowApply.applyTopicSynthesisResult(
          topicApplyRequest("topic:scenario"),
        );
      assert.equal(seeded.status, "persisted");
      const observed = await executeSynthesisProductionRouteScenarios(harness);
      assert.lengthOf(
        observed,
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES.length,
      );
      assert.equal(
        new Set(observed.map(({ operation }) => operation)).size,
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES.length,
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
      // Raw unknown-root-field injection through harness.call reaches production
      // Rust without the TypeScript request gate.
      const injectedRequests = new Map<string, Record<string, unknown>>();
      for (const { capability, request } of collector.samples) {
        const payload = (request as { payload?: unknown } | undefined)?.payload;
        if (
          payload &&
          typeof payload === "object" &&
          !Array.isArray(payload) &&
          !injectedRequests.has(capability)
        ) {
          injectedRequests.set(capability, payload as Record<string, unknown>);
        }
      }
      const rustAdmitted: string[] = [];
      const tsAdmitted: string[] = [];
      for (const [capability, payload] of injectedRequests) {
        const injected = { ...payload, __unexpected: true };
        try {
          rebuildSynthesisProtocolCapabilityDto({
            capability,
            direction: "request",
            value: injected,
          });
          tsAdmitted.push(`${capability}:admitted`);
        } catch (error) {
          if (!(error instanceof SynthesisClientError)) throw error;
          if (error.code !== "invalid_request") {
            tsAdmitted.push(`${capability}:${error.code}`);
          }
        }
        try {
          await harness.call(capability, injected);
          rustAdmitted.push(`${capability}:admitted`);
        } catch (error) {
          const code =
            error instanceof SynthesisClientError
              ? error.code
              : error instanceof SynthesisSidecarRpcError
                ? error.code
                : undefined;
          if (!code) throw error;
          if (code !== "invalid_request") {
            rustAdmitted.push(`${capability}:${code}`);
          }
        }
      }
      const capture = buildSynthesisProductionRouteCorpusCases(
        collector.samples,
      );
      for (const capability of [
        "client.getSynthesisWorkbenchChromeInput",
        "client.getSynthesisWorkbenchSurfaceInput",
      ]) {
        const state = toSynthesisWorkbenchReadState(
          createDefaultSynthesisUiState(),
        );
        for (const malformed of [
          {},
          { registry: state.registry },
          { ...state, unknownRegion: {} },
          { ...state, reader: [] },
        ]) {
          const payload = {
            args: capability.endsWith("SurfaceInput")
              ? ["index", malformed]
              : [malformed],
          };
          assert.throws(
            () =>
              rebuildSynthesisProtocolCapabilityDto({
                capability,
                direction: "request",
                value: payload,
              }),
            SynthesisClientError,
          );
          try {
            await harness.call(capability, payload);
            assert.fail(
              "malformed Workbench state reached a successful projection",
            );
          } catch (error) {
            assert.instanceOf(error, SynthesisSidecarRpcError);
            assert.equal(
              (error as SynthesisSidecarRpcError).code,
              "invalid_request",
            );
          }
        }
      }
      assert.isNotEmpty(capture.cases, JSON.stringify(capture.rejected));
      // Opt-in scratch capture payload for corpus promotion.
      const capturePath = process.env.SYNTHESIS_PROTOCOL_CAPTURE_OUT;
      if (capturePath) {
        fs.mkdirSync(path.dirname(capturePath), { recursive: true });
        fs.writeFileSync(
          capturePath,
          `${JSON.stringify(
            {
              capture,
              injected: [...injectedRequests.keys()].sort(),
              tsAdmitted,
              rustAdmitted,
            },
            null,
            2,
          )}\n`,
          "utf8",
        );
      }
      assert.deepEqual(capture.rejected, []);
      assert.deepEqual(tsAdmitted, []);
      assert.deepEqual(rustAdmitted, []);
      assert.deepEqual(
        inspectSynthesisProductionRouteCorpusCoverage(capture.cases),
        [],
      );
    } finally {
      await harness.stop();
    }
  });

  it("coalesces committed canonical mutations into one WebDAV publication", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "canonical-autosync-coalescing",
      hostFixture: canonicalAutosyncHostFixture(),
    });
    try {
      await harness.client.tags.initializeBuiltinTagPolicy();
      const initial = await harness.client.tags.loadTagVocabulary();
      const offset = harness.recorder.hostCalls.length;
      await harness.client.tags.saveTagVocabulary({
        entries: [
          ...((initial.entries as unknown[]) || []),
          { tag: "topic:autosync", facet: "topic", source: "manual" },
        ],
        aliases: initial.aliases,
        abbrev: initial.abbrev,
        protocol: initial.protocol,
      });
      const updated = await harness.client.tags.updateTagVocabularyEntry({
        originalTag: "topic:autosync",
        tag: "topic:autosync-renamed",
        facet: "topic",
        note: "Second commit inside the debounce window",
      });
      assert.isTrue(updated.mutated);

      const headWrites = await waitForSynthesisProductionRouteEvidence({
        read: () => harness.recorder.hostCalls,
        offset,
        matches: (entry) =>
          entry.capability === "webdav.write_text" &&
          entry.payload.path === "HEAD.json",
        attempts: 1_500,
        intervalMs: 5,
      });
      assert.lengthOf(headWrites, 1);
      assert.lengthOf(
        harness.recorder.hostCalls
          .slice(offset)
          .filter(
            (entry) =>
              entry.capability === "webdav.write_text" &&
              entry.payload.path === "HEAD.json",
          ),
        1,
      );
    } finally {
      await harness.stop();
    }
  });

  it("does not publish canonical commits while WebDAV autosync is disabled", async function () {
    const harness = await startSynthesisProductionRouteHarness({
      id: "canonical-autosync-disabled",
      hostFixture: canonicalAutosyncHostFixture({ autoSyncEnabled: false }),
    });
    try {
      await harness.client.tags.initializeBuiltinTagPolicy();
      const initial = await harness.client.tags.loadTagVocabulary();
      const offset = harness.recorder.hostCalls.length;
      await harness.client.tags.saveTagVocabulary({
        entries: [
          ...((initial.entries as unknown[]) || []),
          { tag: "topic:disabled-autosync", facet: "topic" },
        ],
        aliases: initial.aliases,
        abbrev: initial.abbrev,
        protocol: initial.protocol,
      });
      const descriptions = await waitForSynthesisProductionRouteEvidence({
        read: () => harness.recorder.hostCalls,
        offset,
        matches: (entry) => entry.capability === "webdav.describe",
        attempts: 1_500,
        intervalMs: 5,
      });
      assert.isNotEmpty(descriptions);
      assert.isFalse(
        harness.recorder.hostCalls
          .slice(offset)
          .some((entry) =>
            ["webdav.read_text", "webdav.write_text"].includes(
              entry.capability,
            ),
          ),
      );
    } finally {
      await harness.stop();
    }
  });

  it("preserves a committed canonical mutation when autosync fails remotely", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-canonical-autosync-failure-"),
    );
    let harness = await startSynthesisProductionRouteHarness({
      id: "canonical-autosync-failure",
      root,
      hostFixture: canonicalAutosyncHostFixture({ failRead: true }),
    });
    try {
      await harness.client.tags.initializeBuiltinTagPolicy();
      const initial = await harness.client.tags.loadTagVocabulary();
      const offset = harness.recorder.hostCalls.length;
      await harness.client.tags.saveTagVocabulary({
        entries: [
          ...((initial.entries as unknown[]) || []),
          { tag: "topic:remote-failure", facet: "topic" },
        ],
        aliases: initial.aliases,
        abbrev: initial.abbrev,
        protocol: initial.protocol,
      });
      const reads = await waitForSynthesisProductionRouteEvidence({
        read: () => harness.recorder.hostCalls,
        offset,
        matches: (entry) => entry.capability === "webdav.read_text",
        attempts: 1_500,
        intervalMs: 5,
      });
      assert.isNotEmpty(reads);
      assert.include(
        (
          (await harness.client.tags.loadTagVocabulary()).entries as Array<{
            tag: string;
          }>
        ).map((entry) => entry.tag),
        "topic:remote-failure",
      );
      await harness.stop();

      harness = await startSynthesisProductionRouteHarness({
        id: "canonical-autosync-failure-reopen",
        root,
        hostFixture: canonicalAutosyncHostFixture({ autoSyncEnabled: false }),
      });
      assert.include(
        (
          (await harness.client.tags.loadTagVocabulary()).entries as Array<{
            tag: string;
          }>
        ).map((entry) => entry.tag),
        "topic:remote-failure",
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("excludes no-op and failed mutations and cancels pending autosync on shutdown", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-canonical-autosync-shutdown-"),
    );
    let harness = await startSynthesisProductionRouteHarness({
      id: "canonical-autosync-shutdown",
      root,
      hostFixture: canonicalAutosyncHostFixture(),
    });
    try {
      await harness.client.tags.initializeBuiltinTagPolicy();
      const initial = await harness.client.tags.loadTagVocabulary();
      const offset = harness.recorder.hostCalls.length;
      assert.deepEqual(
        await harness.client.tags.deleteTagVocabularyEntry({
          originalTag: "topic:not-present",
        }),
        { mutated: false, deleted: [] },
      );
      let failed = false;
      try {
        await harness.call("client.saveTagVocabulary", { args: [{}] });
      } catch {
        failed = true;
      }
      assert.isTrue(failed);
      await new Promise((resolve) => setTimeout(resolve, 5_200));
      assert.isFalse(
        harness.recorder.hostCalls
          .slice(offset)
          .some((entry) => entry.capability.startsWith("webdav.")),
      );

      await harness.client.tags.saveTagVocabulary({
        entries: [
          ...((initial.entries as unknown[]) || []),
          { tag: "topic:shutdown-cancellation", facet: "topic" },
        ],
        aliases: initial.aliases,
        abbrev: initial.abbrev,
        protocol: initial.protocol,
      });
      await harness.stop();
      assert.isFalse(
        harness.recorder.hostCalls
          .slice(offset)
          .some((entry) => entry.capability.startsWith("webdav.")),
      );

      harness = await startSynthesisProductionRouteHarness({
        id: "canonical-autosync-shutdown-reopen",
        root,
        hostFixture: canonicalAutosyncHostFixture({ autoSyncEnabled: false }),
      });
      assert.include(
        (
          (await harness.client.tags.loadTagVocabulary()).entries as Array<{
            tag: string;
          }>
        ).map((entry) => entry.tag),
        "topic:shutdown-cancellation",
      );
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("interrupts a public WebDAV retry wait and drains its maintenance controller on shutdown", async function () {
    let firstReadObserved: () => void = () => undefined;
    const firstRead = new Promise<void>((resolve) => {
      firstReadObserved = resolve;
    });
    const harness = await startSynthesisProductionRouteHarness({
      id: "webdav-retry-shutdown-drain",
      hostFixture: {
        handle({ capability }) {
          if (capability === "webdav.describe") {
            return {
              status: "available",
              configStatus: "configured",
              autoSyncEnabled: false,
              autoRetryEnabled: true,
              baseUrl: "https://webdav.invalid",
              remotePath: "zotero-agents",
              username: "",
              credentialUpdatedAt: "",
              diagnostics: [],
            };
          }
          if (capability === "webdav.read_text") {
            firstReadObserved();
            return { status: "unavailable", diagnostics: ["fixture_retry"] };
          }
          return { status: "unavailable", diagnostics: [] };
        },
      },
    });
    try {
      const accepted = await harness.client.sync.webDav.runNow();
      assert.equal(accepted.status, "pending");
      await firstRead;
      await new Promise((resolve) => setTimeout(resolve, 25));

      const stopped = await harness.stopProcess();
      assert.equal(stopped.exitCode, 0, harness.stderr());
      // Parent scheduling and process exit extend beyond the owner's 500 ms cleanup deadline.
      assert.isBelow(stopped.elapsedMs, 2_000, harness.stderr());
      assert.notInclude(harness.stderr(), "service_owner_leaked");
      assert.equal(
        harness.recorder.hostCalls.filter(
          (entry) => entry.capability === "webdav.read_text",
        ).length,
        1,
      );
    } finally {
      await harness.stop();
    }
  });

  it("drains an admitted transfer attempt before removing its session files", async function () {
    const id = "active-transfer-shutdown-drain";
    const harness = await startSynthesisProductionRouteHarness({ id });
    const pages = [
      buildSynthesisCitationGraphBuildTransferPage(
        "library_nodes",
        0,
        Array.from({ length: 8_000 }, (_, index) => ({
          nodeId: `paper:${index}`,
          title: `Shutdown drain fixture ${index} ${"x".repeat(80)}`,
          authors: [],
          aliases: [],
        })),
      ),
      buildSynthesisCitationGraphBuildTransferPage("references", 0, []),
    ];
    const manifest = buildSynthesisCitationGraphBuildTransferManifest({
      direction: "input",
      header: {
        contractVersion: "synthesis-citation-graph-build.v1",
        scope: { kind: "full", sourceIds: [] },
        rolePriority: [],
      },
      pages: pages.map((page) => page.descriptor),
    });
    try {
      const begun = (await harness.call(
        "compute.citation_graph_build_transfer",
        {
          action: "begin",
          idempotencyKey: "active-transfer-shutdown-drain",
          manifest,
        },
      )) as { sessionId: string };
      for (const page of pages) {
        await harness.call("compute.citation_graph_build_transfer", {
          action: "put_input_page",
          sessionId: begun.sessionId,
          page,
        });
      }
      await harness.call("compute.citation_graph_build_transfer", {
        action: "seal_input",
        sessionId: begun.sessionId,
      });
      const execution = (await harness.call(
        "compute.citation_graph_build_transfer",
        { action: "execute", sessionId: begun.sessionId },
      )) as { state: string };
      assert.equal(execution.state, "queued");

      const stopped = await harness.stopProcess();
      assert.equal(stopped.exitCode, 0, harness.stderr());
      assert.isBelow(stopped.elapsedMs, 2_000, harness.stderr());
      assert.isFalse(
        fs.existsSync(
          path.join(
            harness.root,
            "runtime",
            "sessions",
            id,
            "citation-graph-transfer",
          ),
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
      const beforeRejectedRequests = captureDurableState(root);
      for (const [capability, payload] of [
        ["client.getReferenceSidecarIndex", { args: [{ limit: 0 }] }],
        [
          "client.updateCanonicalReferenceMetadata",
          { args: [{ canonicalReferenceId: "canonical:missing", patch: {} }] },
        ],
        [
          "client.saveTagVocabulary",
          {
            args: [
              {
                entries: [{ tag: "topic:invalid", facet: "topic", note: null }],
                aliases: {},
                abbrev: {},
                protocol: null,
              },
            ],
          },
        ],
      ] as const) {
        const rejected = await call(harness.port, capability, payload);
        assert.equal(rejected.body.error?.code, "invalid_request", capability);
        assert.deepEqual(
          captureDurableState(root),
          beforeRejectedRequests,
          capability,
        );
      }
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
        aliases: {},
        abbrev: {},
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
        {
          args: [
            "tags",
            toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
          ],
        },
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
      const databasePath = path.join(root, "state", "synthesis.db");
      const legacyDatabase = new DatabaseSync(databasePath);
      legacyDatabase.exec("BEGIN IMMEDIATE");
      legacyDatabase
        .prepare(
          "INSERT OR REPLACE INTO synt_tag_staged_suggestion(tag,facet,note,source_flow,parent_bindings_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
        )
        .run(
          "method:legacy-binding",
          "method",
          "Legacy numeric binding",
          "legacy-fixture",
          "[42]",
          "2026-08-12T00:00:00.000Z",
          "2026-08-12T00:00:00.000Z",
        );
      legacyDatabase.exec(
        "UPDATE synt_tag_application_state SET staged_revision=staged_revision+1 WHERE singleton_id=1",
      );
      const insertCollidedTag = legacyDatabase.prepare(
        "INSERT INTO synt_tag_vocabulary_entry(tag,facet,note,source,deprecated,replacement,aliases_json,abbrev_json,usage_count,last_synced_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      );
      insertCollidedTag.run(
        "method:ProcessCase",
        "method",
        "startup repair winner",
        "fixture",
        0,
        "",
        "[]",
        "[]",
        1,
        "",
        "2026-08-01T00:00:00.000Z",
        "2026-08-01T00:00:00.000Z",
      );
      insertCollidedTag.run(
        "method:processcase",
        "method",
        "startup repair loser",
        "fixture",
        0,
        "",
        "[]",
        "[]",
        1,
        "",
        "2026-08-02T00:00:00.000Z",
        "2026-08-02T00:00:00.000Z",
      );
      legacyDatabase.exec(
        "CREATE TRIGGER fail_case_repair BEFORE INSERT ON synt_tag_vocabulary_entry BEGIN SELECT RAISE(ABORT, 'fixture'); END",
      );
      legacyDatabase.exec("COMMIT");
      legacyDatabase.close();
      harness = await startSynthesisProductionRouteHarness({
        id: "tag-dto-repair-failure",
        root,
      });
      const failedRepairDatabase = new DatabaseSync(databasePath);
      assert.equal(
        failedRepairDatabase
          .prepare(
            "SELECT status FROM synt_operation WHERE operation_id='tag-vocabulary-case-repair'",
          )
          .get().status,
        "failed",
      );
      assert.equal(
        failedRepairDatabase
          .prepare(
            "SELECT COUNT(*) AS count FROM synt_tag_vocabulary_entry WHERE lower(tag)='method:processcase'",
          )
          .get().count,
        2,
      );
      failedRepairDatabase.close();
      await harness.stop();
      const retryDatabase = new DatabaseSync(databasePath);
      retryDatabase.exec("DROP TRIGGER fail_case_repair");
      retryDatabase.close();
      for (const mode of [
        "malformed-result",
        "typed-error",
        "malformed-error",
      ] as const) {
        harness = await startSynthesisProductionRouteHarness({
          id: `tag-binding-${mode}`,
          root,
          hostFixture: {
            error({ capability }) {
              if (capability !== "effects.staged_tag_binding.resolve")
                return undefined;
              if (mode === "typed-error")
                return {
                  code: "unavailable",
                  details: { reason: "binding_fixture_unavailable" },
                };
              if (mode === "malformed-error") return {};
              return undefined;
            },
            handle({ capability }) {
              if (capability === "webdav.describe")
                return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
              if (capability === "effects.staged_tag_binding.resolve")
                return { resolved: null };
              throw new Error(`unexpected_host_call:${capability}`);
            },
          },
        });
        const operations = await harness.client.debug.listOperations({});
        assert.deepInclude(
          operations.rows.find(
            (row) => row.operationId === "staged-tag-binding-migration",
          ),
          { status: "failed" },
        );
        recordSynthesisReverseHostRequestEvidence(
          harness,
          "effects.staged_tag_binding.resolve",
        );
        if (mode === "malformed-result") {
          recordSynthesisReverseHostResultRejection({
            harness,
            capability: "effects.staged_tag_binding.resolve",
            nativeFailureCode: "reverse_host_result_invalid",
          });
        } else {
          recordSynthesisReverseHostErrorEvidence({
            harness,
            capability: "effects.staged_tag_binding.resolve",
            nativeFailureCode:
              mode === "typed-error"
                ? "binding_fixture_unavailable"
                : "reverse_host_response_envelope_invalid",
          });
        }
        await harness.stop();
        const retained = new DatabaseSync(databasePath, { readOnly: true });
        try {
          assert.equal(
            retained
              .prepare(
                "SELECT parent_bindings_json FROM synt_tag_staged_suggestion WHERE tag='method:legacy-binding'",
              )
              .get()?.parent_bindings_json,
            "[42]",
          );
        } finally {
          retained.close();
        }
      }
      harness = await startSynthesisProductionRouteHarness({
        id: "tag-dto-reopen",
        root,
        hostFixture: {
          handle({ capability, payload }) {
            if (capability === "webdav.describe")
              return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
            if (capability === "effects.staged_tag_binding.resolve") {
              assert.deepEqual(payload, { libraryId: 1, itemIds: [42] });
              return {
                resolved: [
                  {
                    itemId: 42,
                    ref: { libraryId: 1, itemKey: "TAGDTO42" },
                  },
                ],
                missingItemIds: [],
                diagnostics: [],
              };
            }
            if (capability === "effects.tags.apply_batch") {
              return {
                receipts: (
                  payload.effects as Array<Record<string, unknown>>
                ).map((effect) => ({
                  effectId: effect.effectId,
                  action: "ensure_present",
                  status: "applied",
                  occurredAt: "2026-08-12T00:00:01.000Z",
                  diagnostics: [],
                })),
              };
            }
            return { status: "unavailable", diagnostics: [] };
          },
        },
      });
      const reopened = await harness.client.tags.loadTagVocabulary();
      assert.include(
        (reopened.entries as Array<Record<string, unknown>>).map(
          (entry) => entry.tag,
        ),
        "method:ProcessCase",
      );
      assert.notInclude(
        (reopened.entries as Array<Record<string, unknown>>).map(
          (entry) => entry.tag,
        ),
        "method:processcase",
      );
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
      assert.deepInclude(
        (await harness.client.tags.listStagedTagSuggestions()).find(
          (entry) => entry.tag === "method:legacy-binding",
        ),
        {
          tag: "method:legacy-binding",
          parent_bindings: [{ libraryId: 1, itemKey: "TAGDTO42" }],
        },
      );
      assert.deepInclude(
        harness.recorder.hostCalls.find(
          (entry) => entry.capability === "effects.staged_tag_binding.resolve",
        ),
        {
          capability: "effects.staged_tag_binding.resolve",
          payload: { libraryId: 1, itemIds: [42] },
        },
      );
      recordSynthesisReverseHostRequestEvidence(
        harness,
        "effects.staged_tag_binding.resolve",
      );
      recordSynthesisReverseHostResultAcceptance(
        harness,
        "effects.staged_tag_binding.resolve",
      );
      const migratedDatabase = new DatabaseSync(databasePath);
      assert.deepEqual(
        JSON.parse(
          String(
            migratedDatabase
              .prepare(
                "SELECT parent_bindings_json FROM synt_tag_staged_suggestion WHERE tag='method:legacy-binding'",
              )
              .get().parent_bindings_json,
          ),
        ),
        [{ libraryId: 1, itemKey: "TAGDTO42" }],
      );
      assert.equal(
        migratedDatabase
          .prepare(
            "SELECT status FROM synt_operation WHERE operation_id='staged-tag-binding-migration'",
          )
          .get().status,
        "completed",
      );
      migratedDatabase.close();
      assert.deepEqual(
        await harness.client.tags.promoteStagedTagSuggestions({
          tags: ["method:legacy-binding"],
        }),
        { promoted: ["method:legacy-binding"], skipped: [] },
      );
      const repairedWorkbench = (await harness.call(
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "tags",
            toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
          ],
        },
      )) as { tags?: { entries?: Array<Record<string, unknown>> } };
      assert.include(
        repairedWorkbench.tags?.entries?.map((entry) => entry.tag),
        "method:ProcessCase",
      );
      await harness.stop();
      harness = await startSynthesisProductionRouteHarness({
        id: "tag-dto-cold-reopen",
        root,
      });
      assert.include(
        (
          (await harness.client.tags.loadTagVocabulary()).entries as Array<
            Record<string, unknown>
          >
        ).map((entry) => entry.tag),
        "method:ProcessCase",
      );
      await harness.call("client.getSynthesisWorkbenchSurfaceInput", {
        args: [
          "tags",
          toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
        ],
      });
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

      const workbenchComposition = await createProductionRouteNativeComposition(
        port,
        "all-workbench-surfaces",
      );
      try {
        const defaultState = createDefaultSynthesisUiState();
        defaultState.reader.topicId = topicId;
        const state = toSynthesisWorkbenchReadState(defaultState);
        const surfaceSnapshots = [];
        for (const surface of [
          "home",
          "topics",
          "graph",
          "tags",
          "concepts",
          "reader",
        ] as const) {
          const projection = await workbenchComposition.client.workbench
            .readSurface({
              surface,
              state,
            })
            .catch((error) => {
              throw new Error(
                `Workbench ${surface} failed: ${JSON.stringify(error)}`,
                { cause: error },
              );
            });
          surfaceSnapshots.push(
            buildSynthesisUiSnapshot(
              toSynthesisUiSnapshotInput(projection),
              defaultState,
            ),
          );
        }
        for (const activeTab of ["concepts", "topic_graph"] as const) {
          const projection = await workbenchComposition.client.workbench
            .readSurface({
              surface: "review",
              state: {
                ...state,
                reviews: { ...state.reviews, activeTab },
              },
            })
            .catch((error) => {
              throw new Error(
                `Workbench review/${activeTab} failed: ${JSON.stringify(error)}`,
                { cause: error },
              );
            });
          surfaceSnapshots.push(
            buildSynthesisUiSnapshot(
              toSynthesisUiSnapshotInput(projection),
              defaultState,
            ),
          );
        }
        assert.lengthOf(surfaceSnapshots, 8);
        assert.lengthOf(surfaceSnapshots[1].artifacts.rows, 1);
        assert.lengthOf(surfaceSnapshots[1].topicGraph.nodes, 1);
        assert.lengthOf(surfaceSnapshots[4].concepts.rows, 1);
        assert.equal(surfaceSnapshots[5].reader.topicId, topicId);
      } finally {
        await workbenchComposition.dispose();
      }

      const topicProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["topics", workbenchState()] },
      );
      assert.equal(
        topicProjection.status,
        200,
        JSON.stringify(topicProjection.body),
      );
      assert.deepInclude(topicProjection.body.data.artifacts[0], {
        id: topicId,
        title: "Production Topic",
        kind: "topic_synthesis",
        freshness: "fresh",
        source_materials_status: "complete",
        source_materials_percent: 100,
      });
      assert.deepInclude(topicProjection.body.data.topicGraph.nodes[0], {
        topic_id: topicId,
        title: "Production Topic",
        node_type: "materialized",
        definition_status: "has_synthesis",
      });
      assert.lengthOf(
        buildSynthesisUiSnapshot(topicProjection.body.data).artifacts.rows,
        1,
      );
      assert.lengthOf(
        buildSynthesisUiSnapshot(topicProjection.body.data).topicGraph.nodes,
        1,
      );

      const conceptProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["concepts", workbenchState()] },
      );
      assert.equal(conceptProjection.status, 200);
      assert.deepInclude(conceptProjection.body.data.concepts.concepts[0], {
        label: "Production concept",
        aliases: ["Durable concept", "Production concept"],
        concept_type: "method",
        domain: "information-science",
      });
      assert.isNotEmpty(
        conceptProjection.body.data.concepts.concepts[0].concept_id,
      );
      assert.lengthOf(
        buildSynthesisUiSnapshot(conceptProjection.body.data).concepts.rows,
        1,
      );

      const conceptReviewProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "review",
            workbenchState({
              reviews: {
                activeTab: "concepts",
                status: "open",
                kind: "all",
                confidence: "all",
                search: "",
              },
            }),
          ],
        },
      );
      assert.equal(conceptReviewProjection.status, 200);
      assert.property(conceptReviewProjection.body.data, "concepts");
      assert.notNestedProperty(
        conceptReviewProjection.body.data,
        "reviews.concept",
      );
      assert.lengthOf(
        conceptReviewProjection.body.data.concepts.reviewItems,
        1,
      );
      assert.lengthOf(
        buildSynthesisUiSnapshot(conceptReviewProjection.body.data).concepts
          .reviewItems,
        1,
      );

      const topicGraphReviewProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "review",
            workbenchState({
              reviews: {
                activeTab: "topic_graph",
                status: "open",
                kind: "all",
                confidence: "all",
                search: "",
              },
            }),
          ],
        },
      );
      assert.equal(topicGraphReviewProjection.status, 200);
      assert.property(topicGraphReviewProjection.body.data, "topicGraph");
      assert.notNestedProperty(
        topicGraphReviewProjection.body.data,
        "reviews.topicGraph",
      );
      assert.lengthOf(
        buildSynthesisUiSnapshot(topicGraphReviewProjection.body.data)
          .topicGraph.nodes,
        0,
      );
      assert.equal(
        topicGraphReviewProjection.body.data.reviews.summary.conceptCount,
        1,
      );

      const missingConceptReview = await call(
        port,
        "client.applyConceptReviewAction",
        { args: [{ reviewId: "review:missing", action: "reject" }] },
      );
      assert.equal(missingConceptReview.status, 503);

      const missingReferenceReview = await call(
        port,
        "client.applyReferenceMatchProposalAction",
        { args: [{ proposalId: "proposal:missing", action: "accept" }] },
      );
      assert.equal(missingReferenceReview.status, 200);
      assert.equal(
        missingReferenceReview.body.data.diagnostic?.code,
        "reference_match_proposal_missing",
      );

      const missingTopicGraphEdge = await call(
        port,
        "client.acceptTopicGraphRelation",
        { args: [{ edgeId: "edge:missing" }] },
      );
      assert.equal(missingTopicGraphEdge.status, 503);

      const missingTopicGraphReview = await call(
        port,
        "client.applyTopicGraphReviewAction",
        { args: [{ reviewId: "review:missing", action: "reject" }] },
      );
      assert.equal(missingTopicGraphReview.status, 503);

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
        { args: ["topics", workbenchState()] },
      );
      assert.lengthOf(deletedProjection.body.data.artifacts, 0);
      assert.lengthOf(deletedProjection.body.data.deletedArtifacts.rows, 1);
      assert.deepInclude(deletedProjection.body.data.deletedArtifacts.rows[0], {
        topic_id: topicId,
        title: "Production Topic",
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
        { args: ["home", workbenchState()] },
      );
      assert.lengthOf(reopenedProjection.body.data.artifacts, 0);
      assert.deepInclude(
        reopenedProjection.body.data.deletedArtifacts.rows[0],
        {
          topic_id: topicId,
          title: "Production Topic",
        },
      );
      const reopenedConceptProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["concepts", workbenchState()] },
      );
      assert.equal(
        reopenedConceptProjection.body.data.concepts.concepts[0].label,
        "Production concept",
      );

      const rebuilt = await call(port, "client.applyTopicSynthesisResult", {
        args: [topicApplyRequest(topicId)],
      });
      assert.equal(rebuilt.status, 200, JSON.stringify(rebuilt.body));
      assert.equal(rebuilt.body.data.status, "persisted");
      const coexistProjection = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        { args: ["topics", workbenchState()] },
      );
      assert.lengthOf(coexistProjection.body.data.artifacts, 1);
      assert.lengthOf(coexistProjection.body.data.topicGraph.nodes, 1);
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
        { args: ["topics", workbenchState()] },
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

  it("reads available persisted coordinates only when stale layouts are allowed", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-stale-layout-read-"),
    );
    let harness = await startSynthesisProductionRouteHarness({
      id: "stale-layout-initialize",
      root,
    });
    const graphHash = `sha256:${"a".repeat(64)}`;
    const nodeIds = ["1:LAYOUTAA", "1:LAYOUTBB", "1:LAYOUTCC"];
    const points = {
      [nodeIds[0]]: { x: 1, y: 2 },
      [nodeIds[1]]: { x: 3, y: 4 },
    };
    const cases = [
      { key: "partial", status: "ready", hash: graphHash, points, count: 2 },
      { key: "stale", status: "stale", hash: "old-graph", points, count: 2 },
      { key: "outdated", status: "ready", hash: "old-graph", points, count: 2 },
      {
        key: "invalid-point",
        status: "stale",
        hash: "old-graph",
        points: { ...points, [nodeIds[2]]: { x: "invalid", y: null } },
        count: 2,
      },
      {
        key: "empty",
        status: "stale",
        hash: "old-graph",
        points: {},
        count: 0,
      },
      {
        key: "complete",
        status: "ready",
        hash: graphHash,
        points: { ...points, [nodeIds[2]]: { x: 5, y: 6 } },
        count: 3,
      },
      {
        key: "old-coverage",
        status: "ready",
        hash: graphHash,
        points: { ...points, [nodeIds[2]]: { x: 5, y: 6 } },
        count: 3,
        version: 2,
      },
    ];
    try {
      await harness.stop();
      const database = new DatabaseSync(
        path.join(root, "state", "synthesis.db"),
      );
      try {
        database
          .prepare(
            `INSERT INTO synt_citation_graph_application_state
           (singleton_id,graph_hash,input_hash,node_count,edge_count)
           VALUES ('active',?,'input:layout',3,2)`,
          )
          .run(graphHash);
        for (const nodeId of nodeIds) {
          database
            .prepare(
              `INSERT INTO synt_citation_node(literature_item_id,has_zotero_binding,title)
             VALUES (?,1,?)`,
            )
            .run(nodeId, nodeId);
        }
        for (let index = 0; index < 2; index += 1) {
          database
            .prepare(
              `INSERT INTO synt_citation_edge
             (edge_id,source_literature_item_id,target_literature_item_id,reference_instance_id,edge_status)
             VALUES (?,?,?,?,'accepted')`,
            )
            .run(
              `edge:${index}`,
              nodeIds[index],
              nodeIds[index + 1],
              `ref:${index}`,
            );
        }
        for (const entry of cases) {
          database
            .prepare(
              `INSERT INTO synt_citation_layout_state
             (layout_key,view_key,preset,graph_hash,status,layout_json)
             VALUES (?,?,'force',?,?,?)`,
            )
            .run(
              `${entry.key}:force`,
              entry.key,
              entry.hash,
              entry.status,
              JSON.stringify({
                layout_version: entry.version ?? 3,
                layout_hash: `layout:${entry.key}`,
                nodes: entry.points,
              }),
            );
        }
      } finally {
        database.close();
      }
      harness = await startSynthesisProductionRouteHarness({
        id: "stale-layout-read",
        root,
      });
      for (const entry of cases) {
        const request = { viewKey: entry.key, nodeIds, preset: "force" };
        const strict = (await harness.call("client.getCitationGraphLayout", {
          args: [request],
        })) as SynthesisCitationGraphLayoutReadResult;
        assert.equal(
          strict.status,
          entry.count === 3 && !entry.version ? "ready" : "stale",
          entry.key,
        );
        assert.lengthOf(
          strict.nodes,
          entry.count === 3 && !entry.version ? 3 : 0,
          entry.key,
        );
        const allowed = (await harness.call("client.getCitationGraphLayout", {
          args: [{ ...request, allowStale: true }],
        })) as SynthesisCitationGraphLayoutReadResult;
        assert.equal(
          allowed.status,
          entry.count === 3 && !entry.version ? "ready" : "stale",
          entry.key,
        );
        assert.equal(
          allowed.ok,
          entry.count === 3 && !entry.version,
          entry.key,
        );
        assert.lengthOf(allowed.nodes, entry.count, entry.key);
        assert.lengthOf(allowed.edges, Math.max(0, entry.count - 1), entry.key);
        for (const node of allowed.nodes) {
          assert.deepEqual(
            [node.x, node.y],
            {
              [nodeIds[0]]: [1, 2],
              [nodeIds[1]]: [3, 4],
              [nodeIds[2]]: [5, 6],
            }[node.node_id],
          );
        }
      }
      for (const depth of [1, 2]) {
        const slice = (await harness.call("client.getCitationGraphSlice", {
          args: [
            {
              paperRef: nodeIds[0],
              depth,
              direction: "outgoing",
              maxNodes: 100,
              maxEdges: 200,
            },
          ],
        })) as SynthesisCitationGraphSliceResult;
        const layout = (await harness.call("client.getCitationGraphLayout", {
          args: [
            {
              viewKey: "complete",
              paperRef: nodeIds[0],
              depth,
              direction: "outgoing",
              maxNodes: 100,
              maxEdges: 200,
            },
          ],
        })) as SynthesisCitationGraphLayoutReadResult;
        assert.equal(slice.diagnostics.depth, depth);
        assert.deepEqual(
          slice.nodes.map((node) => node.node_id),
          nodeIds.slice(0, depth + 1),
        );
        assert.deepEqual(
          layout.nodes.map((node) => node.node_id),
          slice.nodes.map((node) => node.node_id),
        );
        assert.deepEqual(
          layout.edges.map((edge) => edge.edge_id),
          slice.edges.map((edge) => edge.edge_id),
        );
      }
    } finally {
      await harness.stop();
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
          result = SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
        } else if (call.capability === "library.items.sync_snapshot") {
          result = buildTestSynthesisLibrarySnapshotPage({ items: [] });
        } else if (call.capability === "library.items.list_page") {
          result = {
            items: [
              {
                ...buildTestSynthesisHostItemSummary({
                  libraryId: 1,
                  itemKey: "HOSTREF1",
                  title: "Reverse Host Reference",
                }),
                paperRef: "1:HOSTREF1",
                libraryId: 1,
                itemKey: "HOSTREF1",
                itemType: "journalArticle",
                title: "Reverse Host Reference",
                year: "2026",
                metadataHash: "sha256:hostref1",
              },
              {
                ...buildTestSynthesisHostItemSummary({
                  libraryId: 1,
                  itemKey: "HOSTREF2",
                  title: "Reverse Host Reference Two",
                }),
                paperRef: "1:HOSTREF2",
                libraryId: 1,
                itemKey: "HOSTREF2",
                itemType: "journalArticle",
                title: "Reverse Host Reference Two",
                year: "2026",
                metadataHash: "sha256:hostref2",
              },
              {
                ...buildTestSynthesisHostItemSummary({
                  libraryId: 1,
                  itemKey: "HOSTREF3",
                  title: "Reverse Host Reference Three",
                }),
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
            total: 3,
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
        } else if (call.capability === "library.artifacts.readiness") {
          result = {
            artifacts: [
              {
                paperRef: "1:HOSTREF1",
                artifactType: "references",
                payloadType: "references-json",
                status: "available",
                diagnostics: [],
              },
              {
                paperRef: "1:HOSTREF1",
                artifactType: "literature_score",
                payloadType: "literature-score-json",
                status: "available",
                diagnostics: [],
                literatureQuality: {
                  status: "available",
                  schema: "literature_score.v1",
                  rubric_id: "default-v1",
                  paper_type: "empirical",
                  overall_score: 68,
                  confidence: 0.8,
                  confidence_adjusted_score: 64.4,
                  quality_prior: 0.644,
                  diagnostics: [],
                },
              },
            ],
          };
        } else if (call.capability === "library.artifacts.read") {
          const smallReference = String(call.payload.expectedHash).includes(
            "hostref3",
          );
          const referenceId = smallReference
            ? "host-reference:hostref3"
            : "host-reference:shared";
          const artifact = canonicalReferenceArtifact([
            {
              sourceReferenceId: referenceId,
              title: smallReference
                ? "Small expanded reference"
                : "Shared expanded reference",
              year: null,
              authors: ["研究者"],
              raw: smallReference
                ? "Small expanded reference"
                : `共享引用 ${"文献".repeat(1_500)}`,
            },
          ]);
          if (!smallReference) {
            // Exercise a large response while each canonical field stays within its limit.
            Object.assign(
              artifact.references[0].bibliography,
              Object.fromEntries(
                [
                  "publicationTitle",
                  "conferenceName",
                  "university",
                  "archiveID",
                  "volume",
                  "issue",
                  "pages",
                  "place",
                  "publisher",
                  "date",
                ].map((field) => [field, "文".repeat(65_536)]),
              ),
            );
          }
          result = {
            status: "available",
            payloadHash: call.payload.expectedHash,
            content: {
              kind: "json",
              value: artifact,
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
            workbenchState({
              registry: {
                scope: "library",
                expandedSourceRefs: [],
              },
            }),
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
        "partial",
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
            workbenchState({
              registry: {
                scope: "library",
                expandedSourceRefs: [],
              },
            }),
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
      const [refresh, replayedRetry] = await Promise.all([
        call(port, "client.controlPublicMaintenanceOperation", retryRequest),
        call(port, "client.controlPublicMaintenanceOperation", retryRequest),
      ]);
      assert.equal(refresh.status, 200, JSON.stringify(refresh.body));
      assert.notEqual(
        refresh.body.data.operation_id,
        canceledRefresh.body.data.operation_id,
      );
      assert.equal(
        replayedRetry.status,
        200,
        JSON.stringify(replayedRetry.body),
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
      assert.equal(
        refreshCompleted.receipt.schema,
        "synthesis.maintenance_receipt.v1",
        JSON.stringify(refreshCompleted),
      );
      assert.equal(
        refreshCompleted.receipt.outcome,
        "completed",
        JSON.stringify(refreshCompleted),
      );
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
        matchingCompleted.receipt.schema,
        "synthesis.maintenance_receipt.v1",
        JSON.stringify(matchingCompleted),
      );
      assert.equal(
        matchingCompleted.receipt.outcome,
        "completed",
        JSON.stringify(matchingCompleted),
      );

      const referenceReviewSurface = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "review",
            workbenchState({
              reviews: {
                activeTab: "reference_matching",
                status: "open",
                kind: "all",
                confidence: "all",
                search: "",
                limit: 25,
              },
            }),
          ],
        },
      );
      assert.equal(referenceReviewSurface.status, 200);
      assert.isArray(referenceReviewSurface.body.data.registry.matchProposals);
      assert.isArray(
        referenceReviewSurface.body.data.registry.cleanupProposals,
      );
      assert.notNestedProperty(
        referenceReviewSurface.body.data,
        "reviews.reference",
      );
      referenceReviewSurface.body.data.registry.matchProposals.forEach(
        (proposal: Record<string, unknown>) => {
          assert.isString(proposal.proposal_id);
          assert.notProperty(proposal, "proposalId");
        },
      );

      const indexReviewSurface = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            workbenchState({
              registry: {
                scope: "library",
                expandedSourceRefs: [],
              },
            }),
          ],
        },
      );
      assert.equal(indexReviewSurface.status, 200);
      assert.notProperty(
        indexReviewSurface.body.data.registry,
        "matchProposals",
      );
      assert.notProperty(
        indexReviewSurface.body.data.registry,
        "cleanupProposals",
      );

      const chrome = await call(
        port,
        "client.getSynthesisWorkbenchChromeInput",
        {
          args: [
            toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
          ],
        },
      );
      assert.equal(chrome.status, 200);
      assert.equal(chrome.body.data.maintenance.summary.status, "partial");
      assert.isArray(chrome.body.data.maintenance.backgroundJobs);
      assert.notProperty(chrome.body.data.maintenance, "cacheReadiness");

      const artifactScansBeforeIndex = reverseHostCalls.filter(
        (capability) => capability === "library.artifacts.scan_page",
      ).length;
      const readinessCallsBeforeIndex = reverseHostCalls.filter(
        (capability) => capability === "library.artifacts.readiness",
      ).length;
      const workbenchIndex = await call(
        port,
        "client.getSynthesisWorkbenchSurfaceInput",
        {
          args: [
            "index",
            workbenchState({
              registry: {
                scope: "library",
                expandedSourceRefs: ["1:HOSTREF3"],
              },
            }),
          ],
        },
      );
      assert.equal(workbenchIndex.status, 200);
      assert.equal(
        reverseHostCalls.filter(
          (capability) => capability === "library.artifacts.scan_page",
        ).length,
        artifactScansBeforeIndex,
        "Workbench Index must not request artifact payload scans",
      );
      assert.equal(
        reverseHostCalls.filter(
          (capability) => capability === "library.artifacts.readiness",
        ).length,
        readinessCallsBeforeIndex + 1,
        "Workbench Index must read Host artifact readiness for the displayed page",
      );
      assert.equal(
        workbenchIndex.body.data.registry.cacheStatus.status,
        "ready",
      );
      assert.lengthOf(workbenchIndex.body.data.registry.rows, 3);
      assert.deepInclude(workbenchIndex.body.data.registry.rows[0], {
        library_id: 1,
        item_key: "HOSTREF1",
        paper_ref: "1:HOSTREF1",
        artifactCoverage: "partial",
        reference_count: 1,
        unbound_reference_count: 1,
      });
      assert.equal(workbenchIndex.body.data.registry.rows[0].ratingScore, 68);
      assert.deepEqual(
        workbenchIndex.body.data.registry.rows[0].missing_artifacts,
        ["digest", "citation_analysis"],
      );
      assert.notProperty(
        workbenchIndex.body.data.registry.rows[0],
        "references",
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
            workbenchState({
              registry: {
                scope: "library",
                expandedSourceRefs: [],
              },
            }),
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
          args: [
            "graph",
            workbenchState({ graph: { layoutAlgorithm: "force" } }),
          ],
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

      const graphComposition = await createProductionRouteNativeComposition(
        port,
        "nonempty-workbench-graph",
      );
      try {
        const nativeGraph = await graphComposition.client.workbench.readSurface(
          {
            surface: "graph",
            state: toSynthesisWorkbenchReadState(
              createDefaultSynthesisUiState(),
            ),
          },
        );
        const nativeGraphSnapshot = buildSynthesisUiSnapshot(
          toSynthesisUiSnapshotInput(nativeGraph),
        );
        assert.isAbove(nativeGraphSnapshot.graph.visibleNodes.length, 0);
        assert.isAbove(nativeGraphSnapshot.graph.visibleEdges.length, 0);
      } finally {
        graphComposition.dispose();
      }

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
        {
          args: [
            "graph",
            workbenchState({ graph: { layoutAlgorithm: "force" } }),
          ],
        },
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
          {
            args: [
              "graph",
              workbenchState({ graph: { layoutAlgorithm: "force" } }),
            ],
          },
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

  it("migrates native WebDAV millisecond state during startup reconciliation", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-webdav-timestamp-migration-"),
    );
    const statePath = path.join(root, "state", "native-webdav-state.json");
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(
      statePath,
      JSON.stringify({
        schema_id: "synthesis.webdav_sync_state",
        schema_version: "1.0.0",
        queue_state: "disabled",
        paused: false,
        adapter_configured: false,
        config_status: "disabled",
        base_url: "",
        remote_path: "zotero-agents",
        username: "",
        credential_updated_at: "",
        connection_test: null,
        retry_attempt: 0,
        next_retry_at: "",
        last_phase: "",
        progress: null,
        last_run: null,
        conflict_report: null,
        diagnostics: [
          {
            code: "webdav_sync_disabled",
            severity: "info",
            message: "webdav_sync_disabled",
          },
        ],
        allowed_actions: [],
        conflict_actions: [],
        updated_at: "1785602031063",
      }),
    );
    const hostFixture = {
      handle({ capability }: { capability: string }) {
        if (capability === "webdav.describe") {
          return {
            status: "disabled",
            configStatus: "disabled",
            autoSyncEnabled: false,
            autoRetryEnabled: false,
            baseUrl: "",
            remotePath: "zotero-agents",
            username: "",
            diagnostics: ["webdav_sync_disabled"],
          };
        }
        return { status: "unavailable", diagnostics: [] };
      },
    };

    try {
      const first = await startSynthesisProductionRouteHarness({
        id: "webdav-timestamp-migration-first",
        root,
        hostFixture,
      });
      try {
        const reconciled = (await first.call(
          "client.reconcileSynthesisRuntimeWorkStateOnStartup",
          { args: [] },
        )) as Record<string, any>;
        assert.equal(reconciled.status, "ready");
        assert.equal(reconciled.webdav.queue_state, "disabled");
        assert.isFalse(reconciled.webdav.adapter_configured);
      } finally {
        await first.stop();
      }

      const persisted = JSON.parse(fs.readFileSync(statePath, "utf8")) as {
        updated_at: string;
      };
      assert.match(
        persisted.updated_at,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );

      const reopened = await startSynthesisProductionRouteHarness({
        id: "webdav-timestamp-migration-reopen",
        root,
        hostFixture,
      });
      try {
        const reconciled = (await reopened.call(
          "client.reconcileSynthesisRuntimeWorkStateOnStartup",
          { args: [] },
        )) as Record<string, any>;
        assert.equal(reconciled.status, "ready");
        assert.equal(reconciled.webdav.queue_state, "disabled");
      } finally {
        await reopened.stop();
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("admits and materializes a production literature apply with a large string", async function () {
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-digest-route-"),
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
          payload: { paperRefs?: string[] };
        };
        const result =
          call.capability === "library.items.get_by_ref"
            ? {
                items: (call.payload.paperRefs || []).map((paperRef) => ({
                  ...buildTestSynthesisHostItemSummary({
                    libraryId: 1,
                    itemKey: "TARGET01",
                    title: "Target",
                  }),
                  paperRef,
                  libraryId: 1,
                  itemKey: "TARGET01",
                  itemType: "journalArticle",
                  title: "Target",
                  year: "2025",
                  citekey: "target2025",
                })),
                missingPaperRefs: [],
              }
            : SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
        const body = JSON.stringify({
          ok: true,
          result,
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
        content: `# Digest\n${"文".repeat(65_536 - "# Digest\n".length)}`,
      },
      references: canonicalReferenceArtifact([
        {
          sourceReferenceId: "digest-reference:target",
          title: "Target",
          year: 2025,
          authors: ["Researcher"],
          matching: { citekey: "target2025" },
        },
      ]),
      citationAnalysis: canonicalCitationAnalysisArtifact([
        "digest-reference:target",
      ]),
      literatureMatchingMetadata: {
        schema: "synthesis.literature_matching_metadata.v1",
        key_terms: ["Large request"],
        methods: [],
        problems: [],
        datasets: [],
        exclude_terms: [],
      },
      matchedReferences: [
        {
          library_id: 1,
          item_key: "TARGET01",
        },
      ],
    };
    rebuildSynthesisProtocolCapabilityDto({
      capability: "client.applyLiteratureDigestSidecar",
      direction: "request",
      value: { args: [request] },
    });
    assert.isAbove(Buffer.byteLength(request.digest.content), 64 * 1024);
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

  it("plans and applies Related Items effects after a successful incremental Graph refresh", async function () {
    this.timeout(120_000);
    const executionIdentity = synthesisProtocolExecutionIdentity()!;
    const itemFieldRejections = new Map<
      string,
      { field: string; value: unknown; obligationId: string }
    >();
    const itemDefinitions = reverseHostSchema.$defs as Record<string, any>;
    for (const [field, property] of Object.entries(
      itemDefinitions.LibraryItem.properties as Record<string, any>,
    )) {
      const resolved = property.$ref
        ? itemDefinitions[property.$ref.split("/").at(-1)]
        : property;
      const ref = property.$ref
        ? `schemas/reverse-host.schema.json${property.$ref}`
        : `schemas/reverse-host.schema.json#/$defs/LibraryItem/properties/${field}`;
      for (const [kind, value] of [
        ["type:" + resolved.type, null],
        ["minLength", resolved.minLength ? "" : undefined],
        [
          "minimum",
          resolved.minimum === undefined ? undefined : resolved.minimum - 1,
        ],
        [
          "maxLength",
          resolved.maxLength === undefined
            ? undefined
            : "x".repeat(resolved.maxLength + 1),
        ],
        [
          "maxItems",
          resolved.maxItems === undefined
            ? undefined
            : Array.from({ length: resolved.maxItems + 1 }, () => "x"),
        ],
        [
          "maximum",
          resolved.maximum === undefined ? undefined : resolved.maximum + 1,
        ],
      ] as const) {
        if (value === undefined) continue;
        itemFieldRejections.set(`bound:${field}:${kind}`, {
          field,
          value,
          obligationId: `${ref}::${kind}:reject`,
        });
      }
    }
    for (const [name, field, value, obligationId] of [
      [
        "unknown",
        "__unexpected",
        true,
        "schemas/reverse-host.schema.json#/$defs/LibraryItem::unknown-key:reject",
      ],
      [
        "item-key-pattern",
        "itemKey",
        "!",
        "schemas/reverse-host.schema.json#/$defs/ItemKey::pattern:reject",
      ],
      [
        "array-entry-bound",
        "creators",
        ["x".repeat(reverseHostSchema.$defs.StringArray.items.maxLength + 1)],
        "schemas/reverse-host.schema.json#/$defs/StringArray/items::maxLength:reject",
      ],
      [
        "array-entry-type",
        "creators",
        [null],
        "schemas/reverse-host.schema.json#/$defs/StringArray/items::type:string:reject",
      ],
    ] as const) {
      itemFieldRejections.set(name, { field, value, obligationId });
    }
    const effectPayloads: Array<Record<string, unknown>> = [];
    let injection = "success";
    let itemInjection = "success";
    let listItemInjection = "success";
    const mutateItem = (item: Record<string, unknown>, mode: string) => {
      if (mode.startsWith("missing:"))
        delete item[mode.slice("missing:".length)];
      const rejection = itemFieldRejections.get(mode);
      if (rejection) item[rejection.field] = rejection.value;
      if (mode === "unicode-title-limit")
        item.title = "😀".repeat(
          reverseHostSchema.$defs.LibraryItem.properties.title.maxLength,
        );
      return item;
    };
    const capability = "effects.related_items.apply_batch";
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-rust-related-items-route-"),
    );
    let harness = await startSynthesisProductionRouteHarness({
      id: "related-items-initial",
      root,
      hostFixture: {
        error({ capability: current }) {
          if (current === "library.items.get_by_ref") {
            if (itemInjection === "typed-error")
              return {
                code: "unavailable",
                details: { reason: "items_fixture_unavailable" },
              };
            if (itemInjection === "malformed-error") return {};
          }
          if (current !== capability) return undefined;
          if (injection === "typed-error")
            return {
              code: "unavailable",
              details: { reason: "related_items_fixture_unavailable" },
            };
          if (injection === "malformed-error") return {};
          return undefined;
        },
        handle({ capability, payload }) {
          if (capability === "webdav.describe")
            return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
          if (capability === "library.items.list_page") {
            const items = ["SOURCE01", "TARGET01", "TARGET02"].map((itemKey) =>
              mutateItem(
                {
                  ...buildTestSynthesisHostItemSummary({
                    libraryId: 1,
                    itemKey,
                    title: itemKey,
                  }),
                  paperRef: `1:${itemKey}`,
                  libraryId: 1,
                  itemKey,
                  itemType: "journalArticle",
                  title: itemKey,
                  year: "2026",
                  metadataHash: `sha256:${itemKey.toLowerCase()}`,
                },
                listItemInjection,
              ),
            );
            return {
              items,
              cursor: "",
              nextCursor: "",
              hasMore: false,
              returned: items.length,
              limit: payload.limit ?? 100,
              total: items.length,
              snapshotRevision: "related-items-route",
            };
          }
          if (capability === "library.items.get_by_ref") {
            if (itemInjection === "malformed-result")
              return { items: "invalid", missingPaperRefs: [] };
            const requested = (payload.paperRefs as string[]) || [];
            const items = requested.map((paperRef) => {
              const itemKey = paperRef.split(":")[1];
              const item: Record<string, unknown> = {
                paperRef,
                libraryId: 1,
                itemKey,
                itemType: "journalArticle",
                title: itemKey,
                year: "2026",
                date: "2026",
                creators: ["Synthetic author"],
                tags: [],
                collections: [],
                doi: "",
                arxiv: "",
                isbn: "",
                url: "",
                citekey: "",
                dateAdded: "2026-01-01",
                metadataHash: `sha256:${itemKey.toLowerCase()}`,
              };
              return mutateItem(item, itemInjection);
            });
            return { items, missingPaperRefs: [] };
          }
          if (capability === "effects.related_items.apply_batch") {
            effectPayloads.push(payload);
            if (injection === "malformed-result") return { receipts: [] };
            return {
              receipts: (payload.effects as Array<Record<string, unknown>>).map(
                (effect) => ({
                  effectId: effect.effectId,
                  action: effect.action,
                  status: "applied",
                  occurredAt: new Date().toISOString(),
                  diagnostics: [],
                }),
              ),
            };
          }
          return { status: "unavailable", diagnostics: [] };
        },
      },
    });
    const apply = (targets: string[], revision: string) =>
      harness.client.workflowApply.applyLiteratureDigestSidecar({
        libraryId: 1,
        itemKey: "SOURCE01",
        paperRef: "1:SOURCE01",
        itemType: "journalArticle",
        title: "Source",
        year: "2026",
        date: "2026-08-12",
        creators: ["Researcher"],
        tags: [],
        collections: [],
        doi: "",
        arxiv: "",
        isbn: "",
        url: "",
        citekey: "source2026",
        dateAdded: "2026-08-12",
        references: canonicalReferenceArtifact(
          targets.map((target, index) => ({
            sourceReferenceId: `related-items:${revision}:${index}`,
            title: target,
            year: 2026,
          })),
        ),
        citationAnalysis: canonicalCitationAnalysisArtifact(
          targets.map((_, index) => `related-items:${revision}:${index}`),
        ),
        matchedReferences: targets.map((target) => ({
          library_id: 1,
          item_key: target,
        })),
      });
    try {
      await apply(["TARGET01"], "related-items-v1");
      const rebuild = await harness.client.graph.rebuildCitationGraphCacheNow();
      const rebuilt = await waitForMaintenanceOperation(
        harness.port,
        rebuild.operation_id,
      );
      assert.equal(rebuilt.status, "completed", JSON.stringify(rebuilt));
      assert.deepEqual(effectPayloads, []);

      await apply(["TARGET01", "TARGET02"], "related-items-v2");
      const refresh =
        await harness.client.graph.refreshCitationGraphCacheIncrementalNow();
      const refreshed = await waitForMaintenanceOperation(
        harness.port,
        refresh.operation_id,
      );
      assert.equal(refreshed.status, "completed", JSON.stringify(refreshed));
      assert.deepEqual(refreshed.receipt.affected_source_refs, ["1:SOURCE01"]);
      assert.equal(refreshed.receipt.related_items_sync.processed, 2);
      assert.equal(refreshed.receipt.related_items_sync.failed, 0);
      assert.lengthOf(effectPayloads, 1);
      assert.lengthOf(effectPayloads[0].effects as unknown[], 2);
      recordSynthesisReverseHostRequestEvidence(
        harness,
        "library.items.get_by_ref",
      );
      recordSynthesisReverseHostResultAcceptance(
        harness,
        "library.items.get_by_ref",
      );
      recordSynthesisReverseHostRequestEvidence(harness, capability);
      recordSynthesisReverseHostResultAcceptance(harness, capability);

      const database = new DatabaseSync(
        path.join(root, "state", "synthesis.db"),
      );
      const effects = database
        .prepare(
          "SELECT effect_id,payload_json FROM synt_related_items_sync_effect ORDER BY effect_id",
        )
        .all() as Array<{ effect_id: string; payload_json: string }>;
      assert.lengthOf(effects, 2);
      assert.isTrue(
        effects.every(
          (row) => JSON.parse(row.payload_json).status === "applied",
        ),
      );
      const operation = database
        .prepare(
          "SELECT status FROM synt_operation WHERE operation_type='related_items_sync' ORDER BY updated_at DESC LIMIT 1",
        )
        .get() as { status: string };
      assert.equal(operation.status, "completed");
      database.close();

      const consumeEcho = (relatedItemKey: string) =>
        harness.client.notifications.consumeRelatedItemsSyncEcho({
          libraryId: 1,
          itemKey: "SOURCE01",
          relatedItemKey,
        });
      assert.isFalse((await consumeEcho("UNRELATED")).consumed);
      assert.isTrue((await consumeEcho("TARGET01")).consumed);
      assert.isFalse((await consumeEcho("TARGET01")).consumed);
      assert.isTrue((await consumeEcho("TARGET02")).consumed);

      injection = "malformed-result";
      await apply(["TARGET02"], "related-items-v3");
      const failedEffects =
        await harness.client.graph.refreshCitationGraphCacheIncrementalNow();
      const graphCommitted = await waitForMaintenanceOperation(
        harness.port,
        failedEffects.operation_id,
      );
      assert.equal(graphCommitted.status, "completed");
      assert.isAbove(graphCommitted.receipt.related_items_sync.failed, 0);
      assert.include(
        graphCommitted.receipt.related_items_sync.diagnostics,
        "related_items_host_batch_failed",
      );
      recordSynthesisReverseHostResultRejection({
        harness,
        capability,
        nativeFailureCode: "related_items_host_batch_failed",
      });
      const graph = await harness.client.graph.getOverview({ limit: 50 });
      assert.deepEqual(
        graph.edges.map((edge) => [edge.source, edge.target]),
        [["1:SOURCE01", "1:TARGET02"]],
        "a bad Host receipt must not roll back the committed graph",
      );
      for (const [mode, target] of [
        ["typed-error", "TARGET01"],
        ["malformed-error", "TARGET02"],
      ]) {
        injection = mode;
        await apply([target], `related-items-${mode}`);
        const admitted =
          await harness.client.graph.refreshCitationGraphCacheIncrementalNow();
        const terminal = await waitForMaintenanceOperation(
          harness.port,
          admitted.operation_id,
        );
        assert.equal(terminal.status, "completed");
        assert.isAbove(terminal.receipt.related_items_sync.failed, 0);
        const failureCode = String(
          harness
            .observations()
            .filter(
              (event) =>
                event.boundary === "reverse-host" &&
                event.phase === "call-failed" &&
                event.identities?.capability === capability,
            )
            .at(-1)?.code || "",
        );
        assert.equal(
          failureCode,
          mode === "typed-error"
            ? "related_items_fixture_unavailable"
            : "reverse_host_response_envelope_invalid",
        );
        recordSynthesisReverseHostErrorEvidence({
          harness,
          capability,
          nativeFailureCode: failureCode,
        });
        const committed = await harness.client.graph.getOverview({ limit: 50 });
        assert.deepEqual(
          committed.edges.map((edge) => [edge.source, edge.target]),
          [["1:SOURCE01", `1:${target}`]],
        );
      }
      const previousGraph = await harness.client.graph.getOverview({
        limit: 50,
      });
      for (const mode of [
        "malformed-result",
        ...itemFieldRejections.keys(),
        ...reverseHostSchema.$defs.LibraryItem.required.map(
          (field) => `missing:${field}`,
        ),
        "typed-error",
        "malformed-error",
      ]) {
        itemInjection = "success";
        await apply(["TARGET01"], `get-by-ref-${mode}`);
        itemInjection = mode;
        const admitted =
          await harness.client.graph.refreshCitationGraphCacheIncrementalNow();
        const terminal = await waitForMaintenanceOperation(
          harness.port,
          admitted.operation_id,
        );
        assert.equal(
          terminal.status,
          "failed",
          `${mode}:${JSON.stringify(terminal)}`,
        );
        assert.isFalse(terminal.receipt.state_changed);
        if (
          mode === "malformed-result" ||
          itemFieldRejections.has(mode) ||
          mode.startsWith("missing:")
        ) {
          assert.include(
            terminal.receipt.diagnostics.map(
              (entry: { code: string }) => entry.code,
            ),
            "reverse_host_result_invalid",
          );
          recordSynthesisReverseHostResultRejection({
            harness,
            capability: "library.items.get_by_ref",
            nativeFailureCode: "reverse_host_result_invalid",
          });
          if (mode.startsWith("missing:")) {
            appendSynthesisProtocolExecutionEvidence(
              executionIdentity,
              `structure:schemas/reverse-host.schema.json#/$defs/LibraryItem::required:${mode.slice("missing:".length)}:reject`,
              "verified",
            );
          }
          const rejection = itemFieldRejections.get(mode);
          if (rejection)
            appendSynthesisProtocolExecutionEvidence(
              executionIdentity,
              `structure:${rejection.obligationId}`,
              "verified",
            );
        } else {
          const failureCode = String(
            harness
              .observations()
              .filter(
                (event) =>
                  event.boundary === "reverse-host" &&
                  event.phase === "call-failed" &&
                  event.identities?.capability === "library.items.get_by_ref",
              )
              .at(-1)?.code || "",
          );
          assert.equal(
            failureCode,
            mode === "typed-error"
              ? "items_fixture_unavailable"
              : "reverse_host_response_envelope_invalid",
          );
          recordSynthesisReverseHostErrorEvidence({
            harness,
            capability: "library.items.get_by_ref",
            nativeFailureCode: failureCode,
          });
        }
        const retained = await harness.client.graph.getOverview({ limit: 50 });
        assert.deepEqual(retained.edges, previousGraph.edges);
      }
      itemInjection = "success";
      for (const mode of ["missing:title", "bound:title:maxLength"]) {
        listItemInjection = mode;
        const admitted =
          await harness.client.graph.rebuildCitationGraphCacheNow();
        const terminal = await waitForMaintenanceOperation(
          harness.port,
          admitted.operation_id,
        );
        assert.equal(
          terminal.status,
          "failed",
          `${mode}:${JSON.stringify(terminal)}`,
        );
        assert.isFalse(terminal.receipt.state_changed);
        assert.include(
          terminal.receipt.diagnostics.map(
            (entry: { code: string }) => entry.code,
          ),
          "reverse_host_result_invalid",
        );
        recordSynthesisReverseHostResultRejection({
          harness,
          capability: "library.items.list_page",
          nativeFailureCode: "reverse_host_result_invalid",
        });
        assert.deepEqual(
          (await harness.client.graph.getOverview({ limit: 50 })).edges,
          previousGraph.edges,
        );
      }
      listItemInjection = "success";
      itemInjection = "unicode-title-limit";
      await apply(["TARGET01"], "get-by-ref-unicode-title-limit");
      const unicodeRefresh =
        await harness.client.graph.refreshCitationGraphCacheIncrementalNow();
      const unicodeTerminal = await waitForMaintenanceOperation(
        harness.port,
        unicodeRefresh.operation_id,
      );
      assert.equal(
        unicodeTerminal.status,
        "completed",
        JSON.stringify(unicodeTerminal),
      );
      recordSynthesisReverseHostResultAcceptance(
        harness,
        "library.items.get_by_ref",
      );
      appendSynthesisProtocolExecutionEvidence(
        executionIdentity,
        "structure:schemas/reverse-host.schema.json#/$defs/LibraryItem/properties/title::length-unicode:max:accept",
        "verified",
      );
      await harness.stop();
      harness = await startSynthesisProductionRouteHarness({
        id: "related-items-reopen",
        root,
      });
      const reopened = new DatabaseSync(
        path.join(root, "state", "synthesis.db"),
      );
      const recoveredEffects = reopened
        .prepare(
          "SELECT effect_id,payload_json FROM synt_related_items_sync_effect",
        )
        .all() as Array<{ effect_id: string; payload_json: string }>;
      assert.includeMembers(
        recoveredEffects.map((row) => row.effect_id),
        effects.map((row) => row.effect_id),
      );
      assert.isTrue(
        recoveredEffects.some(
          (row) =>
            JSON.parse(row.payload_json).status === "pending_external_write",
        ),
        "the failed Host batch remains recoverable across reopen",
      );
      reopened.close();
      const executed = new Set(
        readSynthesisProtocolExecutionEvidence().map(
          (entry) => `${entry.slot}:${entry.outcome}`,
        ),
      );
      for (const part of ["result", "error"]) {
        for (const outcome of ["accepted", "rejected"]) {
          assert.isTrue(
            executed.has(
              `effects.related_items.apply_batch:${part}:${outcome}`,
            ),
            `${part}:${outcome}`,
          );
        }
      }
      for (const part of ["result", "error"]) {
        for (const outcome of ["accepted", "rejected"]) {
          assert.isTrue(
            executed.has(`library.items.get_by_ref:${part}:${outcome}`),
            `get_by_ref:${part}:${outcome}`,
          );
        }
      }
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("allows Reference refresh Host reads to use the maintenance deadline", async function () {
    this.timeout(60_000);
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const harness = await startSynthesisProductionRouteHarness({
      id: "reference-refresh-slow-host-read",
      hostFixture: {
        async handle({ capability, payload }) {
          if (capability === "library.items.sync_snapshot")
            return buildTestSynthesisLibrarySnapshotPage({ items: [] });
          const cursor = String(payload.cursor || "");
          const limit = Number(payload.limit || 100);
          if (capability === "library.items.list_page") {
            return {
              items: [],
              cursor,
              nextCursor: "",
              hasMore: false,
              returned: 0,
              limit,
              total: 0,
              snapshotRevision: "slow-reference-refresh",
            };
          }
          if (capability === "library.artifacts.scan_page") {
            await new Promise((resolve) => setTimeout(resolve, 10_500));
            return {
              artifacts: [],
              cursor,
              nextCursor: "",
              hasMore: false,
              returned: 0,
              limit,
              snapshotRevision: "slow-reference-refresh",
            };
          }
          if (capability === "webdav.describe") {
            return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
          }
          return { status: "unavailable", diagnostics: [] };
        },
      },
    });
    try {
      const refresh = await call(
        harness.port,
        "client.refreshReferenceSidecarNow",
        { args: [] },
      );
      assert.equal(refresh.status, 200, JSON.stringify(refresh.body));
      const completed = await waitForMaintenanceOperation(
        harness.port,
        refresh.body.data.operation_id,
        800,
      );
      assert.equal(completed.status, "completed", JSON.stringify(completed));
    } finally {
      await harness.stop();
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
            ? SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION
            : call.capability === "library.items.sync_snapshot"
              ? buildTestSynthesisLibrarySnapshotPage({ items: [] })
              : call.capability === "library.items.list_page"
                ? {
                    items: [],
                    cursor,
                    nextCursor: "",
                    hasMore: false,
                    returned: 0,
                    limit,
                    total: 0,
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
      assert.equal(
        completed.receipt.schema,
        "synthesis.maintenance_receipt.v1",
        JSON.stringify(completed),
      );
      assert.equal(
        completed.receipt.outcome,
        "completed",
        JSON.stringify(completed),
      );

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
            toSynthesisWorkbenchReadState(createDefaultSynthesisUiState()),
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

  it("replays one public maintenance request without duplicating its worker or Host reads", async function () {
    this.timeout(60_000);
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    let releaseItems: () => void = () => undefined;
    const itemsReleased = new Promise<void>((resolve) => {
      releaseItems = resolve;
    });
    let observeItems: () => void = () => undefined;
    const itemsObserved = new Promise<void>((resolve) => {
      observeItems = resolve;
    });
    const harness = await startSynthesisProductionRouteHarness({
      id: "maintenance-request-replay",
      hostFixture: {
        async handle({ capability, payload }) {
          if (capability === "library.items.sync_snapshot")
            return buildTestSynthesisLibrarySnapshotPage({ items: [] });
          const cursor = String(payload.cursor || "");
          const limit = Number(payload.limit || 100);
          if (capability === "library.items.list_page") {
            observeItems();
            await itemsReleased;
            return {
              items: [],
              cursor,
              nextCursor: "",
              hasMore: false,
              returned: 0,
              limit,
              total: 0,
              snapshotRevision: "maintenance-replay-items",
            };
          }
          if (capability === "library.artifacts.scan_page") {
            return {
              artifacts: [],
              cursor,
              nextCursor: "",
              hasMore: false,
              returned: 0,
              limit,
              snapshotRevision: "maintenance-replay-artifacts",
            };
          }
          if (capability === "webdav.describe") {
            return SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION;
          }
          return { status: "unavailable", diagnostics: [] };
        },
      },
    });
    const requestId = "maintenance-request-replay-fixed";
    try {
      const firstPromise = call(
        harness.port,
        "client.refreshReferenceSidecarNow",
        { args: [] },
        undefined,
        requestId,
      );
      await itemsObserved;
      const replayPromise = call(
        harness.port,
        "client.refreshReferenceSidecarNow",
        { args: [] },
        undefined,
        requestId,
      );
      const [first, replay] = await Promise.all([firstPromise, replayPromise]);
      releaseItems();
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.equal(replay.status, 200, JSON.stringify(replay.body));
      assert.equal(replay.body.data.operation_id, first.body.data.operation_id);
      const terminal = await waitForMaintenanceOperation(
        harness.port,
        first.body.data.operation_id,
      );
      assert.equal(terminal.status, "completed", JSON.stringify(terminal));

      const terminalReplay = await call(
        harness.port,
        "client.refreshReferenceSidecarNow",
        { args: [] },
        undefined,
        requestId,
      );
      assert.equal(
        terminalReplay.status,
        200,
        JSON.stringify(terminalReplay.body),
      );
      assert.equal(
        terminalReplay.body.data.operation_id,
        first.body.data.operation_id,
      );
      assert.equal(terminalReplay.body.data.status, "completed");
      assert.equal(
        harness.recorder.hostCalls.filter(
          (entry) => entry.capability === "library.items.list_page",
        ).length,
        1,
      );
      assert.equal(
        harness.recorder.hostCalls.filter(
          (entry) => entry.capability === "library.artifacts.scan_page",
        ).length,
        1,
      );
      assert.equal(
        harness
          .observations()
          .filter(
            (event) =>
              event.phase === "maintenance-started" &&
              event.identities?.operation === first.body.data.operation_id,
          ).length,
        1,
      );
      assert.equal(
        harness
          .observations()
          .filter(
            (event) =>
              event.phase === "maintenance-terminal" &&
              event.identities?.operation === first.body.data.operation_id,
          ).length,
        1,
      );
    } finally {
      releaseItems();
      await harness.stop();
    }
  });

  it("reconciles every persisted operation across bounded restart pages", async function () {
    this.timeout(60_000);
    assert.isTrue(fs.existsSync(EXECUTABLE), "Rust sidecar must be built");
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-maintenance-restart-pages-"),
    );
    let harness = await startSynthesisProductionRouteHarness({
      id: "maintenance-restart-initialize",
      root,
    });
    try {
      await harness.stop();
      const databasePath = path.join(root, "state", "synthesis.db");
      const database = new DatabaseSync(databasePath);
      const insert = database.prepare(
        `INSERT INTO synt_operation(
           operation_id,operation_type,status,phase,basis_kind,basis_value,
           source_hash,diagnostics_json,created_at,updated_at
         ) VALUES(?,?,?,?,?,?,?,?,?,?)`,
      );
      database.exec("BEGIN IMMEDIATE");
      for (let index = 0; index < 1_001; index += 1) {
        const suffix = String(index).padStart(4, "0");
        insert.run(
          `maintenance:pending:${suffix}`,
          "client.syncWebDavNow",
          "pending",
          "accepted",
          "public_maintenance_operation",
          JSON.stringify({
            capability: "client.syncWebDavNow",
            args: [],
            deadlineMs: 1_800_000,
            sourceHash: `sha256:pending-${suffix}`,
          }),
          `sha256:pending-${suffix}`,
          "[]",
          "2026-08-11T00:00:00.000Z",
          "2026-08-11T00:00:00.000Z",
        );
        insert.run(
          `maintenance:completed:${suffix}`,
          "client.rebuildCitationGraphCacheNow",
          "completed",
          "completed",
          "public_maintenance_operation",
          "{}",
          `sha256:completed-${suffix}`,
          "[]",
          "2026-08-12T00:00:00.000Z",
          "2026-08-12T00:00:00.000Z",
        );
      }
      insert.run(
        "maintenance:running:restart",
        "client.syncWebDavNow",
        "running",
        "running",
        "public_maintenance_operation",
        "{}",
        "sha256:running-public",
        "[]",
        "2026-08-11T00:00:00.000Z",
        "2026-08-11T00:00:00.000Z",
      );
      insert.run(
        "generic:running:restart",
        "fixture_generic_operation",
        "running",
        "running",
        "fixture",
        "",
        "sha256:running-generic",
        "[]",
        "2026-08-11T00:00:00.000Z",
        "2026-08-11T00:00:00.000Z",
      );
      database.exec("COMMIT");
      database.close();

      harness = await startSynthesisProductionRouteHarness({
        id: "maintenance-restart-reopen",
        root,
      });
      const reopened = new DatabaseSync(databasePath);
      const pending = reopened
        .prepare(
          `SELECT COUNT(*) AS count FROM synt_operation
           WHERE basis_kind='public_maintenance_operation'
             AND status='pending' AND phase='continuation_required'`,
        )
        .get() as { count: number };
      assert.equal(pending.count, 1_001);
      const publicRunning = reopened
        .prepare(
          `SELECT status,phase,diagnostics_json FROM synt_operation
           WHERE operation_id='maintenance:running:restart'`,
        )
        .get() as {
        status: string;
        phase: string;
        diagnostics_json: string;
      };
      assert.equal(publicRunning.status, "failed");
      assert.equal(publicRunning.phase, "restart_reconciliation_failed");
      assert.include(
        publicRunning.diagnostics_json,
        "restart_external_effect_unknown",
      );
      const genericRunning = reopened
        .prepare(
          `SELECT status,phase,diagnostics_json FROM synt_operation
           WHERE operation_id='generic:running:restart'`,
        )
        .get() as {
        status: string;
        phase: string;
        diagnostics_json: string;
      };
      assert.equal(genericRunning.status, "canceled");
      assert.equal(genericRunning.phase, "service_restart");
      assert.include(
        genericRunning.diagnostics_json,
        "synthesis_operation_stale_after_restart",
      );
      const terminalRows = reopened
        .prepare(
          `SELECT COUNT(*) AS count FROM synt_operation
           WHERE operation_id LIKE 'maintenance:completed:%'
             AND status='completed' AND phase='completed'
             AND updated_at='2026-08-12T00:00:00.000Z'`,
        )
        .get() as { count: number };
      assert.equal(terminalRows.count, 1_001);
      reopened.close();

      const continueRequest = {
        args: [
          {
            action: "continue",
            operation_id: "maintenance:pending:0000",
          },
        ],
      };
      const [firstContinue, duplicateContinue] = await Promise.all([
        call(
          harness.port,
          "client.controlPublicMaintenanceOperation",
          continueRequest,
        ),
        call(
          harness.port,
          "client.controlPublicMaintenanceOperation",
          continueRequest,
        ),
      ]);
      assert.equal(
        firstContinue.status,
        200,
        JSON.stringify(firstContinue.body),
      );
      assert.equal(
        duplicateContinue.status,
        200,
        JSON.stringify(duplicateContinue.body),
      );
      assert.equal(
        firstContinue.body.data.operation_id,
        duplicateContinue.body.data.operation_id,
      );
      const continued = await waitForMaintenanceOperation(
        harness.port,
        "maintenance:pending:0000",
      );
      assert.equal(continued.status, "completed", JSON.stringify(continued));
      const continuationEvents = harness
        .observations()
        .filter(
          (event) => event.identities?.operation === "maintenance:pending:0000",
        );
      assert.equal(
        continuationEvents.filter(
          (event) => event.phase === "maintenance-started",
        ).length,
        0,
      );
      assert.equal(
        continuationEvents.filter(
          (event) => event.phase === "maintenance-running",
        ).length,
        1,
      );
      assert.equal(
        continuationEvents.filter(
          (event) => event.phase === "maintenance-terminal",
        ).length,
        1,
      );

      for (const operationId of [
        "maintenance:pending:0000",
        "maintenance:pending:1000",
        "maintenance:running:restart",
      ]) {
        const receipt = await call(
          harness.port,
          "client.getPublicMaintenanceOperation",
          { args: [{ operation_id: operationId }] },
        );
        assert.equal(receipt.status, 200, JSON.stringify(receipt.body));
        assert.notEqual(receipt.body.data.status, "not_found");
      }
    } finally {
      await harness.stop();
      fs.rmSync(root, { recursive: true, force: true });
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
          result: SYNTHESIS_DISABLED_WEBDAV_DESCRIPTION,
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
      const topics = await call(port, "client.listTopics", {
        args: [{ cursor: "", limit: 50 }],
      });
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
          { args: [{ cursor: "", limit: 50 }] },
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
