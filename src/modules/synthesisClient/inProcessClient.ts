import {
  SYNTHESIS_CANONICAL_REVISION_REVIEW_ACTIONS,
  SYNTHESIS_CITATION_GRAPH_LAYOUT_ALGORITHMS,
  SYNTHESIS_CONCEPT_REVIEW_ACTIONS,
  SYNTHESIS_REFERENCE_MATCH_PROPOSAL_ACTIONS,
  SYNTHESIS_REFERENCE_MATCH_PROPOSAL_DECISION_ACTIONS,
  SYNTHESIS_SYNC_CONFLICT_RESOLUTION_ACTIONS,
  SYNTHESIS_TAG_IMPORT_ACTIONS,
  SYNTHESIS_TOPIC_GRAPH_REVIEW_ACTIONS,
  SYNTHESIS_WORKBENCH_SURFACES,
  SynthesisClientError,
  rebuildSynthesisHostItemRefs,
  rebuildSynthesisTopicContextRequest,
  rebuildSynthesisTopicContextResult,
  rebuildSynthesisTopicFindRequest,
  rebuildSynthesisTopicFindResult,
  rebuildSynthesisTopicListRequest,
  rebuildSynthesisTopicListResult,
  rebuildSynthesisTopicResolverRequest,
  rebuildSynthesisTopicResolverResult,
  rebuildSynthesisTopicReportResult,
  rebuildSynthesisTopicApplyRequest,
  rebuildSynthesisTopicApplyResult,
  rebuildSynthesisLiteratureDigestApplyRequest,
  rebuildSynthesisLiteratureDigestApplyResult,
  rebuildSynthesisArtifactCapabilityResult,
  rebuildSynthesisConceptCapabilityResult,
  rebuildSynthesisDebugCapabilityResult,
  rebuildSynthesisLibraryIndexResult,
  rebuildSynthesisProtocolCapabilityDto,
  rebuildSynthesisReferenceCapabilityResult,
  rebuildSynthesisTagCapabilityResult,
  rebuildSynthesisTopicGraphCapabilityResult,
  rebuildSynthesisWorkflowTopicOptionsRequest,
  rebuildSynthesisWorkflowTopicOptionsResult,
  rebuildSynthesisWorkbenchReadState,
  rebuildSynthesisWorkbenchSurfaceResult,
  rebuildSynthesisWorkbenchPaperDigestReadRequest,
  rebuildSynthesisWorkbenchPaperDigestResult,
  rebuildSynthesisWorkbenchTopicDetailResult,
  rebuildSynthesisWorkflowReviewRequest,
  rebuildSynthesisWorkflowReviewResult,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisClient,
  type SynthesisDeliveryContext,
  type SynthesisConceptCommandResult,
  type SynthesisConceptDeleteRequest,
  type SynthesisConceptDisplayFields,
  type SynthesisConceptDisplayTextUpdateRequest,
  type SynthesisConceptReviewActionRequest,
  type SynthesisCanonicalReferenceArchiveRequest,
  type SynthesisCanonicalReferenceMergePair,
  type SynthesisCanonicalReferenceMetadataPatch,
  type SynthesisCanonicalReferenceMetadataUpdateRequest,
  type SynthesisCanonicalRevisionMergeRequestsRequest,
  type SynthesisCanonicalRevisionReviewRequest,
  type SynthesisCitationGraphLayoutRequest,
  type SynthesisCitationGraphLayoutReadResult,
  type SynthesisCitationGraphMetricsResult,
  type SynthesisCitationGraphSliceResult,
  type SynthesisDatabaseResetRequest,
  type SynthesisDatabaseResetResult,
  type SynthesisLiteratureDigestApplyRequest,
  type SynthesisPaperArtifactsRequest,
  type SynthesisPaperArtifactsResult,
  type SynthesisPublicMaintenanceOperation,
  type SynthesisPublicMaintenanceOperationControlRequest,
  type SynthesisReferenceCommandResult,
  type SynthesisReferenceMatchProposalAction,
  type SynthesisReferenceMatchProposalActionRequest,
  type SynthesisReferenceMatchProposalActionsRequest,
  type SynthesisReferenceMatchProposalDecision,
  type SynthesisReferenceMatchProposalDecisionAction,
  type SynthesisReferenceMatchProposalManualTarget,
  type SynthesisRelatedItemsEchoRequest,
  type SynthesisStartupReconcileResult,
  type SynthesisSyncCommandResult,
  type SynthesisSyncConflictResolutionRequest,
  type SynthesisSyncTransportClient,
  type SynthesisTagAuditReplaceRequest,
  type SynthesisTagCommandResult,
  type SynthesisTagImportApplyRequest,
  type SynthesisTagImportPreviewRequest,
  type SynthesisTagSelectionRequest,
  type SynthesisTagSuggestionStageRequest,
  type SynthesisStagedTagUpdateRequest,
  type SynthesisTagStagedSuggestion,
  type SynthesisTagVocabularySnapshot,
  type SynthesisTagVocabularySaveRequest,
  type SynthesisTagVocabularyEntryDeleteRequest,
  type SynthesisTagVocabularyEntryUpdateRequest,
  type SynthesisTopicApplyRequest,
  type SynthesisTopicApplyResult,
  type SynthesisTopicArtifactDeleteRequest,
  type SynthesisTopicArtifactDeleteResult,
  type SynthesisTopicCommandResult,
  type SynthesisDeletedTopicArtifactsPurgeResult,
  type SynthesisTopicDiscoveryHintRequest,
  type SynthesisTopicGraphCommandResult,
  type SynthesisTopicGraphEdgeDecisionRequest,
  type SynthesisTopicGraphReviewActionRequest,
  type SynthesisTopicReportRequest,
  type SynthesisTopicReportResult,
  type SynthesisWorkflowTopicOptionsRequest,
  type SynthesisWorkflowTopicOptionsResult,
  type SynthesisGraphCommandResult,
  type SynthesisGraphQueryResult,
  type SynthesisJsonObject,
  type SynthesisEffectiveCanonicalReferenceMergeRequest,
  type SynthesisWorkbenchPaperDigestResult,
  type SynthesisWorkbenchBackgroundJobRow,
  type SynthesisWorkbenchProjection,
  type SynthesisWorkbenchSurfaceProjection,
  type SynthesisWorkbenchSurfaceProjectionMap,
  type SynthesisWorkbenchSurfaceReadRequest,
  type SynthesisWorkbenchSurfaceName,
  type SynthesisWorkbenchTopicDetailResult,
} from "../../../packages/synthesis-contracts/src/index";
import { isTransientStorageBusyError } from "../guardedSqlite";

type ClientMethod<
  Group extends keyof SynthesisClient,
  Method extends keyof SynthesisClient[Group],
> = SynthesisClient[Group][Method] extends (...args: infer Args) => infer Result
  ? (...args: Args) => Result
  : never;

type SyncTransportMethod<
  Method extends keyof SynthesisClient["sync"]["webDav"],
> = SynthesisClient["sync"]["webDav"][Method];

export interface SynthesisClientPort {
  listTopics?: ClientMethod<"topics", "list">;
  findTopicsByPaperRef?: ClientMethod<"topics", "findByPaperRef">;
  getTopicContext?: ClientMethod<"topics", "getContext">;
  resolveResolver?: ClientMethod<"topics", "resolveResolver">;
  queryCitationGraphCluster?: ClientMethod<"graph", "queryCluster">;
  queryCitationGraph?: ClientMethod<"graph", "getOverview">;
  getCitationGraphSlice?: ClientMethod<"graph", "getSlice">;
  getCitationGraphLayout?: ClientMethod<"graph", "getPersistedLayout">;
  getCitationGraphMetrics?: ClientMethod<"graph", "getMetrics">;
  rankLibraryPapers?: ClientMethod<"graph", "rankLibraryPapers">;
  refreshCitationGraphMetricsNow?: ClientMethod<"graph", "refreshMetricsNow">;
  startCitationGraphUpdate?: ClientMethod<"graph", "startUpdate">;
  getReferenceSidecarIndex?: ClientMethod<"references", "getSidecarIndex">;
  rankExternalReferences?: ClientMethod<"references", "rankExternalReferences">;
  getAttentionQueue?: ClientMethod<"references", "getAttentionQueue">;
  startReferenceSidecarRefresh?: ClientMethod<"references", "startRefresh">;
  getPaperArtifactManifest?: ClientMethod<"artifacts", "getManifest">;
  exportFilteredPaperArtifacts?: ClientMethod<"artifacts", "exportFiltered">;
  queryConceptKb?: ClientMethod<"concepts", "query">;
  getSchemas?: ClientMethod<"maintenance", "getSchemas">;
  getPublicMaintenanceOperation?: ClientMethod<"maintenance", "getOperation">;
  controlPublicMaintenanceOperation?: ClientMethod<
    "maintenance",
    "controlOperation"
  >;
  getLibraryIndex?: ClientMethod<"libraryIndex", "getPage">;
  getReviewInput?: ClientMethod<"workflowReview", "getInput">;
  debugSynthesisSnapshot?: ClientMethod<"debug", "snapshot">;
  debugSynthesisCacheList?: ClientMethod<"debug", "listCache">;
  debugSynthesisOperationsList?: ClientMethod<"debug", "listOperations">;
  debugSynthesisProfilerList?: ClientMethod<"debug", "listProfiler">;
  debugSynthesisPaperInspect?: ClientMethod<"debug", "inspectPaper">;
  debugSynthesisTopicInspect?: ClientMethod<"debug", "inspectTopic">;
  debugSynthesisDiff?: ClientMethod<"debug", "diff">;
  debugSynthesisCleanInstallReset?: ClientMethod<"debug", "cleanInstallReset">;
  listWorkflowTopicOptions: ClientMethod<"topics", "listWorkflowOptions">;
  reconcileSynthesisRuntimeWorkStateOnStartup?(): SynthesisStartupReconcileResult;
  resetSynthesisDatabase?: ClientMethod<"maintenance", "resetDatabase">;
  consumeRelatedItemsSyncEcho?: (
    request: SynthesisRelatedItemsEchoRequest,
  ) => Promise<boolean>;
  applyLiteratureDigestSidecar?: ClientMethod<
    "workflowApply",
    "applyLiteratureDigestSidecar"
  >;
  applyTopicSynthesisResult?(
    bundle: SynthesisTopicApplyRequest["bundle"],
    context?: {
      bundleReader: { readText(path: string): Promise<string> };
      controlledAssets?: SynthesisTopicApplyRequest["assets"];
    },
  ): Promise<SynthesisTopicApplyResult>;
  getTopicReport?: ClientMethod<"topics", "getTopicReport">;
  deleteTopicArtifact?: ClientMethod<"topics", "deleteTopicArtifact">;
  purgeDeletedTopicArtifacts?: ClientMethod<
    "topics",
    "purgeDeletedTopicArtifacts"
  >;
  rejectTopicDiscoveryHint?: ClientMethod<"topics", "rejectTopicDiscoveryHint">;
  restoreTopicDiscoveryHint?: ClientMethod<
    "topics",
    "restoreTopicDiscoveryHint"
  >;
  rebuildTopicGraphIndex?: ClientMethod<"topicGraph", "rebuildTopicGraphIndex">;
  acceptTopicGraphRelation?: ClientMethod<
    "topicGraph",
    "acceptTopicGraphRelation"
  >;
  rejectTopicGraphRelation?: ClientMethod<
    "topicGraph",
    "rejectTopicGraphRelation"
  >;
  applyTopicGraphReviewAction?: ClientMethod<
    "topicGraph",
    "applyTopicGraphReviewAction"
  >;
  readPaperArtifacts?: ClientMethod<"artifacts", "readPaperArtifacts">;
  initializeBuiltinTagPolicy?: ClientMethod<
    "tags",
    "initializeBuiltinTagPolicy"
  >;
  isBuiltinTagPolicyInitialized?(): boolean | Promise<boolean>;
  loadTagVocabulary?: ClientMethod<"tags", "loadTagVocabulary">;
  saveTagVocabulary?: ClientMethod<"tags", "saveTagVocabulary">;
  validateTagVocabulary?: ClientMethod<"tags", "validateTagVocabulary">;
  rebuildTagVocabularyIndex?: ClientMethod<"tags", "rebuildTagVocabularyIndex">;
  exportTagVocabularyForRegulator?: ClientMethod<
    "tags",
    "exportTagVocabularyForRegulator"
  >;
  listStagedTagSuggestions?: ClientMethod<"tags", "listStagedTagSuggestions">;
  stageTagSuggestions?: ClientMethod<"tags", "stageTagSuggestions">;
  updateStagedTagSuggestion?: ClientMethod<"tags", "updateStagedTagSuggestion">;
  updateTagVocabularyEntry?: ClientMethod<"tags", "updateTagVocabularyEntry">;
  deleteTagVocabularyEntry?: ClientMethod<"tags", "deleteTagVocabularyEntry">;
  promoteStagedTagSuggestions?: ClientMethod<
    "tags",
    "promoteStagedTagSuggestions"
  >;
  discardStagedTagSuggestions?: ClientMethod<
    "tags",
    "discardStagedTagSuggestions"
  >;
  clearStagedTagSuggestions?: ClientMethod<"tags", "clearStagedTagSuggestions">;
  previewTagVocabularyImport?: ClientMethod<
    "tags",
    "previewTagVocabularyImport"
  >;
  applyTagVocabularyImport?: ClientMethod<"tags", "applyTagVocabularyImport">;
  replaceTagAuditRecords?: ClientMethod<"tags", "replaceTagAuditRecords">;
  clearTagAuditRecord?: ClientMethod<"tags", "clearTagAuditRecord">;
  getSynthesisWorkbenchChromeInput?(
    state: Record<string, unknown>,
  ): Promise<SynthesisWorkbenchProjection>;
  getSynthesisWorkbenchSurfaceInput?(
    surface: SynthesisWorkbenchSurfaceName,
    state: Record<string, unknown>,
  ): Promise<SynthesisWorkbenchSurfaceProjection>;
  getSynthesisBackgroundJobRows?(): Promise<
    SynthesisWorkbenchBackgroundJobRow[]
  >;
  readTopicDetail?(request: {
    topicId: string;
  }): Promise<SynthesisWorkbenchTopicDetailResult>;
  resolveTopicPaperDigest?(
    request: SynthesisTopicPaperDigestWireRequest,
  ): Promise<SynthesisWorkbenchPaperDigestResult>;
  recomputeCitationGraphLayout?: ClientMethod<
    "graph",
    "recomputeCitationGraphLayout"
  >;
  rebuildCitationGraphCacheNow?: ClientMethod<
    "graph",
    "rebuildCitationGraphCacheNow"
  >;
  refreshCitationGraphCacheIncrementalNow?: ClientMethod<
    "graph",
    "refreshCitationGraphCacheIncrementalNow"
  >;
  retryCitationGraphCacheRebuild?: ClientMethod<
    "graph",
    "retryCitationGraphCacheRebuild"
  >;
  refreshReferenceSidecarNow?: ClientMethod<
    "references",
    "refreshReferenceSidecarNow"
  >;
  retryReferenceSidecarRefresh?: ClientMethod<
    "references",
    "retryReferenceSidecarRefresh"
  >;
  runAdvancedReferenceMatchingNow?: ClientMethod<
    "references",
    "runAdvancedReferenceMatchingNow"
  >;
  retryAdvancedReferenceMatching?: ClientMethod<
    "references",
    "retryAdvancedReferenceMatching"
  >;
  applyCanonicalRevisionReviewAction?: ClientMethod<
    "references",
    "applyCanonicalRevisionReviewAction"
  >;
  applyReferenceMatchProposalAction?: ClientMethod<
    "references",
    "applyReferenceMatchProposalAction"
  >;
  applyReferenceMatchProposalActions?: ClientMethod<
    "references",
    "applyReferenceMatchProposalActions"
  >;
  mergeEffectiveCanonicalReference?: ClientMethod<
    "references",
    "mergeEffectiveCanonicalReference"
  >;
  applyCanonicalRevisionMergeRequests?: ClientMethod<
    "references",
    "applyCanonicalRevisionMergeRequests"
  >;
  updateCanonicalReferenceMetadata?: ClientMethod<
    "references",
    "updateCanonicalReferenceMetadata"
  >;
  archiveCanonicalReference?: ClientMethod<
    "references",
    "archiveCanonicalReference"
  >;
  rebuildConceptKbIndex?: ClientMethod<"concepts", "rebuildConceptKbIndex">;
  auditConceptAliases?: ClientMethod<"concepts", "auditConceptAliases">;
  updateConceptDisplayText?: ClientMethod<
    "concepts",
    "updateConceptDisplayText"
  >;
  applyConceptReviewAction?: ClientMethod<
    "concepts",
    "applyConceptReviewAction"
  >;
  deleteConceptEntries?: ClientMethod<"concepts", "deleteConceptEntries">;
  syncWebDavNow?: SyncTransportMethod<"runNow">;
  pauseWebDavSync?: SyncTransportMethod<"pause">;
  resumeWebDavSync?: SyncTransportMethod<"resume">;
  retryWebDavSync?: SyncTransportMethod<"retry">;
  resolveWebDavSyncConflict?: SyncTransportMethod<"resolveConflict">;
}

type SynthesisTopicPaperDigestWireRequest = {
  topic_id?: string;
  paper_ref: string;
  digest_ref?: {
    paper_ref: string;
    locator?: string;
    payload_hash: string;
    library_id?: number;
    note_key?: string;
  };
  include_representative_image: boolean;
};

export type LegacySynthesisPort = Partial<
  Record<keyof SynthesisClientPort, (...args: any[]) => any>
>;

function normalizeClientError(error: unknown): SynthesisClientError {
  if (error instanceof SynthesisClientError) {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    (error as { name?: unknown }).name === "SynthesisMaintenanceError"
  ) {
    const reasonCode = String((error as { code?: unknown }).code || "").trim();
    return new SynthesisClientError(
      reasonCode === "maintenance_idempotency_conflict"
        ? "conflict"
        : "invalid_request",
      error instanceof Error
        ? error.message
        : "Invalid Synthesis maintenance request",
      reasonCode ? { reasonCode } : undefined,
    );
  }
  if (isTransientStorageBusyError(error)) {
    return new SynthesisClientError(
      "storage_busy",
      error instanceof Error
        ? error.message
        : "Synthesis storage is temporarily busy",
      {
        causeName: error instanceof Error ? error.name : typeof error,
      },
    );
  }
  return new SynthesisClientError(
    "internal",
    error instanceof Error ? error.message : "Synthesis client request failed",
    {
      causeName: error instanceof Error ? error.name : typeof error,
    },
  );
}

function requireLegacyPort<T>(port: T | undefined, operation: string): T {
  if (typeof port !== "function") {
    throw new SynthesisClientError(
      "unavailable",
      `Synthesis operation is unavailable: ${operation}`,
      { operation },
    );
  }
  return port;
}

function normalizeLegacyJson(value: unknown) {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new SynthesisClientError(
      "internal",
      "Synthesis operation returned a non-JSON result",
    );
  }
  return toSynthesisJsonValue(JSON.parse(serialized), "$.response");
}

function normalizeLegacyObject(value: unknown) {
  return toSynthesisJsonObject(normalizeLegacyJson(value), "$.response");
}

function normalizeLegacyResultObject(value: unknown, label: string) {
  const result = normalizeLegacyJson(value);
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    throw new SynthesisClientError("internal", `${label} response is invalid`);
  }
  return result;
}

async function runLegacy<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw normalizeClientError(error);
  }
}

function normalizeDeliveryContext(
  value: SynthesisDeliveryContext | undefined,
): SynthesisDeliveryContext | undefined {
  if (value === undefined) return undefined;
  const context = toSynthesisJsonObject(value, "$.delivery");
  if (context.mode !== "local" && context.mode !== "remote") {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis delivery mode is invalid",
      { mode: typeof context.mode === "string" ? context.mode : "invalid" },
    );
  }
  return { mode: context.mode };
}

function runLegacyJsonPort<Request, Result>(
  port:
    | ((
        request: Request,
        delivery?: SynthesisDeliveryContext,
      ) => Promise<Result>)
    | undefined,
  operation: string,
  request: Request = {} as Request,
  delivery?: SynthesisDeliveryContext,
  rebuildResult?: (value: unknown) => Result,
): Promise<Result> {
  return runLegacy(async () => {
    const normalizedRequest = toSynthesisJsonObject(request, "$.request");
    const normalizedDelivery = normalizeDeliveryContext(delivery);
    const invoke = requireLegacyPort(port, operation);
    const result = await invoke(
      normalizedRequest as unknown as Request,
      normalizedDelivery,
    );
    return rebuildResult
      ? rebuildResult(result)
      : (normalizeLegacyResultObject(result, operation) as unknown as Result);
  });
}

function normalizeWorkbenchState(value: unknown) {
  return rebuildSynthesisWorkbenchReadState(value);
}

function normalizeWorkbenchSurface(value: unknown) {
  if (
    typeof value !== "string" ||
    !SYNTHESIS_WORKBENCH_SURFACES.includes(
      value as SynthesisWorkbenchSurfaceName,
    )
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Workbench surface is invalid",
      { surface: typeof value === "string" ? value : typeof value },
    );
  }
  return value as SynthesisWorkbenchSurfaceName;
}

function normalizeTopicId(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Workbench topicId is required",
    );
  }
  return value.trim();
}

function normalizeTopicArtifactDeleteRequest(
  value: unknown,
): SynthesisTopicArtifactDeleteRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    topicId: normalizeRequiredString(
      request.topicId,
      "topicId",
      "Synthesis Topic topicId",
    ),
  };
}

function normalizeTopicDiscoveryHintRequest(
  value: unknown,
): SynthesisTopicDiscoveryHintRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    hintId: normalizeRequiredString(
      request.hintId,
      "hintId",
      "Synthesis Topic discovery hintId",
    ),
  };
}

function normalizeTopicGraphEdgeDecisionRequest(
  value: unknown,
): SynthesisTopicGraphEdgeDecisionRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    edgeId: normalizeRequiredString(
      request.edgeId,
      "edgeId",
      "Synthesis Topic Graph edgeId",
    ),
  };
}

function normalizeTopicGraphReviewActionRequest(
  value: unknown,
): SynthesisTopicGraphReviewActionRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    reviewId: normalizeRequiredString(
      request.reviewId,
      "reviewId",
      "Synthesis Topic Graph reviewId",
    ),
    action: normalizeStringEnum(
      request.action,
      SYNTHESIS_TOPIC_GRAPH_REVIEW_ACTIONS,
      "action",
      "Synthesis Topic Graph review action",
    ),
  };
}

function normalizeSyncConflictResolutionRequest(
  value: unknown,
): SynthesisSyncConflictResolutionRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    action: normalizeStringEnum(
      request.action,
      SYNTHESIS_SYNC_CONFLICT_RESOLUTION_ACTIONS,
      "action",
      "Synthesis Sync conflict resolution action",
    ),
  };
}

type LegacySyncTransportPorts = {
  runNow?: () => Promise<SynthesisPublicMaintenanceOperation>;
  pause?: () => Promise<SynthesisSyncCommandResult>;
  resume?: () => Promise<SynthesisSyncCommandResult>;
  retry?: () => Promise<SynthesisPublicMaintenanceOperation>;
  resolveConflict?: (
    request: SynthesisSyncConflictResolutionRequest,
  ) => Promise<SynthesisSyncCommandResult>;
};

function createSyncTransportClient(
  ports: LegacySyncTransportPorts,
  operationPrefix: string,
): SynthesisSyncTransportClient {
  const runCommand = <
    T extends SynthesisSyncCommandResult | SynthesisPublicMaintenanceOperation,
  >(
    port: (() => Promise<T>) | undefined,
    operation: string,
  ) =>
    runLegacy(
      async () =>
        normalizeLegacyResultObject(
          await requireLegacyPort(port, operation)(),
          "Synthesis Sync command",
        ) as T,
    );
  return {
    runNow: () =>
      runCommand<SynthesisPublicMaintenanceOperation>(
        ports.runNow,
        `${operationPrefix}.runNow`,
      ),
    pause: () =>
      runCommand<SynthesisSyncCommandResult>(
        ports.pause,
        `${operationPrefix}.pause`,
      ),
    resume: () =>
      runCommand<SynthesisSyncCommandResult>(
        ports.resume,
        `${operationPrefix}.resume`,
      ),
    retry: () =>
      runCommand<SynthesisPublicMaintenanceOperation>(
        ports.retry,
        `${operationPrefix}.retry`,
      ),
    resolveConflict(request) {
      return runLegacy(async () => {
        const normalizedRequest =
          normalizeSyncConflictResolutionRequest(request);
        const port = requireLegacyPort(
          ports.resolveConflict,
          `${operationPrefix}.resolveConflict`,
        );
        return normalizeLegacyResultObject(
          await port(normalizedRequest),
          "Synthesis Sync command",
        ) as SynthesisSyncCommandResult;
      });
    },
  };
}

function normalizeCitationGraphLayoutRequest(
  value: unknown,
): SynthesisCitationGraphLayoutRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  const algorithm = request.algorithm;
  if (
    typeof algorithm !== "string" ||
    !SYNTHESIS_CITATION_GRAPH_LAYOUT_ALGORITHMS.includes(
      algorithm as SynthesisCitationGraphLayoutRequest["algorithm"],
    )
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Citation Graph layout algorithm is invalid",
      {
        algorithm: typeof algorithm === "string" ? algorithm : typeof algorithm,
      },
    );
  }
  if (request.force !== undefined && typeof request.force !== "boolean") {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Citation Graph layout force must be a boolean",
      { field: "force" },
    );
  }
  return request.force === undefined
    ? {
        algorithm:
          algorithm as SynthesisCitationGraphLayoutRequest["algorithm"],
      }
    : {
        algorithm:
          algorithm as SynthesisCitationGraphLayoutRequest["algorithm"],
        force: request.force as boolean,
      };
}

function normalizeRequiredString(
  value: unknown,
  location: string,
  label: string,
) {
  if (typeof value !== "string" || !value.trim()) {
    throw new SynthesisClientError("invalid_request", `${label} is required`, {
      field: location,
    });
  }
  return value.trim();
}

function omitUndefinedTagFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(omitUndefinedTagFields);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) =>
      entry === undefined
        ? []
        : [[key, omitUndefinedTagFields(entry)] as const],
    ),
  );
}

function normalizeTagVocabularySaveRequest(
  value: unknown,
): SynthesisTagVocabularySaveRequest {
  const request = toSynthesisJsonObject(
    omitUndefinedTagFields(value),
    "$.request",
  );
  if (!Array.isArray(request.entries)) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Tag Vocabulary entries must be an array",
      { field: "entries" },
    );
  }
  return {
    entries: request.entries as SynthesisTagVocabularySaveRequest["entries"],
    aliases: (request.aliases ?? {}) as Record<string, string>,
    abbrev: (request.abbrev ?? {}) as Record<string, string>,
    protocol: (request.protocol ?? null) as never,
    ...(request.transactionId === undefined
      ? {}
      : { transactionId: request.transactionId as string }),
  };
}

function normalizeTagSuggestionStageRequest(
  value: unknown,
): SynthesisTagSuggestionStageRequest {
  const request = toSynthesisJsonObject(
    omitUndefinedTagFields(value),
    "$.request",
  );
  if (!Array.isArray(request.entries)) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis staged Tag entries must be an array",
      { field: "entries" },
    );
  }
  return {
    entries: request.entries.map((entry, index) => {
      const suggestion = toSynthesisJsonObject(
        entry,
        `$.request.entries[${index}]`,
      );
      return {
        tag: suggestion.tag as string,
        facet: (suggestion.facet ?? "") as string,
        note: (suggestion.note ?? "") as string,
        source_flow: (suggestion.source_flow ?? "") as string,
        parent_bindings: (suggestion.parent_bindings ?? []) as never[],
      };
    }),
  };
}

function normalizeTagSelectionRequest(
  value: unknown,
): SynthesisTagSelectionRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  if (!Array.isArray(request.tags)) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis staged Tag selection tags must be an array",
      { field: "tags" },
    );
  }
  return {
    tags: request.tags.map((tag, index) =>
      normalizeRequiredString(
        tag,
        `tags[${index}]`,
        "Synthesis staged Tag selection tag",
      ),
    ),
  };
}

function normalizeStagedTagUpdateRequest(
  value: unknown,
): SynthesisStagedTagUpdateRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  if (typeof request.note !== "string") {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis staged Tag update note must be a string",
      { field: "note" },
    );
  }
  if (!Array.isArray(request.parentBindings)) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis staged Tag update parentBindings must be an array",
      { field: "parentBindings" },
    );
  }
  const parentBindings = rebuildSynthesisHostItemRefs(
    request.parentBindings,
    "parentBindings",
  );
  return {
    originalTag: normalizeRequiredString(
      request.originalTag,
      "originalTag",
      "Synthesis staged Tag update originalTag",
    ),
    tag: normalizeRequiredString(
      request.tag,
      "tag",
      "Synthesis staged Tag update tag",
    ),
    facet: normalizeRequiredString(
      request.facet,
      "facet",
      "Synthesis staged Tag update facet",
    ),
    note: request.note.trim(),
    sourceFlow: normalizeRequiredString(
      request.sourceFlow,
      "sourceFlow",
      "Synthesis staged Tag update sourceFlow",
    ),
    parentBindings,
  };
}

function normalizeTagVocabularyEntryUpdateRequest(
  value: unknown,
): SynthesisTagVocabularyEntryUpdateRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  if (typeof request.note !== "string") {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Tag Vocabulary entry update note must be a string",
      { field: "note" },
    );
  }
  return {
    originalTag: normalizeRequiredString(
      request.originalTag,
      "originalTag",
      "Synthesis Tag Vocabulary entry update originalTag",
    ),
    tag: normalizeRequiredString(
      request.tag,
      "tag",
      "Synthesis Tag Vocabulary entry update tag",
    ),
    facet: normalizeRequiredString(
      request.facet,
      "facet",
      "Synthesis Tag Vocabulary entry update facet",
    ),
    note: request.note.trim(),
  };
}

function normalizeTagVocabularyEntryDeleteRequest(
  value: unknown,
): SynthesisTagVocabularyEntryDeleteRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    originalTag: normalizeRequiredString(
      request.originalTag,
      "originalTag",
      "Synthesis Tag Vocabulary entry delete originalTag",
    ),
  };
}

function normalizeTagImportPayload(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Tag import payload is required",
      { field: "payload" },
    );
  }
  return value;
}

function normalizeTagImportPreviewRequest(
  value: unknown,
): SynthesisTagImportPreviewRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return { payload: normalizeTagImportPayload(request.payload) };
}

function normalizeTagImportApplyRequest(
  value: unknown,
): SynthesisTagImportApplyRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    payload: normalizeTagImportPayload(request.payload),
    action: normalizeStringEnum(
      request.action,
      SYNTHESIS_TAG_IMPORT_ACTIONS,
      "action",
      "Synthesis Tag import action",
    ),
  };
}

function normalizeStringEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  location: string,
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new SynthesisClientError("invalid_request", `${label} is invalid`, {
      field: location,
      value: typeof value === "string" ? value : typeof value,
    });
  }
  return value as T;
}

function normalizeCanonicalRevisionReviewRequest(
  value: unknown,
): SynthesisCanonicalRevisionReviewRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    reviewItemId: normalizeRequiredString(
      request.reviewItemId,
      "reviewItemId",
      "Synthesis canonical revision reviewItemId",
    ),
    action: normalizeStringEnum(
      request.action,
      SYNTHESIS_CANONICAL_REVISION_REVIEW_ACTIONS,
      "action",
      "Synthesis canonical revision action",
    ),
  };
}

function normalizeReferenceMatchProposalActionRequest(
  value: unknown,
): SynthesisReferenceMatchProposalActionRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    proposalId: normalizeRequiredString(
      request.proposalId,
      "proposalId",
      "Synthesis Reference match proposalId",
    ),
    action: normalizeStringEnum(
      request.action,
      SYNTHESIS_REFERENCE_MATCH_PROPOSAL_ACTIONS,
      "action",
      "Synthesis Reference match proposal action",
    ),
  };
}

function normalizeReferenceMatchProposalManualTarget(
  value: unknown,
  location: string,
): SynthesisReferenceMatchProposalManualTarget {
  const target = toSynthesisJsonObject(value, location);
  if (target.kind === "zotero_item") {
    if (
      typeof target.libraryId !== "number" ||
      !Number.isInteger(target.libraryId) ||
      target.libraryId <= 0
    ) {
      throw new SynthesisClientError(
        "invalid_request",
        "Synthesis Reference match proposal target libraryId must be a positive integer",
        { field: `${location}.libraryId` },
      );
    }
    return {
      kind: "zotero_item",
      libraryId: target.libraryId,
      itemKey: normalizeRequiredString(
        target.itemKey,
        `${location}.itemKey`,
        "Synthesis Reference match proposal target itemKey",
      ),
    };
  }
  if (target.kind === "canonical_reference") {
    return {
      kind: "canonical_reference",
      canonicalReferenceId: normalizeRequiredString(
        target.canonicalReferenceId,
        `${location}.canonicalReferenceId`,
        "Synthesis Reference match proposal target canonicalReferenceId",
      ),
    };
  }
  throw new SynthesisClientError(
    "invalid_request",
    "Synthesis Reference match proposal target kind is invalid",
    {
      field: `${location}.kind`,
      value: typeof target.kind === "string" ? target.kind : typeof target.kind,
    },
  );
}

function normalizeReferenceMatchProposalDecision(
  value: unknown,
  index: number,
): SynthesisReferenceMatchProposalDecision {
  const location = `$.request.decisions[${index}]`;
  const decision = toSynthesisJsonObject(value, location);
  const proposalId = normalizeRequiredString(
    decision.proposalId,
    `${location}.proposalId`,
    "Synthesis Reference match proposalId",
  );
  const action = normalizeStringEnum(
    decision.action,
    SYNTHESIS_REFERENCE_MATCH_PROPOSAL_DECISION_ACTIONS,
    `${location}.action`,
    "Synthesis Reference match proposal decision action",
  ) as SynthesisReferenceMatchProposalDecisionAction;
  if (action === "manual_target") {
    return {
      proposalId,
      action,
      target: normalizeReferenceMatchProposalManualTarget(
        decision.target,
        `${location}.target`,
      ),
    };
  }
  return {
    proposalId,
    action: action as SynthesisReferenceMatchProposalAction,
  };
}

function normalizeReferenceMatchProposalActionsRequest(
  value: unknown,
): SynthesisReferenceMatchProposalActionsRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  if (!Array.isArray(request.decisions) || request.decisions.length === 0) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Reference match proposal decisions are required",
      { field: "decisions" },
    );
  }
  return {
    decisions: request.decisions.map((decision, index) =>
      normalizeReferenceMatchProposalDecision(decision, index),
    ),
  };
}

function normalizeCanonicalReferenceMergePair(
  value: unknown,
  location = "$.request",
): SynthesisCanonicalReferenceMergePair {
  const request = toSynthesisJsonObject(value, location);
  return {
    sourceEffectiveCanonicalId: normalizeRequiredString(
      request.sourceEffectiveCanonicalId,
      `${location}.sourceEffectiveCanonicalId`,
      "Synthesis canonical Reference sourceEffectiveCanonicalId",
    ),
    targetEffectiveCanonicalId: normalizeRequiredString(
      request.targetEffectiveCanonicalId,
      `${location}.targetEffectiveCanonicalId`,
      "Synthesis canonical Reference targetEffectiveCanonicalId",
    ),
  };
}

function normalizeEffectiveCanonicalReferenceMergeRequest(
  value: unknown,
): SynthesisEffectiveCanonicalReferenceMergeRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  if (
    request.confirmRetargetGroup !== undefined &&
    typeof request.confirmRetargetGroup !== "boolean"
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis canonical Reference confirmRetargetGroup must be a boolean",
      { field: "confirmRetargetGroup" },
    );
  }
  return {
    ...normalizeCanonicalReferenceMergePair(request),
    confirmRetargetGroup: request.confirmRetargetGroup === true,
  };
}

function normalizeCanonicalRevisionMergeRequestsRequest(
  value: unknown,
): SynthesisCanonicalRevisionMergeRequestsRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  if (!Array.isArray(request.requests) || request.requests.length === 0) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis canonical Reference merge requests are required",
      { field: "requests" },
    );
  }
  return {
    requests: request.requests.map((entry, index) =>
      normalizeCanonicalReferenceMergePair(
        entry,
        `$.request.requests[${index}]`,
      ),
    ),
  };
}

function normalizeOptionalMetadataString(
  patch: Record<string, unknown>,
  field: "title" | "normalizedTitle" | "year",
) {
  const value = patch[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new SynthesisClientError(
      "invalid_request",
      `Synthesis canonical Reference metadata ${field} must be a string`,
      { field: `patch.${field}` },
    );
  }
  return value.trim();
}

function normalizeCanonicalReferenceMetadataPatch(
  value: unknown,
): SynthesisCanonicalReferenceMetadataPatch {
  const patch = toSynthesisJsonObject(value, "$.request.patch");
  const normalized: SynthesisCanonicalReferenceMetadataPatch = {};
  for (const field of ["title", "normalizedTitle", "year"] as const) {
    const fieldValue = normalizeOptionalMetadataString(patch, field);
    if (fieldValue !== undefined) normalized[field] = fieldValue;
  }
  if (patch.authors !== undefined) {
    if (!Array.isArray(patch.authors)) {
      throw new SynthesisClientError(
        "invalid_request",
        "Synthesis canonical Reference metadata authors must be an array",
        { field: "patch.authors" },
      );
    }
    normalized.authors = patch.authors.map((author, index) =>
      normalizeRequiredString(
        author,
        `patch.authors[${index}]`,
        "Synthesis canonical Reference metadata author",
      ),
    );
  }
  if (patch.identifiers !== undefined) {
    const identifiers = toSynthesisJsonObject(
      patch.identifiers,
      "$.request.patch.identifiers",
    );
    normalized.identifiers = {};
    for (const [rawKey, rawValue] of Object.entries(identifiers)) {
      const key = normalizeRequiredString(
        rawKey,
        "patch.identifiers key",
        "Synthesis canonical Reference metadata identifier key",
      );
      normalized.identifiers[key] = normalizeRequiredString(
        rawValue,
        `patch.identifiers.${rawKey}`,
        "Synthesis canonical Reference metadata identifier value",
      );
    }
  }
  return normalized;
}

function normalizeCanonicalReferenceMetadataUpdateRequest(
  value: unknown,
): SynthesisCanonicalReferenceMetadataUpdateRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    canonicalReferenceId: normalizeRequiredString(
      request.canonicalReferenceId,
      "canonicalReferenceId",
      "Synthesis canonical Reference canonicalReferenceId",
    ),
    patch: normalizeCanonicalReferenceMetadataPatch(request.patch),
  };
}

function normalizeCanonicalReferenceArchiveRequest(
  value: unknown,
): SynthesisCanonicalReferenceArchiveRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    canonicalReferenceId: normalizeRequiredString(
      request.canonicalReferenceId,
      "canonicalReferenceId",
      "Synthesis canonical Reference canonicalReferenceId",
    ),
  };
}

const SYNTHESIS_CONCEPT_DISPLAY_FIELDS = [
  "short_definition",
  "definition",
  "usage_note",
  "editorial_note",
] as const;

function normalizeConceptDisplayFields(
  value: unknown,
): SynthesisConceptDisplayFields {
  const fields = toSynthesisJsonObject(value, "$.request.fields");
  const normalized: SynthesisConceptDisplayFields = {};
  for (const field of SYNTHESIS_CONCEPT_DISPLAY_FIELDS) {
    const fieldValue = fields[field];
    if (fieldValue === undefined) continue;
    if (typeof fieldValue !== "string") {
      throw new SynthesisClientError(
        "invalid_request",
        `Synthesis Concept display field ${field} must be a string`,
        { field: `fields.${field}` },
      );
    }
    normalized[field] = fieldValue.trim();
  }
  if (Object.keys(normalized).length === 0) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Concept display fields are required",
      { field: "fields" },
    );
  }
  return normalized;
}

function normalizeConceptDisplayTextUpdateRequest(
  value: unknown,
): SynthesisConceptDisplayTextUpdateRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  return {
    conceptId: normalizeRequiredString(
      request.conceptId,
      "conceptId",
      "Synthesis Concept conceptId",
    ),
    fields: normalizeConceptDisplayFields(request.fields),
  };
}

function normalizeConceptReviewActionRequest(
  value: unknown,
): SynthesisConceptReviewActionRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  const normalized: SynthesisConceptReviewActionRequest = {
    reviewId: normalizeRequiredString(
      request.reviewId,
      "reviewId",
      "Synthesis Concept reviewId",
    ),
    action: normalizeStringEnum(
      request.action,
      SYNTHESIS_CONCEPT_REVIEW_ACTIONS,
      "action",
      "Synthesis Concept review action",
    ),
  };
  if (request.targetConceptId !== undefined) {
    normalized.targetConceptId = normalizeRequiredString(
      request.targetConceptId,
      "targetConceptId",
      "Synthesis Concept targetConceptId",
    );
  }
  return normalized;
}

function normalizeConceptDeleteRequest(
  value: unknown,
): SynthesisConceptDeleteRequest {
  const request = toSynthesisJsonObject(value, "$.request");
  if (!Array.isArray(request.conceptIds) || request.conceptIds.length === 0) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Concept conceptIds are required",
      { field: "conceptIds" },
    );
  }
  return {
    conceptIds: request.conceptIds.map((conceptId, index) =>
      normalizeRequiredString(
        conceptId,
        `conceptIds[${index}]`,
        "Synthesis Concept conceptId",
      ),
    ),
  };
}

function mapPaperDigestRequest(value: unknown): SynthesisJsonObject {
  const request = rebuildSynthesisWorkbenchPaperDigestReadRequest(value);
  const allowed = [
    "topicId",
    "paperRef",
    "digestRef",
    "includeRepresentativeImage",
  ];
  if (Object.keys(request).some((field) => !allowed.includes(field))) {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Workbench paper digest request has unsupported fields",
    );
  }
  const paperRef = normalizeRequiredString(
    request.paperRef,
    "paperRef",
    "Synthesis Workbench paperRef",
  );
  if (typeof request.includeRepresentativeImage !== "boolean") {
    throw new SynthesisClientError(
      "invalid_request",
      "Synthesis Workbench includeRepresentativeImage is required",
      { field: "includeRepresentativeImage" },
    );
  }
  const mapped: SynthesisJsonObject = {
    paper_ref: paperRef,
    include_representative_image: request.includeRepresentativeImage,
  };
  if (request.topicId !== undefined) {
    mapped.topic_id = normalizeTopicId(request.topicId);
  }
  if (request.digestRef !== undefined) {
    const digestRef = toSynthesisJsonObject(
      request.digestRef,
      "$.request.digestRef",
    );
    const digestFields = [
      "paperRef",
      "locator",
      "payloadHash",
      "libraryId",
      "noteKey",
    ];
    if (
      Object.keys(digestRef).some((field) => !digestFields.includes(field)) ||
      digestRef.paperRef !== paperRef ||
      typeof digestRef.payloadHash !== "string" ||
      digestRef.payloadHash.length === 0
    ) {
      throw new SynthesisClientError(
        "invalid_request",
        "Synthesis Workbench digestRef is invalid",
        { field: "digestRef" },
      );
    }
    const locator =
      digestRef.locator === undefined
        ? undefined
        : normalizeRequiredString(
            digestRef.locator,
            "digestRef.locator",
            "Synthesis Workbench digest locator",
          );
    const libraryId = digestRef.libraryId;
    if (
      libraryId !== undefined &&
      (typeof libraryId !== "number" ||
        !Number.isSafeInteger(libraryId) ||
        libraryId <= 0)
    ) {
      throw new SynthesisClientError(
        "invalid_request",
        "Synthesis Workbench digestRef libraryId is invalid",
        { field: "digestRef.libraryId" },
      );
    }
    const noteKey =
      digestRef.noteKey === undefined
        ? undefined
        : normalizeRequiredString(
            digestRef.noteKey,
            "digestRef.noteKey",
            "Synthesis Workbench digest noteKey",
          );
    mapped.digest_ref = {
      paper_ref: paperRef,
      payload_hash: digestRef.payloadHash,
      ...(locator ? { locator } : {}),
      ...(libraryId === undefined ? {} : { library_id: libraryId }),
      ...(noteKey ? { note_key: noteKey } : {}),
    };
  }
  return mapped;
}

export function createSynthesisClientFromPort(
  legacy: SynthesisClientPort,
): SynthesisClient {
  const readWorkbenchSurface = async <
    Surface extends SynthesisWorkbenchSurfaceName,
  >(
    request: SynthesisWorkbenchSurfaceReadRequest & { surface: Surface },
  ): Promise<SynthesisWorkbenchSurfaceProjectionMap[Surface]> =>
    runLegacy(async () => {
      const normalizedRequest = {
        surface: normalizeWorkbenchSurface(request.surface) as Surface,
        state: normalizeWorkbenchState(request.state),
      };
      return rebuildSynthesisWorkbenchSurfaceResult(
        normalizedRequest,
        normalizeLegacyObject(
          await requireLegacyPort(
            legacy.getSynthesisWorkbenchSurfaceInput,
            "workbench.readSurface",
          )(normalizedRequest.surface, normalizedRequest.state),
        ),
      );
    });

  return {
    concepts: {
      async query(request = {}) {
        return runLegacyJsonPort(
          legacy.queryConceptKb,
          "concepts.query",
          request,
          undefined,
          (value) =>
            rebuildSynthesisConceptCapabilityResult(
              "client.queryConceptKb",
              value,
            ),
        );
      },
      async rebuildConceptKbIndex() {
        return runLegacy(async () =>
          rebuildSynthesisConceptCapabilityResult(
            "client.rebuildConceptKbIndex",
            await requireLegacyPort(
              legacy.rebuildConceptKbIndex,
              "concepts.rebuildConceptKbIndex",
            )(),
          ),
        );
      },
      async auditConceptAliases() {
        return runLegacy(() =>
          requireLegacyPort(
            legacy.auditConceptAliases,
            "concepts.auditConceptAliases",
          )(),
        );
      },
      async updateConceptDisplayText(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeConceptDisplayTextUpdateRequest(request);
          const port = requireLegacyPort(
            legacy.updateConceptDisplayText,
            "concepts.updateConceptDisplayText",
          );
          return rebuildSynthesisConceptCapabilityResult(
            "client.updateConceptDisplayText",
            await port(normalizedRequest),
          );
        });
      },
      async applyConceptReviewAction(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeConceptReviewActionRequest(request);
          const port = requireLegacyPort(
            legacy.applyConceptReviewAction,
            "concepts.applyConceptReviewAction",
          );
          return rebuildSynthesisConceptCapabilityResult(
            "client.applyConceptReviewAction",
            await port(normalizedRequest),
          );
        });
      },
      async deleteConceptEntries(request) {
        return runLegacy(async () => {
          const normalizedRequest = normalizeConceptDeleteRequest(request);
          const port = requireLegacyPort(
            legacy.deleteConceptEntries,
            "concepts.deleteConceptEntries",
          );
          return rebuildSynthesisConceptCapabilityResult(
            "client.deleteConceptEntries",
            await port(normalizedRequest),
          );
        });
      },
    },
    graph: {
      async startUpdate(request = {}) {
        return runLegacyJsonPort(
          legacy.startCitationGraphUpdate,
          "graph.startUpdate",
          request,
        ) as Promise<SynthesisPublicMaintenanceOperation>;
      },
      async queryCluster(request = {}) {
        return runLegacyJsonPort(
          legacy.queryCitationGraphCluster,
          "graph.queryCluster",
          request,
        ) as Promise<SynthesisGraphQueryResult>;
      },
      async getOverview(request = {}) {
        return runLegacyJsonPort(
          legacy.queryCitationGraph,
          "graph.getOverview",
          request,
        ) as Promise<SynthesisGraphQueryResult>;
      },
      async getSlice(request = {}) {
        return runLegacyJsonPort(
          legacy.getCitationGraphSlice,
          "graph.getSlice",
          request,
        ) as Promise<SynthesisCitationGraphSliceResult>;
      },
      async getPersistedLayout(request = {}) {
        return runLegacyJsonPort(
          legacy.getCitationGraphLayout,
          "graph.getPersistedLayout",
          request,
        ) as Promise<SynthesisCitationGraphLayoutReadResult>;
      },
      async getMetrics(request = {}) {
        return runLegacyJsonPort(
          legacy.getCitationGraphMetrics,
          "graph.getMetrics",
          request,
        ) as Promise<SynthesisCitationGraphMetricsResult>;
      },
      async rankLibraryPapers(request = {}) {
        return runLegacyJsonPort(
          legacy.rankLibraryPapers,
          "graph.rankLibraryPapers",
          request,
        ) as Promise<SynthesisCitationGraphMetricsResult>;
      },
      async refreshMetricsNow(request = {}) {
        return runLegacyJsonPort(
          legacy.refreshCitationGraphMetricsNow,
          "graph.refreshMetricsNow",
          request,
        ) as Promise<SynthesisPublicMaintenanceOperation>;
      },
      async recomputeCitationGraphLayout(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.recomputeCitationGraphLayout,
                "graph.recomputeCitationGraphLayout",
              )(normalizeCitationGraphLayoutRequest(request)),
            ) as SynthesisPublicMaintenanceOperation,
        );
      },
      async rebuildCitationGraphCacheNow() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.rebuildCitationGraphCacheNow,
                "graph.rebuildCitationGraphCacheNow",
              )(),
            ) as SynthesisPublicMaintenanceOperation,
        );
      },
      async refreshCitationGraphCacheIncrementalNow() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.refreshCitationGraphCacheIncrementalNow,
                "graph.refreshCitationGraphCacheIncrementalNow",
              )(),
            ) as SynthesisPublicMaintenanceOperation,
        );
      },
      async retryCitationGraphCacheRebuild() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.retryCitationGraphCacheRebuild,
                "graph.retryCitationGraphCacheRebuild",
              )(),
            ) as SynthesisPublicMaintenanceOperation,
        );
      },
    },
    sync: {
      webDav: createSyncTransportClient(
        {
          runNow: legacy.syncWebDavNow,
          pause: legacy.pauseWebDavSync,
          resume: legacy.resumeWebDavSync,
          retry: legacy.retryWebDavSync,
          resolveConflict: legacy.resolveWebDavSyncConflict,
        },
        "sync.webDav",
      ),
    },
    topicGraph: {
      async rebuildTopicGraphIndex() {
        return runLegacy(async () =>
          rebuildSynthesisTopicGraphCapabilityResult(
            "client.rebuildTopicGraphIndex",
            await requireLegacyPort(
              legacy.rebuildTopicGraphIndex,
              "topicGraph.rebuildTopicGraphIndex",
            )(),
          ),
        );
      },
      async acceptTopicGraphRelation(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeTopicGraphEdgeDecisionRequest(request);
          const port = requireLegacyPort(
            legacy.acceptTopicGraphRelation,
            "topicGraph.acceptTopicGraphRelation",
          );
          return rebuildSynthesisTopicGraphCapabilityResult(
            "client.acceptTopicGraphRelation",
            await port(normalizedRequest),
          );
        });
      },
      async rejectTopicGraphRelation(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeTopicGraphEdgeDecisionRequest(request);
          const port = requireLegacyPort(
            legacy.rejectTopicGraphRelation,
            "topicGraph.rejectTopicGraphRelation",
          );
          return rebuildSynthesisTopicGraphCapabilityResult(
            "client.rejectTopicGraphRelation",
            await port(normalizedRequest),
          );
        });
      },
      async applyTopicGraphReviewAction(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeTopicGraphReviewActionRequest(request);
          const port = requireLegacyPort(
            legacy.applyTopicGraphReviewAction,
            "topicGraph.applyTopicGraphReviewAction",
          );
          return rebuildSynthesisTopicGraphCapabilityResult(
            "client.applyTopicGraphReviewAction",
            await port(normalizedRequest),
          );
        });
      },
    },
    references: {
      async startRefresh(request = {}) {
        return runLegacyJsonPort(
          legacy.startReferenceSidecarRefresh,
          "references.startRefresh",
          request,
          undefined,
          (value) =>
            rebuildSynthesisReferenceCapabilityResult(
              "client.startReferenceSidecarRefresh",
              value,
            ),
        ) as Promise<SynthesisPublicMaintenanceOperation>;
      },
      async getSidecarIndex(request = {}) {
        return runLegacyJsonPort(
          legacy.getReferenceSidecarIndex,
          "references.getSidecarIndex",
          request,
          undefined,
          (value) =>
            rebuildSynthesisReferenceCapabilityResult(
              "client.getReferenceSidecarIndex",
              value,
            ),
        );
      },
      async rankExternalReferences(request = {}) {
        return runLegacyJsonPort(
          legacy.rankExternalReferences,
          "references.rankExternalReferences",
          request,
          undefined,
          (value) =>
            rebuildSynthesisReferenceCapabilityResult(
              "client.rankExternalReferences",
              value,
            ),
        );
      },
      async getAttentionQueue(request = {}) {
        return runLegacyJsonPort(
          legacy.getAttentionQueue,
          "references.getAttentionQueue",
          request,
          undefined,
          (value) =>
            rebuildSynthesisReferenceCapabilityResult(
              "client.getAttentionQueue",
              value,
            ),
        );
      },
      async refreshReferenceSidecarNow() {
        return runLegacy(async () =>
          rebuildSynthesisReferenceCapabilityResult(
            "client.refreshReferenceSidecarNow",
            await requireLegacyPort(
              legacy.refreshReferenceSidecarNow,
              "references.refreshReferenceSidecarNow",
            )(),
          ),
        );
      },
      async retryReferenceSidecarRefresh() {
        return runLegacy(async () =>
          rebuildSynthesisReferenceCapabilityResult(
            "client.retryReferenceSidecarRefresh",
            await requireLegacyPort(
              legacy.retryReferenceSidecarRefresh,
              "references.retryReferenceSidecarRefresh",
            )(),
          ),
        );
      },
      async runAdvancedReferenceMatchingNow() {
        return runLegacy(async () =>
          rebuildSynthesisReferenceCapabilityResult(
            "client.runAdvancedReferenceMatchingNow",
            await requireLegacyPort(
              legacy.runAdvancedReferenceMatchingNow,
              "references.runAdvancedReferenceMatchingNow",
            )(),
          ),
        );
      },
      async retryAdvancedReferenceMatching() {
        return runLegacy(async () =>
          rebuildSynthesisReferenceCapabilityResult(
            "client.retryAdvancedReferenceMatching",
            await requireLegacyPort(
              legacy.retryAdvancedReferenceMatching,
              "references.retryAdvancedReferenceMatching",
            )(),
          ),
        );
      },
      async applyCanonicalRevisionReviewAction(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeCanonicalRevisionReviewRequest(request);
          const port = requireLegacyPort(
            legacy.applyCanonicalRevisionReviewAction,
            "references.applyCanonicalRevisionReviewAction",
          );
          return rebuildSynthesisReferenceCapabilityResult(
            "client.applyCanonicalRevisionReviewAction",
            await port(normalizedRequest),
          );
        });
      },
      async applyReferenceMatchProposalAction(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeReferenceMatchProposalActionRequest(request);
          const port = requireLegacyPort(
            legacy.applyReferenceMatchProposalAction,
            "references.applyReferenceMatchProposalAction",
          );
          return rebuildSynthesisReferenceCapabilityResult(
            "client.applyReferenceMatchProposalAction",
            await port(normalizedRequest),
          );
        });
      },
      async applyReferenceMatchProposalActions(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeReferenceMatchProposalActionsRequest(request);
          const port = requireLegacyPort(
            legacy.applyReferenceMatchProposalActions,
            "references.applyReferenceMatchProposalActions",
          );
          return rebuildSynthesisReferenceCapabilityResult(
            "client.applyReferenceMatchProposalActions",
            await port(normalizedRequest),
          );
        });
      },
      async mergeEffectiveCanonicalReference(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeEffectiveCanonicalReferenceMergeRequest(request);
          const port = requireLegacyPort(
            legacy.mergeEffectiveCanonicalReference,
            "references.mergeEffectiveCanonicalReference",
          );
          return rebuildSynthesisReferenceCapabilityResult(
            "client.mergeEffectiveCanonicalReference",
            await port(normalizedRequest),
          );
        });
      },
      async applyCanonicalRevisionMergeRequests(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeCanonicalRevisionMergeRequestsRequest(request);
          const port = requireLegacyPort(
            legacy.applyCanonicalRevisionMergeRequests,
            "references.applyCanonicalRevisionMergeRequests",
          );
          return rebuildSynthesisReferenceCapabilityResult(
            "client.applyCanonicalRevisionMergeRequests",
            await port(normalizedRequest),
          );
        });
      },
      async updateCanonicalReferenceMetadata(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeCanonicalReferenceMetadataUpdateRequest(request);
          const port = requireLegacyPort(
            legacy.updateCanonicalReferenceMetadata,
            "references.updateCanonicalReferenceMetadata",
          );
          return rebuildSynthesisReferenceCapabilityResult(
            "client.updateCanonicalReferenceMetadata",
            await port(normalizedRequest),
          );
        });
      },
      async archiveCanonicalReference(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeCanonicalReferenceArchiveRequest(request);
          const port = requireLegacyPort(
            legacy.archiveCanonicalReference,
            "references.archiveCanonicalReference",
          );
          return rebuildSynthesisReferenceCapabilityResult(
            "client.archiveCanonicalReference",
            await port(normalizedRequest),
          );
        });
      },
    },
    topics: {
      async list(request) {
        return runLegacyJsonPort(
          legacy.listTopics,
          "topics.list",
          rebuildSynthesisTopicListRequest(request),
          undefined,
          rebuildSynthesisTopicListResult,
        );
      },
      async findByPaperRef(request) {
        return runLegacyJsonPort(
          legacy.findTopicsByPaperRef,
          "topics.findByPaperRef",
          rebuildSynthesisTopicFindRequest(request),
          undefined,
          rebuildSynthesisTopicFindResult,
        );
      },
      async getContext(request, delivery) {
        return runLegacyJsonPort(
          legacy.getTopicContext,
          "topics.getContext",
          rebuildSynthesisTopicContextRequest(request),
          delivery,
          rebuildSynthesisTopicContextResult,
        );
      },
      async resolveResolver(request) {
        return runLegacyJsonPort(
          legacy.resolveResolver,
          "topics.resolveResolver",
          rebuildSynthesisTopicResolverRequest(request),
          undefined,
          rebuildSynthesisTopicResolverResult,
        );
      },
      async listWorkflowOptions(request) {
        try {
          return rebuildSynthesisWorkflowTopicOptionsResult(
            await legacy.listWorkflowTopicOptions(
              rebuildSynthesisWorkflowTopicOptionsRequest(request),
            ),
          );
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
      async getTopicReport(request) {
        return runLegacy(async () =>
          rebuildSynthesisTopicReportResult(
            await requireLegacyPort(
              legacy.getTopicReport,
              "topics.getTopicReport",
            )(request),
          ),
        );
      },
      async deleteTopicArtifact(request) {
        return runLegacy(async () => {
          const normalizedRequest =
            normalizeTopicArtifactDeleteRequest(request);
          const port = requireLegacyPort(
            legacy.deleteTopicArtifact,
            "topics.deleteTopicArtifact",
          );
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisTopicArtifactDeleteResult;
        });
      },
      async purgeDeletedTopicArtifacts() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.purgeDeletedTopicArtifacts,
                "topics.purgeDeletedTopicArtifacts",
              )(),
            ) as SynthesisDeletedTopicArtifactsPurgeResult,
        );
      },
      async rejectTopicDiscoveryHint(request) {
        return runLegacy(async () => {
          const normalizedRequest = normalizeTopicDiscoveryHintRequest(request);
          const port = requireLegacyPort(
            legacy.rejectTopicDiscoveryHint,
            "topics.rejectTopicDiscoveryHint",
          );
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisTopicCommandResult;
        });
      },
      async restoreTopicDiscoveryHint(request) {
        return runLegacy(async () => {
          const normalizedRequest = normalizeTopicDiscoveryHintRequest(request);
          const port = requireLegacyPort(
            legacy.restoreTopicDiscoveryHint,
            "topics.restoreTopicDiscoveryHint",
          );
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisTopicCommandResult;
        });
      },
    },
    system: {
      async reconcileRuntimeWorkOnStartup() {
        try {
          if (!legacy.reconcileSynthesisRuntimeWorkStateOnStartup) {
            throw new SynthesisClientError(
              "unavailable",
              "Synthesis startup reconciliation is unavailable",
            );
          }
          return legacy.reconcileSynthesisRuntimeWorkStateOnStartup();
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
    },
    maintenance: {
      async getOperation(request) {
        return runLegacyJsonPort(
          legacy.getPublicMaintenanceOperation,
          "maintenance.getOperation",
          request,
        ) as Promise<SynthesisPublicMaintenanceOperation>;
      },
      async controlOperation(
        request: SynthesisPublicMaintenanceOperationControlRequest,
      ) {
        return runLegacyJsonPort(
          legacy.controlPublicMaintenanceOperation,
          "maintenance.controlOperation",
          request,
        ) as Promise<SynthesisPublicMaintenanceOperation>;
      },
      async getSchemas(request = {}) {
        return rebuildSynthesisProtocolCapabilityDto({
          capability: "client.getSchemas",
          direction: "result",
          value: await runLegacyJsonPort(
            legacy.getSchemas,
            "maintenance.getSchemas",
            request,
          ),
        });
      },
      async resetDatabase(request) {
        try {
          if (!legacy.resetSynthesisDatabase) {
            throw new SynthesisClientError(
              "unavailable",
              "Synthesis database reset is unavailable",
            );
          }
          return await legacy.resetSynthesisDatabase(request);
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
    },
    notifications: {
      async consumeRelatedItemsSyncEcho(request) {
        try {
          if (!legacy.consumeRelatedItemsSyncEcho) {
            throw new SynthesisClientError(
              "unavailable",
              "Synthesis notification handling is unavailable",
            );
          }
          return {
            consumed: Boolean(
              await legacy.consumeRelatedItemsSyncEcho(request),
            ),
          };
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
    },
    workflowApply: {
      async applyLiteratureDigestSidecar(request) {
        return runLegacy(async () =>
          rebuildSynthesisLiteratureDigestApplyResult(
            await requireLegacyPort(
              legacy.applyLiteratureDigestSidecar,
              "workflowApply.applyLiteratureDigestSidecar",
            )(rebuildSynthesisLiteratureDigestApplyRequest(request)),
          ),
        );
      },
      async applyTopicSynthesisResult(request: SynthesisTopicApplyRequest) {
        return runLegacy(async () => {
          request = rebuildSynthesisTopicApplyRequest(request);
          const assets = new Map(
            request.assets.map((asset) => [asset.id, asset.text] as const),
          );
          if (assets.size !== request.assets.length) {
            throw new SynthesisClientError(
              "invalid_request",
              "Topic result contains duplicate asset ids",
            );
          }
          const result = await requireLegacyPort(
            legacy.applyTopicSynthesisResult,
            "workflowApply.applyTopicSynthesisResult",
          )(request.bundle, {
            bundleReader: {
              async readText(path) {
                const text = assets.get(path);
                if (text === undefined) {
                  throw new SynthesisClientError(
                    "invalid_request",
                    "Topic result referenced an unknown controlled asset",
                    { assetId: path },
                  );
                }
                return text;
              },
            },
            controlledAssets: request.assets,
          });
          return rebuildSynthesisTopicApplyResult(result);
        });
      },
    },
    artifacts: {
      async getManifest(request = {}) {
        return runLegacyJsonPort(
          legacy.getPaperArtifactManifest,
          "artifacts.getManifest",
          request,
          undefined,
          (value) =>
            rebuildSynthesisArtifactCapabilityResult(
              "client.getPaperArtifactManifest",
              value,
            ),
        );
      },
      async readPaperArtifacts(request) {
        return runLegacy(async () =>
          rebuildSynthesisArtifactCapabilityResult(
            "client.readPaperArtifacts",
            await requireLegacyPort(
              legacy.readPaperArtifacts,
              "artifacts.readPaperArtifacts",
            )(request),
          ),
        );
      },
      async exportFiltered(request, delivery) {
        return runLegacyJsonPort(
          legacy.exportFilteredPaperArtifacts,
          "artifacts.exportFiltered",
          request,
          delivery,
          (value) =>
            rebuildSynthesisArtifactCapabilityResult(
              "client.exportFilteredPaperArtifacts",
              value,
            ),
        );
      },
      async resolveTopicPaperDigest(request) {
        return runLegacy(async () =>
          rebuildSynthesisWorkbenchPaperDigestResult(
            await requireLegacyPort(
              legacy.resolveTopicPaperDigest,
              "artifacts.resolveTopicPaperDigest",
            )(
              mapPaperDigestRequest(
                request,
              ) as SynthesisTopicPaperDigestWireRequest,
            ),
          ),
        );
      },
    },
    tags: {
      async initializeBuiltinTagPolicy() {
        return runLegacy(async () =>
          rebuildSynthesisTagCapabilityResult(
            "client.initializeBuiltinTagPolicy",
            await requireLegacyPort(
              legacy.initializeBuiltinTagPolicy,
              "tags.initializeBuiltinTagPolicy",
            )(),
          ),
        );
      },
      async isBuiltinTagPolicyInitialized() {
        return runLegacy(async () => {
          const initialized = await requireLegacyPort(
            legacy.isBuiltinTagPolicyInitialized,
            "tags.isBuiltinTagPolicyInitialized",
          )();
          if (typeof initialized !== "boolean") {
            throw new SynthesisClientError(
              "internal",
              "Builtin tag policy initialization response is invalid",
            );
          }
          return rebuildSynthesisTagCapabilityResult(
            "client.isBuiltinTagPolicyInitialized",
            initialized,
          );
        });
      },
      async loadTagVocabulary() {
        return runLegacy(async () =>
          rebuildSynthesisTagCapabilityResult(
            "client.loadTagVocabulary",
            await requireLegacyPort(
              legacy.loadTagVocabulary,
              "tags.loadTagVocabulary",
            )(),
          ),
        );
      },
      async saveTagVocabulary(request) {
        return runLegacy(async () => {
          const normalized = normalizeTagVocabularySaveRequest(request);
          return rebuildSynthesisTagCapabilityResult(
            "client.saveTagVocabulary",
            await requireLegacyPort(
              legacy.saveTagVocabulary,
              "tags.saveTagVocabulary",
            )(normalized),
          );
        });
      },
      async validateTagVocabulary() {
        return runLegacy(async () =>
          rebuildSynthesisTagCapabilityResult(
            "client.validateTagVocabulary",
            await requireLegacyPort(
              legacy.validateTagVocabulary,
              "tags.validateTagVocabulary",
            )(),
          ),
        );
      },
      async rebuildTagVocabularyIndex() {
        return runLegacy(async () => {
          return rebuildSynthesisTagCapabilityResult(
            "client.rebuildTagVocabularyIndex",
            await requireLegacyPort(
              legacy.rebuildTagVocabularyIndex,
              "tags.rebuildTagVocabularyIndex",
            )(),
          );
        });
      },
      async exportTagVocabularyForRegulator() {
        return runLegacy(async () => {
          const result = normalizeLegacyJson(
            await requireLegacyPort(
              legacy.exportTagVocabularyForRegulator,
              "tags.exportTagVocabularyForRegulator",
            )(),
          );
          if (
            !Array.isArray(result) ||
            result.some((tag) => typeof tag !== "string")
          ) {
            throw new SynthesisClientError(
              "internal",
              "Tag regulator vocabulary response is invalid",
            );
          }
          return rebuildSynthesisTagCapabilityResult(
            "client.exportTagVocabularyForRegulator",
            result,
          );
        });
      },
      async listStagedTagSuggestions() {
        return runLegacy(async () => {
          const result = normalizeLegacyJson(
            await requireLegacyPort(
              legacy.listStagedTagSuggestions,
              "tags.listStagedTagSuggestions",
            )(),
          );
          if (!Array.isArray(result)) {
            throw new SynthesisClientError(
              "internal",
              "Staged tag suggestion response is invalid",
            );
          }
          return rebuildSynthesisTagCapabilityResult(
            "client.listStagedTagSuggestions",
            result,
          );
        });
      },
      async stageTagSuggestions(request) {
        return runLegacy(async () => {
          const normalized = normalizeTagSuggestionStageRequest(request);
          return rebuildSynthesisTagCapabilityResult(
            "client.stageTagSuggestions",
            await requireLegacyPort(
              legacy.stageTagSuggestions,
              "tags.stageTagSuggestions",
            )(normalized),
          );
        });
      },
      async updateStagedTagSuggestion(request) {
        return runLegacy(async () => {
          const normalized = normalizeStagedTagUpdateRequest(request);
          const port = requireLegacyPort(
            legacy.updateStagedTagSuggestion,
            "tags.updateStagedTagSuggestion",
          );
          return rebuildSynthesisTagCapabilityResult(
            "client.updateStagedTagSuggestion",
            await port(normalized),
          );
        });
      },
      async updateTagVocabularyEntry(request) {
        return runLegacy(async () => {
          const normalized = normalizeTagVocabularyEntryUpdateRequest(request);
          const port = requireLegacyPort(
            legacy.updateTagVocabularyEntry,
            "tags.updateTagVocabularyEntry",
          );
          return rebuildSynthesisTagCapabilityResult(
            "client.updateTagVocabularyEntry",
            await port(normalized),
          );
        });
      },
      async deleteTagVocabularyEntry(request) {
        return runLegacy(async () => {
          const normalized = normalizeTagVocabularyEntryDeleteRequest(request);
          const port = requireLegacyPort(
            legacy.deleteTagVocabularyEntry,
            "tags.deleteTagVocabularyEntry",
          );
          return rebuildSynthesisTagCapabilityResult(
            "client.deleteTagVocabularyEntry",
            await port(normalized),
          );
        });
      },
      async promoteStagedTagSuggestions(request) {
        return runLegacy(async () => {
          const normalized = normalizeTagSelectionRequest(request);
          const port = requireLegacyPort(
            legacy.promoteStagedTagSuggestions,
            "tags.promoteStagedTagSuggestions",
          );
          return rebuildSynthesisTagCapabilityResult(
            "client.promoteStagedTagSuggestions",
            await port(normalized),
          );
        });
      },
      async discardStagedTagSuggestions(request) {
        return runLegacy(async () => {
          const normalized = normalizeTagSelectionRequest(request);
          const port = requireLegacyPort(
            legacy.discardStagedTagSuggestions,
            "tags.discardStagedTagSuggestions",
          );
          return rebuildSynthesisTagCapabilityResult(
            "client.discardStagedTagSuggestions",
            await port(normalized),
          );
        });
      },
      async clearStagedTagSuggestions() {
        return runLegacy(async () =>
          rebuildSynthesisTagCapabilityResult(
            "client.clearStagedTagSuggestions",
            await requireLegacyPort(
              legacy.clearStagedTagSuggestions,
              "tags.clearStagedTagSuggestions",
            )(),
          ),
        );
      },
      async previewTagVocabularyImport(request) {
        return runLegacy(async () => {
          const normalized = normalizeTagImportPreviewRequest(request);
          const port = requireLegacyPort(
            legacy.previewTagVocabularyImport,
            "tags.previewTagVocabularyImport",
          );
          return rebuildSynthesisTagCapabilityResult(
            "client.previewTagVocabularyImport",
            await port(normalized),
          );
        });
      },
      async applyTagVocabularyImport(request) {
        return runLegacy(async () => {
          const normalized = normalizeTagImportApplyRequest(request);
          const port = requireLegacyPort(
            legacy.applyTagVocabularyImport,
            "tags.applyTagVocabularyImport",
          );
          return rebuildSynthesisTagCapabilityResult(
            "client.applyTagVocabularyImport",
            await port(normalized),
          );
        });
      },
      async replaceTagAuditRecords(request) {
        return runLegacy(async () =>
          rebuildSynthesisTagCapabilityResult(
            "client.replaceTagAuditRecords",
            await requireLegacyPort(
              legacy.replaceTagAuditRecords,
              "tags.replaceTagAuditRecords",
            )(request),
          ),
        );
      },
      async clearTagAuditRecord(request) {
        return runLegacy(async () => {
          const result = await requireLegacyPort(
            legacy.clearTagAuditRecord,
            "tags.clearTagAuditRecord",
          )(request);
          return rebuildSynthesisTagCapabilityResult(
            "client.clearTagAuditRecord",
            result ?? { ok: true },
          );
        });
      },
    },
    libraryIndex: {
      async getPage(request = {}) {
        return runLegacyJsonPort(
          legacy.getLibraryIndex,
          "libraryIndex.getPage",
          request,
          undefined,
          rebuildSynthesisLibraryIndexResult,
        );
      },
    },
    workflowReview: {
      async getInput(request) {
        const normalized = rebuildSynthesisWorkflowReviewRequest(request);
        return runLegacyJsonPort(
          legacy.getReviewInput,
          "workflowReview.getInput",
          normalized,
          undefined,
          rebuildSynthesisWorkflowReviewResult,
        );
      },
    },
    debug: {
      async snapshot(request = {}) {
        return runLegacyJsonPort(
          legacy.debugSynthesisSnapshot,
          "debug.snapshot",
          request,
          undefined,
          (value) =>
            rebuildSynthesisDebugCapabilityResult(
              "client.debugSynthesisSnapshot",
              value,
            ),
        );
      },
      async listCache(request = {}) {
        return runLegacyJsonPort(
          legacy.debugSynthesisCacheList,
          "debug.listCache",
          request,
          undefined,
          (value) =>
            rebuildSynthesisDebugCapabilityResult(
              "client.debugSynthesisCacheList",
              value,
            ),
        );
      },
      async listOperations(request = {}) {
        return runLegacyJsonPort(
          legacy.debugSynthesisOperationsList,
          "debug.listOperations",
          request,
          undefined,
          (value) =>
            rebuildSynthesisDebugCapabilityResult(
              "client.debugSynthesisOperationsList",
              value,
            ),
        );
      },
      async listProfiler(request = {}) {
        return runLegacyJsonPort(
          legacy.debugSynthesisProfilerList,
          "debug.listProfiler",
          request,
          undefined,
          (value) =>
            rebuildSynthesisDebugCapabilityResult(
              "client.debugSynthesisProfilerList",
              value,
            ),
        );
      },
      async inspectPaper(request) {
        return runLegacyJsonPort(
          legacy.debugSynthesisPaperInspect,
          "debug.inspectPaper",
          request,
          undefined,
          (value) =>
            rebuildSynthesisDebugCapabilityResult(
              "client.debugSynthesisPaperInspect",
              value,
            ),
        );
      },
      async inspectTopic(request) {
        return runLegacyJsonPort(
          legacy.debugSynthesisTopicInspect,
          "debug.inspectTopic",
          request,
          undefined,
          (value) =>
            rebuildSynthesisDebugCapabilityResult(
              "client.debugSynthesisTopicInspect",
              value,
            ),
        );
      },
      async diff(request = {}) {
        return runLegacyJsonPort(
          legacy.debugSynthesisDiff,
          "debug.diff",
          request,
          undefined,
          (value) =>
            rebuildSynthesisDebugCapabilityResult(
              "client.debugSynthesisDiff",
              value,
            ),
        );
      },
      async cleanInstallReset(request = {}) {
        return runLegacyJsonPort(
          legacy.debugSynthesisCleanInstallReset,
          "debug.cleanInstallReset",
          request,
        );
      },
    },
    workbench: {
      async readProgress() {
        return runLegacy(
          async () =>
            normalizeLegacyObject({
              maintenance: {
                backgroundJobs: await requireLegacyPort(
                  legacy.getSynthesisBackgroundJobRows,
                  "workbench.readProgress",
                )(),
              },
            }) as SynthesisWorkbenchProjection,
        );
      },
      async readChrome(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.getSynthesisWorkbenchChromeInput,
                "workbench.readChrome",
              )(normalizeWorkbenchState(request.state)),
            ) as SynthesisWorkbenchProjection,
        );
      },
      readSurface: readWorkbenchSurface,
      async readTopicDetail(request) {
        return runLegacy(async () =>
          rebuildSynthesisWorkbenchTopicDetailResult(
            await requireLegacyPort(
              legacy.readTopicDetail,
              "workbench.readTopicDetail",
            )({ topicId: normalizeTopicId(request.topicId) }),
          ),
        );
      },
      async readPaperDigest(request) {
        return runLegacy(async () =>
          rebuildSynthesisWorkbenchPaperDigestResult(
            await requireLegacyPort(
              legacy.resolveTopicPaperDigest,
              "workbench.readPaperDigest",
            )(
              mapPaperDigestRequest(
                request,
              ) as SynthesisTopicPaperDigestWireRequest,
            ),
          ),
        );
      },
    },
  };
}

export function createInProcessSynthesisClient(
  legacy: LegacySynthesisPort,
): SynthesisClient {
  return createSynthesisClientFromPort(
    legacy as unknown as SynthesisClientPort,
  );
}
