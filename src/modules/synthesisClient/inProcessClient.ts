import {
  SYNTHESIS_CANONICAL_REVISION_REVIEW_ACTIONS,
  SYNTHESIS_CITATION_GRAPH_LAYOUT_ALGORITHMS,
  SYNTHESIS_CONCEPT_REVIEW_ACTIONS,
  SYNTHESIS_REFERENCE_MATCH_PROPOSAL_ACTIONS,
  SYNTHESIS_REFERENCE_MATCH_PROPOSAL_DECISION_ACTIONS,
  SYNTHESIS_TOPIC_GRAPH_REVIEW_ACTIONS,
  SYNTHESIS_WORKBENCH_SURFACES,
  SynthesisClientError,
  toSynthesisJsonObject,
  toSynthesisJsonValue,
  type SynthesisClient,
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
  type SynthesisDatabaseResetRequest,
  type SynthesisDatabaseResetResult,
  type SynthesisLiteratureDigestApplyRequest,
  type SynthesisPaperArtifactsRequest,
  type SynthesisPaperArtifactsResult,
  type SynthesisReferenceCommandResult,
  type SynthesisReferenceMatchProposalAction,
  type SynthesisReferenceMatchProposalActionRequest,
  type SynthesisReferenceMatchProposalActionsRequest,
  type SynthesisReferenceMatchProposalDecision,
  type SynthesisReferenceMatchProposalDecisionAction,
  type SynthesisReferenceMatchProposalManualTarget,
  type SynthesisRelatedItemsEchoRequest,
  type SynthesisStartupReconcileResult,
  type SynthesisTagAuditReplaceRequest,
  type SynthesisTagCommandResult,
  type SynthesisTagSelectionRequest,
  type SynthesisTagStagedSuggestion,
  type SynthesisTagVocabularySnapshot,
  type SynthesisTopicApplyRequest,
  type SynthesisTopicApplyResult,
  type SynthesisTopicArtifactDeleteRequest,
  type SynthesisTopicCommandResult,
  type SynthesisTopicDiscoveryHintRequest,
  type SynthesisTopicGraphCommandResult,
  type SynthesisTopicGraphEdgeDecisionRequest,
  type SynthesisTopicGraphReviewActionRequest,
  type SynthesisTopicReportRequest,
  type SynthesisTopicReportResult,
  type SynthesisWorkflowTopicOptionsRequest,
  type SynthesisWorkflowTopicOptionsResult,
  type SynthesisGraphCommandResult,
  type SynthesisEffectiveCanonicalReferenceMergeRequest,
  type SynthesisWorkbenchPaperDigestResult,
  type SynthesisWorkbenchProjection,
  type SynthesisWorkbenchSurfaceName,
  type SynthesisWorkbenchTopicDetailResult,
} from "../../../packages/synthesis-contracts/src/index";
import { isTransientStorageBusyError } from "../guardedSqlite";

export interface LegacySynthesisPort {
  listWorkflowTopicOptions(
    request?: SynthesisWorkflowTopicOptionsRequest,
  ): Promise<SynthesisWorkflowTopicOptionsResult>;
  reconcileSynthesisRuntimeWorkStateOnStartup?(): SynthesisStartupReconcileResult;
  resetSynthesisDatabase?(
    request: SynthesisDatabaseResetRequest,
  ): Promise<SynthesisDatabaseResetResult>;
  consumeRelatedItemsSyncEcho?(
    request: SynthesisRelatedItemsEchoRequest,
  ): Promise<unknown>;
  applyLiteratureDigestSidecar?(
    request: SynthesisLiteratureDigestApplyRequest,
  ): Promise<unknown>;
  applyTopicSynthesisResult?(
    bundle: unknown,
    context?: {
      bundleReader: { readText(path: string): Promise<string> };
    },
  ): Promise<unknown>;
  getTopicReport?(request: SynthesisTopicReportRequest): Promise<unknown>;
  deleteTopicArtifact?(
    request: SynthesisTopicArtifactDeleteRequest,
  ): Promise<unknown>;
  purgeDeletedTopicArtifacts?(): Promise<unknown>;
  rejectTopicDiscoveryHint?(
    request: SynthesisTopicDiscoveryHintRequest,
  ): Promise<unknown>;
  restoreTopicDiscoveryHint?(
    request: SynthesisTopicDiscoveryHintRequest,
  ): Promise<unknown>;
  rebuildTopicGraphIndex?(): Promise<unknown>;
  acceptTopicGraphRelation?(
    request: SynthesisTopicGraphEdgeDecisionRequest,
  ): Promise<unknown>;
  rejectTopicGraphRelation?(
    request: SynthesisTopicGraphEdgeDecisionRequest,
  ): Promise<unknown>;
  applyTopicGraphReviewAction?(
    request: SynthesisTopicGraphReviewActionRequest,
  ): Promise<unknown>;
  readPaperArtifacts?(
    request: SynthesisPaperArtifactsRequest,
  ): Promise<unknown>;
  loadTagVocabulary?(): Promise<unknown>;
  saveTagVocabulary?(request: Record<string, unknown>): Promise<unknown>;
  validateTagVocabulary?(): Promise<unknown>;
  rebuildTagVocabularyIndex?(): Promise<unknown>;
  exportTagVocabularyForRegulator?(): Promise<unknown>;
  listStagedTagSuggestions?(): Promise<unknown>;
  stageTagSuggestions?(request: Record<string, unknown>): Promise<unknown>;
  promoteStagedTagSuggestions?(
    request: SynthesisTagSelectionRequest,
  ): Promise<unknown>;
  discardStagedTagSuggestions?(
    request: SynthesisTagSelectionRequest,
  ): Promise<unknown>;
  clearStagedTagSuggestions?(): Promise<unknown>;
  replaceTagAuditRecords?(
    request: SynthesisTagAuditReplaceRequest,
  ): Promise<unknown>;
  clearTagAuditRecord?(request: {
    libraryId: number;
    itemKey: string;
  }): Promise<unknown>;
  getSynthesisWorkbenchChromeInput?(
    state: Record<string, unknown>,
  ): Promise<unknown>;
  getSynthesisWorkbenchSurfaceInput?(
    surface: SynthesisWorkbenchSurfaceName,
    state: Record<string, unknown>,
  ): Promise<unknown>;
  getSynthesisBackgroundJobRows?(): Promise<unknown>;
  readTopicDetail?(request: { topicId: string }): Promise<unknown>;
  resolveTopicPaperDigest?(request: Record<string, unknown>): Promise<unknown>;
  recomputeCitationGraphLayout?(
    request: SynthesisCitationGraphLayoutRequest,
  ): Promise<unknown>;
  rebuildCitationGraphCacheNow?(): Promise<unknown>;
  refreshCitationGraphCacheIncrementalNow?(): Promise<unknown>;
  retryCitationGraphCacheRebuild?(): Promise<unknown>;
  refreshReferenceSidecarNow?(): Promise<unknown>;
  retryReferenceSidecarRefresh?(): Promise<unknown>;
  runAdvancedReferenceMatchingNow?(): Promise<unknown>;
  retryAdvancedReferenceMatching?(): Promise<unknown>;
  applyCanonicalRevisionReviewAction?(
    request: SynthesisCanonicalRevisionReviewRequest,
  ): Promise<unknown>;
  applyReferenceMatchProposalAction?(
    request: SynthesisReferenceMatchProposalActionRequest,
  ): Promise<unknown>;
  applyReferenceMatchProposalActions?(
    request: SynthesisReferenceMatchProposalActionsRequest,
  ): Promise<unknown>;
  mergeEffectiveCanonicalReference?(
    request: SynthesisEffectiveCanonicalReferenceMergeRequest,
  ): Promise<unknown>;
  applyCanonicalRevisionMergeRequests?(
    request: SynthesisCanonicalRevisionMergeRequestsRequest,
  ): Promise<unknown>;
  updateCanonicalReferenceMetadata?(
    request: SynthesisCanonicalReferenceMetadataUpdateRequest,
  ): Promise<unknown>;
  archiveCanonicalReference?(
    request: SynthesisCanonicalReferenceArchiveRequest,
  ): Promise<unknown>;
  rebuildConceptKbIndex?(): Promise<unknown>;
  updateConceptDisplayText?(
    request: SynthesisConceptDisplayTextUpdateRequest,
  ): Promise<unknown>;
  applyConceptReviewAction?(
    request: SynthesisConceptReviewActionRequest,
  ): Promise<unknown>;
  deleteConceptEntries?(
    request: SynthesisConceptDeleteRequest,
  ): Promise<unknown>;
}

function normalizeClientError(error: unknown): SynthesisClientError {
  if (error instanceof SynthesisClientError) {
    return error;
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

function normalizeWorkbenchState(value: unknown) {
  return toSynthesisJsonObject(value, "$.request.state");
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

function mapPaperDigestRequest(value: unknown): Record<string, unknown> {
  const request = toSynthesisJsonObject(value, "$.request");
  const mapped: Record<string, unknown> = {};
  const optionalStringFields = [
    ["topicId", "topicId"],
    ["paperRef", "paper_ref"],
  ] as const;
  for (const [source, target] of optionalStringFields) {
    const field = request[source];
    if (field === undefined) continue;
    if (typeof field !== "string") {
      throw new SynthesisClientError(
        "invalid_request",
        `Synthesis Workbench ${source} must be a string`,
        { field: source },
      );
    }
    mapped[target] = field;
  }
  if (request.digestRef !== undefined) {
    mapped.digest_ref = toSynthesisJsonObject(
      request.digestRef,
      "$.request.digestRef",
    );
  }
  if (request.includeRepresentativeImage !== undefined) {
    if (typeof request.includeRepresentativeImage !== "boolean") {
      throw new SynthesisClientError(
        "invalid_request",
        "Synthesis Workbench includeRepresentativeImage must be a boolean",
        { field: "includeRepresentativeImage" },
      );
    }
    mapped.include_representative_image = request.includeRepresentativeImage;
  }
  return mapped;
}

export function createInProcessSynthesisClient(
  legacy: LegacySynthesisPort,
): SynthesisClient {
  return {
    concepts: {
      async rebuildConceptKbIndex() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.rebuildConceptKbIndex,
                "concepts.rebuildConceptKbIndex",
              )(),
            ) as SynthesisConceptCommandResult,
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisConceptCommandResult;
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisConceptCommandResult;
        });
      },
      async deleteConceptEntries(request) {
        return runLegacy(async () => {
          const normalizedRequest = normalizeConceptDeleteRequest(request);
          const port = requireLegacyPort(
            legacy.deleteConceptEntries,
            "concepts.deleteConceptEntries",
          );
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisConceptCommandResult;
        });
      },
    },
    graph: {
      async recomputeCitationGraphLayout(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.recomputeCitationGraphLayout,
                "graph.recomputeCitationGraphLayout",
              )(normalizeCitationGraphLayoutRequest(request)),
            ) as SynthesisGraphCommandResult,
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
            ) as SynthesisGraphCommandResult,
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
            ) as SynthesisGraphCommandResult,
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
            ) as SynthesisGraphCommandResult,
        );
      },
    },
    topicGraph: {
      async rebuildTopicGraphIndex() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.rebuildTopicGraphIndex,
                "topicGraph.rebuildTopicGraphIndex",
              )(),
            ) as SynthesisTopicGraphCommandResult,
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisTopicGraphCommandResult;
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisTopicGraphCommandResult;
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisTopicGraphCommandResult;
        });
      },
    },
    references: {
      async refreshReferenceSidecarNow() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.refreshReferenceSidecarNow,
                "references.refreshReferenceSidecarNow",
              )(),
            ) as SynthesisReferenceCommandResult,
        );
      },
      async retryReferenceSidecarRefresh() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.retryReferenceSidecarRefresh,
                "references.retryReferenceSidecarRefresh",
              )(),
            ) as SynthesisReferenceCommandResult,
        );
      },
      async runAdvancedReferenceMatchingNow() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.runAdvancedReferenceMatchingNow,
                "references.runAdvancedReferenceMatchingNow",
              )(),
            ) as SynthesisReferenceCommandResult,
        );
      },
      async retryAdvancedReferenceMatching() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.retryAdvancedReferenceMatching,
                "references.retryAdvancedReferenceMatching",
              )(),
            ) as SynthesisReferenceCommandResult,
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisReferenceCommandResult;
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisReferenceCommandResult;
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisReferenceCommandResult;
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisReferenceCommandResult;
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisReferenceCommandResult;
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisReferenceCommandResult;
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
          return normalizeLegacyObject(
            await port(normalizedRequest),
          ) as SynthesisReferenceCommandResult;
        });
      },
    },
    topics: {
      async listWorkflowOptions(request) {
        try {
          return await legacy.listWorkflowTopicOptions(request);
        } catch (error) {
          throw normalizeClientError(error);
        }
      },
      async getTopicReport(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.getTopicReport,
                "topics.getTopicReport",
              )(request),
            ) as SynthesisTopicReportResult,
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
          ) as SynthesisTopicCommandResult;
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
            ) as SynthesisTopicCommandResult,
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
          normalizeLegacyObject(
            await requireLegacyPort(
              legacy.applyLiteratureDigestSidecar,
              "workflowApply.applyLiteratureDigestSidecar",
            )(request),
          ),
        );
      },
      async applyTopicSynthesisResult(request: SynthesisTopicApplyRequest) {
        return runLegacy(async () => {
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
          });
          return normalizeLegacyObject(result) as SynthesisTopicApplyResult;
        });
      },
    },
    artifacts: {
      async readPaperArtifacts(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.readPaperArtifacts,
                "artifacts.readPaperArtifacts",
              )(request),
            ) as SynthesisPaperArtifactsResult,
        );
      },
    },
    tags: {
      async loadTagVocabulary() {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.loadTagVocabulary,
                "tags.loadTagVocabulary",
              )(),
            ) as SynthesisTagVocabularySnapshot,
        );
      },
      async saveTagVocabulary(request) {
        return runLegacy(async () =>
          normalizeLegacyJson(
            await requireLegacyPort(
              legacy.saveTagVocabulary,
              "tags.saveTagVocabulary",
            )(request),
          ),
        );
      },
      async validateTagVocabulary() {
        return runLegacy(async () =>
          normalizeLegacyJson(
            await requireLegacyPort(
              legacy.validateTagVocabulary,
              "tags.validateTagVocabulary",
            )(),
          ),
        );
      },
      async rebuildTagVocabularyIndex() {
        return runLegacy(async () => {
          const result = normalizeLegacyResultObject(
            await requireLegacyPort(
              legacy.rebuildTagVocabularyIndex,
              "tags.rebuildTagVocabularyIndex",
            )(),
            "Tag vocabulary rebuild",
          );
          return result;
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
          return result.map((tag) => tag as string);
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
          return result as SynthesisTagStagedSuggestion[];
        });
      },
      async stageTagSuggestions(request) {
        return runLegacy(async () =>
          normalizeLegacyJson(
            await requireLegacyPort(
              legacy.stageTagSuggestions,
              "tags.stageTagSuggestions",
            )(request),
          ),
        );
      },
      async promoteStagedTagSuggestions(request) {
        return runLegacy(async () => {
          const normalized = normalizeTagSelectionRequest(request);
          const port = requireLegacyPort(
            legacy.promoteStagedTagSuggestions,
            "tags.promoteStagedTagSuggestions",
          );
          return normalizeLegacyResultObject(
            await port(normalized),
            "Staged Tag promotion",
          ) as SynthesisTagCommandResult;
        });
      },
      async discardStagedTagSuggestions(request) {
        return runLegacy(async () => {
          const normalized = normalizeTagSelectionRequest(request);
          const port = requireLegacyPort(
            legacy.discardStagedTagSuggestions,
            "tags.discardStagedTagSuggestions",
          );
          return normalizeLegacyResultObject(
            await port(normalized),
            "Staged Tag discard",
          ) as SynthesisTagCommandResult;
        });
      },
      async clearStagedTagSuggestions() {
        return runLegacy(async () =>
          normalizeLegacyResultObject(
            await requireLegacyPort(
              legacy.clearStagedTagSuggestions,
              "tags.clearStagedTagSuggestions",
            )(),
            "Staged Tag clear",
          ),
        );
      },
      async replaceTagAuditRecords(request) {
        return runLegacy(async () =>
          normalizeLegacyObject(
            await requireLegacyPort(
              legacy.replaceTagAuditRecords,
              "tags.replaceTagAuditRecords",
            )(request),
          ),
        );
      },
      async clearTagAuditRecord(request) {
        return runLegacy(async () => {
          await requireLegacyPort(
            legacy.clearTagAuditRecord,
            "tags.clearTagAuditRecord",
          )(request);
          return { ok: true as const };
        });
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
      async readSurface(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.getSynthesisWorkbenchSurfaceInput,
                "workbench.readSurface",
              )(
                normalizeWorkbenchSurface(request.surface),
                normalizeWorkbenchState(request.state),
              ),
            ) as SynthesisWorkbenchProjection,
        );
      },
      async readTopicDetail(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.readTopicDetail,
                "workbench.readTopicDetail",
              )({ topicId: normalizeTopicId(request.topicId) }),
            ) as SynthesisWorkbenchTopicDetailResult,
        );
      },
      async readPaperDigest(request) {
        return runLegacy(
          async () =>
            normalizeLegacyObject(
              await requireLegacyPort(
                legacy.resolveTopicPaperDigest,
                "workbench.readPaperDigest",
              )(mapPaperDigestRequest(request)),
            ) as SynthesisWorkbenchPaperDigestResult,
        );
      },
    },
  };
}
