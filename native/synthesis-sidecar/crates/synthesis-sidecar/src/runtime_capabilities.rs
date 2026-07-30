use serde::Deserialize;
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::net::TcpStream;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use synthesis_application::{CanonicalStorePort, TopicCanonicalPort};
use synthesis_repository::Repository;
use synthesis_sidecar::production_capabilities::ProductionClientOperationMetadata;
use synthesis_sidecar::runtime_contract::{
    NativeLaunchConfig, ProductionAdmission, SIDECAR_CAPABILITIES, current_time_ms,
};

use crate::runtime_http::{read_http, response};
use crate::runtime_lifecycle::{
    ProductionActivationEvidence, ProductionOwnership, RuntimeOwnership,
};
use crate::runtime_production_client::{
    dispatch_production_client, production_client_error_status,
};
use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_transfer::{NativeTransferOwner, TransferDispatch};
use crate::runtime_worker_pool::{NativeComputePool, WorkerOperation};

const MAX_READ_BODY_BYTES: usize = 1024 * 1024;
const MAX_READ_RESPONSE_BYTES: usize = 1024 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CallEnvelope {
    protocol: String,
    request_id: String,
    profile_id: String,
    capability: String,
    payload: Value,
}

pub(crate) struct ServeState {
    pub(crate) config: NativeLaunchConfig,
    pub(crate) service_instance_id: String,
    pub(crate) owner_mode: &'static str,
    pub(crate) cutover_receipt_id: Option<String>,
    pub(crate) profile: String,
    pub(crate) repository_id: String,
    pub(crate) repository: Arc<Mutex<Repository>>,
    pub(crate) applications: ProductionApplications,
    pub(crate) production_client_operations: BTreeMap<String, ProductionClientOperationMetadata>,
    pub(crate) mutation_enabled: AtomicBool,
    pub(crate) production_admission: Option<Arc<ProductionAdmission>>,
    pub(crate) production_ownership: Option<Arc<Mutex<ProductionOwnership>>>,
    pub(crate) runtime_ownership: Arc<RuntimeOwnership>,
    pub(crate) discovery: Arc<Mutex<Value>>,
    pub(crate) canonical: CanonicalStorePort,
    pub(crate) stopping: Arc<AtomicBool>,
    pub(crate) compute_pool: Arc<NativeComputePool>,
    pub(crate) transfer: Mutex<NativeTransferOwner>,
}

fn valid_bounded_text(value: &str, max: usize) -> bool {
    !value.is_empty() && value.len() <= max && !value.chars().any(char::is_control)
}

fn json_within_bounds(value: &Value, depth: usize, nodes: &mut usize) -> bool {
    if depth > 32 || *nodes >= 50_000 {
        return false;
    }
    *nodes += 1;
    match value {
        Value::String(value) => value.len() <= 64 * 1024,
        Value::Array(values) => values
            .iter()
            .all(|value| json_within_bounds(value, depth + 1, nodes)),
        Value::Object(object) => object.iter().all(|(key, value)| {
            key.len() <= 64 * 1024 && json_within_bounds(value, depth + 1, nodes)
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

fn error_response(code: &str) -> Value {
    json!({
        "ok":false,
        "requestId":"unknown",
        "serviceInstanceId":"unknown",
        "error":{"code":code,"message":code,"retryable":false,"details":{}}
    })
}

fn compute_pool_snapshot(state: &ServeState) -> Result<Value, String> {
    state
        .compute_pool
        .snapshot(state.stopping.load(Ordering::Acquire))
}

fn repository_snapshot(state: &ServeState) -> Value {
    json!({
        "mode":if state.owner_mode == "production" {"production"} else {"isolated_shadow"},
        "state":if state.stopping.load(Ordering::Acquire) {"stopping"} else {"ready"},
        "schemaVersion":synthesis_repository::SCHEMA_VERSION,
        "repositoryId":state.repository_id,
    })
}

fn canonical_snapshot(state: &ServeState) -> Result<Value, String> {
    let store_id = state
        .canonical
        .owner()
        .lock()
        .map_err(|_| "canonical_store_unavailable".to_owned())?
        .store_id()
        .to_owned();
    Ok(json!({
        "state":if state.stopping.load(Ordering::Acquire) {"stopping"} else {"ready"},
        "schemaVersion":"synthesis-topic-canonical-store.v1",
        "storeId":store_id,
    }))
}

fn transfer_snapshot(state: &ServeState) -> Result<Value, String> {
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
    state: Arc<ServeState>,
) -> Result<(), String> {
    let (method, path, bearer, body) = match read_http(&mut stream) {
        Ok(request) => request,
        Err(_) => {
            return response(&mut stream, 400, error_response("invalid_request"));
        }
    };
    if path == "/synthesis/v1/health" {
        if method != "GET" || !body.is_empty() {
            return response(&mut stream, 400, error_response("invalid_request"));
        }
        let mut health = json!({
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
            "lifecycleState":if state.stopping.load(Ordering::Acquire) {"stopping"} else {"ready"},
            "repository":repository_snapshot(&state),
            "canonicalStore":canonical_snapshot(&state)?,
            "computePool":compute_pool_snapshot(&state)?,
            "citationGraphTransfer":transfer_snapshot(&state)?,
        });
        if state.owner_mode == "production" {
            health["ownerMode"] = json!("production");
            health["mutationEnabled"] = json!(state.mutation_enabled.load(Ordering::Acquire));
            health["capabilityFingerprint"] = json!(
                synthesis_sidecar::production_capabilities::PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT
            );
            health["cutoverReceiptId"] = json!(state.cutover_receipt_id);
            if let Some(generation) = state
                .production_admission
                .as_ref()
                .and_then(|admission| admission.runtime_admission_generation)
            {
                health["runtimeAdmissionGeneration"] = json!(generation);
            }
            health["readyClientCapabilities"] = json!(
                synthesis_sidecar::production_capabilities::READY_PRODUCTION_CLIENT_CAPABILITIES
            );
        }
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
    if call.protocol != "synthesis-sidecar.v1"
        || !valid_bounded_text(&call.request_id, 512)
        || !valid_bounded_text(&call.profile_id, 512)
        || !valid_bounded_text(&call.capability, 128)
        || !json_within_bounds(&call.payload, 0, &mut nodes)
    {
        return response(&mut stream, 400, error_response("invalid_request"));
    }
    if call.profile_id != state.profile {
        return response(&mut stream, 409, error_response("profile_mismatch"));
    }
    let lifecycle_control = matches!(
        call.capability.as_str(),
        "system.shutdown" | "system.production.activate"
    );
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
    match call.capability.as_str() {
        capability if capability.starts_with("client.") => {
            match dispatch_production_client(&state, capability, call.payload) {
                Ok(data) => bounded_response(
                    &mut stream,
                    200,
                    call_response(&call.request_id, &state.service_instance_id, data),
                    MAX_READ_RESPONSE_BYTES,
                ),
                Err(code) => response(
                    &mut stream,
                    production_client_error_status(&code),
                    error_response(&code),
                ),
            }
        }
        capability @ ("compute.citation_graph_layout"
        | "compute.citation_graph_metrics"
        | "compute.citation_graph_build") => {
            let _admission = match state.compute_pool.admit(&state.stopping) {
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
                Ok(data) => response(
                    &mut stream,
                    200,
                    call_response(&call.request_id, &state.service_instance_id, data),
                ),
                Err(code) => response(
                    &mut stream,
                    if code == "invalid_request" { 400 } else { 503 },
                    error_response(&code),
                ),
            }
        }
        "compute.citation_graph_build_transfer" => {
            let result = state
                .transfer
                .lock()
                .map_err(|_| "transfer_unavailable".to_owned())?
                .handle(call.payload, current_time_ms()?);
            match result {
                Ok(TransferDispatch::Response(data)) => bounded_response(
                    &mut stream,
                    200,
                    call_response(&call.request_id, &state.service_instance_id, data),
                    MAX_READ_RESPONSE_BYTES * 8,
                ),
                Ok(TransferDispatch::Execute(execution)) => {
                    let crate::runtime_transfer::TransferExecution {
                        status,
                        mut source,
                        mut sink,
                    } = *execution;
                    let (session_id, attempt) = source.identity();
                    let session_id = session_id.to_owned();
                    let cancellation = source.cancellation();
                    let mut reservation = match state.compute_pool.reserve() {
                        Ok(reservation) => reservation,
                        Err(code) => {
                            if let Ok(mut transfer) = state.transfer.lock() {
                                transfer.reject_queued(
                                    &session_id,
                                    attempt,
                                    current_time_ms().unwrap_or_default(),
                                );
                            }
                            return response(&mut stream, 503, error_response(code));
                        }
                    };
                    let state_for_attempt = Arc::clone(&state);
                    thread::spawn(move || {
                        let result =
                            match reservation.wait(&state_for_attempt.stopping, &cancellation) {
                                Ok(()) => {
                                    let now_ms = current_time_ms().unwrap_or_default();
                                    if let Ok(mut transfer) = state_for_attempt.transfer.lock() {
                                        transfer.mark_executing(&session_id, attempt, now_ms);
                                    }
                                    state_for_attempt.compute_pool.run_paged(
                                        WorkerOperation::CitationGraphBuildTransfer,
                                        &mut source,
                                        &mut sink,
                                        &cancellation,
                                    )
                                }
                                Err(code) => Err(code.to_owned()),
                            };
                        drop(reservation);
                        if let Ok(mut transfer) = state_for_attempt.transfer.lock() {
                            transfer.finish_attempt(
                                &session_id,
                                attempt,
                                result,
                                current_time_ms().unwrap_or_default(),
                            );
                        }
                    });
                    bounded_response(
                        &mut stream,
                        200,
                        call_response(&call.request_id, &state.service_instance_id, status),
                        MAX_READ_RESPONSE_BYTES * 8,
                    )
                }
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
            let mut handshake = json!({
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
                "mutationEnabled":state.mutation_enabled.load(Ordering::Acquire),
                "lifecycleState":"ready",
                "repository":repository_snapshot(&state),
                "canonicalStore":canonical_snapshot(&state)?,
                "computePool":compute_pool_snapshot(&state)?,
                "citationGraphTransfer":transfer_snapshot(&state)?,
            });
            if state.owner_mode == "production" {
                handshake["ownerMode"] = json!("production");
                handshake["capabilityFingerprint"] = json!(
                    synthesis_sidecar::production_capabilities::PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT
                );
                handshake["cutoverReceiptId"] = json!(state.cutover_receipt_id);
                if let Some(generation) = state
                    .production_admission
                    .as_ref()
                    .and_then(|admission| admission.runtime_admission_generation)
                {
                    handshake["runtimeAdmissionGeneration"] = json!(generation);
                }
                handshake["readyClientCapabilities"] = json!(
                    synthesis_sidecar::production_capabilities::READY_PRODUCTION_CLIENT_CAPABILITIES
                );
            }
            bounded_response(
                &mut stream,
                200,
                call_response(&call.request_id, &state.service_instance_id, handshake),
                MAX_READ_RESPONSE_BYTES,
            )
        }
        "workbench.chrome.read" => {
            if !exact_payload(&call.payload, &["state"]) || !call.payload["state"].is_object() {
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
            let data = state.canonical.inspect(topic_id)?;
            bounded_response(
                &mut stream,
                200,
                call_response(&call.request_id, &state.service_instance_id, data),
                MAX_READ_RESPONSE_BYTES,
            )
        }
        "system.production.activate" => {
            if state.owner_mode != "production" {
                return response(&mut stream, 404, error_response("capability_not_found"));
            }
            let ready_capabilities = match synthesis_sidecar::production_capabilities::production_ready_client_capabilities() {
                Ok(capabilities) => capabilities,
                Err(_) => {
                    return response(
                        &mut stream,
                        503,
                        error_response("production_surface_incomplete"),
                    );
                }
            };
            if ready_capabilities.len() != state.production_client_operations.len()
                || ready_capabilities
                    .iter()
                    .any(|capability| !state.production_client_operations.contains_key(capability))
            {
                return response(
                    &mut stream,
                    503,
                    error_response("production_surface_incomplete"),
                );
            }
            let evidence: ProductionActivationEvidence = match serde_json::from_value(call.payload)
            {
                Ok(evidence) => evidence,
                Err(_) => {
                    return response(&mut stream, 400, error_response("invalid_request"));
                }
            };
            let Some(admission) = state.production_admission.as_deref() else {
                return response(
                    &mut stream,
                    409,
                    error_response("production_activation_identity_mismatch"),
                );
            };
            let Some(owner) = state.production_ownership.as_ref() else {
                return response(
                    &mut stream,
                    409,
                    error_response("production_activation_identity_mismatch"),
                );
            };
            let activation_result = owner
                .lock()
                .map_err(|_| "production_owner_unavailable".to_owned())?
                .activate(
                    admission,
                    &evidence,
                    synthesis_sidecar::production_capabilities::READY_PRODUCTION_CLIENT_CAPABILITIES,
                );
            if let Err(code) = activation_result {
                return response(
                    &mut stream,
                    production_client_error_status(&code),
                    error_response(&code),
                );
            }
            {
                let mut discovery = state
                    .discovery
                    .lock()
                    .map_err(|_| "discovery_unavailable".to_owned())?;
                discovery["mutationEnabled"] = json!(true);
                state.runtime_ownership.publish_discovery(&discovery)?;
            }
            state.mutation_enabled.store(true, Ordering::Release);
            response(
                &mut stream,
                200,
                call_response(
                    &call.request_id,
                    &state.service_instance_id,
                    json!({
                        "activated":true,
                        "mutationEnabled":true,
                        "serviceInstanceId":state.service_instance_id,
                        "cutoverReceiptId":state.cutover_receipt_id,
                        "runtimeAdmissionGeneration":evidence.runtime_admission_generation,
                    }),
                ),
            )
        }
        "system.shutdown" => {
            if !exact_payload(&call.payload, &[]) {
                return response(&mut stream, 400, error_response("invalid_request"));
            }
            state.stopping.store(true, Ordering::Release);
            state.compute_pool.stop();
            state
                .transfer
                .lock()
                .map_err(|_| "transfer_unavailable".to_owned())?
                .stop();
            response(
                &mut stream,
                200,
                call_response(
                    &call.request_id,
                    &state.service_instance_id,
                    json!({"accepted":true,"lifecycleState":"stopping"}),
                ),
            )
        }
        _ => response(&mut stream, 404, error_response("capability_not_found")),
    }
}
