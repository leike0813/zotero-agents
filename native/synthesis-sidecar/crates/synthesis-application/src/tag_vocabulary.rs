use crate::PromotionCheckpoint;
use crate::admission::{AdmissionError, SingleFlightAdmission};
use crate::ports::TagVocabularyRepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    OperationRecord, TagAbbrevRecord, TagAliasRecord, TagApplicationStateRecord, TagAuditRecord,
    TagEffectReceiptRecord, TagEffectRecord, TagProtocolRecord, TagStagedSuggestionRecord,
    TagValidationWarningRecord, TagVocabularyEntryRecord, TagVocabularyPromotion,
    TagVocabularyReplacement,
};

const TAG_EFFECT_BATCH_MAX: usize = 100;
const DEFAULT_TAG_PATTERN: &str = "^[a-z_]+:[a-zA-Z0-9/_.-]+$";
const DEFAULT_PROTOCOL_VERSION: &str = "1.0.0";
const DEFAULT_MAX_TAG_LENGTH: i64 = 120;
const DEFAULT_FACETS: &[&str] = &[
    "field", "topic", "method", "model", "ai_task", "data", "tool", "status",
];
const BUILTIN_TAGS: &[&str] = &[
    "status:need-analysis",
    "status:need-deep-reading",
    "status:need-fulltext",
    "status:need-markdown",
    "status:need-metadata-curation",
];

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagVocabularyEntry {
    pub tag: String,
    pub facet: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(default)]
    pub deprecated: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub replacement: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub aliases: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub abbrev: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub usage_count: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_synced_at: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagProtocol {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    pub tag_pattern: String,
    pub max_tag_length: i64,
    pub facets: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagVocabularySaveRequest {
    pub entries: Vec<TagVocabularyEntry>,
    pub aliases: BTreeMap<String, String>,
    pub abbrev: BTreeMap<String, String>,
    pub protocol: Option<TagProtocol>,
    #[serde(default)]
    pub transaction_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagValidationWarning {
    pub code: String,
    pub severity: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tag: Option<String>,
    pub message: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagVocabularyManifest {
    pub manifest_hash: String,
    pub entry_count: usize,
    pub tag_count: usize,
    pub active_count: usize,
    pub updated_at: String,
    pub source_protocol_version: String,
    pub projection_target: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagVocabularySnapshot {
    pub entries: Vec<TagVocabularyEntry>,
    pub aliases: BTreeMap<String, String>,
    pub abbrev: BTreeMap<String, String>,
    pub protocol: TagProtocol,
    pub manifest: TagVocabularyManifest,
    pub validation_warnings: Vec<TagValidationWarning>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagParentBinding {
    pub library_id: i64,
    pub item_key: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagSuggestionInput {
    pub tag: String,
    pub facet: String,
    pub note: String,
    pub source_flow: String,
    pub parent_bindings: Vec<TagParentBinding>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagSuggestionStageRequest {
    pub entries: Vec<TagSuggestionInput>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagStagedSuggestion {
    pub tag: String,
    pub facet: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    pub source_flow: String,
    pub parent_bindings: Vec<TagParentBinding>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagStageResult {
    pub staged: Vec<TagStagedSuggestion>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagStagedUpdateRequest {
    pub original_tag: String,
    pub tag: String,
    pub facet: String,
    pub note: String,
    pub source_flow: String,
    pub parent_bindings: Vec<TagParentBinding>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagVocabularyEntryUpdateRequest {
    pub original_tag: String,
    pub tag: String,
    pub facet: String,
    pub note: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagVocabularyEntryDeleteRequest {
    pub original_tag: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagSelectionRequest {
    pub tags: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagDiagnostic {
    pub code: String,
    pub message: String,
    pub details: BTreeMap<String, String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagEntryUpdateResult {
    pub mutated: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub updated: Option<TagVocabularyEntry>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub diagnostic: Option<TagDiagnostic>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagEntryDeleteResult {
    pub mutated: bool,
    pub deleted: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagDiscardResult {
    pub discarded: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagPromoteResult {
    pub promoted: Vec<String>,
    pub skipped: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagImportConflict {
    pub tag: String,
    pub local: TagVocabularyEntry,
    pub imported: TagVocabularyEntry,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagImportPreview {
    pub action: String,
    pub builtins: Vec<TagImportConflict>,
    pub additions: Vec<TagVocabularyEntry>,
    pub unchanged: Vec<TagVocabularyEntry>,
    pub conflicts: Vec<TagImportConflict>,
    pub warnings: Vec<TagValidationWarning>,
}

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
pub struct TagPromoteRequest {
    pub expected_vocabulary_hash: String,
    pub expected_staged_revision: i64,
    pub tags: Vec<String>,
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
    fn apply_batch(&self, effects: &[TagEffectRecord])
    -> Result<Vec<TagHostEffectReceipt>, String>;
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TagHostEffectReceipt {
    pub effect_id: String,
    pub status: String,
    pub occurred_at: String,
    pub diagnostics: Vec<crate::HostEffectDiagnostic>,
}

pub trait TagLegacyBindingResolverPort: Send + Sync {
    fn resolve(
        &self,
        library_id: i64,
        item_ids: &[i64],
    ) -> Result<TagLegacyBindingResolution, String>;
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct TagLegacyBindingResolution {
    pub resolved: Vec<(i64, TagParentBinding)>,
    pub missing_item_ids: Vec<i64>,
    pub diagnostics: Vec<crate::HostEffectDiagnostic>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct TagLegacyBindingMigrationSummary {
    pub affected_rows: usize,
    pub migrated_rows: usize,
    pub resolved_bindings: usize,
    pub dropped_bindings: usize,
}

type Clock = Arc<dyn Fn() -> String + Send + Sync>;

pub struct TagVocabularyApplication {
    repository: Arc<dyn TagVocabularyRepositoryPort>,
    compute: Arc<dyn TagVocabularyComputePort>,
    host: Arc<dyn TagHostEffectPort>,
    legacy_resolver: Arc<dyn TagLegacyBindingResolverPort>,
    now: Clock,
    admission: SingleFlightAdmission,
    library_id: i64,
    migration_gate: Mutex<()>,
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
            library_id: 0,
            migration_gate: Mutex::new(()),
        }
    }

    pub fn with_library_id(mut self, library_id: i64) -> Self {
        self.library_id = library_id;
        self
    }

    pub fn ensure_staged_bindings_migrated(
        &self,
    ) -> Result<TagLegacyBindingMigrationSummary, String> {
        let _guard = self
            .migration_gate
            .lock()
            .map_err(|_| "unavailable".to_owned())?;
        self.run_staged_binding_migration()
            .map_err(|_| "unavailable".into())
    }

    fn run_staged_binding_migration(&self) -> Result<TagLegacyBindingMigrationSummary, String> {
        let rows = self.repository.list_staged()?;
        let revision = self
            .repository
            .get_state()?
            .map_or(0, |state| state.staged_revision);
        let mut inspected = Vec::with_capacity(rows.len());
        let mut item_ids = BTreeMap::<i64, ()>::new();
        let mut affected_rows = 0;
        for row in &rows {
            let (stable, legacy, invalid) = inspect_stored_bindings(&row.parent_bindings_json);
            if !legacy.is_empty() || invalid > 0 {
                affected_rows += 1;
            }
            for item_id in &legacy {
                item_ids.insert(*item_id, ());
            }
            inspected.push((stable, legacy, invalid));
        }
        if affected_rows == 0 {
            return Ok(TagLegacyBindingMigrationSummary::default());
        }
        let now = (self.now)();
        self.record_binding_migration("running", affected_rows, 0, 0, &[], &now)?;
        let migrate = (|| -> Result<TagLegacyBindingMigrationSummary, String> {
            if self.library_id <= 0 && !item_ids.is_empty() {
                return Err("legacy_binding_library_scope_missing".into());
            }
            let requested = item_ids.keys().copied().collect::<Vec<_>>();
            let mut resolved = BTreeMap::<i64, TagParentBinding>::new();
            for batch in requested.chunks(100) {
                let result = self.legacy_resolver.resolve(self.library_id, batch)?;
                validate_legacy_resolution(self.library_id, batch, &result)?;
                for (item_id, reference) in result.resolved {
                    resolved.insert(item_id, reference);
                }
            }
            let mut replacement = rows.clone();
            let mut migrated_rows = 0;
            let mut resolved_bindings = 0;
            let mut dropped_bindings = 0;
            for (row, (stable, legacy, invalid)) in replacement.iter_mut().zip(inspected) {
                if legacy.is_empty() && invalid == 0 {
                    continue;
                }
                let mut bindings = stable
                    .into_iter()
                    .map(|binding| ((binding.library_id, binding.item_key.clone()), binding))
                    .collect::<BTreeMap<_, _>>();
                for item_id in legacy {
                    if let Some(reference) = resolved.get(&item_id) {
                        bindings.insert(
                            (reference.library_id, reference.item_key.clone()),
                            reference.clone(),
                        );
                        resolved_bindings += 1;
                    } else {
                        dropped_bindings += 1;
                    }
                }
                dropped_bindings += invalid;
                row.parent_bindings_json =
                    serde_json::to_string(&bindings.into_values().collect::<Vec<_>>())
                        .map_err(|_| "staged_tag_binding_migration_invalid".to_owned())?;
                row.updated_at = now.clone();
                migrated_rows += 1;
            }
            if !self.repository.replace_staged(
                revision,
                revision.saturating_add(1),
                &replacement,
                &now,
            )? {
                return Err("staged_tag_binding_basis_mismatch".into());
            }
            Ok(TagLegacyBindingMigrationSummary {
                affected_rows,
                migrated_rows,
                resolved_bindings,
                dropped_bindings,
            })
        })();
        match migrate {
            Ok(summary) => {
                let diagnostics = if summary.dropped_bindings == 0 {
                    Vec::new()
                } else {
                    vec![format!(
                        "staged_tag_binding_migration_dropped:{}",
                        summary.dropped_bindings
                    )]
                };
                self.record_binding_migration(
                    "completed",
                    summary.affected_rows,
                    summary.migrated_rows,
                    summary.dropped_bindings,
                    &diagnostics,
                    &now,
                )?;
                Ok(summary)
            }
            Err(error) => {
                let _ = self.record_binding_migration(
                    "failed",
                    affected_rows,
                    0,
                    0,
                    &["staged_tag_binding_migration_unavailable".into()],
                    &now,
                );
                Err(error)
            }
        }
    }

    fn record_binding_migration(
        &self,
        status: &str,
        affected_rows: usize,
        processed: usize,
        dropped: usize,
        diagnostics: &[String],
        now: &str,
    ) -> Result<(), String> {
        self.repository.upsert_operation(&OperationRecord {
            operation_id: "staged-tag-binding-migration".into(),
            operation_type: "staged_tag_binding_migration".into(),
            library_id: self.library_id,
            scope_kind: "library".into(),
            scope_ref: self.library_id.to_string(),
            status: status.into(),
            label: "Migrate staged Tag parent bindings".into(),
            phase: status.into(),
            phase_label: match status {
                "completed" => "Completed",
                "failed" => "Failed",
                _ => "Resolve legacy item IDs",
            }
            .into(),
            progress_mode: "determinate".into(),
            processed_count: processed as i64,
            skipped_count: dropped as i64,
            failed_count: i64::from(status == "failed"),
            total_count: affected_rows as i64,
            diagnostics_json: serde_json::to_string(diagnostics)
                .map_err(|_| "staged_tag_binding_migration_invalid".to_owned())?,
            created_at: now.into(),
            started_at: now.into(),
            completed_at: if matches!(status, "completed" | "failed") {
                now.into()
            } else {
                String::new()
            },
            updated_at: now.into(),
            ..OperationRecord::default()
        })
    }

    pub fn inspect(&self) -> Result<TagInspectResult, String> {
        let state = self.repository.get_state()?;
        let entries = self.repository.list_entries()?;
        let staged = self.repository.list_staged()?;
        let pending_effect_count = self.repository.count_pending_effects()?;
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

    pub fn is_builtin_policy_initialized(&self) -> Result<bool, String> {
        let candidate = self.repository.load_candidate()?;
        let protocol_initialized = candidate.protocols.first().is_some_and(|protocol| {
            serde_json::from_str::<Vec<String>>(&protocol.facets_json)
                .is_ok_and(|facets| facets.iter().any(|facet| facet == "status"))
        });
        Ok(protocol_initialized
            && BUILTIN_TAGS.iter().all(|tag| {
                candidate.entries.iter().any(|entry| {
                    entry.tag == *tag
                        && entry.facet == "status"
                        && entry.source == "builtin"
                        && entry.deprecated == 0
                        && entry.replacement.is_empty()
                })
            }))
    }

    pub fn load_vocabulary(&self) -> Result<TagLoadResult, String> {
        Ok(TagLoadResult {
            state: self.repository.get_state()?,
            entries: self.repository.list_entries()?,
            staged: self.repository.list_staged()?,
            effects: self.repository.list_effects()?,
        })
    }

    pub fn initialize_builtin_policy(&self) -> TagMutationResult {
        let mut candidate = match self.repository.load_candidate() {
            Ok(candidate) => candidate,
            Err(_) => {
                return self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new());
            }
        };
        let expected_hash = nonempty(candidate.state.vocabulary_hash.clone());
        let now = (self.now)();
        if protect_builtin_candidate(&mut candidate, &now).is_err()
            || refresh_candidate_hash(&mut candidate).is_err()
        {
            return self.result(TagMutationStatus::InvalidRequest, Vec::new(), Vec::new());
        }
        self.save(expected_hash.as_deref(), &candidate)
    }

    pub fn initialize_public_vocabulary(&self) -> Result<TagVocabularySnapshot, String> {
        ensure_mutation(self.initialize_builtin_policy())?;
        public_snapshot(&self.repository.load_candidate()?)
    }

    pub fn load_public_vocabulary(&self) -> Result<TagVocabularySnapshot, String> {
        let mut candidate = self.repository.load_candidate()?;
        protect_builtin_candidate(&mut candidate, &(self.now)())?;
        refresh_candidate_hash(&mut candidate)?;
        public_snapshot(&candidate)
    }

    pub fn list_public_staged(&self) -> Result<Vec<TagStagedSuggestion>, String> {
        self.ensure_staged_bindings_migrated()?;
        self.repository
            .list_staged()?
            .iter()
            .map(public_staged_suggestion)
            .collect()
    }

    pub fn save_public(&self, request: &TagVocabularySaveRequest) -> TagMutationResult {
        let current = match self.repository.load_candidate() {
            Ok(candidate) => candidate,
            Err(_) => {
                return self.result(TagMutationStatus::RepairRequired, Vec::new(), Vec::new());
            }
        };
        let expected_hash = nonempty(current.state.vocabulary_hash.clone());
        let candidate = match public_save_candidate(request, &current, &(self.now)()) {
            Ok(candidate) => candidate,
            Err(_) => {
                return self.result(TagMutationStatus::InvalidRequest, Vec::new(), Vec::new());
            }
        };
        self.save(expected_hash.as_deref(), &candidate)
    }

    pub fn validate_public(
        &self,
        request: Option<&TagVocabularySaveRequest>,
    ) -> Result<Vec<TagValidationWarning>, String> {
        let current = self.repository.load_candidate()?;
        let mut candidate = match request {
            Some(request) => public_save_candidate(request, &current, &(self.now)())?,
            None => current,
        };
        protect_builtin_candidate(&mut candidate, &(self.now)())?;
        refresh_candidate_hash(&mut candidate)?;
        let validated = self.validate(&candidate)?;
        validated.warnings.iter().map(public_warning).collect()
    }

    pub fn stage_public(
        &self,
        request: &TagSuggestionStageRequest,
    ) -> Result<TagStageResult, String> {
        self.ensure_initialized()?;
        self.ensure_staged_bindings_migrated()?;
        if request.entries.is_empty() {
            return Ok(TagStageResult { staged: Vec::new() });
        }
        let now = (self.now)();
        let current = self.repository.list_staged()?;
        let mut by_lower = current
            .iter()
            .cloned()
            .map(|entry| (entry.tag.to_lowercase(), entry))
            .collect::<HashMap<_, _>>();
        let mut written = Vec::new();
        for input in &request.entries {
            let tag = input.tag.trim();
            if tag.is_empty() {
                continue;
            }
            let key = tag.to_lowercase();
            let merged = merge_staged_record(by_lower.get(&key), input, &now)?;
            by_lower.insert(key, merged.clone());
            written.push(public_staged_suggestion(&merged)?);
        }
        if written.is_empty() {
            return Ok(TagStageResult { staged: written });
        }
        let mut replacement = by_lower.into_values().collect::<Vec<_>>();
        replacement.sort_by_key(|entry| entry.tag.to_lowercase());
        let revision = self
            .repository
            .get_state()?
            .map_or(0, |state| state.staged_revision);
        ensure_mutation(self.stage(revision, &replacement))?;
        written.sort_by_key(|entry| entry.tag.to_lowercase());
        Ok(TagStageResult { staged: written })
    }

    pub fn update_public_staged(
        &self,
        request: &TagStagedUpdateRequest,
    ) -> Result<TagStageResult, String> {
        self.ensure_initialized()?;
        self.ensure_staged_bindings_migrated()?;
        let original = request.original_tag.trim().to_lowercase();
        let requested = request.tag.trim().to_lowercase();
        if original.is_empty() || requested.is_empty() {
            return Err("invalid_request".into());
        }
        let now = (self.now)();
        let mut current = self.repository.list_staged()?;
        let existing = current
            .iter()
            .find(|entry| entry.tag.to_lowercase() == requested)
            .cloned();
        current.retain(|entry| {
            let key = entry.tag.to_lowercase();
            key != original && key != requested
        });
        let input = TagSuggestionInput {
            tag: request.tag.clone(),
            facet: request.facet.clone(),
            note: request.note.clone(),
            source_flow: request.source_flow.clone(),
            parent_bindings: request.parent_bindings.clone(),
        };
        let merged = merge_staged_record(existing.as_ref(), &input, &now)?;
        current.push(merged.clone());
        current.sort_by_key(|entry| entry.tag.to_lowercase());
        let revision = self
            .repository
            .get_state()?
            .map_or(0, |state| state.staged_revision);
        ensure_mutation(self.replace_staged(revision, &current))?;
        Ok(TagStageResult {
            staged: vec![public_staged_suggestion(&merged)?],
        })
    }

    pub fn discard_public(
        &self,
        request: &TagSelectionRequest,
    ) -> Result<TagDiscardResult, String> {
        self.ensure_initialized()?;
        self.ensure_staged_bindings_migrated()?;
        let selected = normalized_tag_set(&request.tags);
        let current = self.repository.list_staged()?;
        let mut discarded = current
            .iter()
            .filter(|entry| selected.contains(&entry.tag.to_lowercase()))
            .map(|entry| entry.tag.clone())
            .collect::<Vec<_>>();
        if discarded.is_empty() {
            return Ok(TagDiscardResult { discarded });
        }
        let retained = current
            .into_iter()
            .filter(|entry| !selected.contains(&entry.tag.to_lowercase()))
            .collect::<Vec<_>>();
        let revision = self
            .repository
            .get_state()?
            .map_or(0, |state| state.staged_revision);
        ensure_mutation(self.replace_staged(revision, &retained))?;
        discarded.sort();
        Ok(TagDiscardResult { discarded })
    }

    pub fn clear_public_staged(&self) -> Result<TagDiscardResult, String> {
        self.ensure_initialized()?;
        self.ensure_staged_bindings_migrated()?;
        let current = self.repository.list_staged()?;
        let mut discarded = current
            .iter()
            .map(|entry| entry.tag.clone())
            .collect::<Vec<_>>();
        if !current.is_empty() {
            let revision = self
                .repository
                .get_state()?
                .map_or(0, |state| state.staged_revision);
            ensure_mutation(self.clear_staged(revision))?;
        }
        discarded.sort();
        Ok(TagDiscardResult { discarded })
    }

    pub fn update_public_entry(
        &self,
        request: &TagVocabularyEntryUpdateRequest,
    ) -> Result<TagEntryUpdateResult, String> {
        self.ensure_initialized()?;
        let mut candidate = self.repository.load_candidate()?;
        let Some(index) = candidate
            .entries
            .iter()
            .position(|entry| entry.tag == request.original_tag.trim())
        else {
            return Ok(TagEntryUpdateResult {
                mutated: false,
                updated: None,
                diagnostic: Some(TagDiagnostic {
                    code: "tag_vocabulary_entry_not_found".into(),
                    message: "The Tag Vocabulary entry to update was not found.".into(),
                    details: BTreeMap::from([("originalTag".into(), request.original_tag.clone())]),
                }),
            });
        };
        let target = request.tag.trim();
        if target.is_empty() || request.facet.trim().is_empty() {
            return Err("invalid_request".into());
        }
        if candidate
            .entries
            .iter()
            .enumerate()
            .any(|(candidate_index, entry)| {
                candidate_index != index && entry.tag.eq_ignore_ascii_case(target)
            })
        {
            return Ok(TagEntryUpdateResult {
                mutated: false,
                updated: None,
                diagnostic: Some(TagDiagnostic {
                    code: "tag_vocabulary_entry_conflict".into(),
                    message: "Another Tag Vocabulary entry already uses that tag.".into(),
                    details: BTreeMap::from([
                        ("originalTag".into(), request.original_tag.clone()),
                        ("targetTag".into(), target.into()),
                    ]),
                }),
            });
        }
        let expected_hash = nonempty(candidate.state.vocabulary_hash.clone());
        let original_tag = candidate.entries[index].tag.clone();
        candidate.entries[index].tag = target.into();
        candidate.entries[index].facet = request.facet.trim().into();
        candidate.entries[index].note = request.note.trim().into();
        candidate.entries[index].updated_at = (self.now)();
        if original_tag != target {
            for entry in &mut candidate.entries {
                if entry.replacement == original_tag {
                    entry.replacement = target.into();
                    entry.updated_at = (self.now)();
                }
            }
            for alias in &mut candidate.aliases {
                if alias.tag == original_tag {
                    alias.tag = target.into();
                    alias.updated_at = (self.now)();
                }
            }
        }
        protect_builtin_candidate(&mut candidate, &(self.now)())?;
        refresh_candidate_hash(&mut candidate)?;
        let updated = candidate
            .entries
            .iter()
            .find(|entry| entry.tag == target)
            .map(public_entry)
            .transpose()?
            .ok_or_else(|| "repair_required".to_owned())?;
        ensure_mutation(self.save(expected_hash.as_deref(), &candidate))?;
        Ok(TagEntryUpdateResult {
            mutated: true,
            updated: Some(updated),
            diagnostic: None,
        })
    }

    pub fn delete_public_entry(
        &self,
        request: &TagVocabularyEntryDeleteRequest,
    ) -> Result<TagEntryDeleteResult, String> {
        self.ensure_initialized()?;
        let mut candidate = self.repository.load_candidate()?;
        let original = request.original_tag.trim();
        if !candidate.entries.iter().any(|entry| entry.tag == original) {
            return Ok(TagEntryDeleteResult {
                mutated: false,
                deleted: Vec::new(),
            });
        }
        let expected_hash = nonempty(candidate.state.vocabulary_hash.clone());
        candidate.entries.retain(|entry| entry.tag != original);
        for entry in &mut candidate.entries {
            if entry.replacement == original {
                entry.replacement.clear();
                entry.updated_at = (self.now)();
            }
        }
        candidate.aliases.retain(|alias| alias.tag != original);
        protect_builtin_candidate(&mut candidate, &(self.now)())?;
        refresh_candidate_hash(&mut candidate)?;
        ensure_mutation(self.save(expected_hash.as_deref(), &candidate))?;
        Ok(TagEntryDeleteResult {
            mutated: true,
            deleted: vec![original.into()],
        })
    }

    pub fn promote_public(
        &self,
        request: &TagSelectionRequest,
    ) -> Result<TagPromoteResult, String> {
        self.ensure_initialized()?;
        self.ensure_staged_bindings_migrated()?;
        let requested = normalized_tag_set(&request.tags);
        if requested.is_empty() {
            return Ok(TagPromoteResult {
                promoted: Vec::new(),
                skipped: Vec::new(),
            });
        }
        let candidate = self.repository.load_candidate()?;
        let staged = self.repository.list_staged()?;
        let existing = candidate
            .entries
            .iter()
            .map(|entry| entry.tag.to_lowercase())
            .collect::<HashSet<_>>();
        let mut promoted = staged
            .iter()
            .filter(|entry| {
                requested.contains(&entry.tag.to_lowercase())
                    && !existing.contains(&entry.tag.to_lowercase())
            })
            .map(|entry| entry.tag.clone())
            .collect::<Vec<_>>();
        let mut skipped = staged
            .iter()
            .filter(|entry| {
                requested.contains(&entry.tag.to_lowercase())
                    && existing.contains(&entry.tag.to_lowercase())
            })
            .map(|entry| entry.tag.clone())
            .collect::<Vec<_>>();
        if !promoted.is_empty() {
            let result = self.promote(&TagPromoteRequest {
                expected_vocabulary_hash: candidate.state.vocabulary_hash,
                expected_staged_revision: candidate.state.staged_revision,
                tags: request.tags.clone(),
            });
            ensure_mutation(result)?;
        }
        promoted.sort();
        skipped.sort();
        Ok(TagPromoteResult { promoted, skipped })
    }

    pub fn preview_public_import(
        &self,
        imported: &TagVocabularySaveRequest,
    ) -> Result<TagImportPreview, String> {
        let current = self.load_public_vocabulary()?;
        let local = current
            .entries
            .iter()
            .cloned()
            .map(|entry| (entry.tag.clone(), entry))
            .collect::<HashMap<_, _>>();
        let mut builtins = Vec::new();
        let mut additions = Vec::new();
        let mut unchanged = Vec::new();
        let mut conflicts = Vec::new();
        for entry in &imported.entries {
            match local.get(&entry.tag) {
                Some(local_entry) if BUILTIN_TAGS.contains(&entry.tag.as_str()) => {
                    builtins.push(TagImportConflict {
                        tag: entry.tag.clone(),
                        local: local_entry.clone(),
                        imported: entry.clone(),
                    });
                }
                Some(local_entry) if local_entry == entry => unchanged.push(entry.clone()),
                Some(local_entry) => conflicts.push(TagImportConflict {
                    tag: entry.tag.clone(),
                    local: local_entry.clone(),
                    imported: entry.clone(),
                }),
                None => additions.push(entry.clone()),
            }
        }
        let validation_request = TagVocabularySaveRequest {
            entries: merge_public_entries(&current.entries, &imported.entries),
            aliases: current.aliases,
            abbrev: current
                .abbrev
                .into_iter()
                .chain(imported.abbrev.clone())
                .collect(),
            protocol: imported.protocol.clone().or(Some(current.protocol)),
            transaction_id: None,
        };
        let warnings = self.validate_public(Some(&validation_request))?;
        builtins.sort_by(|left, right| left.tag.cmp(&right.tag));
        additions.sort_by(|left, right| left.tag.cmp(&right.tag));
        unchanged.sort_by(|left, right| left.tag.cmp(&right.tag));
        conflicts.sort_by(|left, right| left.tag.cmp(&right.tag));
        Ok(TagImportPreview {
            action: "preview".into(),
            builtins,
            additions,
            unchanged,
            conflicts,
            warnings,
        })
    }

    pub fn apply_public_import(
        &self,
        imported: &TagVocabularySaveRequest,
        action: &str,
    ) -> Result<TagMutationResult, String> {
        let current = self.load_public_vocabulary()?;
        let preview = self.preview_public_import(imported)?;
        let entries = match action {
            "use-imported" => merge_public_entries(&current.entries, &imported.entries),
            "merge-non-conflicting" => {
                let imported_builtins = imported
                    .entries
                    .iter()
                    .filter(|entry| BUILTIN_TAGS.contains(&entry.tag.as_str()))
                    .cloned()
                    .collect::<Vec<_>>();
                let imported_builtin_tags = imported_builtins
                    .iter()
                    .map(|entry| entry.tag.clone())
                    .collect::<HashSet<_>>();
                current
                    .entries
                    .iter()
                    .filter(|entry| !imported_builtin_tags.contains(&entry.tag))
                    .cloned()
                    .chain(preview.additions)
                    .chain(imported_builtins)
                    .collect()
            }
            _ => return Err("invalid_request".into()),
        };
        let request = TagVocabularySaveRequest {
            entries,
            aliases: current.aliases,
            abbrev: current
                .abbrev
                .into_iter()
                .chain(imported.abbrev.clone())
                .collect(),
            protocol: imported.protocol.clone().or(Some(current.protocol)),
            transaction_id: imported.transaction_id.clone(),
        };
        ensure_mutation(self.save_public(&request))
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

    pub fn stage(
        &self,
        expected_revision: i64,
        staged: &[TagStagedSuggestionRecord],
    ) -> TagMutationResult {
        self.replace_staged(expected_revision, staged)
    }

    pub fn clear_staged(&self, expected_revision: i64) -> TagMutationResult {
        self.replace_staged(expected_revision, &[])
    }

    pub fn promote(&self, request: &TagPromoteRequest) -> TagMutationResult {
        if request.expected_vocabulary_hash.is_empty()
            || request.tags.is_empty()
            || request.tags.len() > 100
        {
            return self.result(TagMutationStatus::InvalidRequest, Vec::new(), Vec::new());
        }
        if self.ensure_staged_bindings_migrated().is_err() {
            return self.result(TagMutationStatus::EngineFailed, Vec::new(), Vec::new());
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
        let (_, warnings) = self.apply_effect_batches(&promotion.effects, &now);
        self.result(
            TagMutationStatus::Committed,
            promoted_keys.into_iter().collect(),
            warnings,
        )
    }

    pub fn rebuild_index(&self, expected_vocabulary_hash: &str) -> TagMutationResult {
        self.rebuild_index_with_checkpoint(expected_vocabulary_hash, &|| Ok(()))
    }

    pub fn rebuild_index_with_checkpoint(
        &self,
        expected_vocabulary_hash: &str,
        checkpoint: &PromotionCheckpoint<'_>,
    ) -> TagMutationResult {
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
        if checkpoint().is_err() {
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

    pub fn replace_audits(
        &self,
        library_id: i64,
        records: &[TagAuditRecord],
    ) -> Result<usize, String> {
        if library_id <= 0
            || records.len() > 10_000
            || records
                .iter()
                .any(|record| record.library_id != library_id || record.item_key.trim().is_empty())
        {
            return Err("invalid_request".into());
        }
        let now = (self.now)();
        let records = records
            .iter()
            .cloned()
            .map(|mut record| {
                if record.audited_at.is_empty() {
                    record.audited_at = now.clone();
                }
                record.updated_at = now.clone();
                record
            })
            .collect::<Vec<_>>();
        self.repository.replace_audits(library_id, &records)?;
        Ok(records.len())
    }

    pub fn clear_audit(&self, library_id: i64, item_key: &str) -> Result<(), String> {
        if library_id <= 0 || item_key.trim().is_empty() {
            return Err("invalid_request".into());
        }
        let now = (self.now)();
        self.repository.upsert_audit(&TagAuditRecord {
            library_id,
            item_key: item_key.trim().into(),
            needs_tag_regulation: 0,
            non_compliant_tags_json: "[]".into(),
            audited_at: now.clone(),
            updated_at: now,
        })
    }

    /// Replays only durable pending intents.  Effects use their stable
    /// `effect_id`, so the Host's ensure-present contract turns an uncertain
    /// post-effect response into an already-satisfied receipt rather than a
    /// duplicate Zotero mutation.
    pub fn reconcile_pending_effects(&self, limit: usize) -> Result<usize, String> {
        if limit == 0 || limit > 100 {
            return Err("invalid_request".into());
        }
        let effects = self.repository.list_pending_effects(limit)?;
        let now = (self.now)();
        let (reconciled, warnings) = self.apply_effect_batches(&effects, &now);
        if warnings
            .iter()
            .any(|warning| warning == "tag_effect_receipt_failed")
        {
            return Err("tag_effect_receipt_failed".into());
        }
        Ok(reconciled)
    }

    fn apply_effect_batches(&self, effects: &[TagEffectRecord], now: &str) -> (usize, Vec<String>) {
        let mut reconciled = 0;
        let mut warnings = Vec::new();
        for batch in effects.chunks(TAG_EFFECT_BATCH_MAX) {
            let receipts = self.host.apply_batch(batch).and_then(|receipts| {
                validate_effect_receipts(batch, &receipts)?;
                Ok(receipts)
            });
            let updates = match receipts {
                Ok(receipts) => {
                    if receipts
                        .iter()
                        .any(|receipt| matches!(receipt.status.as_str(), "not_found" | "failed"))
                    {
                        warnings.push("tag_host_effect_failed".into());
                    }
                    reconciled += receipts.len();
                    receipts
                        .into_iter()
                        .map(|receipt| TagEffectReceiptRecord {
                            effect_id: receipt.effect_id,
                            status: receipt.status,
                            occurred_at: receipt.occurred_at,
                            diagnostics_json: serde_json::to_string(&receipt.diagnostics)
                                .unwrap_or_else(|_| "[]".into()),
                            updated_at: now.into(),
                        })
                        .collect::<Vec<_>>()
                }
                Err(error) => {
                    warnings.push("tag_host_effect_failed".into());
                    let diagnostics_json =
                        serde_json::to_string(&vec![error]).unwrap_or_else(|_| "[]".into());
                    batch
                        .iter()
                        .map(|effect| TagEffectReceiptRecord {
                            effect_id: effect.effect_id.clone(),
                            status: "pending".into(),
                            occurred_at: String::new(),
                            diagnostics_json: diagnostics_json.clone(),
                            updated_at: now.into(),
                        })
                        .collect::<Vec<_>>()
                }
            };
            if self.repository.update_effect_receipts(&updates).is_err() {
                warnings.push("tag_effect_receipt_failed".into());
            }
        }
        warnings.sort();
        warnings.dedup();
        (reconciled, warnings)
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

    fn ensure_initialized(&self) -> Result<(), String> {
        if self.repository.get_state()?.is_none() {
            ensure_mutation(self.initialize_builtin_policy())?;
        }
        Ok(())
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

fn nonempty(value: String) -> Option<String> {
    (!value.is_empty()).then_some(value)
}

fn default_protocol() -> TagProtocol {
    TagProtocol {
        version: Some(DEFAULT_PROTOCOL_VERSION.into()),
        tag_pattern: DEFAULT_TAG_PATTERN.into(),
        max_tag_length: DEFAULT_MAX_TAG_LENGTH,
        facets: DEFAULT_FACETS.iter().map(|facet| (*facet).into()).collect(),
    }
}

fn normalized_facet(facet: &str, tag: &str) -> String {
    let facet = facet.trim();
    if !facet.is_empty() {
        return facet.into();
    }
    tag.split_once(':')
        .map_or_else(String::new, |(prefix, _)| prefix.trim().into())
}

fn public_entry(record: &TagVocabularyEntryRecord) -> Result<TagVocabularyEntry, String> {
    Ok(TagVocabularyEntry {
        tag: record.tag.clone(),
        facet: record.facet.clone(),
        note: nonempty(record.note.clone()),
        source: nonempty(record.source.clone()),
        deprecated: record.deprecated != 0,
        replacement: nonempty(record.replacement.clone()),
        aliases: serde_json::from_str(&record.aliases_json).map_err(|_| "repository_invalid")?,
        abbrev: serde_json::from_str(&record.abbrev_json).map_err(|_| "repository_invalid")?,
        usage_count: (record.usage_count != 0).then_some(record.usage_count),
        last_synced_at: nonempty(record.last_synced_at.clone()),
    })
}

fn public_protocol(record: &TagProtocolRecord) -> Result<TagProtocol, String> {
    Ok(TagProtocol {
        version: nonempty(record.version.clone()),
        tag_pattern: record.tag_pattern.clone(),
        max_tag_length: record.max_tag_length,
        facets: serde_json::from_str(&record.facets_json).map_err(|_| "repository_invalid")?,
    })
}

fn public_warning(record: &TagValidationWarningRecord) -> Result<TagValidationWarning, String> {
    Ok(TagValidationWarning {
        code: record.code.clone(),
        severity: record.severity.clone(),
        tag: nonempty(record.tag.clone()),
        message: record.message.clone(),
    })
}

fn public_snapshot(candidate: &TagVocabularyReplacement) -> Result<TagVocabularySnapshot, String> {
    let entries = candidate
        .entries
        .iter()
        .map(public_entry)
        .collect::<Result<Vec<_>, _>>()?;
    let aliases = candidate
        .aliases
        .iter()
        .map(|record| (record.alias.clone(), record.tag.clone()))
        .collect::<BTreeMap<_, _>>();
    let abbrev = candidate
        .abbrevs
        .iter()
        .map(|record| (record.abbrev_key.clone(), record.abbrev_value.clone()))
        .collect::<BTreeMap<_, _>>();
    let protocol = candidate
        .protocols
        .first()
        .map(public_protocol)
        .transpose()?
        .unwrap_or_else(default_protocol);
    let validation_warnings = candidate
        .warnings
        .iter()
        .map(public_warning)
        .collect::<Result<Vec<_>, _>>()?;
    let manifest_hash = canonical_json_hash(&json!({
        "entries": entries,
        "aliases": aliases,
        "abbrev": abbrev,
        "protocol": protocol,
    }))?;
    let active_count = entries.iter().filter(|entry| !entry.deprecated).count();
    Ok(TagVocabularySnapshot {
        manifest: TagVocabularyManifest {
            manifest_hash,
            entry_count: entries.len(),
            tag_count: entries.len(),
            active_count,
            updated_at: candidate.state.updated_at.clone(),
            source_protocol_version: protocol.version.clone().unwrap_or_default(),
            projection_target: "tag-index".into(),
        },
        entries,
        aliases,
        abbrev,
        protocol,
        validation_warnings,
    })
}

fn entry_record(
    entry: &TagVocabularyEntry,
    existing: Option<&TagVocabularyEntryRecord>,
    now: &str,
) -> Result<TagVocabularyEntryRecord, String> {
    let tag = entry.tag.trim();
    if tag.is_empty() {
        return Err("invalid_request".into());
    }
    let facet = normalized_facet(&entry.facet, tag);
    if facet.is_empty() {
        return Err("invalid_request".into());
    }
    Ok(TagVocabularyEntryRecord {
        tag: tag.into(),
        facet,
        note: entry.note.as_deref().unwrap_or_default().trim().into(),
        source: entry.source.as_deref().unwrap_or("manual").trim().into(),
        deprecated: i64::from(entry.deprecated),
        replacement: entry
            .replacement
            .as_deref()
            .unwrap_or_default()
            .trim()
            .into(),
        aliases_json: serde_json::to_string(&entry.aliases)
            .map_err(|_| "invalid_request".to_owned())?,
        abbrev_json: serde_json::to_string(&entry.abbrev)
            .map_err(|_| "invalid_request".to_owned())?,
        usage_count: entry.usage_count.unwrap_or_default(),
        last_synced_at: entry.last_synced_at.clone().unwrap_or_default(),
        created_at: existing
            .map(|record| record.created_at.clone())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| now.into()),
        updated_at: now.into(),
    })
}

fn protocol_record(protocol: &TagProtocol, now: &str) -> Result<TagProtocolRecord, String> {
    if protocol.tag_pattern.trim().is_empty()
        || protocol.max_tag_length <= 0
        || protocol.facets.is_empty()
    {
        return Err("invalid_request".into());
    }
    Ok(TagProtocolRecord {
        protocol_id: "default".into(),
        version: protocol
            .version
            .clone()
            .unwrap_or_else(|| DEFAULT_PROTOCOL_VERSION.into()),
        tag_pattern: protocol.tag_pattern.clone(),
        max_tag_length: protocol.max_tag_length,
        facets_json: serde_json::to_string(&protocol.facets)
            .map_err(|_| "invalid_request".to_owned())?,
        updated_at: now.into(),
    })
}

fn public_save_candidate(
    request: &TagVocabularySaveRequest,
    current: &TagVocabularyReplacement,
    now: &str,
) -> Result<TagVocabularyReplacement, String> {
    if request.entries.len() > 100_000 {
        return Err("invalid_request".into());
    }
    let existing = current
        .entries
        .iter()
        .map(|record| (record.tag.to_lowercase(), record))
        .collect::<HashMap<_, _>>();
    let mut entries = request
        .entries
        .iter()
        .map(|entry| entry_record(entry, existing.get(&entry.tag.to_lowercase()).copied(), now))
        .collect::<Result<Vec<_>, _>>()?;
    for builtin in BUILTIN_TAGS {
        if !entries.iter().any(|entry| entry.tag == *builtin)
            && let Some(record) = existing.get(*builtin)
        {
            entries.push((*record).clone());
        }
    }
    let protocol = request.protocol.clone().unwrap_or_else(default_protocol);
    let existing_aliases = current
        .aliases
        .iter()
        .map(|record| (record.alias.as_str(), record))
        .collect::<HashMap<_, _>>();
    let existing_abbrev = current
        .abbrevs
        .iter()
        .map(|record| (record.abbrev_key.as_str(), record))
        .collect::<HashMap<_, _>>();
    let mut candidate = TagVocabularyReplacement {
        state: TagApplicationStateRecord {
            singleton_id: 1,
            staged_revision: current.state.staged_revision,
            index_hash: current.state.index_hash.clone(),
            index_basis_hash: current.state.index_basis_hash.clone(),
            index_json: current.state.index_json.clone(),
            index_stale: 1,
            updated_at: now.into(),
            ..TagApplicationStateRecord::default()
        },
        entries,
        aliases: request
            .aliases
            .iter()
            .map(|(alias, tag)| TagAliasRecord {
                alias: alias.trim().into(),
                tag: tag.trim().into(),
                created_at: existing_aliases
                    .get(alias.as_str())
                    .map(|record| record.created_at.clone())
                    .filter(|value| !value.is_empty())
                    .unwrap_or_else(|| now.into()),
                updated_at: now.into(),
            })
            .collect(),
        abbrevs: request
            .abbrev
            .iter()
            .map(|(key, value)| TagAbbrevRecord {
                abbrev_key: key.trim().to_lowercase(),
                abbrev_value: value.trim().into(),
                created_at: existing_abbrev
                    .get(key.as_str())
                    .map(|record| record.created_at.clone())
                    .filter(|value| !value.is_empty())
                    .unwrap_or_else(|| now.into()),
                updated_at: now.into(),
            })
            .collect(),
        protocols: vec![protocol_record(&protocol, now)?],
        warnings: Vec::new(),
    };
    protect_builtin_candidate(&mut candidate, now)?;
    refresh_candidate_hash(&mut candidate)?;
    Ok(candidate)
}

fn protect_builtin_candidate(
    candidate: &mut TagVocabularyReplacement,
    now: &str,
) -> Result<(), String> {
    if candidate.protocols.is_empty() {
        candidate
            .protocols
            .push(protocol_record(&default_protocol(), now)?);
    }
    for protocol in &mut candidate.protocols {
        let mut facets = serde_json::from_str::<Vec<String>>(&protocol.facets_json)
            .map_err(|_| "invalid_request".to_owned())?;
        if !facets.iter().any(|facet| facet == "status") {
            facets.push("status".into());
            protocol.facets_json =
                serde_json::to_string(&facets).map_err(|_| "invalid_request".to_owned())?;
            protocol.updated_at = now.into();
        }
    }
    for tag in BUILTIN_TAGS {
        if let Some(entry) = candidate.entries.iter_mut().find(|entry| entry.tag == *tag) {
            entry.facet = "status".into();
            entry.source = "builtin".into();
            entry.deprecated = 0;
            entry.replacement.clear();
            entry.updated_at = now.into();
        } else {
            candidate.entries.push(TagVocabularyEntryRecord {
                tag: (*tag).into(),
                facet: "status".into(),
                source: "builtin".into(),
                aliases_json: "[]".into(),
                abbrev_json: "[]".into(),
                created_at: now.into(),
                updated_at: now.into(),
                ..TagVocabularyEntryRecord::default()
            });
        }
    }
    candidate
        .entries
        .sort_by(|left, right| left.tag.cmp(&right.tag));
    let mut seen = HashSet::new();
    if candidate
        .entries
        .iter()
        .any(|entry| !seen.insert(entry.tag.to_lowercase()))
    {
        return Err("invalid_request".into());
    }
    Ok(())
}

fn refresh_candidate_hash(candidate: &mut TagVocabularyReplacement) -> Result<(), String> {
    candidate.state.singleton_id = 1;
    candidate.state.vocabulary_hash = canonical_json_hash(&json!({
        "entries": candidate.entries.iter().map(|entry| json!({
            "tag": entry.tag,
            "facet": entry.facet,
            "note": entry.note,
            "source": entry.source,
            "deprecated": entry.deprecated,
            "replacement": entry.replacement,
            "aliases": entry.aliases_json,
            "abbrev": entry.abbrev_json,
            "usageCount": entry.usage_count,
            "lastSyncedAt": entry.last_synced_at,
        })).collect::<Vec<_>>(),
        "aliases": candidate.aliases.iter().map(|entry| json!({
            "alias": entry.alias,
            "tag": entry.tag,
        })).collect::<Vec<_>>(),
        "abbrevs": candidate.abbrevs.iter().map(|entry| json!({
            "key": entry.abbrev_key,
            "value": entry.abbrev_value,
        })).collect::<Vec<_>>(),
        "protocols": candidate.protocols.iter().map(|entry| json!({
            "version": entry.version,
            "tagPattern": entry.tag_pattern,
            "maxTagLength": entry.max_tag_length,
            "facets": entry.facets_json,
        })).collect::<Vec<_>>(),
    }))?;
    candidate.state.index_stale = 1;
    Ok(())
}

fn public_staged_suggestion(
    record: &TagStagedSuggestionRecord,
) -> Result<TagStagedSuggestion, String> {
    Ok(TagStagedSuggestion {
        tag: record.tag.clone(),
        facet: record.facet.clone(),
        note: nonempty(record.note.clone()),
        source_flow: if record.source_flow.is_empty() {
            "tag-regulator-suggest".into()
        } else {
            record.source_flow.clone()
        },
        parent_bindings: serde_json::from_str(&record.parent_bindings_json)
            .map_err(|_| "repository_invalid".to_owned())?,
        created_at: record.created_at.clone(),
        updated_at: record.updated_at.clone(),
    })
}

fn merge_staged_record(
    existing: Option<&TagStagedSuggestionRecord>,
    input: &TagSuggestionInput,
    now: &str,
) -> Result<TagStagedSuggestionRecord, String> {
    let tag = input.tag.trim();
    if tag.is_empty() {
        return Err("invalid_request".into());
    }
    let mut bindings = existing
        .map(|record| serde_json::from_str::<Vec<TagParentBinding>>(&record.parent_bindings_json))
        .transpose()
        .map_err(|_| "repository_invalid".to_owned())?
        .unwrap_or_default();
    bindings.extend(input.parent_bindings.clone());
    let mut seen = HashSet::new();
    bindings.retain(|binding| {
        binding.library_id > 0
            && !binding.item_key.trim().is_empty()
            && seen.insert((binding.library_id, binding.item_key.clone()))
    });
    let existing_note = existing
        .map(|record| record.note.as_str())
        .unwrap_or_default();
    let existing_source = existing
        .map(|record| record.source_flow.as_str())
        .unwrap_or_default();
    Ok(TagStagedSuggestionRecord {
        tag: tag.into(),
        facet: normalized_facet(
            if input.facet.trim().is_empty() {
                existing
                    .map(|record| record.facet.as_str())
                    .unwrap_or_default()
            } else {
                &input.facet
            },
            tag,
        ),
        note: if input.note.trim().is_empty() {
            existing_note.into()
        } else {
            input.note.trim().into()
        },
        source_flow: if input.source_flow.trim().is_empty() {
            if existing_source.is_empty() {
                "tag-regulator-suggest".into()
            } else {
                existing_source.into()
            }
        } else {
            input.source_flow.trim().into()
        },
        parent_bindings_json: serde_json::to_string(&bindings)
            .map_err(|_| "invalid_request".to_owned())?,
        created_at: existing
            .map(|record| record.created_at.clone())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| now.into()),
        updated_at: now.into(),
    })
}

fn normalized_tag_set(tags: &[String]) -> HashSet<String> {
    tags.iter()
        .map(|tag| tag.trim().to_lowercase())
        .filter(|tag| !tag.is_empty())
        .collect()
}

fn merge_public_entries(
    local: &[TagVocabularyEntry],
    imported: &[TagVocabularyEntry],
) -> Vec<TagVocabularyEntry> {
    let mut entries = local
        .iter()
        .cloned()
        .map(|entry| (entry.tag.clone(), entry))
        .collect::<BTreeMap<_, _>>();
    entries.extend(
        imported
            .iter()
            .cloned()
            .map(|entry| (entry.tag.clone(), entry)),
    );
    entries.into_values().collect()
}

fn ensure_mutation(result: TagMutationResult) -> Result<TagMutationResult, String> {
    match result.status {
        TagMutationStatus::Committed | TagMutationStatus::Unchanged => Ok(result),
        TagMutationStatus::NotFound => Err("not_found".into()),
        TagMutationStatus::Conflict => Err("conflict".into()),
        TagMutationStatus::BasisMismatch => Err("basis_mismatch".into()),
        TagMutationStatus::TagVocabularyBusy => Err("tag_vocabulary_busy".into()),
        TagMutationStatus::InvalidRequest => Err("invalid_request".into()),
        TagMutationStatus::EngineFailed => Err("engine_failed".into()),
        TagMutationStatus::WorkerFailed => Err("worker_failed".into()),
        TagMutationStatus::Stopping => Err("stopping".into()),
        TagMutationStatus::RepairRequired => Err("repair_required".into()),
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

fn validate_effect_receipts(
    effects: &[TagEffectRecord],
    receipts: &[TagHostEffectReceipt],
) -> Result<(), String> {
    if receipts.len() != effects.len()
        || receipts.is_empty()
        || receipts.len() > TAG_EFFECT_BATCH_MAX
    {
        return Err("tag_effect_receipt_invalid".into());
    }
    let expected = effects
        .iter()
        .map(|effect| effect.effect_id.as_str())
        .collect::<HashSet<_>>();
    let actual = receipts
        .iter()
        .map(|receipt| receipt.effect_id.as_str())
        .collect::<HashSet<_>>();
    if actual.len() != receipts.len()
        || actual != expected
        || receipts.iter().any(|receipt| {
            !matches!(
                receipt.status.as_str(),
                "applied" | "already_satisfied" | "not_found" | "failed"
            ) || synthesis_protocol::unix_millis_from_utc_iso8601(&receipt.occurred_at).is_none()
                || receipt.diagnostics.len() > 20
        })
    {
        return Err("tag_effect_receipt_invalid".into());
    }
    Ok(())
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

fn inspect_stored_bindings(value: &str) -> (Vec<TagParentBinding>, Vec<i64>, usize) {
    let Ok(Value::Array(values)) = serde_json::from_str::<Value>(value) else {
        return (Vec::new(), Vec::new(), 1);
    };
    let mut stable = BTreeMap::new();
    let mut legacy = BTreeMap::new();
    let mut invalid = 0;
    for value in values {
        if let Some(item_id) = value.as_i64().filter(|value| *value > 0) {
            legacy.insert(item_id, ());
            continue;
        }
        match serde_json::from_value::<TagParentBinding>(value) {
            Ok(binding)
                if binding.library_id > 0
                    && !binding.item_key.is_empty()
                    && binding.item_key.len() <= 128
                    && binding
                        .item_key
                        .bytes()
                        .all(|byte| byte.is_ascii_alphanumeric()) =>
            {
                stable.insert((binding.library_id, binding.item_key.clone()), binding);
            }
            _ => invalid += 1,
        }
    }
    (
        stable.into_values().collect(),
        legacy.into_keys().collect(),
        invalid,
    )
}

fn validate_legacy_resolution(
    library_id: i64,
    requested: &[i64],
    result: &TagLegacyBindingResolution,
) -> Result<(), String> {
    if result.diagnostics.len() > 20 {
        return Err("staged_tag_binding_resolution_invalid".into());
    }
    let requested = requested.iter().copied().collect::<HashSet<_>>();
    let mut partition = HashSet::new();
    for (item_id, reference) in &result.resolved {
        if !requested.contains(item_id)
            || !partition.insert(*item_id)
            || reference.library_id != library_id
            || reference.item_key.is_empty()
            || reference.item_key.len() > 128
            || !reference
                .item_key
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric())
        {
            return Err("staged_tag_binding_resolution_invalid".into());
        }
    }
    for item_id in &result.missing_item_ids {
        if !requested.contains(item_id) || !partition.insert(*item_id) {
            return Err("staged_tag_binding_resolution_invalid".into());
        }
    }
    if partition != requested {
        return Err("staged_tag_binding_resolution_invalid".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ports::RepositoryPort;
    use std::sync::{Barrier, Mutex};
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

    struct Host {
        available: AtomicBool,
        batch_sizes: Arc<Mutex<Vec<usize>>>,
        statuses: Vec<String>,
    }

    impl Host {
        fn new(available: bool) -> Self {
            Self {
                available: AtomicBool::new(available),
                batch_sizes: Arc::new(Mutex::new(Vec::new())),
                statuses: Vec::new(),
            }
        }

        fn with_statuses(statuses: &[&str]) -> Self {
            Self {
                available: AtomicBool::new(true),
                batch_sizes: Arc::new(Mutex::new(Vec::new())),
                statuses: statuses.iter().map(|status| (*status).into()).collect(),
            }
        }
    }

    impl TagHostEffectPort for Host {
        fn apply_batch(
            &self,
            effects: &[TagEffectRecord],
        ) -> Result<Vec<TagHostEffectReceipt>, String> {
            self.batch_sizes
                .lock()
                .expect("batch sizes")
                .push(effects.len());
            if self.available.load(Ordering::Relaxed) {
                Ok(effects
                    .iter()
                    .enumerate()
                    .map(|(index, effect)| TagHostEffectReceipt {
                        effect_id: effect.effect_id.clone(),
                        status: self
                            .statuses
                            .get(index)
                            .cloned()
                            .unwrap_or_else(|| "applied".into()),
                        occurred_at: "2026-08-03T00:00:00.000Z".into(),
                        diagnostics: Vec::new(),
                    })
                    .collect())
            } else {
                Err("host_unavailable".into())
            }
        }
    }

    struct Resolver;
    impl TagLegacyBindingResolverPort for Resolver {
        fn resolve(
            &self,
            _library_id: i64,
            item_ids: &[i64],
        ) -> Result<TagLegacyBindingResolution, String> {
            Ok(TagLegacyBindingResolution {
                missing_item_ids: item_ids.to_vec(),
                ..TagLegacyBindingResolution::default()
            })
        }
    }

    struct RecordingResolver {
        calls: Arc<Mutex<Vec<Vec<i64>>>>,
        fail: AtomicBool,
        missing: HashSet<i64>,
    }

    impl TagLegacyBindingResolverPort for RecordingResolver {
        fn resolve(
            &self,
            library_id: i64,
            item_ids: &[i64],
        ) -> Result<TagLegacyBindingResolution, String> {
            self.calls.lock().unwrap().push(item_ids.to_vec());
            if self.fail.load(Ordering::Relaxed) {
                return Err("host_unavailable".into());
            }
            Ok(TagLegacyBindingResolution {
                resolved: item_ids
                    .iter()
                    .filter(|item_id| !self.missing.contains(item_id))
                    .map(|item_id| {
                        (
                            *item_id,
                            TagParentBinding {
                                library_id,
                                item_key: format!("I{item_id:07}"),
                            },
                        )
                    })
                    .collect(),
                missing_item_ids: item_ids
                    .iter()
                    .filter(|item_id| self.missing.contains(item_id))
                    .copied()
                    .collect(),
                diagnostics: Vec::new(),
            })
        }
    }

    fn root() -> synthesis_test_support::TestRoot {
        synthesis_test_support::TestRoot::new("synthesis-tag-application")
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
        let host = Arc::new(Host::new(false));
        let app = TagVocabularyApplication::with_clock(
            Arc::new(RepositoryPort::new(Arc::clone(&owner))),
            Arc::new(Compute),
            host.clone(),
            Arc::new(Resolver),
            Arc::new(|| "fixed".into()),
        );
        assert_eq!(
            app.save(None, &candidate("tag:1")).status,
            TagMutationStatus::Committed
        );
        assert_eq!(
            app.rebuild_index_with_checkpoint("tag:1", &|| Err("operation_canceled".into()))
                .status,
            TagMutationStatus::Stopping
        );
        assert!(app.inspect().expect("inspect").index_hash.is_none());
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
        assert_eq!(app.inspect().expect("inspect").pending_effect_count, 1);
        host.available.store(true, Ordering::Relaxed);
        assert_eq!(app.reconcile_pending_effects(100).expect("reconcile"), 1);
        assert_eq!(app.inspect().expect("inspect").pending_effect_count, 0);
        app.stop_admission();
        assert_eq!(
            app.save(Some("irrelevant"), &candidate("tag:3")).status,
            TagMutationStatus::Stopping
        );
        app.shutdown(Duration::from_secs(1)).expect("shutdown");
        drop(app);
        drop(owner);
    }

    #[test]
    fn batches_two_hundred_fifty_effects_as_one_hundred_one_hundred_fifty() {
        let root = root();
        let owner = Arc::new(Mutex::new(
            Repository::open(
                &root,
                RepositoryIdentity {
                    profile_id: "profile-batch".into(),
                    data_root_id: "data-batch".into(),
                },
            )
            .expect("repository"),
        ));
        let host = Arc::new(Host::new(true));
        let app = TagVocabularyApplication::with_clock(
            Arc::new(RepositoryPort::new(Arc::clone(&owner))),
            Arc::new(Compute),
            host.clone(),
            Arc::new(Resolver),
            Arc::new(|| "2026-08-03T00:00:00.000Z".into()),
        );
        assert_eq!(
            app.save(None, &candidate("tag:batch")).status,
            TagMutationStatus::Committed
        );
        let parent_bindings_json = serde_json::to_string(
            &(0..250)
                .map(|index| json!({"libraryId":1,"itemKey":format!("I{index:08}")}))
                .collect::<Vec<_>>(),
        )
        .expect("bindings");
        assert_eq!(
            app.stage(
                0,
                &[TagStagedSuggestionRecord {
                    tag: "method:batch".into(),
                    facet: "method".into(),
                    parent_bindings_json,
                    created_at: "2026-08-03T00:00:00.000Z".into(),
                    updated_at: "2026-08-03T00:00:00.000Z".into(),
                    ..TagStagedSuggestionRecord::default()
                }]
            )
            .status,
            TagMutationStatus::Committed
        );
        assert_eq!(
            app.promote(&TagPromoteRequest {
                expected_vocabulary_hash: "tag:batch".into(),
                expected_staged_revision: 1,
                tags: vec!["method:batch".into()],
            })
            .status,
            TagMutationStatus::Committed
        );
        assert_eq!(
            *host.batch_sizes.lock().expect("batch sizes"),
            vec![100, 100, 50]
        );
        assert_eq!(
            owner
                .lock()
                .expect("repository")
                .list_tag_effects()
                .expect("effects")
                .iter()
                .filter(|effect| effect.status == "applied")
                .count(),
            250
        );

        drop(app);
        drop(owner);
    }

    #[test]
    fn persists_mixed_host_receipts_without_collapsing_statuses() {
        let root = root();
        let owner = Arc::new(Mutex::new(
            Repository::open(
                &root,
                RepositoryIdentity {
                    profile_id: "profile-mixed".into(),
                    data_root_id: "data-mixed".into(),
                },
            )
            .expect("repository"),
        ));
        let host = Arc::new(Host::with_statuses(&[
            "applied",
            "already_satisfied",
            "not_found",
            "failed",
        ]));
        let app = TagVocabularyApplication::with_clock(
            Arc::new(RepositoryPort::new(Arc::clone(&owner))),
            Arc::new(Compute),
            host,
            Arc::new(Resolver),
            Arc::new(|| "2026-08-03T00:00:00.000Z".into()),
        );
        assert_eq!(
            app.save(None, &candidate("tag:mixed")).status,
            TagMutationStatus::Committed
        );
        let bindings = serde_json::to_string(
            &(0..4)
                .map(|index| json!({"libraryId":1,"itemKey":format!("M{index:08}")}))
                .collect::<Vec<_>>(),
        )
        .expect("bindings");
        assert_eq!(
            app.stage(
                0,
                &[TagStagedSuggestionRecord {
                    tag: "method:mixed".into(),
                    facet: "method".into(),
                    parent_bindings_json: bindings,
                    created_at: "2026-08-03T00:00:00.000Z".into(),
                    updated_at: "2026-08-03T00:00:00.000Z".into(),
                    ..TagStagedSuggestionRecord::default()
                }]
            )
            .status,
            TagMutationStatus::Committed
        );
        let result = app.promote(&TagPromoteRequest {
            expected_vocabulary_hash: "tag:mixed".into(),
            expected_staged_revision: 1,
            tags: vec!["method:mixed".into()],
        });
        assert_eq!(result.status, TagMutationStatus::Committed);
        assert_eq!(result.warnings, ["tag_host_effect_failed"]);
        assert_eq!(
            owner
                .lock()
                .expect("repository")
                .list_tag_effects()
                .expect("effects")
                .into_iter()
                .map(|effect| effect.status)
                .collect::<HashSet<_>>(),
            HashSet::from([
                "applied".to_owned(),
                "already_satisfied".to_owned(),
                "not_found".to_owned(),
                "failed".to_owned(),
            ])
        );

        drop(app);
        drop(owner);
        let reopened = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile-mixed".into(),
                data_root_id: "data-mixed".into(),
            },
        )
        .expect("reopen repository");
        assert_eq!(reopened.list_tag_effects().expect("effects").len(), 4);
        drop(reopened);
    }

    #[test]
    fn migrates_mixed_legacy_bindings_in_sorted_hundred_item_batches() {
        let root = root();
        let owner = Arc::new(Mutex::new(
            Repository::open(
                &root,
                RepositoryIdentity {
                    profile_id: "profile-migration".into(),
                    data_root_id: "data-migration".into(),
                },
            )
            .expect("repository"),
        ));
        let calls = Arc::new(Mutex::new(Vec::new()));
        let app = Arc::new(
            TagVocabularyApplication::with_clock(
                Arc::new(RepositoryPort::new(Arc::clone(&owner))),
                Arc::new(Compute),
                Arc::new(Host::new(true)),
                Arc::new(RecordingResolver {
                    calls: calls.clone(),
                    fail: AtomicBool::new(false),
                    missing: HashSet::from([2]),
                }),
                Arc::new(|| "2026-08-12T00:00:00.000Z".into()),
            )
            .with_library_id(1),
        );
        assert_eq!(
            app.save(None, &candidate("tag:migration")).status,
            TagMutationStatus::Committed
        );
        let mut bindings = vec![
            json!({"libraryId":1,"itemKey":"STABLE01"}),
            json!({"bad":true}),
        ];
        bindings.extend((1..=101).rev().map(Value::from));
        assert_eq!(
            app.stage(
                0,
                &[TagStagedSuggestionRecord {
                    tag: "method:migration".into(),
                    facet: "method".into(),
                    parent_bindings_json: serde_json::to_string(&bindings).unwrap(),
                    created_at: "fixed".into(),
                    updated_at: "fixed".into(),
                    ..TagStagedSuggestionRecord::default()
                }],
            )
            .status,
            TagMutationStatus::Committed
        );
        let barrier = Arc::new(Barrier::new(3));
        let migrations = (0..2)
            .map(|_| {
                let app = Arc::clone(&app);
                let barrier = Arc::clone(&barrier);
                std::thread::spawn(move || {
                    barrier.wait();
                    app.ensure_staged_bindings_migrated().expect("migration")
                })
            })
            .collect::<Vec<_>>();
        barrier.wait();
        let mut summaries = migrations
            .into_iter()
            .map(|thread| thread.join().expect("migration thread"))
            .collect::<Vec<_>>();
        summaries.sort_by_key(|summary| summary.affected_rows);
        assert_eq!(summaries[0], TagLegacyBindingMigrationSummary::default());
        let summary = &summaries[1];
        assert_eq!(summary.affected_rows, 1);
        assert_eq!(summary.migrated_rows, 1);
        assert_eq!(summary.resolved_bindings, 100);
        assert_eq!(summary.dropped_bindings, 2);
        assert_eq!(
            calls
                .lock()
                .unwrap()
                .iter()
                .map(Vec::len)
                .collect::<Vec<_>>(),
            vec![100, 1]
        );
        let repository = owner.lock().unwrap();
        assert_eq!(
            repository
                .get_tag_application_state()
                .unwrap()
                .unwrap()
                .staged_revision,
            2
        );
        let migrated: Vec<TagParentBinding> = serde_json::from_str(
            &repository.list_tag_staged_suggestions().unwrap()[0].parent_bindings_json,
        )
        .unwrap();
        assert_eq!(migrated.len(), 101);
        assert_eq!(migrated[0].item_key, "I0000001");
        assert!(
            migrated
                .iter()
                .all(|binding| binding.item_key != "I0000002")
        );
        assert_eq!(
            repository
                .get_operation("staged-tag-binding-migration")
                .unwrap()
                .unwrap()
                .status,
            "completed"
        );
        drop(repository);
        drop(app);
        drop(owner);
    }

    #[test]
    fn failed_binding_migration_preserves_rows_and_revision_and_can_retry() {
        let root = root();
        let owner = Arc::new(Mutex::new(
            Repository::open(
                &root,
                RepositoryIdentity {
                    profile_id: "profile-migration-retry".into(),
                    data_root_id: "data-migration-retry".into(),
                },
            )
            .expect("repository"),
        ));
        let resolver = Arc::new(RecordingResolver {
            calls: Arc::new(Mutex::new(Vec::new())),
            fail: AtomicBool::new(true),
            missing: HashSet::new(),
        });
        let app = TagVocabularyApplication::with_clock(
            Arc::new(RepositoryPort::new(Arc::clone(&owner))),
            Arc::new(Compute),
            Arc::new(Host::new(true)),
            resolver.clone(),
            Arc::new(|| "2026-08-12T00:00:00.000Z".into()),
        )
        .with_library_id(1);
        assert_eq!(
            app.save(None, &candidate("tag:migration-retry")).status,
            TagMutationStatus::Committed
        );
        assert_eq!(
            app.stage(
                0,
                &[TagStagedSuggestionRecord {
                    tag: "method:retry".into(),
                    facet: "method".into(),
                    parent_bindings_json: "[7]".into(),
                    created_at: "fixed".into(),
                    updated_at: "fixed".into(),
                    ..TagStagedSuggestionRecord::default()
                }],
            )
            .status,
            TagMutationStatus::Committed
        );
        let before = owner.lock().unwrap().list_tag_staged_suggestions().unwrap();
        let revision = owner
            .lock()
            .unwrap()
            .get_tag_application_state()
            .unwrap()
            .unwrap()
            .staged_revision;
        assert_eq!(app.list_public_staged().unwrap_err(), "unavailable");
        assert_eq!(
            app.stage_public(&TagSuggestionStageRequest {
                entries: Vec::new()
            })
            .unwrap_err(),
            "unavailable"
        );
        assert_eq!(
            app.update_public_staged(&TagStagedUpdateRequest {
                original_tag: "method:retry".into(),
                tag: "method:retry".into(),
                facet: "method".into(),
                note: String::new(),
                source_flow: "fixture".into(),
                parent_bindings: Vec::new(),
            })
            .unwrap_err(),
            "unavailable"
        );
        assert_eq!(
            app.discard_public(&TagSelectionRequest { tags: Vec::new() })
                .unwrap_err(),
            "unavailable"
        );
        assert_eq!(app.clear_public_staged().unwrap_err(), "unavailable");
        assert_eq!(
            app.promote_public(&TagSelectionRequest { tags: Vec::new() })
                .unwrap_err(),
            "unavailable"
        );
        assert_eq!(
            owner.lock().unwrap().list_tag_staged_suggestions().unwrap(),
            before
        );
        assert_eq!(
            owner
                .lock()
                .unwrap()
                .get_tag_application_state()
                .unwrap()
                .unwrap()
                .staged_revision,
            revision
        );
        resolver.fail.store(false, Ordering::Relaxed);
        let staged = app.list_public_staged().expect("retry");
        assert_eq!(staged[0].parent_bindings[0].item_key, "I0000007");
        drop(app);
        drop(owner);
    }
}
