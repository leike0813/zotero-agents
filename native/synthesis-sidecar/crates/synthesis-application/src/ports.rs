use crate::debug_maintenance::{
    DebugCanonicalPort, DebugMaintenanceRepositoryPort, DebugTopicInspection,
};
use crate::dto::{PatchOutput, TopicLibraryItemsByRef, TopicLibraryPage};
use crate::durable_bundle::{
    DurableBundleRepositoryPort, DurableCanonicalCapture, DurableCanonicalImportPort,
    DurableCanonicalPreparation, DurableCanonicalSourcePort, DurableEnvelope,
};
use crate::knowledge_checkpoint::KnowledgeCheckpointRepositoryPort;
use serde_json::Value;
use std::collections::BTreeMap;
use std::sync::{Arc, Condvar, Mutex};
use synthesis_canonical_store::{
    CanonicalBasis, CanonicalReceipt, CanonicalStore, CurrentTopic, Promotion, TopicSnapshot,
    canonical_json_hash,
};
use synthesis_repository::{
    CacheBasisRecord, DeletedTopicArtifactRecord, OperationQuery, OperationRecord, Repository,
    ReviewPageQuery, TopicApplicationProjectionRecord, TopicApplicationRecordPage,
    TopicApplicationStateRecord,
};
use synthesis_repository::{
    CanonicalReferenceRecord, CitationComplexMetricsRecord, CitationEdgeRecord,
    CitationGraphApplicationStateRecord, CitationGraphReplacement, CitationLayoutRecord,
    CitationLayoutWindowRecord, CitationMetricsPageQuery, CitationMetricsPageRows,
    CitationNodeRecord, LiteratureMatchingMetadataRecord, RawReferenceRecord,
    ReferenceApplicationStateRecord, ReferenceArtifactRecord, ReferenceBindingFactRecord,
    ReferenceMatchProposalRecord, ReferenceMatchingPreparationRecord, ReferenceMatchingPromotion,
    ReferenceMatchingStateRecord, ReferenceProjectionReplacement, ReferenceProjectionSnapshot,
    ReferenceRedirectFactRecord, ReferenceReviewTransition, ReferenceSourceRecord,
};
use synthesis_repository::{
    ConceptApplicationStateRecord, ConceptKbReplacement, TagApplicationStateRecord, TagAuditRecord,
    TagEffectReceiptRecord, TagEffectRecord, TagStagedSuggestionRecord, TagVocabularyEntryRecord,
    TagVocabularyPromotion, TagVocabularyReplacement, TopicGraphApplicationStateRecord,
    TopicGraphReplacement,
};
use synthesis_repository::{
    DebugProjection, DurableBundleCapture, DurableImportApply, DurableImportCapture,
    DurableTopicBasis, KnowledgeCheckpointCapture, KnowledgeCheckpointReplacement,
};

pub trait CitationGraphRepositoryPort: Send + Sync {
    fn get_state(&self) -> Result<Option<CitationGraphApplicationStateRecord>, String>;
    fn list_nodes(&self) -> Result<Vec<CitationNodeRecord>, String>;
    fn list_edges(&self) -> Result<Vec<CitationEdgeRecord>, String>;
    fn read_metrics_page(
        &self,
        request: &CitationMetricsPageQuery,
    ) -> Result<CitationMetricsPageRows, String>;
    fn list_ready_layout_presets(&self, graph_hash: &str) -> Result<Vec<String>, String>;
    fn read_layout_window(
        &self,
        layout_key: &str,
        node_ids: &[String],
    ) -> Result<Option<CitationLayoutWindowRecord>, String>;
    fn replace(
        &self,
        expected_graph_hash: Option<&str>,
        replacement: &CitationGraphReplacement,
    ) -> Result<bool, String>;
    fn replace_source_slice(
        &self,
        expected_graph_hash: &str,
        source_ids: &[String],
        replacement: &CitationGraphReplacement,
    ) -> Result<Option<String>, String>;
    fn promote_metrics(
        &self,
        expected_graph_hash: &str,
        metrics_hash: &str,
        records: &[CitationComplexMetricsRecord],
        now: &str,
    ) -> Result<bool, String>;
    fn promote_layout(
        &self,
        expected_graph_hash: &str,
        record: &CitationLayoutRecord,
    ) -> Result<bool, String>;
    fn upsert_operation(&self, record: &OperationRecord) -> Result<(), String>;
    fn update_operation(
        &self,
        operation_id: &str,
        status: &str,
        phase: &str,
        diagnostics: &[String],
        now: &str,
    ) -> Result<(), String>;
}

pub trait ReferenceRefreshRepositoryPort: Send + Sync {
    fn get_state(&self) -> Result<Option<ReferenceApplicationStateRecord>, String>;
    fn load_projection_snapshot(&self) -> Result<ReferenceProjectionSnapshot, String>;
    fn list_sources(&self) -> Result<Vec<ReferenceSourceRecord>, String>;
    fn list_raw_references(&self) -> Result<Vec<RawReferenceRecord>, String>;
    fn replace(&self, replacement: &ReferenceProjectionReplacement) -> Result<bool, String>;
    fn apply_literature_projection(
        &self,
        replacement: &ReferenceProjectionReplacement,
        metadata: Option<&LiteratureMatchingMetadataRecord>,
        receipt: &OperationRecord,
    ) -> Result<bool, String>;
    fn upsert_operation(&self, record: &OperationRecord) -> Result<(), String>;
    fn update_operation(
        &self,
        operation_id: &str,
        status: &str,
        phase: &str,
        diagnostics: &[String],
        now: &str,
    ) -> Result<(), String>;
}

pub trait ReferenceMatchingRepositoryPort: Send + Sync {
    fn get_reference_state(&self) -> Result<Option<ReferenceApplicationStateRecord>, String>;
    fn get_matching_state(&self) -> Result<Option<ReferenceMatchingStateRecord>, String>;
    fn list_raw_references(&self) -> Result<Vec<RawReferenceRecord>, String>;
    fn list_canonicals(&self) -> Result<Vec<CanonicalReferenceRecord>, String>;
    fn list_bindings(&self) -> Result<Vec<ReferenceBindingFactRecord>, String>;
    fn list_redirects(&self) -> Result<Vec<ReferenceRedirectFactRecord>, String>;
    fn get_preparation(
        &self,
        preparation_id: &str,
    ) -> Result<Option<ReferenceMatchingPreparationRecord>, String>;
    fn has_prepared_preparation(&self) -> Result<bool, String>;
    fn upsert_preparation(&self, record: &ReferenceMatchingPreparationRecord)
    -> Result<(), String>;
    fn delete_preparation(&self, preparation_id: &str) -> Result<(), String>;
    fn delete_prepared_preparations(&self) -> Result<(), String>;
    fn get_proposal(
        &self,
        proposal_id: &str,
    ) -> Result<Option<ReferenceMatchProposalRecord>, String>;
    fn list_proposals(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<ReferenceMatchProposalRecord>, bool), String>;
    fn was_rejected(&self, kind: &str, basis_hash: &str, source_hash: &str)
    -> Result<bool, String>;
    fn promote(
        &self,
        preparation_id: &str,
        promotion: &ReferenceMatchingPromotion,
    ) -> Result<bool, String>;
    fn apply_reviews(
        &self,
        transitions: &[ReferenceReviewTransition],
        receipt: Option<&OperationRecord>,
    ) -> Result<bool, String>;
}

pub trait TagVocabularyRepositoryPort: Send + Sync {
    fn get_state(&self) -> Result<Option<TagApplicationStateRecord>, String>;
    fn load_candidate(&self) -> Result<TagVocabularyReplacement, String>;
    fn list_entries(&self) -> Result<Vec<TagVocabularyEntryRecord>, String>;
    fn list_staged(&self) -> Result<Vec<TagStagedSuggestionRecord>, String>;
    fn list_effects(&self) -> Result<Vec<TagEffectRecord>, String>;
    fn count_pending_effects(&self) -> Result<usize, String>;
    fn list_pending_effects(&self, limit: usize) -> Result<Vec<TagEffectRecord>, String>;
    fn replace_vocabulary(
        &self,
        expected_vocabulary_hash: Option<&str>,
        replacement: &TagVocabularyReplacement,
    ) -> Result<bool, String>;
    fn replace_staged(
        &self,
        expected_revision: i64,
        next_revision: i64,
        staged: &[TagStagedSuggestionRecord],
        now: &str,
    ) -> Result<bool, String>;
    fn promote(
        &self,
        expected_vocabulary_hash: &str,
        expected_staged_revision: i64,
        promotion: &TagVocabularyPromotion,
    ) -> Result<bool, String>;
    fn promote_index(
        &self,
        expected_vocabulary_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
    ) -> Result<bool, String>;
    fn replace_audits(&self, library_id: i64, records: &[TagAuditRecord]) -> Result<(), String>;
    fn upsert_audit(&self, record: &TagAuditRecord) -> Result<(), String>;
    fn update_effect_receipts(&self, receipts: &[TagEffectReceiptRecord]) -> Result<(), String>;
}

pub trait ConceptKbRepositoryPort: Send + Sync {
    fn get_state(&self) -> Result<Option<ConceptApplicationStateRecord>, String>;
    fn load(&self) -> Result<ConceptKbReplacement, String>;
    fn load_review_page(
        &self,
        _query: &ReviewPageQuery,
    ) -> Result<(ConceptKbReplacement, usize), String> {
        Err("review_page_query_unsupported".into())
    }
    fn replace(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &ConceptKbReplacement,
    ) -> Result<bool, String>;
    fn replace_with_receipt(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &ConceptKbReplacement,
        _receipt: Option<&OperationRecord>,
    ) -> Result<bool, String> {
        self.replace(expected_manifest_hash, replacement)
    }
    fn promote_index(
        &self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
    ) -> Result<bool, String>;
    fn promote_index_with_receipt(
        &self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
        _receipt: Option<&OperationRecord>,
    ) -> Result<bool, String> {
        self.promote_index(expected_manifest_hash, index_hash, index_json, now)
    }
}

pub trait TopicGraphRepositoryPort: Send + Sync {
    fn get_state(&self) -> Result<Option<TopicGraphApplicationStateRecord>, String>;
    fn load(&self) -> Result<TopicGraphReplacement, String>;
    fn load_review_page(
        &self,
        _query: &ReviewPageQuery,
    ) -> Result<(TopicGraphReplacement, usize, usize), String> {
        Err("review_page_query_unsupported".into())
    }
    fn load_window(&self, limit: usize) -> Result<TopicGraphReplacement, String> {
        let mut snapshot = self.load()?;
        snapshot.nodes.truncate(limit);
        let topic_ids = snapshot
            .nodes
            .iter()
            .map(|node| node.topic_id.as_str())
            .collect::<std::collections::HashSet<_>>();
        snapshot.edges.retain(|edge| {
            topic_ids.contains(edge.source_topic_id.as_str())
                && topic_ids.contains(edge.target_topic_id.as_str())
        });
        snapshot.edges.truncate(limit.saturating_mul(4));
        snapshot.reviews.retain(|review| {
            topic_ids.contains(review.source_topic_id.as_str())
                && topic_ids.contains(review.target_topic_id.as_str())
        });
        snapshot.reviews.truncate(limit.saturating_mul(2));
        Ok(snapshot)
    }
    fn replace(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
    ) -> Result<bool, String>;
    fn replace_with_receipt(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
        _receipt: Option<&OperationRecord>,
    ) -> Result<bool, String> {
        self.replace(expected_manifest_hash, replacement)
    }
    fn promote_index(
        &self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
    ) -> Result<bool, String>;
    fn promote_index_with_receipt(
        &self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
        _receipt: Option<&OperationRecord>,
    ) -> Result<bool, String> {
        self.promote_index(expected_manifest_hash, index_hash, index_json, now)
    }
}

pub trait WorkbenchRepositoryPort: Send + Sync {
    fn get_cache_basis(&self, cache_key: &str) -> Result<Option<CacheBasisRecord>, String>;
    fn list_operations(&self, query: &OperationQuery) -> Result<Vec<OperationRecord>, String>;
}

pub trait WorkbenchSurfacePort: Send + Sync {
    fn home(&self, state: &Value) -> Result<Value, String>;
    fn topics(&self, state: &Value) -> Result<Value, String>;
    fn index(&self, state: &Value) -> Result<Value, String>;
    fn reference_review(&self, state: &Value) -> Result<Value, String>;
    fn topic_graph_review(&self, state: &Value) -> Result<Value, String>;
    fn concept_review(&self, state: &Value) -> Result<Value, String>;
    fn graph(&self, state: &Value) -> Result<Value, String>;
    fn tags(&self, state: &Value) -> Result<Value, String>;
    fn concepts(&self, state: &Value) -> Result<Value, String>;
    fn reader(&self, state: &Value) -> Result<Value, String>;
}

pub trait TopicLibraryQueryPort: Send + Sync {
    fn list_items_page(&self, cursor: &str, limit: usize) -> Result<TopicLibraryPage, String>;
    fn get_items_by_ref(&self, paper_refs: &[String]) -> Result<TopicLibraryItemsByRef, String>;
}

pub trait TopicRepositoryPort: Send + Sync {
    fn get_state(&self, topic_id: &str) -> Result<Option<TopicApplicationStateRecord>, String>;
    fn list_states(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<TopicApplicationStateRecord>, usize), String>;
    fn list_records(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<TopicApplicationRecordPage, String> {
        let (states, total) = self.list_states(offset, limit)?;
        let records = states
            .into_iter()
            .map(|state| {
                let projection = self.get_projection(&state.topic_id)?;
                Ok((state, projection))
            })
            .collect::<Result<Vec<_>, String>>()?;
        Ok((records, total))
    }
    fn find_records_by_paper_refs(
        &self,
        paper_refs: &[String],
        limit: usize,
    ) -> Result<TopicApplicationRecordPage, String> {
        let _ = (paper_refs, limit);
        Err("topic_query_unavailable".into())
    }
    fn list_workflow_option_records(
        &self,
        limit: usize,
    ) -> Result<TopicApplicationRecordPage, String> {
        self.list_records(0, limit)
    }
    fn list_reference_artifacts(
        &self,
        paper_refs: &[String],
    ) -> Result<Vec<ReferenceArtifactRecord>, String> {
        let _ = paper_refs;
        Ok(Vec::new())
    }
    fn upsert_state(&self, record: &TopicApplicationStateRecord) -> Result<(), String>;
    fn get_projection(
        &self,
        topic_id: &str,
    ) -> Result<Option<TopicApplicationProjectionRecord>, String>;
    fn upsert_projection(&self, record: &TopicApplicationProjectionRecord) -> Result<(), String>;
    fn get_deleted(&self, topic_id: &str) -> Result<Option<DeletedTopicArtifactRecord>, String>;
    fn list_deleted(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<DeletedTopicArtifactRecord>, usize), String>;
    fn soft_delete(&self, record: &DeletedTopicArtifactRecord) -> Result<(), String>;
    fn purge_deleted(&self, records: &[DeletedTopicArtifactRecord]) -> Result<usize, String>;
    fn update_discovery_hint(
        &self,
        hint_id: &str,
        status: &str,
        updated_at: &str,
    ) -> Result<Option<Value>, String> {
        let _ = (hint_id, status, updated_at);
        Err("topic_discovery_hint_unavailable".into())
    }
    fn upsert_operation(&self, record: &OperationRecord) -> Result<(), String>;
    fn update_operation(
        &self,
        operation_id: &str,
        status: &str,
        phase: &str,
        diagnostics: &[String],
        now: &str,
    ) -> Result<Option<OperationRecord>, String>;
}

const MAX_REPOSITORY_READ_CONNECTIONS: usize = 4;

struct RepositoryReadPool {
    available: Mutex<Vec<Repository>>,
    ready: Condvar,
}

impl RepositoryReadPool {
    fn acquire(&self) -> Result<RepositoryReadLease<'_>, String> {
        let mut available = self
            .available
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        while available.is_empty() {
            available = self
                .ready
                .wait(available)
                .map_err(|_| "repository_unavailable".to_owned())?;
        }
        Ok(RepositoryReadLease {
            pool: self,
            repository: available.pop(),
        })
    }
}

struct RepositoryReadLease<'a> {
    pool: &'a RepositoryReadPool,
    repository: Option<Repository>,
}

impl RepositoryReadLease<'_> {
    fn repository(&self) -> Result<&Repository, String> {
        self.repository
            .as_ref()
            .ok_or_else(|| "repository_unavailable".to_owned())
    }
}

impl Drop for RepositoryReadLease<'_> {
    fn drop(&mut self) {
        let Some(repository) = self.repository.take() else {
            return;
        };
        if let Ok(mut available) = self.pool.available.lock() {
            available.push(repository);
            self.pool.ready.notify_one();
        }
    }
}

#[derive(Clone)]
pub struct RepositoryPort {
    repository: Arc<Mutex<Repository>>,
    readers: Option<Arc<RepositoryReadPool>>,
}

impl RepositoryPort {
    pub fn new(repository: Arc<Mutex<Repository>>) -> Self {
        Self {
            repository,
            readers: None,
        }
    }

    pub fn new_with_readers(
        repository: Arc<Mutex<Repository>>,
        reader_count: usize,
    ) -> Result<Self, String> {
        if !(1..=MAX_REPOSITORY_READ_CONNECTIONS).contains(&reader_count) {
            return Err("repository_reader_limit_exceeded".into());
        }
        let readers = {
            let repository = repository
                .lock()
                .map_err(|_| "repository_unavailable".to_owned())?;
            (0..reader_count)
                .map(|_| repository.open_reader())
                .collect::<Result<Vec<_>, _>>()?
        };
        Ok(Self {
            repository,
            readers: Some(Arc::new(RepositoryReadPool {
                available: Mutex::new(readers),
                ready: Condvar::new(),
            })),
        })
    }

    pub fn owner(&self) -> Arc<Mutex<Repository>> {
        Arc::clone(&self.repository)
    }

    pub fn with_reader<T>(
        &self,
        operation: impl FnOnce(&Repository) -> Result<T, String>,
    ) -> Result<T, String> {
        let Some(readers) = &self.readers else {
            let repository = self
                .repository
                .lock()
                .map_err(|_| "repository_unavailable".to_owned())?;
            return operation(&repository);
        };
        let reader = readers.acquire()?;
        reader.repository()?.read_transaction(operation)
    }
}

impl TagVocabularyRepositoryPort for RepositoryPort {
    fn get_state(&self) -> Result<Option<TagApplicationStateRecord>, String> {
        self.with_reader(Repository::get_tag_application_state)
    }

    fn load_candidate(&self) -> Result<TagVocabularyReplacement, String> {
        self.with_reader(|repository| {
            Ok(TagVocabularyReplacement {
                state: repository.get_tag_application_state()?.unwrap_or_default(),
                entries: repository.list_tag_vocabulary_entries()?,
                aliases: repository.list_tag_aliases()?,
                abbrevs: repository.list_tag_abbrevs()?,
                protocols: repository.list_tag_protocols()?,
                warnings: repository.list_tag_validation_warnings()?,
            })
        })
    }

    fn list_entries(&self) -> Result<Vec<TagVocabularyEntryRecord>, String> {
        self.with_reader(Repository::list_tag_vocabulary_entries)
    }

    fn list_staged(&self) -> Result<Vec<TagStagedSuggestionRecord>, String> {
        self.with_reader(Repository::list_tag_staged_suggestions)
    }

    fn list_effects(&self) -> Result<Vec<TagEffectRecord>, String> {
        self.with_reader(Repository::list_tag_effects)
    }

    fn count_pending_effects(&self) -> Result<usize, String> {
        self.with_reader(Repository::count_pending_tag_effects)
    }

    fn list_pending_effects(&self, limit: usize) -> Result<Vec<TagEffectRecord>, String> {
        self.with_reader(|repository| repository.list_pending_tag_effects(limit))
    }

    fn replace_vocabulary(
        &self,
        expected_vocabulary_hash: Option<&str>,
        replacement: &TagVocabularyReplacement,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_tag_vocabulary_state(expected_vocabulary_hash, replacement)
    }

    fn replace_staged(
        &self,
        expected_revision: i64,
        next_revision: i64,
        staged: &[TagStagedSuggestionRecord],
        now: &str,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_tag_staged_suggestions(expected_revision, next_revision, staged, now)
    }

    fn promote(
        &self,
        expected_vocabulary_hash: &str,
        expected_staged_revision: i64,
        promotion: &TagVocabularyPromotion,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .promote_tag_vocabulary_state(
                expected_vocabulary_hash,
                expected_staged_revision,
                promotion,
            )
    }

    fn promote_index(
        &self,
        expected_vocabulary_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .promote_tag_index(expected_vocabulary_hash, index_hash, index_json, now)
    }

    fn replace_audits(&self, library_id: i64, records: &[TagAuditRecord]) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_tag_audits(library_id, records)
    }

    fn upsert_audit(&self, record: &TagAuditRecord) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .upsert_tag_audit(record)
    }

    fn update_effect_receipts(&self, receipts: &[TagEffectReceiptRecord]) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .update_tag_effect_receipts(receipts)
    }
}

impl ConceptKbRepositoryPort for RepositoryPort {
    fn get_state(&self) -> Result<Option<ConceptApplicationStateRecord>, String> {
        self.with_reader(Repository::get_concept_application_state)
    }

    fn load(&self) -> Result<ConceptKbReplacement, String> {
        self.with_reader(|repository| {
            Ok(ConceptKbReplacement {
                state: repository
                    .get_concept_application_state()?
                    .unwrap_or_default(),
                concepts: repository.list_concepts()?,
                senses: repository.list_concept_senses()?,
                aliases: repository.list_concept_aliases()?,
                relations: repository.list_concept_relations()?,
                reviews: repository.list_concept_reviews()?,
                topic_links: repository.list_topic_concept_links()?,
            })
        })
    }

    fn load_review_page(
        &self,
        query: &ReviewPageQuery,
    ) -> Result<(ConceptKbReplacement, usize), String> {
        self.with_reader(|repository| repository.load_concept_review_page(query))
    }

    fn replace(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &ConceptKbReplacement,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_concept_kb_application_state(expected_manifest_hash, replacement)
    }

    fn replace_with_receipt(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &ConceptKbReplacement,
        receipt: Option<&OperationRecord>,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_concept_kb_application_state_with_receipt(
                expected_manifest_hash,
                replacement,
                receipt,
            )
    }

    fn promote_index(
        &self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .promote_concept_kb_index(expected_manifest_hash, index_hash, index_json, now)
    }

    fn promote_index_with_receipt(
        &self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
        receipt: Option<&OperationRecord>,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .promote_concept_kb_index_with_receipt(
                expected_manifest_hash,
                index_hash,
                index_json,
                now,
                receipt,
            )
    }
}

impl TopicGraphRepositoryPort for RepositoryPort {
    fn get_state(&self) -> Result<Option<TopicGraphApplicationStateRecord>, String> {
        self.with_reader(Repository::get_topic_graph_application_state)
    }

    fn load(&self) -> Result<TopicGraphReplacement, String> {
        self.with_reader(|repository| {
            Ok(TopicGraphReplacement {
                state: repository
                    .get_topic_graph_application_state()?
                    .unwrap_or_default(),
                nodes: repository.list_topic_graph_nodes()?,
                edges: repository.list_topic_graph_edges()?,
                reviews: repository.list_topic_graph_reviews()?,
            })
        })
    }

    fn load_review_page(
        &self,
        query: &ReviewPageQuery,
    ) -> Result<(TopicGraphReplacement, usize, usize), String> {
        self.with_reader(|repository| repository.load_topic_graph_review_page(query))
    }

    fn load_window(&self, limit: usize) -> Result<TopicGraphReplacement, String> {
        self.with_reader(|repository| repository.load_topic_graph_window(limit))
    }

    fn replace(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_topic_graph_application_state(expected_manifest_hash, replacement)
    }

    fn replace_with_receipt(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
        receipt: Option<&OperationRecord>,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_topic_graph_application_state_with_receipt(
                expected_manifest_hash,
                replacement,
                receipt,
            )
    }

    fn promote_index(
        &self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .promote_topic_graph_index(expected_manifest_hash, index_hash, index_json, now)
    }

    fn promote_index_with_receipt(
        &self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
        receipt: Option<&OperationRecord>,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .promote_topic_graph_index_with_receipt(
                expected_manifest_hash,
                index_hash,
                index_json,
                now,
                receipt,
            )
    }
}

impl WorkbenchRepositoryPort for RepositoryPort {
    fn get_cache_basis(&self, cache_key: &str) -> Result<Option<CacheBasisRecord>, String> {
        self.with_reader(|repository| repository.get_cache_basis(cache_key))
    }

    fn list_operations(&self, query: &OperationQuery) -> Result<Vec<OperationRecord>, String> {
        self.with_reader(|repository| repository.list_operations(query))
    }
}

impl CitationGraphRepositoryPort for RepositoryPort {
    fn get_state(&self) -> Result<Option<CitationGraphApplicationStateRecord>, String> {
        self.with_reader(Repository::get_citation_graph_application_state)
    }

    fn list_nodes(&self) -> Result<Vec<CitationNodeRecord>, String> {
        self.with_reader(Repository::list_citation_nodes)
    }

    fn list_edges(&self) -> Result<Vec<CitationEdgeRecord>, String> {
        self.with_reader(Repository::list_citation_edges)
    }

    fn read_metrics_page(
        &self,
        request: &CitationMetricsPageQuery,
    ) -> Result<CitationMetricsPageRows, String> {
        self.with_reader(|repository| repository.read_citation_metrics_page(request))
    }

    fn list_ready_layout_presets(&self, graph_hash: &str) -> Result<Vec<String>, String> {
        self.with_reader(|repository| repository.list_ready_citation_layout_presets(graph_hash))
    }

    fn read_layout_window(
        &self,
        layout_key: &str,
        node_ids: &[String],
    ) -> Result<Option<CitationLayoutWindowRecord>, String> {
        self.with_reader(|repository| repository.read_citation_layout_window(layout_key, node_ids))
    }

    fn replace(
        &self,
        expected_graph_hash: Option<&str>,
        replacement: &CitationGraphReplacement,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_citation_graph_application_state(expected_graph_hash, replacement)
    }

    fn replace_source_slice(
        &self,
        expected_graph_hash: &str,
        source_ids: &[String],
        replacement: &CitationGraphReplacement,
    ) -> Result<Option<String>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_citation_graph_source_slice(expected_graph_hash, source_ids, replacement)
    }

    fn promote_metrics(
        &self,
        expected_graph_hash: &str,
        metrics_hash: &str,
        records: &[CitationComplexMetricsRecord],
        now: &str,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .promote_citation_complex_metrics(expected_graph_hash, metrics_hash, records, now)
    }

    fn promote_layout(
        &self,
        expected_graph_hash: &str,
        record: &CitationLayoutRecord,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .promote_citation_layout(expected_graph_hash, record)
    }

    fn upsert_operation(&self, record: &OperationRecord) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .upsert_operation(record)
    }

    fn update_operation(
        &self,
        operation_id: &str,
        status: &str,
        phase: &str,
        diagnostics: &[String],
        now: &str,
    ) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .update_operation_status(operation_id, status, phase, diagnostics, now)?;
        Ok(())
    }
}

impl ReferenceRefreshRepositoryPort for RepositoryPort {
    fn get_state(&self) -> Result<Option<ReferenceApplicationStateRecord>, String> {
        self.with_reader(Repository::get_reference_application_state)
    }

    fn load_projection_snapshot(&self) -> Result<ReferenceProjectionSnapshot, String> {
        self.with_reader(Repository::load_reference_projection_snapshot)
    }

    fn list_sources(&self) -> Result<Vec<ReferenceSourceRecord>, String> {
        self.with_reader(Repository::list_reference_sources)
    }

    fn list_raw_references(&self) -> Result<Vec<RawReferenceRecord>, String> {
        self.with_reader(Repository::list_raw_references)
    }

    fn replace(&self, replacement: &ReferenceProjectionReplacement) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_reference_projection(replacement)
    }

    fn apply_literature_projection(
        &self,
        replacement: &ReferenceProjectionReplacement,
        metadata: Option<&LiteratureMatchingMetadataRecord>,
        receipt: &OperationRecord,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .apply_literature_reference_projection(replacement, metadata, receipt)
    }

    fn upsert_operation(&self, record: &OperationRecord) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .upsert_operation(record)
    }

    fn update_operation(
        &self,
        operation_id: &str,
        status: &str,
        phase: &str,
        diagnostics: &[String],
        now: &str,
    ) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .update_operation_status(operation_id, status, phase, diagnostics, now)?;
        Ok(())
    }
}

impl ReferenceMatchingRepositoryPort for RepositoryPort {
    fn get_reference_state(&self) -> Result<Option<ReferenceApplicationStateRecord>, String> {
        self.with_reader(Repository::get_reference_application_state)
    }

    fn get_matching_state(&self) -> Result<Option<ReferenceMatchingStateRecord>, String> {
        self.with_reader(Repository::get_reference_matching_state)
    }

    fn list_raw_references(&self) -> Result<Vec<RawReferenceRecord>, String> {
        self.with_reader(Repository::list_raw_references)
    }

    fn list_canonicals(&self) -> Result<Vec<CanonicalReferenceRecord>, String> {
        self.with_reader(Repository::list_canonical_references)
    }

    fn list_bindings(&self) -> Result<Vec<ReferenceBindingFactRecord>, String> {
        self.with_reader(Repository::list_reference_bindings)
    }

    fn list_redirects(&self) -> Result<Vec<ReferenceRedirectFactRecord>, String> {
        self.with_reader(Repository::list_reference_redirects)
    }

    fn get_preparation(
        &self,
        preparation_id: &str,
    ) -> Result<Option<ReferenceMatchingPreparationRecord>, String> {
        self.with_reader(|repository| repository.get_reference_matching_preparation(preparation_id))
    }

    fn has_prepared_preparation(&self) -> Result<bool, String> {
        self.with_reader(Repository::has_prepared_reference_matching_preparation)
    }

    fn upsert_preparation(
        &self,
        record: &ReferenceMatchingPreparationRecord,
    ) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .upsert_reference_matching_preparation(record)
    }

    fn delete_preparation(&self, preparation_id: &str) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .delete_reference_matching_preparation(preparation_id)
    }

    fn delete_prepared_preparations(&self) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .delete_prepared_reference_matching_preparations()
    }

    fn get_proposal(
        &self,
        proposal_id: &str,
    ) -> Result<Option<ReferenceMatchProposalRecord>, String> {
        self.with_reader(|repository| repository.get_reference_match_proposal(proposal_id))
    }

    fn list_proposals(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<ReferenceMatchProposalRecord>, bool), String> {
        self.with_reader(|repository| repository.list_reference_match_proposals(offset, limit))
    }

    fn was_rejected(
        &self,
        kind: &str,
        basis_hash: &str,
        source_hash: &str,
    ) -> Result<bool, String> {
        self.with_reader(|repository| {
            repository.has_rejected_reference_match_proposal(kind, basis_hash, source_hash)
        })
    }

    fn promote(
        &self,
        preparation_id: &str,
        promotion: &ReferenceMatchingPromotion,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .promote_reference_matching(preparation_id, promotion)
    }

    fn apply_reviews(
        &self,
        transitions: &[ReferenceReviewTransition],
        receipt: Option<&OperationRecord>,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .apply_reference_review_transitions_with_receipt(transitions, receipt)
    }
}

impl TopicRepositoryPort for RepositoryPort {
    fn get_state(&self, topic_id: &str) -> Result<Option<TopicApplicationStateRecord>, String> {
        self.with_reader(|repository| repository.get_topic_application_state(topic_id))
    }

    fn list_states(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<TopicApplicationStateRecord>, usize), String> {
        self.with_reader(|repository| repository.list_topic_application_states(offset, limit))
    }

    fn list_records(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<TopicApplicationRecordPage, String> {
        self.with_reader(|repository| repository.list_topic_application_records(offset, limit))
    }

    fn find_records_by_paper_refs(
        &self,
        paper_refs: &[String],
        limit: usize,
    ) -> Result<TopicApplicationRecordPage, String> {
        self.with_reader(|repository| {
            repository.find_topic_application_records_by_paper_refs(paper_refs, limit)
        })
    }

    fn list_workflow_option_records(
        &self,
        limit: usize,
    ) -> Result<TopicApplicationRecordPage, String> {
        self.with_reader(|repository| repository.list_topic_workflow_option_records(limit))
    }

    fn list_reference_artifacts(
        &self,
        paper_refs: &[String],
    ) -> Result<Vec<ReferenceArtifactRecord>, String> {
        self.with_reader(|repository| repository.list_reference_artifacts(paper_refs))
    }

    fn upsert_state(&self, record: &TopicApplicationStateRecord) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .upsert_topic_application_state(record)
    }

    fn get_projection(
        &self,
        topic_id: &str,
    ) -> Result<Option<TopicApplicationProjectionRecord>, String> {
        self.with_reader(|repository| repository.get_topic_application_projection(topic_id))
    }

    fn upsert_projection(&self, record: &TopicApplicationProjectionRecord) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .upsert_topic_application_projection(record)
    }

    fn get_deleted(&self, topic_id: &str) -> Result<Option<DeletedTopicArtifactRecord>, String> {
        self.with_reader(|repository| repository.get_deleted_topic_artifact(topic_id))
    }

    fn list_deleted(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<DeletedTopicArtifactRecord>, usize), String> {
        self.with_reader(|repository| repository.list_deleted_topic_artifacts(offset, limit))
    }

    fn soft_delete(&self, record: &DeletedTopicArtifactRecord) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .soft_delete_topic_application_state(record)
    }

    fn purge_deleted(&self, records: &[DeletedTopicArtifactRecord]) -> Result<usize, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .purge_deleted_topic_artifacts(records)
    }

    fn update_discovery_hint(
        &self,
        hint_id: &str,
        status: &str,
        updated_at: &str,
    ) -> Result<Option<Value>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .update_topic_discovery_hint_status(hint_id, status, updated_at)
    }

    fn upsert_operation(&self, record: &OperationRecord) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .upsert_operation(record)
    }

    fn update_operation(
        &self,
        operation_id: &str,
        status: &str,
        phase: &str,
        diagnostics: &[String],
        now: &str,
    ) -> Result<Option<OperationRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .update_operation_status(operation_id, status, phase, diagnostics, now)
    }
}

impl KnowledgeCheckpointRepositoryPort for RepositoryPort {
    fn capture(&self) -> Result<KnowledgeCheckpointCapture, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .capture_knowledge_checkpoint_state()
    }

    fn replace(&self, replacement: &KnowledgeCheckpointReplacement) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_knowledge_checkpoint_state(replacement)
    }
}

impl DurableBundleRepositoryPort for RepositoryPort {
    fn capture_bundle(&self) -> Result<DurableBundleCapture, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .capture_durable_bundle_state()
    }

    fn capture_import(&self) -> Result<DurableImportCapture, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .capture_durable_import_state()
    }

    fn apply_import(&self, request: &DurableImportApply) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .apply_durable_import_state(request)
    }

    fn clear_import_commit(&self, receipt_id: &str) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .clear_durable_import_commit(receipt_id)
    }
}

impl DebugMaintenanceRepositoryPort for RepositoryPort {
    fn capture(&self) -> Result<DebugProjection, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .capture_debug_projection()
    }
}

pub trait TopicCanonicalPort: Send + Sync {
    fn inspect(&self, topic_id: &str) -> Result<Value, String>;
    fn read_current(&self, topic_id: &str) -> Result<CurrentTopic, String>;
    fn promote(&self, promotion: Promotion) -> Result<CanonicalReceipt, String>;
    fn receipt(&self, topic_id: &str) -> Result<Option<CanonicalReceipt>, String>;
    fn archive_current(&self, topic_id: &str, deleted_path_id: &str) -> Result<bool, String>;
    fn restore_deleted(&self, topic_id: &str, deleted_path_id: &str) -> Result<bool, String>;
    fn purge_deleted(&self, deleted_path_id: &str) -> Result<bool, String>;
}

#[derive(Clone)]
pub struct CanonicalStorePort {
    store: Arc<Mutex<CanonicalStore>>,
}

impl CanonicalStorePort {
    pub fn new(store: Arc<Mutex<CanonicalStore>>) -> Self {
        Self { store }
    }

    pub fn owner(&self) -> Arc<Mutex<CanonicalStore>> {
        Arc::clone(&self.store)
    }
}

impl TopicCanonicalPort for CanonicalStorePort {
    fn inspect(&self, topic_id: &str) -> Result<Value, String> {
        self.store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .inspect(topic_id)
    }

    fn read_current(&self, topic_id: &str) -> Result<CurrentTopic, String> {
        self.store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .read_current(topic_id)
    }

    fn promote(&self, promotion: Promotion) -> Result<CanonicalReceipt, String> {
        self.store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .promote(promotion)
    }

    fn receipt(&self, topic_id: &str) -> Result<Option<CanonicalReceipt>, String> {
        self.store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .receipt(topic_id)
    }

    fn archive_current(&self, topic_id: &str, deleted_path_id: &str) -> Result<bool, String> {
        self.store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .archive_current(topic_id, deleted_path_id)
    }

    fn restore_deleted(&self, topic_id: &str, deleted_path_id: &str) -> Result<bool, String> {
        self.store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .restore_deleted(topic_id, deleted_path_id)
    }

    fn purge_deleted(&self, deleted_path_id: &str) -> Result<bool, String> {
        self.store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .purge_deleted(deleted_path_id)
    }
}

impl DurableCanonicalSourcePort for CanonicalStorePort {
    fn read_current_assets(
        &self,
        topic: &DurableTopicBasis,
    ) -> Result<DurableCanonicalCapture, String> {
        let store = self
            .store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?;
        let inspected = store.inspect(&topic.topic_id)?;
        assert_durable_topic_basis(topic, &inspected)?;
        let CurrentTopic::Ready { snapshot, basis } = store.read_current(&topic.topic_id)? else {
            return Err("durable_topic_current_invalid".into());
        };
        if snapshot.path_id != topic.path_id
            || basis.manifest_hash != topic.manifest_hash
            || basis.artifact_hash != topic.artifact_hash
            || canonical_json_hash(&snapshot.metadata)? != topic.metadata_hash
        {
            return Err("durable_topic_current_basis_mismatch".into());
        }
        let mut drafts = Vec::new();
        drafts.push(topic_asset(
            topic,
            "manifest.json",
            json_text(&snapshot.manifest)?,
        ));
        drafts.push(topic_asset(
            topic,
            "artifact.json",
            json_text(&snapshot.artifact)?,
        ));
        drafts.push(topic_asset(
            topic,
            "metadata.json",
            json_text(&snapshot.metadata)?,
        ));
        for (name, value) in &snapshot.sections {
            drafts.push(topic_asset(
                topic,
                &format!("sections/{}", section_file_name(name)?),
                json_text(value)?,
            ));
        }
        for (relative, content) in &snapshot.markdown {
            drafts.push(topic_asset(topic, relative, content.clone()));
        }
        Ok(DurableCanonicalCapture {
            basis: canonical_json_hash(
                &serde_json::to_value(&snapshot)
                    .map_err(|_| "durable_topic_current_invalid".to_owned())?,
            )?,
            drafts,
        })
    }

    fn inspect_current(&self, topic: &DurableTopicBasis) -> Result<String, String> {
        let store = self
            .store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?;
        let inspected = store.inspect(&topic.topic_id)?;
        assert_durable_topic_basis(topic, &inspected)?;
        let CurrentTopic::Ready { snapshot, .. } = store.read_current(&topic.topic_id)? else {
            return Err("durable_topic_current_invalid".into());
        };
        canonical_json_hash(
            &serde_json::to_value(snapshot)
                .map_err(|_| "durable_topic_current_invalid".to_owned())?,
        )
    }
}

impl DurableCanonicalImportPort for CanonicalStorePort {
    fn prepare(
        &self,
        entries: &[DurableEnvelope],
        current_topics: &[DurableTopicBasis],
    ) -> Result<DurableCanonicalPreparation, String> {
        let mut groups = BTreeMap::<String, BTreeMap<String, String>>::new();
        for entry in entries {
            if entry.entity_kind != "topic_current_asset" {
                continue;
            }
            let relative_path = entry
                .data
                .get("relative_path")
                .and_then(Value::as_str)
                .ok_or_else(|| "durable_import_topic_asset_invalid".to_owned())?;
            let content = entry
                .data
                .get("content")
                .and_then(Value::as_str)
                .ok_or_else(|| "durable_import_topic_asset_invalid".to_owned())?;
            let parts = relative_path.split('/').collect::<Vec<_>>();
            if parts.len() < 4 || parts[0] != "topics" || parts[2] != "current" {
                return Err("durable_import_topic_asset_invalid".into());
            }
            groups
                .entry(parts[1].to_owned())
                .or_default()
                .insert(parts[3..].join("/"), content.to_owned());
        }
        let current = current_topics
            .iter()
            .map(|topic| (topic.path_id.clone(), topic))
            .collect::<BTreeMap<_, _>>();
        let mut promotions = Vec::new();
        let mut targets = Vec::new();
        for (path_id, mut assets) in groups {
            let manifest: Value = serde_json::from_str(
                &assets
                    .remove("manifest.json")
                    .ok_or_else(|| "durable_import_topic_snapshot_invalid".to_owned())?,
            )
            .map_err(|_| "durable_import_topic_snapshot_invalid".to_owned())?;
            let artifact: Value = serde_json::from_str(
                &assets
                    .remove("artifact.json")
                    .ok_or_else(|| "durable_import_topic_snapshot_invalid".to_owned())?,
            )
            .map_err(|_| "durable_import_topic_snapshot_invalid".to_owned())?;
            let metadata: Value = serde_json::from_str(
                &assets
                    .remove("metadata.json")
                    .ok_or_else(|| "durable_import_topic_snapshot_invalid".to_owned())?,
            )
            .map_err(|_| "durable_import_topic_snapshot_invalid".to_owned())?;
            let declared = manifest
                .get("sections")
                .and_then(Value::as_object)
                .ok_or_else(|| "durable_import_topic_snapshot_invalid".to_owned())?;
            let mut sections = BTreeMap::new();
            for name in declared.keys() {
                let relative = format!("sections/{}", section_file_name(name)?);
                let value = assets
                    .remove(&relative)
                    .ok_or_else(|| "durable_import_topic_snapshot_invalid".to_owned())?;
                sections.insert(
                    name.clone(),
                    serde_json::from_str(&value)
                        .map_err(|_| "durable_import_topic_snapshot_invalid".to_owned())?,
                );
            }
            let mut markdown = BTreeMap::new();
            for (relative, content) in assets {
                if !relative.ends_with(".md") {
                    return Err("durable_import_topic_asset_invalid".into());
                }
                markdown.insert(relative, content);
            }
            let topic_id = metadata
                .pointer("/data/topic_id")
                .and_then(Value::as_str)
                .ok_or_else(|| "durable_import_topic_identity_invalid".to_owned())?
                .to_owned();
            let snapshot = TopicSnapshot {
                topic_id: topic_id.clone(),
                path_id: path_id.clone(),
                manifest,
                artifact,
                metadata,
                sections,
                markdown,
            };
            let manifest_hash = canonical_json_hash(&snapshot.manifest)?;
            let artifact_hash = canonical_json_hash(&snapshot.artifact)?;
            let metadata_hash = canonical_json_hash(&snapshot.metadata)?;
            let bundle_hash = canonical_json_hash(
                &serde_json::to_value(&snapshot)
                    .map_err(|_| "durable_import_topic_snapshot_invalid".to_owned())?,
            )?;
            let expected_basis = current.get(&path_id).map(|topic| CanonicalBasis {
                manifest_hash: topic.manifest_hash.clone(),
                artifact_hash: topic.artifact_hash.clone(),
            });
            promotions.push(Promotion {
                transaction_id: format!("durable-import-{path_id}"),
                expected_basis,
                snapshot,
            });
            targets.push(DurableTopicBasis {
                topic_id,
                path_id,
                manifest_hash,
                artifact_hash,
                metadata_hash,
                bundle_hash,
            });
        }
        Ok(DurableCanonicalPreparation {
            promotions,
            targets,
        })
    }

    fn stage(
        &self,
        receipt_id: &str,
        manifest_hash: &str,
        promotions: Vec<Promotion>,
    ) -> Result<(), String> {
        self.store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .stage_import_batch(receipt_id.into(), manifest_hash.into(), promotions)
    }

    fn commit(&self, receipt_id: &str, manifest_hash: &str) -> Result<String, String> {
        self.store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .commit_import_batch(receipt_id, manifest_hash)
            .map(|_| "promoted".into())
    }

    fn discard(&self, receipt_id: &str) -> Result<bool, String> {
        self.store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .discard_import_batch(receipt_id)
    }

    fn recover(
        &self,
        receipt: Option<&synthesis_repository::DurableImportCommitReceipt>,
    ) -> Result<String, String> {
        self.store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .recover_import_batch(receipt.map(|value| {
                (
                    value.receipt_id.as_str(),
                    value
                        .manifest_hash
                        .strip_prefix("sha256:")
                        .unwrap_or(&value.manifest_hash),
                )
            }))
    }
}

impl DebugCanonicalPort for CanonicalStorePort {
    fn inspect(&self, topic_id: &str) -> Result<DebugTopicInspection, String> {
        let value = self
            .store
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .inspect(topic_id)?;
        Ok(DebugTopicInspection {
            topic_id: value
                .get("topicId")
                .and_then(Value::as_str)
                .unwrap_or(topic_id)
                .into(),
            status: value
                .get("status")
                .and_then(Value::as_str)
                .unwrap_or("invalid")
                .into(),
            manifest_hash: value
                .get("manifestHash")
                .and_then(Value::as_str)
                .map(str::to_owned),
            artifact_hash: value
                .get("artifactHash")
                .and_then(Value::as_str)
                .map(str::to_owned),
            metadata_hash: value
                .get("metadataHash")
                .and_then(Value::as_str)
                .map(str::to_owned),
            section_count: value
                .get("sections")
                .and_then(Value::as_array)
                .map_or(0, Vec::len),
            diagnostics: value
                .get("diagnostics")
                .and_then(Value::as_array)
                .map(|items| {
                    items
                        .iter()
                        .filter_map(Value::as_str)
                        .map(str::to_owned)
                        .collect()
                })
                .unwrap_or_default(),
        })
    }
}

fn assert_durable_topic_basis(topic: &DurableTopicBasis, inspected: &Value) -> Result<(), String> {
    if inspected.get("status").and_then(Value::as_str) != Some("ready")
        || inspected.get("topicId").and_then(Value::as_str) != Some(&topic.topic_id)
        || inspected.get("pathId").and_then(Value::as_str) != Some(&topic.path_id)
        || inspected.get("manifestHash").and_then(Value::as_str) != Some(&topic.manifest_hash)
        || inspected.get("artifactHash").and_then(Value::as_str) != Some(&topic.artifact_hash)
        || inspected.get("metadataHash").and_then(Value::as_str) != Some(&topic.metadata_hash)
    {
        Err("durable_topic_current_basis_mismatch".into())
    } else {
        Ok(())
    }
}

fn json_text(value: &Value) -> Result<String, String> {
    serde_json::to_string_pretty(value)
        .map(|text| format!("{text}\n"))
        .map_err(|_| "durable_topic_current_invalid".into())
}

fn section_file_name(name: &str) -> Result<String, String> {
    if name.is_empty()
        || !name.chars().enumerate().all(|(index, character)| {
            character.is_ascii_lowercase()
                || character == '_'
                || (index > 0 && character.is_ascii_digit())
        })
    {
        return Err("durable_import_topic_snapshot_invalid".into());
    }
    Ok(format!("{}.json", name.replace('_', "-")))
}

fn topic_asset(
    topic: &DurableTopicBasis,
    relative: &str,
    content: String,
) -> synthesis_repository::DurableDraft {
    let relative_path = format!("topics/{}/current/{relative}", topic.path_id);
    synthesis_repository::DurableDraft {
        entity_kind: "topic_current_asset".into(),
        entity_id: format!(
            "topic-asset:{}:{}/current/{relative}",
            topic.path_id, topic.path_id
        ),
        schema_id: "synthesis.durable.topic_current_asset".into(),
        data: serde_json::json!({
            "topic_id":topic.path_id,
            "relative_path":relative_path,
            "content":content,
        }),
        updated_at: String::new(),
    }
}

pub trait StructuredArtifactPort: Send + Sync {
    fn validate_manifest(&self, manifest: &Value) -> Result<(), String>;
    fn assemble_artifact(
        &self,
        manifest: &Value,
        sections: &BTreeMap<String, Value>,
    ) -> Result<Value, String>;
    fn validate_artifact(&self, artifact: &Value, language: &str) -> Result<(), String>;
    fn apply_section_patch(
        &self,
        current: &TopicSnapshot,
        patch_manifest: &Value,
        changed_sections: &BTreeMap<String, Value>,
    ) -> Result<PatchOutput, String>;
}

#[derive(Debug)]
pub struct DisabledStructuredArtifact;

impl StructuredArtifactPort for DisabledStructuredArtifact {
    fn validate_manifest(&self, _manifest: &Value) -> Result<(), String> {
        Err("compute_unavailable".into())
    }

    fn assemble_artifact(
        &self,
        _manifest: &Value,
        _sections: &BTreeMap<String, Value>,
    ) -> Result<Value, String> {
        Err("compute_unavailable".into())
    }

    fn validate_artifact(&self, _artifact: &Value, _language: &str) -> Result<(), String> {
        Err("compute_unavailable".into())
    }

    fn apply_section_patch(
        &self,
        _current: &TopicSnapshot,
        _patch_manifest: &Value,
        _changed_sections: &BTreeMap<String, Value>,
    ) -> Result<PatchOutput, String> {
        Err("compute_unavailable".into())
    }
}

#[cfg(test)]
mod repository_port_tests {
    use super::*;
    use std::fs;
    use std::sync::{Barrier, mpsc};
    use std::thread;
    use std::time::{Duration, SystemTime, UNIX_EPOCH};
    use synthesis_repository::{RepositoryIdentity, SCHEMA_VERSION};

    fn repository() -> (std::path::PathBuf, Arc<Mutex<Repository>>) {
        let root = std::env::temp_dir().join(format!(
            "synthesis-repository-port-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(&root).expect("root");
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile:reader-pool".into(),
                data_root_id: "data:reader-pool".into(),
            },
        )
        .expect("repository");
        (root, Arc::new(Mutex::new(repository)))
    }

    #[test]
    fn production_reader_count_is_bounded() {
        let (root, writer) = repository();
        assert_eq!(
            RepositoryPort::new_with_readers(Arc::clone(&writer), 5)
                .err()
                .as_deref(),
            Some("repository_reader_limit_exceeded")
        );
        Arc::try_unwrap(writer)
            .expect("writer owner")
            .into_inner()
            .expect("writer")
            .close()
            .expect("close writer");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn four_readers_run_concurrently_and_a_fifth_waits() {
        let (root, writer) = repository();
        let port = Arc::new(
            RepositoryPort::new_with_readers(Arc::clone(&writer), 4).expect("reader pool"),
        );
        let entered = Arc::new(Barrier::new(5));
        let release = Arc::new(Barrier::new(5));
        let mut readers = Vec::new();
        for _ in 0..4 {
            let port = Arc::clone(&port);
            let entered = Arc::clone(&entered);
            let release = Arc::clone(&release);
            readers.push(thread::spawn(move || {
                port.with_reader(|repository| {
                    assert_eq!(
                        repository.query(
                            "SELECT value FROM synt_schema_meta WHERE key='repository_foundation_schema_version'",
                            &[],
                        )?[0]["value"],
                        SCHEMA_VERSION
                    );
                    entered.wait();
                    release.wait();
                    Ok(())
                })
                .expect("reader")
            }));
        }
        entered.wait();

        let (attempted_tx, attempted_rx) = mpsc::channel();
        let (acquired_tx, acquired_rx) = mpsc::channel();
        let fifth_port = Arc::clone(&port);
        let fifth = thread::spawn(move || {
            attempted_tx.send(()).expect("signal attempt");
            fifth_port
                .with_reader(|_| {
                    acquired_tx.send(()).expect("signal acquired");
                    Ok(())
                })
                .expect("fifth reader");
        });
        attempted_rx
            .recv_timeout(Duration::from_secs(1))
            .expect("fifth reader attempts checkout");
        assert!(
            acquired_rx.recv_timeout(Duration::from_millis(50)).is_err(),
            "fifth reader must wait for a bounded slot"
        );
        release.wait();
        acquired_rx
            .recv_timeout(Duration::from_secs(1))
            .expect("fifth reader eventually acquires");
        for reader in readers {
            reader.join().expect("reader thread");
        }
        fifth.join().expect("fifth thread");

        drop(port);
        Arc::try_unwrap(writer)
            .expect("writer owner")
            .into_inner()
            .expect("writer")
            .close()
            .expect("close writer");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn workbench_read_does_not_wait_for_the_writer_owner() {
        let (root, writer) = repository();
        writer
            .lock()
            .expect("writer")
            .upsert_cache_basis(&CacheBasisRecord {
                cache_key: "reference-sidecar:library".into(),
                cache_kind: "reference-sidecar".into(),
                status: "ready".into(),
                ..CacheBasisRecord::default()
            })
            .expect("cache");
        let port = Arc::new(
            RepositoryPort::new_with_readers(Arc::clone(&writer), 4).expect("reader pool"),
        );
        let writer_guard = writer.lock().expect("hold writer");
        let (result_tx, result_rx) = mpsc::channel();
        let read_port = Arc::clone(&port);
        let reader = thread::spawn(move || {
            result_tx
                .send(WorkbenchRepositoryPort::get_cache_basis(
                    read_port.as_ref(),
                    "reference-sidecar:library",
                ))
                .expect("send read");
        });
        let row = result_rx
            .recv_timeout(Duration::from_secs(1))
            .expect("read must bypass writer")
            .expect("read result")
            .expect("cache row");
        assert_eq!(row.status, "ready");
        drop(writer_guard);
        reader.join().expect("reader thread");

        drop(port);
        Arc::try_unwrap(writer)
            .expect("writer owner")
            .into_inner()
            .expect("writer")
            .close()
            .expect("close writer");
        fs::remove_dir_all(root).expect("cleanup");
    }
}
