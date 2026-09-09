use crate::{
    CacheBasisRecord, ConceptKbReplacement, OperationQuery, OperationRecord, Repository,
    TagVocabularyReplacement, TopicGraphReplacement,
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeCheckpointBases {
    pub tag_revision: Option<String>,
    pub concept_manifest: Option<String>,
    pub topic_graph_manifest: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeCheckpointPayload {
    pub tag_vocabulary: TagVocabularyReplacement,
    pub concept_kb: ConceptKbReplacement,
    pub topic_graph: TopicGraphReplacement,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeCheckpointCapture {
    pub bases: KnowledgeCheckpointBases,
    pub payload: KnowledgeCheckpointPayload,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeCheckpointReplacement {
    pub expected_bases: KnowledgeCheckpointBases,
    pub next_bases: KnowledgeCheckpointBases,
    pub payload: KnowledgeCheckpointPayload,
    pub now: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableDraft {
    pub entity_kind: String,
    pub entity_id: String,
    pub schema_id: String,
    pub data: Value,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableTopicBasis {
    pub topic_id: String,
    pub path_id: String,
    pub manifest_hash: String,
    pub artifact_hash: String,
    pub metadata_hash: String,
    pub bundle_hash: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableBundleCapture {
    pub aggregate_basis: Value,
    pub topic_bases: Vec<DurableTopicBasis>,
    pub drafts: Vec<DurableDraft>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableSyncFact {
    pub entity_kind: String,
    pub entity_id: String,
    pub path: String,
    pub hash: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableSyncEntity {
    pub entity_key: String,
    pub entity_kind: String,
    pub entity_id: String,
    pub path: String,
    pub last_synced_hash: String,
    pub last_exported_hash: String,
    pub last_imported_hash: String,
    pub last_run_id: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableImportCommitReceipt {
    pub receipt_id: String,
    pub manifest_hash: String,
    pub topic_targets: Vec<DurableTopicBasis>,
    pub committed_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableImportCapture {
    #[serde(flatten)]
    pub bundle: DurableBundleCapture,
    pub index_revision: i64,
    pub sync_entities: Vec<DurableSyncEntity>,
    pub commit_receipt: Option<DurableImportCommitReceipt>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DurableImportApply {
    pub expected_aggregate_basis: Value,
    pub expected_index_revision: i64,
    pub receipt_id: String,
    pub manifest_hash: String,
    pub entries: Vec<DurableDraft>,
    pub facts: Vec<DurableSyncFact>,
    pub topic_targets: Vec<DurableTopicBasis>,
    #[serde(default)]
    pub run_id: String,
    pub now: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugRepositoryBasis {
    pub schema_version: String,
    pub revision: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugSchemaSummary {
    pub schema_version: String,
    pub aggregate_count: i64,
    pub diagnostics: Vec<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DebugProjection {
    pub basis: DebugRepositoryBasis,
    pub schema: DebugSchemaSummary,
    pub caches: Vec<CacheBasisRecord>,
    pub operations: Vec<OperationRecord>,
    pub topic_ids: Vec<String>,
}

fn as_value<T: Serialize>(value: &T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|_| "repository_projection_invalid".into())
}

fn stable_hash(value: &Value) -> Result<String, String> {
    let bytes =
        serde_json::to_vec(value).map_err(|_| "repository_projection_invalid".to_owned())?;
    Ok(format!("{:x}", Sha256::digest(bytes)))
}

fn text(row: &Value, key: &str) -> String {
    row.get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned()
}

fn integer(row: &Value, key: &str) -> i64 {
    row.get(key).and_then(Value::as_i64).unwrap_or_default()
}

fn camel_to_snake(value: &str) -> String {
    let mut result = String::new();
    for character in value.chars() {
        if character.is_ascii_uppercase() {
            result.push('_');
            result.push(character.to_ascii_lowercase());
        } else {
            result.push(character);
        }
    }
    result
}

fn draft(kind: &str, id: String, data: Value, updated_at: String) -> Result<DurableDraft, String> {
    if id.is_empty() {
        return Err("repository_durable_entity_id_invalid".into());
    }
    Ok(DurableDraft {
        entity_kind: kind.to_owned(),
        entity_id: id,
        schema_id: format!("synthesis.durable.{kind}"),
        data,
        updated_at,
    })
}

fn typed_drafts<T: Serialize>(
    kind: &str,
    rows: &[T],
    id: impl Fn(&Value) -> String,
) -> Result<Vec<DurableDraft>, String> {
    rows.iter()
        .map(|row| {
            let value = as_value(row)?;
            draft(kind, id(&value), value.clone(), text(&value, "updatedAt"))
        })
        .collect()
}

fn active_knowledge_bases(repository: &Repository) -> Result<KnowledgeCheckpointBases, String> {
    Ok(KnowledgeCheckpointBases {
        tag_revision: repository
            .get_tag_application_state()?
            .map(|state| state.vocabulary_hash),
        concept_manifest: repository
            .get_concept_application_state()?
            .map(|state| state.manifest_hash),
        topic_graph_manifest: repository
            .get_topic_graph_application_state()?
            .map(|state| state.manifest_hash),
    })
}

impl Repository {
    pub fn capture_knowledge_checkpoint_state(
        &mut self,
    ) -> Result<KnowledgeCheckpointCapture, String> {
        self.transaction(|repository| {
            let tag_state = repository
                .get_tag_application_state()?
                .unwrap_or_else(|| crate::TagApplicationStateRecord {
                    singleton_id: 1,
                    index_stale: 1,
                    ..crate::TagApplicationStateRecord::default()
                });
            let concept_state = repository
                .get_concept_application_state()?
                .unwrap_or_else(|| crate::ConceptApplicationStateRecord {
                    singleton_id: 1,
                    index_stale: 1,
                    ..crate::ConceptApplicationStateRecord::default()
                });
            let topic_state = repository
                .get_topic_graph_application_state()?
                .unwrap_or_else(|| crate::TopicGraphApplicationStateRecord {
                    singleton_id: 1,
                    index_stale: 1,
                    ..crate::TopicGraphApplicationStateRecord::default()
                });
            let mut protocols = repository.list_tag_protocols()?;
            if protocols.is_empty() {
                protocols.push(crate::TagProtocolRecord {
                    protocol_id: "default".into(),
                    version: "1.0.0".into(),
                    tag_pattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$".into(),
                    max_tag_length: 120,
                    facets_json: "[\"ai_task\",\"data\",\"field\",\"method\",\"model\",\"status\",\"tool\",\"topic\"]".into(),
                    updated_at: String::new(),
                });
            }
            Ok(KnowledgeCheckpointCapture {
                bases: KnowledgeCheckpointBases {
                    tag_revision: (!tag_state.vocabulary_hash.is_empty())
                        .then(|| tag_state.vocabulary_hash.clone()),
                    concept_manifest: (!concept_state.manifest_hash.is_empty())
                        .then(|| concept_state.manifest_hash.clone()),
                    topic_graph_manifest: (!topic_state.manifest_hash.is_empty())
                        .then(|| topic_state.manifest_hash.clone()),
                },
                payload: KnowledgeCheckpointPayload {
                    tag_vocabulary: TagVocabularyReplacement {
                        state: tag_state,
                        entries: repository.list_tag_vocabulary_entries()?,
                        aliases: repository.list_tag_aliases()?,
                        abbrevs: repository.list_tag_abbrevs()?,
                        protocols,
                        warnings: repository.list_tag_validation_warnings()?,
                    },
                    concept_kb: ConceptKbReplacement {
                        state: concept_state,
                        concepts: repository.list_concepts()?,
                        senses: repository.list_concept_senses()?,
                        aliases: repository.list_concept_aliases()?,
                        relations: repository.list_concept_relations()?,
                        reviews: repository.list_concept_reviews()?,
                        topic_links: repository.list_topic_concept_links()?,
                    },
                    topic_graph: TopicGraphReplacement {
                        state: topic_state,
                        nodes: repository.list_topic_graph_nodes()?,
                        edges: repository.list_topic_graph_edges()?,
                        reviews: repository.list_topic_graph_reviews()?,
                    },
                },
            })
        })
    }

    pub fn replace_knowledge_checkpoint_state(
        &mut self,
        replacement: &KnowledgeCheckpointReplacement,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            if active_knowledge_bases(repository)? != replacement.expected_bases {
                return Ok(false);
            }
            let mut tag = replacement.payload.tag_vocabulary.clone();
            let mut concept = replacement.payload.concept_kb.clone();
            let mut topic = replacement.payload.topic_graph.clone();
            tag.state.vocabulary_hash = replacement
                .next_bases
                .tag_revision
                .clone()
                .ok_or_else(|| "knowledge_checkpoint_basis_invalid".to_owned())?;
            concept.state.manifest_hash = replacement
                .next_bases
                .concept_manifest
                .clone()
                .ok_or_else(|| "knowledge_checkpoint_basis_invalid".to_owned())?;
            topic.state.manifest_hash = replacement
                .next_bases
                .topic_graph_manifest
                .clone()
                .ok_or_else(|| "knowledge_checkpoint_basis_invalid".to_owned())?;
            tag.state.index_stale = 1;
            concept.state.index_stale = 1;
            topic.state.index_stale = 1;
            if tag.state.index_json.is_empty() {
                tag.state.index_json = "{}".into();
            }
            if concept.state.index_json.is_empty() {
                concept.state.index_json = "{}".into();
            }
            if topic.state.index_json.is_empty() {
                topic.state.index_json = "{}".into();
            }
            concept.state.revision += 1;
            topic.state.revision += 1;
            tag.state.updated_at = replacement.now.clone();
            for protocol in &mut tag.protocols {
                if protocol.updated_at.is_empty() {
                    protocol.updated_at = replacement.now.clone();
                }
            }
            concept.state.updated_at = replacement.now.clone();
            topic.state.updated_at = replacement.now.clone();
            if !repository.replace_tag_vocabulary_state(
                replacement.expected_bases.tag_revision.as_deref(),
                &tag,
            )? {
                return Err("knowledge_checkpoint_tag_basis_changed".into());
            }
            if !repository.replace_concept_kb_application_state(
                replacement.expected_bases.concept_manifest.as_deref(),
                &concept,
            )? {
                return Err("knowledge_checkpoint_concept_basis_changed".into());
            }
            if !repository.replace_topic_graph_application_state(
                replacement.expected_bases.topic_graph_manifest.as_deref(),
                &topic,
            )? {
                return Err("knowledge_checkpoint_topic_graph_basis_changed".into());
            }
            Ok(true)
        })
    }

    pub fn capture_durable_bundle_state(&mut self) -> Result<DurableBundleCapture, String> {
        self.transaction(|repository| {
            let mut drafts = Vec::new();
            drafts.extend(typed_drafts(
                "concept",
                &repository.list_concepts()?,
                |row| text(row, "conceptId"),
            )?);
            drafts.extend(typed_drafts(
                "concept_sense",
                &repository.list_concept_senses()?,
                |row| text(row, "senseId"),
            )?);
            drafts.extend(typed_drafts(
                "concept_alias",
                &repository.list_concept_aliases()?,
                |row| text(row, "aliasId"),
            )?);
            drafts.extend(typed_drafts(
                "concept_relation",
                &repository.list_concept_relations()?,
                |row| text(row, "relationId"),
            )?);
            drafts.extend(typed_drafts(
                "concept_review_item",
                &repository.list_concept_reviews()?,
                |row| text(row, "reviewId"),
            )?);
            let links = repository.list_topic_concept_links()?;
            let mut by_topic = BTreeMap::<String, Vec<Value>>::new();
            for link in links {
                let value = as_value(&link)?;
                by_topic
                    .entry(text(&value, "topicId"))
                    .or_default()
                    .push(value);
            }
            for (topic_id, links) in by_topic {
                drafts.push(draft(
                    "topic_concept_links",
                    topic_id.clone(),
                    json!({"topicId":topic_id,"links":links}),
                    String::new(),
                )?);
            }
            drafts.extend(typed_drafts(
                "topic_graph_node",
                &repository.list_topic_graph_nodes()?,
                |row| text(row, "topicId"),
            )?);
            drafts.extend(typed_drafts(
                "topic_graph_edge",
                &repository.list_topic_graph_edges()?,
                |row| text(row, "edgeId"),
            )?);
            drafts.extend(typed_drafts(
                "topic_graph_review_item",
                &repository.list_topic_graph_reviews()?,
                |row| text(row, "reviewId"),
            )?);
            drafts.extend(typed_drafts(
                "canonical_reference",
                &repository.list_canonical_references()?,
                |row| text(row, "canonicalReferenceId"),
            )?);
            drafts.extend(typed_drafts(
                "canonical_reference_redirect",
                &repository.list_reference_redirects()?,
                |row| text(row, "fromCanonicalReferenceId"),
            )?);
            drafts.extend(typed_drafts(
                "reference_binding",
                &repository.list_reference_bindings()?,
                |row| text(row, "bindingId"),
            )?);
            let mut proposals = Vec::new();
            let mut proposal_offset = 0;
            loop {
                let (page, has_more) =
                    repository.list_reference_match_proposals(proposal_offset, 100)?;
                proposal_offset += page.len();
                proposals.extend(page);
                if !has_more {
                    break;
                }
            }
            drafts.extend(typed_drafts(
                "reference_match_proposal",
                &proposals,
                |row| text(row, "proposalId"),
            )?);
            for row in repository.query(
                "SELECT * FROM synt_review_item ORDER BY review_item_id",
                &[],
            )? {
                drafts.push(draft(
                    "review_item",
                    text(&row, "review_item_id"),
                    row.clone(),
                    text(&row, "updated_at"),
                )?);
            }
            let tag_entries = repository.list_tag_vocabulary_entries()?;
            if !tag_entries.is_empty() {
                drafts.push(draft(
                    "tag_vocabulary",
                    "tag-vocabulary".into(),
                    json!({"entries":tag_entries}),
                    String::new(),
                )?);
            }
            let tag_aliases = repository.list_tag_aliases()?;
            if !tag_aliases.is_empty() {
                drafts.push(draft(
                    "tag_aliases",
                    "tag-aliases".into(),
                    json!({"aliases":tag_aliases}),
                    String::new(),
                )?);
            }
            let tag_abbrevs = repository.list_tag_abbrevs()?;
            if !tag_abbrevs.is_empty() {
                drafts.push(draft(
                    "tag_abbrev",
                    "tag-abbrev".into(),
                    json!({"abbrev":tag_abbrevs}),
                    String::new(),
                )?);
            }
            for protocol in repository.list_tag_protocols()? {
                let value = as_value(&protocol)?;
                drafts.push(draft(
                    "tag_protocol",
                    "tag-protocol".into(),
                    value.clone(),
                    text(&value, "updatedAt"),
                )?);
            }
            for (table, kind, id_key) in [
                (
                    "synt_topic_interest_metadata",
                    "topic_interest_metadata",
                    "topic_id",
                ),
                (
                    "synt_topic_discovery_hint",
                    "topic_discovery_hint",
                    "hint_id",
                ),
                (
                    "synt_related_items_sync_effect",
                    "related_items_sync_effect",
                    "effect_id",
                ),
            ] {
                for row in repository.query(&format!("SELECT * FROM {table}"), &[])? {
                    let payload = text(&row, "payload_json");
                    let data = serde_json::from_str(&payload)
                        .map_err(|_| "repository_durable_payload_invalid".to_owned())?;
                    drafts.push(draft(
                        kind,
                        text(&row, id_key),
                        data,
                        text(&row, "updated_at"),
                    )?);
                }
            }
            let mut topic_bases = Vec::new();
            let mut offset = 0;
            loop {
                let (states, total) = repository.list_topic_application_states(offset, 250)?;
                for state in states {
                    topic_bases.push(DurableTopicBasis {
                        topic_id: state.topic_id,
                        path_id: state.path_id,
                        manifest_hash: state.manifest_hash,
                        artifact_hash: state.artifact_hash,
                        metadata_hash: state.metadata_hash,
                        bundle_hash: state.bundle_hash,
                    });
                }
                offset = topic_bases.len();
                if offset >= total {
                    break;
                }
            }
            drafts.sort_by(|left, right| {
                (&left.entity_kind, &left.entity_id).cmp(&(&right.entity_kind, &right.entity_id))
            });
            topic_bases.sort_by(|left, right| {
                (&left.topic_id, &left.path_id).cmp(&(&right.topic_id, &right.path_id))
            });
            let aggregate_basis = json!({"topicBases":topic_bases,"drafts":drafts});
            Ok(DurableBundleCapture {
                aggregate_basis,
                topic_bases,
                drafts,
            })
        })
    }

    pub fn capture_durable_import_state(&mut self) -> Result<DurableImportCapture, String> {
        self.transaction(|repository| {
            let bundle = repository.capture_durable_bundle_state()?;
            let revision = repository
                .query(
                    "SELECT revision FROM synt_durable_sync_state WHERE singleton_id=1",
                    &[],
                )?
                .first()
                .map(|row| integer(row, "revision"))
                .unwrap_or_default();
            let sync_entities = repository
                .query(
                    "SELECT * FROM synt_durable_sync_entity ORDER BY entity_key",
                    &[],
                )?
                .into_iter()
                .map(|row| DurableSyncEntity {
                    entity_key: text(&row, "entity_key"),
                    entity_kind: text(&row, "entity_kind"),
                    entity_id: text(&row, "entity_id"),
                    path: text(&row, "path"),
                    last_synced_hash: text(&row, "last_synced_hash"),
                    last_exported_hash: text(&row, "last_exported_hash"),
                    last_imported_hash: text(&row, "last_imported_hash"),
                    last_run_id: text(&row, "last_run_id"),
                    updated_at: text(&row, "updated_at"),
                })
                .collect();
            let commit_receipt = repository
                .query(
                    "SELECT * FROM synt_durable_import_commit WHERE singleton_id=1",
                    &[],
                )?
                .into_iter()
                .next()
                .map(|row| {
                    let topic_targets = serde_json::from_str(&text(&row, "topic_targets_json"))
                        .map_err(|_| "durable_import_commit_receipt_invalid".to_owned())?;
                    Ok::<DurableImportCommitReceipt, String>(DurableImportCommitReceipt {
                        receipt_id: text(&row, "receipt_id"),
                        manifest_hash: text(&row, "manifest_hash"),
                        topic_targets,
                        committed_at: text(&row, "committed_at"),
                    })
                })
                .transpose()?;
            Ok(DurableImportCapture {
                bundle,
                index_revision: revision,
                sync_entities,
                commit_receipt,
            })
        })
    }

    pub fn apply_durable_import_state(
        &mut self,
        request: &DurableImportApply,
    ) -> Result<bool, String> {
        if request.receipt_id.is_empty()
            || request.manifest_hash.is_empty()
            || request.now.is_empty()
        {
            return Err("durable_import_apply_invalid".into());
        }
        self.transaction(|repository| {
            let current = repository.capture_durable_import_state()?;
            if current.bundle.aggregate_basis != request.expected_aggregate_basis
                || current.index_revision != request.expected_index_revision
            {
                return Ok(false);
            }
            for entry in &request.entries {
                apply_durable_entry(repository, entry)?;
            }
            let repair_operation_id = format!(
                "canonical-redirect-repair:import:{:x}",
                Sha256::digest(request.receipt_id.as_bytes())
            );
            repository.normalize_imported_reference_redirect_graph(
                &repair_operation_id,
                &request.receipt_id,
                &request.now,
            )?;
            update_domain_bases(
                repository,
                &request.manifest_hash,
                &request.topic_targets,
                &request.now,
            )?;
            let mut facts = BTreeMap::new();
            for fact in &request.facts {
                if fact.entity_kind != "tombstone" {
                    facts.insert(format!("{}:{}", fact.entity_kind, fact.entity_id), fact);
                }
            }
            for (key, fact) in facts {
                repository.execute(
                    "INSERT OR REPLACE INTO synt_durable_sync_entity(
                       entity_key,entity_kind,entity_id,path,last_synced_hash,last_exported_hash,
                       last_imported_hash,last_run_id,updated_at
                     ) VALUES(?1,?2,?3,?4,?5,
                       COALESCE((SELECT last_exported_hash FROM synt_durable_sync_entity WHERE entity_key=?1),''),
                       ?5,?6,?7)",
                    &[
                        json!(key),
                        json!(fact.entity_kind),
                        json!(fact.entity_id),
                        json!(fact.path),
                        json!(fact.hash),
                        json!(request.run_id),
                        json!(request.now),
                    ],
                )?;
            }
            repository.execute(
                "UPDATE synt_durable_sync_state SET revision=?1,updated_at=?2 WHERE singleton_id=1",
                &[
                    json!(current.index_revision + 1),
                    json!(request.now),
                ],
            )?;
            repository.execute(
                "INSERT OR REPLACE INTO synt_durable_import_commit(
                   singleton_id,receipt_id,manifest_hash,topic_targets_json,committed_at
                 ) VALUES(1,?1,?2,?3,?4)",
                &[
                    json!(request.receipt_id),
                    json!(request.manifest_hash),
                    as_value(&request.topic_targets)?,
                    json!(request.now),
                ],
            )?;
            Ok(true)
        })
    }

    pub fn clear_durable_import_commit(&self, receipt_id: &str) -> Result<bool, String> {
        Ok(self.execute(
            "DELETE FROM synt_durable_import_commit WHERE singleton_id=1 AND receipt_id=?1",
            &[json!(receipt_id)],
        )? > 0)
    }

    pub fn capture_debug_projection(&mut self) -> Result<DebugProjection, String> {
        self.transaction(|repository| {
            let table_snapshot = repository.table_snapshot()?;
            let caches = repository
                .query("SELECT * FROM synt_cache_basis ORDER BY cache_key", &[])?
                .into_iter()
                .map(cache_record)
                .collect::<Result<Vec<_>, _>>()?;
            let operations = repository.list_operations(&OperationQuery {
                include_completed: true,
                limit: 1_000,
                ..OperationQuery::default()
            })?;
            let mut topic_ids = Vec::new();
            let mut offset = 0;
            loop {
                let (states, total) = repository.list_topic_application_states(offset, 250)?;
                topic_ids.extend(states.into_iter().map(|state| state.topic_id));
                offset = topic_ids.len();
                if offset >= total {
                    break;
                }
            }
            topic_ids.sort();
            topic_ids.dedup();
            let schema_version = repository
                .query(
                    "SELECT value FROM synt_schema_meta WHERE key='repository_foundation_schema_version'",
                    &[],
                )?
                .first()
                .map(|row| text(row, "value"))
                .unwrap_or_default();
            let revision = stable_hash(&json!({
                "tables":table_snapshot,
                "caches":caches,
                "operations":operations,
            }))?;
            Ok(DebugProjection {
                basis: DebugRepositoryBasis {
                    schema_version: schema_version.clone(),
                    revision,
                },
                schema: DebugSchemaSummary {
                    schema_version,
                    aggregate_count: 10,
                    diagnostics: Vec::new(),
                },
                caches,
                operations,
                topic_ids,
            })
        })
    }
}

fn cache_record(row: Value) -> Result<CacheBasisRecord, String> {
    Ok(CacheBasisRecord {
        cache_key: text(&row, "cache_key"),
        cache_kind: text(&row, "cache_kind"),
        scope_kind: text(&row, "scope_kind"),
        scope_ref: text(&row, "scope_ref"),
        status: text(&row, "status"),
        basis_kind: text(&row, "basis_kind"),
        basis_value: text(&row, "basis_value"),
        source_hash: text(&row, "source_hash"),
        policy_version: text(&row, "policy_version"),
        active_operation_id: text(&row, "active_operation_id"),
        refreshed_at: text(&row, "refreshed_at"),
        stale_reason: text(&row, "stale_reason"),
        diagnostics_json: text(&row, "diagnostics_json"),
        updated_at: text(&row, "updated_at"),
    })
}

fn table_columns(repository: &Repository, table: &str) -> Result<BTreeSet<String>, String> {
    Ok(repository
        .query(&format!("PRAGMA table_info({table})"), &[])?
        .into_iter()
        .map(|row| text(&row, "name"))
        .collect())
}

fn upsert_object(repository: &Repository, table: &str, value: &Value) -> Result<(), String> {
    let object = value
        .as_object()
        .ok_or_else(|| "durable_import_payload_invalid".to_owned())?;
    let available = table_columns(repository, table)?;
    let fields = object
        .iter()
        .map(|(key, value)| (camel_to_snake(key), value.clone()))
        .filter(|(key, _)| available.contains(key))
        .collect::<Vec<_>>();
    if fields.is_empty() {
        return Err("durable_import_payload_invalid".into());
    }
    let columns = fields
        .iter()
        .map(|(key, _)| key.as_str())
        .collect::<Vec<_>>()
        .join(",");
    let placeholders = (1..=fields.len())
        .map(|index| format!("?{index}"))
        .collect::<Vec<_>>()
        .join(",");
    let values = fields
        .into_iter()
        .map(|(_, value)| value)
        .collect::<Vec<_>>();
    repository.execute(
        &format!("INSERT OR REPLACE INTO {table} ({columns}) VALUES({placeholders})"),
        &values,
    )?;
    Ok(())
}

fn replace_aggregate(
    repository: &Repository,
    table: &str,
    field: &str,
    data: &Value,
) -> Result<(), String> {
    let rows = data
        .get(field)
        .and_then(Value::as_array)
        .ok_or_else(|| "durable_import_payload_invalid".to_owned())?;
    repository.execute(&format!("DELETE FROM {table}"), &[])?;
    rows.iter()
        .try_for_each(|row| upsert_object(repository, table, row))
}

fn apply_durable_entry(repository: &Repository, entry: &DurableDraft) -> Result<(), String> {
    if entry.entity_kind == "topic_current_asset" {
        return Ok(());
    }
    match entry.entity_kind.as_str() {
        "topic_interest_metadata" => {
            repository.execute(
                "INSERT OR REPLACE INTO synt_topic_interest_metadata(topic_id,payload_json,updated_at)
                 VALUES(?1,?2,?3)",
                &[
                    json!(entry.entity_id),
                    json!(serde_json::to_string(&entry.data)
                        .map_err(|_| "durable_import_payload_invalid".to_owned())?),
                    json!(entry.updated_at),
                ],
            )?;
            return Ok(());
        }
        "topic_discovery_hint" => {
            repository.execute(
                "INSERT OR REPLACE INTO synt_topic_discovery_hint(hint_id,payload_json,updated_at)
                 VALUES(?1,?2,?3)",
                &[
                    json!(entry.entity_id),
                    json!(
                        serde_json::to_string(&entry.data)
                            .map_err(|_| "durable_import_payload_invalid".to_owned())?
                    ),
                    json!(entry.updated_at),
                ],
            )?;
            return Ok(());
        }
        "related_items_sync_effect" => {
            repository.execute(
                "INSERT OR REPLACE INTO synt_related_items_sync_effect(effect_id,payload_json,updated_at)
                 VALUES(?1,?2,?3)",
                &[
                    json!(entry.entity_id),
                    json!(serde_json::to_string(&entry.data)
                        .map_err(|_| "durable_import_payload_invalid".to_owned())?),
                    json!(entry.updated_at),
                ],
            )?;
            return Ok(());
        }
        "topic_concept_links" => {
            repository.execute(
                "DELETE FROM synt_topic_concept_link WHERE topic_id=?1",
                &[json!(entry.entity_id)],
            )?;
            for row in entry
                .data
                .get("links")
                .and_then(Value::as_array)
                .ok_or_else(|| "durable_import_payload_invalid".to_owned())?
            {
                upsert_object(repository, "synt_topic_concept_link", row)?;
            }
            return Ok(());
        }
        "tag_vocabulary" => {
            return replace_aggregate(
                repository,
                "synt_tag_vocabulary_entry",
                "entries",
                &entry.data,
            );
        }
        "tag_aliases" => {
            return replace_aggregate(repository, "synt_tag_alias", "aliases", &entry.data);
        }
        "tag_abbrev" => {
            return replace_aggregate(repository, "synt_tag_abbrev", "abbrev", &entry.data);
        }
        _ => {}
    }
    let table = match entry.entity_kind.as_str() {
        "concept" => "synt_concept",
        "concept_sense" => "synt_concept_sense",
        "concept_alias" => "synt_concept_alias",
        "concept_relation" => "synt_concept_relation",
        "concept_review_item" => "synt_concept_review_item",
        "topic_graph_node" => "synt_topic_graph_node",
        "topic_graph_edge" => "synt_topic_graph_edge",
        "topic_graph_review_item" => "synt_topic_graph_review_item",
        "canonical_reference" => "synt_reference_canonical",
        "canonical_reference_redirect" => "synt_reference_redirect",
        "reference_binding" => "synt_reference_binding",
        "reference_match_proposal" => "synt_reference_match_proposal",
        "review_item" => "synt_review_item",
        "tag_protocol" => "synt_tag_protocol",
        "tombstone" => return Err("tombstone_apply_unsupported".into()),
        _ => return Err("durable_import_entity_kind_unsupported".into()),
    };
    upsert_object(repository, table, &entry.data)
}

fn update_domain_bases(
    repository: &Repository,
    manifest_hash: &str,
    topic_targets: &[DurableTopicBasis],
    now: &str,
) -> Result<(), String> {
    repository.execute(
        "UPDATE synt_concept_application_state SET manifest_hash=?1,index_stale=1,updated_at=?2 WHERE singleton_id=1",
        &[json!(manifest_hash), json!(now)],
    )?;
    repository.execute(
        "UPDATE synt_topic_graph_application_state SET manifest_hash=?1,index_stale=1,updated_at=?2 WHERE singleton_id=1",
        &[json!(manifest_hash), json!(now)],
    )?;
    repository.execute(
        "UPDATE synt_tag_application_state SET vocabulary_hash=?1,index_stale=1,updated_at=?2 WHERE singleton_id=1",
        &[json!(manifest_hash), json!(now)],
    )?;
    repository.execute(
        "UPDATE synt_reference_application_state SET reference_hash=?1,graph_ready=0,related_items_ready=0,updated_at=?2 WHERE singleton_id=1",
        &[json!(manifest_hash), json!(now)],
    )?;
    for target in topic_targets {
        let existing = repository
            .query(
                "SELECT * FROM synt_topic_application_state WHERE topic_id=?1",
                &[json!(&target.topic_id)],
            )?
            .into_iter()
            .next()
            .unwrap_or(Value::Null);
        let value_or = |field: &str, fallback: &str| {
            let value = text(&existing, field);
            if value.is_empty() {
                fallback.to_owned()
            } else {
                value
            }
        };
        repository.execute(
            "INSERT OR REPLACE INTO synt_topic_application_state(
               topic_id,path_id,title,definition,language,operation,manifest_hash,
               artifact_hash,metadata_hash,bundle_hash,paper_count,
               topic_definition_json,topic_resolver_json,resolved_paper_set_json,
               created_at,updated_at
             ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)",
            &[
                json!(target.topic_id),
                json!(target.path_id),
                json!(text(&existing, "title")),
                json!(text(&existing, "definition")),
                json!(value_or("language", "auto")),
                json!(value_or("operation", "durable_import")),
                json!(target.manifest_hash),
                json!(target.artifact_hash),
                json!(target.metadata_hash),
                json!(target.bundle_hash),
                json!(integer(&existing, "paper_count")),
                json!(value_or("topic_definition_json", "{}")),
                json!(value_or("topic_resolver_json", "{}")),
                json!(value_or("resolved_paper_set_json", "{}")),
                json!(value_or("created_at", now)),
                json!(now),
            ],
        )?;
    }
    repository.execute(
        "UPDATE synt_cache_basis SET status='stale',stale_reason='durable_sync_import',updated_at=?1",
        &[json!(now)],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::RepositoryIdentity;
    use std::fs;
    use synthesis_test_support::TestRoot;

    fn root(label: &str) -> TestRoot {
        TestRoot::new(&format!("synthesis-final-r7-repository-{label}"))
    }

    #[test]
    fn durable_capture_and_debug_projection_are_typed_and_reopenable() {
        let root = root("capture");
        let identity = RepositoryIdentity {
            profile_id: "profile-final-r7".into(),
            data_root_id: "data-final-r7".into(),
        };
        let mut repository = Repository::open(&root, identity.clone()).expect("open");
        let durable = repository
            .capture_durable_import_state()
            .expect("durable capture");
        assert_eq!(durable.index_revision, 0);
        let debug = repository
            .capture_debug_projection()
            .expect("debug projection");
        assert_eq!(debug.schema.aggregate_count, 10);
        repository.close().expect("close");
        let mut reopened = Repository::open(&root, identity).expect("reopen");
        assert_eq!(
            reopened
                .capture_durable_import_state()
                .expect("reopen capture")
                .index_revision,
            0
        );
        reopened.close().expect("close reopened");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn durable_import_basis_loss_does_not_write_receipt() {
        let root = root("cas");
        let identity = RepositoryIdentity {
            profile_id: "profile-final-r7-cas".into(),
            data_root_id: "data-final-r7-cas".into(),
        };
        let mut repository = Repository::open(&root, identity).expect("open");
        let committed = repository
            .apply_durable_import_state(&DurableImportApply {
                expected_aggregate_basis: json!({"stale":true}),
                expected_index_revision: 0,
                receipt_id: "receipt-final-r7".into(),
                manifest_hash: format!("sha256:{}", "a".repeat(64)),
                entries: Vec::new(),
                facts: Vec::new(),
                topic_targets: Vec::new(),
                run_id: String::new(),
                now: "2026-07-26T00:00:00.000Z".into(),
            })
            .expect("apply");
        assert!(!committed);
        assert!(
            repository
                .query("SELECT * FROM synt_durable_import_commit", &[])
                .expect("receipts")
                .is_empty()
        );
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn durable_import_repairs_redirect_cycles_before_commit() {
        let root = root("redirect-cycle");
        let identity = RepositoryIdentity {
            profile_id: "profile-final-r7-redirect-cycle".into(),
            data_root_id: "data-final-r7-redirect-cycle".into(),
        };
        let mut repository = Repository::open(&root, identity).expect("open");
        let captured = repository.capture_durable_import_state().expect("capture");
        let now = "2026-08-10T00:00:00.000Z";
        let redirect = |source: &str, target: &str| DurableDraft {
            entity_kind: "canonical_reference_redirect".into(),
            entity_id: source.into(),
            schema_id: "synthesis-reference-redirect.v1".into(),
            data: json!({
                "from_canonical_reference_id": source,
                "to_canonical_reference_id": target,
                "reason": "reference_matching",
                "diagnostics_json": "[]",
                "created_at": now,
                "updated_at": now,
            }),
            updated_at: now.into(),
        };
        let reverse_audit = DurableDraft {
            entity_kind: "reference_match_proposal".into(),
            entity_id: "proposal:reverse".into(),
            schema_id: "synthesis-reference-match-proposal.v1".into(),
            data: json!({
                "proposal_id": "proposal:reverse",
                "kind": "canonical_merge",
                "status": "accepted",
                "source_canonical_reference_id": "canonical:b",
                "source_raw_reference_ids_json": "[]",
                "target_canonical_reference_id": "canonical:a",
                "target_library_id": 0,
                "target_item_key": "",
                "confidence": "manual",
                "score": 1.0,
                "reasons_json": "[\"reverse_accept\"]",
                "evidence_json": "[]",
                "diagnostics_json": "[]",
                "basis_hash": "basis:reverse",
                "source_hash": "source:reverse",
                "created_at": now,
                "updated_at": now,
            }),
            updated_at: now.into(),
        };
        assert!(
            repository
                .apply_durable_import_state(&DurableImportApply {
                    expected_aggregate_basis: captured.bundle.aggregate_basis,
                    expected_index_revision: captured.index_revision,
                    receipt_id: "receipt-final-r7-redirect-cycle".into(),
                    manifest_hash: format!("sha256:{}", "a".repeat(64)),
                    entries: vec![
                        redirect("canonical:a", "canonical:b"),
                        redirect("canonical:b", "canonical:a"),
                        reverse_audit,
                    ],
                    facts: Vec::new(),
                    topic_targets: Vec::new(),
                    run_id: "run:redirect-cycle".into(),
                    now: now.into(),
                })
                .expect("apply")
        );
        let redirects = repository.list_reference_redirects().expect("redirects");
        let graph = crate::ReferenceRedirectGraph::from_records(&redirects).expect("graph");
        assert!(graph.validate_acyclic().is_ok());
        assert_eq!(graph.resolve("canonical:a").unwrap(), "canonical:a");
        assert_eq!(graph.resolve("canonical:b").unwrap(), "canonical:a");
        assert_eq!(graph.target("canonical:a"), None);
        assert_eq!(graph.target("canonical:b"), Some("canonical:a"));
        assert!(
            repository
                .list_operations(&OperationQuery {
                    operation_types: vec!["canonical_redirect_repair".into()],
                    include_completed: true,
                    limit: 10,
                    ..OperationQuery::default()
                })
                .expect("repair receipt")
                .iter()
                .any(|operation| operation.basis_value == "receipt-final-r7-redirect-cycle")
        );
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn durable_import_creates_a_missing_topic_application_row() {
        let root = root("topic-upsert");
        let identity = RepositoryIdentity {
            profile_id: "profile-final-r7-topic".into(),
            data_root_id: "data-final-r7-topic".into(),
        };
        let mut repository = Repository::open(&root, identity).expect("open");
        let captured = repository.capture_durable_import_state().expect("capture");
        let target = DurableTopicBasis {
            topic_id: "topic:imported".into(),
            path_id: "topic-imported".into(),
            manifest_hash: format!("sha256:{}", "1".repeat(64)),
            artifact_hash: format!("sha256:{}", "2".repeat(64)),
            metadata_hash: format!("sha256:{}", "3".repeat(64)),
            bundle_hash: format!("sha256:{}", "4".repeat(64)),
        };
        assert!(
            repository
                .apply_durable_import_state(&DurableImportApply {
                    expected_aggregate_basis: captured.bundle.aggregate_basis,
                    expected_index_revision: captured.index_revision,
                    receipt_id: "receipt-final-r7-topic".into(),
                    manifest_hash: format!("sha256:{}", "a".repeat(64)),
                    entries: Vec::new(),
                    facts: vec![DurableSyncFact {
                        entity_kind: "tag_protocol".into(),
                        entity_id: "tag-protocol".into(),
                        path: "bundles/tags.json".into(),
                        hash: format!("sha256:{}", "5".repeat(64)),
                    }],
                    topic_targets: vec![target.clone()],
                    run_id: String::new(),
                    now: "2026-07-26T00:00:00.000Z".into(),
                })
                .expect("apply")
        );
        let rows = repository
            .query(
                "SELECT * FROM synt_topic_application_state WHERE topic_id=?1",
                &[json!(&target.topic_id)],
            )
            .expect("topic row");
        assert_eq!(rows.len(), 1);
        assert_eq!(text(&rows[0], "path_id"), target.path_id);
        assert_eq!(text(&rows[0], "language"), "auto");
        let sync_rows = repository
            .query("SELECT * FROM synt_durable_sync_entity", &[])
            .expect("sync rows");
        assert_eq!(
            text(&sync_rows[0], "entity_key"),
            "tag_protocol:tag-protocol"
        );
        repository.close().expect("close");
        fs::remove_dir_all(root).expect("cleanup");
    }
}
