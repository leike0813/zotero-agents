use serde_json::{Map, Value, json};
use synthesis_application::debug_maintenance::DebugMaintenanceKind;

use crate::runtime_production_ports::ProductionApplications;

/// The single public adapter for the WebDAV and maintenance operations.
///
/// It deliberately keeps public request validation here: callers never need
/// to know the internal WebDAV state representation or debug-maintenance port.
pub(crate) fn dispatch(
    apps: &ProductionApplications,
    operation: &str,
    args: &[Value],
) -> Result<Value, String> {
    match operation {
        "client.syncWebDavNow" => {
            no_args(args)?;
            wire(apps.webdav.trigger_webdav_sync()?)
        }
        "client.pauseWebDavSync" => {
            no_args(args)?;
            wire(apps.webdav.pause_webdav_sync()?)
        }
        "client.resumeWebDavSync" => {
            no_args(args)?;
            wire(apps.webdav.resume_webdav_sync()?)
        }
        "client.retryWebDavSync" => {
            no_args(args)?;
            wire(apps.webdav.retry_webdav_sync()?)
        }
        "client.resolveWebDavSyncConflict" => resolve_conflict(apps, args),
        "client.getPublicMaintenanceOperation" => public_maintenance(apps, args),
        "client.reconcileSynthesisRuntimeWorkStateOnStartup" => reconcile_startup(apps, args),
        "client.resetSynthesisDatabase" => reset(apps, args),
        "client.debugSynthesisCleanInstallReset" => reset(apps, args),
        _ => Err("unknown_operation".into()),
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

fn optional_object(args: &[Value]) -> Result<Map<String, Value>, String> {
    match args {
        [] => Ok(Map::new()),
        [value] => value
            .as_object()
            .cloned()
            .ok_or_else(|| "invalid_request".to_owned()),
        _ => Err("invalid_request".into()),
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
    if !optional_object(args)?.is_empty() {
        return Err("invalid_request".into());
    }
    wire(apps.workbench.read()?.maintenance)
}

fn reconcile_startup(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    no_args(args)?;
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
    fn validates_public_webdav_requests_before_effects() {
        assert_eq!(optional_object(&[json!([])]), Err("invalid_request".into()));
        assert_eq!(one_object(&[]), Err("invalid_request".into()));
    }
}
