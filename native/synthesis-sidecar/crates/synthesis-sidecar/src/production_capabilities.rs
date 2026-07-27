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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionClientOperationManifest {
    schema: String,
    request_codec: String,
    result_codec: String,
    request_bytes: usize,
    response_bytes: usize,
    deadline_ms: u64,
    access: BTreeMap<String, ProductionClientAccess>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ProductionClientOperationMetadata {
    pub access: ProductionClientAccess,
    pub request_bytes: usize,
    pub response_bytes: usize,
    pub deadline_ms: u64,
}

fn production_client_operation_manifest() -> Result<ProductionClientOperationManifest, String> {
    let manifest: ProductionClientOperationManifest =
        serde_json::from_str(PRODUCTION_CLIENT_OPERATION_MANIFEST)
            .map_err(|_| "invalid_production_operation_manifest".to_owned())?;
    if manifest.schema != "synthesis-production-client-operations.v1"
        || manifest.request_codec != "synthesis-client-args.v1"
        || manifest.result_codec != "synthesis-client-result.v1"
        || manifest.request_bytes == 0
        || manifest.request_bytes > 8 * 1024 * 1024
        || manifest.response_bytes == 0
        || manifest.response_bytes > 8 * 1024 * 1024
        || !(100..=60_000).contains(&manifest.deadline_ms)
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
        .into_iter()
        .map(|(capability, access)| {
            (
                capability,
                ProductionClientOperationMetadata {
                    access,
                    request_bytes: manifest.request_bytes,
                    response_bytes: manifest.response_bytes,
                    deadline_ms: manifest.deadline_ms,
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
        assert_eq!(
            operations.access["client.listTopics"],
            ProductionClientAccess::Read
        );
        assert_eq!(
            operations.access["client.applyTopicSynthesisResult"],
            ProductionClientAccess::Mutation
        );
    }
}
