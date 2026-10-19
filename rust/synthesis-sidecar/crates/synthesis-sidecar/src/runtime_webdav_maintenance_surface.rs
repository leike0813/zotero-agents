use crate::runtime_contract::non_nullable;
use crate::runtime_production_client::{ProductionClientRouteEntry, ProductionClientSpecialStep};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use synthesis_application::webdav_sync::WebDavSyncState;

use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::{
    MaintenanceControlCommand, MaintenanceOperationView, checkpoint_current_before_promotion,
    read as read_maintenance_operation, reconcile_restart,
};

/// The single public adapter for the WebDAV and maintenance operations.
///
/// It deliberately keeps public request validation here: callers never need
/// to know the internal WebDAV state representation or debug-maintenance port.
pub(crate) const WEBDAV_MAINTENANCE_CLIENT_ROUTES: &[ProductionClientRouteEntry] = &[
    ProductionClientRouteEntry::new("client.syncWebDavNow", |apps, args| {
        no_args(args)?;
        apps.canonical_autosync.cancel_pending();
        let checkpoint = || promotion_checkpoint(apps);
        webdav_sync_wire(
            apps.webdav
                .trigger_webdav_sync_with_checkpoint(&checkpoint)?,
        )
    }),
    ProductionClientRouteEntry::new("client.pauseWebDavSync", |apps, args| {
        no_args(args)?;
        apps.canonical_autosync.cancel_pending();
        webdav_sync_wire(apps.webdav.pause_webdav_sync()?)
    }),
    ProductionClientRouteEntry::new("client.resumeWebDavSync", |apps, args| {
        no_args(args)?;
        webdav_sync_wire(apps.webdav.resume_webdav_sync()?)
    }),
    ProductionClientRouteEntry::new("client.retryWebDavSync", |apps, args| {
        no_args(args)?;
        apps.canonical_autosync.cancel_pending();
        let checkpoint = || promotion_checkpoint(apps);
        webdav_sync_wire(apps.webdav.retry_webdav_sync_with_checkpoint(&checkpoint)?)
    }),
    ProductionClientRouteEntry::new("client.resolveWebDavSyncConflict", resolve_conflict),
    ProductionClientRouteEntry::new("client.getPublicMaintenanceOperation", public_maintenance),
    ProductionClientRouteEntry::new(
        "client.controlPublicMaintenanceOperation",
        control_public_maintenance,
    )
    .with_special_step(ProductionClientSpecialStep::MaintenanceControl),
    ProductionClientRouteEntry::new(
        "client.reconcileSynthesisRuntimeWorkStateOnStartup",
        reconcile_startup,
    ),
    ProductionClientRouteEntry::new("client.resetSynthesisDatabase", reset_database)
        .with_special_step(ProductionClientSpecialStep::Reset),
    ProductionClientRouteEntry::new("client.debugSynthesisCleanInstallReset", debug_reset)
        .with_special_step(ProductionClientSpecialStep::Reset),
];

fn promotion_checkpoint(apps: &ProductionApplications) -> Result<(), String> {
    checkpoint_current_before_promotion(apps)
}

fn control_public_maintenance(
    _apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    let request: MaintenanceControlWireRequest = one_request(args)?;
    request.validate()?;
    wire(request)
}

pub(crate) fn public_maintenance_control_request(
    args: &[Value],
) -> Result<(MaintenanceControlCommand, String), String> {
    let request: MaintenanceControlWireRequest = one_request(args)?;
    request.validate()?;
    let operation_id = request.operation_id.trim().to_owned();
    let command = match request.action {
        MaintenanceControlWireAction::Cancel => MaintenanceControlCommand::Cancel {
            operation_id: operation_id.clone(),
        },
        MaintenanceControlWireAction::Continue => MaintenanceControlCommand::Continue {
            operation_id: operation_id.clone(),
        },
        MaintenanceControlWireAction::Retry => MaintenanceControlCommand::Retry {
            operation_id: operation_id.clone(),
            retry_key: request.retry_key.expect("validated retry key"),
        },
    };
    Ok((command, operation_id))
}

pub(crate) fn public_maintenance_not_found(operation_id: &str) -> Value {
    json!({
        "schema":"synthesis.maintenance_operation.v1",
        "operation_id":operation_id,
        "status":"not_found",
    })
}

fn wire<T: serde::Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|_| "production_projection_invalid".into())
}

fn webdav_sync_wire(state: WebDavSyncState) -> Result<Value, String> {
    let mut value = wire(state)?;
    let object = value
        .as_object_mut()
        .ok_or_else(|| "production_projection_invalid".to_owned())?;
    for field in ["connection_test", "progress", "last_run", "conflict_report"] {
        if object.get(field).is_some_and(Value::is_null) {
            object.remove(field);
        }
    }
    if let Some(last_run) = object.get_mut("last_run").and_then(Value::as_object_mut) {
        for field in ["snapshot_id", "manifest_hash"] {
            if last_run.get(field).and_then(Value::as_str) == Some("") {
                last_run.remove(field);
            }
        }
    }
    if let Some(report) = object
        .get_mut("conflict_report")
        .and_then(Value::as_object_mut)
    {
        report.insert(
            "schema_id".into(),
            json!("synthesis.webdav_sync_conflict_report"),
        );
        report.insert("schema_version".into(), json!("1.0.0"));
    }
    Ok(value)
}

fn no_args(args: &[Value]) -> Result<(), String> {
    if args.is_empty() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn one_request<T: MaintenanceWireRequest>(args: &[Value]) -> Result<T, String> {
    let [value] = args else {
        return Err("invalid_request".into());
    };
    let schema = maintenance_request_schema();
    if !crate::runtime_wire_schema::matches(schema, &schema["$defs"][T::DEFINITION], value) {
        return Err("invalid_request".into());
    }
    serde_json::from_value(value.clone()).map_err(|_| "invalid_request".to_owned())
}

trait MaintenanceWireRequest: for<'de> Deserialize<'de> {
    const DEFINITION: &'static str;
}

macro_rules! maintenance_wire_request {
    ($type:ty, $definition:literal) => {
        impl MaintenanceWireRequest for $type {
            const DEFINITION: &'static str = $definition;
        }
    };
}

maintenance_wire_request!(ResolveConflictWireRequest, "ResolveConflictPayload");
maintenance_wire_request!(
    MaintenanceReadWireRequest,
    "MaintenanceOperationReadPayload"
);
maintenance_wire_request!(
    MaintenanceControlWireRequest,
    "MaintenanceOperationControlPayload"
);
maintenance_wire_request!(ResetDatabaseWireRequest, "ResetDatabasePayload");
maintenance_wire_request!(DebugResetWireRequest, "DebugResetPayload");

fn maintenance_request_schema() -> &'static Value {
    static SCHEMA: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    SCHEMA.get_or_init(|| {
        serde_json::from_str(include_str!(
            "../../../../../packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-webdav-maintenance.schema.json"
        ))
        .expect("embedded WebDAV maintenance request schema")
    })
}

#[cfg(test)]
fn decode_maintenance_request(capability: &str, args: &[Value]) -> Result<(), String> {
    match capability {
        "client.syncWebDavNow"
        | "client.pauseWebDavSync"
        | "client.resumeWebDavSync"
        | "client.retryWebDavSync"
        | "client.reconcileSynthesisRuntimeWorkStateOnStartup" => no_args(args),
        "client.resolveWebDavSyncConflict" => {
            one_request::<ResolveConflictWireRequest>(args).map(drop)
        }
        "client.getPublicMaintenanceOperation" => {
            one_request::<MaintenanceReadWireRequest>(args).map(drop)
        }
        "client.controlPublicMaintenanceOperation" => {
            one_request::<MaintenanceControlWireRequest>(args).map(drop)
        }
        "client.resetSynthesisDatabase" => one_request::<ResetDatabaseWireRequest>(args).map(drop),
        "client.debugSynthesisCleanInstallReset" => {
            one_request::<DebugResetWireRequest>(args).map(drop)
        }
        _ => Err("invalid_request".into()),
    }
}

fn resolve_conflict(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: ResolveConflictWireRequest = one_request(args)?;
    let action = match request.action {
        ResolveConflictWireAction::KeepLocal => "keep_local",
        ResolveConflictWireAction::ClearAfterManualEdit => "clear_after_manual_edit",
    };
    apps.canonical_autosync.cancel_pending();
    webdav_sync_wire(apps.webdav.resolve_webdav_sync_conflict(action)?)
}

fn public_maintenance(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: MaintenanceReadWireRequest = one_request(args)?;
    let operation_id = request.validated_operation_id()?;
    match read_maintenance_operation(apps, &operation_id)? {
        Some(view) => public_maintenance_operation_dto(&view),
        None => Ok(json!({
            "schema":"synthesis.maintenance_operation.v1",
            "operation_id":operation_id,
            "status":"not_found",
        })),
    }
}

pub(crate) fn public_maintenance_operation_dto(
    view: &MaintenanceOperationView,
) -> Result<Value, String> {
    let mut dto = serde_json::to_value(view).map_err(|_| "production_projection_invalid")?;
    dto.as_object_mut()
        .ok_or_else(|| "production_projection_invalid".to_owned())?
        .insert(
            "schema".into(),
            Value::String("synthesis.maintenance_operation.v1".into()),
        );
    Ok(dto)
}

fn reconcile_startup(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    no_args(args)?;
    reconcile_restart(apps, &synthesis_protocol::utc_now_iso8601())?;
    // Loading the durable state is the restart reconciliation boundary. The
    // application recovers a persisted syncing state to retryable rather than
    // recreating process-memory defaults.
    let webdav = webdav_sync_wire(apps.webdav.load_webdav_sync_state()?)?;
    let maintenance = apps.workbench.read()?.maintenance;
    Ok(json!({ "status": "ready", "webdav": webdav, "maintenance": maintenance }))
}

fn reset_database(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: ResetDatabaseWireRequest = one_request(args)?;
    finish_reset(apps, apps.reset.database(&request.confirmation_text)?)
}

fn debug_reset(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: DebugResetWireRequest = one_request(args)?;
    finish_reset(
        apps,
        apps.reset.clean_install(
            request.confirmation_text.as_deref(),
            request.dry_run.unwrap_or(true),
        )?,
    )
}

fn finish_reset(
    apps: &ProductionApplications,
    result: crate::runtime_reset::ResetResult,
) -> Result<Value, String> {
    if result.status == "reset" {
        apps.canonical_autosync.cancel_pending();
        if apps
            .topics
            .invalidate_search_rounds()
            .and_then(|()| apps.evidence.invalidate_search_rounds())
            .is_err()
        {
            apps.activity.require_repair();
            return Err("repair_required".into());
        }
    }
    wire(result)
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
    #[serde(
        default,
        deserialize_with = "non_nullable",
        skip_serializing_if = "Option::is_none"
    )]
    confirmation_text: Option<String>,
    #[serde(
        default,
        deserialize_with = "non_nullable",
        skip_serializing_if = "Option::is_none"
    )]
    dry_run: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_requests_use_the_production_maintenance_decoder() {
        let (Ok(cases_path), Ok(results_path)) = (
            std::env::var("SYNTHESIS_MAINTENANCE_REQUEST_CODEC_CASES"),
            std::env::var("SYNTHESIS_MAINTENANCE_REQUEST_CODEC_RESULTS"),
        ) else {
            return;
        };
        let cases: Vec<Value> = serde_json::from_slice(
            &std::fs::read(cases_path).expect("read maintenance decoder cases"),
        )
        .expect("parse maintenance decoder cases");
        let results = cases
            .into_iter()
            .map(|case| {
                let id = case.get("id").cloned().unwrap_or(Value::Null);
                let result = match (
                    case.get("capability").and_then(Value::as_str),
                    case.pointer("/value/args").and_then(Value::as_array),
                ) {
                    (Some(capability), Some(args)) => decode_maintenance_request(capability, args),
                    _ => Err("invalid_request".into()),
                };
                match result {
                    Ok(()) => json!({ "id": id, "accepted": true }),
                    Err(reason) => json!({ "id": id, "accepted": false, "reason": reason }),
                }
            })
            .collect::<Vec<_>>();
        std::fs::write(
            results_path,
            serde_json::to_vec(&results).expect("serialize maintenance decoder results"),
        )
        .expect("write maintenance decoder results");
    }

    #[test]
    fn validates_public_webdav_requests_before_effects() {
        assert_eq!(
            one_request::<MaintenanceReadWireRequest>(&[]).unwrap_err(),
            "invalid_request"
        );
    }

    #[test]
    fn translates_strict_control_wire_requests_into_typed_commands() {
        let (command, operation_id) = public_maintenance_control_request(&[json!({
            "action":"retry",
            "operation_id":"maintenance:one",
            "retry_key":"retry-1",
        })])
        .expect("typed retry");
        assert_eq!(operation_id, "maintenance:one");
        assert_eq!(
            command,
            MaintenanceControlCommand::Retry {
                operation_id: "maintenance:one".into(),
                retry_key: "retry-1".into(),
            }
        );
        assert_eq!(
            public_maintenance_control_request(&[json!({
                "action":"continue",
                "operationId":"maintenance:one",
            })])
            .unwrap_err(),
            "invalid_request"
        );
    }
}
