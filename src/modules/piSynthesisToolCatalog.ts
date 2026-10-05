import {
  materializeSynthesisProtocolDefinitionSchema,
  SynthesisClientError,
  type SynthesisClient,
  type SynthesisJsonObject,
  type SynthesisJsonValue,
  type SynthesisPublicMaintenanceOperation,
} from "../../packages/synthesis-contracts/src/index";
import type {
  PiGatewayEffect,
  PiGatewayExecution,
  PiGatewayToolDefinition,
} from "./piToolGateway";
import type { createPiTrustedNativeExecution } from "./piTrustedNativeExecution";
import { resolveHostBridgeFileDownload } from "./hostBridge/server/hostBridgeFileRegistry";
import { normalizeWorkflowArchiveEntryName } from "../workflows/archive";
import {
  WORKFLOW_HOST_ERROR_SCHEMA,
  createWorkflowHostErrorData,
  type WorkflowHostErrorData,
} from "../workflows/workflowHostErrorContract";

type Workspace = Pick<
  Awaited<ReturnType<typeof createPiTrustedNativeExecution>>,
  | "outputResourceKey"
  | "beginGeneratedTextOutput"
  | "materializeGeneratedArchive"
>;
type Dependencies = {
  resolveSynthesisClient: () => SynthesisClient | Promise<SynthesisClient>;
  workspace: Workspace;
  recordOperation: (input: {
    callId?: string;
    sourceTurnId?: string;
    operation: SynthesisPublicMaintenanceOperation;
  }) => Promise<string>;
};

function schema(document: string, definition: string) {
  return materializeSynthesisProtocolDefinitionSchema(
    `https://zotero-agents.local/synthesis/sidecar-protocol/v1/${document}.schema.json`,
    definition,
  );
}
const empty = { type: "object", additionalProperties: false, properties: {} };
type Mapping = {
  capabilityId: string;
  name: string;
  schema: Record<string, unknown>;
  invoke: (
    client: SynthesisClient,
    input: SynthesisJsonObject,
  ) => Promise<unknown>;
  delivery?: "context" | "planning" | "directory";
  maintenance?: true;
};

// Literal reviewed bindings; remote Host Bridge policy does not own this catalog.
function mappings(): Mapping[] {
  const topic = (d: string) => schema("client-topic-workbench", d);
  const graph = (d: string) => schema("client-citation-graph", d);
  const artifact = (d: string) => schema("client-artifact-library-debug", d);
  const reference = (d: string) => schema("client-reference-canonical", d);
  const context = topic("TopicContextPayload");
  context.properties = {
    ...(context.properties as Record<string, unknown>),
    delivery: { enum: ["inline", "file"] },
  };
  const exportSchema = artifact("ExportPayload");
  const { run_root: _runRoot, ...exportProperties } =
    exportSchema.properties as Record<string, unknown>;
  exportSchema.properties = exportProperties;
  return [
    {
      capabilityId: "synthesis.search_evidence",
      name: "zotero_synthesis_search_evidence",
      schema: schema("search", "EvidenceSearchRequest"),
      invoke: (c, p) =>
        c.searchEvidence(
          p as unknown as Parameters<SynthesisClient["searchEvidence"]>[0],
        ),
    },
    {
      capabilityId: "topics.search",
      name: "zotero_topics_search",
      schema: schema("search", "TopicSearchRequest"),
      invoke: (c, p) =>
        c.topics.search(
          p as unknown as Parameters<SynthesisClient["topics"]["search"]>[0],
        ),
    },
    {
      capabilityId: "topics.list",
      name: "zotero_topics_list",
      schema: topic("PageRequest"),
      invoke: (c, p) =>
        c.topics.list(
          p as unknown as Parameters<SynthesisClient["topics"]["list"]>[0],
        ),
    },
    {
      capabilityId: "topics.find_by_paper_ref",
      name: "zotero_topics_find_by_paper_ref",
      schema: topic("FindTopicsPayload"),
      invoke: (c, p) =>
        c.topics.findByPaperRef(
          p as unknown as Parameters<
            SynthesisClient["topics"]["findByPaperRef"]
          >[0],
        ),
    },
    {
      capabilityId: "topics.get_context",
      name: "zotero_topics_get_context",
      schema: context,
      invoke: (c, p) =>
        c.topics.getContext(
          p as unknown as Parameters<
            SynthesisClient["topics"]["getContext"]
          >[0],
        ),
      delivery: "context",
    },
    {
      capabilityId: "topics.get_planning_context",
      name: "zotero_topics_get_planning_context",
      schema: empty,
      invoke: (c) => c.topics.getPlanningContext(),
      delivery: "planning",
    },
    {
      capabilityId: "topics.get_report",
      name: "zotero_topics_get_report",
      schema: topic("TopicIdPayload"),
      invoke: (c, p) =>
        c.topics.getTopicReport(
          p as unknown as Parameters<
            SynthesisClient["topics"]["getTopicReport"]
          >[0],
        ),
    },
    {
      capabilityId: "schemas.get",
      name: "zotero_schemas_get",
      schema: empty,
      invoke: (c) => c.maintenance.getSchemas(),
    },
    {
      capabilityId: "concepts.query",
      name: "zotero_concepts_query",
      schema: schema("client-concept-topic-graph", "ConceptQueryRequest"),
      invoke: (c, p) => c.concepts.query(p),
    },
    {
      capabilityId: "citation_graph.query_cluster",
      name: "zotero_citation_graph_query_cluster",
      schema: graph("GraphQuery"),
      invoke: (c, p) => c.graph.queryCluster(p),
    },
    {
      capabilityId: "library_index.get",
      name: "zotero_library_index_get",
      schema: artifact("LibraryIndexRequest"),
      invoke: (c, p) => c.libraryIndex.getPage(p),
    },
    {
      capabilityId: "resolvers.resolve",
      name: "zotero_resolvers_resolve",
      schema: topic("ResolverRequest"),
      invoke: (c, p) =>
        c.topics.resolveResolver(
          p as unknown as Parameters<
            SynthesisClient["topics"]["resolveResolver"]
          >[0],
        ),
    },
    {
      capabilityId: "reference_index.get",
      name: "zotero_reference_index_get",
      schema: reference("IndexRequest"),
      invoke: (c, p) => c.references.getSidecarIndex(p),
    },
    {
      capabilityId: "reference_sidecar.refresh",
      name: "zotero_reference_sidecar_refresh",
      schema: empty,
      invoke: (c) => c.references.startRefresh({}),
      maintenance: true,
    },
    {
      capabilityId: "synthesis.operation.get",
      name: "zotero_synthesis_operation_get",
      schema: schema(
        "client-webdav-maintenance",
        "MaintenanceOperationReadPayload",
      ),
      invoke: (c, p) =>
        c.maintenance.getOperation(
          p as unknown as Parameters<
            SynthesisClient["maintenance"]["getOperation"]
          >[0],
        ),
    },
    {
      capabilityId: "citation_graph.get_overview",
      name: "zotero_citation_graph_get_overview",
      schema: graph("GraphQuery"),
      invoke: (c, p) => c.graph.getOverview(p),
    },
    {
      capabilityId: "citation_graph.get_slice",
      name: "zotero_citation_graph_get_slice",
      schema: graph("SliceQuery"),
      invoke: (c, p) => c.graph.getSlice(p),
    },
    {
      capabilityId: "citation_graph.get_layout",
      name: "zotero_citation_graph_get_layout",
      schema: graph("LayoutReadQuery"),
      invoke: (c, p) => c.graph.getPersistedLayout(p),
    },
    {
      capabilityId: "citation_graph.get_metrics",
      name: "zotero_citation_graph_get_metrics",
      schema: graph("MetricsQuery"),
      invoke: (c, p) => c.graph.getMetrics(p),
    },
    {
      capabilityId: "citation_graph.rank_external_references",
      name: "zotero_citation_graph_rank_external_references",
      schema: reference("RankRequest"),
      invoke: (c, p) => c.references.rankExternalReferences(p),
    },
    {
      capabilityId: "citation_graph.rank_library_papers",
      name: "zotero_citation_graph_rank_library_papers",
      schema: graph("MetricsQuery"),
      invoke: (c, p) => c.graph.rankLibraryPapers(p),
    },
    {
      capabilityId: "citation_graph.refresh_metrics",
      name: "zotero_citation_graph_refresh_metrics",
      schema: graph("MetricsRefreshCommand"),
      invoke: (c, p) => c.graph.refreshMetricsNow(p),
      maintenance: true,
    },
    {
      capabilityId: "citation_graph.update",
      name: "zotero_citation_graph_update",
      schema: graph("UpdateCommand"),
      invoke: (c, p) => c.graph.startUpdate(p),
      maintenance: true,
    },
    {
      capabilityId: "paper_artifacts.get_manifest",
      name: "zotero_paper_artifacts_get_manifest",
      schema: artifact("ArtifactFilter"),
      invoke: (c, p) => c.artifacts.getManifest(p),
    },
    {
      capabilityId: "paper_artifacts.read",
      name: "zotero_paper_artifacts_read",
      schema: artifact("ArtifactRequest"),
      invoke: (c, p) =>
        c.artifacts.readPaperArtifacts(
          p as unknown as Parameters<
            SynthesisClient["artifacts"]["readPaperArtifacts"]
          >[0],
        ),
    },
    {
      capabilityId: "paper_artifacts.export_filtered",
      name: "zotero_paper_artifacts_export_filtered",
      schema: exportSchema,
      invoke: (c, p) => c.artifacts.exportFiltered(p, { mode: "remote" }),
      delivery: "directory",
    },
    {
      capabilityId: "paper_artifacts.resolve_topic_digest",
      name: "zotero_paper_artifacts_resolve_topic_digest",
      schema: topic("PaperDigestPayload"),
      invoke: (c, p) => {
        const ref = p.digest_ref as SynthesisJsonObject | undefined;
        return c.artifacts.resolveTopicPaperDigest({
          paperRef: p.paper_ref as string,
          includeRepresentativeImage: p.include_representative_image as boolean,
          ...(p.topic_id === undefined
            ? {}
            : { topicId: p.topic_id as string }),
          ...(ref
            ? {
                digestRef: {
                  paperRef: ref.paper_ref as string,
                  payloadHash: ref.payload_hash as string,
                  ...(ref.locator === undefined
                    ? {}
                    : { locator: ref.locator as string }),
                  ...(ref.library_id === undefined
                    ? {}
                    : { libraryId: ref.library_id as number }),
                  ...(ref.note_key === undefined
                    ? {}
                    : { noteKey: ref.note_key as string }),
                },
              }
            : {}),
        });
      },
    },
    {
      capabilityId: "topics.get_review_input",
      name: "zotero_topics_get_review_input",
      schema: schema("client-workflow-review", "ReviewRequest"),
      invoke: (c, p) =>
        c.workflowReview.getInput(
          p as unknown as Parameters<
            SynthesisClient["workflowReview"]["getInput"]
          >[0],
        ),
    },
    {
      capabilityId: "insights.get_attention_queue",
      name: "zotero_insights_get_attention_queue",
      schema: reference("AttentionPayload"),
      invoke: (c, p) => c.references.getAttentionQueue(p),
    },
  ];
}

export function createPiSynthesisToolDefinitions(
  deps: Dependencies,
): readonly PiGatewayToolDefinition[] {
  return mappings().map<PiGatewayToolDefinition>((mapping) => {
    const fileDelivery = (input: SynthesisJsonObject) =>
      mapping.delivery === "directory" ||
      mapping.delivery === "planning" ||
      (mapping.delivery === "context" && input.delivery === "file");
    const effects = (input: SynthesisJsonObject): PiGatewayEffect[] =>
      mapping.maintenance
        ? ["external-mutation"]
        : fileDelivery(input)
          ? ["bounded-read", "workspace-mutation"]
          : ["bounded-read"];
    return {
      capabilityId: mapping.capabilityId,
      name: mapping.name,
      description: mapping.maintenance
        ? `Submit Synthesis ${mapping.capabilityId} once. Acceptance is not completion; query zotero_synthesis_operation_get explicitly. Do not automatically retry.`
        : mapping.delivery === "planning"
          ? "Write complete Topic planning context to an owner-managed JSON file."
          : mapping.delivery === "directory"
            ? "Export filtered paper artifacts to a workspace directory preserving relative paths and manifest."
            : mapping.delivery === "context"
              ? "Read canonical Topic context; delivery=file writes owner-managed JSON instead of inline content."
              : `Read canonical Synthesis ${mapping.capabilityId}. Preserve readiness, coverage and opaque cursors; oversized results fail without truncation.`,
      schema: mapping.schema,
      minimumEffects: mapping.maintenance
        ? ["external-mutation"]
        : ["bounded-read"],
      maxResultBytes: 50 * 1024,
      classify: (value) => {
        const input = value as SynthesisJsonObject;
        return {
          effects: effects(input),
          authorizationKeys: [],
          resourceKeys: fileDelivery(input)
            ? [deps.workspace.outputResourceKey]
            : mapping.maintenance
              ? ["synthesis:maintenance"]
              : [],
          cost: 1,
        };
      },
      execute: async (value, context): Promise<PiGatewayExecution> => {
        const input = value as SynthesisJsonObject;
        let started = false;
        try {
          if (context.signal.aborted)
            return {
              status: "canceled",
              effectCertainty: "confirmed_none",
              code: "canceled",
            };
          const client = await deps.resolveSynthesisClient();
          if (context.signal.aborted)
            return {
              status: "canceled",
              effectCertainty: "confirmed_none",
              code: "canceled",
            };
          const { delivery: _delivery, ...payload } = input;
          started = true;
          const completion = mapping.invoke(client, payload);
          context.trackPhysical?.(
            completion.then(
              () => "settled" as const,
              () =>
                mapping.maintenance
                  ? ("unknown" as const)
                  : ("settled" as const),
            ),
          );
          const result = await completion;
          if (mapping.maintenance) {
            const operation = result as SynthesisPublicMaintenanceOperation;
            if (
              operation.schema !== "synthesis.maintenance_operation.v1" ||
              !operation.operation_id
            )
              throw new Error("invalid_operation");
            const domainReceiptRef = await deps.recordOperation({
              callId: context.callId,
              ...(context.sourceTurnId
                ? { sourceTurnId: context.sourceTurnId }
                : {}),
              operation,
            });
            return {
              status: "completed",
              effectCertainty: "confirmed_complete",
              value: operation as unknown as SynthesisJsonValue,
              domainReceiptRef,
            };
          }
          if (context.signal.aborted)
            return {
              status: "canceled",
              effectCertainty: "confirmed_none",
              code: "canceled",
            };
          if (mapping.delivery === "directory") {
            const exported = result as Awaited<
              ReturnType<SynthesisClient["artifacts"]["exportFiltered"]>
            >;
            if (!exported.delivery?.bundle.fileId)
              throw new SynthesisClientError(
                "unavailable",
                "Export delivery unavailable",
              );
            const manifest = normalizeWorkflowArchiveEntryName(
              exported.manifest_file,
            );
            const source = await resolveHostBridgeFileDownload(
              exported.delivery.bundle.fileId,
            );
            const directory = await deps.workspace.materializeGeneratedArchive({
              sourcePath: source.source.path,
              signal: context.signal,
              requiredEntries: [manifest],
            });
            return {
              status: "completed",
              effectCertainty: "confirmed_complete",
              value: {
                ...directory,
                paper_refs: exported.paper_refs,
                manifest_file: manifest,
                artifact_statuses: exported.artifact_statuses,
                diagnostics: exported.diagnostics,
              },
            };
          }
          if (fileDelivery(input)) {
            const output =
              await deps.workspace.beginGeneratedTextOutput(".json");
            try {
              await output.append(JSON.stringify(result));
              if (context.signal.aborted) {
                await output.discard();
                return {
                  status: "canceled",
                  effectCertainty: "confirmed_none",
                  code: "canceled",
                };
              }
              const artifact = await output.commit();
              return {
                status: "completed",
                effectCertainty: "confirmed_complete",
                value: { artifact },
              };
            } catch (error) {
              await output.discard();
              throw error;
            }
          }
          return {
            status: "completed",
            effectCertainty: "not_applicable",
            value: result as SynthesisJsonValue,
          };
        } catch (error) {
          if (mapping.maintenance && started)
            context.trackPhysical?.(Promise.resolve("unknown"));
          const message = error instanceof Error ? error.message : "";
          if (message.includes("pi_managed_cleanup_pending")) {
            context.trackPhysical?.(Promise.resolve("unknown"));
            return {
              status: "failed",
              effectCertainty: "unknown",
              code: "cleanup_pending",
            };
          }
          const archiveError = error as Partial<WorkflowHostErrorData> | null;
          if (
            archiveError?.schema === WORKFLOW_HOST_ERROR_SCHEMA &&
            archiveError.code &&
            archiveError.details
          ) {
            try {
              const safe = createWorkflowHostErrorData(
                archiveError.code,
                archiveError.details,
              );
              return {
                status: safe.code === "canceled" ? "canceled" : "failed",
                effectCertainty: "confirmed_none",
                code: safe.code,
                retryable: safe.retryable,
                details: safe.details,
              };
            } catch {
              /* Unknown or malformed diagnostics stay private. */
            }
          }
          if (message === "pi_generated_archive_canceled")
            return {
              status: "canceled",
              effectCertainty: "confirmed_none",
              code: "canceled",
            };
          if (
            /^pi_(?:managed_file_too_large|generated_file_too_large|owner_quota_exceeded|manifest_limit|generated_archive_too_(?:large|deep))$/.test(
              message,
            )
          ) {
            return {
              status: "failed",
              effectCertainty: "confirmed_none",
              code: "resource_limited",
            };
          }
          const code =
            error instanceof SynthesisClientError
              ? error.code === "internal"
                ? "internal_error"
                : error.code
              : "internal_error";
          return {
            status: "failed",
            effectCertainty:
              mapping.maintenance && started ? "unknown" : "confirmed_none",
            code,
            ...(error instanceof SynthesisClientError
              ? { details: error.details }
              : {}),
          };
        }
      },
    };
  });
}
