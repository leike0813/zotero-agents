use std::{
    collections::HashMap,
    io::{Read, Write},
    net::TcpStream,
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex, OnceLock,
    },
    time::Duration,
    time::{SystemTime, UNIX_EPOCH},
};

use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

use crate::{
    config::BridgeConfig,
    error::{CliError, ErrorCategory},
};

const PROTOCOL: &str = "host-bridge.v1";
static OPERATION_SEQUENCE: AtomicU64 = AtomicU64::new(0);
static LAST_OPERATION_ID: OnceLock<Mutex<Option<String>>> = OnceLock::new();

fn record_operation_id(operation_id: &str) {
    if let Ok(mut current) = LAST_OPERATION_ID.get_or_init(|| Mutex::new(None)).lock() {
        *current = Some(operation_id.to_string());
    }
}

pub fn last_operation_id() -> Option<String> {
    LAST_OPERATION_ID
        .get_or_init(|| Mutex::new(None))
        .lock()
        .ok()
        .and_then(|current| current.clone())
}

fn generated_operation_id() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let sequence = OPERATION_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    format!("cli-{}-{nanos:x}-{sequence:x}", std::process::id())
}

fn operation_id_for(config: &BridgeConfig, suffix: Option<&str>) -> String {
    match (config.operation_id.as_deref(), suffix) {
        (Some(base), Some(suffix)) => format!("{base}:{suffix}"),
        (Some(base), None) => base.to_string(),
        (None, _) => generated_operation_id(),
    }
}

fn operation_context(mut error: CliError, operation_id: &str) -> CliError {
    if !matches!(
        error.code.as_str(),
        "bridge_request_failed" | "bridge_response_failed"
    ) {
        return error;
    }
    let mut details = error.details.take().unwrap_or_else(|| json!({}));
    if let Some(object) = details.as_object_mut() {
        object.insert("operationId".to_string(), json!(operation_id));
    }
    error.details = Some(details);
    error.next_command = Some(format!("operation get {operation_id}"));
    error.safe_next_actions = Some(vec![
        "inspect the durable operation receipt before deciding whether to retry".to_string(),
    ]);
    error
}

#[derive(Debug, Clone)]
struct ParsedEndpoint {
    host: String,
    port: u16,
    base_path: String,
}

#[derive(Debug, Clone)]
pub struct DownloadResponse {
    pub bytes: Vec<u8>,
    pub content_type: String,
    pub verified: bool,
    pub bytes_expected: Option<usize>,
    pub sha256_expected: Option<String>,
    pub sha256_actual: String,
    pub attempts: usize,
    pub retried: bool,
}

pub fn health(config: &BridgeConfig) -> Result<Value, CliError> {
    request_json(config, "GET", "/health", None, false)
}

pub fn manifest(config: &BridgeConfig) -> Result<Value, CliError> {
    request_json(config, "GET", "/manifest", None, true).and_then(check_protocol)
}

pub fn call(config: &BridgeConfig, capability: &str, input: Value) -> Result<Value, CliError> {
    request_json(
        config,
        "POST",
        "/call",
        Some(json!({
            "capability": capability,
            "input": input
        })),
        true,
    )
}

pub fn get(config: &BridgeConfig, path: &str) -> Result<Value, CliError> {
    request_json(config, "GET", path, None, true)
}

pub fn post(config: &BridgeConfig, path: &str, body: Value) -> Result<Value, CliError> {
    request_json(config, "POST", path, Some(body), true)
}

pub fn upload(
    config: &BridgeConfig,
    path: &str,
    bytes: &[u8],
    display_name: Option<&str>,
    content_type: Option<&str>,
) -> Result<Value, CliError> {
    let endpoint = parse_endpoint(&config.endpoint)?;
    let target = format!("{}{}", endpoint.base_path, path);
    let scope_text = config
        .scope
        .as_ref()
        .map(serde_json::to_string)
        .transpose()
        .map_err(|error| CliError::internal("internal_json_error", error.to_string()))?;
    let operation_id = operation_id_for(config, None);
    record_operation_id(&operation_id);
    let request = build_http_request_bytes(
        "POST",
        &endpoint.host,
        &target,
        Some(config.require_token()?),
        scope_text.as_deref(),
        config.connection_mode.as_deref(),
        Some(&operation_id),
        content_type.unwrap_or("application/octet-stream"),
        display_name.map(sanitize_header_value).as_deref(),
        bytes,
    );
    let raw = send_http_bytes(&endpoint, &request)
        .map_err(|error| operation_context(error, &operation_id))?;
    let parsed = parse_http_response_bytes(&raw)?;
    let response_body = String::from_utf8(parsed.body.clone()).map_err(|error| {
        CliError::protocol(
            "invalid_bridge_json",
            "Bridge response body is not valid UTF-8 JSON",
        )
        .with_details(json!({ "message": error.to_string(), "status": parsed.status }))
    })?;
    let json = serde_json::from_str::<Value>(&response_body).map_err(|error| {
        CliError::protocol(
            "invalid_bridge_json",
            "Bridge response body is not valid JSON",
        )
        .with_details(json!({ "message": error.to_string(), "status": parsed.status }))
    })?;
    if parsed.status == 401 {
        return Err(CliError::auth(
            "unauthorized",
            "Host Bridge rejected the bearer token",
        ));
    }
    if parsed.status >= 400 {
        return Err(bridge_error_from_value(parsed.status, json));
    }
    if json.get("status").and_then(Value::as_str) != Some("ok") {
        return Err(CliError::protocol(
            "invalid_bridge_envelope",
            "Bridge response envelope is not status=ok",
        )
        .with_details(json!({ "bridge": json })));
    }
    Ok(json.get("result").cloned().unwrap_or(Value::Null))
}

fn sanitize_header_value(value: &str) -> String {
    value
        .chars()
        .map(|ch| if ch == '\r' || ch == '\n' { ' ' } else { ch })
        .collect()
}

pub fn download(config: &BridgeConfig, path: &str) -> Result<DownloadResponse, CliError> {
    let endpoint = parse_endpoint(&config.endpoint)?;
    let target = format!("{}{}", endpoint.base_path, path);
    let scope_text = config
        .scope
        .as_ref()
        .map(serde_json::to_string)
        .transpose()
        .map_err(|error| CliError::internal("internal_json_error", error.to_string()))?;
    let request = build_http_request(
        "GET",
        &endpoint.host,
        &target,
        Some(config.require_token()?),
        scope_text.as_deref(),
        config.connection_mode.as_deref(),
        None,
        None,
    );
    for attempt in 1..=2 {
        match download_once(&endpoint, &request, attempt) {
            Ok(mut response) => {
                response.attempts = attempt;
                response.retried = attempt > 1;
                return Ok(response);
            }
            Err(error) if is_retriable_download_error(&error) && attempt < 2 => {
                continue;
            }
            Err(error) if is_retriable_download_error(&error) => {
                return Err(download_retry_exhausted(error, attempt));
            }
            Err(error) => return Err(error),
        }
    }
    Err(CliError::new(
        "download_retry_exhausted",
        ErrorCategory::Download,
        "Host Bridge download retry was exhausted",
    )
    .with_details(json!({ "attempts": 2 })))
}

fn download_once(
    endpoint: &ParsedEndpoint,
    request: &str,
    attempt: usize,
) -> Result<DownloadResponse, CliError> {
    let raw = send_http(endpoint, request)?;
    let parsed = parse_http_response_bytes(&raw)?;
    if parsed.status == 401 {
        return Err(CliError::auth(
            "unauthorized",
            "Host Bridge rejected the bearer token",
        ));
    }
    if parsed.status >= 400 {
        return Err(bridge_error_from_json(parsed.status, &parsed.body));
    }
    let bytes_expected = parsed
        .headers
        .get("content-length")
        .map(|value| {
            value.parse::<usize>().map_err(|_| {
                CliError::new(
                    "download_truncated",
                    ErrorCategory::Download,
                    "Host Bridge download Content-Length is invalid",
                )
                .with_details(json!({
                    "bytesReceived": parsed.body.len(),
                    "attempts": attempt
                }))
            })
        })
        .transpose()?;
    if let Some(expected) = bytes_expected {
        if expected != parsed.body.len() {
            return Err(CliError::new(
                "download_truncated",
                ErrorCategory::Download,
                "Host Bridge download body length did not match Content-Length",
            )
            .with_details(json!({
                "bytesExpected": expected,
                "bytesReceived": parsed.body.len(),
                "attempts": attempt
            })));
        }
    }
    let sha256_expected = parsed
        .headers
        .get("x-zotero-bridge-sha256")
        .map(|value| normalize_sha256(value));
    let sha256_actual = sha256_hex(&parsed.body);
    if let Some(expected) = sha256_expected.as_deref() {
        if expected != sha256_actual {
            return Err(CliError::new(
                "download_checksum_mismatch",
                ErrorCategory::Download,
                "Host Bridge download checksum did not match",
            )
            .with_details(json!({
                "bytesExpected": bytes_expected,
                "bytesReceived": parsed.body.len(),
                "sha256Expected": expected,
                "sha256Actual": sha256_actual,
                "attempts": attempt
            })));
        }
    }
    Ok(DownloadResponse {
        bytes: parsed.body,
        content_type: parsed
            .headers
            .get("content-type")
            .cloned()
            .unwrap_or_else(|| "application/octet-stream".to_string()),
        verified: true,
        bytes_expected,
        sha256_expected,
        sha256_actual,
        attempts: attempt,
        retried: attempt > 1,
    })
}

fn is_retriable_download_error(error: &CliError) -> bool {
    matches!(
        error.code.as_str(),
        "download_truncated" | "download_checksum_mismatch" | "bridge_response_failed"
    )
}

fn download_retry_exhausted(error: CliError, attempts: usize) -> CliError {
    let mut details = Map::new();
    details.insert("attempts".to_string(), json!(attempts));
    details.insert("lastErrorCode".to_string(), json!(error.code));
    if let Some(Value::Object(map)) = error.details {
        for key in ["bytesExpected", "bytesReceived"] {
            if let Some(value) = map.get(key) {
                details.insert(key.to_string(), value.clone());
            }
        }
    }
    CliError::new(
        "download_retry_exhausted",
        ErrorCategory::Download,
        "Host Bridge download retry was exhausted",
    )
    .with_details(Value::Object(details))
}

fn normalize_sha256(value: &str) -> String {
    let trimmed = value.trim().to_ascii_lowercase();
    if trimmed.starts_with("sha256:") {
        trimmed
    } else {
        format!("sha256:{trimmed}")
    }
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("sha256:{:x}", hasher.finalize())
}

fn request_json(
    config: &BridgeConfig,
    method: &str,
    path: &str,
    body: Option<Value>,
    auth: bool,
) -> Result<Value, CliError> {
    let endpoint = parse_endpoint(&config.endpoint)?;
    let token = if auth {
        Some(config.require_token()?)
    } else {
        None
    };
    let target = format!("{}{}", endpoint.base_path, path);
    let body_text = body
        .map(|value| serde_json::to_string(&value))
        .transpose()
        .map_err(|error| CliError::internal("internal_json_error", error.to_string()))?;
    let scope_text = if auth {
        config
            .scope
            .as_ref()
            .map(serde_json::to_string)
            .transpose()
            .map_err(|error| CliError::internal("internal_json_error", error.to_string()))?
    } else {
        None
    };
    let operation_id = (method != "GET").then(|| operation_id_for(config, None));
    if let Some(operation_id) = operation_id.as_deref() {
        record_operation_id(operation_id);
    }
    let request = build_http_request(
        method,
        &endpoint.host,
        &target,
        token,
        scope_text.as_deref(),
        if auth {
            config.connection_mode.as_deref()
        } else {
            None
        },
        operation_id.as_deref(),
        body_text.as_deref(),
    );
    let raw = send_http(&endpoint, &request).map_err(|error| {
        operation_id
            .as_deref()
            .map(|operation_id| operation_context(error.clone(), operation_id))
            .unwrap_or(error)
    })?;
    let parsed = parse_http_response_bytes(&raw)?;
    let response_body = String::from_utf8(parsed.body.clone()).map_err(|error| {
        CliError::protocol(
            "invalid_bridge_json",
            "Bridge response body is not valid UTF-8 JSON",
        )
        .with_details(json!({ "message": error.to_string(), "status": parsed.status }))
    })?;
    let json = serde_json::from_str::<Value>(&response_body).map_err(|error| {
        CliError::protocol(
            "invalid_bridge_json",
            "Bridge response body is not valid JSON",
        )
        .with_details(json!({ "message": error.to_string(), "status": parsed.status }))
    })?;
    if parsed.status == 401 {
        return Err(CliError::auth(
            "unauthorized",
            "Host Bridge rejected the bearer token",
        ));
    }
    if parsed.status >= 400 {
        return Err(bridge_error_from_value(parsed.status, json));
    }
    if json.get("status").and_then(Value::as_str) != Some("ok") {
        return Err(CliError::protocol(
            "invalid_bridge_envelope",
            "Bridge response envelope is not status=ok",
        )
        .with_details(json!({ "bridge": json })));
    }
    Ok(json.get("result").cloned().unwrap_or(Value::Null))
}

fn bridge_error_from_json(status: u16, body: &[u8]) -> CliError {
    let json = std::str::from_utf8(body)
        .ok()
        .and_then(|text| serde_json::from_str::<Value>(text).ok())
        .unwrap_or(Value::Null);
    bridge_error_from_value(status, json)
}

fn bridge_error_from_value(status: u16, json: Value) -> CliError {
    let bridge_error = json.get("error").unwrap_or(&Value::Null);
    let code = bridge_error
        .get("code")
        .and_then(Value::as_str)
        .unwrap_or("bridge_error");
    let category = match bridge_error.get("category").and_then(Value::as_str) {
        Some("usage") => crate::error::ErrorCategory::Usage,
        Some("config") => crate::error::ErrorCategory::Config,
        Some("connection") => crate::error::ErrorCategory::Connection,
        Some("auth") => crate::error::ErrorCategory::Auth,
        Some("permission") => crate::error::ErrorCategory::Permission,
        Some("validation") => crate::error::ErrorCategory::Validation,
        Some("capability") => crate::error::ErrorCategory::Capability,
        Some("workflow") => crate::error::ErrorCategory::Workflow,
        Some("download") => crate::error::ErrorCategory::Download,
        Some("internal") => crate::error::ErrorCategory::Internal,
        Some("protocol") => crate::error::ErrorCategory::Protocol,
        _ => match code {
            "capability_not_found" | "capability_failed" => crate::error::ErrorCategory::Capability,
            "workflow_not_found"
            | "workflow_run_not_found"
            | "workflow_submit_failed"
            | "backend_not_found"
            | "skill_run_not_found"
            | "skill_run_not_waiting"
            | "skill_run_not_recoverable"
            | "unsupported_interaction_backend" => crate::error::ErrorCategory::Workflow,
            "workflow_submit_requires_approval"
            | "approval_required"
            | "permission_request_not_found"
            | "permission_denied"
            | "permission_timeout"
            | "permission_ui_unavailable" => crate::error::ErrorCategory::Permission,
            "file_not_found"
            | "file_handle_expired"
            | "file_unavailable"
            | "download_failed"
            | "upload_failed" => crate::error::ErrorCategory::Download,
            "invalid_capability_input"
            | "invalid_workflow_agent_run_request"
            | "invalid_workflow_input"
            | "invalid_workflow_submit_request"
            | "invalid_workflow_describe_request"
            | "invalid_skill_run_id"
            | "invalid_object_ref"
            | "invalid_file_id"
            | "upload_empty"
            | "upload_too_large"
            | "unsupported_cache_scope"
            | "bad_request" => crate::error::ErrorCategory::Validation,
            _ => crate::error::ErrorCategory::Protocol,
        },
    };
    let message = bridge_error
        .get("message")
        .and_then(Value::as_str)
        .unwrap_or("Host Bridge returned an error");
    let safe_next_actions = bridge_error
        .get("safeNextActions")
        .and_then(Value::as_array)
        .map(|actions| {
            actions
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect::<Vec<_>>()
        });
    let mut error = CliError::new(code, category, message)
        .with_details(json!({ "status": status, "bridge": json }))
        .with_control(
            bridge_error.get("retryable").and_then(Value::as_bool),
            None,
            None,
            safe_next_actions,
        );
    if let Some(value) = bridge_error.get("stateChange").and_then(Value::as_str) {
        error.state_change = match value {
            "unchanged" => Some(crate::error::StateChange::Unchanged),
            "changed" => Some(crate::error::StateChange::Changed),
            "unknown" => Some(crate::error::StateChange::Unknown),
            _ => error.state_change,
        };
    }
    if let Some(value) = bridge_error
        .get("handleConsumption")
        .and_then(Value::as_str)
    {
        error.handle_consumption = match value {
            "unconsumed" => Some(crate::error::HandleConsumption::Unconsumed),
            "consumed" => Some(crate::error::HandleConsumption::Consumed),
            "unknown" => Some(crate::error::HandleConsumption::Unknown),
            _ => error.handle_consumption,
        };
    }
    if let Some(next_command) = bridge_error.get("nextCommand").and_then(Value::as_str) {
        error = error.with_next_command(next_command);
    }
    error
}

fn check_protocol(result: Value) -> Result<Value, CliError> {
    let protocol = result.get("protocol").and_then(Value::as_str).unwrap_or("");
    if protocol != PROTOCOL {
        return Err(CliError::protocol(
            "incompatible_bridge_protocol",
            "Host Bridge protocol version is incompatible",
        )
        .with_details(json!({
            "expected": PROTOCOL,
            "actual": protocol
        })));
    }
    Ok(result)
}

fn parse_endpoint(endpoint: &str) -> Result<ParsedEndpoint, CliError> {
    let without_scheme = endpoint.strip_prefix("http://").ok_or_else(|| {
        CliError::config(
            "config_unsupported_endpoint",
            "Only http:// Host Bridge endpoints are supported in v1",
        )
    })?;
    let (authority, path) = without_scheme.split_once('/').ok_or_else(|| {
        CliError::config("config_invalid_endpoint", "Endpoint must include a path")
    })?;
    let (host, port) = authority.rsplit_once(':').ok_or_else(|| {
        CliError::config("config_invalid_endpoint", "Endpoint must include host:port")
    })?;
    let port = port
        .parse::<u16>()
        .map_err(|_| CliError::config("config_invalid_endpoint", "Endpoint port is invalid"))?;
    Ok(ParsedEndpoint {
        host: host.to_string(),
        port,
        base_path: format!("/{}", path.trim_end_matches('/')),
    })
}

fn build_http_request(
    method: &str,
    host: &str,
    path: &str,
    token: Option<&str>,
    scope: Option<&str>,
    connection_mode: Option<&str>,
    operation_id: Option<&str>,
    body: Option<&str>,
) -> String {
    let body = body.unwrap_or("");
    let mut lines = vec![
        format!("{method} {path} HTTP/1.1"),
        format!("Host: {host}"),
        "Accept: application/json".to_string(),
        "Connection: close".to_string(),
    ];
    if let Some(token) = token {
        lines.push(format!("Authorization: Bearer {token}"));
    }
    if let Some(scope) = scope {
        lines.push(format!("X-Zotero-Bridge-Scope: {scope}"));
    }
    if let Some(connection_mode) = connection_mode {
        lines.push(format!(
            "X-Zotero-Bridge-Connection-Mode: {connection_mode}"
        ));
    }
    if let Some(operation_id) = operation_id {
        lines.push(format!("X-Zotero-Bridge-Operation-Id: {operation_id}"));
    }
    if !body.is_empty() {
        lines.push("Content-Type: application/json".to_string());
    }
    lines.push(format!("Content-Length: {}", body.len()));
    lines.push(String::new());
    lines.push(body.to_string());
    lines.join("\r\n")
}

fn build_http_request_bytes(
    method: &str,
    host: &str,
    path: &str,
    token: Option<&str>,
    scope: Option<&str>,
    connection_mode: Option<&str>,
    operation_id: Option<&str>,
    content_type: &str,
    display_name: Option<&str>,
    body: &[u8],
) -> Vec<u8> {
    let mut lines = vec![
        format!("{method} {path} HTTP/1.1"),
        format!("Host: {host}"),
        "Accept: application/json".to_string(),
        format!("Content-Type: {content_type}"),
        "Connection: close".to_string(),
    ];
    if let Some(token) = token {
        lines.push(format!("Authorization: Bearer {token}"));
    }
    if let Some(scope) = scope {
        lines.push(format!("X-Zotero-Bridge-Scope: {scope}"));
    }
    if let Some(connection_mode) = connection_mode {
        lines.push(format!(
            "X-Zotero-Bridge-Connection-Mode: {connection_mode}"
        ));
    }
    if let Some(operation_id) = operation_id {
        lines.push(format!("X-Zotero-Bridge-Operation-Id: {operation_id}"));
    }
    if let Some(display_name) = display_name {
        lines.push(format!("X-Zotero-Bridge-Display-Name: {display_name}"));
    }
    lines.push(format!("Content-Length: {}", body.len()));
    lines.push(String::new());
    lines.push(String::new());
    let mut request = lines.join("\r\n").into_bytes();
    request.extend_from_slice(body);
    request
}

fn send_http(endpoint: &ParsedEndpoint, request: &str) -> Result<Vec<u8>, CliError> {
    send_http_bytes(endpoint, request.as_bytes())
}

fn send_http_bytes(endpoint: &ParsedEndpoint, request: &[u8]) -> Result<Vec<u8>, CliError> {
    let address = format!("{}:{}", endpoint.host, endpoint.port);
    let mut stream = TcpStream::connect(address).map_err(|error| {
        CliError::connection("bridge_unavailable", "Cannot connect to Host Bridge")
            .with_details(json!({ "message": error.to_string() }))
    })?;
    stream
        .set_read_timeout(Some(Duration::from_secs(30)))
        .map_err(|error| {
            CliError::connection("connection_timeout_setup_failed", error.to_string())
        })?;
    stream.write_all(request).map_err(|error| {
        CliError::connection("bridge_request_failed", error.to_string()).with_outcome(
            false,
            crate::error::StateChange::Unknown,
            crate::error::HandleConsumption::Unknown,
            vec!["inspect operation receipt when an operation id is available".to_string()],
        )
    })?;
    let mut raw = Vec::new();
    stream.read_to_end(&mut raw).map_err(|error| {
        CliError::connection("bridge_response_failed", error.to_string()).with_outcome(
            false,
            crate::error::StateChange::Unknown,
            crate::error::HandleConsumption::Unknown,
            vec!["inspect operation receipt when an operation id is available".to_string()],
        )
    })?;
    Ok(raw)
}

struct ParsedHttpResponse {
    status: u16,
    headers: HashMap<String, String>,
    body: Vec<u8>,
}

fn parse_http_response_bytes(raw: &[u8]) -> Result<ParsedHttpResponse, CliError> {
    let split = raw
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .ok_or_else(|| {
            CliError::protocol(
                "invalid_http_response",
                "Bridge response is not a complete HTTP response",
            )
        })?;
    let head = std::str::from_utf8(&raw[..split]).map_err(|error| {
        CliError::protocol(
            "invalid_http_response",
            "Bridge response header is not UTF-8",
        )
        .with_details(json!({ "message": error.to_string() }))
    })?;
    let status = head
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|value| value.parse::<u16>().ok())
        .ok_or_else(|| {
            CliError::protocol("invalid_http_status", "Bridge response status is invalid")
        })?;
    let mut headers = HashMap::new();
    for line in head.lines().skip(1) {
        if let Some((name, value)) = line.split_once(':') {
            headers.insert(name.trim().to_ascii_lowercase(), value.trim().to_string());
        }
    }
    Ok(ParsedHttpResponse {
        status,
        headers,
        body: raw[split + 4..].to_vec(),
    })
}

#[cfg(test)]
fn parse_http_response(raw: &str) -> Result<(u16, String), CliError> {
    let parsed = parse_http_response_bytes(raw.as_bytes())?;
    Ok((
        parsed.status,
        String::from_utf8_lossy(&parsed.body).to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use std::{
        io::{Read, Write},
        net::TcpListener,
        thread,
    };

    use serde_json::json;

    use super::{
        bridge_error_from_value, build_http_request, download, manifest, parse_endpoint,
        parse_http_response, parse_http_response_bytes, sha256_hex,
    };
    use crate::config::BridgeConfig;

    #[test]
    fn parses_bridge_endpoint() {
        let endpoint = parse_endpoint("http://127.0.0.1:26570/bridge/v1").unwrap();
        assert_eq!(endpoint.host, "127.0.0.1");
        assert_eq!(endpoint.port, 26570);
        assert_eq!(endpoint.base_path, "/bridge/v1");
    }

    #[test]
    fn builds_authorized_request_without_leaking_in_tests() {
        let request = build_http_request(
            "POST",
            "127.0.0.1",
            "/bridge/v1/call",
            Some("secret-token"),
            None,
            None,
            None,
            Some("{}"),
        );
        assert!(request.starts_with("POST /bridge/v1/call HTTP/1.1"));
        assert!(request.contains("Authorization: Bearer secret-token"));
        assert!(request.ends_with("{}"));
    }

    #[test]
    fn includes_profile_scope_when_building_request() {
        let scope = r#"{"kind":"acp-skill-run","requestId":"run-1"}"#;
        let request = build_http_request(
            "POST",
            "127.0.0.1",
            "/bridge/v1/workflows/submit",
            Some("secret-token"),
            Some(scope),
            None,
            None,
            Some("{}"),
        );

        assert!(request.contains("Authorization: Bearer secret-token"));
        assert!(request.contains(&format!("X-Zotero-Bridge-Scope: {scope}")));
    }

    #[test]
    fn includes_connection_mode_when_building_authenticated_request() {
        let request = build_http_request(
            "POST",
            "127.0.0.1",
            "/bridge/v1/call",
            Some("secret-token"),
            None,
            Some("remote"),
            None,
            Some("{}"),
        );

        assert!(request.contains("Authorization: Bearer secret-token"));
        assert!(request.contains("X-Zotero-Bridge-Connection-Mode: remote"));
    }

    #[test]
    fn parses_http_response_body() {
        let (status, body) =
            parse_http_response("HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n{}").unwrap();
        assert_eq!(status, 200);
        assert_eq!(body, "{}");
    }

    #[test]
    fn parses_http_response_bytes_preserves_content_length_mismatches() {
        let short =
            parse_http_response_bytes(b"HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\nab").unwrap();
        assert_eq!(short.headers["content-length"], "4");
        assert_eq!(short.body, b"ab");

        let long =
            parse_http_response_bytes(b"HTTP/1.1 200 OK\r\nContent-Length: 1\r\n\r\nabcd").unwrap();
        assert_eq!(long.headers["content-length"], "1");
        assert_eq!(long.body, b"abcd");
    }

    #[test]
    fn classifies_host_bridge_error_codes_by_category() {
        use crate::error::ErrorCategory;

        let cases = [
            ("invalid_object_ref", ErrorCategory::Validation),
            ("permission_request_not_found", ErrorCategory::Permission),
            ("backend_not_found", ErrorCategory::Workflow),
            ("workflow_not_found", ErrorCategory::Workflow),
            ("skill_run_not_found", ErrorCategory::Workflow),
            ("unsupported_cache_scope", ErrorCategory::Validation),
            ("unsupported_interaction_backend", ErrorCategory::Workflow),
        ];

        for (code, category) in cases {
            let error = bridge_error_from_value(
                400,
                json!({
                    "status": "error",
                    "error": { "code": code }
                }),
            );
            assert_eq!(error.code, code);
            assert_eq!(error.category, category, "{code}");
        }
    }

    #[test]
    fn preserves_host_bridge_error_control_envelope() {
        let error = bridge_error_from_value(
            409,
            json!({
                "status": "error",
                "error": {
                    "code": "agent_run_already_consumed",
                    "category": "workflow",
                    "message": "Agent run was already consumed",
                    "retryable": false,
                    "stateChange": "changed",
                    "handleConsumption": "consumed",
                    "safeNextActions": ["workflow agent-apply-status"],
                    "nextCommand": "workflow agent-apply-status agent-1"
                }
            }),
        );
        let payload = error.to_payload();
        assert_eq!(payload.category, crate::error::ErrorCategory::Workflow);
        assert_eq!(payload.message, "Agent run was already consumed");
        assert!(!payload.retryable);
        assert_eq!(payload.state_change, crate::error::StateChange::Changed);
        assert_eq!(
            payload.handle_consumption,
            crate::error::HandleConsumption::Consumed
        );
        assert_eq!(
            payload.safe_next_actions,
            vec!["workflow agent-apply-status".to_string()]
        );
        assert_eq!(
            payload.next_command.as_deref(),
            Some("workflow agent-apply-status agent-1")
        );
    }

    fn download_config(port: u16) -> BridgeConfig {
        BridgeConfig {
            endpoint: format!("http://127.0.0.1:{port}/bridge/v1"),
            token: Some("secret-token".to_string()),
            scope: None,
            connection_mode: Some("remote".to_string()),
            operation_id: None,
        }
    }

    fn spawn_download_server(responses: Vec<Vec<u8>>) -> (u16, thread::JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let handle = thread::spawn(move || {
            for response in responses {
                let (mut stream, _) = listener.accept().unwrap();
                let mut buffer = [0_u8; 4096];
                let read = stream.read(&mut buffer).unwrap_or_default();
                let request = String::from_utf8_lossy(&buffer[..read]).to_string();
                assert!(request.contains("GET /bridge/v1/files/file-1 HTTP/1.1"));
                assert!(request.contains("Authorization: Bearer secret-token"));
                stream.write_all(&response).unwrap();
            }
        });
        (port, handle)
    }

    fn download_response(body: &[u8], content_length: usize, sha256: &str) -> Vec<u8> {
        let head = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/zip\r\nContent-Length: {content_length}\r\nX-Zotero-Bridge-Sha256: {sha256}\r\nConnection: close\r\n\r\n"
        );
        [head.as_bytes(), body].concat()
    }

    #[test]
    fn download_retries_truncated_body_and_reports_success_metadata() {
        let expected_hash = sha256_hex(b"abc");
        let (port, handle) = spawn_download_server(vec![
            download_response(b"ab", 3, &expected_hash),
            download_response(b"abc", 3, &expected_hash),
        ]);
        let result = download(&download_config(port), "/files/file-1").unwrap();

        assert_eq!(result.bytes, b"abc");
        assert_eq!(result.content_type, "application/zip");
        assert_eq!(result.bytes_expected, Some(3));
        assert_eq!(
            result.sha256_expected.as_deref(),
            Some(expected_hash.as_str())
        );
        assert_eq!(result.sha256_actual, expected_hash);
        assert_eq!(result.attempts, 2);
        assert!(result.retried);
        assert!(result.verified);
        handle.join().unwrap();
    }

    #[test]
    fn download_retries_checksum_mismatch_and_reports_exhaustion() {
        let bad_hash = "sha256:0000000000000000000000000000000000000000000000000000000000000000";
        let (port, handle) = spawn_download_server(vec![
            download_response(b"abc", 3, bad_hash),
            download_response(b"abc", 3, bad_hash),
        ]);
        let error = download(&download_config(port), "/files/file-1").unwrap_err();

        assert_eq!(error.code, "download_retry_exhausted");
        assert_eq!(error.category, crate::error::ErrorCategory::Download);
        let details = error.details.unwrap();
        assert_eq!(details["attempts"], 2);
        assert_eq!(details["lastErrorCode"], "download_checksum_mismatch");
        assert_eq!(details["bytesExpected"], 3);
        assert_eq!(details["bytesReceived"], 3);
        assert!(details.get("sha256Expected").is_none());
        assert!(details.get("sha256Actual").is_none());
        assert!(details.get("outputPath").is_none());
        assert!(!details.to_string().contains("secret-token"));
        handle.join().unwrap();
    }

    #[test]
    fn manifest_can_query_local_bridge_without_returning_token() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut buffer = [0_u8; 4096];
            let read = stream.read(&mut buffer).unwrap_or_default();
            let request = String::from_utf8_lossy(&buffer[..read]).to_string();
            assert!(request.contains("Authorization: Bearer secret-token"));
            let body = json!({
                "status": "ok",
                "result": {
                    "protocol": "host-bridge.v1",
                    "capabilities": []
                }
            })
            .to_string();
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            stream.write_all(response.as_bytes()).unwrap();
        });

        let config = BridgeConfig {
            endpoint: format!("http://127.0.0.1:{port}/bridge/v1"),
            token: Some("secret-token".to_string()),
            scope: None,
            connection_mode: Some("remote".to_string()),
            operation_id: None,
        };
        let result = manifest(&config).unwrap();

        assert_eq!(result["protocol"], "host-bridge.v1");
        assert!(!result.to_string().contains("secret-token"));
        handle.join().unwrap();
    }
}
