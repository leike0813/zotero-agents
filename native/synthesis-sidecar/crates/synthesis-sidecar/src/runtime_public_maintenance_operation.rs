use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::cell::RefCell;
use synthesis_application::RepositoryPort;
use synthesis_canonical_store::canonical_json_hash;
use synthesis_protocol::unix_millis_from_utc_iso8601;
use synthesis_repository::{OperationQuery, OperationRecord};

use crate::runtime_production_ports::ProductionApplications;

pub(crate) const PUBLIC_MAINTENANCE_BASIS_KIND: &str = "public_maintenance_operation";
const RECONCILIATION_PAGE_LIMIT: usize = 1_000;

thread_local! {
    static CURRENT_OPERATION_ID: RefCell<Option<String>> = const { RefCell::new(None) };
}

pub(crate) fn with_operation_context<T>(operation_id: &str, operation: impl FnOnce() -> T) -> T {
    CURRENT_OPERATION_ID.with(|current| {
        let previous = current.replace(Some(operation_id.to_owned()));
        let result = operation();
        current.replace(previous);
        result
    })
}

pub(crate) fn current_operation_id() -> Option<String> {
    CURRENT_OPERATION_ID.with(|current| current.borrow().clone())
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct PublicMaintenanceBasis {
    pub capability: String,
    pub args: Vec<Value>,
    pub deadline_ms: u64,
    pub source_hash: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub predecessor_operation_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retry_key: Option<String>,
}

pub(crate) fn encode_basis(basis: &PublicMaintenanceBasis) -> Result<String, String> {
    serde_json::to_string(basis).map_err(|_| "serialization_failed".into())
}

pub(crate) fn decode_basis(row: &OperationRecord) -> Result<PublicMaintenanceBasis, String> {
    if row.basis_kind != PUBLIC_MAINTENANCE_BASIS_KIND || row.basis_value.is_empty() {
        return Err("operation_basis_missing".into());
    }
    serde_json::from_str(&row.basis_value).map_err(|_| "operation_basis_invalid".into())
}

pub(crate) fn is_terminal(status: &str) -> bool {
    matches!(status, "completed" | "failed" | "canceled" | "timed_out")
}

pub(crate) fn checkpoint_before_promotion(
    apps: &ProductionApplications,
    operation_id: &str,
    now: &str,
) -> Result<(), String> {
    checkpoint_before_promotion_in_repository(apps.repository.as_ref(), operation_id, now)
}

pub(crate) fn checkpoint_before_promotion_in_repository(
    repository: &RepositoryPort,
    operation_id: &str,
    now: &str,
) -> Result<(), String> {
    let owner = repository.owner();
    let repository = owner
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?;
    let Some(mut row) = repository.get_operation(operation_id)? else {
        return Err("operation_receipt_missing".into());
    };
    let basis = decode_basis(&row)?;
    let created_at = unix_millis_from_utc_iso8601(&row.created_at)
        .ok_or_else(|| "operation_basis_invalid".to_owned())?;
    let deadline_at = created_at
        .checked_add(
            i64::try_from(basis.deadline_ms).map_err(|_| "operation_basis_invalid".to_owned())?,
        )
        .ok_or_else(|| "operation_basis_invalid".to_owned())?;
    let now_millis =
        unix_millis_from_utc_iso8601(now).ok_or_else(|| "operation_basis_invalid".to_owned())?;
    if now_millis > deadline_at {
        row.status = "timed_out".into();
        row.phase = "timed_out".into();
        row.phase_label = "Timed out".into();
        row.message = "The operation deadline elapsed before promotion".into();
        row.diagnostics_json = serde_json::to_string(&vec![json!({
            "code":"public_maintenance_receipt",
            "receipt":{"retryable":true,"diagnostics":[{"code":"operation_timeout","severity":"error"}]}
        })])
        .map_err(|_| "serialization_failed")?;
        row.completed_at = now.into();
        row.updated_at = now.into();
        repository.finish_operation_if_nonterminal(&row)?;
        return Err("operation_timeout".into());
    }
    if row.status == "running" && row.phase == "cancel_requested" {
        row.status = "canceled".into();
        row.phase = "canceled".into();
        row.phase_label = "Canceled".into();
        row.message = "Cancellation requested before promotion".into();
        row.diagnostics_json = serde_json::to_string(&vec![json!({
            "code":"public_maintenance_receipt",
            "receipt":{
                "schema":"synthesis.maintenance_receipt.v1",
                "outcome":"canceled",
                "state_changed":false,
                "retryable":true,
                "diagnostics":[{"code":"operation_canceled","severity":"info"}],
            },
        })])
        .map_err(|_| "serialization_failed")?;
        row.completed_at = now.into();
        row.updated_at = now.into();
        repository.finish_operation_if_nonterminal(&row)?;
        return Err("operation_canceled".into());
    }
    if is_terminal(&row.status) {
        return Err("operation_terminal".into());
    }
    Ok(())
}

fn operation_id(request: &serde_json::Map<String, Value>) -> Result<&str, String> {
    let snake = request.get("operation_id");
    let camel = request.get("operationId");
    if snake.is_some() == camel.is_some() {
        return Err("invalid_request".into());
    }
    snake
        .or(camel)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "maintenance_operation_id_required".to_owned())
}

fn retryable(row: &OperationRecord) -> bool {
    serde_json::from_str::<Value>(&row.diagnostics_json)
        .ok()
        .and_then(|value| value.as_array().cloned())
        .into_iter()
        .flatten()
        .any(|entry| entry.pointer("/receipt/retryable").and_then(Value::as_bool) == Some(true))
}

fn cancellation_before_promotion(row: &OperationRecord) -> bool {
    row.status == "canceled" && row.phase != "promoted"
}

pub(crate) fn control(
    apps: &ProductionApplications,
    args: &[Value],
    now: &str,
) -> Result<OperationRecord, String> {
    let [Value::Object(request)] = args else {
        return Err("invalid_request".into());
    };
    let action = request
        .get("action")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| matches!(*value, "cancel" | "continue" | "retry"))
        .ok_or_else(|| "invalid_request".to_owned())?;
    let operation_id = operation_id(request)?;
    let retry_key = match action {
        "retry" => {
            if request.keys().any(|key| {
                key != "action"
                    && key != "operation_id"
                    && key != "operationId"
                    && key != "retry_key"
                    && key != "retryKey"
            }) || (request.contains_key("retry_key") == request.contains_key("retryKey"))
            {
                return Err("invalid_request".into());
            }
            request
                .get("retry_key")
                .or_else(|| request.get("retryKey"))
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| {
                    (1..=128).contains(&value.len()) && !value.chars().any(char::is_control)
                })
                .ok_or_else(|| "invalid_request".to_owned())?
        }
        _ => {
            if request
                .keys()
                .any(|key| key != "action" && key != "operation_id" && key != "operationId")
            {
                return Err("invalid_request".into());
            }
            ""
        }
    };
    let repository = apps.repository.owner();
    let repository = repository
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?;
    let Some(mut row) = repository.get_operation(operation_id)? else {
        return Err("not_found".into());
    };
    if row.basis_kind != PUBLIC_MAINTENANCE_BASIS_KIND {
        return Err("not_found".into());
    }
    match action {
        "cancel" if row.status == "pending" => {
            row.status = "canceled".into();
            row.phase = "canceled".into();
            row.phase_label = "Canceled".into();
            row.diagnostics_json = serde_json::to_string(&vec![json!({
                "code":"public_maintenance_receipt",
                "receipt":{
                    "schema":"synthesis.maintenance_receipt.v1",
                    "outcome":"canceled",
                    "state_changed":false,
                    "retryable":true,
                    "diagnostics":[{"code":"operation_canceled","severity":"info"}],
                },
            })])
            .map_err(|_| "serialization_failed")?;
            row.completed_at = now.into();
            row.updated_at = now.into();
            repository.finish_operation_if_nonterminal(&row)
        }
        "cancel" if row.status == "running" => {
            let previous_phase = row.phase.clone();
            row.phase = "cancel_requested".into();
            row.phase_label = "Cancellation requested".into();
            row.message = "Cancellation will take effect at the next promotion boundary".into();
            row.updated_at = now.into();
            repository
                .update_operation_if_current(&row, "running", Some(&previous_phase))?
                .ok_or_else(|| "operation_receipt_missing".to_owned())
        }
        "cancel" => Ok(row),
        "continue" if row.status == "pending" && row.phase == "continuation_required" => {
            row.phase = "queued".into();
            row.phase_label = "Queued".into();
            row.message.clear();
            row.updated_at = now.into();
            repository
                .update_operation_if_current(&row, "pending", Some("continuation_required"))?
                .ok_or_else(|| "operation_receipt_missing".to_owned())
        }
        "continue" => Ok(row),
        "retry" => {
            if !(matches!(row.status.as_str(), "failed" | "timed_out") && retryable(&row)
                || cancellation_before_promotion(&row))
            {
                return Ok(row);
            }
            let predecessor = row.operation_id.clone();
            let mut basis = decode_basis(&row)?;
            basis.predecessor_operation_id = Some(predecessor.clone());
            basis.retry_key = Some(retry_key.to_owned());
            let basis_value = encode_basis(&basis)?;
            let identity = canonical_json_hash(&json!({
                "predecessorOperationId": predecessor,
                "retryKey": retry_key,
            }))?;
            let successor_id = format!("maintenance:retry:{}", &identity[7..31]);
            let source_hash = canonical_json_hash(
                &serde_json::from_str::<Value>(&basis_value)
                    .map_err(|_| "operation_basis_invalid")?,
            )?;
            let successor = OperationRecord {
                operation_id: successor_id,
                operation_type: row.operation_type.clone(),
                library_id: row.library_id,
                scope_kind: row.scope_kind.clone(),
                scope_ref: row.scope_ref.clone(),
                status: "pending".into(),
                label: row.label.clone(),
                phase: "continuation_required".into(),
                phase_label: "Continuation required".into(),
                message: "Explicit continuation is required before retry work starts".into(),
                progress_mode: "indeterminate".into(),
                total_count: row.total_count,
                basis_kind: PUBLIC_MAINTENANCE_BASIS_KIND.into(),
                basis_value,
                source_hash,
                diagnostics_json: "[]".into(),
                created_at: now.into(),
                updated_at: now.into(),
                ..OperationRecord::default()
            };
            repository
                .insert_operation_if_absent(&successor)
                .map(|(stored, _)| stored)
        }
        _ => Err("invalid_request".into()),
    }
}

/// Recover persisted work without starting a queue.  Pre-promotion work is
/// left for an explicit continue; a running operation may have crossed an
/// external effect boundary and is therefore failed rather than replayed.
pub(crate) fn reconcile_restart(apps: &ProductionApplications, now: &str) -> Result<(), String> {
    let repository = apps.repository.owner();
    let repository = repository
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?;
    let mut start_after_operation_id = None;
    loop {
        let rows = repository.list_operations(&OperationQuery {
            statuses: vec!["running".into()],
            order_by_operation_id: true,
            start_after_operation_id: start_after_operation_id.clone(),
            limit: RECONCILIATION_PAGE_LIMIT,
            ..OperationQuery::default()
        })?;
        if rows.is_empty() {
            break;
        }
        start_after_operation_id = rows.last().map(|row| row.operation_id.clone());
        let page_len = rows.len();
        for mut row in rows {
            if row.basis_kind == PUBLIC_MAINTENANCE_BASIS_KIND {
                row.status = "failed".into();
                row.phase = "restart_reconciliation_failed".into();
                row.phase_label = "Restart reconciliation failed".into();
                row.message =
                    "External effect outcome is unknown; automatic replay is unsafe".into();
                row.diagnostics_json = serde_json::to_string(&vec![json!({
                    "code":"restart_external_effect_unknown",
                    "receipt":{"retryable":false}
                })])
                .map_err(|_| "serialization_failed")?;
                row.completed_at = now.into();
                row.updated_at = now.into();
                repository.finish_operation_if_nonterminal(&row)?;
            } else {
                row.status = "canceled".into();
                row.phase = "service_restart".into();
                row.phase_label = "Service restarted".into();
                row.message = "Interrupted by sidecar service restart.".into();
                row.diagnostics_json = serde_json::to_string(&vec![json!({
                    "code":"synthesis_operation_stale_after_restart",
                    "severity":"warning",
                })])
                .map_err(|_| "serialization_failed")?;
                row.completed_at = now.into();
                row.updated_at = now.into();
                repository.finish_operation_if_nonterminal(&row)?;
            }
        }
        if page_len < RECONCILIATION_PAGE_LIMIT {
            break;
        }
    }

    let mut start_after_operation_id = None;
    loop {
        let rows = repository.list_operations(&OperationQuery {
            statuses: vec!["pending".into()],
            basis_kinds: vec![PUBLIC_MAINTENANCE_BASIS_KIND.into()],
            order_by_operation_id: true,
            start_after_operation_id: start_after_operation_id.clone(),
            limit: RECONCILIATION_PAGE_LIMIT,
            ..OperationQuery::default()
        })?;
        if rows.is_empty() {
            break;
        }
        start_after_operation_id = rows.last().map(|row| row.operation_id.clone());
        let page_len = rows.len();
        for mut row in rows {
            if row.phase == "continuation_required" {
                continue;
            }
            let expected_phase = row.phase.clone();
            row.phase = "continuation_required".into();
            row.phase_label = "Continuation required".into();
            row.message = "Explicit continuation is required before work restarts".into();
            row.updated_at = now.into();
            repository
                .update_operation_if_current(&row, "pending", Some(&expected_phase))?
                .ok_or_else(|| "operation_receipt_missing".to_owned())?;
        }
        if page_len < RECONCILIATION_PAGE_LIMIT {
            break;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::{Arc, Mutex};
    use synthesis_repository::{Repository, RepositoryIdentity};

    #[test]
    fn persisted_basis_round_trips_the_retry_inputs() {
        let basis = PublicMaintenanceBasis {
            capability: "client.syncWebDavNow".into(),
            args: vec![json!({"scope":"library"})],
            deadline_ms: 10_000,
            source_hash: "sha256:fixture".into(),
            predecessor_operation_id: Some("maintenance:one".into()),
            retry_key: Some("retry-1".into()),
        };
        let row = OperationRecord {
            basis_kind: PUBLIC_MAINTENANCE_BASIS_KIND.into(),
            basis_value: encode_basis(&basis).expect("encode"),
            ..OperationRecord::default()
        };
        assert_eq!(
            decode_basis(&row).expect("decode").retry_key,
            basis.retry_key
        );
    }

    #[test]
    fn operation_context_is_scoped_to_the_worker_call() {
        assert_eq!(current_operation_id(), None);
        with_operation_context("maintenance:one", || {
            assert_eq!(current_operation_id().as_deref(), Some("maintenance:one"));
            with_operation_context("maintenance:two", || {
                assert_eq!(current_operation_id().as_deref(), Some("maintenance:two"));
            });
            assert_eq!(current_operation_id().as_deref(), Some("maintenance:one"));
        });
        assert_eq!(current_operation_id(), None);
    }

    #[test]
    fn phase_deadline_publishes_one_retryable_timeout_terminal() {
        let root = std::env::temp_dir().join(format!(
            "synthesis-public-maintenance-timeout-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        let repository = Repository::open(
            &root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("repository");
        let repository = RepositoryPort::new(Arc::new(Mutex::new(repository)));
        let basis = PublicMaintenanceBasis {
            capability: "client.refreshReferenceSidecarNow".into(),
            args: Vec::new(),
            deadline_ms: 1_000,
            source_hash: "sha256:fixture".into(),
            predecessor_operation_id: None,
            retry_key: None,
        };
        let row = OperationRecord {
            operation_id: "maintenance:timeout".into(),
            operation_type: basis.capability.clone(),
            status: "running".into(),
            phase: "running".into(),
            basis_kind: PUBLIC_MAINTENANCE_BASIS_KIND.into(),
            basis_value: encode_basis(&basis).expect("basis"),
            source_hash: basis.source_hash,
            diagnostics_json: "[]".into(),
            created_at: "2026-08-02T00:00:00.000Z".into(),
            started_at: "2026-08-02T00:00:00.000Z".into(),
            updated_at: "2026-08-02T00:00:00.000Z".into(),
            ..OperationRecord::default()
        };
        repository
            .owner()
            .lock()
            .expect("lock")
            .upsert_operation(&row)
            .expect("seed");

        assert_eq!(
            checkpoint_before_promotion_in_repository(
                &repository,
                &row.operation_id,
                "2026-08-02T00:00:02.000Z",
            ),
            Err("operation_timeout".into())
        );
        let terminal = repository
            .owner()
            .lock()
            .expect("lock")
            .get_operation(&row.operation_id)
            .expect("read")
            .expect("terminal");
        assert_eq!(terminal.status, "timed_out");
        assert!(retryable(&terminal));

        let mut late_completion = terminal.clone();
        late_completion.status = "completed".into();
        late_completion.phase = "completed".into();
        late_completion.updated_at = "2026-08-02T00:00:03.000Z".into();
        assert_eq!(
            repository
                .owner()
                .lock()
                .expect("lock")
                .finish_operation_if_nonterminal(&late_completion)
                .expect("first terminal wins")
                .status,
            "timed_out"
        );
        drop(repository);
        fs::remove_dir_all(root).expect("cleanup");
    }
}
