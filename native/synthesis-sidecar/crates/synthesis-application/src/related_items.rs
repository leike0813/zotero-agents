use crate::ports::RelatedItemsRepositoryPort;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
use std::sync::Arc;
use synthesis_canonical_store::canonical_json_hash;
use synthesis_protocol::utc_now_iso8601;
use synthesis_repository::{OperationRecord, RelatedItemsSyncEffectRecord};

const HOST_BATCH_MAX: usize = 25;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedItemsHostEffect {
    pub effect_id: String,
    pub action: String,
    pub source: RelatedItemsHostItemRef,
    pub target: RelatedItemsHostItemRef,
    pub provenance: RelatedItemsHostProvenance,
    pub permission: RelatedItemsHostPermission,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedItemsHostItemRef {
    pub library_id: i64,
    pub item_key: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedItemsHostProvenance {
    pub citation_edge_id: String,
    pub kind: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct RelatedItemsHostPermission {
    pub scope: String,
    pub reason: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct RelatedItemsHostReceipt {
    pub effect_id: String,
    pub action: String,
    pub status: String,
    pub occurred_at: String,
    pub diagnostics: Vec<Value>,
}

pub trait RelatedItemsHostEffectPort: Send + Sync {
    fn apply_batch(
        &self,
        effects: &[RelatedItemsHostEffect],
    ) -> Result<Vec<RelatedItemsHostReceipt>, String>;
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedItemsSyncSummary {
    pub operation_id: String,
    pub processed: usize,
    pub added: usize,
    pub existing: usize,
    pub skipped: usize,
    pub revoked: usize,
    pub failed: usize,
    pub diagnostics: Vec<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct EffectPayload {
    effect_id: String,
    operation_id: String,
    citation_edge_id: String,
    source_literature_item_id: String,
    target_literature_item_id: String,
    source_library_id: i64,
    source_item_key: String,
    target_library_id: i64,
    target_item_key: String,
    action: String,
    status: String,
    created_by_synthesis: bool,
    graph_hash: String,
    external_write_at: String,
    echo_state: String,
    #[serde(default)]
    echo_observed_at: String,
    diagnostics: Vec<Value>,
    created_at: String,
    updated_at: String,
}

struct EffectPlan {
    effect: RelatedItemsHostEffect,
    pending: EffectPayload,
    prior: Option<EffectPayload>,
    recovering_pending: bool,
}

pub struct RelatedItemsApplication {
    repository: Arc<dyn RelatedItemsRepositoryPort>,
    host: Arc<dyn RelatedItemsHostEffectPort>,
    library_id: i64,
}

impl RelatedItemsApplication {
    pub fn new(
        repository: Arc<dyn RelatedItemsRepositoryPort>,
        host: Arc<dyn RelatedItemsHostEffectPort>,
        library_id: i64,
    ) -> Self {
        Self {
            repository,
            host,
            library_id,
        }
    }

    pub fn sync(&self, source_refs: &[String], graph_hash: &str) -> RelatedItemsSyncSummary {
        self.try_sync(source_refs, graph_hash)
            .unwrap_or_else(|code| {
                let now = utc_now_iso8601();
                let operation_id = format!("related-items-sync:{now}");
                let diagnostics = vec![code];
                let _ = self.repository.upsert_operation(&operation_record(
                    &operation_id,
                    self.library_id,
                    source_refs,
                    "failed",
                    &RelatedItemsSyncSummary {
                        failed: 1,
                        diagnostics: diagnostics.clone(),
                        ..RelatedItemsSyncSummary::default()
                    },
                    0,
                    &now,
                ));
                RelatedItemsSyncSummary {
                    operation_id,
                    failed: 1,
                    diagnostics,
                    ..RelatedItemsSyncSummary::default()
                }
            })
    }

    fn try_sync(
        &self,
        source_refs: &[String],
        graph_hash: &str,
    ) -> Result<RelatedItemsSyncSummary, String> {
        let mut source_refs = source_refs
            .iter()
            .filter(|value| !value.trim().is_empty())
            .cloned()
            .collect::<Vec<_>>();
        source_refs.sort();
        source_refs.dedup();
        let now = utc_now_iso8601();
        let operation_id = format!("related-items-sync:{now}");
        let edges = self.repository.list_accepted_edges(&source_refs)?;
        let existing_rows = self.repository.list_effects()?;
        let mut existing = BTreeMap::new();
        for row in existing_rows {
            let payload: EffectPayload = serde_json::from_str(&row.payload_json)
                .map_err(|_| "related_items_effect_invalid".to_owned())?;
            existing.insert(payload.effect_id.clone(), payload);
        }
        let active_edge_ids = edges
            .iter()
            .map(|edge| edge.edge_id.clone())
            .collect::<BTreeSet<_>>();
        let scoped = source_refs.iter().cloned().collect::<BTreeSet<_>>();
        let basis_hash = if graph_hash.is_empty() {
            canonical_json_hash(
                &json!({"kind":"related-items-sync-input","sourceRefs":source_refs,"edges":active_edge_ids}),
            )?
        } else {
            graph_hash.into()
        };
        let mut plans = Vec::new();
        for edge in edges {
            let effect_id = deterministic_effect_id(&edge.edge_id);
            let prior = existing.get(&effect_id).cloned();
            let pending = EffectPayload {
                effect_id: effect_id.clone(),
                operation_id: operation_id.clone(),
                citation_edge_id: edge.edge_id.clone(),
                source_literature_item_id: edge.source_literature_item_id.clone(),
                target_literature_item_id: edge.target_literature_item_id.clone(),
                source_library_id: edge.source_library_id,
                source_item_key: edge.source_item_key.clone(),
                target_library_id: edge.target_library_id,
                target_item_key: edge.target_item_key.clone(),
                action: "add".into(),
                status: "pending_external_write".into(),
                created_by_synthesis: prior.as_ref().is_some_and(|row| row.created_by_synthesis),
                graph_hash: basis_hash.clone(),
                external_write_at: now.clone(),
                echo_state: "awaiting_echo".into(),
                echo_observed_at: prior
                    .as_ref()
                    .map(|row| row.echo_observed_at.clone())
                    .unwrap_or_default(),
                diagnostics: prior
                    .as_ref()
                    .map(|row| row.diagnostics.clone())
                    .unwrap_or_default(),
                created_at: prior
                    .as_ref()
                    .map(|row| row.created_at.clone())
                    .unwrap_or_else(|| now.clone()),
                updated_at: now.clone(),
            };
            plans.push(EffectPlan {
                effect: host_effect(&pending, "ensure_present"),
                recovering_pending: prior
                    .as_ref()
                    .is_some_and(|row| row.status == "pending_external_write"),
                prior,
                pending,
            });
        }
        for prior in existing.into_values().filter(|row| {
            row.created_by_synthesis
                && matches!(row.status.as_str(), "applied" | "pending_external_write")
                && (scoped.is_empty() || scoped.contains(&row.source_literature_item_id))
                && !active_edge_ids.contains(&row.citation_edge_id)
        }) {
            let mut pending = prior.clone();
            pending.operation_id = operation_id.clone();
            pending.action = "revoke".into();
            pending.status = "pending_external_write".into();
            pending.graph_hash = basis_hash.clone();
            pending.external_write_at = now.clone();
            pending.echo_state = "awaiting_echo".into();
            pending.updated_at = now.clone();
            plans.push(EffectPlan {
                effect: host_effect(&pending, "ensure_absent"),
                recovering_pending: prior.status == "pending_external_write",
                prior: Some(prior),
                pending,
            });
        }
        plans.sort_by(|left, right| left.effect.effect_id.cmp(&right.effect.effect_id));
        let mut summary = RelatedItemsSyncSummary {
            operation_id: operation_id.clone(),
            ..RelatedItemsSyncSummary::default()
        };
        self.repository.upsert_operation(&operation_record(
            &operation_id,
            self.library_id,
            &source_refs,
            "running",
            &summary,
            plans.len(),
            &now,
        ))?;
        for batch in plans.chunks(HOST_BATCH_MAX) {
            for plan in batch {
                self.persist(&plan.pending)?;
            }
            let receipts = match self.host.apply_batch(
                &batch
                    .iter()
                    .map(|plan| plan.effect.clone())
                    .collect::<Vec<_>>(),
            ) {
                Ok(receipts) => receipts,
                Err(_) => {
                    summary.failed += batch.len();
                    summary
                        .diagnostics
                        .push("related_items_host_batch_failed".into());
                    break;
                }
            };
            if !exact_receipts(batch, &receipts) {
                summary.failed += batch.len();
                summary
                    .diagnostics
                    .push("related_items_host_batch_invalid".into());
                break;
            }
            let plans_by_id = batch
                .iter()
                .map(|plan| (plan.effect.effect_id.as_str(), plan))
                .collect::<BTreeMap<_, _>>();
            for receipt in receipts {
                let plan = plans_by_id[receipt.effect_id.as_str()];
                let mut current = self
                    .repository
                    .get_effect(&receipt.effect_id)?
                    .map(|row| serde_json::from_str::<EffectPayload>(&row.payload_json))
                    .transpose()
                    .map_err(|_| "related_items_effect_invalid".to_owned())?
                    .unwrap_or_else(|| plan.pending.clone());
                let echo_observed = current.echo_state == "observed";
                current.operation_id = operation_id.clone();
                current.action = if receipt.action == "ensure_present" {
                    "add"
                } else {
                    "revoke"
                }
                .into();
                current.updated_at = receipt.occurred_at.clone();
                current.diagnostics.extend(receipt.diagnostics);
                match receipt.status.as_str() {
                    "applied" => {
                        current.external_write_at = receipt.occurred_at;
                        current.echo_state = if echo_observed {
                            "observed"
                        } else {
                            "awaiting_echo"
                        }
                        .into();
                        if current.action == "add" {
                            current.status = "applied".into();
                            current.created_by_synthesis = true;
                            summary.added += 1;
                        } else {
                            current.status = "revoked".into();
                            current.created_by_synthesis = true;
                            summary.revoked += 1;
                        }
                    }
                    "already_satisfied" => {
                        current.echo_state = "observed".into();
                        if current.echo_observed_at.is_empty() {
                            current.echo_observed_at = receipt.occurred_at;
                        }
                        if current.action == "add" {
                            summary.existing += 1;
                            if plan.recovering_pending
                                || plan
                                    .prior
                                    .as_ref()
                                    .is_some_and(|row| row.created_by_synthesis)
                            {
                                current.status = "applied".into();
                                current.created_by_synthesis = true;
                            } else {
                                current.status = "already_existed".into();
                                current.created_by_synthesis = false;
                                current.external_write_at.clear();
                            }
                        } else {
                            current.status = "already_absent".into();
                            current.created_by_synthesis = true;
                            summary.skipped += 1;
                        }
                    }
                    "not_found" => {
                        current.status = "needs_attention".into();
                        summary.failed += 1;
                    }
                    "failed" => {
                        current.status = "failed".into();
                        summary.failed += 1;
                    }
                    _ => unreachable!("receipt validation owns status"),
                }
                self.persist(&current)?;
                summary.processed += 1;
            }
        }
        let completed = utc_now_iso8601();
        self.repository.upsert_operation(&operation_record(
            &operation_id,
            self.library_id,
            &source_refs,
            if summary.failed == 0 {
                "completed"
            } else {
                "failed"
            },
            &summary,
            plans.len(),
            &completed,
        ))?;
        Ok(summary)
    }

    fn persist(&self, payload: &EffectPayload) -> Result<(), String> {
        self.repository
            .upsert_effect(&RelatedItemsSyncEffectRecord {
                effect_id: payload.effect_id.clone(),
                payload_json: serde_json::to_string(payload)
                    .map_err(|_| "related_items_effect_invalid".to_owned())?,
                updated_at: payload.updated_at.clone(),
            })
    }
}

fn deterministic_effect_id(edge_id: &str) -> String {
    let safe = edge_id
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || "-_.".contains(character) {
                character
            } else {
                '_'
            }
        })
        .collect::<String>();
    format!("related-items:{safe}")
}

fn host_effect(payload: &EffectPayload, action: &str) -> RelatedItemsHostEffect {
    let present = action == "ensure_present";
    RelatedItemsHostEffect {
        effect_id: payload.effect_id.clone(),
        action: action.into(),
        source: RelatedItemsHostItemRef {
            library_id: payload.source_library_id,
            item_key: payload.source_item_key.clone(),
        },
        target: RelatedItemsHostItemRef {
            library_id: payload.target_library_id,
            item_key: payload.target_item_key.clone(),
        },
        provenance: RelatedItemsHostProvenance {
            citation_edge_id: payload.citation_edge_id.clone(),
            kind: if present {
                "accepted_citation"
            } else {
                "synthesis_created_relation"
            }
            .into(),
        },
        permission: RelatedItemsHostPermission {
            scope: "synthesis.related_items".into(),
            reason: if present {
                "accepted_citation"
            } else {
                "revoke_synthesis_effect"
            }
            .into(),
        },
    }
}

fn exact_receipts(plans: &[EffectPlan], receipts: &[RelatedItemsHostReceipt]) -> bool {
    if plans.len() != receipts.len() {
        return false;
    }
    let expected = plans
        .iter()
        .map(|plan| (plan.effect.effect_id.as_str(), plan.effect.action.as_str()))
        .collect::<BTreeMap<_, _>>();
    let mut seen = BTreeSet::new();
    receipts.iter().all(|receipt| {
        expected.get(receipt.effect_id.as_str()) == Some(&receipt.action.as_str())
            && seen.insert(receipt.effect_id.as_str())
            && matches!(
                receipt.status.as_str(),
                "applied" | "already_satisfied" | "not_found" | "failed"
            )
            && synthesis_protocol::unix_millis_from_utc_iso8601(&receipt.occurred_at).is_some()
            && receipt.diagnostics.len() <= 20
            && receipt.diagnostics.iter().all(Value::is_object)
    })
}

fn operation_record(
    operation_id: &str,
    library_id: i64,
    source_refs: &[String],
    status: &str,
    summary: &RelatedItemsSyncSummary,
    total: usize,
    now: &str,
) -> OperationRecord {
    OperationRecord {
        operation_id: operation_id.into(),
        operation_type: "related_items_sync".into(),
        library_id,
        scope_kind: if source_refs.is_empty() {
            "library"
        } else {
            "source_ref"
        }
        .into(),
        scope_ref: if source_refs.is_empty() {
            library_id.to_string()
        } else {
            source_refs.join(",")
        },
        status: status.into(),
        label: "Related items sync".into(),
        phase: if status == "running" {
            "apply"
        } else if status == "completed" {
            "complete"
        } else {
            "failed"
        }
        .into(),
        phase_label: if status == "completed" {
            "Complete"
        } else if status == "failed" {
            "Failed"
        } else {
            "Apply related-items changes"
        }
        .into(),
        progress_mode: "determinate".into(),
        processed_count: summary.processed as i64,
        skipped_count: summary.skipped as i64,
        failed_count: summary.failed as i64,
        total_count: total as i64,
        diagnostics_json: serde_json::to_string(&summary.diagnostics)
            .unwrap_or_else(|_| "[]".into()),
        created_at: now.into(),
        started_at: now.into(),
        completed_at: if matches!(status, "completed" | "failed") {
            now.into()
        } else {
            String::new()
        },
        updated_at: now.into(),
        ..OperationRecord::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;
    use synthesis_repository::RelatedItemsAcceptedEdgeRecord;

    #[derive(Default)]
    struct Repository {
        edges: Vec<RelatedItemsAcceptedEdgeRecord>,
        effects: Mutex<BTreeMap<String, RelatedItemsSyncEffectRecord>>,
        operations: Mutex<Vec<OperationRecord>>,
    }

    impl RelatedItemsRepositoryPort for Repository {
        fn list_accepted_edges(
            &self,
            source_refs: &[String],
        ) -> Result<Vec<RelatedItemsAcceptedEdgeRecord>, String> {
            Ok(self
                .edges
                .iter()
                .filter(|edge| {
                    source_refs.is_empty() || source_refs.contains(&edge.source_literature_item_id)
                })
                .cloned()
                .collect())
        }

        fn list_effects(&self) -> Result<Vec<RelatedItemsSyncEffectRecord>, String> {
            Ok(self.effects.lock().unwrap().values().cloned().collect())
        }

        fn get_effect(
            &self,
            effect_id: &str,
        ) -> Result<Option<RelatedItemsSyncEffectRecord>, String> {
            Ok(self.effects.lock().unwrap().get(effect_id).cloned())
        }

        fn upsert_effect(&self, record: &RelatedItemsSyncEffectRecord) -> Result<(), String> {
            self.effects
                .lock()
                .unwrap()
                .insert(record.effect_id.clone(), record.clone());
            Ok(())
        }

        fn upsert_operation(&self, record: &OperationRecord) -> Result<(), String> {
            self.operations.lock().unwrap().push(record.clone());
            Ok(())
        }
    }

    struct Host {
        repository: Arc<Repository>,
        calls: Mutex<Vec<usize>>,
        fail: bool,
        malformed: bool,
        statuses: Vec<String>,
        observe_echo: bool,
    }

    impl RelatedItemsHostEffectPort for Host {
        fn apply_batch(
            &self,
            effects: &[RelatedItemsHostEffect],
        ) -> Result<Vec<RelatedItemsHostReceipt>, String> {
            self.calls.lock().unwrap().push(effects.len());
            assert!(effects.iter().all(|effect| {
                self.repository
                    .effects
                    .lock()
                    .unwrap()
                    .get(&effect.effect_id)
                    .is_some_and(|row| row.payload_json.contains("pending_external_write"))
            }));
            if self.fail {
                return Err("host_unavailable".into());
            }
            if self.observe_echo {
                let effect = &effects[0];
                let mut records = self.repository.effects.lock().unwrap();
                let row = records.get_mut(&effect.effect_id).unwrap();
                let mut payload: Value = serde_json::from_str(&row.payload_json).unwrap();
                payload["echoState"] = json!("observed");
                payload["echoObservedAt"] = json!("2026-08-12T00:00:00.000Z");
                row.payload_json = serde_json::to_string(&payload).unwrap();
            }
            let mut receipts = effects
                .iter()
                .enumerate()
                .map(|(index, effect)| RelatedItemsHostReceipt {
                    effect_id: effect.effect_id.clone(),
                    action: effect.action.clone(),
                    status: self
                        .statuses
                        .get(index)
                        .cloned()
                        .unwrap_or_else(|| "applied".into()),
                    occurred_at: "2026-08-12T00:00:01.000Z".into(),
                    diagnostics: Vec::new(),
                })
                .collect::<Vec<_>>();
            if self.malformed {
                receipts.pop();
            }
            Ok(receipts)
        }
    }

    fn edge(index: usize) -> RelatedItemsAcceptedEdgeRecord {
        RelatedItemsAcceptedEdgeRecord {
            edge_id: format!("edge:{index}"),
            source_literature_item_id: format!("1:S{index:07}"),
            target_literature_item_id: format!("1:T{index:07}"),
            source_library_id: 1,
            source_item_key: format!("S{index:07}"),
            target_library_id: 1,
            target_item_key: format!("T{index:07}"),
        }
    }

    #[test]
    fn persists_each_batch_before_host_and_stops_after_transport_failure() {
        let repository = Arc::new(Repository {
            edges: (0..26).map(edge).collect(),
            ..Repository::default()
        });
        let host = Arc::new(Host {
            repository: repository.clone(),
            calls: Mutex::new(Vec::new()),
            fail: true,
            malformed: false,
            statuses: Vec::new(),
            observe_echo: false,
        });
        let application = RelatedItemsApplication::new(repository.clone(), host.clone(), 1);
        let summary = application.sync(&[], "sha256:graph");
        assert_eq!(*host.calls.lock().unwrap(), vec![25]);
        assert_eq!(repository.effects.lock().unwrap().len(), 25);
        assert_eq!(summary.failed, 25);
        assert!(
            repository
                .effects
                .lock()
                .unwrap()
                .values()
                .all(|row| row.payload_json.contains("pending_external_write"))
        );
    }

    #[test]
    fn coordinates_mixed_receipts_and_preserves_an_early_echo() {
        let repository = Arc::new(Repository {
            edges: (0..3).map(edge).collect(),
            ..Repository::default()
        });
        let host = Arc::new(Host {
            repository: repository.clone(),
            calls: Mutex::new(Vec::new()),
            fail: false,
            malformed: false,
            statuses: vec![
                "applied".into(),
                "already_satisfied".into(),
                "not_found".into(),
            ],
            observe_echo: true,
        });
        let application = RelatedItemsApplication::new(repository.clone(), host, 1);
        let summary = application.sync(&[], "sha256:graph");
        assert_eq!(summary.processed, 3);
        assert_eq!(summary.added, 1);
        assert_eq!(summary.existing, 1);
        assert_eq!(summary.failed, 1);
        let payloads = repository
            .effects
            .lock()
            .unwrap()
            .values()
            .map(|row| serde_json::from_str::<EffectPayload>(&row.payload_json).unwrap())
            .collect::<Vec<_>>();
        assert!(
            payloads
                .iter()
                .any(|payload| payload.status == "applied" && payload.echo_state == "observed")
        );
        assert!(payloads.iter().any(|payload| payload.status == "already_existed" && !payload.created_by_synthesis));
        assert!(
            payloads
                .iter()
                .any(|payload| payload.status == "needs_attention")
        );
    }

    #[test]
    fn malformed_receipt_keeps_the_batch_pending_and_stops_later_batches() {
        let repository = Arc::new(Repository {
            edges: (0..26).map(edge).collect(),
            ..Repository::default()
        });
        let host = Arc::new(Host {
            repository: repository.clone(),
            calls: Mutex::new(Vec::new()),
            fail: false,
            malformed: true,
            statuses: Vec::new(),
            observe_echo: false,
        });
        let application = RelatedItemsApplication::new(repository.clone(), host.clone(), 1);
        let summary = application.sync(&[], "sha256:graph");
        assert_eq!(*host.calls.lock().unwrap(), vec![25]);
        assert_eq!(summary.failed, 25);
        assert_eq!(repository.effects.lock().unwrap().len(), 25);
        assert!(
            repository
                .effects
                .lock()
                .unwrap()
                .values()
                .all(|row| { row.payload_json.contains("pending_external_write") })
        );
    }

    #[test]
    fn retry_owns_pending_add_and_revoke_protects_preexisting_relations() {
        let pending = EffectPayload {
            effect_id: deterministic_effect_id("edge:0"),
            operation_id: "prior".into(),
            citation_edge_id: "edge:0".into(),
            source_literature_item_id: "1:S0000000".into(),
            target_literature_item_id: "1:T0000000".into(),
            source_library_id: 1,
            source_item_key: "S0000000".into(),
            target_library_id: 1,
            target_item_key: "T0000000".into(),
            action: "add".into(),
            status: "pending_external_write".into(),
            created_by_synthesis: false,
            graph_hash: "sha256:old".into(),
            external_write_at: "2026-08-12T00:00:00.000Z".into(),
            echo_state: "awaiting_echo".into(),
            echo_observed_at: String::new(),
            diagnostics: Vec::new(),
            created_at: "2026-08-12T00:00:00.000Z".into(),
            updated_at: "2026-08-12T00:00:00.000Z".into(),
        };
        let mut owned_stale = pending.clone();
        owned_stale.effect_id = deterministic_effect_id("edge:1");
        owned_stale.citation_edge_id = "edge:1".into();
        owned_stale.source_literature_item_id = "1:S0000001".into();
        owned_stale.target_literature_item_id = "1:T0000001".into();
        owned_stale.source_item_key = "S0000001".into();
        owned_stale.target_item_key = "T0000001".into();
        owned_stale.status = "applied".into();
        owned_stale.created_by_synthesis = true;
        let mut preexisting_stale = owned_stale.clone();
        preexisting_stale.effect_id = deterministic_effect_id("edge:2");
        preexisting_stale.citation_edge_id = "edge:2".into();
        preexisting_stale.status = "already_existed".into();
        preexisting_stale.created_by_synthesis = false;
        let effects = [pending, owned_stale, preexisting_stale]
            .into_iter()
            .map(|payload| {
                (
                    payload.effect_id.clone(),
                    RelatedItemsSyncEffectRecord {
                        effect_id: payload.effect_id.clone(),
                        payload_json: serde_json::to_string(&payload).unwrap(),
                        updated_at: payload.updated_at.clone(),
                    },
                )
            })
            .collect();
        let repository = Arc::new(Repository {
            edges: vec![edge(0)],
            effects: Mutex::new(effects),
            ..Repository::default()
        });
        let host = Arc::new(Host {
            repository: repository.clone(),
            calls: Mutex::new(Vec::new()),
            fail: false,
            malformed: false,
            statuses: vec!["already_satisfied".into(), "applied".into()],
            observe_echo: false,
        });
        let summary = RelatedItemsApplication::new(repository.clone(), host.clone(), 1)
            .sync(&[], "sha256:new");
        assert_eq!(*host.calls.lock().unwrap(), vec![2]);
        assert_eq!(summary.existing, 1);
        assert_eq!(summary.revoked, 1);
        let payloads = repository
            .effects
            .lock()
            .unwrap()
            .values()
            .map(|row| serde_json::from_str::<EffectPayload>(&row.payload_json).unwrap())
            .collect::<Vec<_>>();
        assert!(payloads.iter().any(|payload| {
            payload.citation_edge_id == "edge:0"
                && payload.status == "applied"
                && payload.created_by_synthesis
        }));
        assert!(payloads.iter().any(|payload| {
            payload.citation_edge_id == "edge:1" && payload.status == "revoked"
        }));
        assert!(payloads.iter().any(|payload| {
            payload.citation_edge_id == "edge:2"
                && payload.status == "already_existed"
                && !payload.created_by_synthesis
        }));
    }
}
