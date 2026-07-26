use crate::ports::ReferenceMatchingRepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    CanonicalReferenceRecord, RawReferenceRecord, ReferenceBindingFactRecord,
    ReferenceMatchProposalRecord, ReferenceMatchingPreparationRecord, ReferenceMatchingPromotion,
    ReferenceRedirectFactRecord, ReferenceReviewTransition,
};

const MAX_HOST_CANDIDATES: usize = 100_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReferenceMatchingStatus {
    Prepared,
    Promoted,
    Unchanged,
    BasisMismatch,
    ReferenceMatchingBusy,
    PreparationMissing,
    InvalidRequest,
    MatcherFailed,
    RepairRequired,
    Stopping,
    ReviewApplied,
    PartialSuccess,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReferenceMatchPass {
    LibraryBinding,
    CanonicalRedirect,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReferenceMatchKind {
    Binding,
    Redirect,
}

impl ReferenceMatchKind {
    fn as_str(self) -> &'static str {
        match self {
            Self::Binding => "zotero_binding",
            Self::Redirect => "canonical_merge",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceHostCandidate {
    pub library_id: i64,
    pub item_key: String,
    pub title: String,
    #[serde(default)]
    pub year: String,
    #[serde(default)]
    pub authors: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceMatcherInput {
    pub reference_hash: String,
    pub canonicals: Vec<CanonicalReferenceRecord>,
    pub raw_references: Vec<RawReferenceRecord>,
    pub host_candidates: Vec<ReferenceHostCandidate>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceMatcherOutcome {
    pub kind: ReferenceMatchKind,
    pub source_canonical_reference_id: String,
    #[serde(default)]
    pub source_raw_reference_ids: Vec<String>,
    #[serde(default)]
    pub target_canonical_reference_id: String,
    #[serde(default)]
    pub target_library_id: i64,
    #[serde(default)]
    pub target_item_key: String,
    pub score: f64,
    #[serde(default)]
    pub reasons: Vec<String>,
    #[serde(default)]
    pub evidence: Vec<String>,
}

pub trait ReferenceMatcherPort: Send + Sync {
    fn match_pass(
        &self,
        pass: ReferenceMatchPass,
        input: &ReferenceMatcherInput,
    ) -> Result<Vec<ReferenceMatcherOutcome>, String>;
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceMatchingInspectResult {
    pub reference_hash: Option<String>,
    pub matching_hash: Option<String>,
    pub proposal_count: i64,
    pub open_proposal_count: i64,
    pub matching_ready: bool,
    pub graph_ready: bool,
    pub related_items_ready: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceMatchingPrepareRequest {
    pub expected_reference_hash: Option<String>,
    pub host_basis_hash: String,
    pub host_candidates: Vec<ReferenceHostCandidate>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceMatchingPrepareResult {
    pub status: ReferenceMatchingStatus,
    pub preparation_id: Option<String>,
    pub reference_hash: Option<String>,
    pub repository_basis_hash: Option<String>,
    pub host_basis_hash: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceMatchingMutationResult {
    pub status: ReferenceMatchingStatus,
    pub matching_hash: Option<String>,
    pub proposal_count: usize,
    pub fact_count: usize,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceProposalPage {
    pub records: Vec<ReferenceMatchProposalRecord>,
    pub next_cursor: Option<usize>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReferenceReviewAction {
    Accept,
    Reverse,
    Reject,
    Reopen,
    Delete,
    Retarget,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceReviewDecision {
    pub proposal_id: String,
    pub action: ReferenceReviewAction,
    #[serde(default)]
    pub target_canonical_reference_id: String,
    #[serde(default)]
    pub target_library_id: i64,
    #[serde(default)]
    pub target_item_key: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceReviewItemResult {
    pub proposal_id: String,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReferenceReviewBatchResult {
    pub status: ReferenceMatchingStatus,
    pub results: Vec<ReferenceReviewItemResult>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PreparedMatcherResult {
    outcomes: Vec<ReferenceMatcherOutcome>,
}

struct AdmissionState {
    accepting: bool,
    active: bool,
}

type Clock = Arc<dyn Fn() -> String + Send + Sync>;
type IdFactory = Arc<dyn Fn() -> String + Send + Sync>;

pub struct ReferenceMatchingApplication {
    repository: Arc<dyn ReferenceMatchingRepositoryPort>,
    matcher: Arc<dyn ReferenceMatcherPort>,
    now: Clock,
    preparation_id: IdFactory,
    admission: Mutex<AdmissionState>,
    drained: Condvar,
}

struct ActiveOperation<'a>(&'a ReferenceMatchingApplication);

impl Drop for ActiveOperation<'_> {
    fn drop(&mut self) {
        if let Ok(mut state) = self.0.admission.lock() {
            state.active = false;
            self.0.drained.notify_all();
        }
    }
}

impl ReferenceMatchingApplication {
    pub fn new(
        repository: Arc<dyn ReferenceMatchingRepositoryPort>,
        matcher: Arc<dyn ReferenceMatcherPort>,
    ) -> Self {
        let sequence = Arc::new(AtomicU64::new(0));
        let id_sequence = Arc::clone(&sequence);
        Self::with_factories(
            repository,
            matcher,
            Arc::new(|| {
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis()
                    .to_string()
            }),
            Arc::new(move || {
                format!(
                    "reference-matching:{}",
                    id_sequence.fetch_add(1, Ordering::Relaxed)
                )
            }),
        )
    }

    pub fn with_factories(
        repository: Arc<dyn ReferenceMatchingRepositoryPort>,
        matcher: Arc<dyn ReferenceMatcherPort>,
        now: Clock,
        preparation_id: IdFactory,
    ) -> Self {
        Self {
            repository,
            matcher,
            now,
            preparation_id,
            admission: Mutex::new(AdmissionState {
                accepting: true,
                active: false,
            }),
            drained: Condvar::new(),
        }
    }

    pub fn inspect(&self) -> Result<ReferenceMatchingInspectResult, String> {
        let reference = self.repository.get_reference_state()?;
        let matching = self.repository.get_matching_state()?;
        Ok(ReferenceMatchingInspectResult {
            reference_hash: reference.map(|state| state.reference_hash),
            matching_hash: matching.as_ref().map(|state| state.matching_hash.clone()),
            proposal_count: matching.as_ref().map_or(0, |state| state.proposal_count),
            open_proposal_count: matching
                .as_ref()
                .map_or(0, |state| state.open_proposal_count),
            matching_ready: matching.as_ref().is_some_and(|state| state.matching_ready),
            graph_ready: matching.as_ref().is_some_and(|state| state.graph_ready),
            related_items_ready: matching
                .as_ref()
                .is_some_and(|state| state.related_items_ready),
        })
    }

    pub fn read_proposals(
        &self,
        cursor: usize,
        limit: usize,
    ) -> Result<ReferenceProposalPage, String> {
        if limit == 0 || limit > 100 {
            return Err("invalid_request".into());
        }
        let (records, has_more) = self.repository.list_proposals(cursor, limit)?;
        Ok(ReferenceProposalPage {
            next_cursor: has_more.then_some(cursor + records.len()),
            records,
        })
    }

    pub fn prepare(
        &self,
        request: ReferenceMatchingPrepareRequest,
    ) -> ReferenceMatchingPrepareResult {
        if request.host_basis_hash.is_empty()
            || request.host_candidates.len() > MAX_HOST_CANDIDATES
            || has_duplicate_host_candidates(&request.host_candidates)
        {
            return prepare_result(ReferenceMatchingStatus::InvalidRequest);
        }
        let _active = match self.enter() {
            Ok(active) => active,
            Err(status) => return prepare_result(status),
        };
        match self.repository.has_prepared_preparation() {
            Ok(true) => {
                return prepare_result(ReferenceMatchingStatus::ReferenceMatchingBusy);
            }
            Ok(false) => {}
            Err(_) => return prepare_result(ReferenceMatchingStatus::RepairRequired),
        }
        let reference = match self.repository.get_reference_state() {
            Ok(Some(state)) => state,
            Ok(None) => return prepare_result(ReferenceMatchingStatus::BasisMismatch),
            Err(_) => return prepare_result(ReferenceMatchingStatus::RepairRequired),
        };
        if request
            .expected_reference_hash
            .as_deref()
            .is_some_and(|expected| expected != reference.reference_hash)
        {
            return prepare_result(ReferenceMatchingStatus::BasisMismatch);
        }
        let raw_references = match self.repository.list_raw_references() {
            Ok(rows) => rows,
            Err(_) => return prepare_result(ReferenceMatchingStatus::RepairRequired),
        };
        let canonicals = match self.repository.list_canonicals() {
            Ok(rows) => rows,
            Err(_) => return prepare_result(ReferenceMatchingStatus::RepairRequired),
        };
        let bindings = match self.repository.list_bindings() {
            Ok(rows) => rows,
            Err(_) => return prepare_result(ReferenceMatchingStatus::RepairRequired),
        };
        let redirects = match self.repository.list_redirects() {
            Ok(rows) => rows,
            Err(_) => return prepare_result(ReferenceMatchingStatus::RepairRequired),
        };
        let repository_basis_hash = match hash_serializable(&json!({
            "referenceHash": reference.reference_hash,
            "rawReferences": raw_references,
            "canonicals": canonicals,
            "bindings": bindings,
            "redirects": redirects,
        })) {
            Ok(hash) => hash,
            Err(_) => return prepare_result(ReferenceMatchingStatus::RepairRequired),
        };
        let input = ReferenceMatcherInput {
            reference_hash: reference.reference_hash.clone(),
            canonicals,
            raw_references,
            host_candidates: request.host_candidates,
        };
        let mut outcomes = match self
            .matcher
            .match_pass(ReferenceMatchPass::LibraryBinding, &input)
        {
            Ok(outcomes) => outcomes,
            Err(_) => return prepare_result(ReferenceMatchingStatus::MatcherFailed),
        };
        match self
            .matcher
            .match_pass(ReferenceMatchPass::CanonicalRedirect, &input)
        {
            Ok(second_pass) => outcomes.extend(second_pass),
            Err(_) => return prepare_result(ReferenceMatchingStatus::MatcherFailed),
        }
        if !self.is_accepting() {
            return prepare_result(ReferenceMatchingStatus::Stopping);
        }
        if validate_outcomes(&outcomes).is_err() {
            return prepare_result(ReferenceMatchingStatus::MatcherFailed);
        }
        outcomes.sort_by(|left, right| outcome_key(left).cmp(&outcome_key(right)));
        outcomes.dedup_by(|left, right| outcome_key(left) == outcome_key(right));
        let preparation_id = (self.preparation_id)();
        let now = (self.now)();
        let diagnostics_json = match serde_json::to_string(&PreparedMatcherResult { outcomes }) {
            Ok(value) => value,
            Err(_) => return prepare_result(ReferenceMatchingStatus::RepairRequired),
        };
        let preparation = ReferenceMatchingPreparationRecord {
            preparation_id: preparation_id.clone(),
            reference_hash: reference.reference_hash.clone(),
            repository_basis_hash: repository_basis_hash.clone(),
            host_basis_hash: request.host_basis_hash.clone(),
            status: "prepared".into(),
            diagnostics_json,
            created_at: now.clone(),
            updated_at: now,
        };
        if self.repository.upsert_preparation(&preparation).is_err() {
            return prepare_result(ReferenceMatchingStatus::RepairRequired);
        }
        ReferenceMatchingPrepareResult {
            status: ReferenceMatchingStatus::Prepared,
            preparation_id: Some(preparation_id),
            reference_hash: Some(reference.reference_hash),
            repository_basis_hash: Some(repository_basis_hash),
            host_basis_hash: Some(request.host_basis_hash),
        }
    }

    pub fn apply(
        &self,
        preparation_id: &str,
        current_host_basis_hash: &str,
    ) -> ReferenceMatchingMutationResult {
        let _active = match self.enter() {
            Ok(active) => active,
            Err(status) => return mutation_result(status),
        };
        let preparation = match self.repository.get_preparation(preparation_id) {
            Ok(Some(row)) if row.status == "prepared" => row,
            Ok(_) => return mutation_result(ReferenceMatchingStatus::PreparationMissing),
            Err(_) => return mutation_result(ReferenceMatchingStatus::RepairRequired),
        };
        if preparation.host_basis_hash != current_host_basis_hash {
            let _ = self.repository.delete_preparation(preparation_id);
            return mutation_result(ReferenceMatchingStatus::BasisMismatch);
        }
        let current_basis = match self.repository_basis_hash() {
            Ok(hash) => hash,
            Err(_) => {
                let _ = self.repository.delete_preparation(preparation_id);
                return mutation_result(ReferenceMatchingStatus::RepairRequired);
            }
        };
        if current_basis != preparation.repository_basis_hash {
            let _ = self.repository.delete_preparation(preparation_id);
            return mutation_result(ReferenceMatchingStatus::BasisMismatch);
        }
        let prepared: PreparedMatcherResult =
            match serde_json::from_str(&preparation.diagnostics_json) {
                Ok(value) => value,
                Err(_) => {
                    let _ = self.repository.delete_preparation(preparation_id);
                    return mutation_result(ReferenceMatchingStatus::RepairRequired);
                }
            };
        let now = (self.now)();
        let projection = match self.project_matching(&preparation, prepared.outcomes, &now) {
            Ok(projection) => projection,
            Err(_) => {
                let _ = self.repository.delete_preparation(preparation_id);
                return mutation_result(ReferenceMatchingStatus::RepairRequired);
            }
        };
        let proposal_count = projection.proposals.len();
        let fact_count = projection.bindings.len() + projection.redirects.len();
        let matching_hash = projection.matching_hash.clone();
        match self.repository.promote(preparation_id, &projection) {
            Ok(true) => ReferenceMatchingMutationResult {
                status: ReferenceMatchingStatus::Promoted,
                matching_hash: Some(matching_hash),
                proposal_count,
                fact_count,
                warnings: Vec::new(),
            },
            Ok(false) => {
                let _ = self.repository.delete_preparation(preparation_id);
                mutation_result(ReferenceMatchingStatus::BasisMismatch)
            }
            Err(_) => {
                let _ = self.repository.delete_preparation(preparation_id);
                mutation_result(ReferenceMatchingStatus::RepairRequired)
            }
        }
    }

    pub fn review(&self, decisions: &[ReferenceReviewDecision]) -> ReferenceReviewBatchResult {
        if decisions.is_empty() {
            return ReferenceReviewBatchResult {
                status: ReferenceMatchingStatus::InvalidRequest,
                results: Vec::new(),
            };
        }
        let _active = match self.enter() {
            Ok(active) => active,
            Err(status) => {
                return ReferenceReviewBatchResult {
                    status,
                    results: Vec::new(),
                };
            }
        };
        match self.repository.has_prepared_preparation() {
            Ok(true) => {
                return ReferenceReviewBatchResult {
                    status: ReferenceMatchingStatus::ReferenceMatchingBusy,
                    results: Vec::new(),
                };
            }
            Ok(false) => {}
            Err(_) => {
                return ReferenceReviewBatchResult {
                    status: ReferenceMatchingStatus::RepairRequired,
                    results: Vec::new(),
                };
            }
        }
        let now = (self.now)();
        let mut results = Vec::with_capacity(decisions.len());
        let mut successes = 0;
        for decision in decisions {
            let status = match self.review_one(decision, &now) {
                Ok(true) => {
                    successes += 1;
                    "applied"
                }
                Ok(false) => "not_found",
                Err("not_found") => "not_found",
                Err("invalid_request") => "invalid_request",
                Err(_) => "failed",
            };
            results.push(ReferenceReviewItemResult {
                proposal_id: decision.proposal_id.clone(),
                status: status.into(),
            });
        }
        let status = if successes == decisions.len() {
            ReferenceMatchingStatus::ReviewApplied
        } else {
            ReferenceMatchingStatus::PartialSuccess
        };
        ReferenceReviewBatchResult { status, results }
    }

    pub fn discard_preparation(&self, preparation_id: &str) -> ReferenceMatchingMutationResult {
        match self.repository.get_preparation(preparation_id) {
            Ok(Some(row)) if row.status == "prepared" => {
                match self.repository.delete_preparation(preparation_id) {
                    Ok(()) => mutation_result(ReferenceMatchingStatus::Unchanged),
                    Err(_) => mutation_result(ReferenceMatchingStatus::RepairRequired),
                }
            }
            Ok(_) => mutation_result(ReferenceMatchingStatus::PreparationMissing),
            Err(_) => mutation_result(ReferenceMatchingStatus::RepairRequired),
        }
    }

    pub fn stop_admission(&self) {
        let discard = if let Ok(mut state) = self.admission.lock() {
            state.accepting = false;
            !state.active
        } else {
            false
        };
        if discard {
            let _ = self.repository.delete_prepared_preparations();
        }
    }

    pub fn shutdown(&self, timeout: Duration) -> bool {
        self.stop_admission();
        let state = match self.admission.lock() {
            Ok(state) => state,
            Err(_) => return false,
        };
        if !state.active {
            let _ = self.repository.delete_prepared_preparations();
            return true;
        }
        let drained = self
            .drained
            .wait_timeout_while(state, timeout, |state| state.active)
            .map(|(state, _)| !state.active)
            .unwrap_or(false);
        if drained {
            let _ = self.repository.delete_prepared_preparations();
        }
        drained
    }

    fn enter(&self) -> Result<ActiveOperation<'_>, ReferenceMatchingStatus> {
        let mut state = self
            .admission
            .lock()
            .map_err(|_| ReferenceMatchingStatus::RepairRequired)?;
        if !state.accepting {
            return Err(ReferenceMatchingStatus::Stopping);
        }
        if state.active {
            return Err(ReferenceMatchingStatus::ReferenceMatchingBusy);
        }
        state.active = true;
        Ok(ActiveOperation(self))
    }

    fn is_accepting(&self) -> bool {
        self.admission
            .lock()
            .map(|state| state.accepting)
            .unwrap_or(false)
    }

    fn repository_basis_hash(&self) -> Result<String, String> {
        let reference = self
            .repository
            .get_reference_state()?
            .ok_or_else(|| "basis_mismatch".to_owned())?;
        hash_serializable(&json!({
            "referenceHash": reference.reference_hash,
            "rawReferences": self.repository.list_raw_references()?,
            "canonicals": self.repository.list_canonicals()?,
            "bindings": self.repository.list_bindings()?,
            "redirects": self.repository.list_redirects()?,
        }))
    }

    fn project_matching(
        &self,
        preparation: &ReferenceMatchingPreparationRecord,
        outcomes: Vec<ReferenceMatcherOutcome>,
        now: &str,
    ) -> Result<ReferenceMatchingPromotion, String> {
        let mut proposals = Vec::new();
        let mut bindings = Vec::new();
        let mut redirects = Vec::new();
        for outcome in outcomes {
            let source_hash = hash_serializable(&outcome)?;
            let basis_hash = preparation.repository_basis_hash.clone();
            if self
                .repository
                .was_rejected(outcome.kind.as_str(), &basis_hash, &source_hash)?
            {
                continue;
            }
            let confidence = confidence(outcome.score);
            let proposal_id = stable_id(
                "proposal",
                &json!({
                    "kind": outcome.kind,
                    "basisHash": basis_hash,
                    "sourceHash": source_hash,
                }),
            )?;
            let auto_accept = outcome.score
                >= match outcome.kind {
                    ReferenceMatchKind::Binding => 0.95,
                    ReferenceMatchKind::Redirect => 0.98,
                };
            let proposal = proposal_record(
                &proposal_id,
                if auto_accept { "accepted" } else { "open" },
                &outcome,
                confidence,
                &basis_hash,
                &source_hash,
                now,
            )?;
            if auto_accept {
                match outcome.kind {
                    ReferenceMatchKind::Binding => bindings.push(binding_from_proposal(
                        &proposal,
                        "reference-matching-application",
                        now,
                    )?),
                    ReferenceMatchKind::Redirect => {
                        redirects.push(redirect_from_proposal(&proposal, now)?)
                    }
                }
            } else {
                proposals.push(proposal);
            }
        }
        let matching_hash = hash_serializable(&json!({
            "proposals": proposals,
            "bindings": bindings,
            "redirects": redirects,
        }))?;
        Ok(ReferenceMatchingPromotion {
            expected_reference_hash: preparation.reference_hash.clone(),
            expected_repository_basis_hash: preparation.repository_basis_hash.clone(),
            matching_hash,
            graph_facts_changed: !bindings.is_empty() || !redirects.is_empty(),
            proposals,
            bindings,
            redirects,
            updated_at: now.into(),
        })
    }

    fn review_one(
        &self,
        decision: &ReferenceReviewDecision,
        now: &str,
    ) -> Result<bool, &'static str> {
        if decision.proposal_id.is_empty() {
            return Err("invalid_request");
        }
        let mut proposal = self
            .repository
            .get_proposal(&decision.proposal_id)
            .map_err(|_| "failed")?
            .ok_or("not_found")?;
        let mut transition = ReferenceReviewTransition {
            proposal: proposal.clone(),
            updated_at: now.into(),
            ..ReferenceReviewTransition::default()
        };
        let revoke_facts = proposal.status == "accepted"
            && matches!(
                decision.action,
                ReferenceReviewAction::Reverse
                    | ReferenceReviewAction::Reject
                    | ReferenceReviewAction::Reopen
                    | ReferenceReviewAction::Delete
                    | ReferenceReviewAction::Retarget
            );
        if revoke_facts {
            if proposal.kind == "zotero_binding" {
                transition.revoke_binding_id = stable_id(
                    "binding",
                    &json!({
                        "canonicalReferenceId": proposal.source_canonical_reference_id,
                        "libraryId": proposal.target_library_id,
                        "itemKey": proposal.target_item_key,
                    }),
                )
                .map_err(|_| "failed")?;
            } else if proposal.kind == "canonical_merge" {
                transition
                    .revoke_redirect_source_ids
                    .push(proposal.source_canonical_reference_id.clone());
            }
        }
        let mut accepted = None;
        match decision.action {
            ReferenceReviewAction::Accept => {
                proposal.status = "accepted".into();
                accepted = Some(proposal.clone());
            }
            ReferenceReviewAction::Reverse => {
                if proposal.kind != "canonical_merge"
                    || proposal.target_canonical_reference_id.is_empty()
                {
                    return Err("invalid_request");
                }
                proposal.status = "superseded".into();
                let mut audit = proposal.clone();
                audit.proposal_id = stable_id(
                    "proposal",
                    &json!({
                        "kind": audit.kind,
                        "source": proposal.target_canonical_reference_id,
                        "target": proposal.source_canonical_reference_id,
                        "originalProposalId": proposal.proposal_id,
                    }),
                )
                .map_err(|_| "failed")?;
                audit.source_canonical_reference_id =
                    proposal.target_canonical_reference_id.clone();
                audit.target_canonical_reference_id =
                    proposal.source_canonical_reference_id.clone();
                audit.status = "accepted".into();
                audit.confidence = "manual".into();
                audit.score = 1.0;
                audit.reasons_json = "[\"reverse_accept\"]".into();
                audit.created_at = now.into();
                audit.updated_at = now.into();
                transition.audit_proposals.push(audit.clone());
                accepted = Some(audit);
            }
            ReferenceReviewAction::Reject => proposal.status = "rejected".into(),
            ReferenceReviewAction::Reopen => proposal.status = "open".into(),
            ReferenceReviewAction::Delete => proposal.status = "superseded".into(),
            ReferenceReviewAction::Retarget => {
                let mut audit = proposal.clone();
                if proposal.kind == "zotero_binding" {
                    if decision.target_library_id <= 0 || decision.target_item_key.is_empty() {
                        return Err("invalid_request");
                    }
                    audit.target_library_id = decision.target_library_id;
                    audit.target_item_key = decision.target_item_key.clone();
                } else {
                    if decision.target_canonical_reference_id.is_empty() {
                        return Err("invalid_request");
                    }
                    audit.target_canonical_reference_id =
                        decision.target_canonical_reference_id.clone();
                }
                proposal.status = "superseded".into();
                audit.proposal_id = stable_id(
                    "proposal",
                    &json!({
                        "kind": audit.kind,
                        "source": audit.source_canonical_reference_id,
                        "targetCanonicalReferenceId": audit.target_canonical_reference_id,
                        "targetLibraryId": audit.target_library_id,
                        "targetItemKey": audit.target_item_key,
                        "originalProposalId": proposal.proposal_id,
                    }),
                )
                .map_err(|_| "failed")?;
                audit.status = "accepted".into();
                audit.confidence = "manual".into();
                audit.score = 1.0;
                audit.reasons_json = "[\"manual_target\"]".into();
                audit.created_at = now.into();
                audit.updated_at = now.into();
                transition.audit_proposals.push(audit.clone());
                accepted = Some(audit);
            }
        }
        proposal.updated_at = now.into();
        if let Some(accepted) = accepted {
            if accepted.kind == "zotero_binding" {
                transition.binding =
                    Some(binding_from_proposal(&accepted, "reviewer", now).map_err(|_| "failed")?);
            } else if accepted.kind == "canonical_merge" {
                transition
                    .redirects
                    .push(redirect_from_proposal(&accepted, now).map_err(|_| "failed")?);
            } else {
                return Err("invalid_request");
            }
        }
        transition.graph_facts_changed =
            revoke_facts || transition.binding.is_some() || !transition.redirects.is_empty();
        transition.proposal = proposal;
        self.repository
            .apply_review(&transition)
            .map_err(|_| "failed")
    }
}

fn prepare_result(status: ReferenceMatchingStatus) -> ReferenceMatchingPrepareResult {
    ReferenceMatchingPrepareResult {
        status,
        preparation_id: None,
        reference_hash: None,
        repository_basis_hash: None,
        host_basis_hash: None,
    }
}

fn mutation_result(status: ReferenceMatchingStatus) -> ReferenceMatchingMutationResult {
    ReferenceMatchingMutationResult {
        status,
        matching_hash: None,
        proposal_count: 0,
        fact_count: 0,
        warnings: Vec::new(),
    }
}

fn has_duplicate_host_candidates(candidates: &[ReferenceHostCandidate]) -> bool {
    let mut keys = candidates
        .iter()
        .map(|candidate| (candidate.library_id, candidate.item_key.as_str()))
        .collect::<Vec<_>>();
    keys.sort_unstable();
    keys.windows(2).any(|pair| pair[0] == pair[1])
}

fn validate_outcomes(outcomes: &[ReferenceMatcherOutcome]) -> Result<(), String> {
    for outcome in outcomes {
        if outcome.source_canonical_reference_id.is_empty()
            || !outcome.score.is_finite()
            || !(0.0..=1.0).contains(&outcome.score)
            || (outcome.kind == ReferenceMatchKind::Binding
                && (outcome.target_library_id <= 0 || outcome.target_item_key.is_empty()))
            || (outcome.kind == ReferenceMatchKind::Redirect
                && (outcome.target_canonical_reference_id.is_empty()
                    || outcome.target_canonical_reference_id
                        == outcome.source_canonical_reference_id))
        {
            return Err("matcher_result_invalid".into());
        }
    }
    Ok(())
}

fn outcome_key(outcome: &ReferenceMatcherOutcome) -> (u8, &str, &str, i64, &str) {
    (
        match outcome.kind {
            ReferenceMatchKind::Binding => 0,
            ReferenceMatchKind::Redirect => 1,
        },
        &outcome.source_canonical_reference_id,
        &outcome.target_canonical_reference_id,
        outcome.target_library_id,
        &outcome.target_item_key,
    )
}

fn confidence(score: f64) -> &'static str {
    if score >= 0.95 {
        "high"
    } else if score >= 0.75 {
        "medium"
    } else {
        "low"
    }
}

fn proposal_record(
    proposal_id: &str,
    status: &str,
    outcome: &ReferenceMatcherOutcome,
    confidence: &str,
    basis_hash: &str,
    source_hash: &str,
    now: &str,
) -> Result<ReferenceMatchProposalRecord, String> {
    Ok(ReferenceMatchProposalRecord {
        proposal_id: proposal_id.into(),
        kind: outcome.kind.as_str().into(),
        status: status.into(),
        source_canonical_reference_id: outcome.source_canonical_reference_id.clone(),
        source_raw_reference_ids_json: serde_json::to_string(&outcome.source_raw_reference_ids)
            .map_err(|error| error.to_string())?,
        target_canonical_reference_id: outcome.target_canonical_reference_id.clone(),
        target_library_id: outcome.target_library_id,
        target_item_key: outcome.target_item_key.clone(),
        confidence: confidence.into(),
        score: outcome.score,
        reasons_json: serde_json::to_string(&outcome.reasons).map_err(|error| error.to_string())?,
        evidence_json: serde_json::to_string(&outcome.evidence)
            .map_err(|error| error.to_string())?,
        diagnostics_json: "[]".into(),
        basis_hash: basis_hash.into(),
        source_hash: source_hash.into(),
        created_at: now.into(),
        updated_at: now.into(),
    })
}

fn binding_from_proposal(
    proposal: &ReferenceMatchProposalRecord,
    reviewer: &str,
    now: &str,
) -> Result<ReferenceBindingFactRecord, String> {
    Ok(ReferenceBindingFactRecord {
        binding_id: stable_id(
            "binding",
            &json!({
                "canonicalReferenceId": proposal.source_canonical_reference_id,
                "libraryId": proposal.target_library_id,
                "itemKey": proposal.target_item_key,
            }),
        )?,
        canonical_reference_id: proposal.source_canonical_reference_id.clone(),
        library_id: proposal.target_library_id,
        item_key: proposal.target_item_key.clone(),
        status: "accepted".into(),
        confidence: proposal.confidence.clone(),
        reviewer: reviewer.into(),
        basis_hash: proposal.basis_hash.clone(),
        diagnostics_json: "[]".into(),
        created_at: now.into(),
        updated_at: now.into(),
    })
}

fn redirect_from_proposal(
    proposal: &ReferenceMatchProposalRecord,
    now: &str,
) -> Result<ReferenceRedirectFactRecord, String> {
    if proposal.target_canonical_reference_id.is_empty() {
        return Err("proposal_target_missing".into());
    }
    Ok(ReferenceRedirectFactRecord {
        from_canonical_reference_id: proposal.source_canonical_reference_id.clone(),
        to_canonical_reference_id: proposal.target_canonical_reference_id.clone(),
        reason: "reference_matching".into(),
        diagnostics_json: "[]".into(),
        created_at: now.into(),
        updated_at: now.into(),
    })
}

fn stable_id(prefix: &str, value: &Value) -> Result<String, String> {
    let hash = canonical_json_hash(value)?;
    let digest = hash.strip_prefix("sha256:").unwrap_or(&hash);
    Ok(format!("{prefix}:{}", &digest[..24.min(digest.len())]))
}

fn hash_serializable<T: Serialize>(value: &T) -> Result<String, String> {
    serde_json::to_value(value)
        .map_err(|error| error.to_string())
        .and_then(|value| canonical_json_hash(&value))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::RepositoryPort;
    use std::path::PathBuf;
    use std::sync::atomic::AtomicUsize;
    use synthesis_repository::{
        ReferenceProjectionReplacement, ReferenceProjectionScope, Repository, RepositoryIdentity,
    };

    struct FixtureMatcher {
        calls: Arc<AtomicUsize>,
    }

    impl ReferenceMatcherPort for FixtureMatcher {
        fn match_pass(
            &self,
            pass: ReferenceMatchPass,
            _input: &ReferenceMatcherInput,
        ) -> Result<Vec<ReferenceMatcherOutcome>, String> {
            self.calls.fetch_add(1, Ordering::Relaxed);
            Ok(match pass {
                ReferenceMatchPass::LibraryBinding => vec![ReferenceMatcherOutcome {
                    kind: ReferenceMatchKind::Binding,
                    source_canonical_reference_id: "canonical:1".into(),
                    source_raw_reference_ids: vec!["raw:1".into()],
                    target_canonical_reference_id: String::new(),
                    target_library_id: 1,
                    target_item_key: "TARGET".into(),
                    score: 0.9,
                    reasons: vec!["title".into()],
                    evidence: Vec::new(),
                }],
                ReferenceMatchPass::CanonicalRedirect => Vec::new(),
            })
        }
    }

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-reference-matching-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
    }

    fn seed(repository: &mut Repository) {
        repository
            .replace_reference_projection(&ReferenceProjectionReplacement {
                expected_reference_hash: None,
                reference_hash: "sha256:reference".into(),
                input_hash: "sha256:input".into(),
                scope: ReferenceProjectionScope::Full,
                source_refs: vec!["1:A".into()],
                replace_reference_source_refs: vec!["1:A".into()],
                raw_references: vec![RawReferenceRecord {
                    raw_reference_id: "raw:1".into(),
                    source_ref: "1:A".into(),
                    references_artifact_hash: "sha256:artifact".into(),
                    raw_hash: "sha256:raw".into(),
                    parsed_title: "Target".into(),
                    normalized_title: "target".into(),
                    raw_reference: "{}".into(),
                    canonical_reference_id: "canonical:1".into(),
                    status: "active".into(),
                    roles_json: "[]".into(),
                    diagnostics_json: "[]".into(),
                    created_at: "2026-07-26T00:00:00.000Z".into(),
                    updated_at: "2026-07-26T00:00:00.000Z".into(),
                    ..RawReferenceRecord::default()
                }],
                canonicals: vec![CanonicalReferenceRecord {
                    canonical_reference_id: "canonical:1".into(),
                    title: "Target".into(),
                    normalized_title: "target".into(),
                    authors_json: "[]".into(),
                    identifiers_json: "{}".into(),
                    metadata_hash: "sha256:metadata".into(),
                    status: "active".into(),
                    created_at: "2026-07-26T00:00:00.000Z".into(),
                    updated_at: "2026-07-26T00:00:00.000Z".into(),
                    ..CanonicalReferenceRecord::default()
                }],
                now: "2026-07-26T00:00:00.000Z".into(),
                ..ReferenceProjectionReplacement::default()
            })
            .expect("seed projection");
    }

    #[test]
    fn runs_two_passes_applies_once_reviews_partially_and_revokes_fact() {
        let root = root();
        let mut repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("open repository");
        seed(&mut repository);
        let owner = Arc::new(Mutex::new(repository));
        let calls = Arc::new(AtomicUsize::new(0));
        let application = ReferenceMatchingApplication::with_factories(
            Arc::new(RepositoryPort::new(Arc::clone(&owner))),
            Arc::new(FixtureMatcher {
                calls: Arc::clone(&calls),
            }),
            Arc::new(|| "2026-07-26T00:00:00.000Z".into()),
            Arc::new(|| "matching:1".into()),
        );
        let prepared = application.prepare(ReferenceMatchingPrepareRequest {
            expected_reference_hash: Some("sha256:reference".into()),
            host_basis_hash: "sha256:host".into(),
            host_candidates: vec![ReferenceHostCandidate {
                library_id: 1,
                item_key: "TARGET".into(),
                title: "Target".into(),
                year: "2024".into(),
                authors: Vec::new(),
            }],
        });
        assert_eq!(prepared.status, ReferenceMatchingStatus::Prepared);
        assert_eq!(calls.load(Ordering::Relaxed), 2);
        let preparation_id = prepared.preparation_id.expect("preparation id");
        assert_eq!(
            application.apply(&preparation_id, "sha256:stale").status,
            ReferenceMatchingStatus::BasisMismatch
        );
        assert_eq!(
            application.apply(&preparation_id, "sha256:host").status,
            ReferenceMatchingStatus::PreparationMissing
        );
        let prepared = application.prepare(ReferenceMatchingPrepareRequest {
            expected_reference_hash: Some("sha256:reference".into()),
            host_basis_hash: "sha256:host".into(),
            host_candidates: vec![ReferenceHostCandidate {
                library_id: 1,
                item_key: "TARGET".into(),
                title: "Target".into(),
                year: "2024".into(),
                authors: Vec::new(),
            }],
        });
        let preparation_id = prepared.preparation_id.expect("preparation id");
        let promoted = application.apply(&preparation_id, "sha256:host");
        assert_eq!(promoted.status, ReferenceMatchingStatus::Promoted);
        assert_eq!(
            application.apply(&preparation_id, "sha256:host").status,
            ReferenceMatchingStatus::PreparationMissing
        );
        let proposal = application
            .read_proposals(0, 10)
            .expect("proposals")
            .records
            .into_iter()
            .next()
            .expect("proposal");
        let accepted = application.review(&[ReferenceReviewDecision {
            proposal_id: proposal.proposal_id.clone(),
            action: ReferenceReviewAction::Accept,
            target_canonical_reference_id: String::new(),
            target_library_id: 0,
            target_item_key: String::new(),
        }]);
        assert_eq!(accepted.status, ReferenceMatchingStatus::ReviewApplied);
        assert_eq!(
            owner
                .lock()
                .expect("repository")
                .list_reference_bindings()
                .expect("bindings")
                .len(),
            1
        );
        let partial = application.review(&[
            ReferenceReviewDecision {
                proposal_id: proposal.proposal_id,
                action: ReferenceReviewAction::Reject,
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
        ]);
        assert_eq!(partial.status, ReferenceMatchingStatus::PartialSuccess);
        assert!(
            owner
                .lock()
                .expect("repository")
                .list_reference_bindings()
                .expect("bindings")
                .is_empty()
        );
        assert!(application.shutdown(Duration::from_secs(1)));
        let _ = std::fs::remove_dir_all(root);
    }
}
