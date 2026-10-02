import { SynthesisClientError, toSynthesisJsonObject, } from "./common.js";
import { rebuildSynthesisSidecarTraceContext, } from "./sidecarObservability.js";
import { rebuildSynthesisSidecarTransferSnapshot, } from "./sidecarTransfer.js";
import { SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION } from "./schemaVersion.js";
import { rebuildSynthesisTopicCanonicalStoreSnapshot, } from "./sidecarCanonicalStore.js";
import { SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES, rebuildSynthesisSidecarRuntimePlatformSignature, } from "./sidecarRuntimeBundle.js";
import { rebuildSynthesisProtocolCapabilityDto } from "./protocolSchema.js";
export { rebuildSynthesisTopicCanonicalStoreSnapshot };
export const SYNTHESIS_SIDECAR_PROTOCOL = "synthesis-sidecar.v1";
export const SYNTHESIS_SIDECAR_HEALTH_PATH = "/synthesis/v1/health";
export const SYNTHESIS_SIDECAR_CALL_PATH = "/synthesis/v1/call";
export const SYNTHESIS_SIDECAR_SYSTEM_CAPABILITIES = [
    "system.handshake",
    "system.shutdown",
];
export const SYNTHESIS_SIDECAR_GENERAL_CAPABILITIES = [
    "workbench.chrome.read",
    "topics.canonical.inspect",
];
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
    "client.controlPublicMaintenanceOperation",
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
    "client.getTopicPlanningContext",
    "client.applyTopicPlan",
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
    "client.beginTagAuditRun",
    "client.appendTagAuditRun",
    "client.promoteTagAuditRun",
    "client.abortTagAuditRun",
    "client.prepareTagRegulationAcknowledgement",
    "client.commitTagRegulationAcknowledgement",
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
];
export const SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT = "d2f8d0e6baf3fe170b595102209d95dca8b2a2ae5ea346de7bb17f2fa85aa0f1";
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
    "client.getTopicPlanningContext",
    "client.applyTopicPlan",
    "client.consumeRelatedItemsSyncEcho",
    "client.applyTopicSynthesisResult",
    "client.readPaperArtifacts",
    "client.isBuiltinTagPolicyInitialized",
    "client.loadTagVocabulary",
    "client.exportTagVocabularyForRegulator",
    "client.listStagedTagSuggestions",
    "client.clearTagAuditRecord",
    "client.beginTagAuditRun",
    "client.appendTagAuditRun",
    "client.promoteTagAuditRun",
    "client.abortTagAuditRun",
    "client.prepareTagRegulationAcknowledgement",
    "client.commitTagRegulationAcknowledgement",
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
    "client.getPublicMaintenanceOperation",
    "client.controlPublicMaintenanceOperation",
    "client.debugSynthesisCleanInstallReset",
    "client.reconcileSynthesisRuntimeWorkStateOnStartup",
    "client.resetSynthesisDatabase",
    "client.syncWebDavNow",
    "client.pauseWebDavSync",
    "client.resumeWebDavSync",
    "client.retryWebDavSync",
    "client.resolveWebDavSyncConflict",
];
export const SYNTHESIS_SIDECAR_COMPUTE_CAPABILITIES = [
    "compute.citation_graph_layout",
    "compute.citation_graph_metrics",
    "compute.citation_graph_build",
    "compute.citation_graph_build_transfer",
];
export const SYNTHESIS_SIDECAR_TRANSFER_CAPABILITIES = [
    "transfer.content",
];
export const SYNTHESIS_SIDECAR_WORKER_CAPABILITIES = [
    "compute.citation_graph_layout",
    "compute.citation_graph_metrics",
    "compute.citation_graph_build",
];
export const SYNTHESIS_SIDECAR_CAPABILITIES = [
    ...SYNTHESIS_SIDECAR_SYSTEM_CAPABILITIES,
    ...SYNTHESIS_SIDECAR_GENERAL_CAPABILITIES,
    ...SYNTHESIS_SIDECAR_TRANSFER_CAPABILITIES,
    ...SYNTHESIS_SIDECAR_COMPUTE_CAPABILITIES,
];
export const SYNTHESIS_SIDECAR_LIMITS = {
    requestBodyBytes: 1024 * 1024,
    computeRequestBodyBytes: 8 * 1024 * 1024,
    computeResponseBodyBytes: 8 * 1024 * 1024,
    jsonDepth: 32,
    jsonNodes: 50_000,
    computeRequestJsonNodes: 1_000_000,
    computeResponseJsonNodes: 200_000,
    stringLength: 64 * 1024,
    requestIdLength: 512,
    profileIdLength: 512,
    capabilityLength: 128,
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
    "operation_timeout",
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
    "basis_mismatch",
    "repository_schema_incompatible",
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
];
export function rebuildSynthesisSidecarForwardResult(capability, value) {
    return rebuildSynthesisProtocolCapabilityDto({
        capability,
        direction: "result",
        value,
    });
}
function requireBoundedString(value, location, maxLength) {
    if (typeof value !== "string" ||
        value.length === 0 ||
        value.length > maxLength) {
        throw new SynthesisClientError("invalid_request", `${location} must be a non-empty string of at most ${maxLength} characters`, { location, maxLength });
    }
    return value;
}
export function rebuildSynthesisSidecarCallEnvelope(value) {
    const json = toSynthesisJsonObject(value, "sidecarCallRequest");
    const keys = Object.keys(json).sort();
    const allowed = [
        "capability",
        "payload",
        "profileId",
        "protocol",
        "requestId",
        "trace",
    ];
    if (["capability", "payload", "profileId", "protocol", "requestId"].some((field) => !(field in json)) ||
        keys.some((field) => !allowed.includes(field))) {
        throw new SynthesisClientError("invalid_request", "sidecarCallRequest fields are invalid", { location: "sidecarCallRequest" });
    }
    const capability = requireBoundedString(json.capability, "capability", SYNTHESIS_SIDECAR_LIMITS.capabilityLength);
    return {
        protocol: requireBoundedString(json.protocol, "protocol", 64),
        requestId: requireBoundedString(json.requestId, "requestId", SYNTHESIS_SIDECAR_LIMITS.requestIdLength),
        profileId: requireBoundedString(json.profileId, "profileId", SYNTHESIS_SIDECAR_LIMITS.profileIdLength),
        capability,
        payload: toSynthesisJsonObject(json.payload, "sidecarCallRequest.payload"),
        ...(json.trace === undefined
            ? {}
            : { trace: rebuildSynthesisSidecarTraceContext(json.trace) }),
    };
}
export function rebuildSynthesisSidecarCallRequest(value) {
    const envelope = rebuildSynthesisSidecarCallEnvelope(value);
    return {
        ...envelope,
        payload: rebuildSynthesisProtocolCapabilityDto({
            capability: envelope.capability,
            direction: "request",
            value: envelope.payload,
        }),
    };
}
export function isSynthesisSidecarSystemCapability(value) {
    return SYNTHESIS_SIDECAR_SYSTEM_CAPABILITIES.includes(value);
}
export function isSynthesisSidecarGeneralCapability(value) {
    return SYNTHESIS_SIDECAR_GENERAL_CAPABILITIES.includes(value);
}
export function isSynthesisSidecarComputeCapability(value) {
    return SYNTHESIS_SIDECAR_COMPUTE_CAPABILITIES.includes(value);
}
export function isSynthesisSidecarProductionClientCapability(value) {
    return (typeof value === "string" &&
        SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITIES.includes(value));
}
export function isSynthesisSidecarWorkerCapability(value) {
    return SYNTHESIS_SIDECAR_WORKER_CAPABILITIES.includes(value);
}
export function isSynthesisSidecarCapability(value) {
    return SYNTHESIS_SIDECAR_CAPABILITIES.includes(value);
}
export function isSynthesisSidecarErrorCode(value) {
    return (typeof value === "string" &&
        SYNTHESIS_SIDECAR_ERROR_CODES.includes(value));
}
export function rebuildSynthesisSidecarComputePoolSnapshot(value) {
    const json = toSynthesisJsonObject(value, "sidecarComputePoolSnapshot");
    const expected = [
        "state",
        "active",
        "queued",
        "restartCount",
        "failureCount",
    ];
    const keys = Object.keys(json).sort();
    if (keys.length !== expected.length ||
        keys.some((key, index) => key !== [...expected].sort()[index])) {
        throw new SynthesisClientError("invalid_request", "sidecarComputePoolSnapshot fields are invalid", { location: "sidecarComputePoolSnapshot" });
    }
    if (json.state !== "idle" &&
        json.state !== "busy" &&
        json.state !== "degraded" &&
        json.state !== "stopping") {
        throw new SynthesisClientError("invalid_request", "sidecarComputePoolSnapshot.state is invalid", { location: "sidecarComputePoolSnapshot.state" });
    }
    const integer = (entry, location, max) => {
        if (typeof entry !== "number" ||
            !Number.isSafeInteger(entry) ||
            entry < 0 ||
            (max !== undefined && entry > max)) {
            throw new SynthesisClientError("invalid_request", `${location} is invalid`, { location });
        }
        return entry;
    };
    const active = integer(json.active, "sidecarComputePoolSnapshot.active", 1);
    return {
        state: json.state,
        active: active,
        queued: integer(json.queued, "sidecarComputePoolSnapshot.queued", 2),
        restartCount: integer(json.restartCount, "sidecarComputePoolSnapshot.restartCount"),
        failureCount: integer(json.failureCount, "sidecarComputePoolSnapshot.failureCount"),
    };
}
export function rebuildSynthesisSidecarRepositorySnapshot(value) {
    const json = toSynthesisJsonObject(value, "sidecarRepositorySnapshot");
    const expected = ["mode", "state", "schemaVersion", "repositoryId"].sort();
    const keys = Object.keys(json).sort();
    if (keys.length !== expected.length ||
        keys.some((key, index) => key !== expected[index]) ||
        json.mode !== "isolated_shadow" ||
        (json.state !== "ready" && json.state !== "stopping") ||
        json.schemaVersion !== SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION ||
        typeof json.repositoryId !== "string" ||
        !/^[a-f0-9]{64}$/.test(json.repositoryId)) {
        throw new SynthesisClientError("invalid_request", "sidecarRepositorySnapshot is invalid", { location: "sidecarRepositorySnapshot" });
    }
    return {
        mode: json.mode,
        state: json.state,
        schemaVersion: json.schemaVersion,
        repositoryId: json.repositoryId,
    };
}
function requireExactFields(value, expected, location) {
    const actual = Object.keys(value).sort();
    const wanted = [...expected].sort();
    if (actual.length !== wanted.length ||
        actual.some((field, index) => field !== wanted[index])) {
        throw new SynthesisClientError("invalid_request", `${location} fields are invalid`, { location });
    }
}
function requireHash(value, location) {
    const result = requireBoundedString(value, location, 64);
    if (!/^[a-f0-9]{64}$/.test(result)) {
        throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
            location,
        });
    }
    return result;
}
function requireCapabilities(value, location) {
    if (!Array.isArray(value) ||
        value.length !== SYNTHESIS_SIDECAR_CAPABILITIES.length ||
        !SYNTHESIS_SIDECAR_CAPABILITIES.every((capability, index) => value[index] === capability)) {
        throw new SynthesisClientError("invalid_request", `${location} is invalid`, {
            location,
        });
    }
    return [...SYNTHESIS_SIDECAR_CAPABILITIES];
}
function rebuildNativeRuntimeIdentity(value, location) {
    if (value.implementation !== "rust-native" ||
        value.protocol !== SYNTHESIS_SIDECAR_PROTOCOL) {
        throw new SynthesisClientError("invalid_request", `${location} identity is invalid`, { location });
    }
    const target = requireBoundedString(value.target, `${location}.target`, 32);
    if (!(target in SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES) ||
        value.targetTriple !== SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target]) {
        throw new SynthesisClientError("invalid_request", `${location}.target is invalid`, { location: `${location}.target` });
    }
    return {
        implementation: "rust-native",
        protocol: SYNTHESIS_SIDECAR_PROTOCOL,
        serviceVersion: requireBoundedString(value.serviceVersion, `${location}.serviceVersion`, 128),
        serviceInstanceId: requireBoundedString(value.serviceInstanceId, `${location}.serviceInstanceId`, 128),
        supervisorInstanceId: requireBoundedString(value.supervisorInstanceId, `${location}.supervisorInstanceId`, 128),
        bundleId: requireHash(value.bundleId, `${location}.bundleId`),
        target,
        targetTriple: SYNTHESIS_SIDECAR_RUNTIME_TARGET_TRIPLES[target],
        buildFingerprint: requireHash(value.buildFingerprint, `${location}.buildFingerprint`),
        platformSignature: rebuildSynthesisSidecarRuntimePlatformSignature(value.platformSignature, target),
    };
}
export function rebuildSynthesisSidecarHealth(value) {
    const json = toSynthesisJsonObject(value, "sidecarHealth");
    requireExactFields(json, [
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
    ], "sidecarHealth");
    if (json.status !== "ok" ||
        (json.lifecycleState !== "starting" &&
            json.lifecycleState !== "ready" &&
            json.lifecycleState !== "stopping")) {
        throw new SynthesisClientError("invalid_request", "sidecarHealth state is invalid", { location: "sidecarHealth" });
    }
    return {
        status: "ok",
        ...rebuildNativeRuntimeIdentity(json, "sidecarHealth"),
        lifecycleState: json.lifecycleState,
        repository: rebuildSynthesisSidecarRepositorySnapshot(json.repository),
        canonicalStore: rebuildSynthesisTopicCanonicalStoreSnapshot(json.canonicalStore),
        computePool: rebuildSynthesisSidecarComputePoolSnapshot(json.computePool),
        citationGraphTransfer: rebuildSynthesisSidecarTransferSnapshot(json.citationGraphTransfer),
    };
}
export function rebuildSynthesisSidecarHandshakeResult(value) {
    const json = toSynthesisJsonObject(value, "sidecarHandshake");
    requireExactFields(json, [
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
    ], "sidecarHandshake");
    if (json.mutationEnabled !== false || json.lifecycleState !== "ready") {
        throw new SynthesisClientError("invalid_request", "sidecarHandshake state is invalid", { location: "sidecarHandshake" });
    }
    return {
        ...rebuildNativeRuntimeIdentity(json, "sidecarHandshake"),
        profileId: requireHash(json.profileId, "sidecarHandshake.profileId"),
        schemaVersion: requireBoundedString(json.schemaVersion, "sidecarHandshake.schemaVersion", 128),
        runtimeRootId: requireHash(json.runtimeRootId, "sidecarHandshake.runtimeRootId"),
        dataRootId: requireHash(json.dataRootId, "sidecarHandshake.dataRootId"),
        capabilities: requireCapabilities(json.capabilities, "sidecarHandshake.capabilities"),
        mutationEnabled: false,
        lifecycleState: "ready",
        repository: rebuildSynthesisSidecarRepositorySnapshot(json.repository),
        canonicalStore: rebuildSynthesisTopicCanonicalStoreSnapshot(json.canonicalStore),
        computePool: rebuildSynthesisSidecarComputePoolSnapshot(json.computePool),
        citationGraphTransfer: rebuildSynthesisSidecarTransferSnapshot(json.citationGraphTransfer),
    };
}
