use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use synthesis_application::citation_graph::{
    CitationBuildOutput, CitationGraphComputePort, CitationLayoutRequest, CitationMetricsOutput,
};
use synthesis_application::concept_kb::{ConceptIndexOutput, ConceptKbComputePort};
use synthesis_application::reference_matching::{
    ReferenceMatchPass, ReferenceMatcherInput, ReferenceMatcherOutcome, ReferenceMatcherPort,
};
use synthesis_application::tag_vocabulary::{
    TagHostEffectPort, TagIndexOutput, TagLegacyBindingResolverPort, TagVocabularyComputePort,
};
use synthesis_application::topic_graph::{TopicGraphComputePort, TopicGraphIndexOutput};
use synthesis_application::webdav_sync::{
    WebDavHostDescription, WebDavHostPort, WebDavReadResult, WebDavRetrySchedulerPort,
    WebDavStateStorePort, WebDavSyncState, WebDavWriteResult,
};
use synthesis_application::{
    CanonicalStorePort, CitationGraphApplication, ConceptKbApplication,
    DebugMaintenanceApplication, DurableBundleApplication, ReferenceMatchingApplication,
    ReferenceRefreshApplication, RepositoryPort, TagVocabularyApplication,
    TagVocabularyRepositoryPort, TopicApplication, TopicGraphApplication, WebDavSyncApplication,
    WorkbenchApplication,
};
use synthesis_canonical_store::{CanonicalStore, canonical_json_hash};
use synthesis_repository::Repository;
use synthesis_repository::{
    CitationComplexMetricsRecord, CitationGraphApplicationStateRecord, CitationGraphReplacement,
    CitationLayoutRecord, OperationRecord, ReferenceRedirectFactRecord, TagEffectRecord,
    TagProtocolRecord, TagStagedSuggestionRecord, TagVocabularyEntryRecord,
    TagVocabularyReplacement, TopicGraphReplacement,
};
use synthesis_sidecar::runtime_contract::ProductionAdmission;

use crate::runtime_reverse_host::call_reverse_host;
use crate::runtime_worker_pool::NativeComputePool;

pub(crate) struct ProductionApplications {
    pub(crate) repository: Arc<RepositoryPort>,
    pub(crate) canonical: Arc<CanonicalStorePort>,
    pub(crate) workbench: WorkbenchApplication,
    pub(crate) topics: TopicApplication,
    pub(crate) citations: CitationGraphApplication,
    pub(crate) reference_refresh: ReferenceRefreshApplication,
    pub(crate) reference_matching: ReferenceMatchingApplication,
    pub(crate) tags: TagVocabularyApplication,
    pub(crate) concepts: ConceptKbApplication,
    pub(crate) topic_graph: TopicGraphApplication,
    pub(crate) debug: DebugMaintenanceApplication,
    pub(crate) webdav: WebDavSyncApplication,
    admission: Option<Arc<ProductionAdmission>>,
    service_instance_id: String,
}

impl ProductionApplications {
    pub(crate) fn call_host(&self, capability: &str, payload: Value) -> Result<Value, String> {
        let admission = self
            .admission
            .as_deref()
            .ok_or_else(|| "reverse_host_unavailable".to_owned())?;
        call_reverse_host(admission, &self.service_instance_id, capability, payload)
    }

    pub(crate) fn apply_related_items_effect(&self, payload: Value) -> Result<Value, String> {
        if !payload.is_object() {
            return Err("invalid_request".into());
        }
        self.apply_host_effect_once("effects.related_items.apply_batch", payload)
    }

    pub(crate) fn apply_literature_digest(&self, payload: Value) -> Result<Value, String> {
        let request = payload
            .as_object()
            .ok_or_else(|| "invalid_request".to_owned())?;
        let library_id = request
            .get("libraryId")
            .or_else(|| request.get("library_id"))
            .and_then(Value::as_i64)
            .filter(|value| *value >= 0)
            .ok_or_else(|| "invalid_request".to_owned())?;
        let item_key = request
            .get("itemKey")
            .or_else(|| request.get("item_key"))
            .and_then(Value::as_str)
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| "invalid_request".to_owned())?;
        let source_ref = request
            .get("paperRef")
            .or_else(|| request.get("paper_ref"))
            .and_then(Value::as_str)
            .filter(|value| !value.trim().is_empty())
            .map(str::to_owned)
            .unwrap_or_else(|| format!("{library_id}:{item_key}"));
        let source_hash = canonical_json_hash(&payload)?;
        let operation_id = format!("literature-digest:{source_hash}");
        let now = now_iso_like();
        let repository = self.repository.owner();
        let repository = repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        if let Some(receipt) = repository.get_operation(&operation_id)?
            && matches!(receipt.status.as_str(), "completed" | "succeeded")
        {
            return Ok(serde_json::json!({
                "ok":true,
                "status":"persisted",
                "sourceRef":source_ref,
                "operationId":operation_id,
                "idempotent":true,
            }));
        }
        repository.upsert_operation(&OperationRecord {
            operation_id: operation_id.clone(),
            operation_type: "literature_digest_apply".into(),
            library_id,
            scope_kind: "paper".into(),
            scope_ref: source_ref.clone(),
            status: "completed".into(),
            label: "Apply literature digest".into(),
            phase: "persisted".into(),
            progress_mode: "determinate".into(),
            processed_count: 1,
            total_count: 1,
            source_hash,
            created_at: now.clone(),
            started_at: now.clone(),
            completed_at: now.clone(),
            updated_at: now,
            ..OperationRecord::default()
        })?;
        Ok(serde_json::json!({
            "ok":true,
            "status":"persisted",
            "sourceRef":source_ref,
            "operationId":operation_id,
            "idempotent":false,
        }))
    }

    fn apply_host_effect_once(&self, capability: &str, payload: Value) -> Result<Value, String> {
        let source_hash = canonical_json_hash(&serde_json::json!({
            "capability":capability,
            "payload":payload,
        }))?;
        let operation_id = format!("host-effect:{source_hash}");
        let now = now_iso_like();
        {
            let repository = self.repository.owner();
            let repository = repository
                .lock()
                .map_err(|_| "repository_unavailable".to_owned())?;
            if let Some(receipt) = repository.get_operation(&operation_id)? {
                if matches!(receipt.status.as_str(), "completed" | "succeeded") {
                    return Ok(serde_json::json!({
                        "ok":true,
                        "status":"already_applied",
                        "operationId":operation_id,
                    }));
                }
                if receipt.status == "running" {
                    return Err("operation_in_progress".into());
                }
            }
            repository.upsert_operation(&OperationRecord {
                operation_id: operation_id.clone(),
                operation_type: "related_items_effect".into(),
                scope_kind: "host-effect".into(),
                scope_ref: capability.into(),
                status: "running".into(),
                label: "Apply related-item effect".into(),
                phase: "host_effect".into(),
                progress_mode: "determinate".into(),
                total_count: 1,
                source_hash: source_hash.clone(),
                created_at: now.clone(),
                started_at: now.clone(),
                updated_at: now.clone(),
                ..OperationRecord::default()
            })?;
        }
        match self.call_host(capability, payload) {
            Ok(result) => {
                let repository = self.repository.owner();
                repository
                    .lock()
                    .map_err(|_| "repository_unavailable".to_owned())?
                    .update_operation_status(
                        &operation_id,
                        "completed",
                        "host_effect",
                        &[],
                        &now_iso_like(),
                    )?;
                Ok(serde_json::json!({
                    "ok":true,
                    "status":"applied",
                    "operationId":operation_id,
                    "result":result,
                }))
            }
            Err(error) => {
                let repository = self.repository.owner();
                repository
                    .lock()
                    .map_err(|_| "repository_unavailable".to_owned())?
                    .update_operation_status(
                        &operation_id,
                        "failed",
                        "host_effect",
                        std::slice::from_ref(&error),
                        &now_iso_like(),
                    )?;
                Err(error)
            }
        }
    }

    pub(crate) fn initialize_builtin_tag_policy(&self) -> Result<Value, String> {
        const BUILTIN_TAGS: &[&str] = &[
            "status:need-analysis",
            "status:need-deep-reading",
            "status:need-fulltext",
            "status:need-markdown",
            "status:need-metadata-curation",
        ];
        let mut candidate = self.repository.load_candidate()?;
        let expected_hash = (!candidate.state.vocabulary_hash.is_empty())
            .then(|| candidate.state.vocabulary_hash.clone());
        let now = now_iso_like();
        if candidate.protocols.is_empty() {
            candidate.protocols.push(TagProtocolRecord {
                protocol_id: "builtin".into(),
                version: "1.0.0".into(),
                tag_pattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$".into(),
                max_tag_length: 120,
                facets_json: serde_json::to_string(&[
                    "field", "topic", "method", "model", "ai_task", "data", "tool", "status",
                ])
                .map_err(|_| "invalid_request".to_owned())?,
                updated_at: now.clone(),
            });
        } else {
            for protocol in &mut candidate.protocols {
                let mut facets: Vec<String> =
                    serde_json::from_str(&protocol.facets_json).unwrap_or_default();
                if !facets.iter().any(|facet| facet == "status") {
                    facets.push("status".into());
                    protocol.facets_json =
                        serde_json::to_string(&facets).map_err(|_| "invalid_request".to_owned())?;
                    protocol.updated_at = now.clone();
                }
            }
        }
        for tag in BUILTIN_TAGS {
            if let Some(entry) = candidate.entries.iter_mut().find(|entry| entry.tag == *tag) {
                entry.facet = "status".into();
                entry.source = "builtin".into();
                entry.deprecated = 0;
                entry.replacement.clear();
                entry.updated_at = now.clone();
            } else {
                candidate.entries.push(TagVocabularyEntryRecord {
                    tag: (*tag).into(),
                    facet: "status".into(),
                    note: String::new(),
                    source: "builtin".into(),
                    deprecated: 0,
                    replacement: String::new(),
                    aliases_json: "[]".into(),
                    abbrev_json: "{}".into(),
                    usage_count: 0,
                    last_synced_at: String::new(),
                    created_at: now.clone(),
                    updated_at: now.clone(),
                });
            }
        }
        candidate
            .entries
            .sort_by(|left, right| left.tag.cmp(&right.tag));
        candidate.state.singleton_id = 1;
        candidate.state.vocabulary_hash = canonical_json_hash(&serde_json::json!({
            "entries":candidate.entries,
            "aliases":candidate.aliases,
            "abbrevs":candidate.abbrevs,
            "protocols":candidate.protocols,
            "warnings":candidate.warnings,
        }))?;
        candidate.state.index_stale = 1;
        candidate.state.updated_at = now;
        serde_json::to_value(self.tags.save(expected_hash.as_deref(), &candidate))
            .map_err(|_| "serialization_failed".to_owned())
    }

    pub(crate) fn update_topic_discovery_hint(
        &self,
        hint_id: &str,
        status: &str,
    ) -> Result<Value, String> {
        let repository = self.repository.owner();
        let hint = repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .update_topic_discovery_hint_status(hint_id, status, &now_iso_like())?;
        Ok(match hint {
            Some(hint) => serde_json::json!({
                "ok":true,
                "status":status,
                "hint":hint,
                "diagnostics":[],
            }),
            None => serde_json::json!({
                "ok":true,
                "status":"not_found",
                "hint":Value::Null,
                "diagnostics":[],
            }),
        })
    }

    fn resolve_effective_canonical_id(
        canonical_id: &str,
        redirects: &[ReferenceRedirectFactRecord],
    ) -> Result<String, String> {
        if canonical_id.is_empty() {
            return Err("invalid_request".into());
        }
        let mut current = canonical_id.to_owned();
        let mut visited = std::collections::BTreeSet::new();
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

    fn canonical_action_error(status: &str, code: &str, details: Value) -> Value {
        serde_json::json!({
            "ok":false,
            "status":status,
            "diagnostics":[{
                "code":code,
                "severity":"error",
                "details":details,
            }],
        })
    }

    pub(crate) fn merge_canonical_reference(&self, request: &Value) -> Result<Value, String> {
        let source_requested = request
            .get("sourceEffectiveCanonicalId")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let target_requested = request
            .get("targetEffectiveCanonicalId")
            .and_then(Value::as_str)
            .unwrap_or_default();
        let owner = self.repository.owner();
        let mut repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        let redirects = repository.list_reference_redirects()?;
        let source = Self::resolve_effective_canonical_id(source_requested, &redirects)?;
        let target = Self::resolve_effective_canonical_id(target_requested, &redirects)?;
        if source == target {
            return Ok(Self::canonical_action_error(
                "invalid_target",
                "canonical_merge_invalid_target",
                serde_json::json!({"source":source,"target":target}),
            ));
        }
        let canonicals = repository.list_canonical_references()?;
        if ![&source, &target].iter().all(|id| {
            canonicals
                .iter()
                .any(|row| row.canonical_reference_id == **id && row.status == "active")
        }) {
            return Ok(Self::canonical_action_error(
                "missing_canonical",
                "canonical_merge_missing_canonical",
                serde_json::json!({"source":source,"target":target}),
            ));
        }
        let bindings = repository.list_reference_bindings()?;
        let source_binding = bindings.iter().find(|binding| {
            binding.canonical_reference_id == source && binding.status != "revoked"
        });
        let target_binding = bindings.iter().find(|binding| {
            binding.canonical_reference_id == target && binding.status != "revoked"
        });
        if source_binding
            .zip(target_binding)
            .is_some_and(|(left, right)| {
                left.library_id != right.library_id || left.item_key != right.item_key
            })
        {
            return Ok(Self::canonical_action_error(
                "conflicting_bindings",
                "canonical_merge_conflicting_zotero_bindings",
                serde_json::json!({"source":source,"target":target}),
            ));
        }
        let incoming = redirects
            .iter()
            .filter(|redirect| {
                Self::resolve_effective_canonical_id(
                    &redirect.to_canonical_reference_id,
                    &redirects,
                )
                .ok()
                .as_deref()
                    == Some(source.as_str())
            })
            .count();
        if incoming > 0
            && request.get("confirmRetargetGroup").and_then(Value::as_bool) != Some(true)
        {
            return Ok(Self::canonical_action_error(
                "requires_confirmation",
                "canonical_merge_retarget_group_requires_confirmation",
                serde_json::json!({"source":source,"target":target,"incoming_redirect_count":incoming}),
            ));
        }
        let now = now_iso_like();
        repository.upsert_canonical_reference_redirect(&ReferenceRedirectFactRecord {
            from_canonical_reference_id: source.clone(),
            to_canonical_reference_id: target.clone(),
            reason: "canonical_revision_manual_merge".into(),
            diagnostics_json: "[]".into(),
            created_at: now.clone(),
            updated_at: now.clone(),
        })?;
        repository
            .mark_reference_dependent_caches_stale("canonical_revision_manual_merge", &now)?;
        Ok(serde_json::json!({
            "ok":true,
            "status":"merged",
            "source_effective_canonical_id":source,
            "target_effective_canonical_id":target,
        }))
    }

    pub(crate) fn apply_canonical_merge_requests(&self, request: &Value) -> Result<Value, String> {
        let requests = request
            .get("requests")
            .and_then(Value::as_array)
            .ok_or_else(|| "invalid_request".to_owned())?;
        let mut results = Vec::with_capacity(requests.len());
        let mut applied = 0;
        for request in requests {
            let mut request = request.clone();
            request
                .as_object_mut()
                .ok_or_else(|| "invalid_request".to_owned())?
                .insert("confirmRetargetGroup".into(), Value::Bool(true));
            let mut result = self.merge_canonical_reference(&request)?;
            if result.get("ok").and_then(Value::as_bool) == Some(true) {
                applied += 1;
                if let Some(object) = result.as_object_mut() {
                    object.insert("status".into(), Value::String("accepted".into()));
                }
            }
            results.push(result);
        }
        let failed = results.len().saturating_sub(applied);
        Ok(serde_json::json!({
            "ok":failed == 0,
            "applied_count":applied,
            "failed_count":failed,
            "results":results,
        }))
    }

    pub(crate) fn update_canonical_reference_metadata(
        &self,
        request: &Value,
    ) -> Result<Value, String> {
        let canonical_id = request
            .get("canonicalReferenceId")
            .and_then(Value::as_str)
            .ok_or_else(|| "invalid_request".to_owned())?;
        let patch = request
            .get("patch")
            .and_then(Value::as_object)
            .ok_or_else(|| "invalid_request".to_owned())?;
        let owner = self.repository.owner();
        let mut repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        let Some(mut canonical) = repository
            .list_canonical_references()?
            .into_iter()
            .find(|row| row.canonical_reference_id == canonical_id && row.status == "active")
        else {
            return Ok(Self::canonical_action_error(
                "missing_canonical",
                "canonical_metadata_missing_canonical",
                serde_json::json!({"canonicalReferenceId":canonical_id}),
            ));
        };
        if repository.list_reference_bindings()?.iter().any(|binding| {
            binding.canonical_reference_id == canonical_id && binding.status != "revoked"
        }) {
            return Ok(Self::canonical_action_error(
                "bound_to_zotero",
                "canonical_metadata_bound_to_zotero",
                serde_json::json!({"canonicalReferenceId":canonical_id}),
            ));
        }
        if let Some(title) = patch
            .get("title")
            .and_then(Value::as_str)
            .filter(|text| !text.is_empty())
        {
            canonical.title = title.into();
            if !patch.contains_key("normalizedTitle") {
                canonical.normalized_title = title
                    .split_whitespace()
                    .collect::<Vec<_>>()
                    .join(" ")
                    .to_lowercase();
            }
        }
        if let Some(value) = patch
            .get("normalizedTitle")
            .and_then(Value::as_str)
            .filter(|text| !text.is_empty())
        {
            canonical.normalized_title = value.into();
        }
        if let Some(value) = patch
            .get("year")
            .and_then(Value::as_str)
            .filter(|text| !text.is_empty())
        {
            canonical.year = value.into();
        }
        if let Some(value) = patch.get("authors").and_then(Value::as_array) {
            canonical.authors_json =
                serde_json::to_string(value).map_err(|_| "invalid_request".to_owned())?;
        }
        if let Some(value) = patch.get("identifiers").and_then(Value::as_object) {
            canonical.identifiers_json =
                serde_json::to_string(value).map_err(|_| "invalid_request".to_owned())?;
        }
        canonical.metadata_hash = canonical_json_hash(&serde_json::json!({
            "title":canonical.title,
            "normalizedTitle":canonical.normalized_title,
            "year":canonical.year,
            "authors":canonical.authors_json,
            "identifiers":canonical.identifiers_json,
        }))?;
        canonical.updated_at = now_iso_like();
        repository.upsert_canonical_reference_record(&canonical)?;
        repository.mark_reference_dependent_caches_stale(
            "canonical_metadata_update",
            &canonical.updated_at,
        )?;
        Ok(serde_json::json!({
            "ok":true,
            "status":"updated",
            "canonical_reference_id":canonical_id,
        }))
    }

    pub(crate) fn archive_canonical_reference(&self, request: &Value) -> Result<Value, String> {
        let canonical_id = request
            .get("canonicalReferenceId")
            .and_then(Value::as_str)
            .ok_or_else(|| "invalid_request".to_owned())?;
        let owner = self.repository.owner();
        let mut repository = owner
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        let redirects = repository.list_reference_redirects()?;
        let effective = Self::resolve_effective_canonical_id(canonical_id, &redirects)?;
        let blockers = repository.list_raw_references()?.iter().any(|raw| {
            raw.status == "active"
                && Self::resolve_effective_canonical_id(&raw.canonical_reference_id, &redirects)
                    .ok()
                    .as_deref()
                    == Some(effective.as_str())
        }) || repository.list_reference_bindings()?.iter().any(|binding| {
            binding.status != "revoked"
                && Self::resolve_effective_canonical_id(&binding.canonical_reference_id, &redirects)
                    .ok()
                    .as_deref()
                    == Some(effective.as_str())
        }) || redirects.iter().any(|redirect| {
            redirect.from_canonical_reference_id == canonical_id
                || redirect.to_canonical_reference_id == canonical_id
        });
        if blockers {
            return Ok(Self::canonical_action_error(
                "blocked",
                "canonical_archive_blocked",
                serde_json::json!({"canonicalReferenceId":canonical_id}),
            ));
        }
        let Some(mut canonical) = repository
            .list_canonical_references()?
            .into_iter()
            .find(|row| row.canonical_reference_id == canonical_id && row.status == "active")
        else {
            return Ok(Self::canonical_action_error(
                "missing_canonical",
                "canonical_archive_missing_canonical",
                serde_json::json!({"canonicalReferenceId":canonical_id}),
            ));
        };
        canonical.status = "archived".into();
        canonical.updated_at = now_iso_like();
        repository.upsert_canonical_reference_record(&canonical)?;
        Ok(serde_json::json!({
            "ok":true,
            "status":"archived",
            "canonical_reference_id":canonical_id,
        }))
    }
}

pub(crate) fn build_production_applications(
    repository: Arc<Mutex<Repository>>,
    canonical: Arc<Mutex<CanonicalStore>>,
    compute: Arc<NativeComputePool>,
    admission: Option<Arc<ProductionAdmission>>,
    service_instance_id: String,
    webdav_state_path: PathBuf,
) -> ProductionApplications {
    let repository = Arc::new(RepositoryPort::new(repository));
    let canonical = Arc::new(CanonicalStorePort::new(canonical));
    let workbench = WorkbenchApplication::new(repository.clone());
    let host = Arc::new(ReverseHostApplicationPort {
        admission: admission.clone(),
        service_instance_id: service_instance_id.clone(),
    });
    let topics = TopicApplication::new(
        repository.clone(),
        canonical.clone(),
        Arc::new(NativeStructuredArtifactPort {
            compute: Arc::clone(&compute),
        }),
    );
    let citations = CitationGraphApplication::new(
        repository.clone(),
        Arc::new(NativeCitationGraphComputePort {
            compute: Arc::clone(&compute),
        }),
    );
    let reference_refresh = ReferenceRefreshApplication::new(repository.clone());
    let reference_matching = ReferenceMatchingApplication::new(
        repository.clone(),
        Arc::new(NativeReferenceMatcherPort {
            compute: Arc::clone(&compute),
        }),
    );
    let tags = TagVocabularyApplication::new(
        repository.clone(),
        Arc::new(NativeTagVocabularyComputePort {
            compute: Arc::clone(&compute),
        }),
        host.clone(),
        host.clone(),
    );
    let concepts = ConceptKbApplication::new(
        repository.clone(),
        Arc::new(NativeConceptKbComputePort {
            compute: Arc::clone(&compute),
        }),
    );
    let topic_graph = TopicGraphApplication::new(
        repository.clone(),
        Arc::new(NativeTopicGraphComputePort {
            compute: Arc::clone(&compute),
        }),
    );
    let debug = DebugMaintenanceApplication::new(repository.clone(), canonical.clone());
    let durable = DurableBundleApplication::with_runtime(
        repository.clone(),
        Some(canonical.clone()),
        Some(canonical.clone()),
        Arc::new(now_iso_like),
        Arc::new(|| format!("durable-import:{}", now_iso_like())),
        "synthesis-sidecar".into(),
    );
    let webdav = WebDavSyncApplication::new(
        host,
        Arc::new(FileWebDavStateStore {
            path: webdav_state_path,
        }),
        Arc::new(BoundedWebDavRetryScheduler::default()),
        Arc::new(durable),
        Arc::new(now_iso_like),
    );
    ProductionApplications {
        repository,
        canonical,
        workbench,
        topics,
        citations,
        reference_refresh,
        reference_matching,
        tags,
        concepts,
        topic_graph,
        debug,
        webdav,
        admission,
        service_instance_id,
    }
}

fn now_iso_like() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().to_string())
        .unwrap_or_else(|_| "0".into())
}

struct NativeCitationGraphComputePort {
    compute: Arc<NativeComputePool>,
}

impl CitationGraphComputePort for NativeCitationGraphComputePort {
    fn build(
        &self,
        input: &Value,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<CitationBuildOutput, String> {
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::CitationGraphBuild,
            input.clone(),
        )?;
        let graph_hash = canonical_json_hash(&result)?;
        let nodes = serde_json::from_value(
            result
                .get("nodes")
                .cloned()
                .ok_or_else(|| "worker_result_invalid".to_owned())?,
        )
        .map_err(|_| "worker_result_invalid".to_owned())?;
        let edges = serde_json::from_value(
            result
                .get("resolvedEdges")
                .cloned()
                .ok_or_else(|| "worker_result_invalid".to_owned())?,
        )
        .map_err(|_| "worker_result_invalid".to_owned())?;
        let ownership = serde_json::from_value(
            result
                .get("sourceOwnership")
                .cloned()
                .ok_or_else(|| "worker_result_invalid".to_owned())?,
        )
        .map_err(|_| "worker_result_invalid".to_owned())?;
        let incoming_groups = serde_json::from_value(
            result
                .get("incomingGroups")
                .cloned()
                .ok_or_else(|| "worker_result_invalid".to_owned())?,
        )
        .map_err(|_| "worker_result_invalid".to_owned())?;
        let light_metrics = serde_json::from_value(
            result
                .get("lightMetrics")
                .cloned()
                .ok_or_else(|| "worker_result_invalid".to_owned())?,
        )
        .map_err(|_| "worker_result_invalid".to_owned())?;
        let updated_at = now_iso_like();
        let replacement = CitationGraphReplacement {
            state: CitationGraphApplicationStateRecord {
                graph_hash: graph_hash.clone(),
                input_hash: canonical_json_hash(input)?,
                metrics_hash: None,
                node_count: result["nodes"].as_array().map_or(0, |rows| rows.len()) as i64,
                edge_count: result["resolvedEdges"]
                    .as_array()
                    .map_or(0, |rows| rows.len()) as i64,
                updated_at,
            },
            nodes,
            edges,
            ownership,
            incoming_groups,
            light_metrics,
            complex_metrics: Vec::new(),
        };
        Ok(CitationBuildOutput {
            graph_hash,
            replacement,
        })
    }

    fn metrics(
        &self,
        graph_hash: &str,
        nodes: &[synthesis_repository::CitationNodeRecord],
        edges: &[synthesis_repository::CitationEdgeRecord],
        _canceled: &Arc<AtomicBool>,
    ) -> Result<CitationMetricsOutput, String> {
        let request = serde_json::json!({
            "graphHash":graph_hash,
            "nodes":nodes,
            "edges":edges,
        });
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::CitationGraphMetrics,
            request,
        )?;
        let metrics_hash = canonical_json_hash(&result)?;
        let updated_at = now_iso_like();
        let records = result
            .get("libraryNodeMetrics")
            .and_then(Value::as_array)
            .ok_or_else(|| "worker_result_invalid".to_owned())?
            .iter()
            .map(|row| {
                let mut record: CitationComplexMetricsRecord = serde_json::from_value(row.clone())
                    .map_err(|_| "worker_result_invalid".to_owned())?;
                record.source_graph_hash = graph_hash.to_owned();
                record.metrics_hash = metrics_hash.clone();
                record.status = "ready".into();
                record.updated_at = updated_at.clone();
                Ok(record)
            })
            .collect::<Result<Vec<_>, String>>()?;
        Ok(CitationMetricsOutput {
            metrics_hash,
            records,
        })
    }

    fn layout(
        &self,
        request: &CitationLayoutRequest,
        nodes: &[synthesis_repository::CitationNodeRecord],
        edges: &[synthesis_repository::CitationEdgeRecord],
        _canceled: &Arc<AtomicBool>,
    ) -> Result<CitationLayoutRecord, String> {
        let worker_request = serde_json::json!({
            "graphHash":request.expected_graph_hash,
            "algorithm":request.preset,
            "nodes":nodes,
            "edges":edges,
        });
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::CitationGraphLayout,
            worker_request,
        )?;
        let now = now_iso_like();
        Ok(CitationLayoutRecord {
            layout_key: request.layout_key.clone(),
            view_key: request.view_key.clone(),
            preset: request.preset.clone(),
            graph_hash: request.expected_graph_hash.clone(),
            status: "ready".into(),
            layout_json: synthesis_protocol::canonical_json(&result)
                .map_err(|_| "worker_result_invalid".to_owned())?,
            diagnostics_json: "[]".into(),
            created_at: now.clone(),
            updated_at: now,
        })
    }
}

struct NativeTagVocabularyComputePort {
    compute: Arc<NativeComputePool>,
}

impl TagVocabularyComputePort for NativeTagVocabularyComputePort {
    fn validate(
        &self,
        candidate: &TagVocabularyReplacement,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<TagVocabularyReplacement, String> {
        self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::TagVocabularyValidate,
            serde_json::json!({
                "contractVersion":"synthesis-tag-vocabulary.v1",
                "algorithmVersion":"tag-vocabulary-validation.v1",
                "protocol":candidate.protocols.first(),
                "entries":candidate.entries,
                "aliases":candidate.aliases,
                "abbrev":candidate.abbrevs,
            }),
        )?;
        Ok(candidate.clone())
    }

    fn build_index(
        &self,
        entries: &[TagVocabularyEntryRecord],
        _canceled: &Arc<AtomicBool>,
    ) -> Result<TagIndexOutput, String> {
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::TagVocabularyIndex,
            serde_json::json!({
                "contractVersion":"synthesis-tag-vocabulary.v1",
                "algorithmVersion":"tag-vocabulary-index.v1",
                "sourceManifestHash":canonical_json_hash(&serde_json::json!(entries))?,
                "rebuiltAt":now_iso_like(),
                "protocol":{},
                "entries":entries,
                "aliases":{},
                "abbrev":{},
            }),
        )?;
        Ok(TagIndexOutput {
            index_hash: canonical_json_hash(&result)?,
            index_json: synthesis_protocol::canonical_json(&result)
                .map_err(|_| "worker_result_invalid".to_owned())?,
        })
    }
}

struct NativeConceptKbComputePort {
    compute: Arc<NativeComputePool>,
}

impl ConceptKbComputePort for NativeConceptKbComputePort {
    fn build_index(
        &self,
        snapshot: &synthesis_repository::ConceptKbReplacement,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<ConceptIndexOutput, String> {
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::ConceptKbIndex,
            serde_json::json!({
                "contractVersion":"synthesis-concept-kb-index.v1",
                "algorithmVersion":"concept-kb-index.v1",
                "sourceManifestHash":snapshot.state.manifest_hash,
                "rebuiltAt":now_iso_like(),
                "concepts":snapshot.concepts,
                "senses":snapshot.senses,
                "aliases":snapshot.aliases,
            }),
        )?;
        Ok(ConceptIndexOutput {
            index_hash: canonical_json_hash(&result)?,
            index_json: synthesis_protocol::canonical_json(&result)
                .map_err(|_| "worker_result_invalid".to_owned())?,
        })
    }

    fn query(
        &self,
        index_json: &str,
        request: &Value,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<Value, String> {
        let index: Value =
            serde_json::from_str(index_json).map_err(|_| "concept_index_invalid".to_owned())?;
        self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::ConceptKbQuery,
            serde_json::json!({
                "contractVersion":"synthesis-concept-kb-index.v1",
                "algorithmVersion":"concept-kb-query.v1",
                "concepts":index.get("concepts").cloned().unwrap_or_else(|| Value::Array(Vec::new())),
                "senses":index.get("senses").cloned().unwrap_or_else(|| Value::Array(Vec::new())),
                "aliases":index.get("aliases").cloned().unwrap_or_else(|| Value::Array(Vec::new())),
                "labels":request.get("labels").cloned().unwrap_or_else(|| Value::Array(Vec::new())),
            }),
        )
    }
}

struct NativeTopicGraphComputePort {
    compute: Arc<NativeComputePool>,
}

impl TopicGraphComputePort for NativeTopicGraphComputePort {
    fn build_index(
        &self,
        snapshot: &TopicGraphReplacement,
        _canceled: &Arc<AtomicBool>,
    ) -> Result<TopicGraphIndexOutput, String> {
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::TopicGraphIndex,
            serde_json::json!({
                "contractVersion":"synthesis-topic-graph-index.v1",
                "algorithmVersion":"topic-graph-index.v1",
                "sourceManifestHash":snapshot.state.manifest_hash,
                "rebuiltAt":now_iso_like(),
                "nodes":snapshot.nodes,
                "edges":snapshot.edges,
            }),
        )?;
        Ok(TopicGraphIndexOutput {
            index_hash: canonical_json_hash(&result)?,
            index_json: synthesis_protocol::canonical_json(&result)
                .map_err(|_| "worker_result_invalid".to_owned())?,
        })
    }
}

struct NativeReferenceMatcherPort {
    compute: Arc<NativeComputePool>,
}

impl ReferenceMatcherPort for NativeReferenceMatcherPort {
    fn match_pass(
        &self,
        pass: ReferenceMatchPass,
        input: &ReferenceMatcherInput,
    ) -> Result<Vec<ReferenceMatcherOutcome>, String> {
        let (operation, request) = match pass {
            ReferenceMatchPass::LibraryBinding => (
                crate::runtime_worker_pool::WorkerOperation::ReferenceBinding,
                serde_json::json!({
                    "contractVersion":"synthesis-reference-binding.v1",
                    "algorithmVersion":"reference-binding.v1",
                    "policyId":"production",
                    "papers":input.host_candidates,
                    "references":input.raw_references,
                }),
            ),
            ReferenceMatchPass::CanonicalRedirect => (
                crate::runtime_worker_pool::WorkerOperation::ReferenceCanonicalDedupe,
                serde_json::json!({
                    "contractVersion":"synthesis-reference-canonical-dedupe.v1",
                    "algorithmVersion":"reference-canonical-dedupe.v1",
                    "canonicals":input.canonicals,
                }),
            ),
        };
        let result = self.compute.run_direct(operation, request)?;
        serde_json::from_value(
            result
                .get("matches")
                .or_else(|| result.get("actions"))
                .cloned()
                .unwrap_or_else(|| Value::Array(Vec::new())),
        )
        .map_err(|_| "worker_result_invalid".to_owned())
    }
}

struct ReverseHostApplicationPort {
    admission: Option<Arc<ProductionAdmission>>,
    service_instance_id: String,
}

impl ReverseHostApplicationPort {
    fn call(&self, capability: &str, payload: Value) -> Result<Value, String> {
        let admission = self
            .admission
            .as_deref()
            .ok_or_else(|| "reverse_host_unavailable".to_owned())?;
        call_reverse_host(admission, &self.service_instance_id, capability, payload)
    }
}

impl TagHostEffectPort for ReverseHostApplicationPort {
    fn apply(&self, effect: &TagEffectRecord) -> Result<(), String> {
        let result = self.call(
            "effects.tags.apply_batch",
            serde_json::json!({
                "effects":[{
                    "effectId":effect.effect_id,
                    "action":"ensure_present",
                    "target":{"libraryId":effect.library_id,"itemKey":effect.item_key},
                    "tag":effect.tag,
                    "provenance":{"kind":"staged_tag_promotion"},
                    "precondition":{"target":"exists"},
                    "permission":{"scope":"synthesis.tags","reason":"promote_staged_tag"},
                }],
            }),
        )?;
        let status = result
            .get("receipts")
            .and_then(Value::as_array)
            .and_then(|receipts| receipts.first())
            .and_then(|receipt| receipt.get("status"))
            .and_then(Value::as_str)
            .ok_or_else(|| "reverse_host_result_invalid".to_owned())?;
        if matches!(status, "applied" | "already_satisfied") {
            Ok(())
        } else {
            Err("host_effect_failed".into())
        }
    }
}

impl TagLegacyBindingResolverPort for ReverseHostApplicationPort {
    fn resolve(
        &self,
        staged: &[TagStagedSuggestionRecord],
        _canceled: &Arc<AtomicBool>,
    ) -> Result<Vec<TagStagedSuggestionRecord>, String> {
        for suggestion in staged {
            let bindings: Value = serde_json::from_str(&suggestion.parent_bindings_json)
                .map_err(|_| "invalid_request".to_owned())?;
            let bindings = bindings
                .as_array()
                .ok_or_else(|| "invalid_request".to_owned())?;
            if bindings.iter().any(Value::is_number) {
                return Err("legacy_binding_library_scope_missing".into());
            }
            if !bindings.iter().all(|binding| {
                binding.get("libraryId").and_then(Value::as_i64).is_some()
                    && binding
                        .get("itemKey")
                        .and_then(Value::as_str)
                        .is_some_and(|item_key| !item_key.is_empty())
            }) {
                return Err("invalid_request".into());
            }
        }
        Ok(staged.to_vec())
    }
}

impl WebDavHostPort for ReverseHostApplicationPort {
    fn describe(&self) -> Result<WebDavHostDescription, String> {
        serde_json::from_value(self.call("webdav.describe", serde_json::json!({}))?)
            .map_err(|_| "reverse_host_result_invalid".to_owned())
    }

    fn read_text(&self, path: &str) -> Result<WebDavReadResult, String> {
        serde_json::from_value(self.call("webdav.read_text", serde_json::json!({"path":path}))?)
            .map_err(|_| "reverse_host_result_invalid".to_owned())
    }

    fn ensure_collection(&self, path: &str) -> Result<WebDavWriteResult, String> {
        serde_json::from_value(
            self.call("webdav.ensure_collection", serde_json::json!({"path":path}))?,
        )
        .map_err(|_| "reverse_host_result_invalid".to_owned())
    }

    fn write_text(
        &self,
        path: &str,
        text: &str,
        if_match: Option<&str>,
    ) -> Result<WebDavWriteResult, String> {
        serde_json::from_value(self.call(
            "webdav.write_text",
            serde_json::json!({"path":path,"text":text,"ifMatch":if_match}),
        )?)
        .map_err(|_| "reverse_host_result_invalid".to_owned())
    }
}

struct FileWebDavStateStore {
    path: PathBuf,
}

impl FileWebDavStateStore {
    fn backup_path(&self) -> PathBuf {
        self.path.with_extension("json.previous")
    }

    fn temporary_path(&self) -> PathBuf {
        self.path.with_extension("json.pending")
    }
}

impl WebDavStateStorePort for FileWebDavStateStore {
    fn load(&self) -> Result<Option<WebDavSyncState>, String> {
        let path = if self.path.exists() {
            &self.path
        } else {
            let backup = self.backup_path();
            if !backup.exists() {
                return Ok(None);
            }
            return serde_json::from_slice(
                &fs::read(backup).map_err(|_| "webdav_state_unavailable".to_owned())?,
            )
            .map(Some)
            .map_err(|_| "webdav_sync_state_invalid".to_owned());
        };
        serde_json::from_slice(&fs::read(path).map_err(|_| "webdav_state_unavailable".to_owned())?)
            .map(Some)
            .map_err(|_| "webdav_sync_state_invalid".to_owned())
    }

    fn save(&self, state: &WebDavSyncState) -> Result<(), String> {
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "webdav_state_unavailable".to_owned())?;
        fs::create_dir_all(parent).map_err(|_| "webdav_state_unavailable".to_owned())?;
        let pending = self.temporary_path();
        let bytes =
            serde_json::to_vec(state).map_err(|_| "webdav_sync_state_invalid".to_owned())?;
        fs::write(&pending, bytes).map_err(|_| "webdav_state_unavailable".to_owned())?;
        fs::File::open(&pending)
            .and_then(|file| file.sync_all())
            .map_err(|_| "webdav_state_unavailable".to_owned())?;
        let backup = self.backup_path();
        if self.path.exists() {
            if backup.exists() {
                fs::remove_file(&backup).map_err(|_| "webdav_state_unavailable".to_owned())?;
            }
            fs::rename(&self.path, &backup).map_err(|_| "webdav_state_unavailable".to_owned())?;
        }
        if let Err(error) = fs::rename(&pending, &self.path) {
            if backup.exists() && !self.path.exists() {
                let _ = fs::rename(&backup, &self.path);
            }
            return Err(format!("webdav_state_unavailable:{error}"));
        }
        fs::File::open(parent)
            .and_then(|directory| directory.sync_all())
            .map_err(|_| "webdav_state_unavailable".to_owned())?;
        if backup.exists() {
            fs::remove_file(backup).map_err(|_| "webdav_state_unavailable".to_owned())?;
        }
        Ok(())
    }
}

#[derive(Default)]
struct BoundedWebDavRetryScheduler {
    canceled_generation: std::sync::atomic::AtomicU64,
}

impl WebDavRetrySchedulerPort for BoundedWebDavRetryScheduler {
    fn wait(&self, delay_ms: u64, generation: u64) -> Result<bool, String> {
        std::thread::sleep(std::time::Duration::from_millis(delay_ms.min(1_000)));
        Ok(self
            .canceled_generation
            .load(std::sync::atomic::Ordering::Acquire)
            != generation)
    }

    fn cancel(&self, generation: u64) {
        self.canceled_generation
            .store(generation, std::sync::atomic::Ordering::Release);
    }
}

struct NativeStructuredArtifactPort {
    compute: Arc<NativeComputePool>,
}

impl synthesis_application::StructuredArtifactPort for NativeStructuredArtifactPort {
    fn validate_manifest(&self, manifest: &Value) -> Result<(), String> {
        self.compute
            .run_direct(
                crate::runtime_worker_pool::WorkerOperation::TopicManifestValidate,
                serde_json::json!({
                    "contractVersion":"synthesis-topic-structured-artifact.v1",
                    "algorithmVersion":"topic-structured-artifact.v1",
                    "manifest":manifest,
                }),
            )
            .and_then(|result| {
                if result.get("ok").and_then(Value::as_bool) == Some(true) {
                    Ok(())
                } else {
                    Err("invalid_request".into())
                }
            })
    }

    fn assemble_artifact(
        &self,
        manifest: &Value,
        sections: &std::collections::BTreeMap<String, Value>,
    ) -> Result<Value, String> {
        self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::TopicArtifactAssemble,
            serde_json::json!({
                "contractVersion":"synthesis-topic-structured-artifact.v1",
                "algorithmVersion":"topic-structured-artifact.v1",
                "manifest":manifest,
                "sections":sections,
            }),
        )
    }

    fn validate_artifact(&self, artifact: &Value, language: &str) -> Result<(), String> {
        self.compute
            .run_direct(
                crate::runtime_worker_pool::WorkerOperation::TopicArtifactValidate,
                serde_json::json!({
                    "contractVersion":"synthesis-topic-structured-artifact.v1",
                    "algorithmVersion":"topic-structured-artifact.v1",
                    "expectedLanguage":language,
                    "artifact":artifact,
                }),
            )
            .and_then(|result| {
                if result.get("ok").and_then(Value::as_bool) == Some(true) {
                    Ok(())
                } else {
                    Err("invalid_request".into())
                }
            })
    }

    fn apply_section_patch(
        &self,
        current: &synthesis_canonical_store::TopicSnapshot,
        patch_manifest: &Value,
        changed_sections: &std::collections::BTreeMap<String, Value>,
    ) -> Result<synthesis_application::PatchOutput, String> {
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::TopicSectionPatch,
            serde_json::json!({
                "contractVersion":"synthesis-topic-structured-artifact.v1",
                "algorithmVersion":"topic-structured-artifact.v1",
                "current":current,
                "patchManifest":patch_manifest,
                "changedSections":changed_sections,
            }),
        )?;
        let object = result
            .as_object()
            .ok_or_else(|| "worker_result_invalid".to_owned())?;
        let sections = serde_json::from_value(
            object
                .get("sections")
                .cloned()
                .ok_or_else(|| "worker_result_invalid".to_owned())?,
        )
        .map_err(|_| "worker_result_invalid".to_owned())?;
        let mismatches = serde_json::from_value(
            object
                .get("mismatches")
                .cloned()
                .unwrap_or_else(|| Value::Array(Vec::new())),
        )
        .map_err(|_| "worker_result_invalid".to_owned())?;
        Ok(synthesis_application::PatchOutput {
            sections,
            mismatches,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn webdav_state_survives_store_reopen() {
        let root = std::env::temp_dir().join(format!(
            "synthesis-webdav-state-{}-{}",
            std::process::id(),
            now_iso_like()
        ));
        let path = root.join("native-webdav-state.json");
        let state = WebDavSyncState {
            schema_id: "synthesis.webdav_sync_state".into(),
            schema_version: "1".into(),
            queue_state: "paused".into(),
            ..WebDavSyncState::default()
        };
        FileWebDavStateStore { path: path.clone() }
            .save(&state)
            .expect("persist state");
        let reopened = FileWebDavStateStore { path }
            .load()
            .expect("reopen state")
            .expect("stored state");
        assert_eq!(reopened.queue_state, "paused");
        std::fs::remove_dir_all(root).expect("remove test state");
    }
}
