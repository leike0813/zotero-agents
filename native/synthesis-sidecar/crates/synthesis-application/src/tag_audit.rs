use crate::RepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;
use std::sync::Arc;
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    TagAuditAppendOutcome, TagAuditRunRecord, TagAuditSnapshotRecord, TagAuditStagingRecord,
    TagRegulationAcknowledgementPrepareOutcome, TagRegulationCommitOutcome,
    TagRegulationVerifiedCommitRecord,
};

pub const TAG_AUDIT_APPEND_MAX_ROWS: usize = 500;
pub const TAG_AUDIT_ROW_MAX_TAGS: usize = 100;
pub const TAG_AUDIT_CONFLICT_SAMPLE_MAX: usize = 100;
const TAG_AUDIT_CONTRACT_VERSION: &str = "zotero-agents.tag-audit.v1";

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditItemRef {
    pub library_id: i64,
    pub item_key: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditExecutionPrincipal {
    pub package_id: String,
    pub workflow_id: String,
    pub content_digest: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditExecutionIdentity {
    pub host_instance_id: String,
    pub principal: TagAuditExecutionPrincipal,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditRunBeginRequest {
    pub library_id: i64,
    pub vocabulary_hash: String,
    pub execution_identity: TagAuditExecutionIdentity,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditRunHandle {
    pub audit_run_id: String,
    pub lease_token: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "state", rename_all = "snake_case", deny_unknown_fields)]
pub enum TagAuditEvaluation {
    Compliant,
    NeedsRegulation {
        #[serde(rename = "nonCompliantTags")]
        non_compliant_tags: Vec<String>,
    },
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditStagingEntry {
    pub target: TagAuditItemRef,
    pub audited_revision: String,
    pub audited_tag_digest: String,
    pub audited_tags: Vec<String>,
    pub evaluation: TagAuditEvaluation,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditRunAppendRequest {
    pub run: TagAuditRunHandle,
    pub sequence: i64,
    pub batch_digest: String,
    pub entries: Vec<TagAuditStagingEntry>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditRunPromoteRequest {
    pub run: TagAuditRunHandle,
    pub visited_items: usize,
    pub coverage_digest: String,
    pub evidence_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditRunAbortRequest {
    pub run: TagAuditRunHandle,
    pub reason: TagAuditAbortReason,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TagAuditAbortReason {
    Canceled,
    ResourceLimited,
    Conflicted,
    Failed,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "outcome", rename_all = "snake_case")]
pub enum TagAuditRunAbortResult {
    Aborted,
    AlreadyTerminal,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagRegulationAcknowledgementPrepareRequest {
    pub target: TagAuditItemRef,
    pub receipt_id: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "outcome", rename_all = "snake_case")]
pub enum TagRegulationAcknowledgementPrepareResult {
    Ready {
        target: TagAuditItemRef,
        snapshot_revision: String,
        audited_revision: String,
        vocabulary_hash: String,
        non_compliant_tags: Vec<String>,
    },
    AlreadyAcknowledged {
        snapshot_revision: String,
    },
    NotFound,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagRegulationVerifiedCommit {
    pub schema: String,
    pub target: TagAuditItemRef,
    pub receipt_id: String,
    pub expected_snapshot_revision: String,
    pub audited_revision: String,
    pub current_revision: String,
    pub final_tag_digest: String,
    pub final_tags: Vec<String>,
    pub vocabulary_hash: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "outcome", rename_all = "snake_case")]
pub enum TagRegulationAcknowledgementResult {
    Acknowledged {
        snapshot_revision: String,
        remaining_needs_regulation: i64,
    },
    AlreadyAcknowledged {
        snapshot_revision: String,
    },
    Stale {
        reason: &'static str,
    },
    Conflict {
        reason: &'static str,
    },
    NotFound,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditFreshState {
    pub target: TagAuditItemRef,
    pub revision: String,
    pub tag_digest: String,
}

pub trait TagAuditFreshStatePort: Send + Sync {
    fn read(&self, targets: &[TagAuditItemRef]) -> Result<Vec<TagAuditFreshState>, String>;
}

pub trait TagAuditRuntimePort: Send + Sync {
    fn now(&self) -> String;
    fn opaque_id(&self, kind: &str) -> String;
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditSnapshotSummary {
    pub schema: String,
    pub library_id: i64,
    pub snapshot_revision: String,
    pub vocabulary_hash: String,
    pub basis_digest: String,
    pub coverage_digest: String,
    pub audited_items: i64,
    pub needs_regulation: i64,
    pub published_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditConflict {
    pub target: TagAuditItemRef,
    pub audited_revision: String,
    pub current_revision: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "outcome", rename_all = "snake_case", deny_unknown_fields)]
pub enum TagAuditRunResult {
    Published {
        snapshot: TagAuditSnapshotSummary,
    },
    Conflicted {
        audited_items: usize,
        conflict_count: usize,
        conflicts: Vec<TagAuditConflict>,
        retryable: bool,
    },
}

pub struct TagAuditApplication {
    repository: Arc<RepositoryPort>,
    fresh_state: Arc<dyn TagAuditFreshStatePort>,
    runtime: Arc<dyn TagAuditRuntimePort>,
}

impl TagAuditApplication {
    pub fn new(
        repository: Arc<RepositoryPort>,
        fresh_state: Arc<dyn TagAuditFreshStatePort>,
        runtime: Arc<dyn TagAuditRuntimePort>,
    ) -> Self {
        Self {
            repository,
            fresh_state,
            runtime,
        }
    }

    pub fn begin(&self, request: &TagAuditRunBeginRequest) -> Result<TagAuditRunHandle, String> {
        if request.library_id <= 0
            || request.vocabulary_hash.is_empty()
            || request.execution_identity.host_instance_id.is_empty()
            || request.execution_identity.principal.package_id.is_empty()
            || request.execution_identity.principal.workflow_id.is_empty()
            || request
                .execution_identity
                .principal
                .content_digest
                .is_empty()
        {
            return Err("invalid_request".into());
        }
        let vocabulary_hash = self.repository.with_reader(|repository| {
            Ok(repository
                .get_tag_application_state()?
                .map(|state| state.vocabulary_hash)
                .unwrap_or_default())
        })?;
        if vocabulary_hash != request.vocabulary_hash {
            return Err("tag_audit_vocabulary_conflict".into());
        }
        let basis_digest = canonical_json_hash(&json!({
            "libraryId": request.library_id,
            "vocabularyHash": request.vocabulary_hash,
            "packageId": request.execution_identity.principal.package_id,
            "workflowId": request.execution_identity.principal.workflow_id,
            "contentDigest": request.execution_identity.principal.content_digest,
            "contractVersion": TAG_AUDIT_CONTRACT_VERSION,
        }))?;
        let handle = TagAuditRunHandle {
            audit_run_id: self.runtime.opaque_id("tag-audit-run"),
            lease_token: self.runtime.opaque_id("tag-audit-lease"),
        };
        let now = self.runtime.now();
        let record = TagAuditRunRecord {
            audit_run_id: handle.audit_run_id.clone(),
            library_id: request.library_id,
            status: "open".into(),
            lease_token: handle.lease_token.clone(),
            host_instance_id: request.execution_identity.host_instance_id.clone(),
            package_id: request.execution_identity.principal.package_id.clone(),
            workflow_id: request.execution_identity.principal.workflow_id.clone(),
            content_digest: request.execution_identity.principal.content_digest.clone(),
            vocabulary_hash: request.vocabulary_hash.clone(),
            basis_digest,
            created_at: now.clone(),
            updated_at: now,
        };
        let owner = self.repository.owner();
        let mut repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        repository.abandon_tag_audit_runs_for_other_hosts(
            request.library_id,
            &request.execution_identity.host_instance_id,
            &record.updated_at,
        )?;
        let created = repository.begin_tag_audit_run(&record)?;
        if !created {
            return Err("tag_audit_operation_in_progress".into());
        }
        Ok(handle)
    }

    pub fn append(
        &self,
        request: &TagAuditRunAppendRequest,
    ) -> Result<TagAuditAppendOutcome, String> {
        let records = validate_entries(&request.run.audit_run_id, &request.entries)?;
        let digest = canonical_json_hash(
            &serde_json::to_value(&request.entries).map_err(|_| "invalid_request")?,
        )?;
        if digest != request.batch_digest {
            return Err("tag_audit_batch_digest_mismatch".into());
        }
        self.repository
            .owner()
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .append_tag_audit_batch(
                &request.run.audit_run_id,
                &request.run.lease_token,
                request.sequence,
                &request.batch_digest,
                &records,
            )
    }

    pub fn promote(
        &self,
        request: &TagAuditRunPromoteRequest,
    ) -> Result<TagAuditRunResult, String> {
        let (run, staging) = self.repository.with_reader(|repository| {
            Ok((
                repository.get_tag_audit_run(&request.run.audit_run_id)?,
                repository.list_tag_audit_staging(&request.run.audit_run_id)?,
            ))
        })?;
        let run = run.ok_or_else(|| "tag_audit_run_not_found".to_owned())?;
        if run.status != "open" || run.lease_token != request.run.lease_token {
            return Err("tag_audit_run_fenced".into());
        }
        if request.visited_items != staging.len()
            || request.coverage_digest != host_coverage_digest(&staging)
        {
            return Err("tag_audit_coverage_conflict".into());
        }
        let targets = staging
            .iter()
            .map(|entry| TagAuditItemRef {
                library_id: entry.library_id,
                item_key: entry.item_key.clone(),
            })
            .collect::<Vec<_>>();
        let fresh = self.fresh_state.read(&targets)?;
        let conflicts = staging
            .iter()
            .filter_map(|entry| {
                let current = fresh.iter().find(|state| {
                    state.target.library_id == entry.library_id
                        && state.target.item_key == entry.item_key
                });
                match current {
                    Some(current)
                        if current.revision == entry.audited_revision
                            && current.tag_digest == entry.audited_tag_digest =>
                    {
                        None
                    }
                    Some(current) => Some(TagAuditConflict {
                        target: current.target.clone(),
                        audited_revision: entry.audited_revision.clone(),
                        current_revision: current.revision.clone(),
                    }),
                    None => Some(TagAuditConflict {
                        target: TagAuditItemRef {
                            library_id: entry.library_id,
                            item_key: entry.item_key.clone(),
                        },
                        audited_revision: entry.audited_revision.clone(),
                        current_revision: "missing".into(),
                    }),
                }
            })
            .collect::<Vec<_>>();
        if !conflicts.is_empty() {
            return Ok(TagAuditRunResult::Conflicted {
                audited_items: staging.len(),
                conflict_count: conflicts.len(),
                conflicts: conflicts
                    .into_iter()
                    .take(TAG_AUDIT_CONFLICT_SAMPLE_MAX)
                    .collect(),
                retryable: true,
            });
        }
        let current_vocabulary = self.repository.with_reader(|repository| {
            Ok(repository
                .get_tag_application_state()?
                .map(|state| state.vocabulary_hash)
                .unwrap_or_default())
        })?;
        if current_vocabulary != run.vocabulary_hash {
            return Err("tag_audit_vocabulary_conflict".into());
        }
        let now = self.runtime.now();
        let snapshot = TagAuditSnapshotRecord {
            library_id: run.library_id,
            snapshot_revision: self.runtime.opaque_id("tag-audit-snapshot"),
            vocabulary_hash: run.vocabulary_hash.clone(),
            basis_digest: run.basis_digest.clone(),
            coverage_digest: request.coverage_digest.clone(),
            audited_items: staging.len() as i64,
            needs_regulation: staging
                .iter()
                .filter(|entry| entry.evaluation_state == "needs_regulation")
                .count() as i64,
            source_run_id: run.audit_run_id,
            published_at: now.clone(),
            updated_at: now,
        };
        self.repository
            .owner()
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .promote_tag_audit_run(
                &request.run.audit_run_id,
                &request.run.lease_token,
                &snapshot,
            )?;
        Ok(TagAuditRunResult::Published {
            snapshot: TagAuditSnapshotSummary {
                schema: "zotero-agents.tag-audit-snapshot.v1".into(),
                library_id: snapshot.library_id,
                snapshot_revision: snapshot.snapshot_revision,
                vocabulary_hash: snapshot.vocabulary_hash,
                basis_digest: snapshot.basis_digest,
                coverage_digest: snapshot.coverage_digest,
                audited_items: snapshot.audited_items,
                needs_regulation: snapshot.needs_regulation,
                published_at: snapshot.published_at,
                updated_at: snapshot.updated_at,
            },
        })
    }

    pub fn abort(
        &self,
        request: &TagAuditRunAbortRequest,
    ) -> Result<TagAuditRunAbortResult, String> {
        let reason = match request.reason {
            TagAuditAbortReason::Canceled => "canceled",
            TagAuditAbortReason::ResourceLimited => "resource_limited",
            TagAuditAbortReason::Conflicted => "conflicted",
            TagAuditAbortReason::Failed => "failed",
        };
        let aborted = self
            .repository
            .owner()
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .abort_tag_audit_run(
                &request.run.audit_run_id,
                &request.run.lease_token,
                reason,
                &self.runtime.now(),
            )?;
        Ok(if aborted {
            TagAuditRunAbortResult::Aborted
        } else {
            TagAuditRunAbortResult::AlreadyTerminal
        })
    }

    pub fn prepare_acknowledgement(
        &self,
        request: &TagRegulationAcknowledgementPrepareRequest,
    ) -> Result<TagRegulationAcknowledgementPrepareResult, String> {
        if request.target.library_id <= 0
            || request.target.item_key.is_empty()
            || request.receipt_id.is_empty()
        {
            return Err("invalid_request".into());
        }
        let outcome = self.repository.with_reader(|repository| {
            repository.prepare_tag_regulation_acknowledgement(
                request.target.library_id,
                &request.target.item_key,
                &request.receipt_id,
            )
        })?;
        Ok(match outcome {
            TagRegulationAcknowledgementPrepareOutcome::Ready { active, snapshot } => {
                TagRegulationAcknowledgementPrepareResult::Ready {
                    target: request.target.clone(),
                    snapshot_revision: snapshot.snapshot_revision,
                    audited_revision: active.audited_revision,
                    vocabulary_hash: snapshot.vocabulary_hash,
                    non_compliant_tags: serde_json::from_str(&active.non_compliant_tags_json)
                        .map_err(|_| "tag_audit_record_invalid".to_owned())?,
                }
            }
            TagRegulationAcknowledgementPrepareOutcome::AlreadyAcknowledged {
                snapshot_revision,
            } => {
                TagRegulationAcknowledgementPrepareResult::AlreadyAcknowledged { snapshot_revision }
            }
            TagRegulationAcknowledgementPrepareOutcome::NotFound => {
                TagRegulationAcknowledgementPrepareResult::NotFound
            }
        })
    }

    pub fn commit_acknowledgement(
        &self,
        commit: &TagRegulationVerifiedCommit,
    ) -> Result<TagRegulationAcknowledgementResult, String> {
        if commit.schema != "zotero-agents.tag-regulation-verified-commit.v1"
            || commit.target.library_id <= 0
            || commit.target.item_key.is_empty()
            || commit.receipt_id.is_empty()
            || commit.expected_snapshot_revision.is_empty()
            || commit.audited_revision.is_empty()
            || commit.current_revision.is_empty()
            || commit.vocabulary_hash.is_empty()
            || commit.final_tags.len() > TAG_AUDIT_ROW_MAX_TAGS
            || commit.final_tags.windows(2).any(|pair| pair[0] >= pair[1])
        {
            return Err("invalid_request".into());
        }
        if host_tag_digest(&commit.final_tags) != commit.final_tag_digest {
            return Ok(TagRegulationAcknowledgementResult::Stale {
                reason: "final_tags_changed",
            });
        }
        let (current_vocabulary, allowed_tags) = self.repository.with_reader(|repository| {
            Ok((
                repository
                    .get_tag_application_state()?
                    .map(|state| state.vocabulary_hash)
                    .unwrap_or_default(),
                repository
                    .list_tag_vocabulary_entries()?
                    .into_iter()
                    .filter(|entry| entry.deprecated == 0)
                    .map(|entry| entry.tag)
                    .collect::<BTreeSet<_>>(),
            ))
        })?;
        if current_vocabulary != commit.vocabulary_hash {
            return Ok(TagRegulationAcknowledgementResult::Stale {
                reason: "vocabulary_changed",
            });
        }
        if commit
            .final_tags
            .iter()
            .any(|tag| !allowed_tags.contains(tag))
        {
            return Ok(TagRegulationAcknowledgementResult::Stale {
                reason: "still_noncompliant",
            });
        }
        let record = TagRegulationVerifiedCommitRecord {
            library_id: commit.target.library_id,
            item_key: commit.target.item_key.clone(),
            receipt_id: commit.receipt_id.clone(),
            expected_snapshot_revision: commit.expected_snapshot_revision.clone(),
            audited_revision: commit.audited_revision.clone(),
            current_revision: commit.current_revision.clone(),
            final_tag_digest: commit.final_tag_digest.clone(),
            vocabulary_hash: commit.vocabulary_hash.clone(),
        };
        let outcome = self
            .repository
            .owner()
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .commit_tag_regulation_acknowledgement(
                &record,
                &self.runtime.opaque_id("tag-audit-snapshot"),
                &self.runtime.now(),
            )?;
        Ok(match outcome {
            TagRegulationCommitOutcome::Acknowledged {
                snapshot_revision,
                remaining_needs_regulation,
            } => TagRegulationAcknowledgementResult::Acknowledged {
                snapshot_revision,
                remaining_needs_regulation,
            },
            TagRegulationCommitOutcome::AlreadyAcknowledged { snapshot_revision } => {
                TagRegulationAcknowledgementResult::AlreadyAcknowledged { snapshot_revision }
            }
            TagRegulationCommitOutcome::StaleAuditSnapshotChanged => {
                TagRegulationAcknowledgementResult::Stale {
                    reason: "audit_snapshot_changed",
                }
            }
            TagRegulationCommitOutcome::StaleVocabularyChanged => {
                TagRegulationAcknowledgementResult::Stale {
                    reason: "vocabulary_changed",
                }
            }
            TagRegulationCommitOutcome::ConflictAuditedRevisionMismatch => {
                TagRegulationAcknowledgementResult::Conflict {
                    reason: "audited_revision_mismatch",
                }
            }
            TagRegulationCommitOutcome::NotFound => TagRegulationAcknowledgementResult::NotFound,
        })
    }
}

fn validate_entries(
    audit_run_id: &str,
    entries: &[TagAuditStagingEntry],
) -> Result<Vec<TagAuditStagingRecord>, String> {
    if entries.len() > TAG_AUDIT_APPEND_MAX_ROWS {
        return Err("tag_audit_append_limit".into());
    }
    entries
        .iter()
        .map(|entry| {
            if entry.target.library_id <= 0
                || entry.target.item_key.is_empty()
                || entry.audited_revision.is_empty()
                || entry.audited_tag_digest.is_empty()
                || entry.audited_tags.len() > TAG_AUDIT_ROW_MAX_TAGS
            {
                return Err("invalid_request".into());
            }
            if entry.audited_tags.windows(2).any(|pair| pair[0] >= pair[1]) {
                return Err("tag_audit_tags_not_canonical".into());
            }
            if host_tag_digest(&entry.audited_tags) != entry.audited_tag_digest {
                return Err("tag_audit_tag_digest_mismatch".into());
            }
            let (state, non_compliant) = match &entry.evaluation {
                TagAuditEvaluation::Compliant => ("compliant", Vec::new()),
                TagAuditEvaluation::NeedsRegulation { non_compliant_tags } => {
                    if non_compliant_tags.len() > TAG_AUDIT_ROW_MAX_TAGS
                        || non_compliant_tags.windows(2).any(|pair| pair[0] >= pair[1])
                    {
                        return Err("tag_audit_tags_not_canonical".into());
                    }
                    let audited = entry.audited_tags.iter().collect::<BTreeSet<_>>();
                    if non_compliant_tags.iter().any(|tag| !audited.contains(tag)) {
                        return Err("tag_audit_non_compliant_subset".into());
                    }
                    ("needs_regulation", non_compliant_tags.clone())
                }
            };
            Ok(TagAuditStagingRecord {
                audit_run_id: audit_run_id.into(),
                library_id: entry.target.library_id,
                item_key: entry.target.item_key.clone(),
                audited_revision: entry.audited_revision.clone(),
                audited_tag_digest: entry.audited_tag_digest.clone(),
                evaluation_state: state.into(),
                non_compliant_tags_json: serde_json::to_string(&non_compliant)
                    .map_err(|_| "invalid_request")?,
            })
        })
        .collect()
}

pub fn host_tag_digest(tags: &[String]) -> String {
    let bytes = serde_json::to_vec(tags).expect("tag list serialization");
    format!("{:x}", Sha256::digest(bytes))
}

pub fn host_coverage_digest(entries: &[TagAuditStagingRecord]) -> String {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct HostRef<'a> {
        library_id: i64,
        key: &'a str,
    }
    let mut hash = Sha256::new();
    for entry in entries {
        let line = serde_json::to_string(&(
            HostRef {
                library_id: entry.library_id,
                key: &entry.item_key,
            },
            &entry.audited_revision,
            &entry.audited_tag_digest,
        ))
        .expect("coverage serialization");
        hash.update(line.as_bytes());
        hash.update(b"\n");
    }
    format!("{:x}", hash.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::RepositoryPort;
    use std::fs;
    use std::sync::Mutex;
    use synthesis_repository::{Repository, RepositoryIdentity, TagApplicationStateRecord};

    struct Runtime;
    impl TagAuditRuntimePort for Runtime {
        fn now(&self) -> String {
            "2026-08-30T00:00:00.000Z".into()
        }
        fn opaque_id(&self, kind: &str) -> String {
            format!("{kind}-1")
        }
    }

    struct Fresh;
    impl TagAuditFreshStatePort for Fresh {
        fn read(&self, targets: &[TagAuditItemRef]) -> Result<Vec<TagAuditFreshState>, String> {
            Ok(targets
                .iter()
                .map(|target| TagAuditFreshState {
                    target: target.clone(),
                    revision: "revision-1".into(),
                    tag_digest: host_tag_digest(&["topic:agents".into()]),
                })
                .collect())
        }
    }

    #[test]
    fn validates_append_evidence_and_publishes_through_the_application() {
        let root = std::env::temp_dir().join(format!(
            "synthesis-tag-audit-application-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        let mut repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile-r7".into(),
                data_root_id: "data-r7".into(),
            },
        )
        .unwrap();
        repository
            .replace_tag_vocabulary_state(
                None,
                &synthesis_repository::TagVocabularyReplacement {
                    state: TagApplicationStateRecord {
                        vocabulary_hash: "vocabulary-1".into(),
                        ..TagApplicationStateRecord::default()
                    },
                    ..synthesis_repository::TagVocabularyReplacement::default()
                },
            )
            .unwrap();
        let port = Arc::new(RepositoryPort::new(Arc::new(Mutex::new(repository))));
        let app = TagAuditApplication::new(port.clone(), Arc::new(Fresh), Arc::new(Runtime));
        let run = app
            .begin(&TagAuditRunBeginRequest {
                library_id: 1,
                vocabulary_hash: "vocabulary-1".into(),
                execution_identity: TagAuditExecutionIdentity {
                    host_instance_id: "host-1".into(),
                    principal: TagAuditExecutionPrincipal {
                        package_id: "package-1".into(),
                        workflow_id: "workflow-1".into(),
                        content_digest: "content-1".into(),
                    },
                },
            })
            .unwrap();
        let tags = vec!["topic:agents".into()];
        let entry = TagAuditStagingEntry {
            target: TagAuditItemRef {
                library_id: 1,
                item_key: "AAAA1111".into(),
            },
            audited_revision: "revision-1".into(),
            audited_tag_digest: host_tag_digest(&tags),
            audited_tags: tags,
            evaluation: TagAuditEvaluation::NeedsRegulation {
                non_compliant_tags: vec!["topic:agents".into()],
            },
        };
        let batch_digest = canonical_json_hash(&serde_json::to_value([&entry]).unwrap()).unwrap();
        app.append(&TagAuditRunAppendRequest {
            run: run.clone(),
            sequence: 0,
            batch_digest,
            entries: vec![entry],
        })
        .unwrap();
        let staging = port
            .with_reader(|repository| repository.list_tag_audit_staging(&run.audit_run_id))
            .unwrap();
        let result = app
            .promote(&TagAuditRunPromoteRequest {
                run,
                visited_items: 1,
                coverage_digest: host_coverage_digest(&staging),
                evidence_id: "evidence-1".into(),
            })
            .unwrap();
        assert!(matches!(result, TagAuditRunResult::Published { .. }));
        fs::remove_dir_all(root).expect("cleanup");
    }
}
