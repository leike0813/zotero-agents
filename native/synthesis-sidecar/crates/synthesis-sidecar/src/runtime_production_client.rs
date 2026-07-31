use serde::Deserialize;
use serde_json::Value;
use std::time::{Duration, Instant};

use crate::runtime_capabilities::ServeState;
use crate::runtime_deadline::with_request_context;
use crate::runtime_diagnostics::debug_events_enabled;
use crate::runtime_production_compat::dispatch_legacy_client;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ClientArguments {
    args: Vec<Value>,
}

pub(crate) fn dispatch_production_client(
    state: &ServeState,
    request_id: &str,
    capability: &str,
    payload: Value,
) -> Result<Value, String> {
    let metadata = state
        .production_client_operations
        .get(capability)
        .ok_or_else(|| "invalid_request".to_owned())?;
    if serde_json::to_vec(&payload)
        .map_err(|_| "invalid_request".to_owned())?
        .len()
        > metadata.request_bytes
    {
        return Err("request_too_large".into());
    }
    let envelope: ClientArguments =
        serde_json::from_value(payload).map_err(|_| "invalid_request".to_owned())?;
    let started_at = Instant::now();
    let result = with_request_context(
        Duration::from_millis(metadata.deadline_ms),
        debug_events_enabled().then_some(request_id),
        || dispatch_legacy_client(&state.applications, capability, &envelope.args),
    )?;
    if started_at.elapsed() > Duration::from_millis(metadata.deadline_ms) {
        return Err("operation_timeout".into());
    }
    if serde_json::to_vec(&result)
        .map_err(|_| "production_projection_invalid".to_owned())?
        .len()
        > metadata.response_bytes
    {
        return Err("response_too_large".into());
    }
    Ok(result)
}

pub(crate) fn production_client_error_status(code: &str) -> u16 {
    if code == "invalid_request" {
        400
    } else if code == "mutation_not_admitted"
        || code == "production_activation_replayed"
        || code.ends_with("_conflict")
        || code.ends_with("_basis_mismatch")
    {
        409
    } else if code.ends_with("_not_found") || code.ends_with("_missing") {
        404
    } else if code.ends_with("_busy") {
        429
    } else if code.ends_with("_too_large") || code.ends_with("_limit_exceeded") {
        413
    } else if code.ends_with("_timeout") || code.ends_with("_expired") || code == "timeout" {
        408
    } else {
        503
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_stable_production_error_statuses() {
        assert_eq!(production_client_error_status("invalid_request"), 400);
        assert_eq!(production_client_error_status("mutation_not_admitted"), 409);
        assert_eq!(production_client_error_status("topic_not_found"), 404);
        assert_eq!(production_client_error_status("basis_conflict"), 409);
        assert_eq!(production_client_error_status("worker_busy"), 429);
        assert_eq!(production_client_error_status("request_too_large"), 413);
        assert_eq!(production_client_error_status("worker_timeout"), 408);
        assert_eq!(production_client_error_status("operation_unavailable"), 503);
    }
}
