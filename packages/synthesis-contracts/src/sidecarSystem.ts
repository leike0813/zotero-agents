import {
  SynthesisClientError,
  toSynthesisJsonObject,
  type SynthesisJsonObject,
} from "./common.js";
import {
  rebuildSynthesisSidecarTransferSnapshot,
  type SynthesisSidecarTransferSnapshot,
} from "./sidecarTransfer.js";
import { SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION } from "./schemaVersion.js";
import {
  rebuildSynthesisTopicCanonicalStoreSnapshot,
  type SynthesisTopicCanonicalStoreSnapshot,
} from "./sidecarCanonicalStore.js";
import {
  SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES,
  rebuildSynthesisSidecarRuntimePlatformSignature,
  type SynthesisSidecarRuntimePlatformSignature,
  type SynthesisSidecarRuntimeTarget,
  type SynthesisSidecarRuntimeTargetTriple,
} from "./sidecarRuntimeBundle.js";

export { rebuildSynthesisTopicCanonicalStoreSnapshot };
export type { SynthesisTopicCanonicalStoreSnapshot };

export const SYNTHESIS_SIDECAR_PROTOCOL = "synthesis-sidecar.v1" as const;
export const SYNTHESIS_SIDECAR_HEALTH_PATH = "/synthesis/v1/health" as const;
export const SYNTHESIS_SIDECAR_CALL_PATH = "/synthesis/v1/call" as const;

export const SYNTHESIS_SIDECAR_SYSTEM_CAPABILITIES = [
  "system.handshake",
  "system.shutdown",
] as const;
export const SYNTHESIS_SIDECAR_GENERAL_CAPABILITIES = [
  "workbench.chrome.read",
  "topics.canonical.inspect",
] as const;
export const SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES = [
  "client.listTopics",
  "client.findTopicsByPaperRef",
  "client.getTopicContext",
  "client.resolveResolver",
  "client.queryCitationGraphCluster",
  "client.queryCitationGraph",
  "client.getCitationGraphSlice",
  "client.getCitationGraphLayout",
  "client.getCitationGraphMetrics",
  "client.rankLibraryPapers",
  "client.refreshCitationGraphMetricsNow",
  "client.startCitationGraphUpdate",
  "client.getReferenceSidecarIndex",
  "client.rankExternalReferences",
  "client.getAttentionQueue",
  "client.startReferenceSidecarRefresh",
  "client.getPaperArtifactManifest",
  "client.exportFilteredPaperArtifacts",
  "client.queryConceptKb",
  "client.getSchemas",
  "client.getPublicMaintenanceOperation",
  "client.getLibraryIndex",
  "client.getReviewInput",
  "client.debugSynthesisSnapshot",
  "client.debugSynthesisCacheList",
  "client.debugSynthesisOperationsList",
  "client.debugSynthesisProfilerList",
  "client.debugSynthesisPaperInspect",
  "client.debugSynthesisTopicInspect",
  "client.debugSynthesisDiff",
  "client.debugSynthesisCleanInstallReset",
  "client.listWorkflowTopicOptions",
  "client.reconcileSynthesisRuntimeWorkStateOnStartup",
  "client.resetSynthesisDatabase",
  "client.consumeRelatedItemsSyncEcho",
  "client.applyLiteratureDigestSidecar",
  "client.applyTopicSynthesisResult",
  "client.getTopicReport",
  "client.deleteTopicArtifact",
  "client.purgeDeletedTopicArtifacts",
  "client.rejectTopicDiscoveryHint",
  "client.restoreTopicDiscoveryHint",
  "client.rebuildTopicGraphIndex",
  "client.acceptTopicGraphRelation",
  "client.rejectTopicGraphRelation",
  "client.applyTopicGraphReviewAction",
  "client.readPaperArtifacts",
  "client.initializeBuiltinTagPolicy",
  "client.isBuiltinTagPolicyInitialized",
  "client.loadTagVocabulary",
  "client.saveTagVocabulary",
  "client.validateTagVocabulary",
  "client.rebuildTagVocabularyIndex",
  "client.exportTagVocabularyForRegulator",
  "client.listStagedTagSuggestions",
  "client.stageTagSuggestions",
  "client.updateStagedTagSuggestion",
  "client.updateTagVocabularyEntry",
  "client.deleteTagVocabularyEntry",
  "client.promoteStagedTagSuggestions",
  "client.discardStagedTagSuggestions",
  "client.clearStagedTagSuggestions",
  "client.previewTagVocabularyImport",
  "client.applyTagVocabularyImport",
  "client.replaceTagAuditRecords",
  "client.clearTagAuditRecord",
  "client.getSynthesisWorkbenchChromeInput",
  "client.getSynthesisWorkbenchSurfaceInput",
  "client.getSynthesisBackgroundJobRows",
  "client.readTopicDetail",
  "client.resolveTopicPaperDigest",
  "client.recomputeCitationGraphLayout",
  "client.rebuildCitationGraphCacheNow",
  "client.refreshCitationGraphCacheIncrementalNow",
  "client.retryCitationGraphCacheRebuild",
  "client.refreshReferenceSidecarNow",
  "client.retryReferenceSidecarRefresh",
  "client.runAdvancedReferenceMatchingNow",
  "client.retryAdvancedReferenceMatching",
  "client.applyCanonicalRevisionReviewAction",
  "client.applyReferenceMatchProposalAction",
  "client.applyReferenceMatchProposalActions",
  "client.mergeEffectiveCanonicalReference",
  "client.applyCanonicalRevisionMergeRequests",
  "client.updateCanonicalReferenceMetadata",
  "client.archiveCanonicalReference",
  "client.rebuildConceptKbIndex",
  "client.updateConceptDisplayText",
  "client.applyConceptReviewAction",
  "client.deleteConceptEntries",
  "client.syncWebDavNow",
  "client.pauseWebDavSync",
  "client.resumeWebDavSync",
  "client.retryWebDavSync",
  "client.resolveWebDavSyncConflict",
] as const;
export const SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT =
  "0e8e1f406d382d24183a3ac078254d966aba7c1d2d15fe82cac347a192f1f372" as const;
export const SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES = [
  "client.listTopics",
  "client.findTopicsByPaperRef",
  "client.queryCitationGraphCluster",
  "client.queryCitationGraph",
  "client.getCitationGraphLayout",
  "client.getCitationGraphSlice",
  "client.getCitationGraphMetrics",
  "client.rankLibraryPapers",
  "client.rebuildCitationGraphCacheNow",
  "client.recomputeCitationGraphLayout",
  "client.refreshCitationGraphCacheIncrementalNow",
  "client.refreshCitationGraphMetricsNow",
  "client.retryCitationGraphCacheRebuild",
  "client.startCitationGraphUpdate",
  "client.applyCanonicalRevisionMergeRequests",
  "client.applyCanonicalRevisionReviewAction",
  "client.applyReferenceMatchProposalAction",
  "client.applyReferenceMatchProposalActions",
  "client.archiveCanonicalReference",
  "client.getAttentionQueue",
  "client.getReferenceSidecarIndex",
  "client.getReviewInput",
  "client.mergeEffectiveCanonicalReference",
  "client.rankExternalReferences",
  "client.refreshReferenceSidecarNow",
  "client.retryAdvancedReferenceMatching",
  "client.retryReferenceSidecarRefresh",
  "client.runAdvancedReferenceMatchingNow",
  "client.startReferenceSidecarRefresh",
  "client.updateCanonicalReferenceMetadata",
  "client.getPaperArtifactManifest",
  "client.exportFilteredPaperArtifacts",
  "client.getSchemas",
  "client.getLibraryIndex",
  "client.debugSynthesisSnapshot",
  "client.debugSynthesisCacheList",
  "client.debugSynthesisOperationsList",
  "client.debugSynthesisProfilerList",
  "client.debugSynthesisPaperInspect",
  "client.debugSynthesisTopicInspect",
  "client.debugSynthesisDiff",
  "client.listWorkflowTopicOptions",
  "client.consumeRelatedItemsSyncEcho",
  "client.applyTopicSynthesisResult",
  "client.readPaperArtifacts",
  "client.isBuiltinTagPolicyInitialized",
  "client.loadTagVocabulary",
  "client.exportTagVocabularyForRegulator",
  "client.listStagedTagSuggestions",
  "client.clearTagAuditRecord",
  "client.initializeBuiltinTagPolicy",
  "client.saveTagVocabulary",
  "client.validateTagVocabulary",
  "client.rebuildTagVocabularyIndex",
  "client.stageTagSuggestions",
  "client.updateStagedTagSuggestion",
  "client.updateTagVocabularyEntry",
  "client.deleteTagVocabularyEntry",
  "client.promoteStagedTagSuggestions",
  "client.discardStagedTagSuggestions",
  "client.clearStagedTagSuggestions",
  "client.previewTagVocabularyImport",
  "client.applyTagVocabularyImport",
  "client.replaceTagAuditRecords",
  "client.getSynthesisWorkbenchChromeInput",
  "client.getSynthesisWorkbenchSurfaceInput",
  "client.getSynthesisBackgroundJobRows",
  "client.readTopicDetail",
  "client.getTopicContext",
  "client.resolveResolver",
  "client.getTopicReport",
  "client.resolveTopicPaperDigest",
  "client.applyLiteratureDigestSidecar",
  "client.deleteTopicArtifact",
  "client.purgeDeletedTopicArtifacts",
  "client.rejectTopicDiscoveryHint",
  "client.restoreTopicDiscoveryHint",
  "client.queryConceptKb",
  "client.rebuildConceptKbIndex",
  "client.updateConceptDisplayText",
  "client.applyConceptReviewAction",
  "client.deleteConceptEntries",
  "client.rebuildTopicGraphIndex",
  "client.acceptTopicGraphRelation",
  "client.rejectTopicGraphRelation",
  "client.applyTopicGraphReviewAction",
] as const satisfies readonly SynthesisSidecarProductionClientCapability[];
export const SYNTHESIS_SIDECAR_COMPUTE_CAPABILITIES = [
  "compute.citation_graph_layout",
  "compute.citation_graph_metrics",
  "compute.citation_graph_build",
  "compute.citation_graph_build_transfer",
] as const;
export const SYNTHESIS_SIDECAR_WORKER_CAPABILITIES = [
  "compute.citation_graph_layout",
  "compute.citation_graph_metrics",
  "compute.citation_graph_build",
] as const;
export const SYNTHESIS_SIDECAR_CAPABILITIES = [
  ...SYNTHESIS_SIDECAR_SYSTEM_CAPABILITIES,
  ...SYNTHESIS_SIDECAR_GENERAL_CAPABILITIES,
  ...SYNTHESIS_SIDECAR_COMPUTE_CAPABILITIES,
] as const;

export const SYNTHESIS_SIDECAR_LIMITS = {
  requestBodyBytes: 1024 * 1024,
  computeRequestBodyBytes: 8 * 1024 * 1024,
  computeResponseBodyBytes: 8 * 1024 * 1024,
  jsonDepth: 32,
  jsonNodes: 50_000,
  computeRequestJsonNodes: 250_000,
  computeResponseJsonNodes: 50_000,
  stringLength: 64 * 1024,
  requestIdLength: 512,
  profileIdLength: 512,
  capabilityLength: 128,
} as const;

export type SynthesisSidecarSystemCapability =
  (typeof SYNTHESIS_SIDECAR_SYSTEM_CAPABILITIES)[number];
export type SynthesisSidecarGeneralCapability =
  (typeof SYNTHESIS_SIDECAR_GENERAL_CAPABILITIES)[number];
export type SynthesisSidecarProductionClientCapability =
  (typeof SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES)[number];
export type SynthesisSidecarComputeCapability =
  (typeof SYNTHESIS_SIDECAR_COMPUTE_CAPABILITIES)[number];
export type SynthesisSidecarWorkerCapability =
  (typeof SYNTHESIS_SIDECAR_WORKER_CAPABILITIES)[number];
export type SynthesisSidecarCapability =
  (typeof SYNTHESIS_SIDECAR_CAPABILITIES)[number];

export type SynthesisSidecarLifecycleState = "starting" | "ready" | "stopping";
export type SynthesisSidecarComputePoolState =
  | "idle"
  | "busy"
  | "degraded"
  | "stopping";

export type SynthesisSidecarComputePoolSnapshot = {
  state: SynthesisSidecarComputePoolState;
  active: 0 | 1;
  queued: number;
  restartCount: number;
  failureCount: number;
};

export type SynthesisSidecarRepositorySnapshot = {
  mode: "isolated_shadow";
  state: "ready" | "stopping";
  schemaVersion: typeof SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION;
  repositoryId: string;
};

export type SynthesisSidecarCallRequest = {
  protocol: string;
  requestId: string;
  profileId: string;
  capability: string;
  payload: SynthesisJsonObject;
};

export type SynthesisSidecarHealth = {
  status: "ok";
  implementation: "rust-native";
  protocol: typeof SYNTHESIS_SIDECAR_PROTOCOL;
  serviceVersion: string;
  serviceInstanceId: string;
  supervisorInstanceId: string;
  bundleId: string;
  target: SynthesisSidecarRuntimeTarget;
  targetTriple: SynthesisSidecarRuntimeTargetTriple;
  buildFingerprint: string;
  platformSignature: SynthesisSidecarRuntimePlatformSignature;
  lifecycleState: SynthesisSidecarLifecycleState;
  repository: SynthesisSidecarRepositorySnapshot;
  canonicalStore: SynthesisTopicCanonicalStoreSnapshot;
  computePool: SynthesisSidecarComputePoolSnapshot;
  citationGraphTransfer: SynthesisSidecarTransferSnapshot;
};

export type SynthesisSidecarHandshakePayload = {
  schemaVersion: string;
  bundleId: string;
  buildFingerprint: string;
  supervisorInstanceId: string;
};

export type SynthesisSidecarHandshakeResult = {
  implementation: "rust-native";
  protocol: typeof SYNTHESIS_SIDECAR_PROTOCOL;
  serviceVersion: string;
  serviceInstanceId: string;
  supervisorInstanceId: string;
  bundleId: string;
  target: SynthesisSidecarRuntimeTarget;
  targetTriple: SynthesisSidecarRuntimeTargetTriple;
  buildFingerprint: string;
  platformSignature: SynthesisSidecarRuntimePlatformSignature;
  profileId: string;
  schemaVersion: string;
  runtimeRootId: string;
  dataRootId: string;
  capabilities: SynthesisSidecarCapability[];
  mutationEnabled: false;
  lifecycleState: "ready";
  repository: SynthesisSidecarRepositorySnapshot;
  canonicalStore: SynthesisTopicCanonicalStoreSnapshot;
  computePool: SynthesisSidecarComputePoolSnapshot;
  citationGraphTransfer: SynthesisSidecarTransferSnapshot;
};

export type SynthesisSidecarShutdownResult = {
  accepted: true;
  lifecycleState: "stopping";
};

export const SYNTHESIS_SIDECAR_ERROR_CODES = [
  "invalid_request",
  "malformed_json",
  "request_body_too_large",
  "response_body_too_large",
  "request_json_too_deep",
  "request_json_too_large",
  "request_string_too_long",
  "request_timeout",
  "request_canceled",
  "response_invalid",
  "service_unavailable",
  "method_not_allowed",
  "not_found",
  "unauthorized",
  "lifecycle_forbidden",
  "protocol_mismatch",
  "profile_mismatch",
  "schema_mismatch",
  "runtime_mismatch",
  "capability_not_found",
  "service_not_ready",
  "worker_busy",
  "worker_timeout",
  "worker_canceled",
  "worker_crashed",
  "worker_result_invalid",
  "worker_unavailable",
  "transfer_busy",
  "transfer_not_found",
  "transfer_conflict",
  "transfer_limit_exceeded",
  "transfer_incomplete",
  "transfer_output_not_ready",
  "transfer_stopping",
  "internal_error",
] as const;

export type SynthesisSidecarErrorCode =
  (typeof SYNTHESIS_SIDECAR_ERROR_CODES)[number];

export type SynthesisSidecarError = {
  code: SynthesisSidecarErrorCode;
  message: string;
  retryable: boolean;
  details: SynthesisJsonObject;
};

export type SynthesisSidecarSuccess = {
  ok: true;
  requestId: string;
  serviceInstanceId: string;
  data: SynthesisJsonObject;
  diagnostics: SynthesisJsonObject[];
};

export type SynthesisSidecarFailure = {
  ok: false;
  requestId: string;
  serviceInstanceId: string;
  error: SynthesisSidecarError;
};

export type SynthesisSidecarResponse =
  | SynthesisSidecarSuccess
  | SynthesisSidecarFailure;

function requireBoundedString(
  value: unknown,
  location: string,
  maxLength: number,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      `${location} must be a non-empty string of at most ${maxLength} characters`,
      { location, maxLength },
    );
  }
  return value;
}

export function rebuildSynthesisSidecarCallRequest(
  value: unknown,
): SynthesisSidecarCallRequest {
  const json = toSynthesisJsonObject(value, "sidecarCallRequest");
  return {
    protocol: requireBoundedString(json.protocol, "protocol", 64),
    requestId: requireBoundedString(
      json.requestId,
      "requestId",
      SYNTHESIS_SIDECAR_LIMITS.requestIdLength,
    ),
    profileId: requireBoundedString(
      json.profileId,
      "profileId",
      SYNTHESIS_SIDECAR_LIMITS.profileIdLength,
    ),
    capability: requireBoundedString(
      json.capability,
      "capability",
      SYNTHESIS_SIDECAR_LIMITS.capabilityLength,
    ),
    payload: toSynthesisJsonObject(json.payload, "payload"),
  };
}

export function isSynthesisSidecarSystemCapability(
  value: string,
): value is SynthesisSidecarSystemCapability {
  return (SYNTHESIS_SIDECAR_SYSTEM_CAPABILITIES as readonly string[]).includes(
    value,
  );
}

export function isSynthesisSidecarGeneralCapability(
  value: string,
): value is SynthesisSidecarGeneralCapability {
  return (SYNTHESIS_SIDECAR_GENERAL_CAPABILITIES as readonly string[]).includes(
    value,
  );
}

export function isSynthesisSidecarComputeCapability(
  value: string,
): value is SynthesisSidecarComputeCapability {
  return (SYNTHESIS_SIDECAR_COMPUTE_CAPABILITIES as readonly string[]).includes(
    value,
  );
}

export function isSynthesisSidecarProductionClientCapability(
  value: unknown,
): value is SynthesisSidecarProductionClientCapability {
  return (
    typeof value === "string" &&
    (
      SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES as readonly string[]
    ).includes(value)
  );
}

export function isSynthesisSidecarWorkerCapability(
  value: string,
): value is SynthesisSidecarWorkerCapability {
  return (SYNTHESIS_SIDECAR_WORKER_CAPABILITIES as readonly string[]).includes(
    value,
  );
}

export function isSynthesisSidecarCapability(
  value: string,
): value is SynthesisSidecarCapability {
  return (SYNTHESIS_SIDECAR_CAPABILITIES as readonly string[]).includes(value);
}

export function isSynthesisSidecarErrorCode(
  value: unknown,
): value is SynthesisSidecarErrorCode {
  return (
    typeof value === "string" &&
    (SYNTHESIS_SIDECAR_ERROR_CODES as readonly string[]).includes(value)
  );
}

export function rebuildSynthesisSidecarComputePoolSnapshot(
  value: unknown,
): SynthesisSidecarComputePoolSnapshot {
  const json = toSynthesisJsonObject(value, "sidecarComputePoolSnapshot");
  const expected = [
    "state",
    "active",
    "queued",
    "restartCount",
    "failureCount",
  ];
  const keys = Object.keys(json).sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== [...expected].sort()[index])
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "sidecarComputePoolSnapshot fields are invalid",
      { location: "sidecarComputePoolSnapshot" },
    );
  }
  if (
    json.state !== "idle" &&
    json.state !== "busy" &&
    json.state !== "degraded" &&
    json.state !== "stopping"
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "sidecarComputePoolSnapshot.state is invalid",
      { location: "sidecarComputePoolSnapshot.state" },
    );
  }
  const integer = (entry: unknown, location: string, max?: number) => {
    if (
      typeof entry !== "number" ||
      !Number.isSafeInteger(entry) ||
      entry < 0 ||
      (max !== undefined && entry > max)
    ) {
      throw new SynthesisClientError(
        "invalid_request",
        `${location} is invalid`,
        { location },
      );
    }
    return entry;
  };
  const active = integer(json.active, "sidecarComputePoolSnapshot.active", 1);
  return {
    state: json.state,
    active: active as 0 | 1,
    queued: integer(json.queued, "sidecarComputePoolSnapshot.queued", 2),
    restartCount: integer(
      json.restartCount,
      "sidecarComputePoolSnapshot.restartCount",
    ),
    failureCount: integer(
      json.failureCount,
      "sidecarComputePoolSnapshot.failureCount",
    ),
  };
}

export function rebuildSynthesisSidecarRepositorySnapshot(
  value: unknown,
): SynthesisSidecarRepositorySnapshot {
  const json = toSynthesisJsonObject(value, "sidecarRepositorySnapshot");
  const expected = ["mode", "state", "schemaVersion", "repositoryId"].sort();
  const keys = Object.keys(json).sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index]) ||
    json.mode !== "isolated_shadow" ||
    (json.state !== "ready" && json.state !== "stopping") ||
    json.schemaVersion !== SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION ||
    typeof json.repositoryId !== "string" ||
    !/^[a-f0-9]{64}$/.test(json.repositoryId)
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "sidecarRepositorySnapshot is invalid",
      { location: "sidecarRepositorySnapshot" },
    );
  }
  return {
    mode: json.mode,
    state: json.state,
    schemaVersion: json.schemaVersion,
    repositoryId: json.repositoryId,
  };
}

function requireExactFields(
  value: Record<string, unknown>,
  expected: readonly string[],
  location: string,
) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((field, index) => field !== wanted[index])
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      `${location} fields are invalid`,
      { location },
    );
  }
}

function requireHash(value: unknown, location: string) {
  const result = requireBoundedString(value, location, 64);
  if (!/^[a-f0-9]{64}$/.test(result)) {
    throw new SynthesisClientError(
      "invalid_request",
      `${location} is invalid`,
      {
        location,
      },
    );
  }
  return result;
}

function requireCapabilities(value: unknown, location: string) {
  if (
    !Array.isArray(value) ||
    value.length !== SYNTHESIS_SIDECAR_CAPABILITIES.length ||
    !SYNTHESIS_SIDECAR_CAPABILITIES.every(
      (capability, index) => value[index] === capability,
    )
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      `${location} is invalid`,
      {
        location,
      },
    );
  }
  return [...SYNTHESIS_SIDECAR_CAPABILITIES];
}

function rebuildNativeRuntimeIdentity(
  value: Record<string, unknown>,
  location: string,
) {
  if (
    value.implementation !== "rust-native" ||
    value.protocol !== SYNTHESIS_SIDECAR_PROTOCOL
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      `${location} identity is invalid`,
      { location },
    );
  }
  const target = requireBoundedString(
    value.target,
    `${location}.target`,
    32,
  ) as SynthesisSidecarRuntimeTarget;
  if (
    !(target in SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES) ||
    value.targetTriple !== SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target]
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      `${location}.target is invalid`,
      { location: `${location}.target` },
    );
  }
  return {
    implementation: "rust-native" as const,
    protocol: SYNTHESIS_SIDECAR_PROTOCOL,
    serviceVersion: requireBoundedString(
      value.serviceVersion,
      `${location}.serviceVersion`,
      128,
    ),
    serviceInstanceId: requireBoundedString(
      value.serviceInstanceId,
      `${location}.serviceInstanceId`,
      128,
    ),
    supervisorInstanceId: requireBoundedString(
      value.supervisorInstanceId,
      `${location}.supervisorInstanceId`,
      128,
    ),
    bundleId: requireHash(value.bundleId, `${location}.bundleId`),
    target,
    targetTriple: SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target],
    buildFingerprint: requireHash(
      value.buildFingerprint,
      `${location}.buildFingerprint`,
    ),
    platformSignature: rebuildSynthesisSidecarRuntimePlatformSignature(
      value.platformSignature,
      target,
    ),
  };
}

export function rebuildSynthesisSidecarHealth(
  value: unknown,
): SynthesisSidecarHealth {
  const json = toSynthesisJsonObject(value, "sidecarHealth");
  requireExactFields(
    json,
    [
      "status",
      "implementation",
      "protocol",
      "serviceVersion",
      "serviceInstanceId",
      "supervisorInstanceId",
      "bundleId",
      "target",
      "targetTriple",
      "buildFingerprint",
      "platformSignature",
      "lifecycleState",
      "repository",
      "canonicalStore",
      "computePool",
      "citationGraphTransfer",
    ],
    "sidecarHealth",
  );
  if (
    json.status !== "ok" ||
    (json.lifecycleState !== "starting" &&
      json.lifecycleState !== "ready" &&
      json.lifecycleState !== "stopping")
  ) {
    throw new SynthesisClientError(
      "invalid_request",
      "sidecarHealth state is invalid",
      { location: "sidecarHealth" },
    );
  }
  return {
    status: "ok",
    ...rebuildNativeRuntimeIdentity(json, "sidecarHealth"),
    lifecycleState: json.lifecycleState,
    repository: rebuildSynthesisSidecarRepositorySnapshot(json.repository),
    canonicalStore: rebuildSynthesisTopicCanonicalStoreSnapshot(
      json.canonicalStore,
    ),
    computePool: rebuildSynthesisSidecarComputePoolSnapshot(json.computePool),
    citationGraphTransfer: rebuildSynthesisSidecarTransferSnapshot(
      json.citationGraphTransfer,
    ),
  };
}

export function rebuildSynthesisSidecarHandshakeResult(
  value: unknown,
): SynthesisSidecarHandshakeResult {
  const json = toSynthesisJsonObject(value, "sidecarHandshake");
  requireExactFields(
    json,
    [
      "implementation",
      "protocol",
      "serviceVersion",
      "serviceInstanceId",
      "supervisorInstanceId",
      "bundleId",
      "target",
      "targetTriple",
      "buildFingerprint",
      "platformSignature",
      "profileId",
      "schemaVersion",
      "runtimeRootId",
      "dataRootId",
      "capabilities",
      "mutationEnabled",
      "lifecycleState",
      "repository",
      "canonicalStore",
      "computePool",
      "citationGraphTransfer",
    ],
    "sidecarHandshake",
  );
  if (json.mutationEnabled !== false || json.lifecycleState !== "ready") {
    throw new SynthesisClientError(
      "invalid_request",
      "sidecarHandshake state is invalid",
      { location: "sidecarHandshake" },
    );
  }
  return {
    ...rebuildNativeRuntimeIdentity(json, "sidecarHandshake"),
    profileId: requireHash(json.profileId, "sidecarHandshake.profileId"),
    schemaVersion: requireBoundedString(
      json.schemaVersion,
      "sidecarHandshake.schemaVersion",
      128,
    ),
    runtimeRootId: requireHash(
      json.runtimeRootId,
      "sidecarHandshake.runtimeRootId",
    ),
    dataRootId: requireHash(json.dataRootId, "sidecarHandshake.dataRootId"),
    capabilities: requireCapabilities(
      json.capabilities,
      "sidecarHandshake.capabilities",
    ),
    mutationEnabled: false,
    lifecycleState: "ready",
    repository: rebuildSynthesisSidecarRepositorySnapshot(json.repository),
    canonicalStore: rebuildSynthesisTopicCanonicalStoreSnapshot(
      json.canonicalStore,
    ),
    computePool: rebuildSynthesisSidecarComputePoolSnapshot(json.computePool),
    citationGraphTransfer: rebuildSynthesisSidecarTransferSnapshot(
      json.citationGraphTransfer,
    ),
  };
}
