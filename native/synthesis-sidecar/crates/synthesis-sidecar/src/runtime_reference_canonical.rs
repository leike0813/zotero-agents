use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use synthesis_application::RepositoryPort;
use synthesis_application::reference_matching::{
    ReferenceHostCandidate, ReferenceMatchingApplication, ReferenceMatchingPrepareRequest,
    ReferenceMatchingStatus, ReferenceReviewAction, ReferenceReviewBatchResult,
    ReferenceReviewDecision,
};
use synthesis_application::reference_refresh::{
    ReferenceArtifactDescriptor, ReferenceArtifactType, ReferenceRefreshApplication,
    ReferenceRefreshApplyRequest, ReferenceRefreshItem, ReferenceRefreshPayload,
    ReferenceRefreshPrepareRequest, ReferenceRefreshScope, ReferenceRefreshStatus,
};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    OperationRecord, ReferenceMatchProposalRecord, ReferenceRedirectFactRecord, Repository,
};

const HOST_PAGE_LIMIT: usize = 100;
const MAX_HOST_PAGES: usize = 1_000;
const MAX_HOST_ROWS: usize = 100_000;
const REFRESH_JOB_ID: &str = "reference-job:refresh";
const MATCHING_JOB_ID: &str = "reference-job:advanced-matching";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ReferenceHostItem {
    pub paper_ref: String,
    pub library_id: i64,
    pub item_key: String,
    #[serde(default)]
    pub item_type: String,
    pub title: String,
    #[serde(default)]
    pub year: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub creators: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub collections: Vec<String>,
    #[serde(default)]
    pub doi: String,
    #[serde(default)]
    pub arxiv: String,
    #[serde(default)]
    pub isbn: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub citekey: String,
    #[serde(default)]
    pub date_added: String,
    #[serde(default)]
    pub updated_at: String,
    #[serde(default)]
    pub metadata_hash: String,
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
pub(crate) struct ReferenceHostItemsPage {
    pub items: Vec<ReferenceHostItem>,
    pub cursor: String,
    pub next_cursor: String,
    pub has_more: bool,
    pub returned: usize,
    pub limit: usize,
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

pub(crate) trait ReferenceHostPort: Send + Sync {
    fn list_items_page(&self, cursor: &str, limit: usize)
    -> Result<ReferenceHostItemsPage, String>;
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

    pub(crate) fn sidecar_index(&self, request: &Value) -> Result<Value, String> {
        let query = page_query(request, 50, 100)?;
        let include_references =
            bool_field(request, &["includeReferences", "include_references"], false)?;
        let source_filter = string_list_field(
            request,
            &["sourceRefs", "source_refs", "sourceRef", "source_ref"],
            250,
        )?;
        let repository = self.repository.owner();
        let repository = repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        let mut sources = repository.list_reference_sources()?;
        if !source_filter.is_empty() {
            let selected = source_filter.into_iter().collect::<HashSet<_>>();
            sources.retain(|source| selected.contains(&source.paper_ref));
        }
        sources.sort_by(|left, right| left.paper_ref.cmp(&right.paper_ref));
        let total = sources.len();
        let raw_references = include_references
            .then(|| repository.list_raw_references())
            .transpose()?
            .unwrap_or_default();
        let rows = sources
            .into_iter()
            .skip(query.cursor)
            .take(query.limit)
            .map(|source| {
                let mut row = json!({
                    "paper_ref":source.paper_ref,
                    "library_id":source.library_id,
                    "item_key":source.item_key,
                    "title":source.title,
                    "year":source.year,
                    "metadata_hash":source.metadata_hash,
                    "updated_at":source.updated_at,
                });
                if include_references {
                    let references = raw_references
                        .iter()
                        .filter(|reference| reference.source_ref == source.paper_ref)
                        .cloned()
                        .collect::<Vec<_>>();
                    row["references"] = serde_json::to_value(references)
                        .unwrap_or_else(|_| Value::Array(Vec::new()));
                }
                row
            })
            .collect::<Vec<_>>();
        let next = query.cursor + rows.len();
        let basis = reference_basis_hash(&repository)?;
        Ok(json!({
            "rows":rows,
            "cursor":query.cursor.to_string(),
            "next_cursor":if next < total { next.to_string() } else { String::new() },
            "has_more":next < total,
            "returned":rows.len(),
            "total":total,
            "limit":query.limit,
            "diagnostics":{
                "cache_found":total > 0,
                "storage":"sqlite",
                "stale":false,
                "warnings":if total == 0 {
                    vec!["reference index rows are missing"]
                } else {
                    Vec::<&str>::new()
                },
                "recommended_commands":if total == 0 {
                    vec!["refreshReferenceSidecarNow"]
                } else {
                    Vec::<&str>::new()
                },
                "repository_basis_hash":basis,
                "canonical_basis_hash":canonical_basis_hash(&repository)?,
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

    pub(crate) fn start_refresh(&self, request: &Value) -> Result<Value, String> {
        self.run_refresh(request, false)
    }

    pub(crate) fn refresh_now(&self) -> Result<Value, String> {
        self.run_refresh(&json!({}), false)
    }

    pub(crate) fn retry_refresh(&self) -> Result<Value, String> {
        self.run_refresh(&json!({}), true)
    }

    pub(crate) fn run_advanced_matching(&self) -> Result<Value, String> {
        self.run_matching(false)
    }

    pub(crate) fn retry_advanced_matching(&self) -> Result<Value, String> {
        self.run_matching(true)
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

    fn run_refresh(&self, request: &Value, retry: bool) -> Result<Value, String> {
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
            let requested = refresh_scope_filter(request)?;
            if !requested.is_empty() {
                items.retain(|item| requested.contains(&item.paper_ref));
            }
            if items.is_empty() {
                return Ok(json!({
                    "ok":true,
                    "status":"unchanged",
                    "operation_id":REFRESH_JOB_ID,
                    "processed_paper_refs":[],
                    "failed_paper_refs":[],
                    "retryable":false,
                }));
            }
            let host_artifacts = self.collect_host_artifacts()?;
            let artifacts = complete_artifact_manifest(&items, &host_artifacts)?;
            let expected_reference_hash = self.refresh.inspect()?.reference_hash;
            let scope = if requested.is_empty() {
                ReferenceRefreshScope::Full
            } else {
                ReferenceRefreshScope::Sources {
                    source_refs: items.iter().map(|item| item.paper_ref.clone()).collect(),
                }
            };
            let prepared = self
                .refresh
                .prepare_refresh(ReferenceRefreshPrepareRequest {
                    expected_reference_hash,
                    force: retry,
                    scope,
                    items: items.iter().map(refresh_item).collect(),
                    artifacts,
                });
            match prepared.status {
                ReferenceRefreshStatus::Unchanged => {
                    return Ok(json!({
                        "ok":true,
                        "status":"unchanged",
                        "operation_id":REFRESH_JOB_ID,
                        "processed_paper_refs":items.iter().map(|item|item.paper_ref.clone()).collect::<Vec<_>>(),
                        "failed_paper_refs":[],
                        "reference_basis_hash":prepared.reference_hash,
                        "retryable":false,
                    }));
                }
                ReferenceRefreshStatus::Prepared => {}
                status => {
                    return Ok(json!({
                        "ok":false,
                        "status":status,
                        "operation_id":REFRESH_JOB_ID,
                        "processed_paper_refs":[],
                        "failed_paper_refs":items.iter().map(|item|item.paper_ref.clone()).collect::<Vec<_>>(),
                        "retryable":true,
                    }));
                }
            }
            job.phase = "prepared".into();
            job.scope_ref = prepared.preparation_id.clone().unwrap_or_default();
            job.source_hash = prepared.input_hash.clone().unwrap_or_default();
            job.updated_at = now_string();
            self.write_job(&job)?;
            let mut payloads = Vec::with_capacity(prepared.reads.len());
            for read in &prepared.reads {
                let payload = self
                    .host
                    .read_artifact(&read.locator, &read.expected_hash)?;
                payloads.push(refresh_payload(read, payload)?);
            }
            let applied = self.refresh.apply_refresh(ReferenceRefreshApplyRequest {
                preparation_id: prepared
                    .preparation_id
                    .ok_or_else(|| "reference_refresh_preparation_missing".to_owned())?,
                payloads,
            });
            let ok = matches!(
                applied.status,
                ReferenceRefreshStatus::Promoted | ReferenceRefreshStatus::Unchanged
            );
            Ok(json!({
                "ok":ok,
                "status":applied.status,
                "operation_id":REFRESH_JOB_ID,
                "affected_source_refs":applied.affected_source_refs,
                "warnings":applied.warnings,
                "reference_basis_hash":applied.reference_hash,
                "input_hash":applied.input_hash,
                "retryable":!ok,
            }))
        })();
        self.finish_job(job, outcome)
    }

    fn run_matching(&self, retry: bool) -> Result<Value, String> {
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
            let applied = self.matching.apply(&preparation_id, &host_basis_hash);
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

    fn collect_host_items(&self) -> Result<Vec<ReferenceHostItem>, String> {
        let mut cursor = String::new();
        let mut seen = HashSet::new();
        let mut items = Vec::new();
        for _ in 0..MAX_HOST_PAGES {
            let page = self.host.list_items_page(&cursor, HOST_PAGE_LIMIT)?;
            validate_page(
                &cursor,
                &page.cursor,
                page.returned,
                page.items.len(),
                page.limit,
                page.has_more,
                &page.next_cursor,
            )?;
            if !seen.insert(page.cursor.clone()) {
                return Err("reverse_host_page_cycle".into());
            }
            items.extend(page.items);
            if items.len() > MAX_HOST_ROWS {
                return Err("reverse_host_input_too_large".into());
            }
            if !page.has_more {
                items.sort_by(|left, right| {
                    left.paper_ref
                        .cmp(&right.paper_ref)
                        .then_with(|| left.item_key.cmp(&right.item_key))
                });
                if items
                    .iter()
                    .map(|item| item.paper_ref.as_str())
                    .collect::<HashSet<_>>()
                    .len()
                    != items.len()
                {
                    return Err("reverse_host_result_invalid".into());
                }
                return Ok(items);
            }
            cursor = page.next_cursor;
        }
        Err("reverse_host_page_limit_exceeded".into())
    }

    fn collect_host_artifacts(&self) -> Result<Vec<ReferenceHostArtifact>, String> {
        let mut cursor = String::new();
        let mut seen = HashSet::new();
        let mut artifacts = Vec::new();
        for _ in 0..MAX_HOST_PAGES {
            let page = self.host.scan_artifacts_page(&cursor, HOST_PAGE_LIMIT)?;
            validate_page(
                &cursor,
                &page.cursor,
                page.returned,
                page.artifacts.len(),
                page.limit,
                page.has_more,
                &page.next_cursor,
            )?;
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
                diagnostics: artifact
                    .map(|artifact| {
                        let mut diagnostics = artifact
                            .diagnostics
                            .iter()
                            .map(|diagnostic| Value::String(diagnostic.clone()))
                            .collect::<Vec<_>>();
                        if let Some(size) = artifact.estimated_size {
                            diagnostics.push(json!({"estimatedSize":size}));
                        }
                        diagnostics
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

fn validate_page(
    requested_cursor: &str,
    returned_cursor: &str,
    returned: usize,
    actual: usize,
    limit: usize,
    has_more: bool,
    next_cursor: &str,
) -> Result<(), String> {
    if returned_cursor != requested_cursor
        || returned != actual
        || limit == 0
        || limit > HOST_PAGE_LIMIT
        || returned > limit
        || (has_more && (next_cursor.is_empty() || next_cursor == requested_cursor))
        || (!has_more && !next_cursor.is_empty())
    {
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
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::{Path, PathBuf};
    use std::sync::Mutex;
    use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
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
    }

    impl FakeHost {
        fn new() -> Self {
            Self {
                item_calls: Arc::new(AtomicUsize::new(0)),
                fail_items: Arc::new(AtomicBool::new(false)),
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

    impl ReferenceHostPort for FakeHost {
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
                "" => Ok(ReferenceHostItemsPage {
                    items: vec![Self::item("1:AAAA1111", "AAAA1111", "Paper A")],
                    cursor: String::new(),
                    next_cursor: "items:2".into(),
                    has_more: true,
                    returned: 1,
                    limit,
                }),
                "items:2" => Ok(ReferenceHostItemsPage {
                    items: vec![Self::item("1:BBBB2222", "BBBB2222", "Paper B")],
                    cursor: cursor.into(),
                    next_cursor: String::new(),
                    has_more: false,
                    returned: 1,
                    limit,
                }),
                _ => Err("reverse_host_result_invalid".into()),
            }
        }

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
                        estimated_size: Some(100),
                        diagnostics: Vec::new(),
                    },
                    ReferenceHostArtifact {
                        paper_ref: "1:BBBB2222".into(),
                        artifact_type: "references".into(),
                        payload_type: "application/json".into(),
                        status: "available".into(),
                        locator: "reference:b".into(),
                        payload_hash: "sha256:reference-b".into(),
                        estimated_size: Some(100),
                        diagnostics: Vec::new(),
                    },
                ],
                cursor: String::new(),
                next_cursor: String::new(),
                has_more: false,
                returned: 2,
                limit,
            })
        }

        fn read_artifact(
            &self,
            locator: &str,
            expected_hash: &str,
        ) -> Result<ReferenceHostArtifactRead, String> {
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
                kind: ReferenceMatchKind::Binding,
                source_canonical_reference_id: source.canonical_reference_id.clone(),
                source_raw_reference_ids: vec![source.raw_reference_id.clone()],
                target_canonical_reference_id: String::new(),
                target_library_id: target.library_id,
                target_item_key: target.item_key.clone(),
                score: 0.5,
                reasons: vec!["fixture".into()],
                evidence: Vec::new(),
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
