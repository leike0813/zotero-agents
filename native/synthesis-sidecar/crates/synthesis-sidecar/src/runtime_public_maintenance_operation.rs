use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::cell::RefCell;
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use std::thread;
use synthesis_application::RepositoryPort;
use synthesis_canonical_store::canonical_json_hash;
use synthesis_protocol::{unix_millis_from_utc_iso8601, utc_now_iso8601};
use synthesis_repository::{OperationQuery, OperationRecord};

use crate::runtime_background_tasks::{BackgroundTaskOwner, current_task_canceled};
use crate::runtime_diagnostics::{
    NativeDiagnosticEvent, child_observation_context, emit_debug, with_observation_context,
};
use crate::runtime_production_client::{
    ProductionClientCatalog, ProductionClientSemanticSuccess, ResolvedMaintenanceRoute,
};
use crate::runtime_production_ports::ProductionApplications;

const PUBLIC_MAINTENANCE_BASIS_KIND: &str = "public_maintenance_operation";
const RECONCILIATION_PAGE_LIMIT: usize = 1_000;

thread_local! {
    static CURRENT_OPERATION_ID: RefCell<Option<String>> = const { RefCell::new(None) };
}

struct MaintenanceExecutionContextGuard {
    previous_operation_id: Option<String>,
}

impl MaintenanceExecutionContextGuard {
    fn enter(operation_id: &str) -> Self {
        let previous_operation_id =
            CURRENT_OPERATION_ID.with(|current| current.replace(Some(operation_id.to_owned())));
        Self {
            previous_operation_id,
        }
    }
}

impl Drop for MaintenanceExecutionContextGuard {
    fn drop(&mut self) {
        CURRENT_OPERATION_ID.with(|current| {
            current.replace(self.previous_operation_id.take());
        });
    }
}

pub(crate) fn with_operation_context<T>(operation_id: &str, operation: impl FnOnce() -> T) -> T {
    let _guard = MaintenanceExecutionContextGuard::enter(operation_id);
    operation()
}

fn current_operation_id() -> Option<String> {
    CURRENT_OPERATION_ID.with(|current| current.borrow().clone())
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PublicMaintenanceBasis {
    pub capability: String,
    pub args: Vec<Value>,
    pub deadline_ms: u64,
    pub source_hash: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub predecessor_operation_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub retry_key: Option<String>,
}

fn encode_basis(basis: &PublicMaintenanceBasis) -> Result<String, String> {
    serde_json::to_string(basis).map_err(|_| "serialization_failed".into())
}

fn decode_basis(row: &OperationRecord) -> Result<PublicMaintenanceBasis, String> {
    if row.basis_kind != PUBLIC_MAINTENANCE_BASIS_KIND || row.basis_value.is_empty() {
        return Err("operation_basis_missing".into());
    }
    serde_json::from_str(&row.basis_value).map_err(|_| "operation_basis_invalid".into())
}

#[derive(Clone, Debug, Serialize)]
pub(crate) struct MaintenanceOperationScope {
    pub kind: String,
    pub paper_refs: Vec<String>,
}

#[derive(Clone, Debug, Serialize)]
pub(crate) struct MaintenanceOperationView {
    pub operation_id: String,
    pub operation_type: String,
    pub library_id: i64,
    pub scope: MaintenanceOperationScope,
    pub status: String,
    pub phase: String,
    pub phase_label: String,
    pub message: String,
    pub progress_mode: String,
    pub processed_count: i64,
    pub skipped_count: i64,
    pub failed_count: i64,
    pub total_count: i64,
    pub created_at: String,
    pub started_at: String,
    pub completed_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub receipt: Option<Value>,
}

fn receipt_from_record(row: &OperationRecord) -> Option<Value> {
    serde_json::from_str::<Value>(&row.diagnostics_json)
        .ok()
        .and_then(|value| value.as_array().cloned())
        .and_then(|entries| {
            entries.into_iter().find_map(|entry| {
                (entry.get("code").and_then(Value::as_str) == Some("public_maintenance_receipt"))
                    .then(|| entry.get("receipt").cloned())
                    .flatten()
            })
        })
}

fn maintenance_operation_view(row: &OperationRecord) -> Result<MaintenanceOperationView, String> {
    if row.basis_kind != PUBLIC_MAINTENANCE_BASIS_KIND {
        return Err("not_found".into());
    }
    Ok(MaintenanceOperationView {
        operation_id: row.operation_id.clone(),
        operation_type: row.operation_type.clone(),
        library_id: row.library_id,
        scope: MaintenanceOperationScope {
            kind: row.scope_kind.clone(),
            paper_refs: if row.scope_kind == "papers" {
                row.scope_ref
                    .split(',')
                    .filter(|value| !value.is_empty())
                    .map(str::to_owned)
                    .collect()
            } else {
                Vec::new()
            },
        },
        status: row.status.clone(),
        phase: row.phase.clone(),
        phase_label: row.phase_label.clone(),
        message: row.message.clone(),
        progress_mode: row.progress_mode.clone(),
        processed_count: row.processed_count,
        skipped_count: row.skipped_count,
        failed_count: row.failed_count,
        total_count: row.total_count,
        created_at: row.created_at.clone(),
        started_at: row.started_at.clone(),
        completed_at: row.completed_at.clone(),
        updated_at: row.updated_at.clone(),
        receipt: receipt_from_record(row),
    })
}

pub(crate) fn read(
    apps: &ProductionApplications,
    operation_id: &str,
) -> Result<Option<MaintenanceOperationView>, String> {
    apps.repository
        .with_reader(|repository| repository.get_operation(operation_id))?
        .filter(|row| row.basis_kind == PUBLIC_MAINTENANCE_BASIS_KIND)
        .map(|row| maintenance_operation_view(&row))
        .transpose()
}

pub(crate) fn submit(
    apps: &Arc<ProductionApplications>,
    background_tasks: &Arc<BackgroundTaskOwner>,
    route: ResolvedMaintenanceRoute,
    request_id: &str,
    args: Vec<Value>,
) -> Result<MaintenanceOperationView, String> {
    let accepted_at = utc_now_iso8601();
    let source_hash = canonical_json_hash(&json!({
        "capability":route.operation_type(),
        "args":args,
    }))?;
    let identity_hash = canonical_json_hash(&json!({
        "capability":route.operation_type(),
        "requestId":request_id,
        "sourceHash":source_hash,
    }))?;
    let operation_id = format!(
        "maintenance:{}:{}",
        route.operation_type().trim_start_matches("client."),
        &identity_hash["sha256:".len().."sha256:".len() + 24]
    );
    let (accepted, inserted) = begin_public_maintenance_operation(
        apps.as_ref(),
        &operation_id,
        route.operation_type(),
        &args,
        &source_hash,
        route.work_deadline_ms(),
        &accepted_at,
    )?;
    if accepted.operation_type != route.operation_type()
        || accepted.basis_kind != PUBLIC_MAINTENANCE_BASIS_KIND
        || accepted.source_hash != source_hash
    {
        return Err("basis_mismatch".into());
    }
    let accepted_view = maintenance_operation_view(&accepted)?;
    if !inserted {
        return Ok(accepted_view);
    }
    let basis = decode_basis(&accepted)?;
    let spawned = dispatch(
        apps,
        background_tasks,
        route,
        request_id,
        &operation_id,
        basis,
        format!(
            "synthesis-maintenance-{}",
            &identity_hash["sha256:".len().."sha256:".len() + 8]
        ),
    )?;
    if spawned {
        Ok(accepted_view)
    } else {
        read(apps.as_ref(), &operation_id)?.ok_or_else(|| "operation_receipt_missing".to_owned())
    }
}

fn dispatch(
    apps: &Arc<ProductionApplications>,
    background_tasks: &Arc<BackgroundTaskOwner>,
    route: ResolvedMaintenanceRoute,
    request_id: &str,
    operation_id: &str,
    basis: PublicMaintenanceBasis,
    worker_name: String,
) -> Result<bool, String> {
    if route.operation_type() != basis.capability {
        return Err("basis_mismatch".into());
    }
    let applications = Arc::clone(apps);
    let operation_id = operation_id.to_owned();
    let request_id = request_id.to_owned();
    let worker_trace = child_observation_context();
    let spawn_failure_applications = Arc::clone(&applications);
    let spawn_failure_operation_id = operation_id.clone();
    let spawn_failure_route = route.clone();
    let spawn_result =
        background_tasks.spawn(worker_name, Arc::new(AtomicBool::new(false)), move || {
            let execution = catch_unwind(AssertUnwindSafe(|| {
                with_observation_context(worker_trace.as_ref(), || {
                    if let Err(error) = mark_public_maintenance_running(
                        applications.as_ref(),
                        &operation_id,
                        &utc_now_iso8601(),
                    ) {
                        if error != "operation_dispatch_not_owned" {
                            finish_observed(
                                applications.as_ref(),
                                &operation_id,
                                Err(&error),
                                route.semantic_success(),
                                &utc_now_iso8601(),
                            );
                        }
                        return;
                    }
                    let outcome = route.execute(
                        applications.as_ref(),
                        &request_id,
                        &operation_id,
                        &basis.args,
                    );
                    finish_observed(
                        applications.as_ref(),
                        &operation_id,
                        outcome.as_ref().map_err(String::as_str),
                        route.semantic_success(),
                        &utc_now_iso8601(),
                    );
                });
            }));
            if execution.is_err() {
                finish_observed(
                    applications.as_ref(),
                    &operation_id,
                    Err("operation_dispatch_panicked"),
                    route.semantic_success(),
                    &utc_now_iso8601(),
                );
            }
        });
    if let Err(error) = spawn_result {
        emit_debug(|| {
            NativeDiagnosticEvent::new("operation", "dispatch", "failed")
                .code(format!("operation_spawn_failed:{error}"))
                .operation_id(&spawn_failure_operation_id)
        });
        if let Err(error) = finish_public_maintenance_operation(
            spawn_failure_applications.as_ref(),
            &spawn_failure_operation_id,
            Err("operation_spawn_failed"),
            spawn_failure_route.semantic_success(),
            &utc_now_iso8601(),
        ) {
            emit_debug(|| {
                NativeDiagnosticEvent::new("operation", "terminal-persist", "failed")
                    .code(error)
                    .operation_id(&spawn_failure_operation_id)
            });
            return Err(format!(
                "operation_terminal_state_uncertain:{spawn_failure_operation_id}"
            ));
        }
        return Ok(false);
    }
    Ok(true)
}

fn finish_observed(
    apps: &ProductionApplications,
    operation_id: &str,
    outcome: Result<&Value, &str>,
    semantic_success: Option<&ProductionClientSemanticSuccess>,
    completed_at: &str,
) {
    let first = finish_public_maintenance_operation(
        apps,
        operation_id,
        outcome,
        semantic_success,
        completed_at,
    );
    if let Err(first_error) = first {
        thread::yield_now();
        if let Err(error) = finish_public_maintenance_operation(
            apps,
            operation_id,
            Err(&first_error),
            semantic_success,
            &utc_now_iso8601(),
        ) {
            emit_debug(|| {
                NativeDiagnosticEvent::new("operation", "terminal-persist", "failed")
                    .code(error)
                    .operation_id(operation_id)
            });
        }
    }
}

fn is_terminal(status: &str) -> bool {
    matches!(status, "completed" | "failed" | "canceled" | "timed_out")
}

fn emit_public_maintenance_event(
    row: &OperationRecord,
    phase: &'static str,
    outcome: &'static str,
    code: Option<&str>,
) {
    emit_debug(|| {
        let event = NativeDiagnosticEvent::new("operation", phase, outcome)
            .capability(&row.operation_type)
            .operation_id(&row.operation_id)
            .mutation_status(&row.status);
        match code {
            Some(code) => event.code(code),
            None => event,
        }
    });
}

fn begin_public_maintenance_operation(
    apps: &ProductionApplications,
    operation_id: &str,
    operation_type: &str,
    args: &[Value],
    source_hash: &str,
    deadline_ms: u64,
    now: &str,
) -> Result<(OperationRecord, bool), String> {
    let paper_refs = args
        .first()
        .and_then(Value::as_object)
        .and_then(|value| value.get("paper_refs"))
        .and_then(Value::as_array)
        .map(|values| {
            values
                .iter()
                .filter_map(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    let scope_kind = if paper_refs.is_empty() {
        "library"
    } else {
        "papers"
    };
    let row = OperationRecord {
        operation_id: operation_id.into(),
        operation_type: operation_type.into(),
        library_id: apps.library_id(),
        scope_kind: scope_kind.into(),
        scope_ref: paper_refs.join(","),
        status: "pending".into(),
        label: operation_type.trim_start_matches("client.").into(),
        phase: "accepted".into(),
        phase_label: "Accepted".into(),
        progress_mode: "indeterminate".into(),
        total_count: paper_refs.len() as i64,
        basis_kind: PUBLIC_MAINTENANCE_BASIS_KIND.into(),
        basis_value: encode_basis(&PublicMaintenanceBasis {
            capability: operation_type.into(),
            args: args.to_vec(),
            deadline_ms,
            source_hash: source_hash.into(),
            predecessor_operation_id: None,
            retry_key: None,
        })?,
        source_hash: source_hash.into(),
        diagnostics_json: "[]".into(),
        created_at: now.into(),
        updated_at: now.into(),
        ..OperationRecord::default()
    };
    let (stored, inserted) = apps
        .repository
        .owner()
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?
        .insert_operation_if_absent(&row)?;
    if inserted {
        emit_public_maintenance_event(&stored, "maintenance-started", "started", None);
    }
    Ok((stored, inserted))
}

fn mark_public_maintenance_running(
    apps: &ProductionApplications,
    operation_id: &str,
    now: &str,
) -> Result<(), String> {
    let owner = apps.repository.owner();
    let repository = owner
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?;
    let mut row = repository
        .get_operation(operation_id)?
        .ok_or_else(|| "operation_receipt_missing".to_owned())?;
    if is_terminal(&row.status) || row.phase == "cancel_requested" {
        return Err("operation_canceled".into());
    }
    if row.status != "pending" {
        return Err("operation_state_invalid".into());
    }
    let expected_phase = row.phase.clone();
    row.status = "running".into();
    row.phase = "running".into();
    row.phase_label = "Running".into();
    row.started_at = now.into();
    row.updated_at = now.into();
    let (updated, won_update) =
        repository.update_operation_if_current(&row, "pending", Some(&expected_phase))?;
    drop(repository);
    match updated {
        Some(current) if won_update && current.status == "running" => {
            emit_public_maintenance_event(&current, "maintenance-running", "started", None);
            Ok(())
        }
        Some(current) if current.status == "running" => Err("operation_dispatch_not_owned".into()),
        Some(current) if matches!(current.status.as_str(), "canceled" | "timed_out") => {
            Err("operation_canceled".into())
        }
        _ => Err("operation_state_invalid".into()),
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
enum PublicMaintenanceTerminal {
    Completed,
    Failed(String),
    Canceled(String),
    TimedOut(String),
}

fn receipt_diagnostic_code(receipt: &Value) -> Option<String> {
    [
        receipt.get("diagnostics"),
        receipt.get("warnings"),
        receipt.pointer("/last_run/diagnostics"),
    ]
    .into_iter()
    .flatten()
    .filter_map(Value::as_array)
    .flatten()
    .find_map(|entry| match entry {
        Value::String(code) if !code.trim().is_empty() => Some(code.trim().to_owned()),
        Value::Object(row) => row
            .get("code")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|code| !code.is_empty())
            .map(str::to_owned),
        _ => None,
    })
}

fn classify_failure_code(code: String) -> PublicMaintenanceTerminal {
    match code.as_str() {
        "operation_canceled" | "worker_canceled" | "stopping" => {
            PublicMaintenanceTerminal::Canceled(code)
        }
        value if value.ends_with("_timeout") || value == "timeout" => {
            PublicMaintenanceTerminal::TimedOut(code)
        }
        _ => PublicMaintenanceTerminal::Failed(code),
    }
}

fn classify_public_maintenance_terminal(
    outcome: Result<&Value, &str>,
    semantic_success: Option<&ProductionClientSemanticSuccess>,
) -> PublicMaintenanceTerminal {
    let receipt = match outcome {
        Ok(receipt) => receipt,
        Err(code) => return classify_failure_code(code.to_owned()),
    };
    let declared_status = semantic_success.and_then(|rule| {
        receipt
            .get(&rule.field)
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(|value| (rule, value))
    });
    if receipt.get("ok").and_then(Value::as_bool) != Some(false)
        && declared_status
            .as_ref()
            .is_some_and(|(rule, value)| rule.values.iter().any(|allowed| allowed == value))
    {
        return PublicMaintenanceTerminal::Completed;
    }
    let code = receipt_diagnostic_code(receipt)
        .or_else(|| declared_status.map(|(_, value)| value.to_owned()))
        .or_else(|| {
            receipt
                .get("status")
                .or_else(|| receipt.get("queue_state"))
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
        .unwrap_or_else(|| "semantic_non_success".to_owned());
    classify_failure_code(code)
}

fn finish_public_maintenance_operation(
    apps: &ProductionApplications,
    operation_id: &str,
    outcome: Result<&Value, &str>,
    semantic_success: Option<&ProductionClientSemanticSuccess>,
    now: &str,
) -> Result<(), String> {
    let owner = apps.repository.owner();
    let repository = owner
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?;
    let mut row = repository
        .get_operation(operation_id)?
        .ok_or_else(|| "operation_receipt_missing".to_owned())?;
    if is_terminal(&row.status) {
        return Ok(());
    }
    let terminal = classify_public_maintenance_terminal(outcome, semantic_success);
    match &terminal {
        PublicMaintenanceTerminal::Completed => {
            row.status = "completed".into();
            row.phase = "completed".into();
            row.phase_label = "Completed".into();
            let receipt = outcome.expect("completed outcome has receipt");
            row.processed_count = receipt
                .get("processed_paper_refs")
                .and_then(Value::as_array)
                .map(|values| values.len() as i64)
                .unwrap_or(1);
            row.total_count = row.total_count.max(row.processed_count);
            row.diagnostics_json = serde_json::to_string(&vec![json!({
                "code":"public_maintenance_receipt",
                "receipt":receipt,
            })])
            .map_err(|_| "serialization_failed")?;
        }
        PublicMaintenanceTerminal::Failed(_)
        | PublicMaintenanceTerminal::Canceled(_)
        | PublicMaintenanceTerminal::TimedOut(_) => {
            let (status, label, receipt_outcome, severity) = match &terminal {
                PublicMaintenanceTerminal::Failed(_) => ("failed", "Failed", "failed", "error"),
                PublicMaintenanceTerminal::Canceled(_) => {
                    ("canceled", "Canceled", "canceled", "info")
                }
                PublicMaintenanceTerminal::TimedOut(_) => {
                    ("timed_out", "Timed out", "timed_out", "error")
                }
                PublicMaintenanceTerminal::Completed => unreachable!(),
            };
            row.status = status.into();
            row.phase = status.into();
            row.phase_label = label.into();
            row.failed_count = row.total_count.max(1);
            let receipt = match outcome {
                Ok(receipt) => receipt.clone(),
                Err(code) => json!({
                    "schema":"synthesis.maintenance_receipt.v1",
                    "outcome":receipt_outcome,
                    "state_changed":false,
                    "retryable":true,
                    "diagnostics":[{"code":code,"severity":severity}],
                }),
            };
            row.diagnostics_json = serde_json::to_string(&vec![json!({
                "code":"public_maintenance_receipt",
                "receipt":receipt,
            })])
            .map_err(|_| "serialization_failed")?;
        }
    }
    row.completed_at = now.into();
    row.updated_at = now.into();
    let (completed, won_terminal) = repository.finish_operation_if_nonterminal(&row)?;
    drop(repository);
    let (event_outcome, code) = match terminal {
        PublicMaintenanceTerminal::Completed => ("succeeded", None),
        PublicMaintenanceTerminal::Failed(code) => ("failed", Some(code)),
        PublicMaintenanceTerminal::Canceled(code) => ("canceled", Some(code)),
        PublicMaintenanceTerminal::TimedOut(code) => ("timed-out", Some(code)),
    };
    if won_terminal {
        emit_public_maintenance_event(
            &completed,
            "maintenance-terminal",
            event_outcome,
            code.as_deref(),
        );
    }
    Ok(())
}

pub(crate) fn checkpoint_current_before_promotion(
    apps: &ProductionApplications,
) -> Result<(), String> {
    checkpoint_current_before_promotion_in_repository(apps.repository.as_ref())
}

pub(crate) fn checkpoint_current_before_promotion_in_repository(
    repository: &RepositoryPort,
) -> Result<(), String> {
    let Some(operation_id) = current_operation_id() else {
        return Ok(());
    };
    checkpoint_before_promotion_in_repository(repository, &operation_id, &utc_now_iso8601())
}

fn checkpoint_before_promotion_in_repository(
    repository: &RepositoryPort,
    operation_id: &str,
    now: &str,
) -> Result<(), String> {
    if current_task_canceled() {
        return Err("operation_canceled".into());
    }
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
            "receipt":{
                "schema":"synthesis.maintenance_receipt.v1",
                "outcome":"timed_out",
                "state_changed":false,
                "retryable":true,
                "diagnostics":[{"code":"operation_timeout","severity":"error"}],
            },
        })])
        .map_err(|_| "serialization_failed")?;
        row.completed_at = now.into();
        row.updated_at = now.into();
        let (completed, won_terminal) = repository.finish_operation_if_nonterminal(&row)?;
        drop(repository);
        if won_terminal {
            emit_public_maintenance_event(
                &completed,
                "maintenance-terminal",
                "timed-out",
                Some("operation_timeout"),
            );
        }
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
        let (completed, won_terminal) = repository.finish_operation_if_nonterminal(&row)?;
        drop(repository);
        if won_terminal {
            emit_public_maintenance_event(
                &completed,
                "maintenance-terminal",
                "canceled",
                Some("operation_canceled"),
            );
        }
        return Err("operation_canceled".into());
    }
    if is_terminal(&row.status) {
        return Err("operation_terminal".into());
    }
    Ok(())
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

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum MaintenanceControlCommand {
    Cancel {
        operation_id: String,
    },
    Continue {
        operation_id: String,
    },
    Retry {
        operation_id: String,
        retry_key: String,
    },
}

impl MaintenanceControlCommand {
    fn operation_id(&self) -> &str {
        match self {
            Self::Cancel { operation_id }
            | Self::Continue { operation_id }
            | Self::Retry { operation_id, .. } => operation_id,
        }
    }
}

struct PublicMaintenanceControlOutcome {
    view: MaintenanceOperationView,
    dispatch: Option<MaintenanceDispatch>,
}

struct MaintenanceDispatch {
    operation_id: String,
    basis: PublicMaintenanceBasis,
}

fn control_outcome(
    row: OperationRecord,
    dispatch_winner: bool,
) -> Result<PublicMaintenanceControlOutcome, String> {
    let dispatch = dispatch_winner.then(|| {
        decode_basis(&row).map(|basis| MaintenanceDispatch {
            operation_id: row.operation_id.clone(),
            basis,
        })
    });
    Ok(PublicMaintenanceControlOutcome {
        view: maintenance_operation_view(&row)?,
        dispatch: dispatch.transpose()?,
    })
}

pub(crate) fn control(
    apps: &Arc<ProductionApplications>,
    background_tasks: &Arc<BackgroundTaskOwner>,
    catalog: &ProductionClientCatalog,
    request_id: &str,
    command: &MaintenanceControlCommand,
    now: &str,
) -> Result<MaintenanceOperationView, String> {
    let outcome = control_in_repository(apps.repository.as_ref(), command, now)?;
    let Some(pending_dispatch) = outcome.dispatch else {
        return Ok(outcome.view);
    };
    let route = catalog
        .resolve_maintenance(&pending_dispatch.basis.capability)
        .ok_or_else(|| "operation_unavailable".to_owned())?;
    dispatch(
        apps,
        background_tasks,
        route,
        request_id,
        &pending_dispatch.operation_id,
        pending_dispatch.basis,
        "synthesis-maintenance-resume".into(),
    )?;
    read(apps.as_ref(), &pending_dispatch.operation_id)?
        .ok_or_else(|| "operation_receipt_missing".to_owned())
}

fn control_in_repository(
    repository: &RepositoryPort,
    command: &MaintenanceControlCommand,
    now: &str,
) -> Result<PublicMaintenanceControlOutcome, String> {
    let operation_id = command.operation_id();
    let repository = repository.owner();
    let repository = repository
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?;
    let Some(mut row) = repository.get_operation(operation_id)? else {
        return Err("not_found".into());
    };
    if row.basis_kind != PUBLIC_MAINTENANCE_BASIS_KIND {
        return Err("not_found".into());
    }
    match command {
        MaintenanceControlCommand::Cancel { .. } if row.status == "pending" => {
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
            let (stored, won_terminal) = repository.finish_operation_if_nonterminal(&row)?;
            drop(repository);
            if won_terminal {
                emit_public_maintenance_event(
                    &stored,
                    "maintenance-terminal",
                    "canceled",
                    Some("operation_canceled"),
                );
            }
            control_outcome(stored, false)
        }
        MaintenanceControlCommand::Cancel { .. } if row.status == "running" => {
            let previous_phase = row.phase.clone();
            row.phase = "cancel_requested".into();
            row.phase_label = "Cancellation requested".into();
            row.message = "Cancellation will take effect at the next promotion boundary".into();
            row.updated_at = now.into();
            let (stored, _) =
                repository.update_operation_if_current(&row, "running", Some(&previous_phase))?;
            control_outcome(
                stored.ok_or_else(|| "operation_receipt_missing".to_owned())?,
                false,
            )
        }
        MaintenanceControlCommand::Cancel { .. } => control_outcome(row, false),
        MaintenanceControlCommand::Continue { .. }
            if row.status == "pending" && row.phase == "continuation_required" =>
        {
            row.phase = "queued".into();
            row.phase_label = "Queued".into();
            row.message.clear();
            row.updated_at = now.into();
            let (stored, won_update) = repository.update_operation_if_current(
                &row,
                "pending",
                Some("continuation_required"),
            )?;
            control_outcome(
                stored.ok_or_else(|| "operation_receipt_missing".to_owned())?,
                won_update,
            )
        }
        MaintenanceControlCommand::Continue { .. } => control_outcome(row, false),
        MaintenanceControlCommand::Retry { retry_key, .. } => {
            if !(matches!(row.status.as_str(), "failed" | "timed_out") && retryable(&row)
                || cancellation_before_promotion(&row))
            {
                return control_outcome(row, false);
            }
            let predecessor = row.operation_id.clone();
            let mut basis = decode_basis(&row)?;
            basis.predecessor_operation_id = Some(predecessor.clone());
            basis.retry_key = Some(retry_key.clone());
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
                phase: "queued".into(),
                phase_label: "Queued".into(),
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
            let (stored, inserted) = repository.insert_operation_if_absent(&successor)?;
            drop(repository);
            if inserted {
                emit_public_maintenance_event(&stored, "maintenance-started", "started", None);
            }
            control_outcome(stored, inserted)
        }
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
    let mut terminal_events = Vec::new();
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
                    "code":"public_maintenance_receipt",
                    "receipt":{
                        "schema":"synthesis.maintenance_receipt.v1",
                        "outcome":"failed",
                        "state_changed":false,
                        "retryable":false,
                        "diagnostics":[{
                            "code":"restart_external_effect_unknown",
                            "severity":"error",
                        }],
                    },
                })])
                .map_err(|_| "serialization_failed")?;
                row.completed_at = now.into();
                row.updated_at = now.into();
                let (completed, won_terminal) = repository.finish_operation_if_nonterminal(&row)?;
                if won_terminal {
                    terminal_events.push(completed);
                }
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
            let (stored, _) =
                repository.update_operation_if_current(&row, "pending", Some(&expected_phase))?;
            stored.ok_or_else(|| "operation_receipt_missing".to_owned())?;
        }
        if page_len < RECONCILIATION_PAGE_LIMIT {
            break;
        }
    }
    drop(repository);
    for completed in terminal_events {
        emit_public_maintenance_event(
            &completed,
            "maintenance-terminal",
            "failed",
            Some("restart_external_effect_unknown"),
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::{Arc, Mutex};
    use synthesis_repository::{Repository, RepositoryIdentity};
    use synthesis_test_support::TestRoot;

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
    fn operation_context_is_restored_after_handler_panic() {
        assert_eq!(current_operation_id(), None);
        let result = std::panic::catch_unwind(|| {
            with_operation_context("maintenance:panics", || {
                assert_eq!(
                    current_operation_id().as_deref(),
                    Some("maintenance:panics")
                );
                panic!("fixture panic");
            });
        });

        assert!(result.is_err());
        assert_eq!(current_operation_id(), None);
    }

    #[test]
    fn classifies_manifest_owned_maintenance_terminals_without_false_completion() {
        let status_rule = ProductionClientSemanticSuccess {
            field: "status".into(),
            values: vec!["promoted".into(), "unchanged".into()],
        };
        assert_eq!(
            classify_public_maintenance_terminal(
                Ok(&json!({"status":"promoted"})),
                Some(&status_rule),
            ),
            PublicMaintenanceTerminal::Completed
        );
        assert_eq!(
            classify_public_maintenance_terminal(
                Ok(&json!({
                    "status":"worker_failed",
                    "warnings":["worker_timeout"],
                })),
                Some(&status_rule),
            ),
            PublicMaintenanceTerminal::TimedOut("worker_timeout".into())
        );
        assert_eq!(
            classify_public_maintenance_terminal(Err("operation_timeout"), Some(&status_rule)),
            PublicMaintenanceTerminal::TimedOut("operation_timeout".into())
        );
    }

    #[test]
    fn control_dispatches_only_for_the_retry_or_continue_transition_winner() {
        let root = TestRoot::new("synthesis-public-maintenance-control-winner");
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
            capability: "client.syncWebDavNow".into(),
            args: Vec::new(),
            deadline_ms: 10_000,
            source_hash: "sha256:fixture".into(),
            predecessor_operation_id: None,
            retry_key: None,
        };
        let retryable = OperationRecord {
            operation_id: "maintenance:failed".into(),
            operation_type: basis.capability.clone(),
            status: "failed".into(),
            phase: "failed".into(),
            basis_kind: PUBLIC_MAINTENANCE_BASIS_KIND.into(),
            basis_value: encode_basis(&basis).expect("basis"),
            source_hash: basis.source_hash.clone(),
            diagnostics_json: serde_json::to_string(&vec![json!({
                "code":"public_maintenance_receipt",
                "receipt":{"retryable":true},
            })])
            .expect("diagnostics"),
            created_at: "2026-08-02T00:00:00.000Z".into(),
            updated_at: "2026-08-02T00:00:00.000Z".into(),
            completed_at: "2026-08-02T00:00:01.000Z".into(),
            ..OperationRecord::default()
        };
        repository
            .owner()
            .lock()
            .expect("lock")
            .upsert_operation(&retryable)
            .expect("seed retry");
        let retry = MaintenanceControlCommand::Retry {
            operation_id: retryable.operation_id.clone(),
            retry_key: "retry-1".into(),
        };

        let first = control_in_repository(&repository, &retry, "2026-08-02T00:00:02.000Z")
            .expect("retry winner");
        assert!(first.dispatch.is_some());
        assert_eq!(first.view.phase, "queued");
        let duplicate = control_in_repository(&repository, &retry, "2026-08-02T00:00:03.000Z")
            .expect("retry duplicate");
        assert!(duplicate.dispatch.is_none());
        assert_eq!(duplicate.view.operation_id, first.view.operation_id);

        let continuation = OperationRecord {
            operation_id: "maintenance:continuation".into(),
            operation_type: basis.capability.clone(),
            status: "pending".into(),
            phase: "continuation_required".into(),
            basis_kind: PUBLIC_MAINTENANCE_BASIS_KIND.into(),
            basis_value: encode_basis(&basis).expect("basis"),
            source_hash: basis.source_hash.clone(),
            diagnostics_json: "[]".into(),
            created_at: "2026-08-02T00:00:00.000Z".into(),
            updated_at: "2026-08-02T00:00:00.000Z".into(),
            ..OperationRecord::default()
        };
        repository
            .owner()
            .lock()
            .expect("lock")
            .upsert_operation(&continuation)
            .expect("seed continuation");
        let continue_command = MaintenanceControlCommand::Continue {
            operation_id: continuation.operation_id.clone(),
        };

        let first =
            control_in_repository(&repository, &continue_command, "2026-08-02T00:00:04.000Z")
                .expect("continue winner");
        assert!(first.dispatch.is_some());
        let duplicate =
            control_in_repository(&repository, &continue_command, "2026-08-02T00:00:05.000Z")
                .expect("continue duplicate");
        assert!(duplicate.dispatch.is_none());
        assert_eq!(duplicate.view.operation_id, continuation.operation_id);
        drop(repository);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn phase_deadline_publishes_one_retryable_timeout_terminal() {
        let root = TestRoot::new("synthesis-public-maintenance-timeout");
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
                .0
                .status,
            "timed_out"
        );
        drop(repository);
        fs::remove_dir_all(root).expect("cleanup");
    }
}
