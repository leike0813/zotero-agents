use serde::Deserialize;
use std::collections::{BTreeMap, BTreeSet};

pub const PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT: &str =
    "0e8e1f406d382d24183a3ac078254d966aba7c1d2d15fe82cac347a192f1f372";
pub const READY_PRODUCTION_CLIENT_CAPABILITIES: &[&str] = &[
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
    "client.getPublicMaintenanceOperation",
    "client.debugSynthesisCleanInstallReset",
    "client.reconcileSynthesisRuntimeWorkStateOnStartup",
    "client.resetSynthesisDatabase",
    "client.syncWebDavNow",
    "client.pauseWebDavSync",
    "client.resumeWebDavSync",
    "client.retryWebDavSync",
    "client.resolveWebDavSyncConflict",
];

const PRODUCTION_CLIENT_CAPABILITY_MANIFEST: &str = include_str!(
    "../../../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/capabilities.json"
);
const PRODUCTION_CLIENT_OPERATION_MANIFEST: &str = include_str!(
    "../../../../../packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json"
);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionClientCapabilityManifest {
    schema: String,
    canonicalization: String,
    fingerprint_sha256: String,
    capabilities: Vec<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProductionClientAccess {
    Read,
    Mutation,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ProductionClientDataPlane {
    Control,
    Transfer,
    Locator,
    Delivery,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ProductionClientWorkModel {
    Bounded,
    Receipt,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ProductionClientReceipt {
    Inline,
    PublicMaintenanceOperation,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionClientPolicy {
    request_plane: ProductionClientDataPlane,
    result_plane: ProductionClientDataPlane,
    work_model: ProductionClientWorkModel,
    receipt: ProductionClientReceipt,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionClientPolicyOverride {
    request_plane: Option<ProductionClientDataPlane>,
    result_plane: Option<ProductionClientDataPlane>,
    work_model: Option<ProductionClientWorkModel>,
    receipt: Option<ProductionClientReceipt>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionClientOperationManifest {
    schema: String,
    request_codec: String,
    result_codec: String,
    request_bytes: usize,
    response_bytes: usize,
    control_target_bytes: usize,
    deadline_ms: u64,
    deadline_overrides_ms: BTreeMap<String, u64>,
    receipt_query_capability: String,
    policy_defaults: ProductionClientPolicy,
    policy_overrides: BTreeMap<String, ProductionClientPolicyOverride>,
    access: BTreeMap<String, ProductionClientAccess>,
    #[serde(default)]
    semantic_success: BTreeMap<String, ProductionClientSemanticSuccess>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProductionClientSemanticSuccess {
    pub field: String,
    pub values: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProductionClientOperationMetadata {
    pub access: ProductionClientAccess,
    pub request_plane: ProductionClientDataPlane,
    pub result_plane: ProductionClientDataPlane,
    pub work_model: ProductionClientWorkModel,
    pub receipt: ProductionClientReceipt,
    pub control_target_bytes: usize,
    pub request_bytes: usize,
    pub response_bytes: usize,
    pub deadline_ms: u64,
    pub semantic_success: Option<ProductionClientSemanticSuccess>,
}

fn resolved_policy(
    manifest: &ProductionClientOperationManifest,
    capability: &str,
) -> ProductionClientPolicy {
    let defaults = manifest.policy_defaults;
    let policy = manifest
        .policy_overrides
        .get(capability)
        .copied()
        .unwrap_or_default();
    ProductionClientPolicy {
        request_plane: policy.request_plane.unwrap_or(defaults.request_plane),
        result_plane: policy.result_plane.unwrap_or(defaults.result_plane),
        work_model: policy.work_model.unwrap_or(defaults.work_model),
        receipt: policy.receipt.unwrap_or(defaults.receipt),
    }
}

fn valid_policy(access: ProductionClientAccess, policy: ProductionClientPolicy) -> bool {
    matches!(
        policy.request_plane,
        ProductionClientDataPlane::Control | ProductionClientDataPlane::Transfer
    ) && matches!(
        policy.result_plane,
        ProductionClientDataPlane::Control
            | ProductionClientDataPlane::Locator
            | ProductionClientDataPlane::Delivery
    ) && matches!(
        (policy.work_model, policy.receipt),
        (
            ProductionClientWorkModel::Bounded,
            ProductionClientReceipt::Inline
        ) | (
            ProductionClientWorkModel::Receipt,
            ProductionClientReceipt::PublicMaintenanceOperation
        )
    ) && (policy.work_model != ProductionClientWorkModel::Receipt
        || access == ProductionClientAccess::Mutation)
}

fn production_client_operation_manifest() -> Result<ProductionClientOperationManifest, String> {
    let manifest: ProductionClientOperationManifest =
        serde_json::from_str(PRODUCTION_CLIENT_OPERATION_MANIFEST)
            .map_err(|_| "invalid_production_operation_manifest".to_owned())?;
    if manifest.schema != "synthesis-production-client-operations.v2"
        || manifest.request_codec != "synthesis-client-args.v1"
        || manifest.result_codec != "synthesis-client-result.v1"
        || manifest.request_bytes == 0
        || manifest.request_bytes > 8 * 1024 * 1024
        || manifest.response_bytes == 0
        || manifest.response_bytes > 8 * 1024 * 1024
        || manifest.control_target_bytes == 0
        || manifest.control_target_bytes > manifest.request_bytes
        || manifest.control_target_bytes > manifest.response_bytes
        || manifest.receipt_query_capability != "client.getPublicMaintenanceOperation"
        || manifest.policy_defaults
            != (ProductionClientPolicy {
                request_plane: ProductionClientDataPlane::Control,
                result_plane: ProductionClientDataPlane::Control,
                work_model: ProductionClientWorkModel::Bounded,
                receipt: ProductionClientReceipt::Inline,
            })
        || manifest
            .policy_overrides
            .keys()
            .any(|capability| !manifest.access.contains_key(capability))
        || manifest.access.iter().any(|(capability, access)| {
            !valid_policy(*access, resolved_policy(&manifest, capability))
        })
        || !(100..=60_000).contains(&manifest.deadline_ms)
        || manifest
            .deadline_overrides_ms
            .iter()
            .any(|(capability, deadline)| {
                !manifest.access.contains_key(capability) || !(100..=60_000).contains(deadline)
            })
        || manifest.semantic_success.iter().any(|(capability, rule)| {
            !manifest.access.contains_key(capability)
                || rule.field != "status"
                || rule.values.is_empty()
                || rule.values.iter().any(|value| {
                    value.is_empty()
                        || value.len() > 128
                        || !value.bytes().all(|byte| {
                            byte.is_ascii_lowercase()
                                || byte.is_ascii_digit()
                                || b"_.:-".contains(&byte)
                        })
                })
        })
    {
        return Err("invalid_production_operation_manifest".into());
    }
    Ok(manifest)
}

pub fn production_client_operation_metadata()
-> Result<BTreeMap<String, ProductionClientOperationMetadata>, String> {
    let manifest = production_client_operation_manifest()?;
    Ok(manifest
        .access
        .iter()
        .map(|(capability, access)| {
            let policy = resolved_policy(&manifest, capability);
            let deadline_ms = manifest
                .deadline_overrides_ms
                .get(capability)
                .copied()
                .unwrap_or(manifest.deadline_ms);
            let semantic_success = manifest.semantic_success.get(capability).cloned();
            (
                capability.clone(),
                ProductionClientOperationMetadata {
                    access: *access,
                    request_plane: policy.request_plane,
                    result_plane: policy.result_plane,
                    work_model: policy.work_model,
                    receipt: policy.receipt,
                    control_target_bytes: manifest.control_target_bytes,
                    request_bytes: manifest.request_bytes,
                    response_bytes: manifest.response_bytes,
                    deadline_ms,
                    semantic_success,
                },
            )
        })
        .collect())
}

pub fn production_client_capabilities() -> Result<Vec<String>, String> {
    let manifest: ProductionClientCapabilityManifest =
        serde_json::from_str(PRODUCTION_CLIENT_CAPABILITY_MANIFEST)
            .map_err(|_| "invalid_production_capability_manifest".to_owned())?;
    let operations = production_client_operation_manifest()?;
    if manifest.schema != "synthesis-production-client-capabilities.v1"
        || manifest.canonicalization != "sorted-newline-terminated"
        || manifest.fingerprint_sha256 != PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT
        || manifest.capabilities.len() != 95
        || manifest
            .capabilities
            .iter()
            .any(|capability| !capability.starts_with("client."))
        || manifest.capabilities.iter().collect::<BTreeSet<_>>().len()
            != manifest.capabilities.len()
        || operations.access.len() != manifest.capabilities.len()
        || manifest
            .capabilities
            .iter()
            .any(|capability| !operations.access.contains_key(capability))
    {
        return Err("invalid_production_capability_manifest".to_owned());
    }
    Ok(manifest.capabilities)
}

pub fn production_ready_client_capabilities() -> Result<Vec<String>, String> {
    let capabilities = production_client_capabilities()?;
    let ready = READY_PRODUCTION_CLIENT_CAPABILITIES
        .iter()
        .map(|capability| (*capability).to_owned())
        .collect::<Vec<_>>();
    if ready.len() != capabilities.len()
        || ready.iter().collect::<BTreeSet<_>>().len() != ready.len()
        || ready.iter().collect::<BTreeSet<_>>() != capabilities.iter().collect::<BTreeSet<_>>()
    {
        return Err("invalid_ready_production_capabilities".into());
    }
    Ok(ready)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_closed_production_client_capability_manifest() {
        let capabilities = production_client_capabilities().unwrap();
        assert_eq!(capabilities.len(), 95);
        assert_eq!(
            PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
            "0e8e1f406d382d24183a3ac078254d966aba7c1d2d15fe82cac347a192f1f372"
        );
        let operations = production_client_operation_manifest().unwrap();
        assert_eq!(operations.access.len(), 95);
        assert_eq!(production_ready_client_capabilities().unwrap().len(), 95);
        assert_eq!(
            operations.access["client.listTopics"],
            ProductionClientAccess::Read
        );
        assert_eq!(
            operations.access["client.applyTopicSynthesisResult"],
            ProductionClientAccess::Mutation
        );
        let metadata = production_client_operation_metadata().unwrap();
        assert_eq!(metadata["client.listTopics"].deadline_ms, 10_000);
        assert_eq!(
            metadata["client.listTopics"].request_plane,
            ProductionClientDataPlane::Control
        );
        assert_eq!(
            metadata["client.listTopics"].work_model,
            ProductionClientWorkModel::Bounded
        );
        assert_eq!(
            metadata["client.listTopics"].control_target_bytes,
            768 * 1024
        );
        assert_eq!(
            metadata["client.applyTopicSynthesisResult"].request_plane,
            ProductionClientDataPlane::Transfer
        );
        assert_eq!(
            metadata["client.readPaperArtifacts"].result_plane,
            ProductionClientDataPlane::Locator
        );
        assert_eq!(
            metadata["client.exportFilteredPaperArtifacts"].result_plane,
            ProductionClientDataPlane::Delivery
        );
        assert_eq!(
            metadata["client.syncWebDavNow"].work_model,
            ProductionClientWorkModel::Receipt
        );
        assert_eq!(
            metadata["client.syncWebDavNow"].receipt,
            ProductionClientReceipt::PublicMaintenanceOperation
        );
        assert_eq!(
            metadata
                .values()
                .filter(|entry| entry.work_model == ProductionClientWorkModel::Receipt)
                .count(),
            16
        );
        assert_eq!(
            metadata
                .values()
                .filter(|entry| {
                    entry.request_plane != ProductionClientDataPlane::Control
                        || entry.result_plane != ProductionClientDataPlane::Control
                })
                .count(),
            4
        );
        for capability in [
            "client.startReferenceSidecarRefresh",
            "client.refreshReferenceSidecarNow",
            "client.retryReferenceSidecarRefresh",
        ] {
            assert_eq!(metadata[capability].deadline_ms, 60_000);
        }
    }
}
