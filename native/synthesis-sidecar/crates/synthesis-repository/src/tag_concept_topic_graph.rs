use crate::Repository;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagApplicationStateRecord {
    pub singleton_id: i64,
    pub vocabulary_hash: String,
    pub staged_revision: i64,
    pub index_hash: String,
    pub index_basis_hash: String,
    pub index_json: String,
    pub index_stale: i64,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagVocabularyEntryRecord {
    pub tag: String,
    pub facet: String,
    pub note: String,
    pub source: String,
    pub deprecated: i64,
    pub replacement: String,
    pub aliases_json: String,
    pub abbrev_json: String,
    pub usage_count: i64,
    pub last_synced_at: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAliasRecord {
    pub alias: String,
    pub tag: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAbbrevRecord {
    pub abbrev_key: String,
    pub abbrev_value: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagProtocolRecord {
    pub protocol_id: String,
    pub version: String,
    pub tag_pattern: String,
    pub max_tag_length: i64,
    pub facets_json: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagValidationWarningRecord {
    pub warning_id: String,
    pub code: String,
    pub severity: String,
    pub tag: String,
    pub message: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagStagedSuggestionRecord {
    pub tag: String,
    pub facet: String,
    pub note: String,
    pub source_flow: String,
    pub parent_bindings_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagAuditRecord {
    pub library_id: i64,
    pub item_key: String,
    pub needs_tag_regulation: i64,
    pub non_compliant_tags_json: String,
    pub audited_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagEffectRecord {
    pub effect_id: String,
    pub vocabulary_hash: String,
    pub staged_revision: i64,
    pub library_id: i64,
    pub item_key: String,
    pub tag: String,
    pub status: String,
    pub occurred_at: String,
    pub diagnostics_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagVocabularyReplacement {
    pub state: TagApplicationStateRecord,
    #[serde(default)]
    pub entries: Vec<TagVocabularyEntryRecord>,
    #[serde(default)]
    pub aliases: Vec<TagAliasRecord>,
    #[serde(default)]
    pub abbrevs: Vec<TagAbbrevRecord>,
    #[serde(default)]
    pub protocols: Vec<TagProtocolRecord>,
    #[serde(default)]
    pub warnings: Vec<TagValidationWarningRecord>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TagVocabularyPromotion {
    pub replacement: TagVocabularyReplacement,
    #[serde(default)]
    pub staged: Vec<TagStagedSuggestionRecord>,
    #[serde(default)]
    pub effects: Vec<TagEffectRecord>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptApplicationStateRecord {
    pub singleton_id: i64,
    pub manifest_hash: String,
    pub revision: i64,
    pub index_hash: String,
    pub index_basis_hash: String,
    pub index_json: String,
    pub index_stale: i64,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptRecord {
    pub concept_id: String,
    pub label: String,
    pub aliases_json: String,
    pub concept_type: String,
    pub domain: String,
    pub status: String,
    pub short_definition: String,
    pub definition: String,
    pub usage_note: String,
    pub editorial_note: String,
    pub sense_ids_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptSenseRecord {
    pub sense_id: String,
    pub concept_id: String,
    pub label: String,
    pub aliases_json: String,
    pub domain: String,
    pub short_definition: String,
    pub definition: String,
    pub disambiguation: String,
    pub topic_relevance: String,
    pub confidence: String,
    pub source_topic_ids_json: String,
    pub evidence_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptAliasRecord {
    pub alias_id: String,
    pub alias: String,
    pub normalized: String,
    pub concept_id: String,
    pub sense_id: String,
    pub status: String,
    pub confidence: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptRelationRecord {
    pub relation_id: String,
    pub source_concept_id: String,
    pub target_concept_id: String,
    pub relation: String,
    pub status: String,
    pub confidence: String,
    pub provenance_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptReviewItemRecord {
    pub review_id: String,
    pub status: String,
    pub reason: String,
    pub topic_id: String,
    pub topic_path_id: String,
    pub label: String,
    pub confidence: String,
    pub candidate_concept_ids_json: String,
    pub proposal_json: String,
    pub target_concept_id: String,
    pub created_at: String,
    pub updated_at: String,
    pub resolved_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicConceptLinkRecord {
    pub topic_id: String,
    pub concept_id: String,
    pub sense_id: String,
    pub label: String,
    pub relevance: String,
    pub confidence: String,
    pub source: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConceptKbReplacement {
    pub state: ConceptApplicationStateRecord,
    #[serde(default)]
    pub concepts: Vec<ConceptRecord>,
    #[serde(default)]
    pub senses: Vec<ConceptSenseRecord>,
    #[serde(default)]
    pub aliases: Vec<ConceptAliasRecord>,
    #[serde(default)]
    pub relations: Vec<ConceptRelationRecord>,
    #[serde(default)]
    pub reviews: Vec<ConceptReviewItemRecord>,
    #[serde(default)]
    pub topic_links: Vec<TopicConceptLinkRecord>,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphApplicationStateRecord {
    pub singleton_id: i64,
    pub manifest_hash: String,
    pub revision: i64,
    pub index_hash: String,
    pub index_basis_hash: String,
    pub index_json: String,
    pub index_stale: i64,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphNodeRecord {
    pub topic_id: String,
    pub title: String,
    pub definition: String,
    pub aliases_json: String,
    pub node_type: String,
    pub definition_status: String,
    pub current_artifact_path: String,
    pub is_root: i64,
    pub level: String,
    pub paper_count: i64,
    pub last_synthesis_at: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphEdgeRecord {
    pub edge_id: String,
    pub source_topic_id: String,
    pub target_topic_id: String,
    pub relation: String,
    pub status: String,
    pub confidence: Option<f64>,
    pub provenance_json: String,
    pub evidence_refs_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphReviewItemRecord {
    pub review_id: String,
    pub status: String,
    pub source_topic_id: String,
    pub target_topic_id: String,
    pub target_title: String,
    pub relation: String,
    pub confidence: Option<f64>,
    pub provenance_json: String,
    pub evidence_refs_json: String,
    pub created_at: String,
    pub updated_at: String,
    pub resolved_at: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TopicGraphReplacement {
    pub state: TopicGraphApplicationStateRecord,
    #[serde(default)]
    pub nodes: Vec<TopicGraphNodeRecord>,
    #[serde(default)]
    pub edges: Vec<TopicGraphEdgeRecord>,
    #[serde(default)]
    pub reviews: Vec<TopicGraphReviewItemRecord>,
}

impl Repository {
    pub fn update_topic_discovery_hint_status(
        &mut self,
        hint_id: &str,
        status: &str,
        updated_at: &str,
    ) -> Result<Option<Value>, String> {
        if hint_id.is_empty() || !matches!(status, "open" | "rejected") {
            return Err("invalid_request".into());
        }
        self.transaction(|repository| {
            let row = repository
                .query(
                    "SELECT payload_json FROM synt_topic_discovery_hint WHERE hint_id=?1",
                    &[json!(hint_id)],
                )?
                .into_iter()
                .next();
            let Some(row) = row else {
                return Ok(None);
            };
            let payload_json = row
                .get("payload_json")
                .and_then(Value::as_str)
                .ok_or_else(|| "topic_discovery_hint_invalid".to_owned())?;
            let mut payload: Value = serde_json::from_str(payload_json)
                .map_err(|_| "topic_discovery_hint_invalid".to_owned())?;
            let object = payload
                .as_object_mut()
                .ok_or_else(|| "topic_discovery_hint_invalid".to_owned())?;
            object.insert("status".into(), json!(status));
            object.insert("updated_at".into(), json!(updated_at));
            repository.execute(
                "UPDATE synt_topic_discovery_hint SET payload_json=?1,updated_at=?2 WHERE hint_id=?3",
                &[
                    json!(serde_json::to_string(&payload)
                        .map_err(|_| "topic_discovery_hint_invalid".to_owned())?),
                    json!(updated_at),
                    json!(hint_id),
                ],
            )?;
            Ok(Some(payload))
        })
    }

    pub fn get_tag_application_state(&self) -> Result<Option<TagApplicationStateRecord>, String> {
        one(
            self,
            "SELECT * FROM synt_tag_application_state WHERE singleton_id=1",
        )
    }

    pub fn list_tag_vocabulary_entries(&self) -> Result<Vec<TagVocabularyEntryRecord>, String> {
        many(self, "SELECT * FROM synt_tag_vocabulary_entry ORDER BY tag")
    }

    pub fn list_tag_aliases(&self) -> Result<Vec<TagAliasRecord>, String> {
        many(self, "SELECT * FROM synt_tag_alias ORDER BY alias")
    }

    pub fn list_tag_abbrevs(&self) -> Result<Vec<TagAbbrevRecord>, String> {
        many(self, "SELECT * FROM synt_tag_abbrev ORDER BY abbrev_key")
    }

    pub fn list_tag_protocols(&self) -> Result<Vec<TagProtocolRecord>, String> {
        many(self, "SELECT * FROM synt_tag_protocol ORDER BY protocol_id")
    }

    pub fn list_tag_validation_warnings(&self) -> Result<Vec<TagValidationWarningRecord>, String> {
        many(
            self,
            "SELECT * FROM synt_tag_validation_warning ORDER BY warning_id",
        )
    }

    pub fn list_tag_staged_suggestions(&self) -> Result<Vec<TagStagedSuggestionRecord>, String> {
        many(
            self,
            "SELECT * FROM synt_tag_staged_suggestion ORDER BY updated_at DESC,tag",
        )
    }

    pub fn list_tag_audits(&self) -> Result<Vec<TagAuditRecord>, String> {
        many(
            self,
            "SELECT * FROM synt_tag_audit ORDER BY library_id,item_key",
        )
    }

    pub fn list_tag_effects(&self) -> Result<Vec<TagEffectRecord>, String> {
        many(self, "SELECT * FROM synt_tag_effect ORDER BY effect_id")
    }

    pub fn replace_tag_vocabulary_state(
        &mut self,
        expected_vocabulary_hash: Option<&str>,
        replacement: &TagVocabularyReplacement,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            if repository
                .get_tag_application_state()?
                .as_ref()
                .map(|state| state.vocabulary_hash.as_str())
                != expected_vocabulary_hash
            {
                return Ok(false);
            }
            replace_tag_candidate(repository, replacement)?;
            put_tag_state(repository, &replacement.state)?;
            Ok(true)
        })
    }

    pub fn replace_tag_staged_suggestions(
        &mut self,
        expected_revision: i64,
        next_revision: i64,
        staged: &[TagStagedSuggestionRecord],
        now: &str,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            let Some(mut state) = repository.get_tag_application_state()? else {
                return Ok(false);
            };
            if state.staged_revision != expected_revision {
                return Ok(false);
            }
            repository.execute("DELETE FROM synt_tag_staged_suggestion", &[])?;
            staged
                .iter()
                .try_for_each(|row| put_tag_staged(repository, row))?;
            state.staged_revision = next_revision;
            state.updated_at = now.to_owned();
            put_tag_state(repository, &state)?;
            Ok(true)
        })
    }

    pub fn promote_tag_vocabulary_state(
        &mut self,
        expected_vocabulary_hash: &str,
        expected_staged_revision: i64,
        promotion: &TagVocabularyPromotion,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            let Some(state) = repository.get_tag_application_state()? else {
                return Ok(false);
            };
            if state.vocabulary_hash != expected_vocabulary_hash
                || state.staged_revision != expected_staged_revision
            {
                return Ok(false);
            }
            replace_tag_candidate(repository, &promotion.replacement)?;
            repository.execute("DELETE FROM synt_tag_staged_suggestion", &[])?;
            promotion
                .staged
                .iter()
                .try_for_each(|row| put_tag_staged(repository, row))?;
            promotion
                .effects
                .iter()
                .try_for_each(|row| put_tag_effect(repository, row))?;
            put_tag_state(repository, &promotion.replacement.state)?;
            Ok(true)
        })
    }

    pub fn promote_tag_index(
        &mut self,
        expected_vocabulary_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            let Some(mut state) = repository.get_tag_application_state()? else {
                return Ok(false);
            };
            if state.vocabulary_hash != expected_vocabulary_hash {
                return Ok(false);
            }
            state.index_hash = index_hash.to_owned();
            state.index_basis_hash = expected_vocabulary_hash.to_owned();
            state.index_json = index_json.to_owned();
            state.index_stale = 0;
            state.updated_at = now.to_owned();
            put_tag_state(repository, &state)?;
            Ok(true)
        })
    }

    pub fn replace_tag_audit(&mut self, record: &TagAuditRecord) -> Result<(), String> {
        self.transaction(|repository| put_tag_audit(repository, record))
    }

    pub fn clear_tag_audit(&mut self, library_id: i64, item_key: &str) -> Result<bool, String> {
        Ok(self.execute(
            "DELETE FROM synt_tag_audit WHERE library_id=?1 AND item_key=?2",
            &[json!(library_id), json!(item_key)],
        )? > 0)
    }

    pub fn update_tag_effect(
        &mut self,
        effect_id: &str,
        status: &str,
        diagnostics_json: &str,
        occurred_at: &str,
        now: &str,
    ) -> Result<bool, String> {
        Ok(self.execute(
            "UPDATE synt_tag_effect SET status=?1,diagnostics_json=?2,occurred_at=?3,updated_at=?4
             WHERE effect_id=?5",
            &[
                json!(status),
                json!(diagnostics_json),
                json!(occurred_at),
                json!(now),
                json!(effect_id),
            ],
        )? > 0)
    }

    pub fn get_concept_application_state(
        &self,
    ) -> Result<Option<ConceptApplicationStateRecord>, String> {
        one(
            self,
            "SELECT * FROM synt_concept_application_state WHERE singleton_id=1",
        )
    }

    pub fn list_concepts(&self) -> Result<Vec<ConceptRecord>, String> {
        many(self, "SELECT * FROM synt_concept ORDER BY concept_id")
    }

    pub fn list_concept_senses(&self) -> Result<Vec<ConceptSenseRecord>, String> {
        many(self, "SELECT * FROM synt_concept_sense ORDER BY sense_id")
    }

    pub fn list_concept_aliases(&self) -> Result<Vec<ConceptAliasRecord>, String> {
        many(self, "SELECT * FROM synt_concept_alias ORDER BY alias_id")
    }

    pub fn list_concept_relations(&self) -> Result<Vec<ConceptRelationRecord>, String> {
        many(
            self,
            "SELECT * FROM synt_concept_relation ORDER BY relation_id",
        )
    }

    pub fn list_concept_reviews(&self) -> Result<Vec<ConceptReviewItemRecord>, String> {
        many(
            self,
            "SELECT * FROM synt_concept_review_item ORDER BY review_id",
        )
    }

    pub fn list_topic_concept_links(&self) -> Result<Vec<TopicConceptLinkRecord>, String> {
        many(
            self,
            "SELECT * FROM synt_topic_concept_link ORDER BY topic_id,concept_id,sense_id",
        )
    }

    pub fn replace_concept_kb_application_state(
        &mut self,
        expected_manifest_hash: Option<&str>,
        replacement: &ConceptKbReplacement,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            if repository
                .get_concept_application_state()?
                .as_ref()
                .map(|state| state.manifest_hash.as_str())
                != expected_manifest_hash
            {
                return Ok(false);
            }
            for table in [
                "synt_topic_concept_link",
                "synt_concept_review_item",
                "synt_concept_relation",
                "synt_concept_alias",
                "synt_concept_sense",
                "synt_concept",
            ] {
                repository.execute(&format!("DELETE FROM {table}"), &[])?;
            }
            replacement
                .concepts
                .iter()
                .try_for_each(|row| put_concept(repository, row))?;
            replacement
                .senses
                .iter()
                .try_for_each(|row| put_concept_sense(repository, row))?;
            replacement
                .aliases
                .iter()
                .try_for_each(|row| put_concept_alias(repository, row))?;
            replacement
                .relations
                .iter()
                .try_for_each(|row| put_concept_relation(repository, row))?;
            replacement
                .reviews
                .iter()
                .try_for_each(|row| put_concept_review(repository, row))?;
            replacement
                .topic_links
                .iter()
                .try_for_each(|row| put_topic_concept_link(repository, row))?;
            put_concept_state(repository, &replacement.state)?;
            Ok(true)
        })
    }

    pub fn promote_concept_kb_index(
        &mut self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            let Some(mut state) = repository.get_concept_application_state()? else {
                return Ok(false);
            };
            if state.manifest_hash != expected_manifest_hash {
                return Ok(false);
            }
            state.index_hash = index_hash.to_owned();
            state.index_basis_hash = expected_manifest_hash.to_owned();
            state.index_json = index_json.to_owned();
            state.index_stale = 0;
            state.updated_at = now.to_owned();
            put_concept_state(repository, &state)?;
            Ok(true)
        })
    }

    pub fn get_topic_graph_application_state(
        &self,
    ) -> Result<Option<TopicGraphApplicationStateRecord>, String> {
        one(
            self,
            "SELECT * FROM synt_topic_graph_application_state WHERE singleton_id=1",
        )
    }

    pub fn list_topic_graph_nodes(&self) -> Result<Vec<TopicGraphNodeRecord>, String> {
        many(
            self,
            "SELECT * FROM synt_topic_graph_node ORDER BY topic_id",
        )
    }

    pub fn list_topic_graph_edges(&self) -> Result<Vec<TopicGraphEdgeRecord>, String> {
        many(self, "SELECT * FROM synt_topic_graph_edge ORDER BY edge_id")
    }

    pub fn list_topic_graph_reviews(&self) -> Result<Vec<TopicGraphReviewItemRecord>, String> {
        many(
            self,
            "SELECT * FROM synt_topic_graph_review_item ORDER BY review_id",
        )
    }

    pub fn replace_topic_graph_application_state(
        &mut self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            if repository
                .get_topic_graph_application_state()?
                .as_ref()
                .map(|state| state.manifest_hash.as_str())
                != expected_manifest_hash
            {
                return Ok(false);
            }
            for table in [
                "synt_topic_graph_review_item",
                "synt_topic_graph_edge",
                "synt_topic_graph_node",
            ] {
                repository.execute(&format!("DELETE FROM {table}"), &[])?;
            }
            replacement
                .nodes
                .iter()
                .try_for_each(|row| put_topic_graph_node(repository, row))?;
            replacement
                .edges
                .iter()
                .try_for_each(|row| put_topic_graph_edge(repository, row))?;
            replacement
                .reviews
                .iter()
                .try_for_each(|row| put_topic_graph_review(repository, row))?;
            put_topic_graph_state(repository, &replacement.state)?;
            Ok(true)
        })
    }

    pub fn promote_topic_graph_index(
        &mut self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
    ) -> Result<bool, String> {
        self.transaction(|repository| {
            let Some(mut state) = repository.get_topic_graph_application_state()? else {
                return Ok(false);
            };
            if state.manifest_hash != expected_manifest_hash {
                return Ok(false);
            }
            state.index_hash = index_hash.to_owned();
            state.index_basis_hash = expected_manifest_hash.to_owned();
            state.index_json = index_json.to_owned();
            state.index_stale = 0;
            state.updated_at = now.to_owned();
            put_topic_graph_state(repository, &state)?;
            Ok(true)
        })
    }
}

fn one<T: DeserializeOwned>(repository: &Repository, sql: &str) -> Result<Option<T>, String> {
    repository
        .query(sql, &[])?
        .into_iter()
        .next()
        .map(decode)
        .transpose()
}

fn many<T: DeserializeOwned>(repository: &Repository, sql: &str) -> Result<Vec<T>, String> {
    repository
        .query(sql, &[])?
        .into_iter()
        .map(decode)
        .collect()
}

fn decode<T: DeserializeOwned>(row: Value) -> Result<T, String> {
    let Value::Object(row) = row else {
        return Err("repository_typed_row_invalid".into());
    };
    let mapped = row
        .into_iter()
        .map(|(key, value)| (snake_to_camel(&key), value))
        .collect::<Map<_, _>>();
    serde_json::from_value(Value::Object(mapped)).map_err(|_| "repository_typed_row_invalid".into())
}

fn snake_to_camel(value: &str) -> String {
    let mut output = String::with_capacity(value.len());
    let mut upper = false;
    for character in value.chars() {
        if character == '_' {
            upper = true;
        } else if upper {
            output.extend(character.to_uppercase());
            upper = false;
        } else {
            output.push(character);
        }
    }
    output
}

fn replace_tag_candidate(
    repository: &Repository,
    replacement: &TagVocabularyReplacement,
) -> Result<(), String> {
    for table in [
        "synt_tag_validation_warning",
        "synt_tag_protocol",
        "synt_tag_abbrev",
        "synt_tag_alias",
        "synt_tag_vocabulary_entry",
    ] {
        repository.execute(&format!("DELETE FROM {table}"), &[])?;
    }
    replacement
        .entries
        .iter()
        .try_for_each(|row| put_tag_entry(repository, row))?;
    replacement
        .aliases
        .iter()
        .try_for_each(|row| put_tag_alias(repository, row))?;
    replacement
        .abbrevs
        .iter()
        .try_for_each(|row| put_tag_abbrev(repository, row))?;
    replacement
        .protocols
        .iter()
        .try_for_each(|row| put_tag_protocol(repository, row))?;
    replacement
        .warnings
        .iter()
        .try_for_each(|row| put_tag_warning(repository, row))
}

fn put_tag_state(repository: &Repository, row: &TagApplicationStateRecord) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_tag_application_state(
         singleton_id,vocabulary_hash,staged_revision,index_hash,index_basis_hash,index_json,
         index_stale,updated_at) VALUES(1,?1,?2,?3,?4,?5,?6,?7)",
        &[
            json!(row.vocabulary_hash),
            json!(row.staged_revision),
            json!(row.index_hash),
            json!(row.index_basis_hash),
            json!(row.index_json),
            json!(row.index_stale),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_tag_entry(repository: &Repository, row: &TagVocabularyEntryRecord) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_tag_vocabulary_entry(
         tag,facet,note,source,deprecated,replacement,aliases_json,abbrev_json,usage_count,
         last_synced_at,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        &[
            json!(row.tag),
            json!(row.facet),
            json!(row.note),
            json!(row.source),
            json!(row.deprecated),
            json!(row.replacement),
            json!(row.aliases_json),
            json!(row.abbrev_json),
            json!(row.usage_count),
            json!(row.last_synced_at),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_tag_alias(repository: &Repository, row: &TagAliasRecord) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_tag_alias(alias,tag,created_at,updated_at) VALUES(?1,?2,?3,?4)",
        &[
            json!(row.alias),
            json!(row.tag),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_tag_abbrev(repository: &Repository, row: &TagAbbrevRecord) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_tag_abbrev(abbrev_key,abbrev_value,created_at,updated_at)
         VALUES(?1,?2,?3,?4)",
        &[
            json!(row.abbrev_key),
            json!(row.abbrev_value),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_tag_protocol(repository: &Repository, row: &TagProtocolRecord) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_tag_protocol(
         protocol_id,version,tag_pattern,max_tag_length,facets_json,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6)",
        &[
            json!(row.protocol_id),
            json!(row.version),
            json!(row.tag_pattern),
            json!(row.max_tag_length),
            json!(row.facets_json),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_tag_warning(
    repository: &Repository,
    row: &TagValidationWarningRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_tag_validation_warning(
         warning_id,code,severity,tag,message,created_at,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7)",
        &[
            json!(row.warning_id),
            json!(row.code),
            json!(row.severity),
            json!(row.tag),
            json!(row.message),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_tag_staged(repository: &Repository, row: &TagStagedSuggestionRecord) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_tag_staged_suggestion(
         tag,facet,note,source_flow,parent_bindings_json,created_at,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7)",
        &[
            json!(row.tag),
            json!(row.facet),
            json!(row.note),
            json!(row.source_flow),
            json!(row.parent_bindings_json),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_tag_audit(repository: &Repository, row: &TagAuditRecord) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_tag_audit(
         library_id,item_key,needs_tag_regulation,non_compliant_tags_json,audited_at,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6)",
        &[
            json!(row.library_id),
            json!(row.item_key),
            json!(row.needs_tag_regulation),
            json!(row.non_compliant_tags_json),
            json!(row.audited_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_tag_effect(repository: &Repository, row: &TagEffectRecord) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_tag_effect(
         effect_id,vocabulary_hash,staged_revision,library_id,item_key,tag,status,occurred_at,
         diagnostics_json,created_at,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
        &[
            json!(row.effect_id),
            json!(row.vocabulary_hash),
            json!(row.staged_revision),
            json!(row.library_id),
            json!(row.item_key),
            json!(row.tag),
            json!(row.status),
            json!(row.occurred_at),
            json!(row.diagnostics_json),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_concept_state(
    repository: &Repository,
    row: &ConceptApplicationStateRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_concept_application_state(
         singleton_id,manifest_hash,revision,index_hash,index_basis_hash,index_json,index_stale,updated_at)
         VALUES(1,?1,?2,?3,?4,?5,?6,?7)",
        &[json!(row.manifest_hash), json!(row.revision), json!(row.index_hash),
          json!(row.index_basis_hash), json!(row.index_json), json!(row.index_stale),
          json!(row.updated_at)],
    )?;
    Ok(())
}

fn put_concept(repository: &Repository, row: &ConceptRecord) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_concept(
         concept_id,label,aliases_json,concept_type,domain,status,short_definition,definition,
         usage_note,editorial_note,sense_ids_json,created_at,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
        &[
            json!(row.concept_id),
            json!(row.label),
            json!(row.aliases_json),
            json!(row.concept_type),
            json!(row.domain),
            json!(row.status),
            json!(row.short_definition),
            json!(row.definition),
            json!(row.usage_note),
            json!(row.editorial_note),
            json!(row.sense_ids_json),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_concept_sense(repository: &Repository, row: &ConceptSenseRecord) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_concept_sense(
         sense_id,concept_id,label,aliases_json,domain,short_definition,definition,disambiguation,
         topic_relevance,confidence,source_topic_ids_json,evidence_json,created_at,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
        &[
            json!(row.sense_id),
            json!(row.concept_id),
            json!(row.label),
            json!(row.aliases_json),
            json!(row.domain),
            json!(row.short_definition),
            json!(row.definition),
            json!(row.disambiguation),
            json!(row.topic_relevance),
            json!(row.confidence),
            json!(row.source_topic_ids_json),
            json!(row.evidence_json),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_concept_alias(repository: &Repository, row: &ConceptAliasRecord) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_concept_alias(
         alias_id,alias,normalized,concept_id,sense_id,status,confidence,created_at,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        &[
            json!(row.alias_id),
            json!(row.alias),
            json!(row.normalized),
            json!(row.concept_id),
            json!(row.sense_id),
            json!(row.status),
            json!(row.confidence),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_concept_relation(
    repository: &Repository,
    row: &ConceptRelationRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_concept_relation(
         relation_id,source_concept_id,target_concept_id,relation,status,confidence,
         provenance_json,created_at,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        &[
            json!(row.relation_id),
            json!(row.source_concept_id),
            json!(row.target_concept_id),
            json!(row.relation),
            json!(row.status),
            json!(row.confidence),
            json!(row.provenance_json),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_concept_review(
    repository: &Repository,
    row: &ConceptReviewItemRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_concept_review_item(
         review_id,status,reason,topic_id,topic_path_id,label,confidence,
         candidate_concept_ids_json,proposal_json,target_concept_id,created_at,updated_at,resolved_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
        &[json!(row.review_id), json!(row.status), json!(row.reason), json!(row.topic_id),
          json!(row.topic_path_id), json!(row.label), json!(row.confidence),
          json!(row.candidate_concept_ids_json), json!(row.proposal_json),
          json!(row.target_concept_id), json!(row.created_at), json!(row.updated_at),
          json!(row.resolved_at)],
    )?;
    Ok(())
}

fn put_topic_concept_link(
    repository: &Repository,
    row: &TopicConceptLinkRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_topic_concept_link(
         topic_id,concept_id,sense_id,label,relevance,confidence,source,created_at,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        &[
            json!(row.topic_id),
            json!(row.concept_id),
            json!(row.sense_id),
            json!(row.label),
            json!(row.relevance),
            json!(row.confidence),
            json!(row.source),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_topic_graph_state(
    repository: &Repository,
    row: &TopicGraphApplicationStateRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT OR REPLACE INTO synt_topic_graph_application_state(
         singleton_id,manifest_hash,revision,index_hash,index_basis_hash,index_json,index_stale,updated_at)
         VALUES(1,?1,?2,?3,?4,?5,?6,?7)",
        &[json!(row.manifest_hash), json!(row.revision), json!(row.index_hash),
          json!(row.index_basis_hash), json!(row.index_json), json!(row.index_stale),
          json!(row.updated_at)],
    )?;
    Ok(())
}

fn put_topic_graph_node(repository: &Repository, row: &TopicGraphNodeRecord) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_topic_graph_node(
         topic_id,title,definition,aliases_json,node_type,definition_status,current_artifact_path,
         is_root,level,paper_count,last_synthesis_at,created_at,updated_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
        &[
            json!(row.topic_id),
            json!(row.title),
            json!(row.definition),
            json!(row.aliases_json),
            json!(row.node_type),
            json!(row.definition_status),
            json!(row.current_artifact_path),
            json!(row.is_root),
            json!(row.level),
            json!(row.paper_count),
            json!(row.last_synthesis_at),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_topic_graph_edge(repository: &Repository, row: &TopicGraphEdgeRecord) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_topic_graph_edge(
         edge_id,source_topic_id,target_topic_id,relation,status,confidence,provenance_json,
         evidence_refs_json,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        &[
            json!(row.edge_id),
            json!(row.source_topic_id),
            json!(row.target_topic_id),
            json!(row.relation),
            json!(row.status),
            json!(row.confidence),
            json!(row.provenance_json),
            json!(row.evidence_refs_json),
            json!(row.created_at),
            json!(row.updated_at),
        ],
    )?;
    Ok(())
}

fn put_topic_graph_review(
    repository: &Repository,
    row: &TopicGraphReviewItemRecord,
) -> Result<(), String> {
    repository.execute(
        "INSERT INTO synt_topic_graph_review_item(
         review_id,status,source_topic_id,target_topic_id,target_title,relation,confidence,
         provenance_json,evidence_refs_json,created_at,updated_at,resolved_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
        &[
            json!(row.review_id),
            json!(row.status),
            json!(row.source_topic_id),
            json!(row.target_topic_id),
            json!(row.target_title),
            json!(row.relation),
            json!(row.confidence),
            json!(row.provenance_json),
            json!(row.evidence_refs_json),
            json!(row.created_at),
            json!(row.updated_at),
            json!(row.resolved_at),
        ],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::RepositoryIdentity;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn root(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-{label}-repository-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
    }

    fn open(label: &str) -> (PathBuf, Repository) {
        let root = root(label);
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("open repository");
        (root, repository)
    }

    #[test]
    fn tag_replacement_is_basis_guarded_and_rolls_back() {
        let (root, mut repository) = open("tag");
        let replacement = TagVocabularyReplacement {
            state: TagApplicationStateRecord {
                singleton_id: 1,
                vocabulary_hash: "tag:1".into(),
                index_json: "{}".into(),
                index_stale: 1,
                updated_at: "now".into(),
                ..TagApplicationStateRecord::default()
            },
            entries: vec![TagVocabularyEntryRecord {
                tag: "method:one".into(),
                facet: "method".into(),
                aliases_json: "[]".into(),
                abbrev_json: "[]".into(),
                created_at: "now".into(),
                updated_at: "now".into(),
                ..TagVocabularyEntryRecord::default()
            }],
            ..TagVocabularyReplacement::default()
        };
        assert!(
            repository
                .replace_tag_vocabulary_state(None, &replacement)
                .expect("replace")
        );
        assert!(
            !repository
                .replace_tag_vocabulary_state(None, &replacement)
                .expect("stale")
        );
        repository
            .execute(
                "CREATE TRIGGER fail_tag BEFORE INSERT ON synt_tag_vocabulary_entry
                 WHEN NEW.tag='method:two' BEGIN SELECT RAISE(ABORT,'forced'); END",
                &[],
            )
            .expect("trigger");
        let mut failed = replacement.clone();
        failed.state.vocabulary_hash = "tag:2".into();
        failed.entries[0].tag = "method:two".into();
        assert!(
            repository
                .replace_tag_vocabulary_state(Some("tag:1"), &failed)
                .is_err()
        );
        assert_eq!(
            repository
                .get_tag_application_state()
                .expect("state")
                .expect("active")
                .vocabulary_hash,
            "tag:1"
        );
        drop(repository);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn concept_replacement_rolls_back_complete_projection() {
        let (root, mut repository) = open("concept");
        let replacement = ConceptKbReplacement {
            state: ConceptApplicationStateRecord {
                singleton_id: 1,
                manifest_hash: "concept:1".into(),
                index_json: "{}".into(),
                index_stale: 1,
                updated_at: "now".into(),
                ..ConceptApplicationStateRecord::default()
            },
            concepts: vec![ConceptRecord {
                concept_id: "concept:1".into(),
                label: "One".into(),
                aliases_json: "[]".into(),
                concept_type: "concept".into(),
                domain: "test".into(),
                status: "active".into(),
                sense_ids_json: "[]".into(),
                created_at: "now".into(),
                updated_at: "now".into(),
                ..ConceptRecord::default()
            }],
            ..ConceptKbReplacement::default()
        };
        assert!(
            repository
                .replace_concept_kb_application_state(None, &replacement)
                .expect("replace")
        );
        repository
            .execute(
                "CREATE TRIGGER fail_concept BEFORE INSERT ON synt_concept
                 WHEN NEW.concept_id='concept:2' BEGIN SELECT RAISE(ABORT,'forced'); END",
                &[],
            )
            .expect("trigger");
        let mut failed = replacement.clone();
        failed.state.manifest_hash = "concept:2".into();
        failed.concepts[0].concept_id = "concept:2".into();
        assert!(
            repository
                .replace_concept_kb_application_state(Some("concept:1"), &failed)
                .is_err()
        );
        assert_eq!(
            repository.list_concepts().expect("concepts")[0].concept_id,
            "concept:1"
        );
        drop(repository);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn topic_graph_replacement_survives_reopen() {
        let (root, mut repository) = open("topic-graph");
        let replacement = TopicGraphReplacement {
            state: TopicGraphApplicationStateRecord {
                singleton_id: 1,
                manifest_hash: "graph:1".into(),
                index_json: "{}".into(),
                index_stale: 1,
                updated_at: "now".into(),
                ..TopicGraphApplicationStateRecord::default()
            },
            nodes: vec![TopicGraphNodeRecord {
                topic_id: "topic:1".into(),
                title: "One".into(),
                aliases_json: "[]".into(),
                node_type: "topic".into(),
                created_at: "now".into(),
                updated_at: "now".into(),
                ..TopicGraphNodeRecord::default()
            }],
            ..TopicGraphReplacement::default()
        };
        assert!(
            repository
                .replace_topic_graph_application_state(None, &replacement)
                .expect("replace")
        );
        drop(repository);
        let reopened = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("reopen");
        assert_eq!(
            reopened
                .get_topic_graph_application_state()
                .expect("state")
                .expect("active")
                .manifest_hash,
            "graph:1"
        );
        assert_eq!(reopened.list_topic_graph_nodes().expect("nodes").len(), 1);
        drop(reopened);
        let _ = std::fs::remove_dir_all(root);
    }
}
