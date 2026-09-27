use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use sha1::{Digest, Sha1};
use std::collections::HashMap;
use std::env;
use std::fs::{self, OpenOptions};
use std::io::{self, Read, Write};
use std::net::{Shutdown, TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};

const WS_GUID: &str = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_HEADER_BYTES: usize = 16 * 1024;
const MAX_FRAME_BYTES: u64 = 16 * 1024 * 1024;
const AUDIT_SCHEMA: &str = "zotero-skills.acp.bridge-audit.v1";
const AUDIT_PREVIEW_CHARS: usize = 512;

#[derive(Debug, Clone)]
struct ServeArgs {
    host: String,
    port: u16,
    token: String,
    ready_file: String,
    log_file: String,
}

#[derive(Debug, Deserialize)]
struct SpawnRequest {
    #[serde(rename = "type")]
    kind: String,
    id: String,
    command: String,
    #[serde(default)]
    args: Vec<String>,
    cwd: String,
    #[serde(default)]
    env: HashMap<String, String>,
    #[serde(default, rename = "auditFile")]
    audit_file: Option<String>,
}

#[derive(Debug)]
struct AuditState {
    path: String,
    log_file: String,
    seq: u64,
}

type AuditSink = Arc<Mutex<AuditState>>;

#[derive(Debug)]
enum ClientFrame {
    Text(String),
    Binary(Vec<u8>),
    Close,
    Ping(Vec<u8>),
    Pong,
}

#[derive(Debug, Serialize)]
struct ReadyFile<'a> {
    ok: bool,
    url: String,
    host: &'a str,
    port: u16,
    pid: u32,
    started_at: String,
}

#[derive(Debug, Serialize)]
struct ErrorReadyFile<'a> {
    ok: bool,
    error: &'a str,
    finished_at: String,
}

fn now_isoish() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("{millis}")
}

fn log_line(path: &str, line: impl AsRef<str>) {
    if path.is_empty() {
        return;
    }
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "[{}] {}", now_isoish(), line.as_ref());
    }
}

fn create_audit_sink(path: Option<String>, log_file: String) -> Option<AuditSink> {
    let path = path.unwrap_or_default().trim().to_string();
    if path.is_empty() {
        return None;
    }
    Some(Arc::new(Mutex::new(AuditState {
        path,
        log_file,
        seq: 0,
    })))
}

fn is_sensitive_key(key: &str) -> bool {
    let lower = key.to_ascii_lowercase();
    lower.contains("authorization")
        || lower.contains("token")
        || lower.contains("secret")
        || lower.contains("password")
        || lower.contains("api_key")
        || lower.contains("apikey")
        || lower.contains("api-key")
        || lower.contains("cookie")
        || lower.contains("bearer")
}

fn sanitize_json_value(value: Value, key: Option<&str>) -> Value {
    if key.map(is_sensitive_key).unwrap_or(false) {
        return Value::String("<redacted>".to_string());
    }
    match value {
        Value::Array(entries) => Value::Array(
            entries
                .into_iter()
                .map(|entry| sanitize_json_value(entry, None))
                .collect(),
        ),
        Value::Object(source) => {
            let mut target = Map::new();
            for (entry_key, entry_value) in source {
                target.insert(
                    entry_key.clone(),
                    sanitize_json_value(entry_value, Some(&entry_key)),
                );
            }
            Value::Object(target)
        }
        other => other,
    }
}

fn sanitize_text_preview(text: &str) -> String {
    let truncated: String = text.chars().take(AUDIT_PREVIEW_CHARS).collect();
    let trimmed = truncated.trim();
    if let Ok(value) = serde_json::from_str::<Value>(trimmed) {
        return serde_json::to_string(&sanitize_json_value(value, None))
            .unwrap_or_else(|_| trimmed.to_string());
    }
    let mut sanitized = String::new();
    let mut words = trimmed.split_whitespace().peekable();
    while let Some(word) = words.next() {
        if !sanitized.is_empty() {
            sanitized.push(' ');
        }
        sanitized.push_str(word);
        if word.eq_ignore_ascii_case("bearer") && words.peek().is_some() {
            let _ = words.next();
            sanitized.push_str(" <redacted>");
        }
    }
    sanitized
}

fn bytes_preview(bytes: &[u8]) -> String {
    sanitize_text_preview(&String::from_utf8_lossy(bytes))
}

fn append_audit_event(audit: &Option<AuditSink>, spawn_id: &str, event: &str, mut fields: Value) {
    let Some(audit) = audit else {
        return;
    };
    let mut state = match audit.lock() {
        Ok(state) => state,
        Err(_) => return,
    };
    state.seq += 1;
    let mut record = Map::new();
    record.insert(
        "schema".to_string(),
        Value::String(AUDIT_SCHEMA.to_string()),
    );
    record.insert("ts".to_string(), Value::String(now_isoish()));
    record.insert("spawnId".to_string(), Value::String(spawn_id.to_string()));
    record.insert("seq".to_string(), json!(state.seq));
    record.insert("event".to_string(), Value::String(event.to_string()));
    if let Value::Object(source) = fields.take() {
        for (key, value) in source {
            record.insert(key, sanitize_json_value(value, None));
        }
    }
    let line = match serde_json::to_string(&Value::Object(record)) {
        Ok(line) => line,
        Err(error) => {
            log_line(
                &state.log_file,
                format!("bridge audit serialize failed: {error}"),
            );
            return;
        }
    };
    if let Some(parent) = std::path::Path::new(&state.path).parent() {
        if let Err(error) = fs::create_dir_all(parent) {
            log_line(
                &state.log_file,
                format!("bridge audit directory create failed: {error}"),
            );
            return;
        }
    }
    match OpenOptions::new()
        .create(true)
        .append(true)
        .open(&state.path)
    {
        Ok(mut file) => {
            if let Err(error) = writeln!(file, "{line}") {
                log_line(
                    &state.log_file,
                    format!("bridge audit write failed: {error}"),
                );
            }
        }
        Err(error) => {
            log_line(
                &state.log_file,
                format!("bridge audit open failed: {error}"),
            );
        }
    }
}

fn write_json_file<T: Serialize>(path: &str, value: &T) -> io::Result<()> {
    if path.is_empty() {
        return Ok(());
    }
    let text = serde_json::to_string_pretty(value)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    fs::write(path, format!("{text}\n"))
}

fn take_arg(args: &mut Vec<String>, name: &str) -> String {
    if let Some(index) = args.iter().position(|arg| arg == name) {
        let value = args.get(index + 1).cloned().unwrap_or_default();
        args.drain(index..usize::min(index + 2, args.len()));
        return value;
    }
    String::new()
}

fn parse_args() -> Result<ServeArgs, String> {
    let mut args: Vec<String> = env::args().skip(1).collect();
    if !args.iter().any(|arg| arg == "--serve") {
        return Err("missing --serve".to_string());
    }
    args.retain(|arg| arg != "--serve");
    let host = take_arg(&mut args, "--host");
    let port_text = take_arg(&mut args, "--port");
    let token = take_arg(&mut args, "--token");
    let ready_file = take_arg(&mut args, "--ready-file");
    let log_file = take_arg(&mut args, "--log-file");
    if token.is_empty() {
        return Err("missing --token".to_string());
    }
    if ready_file.is_empty() {
        return Err("missing --ready-file".to_string());
    }
    Ok(ServeArgs {
        host: if host.is_empty() {
            "127.0.0.1".to_string()
        } else {
            host
        },
        port: port_text.parse::<u16>().unwrap_or(0),
        token,
        ready_file,
        log_file,
    })
}

fn header_value<'a>(headers: &'a str, name: &str) -> Option<&'a str> {
    for line in headers.lines() {
        if let Some((key, value)) = line.split_once(':') {
            if key.trim().eq_ignore_ascii_case(name) {
                return Some(value.trim());
            }
        }
    }
    None
}

fn request_target(headers: &str) -> Option<&str> {
    let first = headers.lines().next()?;
    let mut parts = first.split_whitespace();
    let method = parts.next()?;
    let target = parts.next()?;
    if method.eq_ignore_ascii_case("GET") {
        Some(target)
    } else {
        None
    }
}

fn target_has_token(target: &str, expected: &str) -> bool {
    let Some((path, query)) = target.split_once('?') else {
        return false;
    };
    if path != "/v1/acp" {
        return false;
    }
    query
        .split('&')
        .filter_map(|part| part.split_once('='))
        .any(|(key, value)| key == "token" && value == expected)
}

fn websocket_accept_key(key: &str) -> String {
    let mut hasher = Sha1::new();
    hasher.update(key.trim().as_bytes());
    hasher.update(WS_GUID.as_bytes());
    BASE64.encode(hasher.finalize())
}

fn read_http_header(stream: &mut TcpStream) -> io::Result<(String, Vec<u8>)> {
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 1024];
    loop {
        let count = stream.read(&mut chunk)?;
        if count == 0 {
            return Err(io::Error::new(
                io::ErrorKind::UnexpectedEof,
                "connection closed before websocket header",
            ));
        }
        buffer.extend_from_slice(&chunk[..count]);
        if buffer.len() > MAX_HEADER_BYTES {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "websocket header too large",
            ));
        }
        if let Some(index) = find_header_end(&buffer) {
            let rest = buffer[(index + 4)..].to_vec();
            let header = String::from_utf8_lossy(&buffer[..index + 4]).to_string();
            return Ok((header, rest));
        }
    }
}

fn find_header_end(buffer: &[u8]) -> Option<usize> {
    buffer.windows(4).position(|window| window == b"\r\n\r\n")
}

fn accept_websocket(stream: &mut TcpStream, pending: Vec<u8>, token: &str) -> io::Result<Vec<u8>> {
    let (headers, rest) = if pending.is_empty() {
        read_http_header(stream)?
    } else if let Some(index) = find_header_end(&pending) {
        (
            String::from_utf8_lossy(&pending[..index + 4]).to_string(),
            pending[(index + 4)..].to_vec(),
        )
    } else {
        let mut seeded = pending;
        let mut chunk = [0_u8; 1024];
        loop {
            let count = stream.read(&mut chunk)?;
            if count == 0 {
                return Err(io::Error::new(
                    io::ErrorKind::UnexpectedEof,
                    "connection closed before websocket header",
                ));
            }
            seeded.extend_from_slice(&chunk[..count]);
            if seeded.len() > MAX_HEADER_BYTES {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "websocket header too large",
                ));
            }
            if let Some(index) = find_header_end(&seeded) {
                break (
                    String::from_utf8_lossy(&seeded[..index + 4]).to_string(),
                    seeded[(index + 4)..].to_vec(),
                );
            }
        }
    };

    let target = request_target(&headers).unwrap_or("");
    if !target_has_token(target, token) {
        stream.write_all(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n")?;
        return Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            "invalid websocket token",
        ));
    }
    let Some(key) = header_value(&headers, "Sec-WebSocket-Key") else {
        stream.write_all(b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n")?;
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "missing Sec-WebSocket-Key",
        ));
    };
    let accept = websocket_accept_key(key);
    let response = format!(
        "HTTP/1.1 101 Switching Protocols\r\n\
         Upgrade: websocket\r\n\
         Connection: Upgrade\r\n\
         Sec-WebSocket-Accept: {accept}\r\n\r\n"
    );
    stream.write_all(response.as_bytes())?;
    Ok(rest)
}

fn read_exact_from_pending(
    stream: &mut TcpStream,
    pending: &mut Vec<u8>,
    count: usize,
) -> io::Result<Vec<u8>> {
    while pending.len() < count {
        let mut chunk = vec![0_u8; count - pending.len()];
        let read = stream.read(&mut chunk)?;
        if read == 0 {
            return Err(io::Error::new(
                io::ErrorKind::UnexpectedEof,
                "connection closed while reading websocket frame",
            ));
        }
        pending.extend_from_slice(&chunk[..read]);
    }
    Ok(pending.drain(..count).collect())
}

fn read_client_frame(stream: &mut TcpStream, pending: &mut Vec<u8>) -> io::Result<ClientFrame> {
    let header = read_exact_from_pending(stream, pending, 2)?;
    let opcode = header[0] & 0x0f;
    let masked = header[1] & 0x80 != 0;
    let mut length = u64::from(header[1] & 0x7f);
    if length == 126 {
        let ext = read_exact_from_pending(stream, pending, 2)?;
        length = u64::from(u16::from_be_bytes([ext[0], ext[1]]));
    } else if length == 127 {
        let ext = read_exact_from_pending(stream, pending, 8)?;
        length = u64::from_be_bytes([
            ext[0], ext[1], ext[2], ext[3], ext[4], ext[5], ext[6], ext[7],
        ]);
    }
    if length > MAX_FRAME_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "websocket frame too large",
        ));
    }
    let mask = if masked {
        Some(read_exact_from_pending(stream, pending, 4)?)
    } else {
        None
    };
    let mut payload = read_exact_from_pending(stream, pending, length as usize)?;
    if let Some(mask) = mask {
        for (index, byte) in payload.iter_mut().enumerate() {
            *byte ^= mask[index % 4];
        }
    }
    match opcode {
        1 => Ok(ClientFrame::Text(
            String::from_utf8_lossy(&payload).to_string(),
        )),
        2 => Ok(ClientFrame::Binary(payload)),
        8 => Ok(ClientFrame::Close),
        9 => Ok(ClientFrame::Ping(payload)),
        10 => Ok(ClientFrame::Pong),
        _ => Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("unsupported websocket opcode {opcode}"),
        )),
    }
}

fn write_server_frame(stream: &mut TcpStream, opcode: u8, payload: &[u8]) -> io::Result<()> {
    let mut header = Vec::new();
    header.push(0x80 | opcode);
    if payload.len() < 126 {
        header.push(payload.len() as u8);
    } else if payload.len() < 65_536 {
        header.push(126);
        header.extend_from_slice(&(payload.len() as u16).to_be_bytes());
    } else {
        header.push(127);
        header.extend_from_slice(&(payload.len() as u64).to_be_bytes());
    }
    stream.write_all(&header)?;
    stream.write_all(payload)?;
    stream.flush()
}

fn send_text(writer: &Arc<Mutex<TcpStream>>, value: serde_json::Value) -> io::Result<()> {
    let text = serde_json::to_vec(&value)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    let mut stream = writer
        .lock()
        .map_err(|_| io::Error::new(io::ErrorKind::Other, "websocket writer lock poisoned"))?;
    write_server_frame(&mut stream, 1, &text)
}

fn send_binary(writer: &Arc<Mutex<TcpStream>>, bytes: &[u8]) -> io::Result<()> {
    let mut stream = writer
        .lock()
        .map_err(|_| io::Error::new(io::ErrorKind::Other, "websocket writer lock poisoned"))?;
    write_server_frame(&mut stream, 2, bytes)
}

fn send_close(writer: &Arc<Mutex<TcpStream>>) {
    if let Ok(mut stream) = writer.lock() {
        let _ = write_server_frame(&mut stream, 8, &[]);
        let _ = stream.shutdown(Shutdown::Both);
    }
}

fn send_error(writer: &Arc<Mutex<TcpStream>>, id: &str, message: impl AsRef<str>) {
    let _ = send_text(
        writer,
        json!({
            "type": "error",
            "id": id,
            "message": message.as_ref(),
        }),
    );
}

#[cfg(windows)]
fn is_windows_cmd_shell(command: &str) -> bool {
    let name = std::path::Path::new(command)
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or(command)
        .trim();
    name.eq_ignore_ascii_case("cmd.exe") || name.eq_ignore_ascii_case("cmd")
}

#[cfg(windows)]
fn windows_cmd_raw_tail_start(args: &[String]) -> Option<usize> {
    args.iter()
        .position(|arg| arg.eq_ignore_ascii_case("/c") || arg.eq_ignore_ascii_case("/k"))
        .map(|index| index + 1)
}

#[cfg(windows)]
fn append_windows_process_args(command: &mut Command, request: &SpawnRequest) {
    use std::os::windows::process::CommandExt;

    if is_windows_cmd_shell(&request.command) {
        if let Some(raw_tail_start) = windows_cmd_raw_tail_start(&request.args) {
            command.args(&request.args[..raw_tail_start]);
            for arg in &request.args[raw_tail_start..] {
                command.raw_arg(arg);
            }
            return;
        }
    }
    command.args(&request.args);
}

fn spawn_backend(request: &SpawnRequest) -> io::Result<Child> {
    if request.command.trim().is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "spawn command is empty",
        ));
    }
    let mut command = Command::new(&request.command);
    #[cfg(windows)]
    append_windows_process_args(&mut command, request);
    #[cfg(not(windows))]
    command.args(&request.args);
    command
        .current_dir(&request.cwd)
        .envs(&request.env)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command.spawn()
}

fn terminate_child(pid: u32) {
    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    #[cfg(not(windows))]
    {
        let _ = pid;
    }
}

fn handle_connection(mut stream: TcpStream, token: String, log_file: String) {
    let peer = stream
        .peer_addr()
        .map(|addr| addr.to_string())
        .unwrap_or_else(|_| "<unknown>".to_string());
    let mut pending = match accept_websocket(&mut stream, Vec::new(), &token) {
        Ok(rest) => rest,
        Err(error) => {
            log_line(&log_file, format!("reject {peer}: {error}"));
            return;
        }
    };
    let writer = match stream.try_clone() {
        Ok(clone) => Arc::new(Mutex::new(clone)),
        Err(error) => {
            log_line(&log_file, format!("clone stream failed: {error}"));
            return;
        }
    };
    let spawn_frame = match read_client_frame(&mut stream, &mut pending) {
        Ok(ClientFrame::Text(text)) => text,
        Ok(_) => {
            send_error(&writer, "", "first websocket frame must be a spawn request");
            return;
        }
        Err(error) => {
            send_error(
                &writer,
                "",
                format!("failed to read spawn request: {error}"),
            );
            return;
        }
    };
    let request: SpawnRequest = match serde_json::from_str(&spawn_frame) {
        Ok(value) => value,
        Err(error) => {
            send_error(&writer, "", format!("invalid spawn request JSON: {error}"));
            return;
        }
    };
    if request.kind != "spawn" {
        send_error(
            &writer,
            &request.id,
            "first websocket frame must have type=spawn",
        );
        return;
    }
    let audit = create_audit_sink(request.audit_file.clone(), log_file.clone());
    append_audit_event(
        &audit,
        &request.id,
        "spawn_request_received",
        json!({
            "command": &request.command,
            "argCount": request.args.len(),
            "args": &request.args,
            "cwd": &request.cwd,
            "envKeys": request.env.keys().cloned().collect::<Vec<String>>(),
        }),
    );
    let child = match spawn_backend(&request) {
        Ok(child) => child,
        Err(error) => {
            append_audit_event(
                &audit,
                &request.id,
                "child_spawn_failed",
                json!({
                    "message": error.to_string(),
                }),
            );
            send_error(
                &writer,
                &request.id,
                format!("failed to spawn child: {error}"),
            );
            return;
        }
    };
    let child_pid = child.id();
    let _ = send_text(
        &writer,
        json!({
            "type": "spawned",
            "id": request.id,
            "pid": child_pid,
        }),
    );
    append_audit_event(
        &audit,
        &request.id,
        "child_spawned",
        json!({
            "pid": child_pid,
            "command": &request.command,
        }),
    );
    log_line(
        &log_file,
        format!(
            "spawned id={} pid={} command={}",
            request.id, child_pid, request.command
        ),
    );

    let mut child = child;
    let mut child_stdin = child.stdin.take();
    let mut child_stdout = child.stdout.take();
    let mut child_stderr = child.stderr.take();
    let stdout_handle = child_stdout.take().map(|mut stdout| {
        let writer = Arc::clone(&writer);
        let audit = audit.clone();
        let id = request.id.clone();
        thread::spawn(move || {
            let mut buffer = [0_u8; 8192];
            loop {
                match stdout.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(count) => {
                        append_audit_event(
                            &audit,
                            &id,
                            "child_stdout_chunk_read",
                            json!({
                                "stream": "stdout",
                                "bytes": count,
                                "preview": bytes_preview(&buffer[..count]),
                            }),
                        );
                        if send_binary(&writer, &buffer[..count]).is_err() {
                            append_audit_event(
                                &audit,
                                &id,
                                "child_stdout_frame_send_failed",
                                json!({
                                    "stream": "stdout",
                                    "bytes": count,
                                }),
                            );
                            break;
                        }
                        append_audit_event(
                            &audit,
                            &id,
                            "child_stdout_frame_sent",
                            json!({
                                "stream": "stdout",
                                "bytes": count,
                            }),
                        );
                    }
                    Err(error) => {
                        append_audit_event(
                            &audit,
                            &id,
                            "child_stdout_read_failed",
                            json!({
                                "stream": "stdout",
                                "message": error.to_string(),
                            }),
                        );
                        break;
                    }
                }
            }
        })
    });

    let stderr_handle = child_stderr.take().map(|mut stderr| {
        let writer = Arc::clone(&writer);
        let audit = audit.clone();
        let id = request.id.clone();
        thread::spawn(move || {
            let mut buffer = [0_u8; 8192];
            loop {
                match stderr.read(&mut buffer) {
                    Ok(0) => break,
                    Ok(count) => {
                        append_audit_event(
                            &audit,
                            &id,
                            "child_stderr_chunk_read",
                            json!({
                                "stream": "stderr",
                                "bytes": count,
                                "preview": bytes_preview(&buffer[..count]),
                            }),
                        );
                        if send_text(
                            &writer,
                            json!({
                                "type": "stderr",
                                "id": id,
                                "dataBase64": BASE64.encode(&buffer[..count]),
                            }),
                        )
                        .is_err()
                        {
                            append_audit_event(
                                &audit,
                                &id,
                                "child_stderr_frame_send_failed",
                                json!({
                                    "stream": "stderr",
                                    "bytes": count,
                                }),
                            );
                            break;
                        }
                        append_audit_event(
                            &audit,
                            &id,
                            "child_stderr_frame_sent",
                            json!({
                                "stream": "stderr",
                                "bytes": count,
                            }),
                        );
                    }
                    Err(error) => {
                        append_audit_event(
                            &audit,
                            &id,
                            "child_stderr_read_failed",
                            json!({
                                "stream": "stderr",
                                "message": error.to_string(),
                            }),
                        );
                        break;
                    }
                }
            }
        })
    });

    {
        let writer = Arc::clone(&writer);
        let id = request.id.clone();
        let audit = audit.clone();
        thread::spawn(move || {
            let status = child.wait().ok();
            if let Some(handle) = stdout_handle {
                let _ = handle.join();
            }
            if let Some(handle) = stderr_handle {
                let _ = handle.join();
            }
            let code = status.and_then(|status| status.code());
            append_audit_event(
                &audit,
                &id,
                "child_exit",
                json!({
                    "exitCode": code,
                }),
            );
            let _ = send_text(
                &writer,
                json!({
                    "type": "exit",
                    "id": id,
                    "code": code,
                    "signal": null,
                }),
            );
            send_close(&writer);
        });
    }

    loop {
        match read_client_frame(&mut stream, &mut pending) {
            Ok(ClientFrame::Binary(bytes)) => {
                append_audit_event(
                    &audit,
                    &request.id,
                    "client_stdin_frame_received",
                    json!({
                        "stream": "stdin",
                        "bytes": bytes.len(),
                        "frameType": "binary",
                        "preview": bytes_preview(&bytes),
                    }),
                );
                if let Some(stdin) = child_stdin.as_mut() {
                    if stdin.write_all(&bytes).is_err() {
                        append_audit_event(
                            &audit,
                            &request.id,
                            "child_stdin_write_failed",
                            json!({
                                "stream": "stdin",
                                "bytes": bytes.len(),
                            }),
                        );
                        break;
                    }
                    append_audit_event(
                        &audit,
                        &request.id,
                        "child_stdin_write_ok",
                        json!({
                            "stream": "stdin",
                            "bytes": bytes.len(),
                        }),
                    );
                }
            }
            Ok(ClientFrame::Text(text)) => {
                append_audit_event(
                    &audit,
                    &request.id,
                    "client_stdin_frame_received",
                    json!({
                        "stream": "stdin",
                        "bytes": text.as_bytes().len(),
                        "frameType": "text",
                        "preview": sanitize_text_preview(&text),
                    }),
                );
                if let Some(stdin) = child_stdin.as_mut() {
                    if stdin.write_all(text.as_bytes()).is_err() {
                        append_audit_event(
                            &audit,
                            &request.id,
                            "child_stdin_write_failed",
                            json!({
                                "stream": "stdin",
                                "bytes": text.as_bytes().len(),
                            }),
                        );
                        break;
                    }
                    append_audit_event(
                        &audit,
                        &request.id,
                        "child_stdin_write_ok",
                        json!({
                            "stream": "stdin",
                            "bytes": text.as_bytes().len(),
                        }),
                    );
                }
            }
            Ok(ClientFrame::Ping(bytes)) => {
                if let Ok(mut stream) = writer.lock() {
                    let _ = write_server_frame(&mut stream, 10, &bytes);
                }
            }
            Ok(ClientFrame::Pong) => {}
            Ok(ClientFrame::Close) => {
                append_audit_event(&audit, &request.id, "client_websocket_closed", json!({}));
                break;
            }
            Err(error) => {
                append_audit_event(
                    &audit,
                    &request.id,
                    "client_frame_read_failed",
                    json!({
                        "message": error.to_string(),
                    }),
                );
                break;
            }
        }
    }
    drop(child_stdin);
    append_audit_event(
        &audit,
        &request.id,
        "client_loop_finished",
        json!({
            "childPid": child_pid,
        }),
    );
    terminate_child(child_pid);
}

fn run_server(args: ServeArgs) -> io::Result<()> {
    let listener = TcpListener::bind(format!("{}:{}", args.host, args.port))?;
    let port = listener.local_addr()?.port();
    let url = format!("ws://{}:{}/v1/acp?token={}", args.host, port, args.token);
    write_json_file(
        &args.ready_file,
        &ReadyFile {
            ok: true,
            url,
            host: &args.host,
            port,
            pid: std::process::id(),
            started_at: now_isoish(),
        },
    )?;
    log_line(
        &args.log_file,
        format!(
            "listening host={} port={} pid={}",
            args.host,
            port,
            std::process::id()
        ),
    );
    for incoming in listener.incoming() {
        match incoming {
            Ok(stream) => {
                let token = args.token.clone();
                let log_file = args.log_file.clone();
                thread::spawn(move || handle_connection(stream, token, log_file));
            }
            Err(error) => log_line(&args.log_file, format!("accept failed: {error}")),
        }
    }
    Ok(())
}

fn main() {
    match parse_args().and_then(|args| {
        let ready_file = args.ready_file.clone();
        run_server(args).map_err(|error| {
            let text = error.to_string();
            let _ = write_json_file(
                &ready_file,
                &ErrorReadyFile {
                    ok: false,
                    error: &text,
                    finished_at: now_isoish(),
                },
            );
            text
        })
    }) {
        Ok(()) => {}
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn tcp_pair() -> (TcpStream, TcpStream) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let client = TcpStream::connect(listener.local_addr().unwrap()).unwrap();
        let (server, _) = listener.accept().unwrap();
        (client, server)
    }

    #[test]
    fn validates_token_only_on_acp_path() {
        assert!(target_has_token("/v1/acp?token=abc", "abc"));
        assert!(!target_has_token("/v1/acp?token=wrong", "abc"));
        assert!(!target_has_token("/other?token=abc", "abc"));
    }

    #[test]
    fn computes_websocket_accept_key() {
        assert_eq!(
            websocket_accept_key("dGhlIHNhbXBsZSBub25jZQ=="),
            "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="
        );
    }

    #[test]
    fn reads_headers_after_request_line() {
        let headers = concat!(
            "GET /v1/acp?token=abc HTTP/1.1\r\n",
            "Host: 127.0.0.1:12345\r\n",
            "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n",
            "\r\n"
        );
        assert_eq!(
            header_value(headers, "Sec-WebSocket-Key"),
            Some("dGhlIHNhbXBsZSBub25jZQ==")
        );
    }

    #[test]
    fn parses_spawn_request() {
        let request: SpawnRequest = serde_json::from_str(
            r#"{"type":"spawn","id":"a","command":"cmd.exe","args":["/c","echo"],"cwd":"C:\\","env":{"A":"B"},"auditFile":"C:\\audit\\bridge.ndjson"}"#,
        )
        .unwrap();
        assert_eq!(request.kind, "spawn");
        assert_eq!(request.args, vec!["/c", "echo"]);
        assert_eq!(request.env.get("A").map(String::as_str), Some("B"));
        assert_eq!(
            request.audit_file.as_deref(),
            Some(r"C:\audit\bridge.ndjson")
        );
    }

    #[test]
    fn writes_sanitized_bridge_audit_event() {
        let dir = std::env::temp_dir().join(format!(
            "zotero-acp-bridge-audit-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let audit_file = dir.join("bridge.ndjson");
        let log_file = dir.join("bridge.log");
        let audit = create_audit_sink(
            Some(audit_file.to_string_lossy().to_string()),
            log_file.to_string_lossy().to_string(),
        );
        append_audit_event(
            &audit,
            "spawn-1",
            "child_stdout_chunk_read",
            json!({
                "bytes": 12,
                "preview": bytes_preview(br#"{"token":"secret-value","text":"ok"}"#),
            }),
        );
        let text = fs::read_to_string(&audit_file).unwrap();
        assert!(text.contains(AUDIT_SCHEMA));
        assert!(text.contains("child_stdout_chunk_read"));
        assert!(text.contains("<redacted>"));
        assert!(!text.contains("secret-value"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn rejects_oversized_client_frame_before_payload_read() {
        let (_client, mut server) = tcp_pair();
        let mut pending = vec![0x82, 0x7f];
        pending.extend_from_slice(&(MAX_FRAME_BYTES + 1).to_be_bytes());

        let error = read_client_frame(&mut server, &mut pending).unwrap_err();

        assert_eq!(error.kind(), io::ErrorKind::InvalidData);
        assert!(error.to_string().contains("websocket frame too large"));
    }

    #[test]
    fn writes_large_binary_server_frame_with_extended_length() {
        let (mut client, mut server) = tcp_pair();
        let payload = vec![b'x'; 70_000];
        let expected = payload.clone();

        let writer = thread::spawn(move || {
            write_server_frame(&mut server, 2, &payload).unwrap();
        });

        let mut header = [0_u8; 10];
        client.read_exact(&mut header).unwrap();
        assert_eq!(header[0], 0x82);
        assert_eq!(header[1], 127);
        assert_eq!(
            u64::from_be_bytes([
                header[2], header[3], header[4], header[5], header[6], header[7], header[8],
                header[9],
            ]),
            expected.len() as u64
        );
        let mut received = vec![0_u8; expected.len()];
        client.read_exact(&mut received).unwrap();
        writer.join().unwrap();

        assert_eq!(received, expected);
    }

    #[test]
    fn sanitizes_nested_sensitive_audit_payloads() {
        let dir = std::env::temp_dir().join(format!(
            "zotero-acp-bridge-nested-audit-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let audit_file = dir.join("bridge.ndjson");
        let log_file = dir.join("bridge.log");
        let audit = create_audit_sink(
            Some(audit_file.to_string_lossy().to_string()),
            log_file.to_string_lossy().to_string(),
        );

        append_audit_event(
            &audit,
            "spawn-1",
            "spawn_request_received",
            json!({
                "env": {
                    "OPENAI_API_KEY": "api-secret",
                    "HOME": "C:\\Users\\tester"
                },
                "nested": {
                    "authorization": "Bearer nested-secret",
                    "items": [{ "cookie": "cookie-secret", "visible": "ok" }]
                }
            }),
        );

        let text = fs::read_to_string(&audit_file).unwrap();
        assert!(text.contains("C:\\\\Users\\\\tester"));
        assert!(text.contains("\"visible\":\"ok\""));
        assert!(text.contains("<redacted>"));
        assert!(!text.contains("api-secret"));
        assert!(!text.contains("nested-secret"));
        assert!(!text.contains("cookie-secret"));
        let _ = fs::remove_dir_all(&dir);
    }

    #[cfg(windows)]
    #[test]
    fn detects_windows_cmd_shell_raw_payload_tail() {
        assert!(is_windows_cmd_shell(r"C:\Windows\System32\cmd.exe"));
        assert_eq!(
            windows_cmd_raw_tail_start(&[
                "/d".to_string(),
                "/s".to_string(),
                "/c".to_string(),
                r#""C:\Program Files\nodejs\npx.cmd" "-y""#.to_string(),
            ]),
            Some(3)
        );
    }
}
