use crate::dto::PatchOutput;
use serde_json::Value;
use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};
use synthesis_canonical_store::{
    CanonicalReceipt, CanonicalStore, CurrentTopic, Promotion, TopicSnapshot,
};
use synthesis_repository::{
    CacheBasisRecord, OperationQuery, OperationRecord, Repository,
    TopicApplicationProjectionRecord, TopicApplicationStateRecord,
};
use synthesis_repository::{
    CanonicalReferenceRecord, CitationComplexMetricsRecord, CitationEdgeRecord,
    CitationGraphApplicationStateRecord, CitationGraphReplacement, CitationLayoutRecord,
    CitationNodeRecord, RawReferenceRecord, ReferenceApplicationStateRecord,
    ReferenceArtifactRecord, ReferenceBindingFactRecord, ReferenceMatchProposalRecord,
    ReferenceMatchingPreparationRecord, ReferenceMatchingPromotion, ReferenceMatchingStateRecord,
    ReferenceProjectionReplacement, ReferenceRedirectFactRecord, ReferenceReviewTransition,
    ReferenceSourceRecord,
};
use synthesis_repository::{
    ConceptApplicationStateRecord, ConceptKbReplacement, TagApplicationStateRecord, TagAuditRecord,
    TagEffectRecord, TagStagedSuggestionRecord, TagVocabularyEntryRecord, TagVocabularyPromotion,
    TagVocabularyReplacement, TopicGraphApplicationStateRecord, TopicGraphReplacement,
};

pub trait CitationGraphRepositoryPort: Send + Sync {
    fn get_state(&self) -> Result<Option<CitationGraphApplicationStateRecord>, String>;
    fn list_nodes(&self) -> Result<Vec<CitationNodeRecord>, String>;
    fn list_edges(&self) -> Result<Vec<CitationEdgeRecord>, String>;
    fn list_complex_metrics(&self) -> Result<Vec<CitationComplexMetricsRecord>, String>;
    fn list_layouts(&self) -> Result<Vec<CitationLayoutRecord>, String>;
    fn get_layout(&self, layout_key: &str) -> Result<Option<CitationLayoutRecord>, String>;
    fn replace(
        &self,
        expected_graph_hash: Option<&str>,
        replacement: &CitationGraphReplacement,
    ) -> Result<bool, String>;
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
    fn list_sources(&self) -> Result<Vec<ReferenceSourceRecord>, String>;
    fn list_artifacts(
        &self,
        source_refs: &[String],
    ) -> Result<Vec<ReferenceArtifactRecord>, String>;
    fn list_raw_references(&self) -> Result<Vec<RawReferenceRecord>, String>;
    fn list_canonicals(&self) -> Result<Vec<CanonicalReferenceRecord>, String>;
    fn list_bindings(&self) -> Result<Vec<ReferenceBindingFactRecord>, String>;
    fn replace(&self, replacement: &ReferenceProjectionReplacement) -> Result<bool, String>;
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
    fn apply_review(&self, transition: &ReferenceReviewTransition) -> Result<bool, String>;
}

pub trait TagVocabularyRepositoryPort: Send + Sync {
    fn get_state(&self) -> Result<Option<TagApplicationStateRecord>, String>;
    fn load_candidate(&self) -> Result<TagVocabularyReplacement, String>;
    fn list_entries(&self) -> Result<Vec<TagVocabularyEntryRecord>, String>;
    fn list_staged(&self) -> Result<Vec<TagStagedSuggestionRecord>, String>;
    fn list_effects(&self) -> Result<Vec<TagEffectRecord>, String>;
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
    fn replace_audit(&self, record: &TagAuditRecord) -> Result<(), String>;
    fn clear_audit(&self, library_id: i64, item_key: &str) -> Result<bool, String>;
    fn update_effect(
        &self,
        effect_id: &str,
        status: &str,
        diagnostics_json: &str,
        occurred_at: &str,
        now: &str,
    ) -> Result<bool, String>;
}

pub trait ConceptKbRepositoryPort: Send + Sync {
    fn get_state(&self) -> Result<Option<ConceptApplicationStateRecord>, String>;
    fn load(&self) -> Result<ConceptKbReplacement, String>;
    fn replace(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &ConceptKbReplacement,
    ) -> Result<bool, String>;
    fn promote_index(
        &self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
    ) -> Result<bool, String>;
}

pub trait TopicGraphRepositoryPort: Send + Sync {
    fn get_state(&self) -> Result<Option<TopicGraphApplicationStateRecord>, String>;
    fn load(&self) -> Result<TopicGraphReplacement, String>;
    fn replace(
        &self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
    ) -> Result<bool, String>;
    fn promote_index(
        &self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
    ) -> Result<bool, String>;
}

pub trait WorkbenchRepositoryPort: Send + Sync {
    fn get_cache_basis(&self, cache_key: &str) -> Result<Option<CacheBasisRecord>, String>;
    fn list_operations(&self, query: &OperationQuery) -> Result<Vec<OperationRecord>, String>;
}

pub trait TopicRepositoryPort: Send + Sync {
    fn get_state(&self, topic_id: &str) -> Result<Option<TopicApplicationStateRecord>, String>;
    fn list_states(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<TopicApplicationStateRecord>, usize), String>;
    fn upsert_state(&self, record: &TopicApplicationStateRecord) -> Result<(), String>;
    fn get_projection(
        &self,
        topic_id: &str,
    ) -> Result<Option<TopicApplicationProjectionRecord>, String>;
    fn upsert_projection(&self, record: &TopicApplicationProjectionRecord) -> Result<(), String>;
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

#[derive(Clone)]
pub struct RepositoryPort {
    repository: Arc<Mutex<Repository>>,
}

impl RepositoryPort {
    pub fn new(repository: Arc<Mutex<Repository>>) -> Self {
        Self { repository }
    }

    pub fn owner(&self) -> Arc<Mutex<Repository>> {
        Arc::clone(&self.repository)
    }
}

impl TagVocabularyRepositoryPort for RepositoryPort {
    fn get_state(&self) -> Result<Option<TagApplicationStateRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_tag_application_state()
    }

    fn load_candidate(&self) -> Result<TagVocabularyReplacement, String> {
        let repository = self
            .repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        Ok(TagVocabularyReplacement {
            state: repository.get_tag_application_state()?.unwrap_or_default(),
            entries: repository.list_tag_vocabulary_entries()?,
            aliases: repository.list_tag_aliases()?,
            abbrevs: repository.list_tag_abbrevs()?,
            protocols: repository.list_tag_protocols()?,
            warnings: repository.list_tag_validation_warnings()?,
        })
    }

    fn list_entries(&self) -> Result<Vec<TagVocabularyEntryRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_tag_vocabulary_entries()
    }

    fn list_staged(&self) -> Result<Vec<TagStagedSuggestionRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_tag_staged_suggestions()
    }

    fn list_effects(&self) -> Result<Vec<TagEffectRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_tag_effects()
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

    fn replace_audit(&self, record: &TagAuditRecord) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_tag_audit(record)
    }

    fn clear_audit(&self, library_id: i64, item_key: &str) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .clear_tag_audit(library_id, item_key)
    }

    fn update_effect(
        &self,
        effect_id: &str,
        status: &str,
        diagnostics_json: &str,
        occurred_at: &str,
        now: &str,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .update_tag_effect(effect_id, status, diagnostics_json, occurred_at, now)
    }
}

impl ConceptKbRepositoryPort for RepositoryPort {
    fn get_state(&self) -> Result<Option<ConceptApplicationStateRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_concept_application_state()
    }

    fn load(&self) -> Result<ConceptKbReplacement, String> {
        let repository = self
            .repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
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
}

impl TopicGraphRepositoryPort for RepositoryPort {
    fn get_state(&self) -> Result<Option<TopicGraphApplicationStateRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_topic_graph_application_state()
    }

    fn load(&self) -> Result<TopicGraphReplacement, String> {
        let repository = self
            .repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?;
        Ok(TopicGraphReplacement {
            state: repository
                .get_topic_graph_application_state()?
                .unwrap_or_default(),
            nodes: repository.list_topic_graph_nodes()?,
            edges: repository.list_topic_graph_edges()?,
            reviews: repository.list_topic_graph_reviews()?,
        })
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
}

impl WorkbenchRepositoryPort for RepositoryPort {
    fn get_cache_basis(&self, cache_key: &str) -> Result<Option<CacheBasisRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_cache_basis(cache_key)
    }

    fn list_operations(&self, query: &OperationQuery) -> Result<Vec<OperationRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_operations(query)
    }
}

impl CitationGraphRepositoryPort for RepositoryPort {
    fn get_state(&self) -> Result<Option<CitationGraphApplicationStateRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_citation_graph_application_state()
    }

    fn list_nodes(&self) -> Result<Vec<CitationNodeRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_citation_nodes()
    }

    fn list_edges(&self) -> Result<Vec<CitationEdgeRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_citation_edges()
    }

    fn list_complex_metrics(&self) -> Result<Vec<CitationComplexMetricsRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_citation_complex_metrics()
    }

    fn list_layouts(&self) -> Result<Vec<CitationLayoutRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_citation_layouts()
    }

    fn get_layout(&self, layout_key: &str) -> Result<Option<CitationLayoutRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_citation_layout(layout_key)
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
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_reference_application_state()
    }

    fn list_sources(&self) -> Result<Vec<ReferenceSourceRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_reference_sources()
    }

    fn list_artifacts(
        &self,
        source_refs: &[String],
    ) -> Result<Vec<ReferenceArtifactRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_reference_artifacts(source_refs)
    }

    fn list_raw_references(&self) -> Result<Vec<RawReferenceRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_raw_references()
    }

    fn list_canonicals(&self) -> Result<Vec<CanonicalReferenceRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_canonical_references()
    }

    fn list_bindings(&self) -> Result<Vec<ReferenceBindingFactRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_reference_bindings()
    }

    fn replace(&self, replacement: &ReferenceProjectionReplacement) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .replace_reference_projection(replacement)
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
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_reference_application_state()
    }

    fn get_matching_state(&self) -> Result<Option<ReferenceMatchingStateRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_reference_matching_state()
    }

    fn list_raw_references(&self) -> Result<Vec<RawReferenceRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_raw_references()
    }

    fn list_canonicals(&self) -> Result<Vec<CanonicalReferenceRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_canonical_references()
    }

    fn list_bindings(&self) -> Result<Vec<ReferenceBindingFactRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_reference_bindings()
    }

    fn list_redirects(&self) -> Result<Vec<ReferenceRedirectFactRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_reference_redirects()
    }

    fn get_preparation(
        &self,
        preparation_id: &str,
    ) -> Result<Option<ReferenceMatchingPreparationRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_reference_matching_preparation(preparation_id)
    }

    fn has_prepared_preparation(&self) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .has_prepared_reference_matching_preparation()
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
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_reference_match_proposal(proposal_id)
    }

    fn list_proposals(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<ReferenceMatchProposalRecord>, bool), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_reference_match_proposals(offset, limit)
    }

    fn was_rejected(
        &self,
        kind: &str,
        basis_hash: &str,
        source_hash: &str,
    ) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .has_rejected_reference_match_proposal(kind, basis_hash, source_hash)
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

    fn apply_review(&self, transition: &ReferenceReviewTransition) -> Result<bool, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .apply_reference_review_transition(transition)
    }
}

impl TopicRepositoryPort for RepositoryPort {
    fn get_state(&self, topic_id: &str) -> Result<Option<TopicApplicationStateRecord>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_topic_application_state(topic_id)
    }

    fn list_states(
        &self,
        offset: usize,
        limit: usize,
    ) -> Result<(Vec<TopicApplicationStateRecord>, usize), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .list_topic_application_states(offset, limit)
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
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_topic_application_projection(topic_id)
    }

    fn upsert_projection(&self, record: &TopicApplicationProjectionRecord) -> Result<(), String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .upsert_topic_application_projection(record)
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

pub trait TopicCanonicalPort: Send + Sync {
    fn inspect(&self, topic_id: &str) -> Result<Value, String>;
    fn read_current(&self, topic_id: &str) -> Result<CurrentTopic, String>;
    fn promote(&self, promotion: Promotion) -> Result<CanonicalReceipt, String>;
    fn receipt(&self, topic_id: &str) -> Result<Option<CanonicalReceipt>, String>;
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
