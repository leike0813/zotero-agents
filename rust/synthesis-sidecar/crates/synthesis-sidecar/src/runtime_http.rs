use serde_json::Value;
use std::fmt;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpStream;
use std::time::{Duration, Instant};

const MAX_REQUEST_LINE_BYTES: usize = 8 * 1024;
const MAX_HEADER_LINE_BYTES: usize = 8 * 1024;
const MAX_HEADER_BYTES: usize = 64 * 1024;
const MAX_BODY_BYTES: usize = 8 * 1024 * 1024;
const READ_IDLE_TIMEOUT: Duration = Duration::from_millis(500);
const READ_TOTAL_TIMEOUT: Duration = Duration::from_secs(30);
const WRITE_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Clone, Copy)]
struct HttpReadPolicy {
    max_request_line_bytes: usize,
    max_header_line_bytes: usize,
    max_header_bytes: usize,
    max_body_bytes: usize,
    idle_timeout: Duration,
    total_timeout: Duration,
}

const PRODUCTION_READ_POLICY: HttpReadPolicy = HttpReadPolicy {
    max_request_line_bytes: MAX_REQUEST_LINE_BYTES,
    max_header_line_bytes: MAX_HEADER_LINE_BYTES,
    max_header_bytes: MAX_HEADER_BYTES,
    max_body_bytes: MAX_BODY_BYTES,
    idle_timeout: READ_IDLE_TIMEOUT,
    total_timeout: READ_TOTAL_TIMEOUT,
};

#[derive(Debug)]
pub(crate) struct HttpRequest {
    pub(crate) method: String,
    pub(crate) path: String,
    pub(crate) bearer: String,
    pub(crate) body: Vec<u8>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum HttpReadError {
    InvalidRequest,
    HeaderTooLarge,
    BodyTooLarge,
    RequestTimeout,
    TransportUnavailable,
}

impl HttpReadError {
    pub(crate) fn http_status(self) -> u16 {
        match self {
            Self::InvalidRequest | Self::TransportUnavailable => 400,
            Self::HeaderTooLarge => 431,
            Self::BodyTooLarge => 413,
            Self::RequestTimeout => 408,
        }
    }

    pub(crate) fn public_code(self) -> &'static str {
        match self {
            Self::InvalidRequest | Self::HeaderTooLarge | Self::TransportUnavailable => {
                "invalid_request"
            }
            Self::BodyTooLarge => "request_too_large",
            Self::RequestTimeout => "request_timeout",
        }
    }
}

impl fmt::Display for HttpReadError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::InvalidRequest => "http_request_invalid",
            Self::HeaderTooLarge => "http_request_header_too_large",
            Self::BodyTooLarge => "http_request_body_too_large",
            Self::RequestTimeout => "http_request_timeout",
            Self::TransportUnavailable => "http_transport_unavailable",
        })
    }
}

pub(crate) fn configure_http_stream(stream: &TcpStream) -> Result<(), String> {
    stream
        .set_nonblocking(false)
        .and_then(|_| stream.set_read_timeout(Some(READ_IDLE_TIMEOUT)))
        .and_then(|_| stream.set_write_timeout(Some(WRITE_TIMEOUT)))
        .map_err(|_| "http_transport_unavailable".to_owned())
}

fn timeout_for_read(
    started_at: Instant,
    policy: HttpReadPolicy,
) -> Result<Duration, HttpReadError> {
    let remaining = policy
        .total_timeout
        .checked_sub(started_at.elapsed())
        .ok_or(HttpReadError::RequestTimeout)?;
    if remaining.is_zero() {
        return Err(HttpReadError::RequestTimeout);
    }
    Ok(policy.idle_timeout.min(remaining))
}

fn read_header(
    reader: &mut BufReader<TcpStream>,
    started_at: Instant,
    policy: HttpReadPolicy,
) -> Result<Vec<u8>, HttpReadError> {
    let mut header = Vec::new();
    loop {
        if reader.buffer().is_empty() {
            reader
                .get_mut()
                .set_read_timeout(Some(timeout_for_read(started_at, policy)?))
                .map_err(|_| HttpReadError::TransportUnavailable)?;
        }
        let (consumed, complete) = {
            let available = match reader.fill_buf() {
                Ok([]) => return Err(HttpReadError::InvalidRequest),
                Ok(available) => available,
                Err(error)
                    if matches!(
                        error.kind(),
                        std::io::ErrorKind::TimedOut | std::io::ErrorKind::WouldBlock
                    ) =>
                {
                    return Err(HttpReadError::RequestTimeout);
                }
                Err(_) => return Err(HttpReadError::TransportUnavailable),
            };
            let mut consumed = 0;
            let mut complete = false;
            for byte in available {
                header.push(*byte);
                consumed += 1;
                if header.len() > policy.max_header_bytes {
                    return Err(HttpReadError::HeaderTooLarge);
                }
                if header.ends_with(b"\r\n\r\n") {
                    complete = true;
                    break;
                }
            }
            (consumed, complete)
        };
        reader.consume(consumed);
        if complete {
            return Ok(header);
        }
    }
}

fn valid_content_length(value: &str) -> bool {
    value == "0"
        || value.as_bytes().split_first().is_some_and(|(first, rest)| {
            (b'1'..=b'9').contains(first) && rest.iter().all(u8::is_ascii_digit)
        })
}

fn parse_header(
    header: &[u8],
    policy: HttpReadPolicy,
) -> Result<(String, String, String, usize), HttpReadError> {
    let source = std::str::from_utf8(
        header
            .strip_suffix(b"\r\n\r\n")
            .ok_or(HttpReadError::InvalidRequest)?,
    )
    .map_err(|_| HttpReadError::InvalidRequest)?;
    let mut lines = source.split("\r\n");
    let request_line = lines.next().ok_or(HttpReadError::InvalidRequest)?;
    if request_line.is_empty() || request_line.len() > policy.max_request_line_bytes {
        return Err(HttpReadError::HeaderTooLarge);
    }
    let parts = request_line.split_whitespace().collect::<Vec<_>>();
    if parts.len() != 3 || parts[2] != "HTTP/1.1" {
        return Err(HttpReadError::InvalidRequest);
    }

    let mut bearer = String::new();
    let mut content_length = None;
    for line in lines {
        if line.is_empty() || line.len() > policy.max_header_line_bytes {
            return Err(if line.len() > policy.max_header_line_bytes {
                HttpReadError::HeaderTooLarge
            } else {
                HttpReadError::InvalidRequest
            });
        }
        let (name, value) = line.split_once(':').ok_or(HttpReadError::InvalidRequest)?;
        let value = value.trim();
        if name.eq_ignore_ascii_case("authorization") {
            bearer = value.strip_prefix("Bearer ").unwrap_or_default().to_owned();
        } else if name.eq_ignore_ascii_case("content-length") {
            if !valid_content_length(value) {
                return Err(HttpReadError::InvalidRequest);
            }
            let parsed = value
                .parse::<usize>()
                .map_err(|_| HttpReadError::InvalidRequest)?;
            if content_length.is_some_and(|current| current != parsed) {
                return Err(HttpReadError::InvalidRequest);
            }
            content_length = Some(parsed);
        } else if name.eq_ignore_ascii_case("transfer-encoding") {
            return Err(HttpReadError::InvalidRequest);
        }
    }
    let content_length = content_length.unwrap_or_default();
    if content_length > policy.max_body_bytes {
        return Err(HttpReadError::BodyTooLarge);
    }
    Ok((
        parts[0].to_ascii_uppercase(),
        parts[1].to_owned(),
        bearer,
        content_length,
    ))
}

fn read_body(
    reader: &mut BufReader<TcpStream>,
    length: usize,
    started_at: Instant,
    policy: HttpReadPolicy,
) -> Result<Vec<u8>, HttpReadError> {
    let mut body = vec![0_u8; length];
    let mut offset = 0;
    while offset < length {
        if reader.buffer().is_empty() {
            reader
                .get_mut()
                .set_read_timeout(Some(timeout_for_read(started_at, policy)?))
                .map_err(|_| HttpReadError::TransportUnavailable)?;
        }
        match reader.read(&mut body[offset..]) {
            Ok(0) => return Err(HttpReadError::InvalidRequest),
            Ok(read) => offset += read,
            Err(error)
                if matches!(
                    error.kind(),
                    std::io::ErrorKind::TimedOut | std::io::ErrorKind::WouldBlock
                ) =>
            {
                return Err(HttpReadError::RequestTimeout);
            }
            Err(_) => return Err(HttpReadError::TransportUnavailable),
        }
    }
    if !reader.buffer().is_empty() {
        return Err(HttpReadError::InvalidRequest);
    }
    Ok(body)
}

fn read_http_with_policy(
    stream: &TcpStream,
    policy: HttpReadPolicy,
) -> Result<HttpRequest, HttpReadError> {
    let started_at = Instant::now();
    let mut reader = BufReader::new(
        stream
            .try_clone()
            .map_err(|_| HttpReadError::TransportUnavailable)?,
    );
    let header = read_header(&mut reader, started_at, policy)?;
    let (method, path, bearer, length) = parse_header(&header, policy)?;
    let body = read_body(&mut reader, length, started_at, policy)?;
    Ok(HttpRequest {
        method,
        path,
        bearer,
        body,
    })
}

pub(crate) fn read_http(stream: &TcpStream) -> Result<HttpRequest, HttpReadError> {
    read_http_with_policy(stream, PRODUCTION_READ_POLICY)
}

pub(crate) fn response(stream: &mut TcpStream, status: u16, value: Value) -> Result<(), String> {
    let body = serde_json::to_vec(&value).map_err(|error| error.to_string())?;
    let reason = match status {
        200 => "OK",
        400 => "Bad Request",
        401 => "Unauthorized",
        404 => "Not Found",
        408 => "Request Timeout",
        409 => "Conflict",
        413 => "Content Too Large",
        429 => "Too Many Requests",
        431 => "Request Header Fields Too Large",
        503 => "Service Unavailable",
        _ => "Error",
    };
    write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    )
    .and_then(|_| stream.write_all(&body))
    .and_then(|_| stream.flush())
    .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    fn socket_pair() -> (TcpStream, TcpStream) {
        let listener = TcpListener::bind(("127.0.0.1", 0)).expect("listener");
        let client = TcpStream::connect(listener.local_addr().expect("address")).expect("client");
        let (server, _) = listener.accept().expect("server");
        (client, server)
    }

    fn test_policy() -> HttpReadPolicy {
        HttpReadPolicy {
            max_request_line_bytes: 32,
            max_header_line_bytes: 32,
            max_header_bytes: 96,
            max_body_bytes: 8,
            idle_timeout: Duration::from_millis(25),
            total_timeout: Duration::from_millis(100),
        }
    }

    #[test]
    fn reads_one_strict_request_with_exact_body() {
        let (mut client, server) = socket_pair();
        client
            .write_all(
                b"POST /call HTTP/1.1\r\nAuthorization: Bearer token\r\nContent-Length: 4\r\n\r\ntest",
            )
            .expect("request");
        let request = read_http_with_policy(&server, test_policy()).expect("read");
        assert_eq!(request.method, "POST");
        assert_eq!(request.path, "/call");
        assert_eq!(request.bearer, "token");
        assert_eq!(request.body, b"test");
    }

    #[test]
    fn rejects_line_header_body_and_ambiguous_framing_bounds() {
        let cases = [
            (
                "GET /this-request-line-is-too-long HTTP/1.1\r\n\r\n",
                HttpReadError::HeaderTooLarge,
            ),
            (
                "GET / HTTP/1.1\r\nX-Long: 12345678901234567890123456789012\r\n\r\n",
                HttpReadError::HeaderTooLarge,
            ),
            (
                "POST / HTTP/1.1\r\nContent-Length: 9\r\n\r\n",
                HttpReadError::BodyTooLarge,
            ),
            (
                "POST / HTTP/1.1\r\nContent-Length: 1\r\nContent-Length: 2\r\n\r\n",
                HttpReadError::InvalidRequest,
            ),
            (
                "POST / HTTP/1.1\r\nTransfer-Encoding: chunked\r\n\r\n",
                HttpReadError::InvalidRequest,
            ),
        ];
        for (source, expected) in cases {
            let (mut client, server) = socket_pair();
            client.write_all(source.as_bytes()).expect("request");
            assert_eq!(
                read_http_with_policy(&server, test_policy()).unwrap_err(),
                expected,
                "{source:?}"
            );
        }
    }

    #[test]
    fn times_out_an_incomplete_header_and_configures_bounded_writes() {
        let (mut client, server) = socket_pair();
        client.write_all(b"GET / HTTP/1.1\r\nX: ").expect("partial");
        assert_eq!(
            read_http_with_policy(&server, test_policy()).unwrap_err(),
            HttpReadError::RequestTimeout
        );
        configure_http_stream(&server).expect("configure");
        assert_eq!(
            server.write_timeout().expect("timeout"),
            Some(WRITE_TIMEOUT)
        );
    }

    #[test]
    fn total_deadline_does_not_reset_with_progress() {
        let policy = test_policy();
        assert_eq!(
            timeout_for_read(
                Instant::now() - policy.total_timeout - Duration::from_millis(1),
                policy,
            )
            .unwrap_err(),
            HttpReadError::RequestTimeout
        );
    }
}
