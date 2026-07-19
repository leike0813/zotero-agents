use serde_json::{Map, Value, json};
use std::collections::HashMap;
use std::io::{self, BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, mpsc};
use synthesis_protocol::{METRICS_OPERATION, MetricsRequest, WORKER_PROTOCOL, deterministic_operation};

const BUILD_FINGERPRINT: &str = match option_env!("SYNTHESIS_RUST_BUILD_FINGERPRINT") {
    Some(value) => value,
    None => "development",
};
const MAX_WORKER_FRAME_BYTES: u64 = 8 * 1024 * 1024;

enum WorkerCommand {
    Run(String, String, Value),
    End,
}

struct PendingInput {
    task_id: String,
    operation: String,
    header: Map<String, Value>,
    sections: HashMap<String, Vec<Value>>,
    page_indexes: HashMap<String, u64>,
}

fn page_descriptor(section: &str, page_index: usize, rows: &[Value]) -> Result<Value, &'static str> {
    let value = Value::Array(rows.to_vec());
    let canonical = synthesis_protocol::canonical_json(&value)?;
    if canonical.len() > 4 * 1024 * 1024 || rows.len() > 100_000 {
        return Err("invalid_request");
    }
    Ok(json!({
        "section": section,
        "pageIndex": page_index,
        "rowCount": rows.len(),
        "byteLength": canonical.len(),
        "sha256": synthesis_protocol::canonical_sha256(&value)?,
    }))
}

fn append_input_page(pending: &mut PendingInput, value: &Value) -> Result<Value, &'static str> {
    if value["taskId"] != pending.task_id {
        return Err("invalid_request");
    }
    let descriptor = value["descriptor"].as_object().ok_or("invalid_request")?;
    let section = descriptor["section"].as_str().ok_or("invalid_request")?;
    let rows = value["rows"].as_array().ok_or("invalid_request")?;
    let page_index = *pending.page_indexes.get(section).unwrap_or(&0);
    let expected = page_descriptor(section, page_index as usize, rows)?;
    if expected != value["descriptor"] {
        return Err("invalid_request");
    }
    pending.sections.entry(section.to_owned()).or_default().extend(rows.iter().cloned());
    pending.page_indexes.insert(section.to_owned(), page_index + 1);
    Ok(json!({"protocol":WORKER_PROTOCOL,"type":"input_ack","taskId":pending.task_id,"section":section,"pageIndex":page_index}))
}

fn finish_input(mut pending: PendingInput) -> Result<(String, String, Value), &'static str> {
    for (section, rows) in pending.sections {
        if (pending.operation == synthesis_protocol::TAG_VOCABULARY_VALIDATE_OPERATION
            || pending.operation == synthesis_protocol::TAG_VOCABULARY_INDEX_OPERATION)
            && (section == "aliases" || section == "abbrev")
        {
            let mut object = Map::new();
            for row in rows {
                let pair = row.as_array().filter(|pair| pair.len() == 2).ok_or("invalid_request")?;
                let key = pair[0].as_str().ok_or("invalid_request")?;
                if object.insert(key.to_owned(), pair[1].clone()).is_some() { return Err("invalid_request"); }
            }
            pending.header.insert(section, Value::Object(object));
        } else {
            pending.header.insert(section, Value::Array(rows));
        }
    }
    Ok((pending.task_id, pending.operation, Value::Object(pending.header)))
}

fn result_parts(operation: &str, result: Value) -> Result<(Map<String, Value>, Vec<(String, Vec<Value>)>), &'static str> {
    let mut header = result.as_object().cloned().ok_or("worker_result_invalid")?;
    let names: &[&str] = match operation {
        synthesis_protocol::TAG_VOCABULARY_VALIDATE_OPERATION => &["warnings"],
        synthesis_protocol::TAG_VOCABULARY_INDEX_OPERATION => &["tags", "aliases", "abbrev", "search", "validationWarnings"],
        synthesis_protocol::CONCEPT_KB_INDEX_OPERATION => &["search", "overlayEntries"],
        synthesis_protocol::CONCEPT_KB_QUERY_OPERATION => &["matches"],
        synthesis_protocol::TOPIC_GRAPH_INDEX_OPERATION => &["roots", "unplaced"],
        _ => return Err("worker_result_invalid"),
    };
    let mut sections = Vec::new();
    for name in names {
        let value = header.remove(*name).ok_or("worker_result_invalid")?;
        let rows = if *name == "aliases" || *name == "abbrev" {
            value.as_object().ok_or("worker_result_invalid")?.iter().map(|(key, value)| json!([key, value])).collect()
        } else {
            value.as_array().cloned().ok_or("worker_result_invalid")?
        };
        sections.push(((*name).to_owned(), rows));
    }
    Ok((header, sections))
}

fn paginate_rows(section: &str, rows: Vec<Value>) -> Result<Vec<(Value, Vec<Value>)>, &'static str> {
    let mut pages = Vec::new();
    let mut current = Vec::new();
    let mut bytes = 2usize;
    for row in rows {
        let row_bytes = synthesis_protocol::canonical_json(&row)?.len();
        if !current.is_empty() && bytes + 1 + row_bytes > 4 * 1024 * 1024 {
            let descriptor = page_descriptor(section, pages.len(), &current)?;
            pages.push((descriptor, std::mem::take(&mut current)));
            bytes = 2;
        }
        if row_bytes + 2 > 4 * 1024 * 1024 { return Err("worker_result_invalid"); }
        bytes += if current.is_empty() { row_bytes } else { row_bytes + 1 };
        current.push(row);
    }
    if !current.is_empty() || pages.is_empty() {
        let descriptor = page_descriptor(section, pages.len(), &current)?;
        pages.push((descriptor, current));
    }
    Ok(pages)
}

fn write_paged_result(
    task_id: &str,
    operation: &str,
    result: Value,
    acknowledgments: &mpsc::Receiver<(String, String, u64)>,
) -> Result<(), &'static str> {
    let (header, sections) = result_parts(operation, result)?;
    write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":"result_begin","taskId":task_id,"header":header})).map_err(|_| "worker_result_invalid")?;
    for (section, rows) in sections {
        for (descriptor, rows) in paginate_rows(&section, rows)? {
            let page_index = descriptor["pageIndex"].as_u64().ok_or("worker_result_invalid")?;
            write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":"result_page","taskId":task_id,"descriptor":descriptor,"rows":rows})).map_err(|_| "worker_result_invalid")?;
            let acknowledgment = acknowledgments.recv().map_err(|_| "worker_canceled")?;
            if acknowledgment != (task_id.to_owned(), section.clone(), page_index) { return Err("worker_result_invalid"); }
        }
    }
    write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":"result_complete","taskId":task_id})).map_err(|_| "worker_result_invalid")?;
    Ok(())
}

type ActiveWorkerTask = Arc<Mutex<Option<(String, Arc<AtomicBool>)>>>;

fn write_frame(value: &Value) -> io::Result<()> {
    let mut stdout = io::stdout().lock();
    serde_json::to_writer(&mut stdout, value)?;
    stdout.write_all(b"\n")?;
    stdout.flush()
}

fn worker() -> Result<(), String> {
    write_frame(&json!({"protocol": WORKER_PROTOCOL, "type": "ready", "buildFingerprint": BUILD_FINGERPRINT})).map_err(|error| error.to_string())?;
    let (sender, receiver) = mpsc::sync_channel(1);
    let (ack_sender, ack_receiver) = mpsc::channel();
    let active: ActiveWorkerTask = Arc::new(Mutex::new(None));
    let reader_active = Arc::clone(&active);
    std::thread::spawn(move || {
        let stdin = io::stdin();
        let mut reader = BufReader::new(stdin.lock());
        let mut pending_input: Option<PendingInput> = None;
        loop {
            let mut line = String::new();
            let Ok(bytes) = reader
                .by_ref()
                .take(MAX_WORKER_FRAME_BYTES + 1)
                .read_line(&mut line)
            else {
                break;
            };
            if bytes == 0 {
                break;
            }
            if bytes as u64 > MAX_WORKER_FRAME_BYTES || !line.ends_with('\n') {
                let _ = write_frame(
                    &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":"","code":"invalid_request"}),
                );
                break;
            }
            let Ok(value) = serde_json::from_str::<Value>(&line) else {
                continue;
            };
            let task_id = value["taskId"].as_str().unwrap_or_default().to_owned();
            match value["type"].as_str() {
                Some("run")
                    if value["protocol"] == WORKER_PROTOCOL
                        && value["operation"].as_str().is_some_and(|operation| operation == METRICS_OPERATION || deterministic_operation(operation)) =>
                {
                    let Some(operation) = value["operation"].as_str().map(str::to_owned) else { continue; };
                    if !value["payload"].is_object() {
                        let _ = write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"}));
                    } else if sender.send(WorkerCommand::Run(task_id, operation, value["payload"].clone())).is_err() {
                        break;
                    }
                }
                Some("run_begin")
                    if value["protocol"] == WORKER_PROTOCOL
                        && value["operation"].as_str().is_some_and(deterministic_operation) =>
                {
                    if pending_input.is_some() { break; }
                    let Some(operation) = value["operation"].as_str() else { continue; };
                    let Some(header) = value["header"].as_object() else { continue; };
                    pending_input = Some(PendingInput { task_id, operation: operation.to_owned(), header: header.clone(), sections: HashMap::new(), page_indexes: HashMap::new() });
                }
                Some("input_page") => {
                    let Some(pending) = pending_input.as_mut() else { continue; };
                    match append_input_page(pending, &value) {
                        Ok(ack) => { let _ = write_frame(&ack); }
                        Err(_) => { let _ = write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"})); break; }
                    }
                }
                Some("input_complete") => {
                    let Some(pending) = pending_input.take() else { continue; };
                    match finish_input(pending) {
                        Ok((task_id, operation, request)) => if sender.send(WorkerCommand::Run(task_id, operation, request)).is_err() { break; },
                        Err(_) => { let _ = write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"})); break; }
                    }
                }
                Some("result_ack") => {
                    let Some(section) = value["section"].as_str() else { continue; };
                    let Some(page_index) = value["pageIndex"].as_u64() else { continue; };
                    let _ = ack_sender.send((task_id, section.to_owned(), page_index));
                }
                Some("cancel") => {
                    if let Some((current, flag)) = &*reader_active.lock().unwrap()
                        && current == &task_id
                    {
                        flag.store(true, Ordering::Relaxed);
                    }
                }
                _ => {}
            }
        }
        let _ = sender.send(WorkerCommand::End);
    });
    while let Ok(command) = receiver.recv() {
        match command {
            WorkerCommand::Run(task_id, operation, request) => {
                let canceled = Arc::new(AtomicBool::new(false));
                *active.lock().unwrap() = Some((task_id.clone(), Arc::clone(&canceled)));
                let computed = match operation.as_str() {
                    METRICS_OPERATION => serde_json::from_value(request)
                        .map_err(|_| "invalid_request")
                        .and_then(|request| synthesis_metrics::compute(request, &canceled).map(|result| serde_json::to_value(result).unwrap())),
                    synthesis_protocol::TAG_VOCABULARY_VALIDATE_OPERATION | synthesis_protocol::TAG_VOCABULARY_INDEX_OPERATION => synthesis_tag_vocabulary::compute(&operation, request, &canceled),
                    synthesis_protocol::CONCEPT_KB_INDEX_OPERATION | synthesis_protocol::CONCEPT_KB_QUERY_OPERATION => synthesis_concept_kb::compute(&operation, request, &canceled),
                    synthesis_protocol::TOPIC_GRAPH_INDEX_OPERATION => synthesis_topic_graph::compute(request, &canceled),
                    _ => Err("invalid_request"),
                };
                if computed.is_ok() && deterministic_operation(&operation) {
                    let result = computed.unwrap();
                    let outcome = write_paged_result(&task_id, &operation, result, &ack_receiver);
                    *active.lock().unwrap() = None;
                    if let Err(code) = outcome {
                        write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":code})).map_err(|error| error.to_string())?;
                    }
                    continue;
                }
                let frame = match computed {
                    Ok(result) => {
                        json!({"protocol":WORKER_PROTOCOL,"type":"result","taskId":task_id,"result":result})
                    }
                    Err("worker_canceled") => {
                        json!({"protocol":WORKER_PROTOCOL,"type":"canceled","taskId":task_id,"code":"worker_canceled"})
                    }
                    Err(code) => {
                        json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":code})
                    }
                };
                *active.lock().unwrap() = None;
                write_frame(&frame).map_err(|error| error.to_string())?;
            }
            WorkerCommand::End => break,
        }
    }
    Ok(())
}

fn read_http(stream: &mut TcpStream) -> Result<(String, String, Vec<u8>), String> {
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
    Ok((parts[1].to_owned(), token, body))
}

fn response(stream: &mut TcpStream, status: u16, value: Value) -> Result<(), String> {
    let body = serde_json::to_vec(&value).map_err(|error| error.to_string())?;
    let reason = if status == 200 { "OK" } else { "Error" };
    write!(stream, "HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", body.len()).map_err(|error| error.to_string())?;
    stream.write_all(&body).map_err(|error| error.to_string())
}

fn worker_call(request: MetricsRequest) -> Result<Value, String> {
    let executable = std::env::current_exe().map_err(|error| error.to_string())?;
    let mut child = Command::new(executable)
        .arg("worker")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|error| error.to_string())?;
    let stdout = child.stdout.take().ok_or("worker_unavailable")?;
    let mut lines = BufReader::new(stdout).lines();
    let ready = lines
        .next()
        .ok_or("worker_unavailable")?
        .map_err(|error| error.to_string())?;
    let ready: Value = serde_json::from_str(&ready).map_err(|_| "worker_result_invalid")?;
    if ready["type"] != "ready" {
        return Err("worker_result_invalid".into());
    }
    let frame = json!({"protocol":WORKER_PROTOCOL,"type":"run","taskId":"candidate:1","operation":METRICS_OPERATION,"payload":request});
    serde_json::to_writer(child.stdin.as_mut().ok_or("worker_unavailable")?, &frame)
        .map_err(|error| error.to_string())?;
    child
        .stdin
        .as_mut()
        .unwrap()
        .write_all(b"\n")
        .map_err(|error| error.to_string())?;
    let result = lines
        .next()
        .ok_or("worker_crashed")?
        .map_err(|error| error.to_string())?;
    let result: Value = serde_json::from_str(&result).map_err(|_| "worker_result_invalid")?;
    let _ = child.kill();
    if result["type"] == "result" {
        Ok(result["result"].clone())
    } else {
        Err(result["code"]
            .as_str()
            .unwrap_or("worker_result_invalid")
            .to_owned())
    }
}

fn serve(config_path: &str) -> Result<(), String> {
    let config: Value = serde_json::from_str(
        &std::fs::read_to_string(config_path).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    let token = config["clientToken"]
        .as_str()
        .ok_or("invalid_config")?
        .to_owned();
    let profile = config["profileId"]
        .as_str()
        .ok_or("invalid_config")?
        .to_owned();
    let listener = TcpListener::bind(("127.0.0.1", config["port"].as_u64().unwrap_or(0) as u16))
        .map_err(|error| error.to_string())?;
    println!(
        "{}",
        json!({"type":"listening","port":listener.local_addr().map_err(|error| error.to_string())?.port(),"buildFingerprint":BUILD_FINGERPRINT})
    );
    for incoming in listener.incoming() {
        let mut stream = incoming.map_err(|error| error.to_string())?;
        let Ok((path, bearer, body)) = read_http(&mut stream) else {
            let _ = response(
                &mut stream,
                400,
                json!({"ok":false,"error":{"code":"invalid_request"}}),
            );
            continue;
        };
        if path == "/health" {
            response(
                &mut stream,
                200,
                json!({"ok":true,"implementation":"rust-native-candidate","lifecycleState":"ready"}),
            )?;
            continue;
        }
        if bearer != token {
            response(
                &mut stream,
                401,
                json!({"ok":false,"error":{"code":"unauthorized"}}),
            )?;
            continue;
        }
        let call: Value = serde_json::from_slice(&body).map_err(|_| "invalid_request")?;
        if call["profileId"] != profile {
            response(
                &mut stream,
                409,
                json!({"ok":false,"error":{"code":"profile_mismatch"}}),
            )?;
            continue;
        }
        if call["capability"] == "compute.citation_graph_metrics" {
            let request: MetricsRequest =
                serde_json::from_value(call["payload"].clone()).map_err(|_| "invalid_request")?;
            match worker_call(request) {
                Ok(data) => response(
                    &mut stream,
                    200,
                    json!({"ok":true,"requestId":call["requestId"],"serviceInstanceId":"rust-metrics-candidate","data":data}),
                )?,
                Err(code) => response(&mut stream, 503, json!({"ok":false,"error":{"code":code}}))?,
            }
        } else if call["capability"] == "system.handshake" {
            response(
                &mut stream,
                200,
                json!({"ok":true,"requestId":call["requestId"],"serviceInstanceId":"rust-metrics-candidate","data":{"protocol":"synthesis-sidecar.v1","serviceInstanceId":"rust-metrics-candidate","capabilities":["system.handshake","system.shutdown","compute.citation_graph_metrics"],"mutationEnabled":false,"lifecycleState":"ready","implementation":"rust-native-candidate"}}),
            )?;
        } else if call["capability"] == "system.shutdown" {
            response(
                &mut stream,
                200,
                json!({"ok":true,"requestId":call["requestId"],"serviceInstanceId":"rust-metrics-candidate","data":{"stopping":true}}),
            )?;
            break;
        } else {
            response(
                &mut stream,
                404,
                json!({"ok":false,"error":{"code":"capability_not_found"}}),
            )?;
        }
    }
    Ok(())
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let result = match args.get(1).map(String::as_str) {
        Some("worker") => worker(),
        Some("serve") => args
            .get(2)
            .ok_or_else(|| "missing_config".to_owned())
            .and_then(|path| serve(path)),
        _ => Err("usage: synthesis-sidecar <worker|serve CONFIG>".into()),
    };
    if let Err(error) = result {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
