use serde_json::{Map, Value, json};
use synthesis_application::debug_maintenance::DebugMaintenanceKind;
use synthesis_repository::OperationRecord;

use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::{
    PublicMaintenanceBasis, checkpoint_before_promotion, control as control_operation,
    current_operation_id, encode_basis, reconcile_restart,
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
        let checkpoint = || promotion_checkpoint(apps);
        wire(
            apps.webdav
                .trigger_webdav_sync_with_checkpoint(&checkpoint)?,
        )
    }),
    ("client.pauseWebDavSync", |apps, args| {
        no_args(args)?;
        wire(apps.webdav.pause_webdav_sync()?)
    }),
    ("client.resumeWebDavSync", |apps, args| {
        no_args(args)?;
        wire(apps.webdav.resume_webdav_sync()?)
    }),
    ("client.retryWebDavSync", |apps, args| {
        no_args(args)?;
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
    ("client.resetSynthesisDatabase", reset),
    ("client.debugSynthesisCleanInstallReset", reset),
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
    match control_operation(apps, args, &synthesis_protocol::utc_now_iso8601()) {
        Ok(row) => public_maintenance_operation_dto(&row),
        Err(code) if code == "not_found" => {
            let request = one_object(args)?;
            let operation_id = request
                .get("operation_id")
                .or_else(|| request.get("operationId"))
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .ok_or_else(|| "maintenance_operation_id_required".to_owned())?;
            Ok(json!({
                "schema":"synthesis.maintenance_operation.v1",
                "operation_id":operation_id,
                "status":"not_found",
            }))
        }
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

fn one_object(args: &[Value]) -> Result<Map<String, Value>, String> {
    let [value] = args else {
        return Err("invalid_request".into());
    };
    value
        .as_object()
        .cloned()
        .ok_or_else(|| "invalid_request".to_owned())
}

fn resolve_conflict(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args)?;
    if request.keys().any(|key| key != "action") {
        return Err("invalid_request".into());
    }
    let action = request
        .get("action")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| matches!(*value, "keep_local" | "clear_after_manual_edit"))
        .ok_or_else(|| "invalid_request".to_owned())?;
    wire(apps.webdav.resolve_webdav_sync_conflict(action)?)
}

fn public_maintenance(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args)?;
    if request
        .keys()
        .any(|key| key != "operation_id" && key != "operationId")
    {
        return Err("invalid_request".into());
    }
    let operation_id = request
        .get("operation_id")
        .or_else(|| request.get("operationId"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "maintenance_operation_id_required".to_owned())?;
    let row = apps
        .repository
        .with_reader(|repository| repository.get_operation(operation_id))?;
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
) -> Result<OperationRecord, String> {
    let request = args.first().and_then(Value::as_object);
    let paper_refs = request
        .and_then(|value| value.get("paper_refs").or_else(|| value.get("paperRefs")))
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
        basis_kind: "public_maintenance_operation".into(),
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
    apps.repository
        .owner()
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?
        .insert_operation_if_absent(&row)?;
    Ok(row)
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
        Some(current) if current.status == "running" => Ok(()),
        Some(current) if matches!(current.status.as_str(), "canceled" | "timed_out") => {
            Err("operation_canceled".into())
        }
        _ => Err("operation_state_invalid".into()),
    }
}

pub(crate) fn finish_public_maintenance_operation(
    apps: &ProductionApplications,
    operation_id: &str,
    outcome: Result<&Value, &str>,
    now: &str,
) -> Result<(), String> {
    let owner = apps.repository.owner();
    let repository = owner
        .lock()
        .map_err(|_| "repository_unavailable".to_owned())?;
    let mut row = repository
        .get_operation(operation_id)?
        .ok_or_else(|| "operation_receipt_missing".to_owned())?;
    match outcome {
        Ok(receipt) if receipt.get("ok").and_then(Value::as_bool) != Some(false) => {
            row.status = "completed".into();
            row.phase = "completed".into();
            row.phase_label = "Completed".into();
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
        Ok(receipt) => {
            row.status = "failed".into();
            row.phase = "failed".into();
            row.phase_label = "Failed".into();
            row.failed_count = row.total_count.max(1);
            row.diagnostics_json = serde_json::to_string(&vec![json!({
                "code":"public_maintenance_receipt",
                "receipt":receipt,
            })])
            .map_err(|_| "serialization_failed")?;
        }
        Err(code) => {
            let timed_out = code == "operation_timeout";
            row.status = if timed_out { "timed_out" } else { "failed" }.into();
            row.phase = if timed_out { "timed_out" } else { "failed" }.into();
            row.phase_label = if timed_out { "Timed out" } else { "Failed" }.into();
            row.failed_count = row.total_count.max(1);
            row.diagnostics_json = serde_json::to_string(&vec![json!({
                "code":"public_maintenance_receipt",
                "receipt":{
                    "schema":"synthesis.maintenance_receipt.v1",
                    "outcome":"failed",
                    "state_changed":false,
                    "retryable":true,
                    "diagnostics":[{"code":code,"severity":"error"}],
                },
            })])
            .map_err(|_| "serialization_failed")?;
        }
    }
    row.completed_at = now.into();
    row.updated_at = now.into();
    repository.finish_operation_if_nonterminal(&row).map(|_| ())
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

fn reset(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request = one_object(args)?;
    // The production client admission gate runs before this adapter. Keeping
    // the request opaque here preserves the existing public reset DTO while
    // routing both reset entrypoints through the same typed maintenance port.
    wire(
        apps.debug
            .run_maintenance(DebugMaintenanceKind::Reset, &Value::Object(request))?,
    )
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
        assert_eq!(one_object(&[]), Err("invalid_request".into()));
    }
}
