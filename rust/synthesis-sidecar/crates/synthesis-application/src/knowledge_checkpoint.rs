use crate::admission::{AdmissionError, SingleFlightAdmission};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    KnowledgeCheckpointBases, KnowledgeCheckpointCapture, KnowledgeCheckpointPayload,
    KnowledgeCheckpointReplacement,
};

pub const KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION: &str = "synthesis-knowledge-checkpoint.v1";

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeCheckpointCounts {
    pub tag_vocabulary: KnowledgeTagVocabularyCounts,
    pub concept_kb: KnowledgeConceptKbCounts,
    pub topic_graph: KnowledgeTopicGraphCounts,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeTagVocabularyCounts {
    pub entries: usize,
    pub aliases: usize,
    pub abbrev: usize,
    pub protocol: usize,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeConceptKbCounts {
    pub concepts: usize,
    pub senses: usize,
    pub aliases: usize,
    pub relations: usize,
    pub review_items: usize,
    pub topic_links: usize,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeTopicGraphCounts {
    pub nodes: usize,
    pub edges: usize,
    pub review_items: usize,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeCheckpoint {
    pub contract_version: String,
    pub generated_at: String,
    pub bases: KnowledgeCheckpointBases,
    pub payload: KnowledgeCheckpointPayload,
    pub counts: KnowledgeCheckpointCounts,
    pub checkpoint_hash: String,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeFamilyDiff {
    pub added: usize,
    pub updated: usize,
    pub deleted: usize,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeTagVocabularyDiff {
    pub entries: KnowledgeFamilyDiff,
    pub aliases: KnowledgeFamilyDiff,
    pub abbrev: KnowledgeFamilyDiff,
    pub protocol: KnowledgeFamilyDiff,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeConceptKbDiff {
    pub concepts: KnowledgeFamilyDiff,
    pub senses: KnowledgeFamilyDiff,
    pub aliases: KnowledgeFamilyDiff,
    pub relations: KnowledgeFamilyDiff,
    pub review_items: KnowledgeFamilyDiff,
    pub topic_links: KnowledgeFamilyDiff,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeTopicGraphDiff {
    pub nodes: KnowledgeFamilyDiff,
    pub edges: KnowledgeFamilyDiff,
    pub review_items: KnowledgeFamilyDiff,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeCheckpointDiff {
    pub tag_vocabulary: KnowledgeTagVocabularyDiff,
    pub concept_kb: KnowledgeConceptKbDiff,
    pub topic_graph: KnowledgeTopicGraphDiff,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeUserDecisionOverride {
    pub domain: String,
    pub family: String,
    pub id: String,
    pub current_decision: String,
    pub next_decision: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeCheckpointPreview {
    pub receipt_id: String,
    pub checkpoint_hash: String,
    pub diff: KnowledgeCheckpointDiff,
    pub user_decision_overrides: Vec<KnowledgeUserDecisionOverride>,
    pub captured_bases: KnowledgeCheckpointBases,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeCheckpointApplyRequest {
    pub receipt_id: String,
    pub checkpoint_hash: String,
    pub acknowledge_full_replacement: bool,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KnowledgeCheckpointApplyResult {
    pub status: String,
    pub bases: KnowledgeCheckpointBases,
}

pub trait KnowledgeCheckpointRepositoryPort: Send + Sync {
    fn capture(&self) -> Result<KnowledgeCheckpointCapture, String>;
    fn replace(&self, replacement: &KnowledgeCheckpointReplacement) -> Result<bool, String>;
}

type Clock = Arc<dyn Fn() -> String + Send + Sync>;
type ReceiptFactory = Arc<dyn Fn() -> String + Send + Sync>;

#[derive(Clone)]
struct Receipt {
    receipt_id: String,
    checkpoint: KnowledgeCheckpoint,
    captured_bases: KnowledgeCheckpointBases,
}

pub struct KnowledgeCheckpointApplication {
    repository: Arc<dyn KnowledgeCheckpointRepositoryPort>,
    now: Clock,
    create_receipt_id: ReceiptFactory,
    receipt: Mutex<Option<Receipt>>,
    admission: SingleFlightAdmission,
}

impl KnowledgeCheckpointApplication {
    pub fn new(repository: Arc<dyn KnowledgeCheckpointRepositoryPort>) -> Self {
        Self::with_runtime(
            repository,
            Arc::new(default_now),
            Arc::new(default_receipt_id),
        )
    }

    pub fn with_runtime(
        repository: Arc<dyn KnowledgeCheckpointRepositoryPort>,
        now: Clock,
        create_receipt_id: ReceiptFactory,
    ) -> Self {
        Self {
            repository,
            now,
            create_receipt_id,
            receipt: Mutex::new(None),
            admission: SingleFlightAdmission::new(),
        }
    }

    pub fn build_checkpoint(&self) -> Result<KnowledgeCheckpoint, String> {
        let _lease = self
            .admission
            .admit()
            .map_err(|error| admission_code(error, "checkpoint_busy"))?;
        let capture = self.repository.capture()?;
        checkpoint_from_capture(capture, (self.now)())
    }

    pub fn verify_checkpoint(&self, checkpoint: &KnowledgeCheckpoint) -> Result<(), String> {
        if checkpoint.contract_version != KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION
            || checkpoint.generated_at.is_empty()
            || checkpoint.counts != payload_counts(&checkpoint.payload)
            || [
                checkpoint.bases.tag_revision.as_deref(),
                checkpoint.bases.concept_manifest.as_deref(),
                checkpoint.bases.topic_graph_manifest.as_deref(),
            ]
            .into_iter()
            .flatten()
            .any(|value| !valid_hash(value))
        {
            return Err("checkpoint_basis_invalid".into());
        }
        let expected = checkpoint_hash(&checkpoint.bases, &checkpoint.payload)?;
        if expected != checkpoint.checkpoint_hash {
            return Err("checkpoint_hash_mismatch".into());
        }
        Ok(())
    }

    pub fn preview_import(
        &self,
        checkpoint: &KnowledgeCheckpoint,
    ) -> Result<KnowledgeCheckpointPreview, String> {
        let _lease = self
            .admission
            .admit()
            .map_err(|error| admission_code(error, "checkpoint_busy"))?;
        self.clear_receipt()?;
        self.verify_checkpoint(checkpoint)?;
        let current = self.repository.capture()?;
        let receipt = Receipt {
            receipt_id: (self.create_receipt_id)(),
            checkpoint: checkpoint.clone(),
            captured_bases: current.bases.clone(),
        };
        let preview = KnowledgeCheckpointPreview {
            receipt_id: receipt.receipt_id.clone(),
            checkpoint_hash: checkpoint.checkpoint_hash.clone(),
            diff: diff_payload(&current.payload, &checkpoint.payload),
            user_decision_overrides: decision_overrides(&current.payload, &checkpoint.payload),
            captured_bases: current.bases,
        };
        *self
            .receipt
            .lock()
            .map_err(|_| "checkpoint_unavailable".to_owned())? = Some(receipt);
        Ok(preview)
    }

    pub fn apply_import(
        &self,
        request: &KnowledgeCheckpointApplyRequest,
    ) -> Result<KnowledgeCheckpointApplyResult, String> {
        let _lease = self
            .admission
            .admit()
            .map_err(|error| admission_code(error, "checkpoint_busy"))?;
        let receipt = self
            .receipt
            .lock()
            .map_err(|_| "checkpoint_unavailable".to_owned())?
            .take()
            .ok_or_else(|| "receipt_invalid".to_owned())?;
        if !request.acknowledge_full_replacement {
            return Err("full_replacement_acknowledgement_required".into());
        }
        if receipt.receipt_id != request.receipt_id
            || receipt.checkpoint.checkpoint_hash != request.checkpoint_hash
        {
            return Err("receipt_invalid".into());
        }
        self.verify_checkpoint(&receipt.checkpoint)?;
        let next_bases = derived_bases(&receipt.checkpoint.payload)?;
        let committed = self.repository.replace(&KnowledgeCheckpointReplacement {
            expected_bases: receipt.captured_bases,
            next_bases: next_bases.clone(),
            payload: receipt.checkpoint.payload.clone(),
            now: (self.now)(),
        })?;
        if !committed {
            return Err("basis_superseded".into());
        }
        Ok(KnowledgeCheckpointApplyResult {
            status: "committed".into(),
            bases: next_bases,
        })
    }

    pub fn discard_import(&self, receipt_id: Option<&str>) -> Result<bool, String> {
        let _lease = self
            .admission
            .admit()
            .map_err(|error| admission_code(error, "checkpoint_busy"))?;
        let mut current = self
            .receipt
            .lock()
            .map_err(|_| "checkpoint_unavailable".to_owned())?;
        if current
            .as_ref()
            .is_none_or(|receipt| receipt_id.is_some_and(|id| receipt.receipt_id != id))
        {
            return Ok(false);
        }
        *current = None;
        Ok(true)
    }

    pub fn stop_admission(&self) {
        self.admission.stop();
        let _ = self.clear_receipt();
    }

    pub fn shutdown(&self, timeout: Duration) -> Result<(), String> {
        self.stop_admission();
        self.admission.shutdown(timeout, "checkpoint")
    }

    fn clear_receipt(&self) -> Result<(), String> {
        *self
            .receipt
            .lock()
            .map_err(|_| "checkpoint_unavailable".to_owned())? = None;
        Ok(())
    }
}

fn valid_hash(value: &str) -> bool {
    value.strip_prefix("sha256:").is_some_and(|digest| {
        digest.len() == 64
            && digest
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
    })
}

fn checkpoint_from_capture(
    capture: KnowledgeCheckpointCapture,
    generated_at: String,
) -> Result<KnowledgeCheckpoint, String> {
    let counts = payload_counts(&capture.payload);
    let checkpoint_hash = checkpoint_hash(&capture.bases, &capture.payload)?;
    Ok(KnowledgeCheckpoint {
        contract_version: KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION.into(),
        generated_at,
        bases: capture.bases,
        payload: capture.payload,
        counts,
        checkpoint_hash,
    })
}

fn checkpoint_hash(
    bases: &KnowledgeCheckpointBases,
    payload: &KnowledgeCheckpointPayload,
) -> Result<String, String> {
    canonical_json_hash(&json!({
        "contractVersion":KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION,
        "bases":bases,
        "payload":payload,
    }))
}

fn derived_bases(payload: &KnowledgeCheckpointPayload) -> Result<KnowledgeCheckpointBases, String> {
    Ok(KnowledgeCheckpointBases {
        tag_revision: Some(canonical_json_hash(&json!({
            "entries":payload.tag_vocabulary.entries,
            "aliases":payload.tag_vocabulary.aliases,
            "abbrevs":payload.tag_vocabulary.abbrevs,
            "protocols":payload.tag_vocabulary.protocols,
            "warnings":payload.tag_vocabulary.warnings,
        }))?),
        concept_manifest: Some(canonical_json_hash(&json!({
            "concepts":payload.concept_kb.concepts,
            "senses":payload.concept_kb.senses,
            "aliases":payload.concept_kb.aliases,
            "relations":payload.concept_kb.relations,
            "reviews":payload.concept_kb.reviews,
            "topicLinks":payload.concept_kb.topic_links,
        }))?),
        topic_graph_manifest: Some(canonical_json_hash(&json!({
            "nodes":payload.topic_graph.nodes,
            "edges":payload.topic_graph.edges,
            "reviews":payload.topic_graph.reviews,
        }))?),
    })
}

fn payload_counts(payload: &KnowledgeCheckpointPayload) -> KnowledgeCheckpointCounts {
    KnowledgeCheckpointCounts {
        tag_vocabulary: KnowledgeTagVocabularyCounts {
            entries: payload.tag_vocabulary.entries.len(),
            aliases: payload.tag_vocabulary.aliases.len(),
            abbrev: payload.tag_vocabulary.abbrevs.len(),
            protocol: payload.tag_vocabulary.protocols.len(),
        },
        concept_kb: KnowledgeConceptKbCounts {
            concepts: payload.concept_kb.concepts.len(),
            senses: payload.concept_kb.senses.len(),
            aliases: payload.concept_kb.aliases.len(),
            relations: payload.concept_kb.relations.len(),
            review_items: payload.concept_kb.reviews.len(),
            topic_links: payload.concept_kb.topic_links.len(),
        },
        topic_graph: KnowledgeTopicGraphCounts {
            nodes: payload.topic_graph.nodes.len(),
            edges: payload.topic_graph.edges.len(),
            review_items: payload.topic_graph.reviews.len(),
        },
    }
}

fn diff_rows<T: Serialize>(
    current_rows: &[T],
    next_rows: &[T],
    id: impl Fn(&T) -> String,
) -> KnowledgeFamilyDiff {
    let current = current_rows
        .iter()
        .map(|row| (id(row), serde_json::to_value(row).unwrap_or(Value::Null)))
        .collect::<std::collections::BTreeMap<_, _>>();
    let next = next_rows
        .iter()
        .map(|row| (id(row), serde_json::to_value(row).unwrap_or(Value::Null)))
        .collect::<std::collections::BTreeMap<_, _>>();
    KnowledgeFamilyDiff {
        added: next
            .keys()
            .filter(|key| !current.contains_key(*key))
            .count(),
        updated: next
            .iter()
            .filter(|(key, row)| current.get(*key).is_some_and(|before| before != *row))
            .count(),
        deleted: current
            .keys()
            .filter(|key| !next.contains_key(*key))
            .count(),
    }
}

fn row_changed<T: Serialize>(before: &T, after: Option<&T>) -> bool {
    after.is_none_or(|after| serde_json::to_value(before).ok() != serde_json::to_value(after).ok())
}

fn diff_payload(
    current: &KnowledgeCheckpointPayload,
    next: &KnowledgeCheckpointPayload,
) -> KnowledgeCheckpointDiff {
    KnowledgeCheckpointDiff {
        tag_vocabulary: KnowledgeTagVocabularyDiff {
            entries: diff_rows(
                &current.tag_vocabulary.entries,
                &next.tag_vocabulary.entries,
                |row| row.tag.clone(),
            ),
            aliases: diff_rows(
                &current.tag_vocabulary.aliases,
                &next.tag_vocabulary.aliases,
                |row| row.alias.clone(),
            ),
            abbrev: diff_rows(
                &current.tag_vocabulary.abbrevs,
                &next.tag_vocabulary.abbrevs,
                |row| row.abbrev_key.clone(),
            ),
            protocol: diff_rows(
                &current.tag_vocabulary.protocols,
                &next.tag_vocabulary.protocols,
                |row| row.protocol_id.clone(),
            ),
        },
        concept_kb: KnowledgeConceptKbDiff {
            concepts: diff_rows(
                &current.concept_kb.concepts,
                &next.concept_kb.concepts,
                |row| row.concept_id.clone(),
            ),
            senses: diff_rows(&current.concept_kb.senses, &next.concept_kb.senses, |row| {
                row.sense_id.clone()
            }),
            aliases: diff_rows(
                &current.concept_kb.aliases,
                &next.concept_kb.aliases,
                |row| row.alias_id.clone(),
            ),
            relations: diff_rows(
                &current.concept_kb.relations,
                &next.concept_kb.relations,
                |row| row.relation_id.clone(),
            ),
            review_items: diff_rows(
                &current.concept_kb.reviews,
                &next.concept_kb.reviews,
                |row| row.review_id.clone(),
            ),
            topic_links: diff_rows(
                &current.concept_kb.topic_links,
                &next.concept_kb.topic_links,
                |row| format!("{}\n{}\n{}", row.topic_id, row.concept_id, row.sense_id),
            ),
        },
        topic_graph: KnowledgeTopicGraphDiff {
            nodes: diff_rows(&current.topic_graph.nodes, &next.topic_graph.nodes, |row| {
                row.topic_id.clone()
            }),
            edges: diff_rows(&current.topic_graph.edges, &next.topic_graph.edges, |row| {
                row.edge_id.clone()
            }),
            review_items: diff_rows(
                &current.topic_graph.reviews,
                &next.topic_graph.reviews,
                |row| row.review_id.clone(),
            ),
        },
    }
}

fn decision_overrides(
    current: &KnowledgeCheckpointPayload,
    next: &KnowledgeCheckpointPayload,
) -> Vec<KnowledgeUserDecisionOverride> {
    let mut overrides = Vec::new();
    for before in &current.tag_vocabulary.entries {
        let after = next
            .tag_vocabulary
            .entries
            .iter()
            .find(|row| row.tag == before.tag);
        if row_changed(before, after) {
            overrides.push(KnowledgeUserDecisionOverride {
                domain: "tagVocabulary".into(),
                family: "entries".into(),
                id: before.tag.clone(),
                current_decision: "active_entry".into(),
                next_decision: after.map(|_| "active_entry".into()),
            });
        }
    }
    for before in &current.concept_kb.relations {
        let after = next
            .concept_kb
            .relations
            .iter()
            .find(|row| row.relation_id == before.relation_id);
        if ["confirmed", "rejected"].contains(&before.status.as_str()) && row_changed(before, after)
        {
            overrides.push(KnowledgeUserDecisionOverride {
                domain: "conceptKb".into(),
                family: "relations".into(),
                id: before.relation_id.clone(),
                current_decision: before.status.clone(),
                next_decision: after.map(|row| row.status.clone()),
            });
        }
    }
    for before in &current.concept_kb.reviews {
        let after = next
            .concept_kb
            .reviews
            .iter()
            .find(|row| row.review_id == before.review_id);
        if ["approved", "merged", "rejected"].contains(&before.status.as_str())
            && row_changed(before, after)
        {
            overrides.push(KnowledgeUserDecisionOverride {
                domain: "conceptKb".into(),
                family: "reviewItems".into(),
                id: before.review_id.clone(),
                current_decision: before.status.clone(),
                next_decision: after.map(|row| row.status.clone()),
            });
        }
    }
    for before in &current.concept_kb.topic_links {
        let id = format!(
            "{}\n{}\n{}",
            before.topic_id, before.concept_id, before.sense_id
        );
        let after = next.concept_kb.topic_links.iter().find(|row| {
            row.topic_id == before.topic_id
                && row.concept_id == before.concept_id
                && row.sense_id == before.sense_id
        });
        if before.source == "manual" && row_changed(before, after) {
            overrides.push(KnowledgeUserDecisionOverride {
                domain: "conceptKb".into(),
                family: "topicLinks".into(),
                id,
                current_decision: "manual".into(),
                next_decision: after.map(|row| row.source.clone()),
            });
        }
    }
    for before in &current.topic_graph.edges {
        let after = next
            .topic_graph
            .edges
            .iter()
            .find(|row| row.edge_id == before.edge_id);
        if ["confirmed", "rejected"].contains(&before.status.as_str()) && row_changed(before, after)
        {
            overrides.push(KnowledgeUserDecisionOverride {
                domain: "topicGraph".into(),
                family: "edges".into(),
                id: before.edge_id.clone(),
                current_decision: before.status.clone(),
                next_decision: after.map(|row| row.status.clone()),
            });
        }
    }
    for before in &current.topic_graph.reviews {
        let after = next
            .topic_graph
            .reviews
            .iter()
            .find(|row| row.review_id == before.review_id);
        if ["approved", "rejected", "deleted"].contains(&before.status.as_str())
            && row_changed(before, after)
        {
            overrides.push(KnowledgeUserDecisionOverride {
                domain: "topicGraph".into(),
                family: "reviewItems".into(),
                id: before.review_id.clone(),
                current_decision: before.status.clone(),
                next_decision: after.map(|row| row.status.clone()),
            });
        }
    }
    overrides.sort_by(|left, right| {
        (&left.domain, &left.family, &left.id).cmp(&(&right.domain, &right.family, &right.id))
    });
    overrides
}

fn admission_code(error: AdmissionError, busy: &str) -> String {
    match error {
        AdmissionError::Busy => busy.into(),
        AdmissionError::Stopping => "stopping".into(),
        AdmissionError::Unavailable => "checkpoint_unavailable".into(),
    }
}

fn default_now() -> String {
    synthesis_protocol::utc_now_iso8601()
}

fn default_receipt_id() -> String {
    format!("receipt:{}", default_now())
}

#[cfg(test)]
mod tests {
    use super::*;
    use synthesis_repository::{
        ConceptApplicationStateRecord, ConceptKbReplacement, TagApplicationStateRecord,
        TagVocabularyEntryRecord, TagVocabularyReplacement, TopicGraphApplicationStateRecord,
        TopicGraphReplacement,
    };

    struct MemoryRepository {
        capture: Mutex<KnowledgeCheckpointCapture>,
    }

    impl KnowledgeCheckpointRepositoryPort for MemoryRepository {
        fn capture(&self) -> Result<KnowledgeCheckpointCapture, String> {
            Ok(self.capture.lock().expect("capture").clone())
        }

        fn replace(&self, replacement: &KnowledgeCheckpointReplacement) -> Result<bool, String> {
            let mut capture = self.capture.lock().expect("capture");
            if capture.bases != replacement.expected_bases {
                return Ok(false);
            }
            capture.bases = replacement.next_bases.clone();
            capture.payload = replacement.payload.clone();
            Ok(true)
        }
    }

    fn capture() -> KnowledgeCheckpointCapture {
        KnowledgeCheckpointCapture {
            bases: KnowledgeCheckpointBases {
                tag_revision: Some(format!("sha256:{}", "1".repeat(64))),
                concept_manifest: Some(format!("sha256:{}", "2".repeat(64))),
                topic_graph_manifest: Some(format!("sha256:{}", "3".repeat(64))),
            },
            payload: KnowledgeCheckpointPayload {
                tag_vocabulary: TagVocabularyReplacement {
                    state: TagApplicationStateRecord {
                        singleton_id: 1,
                        vocabulary_hash: "tag-one".into(),
                        ..TagApplicationStateRecord::default()
                    },
                    ..TagVocabularyReplacement::default()
                },
                concept_kb: ConceptKbReplacement {
                    state: ConceptApplicationStateRecord {
                        singleton_id: 1,
                        manifest_hash: "concept-one".into(),
                        ..ConceptApplicationStateRecord::default()
                    },
                    ..ConceptKbReplacement::default()
                },
                topic_graph: TopicGraphReplacement {
                    state: TopicGraphApplicationStateRecord {
                        singleton_id: 1,
                        manifest_hash: "graph-one".into(),
                        ..TopicGraphApplicationStateRecord::default()
                    },
                    ..TopicGraphReplacement::default()
                },
            },
        }
    }

    #[test]
    fn build_preview_apply_and_single_use_receipt_are_typed() {
        let repository = Arc::new(MemoryRepository {
            capture: Mutex::new(capture()),
        });
        let application = KnowledgeCheckpointApplication::with_runtime(
            repository,
            Arc::new(|| "2026-07-26T00:00:00.000Z".into()),
            Arc::new(|| "receipt:fixed".into()),
        );
        let checkpoint = application.build_checkpoint().expect("build");
        let preview = application.preview_import(&checkpoint).expect("preview");
        assert_eq!(
            application
                .apply_import(&KnowledgeCheckpointApplyRequest {
                    receipt_id: preview.receipt_id,
                    checkpoint_hash: checkpoint.checkpoint_hash.clone(),
                    acknowledge_full_replacement: false,
                })
                .expect_err("acknowledgement"),
            "full_replacement_acknowledgement_required"
        );
        let preview = application
            .preview_import(&checkpoint)
            .expect("second preview");
        let result = application
            .apply_import(&KnowledgeCheckpointApplyRequest {
                receipt_id: preview.receipt_id.clone(),
                checkpoint_hash: checkpoint.checkpoint_hash.clone(),
                acknowledge_full_replacement: true,
            })
            .expect("apply");
        assert_eq!(result.status, "committed");
        assert_eq!(
            application
                .apply_import(&KnowledgeCheckpointApplyRequest {
                    receipt_id: preview.receipt_id,
                    checkpoint_hash: checkpoint.checkpoint_hash,
                    acknowledge_full_replacement: true,
                })
                .expect_err("single use"),
            "receipt_invalid"
        );
    }

    #[test]
    fn verification_rejects_counts_and_basis_drift_outside_the_checkpoint_hash() {
        let repository = Arc::new(MemoryRepository {
            capture: Mutex::new(capture()),
        });
        let application = KnowledgeCheckpointApplication::with_runtime(
            repository,
            Arc::new(|| "2026-07-26T00:00:00.000Z".into()),
            Arc::new(|| "receipt:fixed".into()),
        );
        let mut checkpoint = application.build_checkpoint().expect("build");
        checkpoint.counts.concept_kb.concepts += 1;
        assert_eq!(
            application
                .verify_checkpoint(&checkpoint)
                .expect_err("counts"),
            "checkpoint_basis_invalid"
        );
        checkpoint.counts.concept_kb.concepts -= 1;
        checkpoint.bases.tag_revision = Some("not-a-hash".into());
        assert_eq!(
            application
                .verify_checkpoint(&checkpoint)
                .expect_err("basis"),
            "checkpoint_basis_invalid"
        );
    }

    #[test]
    fn preview_diff_and_user_decisions_match_the_nested_public_contract() {
        let mut current = capture();
        current
            .payload
            .tag_vocabulary
            .entries
            .push(TagVocabularyEntryRecord {
                tag: "method:review".into(),
                ..TagVocabularyEntryRecord::default()
            });
        let repository = Arc::new(MemoryRepository {
            capture: Mutex::new(current),
        });
        let application = KnowledgeCheckpointApplication::with_runtime(
            repository,
            Arc::new(|| "2026-07-26T00:00:00.000Z".into()),
            Arc::new(|| "receipt:fixed".into()),
        );
        let mut replacement = application.build_checkpoint().expect("build");
        replacement.payload.tag_vocabulary.entries.clear();
        replacement.counts = payload_counts(&replacement.payload);
        replacement.checkpoint_hash =
            checkpoint_hash(&replacement.bases, &replacement.payload).expect("hash");

        let preview = application.preview_import(&replacement).expect("preview");
        assert_eq!(preview.diff.tag_vocabulary.entries.deleted, 1);
        assert_eq!(
            preview.user_decision_overrides,
            vec![KnowledgeUserDecisionOverride {
                domain: "tagVocabulary".into(),
                family: "entries".into(),
                id: "method:review".into(),
                current_decision: "active_entry".into(),
                next_decision: None,
            }]
        );
    }
}
