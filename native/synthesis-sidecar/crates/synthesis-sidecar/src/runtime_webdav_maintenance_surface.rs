use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use synthesis_application::debug_maintenance::DebugMaintenanceKind;
use synthesis_repository::OperationRecord;
use synthesis_sidecar::production_capabilities::ProductionClientSemanticSuccess;

use crate::runtime_diagnostics::{NativeDiagnosticEvent, emit_debug};
use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::{
    PUBLIC_MAINTENANCE_BASIS_KIND, PublicMaintenanceBasis, checkpoint_before_promotion,
    control as control_operation, current_operation_id, encode_basis, reconcile_restart,
};

/// The single public adapter for the WebDAV and maintenance operations.
///
/// It deliberately keeps public request validation here: callers never need
/// to know the internal WebDAV state representation or debug-maintenance port.
type ProductionClientHandler = fn(&ProductionApplications, &[Value]) -> Result<Value, String>;

struct RegisteredProductionClientHandler {
    capability: &'static str,
    dispatch: ProductionClientHandler,
}

macro_rules! register_production_client_handlers {
    ($(($capability:literal, $handler:expr)),+ $(,)?) => {
        const WEBDAV_MAINTENANCE_CLIENT_HANDLERS: &[RegisteredProductionClientHandler] = &[
            $(RegisteredProductionClientHandler { capability: $capability, dispatch: $handler }),+
        ];
    };
}

register_production_client_handlers!(
    ("client.syncWebDavNow", |apps, args| {
        no_args(args)?;
        apps.canonical_autosync.cancel_pending();
        let checkpoint = || promotion_checkpoint(apps);
        wire(
            apps.webdav
                .trigger_webdav_sync_with_checkpoint(&checkpoint)?,
        )
    }),
    ("client.pauseWebDavSync", |apps, args| {
        no_args(args)?;
        apps.canonical_autosync.cancel_pending();
        wire(apps.webdav.pause_webdav_sync()?)
    }),
    ("client.resumeWebDavSync", |apps, args| {
        no_args(args)?;
        wire(apps.webdav.resume_webdav_sync()?)
    }),
    ("client.retryWebDavSync", |apps, args| {
        no_args(args)?;
        apps.canonical_autosync.cancel_pending();
        let checkpoint = || promotion_checkpoint(apps);
        wire(apps.webdav.retry_webdav_sync_with_checkpoint(&checkpoint)?)
    }),
    ("client.resolveWebDavSyncConflict", resolve_conflict),
    ("client.getPublicMaintenanceOperation", public_maintenance),
    (
        "client.controlPublicMaintenanceOperation",
        control_public_maintenance
    ),
    (
        "client.reconcileSynthesisRuntimeWorkStateOnStartup",
        reconcile_startup
    ),
    ("client.resetSynthesisDatabase", reset_database),
    ("client.debugSynthesisCleanInstallReset", debug_reset),
);

pub(crate) fn dispatch(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Option<Result<Value, String>> {
    WEBDAV_MAINTENANCE_CLIENT_HANDLERS
        .iter()
        .find(|handler| handler.capability == capability)
        .map(|handler| (handler.dispatch)(apps, args))
}

#[cfg(test)]
pub(crate) fn dispatched_capabilities() -> impl Iterator<Item = &'static str> {
    WEBDAV_MAINTENANCE_CLIENT_HANDLERS
        .iter()
        .map(|handler| handler.capability)
}

fn promotion_checkpoint(apps: &ProductionApplications) -> Result<(), String> {
    let Some(operation_id) = current_operation_id() else {
        return Ok(());
    };
    checkpoint_before_promotion(apps, &operation_id, &synthesis_protocol::utc_now_iso8601())
}

fn control_public_maintenance(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    let request: MaintenanceControlWireRequest = one_request(args)?;
    request.validate()?;
    let operation_id = request.operation_id.clone();
    let canonical_args = vec![wire(request)?];
    match control_operation(
        apps,
        &canonical_args,
        &synthesis_protocol::utc_now_iso8601(),
    ) {
        Ok(row) => public_maintenance_operation_dto(&row),
        Err(code) if code == "not_found" => Ok(json!({
            "schema":"synthesis.maintenance_operation.v1",
            "operation_id":operation_id,
            "status":"not_found",
        })),
        Err(code) => Err(code),
    }
}

fn wire<T: serde::Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|_| "production_projection_invalid".into())
}

fn no_args(args: &[Value]) -> Result<(), String> {
    if args.is_empty() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn one_request<T: for<'de> Deserialize<'de>>(args: &[Value]) -> Result<T, String> {
    let [value] = args else {
        return Err("invalid_request".into());
    };
    serde_json::from_value(value.clone()).map_err(|_| "invalid_request".to_owned())
}

fn resolve_conflict(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: ResolveConflictWireRequest = one_request(args)?;
    let action = match request.action {
        ResolveConflictWireAction::KeepLocal => "keep_local",
        ResolveConflictWireAction::ClearAfterManualEdit => "clear_after_manual_edit",
    };
    apps.canonical_autosync.cancel_pending();
    wire(apps.webdav.resolve_webdav_sync_conflict(action)?)
}

fn public_maintenance(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: MaintenanceReadWireRequest = one_request(args)?;
    let operation_id = request.validated_operation_id()?;
    let row = apps
        .repository
        .with_reader(|repository| repository.get_operation(&operation_id))?;
    match row.filter(|row| row.basis_kind == "public_maintenance_operation") {
        Some(row) => public_maintenance_operation_dto(&row),
        None => Ok(json!({
            "schema":"synthesis.maintenance_operation.v1",
            "operation_id":operation_id,
            "status":"not_found",
        })),
    }
}

pub(crate) fn begin_public_maintenance_operation(
    apps: &ProductionApplications,
    operation_id: &str,
    operation_type: &str,
    args: &[Value],
    source_hash: &str,
    deadline_ms: u64,
    now: &str,
) -> Result<(OperationRecord, bool), String> {
    let request = args.first().and_then(Value::as_object);
    let paper_refs = request
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

pub(crate) fn mark_public_maintenance_running(
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
    if matches!(
        row.status.as_str(),
        "completed" | "failed" | "canceled" | "timed_out"
    ) || row.phase == "cancel_requested"
    {
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
    let updated = repository.update_operation_if_current(&row, "pending", Some(&expected_phase))?;
    match updated {
        Some(current) if current.status == "running" => {
            emit_public_maintenance_event(&current, "maintenance-running", "started", None);
            Ok(())
        }
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

pub(crate) fn observe_public_maintenance_accepted(
    apps: &ProductionApplications,
    operation_id: &str,
) -> Result<(), String> {
    let row = apps
        .repository
        .with_reader(|repository| repository.get_operation(operation_id))?
        .ok_or_else(|| "operation_receipt_missing".to_owned())?;
    emit_public_maintenance_event(&row, "maintenance-started", "started", None);
    Ok(())
}

pub(crate) fn finish_public_maintenance_operation(
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
    if matches!(
        row.status.as_str(),
        "completed" | "failed" | "canceled" | "timed_out"
    ) {
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
            let (status, label) = match terminal {
                PublicMaintenanceTerminal::Failed(_) => ("failed", "Failed"),
                PublicMaintenanceTerminal::Canceled(_) => ("canceled", "Canceled"),
                PublicMaintenanceTerminal::TimedOut(_) => ("timed_out", "Timed out"),
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
                    "outcome":"failed",
                    "state_changed":false,
                    "retryable":true,
                    "diagnostics":[{"code":code,"severity":"error"}],
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
    let completed = repository.finish_operation_if_nonterminal(&row)?;
    drop(repository);
    let (event_outcome, code) = match terminal {
        PublicMaintenanceTerminal::Completed => ("succeeded", None),
        PublicMaintenanceTerminal::Failed(code) => ("failed", Some(code)),
        PublicMaintenanceTerminal::Canceled(code) => ("canceled", Some(code)),
        PublicMaintenanceTerminal::TimedOut(code) => ("timed-out", Some(code)),
    };
    emit_public_maintenance_event(
        &completed,
        "maintenance-terminal",
        event_outcome,
        code.as_deref(),
    );
    Ok(())
}

pub(crate) fn public_maintenance_operation_dto(row: &OperationRecord) -> Result<Value, String> {
    let receipt = serde_json::from_str::<Value>(&row.diagnostics_json)
        .ok()
        .and_then(|value| value.as_array().cloned())
        .and_then(|entries| {
            entries.into_iter().find_map(|entry| {
                (entry.get("code").and_then(Value::as_str) == Some("public_maintenance_receipt"))
                    .then(|| entry.get("receipt").cloned())
                    .flatten()
            })
        });
    let mut dto = json!({
        "schema":"synthesis.maintenance_operation.v1",
        "operation_id":row.operation_id,
        "operation_type":row.operation_type,
        "library_id":row.library_id,
        "scope":{
            "kind":row.scope_kind,
            "paper_refs":if row.scope_kind == "papers" {
                row.scope_ref.split(',').filter(|value|!value.is_empty()).collect::<Vec<_>>()
            } else {
                Vec::new()
            },
        },
        "status":row.status,
        "phase":row.phase,
        "phase_label":row.phase_label,
        "message":row.message,
        "progress_mode":row.progress_mode,
        "processed_count":row.processed_count,
        "skipped_count":row.skipped_count,
        "failed_count":row.failed_count,
        "total_count":row.total_count,
        "created_at":row.created_at,
        "started_at":row.started_at,
        "completed_at":row.completed_at,
        "updated_at":row.updated_at,
    });
    if let Some(receipt) = receipt {
        dto["receipt"] = receipt;
    }
    Ok(dto)
}

fn reconcile_startup(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    no_args(args)?;
    reconcile_restart(apps, &synthesis_protocol::utc_now_iso8601())?;
    // Loading the durable state is the restart reconciliation boundary. The
    // application recovers a persisted syncing state to retryable rather than
    // recreating process-memory defaults.
    let webdav = apps.webdav.load_webdav_sync_state()?;
    let maintenance = apps.workbench.read()?.maintenance;
    Ok(json!({ "status": "ready", "webdav": webdav, "maintenance": maintenance }))
}

fn reset_database(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: ResetDatabaseWireRequest = one_request(args)?;
    if request.confirmation_text.trim().is_empty() {
        return Err("invalid_request".into());
    }
    wire(
        apps.debug
            .run_maintenance(DebugMaintenanceKind::Reset, &wire(request)?)?,
    )
}

fn debug_reset(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: DebugResetWireRequest = one_request(args)?;
    if request
        .confirmation_text
        .as_deref()
        .is_some_and(|value| value.trim().is_empty())
    {
        return Err("invalid_request".into());
    }
    wire(
        apps.debug
            .run_maintenance(DebugMaintenanceKind::Reset, &wire(request)?)?,
    )
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum ResolveConflictWireAction {
    KeepLocal,
    ClearAfterManualEdit,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ResolveConflictWireRequest {
    action: ResolveConflictWireAction,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct MaintenanceReadWireRequest {
    operation_id: String,
}

impl MaintenanceReadWireRequest {
    fn validated_operation_id(self) -> Result<String, String> {
        let operation_id = self.operation_id.trim();
        if operation_id.is_empty() || operation_id.chars().any(char::is_control) {
            return Err("maintenance_operation_id_required".into());
        }
        Ok(operation_id.to_owned())
    }
}

#[derive(Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
enum MaintenanceControlWireAction {
    Cancel,
    Continue,
    Retry,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct MaintenanceControlWireRequest {
    action: MaintenanceControlWireAction,
    operation_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    retry_key: Option<String>,
}

impl MaintenanceControlWireRequest {
    fn validate(&self) -> Result<(), String> {
        if self.operation_id.trim().is_empty()
            || self.operation_id.chars().any(char::is_control)
            || (self.action == MaintenanceControlWireAction::Retry) != self.retry_key.is_some()
            || self.retry_key.as_deref().is_some_and(|value| {
                !(1..=128).contains(&value.len()) || value.chars().any(char::is_control)
            })
        {
            return Err("invalid_request".into());
        }
        Ok(())
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ResetDatabaseWireRequest {
    confirmation_text: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct DebugResetWireRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    confirmation_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    dry_run: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adapter_has_the_closed_ten_operation_slice() {
        assert_eq!(WEBDAV_MAINTENANCE_CLIENT_HANDLERS.len(), 10);
        let capabilities = WEBDAV_MAINTENANCE_CLIENT_HANDLERS
            .iter()
            .map(|handler| handler.capability)
            .collect::<std::collections::BTreeSet<_>>();
        assert_eq!(capabilities.len(), 10);
    }

    #[test]
    fn validates_public_webdav_requests_before_effects() {
        assert_eq!(
            one_request::<MaintenanceReadWireRequest>(&[]).unwrap_err(),
            "invalid_request"
        );
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
            classify_public_maintenance_terminal(Err("operation_timeout"), Some(&status_rule),),
            PublicMaintenanceTerminal::TimedOut("operation_timeout".into())
        );
    }
}
