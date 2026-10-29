import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { runLoggedProcess } from "../../scripts/test-run-report";
import {
  SynthesisClientError,
  canonicalizeSynthesisContractJsonArtifact,
  countSynthesisContractJsonNodes,
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisProtocolDto,
  rebuildSynthesisReverseHostPayload,
  rebuildSynthesisReverseHostResult,
  type SynthesisReverseHostCapability,
} from "../../packages/synthesis-contracts/src";
import {
  appendSynthesisProtocolExecutionEvidence,
  synthesisProtocolExecutionIdentity,
  appendSynthesisProtocolObservation,
} from "../../scripts/synthesis/synthesisProtocolExecutionEvidence";
import registry from "../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json" with { type: "json" };
import type {
  SynthesisProductionRouteHostCall,
  SynthesisProductionRouteHarness,
} from "./synthesisProductionRouteHarness";
import {
  inspectSynthesisProtocolStructureCoverage,
  type StructureCoverageInput,
} from "../../scripts/synthesis/synthesisProtocolStructureCoverage";

const REVERSE_HOST_SCHEMA =
  "https://zotero-agents.local/synthesis/sidecar-protocol/v1/reverse-host.schema.json";

function composedDecoderCases(
  input: StructureCoverageInput,
  roots: ReadonlySet<string>,
) {
  const fixtures = new Map<string, (typeof input.corpus)[number][]>();
  for (const entry of input.corpus) {
    if (!entry.valid) continue;
    const ref = input.resolveSchema(entry.schemaRef)?.canonicalRef;
    if (ref) fixtures.set(ref, [...(fixtures.get(ref) || []), entry]);
  }
  const composed = new Map<string, (typeof input.corpus)[number]>();
  for (const seed of input.corpus) {
    if (!seed.valid || !roots.has(seed.schemaRef)) continue;
    const root = input.resolveSchema(seed.schemaRef)!;
    const visit = (
      rule: unknown,
      file: string,
      value: unknown,
      location: string[],
      ancestors: ReadonlySet<string>,
    ) => {
      if (!rule || typeof rule !== "object") return;
      const node = rule as Record<string, any>;
      if (typeof node.$ref === "string") {
        const resolved = input.resolveSchema(node.$ref, file);
        if (!resolved || ancestors.has(resolved.canonicalRef)) return;
        for (const fixture of fixtures.get(resolved.canonicalRef) || []) {
          if (isDeepStrictEqual(value, fixture.value)) continue;
          let candidate = structuredClone(seed.value) as any;
          if (!location.length) candidate = structuredClone(fixture.value);
          else {
            let parent = candidate;
            for (const part of location.slice(0, -1)) parent = parent?.[part];
            if (!parent || typeof parent !== "object") continue;
            parent[location.at(-1)!] = structuredClone(fixture.value);
          }
          if (!input.validate(seed.schemaRef, candidate).valid) continue;
          const key = JSON.stringify([seed.schemaRef, candidate]);
          composed.set(key, {
            ...seed,
            id: `${seed.id}:composed:${fixture.id}:${location.join("/")}`,
            value: candidate,
          });
        }
        visit(
          resolved.node,
          resolved.relativePath,
          value,
          location,
          new Set([...ancestors, resolved.canonicalRef]),
        );
      }
      for (const branch of ["oneOf", "anyOf", "allOf"])
        for (const child of node[branch] || [])
          visit(child, file, value, location, ancestors);
      if (value && typeof value === "object" && !Array.isArray(value))
        for (const [name, child] of Object.entries(node.properties || {}))
          visit(
            child,
            file,
            (value as any)[name],
            [...location, name],
            ancestors,
          );
      if (Array.isArray(value)) {
        for (const [index, child] of (node.prefixItems || []).entries())
          visit(
            child,
            file,
            value[index],
            [...location, String(index)],
            ancestors,
          );
        if (node.items && typeof node.items === "object")
          visit(node.items, file, value[0], [...location, "0"], ancestors);
      }
    };
    visit(root.node, root.relativePath, seed.value, [], new Set());
  }
  return [...composed.values()];
}

function sealedWorkerSection(value: unknown) {
  const page = structuredClone(value) as any;
  if (
    !Array.isArray(page?.rows) ||
    !page?.descriptor ||
    typeof page.descriptor !== "object" ||
    Array.isArray(page.descriptor)
  )
    return page;
  const rows = canonicalizeSynthesisContractJsonArtifact(page.rows);
  if (
    rows.byteLength > 4 * 1024 * 1024 ||
    page.rows.length > 100_000 ||
    countSynthesisContractJsonNodes(page.rows) > 100_000
  )
    return undefined;
  Object.assign(page.descriptor, {
    rowCount: page.rows.length,
    byteLength: rows.byteLength,
    sha256: rows.sha256,
  });
  return page;
}

function sealedTransferRequest(value: unknown) {
  const request = structuredClone(value) as any;
  if (request?.action !== "put_input_page" || request.page === undefined)
    return request;
  const page = sealedWorkerSection(request.page);
  return page === undefined ? undefined : { ...request, page };
}

function canonicalArrayBoundary(value: unknown) {
  // Probe arrays may repeat the same object; wire JSON has independent rows.
  const artifact = JSON.parse(JSON.stringify(value)) as Record<string, any>;
  let mentionIndex = 0;
  for (const [index, reference] of (artifact.references || []).entries())
    reference.sourceReferenceId = `boundary-reference-${index}`;
  for (const item of artifact.items || [])
    for (const mention of item.mentions || [])
      mention.mention_id = `boundary-mention-${mentionIndex++}`;
  for (const mention of artifact.unresolved || [])
    mention.mention_id = `boundary-mention-${mentionIndex++}`;
  return artifact;
}

const canonicalFields = new Map([
  ["source-reference-artifact.schema.json", "references"],
  ["citation-analysis-artifact.schema.json", "citationAnalysis"],
  ["literature-score-artifact.schema.json", "literatureScore"],
]);

function canonicalWireOutcome(
  input: StructureCoverageInput,
  schemaRef: string,
  value: unknown,
) {
  const capability = "client.applyLiteratureDigestSidecar";
  const contract = registry.capabilities.find(
    (entry) => entry.capability === capability,
  )!;
  const seed = input.corpus.find(
    (entry) => entry.valid && entry.schemaRef === contract.requestSchemaRef,
  );
  if (!seed) throw new Error("canonical_wire_seed_missing");
  const request = structuredClone(seed.value) as {
    args: Record<string, unknown>[];
  };
  for (const field of canonicalFields.values()) delete request.args[0][field];
  const field = canonicalFields.get(schemaRef.split("/").at(-1)!);
  if (!field) throw new Error("canonical_wire_field_missing");
  request.args[0][field] = value;
  try {
    rebuildSynthesisProtocolCapabilityDto({
      capability,
      direction: "request",
      value: request,
    });
    return true;
  } catch (error) {
    if (
      !(error instanceof SynthesisClientError) ||
      error.code !== "invalid_request"
    )
      throw error;
    return false;
  }
}

/** Replays shared root samples through the existing private Rust tests. */
export type SynthesisProductionDecoderDriver = {
  capabilities: string[];
  package: string;
  test: string;
  prefix: string;
  part: "request" | "result";
  rejection: string | null;
  schemas?: string[];
  argumentPath?: string;
  component?: boolean;
  caseStream?: boolean;
  envelopeOnly?: boolean;
  workerPages?: boolean;
  transferPages?: boolean;
  transferControls?: boolean;
  rowsArrayCodec?: boolean;
  transferArrayCodec?: boolean;
  canonicalArtifacts?: boolean;
};

export function synthesisProductionDecoderDrivers(): SynthesisProductionDecoderDriver[] {
  return [
    {
      capabilities: ["compute.citation_graph_build_transfer"],
      package: "synthesis-sidecar",
      test: "runtime_transfer::tests::shared_row_arrays_use_the_production_transfer_decoder",
      prefix: "SYNTHESIS_TRANSFER_ARRAY_CODEC",
      part: "request",
      rejection: "invalid_request",
      transferArrayCodec: true,
    },
    {
      capabilities: [
        "client.syncWebDavNow",
        "client.pauseWebDavSync",
        "client.resumeWebDavSync",
        "client.retryWebDavSync",
        "client.resolveWebDavSyncConflict",
        "client.getPublicMaintenanceOperation",
        "client.controlPublicMaintenanceOperation",
        "client.reconcileSynthesisRuntimeWorkStateOnStartup",
        "client.resetSynthesisDatabase",
        "client.debugSynthesisCleanInstallReset",
      ],
      package: "synthesis-sidecar",
      test: "runtime_webdav_maintenance_surface::tests::shared_requests_use_the_production_maintenance_decoder",
      prefix: "SYNTHESIS_MAINTENANCE_REQUEST_CODEC",
      part: "request",
      rejection: "invalid_request",
      argumentPath: "/args",
    },
    {
      capabilities: [
        "client.applyTopicPlan",
        "client.appendTagAuditRun",
        "client.applyTopicSynthesisResult",
      ],
      package: "synthesis-sidecar",
      test: "runtime_production_client::dispatch_integration_tests::shared_transfer_controls_use_the_production_decoder",
      prefix: "SYNTHESIS_CLIENT_TRANSFER_CODEC",
      part: "request",
      rejection: "invalid_request",
      argumentPath: "/args",
      transferControls: true,
    },
    ...[
      {
        package: "synthesis-concept-kb",
        prefix: "SYNTHESIS_CONCEPT_SECTION_CODEC",
        operations: ["concept_kb_index.v1", "concept_kb_query.v1"],
      },
      {
        package: "synthesis-citation-graph-build",
        prefix: "SYNTHESIS_GRAPH_SECTION_CODEC",
        operations: [
          "citation_graph_build.v1",
          "citation_graph_build_transfer.v1",
        ],
      },
    ].flatMap((driver) => {
      const common = {
        ...driver,
        capabilities: [],
        schemas: [
          ...new Set(
            registry.workers
              .filter((worker) => driver.operations.includes(worker.operation))
              .map((worker) => worker.inputSectionSchemaRef),
          ),
        ],
        component: true,
        part: "request" as const,
        rejection: "invalid_request",
      };
      return [
        {
          ...common,
          workerPages: true,
          test: "tests::shared_input_sections_use_the_production_page_receiver",
        },
        {
          ...common,
          rowsArrayCodec: true,
          prefix: driver.prefix.replace("SECTION", "ARRAY"),
          test: "tests::shared_row_arrays_use_the_production_typed_decoder",
        },
      ];
    }),
    {
      capabilities: [
        "system.handshake",
        "system.shutdown",
        "topics.canonical.inspect",
        "workbench.chrome.read",
      ],
      package: "synthesis-sidecar",
      test: "runtime_capabilities::tests::shared_requests_use_the_production_system_decoder",
      prefix: "SYNTHESIS_SYSTEM_REQUEST_CODEC",
      part: "request",
      rejection: "invalid_request",
    },
    {
      capabilities: [
        "client.listTopics",
        "client.findTopicsByPaperRef",
        "client.readTopicDetail",
        "client.getTopicReport",
        "client.deleteTopicArtifact",
        "client.listWorkflowTopicOptions",
        "client.getTopicContext",
        "client.resolveResolver",
        "client.applyTopicPlan",
        "client.applyTopicSynthesisResult",
        "client.applyLiteratureDigestSidecar",
        "client.getSynthesisWorkbenchChromeInput",
        "client.getSynthesisWorkbenchSurfaceInput",
        "client.rejectTopicDiscoveryHint",
        "client.restoreTopicDiscoveryHint",
        "client.getReviewInput",
      ],
      package: "synthesis-sidecar",
      test: "runtime_topic_workbench_surface::tests::shared_requests_use_the_production_topic_decoder",
      prefix: "SYNTHESIS_TOPIC_REQUEST_CODEC",
      part: "request",
      rejection: "invalid_request",
      argumentPath: "/args",
    },
    {
      capabilities: [
        "client.queryConceptKb",
        "client.updateConceptDisplayText",
        "client.applyConceptReviewAction",
        "client.deleteConceptEntries",
        "client.acceptTopicGraphRelation",
        "client.rejectTopicGraphRelation",
        "client.applyTopicGraphReviewAction",
        "client.rebuildConceptKbIndex",
        "client.rebuildTopicGraphIndex",
      ],
      package: "synthesis-sidecar",
      test: "runtime_concept_topic_graph_surface::tests::shared_requests_use_the_production_concept_decoder",
      prefix: "SYNTHESIS_CONCEPT_REQUEST_CODEC",
      part: "request",
      rejection: "invalid_request",
      argumentPath: "/args",
    },
    {
      capabilities: registry.capabilities
        .filter((entry) => entry.capability.startsWith("client."))
        .map((entry) => entry.capability),
      package: "synthesis-sidecar",
      test: "runtime_production_client::dispatch_integration_tests::shared_outer_envelopes_use_the_production_arguments_decoder",
      prefix: "SYNTHESIS_CLIENT_ENVELOPE_CODEC",
      part: "request",
      rejection: "invalid_request",
      envelopeOnly: true,
    },
    {
      capabilities: ["compute.citation_graph_build"],
      package: "synthesis-citation-graph-build",
      test: "tests::shared_graph_requests_use_the_production_decoder",
      prefix: "SYNTHESIS_GRAPH_REQUEST_CODEC",
      caseStream: true,
      part: "request",
      rejection: "invalid_request",
    },
    {
      capabilities: [],
      schemas: [
        "schemas/transfer.schema.json#/$defs/LibraryNode",
        "schemas/transfer.schema.json#/$defs/ReferenceRow",
      ],
      component: true,
      package: "synthesis-citation-graph-build",
      test: "tests::shared_graph_rows_use_the_production_typed_decoder",
      prefix: "SYNTHESIS_GRAPH_ROW_CODEC",
      part: "request",
      rejection: "invalid_request",
    },
    {
      capabilities: [],
      schemas: ["schemas/worker.schema.json#/$defs/PageDescriptor"],
      component: true,
      package: "synthesis-protocol",
      test: "tests::shared_descriptors_use_both_production_frame_decoders",
      prefix: "SYNTHESIS_PAGE_DESCRIPTOR_CODEC",
      part: "request",
      rejection: "invalid_request",
    },
    {
      capabilities: [],
      schemas: [
        ...new Set(
          registry.workers
            .filter(
              (worker) =>
                ![
                  "citation_graph_metrics.v1",
                  "citation_graph_layout.v2",
                  "concept_kb_index.v1",
                  "concept_kb_query.v1",
                  "citation_graph_build.v1",
                  "citation_graph_build_transfer.v1",
                ].includes(worker.operation),
            )
            .map((worker) => worker.inputSectionSchemaRef),
        ),
      ],
      component: true,
      package: "synthesis-sidecar",
      test: "runtime_worker::corpus_parity::shared_sections_use_the_production_generic_page_decoder",
      prefix: "SYNTHESIS_WORKER_SECTION_CODEC",
      part: "request",
      rejection: "invalid_request",
    },
    {
      capabilities: ["client.searchEvidence"],
      package: "synthesis-application",
      test: "evidence_search::tests::shared_requests_use_the_production_search_decoder",
      prefix: "SYNTHESIS_EVIDENCE_SEARCH_CODEC",
      part: "request",
      rejection: "invalid_request",
      argumentPath: "/args/0",
    },
    {
      capabilities: ["library.lexical.execute"],
      package: "synthesis-application",
      test: "evidence_search::tests::shared_requests_use_the_production_search_decoder",
      prefix: "SYNTHESIS_EVIDENCE_SEARCH_CODEC",
      part: "request",
      rejection: "invalid_request",
    },
    {
      capabilities: ["client.searchTopics"],
      package: "synthesis-application",
      test: "topic_search::tests::shared_requests_use_the_production_topic_search_decoder",
      prefix: "SYNTHESIS_TOPIC_SEARCH_CODEC",
      part: "request",
      rejection: "invalid_request",
      argumentPath: "/args/0",
    },
    {
      capabilities: [],
      schemas: ["schemas/reverse-host.schema.json#/$defs/ReverseHostError"],
      component: true,
      package: "synthesis-sidecar",
      test: "runtime_reverse_host::tests::reverse_host_error_corpus_uses_the_production_decoder",
      prefix: "SYNTHESIS_REVERSE_ERROR_CODEC",
      part: "result",
      rejection: "reverse_host_response_envelope_invalid",
    },
    {
      capabilities: [
        "client.getSchemas",
        "client.readPaperArtifacts",
        "client.getPaperArtifactManifest",
        "client.exportFilteredPaperArtifacts",
        "client.resolveTopicPaperDigest",
        "client.getLibraryIndex",
        "client.debugSynthesisSnapshot",
        "client.debugSynthesisCacheList",
        "client.debugSynthesisOperationsList",
        "client.debugSynthesisProfilerList",
        "client.debugSynthesisPaperInspect",
        "client.debugSynthesisTopicInspect",
        "client.debugSynthesisDiff",
      ],
      package: "synthesis-sidecar",
      test: "runtime_artifact_library_debug::tests::shared_requests_use_the_production_artifact_decoder",
      prefix: "SYNTHESIS_ARTIFACT_REQUEST_CODEC",
      part: "request",
      rejection: "invalid_request",
      argumentPath: "/args",
    },
    {
      capabilities: ["compute.citation_graph_metrics"],
      package: "synthesis-sidecar",
      test: "runtime_worker::corpus_parity::shared_metrics_requests_use_the_production_decoder",
      prefix: "SYNTHESIS_METRICS_CODEC",
      part: "request",
      rejection: "invalid_request",
    },
    {
      capabilities: [
        "delivery.export.publish_archive",
        "delivery.export.materialize_run_workspace",
      ],
      package: "synthesis-sidecar",
      test: "runtime_production_ports::tests::export_delivery_host_results_use_the_closed_wire_contract",
      prefix: "SYNTHESIS_DELIVERY_HOST_CODEC",
      part: "result",
      rejection: "reverse_host_result_invalid",
    },
    {
      capabilities: ["library.evidence.sources", "library.evidence.read"],
      package: "synthesis-sidecar",
      test: "runtime_production_ports::tests::evidence_host_results_enforce_the_closed_wire_contract",
      prefix: "SYNTHESIS_EVIDENCE_HOST_CODEC",
      part: "result",
      rejection: "reverse_host_result_invalid",
    },
    {
      capabilities: [
        "library.items.get_audit_state",
        "effects.staged_tag_binding.resolve",
      ],
      package: "synthesis-sidecar",
      test: "runtime_production_ports::tests::tag_host_results_use_the_closed_wire_contract",
      prefix: "SYNTHESIS_TAG_HOST_CODEC",
      part: "result",
      rejection: "reverse_host_result_invalid",
    },
    {
      capabilities: ["compute.citation_graph_layout"],
      package: "synthesis-citation-layout",
      test: "tests::production_request_decoder_matches_shared_structure_cases",
      prefix: "SYNTHESIS_LAYOUT_CODEC",
      part: "request",
      rejection: "invalid_request",
    },
    {
      capabilities: [
        "client.saveTagVocabulary",
        "client.stageTagSuggestions",
        "client.updateStagedTagSuggestion",
        "client.updateTagVocabularyEntry",
        "client.deleteTagVocabularyEntry",
        "client.promoteStagedTagSuggestions",
        "client.discardStagedTagSuggestions",
        "client.previewTagVocabularyImport",
        "client.applyTagVocabularyImport",
        "client.replaceTagAuditRecords",
        "client.clearTagAuditRecord",
        "client.beginTagAuditRun",
        "client.appendTagAuditRun",
        "client.promoteTagAuditRun",
        "client.abortTagAuditRun",
        "client.prepareTagRegulationAcknowledgement",
        "client.commitTagRegulationAcknowledgement",
      ],
      package: "synthesis-sidecar",
      test: "runtime_tag_surface::tests::shared_requests_use_the_production_tag_decoder",
      prefix: "SYNTHESIS_TAG_REQUEST_CODEC",
      part: "request",
      rejection: "invalid_request",
      argumentPath: "/args",
    },
    {
      capabilities: [
        "client.getReferenceSidecarIndex",
        "client.rankExternalReferences",
        "client.getAttentionQueue",
        "client.startReferenceSidecarRefresh",
        "client.applyCanonicalRevisionReviewAction",
        "client.applyReferenceMatchProposalAction",
        "client.applyReferenceMatchProposalActions",
        "client.mergeEffectiveCanonicalReference",
        "client.applyCanonicalRevisionMergeRequests",
        "client.updateCanonicalReferenceMetadata",
        "client.archiveCanonicalReference",
        "client.refreshReferenceSidecarNow",
        "client.consumeRelatedItemsSyncEcho",
      ],
      package: "synthesis-sidecar",
      test: "runtime_reference_citation_surface::tests::shared_requests_use_the_production_reference_decoder",
      prefix: "SYNTHESIS_REFERENCE_CODEC",
      part: "request",
      rejection: "invalid_request",
      argumentPath: "/args",
    },
    {
      capabilities: [
        "library.artifacts.scan_page",
        "library.artifacts.readiness",
        "library.artifacts.read",
      ],
      package: "synthesis-sidecar",
      test: "runtime_production_ports::tests::artifact_host_results_follow_shared_schema",
      prefix: "SYNTHESIS_ARTIFACT_CODEC",
      part: "result",
      rejection: "reverse_host_result_invalid",
    },
    {
      capabilities: [],
      schemas: [
        "schemas/worker.schema.json#/$defs/Concept",
        "schemas/worker.schema.json#/$defs/Sense",
        "schemas/worker.schema.json#/$defs/ConceptAlias",
      ],
      component: true,
      package: "synthesis-concept-kb",
      test: "tests::raw_typed_pages_require_canonical_bytes_and_deny_unknown_fields",
      prefix: "SYNTHESIS_CONCEPT_ROW_CODEC",
      part: "request",
      rejection: "invalid_request",
    },
    {
      capabilities: ["library.representative_image.read"],
      package: "synthesis-sidecar",
      test: "runtime_production_ports::tests::representative_image_result_enforces_the_closed_wire_contract",
      prefix: "SYNTHESIS_IMAGE_CODEC",
      part: "result",
      rejection: "representative_image_host_result_invalid",
    },
    {
      capabilities: [
        "webdav.describe",
        "webdav.read_text",
        "webdav.ensure_collection",
        "webdav.write_text",
      ],
      package: "synthesis-sidecar",
      test: "runtime_production_ports::tests::reverse_host_webdav_result_codec_follows_shared_schema",
      prefix: "SYNTHESIS_WEBDAV_CODEC",
      part: "result",
      rejection: "reverse_host_result_invalid",
    },
    {
      capabilities: [],
      schemas: [
        "schemas/worker.schema.json#/$defs/TopicGraphNode",
        "schemas/worker.schema.json#/$defs/TopicGraphEdge",
      ],
      component: true,
      package: "synthesis-protocol",
      test: "tests::topic_pages_reject_unknown_null_and_out_of_bound_fields",
      prefix: "SYNTHESIS_TOPIC_ROW_CODEC",
      part: "request",
      rejection: "invalid_request",
    },
    {
      capabilities: [],
      schemas: [
        "schemas/worker.schema.json#/$defs/TagEntry",
        "schemas/worker.schema.json#/$defs/StringRecordPair",
      ],
      component: true,
      package: "synthesis-protocol",
      test: "tests::tag_pages_reject_malformed_entries_before_acknowledgement",
      prefix: "SYNTHESIS_TAG_ENTRY_CODEC",
      part: "request",
      rejection: "invalid_request",
    },
    {
      capabilities: [
        "effects.tags.apply_batch",
        "effects.related_items.apply_batch",
      ],
      package: "synthesis-sidecar",
      test: "runtime_production_ports::tests::reverse_host_effect_batch_codec_follows_shared_schema",
      prefix: "SYNTHESIS_HOST_EFFECT_CODEC",
      part: "result",
      rejection: "reverse_host_result_invalid",
    },
    {
      capabilities: [
        "client.startCitationGraphUpdate",
        "client.refreshCitationGraphMetricsNow",
        "client.recomputeCitationGraphLayout",
        "client.rebuildCitationGraphCacheNow",
      ],
      package: "synthesis-sidecar",
      test: "runtime_citation_graph_commands::tests::shared_request_cases_use_the_production_graph_command_receiver",
      prefix: "SYNTHESIS_GRAPH_COMMAND_CODEC",
      part: "request",
      rejection: "invalid_request",
      argumentPath: "/args",
    },
    {
      capabilities: [
        "client.queryCitationGraph",
        "client.queryCitationGraphCluster",
        "client.getCitationGraphSlice",
        "client.getCitationGraphLayout",
        "client.getCitationGraphMetrics",
        "client.rankLibraryPapers",
      ],
      package: "synthesis-sidecar",
      test: "runtime_citation_graph_read_surface::tests::shared_request_cases_use_the_production_graph_receiver",
      prefix: "SYNTHESIS_GRAPH_QUERY_CODEC",
      part: "request",
      rejection: "invalid_request",
      argumentPath: "/args",
    },
    {
      capabilities: ["library.items.sync_snapshot"],
      package: "synthesis-application",
      test: "library_snapshot_index::tests::snapshot_decoder_checks_shared_shapes_and_nested_bounds",
      prefix: "SYNTHESIS_SNAPSHOT_CODEC",
      part: "result" as const,
      rejection: "reverse_host_result_invalid",
    },
    {
      capabilities: ["library.items.list_page", "library.items.get_by_ref"],
      package: "synthesis-sidecar",
      test: "runtime_production_ports::tests::reverse_host_dtos_reject_unknown_nested_fields",
      prefix: "SYNTHESIS_HOST_ITEMS_CODEC",
      part: "result" as const,
      rejection: "reverse_host_result_invalid",
    },
    {
      capabilities: [
        "transfer.content",
        "compute.citation_graph_build_transfer",
      ],
      package: "synthesis-sidecar",
      test: "runtime_transfer::tests::shared_structure_cases_use_the_production_transfer_decoder",
      prefix: "SYNTHESIS_TRANSFER_CODEC",
      transferPages: true,
      part: "request" as const,
      rejection: "invalid_request",
    },
    {
      capabilities: [],
      canonicalArtifacts: true,
      package: "synthesis-application",
      test: "canonical_literature_artifacts::tests::replays_env_supplied_canonical_artifact_cases",
      prefix: "SYNTHESIS_CANONICAL_CODEC",
      part: "request",
      // Wire error transport is checked separately; these private parsers return domain codes.
      rejection: null,
    },
  ];
}

export async function recordSynthesisProductionDecoderStructureEvidence(
  input: StructureCoverageInput,
  selection: SynthesisProductionDecoderDriver,
  identity: string | undefined,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  if (!identity) throw new Error("native_execution_identity_missing");
  const driver = selection.canonicalArtifacts
    ? {
        ...selection,
        schemas: [
          ...new Set(
            input.corpus
              .filter(
                (entry) =>
                  entry.valid &&
                  /^https:.*canonical-literature-artifacts.*schema.json$/.test(
                    entry.schemaRef,
                  ),
              )
              .map((entry) => entry.schemaRef),
          ),
        ],
      }
    : selection;
  const unadmittedSeeds = new Set<string>();
  const unexecutedPredicates = new Set<string>();
  const verified: string[] = [];
  const started = performance.now();
  const label = `${driver.prefix}${driver.argumentPath ? `:${driver.argumentPath}` : ""}`;
  console.error(`[synthesis-decoder] start ${label}`);
  const corpus = [...input.corpus];
  // Small control envelopes let predicate mutations reach later allOf guards.
  if (driver.transferPages)
    corpus.sort(
      (left, right) =>
        JSON.stringify(left.value).length - JSON.stringify(right.value).length,
    );
  if (driver.component) {
    for (const schemaRef of driver.schemas!) {
      if (corpus.some((entry) => entry.valid && entry.schemaRef === schemaRef))
        continue;
      const graphSection = schemaRef.endsWith("/LibraryNode")
        ? "libraryNodes"
        : schemaRef.endsWith("/ReferenceRow")
          ? "references"
          : undefined;
      const seed = corpus.find((entry) => {
        if (!entry.valid) return false;
        const page = entry.value as
          | { descriptor?: { section?: string }; rows?: unknown[] }
          | undefined;
        return graphSection
          ? page?.descriptor?.section === graphSection && !!page.rows?.length
          : entry.id ===
              "worker-tag_vocabulary_validate-v1-inputSection-aliases-positive";
      });
      const page = seed?.value as
        | { rows?: unknown[]; descriptor?: unknown }
        | undefined;
      const value = schemaRef.endsWith("/PageDescriptor")
        ? page?.descriptor
        : page?.rows?.[0];
      if (!seed || !value) throw new Error("worker_component_seed_missing");
      corpus.push({
        ...seed,
        id: `${seed.id}:${schemaRef}`,
        schemaRef,
        value,
      });
    }
  }
  if (driver.schemas && !driver.component) {
    for (const schemaRef of driver.schemas) {
      const seed = corpus.find(
        (entry) => entry.valid && entry.schemaRef === schemaRef,
      );
      if (!seed) throw new Error("canonical_root_seed_missing");
      const value = structuredClone(seed.value) as Record<string, any>;
      const fragment = (definition: string) =>
        corpus.find(
          (entry) =>
            entry.valid &&
            entry.schemaRef === `${schemaRef}#/$defs/${definition}`,
        )?.value;
      if (value.references?.length) {
        value.references[0].bibliography = structuredClone(
          fragment("Bibliography"),
        );
        value.references[0].matching = structuredClone(fragment("Matching"));
      } else if (value.meta?.scope_decision) {
        value.meta.scope_decision = structuredClone(
          fragment("CitationScopeDecision"),
        );
      } else continue;
      if (!input.validate(schemaRef, value).valid)
        throw new Error("canonical_composed_seed_invalid");
      corpus.push({ ...seed, id: `${seed.id}:shared-fields`, value });
    }
  }
  const contracts = registry.capabilities.filter((entry) =>
    driver.capabilities.includes(entry.capability),
  );
  const byRef = new Map(
    contracts.map((entry) => [
      entry[`${driver.part}SchemaRef`],
      entry.capability,
    ]),
  );
  for (const ref of driver.schemas || []) byRef.set(ref, ref);
  const chrome = contracts.find(
    (entry) => entry.capability === "client.getSynthesisWorkbenchChromeInput",
  );
  const surface = contracts.find(
    (entry) => entry.capability === "client.getSynthesisWorkbenchSurfaceInput",
  );
  if (chrome && surface) {
    for (const entry of [...corpus]) {
      if (!entry.valid || entry.schemaRef !== surface.requestSchemaRef)
        continue;
      const value = { args: [(entry.value as { args: unknown[] }).args[1]] };
      if (input.validate(chrome.requestSchemaRef, value).valid)
        corpus.push({
          ...entry,
          id: `${entry.id}:chrome-state`,
          schemaRef: chrome.requestSchemaRef,
          value,
        });
    }
  }
  corpus.push(...composedDecoderCases(input, new Set(byRef.keys())));
  const probes = new Map<
    string,
    {
      id: string;
      schemaRef: string;
      capability: string;
      valid: boolean;
      value: unknown;
      predicate?: { schemaRef: string; value: unknown; valid: boolean };
      obligations: { id: string; seedId: string }[];
    }
  >();
  const add = (
    schemaRef: string,
    value: unknown,
    valid: boolean,
    obligation?: { id: string; seedId: string },
    predicate?: { schemaRef: string; value: unknown; valid: boolean },
  ) => {
    const key = JSON.stringify([schemaRef, valid, value, predicate]);
    let probe = probes.get(key);
    if (!probe) {
      probe = {
        id: `decoder-root-${probes.size}`,
        schemaRef,
        capability: byRef.get(schemaRef)!,
        valid,
        value,
        ...(predicate ? { predicate } : {}),
        obligations: [],
      };
      probes.set(key, probe);
    }
    if (obligation) probe.obligations.push(obligation);
    return probe;
  };
  inspectSynthesisProtocolStructureCoverage({
    ...input,
    corpus: corpus.filter((entry) => entry.valid && byRef.has(entry.schemaRef)),
    allContexts: true,
    maxProbeRows: driver.envelopeOnly ? 100 : 1_250_001,
    maxProbeBytes: driver.envelopeOnly ? 1024 * 1024 : 512 * 1024 * 1024,
    roots: [
      ...input.roots.filter((entry) =>
        contracts.some(
          (contract) => entry.id === `${contract.capability}:${driver.part}`,
        ),
      ),
      ...(driver.schemas || []).map((ref) => ({ id: ref, ref })),
    ],
    onWitness(witness) {
      signal?.throwIfAborted();
      if (
        driver.transferArrayCodec &&
        (witness.instancePath !== "/page/rows" ||
          !/::maxItems:(accept|reject)$/.test(witness.obligationId))
      )
        return;
      if (
        driver.rowsArrayCodec &&
        (witness.instancePath !== "/rows" ||
          !/::maxItems:(accept|reject)$/.test(witness.obligationId))
      )
        return;
      const predicateReplay =
        witness.root.predicate &&
        [
          "SYNTHESIS_TOPIC_REQUEST_CODEC",
          "SYNTHESIS_ARTIFACT_CODEC",
          "SYNTHESIS_EVIDENCE_HOST_CODEC",
          "SYNTHESIS_TRANSFER_CODEC",
          "SYNTHESIS_SNAPSHOT_CODEC",
        ].includes(driver.prefix);
      if (
        driver.workerPages &&
        /^\/descriptor\/(rowCount|byteLength|sha256|pageIndex)/.test(
          witness.instancePath,
        )
      )
        return;
      if (
        driver.transferPages &&
        (/^\/page\/descriptor\/(byteLength|sha256)/.test(
          witness.instancePath,
        ) ||
          (witness.instancePath === "/page/descriptor/rowCount" &&
            !/::const:(accept|reject)$/.test(witness.obligationId)))
      )
        return;
      // This receiver decodes only the closed args envelope, not its business DTOs.
      if (
        driver.envelopeOnly &&
        !(
          (witness.instancePath === "" &&
            ["type", "required", "additionalProperties"].includes(
              witness.keyword || "",
            )) ||
          (witness.instancePath === "/args" && witness.keyword === "type")
        )
      )
        return;
      // The production dispatch has already decoded the args envelope at this seam.
      if (
        driver.argumentPath &&
        [witness.root.seedValue, witness.root.value].some(
          (value) => !Array.isArray((value as { args?: unknown[] })?.args),
        )
      )
        return;
      const transferSeed =
        driver.argumentPath &&
        [witness.root.seedValue].some((value) => {
          const args = (value as { args?: unknown[] })?.args;
          return (
            Array.isArray(args) &&
            args.some(
              (arg) =>
                arg &&
                typeof arg === "object" &&
                ("requestTransfer" in arg || "assetTransfer" in arg),
            )
          );
        });
      if (driver.argumentPath && !!transferSeed !== !!driver.transferControls)
        return;
      if (
        driver.argumentPath &&
        !witness.instancePath.startsWith(driver.argumentPath)
      )
        return;
      if (
        !byRef.has(witness.root.schemaRef) ||
        (!predicateReplay && witness.root.valid !== witness.expectValid)
      )
        return;
      if (
        !predicateReplay &&
        !witness.expectValid &&
        (!witness.keyword ||
          !witness.root.errors?.some(
            (error) =>
              (error.keyword === witness.keyword ||
                (witness.keyword === "unevaluatedProperties" &&
                  error.keyword === "additionalProperties")) &&
              (error.instancePath === witness.instancePath ||
                (witness.keyword === "false schema" &&
                  error.instancePath?.startsWith(`${witness.instancePath}/`))),
          ))
      )
        return;
      // Accepted capacity fixtures need distinct domain IDs in repeated object rows.
      const value = driver.workerPages
        ? sealedWorkerSection(witness.root.value)
        : driver.transferPages
          ? witness.instancePath === "/page/descriptor/rowCount" &&
            !witness.expectValid
            ? witness.root.value
            : sealedTransferRequest(witness.root.value)
          : driver.schemas &&
              !driver.component &&
              /::maxItems:(accept|reject)$/.test(witness.obligationId)
            ? canonicalArrayBoundary(witness.root.value)
            : witness.root.value;
      const seedValue = driver.workerPages
        ? sealedWorkerSection(witness.root.seedValue)
        : driver.transferPages
          ? sealedTransferRequest(witness.root.seedValue)
          : witness.root.seedValue;
      if (value === undefined || seedValue === undefined) return;
      if (!input.validate(witness.root.schemaRef, seedValue).valid) return;
      if (
        value !== witness.root.value &&
        input.validate(witness.root.schemaRef, value).valid !==
          (predicateReplay ? witness.root.valid : witness.expectValid)
      )
        return;
      if (
        driver.schemas &&
        !driver.component &&
        canonicalWireOutcome(input, witness.root.schemaRef, value) !==
          witness.expectValid
      )
        throw new Error("canonical_decoder_typescript_diverged");
      if (
        !driver.schemas &&
        rebuildOutcome(
          byRef.get(witness.root.schemaRef)!,
          driver.part,
          value,
        ) !== (witness.root.valid ? "accepted" : "rejected")
      )
        throw new Error("production_decoder_typescript_root_diverged");
      if (driver.component) {
        let accepted = false;
        try {
          const [file, fragment] = witness.root.schemaRef.split("#/$defs/");
          const schemaId = String(input.resolveSchema(file)!.schema.$id);
          rebuildSynthesisProtocolDto({
            schemaId,
            definition: fragment,
            value,
            direction: "request",
          });
          accepted = true;
        } catch (error) {
          if (
            !(error instanceof SynthesisClientError) ||
            error.code !== "invalid_request"
          )
            throw error;
        }
        if (accepted !== witness.expectValid)
          throw new Error("component_decoder_typescript_diverged");
      }
      const seed = add(witness.root.schemaRef, seedValue, true);
      add(
        witness.root.schemaRef,
        value,
        witness.root.valid,
        {
          id: witness.obligationId,
          seedId: seed.id,
        },
        predicateReplay
          ? {
              schemaRef: witness.schemaRef,
              value: witness.value,
              valid: witness.expectValid,
            }
          : undefined,
      );
    },
  });
  if (![...probes.values()].some((entry) => !entry.valid))
    throw new Error("reverse_host_decoder_negative_samples_missing");
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "synthesis-reverse-host-codec-"),
  );
  const casesFile = path.join(directory, "cases.json");
  const resultsFile = path.join(directory, "results.json");
  if (driver.caseStream) {
    fs.writeFileSync(casesFile, "");
    for (const { obligations: _obligations, ...entry } of probes.values())
      fs.appendFileSync(casesFile, `${JSON.stringify(entry)}\n`);
  } else {
    fs.writeFileSync(
      casesFile,
      JSON.stringify(
        [...probes.values()].map(
          ({ obligations: _obligations, ...entry }) => entry,
        ),
      ),
    );
  }
  let completed = false;
  const prepared = performance.now();
  console.error(
    `[synthesis-decoder] prepared ${label} cases=${probes.size} durationMs=${Math.round(prepared - started)}`,
  );
  try {
    let failure: unknown;
    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      signal?.throwIfAborted();
      const cargoSignal = AbortSignal.any([
        ...(signal ? [signal] : []),
        AbortSignal.timeout(120_000),
      ]);
      const nativeStarted = performance.now();
      const result = await runLoggedProcess(
        "cargo",
        [
          "test",
          "--locked",
          "-p",
          driver.package,
          "--lib",
          driver.test,
          "--",
          "--exact",
        ],
        {
          cwd: path.resolve("rust/synthesis-sidecar"),
          env: {
            ...process.env,
            [`${driver.prefix}_CASES`]: casesFile,
            [`${driver.prefix}_RESULTS`]: resultsFile,
          },
          signal: cargoSignal,
          log: path.join(directory, "cargo.log"),
        },
      );
      console.error(
        `[synthesis-decoder] native ${label} durationMs=${Math.round(performance.now() - nativeStarted)} exitCode=${result.exitCode}`,
      );
      cargoSignal.throwIfAborted();
      if (result.exitCode !== 0)
        throw new Error(
          `cargo_test_failed:${result.exitCode}; diagnostics=${directory}`,
        );
    } catch (error) {
      failure = error;
    }
    signal?.throwIfAborted();
    if (!fs.existsSync(resultsFile))
      throw new Error(
        `reverse_host_decoder_results_missing; diagnostics=${directory}`,
        { cause: failure },
      );
    const results = JSON.parse(fs.readFileSync(resultsFile, "utf8")) as {
      id: string;
      accepted: boolean;
      reason?: string;
      predicateAccepted?: boolean;
    }[];
    const byId = new Map(results.map((entry) => [entry.id, entry]));
    if (byId.size !== probes.size)
      throw new Error("reverse_host_decoder_results_incomplete");
    if (synthesisProtocolExecutionIdentity() !== identity)
      throw new Error("native_execution_identity_changed");
    const diverged: string[] = [];
    for (const probe of probes.values()) {
      const result = byId.get(probe.id);
      const matched =
        result?.accepted === probe.valid &&
        (!probe.predicate ||
          result.predicateAccepted === probe.predicate.valid) &&
        (probe.valid ||
          (driver.rejection === null
            ? typeof result.reason === "string" && result.reason.length > 0
            : result.reason === driver.rejection));
      for (const obligation of probe.obligations) {
        if (probe.predicate && typeof result?.predicateAccepted !== "boolean") {
          unexecutedPredicates.add(obligation.id);
          continue;
        }
        if (byId.get(obligation.seedId)?.accepted !== true) {
          unadmittedSeeds.add(`${driver.prefix}:${obligation.seedId}`);
          continue;
        }
        const verifiedPair = matched;
        appendSynthesisProtocolExecutionEvidence(
          identity,
          `structure:${obligation.id}`,
          verifiedPair ? "verified" : "diverged",
          "rust",
          driver.rowsArrayCodec || driver.transferArrayCodec
            ? "typed-row-array"
            : probe.predicate
              ? "schema-predicate"
              : "request-decoder",
        );
        (verifiedPair ? verified : diverged).push(obligation.id);
      }
    }
    if (failure || diverged.length) {
      throw new Error(
        `${driver.prefix}:${diverged.join(",")}; diagnostics=${directory}`,
        { cause: failure },
      );
    }
    completed = true;
  } finally {
    console.error(
      `[synthesis-decoder] finished ${label} durationMs=${Math.round(performance.now() - started)} nativeAndEvidenceMs=${Math.round(performance.now() - prepared)}`,
    );
    if (completed) fs.rmSync(directory, { recursive: true, force: true });
    else console.error(`[synthesis-decoder] diagnostics ${label} ${directory}`);
  }
  return {
    cases: probes.size,
    verified,
    unadmittedSeeds: [...unadmittedSeeds],
    unexecutedPredicates: [...unexecutedPredicates],
  };
}

type EvidencePart = "request" | "result" | "error";

function rebuildOutcome(
  capability: string,
  direction: "request" | "result",
  value: unknown,
) {
  try {
    rebuildSynthesisProtocolCapabilityDto({ capability, direction, value });
    return "accepted" as const;
  } catch (error) {
    if (!(error instanceof SynthesisClientError)) throw error;
    return "rejected" as const;
  }
}

// Reverse Host host-call errors are validated as the wire error the sidecar
// decodes, without projecting the envelope into another shape.
function rebuildReverseHostErrorOutcome(value: unknown) {
  try {
    rebuildSynthesisProtocolDto({
      schemaId: REVERSE_HOST_SCHEMA,
      definition: "ReverseHostError",
      direction: "result",
      value,
    });
    return "accepted" as const;
  } catch (error) {
    if (!(error instanceof SynthesisClientError)) throw error;
    return "rejected" as const;
  }
}

// Protocol DTOs close their own fields, so one unknown field is the shared
// mutation used to prove the negative side of a transported instance.
function mutated(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>), __unexpected: true }
    : { __unexpected: true };
}

function record(
  capability: SynthesisReverseHostCapability,
  part: EvidencePart,
  outcome: "accepted" | "rejected",
) {
  const identity = synthesisProtocolExecutionIdentity();
  if (!identity) throw new Error("native_execution_identity_missing");
  appendSynthesisProtocolExecutionEvidence(
    identity,
    capability + ":" + part,
    outcome,
  );
}

function latestCall(
  harness: SynthesisProductionRouteHarness,
  capability: SynthesisReverseHostCapability,
  part: EvidencePart,
): SynthesisProductionRouteHostCall {
  const call = harness.recorder.hostCalls
    .filter((entry) => entry.capability === capability)
    .at(-1);
  if (!call)
    throw new Error(
      "synthesis_reverse_host_" + part + "_missing:" + capability,
    );
  return call;
}

function observations(
  harness: SynthesisProductionRouteHarness,
  capability: SynthesisReverseHostCapability,
) {
  return harness
    .observations()
    .filter(
      (event) =>
        event.boundary === "reverse-host" &&
        event.identities?.capability === capability,
    );
}

/**
 * Records request evidence for a call the native side really made: the
 * captured request is accepted by production TypeScript, and its unknown-field
 * root is rejected by the same production rebuilder.
 */
export function recordSynthesisReverseHostRequestEvidence(
  harness: SynthesisProductionRouteHarness,
  capability: SynthesisReverseHostCapability,
  call = latestCall(harness, capability, "request"),
) {
  if (
    !harness.recorder.hostCalls.includes(call) ||
    call.capability !== capability
  )
    throw new Error(
      "synthesis_reverse_host_request_not_recorded:" + capability,
    );
  if (
    !observations(harness, capability).some(
      (event) =>
        event.phase === "call-started" &&
        event.identities?.operation === call.operationId,
    )
  )
    throw new Error(
      "synthesis_reverse_host_request_not_transported:" + capability,
    );
  if (rebuildOutcome(capability, "request", call.payload) !== "accepted")
    throw new Error(
      "synthesis_reverse_host_request_rejected_by_typescript:" + capability,
    );
  rebuildSynthesisReverseHostPayload(capability, call.payload);
  record(capability, "request", "accepted");
  appendSynthesisProtocolObservation(
    synthesisProtocolExecutionIdentity()!,
    registry.capabilities.find((entry) => entry.capability === capability)!
      .requestSchemaRef,
    call.payload,
  );
  // Rust produces this message; the production TypeScript receiver owns rejection.
  if (
    rebuildOutcome(capability, "request", mutated(call.payload)) !== "rejected"
  )
    throw new Error(
      "synthesis_reverse_host_request_mutation_admitted:" + capability,
    );
  appendSynthesisProtocolExecutionEvidence(
    synthesisProtocolExecutionIdentity()!,
    capability + ":request",
    "rejected",
    "typescript",
  );
}

/**
 * The call-completed observation only proves transport receipt of this exact
 * result, so it is required to carry the operation id of the recorded call.
 * Typed consumption is the caller's client-visible success assertion.
 */
export function recordSynthesisReverseHostResultAcceptance(
  harness: SynthesisProductionRouteHarness,
  capability: SynthesisReverseHostCapability,
  call = latestCall(harness, capability, "result"),
) {
  if (
    !harness.recorder.hostCalls.includes(call) ||
    call.capability !== capability
  )
    throw new Error("synthesis_reverse_host_result_not_recorded:" + capability);
  if (
    !observations(harness, capability).some(
      (event) =>
        event.phase === "call-completed" &&
        event.outcome === "succeeded" &&
        event.identities?.operation === call.operationId,
    )
  )
    throw new Error("synthesis_reverse_host_result_not_consumed:" + capability);
  if (rebuildOutcome(capability, "result", call.result) !== "accepted")
    throw new Error(
      "synthesis_reverse_host_result_rejected_by_typescript:" + capability,
    );
  rebuildSynthesisReverseHostResult(
    capability,
    call.result,
    rebuildSynthesisReverseHostPayload(capability, call.payload),
  );
  record(capability, "result", "accepted");
  appendSynthesisProtocolObservation(
    synthesisProtocolExecutionIdentity()!,
    registry.capabilities.find((entry) => entry.capability === capability)!
      .resultSchemaRef,
    call.result,
  );
}

/**
 * Records the typed error transport the sidecar really consumed. The sidecar
 * reports the envelope code when it decoded the error as the declared Reverse
 * Host error contract and its own envelope-invalid code otherwise; the recorded
 * outcome has to agree with that observable behaviour.
 */
export function recordSynthesisReverseHostErrorEvidence(args: {
  harness: SynthesisProductionRouteHarness;
  capability: SynthesisReverseHostCapability;
  nativeFailureCode: string;
}) {
  if (!args.nativeFailureCode)
    throw new Error("synthesis_reverse_host_native_code_missing");
  const call = latestCall(args.harness, args.capability, "error");
  if (!call.error)
    throw new Error(
      "synthesis_reverse_host_error_envelope_missing:" + args.capability,
    );
  const failure = observations(args.harness, args.capability).find(
    (event) =>
      event.phase === "call-failed" &&
      event.outcome === "failed" &&
      event.identities?.operation === call.operationId,
  );
  if (!failure || failure.code !== args.nativeFailureCode)
    throw new Error(
      "synthesis_reverse_host_error_not_consumed:" + args.capability,
    );
  const outcome = rebuildReverseHostErrorOutcome(call.error);
  const decodedBySidecar =
    args.nativeFailureCode !== "reverse_host_response_envelope_invalid";
  if (decodedBySidecar !== (outcome === "accepted"))
    throw new Error(
      "synthesis_reverse_host_error_parity_mismatch:" + args.capability,
    );
  record(args.capability, "error", outcome);
  if (outcome === "accepted")
    appendSynthesisProtocolObservation(
      synthesisProtocolExecutionIdentity()!,
      registry.capabilities.find(
        (entry) => entry.capability === args.capability,
      )!.errorSchemaRef,
      call.error,
    );
}

/**
 * Records only the negative outcome of a malformed host response the sidecar
 * really received: the client-visible failure code it reported and production
 * TypeScript rejecting that same root. A TypeScript-only rejection is never
 * recorded here.
 */
export function recordSynthesisReverseHostResultRejection(args: {
  harness: SynthesisProductionRouteHarness;
  capability: SynthesisReverseHostCapability;
  nativeFailureCode: string;
}) {
  if (!args.nativeFailureCode)
    throw new Error("synthesis_reverse_host_native_failure_code_missing");
  const call = latestCall(args.harness, args.capability, "result");
  if (
    !observations(args.harness, args.capability).some(
      (event) =>
        event.phase === "call-completed" &&
        event.identities?.operation === call.operationId,
    )
  )
    throw new Error(
      "synthesis_reverse_host_rejected_result_not_transported:" +
        args.capability,
    );
  if (rebuildOutcome(args.capability, "result", call.result) !== "rejected")
    throw new Error(
      "synthesis_reverse_host_rejected_result_admitted_by_typescript:" +
        args.capability,
    );
  let rejected = false;
  try {
    rebuildSynthesisReverseHostResult(
      args.capability,
      call.result,
      rebuildSynthesisReverseHostPayload(args.capability, call.payload),
    );
  } catch (error) {
    if (!(error instanceof SynthesisClientError)) throw error;
    rejected = true;
  }
  if (!rejected)
    throw new Error(
      "synthesis_reverse_host_rejected_result_admitted_by_host_rebuilder:" +
        args.capability,
    );
  record(args.capability, "result", "rejected");
}
