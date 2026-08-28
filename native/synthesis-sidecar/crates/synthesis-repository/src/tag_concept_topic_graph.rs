use crate::{OperationRecord, Repository, ReviewPageQuery, row_integer};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value, json};
use std::collections::BTreeSet;

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

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct TagEffectReceiptRecord {
    pub effect_id: String,
    pub status: String,
    pub occurred_at: String,
    pub diagnostics_json: String,
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
    pub planning_json: String,
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

    pub fn update_topic_discovery_hint_outcome(
        &mut self,
        hint_id: &str,
        status: &str,
        basis_hash: &str,
        outcome: &Value,
        updated_at: &str,
    ) -> Result<Option<Value>, String> {
        if hint_id.is_empty()
            || !matches!(status, "accepted" | "screened_out" | "superseded" | "open")
            || !outcome.is_object()
        {
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
            let mut payload = serde_json::from_str::<Value>(
                row.get("payload_json")
                    .and_then(Value::as_str)
                    .ok_or_else(|| "topic_discovery_hint_invalid".to_owned())?,
            )
            .map_err(|_| "topic_discovery_hint_invalid".to_owned())?;
            let object = payload
                .as_object_mut()
                .ok_or_else(|| "topic_discovery_hint_invalid".to_owned())?;
            let current_basis = object
                .get("basis_hash")
                .and_then(Value::as_str)
                .unwrap_or_default();
            let next_status = if status == "open"
                && object.get("status").and_then(Value::as_str) == Some("screened_out")
                && current_basis == basis_hash
            {
                "screened_out"
            } else {
                status
            };
            object.insert("status".into(), json!(next_status));
            object.insert("basis_hash".into(), json!(basis_hash));
            object.insert("outcome".into(), outcome.clone());
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

    pub fn refresh_topic_discovery_projections(
        &mut self,
        updated_at: &str,
    ) -> Result<usize, String> {
        self.transaction(|repository| {
            let projections = repository
                .query(
                    "SELECT * FROM synt_topic_application_projection ORDER BY topic_id",
                    &[],
                )?
                .into_iter()
                .map(decode)
                .collect::<Result<Vec<crate::TopicApplicationProjectionRecord>, _>>()?;
            let children = repository
                .list_topic_graph_edges()?
                .into_iter()
                .filter(|edge| edge.relation == "broader_than" && edge.status == "confirmed")
                .fold(
                    std::collections::BTreeMap::<String, Vec<String>>::new(),
                    |mut grouped, edge| {
                        grouped
                            .entry(edge.source_topic_id)
                            .or_default()
                            .push(edge.target_topic_id);
                        grouped
                    },
                );
            let hints = repository
                .query(
                    "SELECT payload_json FROM synt_topic_discovery_hint ORDER BY hint_id",
                    &[],
                )?
                .into_iter()
                .filter_map(|row| {
                    row.get("payload_json")
                        .and_then(Value::as_str)
                        .and_then(|payload| serde_json::from_str::<Value>(payload).ok())
                })
                .collect::<Vec<_>>();
            let mut updated = 0;
            for mut projection in projections {
                let mut cascade = BTreeSet::from([projection.topic_id.clone()]);
                let mut pending = vec![projection.topic_id.clone()];
                while let Some(topic_id) = pending.pop() {
                    for child in children.get(&topic_id).into_iter().flatten() {
                        if cascade.insert(child.clone()) {
                            pending.push(child.clone());
                        }
                    }
                }
                let mut open = BTreeSet::new();
                let mut rejected = BTreeSet::new();
                let visible_hints = hints
                    .iter()
                    .filter(|hint| {
                        hint.get("topic_id")
                            .or_else(|| hint.get("topicId"))
                            .and_then(Value::as_str)
                            .is_some_and(|topic_id| cascade.contains(topic_id))
                    })
                    .filter_map(|hint| {
                        let literature_id = hint
                            .get("literature_item_id")
                            .or_else(|| hint.get("literatureItemId"))
                            .and_then(Value::as_str)?;
                        match hint.get("status").and_then(Value::as_str) {
                            Some("open") => {
                                open.insert(literature_id.to_owned());
                                rejected.remove(literature_id);
                            }
                            Some("rejected") if !open.contains(literature_id) => {
                                rejected.insert(literature_id.to_owned());
                            }
                            _ => {}
                        }
                        Some(hint.clone())
                    })
                    .take(25)
                    .collect::<Vec<_>>();
                let mut discovery = serde_json::from_str::<Value>(&projection.discovery_json)
                    .ok()
                    .and_then(|value| value.as_object().cloned())
                    .unwrap_or_default();
                discovery.insert(
                    "cascade_topic_ids".into(),
                    json!(cascade.into_iter().collect::<Vec<_>>()),
                );
                discovery.insert("candidate_count".into(), json!(open.len()));
                discovery.insert(
                    "discovery_status".into(),
                    json!(if !open.is_empty() {
                        "candidates"
                    } else if !rejected.is_empty() {
                        "rejected"
                    } else {
                        "none"
                    }),
                );
                discovery.insert("hints".into(), json!(visible_hints));
                let next = serde_json::to_string(&Value::Object(discovery))
                    .map_err(|_| "topic_discovery_projection_invalid".to_owned())?;
                if next != projection.discovery_json {
                    projection.discovery_json = next;
                    projection.updated_at = updated_at.into();
                    repository.upsert_topic_application_projection(&projection)?;
                    updated += 1;
                }
            }
            Ok(updated)
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

    pub fn count_pending_tag_effects(&self) -> Result<usize, String> {
        let row = self
            .query(
                "SELECT COUNT(*) AS pending_count FROM synt_tag_effect WHERE status='pending'",
                &[],
            )?
            .into_iter()
            .next()
            .ok_or_else(|| "repository_row_missing".to_owned())?;
        usize::try_from(row_integer(&row, "pending_count")?)
            .map_err(|_| "repository_value_invalid".to_owned())
    }

    pub fn list_pending_tag_effects(&self, limit: usize) -> Result<Vec<TagEffectRecord>, String> {
        if limit == 0 || limit > 100 {
            return Err("invalid_request".into());
        }
        self.query(
            "SELECT * FROM synt_tag_effect WHERE status='pending' \
             ORDER BY updated_at ASC,effect_id ASC LIMIT ?1",
            &[json!(limit)],
        )?
        .into_iter()
        .map(decode)
        .collect()
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

    pub fn replace_tag_audits(
        &mut self,
        library_id: i64,
        records: &[TagAuditRecord],
    ) -> Result<(), String> {
        if library_id <= 0
            || records
                .iter()
                .any(|record| record.library_id != library_id || record.item_key.is_empty())
        {
            return Err("invalid_request".into());
        }
        self.transaction(|repository| {
            repository.execute(
                "DELETE FROM synt_tag_audit WHERE library_id=?1",
                &[json!(library_id)],
            )?;
            records
                .iter()
                .try_for_each(|record| put_tag_audit(repository, record))
        })
    }

    pub fn upsert_tag_audit(&mut self, record: &TagAuditRecord) -> Result<(), String> {
        if record.library_id <= 0 || record.item_key.is_empty() {
            return Err("invalid_request".into());
        }
        self.transaction(|repository| put_tag_audit(repository, record))
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

    pub fn update_tag_effect_receipts(
        &mut self,
        receipts: &[TagEffectReceiptRecord],
    ) -> Result<(), String> {
        if receipts.is_empty() || receipts.len() > 100 {
            return Err("invalid_request".into());
        }
        self.transaction(|repository| {
            for receipt in receipts {
                if receipt.effect_id.is_empty()
                    || !matches!(
                        receipt.status.as_str(),
                        "pending" | "applied" | "already_satisfied" | "not_found" | "failed"
                    )
                    || !serde_json::from_str::<Value>(&receipt.diagnostics_json)
                        .is_ok_and(|value| value.is_array())
                {
                    return Err("invalid_request".into());
                }
                let updated = repository.execute(
                    "UPDATE synt_tag_effect \
                     SET status=?1,diagnostics_json=?2,occurred_at=?3,updated_at=?4 \
                     WHERE effect_id=?5",
                    &[
                        json!(receipt.status),
                        json!(receipt.diagnostics_json),
                        json!(receipt.occurred_at),
                        json!(receipt.updated_at),
                        json!(receipt.effect_id),
                    ],
                )?;
                if updated != 1 {
                    return Err("tag_effect_missing".into());
                }
            }
            Ok(())
        })
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

    pub fn load_concept_review_page(
        &self,
        query: &ReviewPageQuery,
    ) -> Result<(ConceptKbReplacement, usize), String> {
        validate_domain_review_query(query)?;
        let (clause, mut values) = concept_review_clause(query);
        let total = domain_review_count(self, "synt_concept_review_item", &clause, &values)?;
        values.extend([json!(query.limit), json!(query.offset)]);
        let reviews = self
            .query(
                &format!(
                    "SELECT * FROM synt_concept_review_item {clause}
                     ORDER BY updated_at DESC,review_id ASC LIMIT ? OFFSET ?"
                ),
                &values,
            )?
            .into_iter()
            .map(decode)
            .collect::<Result<Vec<ConceptReviewItemRecord>, _>>()?;
        let concept_ids = reviews
            .iter()
            .flat_map(|review| {
                let mut ids =
                    serde_json::from_str::<Vec<String>>(&review.candidate_concept_ids_json)
                        .unwrap_or_default();
                if !review.target_concept_id.is_empty() {
                    ids.push(review.target_concept_id.clone());
                }
                ids
            })
            .collect::<BTreeSet<_>>();
        let concepts = if concept_ids.is_empty() {
            Vec::new()
        } else {
            let placeholders = std::iter::repeat_n("?", concept_ids.len())
                .collect::<Vec<_>>()
                .join(",");
            let values = concept_ids.iter().map(|id| json!(id)).collect::<Vec<_>>();
            self.query(
                &format!(
                    "SELECT * FROM synt_concept WHERE concept_id IN ({placeholders})
                     ORDER BY concept_id ASC"
                ),
                &values,
            )?
            .into_iter()
            .map(decode)
            .collect::<Result<Vec<ConceptRecord>, _>>()?
        };
        Ok((
            ConceptKbReplacement {
                state: self.get_concept_application_state()?.unwrap_or_default(),
                concepts,
                reviews,
                ..ConceptKbReplacement::default()
            },
            total,
        ))
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
        self.replace_concept_kb_application_state_with_receipt(
            expected_manifest_hash,
            replacement,
            None,
        )
    }

    pub fn replace_concept_kb_application_state_with_receipt(
        &mut self,
        expected_manifest_hash: Option<&str>,
        replacement: &ConceptKbReplacement,
        receipt: Option<&OperationRecord>,
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
            if let Some(receipt) = receipt {
                repository.upsert_operation(receipt)?;
            }
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
        self.promote_concept_kb_index_with_receipt(
            expected_manifest_hash,
            index_hash,
            index_json,
            now,
            None,
        )
    }

    pub fn promote_concept_kb_index_with_receipt(
        &mut self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
        receipt: Option<&OperationRecord>,
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
            if let Some(receipt) = receipt {
                repository.upsert_operation(receipt)?;
            }
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

    pub fn load_topic_graph_review_page(
        &self,
        query: &ReviewPageQuery,
    ) -> Result<(TopicGraphReplacement, usize, usize), String> {
        validate_domain_review_query(query)?;
        let (edge_clause, mut edge_values) = topic_graph_edge_review_clause(query);
        let edge_total =
            domain_review_count(self, "synt_topic_graph_edge", &edge_clause, &edge_values)?;
        edge_values.extend([json!(query.limit), json!(query.offset)]);
        let edges = self
            .query(
                &format!(
                    "SELECT * FROM synt_topic_graph_edge {edge_clause}
                     ORDER BY updated_at DESC,edge_id ASC LIMIT ? OFFSET ?"
                ),
                &edge_values,
            )?
            .into_iter()
            .map(decode)
            .collect::<Result<Vec<TopicGraphEdgeRecord>, _>>()?;
        let (review_clause, mut review_values) = topic_graph_review_clause(query);
        let review_total = domain_review_count(
            self,
            "synt_topic_graph_review_item",
            &review_clause,
            &review_values,
        )?;
        review_values.extend([json!(query.limit), json!(query.offset)]);
        let reviews = self
            .query(
                &format!(
                    "SELECT * FROM synt_topic_graph_review_item {review_clause}
                     ORDER BY updated_at DESC,review_id ASC LIMIT ? OFFSET ?"
                ),
                &review_values,
            )?
            .into_iter()
            .map(decode)
            .collect::<Result<Vec<TopicGraphReviewItemRecord>, _>>()?;
        let topic_ids = edges
            .iter()
            .flat_map(|edge| [&edge.source_topic_id, &edge.target_topic_id])
            .chain(
                reviews
                    .iter()
                    .flat_map(|review| [&review.source_topic_id, &review.target_topic_id]),
            )
            .filter(|id| !id.is_empty())
            .cloned()
            .collect::<BTreeSet<_>>();
        let nodes = if topic_ids.is_empty() {
            Vec::new()
        } else {
            let placeholders = std::iter::repeat_n("?", topic_ids.len())
                .collect::<Vec<_>>()
                .join(",");
            let values = topic_ids.iter().map(|id| json!(id)).collect::<Vec<_>>();
            self.query(
                &format!(
                    "SELECT * FROM synt_topic_graph_node WHERE topic_id IN ({placeholders})
                     ORDER BY topic_id ASC"
                ),
                &values,
            )?
            .into_iter()
            .map(decode)
            .collect::<Result<Vec<TopicGraphNodeRecord>, _>>()?
        };
        Ok((
            TopicGraphReplacement {
                state: self
                    .get_topic_graph_application_state()?
                    .unwrap_or_default(),
                nodes,
                edges,
                reviews,
            },
            edge_total,
            review_total,
        ))
    }

    pub fn load_topic_graph_window(&self, limit: usize) -> Result<TopicGraphReplacement, String> {
        let limit = limit.clamp(1, 250);
        let nodes = self
            .query(
                "SELECT * FROM synt_topic_graph_node ORDER BY topic_id LIMIT ?1",
                &[json!(limit)],
            )?
            .into_iter()
            .map(decode)
            .collect::<Result<Vec<TopicGraphNodeRecord>, _>>()?;
        let topic_ids = nodes
            .iter()
            .map(|node| node.topic_id.clone())
            .collect::<Vec<_>>();
        let (edges, reviews) = if topic_ids.is_empty() {
            (Vec::new(), Vec::new())
        } else {
            let placeholders = (1..=topic_ids.len())
                .map(|index| format!("?{index}"))
                .collect::<Vec<_>>()
                .join(",");
            let values = topic_ids
                .iter()
                .map(|topic_id| json!(topic_id))
                .collect::<Vec<_>>();
            let edges = self
                .query(
                    &format!(
                        "SELECT * FROM synt_topic_graph_edge
                         WHERE source_topic_id IN ({placeholders})
                           AND target_topic_id IN ({placeholders})
                         ORDER BY edge_id LIMIT {}",
                        limit * 4
                    ),
                    &values,
                )?
                .into_iter()
                .map(decode)
                .collect::<Result<Vec<TopicGraphEdgeRecord>, _>>()?;
            let reviews = self
                .query(
                    &format!(
                        "SELECT * FROM synt_topic_graph_review_item
                         WHERE source_topic_id IN ({placeholders})
                           AND target_topic_id IN ({placeholders})
                         ORDER BY review_id LIMIT {}",
                        limit * 2
                    ),
                    &values,
                )?
                .into_iter()
                .map(decode)
                .collect::<Result<Vec<TopicGraphReviewItemRecord>, _>>()?;
            (edges, reviews)
        };
        Ok(TopicGraphReplacement {
            state: self
                .get_topic_graph_application_state()?
                .unwrap_or_default(),
            nodes,
            edges,
            reviews,
        })
    }

    pub fn replace_topic_graph_application_state(
        &mut self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
    ) -> Result<bool, String> {
        self.replace_topic_graph_application_state_with_receipt(
            expected_manifest_hash,
            replacement,
            None,
        )
    }

    pub fn replace_topic_graph_application_state_with_receipt(
        &mut self,
        expected_manifest_hash: Option<&str>,
        replacement: &TopicGraphReplacement,
        receipt: Option<&OperationRecord>,
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
            if let Some(receipt) = receipt {
                repository.upsert_operation(receipt)?;
            }
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
        self.promote_topic_graph_index_with_receipt(
            expected_manifest_hash,
            index_hash,
            index_json,
            now,
            None,
        )
    }

    pub fn promote_topic_graph_index_with_receipt(
        &mut self,
        expected_manifest_hash: &str,
        index_hash: &str,
        index_json: &str,
        now: &str,
        receipt: Option<&OperationRecord>,
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
            if let Some(receipt) = receipt {
                repository.upsert_operation(receipt)?;
            }
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

fn validate_domain_review_query(query: &ReviewPageQuery) -> Result<(), String> {
    if query.limit == 0
        || query.limit > 100
        || query.offset > 100_000
        || query.search.chars().count() > 500
        || !matches!(
            query.status.as_str(),
            "all" | "open" | "accepted" | "rejected" | "superseded" | "retargeted"
        )
        || !matches!(
            query.kind.as_str(),
            "all" | "zotero_binding" | "canonical_merge" | "canonical_revision"
        )
        || !matches!(
            query.confidence.as_str(),
            "all" | "deterministic" | "high" | "medium" | "low" | "review"
        )
    {
        return Err("review_page_query_invalid".into());
    }
    Ok(())
}

fn concept_review_clause(query: &ReviewPageQuery) -> (String, Vec<Value>) {
    let mut conditions = review_status_conditions(&query.status, ReviewStatusDomain::Concept);
    let mut values = Vec::new();
    push_confidence_condition(&mut conditions, &query.confidence);
    push_domain_search_condition(
        &mut conditions,
        &mut values,
        &query.search,
        &[
            "review_id",
            "reason",
            "topic_id",
            "topic_path_id",
            "label",
            "candidate_concept_ids_json",
            "proposal_json",
        ],
    );
    (domain_where_clause(&conditions), values)
}

fn topic_graph_edge_review_clause(query: &ReviewPageQuery) -> (String, Vec<Value>) {
    let mut conditions = review_status_conditions(&query.status, ReviewStatusDomain::TopicEdge);
    let mut values = Vec::new();
    push_confidence_condition(&mut conditions, &query.confidence);
    push_domain_search_condition(
        &mut conditions,
        &mut values,
        &query.search,
        &[
            "edge_id",
            "source_topic_id",
            "target_topic_id",
            "relation",
            "provenance_json",
            "evidence_refs_json",
        ],
    );
    (domain_where_clause(&conditions), values)
}

fn topic_graph_review_clause(query: &ReviewPageQuery) -> (String, Vec<Value>) {
    let mut conditions = review_status_conditions(&query.status, ReviewStatusDomain::TopicReview);
    let mut values = Vec::new();
    push_confidence_condition(&mut conditions, &query.confidence);
    push_domain_search_condition(
        &mut conditions,
        &mut values,
        &query.search,
        &[
            "review_id",
            "source_topic_id",
            "target_topic_id",
            "target_title",
            "relation",
            "provenance_json",
            "evidence_refs_json",
        ],
    );
    (domain_where_clause(&conditions), values)
}

#[derive(Clone, Copy)]
enum ReviewStatusDomain {
    Concept,
    TopicEdge,
    TopicReview,
}

fn review_status_conditions(status: &str, domain: ReviewStatusDomain) -> Vec<String> {
    let condition = match (domain, status) {
        (_, "all") => "status<>'deleted'",
        (ReviewStatusDomain::Concept, "accepted") => "status IN ('approved','merged')",
        (ReviewStatusDomain::Concept, "superseded") => "status IN ('stale','superseded')",
        (ReviewStatusDomain::TopicEdge, "open") => "status='suggested'",
        (ReviewStatusDomain::TopicEdge, "accepted") => "status IN ('accepted','confirmed')",
        (ReviewStatusDomain::TopicEdge, "superseded") => "status IN ('stale','superseded')",
        (ReviewStatusDomain::TopicReview, "accepted") => "status='approved'",
        (ReviewStatusDomain::TopicReview, "superseded") => "status IN ('stale','superseded')",
        (_, other) => match other {
            "open" => "status='open'",
            "rejected" => "status='rejected'",
            "retargeted" => "status='retargeted'",
            _ => "1=0",
        },
    };
    vec![condition.to_owned()]
}

fn push_confidence_condition(conditions: &mut Vec<String>, confidence: &str) {
    let condition = match confidence {
        "all" => return,
        "deterministic" => "confidence>=1.0",
        "high" => "confidence>=0.8 AND confidence<1.0",
        "medium" => "confidence>=0.5 AND confidence<0.8",
        "low" => "confidence<0.5",
        "review" => "confidence<0.8",
        _ => "1=0",
    };
    conditions.push(condition.into());
}

fn push_domain_search_condition(
    conditions: &mut Vec<String>,
    values: &mut Vec<Value>,
    search: &str,
    columns: &[&str],
) {
    let search = search.trim().to_lowercase();
    if search.is_empty() {
        return;
    }
    let pattern = format!("%{search}%");
    let condition = columns
        .iter()
        .map(|column| format!("lower({column}) LIKE ?"))
        .collect::<Vec<_>>()
        .join(" OR ");
    conditions.push(format!("({condition})"));
    values.extend(columns.iter().map(|_| json!(pattern)));
}

fn domain_where_clause(conditions: &[String]) -> String {
    if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    }
}

fn domain_review_count(
    repository: &Repository,
    table: &str,
    clause: &str,
    values: &[Value],
) -> Result<usize, String> {
    let row = repository
        .query(
            &format!("SELECT COUNT(*) AS total FROM {table} {clause}"),
            values,
        )?
        .into_iter()
        .next()
        .ok_or_else(|| "repository_typed_row_invalid".to_owned())?;
    usize::try_from(row_integer(&row, "total")?).map_err(|_| "repository_typed_row_invalid".into())
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
         is_root,level,paper_count,last_synthesis_at,created_at,updated_at,planning_json)
         VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
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
            json!(row.planning_json),
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
    fn tag_audit_replacement_is_library_scoped_and_atomic() {
        let (root, mut repository) = open("tag-audit-replacement");
        let audit = |library_id: i64, item_key: &str| TagAuditRecord {
            library_id,
            item_key: item_key.into(),
            needs_tag_regulation: 1,
            non_compliant_tags_json: "[]".into(),
            audited_at: "2026-08-09T00:00:00.000Z".into(),
            updated_at: "2026-08-09T00:00:00.000Z".into(),
        };
        repository
            .replace_tag_audits(1, &[audit(1, "ONE"), audit(1, "TWO")])
            .expect("seed first library");
        repository
            .replace_tag_audits(2, &[audit(2, "OTHER")])
            .expect("seed second library");
        repository
            .replace_tag_audits(1, &[audit(1, "REPLACED")])
            .expect("replace first library");
        assert_eq!(
            repository
                .list_tag_audits()
                .expect("audits")
                .iter()
                .map(|record| (record.library_id, record.item_key.as_str()))
                .collect::<Vec<_>>(),
            vec![(1, "REPLACED"), (2, "OTHER")]
        );

        repository
            .execute(
                "CREATE TRIGGER fail_tag_audit BEFORE INSERT ON synt_tag_audit
                 WHEN NEW.item_key='FAIL' BEGIN SELECT RAISE(ABORT,'forced'); END",
                &[],
            )
            .expect("trigger");
        assert!(
            repository
                .replace_tag_audits(1, &[audit(1, "FAIL")])
                .is_err()
        );
        assert_eq!(
            repository
                .list_tag_audits()
                .expect("audits after rollback")
                .iter()
                .map(|record| (record.library_id, record.item_key.as_str()))
                .collect::<Vec<_>>(),
            vec![(1, "REPLACED"), (2, "OTHER")]
        );
        let mut cleared = audit(1, "REPLACED");
        cleared.needs_tag_regulation = 0;
        repository
            .upsert_tag_audit(&cleared)
            .expect("write compliant audit state");
        assert_eq!(
            repository
                .list_tag_audits()
                .expect("cleared audit")
                .into_iter()
                .find(|record| record.library_id == 1)
                .expect("first library audit")
                .needs_tag_regulation,
            0
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

    #[test]
    fn confirmed_broader_relations_refresh_discovery_cascade_projection() {
        let (root, mut repository) = open("topic-discovery-cascade");
        for topic_id in ["topic:parent", "topic:child"] {
            repository
                .upsert_topic_application_projection(&crate::TopicApplicationProjectionRecord {
                    topic_id: topic_id.into(),
                    topic_graph_json: "{}".into(),
                    concepts_json: "{}".into(),
                    interest_metadata_json: "{}".into(),
                    discovery_json: "{\"source_paper_refs\":[]}".into(),
                    updated_at: "before".into(),
                })
                .expect("projection");
        }
        let graph = TopicGraphReplacement {
            state: TopicGraphApplicationStateRecord {
                singleton_id: 1,
                manifest_hash: "graph:discovery".into(),
                index_json: "{}".into(),
                updated_at: "before".into(),
                ..TopicGraphApplicationStateRecord::default()
            },
            nodes: ["parent", "child"]
                .into_iter()
                .map(|id| TopicGraphNodeRecord {
                    topic_id: format!("topic:{id}"),
                    title: id.into(),
                    aliases_json: "[]".into(),
                    node_type: "topic".into(),
                    created_at: "before".into(),
                    updated_at: "before".into(),
                    ..TopicGraphNodeRecord::default()
                })
                .collect(),
            edges: vec![TopicGraphEdgeRecord {
                edge_id: "edge:broader".into(),
                source_topic_id: "topic:parent".into(),
                target_topic_id: "topic:child".into(),
                relation: "broader_than".into(),
                status: "confirmed".into(),
                provenance_json: "[]".into(),
                evidence_refs_json: "[]".into(),
                created_at: "before".into(),
                updated_at: "before".into(),
                ..TopicGraphEdgeRecord::default()
            }],
            reviews: Vec::new(),
        };
        assert!(
            repository
                .replace_topic_graph_application_state(None, &graph)
                .expect("graph")
        );
        repository
            .execute(
                "INSERT INTO synt_topic_discovery_hint(hint_id,payload_json,updated_at)
                 VALUES(?1,?2,?3)",
                &[
                    json!("hint:child"),
                    json!("{\"topic_id\":\"topic:child\",\"literature_item_id\":\"1:ABC\",\"status\":\"open\"}"),
                    json!("before"),
                ],
            )
            .expect("hint");
        assert_eq!(
            repository
                .refresh_topic_discovery_projections("after")
                .expect("refresh"),
            2
        );
        let parent = repository
            .get_topic_application_projection("topic:parent")
            .expect("parent")
            .expect("parent projection");
        let discovery: Value = serde_json::from_str(&parent.discovery_json).expect("discovery");
        assert_eq!(
            discovery["cascade_topic_ids"],
            json!(["topic:child", "topic:parent"])
        );
        assert_eq!(discovery["candidate_count"], 1);
        assert_eq!(discovery["discovery_status"], "candidates");
        drop(repository);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn tag_effect_receipt_batch_is_bounded_and_atomic() {
        let (root, mut repository) = open("tag-effect-receipts");
        for effect_id in ["effect:1", "effect:2"] {
            put_tag_effect(
                &repository,
                &TagEffectRecord {
                    effect_id: effect_id.into(),
                    vocabulary_hash: "tag:1".into(),
                    staged_revision: 1,
                    library_id: 1,
                    item_key: effect_id.into(),
                    tag: "method:test".into(),
                    status: "pending".into(),
                    diagnostics_json: "[]".into(),
                    created_at: "2026-08-03T00:00:00.000Z".into(),
                    updated_at: "2026-08-03T00:00:00.000Z".into(),
                    ..TagEffectRecord::default()
                },
            )
            .expect("effect");
        }
        let failed_batch = [
            TagEffectReceiptRecord {
                effect_id: "effect:1".into(),
                status: "applied".into(),
                occurred_at: "2026-08-03T00:00:01.000Z".into(),
                diagnostics_json: "[]".into(),
                updated_at: "2026-08-03T00:00:01.000Z".into(),
            },
            TagEffectReceiptRecord {
                effect_id: "effect:missing".into(),
                status: "failed".into(),
                occurred_at: "2026-08-03T00:00:01.000Z".into(),
                diagnostics_json: "[]".into(),
                updated_at: "2026-08-03T00:00:01.000Z".into(),
            },
        ];
        assert!(
            repository
                .update_tag_effect_receipts(&failed_batch)
                .is_err()
        );
        assert_eq!(repository.count_pending_tag_effects().expect("count"), 2);
        assert_eq!(
            repository
                .list_pending_tag_effects(1)
                .expect("bounded pending")
                .len(),
            1
        );
        let receipts = [
            failed_batch[0].clone(),
            TagEffectReceiptRecord {
                effect_id: "effect:2".into(),
                status: "already_satisfied".into(),
                ..failed_batch[0].clone()
            },
        ];
        repository
            .update_tag_effect_receipts(&receipts)
            .expect("receipt batch");
        assert_eq!(repository.count_pending_tag_effects().expect("count"), 0);

        drop(repository);
        let _ = std::fs::remove_dir_all(root);
    }
}
