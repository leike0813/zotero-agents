use serde::Deserialize;
use serde_json::Value;
use std::time::{Duration, Instant};

use crate::runtime_capabilities::ServeState;
use crate::runtime_deadline::with_request_context;
use crate::runtime_diagnostics::{NativeDiagnosticEvent, debug_events_enabled, emit, emit_debug};
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
    record_citation_graph_mutation_result(request_id, capability, &result, started_at.elapsed());
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

fn record_citation_graph_mutation_result(
    request_id: &str,
    capability: &str,
    result: &Value,
    duration: Duration,
) {
    let Some((status, succeeded)) = citation_graph_mutation_status(capability, result) else {
        return;
    };
    let event = || {
        NativeDiagnosticEvent::new(
            "operation",
            "mutation-result",
            if succeeded { "succeeded" } else { "failed" },
        )
        .capability(capability)
        .request_id(request_id)
        .correlation_id(request_id)
        .code(status)
        .mutation_status(status)
        .duration_ms(duration.as_millis() as u64)
    };
    if succeeded {
        emit_debug(event);
    } else {
        emit(event());
    }
}

fn citation_graph_mutation_status<'a>(
    capability: &str,
    result: &'a Value,
) -> Option<(&'a str, bool)> {
    if !matches!(
        capability,
        "client.startCitationGraphUpdate"
            | "client.refreshCitationGraphMetricsNow"
            | "client.recomputeCitationGraphLayout"
            | "client.rebuildCitationGraphCacheNow"
            | "client.refreshCitationGraphCacheIncrementalNow"
            | "client.retryCitationGraphCacheRebuild"
    ) {
        return None;
    }
    let status = result.get("status").and_then(Value::as_str)?;
    Some((status, matches!(status, "promoted" | "unchanged")))
}

pub(crate) fn production_client_error_status(code: &str) -> u16 {
    if code == "invalid_request" {
        400
    } else if code == "mutation_not_admitted"
        || code == "production_activation_replayed"
        || code == "basis_mismatch"
        || code == "schema_mismatch"
        || code == "repository_schema_incompatible"
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
        assert_eq!(production_client_error_status("basis_mismatch"), 409);
        assert_eq!(
            production_client_error_status("repository_schema_incompatible"),
            409
        );
        assert_eq!(
            production_client_error_status("response_body_too_large"),
            413
        );
        assert_eq!(production_client_error_status("worker_busy"), 429);
        assert_eq!(production_client_error_status("request_too_large"), 413);
        assert_eq!(production_client_error_status("worker_timeout"), 408);
        assert_eq!(production_client_error_status("operation_unavailable"), 503);
    }

    #[test]
    fn classifies_graph_mutation_terminal_results_for_diagnostics() {
        for status in ["promoted", "unchanged"] {
            assert_eq!(
                citation_graph_mutation_status(
                    "client.recomputeCitationGraphLayout",
                    &serde_json::json!({"status":status}),
                ),
                Some((status, true))
            );
        }
        for status in [
            "worker_busy",
            "worker_failed",
            "basis_mismatch",
            "invalid_request",
            "repair_required",
            "stopping",
        ] {
            assert_eq!(
                citation_graph_mutation_status(
                    "client.recomputeCitationGraphLayout",
                    &serde_json::json!({"status":status}),
                ),
                Some((status, false))
            );
        }
        assert_eq!(
            citation_graph_mutation_status(
                "client.readTopicDetail",
                &serde_json::json!({"status":"failed"}),
            ),
            None
        );
    }
}
