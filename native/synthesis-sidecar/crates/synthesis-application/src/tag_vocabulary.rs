use crate::admission::{AdmissionError, SingleFlightAdmission};
use crate::ports::TagVocabularyRepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashSet;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
#[cfg(test)]
use std::time::{SystemTime, UNIX_EPOCH};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    TagApplicationStateRecord, TagAuditRecord, TagEffectRecord, TagStagedSuggestionRecord,
    TagVocabularyEntryRecord, TagVocabularyPromotion, TagVocabularyReplacement,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TagMutationStatus {
    Committed,
    Unchanged,
    NotFound,
    Conflict,
    BasisMismatch,
    TagVocabularyBusy,
    InvalidRequest,
    EngineFailed,
    WorkerFailed,
    Stopping,
    RepairRequired,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagMutationResult {
    pub status: TagMutationStatus,
    pub vocabulary_hash: Option<String>,
    pub staged_revision: i64,
    pub changed_tags: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagInspectResult {
    pub vocabulary_hash: Option<String>,
    pub staged_revision: i64,
    pub index_hash: Option<String>,
    pub index_basis_hash: Option<String>,
    pub index_stale: bool,
    pub entry_count: usize,
    pub staged_count: usize,
    pub pending_effect_count: usize,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagLoadResult {
    pub state: Option<TagApplicationStateRecord>,
    pub entries: Vec<TagVocabularyEntryRecord>,
    pub staged: Vec<TagStagedSuggestionRecord>,
    pub effects: Vec<TagEffectRecord>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagStagedPage {
    pub items: Vec<TagStagedSuggestionRecord>,
    pub cursor: usize,
    pub next_cursor: Option<usize>,
    pub has_more: bool,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagPromoteRequest {
    pub expected_vocabulary_hash: String,
    pub expected_staged_revision: i64,
    pub tags: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TagParentBinding {
    library_id: i64,
    item_key: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TagIndexOutput {
    pub index_hash: String,
    pub index_json: String,
}

pub trait TagVocabularyComputePort: Send + Sync {
    fn validate(
        &self,
        candidate: &TagVocabularyReplacement,
        canceled: &Arc<AtomicBool>,
    ) -> Result<TagVocabularyReplacement, String>;
    fn build_index(
        &self,
        entries: &[TagVocabularyEntryRecord],
        canceled: &Arc<AtomicBool>,
    ) -> Result<TagIndexOutput, String>;
}

pub trait TagHostEffectPort: Send + Sync {
    fn apply(&self, effect: &TagEffectRecord) -> Result<(), String>;
}

pub trait TagLegacyBindingResolverPort: Send + Sync {
    fn resolve(
        &self,
        staged: &[TagStagedSuggestionRecord],
        canceled: &Arc<AtomicBool>,
    ) -> Result<Vec<TagStagedSuggestionRecord>, String>;
}

type Clock = Arc<dyn Fn() -> String + Send + Sync>;

pub struct TagVocabularyApplication {
    repository: Arc<dyn TagVocabularyRepositoryPort>,
    compute: Arc<dyn TagVocabularyComputePort>,
    host: Arc<dyn TagHostEffectPort>,
    legacy_resolver: Arc<dyn TagLegacyBindingResolverPort>,
    now: Clock,
    admission: SingleFlightAdmission,
}

impl TagVocabularyApplication {
    pub fn new(
        repository: Arc<dyn TagVocabularyRepositoryPort>,
        compute: Arc<dyn TagVocabularyComputePort>,
        host: Arc<dyn TagHostEffectPort>,
        legacy_resolver: Arc<dyn TagLegacyBindingResolverPort>,
    ) -> Self {
        Self::with_clock(
            repository,
            compute,
            host,
            legacy_resolver,
            Arc::new(default_now),
        )
    }

    pub fn with_clock(
        repository: Arc<dyn TagVocabularyRepositoryPort>,
        compute: Arc<dyn TagVocabularyComputePort>,
        host: Arc<dyn TagHostEffectPort>,
        legacy_resolver: Arc<dyn TagLegacyBindingResolverPort>,
        now: Clock,
    ) -> Self {
        Self {
            repository,
            compute,
            host,
            legacy_resolver,
            now,
            admission: SingleFlightAdmission::new(),
        }
    }

    pub fn inspect(&self) -> Result<TagInspectResult, String> {
        let state = self.repository.get_state()?;
        let entries = self.repository.list_entries()?;
        let staged = self.repository.list_staged()?;
        let pending_effect_count = self
            .repository
            .list_effects()?
            .into_iter()
            .filter(|effect| effect.status == "pending")
            .count();
        Ok(TagInspectResult {
            vocabulary_hash: state.as_ref().map(|state| state.vocabulary_hash.clone()),
            staged_revision: state.as_ref().map_or(0, |state| state.staged_revision),
            index_hash: state
                .as_ref()
                .map(|state| state.index_hash.clone())
                .filter(|value| !value.is_empty()),
            index_basis_hash: state
                .as_ref()
                .map(|state| state.index_basis_hash.clone())
                .filter(|value| !value.is_empty()),
            index_stale: state.as_ref().is_none_or(|state| state.index_stale != 0),
            entry_count: entries.len(),
            staged_count: staged.len(),
            pending_effect_count,
        })
    }

    pub fn load_vocabulary(&self) -> Result<TagLoadResult, String> {
        Ok(TagLoadResult {
            state: self.repository.get_state()?,
            entries: self.repository.list_entries()?,
            staged: self.repository.list_staged()?,
            effects: self.repository.list_effects()?,
        })
    }

    pub fn validate(
        &self,
        candidate: &TagVocabularyReplacement,
    ) -> Result<TagVocabularyReplacement, String> {
        validate_candidate(candidate)?;
        let lease = self.admission.admit().map_err(admission_code)?;
        self.compute.validate(candidate, lease.canceled())
    }

    pub fn save(
        &self,
        expected_vocabulary_hash: Option<&str>,
        candidate: &TagVocabularyReplacement,
    ) -> TagMutationResult {
        if validate_candidate(candidate).is_err() {
            return self.result(TagMutationStatus::InvalidRequest, Vec::new(), Vec::new());
        }
        let lease = match self.admission.admit() {
            Ok(lease) => lease,
            Err(error) => return self.result(map_admission(error), Vec::new(), Vec::new()),
        };
        let mut replacement = match self.compute.validate(candidate, lease.canceled()) {
            Ok(replacement) => replacement,
            Err(error) => return self.result(worker_status(&error), Vec::new(), Vec::new()),
        };
        if lease.canceled().load(Ordering::Relaxed) {
            return self.result(TagMutationStatus::Stopping, Vec::new(), Vec::new());
        }
        let current = match self.repository.get_state() {
            Ok(current) => current,
            Err(_) => {
                return self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new());
            }
        };
        if current.as_ref().map(|state| state.vocabulary_hash.as_str()) != expected_vocabulary_hash
        {
            return self.result(TagMutationStatus::BasisMismatch, Vec::new(), Vec::new());
        }
        if current
            .as_ref()
            .is_some_and(|state| state.vocabulary_hash == replacement.state.vocabulary_hash)
        {
            return self.result(TagMutationStatus::Unchanged, Vec::new(), Vec::new());
        }
        replacement.state.singleton_id = 1;
        replacement.state.index_stale = 1;
        replacement.state.updated_at = (self.now)();
        let changed_tags = replacement
            .entries
            .iter()
            .map(|entry| entry.tag.clone())
            .collect::<Vec<_>>();
        match self
            .repository
            .replace_vocabulary(expected_vocabulary_hash, &replacement)
        {
            Ok(true) => self.result(TagMutationStatus::Committed, changed_tags, Vec::new()),
            Ok(false) => self.result(TagMutationStatus::BasisMismatch, Vec::new(), Vec::new()),
            Err(_) => self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new()),
        }
    }

    pub fn list_staged(&self, cursor: usize, limit: usize) -> Result<TagStagedPage, String> {
        if limit == 0 || limit > 100 {
            return Err("invalid_request".into());
        }
        let staged = self.repository.list_staged()?;
        let items = staged
            .iter()
            .skip(cursor)
            .take(limit)
            .cloned()
            .collect::<Vec<_>>();
        let next = cursor + items.len();
        let has_more = next < staged.len();
        Ok(TagStagedPage {
            items,
            cursor,
            next_cursor: has_more.then_some(next),
            has_more,
        })
    }

    pub fn stage(
        &self,
        expected_revision: i64,
        staged: &[TagStagedSuggestionRecord],
    ) -> TagMutationResult {
        self.replace_staged(expected_revision, staged)
    }

    pub fn update_staged(
        &self,
        expected_revision: i64,
        staged: &[TagStagedSuggestionRecord],
    ) -> TagMutationResult {
        self.replace_staged(expected_revision, staged)
    }

    pub fn discard(
        &self,
        expected_revision: i64,
        retained: &[TagStagedSuggestionRecord],
    ) -> TagMutationResult {
        self.replace_staged(expected_revision, retained)
    }

    pub fn clear_staged(&self, expected_revision: i64) -> TagMutationResult {
        self.replace_staged(expected_revision, &[])
    }

    pub fn update_entry(
        &self,
        expected_vocabulary_hash: Option<&str>,
        candidate: &TagVocabularyReplacement,
    ) -> TagMutationResult {
        self.save(expected_vocabulary_hash, candidate)
    }

    pub fn delete_entry(
        &self,
        expected_vocabulary_hash: Option<&str>,
        candidate: &TagVocabularyReplacement,
    ) -> TagMutationResult {
        self.save(expected_vocabulary_hash, candidate)
    }

    pub fn promote(&self, request: &TagPromoteRequest) -> TagMutationResult {
        if request.expected_vocabulary_hash.is_empty()
            || request.tags.is_empty()
            || request.tags.len() > 100
        {
            return self.result(TagMutationStatus::InvalidRequest, Vec::new(), Vec::new());
        }
        let lease = match self.admission.admit() {
            Ok(lease) => lease,
            Err(error) => return self.result(map_admission(error), Vec::new(), Vec::new()),
        };
        let current = match self.repository.get_state() {
            Ok(Some(current)) => current,
            Ok(None) => {
                return self.result(TagMutationStatus::NotFound, Vec::new(), Vec::new());
            }
            Err(_) => {
                return self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new());
            }
        };
        if current.vocabulary_hash != request.expected_vocabulary_hash
            || current.staged_revision != request.expected_staged_revision
        {
            return self.result(TagMutationStatus::BasisMismatch, Vec::new(), Vec::new());
        }
        let staged = match self.repository.list_staged() {
            Ok(staged) => staged,
            Err(_) => {
                return self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new());
            }
        };
        let staged = match self.legacy_resolver.resolve(&staged, lease.canceled()) {
            Ok(staged) => staged,
            Err(error) => return self.result(worker_status(&error), Vec::new(), Vec::new()),
        };
        if lease.canceled().load(Ordering::Relaxed) {
            return self.result(TagMutationStatus::Stopping, Vec::new(), Vec::new());
        }
        let selected = request
            .tags
            .iter()
            .map(|tag| tag.to_lowercase())
            .collect::<HashSet<_>>();
        let mut replacement = match self.repository.load_candidate() {
            Ok(candidate) => candidate,
            Err(_) => {
                return self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new());
            }
        };
        let existing = replacement
            .entries
            .iter()
            .map(|entry| entry.tag.to_lowercase())
            .collect::<HashSet<_>>();
        let promoted = staged
            .iter()
            .filter(|row| {
                selected.contains(&row.tag.to_lowercase())
                    && !existing.contains(&row.tag.to_lowercase())
            })
            .cloned()
            .collect::<Vec<_>>();
        if promoted.is_empty() {
            return self.result(TagMutationStatus::Unchanged, Vec::new(), Vec::new());
        }
        let now = (self.now)();
        replacement
            .entries
            .extend(promoted.iter().map(|row| TagVocabularyEntryRecord {
                tag: row.tag.clone(),
                facet: row.facet.clone(),
                note: row.note.clone(),
                source: if row.source_flow.is_empty() {
                    "tag-regulator-suggest".into()
                } else {
                    row.source_flow.clone()
                },
                aliases_json: "[]".into(),
                abbrev_json: "[]".into(),
                created_at: now.clone(),
                updated_at: now.clone(),
                ..TagVocabularyEntryRecord::default()
            }));
        replacement
            .entries
            .sort_by(|left, right| left.tag.cmp(&right.tag));
        replacement = match self.compute.validate(&replacement, lease.canceled()) {
            Ok(replacement) => replacement,
            Err(error) => return self.result(worker_status(&error), Vec::new(), Vec::new()),
        };
        if validate_candidate(&replacement).is_err() {
            return self.result(TagMutationStatus::EngineFailed, Vec::new(), Vec::new());
        }
        let vocabulary_hash = match canonical_json_hash(&json!({
            "entries": replacement.entries,
            "aliases": replacement.aliases,
            "abbrevs": replacement.abbrevs,
            "protocols": replacement.protocols,
            "warnings": replacement.warnings,
        })) {
            Ok(hash) => hash,
            Err(_) => {
                return self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new());
            }
        };
        let next_revision = request.expected_staged_revision + 1;
        replacement.state.singleton_id = 1;
        replacement.state.vocabulary_hash = vocabulary_hash.clone();
        replacement.state.staged_revision = next_revision;
        replacement.state.index_stale = 1;
        replacement.state.updated_at = now.clone();
        let promoted_keys = promoted
            .iter()
            .map(|row| row.tag.to_lowercase())
            .collect::<HashSet<_>>();
        let retained = staged
            .iter()
            .filter(|row| !promoted_keys.contains(&row.tag.to_lowercase()))
            .cloned()
            .collect::<Vec<_>>();
        let mut effects = Vec::new();
        for row in &promoted {
            let bindings =
                match serde_json::from_str::<Vec<TagParentBinding>>(&row.parent_bindings_json) {
                    Ok(bindings) => bindings,
                    Err(_) => {
                        return self.result(
                            TagMutationStatus::InvalidRequest,
                            Vec::new(),
                            Vec::new(),
                        );
                    }
                };
            for binding in bindings {
                let effect_hash = match canonical_json_hash(&json!({
                    "tag": row.tag,
                    "parent": {
                        "libraryId": binding.library_id,
                        "itemKey": binding.item_key,
                    }
                })) {
                    Ok(hash) => hash,
                    Err(_) => {
                        return self.result(
                            TagMutationStatus::RepairRequired,
                            Vec::new(),
                            Vec::new(),
                        );
                    }
                };
                effects.push(TagEffectRecord {
                    effect_id: format!(
                        "staged-tag:{}",
                        effect_hash.strip_prefix("sha256:").unwrap_or(&effect_hash)
                    ),
                    vocabulary_hash: vocabulary_hash.clone(),
                    staged_revision: next_revision,
                    library_id: binding.library_id,
                    item_key: binding.item_key,
                    tag: row.tag.clone(),
                    status: "pending".into(),
                    diagnostics_json: "[]".into(),
                    created_at: now.clone(),
                    updated_at: now.clone(),
                    ..TagEffectRecord::default()
                });
            }
        }
        let promotion = TagVocabularyPromotion {
            replacement,
            staged: retained,
            effects,
        };
        let promoted = match self.repository.promote(
            &request.expected_vocabulary_hash,
            request.expected_staged_revision,
            &promotion,
        ) {
            Ok(value) => value,
            Err(_) => {
                return self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new());
            }
        };
        if !promoted {
            return self.result(TagMutationStatus::BasisMismatch, Vec::new(), Vec::new());
        }
        let mut warnings = Vec::new();
        for effect in &promotion.effects {
            match self.host.apply(effect) {
                Ok(()) => {
                    if self
                        .repository
                        .update_effect(&effect.effect_id, "applied", "[]", &now, &now)
                        .is_err()
                    {
                        warnings.push("tag_effect_receipt_failed".into());
                    }
                }
                Err(error) => {
                    warnings.push("tag_host_effect_failed".into());
                    let diagnostics =
                        serde_json::to_string(&vec![error]).unwrap_or_else(|_| "[]".into());
                    let _ = self.repository.update_effect(
                        &effect.effect_id,
                        "pending",
                        &diagnostics,
                        "",
                        &now,
                    );
                }
            }
        }
        self.result(
            TagMutationStatus::Committed,
            promoted_keys.into_iter().collect(),
            warnings,
        )
    }

    pub fn rebuild_index(&self, expected_vocabulary_hash: &str) -> TagMutationResult {
        let lease = match self.admission.admit() {
            Ok(lease) => lease,
            Err(error) => return self.result(map_admission(error), Vec::new(), Vec::new()),
        };
        let entries = match self.repository.list_entries() {
            Ok(entries) => entries,
            Err(_) => {
                return self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new());
            }
        };
        let output = match self.compute.build_index(&entries, lease.canceled()) {
            Ok(output) => output,
            Err(error) => return self.result(worker_status(&error), Vec::new(), Vec::new()),
        };
        if lease.canceled().load(Ordering::Relaxed) {
            return self.result(TagMutationStatus::Stopping, Vec::new(), Vec::new());
        }
        match self.repository.promote_index(
            expected_vocabulary_hash,
            &output.index_hash,
            &output.index_json,
            &(self.now)(),
        ) {
            Ok(true) => self.result(TagMutationStatus::Committed, Vec::new(), Vec::new()),
            Ok(false) => self.result(TagMutationStatus::BasisMismatch, Vec::new(), Vec::new()),
            Err(_) => self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new()),
        }
    }

    pub fn export_regulator_tags(&self) -> Result<Vec<String>, String> {
        let mut tags = self
            .repository
            .list_entries()?
            .into_iter()
            .filter(|entry| entry.deprecated == 0)
            .map(|entry| entry.tag)
            .collect::<Vec<_>>();
        tags.sort();
        tags.dedup();
        Ok(tags)
    }

    pub fn replace_audit(&self, record: &TagAuditRecord) -> TagMutationResult {
        match self.repository.replace_audit(record) {
            Ok(()) => self.result(TagMutationStatus::Committed, Vec::new(), Vec::new()),
            Err(_) => self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new()),
        }
    }

    pub fn clear_audit(&self, library_id: i64, item_key: &str) -> TagMutationResult {
        match self.repository.clear_audit(library_id, item_key) {
            Ok(true) => self.result(TagMutationStatus::Committed, Vec::new(), Vec::new()),
            Ok(false) => self.result(TagMutationStatus::NotFound, Vec::new(), Vec::new()),
            Err(_) => self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new()),
        }
    }

    /// Replays only durable pending intents.  Effects use their stable
    /// `effect_id`, so the Host's ensure-present contract turns an uncertain
    /// post-effect response into an already-satisfied receipt rather than a
    /// duplicate Zotero mutation.
    pub fn reconcile_pending_effects(&self, limit: usize) -> Result<usize, String> {
        if limit == 0 || limit > 100 {
            return Err("invalid_request".into());
        }
        let effects = self
            .repository
            .list_effects()?
            .into_iter()
            .filter(|effect| effect.status == "pending")
            .take(limit)
            .collect::<Vec<_>>();
        let now = (self.now)();
        let mut reconciled = 0;
        for effect in effects {
            match self.host.apply(&effect) {
                Ok(()) => {
                    self.repository.update_effect(
                        &effect.effect_id,
                        "applied",
                        "[]",
                        &now,
                        &now,
                    )?;
                    reconciled += 1;
                }
                Err(error) => {
                    let diagnostics =
                        serde_json::to_string(&vec![error]).unwrap_or_else(|_| "[]".into());
                    self.repository.update_effect(
                        &effect.effect_id,
                        "pending",
                        &diagnostics,
                        "",
                        &now,
                    )?;
                }
            }
        }
        Ok(reconciled)
    }

    pub fn stop_admission(&self) {
        self.admission.stop();
    }

    pub fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.admission.shutdown(timeout, "tag_vocabulary")
    }

    fn replace_staged(
        &self,
        expected_revision: i64,
        staged: &[TagStagedSuggestionRecord],
    ) -> TagMutationResult {
        if staged.len() > 10_000
            || staged.iter().any(|row| row.tag.is_empty())
            || staged
                .iter()
                .map(|row| &row.tag)
                .collect::<HashSet<_>>()
                .len()
                != staged.len()
        {
            return self.result(TagMutationStatus::InvalidRequest, Vec::new(), Vec::new());
        }
        let _lease = match self.admission.admit() {
            Ok(lease) => lease,
            Err(error) => return self.result(map_admission(error), Vec::new(), Vec::new()),
        };
        let next_revision = expected_revision.saturating_add(1);
        match self.repository.replace_staged(
            expected_revision,
            next_revision,
            staged,
            &(self.now)(),
        ) {
            Ok(true) => self.result(
                TagMutationStatus::Committed,
                staged.iter().map(|row| row.tag.clone()).collect(),
                Vec::new(),
            ),
            Ok(false) => self.result(TagMutationStatus::BasisMismatch, Vec::new(), Vec::new()),
            Err(_) => self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new()),
        }
    }

    fn result(
        &self,
        status: TagMutationStatus,
        mut changed_tags: Vec<String>,
        warnings: Vec<String>,
    ) -> TagMutationResult {
        changed_tags.sort();
        changed_tags.dedup();
        let state = self.repository.get_state().ok().flatten();
        TagMutationResult {
            status,
            vocabulary_hash: state.as_ref().map(|state| state.vocabulary_hash.clone()),
            staged_revision: state.as_ref().map_or(0, |state| state.staged_revision),
            changed_tags,
            warnings,
        }
    }
}

fn validate_candidate(candidate: &TagVocabularyReplacement) -> Result<(), String> {
    if candidate.state.vocabulary_hash.is_empty()
        || candidate.entries.len() > 100_000
        || candidate.entries.iter().any(|entry| {
            entry.tag.is_empty()
                || entry.facet.is_empty()
                || entry.tag.len() > 512
                || entry.facet.len() > 128
        })
        || candidate
            .entries
            .iter()
            .map(|entry| &entry.tag)
            .collect::<HashSet<_>>()
            .len()
            != candidate.entries.len()
    {
        Err("invalid_request".into())
    } else {
        Ok(())
    }
}

fn map_admission(error: AdmissionError) -> TagMutationStatus {
    match error {
        AdmissionError::Busy => TagMutationStatus::TagVocabularyBusy,
        AdmissionError::Stopping => TagMutationStatus::Stopping,
        AdmissionError::Unavailable => TagMutationStatus::RepairRequired,
    }
}

fn admission_code(error: AdmissionError) -> String {
    match error {
        AdmissionError::Busy => "tag_vocabulary_busy",
        AdmissionError::Stopping => "stopping",
        AdmissionError::Unavailable => "repair_required",
    }
    .into()
}

fn worker_status(error: &str) -> TagMutationStatus {
    if error.contains("stopping") || error.contains("canceled") {
        TagMutationStatus::Stopping
    } else if error.contains("engine") {
        TagMutationStatus::EngineFailed
    } else {
        TagMutationStatus::WorkerFailed
    }
}

fn default_now() -> String {
    synthesis_protocol::utc_now_iso8601()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::RepositoryPort;
    use std::path::PathBuf;
    use std::sync::Mutex;
    use synthesis_repository::{Repository, RepositoryIdentity};

    struct Compute;
    impl TagVocabularyComputePort for Compute {
        fn validate(
            &self,
            candidate: &TagVocabularyReplacement,
            _canceled: &Arc<AtomicBool>,
        ) -> Result<TagVocabularyReplacement, String> {
            Ok(candidate.clone())
        }

        fn build_index(
            &self,
            entries: &[TagVocabularyEntryRecord],
            _canceled: &Arc<AtomicBool>,
        ) -> Result<TagIndexOutput, String> {
            Ok(TagIndexOutput {
                index_hash: format!("index:{}", entries.len()),
                index_json: format!("{{\"count\":{}}}", entries.len()),
            })
        }
    }

    struct Host(bool);
    impl TagHostEffectPort for Host {
        fn apply(&self, _effect: &TagEffectRecord) -> Result<(), String> {
            if self.0 {
                Ok(())
            } else {
                Err("host_unavailable".into())
            }
        }
    }

    struct Resolver;
    impl TagLegacyBindingResolverPort for Resolver {
        fn resolve(
            &self,
            staged: &[TagStagedSuggestionRecord],
            _canceled: &Arc<AtomicBool>,
        ) -> Result<Vec<TagStagedSuggestionRecord>, String> {
            Ok(staged.to_vec())
        }
    }

    fn root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-tag-application-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
    }

    fn candidate(hash: &str) -> TagVocabularyReplacement {
        TagVocabularyReplacement {
            state: TagApplicationStateRecord {
                singleton_id: 1,
                vocabulary_hash: hash.into(),
                index_json: "{}".into(),
                index_stale: 1,
                updated_at: "fixed".into(),
                ..TagApplicationStateRecord::default()
            },
            entries: vec![TagVocabularyEntryRecord {
                tag: "method:stable".into(),
                facet: "method".into(),
                aliases_json: "[]".into(),
                abbrev_json: "[]".into(),
                created_at: "fixed".into(),
                updated_at: "fixed".into(),
                ..TagVocabularyEntryRecord::default()
            }],
            ..TagVocabularyReplacement::default()
        }
    }

    #[test]
    fn commits_promotes_warns_and_stops_admission() {
        let root = root();
        let owner = Arc::new(Mutex::new(
            Repository::open(
                &root,
                RepositoryIdentity {
                    profile_id: "profile".into(),
                    data_root_id: "data".into(),
                },
            )
            .expect("repository"),
        ));
        let app = TagVocabularyApplication::with_clock(
            Arc::new(RepositoryPort::new(Arc::clone(&owner))),
            Arc::new(Compute),
            Arc::new(Host(false)),
            Arc::new(Resolver),
            Arc::new(|| "fixed".into()),
        );
        assert_eq!(
            app.save(None, &candidate("tag:1")).status,
            TagMutationStatus::Committed
        );
        assert_eq!(
            app.rebuild_index("tag:1").status,
            TagMutationStatus::Committed
        );
        assert_eq!(
            app.stage(
                0,
                &[TagStagedSuggestionRecord {
                    tag: "method:new".into(),
                    facet: "method".into(),
                    parent_bindings_json: r#"[{"libraryId":1,"itemKey":"A"}]"#.into(),
                    created_at: "fixed".into(),
                    updated_at: "fixed".into(),
                    ..TagStagedSuggestionRecord::default()
                }]
            )
            .status,
            TagMutationStatus::Committed
        );
        let result = app.promote(&TagPromoteRequest {
            expected_vocabulary_hash: "tag:1".into(),
            expected_staged_revision: 1,
            tags: vec!["method:new".into()],
        });
        assert_eq!(result.status, TagMutationStatus::Committed);
        assert_eq!(result.warnings, ["tag_host_effect_failed"]);
        app.stop_admission();
        assert_eq!(
            app.save(Some("irrelevant"), &candidate("tag:3")).status,
            TagMutationStatus::Stopping
        );
        app.shutdown(Duration::from_secs(1)).expect("shutdown");
        drop(app);
        drop(owner);
        let _ = std::fs::remove_dir_all(root);
    }
}
