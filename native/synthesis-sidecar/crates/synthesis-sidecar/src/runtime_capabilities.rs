use crate::runtime_contract::{NativeLaunchConfig, SIDECAR_CAPABILITIES, current_time_ms};
use serde::Deserialize;
use serde_json::{Value, json};
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use synthesis_application::CanonicalStorePort;

use crate::runtime_background_tasks::BackgroundTaskOwner;
use crate::runtime_diagnostics::{
    NativeDiagnosticEvent, TraceContext, emit_debug, with_observation_context,
};
use crate::runtime_http::{HttpRequest, read_http, response};
use crate::runtime_lifecycle::{StopReason, StopSignal};
use crate::runtime_production_client::{ProductionClientRuntime, production_client_error_status};
use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_transfer::{NativeTransferOwner, dispatch_transfer_action};
use crate::runtime_worker_pool::{NativeComputePool, WorkerOperation};

const MAX_READ_BODY_BYTES: usize = 1024 * 1024;
const MAX_READ_RESPONSE_BYTES: usize = 1024 * 1024;
const MAX_JSON_NODES: usize = 50_000;
const MAX_COMPUTE_REQUEST_JSON_NODES: usize = 1_000_000;
const MAX_COMPUTE_RESPONSE_JSON_NODES: usize = 200_000;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CallEnvelope {
    protocol: String,
    request_id: String,
    profile_id: String,
    capability: String,
    payload: Value,
    #[serde(default)]
    trace: Option<TraceContext>,
}

pub(crate) struct RequestContext {
    config: Arc<NativeLaunchConfig>,
    service_instance_id: String,
    repository_id: String,
    applications: Arc<ProductionApplications>,
    production_client: Arc<ProductionClientRuntime>,
    canonical: CanonicalStorePort,
    stop_signal: StopSignal,
    compute_pool: Arc<NativeComputePool>,
    transfer: Arc<Mutex<NativeTransferOwner>>,
    background_tasks: Arc<BackgroundTaskOwner>,
}

impl RequestContext {
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn new(
        config: Arc<NativeLaunchConfig>,
        service_instance_id: String,
        repository_id: String,
        applications: Arc<ProductionApplications>,
        production_client: Arc<ProductionClientRuntime>,
        canonical: CanonicalStorePort,
        stop_signal: StopSignal,
        compute_pool: Arc<NativeComputePool>,
        transfer: Arc<Mutex<NativeTransferOwner>>,
        background_tasks: Arc<BackgroundTaskOwner>,
    ) -> Self {
        Self {
            config,
            service_instance_id,
            repository_id,
            applications,
            production_client,
            canonical,
            stop_signal,
            compute_pool,
            transfer,
            background_tasks,
        }
    }
}

fn valid_bounded_text(value: &str, max: usize) -> bool {
    !value.is_empty() && value.len() <= max && !value.chars().any(char::is_control)
}

fn json_within_bounds(value: &Value, depth: usize, nodes: &mut usize, max_nodes: usize) -> bool {
    json_within_bounds_with_string_limit(value, depth, nodes, max_nodes, 64 * 1024)
}

fn json_within_bounds_for_capability(
    value: &Value,
    capability: &str,
    nodes: &mut usize,
    max_nodes: usize,
) -> bool {
    json_within_bounds_with_string_limit(
        value,
        0,
        nodes,
        max_nodes,
        if capability.starts_with("client.") {
            MAX_READ_BODY_BYTES
        } else {
            64 * 1024
        },
    )
}

fn json_within_bounds_with_string_limit(
    value: &Value,
    depth: usize,
    nodes: &mut usize,
    max_nodes: usize,
    max_string_bytes: usize,
) -> bool {
    if depth > 32 || *nodes >= max_nodes {
        return false;
    }
    *nodes += 1;
    match value {
        Value::String(value) => value.len() <= max_string_bytes,
        Value::Array(values) => values.iter().all(|value| {
            json_within_bounds_with_string_limit(
                value,
                depth + 1,
                nodes,
                max_nodes,
                max_string_bytes,
            )
        }),
        Value::Object(object) => object.iter().all(|(key, value)| {
            key.len() <= 64 * 1024
                && json_within_bounds_with_string_limit(
                    value,
                    depth + 1,
                    nodes,
                    max_nodes,
                    max_string_bytes,
                )
        }),
        _ => true,
    }
}

fn exact_payload(value: &Value, required: &[&str]) -> bool {
    value.as_object().is_some_and(|object| {
        object.len() == required.len() && required.iter().all(|field| object.contains_key(*field))
    })
}

fn call_response(request_id: &str, service_instance_id: &str, data: Value) -> Value {
    json!({
        "ok":true,
        "requestId":request_id,
        "serviceInstanceId":service_instance_id,
        "diagnostics":[],
        "data":data,
    })
}

pub(crate) fn error_response(code: &str) -> Value {
    let public_code = match code {
        "reverse_host_response_too_large" => "response_body_too_large",
        "reference_refresh_payload_too_large" => "request_body_too_large",
        "response_too_large" => "response_body_too_large",
        "request_too_large" => "request_body_too_large",
        "production_projection_invalid" => "response_invalid",
        code if code.starts_with("repository_") && code != "repository_schema_incompatible" => {
            "service_unavailable"
        }
        code if code.starts_with("reverse_host_") => "service_unavailable",
        _ => code,
    };
    let safe_reason = code.chars().take(160).collect::<String>();
    let details = if safe_reason
        .chars()
        .all(|character| character.is_ascii_alphanumeric() || "_:-.".contains(character))
    {
        json!({"reason":safe_reason})
    } else {
        json!({})
    };
    json!({
        "ok":false,
        "requestId":"unknown",
        "serviceInstanceId":"unknown",
        "error":{"code":public_code,"message":public_code,"retryable":false,"details":details}
    })
}

fn compute_pool_snapshot(state: &RequestContext) -> Result<Value, String> {
    state.compute_pool.snapshot(state.stop_signal.is_stopping())
}

fn repository_snapshot(state: &RequestContext) -> Value {
    json!({
        "mode":"production",
        "state":if state.stop_signal.is_stopping() {"stopping"} else {"ready"},
        "schemaVersion":synthesis_repository::SCHEMA_VERSION,
        "repositoryId":state.repository_id,
    })
}

fn canonical_snapshot(state: &RequestContext) -> Result<Value, String> {
    let store_id = state.canonical.store_id()?;
    Ok(json!({
        "state":if state.stop_signal.is_stopping() {"stopping"} else {"ready"},
        "schemaVersion":"synthesis-topic-canonical-store.v1",
        "storeId":store_id,
    }))
}

fn transfer_snapshot(state: &RequestContext) -> Result<Value, String> {
    state
        .transfer
        .lock()
        .map_err(|_| "transfer_unavailable".to_owned())
        .map(|owner| owner.snapshot())
}

fn bounded_response(
    stream: &mut TcpStream,
    status: u16,
    value: Value,
    max_bytes: usize,
) -> Result<(), String> {
    if serde_json::to_vec(&value)
        .map_err(|error| error.to_string())?
        .len()
        > max_bytes
    {
        return response(stream, 503, error_response("response_too_large"));
    }
    response(stream, status, value)
}

pub(crate) fn handle_connection(
    mut stream: TcpStream,
    state: Arc<RequestContext>,
) -> Result<(), String> {
    let HttpRequest {
        method,
        path,
        bearer,
        body,
    } = match read_http(&stream) {
        Ok(request) => request,
        Err(error) => {
            return response(
                &mut stream,
                error.http_status(),
                error_response(error.public_code()),
            );
        }
    };
    if path == "/synthesis/v1/health" {
        if method != "GET" || !body.is_empty() {
            return response(&mut stream, 400, error_response("invalid_request"));
        }
        let health = json!({
            "status":"ok",
            "implementation":state.config.implementation,
            "protocol":state.config.protocol_version,
            "serviceVersion":state.config.service_version,
            "serviceInstanceId":state.service_instance_id,
            "supervisorInstanceId":state.config.supervisor_instance_id,
            "bundleId":state.config.bundle_id,
            "target":state.config.target,
            "targetTriple":state.config.target_triple,
            "buildFingerprint":state.config.build_fingerprint,
            "platformSignature":state.config.platform_signature,
            "lifecycleState":if state.stop_signal.is_stopping() {"stopping"} else {"ready"},
            "repository":repository_snapshot(&state),
            "canonicalStore":canonical_snapshot(&state)?,
            "computePool":compute_pool_snapshot(&state)?,
            "citationGraphTransfer":transfer_snapshot(&state)?,
        });
        return response(&mut stream, 200, health);
    }
    if method != "POST" || path != "/synthesis/v1/call" {
        return response(&mut stream, 404, error_response("not_found"));
    }
    if bearer != state.config.client_token && bearer != state.config.lifecycle_token {
        return response(&mut stream, 401, error_response("unauthorized"));
    }
    let call: CallEnvelope = match serde_json::from_slice(&body) {
        Ok(call) => call,
        Err(_) => return response(&mut stream, 400, error_response("invalid_request")),
    };
    let mut nodes = 0;
    let max_json_nodes = if call.capability.starts_with("compute.") {
        MAX_COMPUTE_REQUEST_JSON_NODES
    } else {
        MAX_JSON_NODES
    };
    if call.protocol != "synthesis-sidecar.v1"
        || !valid_bounded_text(&call.request_id, 512)
        || !valid_bounded_text(&call.profile_id, 512)
        || !valid_bounded_text(&call.capability, 128)
        || call.trace.as_ref().is_some_and(|trace| !trace.is_valid())
        || !json_within_bounds_for_capability(
            &call.payload,
            &call.capability,
            &mut nodes,
            max_json_nodes,
        )
    {
        return response(&mut stream, 400, error_response("invalid_request"));
    }
    if call.profile_id != state.config.profile_id {
        return response(&mut stream, 409, error_response("profile_mismatch"));
    }
    let lifecycle_control = matches!(call.capability.as_str(), "system.shutdown");
    let expected_token = if lifecycle_control {
        &state.config.lifecycle_token
    } else {
        &state.config.client_token
    };
    if bearer != *expected_token {
        return response(
            &mut stream,
            401,
            error_response(if lifecycle_control {
                "lifecycle_forbidden"
            } else {
                "unauthorized"
            }),
        );
    }
    if !call.capability.starts_with("compute.") && body.len() > MAX_READ_BODY_BYTES {
        return response(&mut stream, 413, error_response("request_too_large"));
    }
    with_observation_context(call.trace.as_ref(), || {
        let request_started_at = current_time_ms().unwrap_or_default();
        emit_debug(|| {
            NativeDiagnosticEvent::new("rpc", "request-started", "started")
                .capability(&call.capability)
                .request_id(&call.request_id)
                .correlation_id(&call.request_id)
                .request_bytes(body.len())
        });
        let mut handler_failure = None;
        let outcome = match call.capability.as_str() {
            capability if capability.starts_with("client.") => {
                match state
                    .production_client
                    .execute(&call.request_id, capability, call.payload)
                {
                    Ok(data) => bounded_response(
                        &mut stream,
                        200,
                        call_response(&call.request_id, &state.service_instance_id, data),
                        MAX_READ_RESPONSE_BYTES,
                    ),
                    Err(code) => {
                        handler_failure = Some(code.clone());
                        response(
                            &mut stream,
                            production_client_error_status(&code),
                            error_response(&code),
                        )
                    }
                }
            }
            capability @ ("compute.citation_graph_layout"
            | "compute.citation_graph_metrics"
            | "compute.citation_graph_build") => {
                let _admission = match state.compute_pool.admit(state.stop_signal.stopping_flag()) {
                    Ok(admission) => admission,
                    Err(code) => return response(&mut stream, 503, error_response(code)),
                };
                let operation = match capability {
                    "compute.citation_graph_layout" => WorkerOperation::CitationGraphLayout,
                    "compute.citation_graph_build" => WorkerOperation::CitationGraphBuild,
                    _ => WorkerOperation::CitationGraphMetrics,
                };
                if let Ok(delay) = std::env::var("SYNTHESIS_R7_FAULT_COMPUTE_HOLD_MS")
                    && let Ok(delay) = delay.parse::<u64>()
                {
                    thread::sleep(Duration::from_millis(delay.min(2_000)));
                }
                match state.compute_pool.run_direct(operation, call.payload) {
                    Ok(data) => {
                        let value =
                            call_response(&call.request_id, &state.service_instance_id, data);
                        let mut response_nodes = 0;
                        if !json_within_bounds(
                            &value,
                            0,
                            &mut response_nodes,
                            MAX_COMPUTE_RESPONSE_JSON_NODES,
                        ) {
                            response(&mut stream, 503, error_response("response_too_large"))
                        } else {
                            bounded_response(&mut stream, 200, value, MAX_READ_RESPONSE_BYTES * 8)
                        }
                    }
                    Err(code) => response(
                        &mut stream,
                        if code == "invalid_request" { 400 } else { 503 },
                        error_response(&code),
                    ),
                }
            }
            "transfer.content" => {
                let result = state
                    .transfer
                    .lock()
                    .map_err(|_| "transfer_unavailable".to_owned())?
                    .handle_content(call.payload, current_time_ms()?);
                match result {
                    Ok(data) => bounded_response(
                        &mut stream,
                        200,
                        call_response(&call.request_id, &state.service_instance_id, data),
                        MAX_READ_RESPONSE_BYTES,
                    ),
                    Err(code) => {
                        let status = match code.as_str() {
                            "transfer_busy" => 429,
                            "transfer_not_found" => 404,
                            "transfer_conflict"
                            | "transfer_incomplete"
                            | "transfer_output_not_ready" => 409,
                            "transfer_limit_exceeded" => 413,
                            "transfer_stopping" => 503,
                            _ => 400,
                        };
                        response(&mut stream, status, error_response(&code))
                    }
                }
            }
            "compute.citation_graph_build_transfer" => {
                let result = dispatch_transfer_action(
                    &state.transfer,
                    &state.compute_pool,
                    &state.background_tasks,
                    &state.stop_signal,
                    call.payload,
                );
                match result {
                    Ok(data) => bounded_response(
                        &mut stream,
                        200,
                        call_response(&call.request_id, &state.service_instance_id, data),
                        MAX_READ_RESPONSE_BYTES * 8,
                    ),
                    Err(code) => {
                        let status = match code.as_str() {
                            "transfer_busy" => 429,
                            "transfer_not_found" => 404,
                            "transfer_conflict"
                            | "transfer_incomplete"
                            | "transfer_output_not_ready" => 409,
                            "transfer_limit_exceeded" => 413,
                            "transfer_stopping"
                            | "worker_busy"
                            | "worker_unavailable"
                            | "worker_canceled"
                            | "background_task_owner_unavailable"
                            | "background_task_stopping"
                            | "background_task_spawn_failed" => 503,
                            _ => 400,
                        };
                        response(&mut stream, status, error_response(&code))
                    }
                }
            }
            "system.handshake" => {
                if !exact_payload(
                    &call.payload,
                    &[
                        "schemaVersion",
                        "bundleId",
                        "buildFingerprint",
                        "supervisorInstanceId",
                    ],
                ) {
                    return response(&mut stream, 400, error_response("invalid_request"));
                }
                if call.payload["schemaVersion"] != state.config.schema_version
                    || call.payload["bundleId"] != state.config.bundle_id
                    || call.payload["buildFingerprint"] != state.config.build_fingerprint
                    || call.payload["supervisorInstanceId"] != state.config.supervisor_instance_id
                {
                    return response(&mut stream, 409, error_response("runtime_mismatch"));
                }
                let handshake = json!({
                    "protocol":"synthesis-sidecar.v1",
                    "serviceVersion":state.config.service_version,
                    "serviceInstanceId":state.service_instance_id,
                    "supervisorInstanceId":state.config.supervisor_instance_id,
                    "bundleId":state.config.bundle_id,
                    "implementation":state.config.implementation,
                    "target":state.config.target,
                    "targetTriple":state.config.target_triple,
                    "buildFingerprint":state.config.build_fingerprint,
                    "platformSignature":state.config.platform_signature,
                    "profileId":state.config.profile_id,
                    "schemaVersion":state.config.schema_version,
                    "runtimeRootId":state.config.runtime_root_id,
                    "dataRootId":state.config.data_root_id,
                    "capabilities":SIDECAR_CAPABILITIES,
                    "lifecycleState":"ready",
                    "repository":repository_snapshot(&state),
                    "canonicalStore":canonical_snapshot(&state)?,
                    "computePool":compute_pool_snapshot(&state)?,
                    "citationGraphTransfer":transfer_snapshot(&state)?,
                });
                bounded_response(
                    &mut stream,
                    200,
                    call_response(&call.request_id, &state.service_instance_id, handshake),
                    MAX_READ_RESPONSE_BYTES,
                )
            }
            "workbench.chrome.read" => {
                if !exact_payload(&call.payload, &[]) {
                    return response(&mut stream, 400, error_response("invalid_request"));
                }
                let data = state.applications.workbench.read_json()?;
                bounded_response(
                    &mut stream,
                    200,
                    call_response(&call.request_id, &state.service_instance_id, data),
                    MAX_READ_RESPONSE_BYTES,
                )
            }
            "topics.canonical.inspect" => {
                if !exact_payload(&call.payload, &["topicId"]) {
                    return response(&mut stream, 400, error_response("invalid_request"));
                }
                let Some(topic_id) = call.payload["topicId"].as_str() else {
                    return response(&mut stream, 400, error_response("invalid_request"));
                };
                let data = state.canonical.inspect_descriptor(topic_id)?;
                bounded_response(
                    &mut stream,
                    200,
                    call_response(&call.request_id, &state.service_instance_id, data),
                    MAX_READ_RESPONSE_BYTES,
                )
            }
            "system.shutdown" => {
                if !exact_payload(&call.payload, &[]) {
                    return response(&mut stream, 400, error_response("invalid_request"));
                }
                let response_result = response(
                    &mut stream,
                    200,
                    call_response(
                        &call.request_id,
                        &state.service_instance_id,
                        json!({"accepted":true,"lifecycleState":"stopping"}),
                    ),
                );
                state
                    .stop_signal
                    .request_normal(StopReason::AuthenticatedRequest);
                response_result
            }
            _ => response(&mut stream, 404, error_response("capability_not_found")),
        };
        if let Some(code) = &handler_failure {
            emit_debug(|| {
                NativeDiagnosticEvent::new("rpc", "handler-failed", "failed")
                    .capability(&call.capability)
                    .request_id(&call.request_id)
                    .code(code)
                    .duration_ms(
                        current_time_ms()
                            .unwrap_or(request_started_at)
                            .saturating_sub(request_started_at),
                    )
            });
        }
        match &outcome {
            Ok(()) => emit_debug(|| {
                NativeDiagnosticEvent::new("rpc", "response-written", "succeeded")
                    .capability(&call.capability)
                    .request_id(&call.request_id)
                    .correlation_id(&call.request_id)
                    .duration_ms(
                        current_time_ms()
                            .unwrap_or(request_started_at)
                            .saturating_sub(request_started_at),
                    )
            }),
            Err(error) => {
                emit_debug(|| {
                    NativeDiagnosticEvent::new("rpc", "request-failed", "failed")
                        .capability(&call.capability)
                        .request_id(&call.request_id)
                        .code(error)
                        .duration_ms(
                            current_time_ms()
                                .unwrap_or(request_started_at)
                                .saturating_sub(request_started_at),
                        )
                });
            }
        }
        outcome
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn production_client_string_uses_the_request_budget() {
        let payload = json!({"args":[{"content":"x".repeat(128 * 1024)}]});
        let mut general_nodes = 0;
        assert!(!json_within_bounds(
            &payload,
            0,
            &mut general_nodes,
            MAX_JSON_NODES
        ));
        let mut production_nodes = 0;
        assert!(json_within_bounds_for_capability(
            &payload,
            "client.applyLiteratureDigestSidecar",
            &mut production_nodes,
            MAX_JSON_NODES,
        ));
    }
}
