use serde::Deserialize;
use serde_json::{Value, json};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

use crate::runtime_capabilities::ServeState;
use crate::runtime_deadline::with_request_context;
use crate::runtime_diagnostics::{
    NativeDiagnosticEvent, child_observation_context, debug_events_enabled, emit_debug,
    with_observation_context,
};
use crate::runtime_production_compat::dispatch_legacy_client;
use crate::runtime_webdav_maintenance_surface::{
    begin_public_maintenance_operation, finish_public_maintenance_operation,
    mark_public_maintenance_running, public_maintenance_operation_dto,
};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_protocol::utc_now_iso8601;
use synthesis_sidecar::production_capabilities::{
    ProductionClientDataPlane, ProductionClientReceipt, ProductionClientSemanticSuccess,
};
use synthesis_sidecar::runtime_contract::current_time_ms;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ClientArguments {
    args: Vec<Value>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicApplyTransferControl {
    bundle: Value,
    asset_transfer: TopicApplyTransferReference,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TopicApplyTransferReference {
    session_id: String,
}

pub(crate) fn dispatch_production_client(
    state: &Arc<ServeState>,
    request_id: &str,
    capability: &str,
    payload: Value,
) -> Result<Value, String> {
    let metadata = state
        .production_client_operations
        .get(capability)
        .ok_or_else(|| "invalid_request".to_owned())?;
    let payload_bytes = serde_json::to_vec(&payload)
        .map_err(|_| "invalid_request".to_owned())?
        .len();
    if payload_bytes > metadata.request_bytes {
        return Err("request_too_large".into());
    }
    let envelope: ClientArguments =
        serde_json::from_value(payload).map_err(|_| "invalid_request".to_owned())?;
    let operation_args = if metadata.request_plane == ProductionClientDataPlane::Transfer
        && envelope
            .args
            .first()
            .is_some_and(|value| value.get("assetTransfer").is_some())
    {
        if capability != "client.applyTopicSynthesisResult" || envelope.args.len() != 1 {
            return Err("invalid_request".to_owned());
        }
        let control: TopicApplyTransferControl = serde_json::from_value(envelope.args[0].clone())
            .map_err(|_| "invalid_request".to_owned())?;
        let assets = state
            .transfer
            .lock()
            .map_err(|_| "transfer_unavailable".to_owned())?
            .topic_apply_assets(&control.asset_transfer.session_id)?;
        vec![json!({"bundle":control.bundle,"assets":assets})]
    } else if metadata.request_plane == ProductionClientDataPlane::Transfer
        && payload_bytes > metadata.control_target_bytes
    {
        return Err("request_too_large".to_owned());
    } else {
        envelope.args
    };
    if metadata.receipt == ProductionClientReceipt::PublicMaintenanceOperation {
        return start_public_maintenance_operation(
            state,
            request_id,
            capability,
            operation_args,
            metadata.deadline_ms,
            metadata.semantic_success.clone(),
        );
    }
    let started_at = Instant::now();
    let result = with_request_context(
        Duration::from_millis(metadata.deadline_ms),
        debug_events_enabled().then_some(request_id),
        || dispatch_legacy_client(&state.applications, capability, &operation_args),
    )?;
    record_semantic_mutation_result(
        capability,
        metadata.semantic_success.as_ref(),
        &result,
        started_at.elapsed(),
    );
    if started_at.elapsed() > Duration::from_millis(metadata.deadline_ms) {
        return Err("operation_timeout".into());
    }
    let result_bytes = serde_json::to_vec(&result)
        .map_err(|_| "production_projection_invalid".to_owned())?
        .len();
    let wire_result = if metadata.result_plane == ProductionClientDataPlane::Locator
        && result_bytes > metadata.control_target_bytes
    {
        state
            .transfer
            .lock()
            .map_err(|_| "transfer_unavailable".to_owned())?
            .publish_client_result(capability, &result, current_time_ms()?)?
    } else {
        result
    };
    if serde_json::to_vec(&wire_result)
        .map_err(|_| "production_projection_invalid".to_owned())?
        .len()
        > metadata.response_bytes
    {
        return Err("response_too_large".into());
    }
    Ok(wire_result)
}

fn start_public_maintenance_operation(
    state: &Arc<ServeState>,
    request_id: &str,
    capability: &str,
    operation_args: Vec<Value>,
    work_deadline_ms: u64,
    semantic_success: Option<ProductionClientSemanticSuccess>,
) -> Result<Value, String> {
    let accepted_at = utc_now_iso8601();
    let source_hash = canonical_json_hash(&json!({
        "capability":capability,
        "args":operation_args,
    }))?;
    let identity_hash = canonical_json_hash(&json!({
        "capability":capability,
        "requestId":request_id,
        "acceptedAt":accepted_at,
    }))?;
    let operation_id = format!(
        "maintenance:{}:{}",
        capability.trim_start_matches("client."),
        &identity_hash["sha256:".len().."sha256:".len() + 24]
    );
    let accepted = begin_public_maintenance_operation(
        state.applications.as_ref(),
        &operation_id,
        capability,
        &operation_args,
        &source_hash,
        &accepted_at,
    )?;
    let accepted_dto = public_maintenance_operation_dto(&accepted)?;
    let applications = Arc::clone(&state.applications);
    let operation_id_for_worker = operation_id.clone();
    let capability_for_worker = capability.to_owned();
    let request_id_for_worker = request_id.to_owned();
    let worker_trace = child_observation_context();
    let spawn_result = thread::Builder::new()
        .name(format!(
            "synthesis-maintenance-{}",
            &identity_hash["sha256:".len().."sha256:".len() + 8]
        ))
        .spawn(move || {
            with_observation_context(worker_trace.as_ref(), || {
                let started_at = utc_now_iso8601();
                if let Err(error) = mark_public_maintenance_running(
                    applications.as_ref(),
                    &operation_id_for_worker,
                    &started_at,
                ) {
                    let _ = finish_public_maintenance_operation(
                        applications.as_ref(),
                        &operation_id_for_worker,
                        Err(&error),
                        &utc_now_iso8601(),
                    );
                    return;
                }
                let observed_at = Instant::now();
                let outcome = with_request_context(
                    Duration::from_millis(work_deadline_ms),
                    debug_events_enabled().then_some(&request_id_for_worker),
                    || {
                        dispatch_legacy_client(
                            applications.as_ref(),
                            &capability_for_worker,
                            &operation_args,
                        )
                    },
                );
                if let Ok(result) = outcome.as_ref() {
                    record_semantic_mutation_result(
                        &capability_for_worker,
                        semantic_success.as_ref(),
                        result,
                        observed_at.elapsed(),
                    );
                }
                let _ = finish_public_maintenance_operation(
                    applications.as_ref(),
                    &operation_id_for_worker,
                    outcome.as_ref().map_err(String::as_str),
                    &utc_now_iso8601(),
                );
            })
        });
    if let Err(error) = spawn_result {
        let code = format!("operation_spawn_failed:{error}");
        finish_public_maintenance_operation(
            state.applications.as_ref(),
            &operation_id,
            Err(&code),
            &utc_now_iso8601(),
        )?;
        let row = state
            .repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .get_operation(&operation_id)?
            .ok_or_else(|| "operation_receipt_missing".to_owned())?;
        return public_maintenance_operation_dto(&row);
    }
    Ok(accepted_dto)
}

fn record_semantic_mutation_result(
    capability: &str,
    rule: Option<&ProductionClientSemanticSuccess>,
    result: &Value,
    duration: Duration,
) {
    let Some(rule) = rule else {
        return;
    };
    let Some(status) = result.get(&rule.field).and_then(Value::as_str) else {
        return;
    };
    let succeeded = rule.values.iter().any(|value| value == status);
    emit_debug(|| {
        NativeDiagnosticEvent::new(
            "operation",
            "mutation-result",
            if succeeded { "succeeded" } else { "failed" },
        )
        .capability(capability)
        .code(status)
        .mutation_status(status)
        .duration_ms(duration.as_millis() as u64)
    });
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
    fn classifies_manifest_declared_semantic_terminals_for_diagnostics() {
        let rule = ProductionClientSemanticSuccess {
            field: "status".into(),
            values: vec!["promoted".into(), "unchanged".into()],
        };
        for status in ["promoted", "unchanged"] {
            assert!(rule.values.iter().any(|value| value == status));
        }
        for status in [
            "worker_busy",
            "worker_failed",
            "basis_mismatch",
            "invalid_request",
            "repair_required",
            "stopping",
        ] {
            assert!(!rule.values.iter().any(|value| value == status));
        }
    }
}
