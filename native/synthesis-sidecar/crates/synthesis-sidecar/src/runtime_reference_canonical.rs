use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet, VecDeque};
use std::sync::{Arc, Mutex};
use std::time::Duration;
#[cfg(test)]
use std::time::{SystemTime, UNIX_EPOCH};
use synthesis_application::PromotionCheckpoint;
use synthesis_application::RepositoryPort;
use synthesis_application::reference_matching::{
    ReferenceHostCandidate, ReferenceMatchingApplication, ReferenceMatchingPrepareRequest,
    ReferenceMatchingStatus, ReferenceReviewAction, ReferenceReviewBatchResult,
    ReferenceReviewDecision,
};
use synthesis_application::reference_refresh::{
    REFERENCE_REFRESH_MATERIALIZED_MAX_BYTES, REFERENCE_REFRESH_MATERIALIZED_MAX_JSON_NODES,
    ReferenceArtifactDescriptor, ReferenceArtifactType, ReferenceRefreshApplication,
    ReferenceRefreshApplyCapacity, ReferenceRefreshApplyRequest, ReferenceRefreshItem,
    ReferenceRefreshPayload, ReferenceRefreshPrepareRequest, ReferenceRefreshScope,
    ReferenceRefreshStatus, measure_reference_refresh_apply_request,
    validate_reference_refresh_apply_request,
};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    LiteratureMatchingMetadataRecord, OperationRecord, RawReferenceRecord, ReferenceArtifactRecord,
    ReferenceBindingFactRecord, ReferenceMatchProposalRecord, ReferenceRedirectFactRecord,
    Repository,
};

use crate::runtime_deadline::bounded_timeout;
use crate::runtime_diagnostics::{NativeDiagnosticEvent, emit_debug};
use crate::runtime_public_maintenance_operation::{
    checkpoint_before_promotion_in_repository, current_operation_id,
};

const HOST_ARTIFACT_TYPES_PER_ITEM: usize = 3;
use crate::runtime_host_collection::{
    HOST_PAGE_LIMIT, HostItemCollectionPort, MAX_HOST_PAGES, MAX_HOST_ROWS, ReferenceHostItem,
    collect_host_items, collect_host_items_bounded, validate_page_metadata,
};
const REFRESH_JOB_ID: &str = "reference-job:refresh";
const MATCHING_JOB_ID: &str = "reference-job:advanced-matching";
const REFERENCE_REFRESH_ESTIMATED_BATCH_BYTES: usize =
    REFERENCE_REFRESH_MATERIALIZED_MAX_BYTES - 64 * 1024;
const LITERATURE_MATCHING_METADATA_SCHEMA: &str = "literature_matching_metadata.v1";

enum RefreshBatchAttempt {
    Converged {
        promoted: bool,
        reference_hash: Option<String>,
        input_hash: Option<String>,
        affected_source_refs: Vec<String>,
        warnings: Vec<String>,
    },
    Split,
    Failed {
        code: String,
        capacity: Option<ReferenceRefreshApplyCapacity>,
    },
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ReferenceHostArtifact {
    pub paper_ref: String,
    pub artifact_type: String,
    pub payload_type: String,
    pub status: String,
    #[serde(default)]
    pub locator: String,
    #[serde(default)]
    pub payload_hash: String,
    #[serde(default)]
    pub estimated_size: Option<usize>,
    #[serde(default)]
    pub diagnostics: Vec<String>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ReferenceHostArtifactsPage {
    pub artifacts: Vec<ReferenceHostArtifact>,
    pub cursor: String,
    pub next_cursor: String,
    pub has_more: bool,
    pub returned: usize,
    pub limit: usize,
    pub snapshot_revision: String,
}

#[derive(Clone, Debug)]
struct ReferenceIndexFactReference {
    raw: RawReferenceRecord,
    binding: Option<ReferenceBindingFactRecord>,
}

#[derive(Clone, Debug)]
struct ReferenceIndexFactRow {
    item: ReferenceHostItem,
    artifact_coverage: String,
    missing_artifacts: Vec<String>,
    references: Vec<ReferenceIndexFactReference>,
    reference_count: usize,
    unbound_reference_count: usize,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ReferenceHostArtifactRead {
    pub status: String,
    #[serde(default)]
    pub payload_hash: String,
    #[serde(default)]
    pub current_hash: String,
    #[serde(default)]
    pub content: Option<Value>,
    #[serde(default)]
    pub diagnostics: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct LiteratureDigestApplyRequest {
    pub library_id: i64,
    pub item_key: String,
    pub paper_ref: String,
    pub item_type: String,
    pub title: String,
    pub year: String,
    pub date: String,
    pub creators: Vec<String>,
    pub tags: Vec<String>,
    pub collections: Vec<String>,
    pub doi: String,
    pub arxiv: String,
    pub isbn: String,
    pub url: String,
    pub citekey: String,
    pub date_added: String,
    #[serde(default)]
    pub digest: Option<Map<String, Value>>,
    #[serde(default)]
    pub references: Option<Map<String, Value>>,
    #[serde(default)]
    pub citation_analysis: Option<Map<String, Value>>,
    #[serde(default)]
    pub literature_matching_metadata: Option<Value>,
    #[serde(default)]
    pub matched_references: Option<Value>,
    #[serde(default)]
    pub source: Option<Value>,
}

pub(crate) trait ReferenceHostPort: HostItemCollectionPort {
    fn scan_artifacts_page(
        &self,
        cursor: &str,
        limit: usize,
    ) -> Result<ReferenceHostArtifactsPage, String>;
    fn read_artifact(
        &self,
        locator: &str,
        expected_hash: &str,
    ) -> Result<ReferenceHostArtifactRead, String>;
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CanonicalRevisionReviewRequest {
    pub review_item_id: String,
    pub action: CanonicalRevisionReviewAction,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum CanonicalRevisionReviewAction {
    Accept,
    Reject,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CanonicalMergePair {
    pub source_effective_canonical_id: String,
    pub target_effective_canonical_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct EffectiveCanonicalMergeRequest {
    pub source_effective_canonical_id: String,
    pub target_effective_canonical_id: String,
    #[serde(default)]
    pub confirm_retarget_group: bool,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CanonicalMergeBatchRequest {
    pub requests: Vec<CanonicalMergePair>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CanonicalMetadataPatch {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub normalized_title: Option<String>,
    #[serde(default)]
    pub year: Option<String>,
    #[serde(default)]
    pub authors: Option<Vec<String>>,
    #[serde(default)]
    pub identifiers: Option<BTreeMap<String, String>>,
}

impl CanonicalMetadataPatch {
    fn is_empty(&self) -> bool {
        self.title.is_none()
            && self.normalized_title.is_none()
            && self.year.is_none()
            && self.authors.is_none()
            && self.identifiers.is_none()
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CanonicalMetadataUpdateRequest {
    pub canonical_reference_id: String,
    pub patch: CanonicalMetadataPatch,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct CanonicalArchiveRequest {
    pub canonical_reference_id: String,
}

#[derive(Clone)]
struct PlannedMerge {
    source: String,
    target: String,
}

#[derive(Clone, Copy)]
enum MergeFailure {
    InvalidTarget,
    MissingCanonical,
    ConflictingBindings,
    RequiresConfirmation,
}

pub(crate) struct ReferenceCanonicalApplication {
    repository: Arc<RepositoryPort>,
    refresh: ReferenceRefreshApplication,
    matching: ReferenceMatchingApplication,
    host: Arc<dyn ReferenceHostPort>,
    mutation: Mutex<()>,
}

impl ReferenceCanonicalApplication {
    pub(crate) fn new(
        repository: Arc<RepositoryPort>,
        refresh: ReferenceRefreshApplication,
        matching: ReferenceMatchingApplication,
        host: Arc<dyn ReferenceHostPort>,
    ) -> Self {
        Self {
            repository,
            refresh,
            matching,
            host,
            mutation: Mutex::new(()),
        }
    }

    pub(crate) fn apply_literature_digest(&self, payload: Value) -> Result<Value, String> {
        let request: LiteratureDigestApplyRequest =
            serde_json::from_value(payload).map_err(|_| "invalid_request".to_owned())?;
        validate_literature_digest_request(&request)?;
        let source_hash = canonical_json_hash(
            &serde_json::to_value(&request).map_err(|_| "invalid_request".to_owned())?,
        )?;
        let operation_id = format!("literature-digest:{source_hash}");
        {
            let repository = self.repository.owner();
            let repository = repository
                .lock()
                .map_err(|_| "repository_unavailable".to_owned())?;
            if let Some(receipt) = repository.get_operation(&operation_id)?
                && matches!(receipt.status.as_str(), "completed" | "succeeded")
            {
                let mut result = receipt_result_value(&receipt)?;
                result["idempotent"] = Value::Bool(true);
                return Ok(result);
            }
        }

        let digest_hash = literature_artifact_hash(request.digest.as_ref(), "digest")?;
        let references_hash = literature_artifact_hash(request.references.as_ref(), "references")?;
        let citation_hash =
            literature_artifact_hash(request.citation_analysis.as_ref(), "citation_analysis")?;
        let artifacts = vec![
            literature_artifact_descriptor(
                &request.paper_ref,
                ReferenceArtifactType::Digest,
                "digest-markdown",
                request.digest.is_some(),
                &digest_hash,
            )?,
            literature_artifact_descriptor(
                &request.paper_ref,
                ReferenceArtifactType::References,
                "references-json",
                request.references.is_some(),
                &references_hash,
            )?,
            literature_artifact_descriptor(
                &request.paper_ref,
                ReferenceArtifactType::CitationAnalysis,
                "citation-analysis-json",
                request.citation_analysis.is_some(),
                &citation_hash,
            )?,
        ];
        let item = literature_refresh_item(&request);
        let binding_candidates = literature_binding_candidates(request.matched_references.as_ref());
        let prepared = self.refresh.prepare_literature_apply(
            ReferenceRefreshPrepareRequest {
                expected_reference_hash: self.refresh.inspect()?.reference_hash,
                force: false,
                scope: ReferenceRefreshScope::Sources {
                    source_refs: vec![request.paper_ref.clone()],
                },
                items: vec![item],
                artifacts,
            },
            binding_candidates,
        );
        if prepared.status != ReferenceRefreshStatus::Prepared {
            return Err(refresh_status_name(&prepared.status));
        }
        let preparation_id = prepared
            .preparation_id
            .clone()
            .ok_or_else(|| "reference_refresh_preparation_missing".to_owned())?;
        let payloads = prepared
            .reads
            .iter()
            .map(|read| {
                let content = match read.artifact_type {
                    ReferenceArtifactType::References => request
                        .references
                        .clone()
                        .map(Value::Object)
                        .ok_or_else(|| "invalid_request".to_owned())?,
                    ReferenceArtifactType::CitationAnalysis => request
                        .citation_analysis
                        .clone()
                        .map(Value::Object)
                        .ok_or_else(|| "invalid_request".to_owned())?,
                    ReferenceArtifactType::Digest => return Err("invalid_request".into()),
                };
                Ok(ReferenceRefreshPayload {
                    locator: read.locator.clone(),
                    expected_hash: read.expected_hash.clone(),
                    status: "available".into(),
                    payload_hash: read.expected_hash.clone(),
                    content,
                    diagnostics: Vec::new(),
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        let input_reference_count = request
            .references
            .as_ref()
            .and_then(|value| value.get("references"))
            .and_then(Value::as_array)
            .map_or(0, Vec::len);
        let now = now_string();
        let result = json!({
            "ok":true,
            "status":"sidecar_applied",
            "sourceRef":request.paper_ref,
            "source_ref":request.paper_ref,
            "paperRef":request.paper_ref,
            "reference_count":input_reference_count,
            "input_reference_count":input_reference_count,
            "rejected_reference_count":0,
            "warning_reference_count":0,
            "matched_count":0,
            "decision_count":0,
            "stale_canonical_governance":{
                "affected":0,"autoRedirected":0,"autoStaled":0,
                "proposalsCreated":0,"blocked":0
            },
            "operationId":operation_id,
            "idempotent":false,
        });
        let receipt = OperationRecord {
            operation_id: operation_id.clone(),
            operation_type: "literature_digest_apply".into(),
            library_id: request.library_id,
            scope_kind: "paper".into(),
            scope_ref: request.paper_ref.clone(),
            status: "completed".into(),
            label: "Apply literature digest".into(),
            phase: "sidecar_applied".into(),
            progress_mode: "determinate".into(),
            processed_count: 1,
            total_count: 1,
            source_hash,
            diagnostics_json: serde_json::to_string(&json!({"result":result}))
                .map_err(|_| "serialization_failed".to_owned())?,
            created_at: now.clone(),
            started_at: now.clone(),
            completed_at: now.clone(),
            updated_at: now,
            ..OperationRecord::default()
        };
        let metadata = literature_matching_metadata_record(
            &request.paper_ref,
            request.literature_matching_metadata.as_ref(),
            &digest_hash,
            &receipt.updated_at,
        )?;
        let checkpoint = || self.promotion_checkpoint();
        let applied = self.refresh.apply_literature_refresh_with_checkpoint(
            ReferenceRefreshApplyRequest {
                preparation_id,
                payloads,
            },
            metadata,
            receipt,
            &checkpoint,
        );
        if applied.status != ReferenceRefreshStatus::Promoted {
            return Err(refresh_status_name(&applied.status));
        }
        let result = {
            let repository = self.repository.owner();
            let repository = repository
                .lock()
                .map_err(|_| "repository_unavailable".to_owned())?;
            let receipt = repository
                .get_operation(&operation_id)?
                .ok_or_else(|| "operation_receipt_missing".to_owned())?;
            receipt_result_value(&receipt)?
        };
        Ok(result)
    }

    pub(crate) fn sidecar_index(&self, request: &Value) -> Result<Value, String> {
        let query = page_query(request, 50, 100)?;
        let include_references =
            bool_field(request, &["includeReferences", "include_references"], false)?;
        let source_filter = string_list_field(
            request,
            &["sourceRefs", "source_refs", "sourceRef", "source_ref"],
            250,
        )?;
        let mut items = match self.collect_host_items() {
            Ok(items) => items,
            Err(error) if error == "reverse_host_unavailable" => {
                let repository = self.repository.owner();
                let repository = repository
                    .lock()
                    .map_err(|_| "repository_unavailable".to_owned())?;
                if repository.list_reference_sources()?.is_empty() {
                    Vec::new()
                } else {
                    return Err(error);
                }
            }
            Err(error) => return Err(error),
        };
        if !source_filter.is_empty() {
            let selected = source_filter.into_iter().collect::<HashSet<_>>();
            items.retain(|item| selected.contains(&item.paper_ref));
        }
        let total = items.len();
        let page_items = items
            .into_iter()
            .skip(query.cursor)
            .take(query.limit)
            .collect::<Vec<_>>();
        let fact_rows = self.project_reference_index_rows(page_items)?;
        let rows = fact_rows
            .iter()
            .map(|fact| {
                let mut row = json!({
                    "paper_ref":fact.item.paper_ref,
                    "library_id":fact.item.library_id,
                    "item_key":fact.item.item_key,
                    "title":fact.item.title,
                    "year":fact.item.year,
                    "metadata_hash":fact.item.metadata_hash,
                    "updated_at":fact.item.updated_at,
                    "artifactCoverage":fact.artifact_coverage,
                    "missing_artifacts":fact.missing_artifacts,
                    "reference_count":fact.reference_count,
                    "unbound_reference_count":fact.unbound_reference_count,
                });
                if include_references {
                    let references = fact
                        .references
                        .iter()
                        .map(|reference| reference.raw.clone())
                        .collect::<Vec<_>>();
                    row["references"] = serde_json::to_value(references)
                        .unwrap_or_else(|_| Value::Array(Vec::new()));
                }
                row
            })
            .collect::<Vec<_>>();
        let next = query.cursor + rows.len();
        let repository = self.repository.owner();
        let repository = repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        let basis = reference_basis_hash(&repository)?;
        let cache_ready = repository
            .get_cache_basis("reference-sidecar:library")?
            .is_some_and(|row| row.status != "missing");
        Ok(json!({
            "rows":rows,
            "cursor":query.cursor.to_string(),
            "next_cursor":if next < total { next.to_string() } else { String::new() },
            "has_more":next < total,
            "returned":rows.len(),
            "total":total,
            "limit":query.limit,
            "diagnostics":{
                "cache_found":cache_ready,
                "storage":"sqlite",
                "stale":false,
                "warnings":if !cache_ready {
                    vec!["reference index rows are missing"]
                } else {
                    Vec::<&str>::new()
                },
                "recommended_commands":if !cache_ready {
                    vec!["refreshReferenceSidecarNow"]
                } else {
                    Vec::<&str>::new()
                },
                "repository_basis_hash":basis,
                "canonical_basis_hash":canonical_basis_hash(&repository)?,
            },
        }))
    }

    pub(crate) fn workbench_index(&self, state: &Value, library_id: i64) -> Result<Value, String> {
        let registry = state
            .get("registry")
            .and_then(Value::as_object)
            .ok_or_else(|| "invalid_request".to_owned())?;
        let scope = registry
            .get("scope")
            .and_then(Value::as_str)
            .unwrap_or("library");
        if !matches!(scope, "library" | "referenced") {
            return Err("invalid_request".into());
        }
        let expanded_source_refs = string_list_field(
            &Value::Object(registry.clone()),
            &["expandedSourceRefs", "expanded_source_refs"],
            100,
        )?
        .into_iter()
        .collect::<HashSet<_>>();
        let items = if scope == "referenced" {
            self.collect_host_items()?
        } else {
            self.collect_host_items_bounded(100)?
        };
        let mut rows = self.project_reference_index_rows(items)?;
        if scope == "referenced" {
            rows.retain(|row| row.reference_count > 0);
            rows.truncate(100);
        }
        let rows = rows
            .iter()
            .map(|row| {
                let include_references =
                    scope == "referenced" || expanded_source_refs.contains(&row.item.paper_ref);
                let references = if include_references {
                    row.references
                        .iter()
                        .map(workbench_reference_row)
                        .collect::<Vec<_>>()
                } else {
                    Vec::new()
                };
                json!({
                    "libraryId":row.item.library_id,
                    "itemKey":row.item.item_key,
                    "paper_ref":row.item.paper_ref,
                    "title":row.item.title,
                    "year":row.item.year,
                    "artifactCoverage":row.artifact_coverage,
                    "missing_artifacts":row.missing_artifacts,
                    "index_scope":scope,
                    "literature_item_id":row.item.paper_ref,
                    "reference_count":row.reference_count,
                    "unbound_reference_count":row.unbound_reference_count,
                    "referenced_by_count":0,
                    "references":references,
                    "needsTagRegulation":false,
                })
            })
            .collect::<Vec<_>>();
        Ok(json!({
            "libraryId":library_id,
            "registry":{
                "rows":rows,
                "cacheStatus":self.reference_cache_status()?,
            },
        }))
    }

    pub(crate) fn rank_external_references(&self, request: &Value) -> Result<Value, String> {
        let query = page_query(request, 25, 100)?;
        let sort_by = string_field_optional(request, &["sortBy", "sort_by"])
            .unwrap_or_else(|| "external_degree".into());
        if !matches!(
            sort_by.as_str(),
            "external_degree" | "shared_source_count" | "year"
        ) {
            return Err("invalid_request".into());
        }
        let repository = self.repository.owner();
        let repository = repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        let bindings = repository.list_reference_bindings()?;
        let bound = bindings
            .iter()
            .filter(|binding| binding.status != "revoked")
            .map(|binding| binding.canonical_reference_id.as_str())
            .collect::<HashSet<_>>();
        let raw = repository.list_raw_references()?;
        let mut ranked = repository
            .list_canonical_references()?
            .into_iter()
            .filter(|canonical| canonical.status == "active")
            .filter(|canonical| !bound.contains(canonical.canonical_reference_id.as_str()))
            .map(|canonical| {
                let source_refs = raw
                    .iter()
                    .filter(|reference| {
                        reference.status == "active"
                            && reference.canonical_reference_id == canonical.canonical_reference_id
                    })
                    .map(|reference| reference.source_ref.clone())
                    .collect::<BTreeSet<_>>()
                    .into_iter()
                    .collect::<Vec<_>>();
                let external_degree = source_refs.len();
                (canonical, source_refs, external_degree)
            })
            .collect::<Vec<_>>();
        ranked.sort_by(|left, right| {
            let metric = match sort_by.as_str() {
                "year" => right.0.year.cmp(&left.0.year),
                "shared_source_count" => right.1.len().cmp(&left.1.len()),
                _ => right.2.cmp(&left.2),
            };
            metric
                .then_with(|| left.0.title.cmp(&right.0.title))
                .then_with(|| {
                    left.0
                        .canonical_reference_id
                        .cmp(&right.0.canonical_reference_id)
                })
        });
        let total = ranked.len();
        let items = ranked
            .into_iter()
            .skip(query.cursor)
            .take(query.limit)
            .map(|(canonical, source_refs, external_degree)| {
                json!({
                    "node_id":canonical.canonical_reference_id,
                    "title":canonical.title,
                    "year":canonical.year,
                    "authors":parse_string_array(&canonical.authors_json),
                    "external_degree":external_degree,
                    "shared_source_count":source_refs.len(),
                    "source_paper_refs":source_refs,
                    "reason":if external_degree > 1 {
                        format!("Referenced by {external_degree} library papers")
                    } else {
                        "Referenced by one library paper".to_owned()
                    },
                })
            })
            .collect::<Vec<_>>();
        let next = query.cursor + items.len();
        let basis = reference_basis_hash(&repository)?;
        Ok(json!({
            "ok":true,
            "graph_hash":basis,
            "items":items,
            "cursor":query.cursor.to_string(),
            "nextCursor":if next < total { next.to_string() } else { String::new() },
            "hasMore":next < total,
            "returned":items.len(),
            "total":total,
            "limit":query.limit,
            "diagnostics":{
                "snapshot_found":total > 0,
                "returned_count":items.len(),
                "total_external_nodes":total,
                "limits":{"limit":query.limit,"maxLimit":100},
                "warnings":[],
                "repository_basis_hash":basis,
                "canonical_basis_hash":canonical_basis_hash(&repository)?,
            },
        }))
    }

    pub(crate) fn attention_queue(&self, request: &Value) -> Result<Value, String> {
        let query = page_query_without_cursor(request, 25, 100)?;
        let repository = self.repository.owner();
        let repository = repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        let mut items = Vec::new();
        if repository.get_reference_application_state()?.is_none() {
            items.push(json!({
                "severity":"error",
                "target":"reference_index",
                "reason":"Reference index is missing.",
                "source_capability":"reference_index.get",
                "suggested_commands":["refreshReferenceSidecarNow"],
            }));
        }
        for proposal in all_proposals(&repository)?
            .into_iter()
            .filter(|proposal| proposal.status == "open")
        {
            items.push(json!({
                "severity":"warning",
                "target":proposal.proposal_id,
                "reason":"Reference match proposal requires review.",
                "source_capability":"reference_matching.proposals",
                "suggested_commands":[],
                "details":{
                    "kind":proposal.kind,
                    "source_canonical_reference_id":proposal.source_canonical_reference_id,
                    "target_canonical_reference_id":proposal.target_canonical_reference_id,
                },
            }));
        }
        items.sort_by(|left, right| {
            left["target"]
                .as_str()
                .unwrap_or_default()
                .cmp(right["target"].as_str().unwrap_or_default())
        });
        let truncated = items.len() > query;
        items.truncate(query);
        Ok(json!({
            "ok":true,
            "truncated":truncated,
            "items":items,
            "diagnostics":{
                "returned_count":items.len(),
                "limits":{"limit":query,"maxLimit":100},
                "warnings":[],
                "repository_basis_hash":reference_basis_hash(&repository)?,
                "canonical_basis_hash":canonical_basis_hash(&repository)?,
            },
        }))
    }

    pub(crate) fn review_input(&self, request: &Value) -> Result<Value, String> {
        let query = page_query(request, 25, 100)?;
        let page = self.matching.read_proposals(query.cursor, query.limit)?;
        let repository = self.repository.owner();
        let repository = repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        Ok(json!({
            "records":page.records,
            "cursor":query.cursor.to_string(),
            "next_cursor":page.next_cursor.map(|cursor|cursor.to_string()).unwrap_or_default(),
            "has_more":page.next_cursor.is_some(),
            "returned":page.records.len(),
            "limit":query.limit,
            "repository_basis_hash":reference_basis_hash(&repository)?,
            "canonical_basis_hash":canonical_basis_hash(&repository)?,
        }))
    }

    pub(crate) fn start_refresh_with_checkpoint(
        &self,
        request: &Value,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> Result<Value, String> {
        self.run_refresh(request, false, Some(checkpoint))
    }

    #[cfg(test)]
    pub(crate) fn refresh_now(&self) -> Result<Value, String> {
        self.run_refresh(&json!({}), false, None)
    }

    pub(crate) fn refresh_now_with_checkpoint(
        &self,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> Result<Value, String> {
        self.run_refresh(&json!({}), false, Some(checkpoint))
    }

    pub(crate) fn retry_refresh_with_checkpoint(
        &self,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> Result<Value, String> {
        self.run_refresh(&json!({}), true, Some(checkpoint))
    }

    #[cfg(test)]
    pub(crate) fn retry_refresh(&self) -> Result<Value, String> {
        self.run_refresh(&json!({}), true, None)
    }

    pub(crate) fn run_advanced_matching_with_checkpoint(
        &self,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> Result<Value, String> {
        self.run_matching(false, Some(checkpoint))
    }

    #[cfg(test)]
    pub(crate) fn run_advanced_matching(&self) -> Result<Value, String> {
        self.run_matching(false, None)
    }

    pub(crate) fn retry_advanced_matching_with_checkpoint(
        &self,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> Result<Value, String> {
        self.run_matching(true, Some(checkpoint))
    }

    #[cfg(test)]
    pub(crate) fn retry_advanced_matching(&self) -> Result<Value, String> {
        self.run_matching(true, None)
    }

    pub(crate) fn apply_proposal_actions(
        &self,
        decisions: &[ReferenceReviewDecision],
    ) -> Result<Value, String> {
        let _mutation = self
            .mutation
            .lock()
            .map_err(|_| "reference_canonical_unavailable".to_owned())?;
        if decisions.is_empty() {
            return Err("invalid_request".into());
        }
        let request = serde_json::to_value(decisions).map_err(|_| "invalid_request")?;
        let operation_id = operation_id("reference-proposal-review", &request)?;
        {
            let repository = self.repository.owner();
            let repository = repository
                .lock()
                .map_err(|_| "repository_unavailable".to_owned())?;
            if let Some(result) = receipt_result(&repository, &operation_id)? {
                return Ok(with_idempotent(result));
            }
        }
        let results = decisions
            .iter()
            .map(|decision| {
                json!({
                    "ok":true,
                    "status":public_review_status(decision.action),
                    "proposal_id":decision.proposal_id,
                })
            })
            .collect::<Vec<_>>();
        let success_result = if decisions.len() == 1 {
            results[0].clone()
        } else {
            json!({
                "ok":true,
                "applied_count":decisions.len(),
                "skipped_count":0,
                "failed_count":0,
                "results":results,
            })
        };
        let basis = {
            let repository = self.repository.owner();
            let repository = repository
                .lock()
                .map_err(|_| "repository_unavailable".to_owned())?;
            reference_basis_hash(&repository)?
        };
        let receipt = completed_receipt(
            &operation_id,
            "reference_proposal_review",
            &basis,
            &success_result,
        )?;
        let review = self.matching.review_with_receipt(decisions, Some(&receipt));
        if review.status == ReferenceMatchingStatus::ReviewApplied {
            Ok(success_result)
        } else if decisions.len() == 1 {
            let status = review
                .results
                .first()
                .map(|result| result.status.as_str())
                .unwrap_or("failed");
            Ok(command_error(
                if status == "not_found" {
                    "missing"
                } else {
                    status
                },
                if status == "not_found" {
                    "reference_match_proposal_missing"
                } else {
                    "reference_match_proposal_action_failed"
                },
                json!({"proposalId":decisions[0].proposal_id}),
            ))
        } else {
            Ok(review_failure_result(&review))
        }
    }

    pub(crate) fn apply_revision_review(
        &self,
        request: CanonicalRevisionReviewRequest,
    ) -> Result<Value, String> {
        let _mutation = self
            .mutation
            .lock()
            .map_err(|_| "reference_canonical_unavailable".to_owned())?;
        if request.review_item_id.trim().is_empty() {
            return Err("invalid_request".into());
        }
        let request_value = serde_json::to_value(&request.review_item_id)
            .map_err(|_| "invalid_request".to_owned())?;
        let operation_id = operation_id(
            "canonical-revision-review",
            &json!({
                "reviewItemId":request_value,
                "action":match request.action {
                    CanonicalRevisionReviewAction::Accept => "accept",
                    CanonicalRevisionReviewAction::Reject => "reject",
                },
            }),
        )?;
        let owner = self.repository.owner();
        let mut repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        repository.transaction(|repository| {
            if let Some(result) = receipt_result(repository, &operation_id)? {
                return Ok(with_idempotent(result));
            }
            let Some(mut review) = repository
                .list_reference_revision_reviews()?
                .into_iter()
                .find(|review| review.review_id == request.review_item_id)
            else {
                return Ok(command_error(
                    "missing",
                    "canonical_revision_review_missing",
                    json!({"reviewItemId":request.review_item_id}),
                ));
            };
            let basis = canonical_basis_hash(repository)?;
            let now = now_string();
            let result = match request.action {
                CanonicalRevisionReviewAction::Reject => {
                    review.status = "rejected".into();
                    review.updated_at = now.clone();
                    repository.upsert_reference_revision_review_record(&review)?;
                    json!({
                        "ok":true,
                        "status":"rejected",
                        "review_item_id":review.review_id,
                    })
                }
                CanonicalRevisionReviewAction::Accept => {
                    let payload: Value =
                        serde_json::from_str(&review.payload_json).unwrap_or_else(|_| json!({}));
                    let source = review.canonical_reference_id.clone();
                    let target = successor_id(&payload, repository, &source)?;
                    if let Some(target) = target {
                        let plan = match plan_merge(repository, &source, &target, true)? {
                            Ok(plan) => plan,
                            Err(_) => {
                                return Ok(command_error(
                                    "blocked",
                                    "canonical_revision_successor_invalid",
                                    json!({"source":source,"target":target}),
                                ));
                            }
                        };
                        repository.upsert_canonical_reference_redirect(
                            &ReferenceRedirectFactRecord {
                                from_canonical_reference_id: plan.source.clone(),
                                to_canonical_reference_id: plan.target.clone(),
                                reason: "canonical_revision_review_accept".into(),
                                diagnostics_json: "[]".into(),
                                created_at: now.clone(),
                                updated_at: now.clone(),
                            },
                        )?;
                        repository.mark_reference_dependent_caches_stale(
                            "canonical_revision_review_accept",
                            &now,
                        )?;
                        review.status = "approved".into();
                        review.updated_at = now.clone();
                        repository.upsert_reference_revision_review_record(&review)?;
                        json!({
                            "ok":true,
                            "status":"approved",
                            "review_item_id":review.review_id,
                            "action":"redirect_to_successor",
                        })
                    } else {
                        let blockers = canonical_archive_blockers(repository, &source)?;
                        if !blockers.is_empty() {
                            return Ok(command_error(
                                "blocked",
                                "canonical_revision_orphan_cleanup_blocked",
                                json!({"canonicalReferenceId":source,"blockers":blockers}),
                            ));
                        }
                        let Some(mut canonical) = repository
                            .list_canonical_references()?
                            .into_iter()
                            .find(|canonical| {
                                canonical.canonical_reference_id == source
                                    && canonical.status == "active"
                            })
                        else {
                            return Ok(command_error(
                                "blocked",
                                "canonical_revision_source_missing",
                                json!({"canonicalReferenceId":source}),
                            ));
                        };
                        canonical.status = "archived".into();
                        canonical.updated_at = now.clone();
                        repository.upsert_canonical_reference_record(&canonical)?;
                        review.status = "approved".into();
                        review.updated_at = now.clone();
                        repository.upsert_reference_revision_review_record(&review)?;
                        json!({
                            "ok":true,
                            "status":"approved",
                            "review_item_id":review.review_id,
                            "action":"mark_stale",
                        })
                    }
                }
            };
            repository.upsert_operation(&completed_receipt(
                &operation_id,
                "canonical_revision_review",
                &basis,
                &result,
            )?)?;
            Ok(result)
        })
    }

    pub(crate) fn merge_canonical(
        &self,
        request: EffectiveCanonicalMergeRequest,
    ) -> Result<Value, String> {
        let _mutation = self
            .mutation
            .lock()
            .map_err(|_| "reference_canonical_unavailable".to_owned())?;
        let request_value = serde_json::to_value(&request).map_err(|_| "invalid_request")?;
        let operation_id = operation_id("canonical-merge", &request_value)?;
        let owner = self.repository.owner();
        let mut repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        repository.transaction(|repository| {
            if let Some(result) = receipt_result(repository, &operation_id)? {
                return Ok(with_idempotent(result));
            }
            let basis = canonical_basis_hash(repository)?;
            let plan = match plan_merge(
                repository,
                request.source_effective_canonical_id.trim(),
                request.target_effective_canonical_id.trim(),
                request.confirm_retarget_group,
            )? {
                Ok(plan) => plan,
                Err(failure) => {
                    return Ok(merge_failure_result(
                        failure,
                        "canonical_merge",
                        &request.source_effective_canonical_id,
                        &request.target_effective_canonical_id,
                    ));
                }
            };
            let now = now_string();
            repository.upsert_canonical_reference_redirect(&ReferenceRedirectFactRecord {
                from_canonical_reference_id: plan.source.clone(),
                to_canonical_reference_id: plan.target.clone(),
                reason: "canonical_revision_manual_merge".into(),
                diagnostics_json: "[]".into(),
                created_at: now.clone(),
                updated_at: now.clone(),
            })?;
            repository
                .mark_reference_dependent_caches_stale("canonical_revision_manual_merge", &now)?;
            let result = json!({
                "ok":true,
                "status":"merged",
                "source_effective_canonical_id":plan.source,
                "target_effective_canonical_id":plan.target,
            });
            repository.upsert_operation(&completed_receipt(
                &operation_id,
                "canonical_reference_merge",
                &basis,
                &result,
            )?)?;
            Ok(result)
        })
    }

    pub(crate) fn merge_canonical_batch(
        &self,
        request: CanonicalMergeBatchRequest,
    ) -> Result<Value, String> {
        let _mutation = self
            .mutation
            .lock()
            .map_err(|_| "reference_canonical_unavailable".to_owned())?;
        if request.requests.is_empty() || request.requests.len() > 100 {
            return Err("invalid_request".into());
        }
        let request_value =
            serde_json::to_value(&request.requests).map_err(|_| "invalid_request".to_owned())?;
        let operation_id = operation_id("canonical-merge-batch", &request_value)?;
        let owner = self.repository.owner();
        let mut repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        repository.transaction(|repository| {
            if let Some(result) = receipt_result(repository, &operation_id)? {
                return Ok(with_idempotent(result));
            }
            let basis = canonical_basis_hash(repository)?;
            let mut plans = Vec::with_capacity(request.requests.len());
            let mut seen_sources = HashSet::new();
            for pair in &request.requests {
                let plan = match plan_merge(
                    repository,
                    pair.source_effective_canonical_id.trim(),
                    pair.target_effective_canonical_id.trim(),
                    true,
                )? {
                    Ok(plan) => plan,
                    Err(failure) => {
                        return Ok(batch_merge_error(
                            request.requests.len(),
                            merge_failure_code(failure, "canonical_revision_merge"),
                        ));
                    }
                };
                if !seen_sources.insert(plan.source.clone()) {
                    return Ok(batch_merge_error(
                        request.requests.len(),
                        "canonical_revision_merge_duplicate_source",
                    ));
                }
                plans.push(plan);
            }
            if creates_redirect_cycle(repository, &plans)? {
                return Ok(batch_merge_error(
                    request.requests.len(),
                    "canonical_revision_merge_cycle",
                ));
            }
            let now = now_string();
            let mut results = Vec::with_capacity(plans.len());
            for plan in plans {
                let proposal_id = proposal_id_for_merge(&plan.source, &plan.target)?;
                repository.upsert_reference_match_proposal(&ReferenceMatchProposalRecord {
                    proposal_id: proposal_id.clone(),
                    kind: "canonical_merge".into(),
                    status: "accepted".into(),
                    source_canonical_reference_id: plan.source.clone(),
                    source_raw_reference_ids_json: "[]".into(),
                    target_canonical_reference_id: plan.target.clone(),
                    confidence: "manual".into(),
                    score: 1.0,
                    reasons_json: "[\"canonical_revision_manual_merge\"]".into(),
                    evidence_json: "{\"canonical_revision\":true}".into(),
                    diagnostics_json: "[]".into(),
                    basis_hash: basis.clone(),
                    source_hash: canonical_json_hash(&json!({
                        "source":plan.source,
                        "target":plan.target,
                    }))?,
                    created_at: now.clone(),
                    updated_at: now.clone(),
                    ..ReferenceMatchProposalRecord::default()
                })?;
                repository.upsert_canonical_reference_redirect(&ReferenceRedirectFactRecord {
                    from_canonical_reference_id: plan.source.clone(),
                    to_canonical_reference_id: plan.target.clone(),
                    reason: "canonical_revision_manual_merge".into(),
                    diagnostics_json: "[]".into(),
                    created_at: now.clone(),
                    updated_at: now.clone(),
                })?;
                results.push(json!({
                    "ok":true,
                    "status":"accepted",
                    "proposal_id":proposal_id,
                    "source_effective_canonical_id":plan.source,
                    "target_effective_canonical_id":plan.target,
                }));
            }
            repository
                .mark_reference_dependent_caches_stale("canonical_revision_manual_merge", &now)?;
            let result = json!({
                "ok":true,
                "applied_count":results.len(),
                "failed_count":0,
                "results":results,
            });
            repository.upsert_operation(&completed_receipt(
                &operation_id,
                "canonical_reference_merge_batch",
                &basis,
                &result,
            )?)?;
            Ok(result)
        })
    }

    pub(crate) fn update_canonical_metadata(
        &self,
        request: CanonicalMetadataUpdateRequest,
    ) -> Result<Value, String> {
        let _mutation = self
            .mutation
            .lock()
            .map_err(|_| "reference_canonical_unavailable".to_owned())?;
        if request.canonical_reference_id.trim().is_empty() || request.patch.is_empty() {
            return Err("invalid_request".into());
        }
        let request_value = json!({
            "canonicalReferenceId":request.canonical_reference_id,
            "patch":request.patch,
        });
        let operation_id = operation_id("canonical-metadata", &request_value)?;
        let owner = self.repository.owner();
        let mut repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        repository.transaction(|repository| {
            if let Some(result) = receipt_result(repository, &operation_id)? {
                return Ok(with_idempotent(result));
            }
            let basis = canonical_basis_hash(repository)?;
            let canonical_id = request.canonical_reference_id.trim();
            let Some(mut canonical) =
                repository
                    .list_canonical_references()?
                    .into_iter()
                    .find(|canonical| {
                        canonical.canonical_reference_id == canonical_id
                            && canonical.status == "active"
                    })
            else {
                return Ok(command_error(
                    "missing_canonical",
                    "canonical_metadata_missing_canonical",
                    json!({"canonicalReferenceId":canonical_id}),
                ));
            };
            if repository.list_reference_bindings()?.iter().any(|binding| {
                binding.canonical_reference_id == canonical_id && binding.status != "revoked"
            }) {
                return Ok(command_error(
                    "bound_to_zotero",
                    "canonical_metadata_bound_to_zotero",
                    json!({"canonicalReferenceId":canonical_id}),
                ));
            }
            if let Some(title) = nonempty_patch_string(request.patch.title.as_deref())? {
                canonical.title = title.to_owned();
                if request.patch.normalized_title.is_none() {
                    canonical.normalized_title = normalize_title(title);
                }
            }
            if let Some(normalized) =
                nonempty_patch_string(request.patch.normalized_title.as_deref())?
            {
                canonical.normalized_title = normalized.to_owned();
            }
            if let Some(year) = nonempty_patch_string(request.patch.year.as_deref())? {
                canonical.year = year.to_owned();
            }
            if let Some(authors) = &request.patch.authors {
                canonical.authors_json =
                    serde_json::to_string(authors).map_err(|_| "invalid_request")?;
            }
            if let Some(identifiers) = &request.patch.identifiers {
                canonical.identifiers_json =
                    serde_json::to_string(identifiers).map_err(|_| "invalid_request")?;
            }
            canonical.metadata_hash = canonical_json_hash(&json!({
                "title":canonical.title,
                "normalizedTitle":canonical.normalized_title,
                "year":canonical.year,
                "authors":parse_json(&canonical.authors_json, json!([])),
                "identifiers":parse_json(&canonical.identifiers_json, json!({})),
            }))?;
            canonical.updated_at = now_string();
            repository.upsert_canonical_reference_record(&canonical)?;
            repository.mark_reference_dependent_caches_stale(
                "canonical_metadata_update",
                &canonical.updated_at,
            )?;
            let result = json!({
                "ok":true,
                "status":"updated",
                "canonical_reference_id":canonical_id,
            });
            repository.upsert_operation(&completed_receipt(
                &operation_id,
                "canonical_reference_metadata",
                &basis,
                &result,
            )?)?;
            Ok(result)
        })
    }

    pub(crate) fn archive_canonical(
        &self,
        request: CanonicalArchiveRequest,
    ) -> Result<Value, String> {
        let _mutation = self
            .mutation
            .lock()
            .map_err(|_| "reference_canonical_unavailable".to_owned())?;
        let canonical_id = request.canonical_reference_id.trim();
        if canonical_id.is_empty() {
            return Err("invalid_request".into());
        }
        let operation_id = operation_id(
            "canonical-archive",
            &json!({"canonicalReferenceId":canonical_id}),
        )?;
        let owner = self.repository.owner();
        let mut repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        repository.transaction(|repository| {
            if let Some(result) = receipt_result(repository, &operation_id)? {
                return Ok(with_idempotent(result));
            }
            let basis = canonical_basis_hash(repository)?;
            let blockers = canonical_archive_blockers(repository, canonical_id)?;
            if !blockers.is_empty() {
                return Ok(command_error(
                    "blocked",
                    "canonical_archive_blocked",
                    json!({"canonicalReferenceId":canonical_id,"blockers":blockers}),
                ));
            }
            let Some(mut canonical) =
                repository
                    .list_canonical_references()?
                    .into_iter()
                    .find(|canonical| {
                        canonical.canonical_reference_id == canonical_id
                            && canonical.status == "active"
                    })
            else {
                return Ok(command_error(
                    "missing_canonical",
                    "canonical_archive_missing_canonical",
                    json!({"canonicalReferenceId":canonical_id}),
                ));
            };
            canonical.status = "archived".into();
            canonical.updated_at = now_string();
            repository.upsert_canonical_reference_record(&canonical)?;
            let result = json!({
                "ok":true,
                "status":"archived",
                "canonical_reference_id":canonical_id,
            });
            repository.upsert_operation(&completed_receipt(
                &operation_id,
                "canonical_reference_archive",
                &basis,
                &result,
            )?)?;
            Ok(result)
        })
    }

    fn run_refresh(
        &self,
        request: &Value,
        retry: bool,
        checkpoint: Option<&PromotionCheckpoint<'_>>,
    ) -> Result<Value, String> {
        let _mutation = self
            .mutation
            .lock()
            .map_err(|_| "reference_canonical_unavailable".to_owned())?;
        let mut job = self.begin_job(
            REFRESH_JOB_ID,
            "reference_sidecar_refresh",
            if retry { "retrying" } else { "reading_host" },
        )?;
        let outcome = (|| {
            let mut items = self.collect_host_items()?;
            emit_debug(|| {
                NativeDiagnosticEvent::new("operation", "items-scanned", "succeeded")
                    .capability("reference_sidecar_refresh")
                    .operation_id(REFRESH_JOB_ID)
                    .returned(items.len())
            });
            let requested = refresh_scope_filter(request)?;
            if !requested.is_empty() {
                items.retain(|item| requested.contains(&item.paper_ref));
            }
            let host_artifacts = self.collect_host_artifacts()?;
            emit_debug(|| {
                NativeDiagnosticEvent::new("operation", "artifacts-scanned", "succeeded")
                    .capability("reference_sidecar_refresh")
                    .operation_id(REFRESH_JOB_ID)
                    .returned(host_artifacts.len())
            });
            let artifacts = complete_artifact_manifest(&items, &host_artifacts)?;
            let mut batches = VecDeque::from(partition_refresh_batches(&items, &artifacts));
            let mut processed = BTreeSet::new();
            let mut failed = BTreeSet::new();
            let mut warnings = Vec::new();
            let mut promoted = false;
            let mut failure_code = None;
            let mut failure_capacity = None;
            let mut batch_ordinal = 0;

            while let Some(batch) = batches.pop_front() {
                if bounded_timeout(Duration::from_secs(60)).is_err() {
                    failed.extend(batch.iter().map(|item| item.paper_ref.clone()));
                    for pending in batches {
                        failed.extend(pending.into_iter().map(|item| item.paper_ref));
                    }
                    failure_code = Some("operation_timeout".to_owned());
                    break;
                }
                batch_ordinal += 1;
                let batch_artifacts = artifacts
                    .iter()
                    .filter(|artifact| {
                        batch
                            .binary_search_by(|item| item.paper_ref.cmp(&artifact.paper_ref))
                            .is_ok()
                    })
                    .cloned()
                    .collect::<Vec<_>>();
                match self.run_refresh_batch(
                    &batch,
                    batch_artifacts,
                    batch_ordinal,
                    &mut job,
                    checkpoint,
                )? {
                    RefreshBatchAttempt::Converged {
                        promoted: batch_promoted,
                        reference_hash,
                        input_hash,
                        affected_source_refs,
                        warnings: batch_warnings,
                    } => {
                        promoted |= batch_promoted;
                        processed.extend(batch.iter().map(|item| item.paper_ref.clone()));
                        warnings.extend(batch_warnings);
                        job.source_hash = input_hash.unwrap_or_default();
                        job.basis_value = reference_hash.unwrap_or_default();
                        job.processed_count = processed.len() as i64;
                        job.total_count = items.len() as i64;
                        job.phase = "batching".into();
                        job.progress_mode = "determinate".into();
                        job.updated_at = now_string();
                        job.diagnostics_json = serde_json::to_string(&vec![json!({
                            "batchOrdinal":batch_ordinal,
                            "affectedSourceCount":affected_source_refs.len(),
                        })])
                        .map_err(|_| "serialization_failed")?;
                        self.write_job(&job)?;
                    }
                    RefreshBatchAttempt::Split => {
                        let midpoint = batch.len() / 2;
                        let right = batch[midpoint..].to_vec();
                        let left = batch[..midpoint].to_vec();
                        batches.push_front(right);
                        batches.push_front(left);
                    }
                    RefreshBatchAttempt::Failed { code, capacity } => {
                        failed.extend(batch.iter().map(|item| item.paper_ref.clone()));
                        for pending in batches {
                            failed.extend(pending.into_iter().map(|item| item.paper_ref));
                        }
                        failure_code = Some(code);
                        failure_capacity = capacity;
                        break;
                    }
                }
            }

            if failure_code.is_none() && requested.is_empty() {
                match self.run_reference_refresh_full_sweep(
                    &items,
                    artifacts,
                    batch_ordinal + 1,
                    checkpoint,
                )? {
                    RefreshBatchAttempt::Converged {
                        promoted: sweep_promoted,
                        warnings: sweep_warnings,
                        ..
                    } => {
                        promoted |= sweep_promoted;
                        warnings.extend(sweep_warnings);
                    }
                    RefreshBatchAttempt::Failed { code, capacity } => {
                        failure_code = Some(code);
                        failure_capacity = capacity;
                    }
                    RefreshBatchAttempt::Split => {
                        failure_code = Some("reference_refresh_full_sweep_invalid".into());
                    }
                }
            }

            let inspection = self.refresh.inspect()?;
            let ok = failure_code.is_none();
            Ok(json!({
                "ok":ok,
                "status":if ok {
                    if promoted { "promoted" } else { "unchanged" }
                } else {
                    failure_code.as_deref().unwrap_or("reference_refresh_failed")
                },
                "operation_id":REFRESH_JOB_ID,
                "affected_source_refs":processed.iter().cloned().collect::<Vec<_>>(),
                "processed_paper_refs":processed.into_iter().collect::<Vec<_>>(),
                "failed_paper_refs":failed.into_iter().collect::<Vec<_>>(),
                "warnings":warnings,
                "reference_basis_hash":inspection.reference_hash,
                "input_hash":inspection.input_hash,
                "retryable":!ok,
                "retry":retry,
                "actual_bytes":failure_capacity.map(|capacity|capacity.bytes),
                "limit_bytes":failure_capacity.map(|_|REFERENCE_REFRESH_MATERIALIZED_MAX_BYTES),
                "actual_json_nodes":failure_capacity.map(|capacity|capacity.json_nodes),
                "limit_json_nodes":failure_capacity.map(|_|REFERENCE_REFRESH_MATERIALIZED_MAX_JSON_NODES),
            }))
        })();
        self.finish_job(job, outcome)
    }

    fn run_refresh_batch(
        &self,
        items: &[ReferenceHostItem],
        artifacts: Vec<ReferenceArtifactDescriptor>,
        batch_ordinal: usize,
        job: &mut OperationRecord,
        checkpoint: Option<&PromotionCheckpoint<'_>>,
    ) -> Result<RefreshBatchAttempt, String> {
        let source_refs = items
            .iter()
            .map(|item| item.paper_ref.clone())
            .collect::<Vec<_>>();
        emit_debug(|| {
            NativeDiagnosticEvent::new("operation", "refresh-batch-started", "started")
                .capability("reference_sidecar_refresh")
                .operation_id(REFRESH_JOB_ID)
                .batch_ordinal(batch_ordinal)
                .source_count(items.len())
        });
        let prepared = self
            .refresh
            .prepare_refresh(ReferenceRefreshPrepareRequest {
                expected_reference_hash: self.refresh.inspect()?.reference_hash,
                force: false,
                scope: ReferenceRefreshScope::Sources {
                    source_refs: source_refs.clone(),
                },
                items: items.iter().map(refresh_item).collect(),
                artifacts,
            });
        if prepared.status == ReferenceRefreshStatus::Unchanged {
            return Ok(RefreshBatchAttempt::Converged {
                promoted: false,
                reference_hash: prepared.reference_hash,
                input_hash: prepared.input_hash,
                affected_source_refs: Vec::new(),
                warnings: Vec::new(),
            });
        }
        if prepared.status != ReferenceRefreshStatus::Prepared {
            return Ok(RefreshBatchAttempt::Failed {
                code: refresh_status_name(&prepared.status),
                capacity: None,
            });
        }
        job.phase = "prepared".into();
        job.scope_ref = prepared.preparation_id.clone().unwrap_or_default();
        job.source_hash = prepared.input_hash.clone().unwrap_or_default();
        job.updated_at = now_string();
        let preparation_id = prepared
            .preparation_id
            .clone()
            .ok_or_else(|| "reference_refresh_preparation_missing".to_owned())?;
        if let Err(error) = self.write_job(job) {
            self.refresh.discard_preparation(&preparation_id);
            return Err(error);
        }
        let mut payloads = Vec::with_capacity(prepared.reads.len());
        for (index, read) in prepared.reads.iter().enumerate() {
            if bounded_timeout(Duration::from_secs(10)).is_err() {
                self.refresh.discard_preparation(&preparation_id);
                return Ok(RefreshBatchAttempt::Failed {
                    code: "operation_timeout".into(),
                    capacity: None,
                });
            }
            emit_debug(|| {
                NativeDiagnosticEvent::new("operation", "artifact-read-started", "started")
                    .capability("library.artifacts.read")
                    .operation_id(REFRESH_JOB_ID)
                    .batch_ordinal(batch_ordinal)
                    .page(index)
                    .total(prepared.reads.len())
            });
            match self
                .host
                .read_artifact(&read.locator, &read.expected_hash)
                .and_then(|payload| refresh_payload(read, payload))
            {
                Ok(payload) => payloads.push(payload),
                Err(error) => {
                    self.refresh.discard_preparation(&preparation_id);
                    emit_debug(|| {
                        NativeDiagnosticEvent::new("operation", "artifact-read-failed", "failed")
                            .capability("library.artifacts.read")
                            .operation_id(REFRESH_JOB_ID)
                            .batch_ordinal(batch_ordinal)
                            .page(index)
                            .total(prepared.reads.len())
                            .code(&error)
                    });
                    return Ok(RefreshBatchAttempt::Failed {
                        code: error,
                        capacity: None,
                    });
                }
            }
        }
        let apply_request = ReferenceRefreshApplyRequest {
            preparation_id: preparation_id.clone(),
            payloads,
        };
        let capacity = match measure_reference_refresh_apply_request(&apply_request) {
            Ok(capacity) => capacity,
            Err(error) => {
                self.refresh.discard_preparation(&preparation_id);
                return Ok(RefreshBatchAttempt::Failed {
                    code: error.into(),
                    capacity: None,
                });
            }
        };
        if let Err(error) = validate_reference_refresh_apply_request(&apply_request) {
            self.refresh.discard_preparation(&preparation_id);
            emit_debug(|| {
                NativeDiagnosticEvent::new("operation", "refresh-apply-rejected", "failed")
                    .capability("reference_sidecar_refresh")
                    .operation_id(REFRESH_JOB_ID)
                    .batch_ordinal(batch_ordinal)
                    .source_count(items.len())
                    .payload_count(apply_request.payloads.len())
                    .actual_bytes(capacity.bytes)
                    .limit_bytes(REFERENCE_REFRESH_MATERIALIZED_MAX_BYTES)
                    .actual_json_nodes(capacity.json_nodes)
                    .limit_json_nodes(REFERENCE_REFRESH_MATERIALIZED_MAX_JSON_NODES)
                    .code(error)
            });
            return if items.len() > 1 && error == "reference_refresh_payload_too_large" {
                Ok(RefreshBatchAttempt::Split)
            } else {
                Ok(RefreshBatchAttempt::Failed {
                    code: error.into(),
                    capacity: Some(capacity),
                })
            };
        }
        emit_debug(|| {
            NativeDiagnosticEvent::new("operation", "refresh-apply-started", "started")
                .capability("reference_sidecar_refresh")
                .operation_id(REFRESH_JOB_ID)
                .batch_ordinal(batch_ordinal)
                .source_count(items.len())
                .payload_count(apply_request.payloads.len())
                .actual_bytes(capacity.bytes)
                .limit_bytes(REFERENCE_REFRESH_MATERIALIZED_MAX_BYTES)
                .actual_json_nodes(capacity.json_nodes)
                .limit_json_nodes(REFERENCE_REFRESH_MATERIALIZED_MAX_JSON_NODES)
        });
        let applied = match checkpoint {
            Some(checkpoint) => self
                .refresh
                .apply_refresh_with_checkpoint(apply_request, checkpoint),
            None => self.refresh.apply_refresh(apply_request),
        };
        if !matches!(
            applied.status,
            ReferenceRefreshStatus::Promoted | ReferenceRefreshStatus::Unchanged
        ) {
            return Ok(RefreshBatchAttempt::Failed {
                code: refresh_status_name(&applied.status),
                capacity: None,
            });
        }
        emit_debug(|| {
            NativeDiagnosticEvent::new("operation", "refresh-batch-completed", "succeeded")
                .capability("reference_sidecar_refresh")
                .operation_id(REFRESH_JOB_ID)
                .batch_ordinal(batch_ordinal)
                .source_count(items.len())
                .payload_count(prepared.reads.len())
                .actual_bytes(capacity.bytes)
                .limit_bytes(REFERENCE_REFRESH_MATERIALIZED_MAX_BYTES)
                .actual_json_nodes(capacity.json_nodes)
                .limit_json_nodes(REFERENCE_REFRESH_MATERIALIZED_MAX_JSON_NODES)
        });
        Ok(RefreshBatchAttempt::Converged {
            promoted: applied.status == ReferenceRefreshStatus::Promoted,
            reference_hash: applied.reference_hash,
            input_hash: applied.input_hash,
            affected_source_refs: applied.affected_source_refs,
            warnings: applied.warnings,
        })
    }

    fn run_reference_refresh_full_sweep(
        &self,
        items: &[ReferenceHostItem],
        artifacts: Vec<ReferenceArtifactDescriptor>,
        batch_ordinal: usize,
        checkpoint: Option<&PromotionCheckpoint<'_>>,
    ) -> Result<RefreshBatchAttempt, String> {
        let prepared = self
            .refresh
            .prepare_refresh(ReferenceRefreshPrepareRequest {
                expected_reference_hash: self.refresh.inspect()?.reference_hash,
                force: false,
                scope: ReferenceRefreshScope::Full,
                items: items.iter().map(refresh_item).collect(),
                artifacts,
            });
        if prepared.status == ReferenceRefreshStatus::Unchanged {
            return Ok(RefreshBatchAttempt::Converged {
                promoted: false,
                reference_hash: prepared.reference_hash,
                input_hash: prepared.input_hash,
                affected_source_refs: Vec::new(),
                warnings: Vec::new(),
            });
        }
        if prepared.status != ReferenceRefreshStatus::Prepared {
            return Ok(RefreshBatchAttempt::Failed {
                code: refresh_status_name(&prepared.status),
                capacity: None,
            });
        }
        let preparation_id = prepared
            .preparation_id
            .clone()
            .ok_or_else(|| "reference_refresh_preparation_missing".to_owned())?;
        if !prepared.reads.is_empty() {
            self.refresh.discard_preparation(&preparation_id);
            return Ok(RefreshBatchAttempt::Failed {
                code: "reference_refresh_full_sweep_not_converged".into(),
                capacity: None,
            });
        }
        let apply_request = ReferenceRefreshApplyRequest {
            preparation_id,
            payloads: Vec::new(),
        };
        emit_debug(|| {
            NativeDiagnosticEvent::new("operation", "refresh-full-sweep", "started")
                .capability("reference_sidecar_refresh")
                .operation_id(REFRESH_JOB_ID)
                .batch_ordinal(batch_ordinal)
                .source_count(items.len())
                .payload_count(0)
        });
        let applied = match checkpoint {
            Some(checkpoint) => self
                .refresh
                .apply_refresh_with_checkpoint(apply_request, checkpoint),
            None => self.refresh.apply_refresh(apply_request),
        };
        if !matches!(
            applied.status,
            ReferenceRefreshStatus::Promoted | ReferenceRefreshStatus::Unchanged
        ) {
            return Ok(RefreshBatchAttempt::Failed {
                code: refresh_status_name(&applied.status),
                capacity: None,
            });
        }
        Ok(RefreshBatchAttempt::Converged {
            promoted: applied.status == ReferenceRefreshStatus::Promoted,
            reference_hash: applied.reference_hash,
            input_hash: applied.input_hash,
            affected_source_refs: applied.affected_source_refs,
            warnings: applied.warnings,
        })
    }

    fn run_matching(
        &self,
        retry: bool,
        checkpoint: Option<&PromotionCheckpoint<'_>>,
    ) -> Result<Value, String> {
        let _mutation = self
            .mutation
            .lock()
            .map_err(|_| "reference_canonical_unavailable".to_owned())?;
        let resume_preparation = retry
            .then(|| self.read_job(MATCHING_JOB_ID))
            .transpose()?
            .flatten()
            .filter(|receipt| receipt.phase == "prepared" && !receipt.scope_ref.is_empty());
        let mut job = self.begin_job(
            MATCHING_JOB_ID,
            "advanced_reference_matching",
            if retry { "retrying" } else { "reading_host" },
        )?;
        let outcome = (|| {
            let items = self.collect_host_items()?;
            let mut candidates = items
                .iter()
                .map(|item| ReferenceHostCandidate {
                    library_id: item.library_id,
                    item_key: item.item_key.clone(),
                    title: item.title.clone(),
                    year: item.year.clone(),
                    authors: item.creators.clone(),
                    doi: item.doi.clone(),
                    arxiv: item.arxiv.clone(),
                    isbn: item.isbn.clone(),
                    url: item.url.clone(),
                    citekey: item.citekey.clone(),
                })
                .collect::<Vec<_>>();
            candidates.sort_by(|left, right| {
                left.library_id
                    .cmp(&right.library_id)
                    .then_with(|| left.item_key.cmp(&right.item_key))
            });
            let host_basis_hash = canonical_json_hash(&json!(candidates))?;
            let inspect = self.matching.inspect()?;
            let Some(reference_hash) = inspect.reference_hash else {
                return Ok(json!({
                    "ok":false,
                    "status":"basis_mismatch",
                    "operation_id":MATCHING_JOB_ID,
                    "retryable":true,
                }));
            };
            let resume_preparation = resume_preparation
                .clone()
                .filter(|receipt| receipt.source_hash == host_basis_hash);
            let preparation_id = if let Some(receipt) = resume_preparation {
                receipt.scope_ref
            } else {
                let prepared = self.matching.prepare(ReferenceMatchingPrepareRequest {
                    expected_reference_hash: Some(reference_hash),
                    host_basis_hash: host_basis_hash.clone(),
                    host_candidates: candidates,
                });
                if prepared.status != ReferenceMatchingStatus::Prepared {
                    return Ok(json!({
                        "ok":false,
                        "status":prepared.status,
                        "operation_id":MATCHING_JOB_ID,
                        "retryable":true,
                    }));
                }
                let preparation_id = prepared
                    .preparation_id
                    .ok_or_else(|| "reference_matching_preparation_missing".to_owned())?;
                job.phase = "prepared".into();
                job.scope_ref = preparation_id.clone();
                job.source_hash = host_basis_hash.clone();
                job.basis_value = prepared.repository_basis_hash.unwrap_or_default();
                job.updated_at = now_string();
                self.write_job(&job)?;
                preparation_id
            };
            let applied = match checkpoint {
                Some(checkpoint) => self.matching.apply_with_checkpoint(
                    &preparation_id,
                    &host_basis_hash,
                    checkpoint,
                ),
                None => self.matching.apply(&preparation_id, &host_basis_hash),
            };
            let ok = applied.status == ReferenceMatchingStatus::Promoted;
            Ok(json!({
                "ok":ok,
                "status":applied.status,
                "operation_id":MATCHING_JOB_ID,
                "matching_hash":applied.matching_hash,
                "proposal_created_count":applied.proposal_count,
                "fact_count":applied.fact_count,
                "warnings":applied.warnings,
                "retryable":!ok,
            }))
        })();
        self.finish_job(job, outcome)
    }

    fn promotion_checkpoint(&self) -> Result<(), String> {
        let Some(operation_id) = current_operation_id() else {
            return Ok(());
        };
        checkpoint_before_promotion_in_repository(
            self.repository.as_ref(),
            &operation_id,
            &now_string(),
        )
    }

    fn project_reference_index_rows(
        &self,
        items: Vec<ReferenceHostItem>,
    ) -> Result<Vec<ReferenceIndexFactRow>, String> {
        if items.is_empty() {
            return Ok(Vec::new());
        }
        let source_refs = items
            .iter()
            .map(|item| item.paper_ref.clone())
            .collect::<Vec<_>>();
        let repository = self.repository.owner();
        let repository = repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        let artifacts = repository.list_reference_artifacts(&source_refs)?;
        let raw_references = repository
            .list_raw_references_for_sources(&source_refs)?
            .into_iter()
            .filter(|reference| reference.status == "active")
            .collect::<Vec<_>>();
        let redirects = repository.list_reference_redirects()?;
        let mut effective_canonical_ids = BTreeSet::new();
        for reference in &raw_references {
            if !reference.canonical_reference_id.is_empty() {
                effective_canonical_ids.insert(resolve_effective_canonical_id(
                    &reference.canonical_reference_id,
                    &redirects,
                )?);
            }
        }
        let bindings = repository.list_reference_bindings_for_canonicals(
            &effective_canonical_ids.into_iter().collect::<Vec<_>>(),
        )?;
        drop(repository);

        let artifact_by_key = artifacts
            .into_iter()
            .map(|artifact| {
                (
                    (artifact.paper_ref.clone(), artifact.artifact_type.clone()),
                    artifact,
                )
            })
            .collect::<HashMap<(String, String), ReferenceArtifactRecord>>();
        let binding_by_canonical = bindings
            .into_iter()
            .filter(|binding| binding.status != "revoked")
            .map(|binding| (binding.canonical_reference_id.clone(), binding))
            .collect::<BTreeMap<_, _>>();
        let mut references_by_source = BTreeMap::<String, Vec<_>>::new();
        for raw in raw_references {
            let binding = if raw.canonical_reference_id.is_empty() {
                None
            } else {
                let effective =
                    resolve_effective_canonical_id(&raw.canonical_reference_id, &redirects)?;
                binding_by_canonical.get(&effective).cloned()
            };
            references_by_source
                .entry(raw.source_ref.clone())
                .or_default()
                .push(ReferenceIndexFactReference { raw, binding });
        }

        Ok(items
            .into_iter()
            .map(|item| {
                let missing_artifacts = ["digest", "references", "citation_analysis"]
                    .into_iter()
                    .filter(|artifact_type| {
                        artifact_by_key
                            .get(&(item.paper_ref.clone(), (*artifact_type).into()))
                            .is_none_or(|artifact| artifact.status != "available")
                    })
                    .map(str::to_owned)
                    .collect::<Vec<_>>();
                let artifact_coverage = if missing_artifacts.is_empty() {
                    "complete"
                } else if missing_artifacts.len() == 3 {
                    "missing"
                } else {
                    "partial"
                }
                .to_owned();
                let references = references_by_source
                    .remove(&item.paper_ref)
                    .unwrap_or_default();
                let unbound_reference_count = references
                    .iter()
                    .filter(|reference| reference.binding.is_none())
                    .count();
                ReferenceIndexFactRow {
                    item,
                    artifact_coverage,
                    missing_artifacts,
                    reference_count: references.len(),
                    unbound_reference_count,
                    references,
                }
            })
            .collect())
    }

    fn reference_cache_status(&self) -> Result<Value, String> {
        let repository = self.repository.owner();
        let repository = repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        let basis = repository.get_cache_basis("reference-sidecar:library")?;
        let status = basis
            .as_ref()
            .map(|row| row.status.as_str())
            .filter(|status| {
                matches!(
                    *status,
                    "missing" | "ready" | "stale" | "refreshing" | "failed"
                )
            })
            .unwrap_or("missing");
        let diagnostics = basis
            .as_ref()
            .map(|row| parse_json(&row.diagnostics_json, json!([])))
            .unwrap_or_else(|| json!([]));
        let mut allowed_actions = if status == "refreshing" {
            Vec::new()
        } else {
            vec!["refreshReferenceSidecarNow"]
        };
        if matches!(status, "stale" | "failed") {
            allowed_actions.push("retryReferenceSidecarRefresh");
        }
        Ok(json!({
            "cache_key":"reference-sidecar:library",
            "status":status,
            "source_hash":basis.as_ref().map(|row|row.source_hash.as_str()).unwrap_or_default(),
            "basis_hash":basis.as_ref().map(|row|row.basis_value.as_str()).unwrap_or_default(),
            "refreshed_at":basis.as_ref().map(|row|row.refreshed_at.as_str()).unwrap_or_default(),
            "updated_at":basis.as_ref().map(|row|row.updated_at.as_str()).unwrap_or_default(),
            "diagnostics":diagnostics,
            "allowed_actions":allowed_actions,
        }))
    }

    fn collect_host_items_bounded(
        &self,
        max_rows: usize,
    ) -> Result<Vec<ReferenceHostItem>, String> {
        collect_host_items_bounded(self.host.as_ref(), max_rows)
    }

    fn collect_host_items(&self) -> Result<Vec<ReferenceHostItem>, String> {
        collect_host_items(self.host.as_ref())
    }

    fn collect_host_artifacts(&self) -> Result<Vec<ReferenceHostArtifact>, String> {
        let mut cursor = String::new();
        let mut revision: Option<String> = None;
        let mut seen = HashSet::new();
        let mut artifacts = Vec::new();
        for _ in 0..MAX_HOST_PAGES {
            let page = self.host.scan_artifacts_page(&cursor, HOST_PAGE_LIMIT)?;
            validate_artifact_page(
                &cursor,
                &page.cursor,
                page.returned,
                page.artifacts.len(),
                page.limit,
                page.has_more,
                &page.next_cursor,
            )?;
            if page.snapshot_revision.is_empty()
                || revision
                    .as_ref()
                    .is_some_and(|expected| expected != &page.snapshot_revision)
            {
                return Err("reverse_host_snapshot_changed".into());
            }
            revision.get_or_insert_with(|| page.snapshot_revision.clone());
            if !seen.insert(page.cursor.clone()) {
                return Err("reverse_host_page_cycle".into());
            }
            artifacts.extend(page.artifacts);
            if artifacts.len() > MAX_HOST_ROWS * 3 {
                return Err("reverse_host_input_too_large".into());
            }
            if !page.has_more {
                artifacts.sort_by(|left, right| {
                    left.paper_ref
                        .cmp(&right.paper_ref)
                        .then_with(|| left.artifact_type.cmp(&right.artifact_type))
                });
                return Ok(artifacts);
            }
            cursor = page.next_cursor;
        }
        Err("reverse_host_page_limit_exceeded".into())
    }

    fn begin_job(
        &self,
        operation_id: &str,
        operation_type: &str,
        phase: &str,
    ) -> Result<OperationRecord, String> {
        let now = now_string();
        let previous = self.read_job(operation_id)?;
        if previous
            .as_ref()
            .is_some_and(|operation| operation.status == "running")
            && phase != "retrying"
        {
            return Err("operation_in_progress".into());
        }
        let record = OperationRecord {
            operation_id: operation_id.into(),
            operation_type: operation_type.into(),
            scope_kind: "library".into(),
            scope_ref: String::new(),
            status: "running".into(),
            label: operation_type.replace('_', " "),
            phase: phase.into(),
            progress_mode: "indeterminate".into(),
            created_at: previous
                .as_ref()
                .map(|operation| operation.created_at.clone())
                .filter(|value| !value.is_empty())
                .unwrap_or_else(|| now.clone()),
            started_at: now.clone(),
            updated_at: now,
            ..OperationRecord::default()
        };
        self.write_job(&record)?;
        emit_debug(|| {
            NativeDiagnosticEvent::new("operation", "operation-started", "started")
                .capability(operation_type)
                .operation_id(operation_id)
        });
        Ok(record)
    }

    fn finish_job(
        &self,
        mut job: OperationRecord,
        outcome: Result<Value, String>,
    ) -> Result<Value, String> {
        let now = now_string();
        match outcome {
            Ok(result) => {
                let ok = result.get("ok").and_then(Value::as_bool) != Some(false);
                job.status = if ok { "completed" } else { "failed" }.into();
                job.phase = if ok { "completed" } else { "failed" }.into();
                job.processed_count = result
                    .get("affected_source_refs")
                    .and_then(Value::as_array)
                    .map(|rows| rows.len() as i64)
                    .or_else(|| result.get("proposal_created_count").and_then(Value::as_i64))
                    .unwrap_or_default();
                job.failed_count = if ok { 0 } else { 1 };
                job.diagnostics_json = serde_json::to_string(&vec![json!({"result":result})])
                    .map_err(|_| "serialization_failed")?;
                job.completed_at = now.clone();
                job.updated_at = now;
                self.write_job(&job)?;
                if ok {
                    emit_debug(|| {
                        operation_result_event(
                            NativeDiagnosticEvent::new(
                                "operation",
                                "operation-completed",
                                "succeeded",
                            )
                            .capability(&job.operation_type)
                            .operation_id(&job.operation_id),
                            &result,
                        )
                    });
                } else {
                    emit_debug(|| {
                        operation_result_event(
                            NativeDiagnosticEvent::new("operation", "operation-failed", "failed")
                                .capability(&job.operation_type)
                                .operation_id(&job.operation_id)
                                .code(
                                    result
                                        .get("status")
                                        .and_then(Value::as_str)
                                        .unwrap_or("operation_failed"),
                                ),
                            &result,
                        )
                    });
                }
                Ok(result)
            }
            Err(error) => {
                job.status = "failed".into();
                job.phase = "failed".into();
                job.failed_count = 1;
                job.diagnostics_json = serde_json::to_string(&vec![json!({"code":error})])
                    .map_err(|_| "serialization_failed")?;
                job.completed_at = now.clone();
                job.updated_at = now;
                self.write_job(&job)?;
                emit_debug(|| {
                    NativeDiagnosticEvent::new("operation", "operation-failed", "failed")
                        .capability(&job.operation_type)
                        .operation_id(&job.operation_id)
                        .code(&error)
                });
                Err(error)
            }
        }
    }

    fn read_job(&self, operation_id: &str) -> Result<Option<OperationRecord>, String> {
        self.repository
            .owner()
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_operation(operation_id)
    }

    fn write_job(&self, record: &OperationRecord) -> Result<(), String> {
        self.repository
            .owner()
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .upsert_operation(record)
    }
}

fn operation_result_event(
    mut event: NativeDiagnosticEvent,
    result: &Value,
) -> NativeDiagnosticEvent {
    if let Some(status) = result
        .get("status")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
    {
        event = event.mutation_status(status);
    }
    if let Some(matching_hash) = result
        .get("matching_hash")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
    {
        event = event.matching_hash(matching_hash);
    }
    if let Some(count) = result
        .get("proposal_created_count")
        .and_then(Value::as_u64)
        .and_then(|value| usize::try_from(value).ok())
    {
        event = event.proposal_created_count(count);
    }
    if let Some(count) = result
        .get("fact_count")
        .and_then(Value::as_u64)
        .and_then(|value| usize::try_from(value).ok())
    {
        event = event.fact_count(count);
    }
    if let Some(warnings) = result.get("warnings").and_then(Value::as_array) {
        event = event.warning_count(warnings.len());
    }
    event
}

fn partition_refresh_batches(
    items: &[ReferenceHostItem],
    artifacts: &[ReferenceArtifactDescriptor],
) -> Vec<Vec<ReferenceHostItem>> {
    let estimated_by_source = artifacts
        .iter()
        .filter(|artifact| {
            matches!(
                artifact.artifact_type,
                ReferenceArtifactType::References | ReferenceArtifactType::CitationAnalysis
            )
        })
        .fold(HashMap::<&str, usize>::new(), |mut sizes, artifact| {
            let size = sizes.entry(artifact.paper_ref.as_str()).or_default();
            *size = size.saturating_add(artifact.estimated_size.unwrap_or_default());
            sizes
        });
    let mut batches = Vec::new();
    let mut batch = Vec::new();
    let mut estimated_bytes = 0usize;
    for item in items {
        let item_bytes = estimated_by_source
            .get(item.paper_ref.as_str())
            .copied()
            .unwrap_or_default();
        if !batch.is_empty()
            && (batch.len() == HOST_PAGE_LIMIT
                || estimated_bytes.saturating_add(item_bytes)
                    > REFERENCE_REFRESH_ESTIMATED_BATCH_BYTES)
        {
            batches.push(std::mem::take(&mut batch));
            estimated_bytes = 0;
        }
        estimated_bytes = estimated_bytes.saturating_add(item_bytes);
        batch.push(item.clone());
    }
    if !batch.is_empty() {
        batches.push(batch);
    }
    batches
}

fn refresh_status_name(status: &ReferenceRefreshStatus) -> String {
    serde_json::to_value(status)
        .ok()
        .and_then(|value| value.as_str().map(str::to_owned))
        .unwrap_or_else(|| "reference_refresh_failed".into())
}

#[derive(Clone, Copy)]
struct PageQuery {
    cursor: usize,
    limit: usize,
}

fn page_query(
    request: &Value,
    default_limit: usize,
    max_limit: usize,
) -> Result<PageQuery, String> {
    let object = request
        .as_object()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let cursor = object
        .get("cursor")
        .map(parse_usize)
        .transpose()?
        .unwrap_or_default();
    let limit = object
        .get("limit")
        .map(parse_usize)
        .transpose()?
        .unwrap_or(default_limit);
    if limit == 0 || limit > max_limit {
        return Err("invalid_request".into());
    }
    Ok(PageQuery { cursor, limit })
}

fn page_query_without_cursor(
    request: &Value,
    default_limit: usize,
    max_limit: usize,
) -> Result<usize, String> {
    let query = page_query(request, default_limit, max_limit)?;
    if query.cursor != 0 {
        return Err("invalid_request".into());
    }
    Ok(query.limit)
}

fn parse_usize(value: &Value) -> Result<usize, String> {
    match value {
        Value::String(value) => value
            .parse::<usize>()
            .map_err(|_| "invalid_request".to_owned()),
        Value::Number(value) => value
            .as_u64()
            .and_then(|value| usize::try_from(value).ok())
            .ok_or_else(|| "invalid_request".to_owned()),
        _ => Err("invalid_request".into()),
    }
}

fn bool_field(request: &Value, names: &[&str], fallback: bool) -> Result<bool, String> {
    for name in names {
        if let Some(value) = request.get(*name) {
            return value.as_bool().ok_or_else(|| "invalid_request".to_owned());
        }
    }
    Ok(fallback)
}

fn string_field_optional(request: &Value, names: &[&str]) -> Option<String> {
    names
        .iter()
        .find_map(|name| request.get(*name).and_then(Value::as_str))
        .map(str::to_owned)
}

fn string_list_field(request: &Value, names: &[&str], max: usize) -> Result<Vec<String>, String> {
    let Some(value) = names.iter().find_map(|name| request.get(*name)) else {
        return Ok(Vec::new());
    };
    let mut result = match value {
        Value::String(value) => vec![value.clone()],
        Value::Array(values) => values
            .iter()
            .map(|value| {
                value
                    .as_str()
                    .map(str::to_owned)
                    .ok_or_else(|| "invalid_request".to_owned())
            })
            .collect::<Result<Vec<_>, _>>()?,
        _ => return Err("invalid_request".into()),
    };
    result.retain(|value| !value.trim().is_empty());
    result.sort();
    result.dedup();
    if result.len() > max {
        return Err("invalid_request".into());
    }
    Ok(result)
}

fn refresh_scope_filter(request: &Value) -> Result<HashSet<String>, String> {
    let object = request
        .as_object()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let scope = object
        .get("scope")
        .and_then(Value::as_str)
        .unwrap_or("library");
    if !matches!(scope, "library" | "papers") {
        return Err("invalid_request".into());
    }
    let refs = string_list_field(request, &["paperRefs", "paper_refs"], 100)?;
    if scope == "papers" && refs.is_empty() {
        return Err("invalid_request".into());
    }
    Ok(refs.into_iter().collect())
}

fn refresh_item(item: &ReferenceHostItem) -> ReferenceRefreshItem {
    let mut metadata = BTreeMap::new();
    metadata.insert("itemType".into(), Value::String(item.item_type.clone()));
    metadata.insert("date".into(), Value::String(item.date.clone()));
    metadata.insert("creators".into(), json!(item.creators));
    metadata.insert("tags".into(), json!(item.tags));
    metadata.insert("collections".into(), json!(item.collections));
    metadata.insert("doi".into(), Value::String(item.doi.clone()));
    metadata.insert("arxiv".into(), Value::String(item.arxiv.clone()));
    metadata.insert("isbn".into(), Value::String(item.isbn.clone()));
    metadata.insert("url".into(), Value::String(item.url.clone()));
    metadata.insert("citekey".into(), Value::String(item.citekey.clone()));
    metadata.insert("dateAdded".into(), Value::String(item.date_added.clone()));
    metadata.insert("updatedAt".into(), Value::String(item.updated_at.clone()));
    metadata.insert(
        "metadataHash".into(),
        Value::String(item.metadata_hash.clone()),
    );
    ReferenceRefreshItem {
        paper_ref: item.paper_ref.clone(),
        library_id: item.library_id,
        item_key: item.item_key.clone(),
        title: item.title.clone(),
        year: item.year.clone(),
        metadata,
    }
}

fn validate_literature_digest_request(
    request: &LiteratureDigestApplyRequest,
) -> Result<(), String> {
    if request.library_id < 0
        || request.item_key.trim().is_empty()
        || request.paper_ref != format!("{}:{}", request.library_id, request.item_key.trim())
        || request.item_type.trim().is_empty()
        || request
            .creators
            .iter()
            .chain(&request.tags)
            .chain(&request.collections)
            .any(|value| value.chars().any(char::is_control))
    {
        return Err("invalid_request".into());
    }
    Ok(())
}

fn literature_artifact_hash(
    artifact: Option<&Map<String, Value>>,
    artifact_type: &str,
) -> Result<String, String> {
    if let Some(hash) = artifact
        .and_then(|artifact| {
            artifact
                .get("payloadHash")
                .or_else(|| artifact.get("payload_hash"))
        })
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return Ok(hash.to_owned());
    }
    canonical_json_hash(&json!({
        "artifactType":artifact_type,
        "payload":artifact.map(|artifact| Value::Object(artifact.clone())).unwrap_or(Value::Null),
    }))
}

fn literature_artifact_descriptor(
    paper_ref: &str,
    artifact_type: ReferenceArtifactType,
    payload_type: &str,
    available: bool,
    payload_hash: &str,
) -> Result<ReferenceArtifactDescriptor, String> {
    let locator_hash = canonical_json_hash(&json!({
        "paperRef":paper_ref,
        "artifactType":artifact_type,
        "payloadHash":payload_hash,
    }))?;
    Ok(ReferenceArtifactDescriptor {
        paper_ref: paper_ref.into(),
        artifact_type,
        payload_type: payload_type.into(),
        status: if available { "available" } else { "missing" }.into(),
        locator: format!("workflow:literature:{}", &locator_hash[7..31]),
        payload_hash: payload_hash.into(),
        estimated_size: None,
        diagnostics: Vec::new(),
    })
}

fn literature_refresh_item(request: &LiteratureDigestApplyRequest) -> ReferenceRefreshItem {
    let metadata = BTreeMap::from([
        ("itemType".into(), json!(request.item_type)),
        ("date".into(), json!(request.date)),
        ("creators".into(), json!(request.creators)),
        ("tags".into(), json!(request.tags)),
        ("collections".into(), json!(request.collections)),
        ("doi".into(), json!(request.doi)),
        ("arxiv".into(), json!(request.arxiv)),
        ("isbn".into(), json!(request.isbn)),
        ("url".into(), json!(request.url)),
        ("citekey".into(), json!(request.citekey)),
        ("dateAdded".into(), json!(request.date_added)),
    ]);
    ReferenceRefreshItem {
        paper_ref: request.paper_ref.clone(),
        library_id: request.library_id,
        item_key: request.item_key.trim().into(),
        title: request.title.trim().into(),
        year: request.year.trim().into(),
        metadata,
    }
}

fn literature_binding_candidates(value: Option<&Value>) -> Vec<ReferenceRefreshItem> {
    let mut candidates = value
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|value| {
            let object = value.as_object()?;
            let library_id = object
                .get("libraryId")
                .or_else(|| object.get("library_id"))
                .and_then(Value::as_i64)
                .filter(|value| *value >= 0)?;
            let item_key = object
                .get("itemKey")
                .or_else(|| object.get("item_key"))
                .and_then(Value::as_str)?
                .trim();
            if item_key.is_empty() {
                return None;
            }
            let paper_ref = object
                .get("paperRef")
                .or_else(|| object.get("paper_ref"))
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_owned)
                .unwrap_or_else(|| format!("{library_id}:{item_key}"));
            let citekey = object
                .get("citekey")
                .and_then(Value::as_str)
                .unwrap_or_default()
                .trim()
                .to_owned();
            Some(ReferenceRefreshItem {
                paper_ref,
                library_id,
                item_key: item_key.into(),
                title: object
                    .get("title")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .trim()
                    .into(),
                year: object
                    .get("year")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .trim()
                    .into(),
                metadata: BTreeMap::from([("citekey".into(), Value::String(citekey))]),
            })
        })
        .collect::<Vec<_>>();
    candidates.sort_by(|left, right| left.paper_ref.cmp(&right.paper_ref));
    candidates
}

fn normalize_literature_terms(value: Option<&Value>, limit: usize) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut terms = Vec::new();
    for value in value.and_then(Value::as_array).into_iter().flatten() {
        let Some(value) = value.as_str() else {
            continue;
        };
        let normalized = value.split_whitespace().collect::<Vec<_>>().join(" ");
        let key = normalized.to_lowercase();
        if normalized.is_empty() || !seen.insert(key) {
            continue;
        }
        terms.push(normalized);
        if terms.len() == limit {
            break;
        }
    }
    terms
}

fn literature_matching_metadata_record(
    paper_ref: &str,
    value: Option<&Value>,
    digest_hash: &str,
    now: &str,
) -> Result<Option<LiteratureMatchingMetadataRecord>, String> {
    let Some(value) = value.and_then(Value::as_object) else {
        return Ok(None);
    };
    let key_terms = normalize_literature_terms(value.get("key_terms"), 12);
    let methods = normalize_literature_terms(value.get("methods"), 8);
    let problems = normalize_literature_terms(value.get("problems"), 8);
    let datasets = normalize_literature_terms(value.get("datasets"), 8);
    let exclude_terms = normalize_literature_terms(value.get("exclude_terms"), 6);
    let payload = json!({
        "schema":LITERATURE_MATCHING_METADATA_SCHEMA,
        "key_terms":key_terms,
        "methods":methods,
        "problems":problems,
        "datasets":datasets,
        "exclude_terms":exclude_terms,
    });
    Ok(Some(LiteratureMatchingMetadataRecord {
        literature_item_id: paper_ref.into(),
        schema_id: LITERATURE_MATCHING_METADATA_SCHEMA.into(),
        key_terms_json: serde_json::to_string(&key_terms)
            .map_err(|_| "serialization_failed".to_owned())?,
        methods_json: serde_json::to_string(&methods)
            .map_err(|_| "serialization_failed".to_owned())?,
        problems_json: serde_json::to_string(&problems)
            .map_err(|_| "serialization_failed".to_owned())?,
        datasets_json: serde_json::to_string(&datasets)
            .map_err(|_| "serialization_failed".to_owned())?,
        exclude_terms_json: serde_json::to_string(&exclude_terms)
            .map_err(|_| "serialization_failed".to_owned())?,
        source_artifact_hash: digest_hash.into(),
        metadata_hash: canonical_json_hash(&payload)?,
        diagnostics_json: "[]".into(),
        updated_at: now.into(),
    }))
}

fn receipt_result_value(receipt: &OperationRecord) -> Result<Value, String> {
    let diagnostics: Value = serde_json::from_str(&receipt.diagnostics_json)
        .map_err(|_| "operation_receipt_invalid".to_owned())?;
    diagnostics
        .get("result")
        .cloned()
        .filter(Value::is_object)
        .ok_or_else(|| "operation_receipt_invalid".into())
}

fn workbench_reference_row(reference: &ReferenceIndexFactReference) -> Value {
    let target_paper_ref = reference
        .binding
        .as_ref()
        .map(|binding| format!("{}:{}", binding.library_id, binding.item_key))
        .unwrap_or_default();
    json!({
        "reference_instance_id":reference.raw.raw_reference_id,
        "reference_index":reference.raw.reference_index,
        "title":if reference.raw.parsed_title.is_empty() {
            reference.raw.raw_reference.as_str()
        } else {
            reference.raw.parsed_title.as_str()
        },
        "year":reference.raw.year,
        "raw_reference":reference.raw.raw_reference,
        "confidence":reference.binding.as_ref().map(|binding|binding.confidence.as_str()).unwrap_or_default(),
        "target_literature_item_id":target_paper_ref,
        "target_paper_ref":target_paper_ref,
        "target_binding":if reference.binding.is_some() { "library" } else { "none" },
        "binding_status":reference.binding.as_ref().map(|binding|binding.status.as_str()).unwrap_or("unbound"),
    })
}

fn complete_artifact_manifest(
    items: &[ReferenceHostItem],
    artifacts: &[ReferenceHostArtifact],
) -> Result<Vec<ReferenceArtifactDescriptor>, String> {
    let by_key = artifacts
        .iter()
        .map(|artifact| {
            (
                (artifact.paper_ref.as_str(), artifact.artifact_type.as_str()),
                artifact,
            )
        })
        .collect::<HashMap<_, _>>();
    if by_key.len() != artifacts.len() {
        return Err("reverse_host_result_invalid".into());
    }
    let mut result = Vec::with_capacity(items.len() * 3);
    for item in items {
        for (kind, name) in [
            (ReferenceArtifactType::Digest, "digest"),
            (ReferenceArtifactType::References, "references"),
            (ReferenceArtifactType::CitationAnalysis, "citation_analysis"),
        ] {
            let artifact = by_key.get(&(item.paper_ref.as_str(), name)).copied();
            let placeholder = canonical_json_hash(&json!({
                "paperRef":item.paper_ref,
                "artifactType":name,
                "status":"missing",
            }))?;
            let status = artifact
                .map(|artifact| artifact.status.as_str())
                .unwrap_or("missing");
            result.push(ReferenceArtifactDescriptor {
                paper_ref: item.paper_ref.clone(),
                artifact_type: kind,
                payload_type: artifact
                    .map(|artifact| artifact.payload_type.clone())
                    .filter(|value| !value.is_empty())
                    .unwrap_or_else(|| "application/json".into()),
                status: match status {
                    "available" => "available",
                    "missing" => "missing",
                    _ => "failed",
                }
                .into(),
                locator: artifact
                    .map(|artifact| artifact.locator.clone())
                    .filter(|value| !value.is_empty())
                    .unwrap_or_else(|| format!("host:missing:{placeholder}")),
                payload_hash: artifact
                    .map(|artifact| artifact.payload_hash.clone())
                    .filter(|value| !value.is_empty())
                    .unwrap_or(placeholder),
                estimated_size: artifact.and_then(|artifact| artifact.estimated_size),
                diagnostics: artifact
                    .map(|artifact| {
                        artifact
                            .diagnostics
                            .iter()
                            .map(|diagnostic| Value::String(diagnostic.clone()))
                            .collect::<Vec<_>>()
                    })
                    .unwrap_or_default(),
            });
        }
    }
    Ok(result)
}

fn refresh_payload(
    read: &synthesis_application::reference_refresh::ReferenceRefreshRead,
    payload: ReferenceHostArtifactRead,
) -> Result<ReferenceRefreshPayload, String> {
    if payload.status != "available" || payload.payload_hash != read.expected_hash {
        return Err(if payload.current_hash.is_empty() {
            "reverse_host_artifact_unavailable"
        } else {
            "reverse_host_artifact_stale"
        }
        .into());
    }
    let content = match payload.content {
        Some(Value::Object(mut content)) => match content.remove("kind") {
            Some(Value::String(kind)) if kind == "json" => content
                .remove("value")
                .ok_or_else(|| "reverse_host_result_invalid".to_owned())?,
            Some(Value::String(kind)) if kind == "text" => {
                let text = content
                    .remove("text")
                    .and_then(|value| value.as_str().map(str::to_owned))
                    .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
                serde_json::from_str(&text).map_err(|_| "reverse_host_result_invalid")?
            }
            _ => Value::Object(content),
        },
        Some(value) => value,
        None => return Err("reverse_host_result_invalid".into()),
    };
    Ok(ReferenceRefreshPayload {
        locator: read.locator.clone(),
        expected_hash: read.expected_hash.clone(),
        status: "available".into(),
        payload_hash: payload.payload_hash,
        content,
        diagnostics: payload.diagnostics.into_iter().map(Value::String).collect(),
    })
}

fn validate_artifact_page(
    requested_cursor: &str,
    returned_cursor: &str,
    returned: usize,
    actual: usize,
    limit: usize,
    has_more: bool,
    next_cursor: &str,
) -> Result<(), String> {
    validate_page_metadata(
        requested_cursor,
        returned_cursor,
        returned,
        limit,
        has_more,
        next_cursor,
    )?;
    if actual > returned.saturating_mul(HOST_ARTIFACT_TYPES_PER_ITEM) {
        return Err("reverse_host_result_invalid".into());
    }
    Ok(())
}

fn reference_basis_hash(repository: &Repository) -> Result<String, String> {
    canonical_json_hash(&json!({
        "state":repository.get_reference_application_state()?,
        "matching":repository.get_reference_matching_state()?,
        "sources":repository.list_reference_sources()?,
        "rawReferences":repository.list_raw_references()?,
        "canonicals":repository.list_canonical_references()?,
        "bindings":repository.list_reference_bindings()?,
        "redirects":repository.list_reference_redirects()?,
        "reviews":repository.list_reference_revision_reviews()?,
    }))
}

fn canonical_basis_hash(repository: &Repository) -> Result<String, String> {
    canonical_json_hash(&json!({
        "canonicals":repository.list_canonical_references()?,
        "bindings":repository.list_reference_bindings()?,
        "redirects":repository.list_reference_redirects()?,
        "reviews":repository.list_reference_revision_reviews()?,
    }))
}

fn all_proposals(repository: &Repository) -> Result<Vec<ReferenceMatchProposalRecord>, String> {
    let mut offset = 0;
    let mut result = Vec::new();
    loop {
        let (rows, has_more) = repository.list_reference_match_proposals(offset, 100)?;
        offset += rows.len();
        result.extend(rows);
        if !has_more {
            return Ok(result);
        }
        if offset > MAX_HOST_ROWS {
            return Err("reference_proposal_limit_exceeded".into());
        }
    }
}

fn resolve_effective_canonical_id(
    canonical_id: &str,
    redirects: &[ReferenceRedirectFactRecord],
) -> Result<String, String> {
    if canonical_id.is_empty() {
        return Err("invalid_request".into());
    }
    let mut current = canonical_id.to_owned();
    let mut visited = BTreeSet::new();
    while let Some(redirect) = redirects
        .iter()
        .find(|redirect| redirect.from_canonical_reference_id == current)
    {
        if !visited.insert(current.clone()) {
            return Err("canonical_redirect_cycle".into());
        }
        current = redirect.to_canonical_reference_id.clone();
    }
    Ok(current)
}

fn plan_merge(
    repository: &Repository,
    source_requested: &str,
    target_requested: &str,
    confirm_retarget_group: bool,
) -> Result<Result<PlannedMerge, MergeFailure>, String> {
    if source_requested.is_empty() || target_requested.is_empty() {
        return Ok(Err(MergeFailure::InvalidTarget));
    }
    let redirects = repository.list_reference_redirects()?;
    let source = resolve_effective_canonical_id(source_requested, &redirects)?;
    let target = resolve_effective_canonical_id(target_requested, &redirects)?;
    if source == target {
        return Ok(Err(MergeFailure::InvalidTarget));
    }
    let canonicals = repository.list_canonical_references()?;
    if ![&source, &target].iter().all(|id| {
        canonicals
            .iter()
            .any(|row| row.canonical_reference_id == **id && row.status == "active")
    }) {
        return Ok(Err(MergeFailure::MissingCanonical));
    }
    let bindings = repository.list_reference_bindings()?;
    let source_binding = bindings
        .iter()
        .find(|binding| binding.canonical_reference_id == source && binding.status != "revoked");
    let target_binding = bindings
        .iter()
        .find(|binding| binding.canonical_reference_id == target && binding.status != "revoked");
    if source_binding
        .zip(target_binding)
        .is_some_and(|(left, right)| {
            left.library_id != right.library_id || left.item_key != right.item_key
        })
    {
        return Ok(Err(MergeFailure::ConflictingBindings));
    }
    let incoming = redirects
        .iter()
        .filter(|redirect| {
            resolve_effective_canonical_id(&redirect.to_canonical_reference_id, &redirects)
                .ok()
                .as_deref()
                == Some(source.as_str())
        })
        .count();
    if incoming > 0 && !confirm_retarget_group {
        return Ok(Err(MergeFailure::RequiresConfirmation));
    }
    Ok(Ok(PlannedMerge { source, target }))
}

fn creates_redirect_cycle(repository: &Repository, plans: &[PlannedMerge]) -> Result<bool, String> {
    let mut targets = repository
        .list_reference_redirects()?
        .into_iter()
        .map(|redirect| {
            (
                redirect.from_canonical_reference_id,
                redirect.to_canonical_reference_id,
            )
        })
        .collect::<HashMap<_, _>>();
    for plan in plans {
        targets.insert(plan.source.clone(), plan.target.clone());
    }
    for source in targets.keys() {
        let mut current = source.as_str();
        let mut seen = HashSet::new();
        while let Some(target) = targets.get(current) {
            if !seen.insert(current.to_owned()) {
                return Ok(true);
            }
            current = target;
        }
    }
    Ok(false)
}

fn canonical_archive_blockers(
    repository: &Repository,
    canonical_id: &str,
) -> Result<Vec<String>, String> {
    let redirects = repository.list_reference_redirects()?;
    let effective = resolve_effective_canonical_id(canonical_id, &redirects)?;
    let mut blockers = Vec::new();
    if repository.list_raw_references()?.iter().any(|raw| {
        raw.status == "active"
            && resolve_effective_canonical_id(&raw.canonical_reference_id, &redirects)
                .ok()
                .as_deref()
                == Some(effective.as_str())
    }) {
        blockers.push("raw_reference".into());
    }
    if repository.list_reference_bindings()?.iter().any(|binding| {
        binding.status != "revoked"
            && resolve_effective_canonical_id(&binding.canonical_reference_id, &redirects)
                .ok()
                .as_deref()
                == Some(effective.as_str())
    }) {
        blockers.push("binding".into());
    }
    if redirects.iter().any(|redirect| {
        redirect.from_canonical_reference_id == canonical_id
            || redirect.to_canonical_reference_id == canonical_id
    }) {
        blockers.push("redirect".into());
    }
    Ok(blockers)
}

fn successor_id(
    payload: &Value,
    repository: &Repository,
    source: &str,
) -> Result<Option<String>, String> {
    for key in [
        "successorCanonicalReferenceId",
        "successor_canonical_reference_id",
    ] {
        if let Some(target) = payload.get(key).and_then(Value::as_str)
            && !target.trim().is_empty()
        {
            return Ok(Some(target.trim().to_owned()));
        }
    }
    let normalized_title = payload
        .get("normalizedTitle")
        .or_else(|| payload.get("normalized_title"))
        .and_then(Value::as_str)
        .map(str::to_owned)
        .or_else(|| {
            payload
                .get("title")
                .and_then(Value::as_str)
                .map(normalize_title)
        })
        .unwrap_or_default();
    if normalized_title.is_empty() {
        return Ok(None);
    }
    Ok(repository
        .list_canonical_references()?
        .into_iter()
        .find(|canonical| {
            canonical.status == "active"
                && canonical.canonical_reference_id != source
                && canonical.normalized_title == normalized_title
        })
        .map(|canonical| canonical.canonical_reference_id))
}

fn completed_receipt(
    operation_id: &str,
    operation_type: &str,
    basis: &str,
    result: &Value,
) -> Result<OperationRecord, String> {
    let now = now_string();
    Ok(OperationRecord {
        operation_id: operation_id.into(),
        operation_type: operation_type.into(),
        scope_kind: "reference-canonical".into(),
        status: "completed".into(),
        label: operation_type.replace('_', " "),
        phase: "committed".into(),
        progress_mode: "determinate".into(),
        processed_count: 1,
        total_count: 1,
        basis_kind: "reference_canonical_basis".into(),
        basis_value: basis.into(),
        source_hash: basis.into(),
        diagnostics_json: serde_json::to_string(&vec![json!({"result":result})])
            .map_err(|_| "serialization_failed")?,
        created_at: now.clone(),
        started_at: now.clone(),
        completed_at: now.clone(),
        updated_at: now,
        ..OperationRecord::default()
    })
}

fn receipt_result(repository: &Repository, operation_id: &str) -> Result<Option<Value>, String> {
    let Some(receipt) = repository.get_operation(operation_id)? else {
        return Ok(None);
    };
    if !matches!(receipt.status.as_str(), "completed" | "succeeded") {
        return Ok(None);
    }
    let diagnostics: Value =
        serde_json::from_str(&receipt.diagnostics_json).map_err(|_| "receipt_invalid")?;
    Ok(diagnostics
        .as_array()
        .and_then(|rows| rows.first())
        .and_then(|row| row.get("result"))
        .cloned())
}

fn operation_id(kind: &str, request: &Value) -> Result<String, String> {
    let hash = canonical_json_hash(&json!({"kind":kind,"request":request}))?;
    Ok(format!("reference-canonical:{}", &hash[7..39]))
}

fn proposal_id_for_merge(source: &str, target: &str) -> Result<String, String> {
    let hash = canonical_json_hash(&json!({"source":source,"target":target}))?;
    Ok(format!("proposal:{}", &hash[7..31]))
}

fn command_error(status: &str, code: &str, details: Value) -> Value {
    json!({
        "ok":false,
        "status":status,
        "diagnostics":[{
            "code":code,
            "severity":"error",
            "details":details,
        }],
    })
}

fn merge_failure_code(failure: MergeFailure, prefix: &str) -> String {
    let suffix = match failure {
        MergeFailure::InvalidTarget => "invalid_target",
        MergeFailure::MissingCanonical => "missing_canonical",
        MergeFailure::ConflictingBindings => "conflicting_zotero_bindings",
        MergeFailure::RequiresConfirmation => "retarget_group_requires_confirmation",
    };
    format!("{prefix}_{suffix}")
}

fn merge_failure_result(failure: MergeFailure, prefix: &str, source: &str, target: &str) -> Value {
    let status = match failure {
        MergeFailure::InvalidTarget => "invalid_target",
        MergeFailure::MissingCanonical => "missing_canonical",
        MergeFailure::ConflictingBindings => "conflicting_bindings",
        MergeFailure::RequiresConfirmation => "requires_confirmation",
    };
    command_error(
        status,
        &merge_failure_code(failure, prefix),
        json!({"source":source,"target":target}),
    )
}

fn batch_merge_error(count: usize, code: impl Into<String>) -> Value {
    let code = code.into();
    json!({
        "ok":false,
        "applied_count":0,
        "failed_count":count,
        "results":[],
        "diagnostics":[{
            "code":code,
            "severity":"error",
        }],
    })
}

fn review_failure_result(review: &ReferenceReviewBatchResult) -> Value {
    json!({
        "ok":false,
        "applied_count":0,
        "skipped_count":0,
        "failed_count":review.results.len(),
        "results":review.results,
        "status":review.status,
    })
}

fn public_review_status(action: ReferenceReviewAction) -> &'static str {
    match action {
        ReferenceReviewAction::Accept | ReferenceReviewAction::Reverse => "accepted",
        ReferenceReviewAction::Reject => "rejected",
        ReferenceReviewAction::Reopen => "open",
        ReferenceReviewAction::Delete => "deleted",
        ReferenceReviewAction::Retarget => "accepted",
    }
}

fn with_idempotent(mut result: Value) -> Value {
    if let Some(object) = result.as_object_mut() {
        object.insert("idempotent".into(), Value::Bool(true));
    }
    result
}

fn parse_json(text: &str, fallback: Value) -> Value {
    serde_json::from_str(text).unwrap_or(fallback)
}

fn parse_string_array(text: &str) -> Vec<String> {
    serde_json::from_str(text).unwrap_or_default()
}

fn nonempty_patch_string(value: Option<&str>) -> Result<Option<&str>, String> {
    match value {
        Some(value) if value.trim().is_empty() => Err("invalid_request".into()),
        Some(value) => Ok(Some(value.trim())),
        None => Ok(None),
    }
}

fn normalize_title(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn now_string() -> String {
    synthesis_protocol::utc_now_iso8601()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runtime_host_collection::{
        HostItemCollectionPort, ReferenceHostItemsByRef, ReferenceHostItemsPage,
    };
    use std::path::{Path, PathBuf};
    use std::sync::Mutex;
    use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
    use synthesis_application::reference_matching::{
        ReferenceMatchConfidence, ReferenceMatchDisposition,
    };
    use synthesis_application::reference_matching::{
        ReferenceMatchKind, ReferenceMatchPass, ReferenceMatcherInput, ReferenceMatcherOutcome,
        ReferenceMatcherPort,
    };
    use synthesis_repository::{
        CanonicalReferenceRecord, ReferenceRevisionReviewRecord, RepositoryIdentity,
    };

    #[derive(Clone)]
    struct FakeHost {
        item_calls: Arc<AtomicUsize>,
        fail_items: Arc<AtomicBool>,
        fail_reads: Arc<AtomicBool>,
        fail_locator: Arc<Mutex<Option<String>>>,
        read_locators: Arc<Mutex<Vec<String>>>,
        include_second: Arc<AtomicBool>,
        large_estimates: Arc<AtomicBool>,
    }

    impl FakeHost {
        fn new() -> Self {
            Self {
                item_calls: Arc::new(AtomicUsize::new(0)),
                fail_items: Arc::new(AtomicBool::new(false)),
                fail_reads: Arc::new(AtomicBool::new(false)),
                fail_locator: Arc::new(Mutex::new(None)),
                read_locators: Arc::new(Mutex::new(Vec::new())),
                include_second: Arc::new(AtomicBool::new(true)),
                large_estimates: Arc::new(AtomicBool::new(false)),
            }
        }

        fn item(paper_ref: &str, item_key: &str, title: &str) -> ReferenceHostItem {
            ReferenceHostItem {
                paper_ref: paper_ref.into(),
                library_id: 1,
                item_key: item_key.into(),
                item_type: "journalArticle".into(),
                title: title.into(),
                year: "2024".into(),
                date: "2024".into(),
                creators: vec!["Author".into()],
                tags: Vec::new(),
                collections: Vec::new(),
                doi: String::new(),
                arxiv: String::new(),
                isbn: String::new(),
                url: String::new(),
                citekey: String::new(),
                date_added: "1".into(),
                updated_at: "1".into(),
                metadata_hash: format!("sha256:{item_key}"),
            }
        }
    }

    impl HostItemCollectionPort for FakeHost {
        fn list_items_page(
            &self,
            cursor: &str,
            limit: usize,
        ) -> Result<ReferenceHostItemsPage, String> {
            self.item_calls.fetch_add(1, Ordering::Relaxed);
            if self.fail_items.load(Ordering::Relaxed) {
                return Err("reverse_host_unavailable".into());
            }
            match cursor {
                "" => {
                    let has_more = self.include_second.load(Ordering::Relaxed);
                    Ok(ReferenceHostItemsPage {
                        items: vec![Self::item("1:AAAA1111", "AAAA1111", "Paper A")],
                        cursor: String::new(),
                        next_cursor: if has_more {
                            "items:2".into()
                        } else {
                            String::new()
                        },
                        snapshot_revision: "revision:1".into(),
                        has_more,
                        returned: 1,
                        limit,
                    })
                }
                "items:2" => Ok(ReferenceHostItemsPage {
                    items: vec![Self::item("1:BBBB2222", "BBBB2222", "Paper B")],
                    cursor: cursor.into(),
                    next_cursor: String::new(),
                    snapshot_revision: "revision:1".into(),
                    has_more: false,
                    returned: 1,
                    limit,
                }),
                _ => Err("reverse_host_result_invalid".into()),
            }
        }

        fn get_items_by_ref(
            &self,
            paper_refs: &[String],
        ) -> Result<ReferenceHostItemsByRef, String> {
            let items = paper_refs
                .iter()
                .filter_map(|paper_ref| match paper_ref.as_str() {
                    "1:AAAA1111" => Some(Self::item("1:AAAA1111", "AAAA1111", "Paper A")),
                    "1:BBBB2222" => Some(Self::item("1:BBBB2222", "BBBB2222", "Paper B")),
                    _ => None,
                })
                .collect::<Vec<_>>();
            let returned = items
                .iter()
                .map(|item| item.paper_ref.clone())
                .collect::<HashSet<_>>();
            Ok(ReferenceHostItemsByRef {
                items,
                missing_paper_refs: paper_refs
                    .iter()
                    .filter(|paper_ref| !returned.contains(*paper_ref))
                    .cloned()
                    .collect(),
            })
        }
    }

    impl ReferenceHostPort for FakeHost {
        fn scan_artifacts_page(
            &self,
            cursor: &str,
            limit: usize,
        ) -> Result<ReferenceHostArtifactsPage, String> {
            if !cursor.is_empty() {
                return Err("reverse_host_result_invalid".into());
            }
            Ok(ReferenceHostArtifactsPage {
                artifacts: vec![
                    ReferenceHostArtifact {
                        paper_ref: "1:AAAA1111".into(),
                        artifact_type: "references".into(),
                        payload_type: "application/json".into(),
                        status: "available".into(),
                        locator: "reference:a".into(),
                        payload_hash: "sha256:reference-a".into(),
                        estimated_size: Some(if self.large_estimates.load(Ordering::Relaxed) {
                            REFERENCE_REFRESH_ESTIMATED_BATCH_BYTES / 2 + 1
                        } else {
                            100
                        }),
                        diagnostics: Vec::new(),
                    },
                    ReferenceHostArtifact {
                        paper_ref: "1:BBBB2222".into(),
                        artifact_type: "references".into(),
                        payload_type: "application/json".into(),
                        status: "available".into(),
                        locator: "reference:b".into(),
                        payload_hash: "sha256:reference-b".into(),
                        estimated_size: Some(if self.large_estimates.load(Ordering::Relaxed) {
                            REFERENCE_REFRESH_ESTIMATED_BATCH_BYTES / 2 + 1
                        } else {
                            100
                        }),
                        diagnostics: Vec::new(),
                    },
                    ReferenceHostArtifact {
                        paper_ref: "1:AAAA1111".into(),
                        artifact_type: "digest".into(),
                        payload_type: "text/markdown".into(),
                        status: "missing".into(),
                        locator: String::new(),
                        payload_hash: String::new(),
                        estimated_size: None,
                        diagnostics: Vec::new(),
                    },
                ],
                cursor: String::new(),
                next_cursor: String::new(),
                has_more: false,
                returned: 2,
                limit,
                snapshot_revision: "revision-1".into(),
            })
        }

        fn read_artifact(
            &self,
            locator: &str,
            expected_hash: &str,
        ) -> Result<ReferenceHostArtifactRead, String> {
            if self.fail_reads.load(Ordering::Relaxed) {
                return Err("reverse_host_response_body_truncated".into());
            }
            self.read_locators
                .lock()
                .expect("read locator log")
                .push(locator.into());
            if self.fail_locator.lock().expect("failed locator").as_deref() == Some(locator) {
                return Err("reverse_host_response_body_truncated".into());
            }
            let title = match locator {
                "reference:a" => "External A",
                "reference:b" => "External B",
                _ => return Err("reverse_host_result_invalid".into()),
            };
            Ok(ReferenceHostArtifactRead {
                status: "available".into(),
                payload_hash: expected_hash.into(),
                current_hash: String::new(),
                content: Some(json!({
                    "kind":"json",
                    "value":{
                        "references":[{
                            "title":title,
                            "year":"2020",
                            "authors":["External Author"],
                        }],
                    },
                })),
                diagnostics: Vec::new(),
            })
        }
    }

    struct FakeMatcher {
        fail: Arc<AtomicBool>,
    }

    impl ReferenceMatcherPort for FakeMatcher {
        fn match_pass(
            &self,
            pass: ReferenceMatchPass,
            input: &ReferenceMatcherInput,
        ) -> Result<Vec<ReferenceMatcherOutcome>, String> {
            if self.fail.load(Ordering::Relaxed) {
                return Err("worker_failed".into());
            }
            if pass == ReferenceMatchPass::CanonicalRedirect {
                return Ok(Vec::new());
            }
            let source = input
                .raw_references
                .first()
                .ok_or_else(|| "missing_reference".to_owned())?;
            let target = input
                .host_candidates
                .first()
                .ok_or_else(|| "missing_candidate".to_owned())?;
            Ok(vec![ReferenceMatcherOutcome {
                semantic_key: format!(
                    "binding::{}::{}::{}",
                    source.canonical_reference_id, target.library_id, target.item_key
                ),
                kind: ReferenceMatchKind::Binding,
                disposition: ReferenceMatchDisposition::Review,
                confidence: ReferenceMatchConfidence::Low,
                source_canonical_reference_id: source.canonical_reference_id.clone(),
                source_raw_reference_ids: vec![source.raw_reference_id.clone()],
                target_canonical_reference_id: String::new(),
                target_library_id: target.library_id,
                target_item_key: target.item_key.clone(),
                score: 0.5,
                reasons: vec!["fixture".into()],
                evidence: json!({"source":"fixture"}),
                diagnostics: Vec::new(),
            }])
        }
    }

    fn test_root(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-reference-canonical-{label}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
    }

    #[test]
    fn matching_terminal_event_projects_counts_without_warning_text() {
        let event = operation_result_event(
            NativeDiagnosticEvent::new("operation", "operation-completed", "succeeded")
                .capability("advanced_reference_matching")
                .operation_id(MATCHING_JOB_ID),
            &json!({
                "ok":true,
                "status":"promoted",
                "matching_hash":format!("sha256:{}", "c".repeat(64)),
                "proposal_created_count":0,
                "fact_count":2,
                "warnings":["private paper title"],
            }),
        );
        let source = serde_json::to_string(&event).expect("terminal event");
        assert!(source.contains("\"semanticStatus\":\"promoted\""));
        assert!(source.contains("\"proposalCount\":0"));
        assert!(source.contains("\"factCount\":2"));
        assert!(source.contains("\"warningCount\":1"));
        assert!(!source.contains("private paper title"));

        let early_failure = operation_result_event(
            NativeDiagnosticEvent::new("operation", "operation-failed", "failed")
                .code("basis_mismatch"),
            &json!({"ok":false,"status":"basis_mismatch"}),
        );
        let source = serde_json::to_string(&early_failure).expect("early failure event");
        assert!(source.contains("\"semanticStatus\":\"basis_mismatch\""));
        assert!(!source.contains("matchingHash"));
        assert!(!source.contains("proposalCount"));
    }

    fn application(
        root: &Path,
        host: Arc<FakeHost>,
        fail: Arc<AtomicBool>,
    ) -> ReferenceCanonicalApplication {
        let repository = Repository::open(
            root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("repository");
        let repository = Arc::new(RepositoryPort::new(Arc::new(Mutex::new(repository))));
        ReferenceCanonicalApplication::new(
            repository.clone(),
            ReferenceRefreshApplication::new(repository.clone()),
            ReferenceMatchingApplication::new(repository, Arc::new(FakeMatcher { fail })),
            host,
        )
    }

    fn canonical(id: &str) -> CanonicalReferenceRecord {
        CanonicalReferenceRecord {
            canonical_reference_id: id.into(),
            title: id.into(),
            normalized_title: id.to_lowercase(),
            authors_json: "[]".into(),
            identifiers_json: "{}".into(),
            metadata_hash: format!("sha256:{id}"),
            status: "active".into(),
            created_at: "1".into(),
            updated_at: "1".into(),
            ..CanonicalReferenceRecord::default()
        }
    }

    #[test]
    fn pages_host_inputs_retries_worker_and_keeps_proposal_batch_atomic() {
        let root = test_root("jobs");
        let host = Arc::new(FakeHost::new());
        let fail = Arc::new(AtomicBool::new(true));
        let app = application(&root, host.clone(), fail.clone());

        host.fail_items.store(true, Ordering::Relaxed);
        assert_eq!(app.refresh_now(), Err("reverse_host_unavailable".into()),);
        assert_eq!(
            app.read_job(REFRESH_JOB_ID)
                .expect("receipt")
                .expect("refresh receipt")
                .status,
            "failed"
        );
        host.fail_items.store(false, Ordering::Relaxed);
        let refreshed = app.retry_refresh().expect("refresh retry");
        assert_eq!(refreshed["status"], "promoted");
        assert!(host.item_calls.load(Ordering::Relaxed) >= 2);
        let index = app.sidecar_index(&json!({"limit":1})).expect("index");
        assert_eq!(index["returned"], 1);
        assert_eq!(index["total"], 2);
        assert_eq!(index["has_more"], true);

        let failed = app.run_advanced_matching().expect("worker failure result");
        assert_eq!(failed["status"], "matcher_failed");
        assert_eq!(
            app.read_job(MATCHING_JOB_ID)
                .expect("receipt")
                .expect("matching receipt")
                .status,
            "failed"
        );
        fail.store(false, Ordering::Relaxed);
        let retried = app.retry_advanced_matching().expect("matching retry");
        assert_eq!(retried["status"], "promoted");
        let attention = app.attention_queue(&json!({})).expect("attention");
        assert_eq!(attention["items"].as_array().expect("items").len(), 1);
        let proposal_id = attention["items"][0]["target"]
            .as_str()
            .expect("proposal id")
            .to_owned();
        let rejected_batch = app
            .apply_proposal_actions(&[
                ReferenceReviewDecision {
                    proposal_id: proposal_id.clone(),
                    action: ReferenceReviewAction::Accept,
                    target_canonical_reference_id: String::new(),
                    target_library_id: 0,
                    target_item_key: String::new(),
                },
                ReferenceReviewDecision {
                    proposal_id: "missing".into(),
                    action: ReferenceReviewAction::Accept,
                    target_canonical_reference_id: String::new(),
                    target_library_id: 0,
                    target_item_key: String::new(),
                },
            ])
            .expect("atomic batch result");
        assert_eq!(rejected_batch["ok"], false);
        let repository = app.repository.owner();
        let repository = repository.lock().expect("repository");
        assert!(
            repository
                .list_reference_bindings()
                .expect("bindings")
                .is_empty()
        );
        assert_eq!(
            repository
                .get_reference_match_proposal(&proposal_id)
                .expect("proposal")
                .expect("proposal row")
                .status,
            "open"
        );
        drop(repository);
        drop(app);

        let reopened = application(&root, host, fail);
        assert_eq!(
            reopened
                .attention_queue(&json!({}))
                .expect("reopened attention")["items"]
                .as_array()
                .expect("items")
                .len(),
            1
        );
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn discards_prepared_refresh_after_host_read_failure_and_allows_same_process_retry() {
        let root = test_root("refresh-read-retry");
        let host = Arc::new(FakeHost::new());
        let fail = Arc::new(AtomicBool::new(false));
        let app = application(&root, host.clone(), fail);

        host.fail_reads.store(true, Ordering::Relaxed);
        let failed = app.refresh_now().expect("partial refresh result");
        assert_eq!(failed["ok"], false);
        assert_eq!(failed["status"], "reverse_host_response_body_truncated");
        assert_eq!(failed["retryable"], true);

        let preparation_id = app
            .read_job(REFRESH_JOB_ID)
            .expect("refresh receipt")
            .expect("refresh job")
            .scope_ref;
        let repository = app.repository.owner();
        let repository = repository.lock().expect("repository");
        assert_eq!(
            repository
                .get_operation(&format!("operation:{preparation_id}"))
                .expect("preparation receipt")
                .expect("preparation operation")
                .status,
            "canceled"
        );
        drop(repository);

        host.fail_reads.store(false, Ordering::Relaxed);
        let retried = app.retry_refresh().expect("same-process retry");
        assert_eq!(retried["status"], "promoted");
    }

    #[test]
    fn partitions_refresh_sources_by_stable_count_and_estimated_capacity() {
        let items = (0..101)
            .map(|index| FakeHost::item(&format!("1:{index:08}"), &format!("{index:08}"), "Paper"))
            .collect::<Vec<_>>();
        let artifacts = items
            .iter()
            .map(|item| ReferenceArtifactDescriptor {
                paper_ref: item.paper_ref.clone(),
                artifact_type: ReferenceArtifactType::References,
                payload_type: "application/json".into(),
                status: "available".into(),
                locator: format!("reference:{}", item.paper_ref),
                payload_hash: format!("sha256:{}", item.paper_ref),
                estimated_size: Some(1),
                diagnostics: Vec::new(),
            })
            .collect::<Vec<_>>();
        let count_batches = partition_refresh_batches(&items, &artifacts);
        assert_eq!(
            count_batches.iter().map(Vec::len).collect::<Vec<_>>(),
            vec![100, 1]
        );

        let large_items = items[..3].to_vec();
        let large_artifacts = large_items
            .iter()
            .map(|item| ReferenceArtifactDescriptor {
                paper_ref: item.paper_ref.clone(),
                artifact_type: ReferenceArtifactType::References,
                payload_type: "application/json".into(),
                status: "available".into(),
                locator: format!("reference:{}", item.paper_ref),
                payload_hash: format!("sha256:{}", item.paper_ref),
                estimated_size: Some(REFERENCE_REFRESH_ESTIMATED_BATCH_BYTES / 2 + 1),
                diagnostics: Vec::new(),
            })
            .collect::<Vec<_>>();
        assert_eq!(
            partition_refresh_batches(&large_items, &large_artifacts)
                .iter()
                .map(Vec::len)
                .collect::<Vec<_>>(),
            vec![1, 1, 1]
        );
    }

    #[test]
    fn retains_completed_batches_retries_only_stale_sources_and_sweeps_deletions() {
        let root = test_root("refresh-batch-convergence");
        let host = Arc::new(FakeHost::new());
        host.large_estimates.store(true, Ordering::Relaxed);
        *host.fail_locator.lock().expect("failed locator") = Some("reference:b".into());
        let app = application(&root, host.clone(), Arc::new(AtomicBool::new(false)));

        let partial = app.refresh_now().expect("partial refresh");
        assert_eq!(partial["ok"], false);
        assert_eq!(partial["processed_paper_refs"], json!(["1:AAAA1111"]));
        assert_eq!(partial["failed_paper_refs"], json!(["1:BBBB2222"]));
        let partial_index = app.sidecar_index(&json!({})).expect("partial index");
        assert_eq!(partial_index["total"], 2);
        assert_eq!(partial_index["rows"][0]["artifactCoverage"], "partial");
        assert_eq!(partial_index["rows"][1]["artifactCoverage"], "missing");
        assert_eq!(
            host.read_locators
                .lock()
                .expect("read locators")
                .iter()
                .filter(|locator| locator.as_str() == "reference:a")
                .count(),
            1
        );

        *host.fail_locator.lock().expect("failed locator") = None;
        let retried = app.retry_refresh().expect("retry convergence");
        assert_eq!(retried["ok"], true);
        assert_eq!(
            app.sidecar_index(&json!({})).expect("converged index")["total"],
            2
        );
        assert_eq!(
            host.read_locators
                .lock()
                .expect("read locators")
                .iter()
                .filter(|locator| locator.as_str() == "reference:a")
                .count(),
            1,
            "the converged source must not be read again",
        );

        host.include_second.store(false, Ordering::Relaxed);
        let swept = app.refresh_now().expect("deletion sweep");
        assert_eq!(swept["ok"], true);
        let index = app.sidecar_index(&json!({})).expect("swept index");
        assert_eq!(index["total"], 1);
        assert_eq!(index["rows"][0]["paper_ref"], "1:AAAA1111");
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn commits_canonical_batches_receipts_and_revision_review_atomically() {
        let root = test_root("canonical");
        let host = Arc::new(FakeHost::new());
        let fail = Arc::new(AtomicBool::new(false));
        let app = application(&root, host.clone(), fail.clone());
        {
            let repository = app.repository.owner();
            let mut repository = repository.lock().expect("repository");
            for id in ["a", "b", "c", "d", "e", "f", "g"] {
                repository
                    .upsert_canonical_reference_record(&canonical(id))
                    .expect("canonical");
            }
            repository
                .upsert_reference_revision_review_record(&ReferenceRevisionReviewRecord {
                    review_id: "review:f".into(),
                    source_ref: "1:AAAA1111".into(),
                    canonical_reference_id: "f".into(),
                    status: "open".into(),
                    reason: "protected_canonical_changed".into(),
                    payload_json: "{\"successorCanonicalReferenceId\":\"g\"}".into(),
                    created_at: "1".into(),
                    updated_at: "1".into(),
                })
                .expect("review");
        }

        let invalid = app
            .merge_canonical_batch(CanonicalMergeBatchRequest {
                requests: vec![
                    CanonicalMergePair {
                        source_effective_canonical_id: "a".into(),
                        target_effective_canonical_id: "b".into(),
                    },
                    CanonicalMergePair {
                        source_effective_canonical_id: "c".into(),
                        target_effective_canonical_id: "missing".into(),
                    },
                ],
            })
            .expect("invalid batch");
        assert_eq!(invalid["applied_count"], 0);
        assert!(
            app.repository
                .owner()
                .lock()
                .expect("repository")
                .list_reference_redirects()
                .expect("redirects")
                .is_empty()
        );

        let valid_request = CanonicalMergeBatchRequest {
            requests: vec![
                CanonicalMergePair {
                    source_effective_canonical_id: "a".into(),
                    target_effective_canonical_id: "b".into(),
                },
                CanonicalMergePair {
                    source_effective_canonical_id: "c".into(),
                    target_effective_canonical_id: "d".into(),
                },
            ],
        };
        let valid = app
            .merge_canonical_batch(valid_request)
            .expect("valid batch");
        assert_eq!(valid["applied_count"], 2);
        assert_eq!(
            app.repository
                .owner()
                .lock()
                .expect("repository")
                .list_reference_redirects()
                .expect("redirects")
                .len(),
            2
        );

        let updated = app
            .update_canonical_metadata(CanonicalMetadataUpdateRequest {
                canonical_reference_id: "e".into(),
                patch: CanonicalMetadataPatch {
                    title: Some("Updated E".into()),
                    ..CanonicalMetadataPatch::default()
                },
            })
            .expect("metadata");
        assert_eq!(updated["status"], "updated");
        let archived = app
            .archive_canonical(CanonicalArchiveRequest {
                canonical_reference_id: "e".into(),
            })
            .expect("archive");
        assert_eq!(archived["status"], "archived");
        let reviewed = app
            .apply_revision_review(CanonicalRevisionReviewRequest {
                review_item_id: "review:f".into(),
                action: CanonicalRevisionReviewAction::Accept,
            })
            .expect("revision review");
        assert_eq!(reviewed["status"], "approved");
        drop(app);

        let reopened = application(&root, host, fail);
        let replayed = reopened
            .archive_canonical(CanonicalArchiveRequest {
                canonical_reference_id: "e".into(),
            })
            .expect("archive replay");
        assert_eq!(replayed["status"], "archived");
        assert_eq!(replayed["idempotent"], true);
        assert_eq!(
            reopened
                .repository
                .owner()
                .lock()
                .expect("repository")
                .list_reference_redirects()
                .expect("redirects")
                .len(),
            3
        );
        let _ = std::fs::remove_dir_all(root);
    }
}
