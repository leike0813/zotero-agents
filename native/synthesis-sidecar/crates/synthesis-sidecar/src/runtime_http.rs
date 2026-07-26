use serde_json::Value;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpStream;

pub(crate) fn read_http(
    stream: &mut TcpStream,
) -> Result<(String, String, String, Vec<u8>), String> {
    let mut reader = BufReader::new(stream.try_clone().map_err(|error| error.to_string())?);
    let mut first = String::new();
    reader
        .read_line(&mut first)
        .map_err(|error| error.to_string())?;
    let parts: Vec<_> = first.split_whitespace().collect();
    if parts.len() < 2 {
        return Err("invalid_request".into());
    }
    let mut token = String::new();
    let mut length = 0usize;
    loop {
        let mut line = String::new();
        reader
            .read_line(&mut line)
            .map_err(|error| error.to_string())?;
        if line == "\r\n" || line.is_empty() {
            break;
        }
        if let Some((name, value)) = line.split_once(':') {
            if name.eq_ignore_ascii_case("authorization") {
                token = value
                    .trim()
                    .strip_prefix("Bearer ")
                    .unwrap_or_default()
                    .to_owned();
            }
            if name.eq_ignore_ascii_case("content-length") {
                length = value.trim().parse().map_err(|_| "invalid_request")?;
            }
        }
    }
    if length > 8 * 1024 * 1024 {
        return Err("invalid_request".into());
    }
    let mut body = vec![0; length];
    reader
        .read_exact(&mut body)
        .map_err(|error| error.to_string())?;
    Ok((
        parts[0].to_ascii_uppercase(),
        parts[1].to_owned(),
        token,
        body,
    ))
}

pub(crate) fn response(stream: &mut TcpStream, status: u16, value: Value) -> Result<(), String> {
    let body = serde_json::to_vec(&value).map_err(|error| error.to_string())?;
    let reason = if status == 200 { "OK" } else { "Error" };
    write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    )
    .map_err(|error| error.to_string())?;
    stream.write_all(&body).map_err(|error| error.to_string())
}
