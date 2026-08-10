use serde_json::{Value, json};
use std::io::{Read, Write};
use std::net::{Ipv4Addr, SocketAddr, SocketAddrV4, TcpStream};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;
use synthesis_sidecar::runtime_contract::{NativeLaunchConfig, current_time_ms};

use crate::runtime_deadline::bounded_timeout;
use crate::runtime_diagnostics::{
    NativeDiagnosticEvent, child_observation_context, correlate, emit_debug,
};

const REVERSE_HOST_PATH: &str = "/synthesis/v1/host-call";
const REVERSE_HOST_TIMEOUT: Duration = Duration::from_secs(2);
const REFERENCE_ARTIFACT_TIMEOUT: Duration = Duration::from_secs(10);
const EXPORT_DELIVERY_TIMEOUT: Duration = Duration::from_secs(30);
const MAX_REVERSE_HOST_RESPONSE_HEADER_BYTES: u64 = 16 * 1024;
const MAX_REVERSE_HOST_RESPONSE_BODY_BYTES: u64 = 1024 * 1024;
const MAX_REFERENCE_ARTIFACT_RESPONSE_BODY_BYTES: u64 = 8 * 1024 * 1024;
static REVERSE_HOST_REQUEST_SEQUENCE: AtomicU64 = AtomicU64::new(0);

fn response_header(bytes: &[u8], max_body_bytes: u64) -> Result<(u16, usize), String> {
    let header = std::str::from_utf8(bytes)
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
    Ok((status, content_length))
}

fn read_response(
    reader: &mut impl Read,
    max_body_bytes: u64,
) -> Result<(u16, Vec<u8>, usize), String> {
    let mut header = Vec::new();
    let mut byte = [0_u8; 1];
    while !header.ends_with(b"\r\n\r\n") {
        match reader.read_exact(&mut byte) {
            Ok(()) => header.push(byte[0]),
            Err(error) if error.kind() == std::io::ErrorKind::UnexpectedEof => {
                return Err("reverse_host_response_header_missing".into());
            }
            Err(_) => return Err("reverse_host_unavailable".into()),
        }
        if header.len() as u64 > MAX_REVERSE_HOST_RESPONSE_HEADER_BYTES {
            return Err("reverse_host_response_header_too_large".into());
        }
    }
    let (status, content_length) = response_header(&header, max_body_bytes)?;
    let mut body = vec![0_u8; content_length];
    if let Err(error) = reader.read_exact(&mut body) {
        return Err(if error.kind() == std::io::ErrorKind::UnexpectedEof {
            "reverse_host_response_body_truncated".into()
        } else {
            "reverse_host_unavailable".into()
        });
    }
    Ok((status, body, header.len() + content_length))
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
    let (status, response_body, response_bytes) =
        read_response(&mut stream, max_response_body_bytes)?;
    let response: Value = serde_json::from_slice(&response_body)
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
    Ok((result, response_bytes))
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
    let reference_artifact = matches!(
        capability,
        "library.artifacts.scan_page" | "library.artifacts.read"
    );
    let artifact_read = capability == "library.artifacts.read";
    let export_delivery = capability.starts_with("delivery.export.");
    let timeout = bounded_timeout(if reference_artifact {
        REFERENCE_ARTIFACT_TIMEOUT
    } else if export_delivery {
        EXPORT_DELIVERY_TIMEOUT
    } else {
        REVERSE_HOST_TIMEOUT
    })?;
    let max_response_body_bytes = if artifact_read {
        MAX_REFERENCE_ARTIFACT_RESPONSE_BODY_BYTES
    } else {
        MAX_REVERSE_HOST_RESPONSE_BODY_BYTES
    };
    let trace = child_observation_context();
    let mut call = json!({
        "schema":"synthesis-reverse-host-call.v1",
        "requestId":request_id.clone(),
        "profileId":config.profile_id,
        "serviceInstanceId":service_instance_id,
        "operationId":operation_id.clone(),
        "capability":capability,
        "deadlineAtMs":now.saturating_add(timeout.as_millis() as u64),
        "payload":payload,
    });
    if let Some(trace) = trace {
        call["trace"] =
            serde_json::to_value(trace).map_err(|_| "reverse_host_request_invalid".to_owned())?;
    }
    let body = serde_json::to_vec(&call).map_err(|_| "reverse_host_request_invalid".to_owned())?;
    emit_debug(|| {
        correlate(
            NativeDiagnosticEvent::new("reverse-host", "call-started", "started")
                .capability(capability)
                .request_id(&request_id)
                .operation_id(&operation_id)
                .request_bytes(body.len()),
        )
    });
    let result = send_reverse_host_request(config, timeout, &body, max_response_body_bytes);
    match result {
        Ok((result, response_bytes)) => {
            let duration_ms = current_time_ms()?.saturating_sub(now);
            emit_debug(|| {
                correlate(
                    NativeDiagnosticEvent::new("reverse-host", "call-completed", "succeeded")
                        .capability(capability)
                        .request_id(request_id)
                        .operation_id(operation_id)
                        .duration_ms(duration_ms)
                        .response_bytes(response_bytes)
                        .http_status(200),
                )
            });
            Ok(result)
        }
        Err(error) => {
            emit_debug(|| {
                correlate(
                    NativeDiagnosticEvent::new("reverse-host", "call-failed", "failed")
                        .capability(capability)
                        .request_id(request_id)
                        .operation_id(operation_id)
                        .code(&error)
                        .duration_ms(current_time_ms().unwrap_or(now).saturating_sub(now)),
                )
            });
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
    use std::io::{Cursor, Error, ErrorKind};

    struct CompleteWithoutEof {
        bytes: Cursor<Vec<u8>>,
    }

    impl Read for CompleteWithoutEof {
        fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
            let read = self.bytes.read(buffer)?;
            if read == 0 {
                return Err(Error::new(ErrorKind::WouldBlock, "socket remains open"));
            }
            Ok(read)
        }
    }

    #[test]
    fn reads_complete_length_delimited_response_without_eof() {
        let source = b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n{}".to_vec();
        let mut reader = CompleteWithoutEof {
            bytes: Cursor::new(source),
        };
        assert_eq!(
            read_response(&mut reader, MAX_REVERSE_HOST_RESPONSE_BODY_BYTES).unwrap(),
            (200, b"{}".to_vec(), 40)
        );
    }

    #[test]
    fn rejects_unbounded_or_malformed_responses() {
        assert_eq!(
            response_header(
                b"HTTP/1.1 503 Error\r\nContent-Length: 2\r\n\r\n",
                MAX_REVERSE_HOST_RESPONSE_BODY_BYTES,
            ),
            Ok((503, 2))
        );
        let mut truncated =
            Cursor::new(b"HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\n{}".as_slice());
        assert_eq!(
            read_response(&mut truncated, MAX_REVERSE_HOST_RESPONSE_BODY_BYTES),
            Err("reverse_host_response_body_truncated".into())
        );
        assert_eq!(
            response_header(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n", 1,),
            Err("reverse_host_response_too_large".into())
        );
        assert_eq!(
            response_header(
                b"HTTP/1.1 200 OK\r\n\r\n",
                MAX_REVERSE_HOST_RESPONSE_BODY_BYTES,
            ),
            Err("reverse_host_response_content_length_invalid".into())
        );
    }
}
