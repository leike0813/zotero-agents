use serde_json::{Value, json};
use std::io::{Read, Write};
use std::net::{Ipv4Addr, SocketAddr, SocketAddrV4, TcpStream};
use std::time::Duration;
use synthesis_sidecar::runtime_contract::{ProductionAdmission, current_time_ms};

const REVERSE_HOST_PATH: &str = "/synthesis/v1/host-call";
const REVERSE_HOST_TIMEOUT: Duration = Duration::from_secs(2);
const MAX_REVERSE_HOST_RESPONSE_BYTES: u64 = 1024 * 1024;

fn response_body(bytes: &[u8]) -> Result<&[u8], String> {
    let header_end = bytes
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .map(|index| index + 4)
        .ok_or_else(|| "reverse_host_response_invalid".to_owned())?;
    let header = std::str::from_utf8(&bytes[..header_end])
        .map_err(|_| "reverse_host_response_invalid".to_owned())?;
    let mut lines = header.split("\r\n");
    let status = lines
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|value| value.parse::<u16>().ok())
        .ok_or_else(|| "reverse_host_response_invalid".to_owned())?;
    if status != 200 {
        return Err("reverse_host_unavailable".into());
    }
    let content_length = lines
        .filter_map(|line| line.split_once(':'))
        .find(|(name, _)| name.eq_ignore_ascii_case("content-length"))
        .and_then(|(_, value)| value.trim().parse::<usize>().ok())
        .ok_or_else(|| "reverse_host_response_invalid".to_owned())?;
    let body = &bytes[header_end..];
    if content_length != body.len() {
        return Err("reverse_host_response_invalid".into());
    }
    Ok(body)
}

pub(crate) fn call_reverse_host(
    admission: &ProductionAdmission,
    service_instance_id: &str,
    capability: &str,
    payload: Value,
) -> Result<Value, String> {
    let now = current_time_ms()?;
    let body = serde_json::to_vec(&json!({
        "schema":"synthesis-reverse-host-call.v1",
        "requestId":format!("native:{now}"),
        "profileId":admission.profile_id,
        "serviceInstanceId":service_instance_id,
        "operationId":format!("native:{capability}:{now}"),
        "capability":capability,
        "deadlineAtMs":now.saturating_add(5_000),
        "payload":payload,
    }))
    .map_err(|_| "reverse_host_request_invalid".to_owned())?;
    let address = SocketAddr::V4(SocketAddrV4::new(
        Ipv4Addr::LOCALHOST,
        admission.reverse_host.port,
    ));
    let mut stream = TcpStream::connect_timeout(&address, REVERSE_HOST_TIMEOUT)
        .map_err(|_| "reverse_host_unavailable".to_owned())?;
    stream
        .set_read_timeout(Some(REVERSE_HOST_TIMEOUT))
        .and_then(|_| stream.set_write_timeout(Some(REVERSE_HOST_TIMEOUT)))
        .map_err(|_| "reverse_host_unavailable".to_owned())?;
    write!(
        stream,
        "POST {REVERSE_HOST_PATH} HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nAuthorization: Bearer {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        admission.reverse_host.port,
        admission.reverse_host.authorization_token,
        body.len(),
    )
    .and_then(|_| stream.write_all(&body))
    .and_then(|_| stream.flush())
    .map_err(|_| "reverse_host_unavailable".to_owned())?;
    let mut bytes = Vec::new();
    stream
        .take(MAX_REVERSE_HOST_RESPONSE_BYTES + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| "reverse_host_unavailable".to_owned())?;
    if bytes.len() as u64 > MAX_REVERSE_HOST_RESPONSE_BYTES {
        return Err("reverse_host_response_too_large".into());
    }
    let response: Value = serde_json::from_slice(response_body(&bytes)?)
        .map_err(|_| "reverse_host_response_invalid".to_owned())?;
    let object = response
        .as_object()
        .filter(|object| object.len() == 2)
        .ok_or_else(|| "reverse_host_response_invalid".to_owned())?;
    if object.get("ok") != Some(&Value::Bool(true)) {
        return Err("reverse_host_unavailable".into());
    }
    object
        .get("result")
        .cloned()
        .ok_or_else(|| "reverse_host_response_invalid".to_owned())
}

pub(crate) fn probe_reverse_host(admission: &ProductionAdmission) -> Result<(), String> {
    call_reverse_host(
        admission,
        &admission.supervisor_instance_id,
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
            response_body(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\n{}").unwrap(),
            b"{}"
        );
        assert!(response_body(b"HTTP/1.1 503 Error\r\nContent-Length: 2\r\n\r\n{}").is_err());
        assert!(response_body(b"HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\n{}").is_err());
    }
}
