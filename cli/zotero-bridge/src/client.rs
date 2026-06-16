use std::{
    collections::HashMap,
    io::{Read, Write},
    net::TcpStream,
    time::Duration,
};

use serde_json::{json, Value};

use crate::{config::BridgeConfig, error::CliError};

const PROTOCOL: &str = "host-bridge.v1";

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
    );
    let raw = send_http(&endpoint, &request)?;
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
    Ok(DownloadResponse {
        bytes: parsed.body,
        content_type: parsed
            .headers
            .get("content-type")
            .cloned()
            .unwrap_or_else(|| "application/octet-stream".to_string()),
    })
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
        body_text.as_deref(),
    );
    let raw = send_http(&endpoint, &request)?;
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
    let code = json
        .pointer("/error/code")
        .and_then(Value::as_str)
        .unwrap_or("bridge_error");
    let category = match code {
        "capability_not_found" | "capability_failed" => crate::error::ErrorCategory::Capability,
        "workflow_not_found" | "workflow_run_not_found" | "workflow_submit_failed" => {
            crate::error::ErrorCategory::Workflow
        }
        "workflow_submit_requires_approval"
        | "approval_required"
        | "permission_denied"
        | "permission_timeout"
        | "permission_ui_unavailable" => crate::error::ErrorCategory::Permission,
        "file_not_found" | "file_handle_expired" | "file_unavailable" | "download_failed" => {
            crate::error::ErrorCategory::Download
        }
        "invalid_capability_input"
        | "invalid_workflow_input"
        | "invalid_file_id"
        | "bad_request" => crate::error::ErrorCategory::Validation,
        _ => crate::error::ErrorCategory::Protocol,
    };
    CliError::new(code, category, "Host Bridge returned an error")
        .with_details(json!({ "status": status, "bridge": json }))
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
    if !body.is_empty() {
        lines.push("Content-Type: application/json".to_string());
    }
    lines.push(format!("Content-Length: {}", body.len()));
    lines.push(String::new());
    lines.push(body.to_string());
    lines.join("\r\n")
}

fn send_http(endpoint: &ParsedEndpoint, request: &str) -> Result<Vec<u8>, CliError> {
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
    stream
        .write_all(request.as_bytes())
        .map_err(|error| CliError::connection("bridge_request_failed", error.to_string()))?;
    let mut raw = Vec::new();
    stream
        .read_to_end(&mut raw)
        .map_err(|error| CliError::connection("bridge_response_failed", error.to_string()))?;
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

    use super::{build_http_request, manifest, parse_endpoint, parse_http_response};
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
        };
        let result = manifest(&config).unwrap();

        assert_eq!(result["protocol"], "host-bridge.v1");
        assert!(!result.to_string().contains("secret-token"));
        handle.join().unwrap();
    }
}
