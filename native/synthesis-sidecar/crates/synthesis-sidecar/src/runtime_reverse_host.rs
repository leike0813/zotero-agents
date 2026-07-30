use serde_json::{Value, json};
use std::io::{Read, Write};
use std::net::{Ipv4Addr, SocketAddr, SocketAddrV4, TcpStream};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use synthesis_sidecar::runtime_contract::{NativeLaunchConfig, current_time_ms};

use crate::runtime_deadline::bounded_timeout;
use crate::runtime_diagnostics::{NativeDiagnosticEvent, emit, emit_debug};

const REVERSE_HOST_PATH: &str = "/synthesis/v1/host-call";
const REVERSE_HOST_TIMEOUT: Duration = Duration::from_secs(2);
const REFERENCE_ARTIFACT_READ_TIMEOUT: Duration = Duration::from_secs(10);
const MAX_REVERSE_HOST_RESPONSE_HEADER_BYTES: u64 = 16 * 1024;
const MAX_REVERSE_HOST_RESPONSE_BODY_BYTES: u64 = 1024 * 1024;
const MAX_REFERENCE_ARTIFACT_RESPONSE_BODY_BYTES: u64 = 8 * 1024 * 1024;
static REVERSE_HOST_REQUEST_SEQUENCE: AtomicU64 = AtomicU64::new(0);

fn response_body(bytes: &[u8], max_body_bytes: u64) -> Result<(u16, &[u8]), String> {
    let header_end = bytes
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .map(|index| index + 4)
        .ok_or_else(|| "reverse_host_response_header_missing".to_owned())?;
    if header_end as u64 > MAX_REVERSE_HOST_RESPONSE_HEADER_BYTES {
        return Err("reverse_host_response_header_too_large".into());
    }
    let header = std::str::from_utf8(&bytes[..header_end])
        .map_err(|_| "reverse_host_response_header_invalid".to_owned())?;
    let mut lines = header.split("\r\n");
    let status = lines
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|value| value.parse::<u16>().ok())
        .ok_or_else(|| "reverse_host_response_status_invalid".to_owned())?;
    let content_length = lines
        .filter_map(|line| line.split_once(':'))
        .find(|(name, _)| name.eq_ignore_ascii_case("content-length"))
        .and_then(|(_, value)| value.trim().parse::<usize>().ok())
        .ok_or_else(|| "reverse_host_response_content_length_invalid".to_owned())?;
    if content_length as u64 > max_body_bytes {
        return Err("reverse_host_response_too_large".into());
    }
    let body = &bytes[header_end..];
    if content_length > body.len() {
        return Err("reverse_host_response_body_truncated".into());
    }
    if content_length < body.len() {
        return Err("reverse_host_response_trailing_bytes".into());
    }
    Ok((status, body))
}

fn send_reverse_host_request(
    config: &NativeLaunchConfig,
    timeout: Duration,
    body: &[u8],
    max_response_body_bytes: u64,
) -> Result<(Value, usize), String> {
    let address = SocketAddr::V4(SocketAddrV4::new(
        Ipv4Addr::LOCALHOST,
        config.reverse_host.port,
    ));
    let mut stream = TcpStream::connect_timeout(&address, timeout)
        .map_err(|_| "reverse_host_unavailable".to_owned())?;
    stream
        .set_read_timeout(Some(timeout))
        .and_then(|_| stream.set_write_timeout(Some(timeout)))
        .map_err(|_| "reverse_host_unavailable".to_owned())?;
    write!(
        stream,
        "POST {REVERSE_HOST_PATH} HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nAuthorization: Bearer {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        config.reverse_host.port,
        config.reverse_host.authorization_token,
        body.len(),
    )
    .and_then(|_| stream.write_all(body))
    .and_then(|_| stream.flush())
    .map_err(|_| "reverse_host_unavailable".to_owned())?;
    let mut bytes = Vec::new();
    stream
        .take(MAX_REVERSE_HOST_RESPONSE_HEADER_BYTES + max_response_body_bytes + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "reverse_host_unavailable".to_owned())?;
    if bytes.len() as u64 > MAX_REVERSE_HOST_RESPONSE_HEADER_BYTES + max_response_body_bytes {
        return Err("reverse_host_response_too_large".into());
    }
    let (status, response_body) = response_body(&bytes, max_response_body_bytes)?;
    let response: Value = serde_json::from_slice(response_body)
        .map_err(|_| "reverse_host_response_json_invalid".to_owned())?;
    let object = response
        .as_object()
        .filter(|object| object.len() == 2)
        .ok_or_else(|| "reverse_host_response_envelope_invalid".to_owned())?;
    if status != 200 || object.get("ok") != Some(&Value::Bool(true)) {
        let reason = object
            .get("error")
            .and_then(Value::as_object)
            .and_then(|error| {
                error
                    .get("details")
                    .and_then(Value::as_object)
                    .and_then(|details| details.get("reason"))
                    .or_else(|| error.get("code"))
            })
            .and_then(Value::as_str)
            .filter(|value| {
                !value.is_empty()
                    && value.len() <= 128
                    && value.bytes().all(|byte| {
                        byte.is_ascii_lowercase()
                            || byte.is_ascii_digit()
                            || b"_.:-".contains(&byte)
                    })
            })
            .unwrap_or("reverse_host_unavailable");
        return Err(reason.into());
    }
    let result = object
        .get("result")
        .cloned()
        .ok_or_else(|| "reverse_host_response_result_missing".to_owned())?;
    Ok((result, bytes.len()))
}

pub(crate) fn call_reverse_host(
    config: &NativeLaunchConfig,
    service_instance_id: &str,
    capability: &str,
    payload: Value,
) -> Result<Value, String> {
    let now = current_time_ms()?;
    let sequence = REVERSE_HOST_REQUEST_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let request_id = format!("native:{now}:{sequence}");
    let operation_id = format!("native:{capability}:{now}:{sequence}");
    let artifact_read = capability == "library.artifacts.read";
    let timeout = bounded_timeout(if artifact_read {
        REFERENCE_ARTIFACT_READ_TIMEOUT
    } else {
        REVERSE_HOST_TIMEOUT
    })?;
    let max_response_body_bytes = if artifact_read {
        MAX_REFERENCE_ARTIFACT_RESPONSE_BODY_BYTES
    } else {
        MAX_REVERSE_HOST_RESPONSE_BODY_BYTES
    };
    let body = serde_json::to_vec(&json!({
        "schema":"synthesis-reverse-host-call.v1",
        "requestId":request_id.clone(),
        "profileId":config.profile_id,
        "serviceInstanceId":service_instance_id,
        "operationId":operation_id.clone(),
        "capability":capability,
        "deadlineAtMs":now.saturating_add(timeout.as_millis() as u64),
        "payload":payload,
    }))
    .map_err(|_| "reverse_host_request_invalid".to_owned())?;
    emit_debug(|| {
        NativeDiagnosticEvent::new("reverse-host", "call-started", "started")
            .capability(capability)
            .request_id(&request_id)
            .operation_id(&operation_id)
            .request_bytes(body.len())
    });
    let result = send_reverse_host_request(config, timeout, &body, max_response_body_bytes);
    match result {
        Ok((result, response_bytes)) => {
            let duration_ms = current_time_ms()?.saturating_sub(now);
            emit_debug(|| {
                NativeDiagnosticEvent::new("reverse-host", "call-completed", "succeeded")
                    .capability(capability)
                    .request_id(request_id)
                    .operation_id(operation_id)
                    .duration_ms(duration_ms)
                    .response_bytes(response_bytes)
                    .http_status(200)
            });
            Ok(result)
        }
        Err(error) => {
            emit(
                NativeDiagnosticEvent::new("reverse-host", "call-failed", "failed")
                    .capability(capability)
                    .request_id(request_id)
                    .operation_id(operation_id)
                    .code(&error)
                    .duration_ms(current_time_ms().unwrap_or(now).saturating_sub(now)),
            );
            Err(error)
        }
    }
}

pub(crate) fn probe_reverse_host(config: &NativeLaunchConfig) -> Result<(), String> {
    call_reverse_host(
        config,
        &config.supervisor_instance_id,
        "webdav.describe",
        json!({}),
    )
    .map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_unbounded_or_malformed_responses() {
        assert_eq!(
            response_body(
                b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n{}",
                MAX_REVERSE_HOST_RESPONSE_BODY_BYTES,
            )
            .unwrap(),
            (200, b"{}".as_slice())
        );
        assert_eq!(
            response_body(
                b"HTTP/1.1 503 Error\r\nContent-Length: 2\r\n\r\n{}",
                MAX_REVERSE_HOST_RESPONSE_BODY_BYTES,
            )
            .unwrap(),
            (503, b"{}".as_slice())
        );
        assert_eq!(
            response_body(
                b"HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\n{}",
                MAX_REVERSE_HOST_RESPONSE_BODY_BYTES,
            ),
            Err("reverse_host_response_body_truncated".into())
        );
        assert_eq!(
            response_body(
                b"HTTP/1.1 200 OK\r\nContent-Length: 1\r\n\r\n{}",
                MAX_REVERSE_HOST_RESPONSE_BODY_BYTES,
            ),
            Err("reverse_host_response_trailing_bytes".into())
        );
        assert_eq!(
            response_body(
                b"HTTP/1.1 200 OK\r\n\r\n{}",
                MAX_REVERSE_HOST_RESPONSE_BODY_BYTES,
            ),
            Err("reverse_host_response_content_length_invalid".into())
        );
    }
}
