use serde::Deserialize;
use serde_json::{Value, json};
use std::io::{self, BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, mpsc};
use std::thread;
use std::time::Duration;
use synthesis_application::{
    CanonicalStorePort, RepositoryPort, TopicCanonicalPort, WorkbenchApplication,
};
use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
use synthesis_protocol::{
    DeterministicAckFrame, DeterministicPageFrame, DeterministicRawPageFrame,
    DeterministicRunBegin, DeterministicTaskFrame, METRICS_OPERATION, PAGE_MAX_BYTES,
    PAGE_MAX_JSON_NODES, PageDescriptor, PagedInputAssembler, WORKER_PROTOCOL, canonical_json,
    count_json_nodes, count_json_nodes_raw, deterministic_operation, page_descriptor,
    raw_page_descriptor_with_node_count, split_paged_result,
};
use synthesis_repository::{Repository, RepositoryIdentity};
use synthesis_sidecar::runtime_contract::{
    NativeLaunchConfig, SIDECAR_CAPABILITIES, current_time_ms, read_native_launch_config,
    validate_host_lease,
};
use synthesis_sidecar::runtime_transfer::NativeTransferOwner;

use crate::runtime_http::{read_http, response};
use crate::runtime_lifecycle::RuntimeOwnership;
use crate::runtime_worker_pool::{NativeComputePool, worker_call};

const WORKER_BUILD_FINGERPRINT: &str = match option_env!("SYNTHESIS_RUST_BUILD_FINGERPRINT") {
    Some(value) => value,
    None => "development",
};
const MAX_WORKER_FRAME_BYTES: u64 = 8 * 1024 * 1024;
const MAX_READ_BODY_BYTES: usize = 1024 * 1024;
const MAX_READ_RESPONSE_BYTES: usize = 1024 * 1024;

enum WorkerCommand {
    Run(String, String, Option<String>, Value),
    RunConcept(String, String, synthesis_concept_kb::ConceptRequest),
    RunGraph(
        String,
        String,
        String,
        synthesis_citation_graph_build::GraphRequest,
    ),
    End,
}
enum PendingInputAssembler {
    Generic(PagedInputAssembler),
    Concept(synthesis_concept_kb::ConceptPagedInputAssembler),
    Graph(synthesis_citation_graph_build::GraphPagedInputAssembler),
}

impl PendingInputAssembler {
    fn task_id(&self) -> &str {
        match self {
            Self::Generic(input) => input.task_id(),
            Self::Concept(input) => input.task_id(),
            Self::Graph(input) => input.task_id(),
        }
    }

    fn append_page(
        &mut self,
        task_id: &str,
        descriptor: PageDescriptor,
        rows: Vec<Value>,
    ) -> Result<(String, u64), &'static str> {
        match self {
            Self::Generic(input) => input.append_page(task_id, descriptor, rows),
            Self::Concept(_) | Self::Graph(_) => Err("invalid_request"),
        }
    }
}

enum ResultControl {
    Acknowledge {
        task_id: String,
        section: String,
        page_index: u64,
    },
}

fn exact_frame_fields(value: &Value, fields: &[&str]) -> bool {
    value.as_object().is_some_and(|object| {
        object.len() == fields.len() && fields.iter().all(|field| object.contains_key(*field))
    })
}

fn paginate_rows(
    section: &str,
    rows: Vec<Value>,
) -> Result<Vec<(PageDescriptor, Vec<Value>)>, &'static str> {
    let mut pages = Vec::new();
    let mut current = Vec::new();
    let mut bytes = 2usize;
    let mut nodes = 1usize;
    for row in rows {
        let row_bytes = synthesis_protocol::canonical_json(&row)?.len();
        let row_nodes = count_json_nodes(&row)?;
        if !current.is_empty()
            && (bytes + 1 + row_bytes > PAGE_MAX_BYTES || nodes + row_nodes > PAGE_MAX_JSON_NODES)
        {
            let descriptor = page_descriptor(section, pages.len() as u64, &current)
                .map_err(|_| "worker_result_invalid")?;
            pages.push((descriptor, std::mem::take(&mut current)));
            bytes = 2;
            nodes = 1;
        }
        if row_bytes + 2 > PAGE_MAX_BYTES || row_nodes + 1 > PAGE_MAX_JSON_NODES {
            return Err("worker_result_invalid");
        }
        bytes += if current.is_empty() {
            row_bytes
        } else {
            row_bytes + 1
        };
        nodes += row_nodes;
        current.push(row);
    }
    if !current.is_empty() || pages.is_empty() {
        let descriptor = page_descriptor(section, pages.len() as u64, &current)
            .map_err(|_| "worker_result_invalid")?;
        pages.push((descriptor, current));
    }
    Ok(pages)
}

fn write_paged_result(
    task_id: &str,
    operation: &str,
    request_hash: &str,
    result: Value,
    controls: &mpsc::Receiver<ResultControl>,
    canceled: &AtomicBool,
) -> Result<(), &'static str> {
    let parts = split_paged_result(operation, result)?;
    if canceled.load(Ordering::Relaxed) {
        return Err("worker_canceled");
    }
    write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":"result_begin","taskId":task_id,"operation":operation,"requestHash":request_hash,"header":parts.header})).map_err(|_| "worker_result_invalid")?;
    for (section_spec, rows) in parts.sections {
        let section = section_spec.name;
        for (descriptor, rows) in paginate_rows(section, rows)? {
            if canceled.load(Ordering::Relaxed) {
                return Err("worker_canceled");
            }
            let page_index = descriptor.page_index;
            let rows_json =
                canonical_json(&Value::Array(rows)).map_err(|_| "worker_result_invalid")?;
            write_raw_result_page(
                task_id,
                section,
                descriptor.page_index,
                &rows_json,
                descriptor.row_count,
                count_json_nodes_raw(&rows_json).map_err(|_| "worker_result_invalid")?,
                canceled,
            )?;
            loop {
                if canceled.load(Ordering::Relaxed) {
                    return Err("worker_canceled");
                }
                match controls.recv_timeout(std::time::Duration::from_millis(10)) {
                    Ok(ResultControl::Acknowledge {
                        task_id: acknowledged_task,
                        section: acknowledged_section,
                        page_index: acknowledged_page,
                    }) if acknowledged_task == task_id
                        && acknowledged_section == section
                        && acknowledged_page == page_index =>
                    {
                        break;
                    }
                    Ok(_) => return Err("worker_result_invalid"),
                    Err(mpsc::RecvTimeoutError::Timeout) => continue,
                    Err(mpsc::RecvTimeoutError::Disconnected) => return Err("worker_canceled"),
                }
            }
        }
    }
    if canceled.load(Ordering::Relaxed) {
        return Err("worker_canceled");
    }
    write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":"result_complete","taskId":task_id,"operation":operation,"requestHash":request_hash}))
        .map_err(|_| "worker_result_invalid")?;
    Ok(())
}

fn wait_for_result_ack(
    task_id: &str,
    section: &str,
    page_index: u64,
    controls: &mpsc::Receiver<ResultControl>,
    canceled: &AtomicBool,
) -> Result<(), &'static str> {
    loop {
        if canceled.load(Ordering::Relaxed) {
            return Err("worker_canceled");
        }
        match controls.recv_timeout(std::time::Duration::from_millis(10)) {
            Ok(ResultControl::Acknowledge {
                task_id: acknowledged_task,
                section: acknowledged_section,
                page_index: acknowledged_page,
            }) if acknowledged_task == task_id
                && acknowledged_section == section
                && acknowledged_page == page_index =>
            {
                return Ok(());
            }
            Ok(_) => return Err("worker_result_invalid"),
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => return Err("worker_canceled"),
        }
    }
}

fn write_raw_result_page(
    task_id: &str,
    section: &str,
    page_index: u64,
    rows_json: &str,
    row_count: usize,
    node_count: usize,
    canceled: &AtomicBool,
) -> Result<(), &'static str> {
    if canceled.load(Ordering::Relaxed) {
        return Err("worker_canceled");
    }
    let descriptor =
        raw_page_descriptor_with_node_count(section, page_index, rows_json, row_count, node_count)
            .map_err(|_| "worker_result_invalid")?;
    let mut frame = serde_json::to_vec(
        &json!({"protocol":WORKER_PROTOCOL,"type":"result_page","taskId":task_id,"descriptor":descriptor}),
    )
    .map_err(|_| "worker_result_invalid")?;
    if frame.pop() != Some(b'}') {
        return Err("worker_result_invalid");
    }
    let mut stdout = io::stdout().lock();
    stdout
        .write_all(&frame)
        .and_then(|_| stdout.write_all(b",\"rows\":"))
        .and_then(|_| stdout.write_all(rows_json.as_bytes()))
        .and_then(|_| stdout.write_all(b"}\n"))
        .and_then(|_| stdout.flush())
        .map_err(|_| "worker_result_invalid")?;
    Ok(())
}

struct EncodedResultPage {
    json: String,
    row_count: usize,
    node_count: usize,
}

fn next_typed_result_page<T: serde::Serialize>(
    rows: &[T],
    cursor: &mut usize,
    canceled: &AtomicBool,
) -> Result<Option<EncodedResultPage>, &'static str> {
    if canceled.load(Ordering::Relaxed) {
        return Err("worker_canceled");
    }
    if *cursor >= rows.len() {
        return Ok(None);
    }
    let start = *cursor;
    let mut end = (start + 4096).min(rows.len());
    let mut json = serde_json::to_string(&rows[start..end]).map_err(|_| "worker_result_invalid")?;
    let mut node_count = count_json_nodes_raw(&json).map_err(|_| "worker_result_invalid")?;
    while (json.len() > PAGE_MAX_BYTES || node_count > PAGE_MAX_JSON_NODES) && end - start > 1 {
        end = start + (end - start) / 2;
        json = serde_json::to_string(&rows[start..end]).map_err(|_| "worker_result_invalid")?;
        node_count = count_json_nodes_raw(&json).map_err(|_| "worker_result_invalid")?;
    }
    if json.len() > PAGE_MAX_BYTES || node_count > PAGE_MAX_JSON_NODES {
        return Err("worker_result_invalid");
    }
    *cursor = end;
    Ok(Some(EncodedResultPage {
        json,
        row_count: end - start,
        node_count,
    }))
}

fn write_typed_result_section<T: serde::Serialize>(
    task_id: &str,
    section: &str,
    rows: Vec<T>,
    controls: &mpsc::Receiver<ResultControl>,
    canceled: &AtomicBool,
) -> Result<(), &'static str> {
    let mut cursor = 0usize;
    let mut page_index = 0u64;
    let mut current =
        next_typed_result_page(&rows, &mut cursor, canceled)?.unwrap_or(EncodedResultPage {
            json: "[]".to_owned(),
            row_count: 0,
            node_count: 1,
        });
    loop {
        write_raw_result_page(
            task_id,
            section,
            page_index,
            &current.json,
            current.row_count,
            current.node_count,
            canceled,
        )?;
        let next = next_typed_result_page(&rows, &mut cursor, canceled)?;
        wait_for_result_ack(task_id, section, page_index, controls, canceled)?;
        let Some(page) = next else {
            break;
        };
        current = page;
        page_index += 1;
    }
    Ok(())
}

fn write_graph_paged_result(
    task_id: &str,
    operation: &str,
    request_hash: &str,
    result: synthesis_citation_graph_build::GraphResult,
    controls: &mpsc::Receiver<ResultControl>,
    canceled: &AtomicBool,
) -> Result<(), &'static str> {
    let parts = result.into_parts();
    write_frame(
        &json!({"protocol":WORKER_PROTOCOL,"type":"result_begin","taskId":task_id,"operation":operation,"requestHash":request_hash,"header":parts.header}),
    )
    .map_err(|_| "worker_result_invalid")?;
    for section in parts.sections {
        let name = section.name();
        match section {
            synthesis_citation_graph_build::GraphResultSection::Nodes(rows) => {
                write_typed_result_section(task_id, name, rows, controls, canceled)?;
            }
            synthesis_citation_graph_build::GraphResultSection::ResolvedEdges(rows) => {
                write_typed_result_section(task_id, name, rows, controls, canceled)?;
            }
            synthesis_citation_graph_build::GraphResultSection::AggregateEdges(rows) => {
                write_typed_result_section(task_id, name, rows, controls, canceled)?;
            }
            synthesis_citation_graph_build::GraphResultSection::SourceOwnership(rows) => {
                write_typed_result_section(task_id, name, rows, controls, canceled)?;
            }
            synthesis_citation_graph_build::GraphResultSection::IncomingGroups(rows) => {
                write_typed_result_section(task_id, name, rows, controls, canceled)?;
            }
            synthesis_citation_graph_build::GraphResultSection::LightMetrics(rows) => {
                write_typed_result_section(task_id, name, rows, controls, canceled)?;
            }
        }
    }
    write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":"result_complete","taskId":task_id,"operation":operation,"requestHash":request_hash}))
        .map_err(|_| "worker_result_invalid")
}

fn write_concept_paged_result(
    task_id: &str,
    request_hash: &str,
    result: synthesis_concept_kb::ConceptResult,
    controls: &mpsc::Receiver<ResultControl>,
    canceled: &AtomicBool,
) -> Result<(), &'static str> {
    let parts = result.into_parts();
    let operation = match parts.header.get("algorithmVersion").and_then(Value::as_str) {
        Some("concept-kb-index.v1") => synthesis_protocol::CONCEPT_KB_INDEX_OPERATION,
        Some("concept-kb-query.v1") => synthesis_protocol::CONCEPT_KB_QUERY_OPERATION,
        _ => return Err("worker_result_invalid"),
    };
    if canceled.load(Ordering::Relaxed) {
        return Err("worker_canceled");
    }
    write_frame(
        &json!({"protocol":WORKER_PROTOCOL,"type":"result_begin","taskId":task_id,"operation":operation,"requestHash":request_hash,"header":parts.header}),
    )
    .map_err(|_| "worker_result_invalid")?;
    for section in parts.sections {
        let name = section.name();
        match section {
            synthesis_concept_kb::ConceptResultSection::Search(rows) => {
                write_typed_result_section(task_id, name, rows, controls, canceled)?;
            }
            synthesis_concept_kb::ConceptResultSection::OverlayEntries(rows) => {
                write_typed_result_section(task_id, name, rows, controls, canceled)?;
            }
            synthesis_concept_kb::ConceptResultSection::Matches(rows) => {
                write_typed_result_section(task_id, name, rows, controls, canceled)?;
            }
        }
    }
    if canceled.load(Ordering::Relaxed) {
        return Err("worker_canceled");
    }
    write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":"result_complete","taskId":task_id,"operation":operation,"requestHash":request_hash}))
        .map_err(|_| "worker_result_invalid")
}

type ActiveWorkerTask = Arc<Mutex<Option<(String, Arc<AtomicBool>)>>>;

fn write_frame(value: &Value) -> io::Result<()> {
    let mut stdout = io::stdout().lock();
    serde_json::to_writer(&mut stdout, value)?;
    stdout.write_all(b"\n")?;
    stdout.flush()
}

pub(crate) fn worker() -> Result<(), String> {
    write_frame(&json!({"protocol": WORKER_PROTOCOL, "type": "ready", "buildFingerprint": WORKER_BUILD_FINGERPRINT})).map_err(|error| error.to_string())?;
    let (sender, receiver) = mpsc::sync_channel(1);
    let (control_sender, control_receiver) = mpsc::channel();
    let active: ActiveWorkerTask = Arc::new(Mutex::new(None));
    let reader_active = Arc::clone(&active);
    std::thread::spawn(move || {
        let stdin = io::stdin();
        let mut reader = BufReader::new(stdin.lock());
        let mut pending_input: Option<PendingInputAssembler> = None;
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
            if matches!(
                pending_input,
                Some(PendingInputAssembler::Concept(_) | PendingInputAssembler::Graph(_))
            ) && let Ok(frame) = DeterministicRawPageFrame::rebuild_input(&line)
            {
                let appended = match &mut pending_input {
                    Some(PendingInputAssembler::Concept(input)) => input
                        .append_raw_page(frame.task_id, frame.descriptor, frame.rows.get())
                        .map(|(section, page_index)| {
                            (frame.task_id.to_owned(), section, page_index)
                        }),
                    Some(PendingInputAssembler::Graph(input)) => input
                        .append_raw_page(frame.task_id, frame.descriptor, frame.rows.get())
                        .map(|(section, page_index)| {
                            (frame.task_id.to_owned(), section, page_index)
                        }),
                    _ => unreachable!(),
                };
                match appended {
                    Ok((task_id, section, page_index)) => {
                        let _ = write_frame(
                            &json!({"protocol":WORKER_PROTOCOL,"type":"input_ack","taskId":task_id,"section":section,"pageIndex":page_index}),
                        );
                        continue;
                    }
                    Err(_) => {
                        let _ = write_frame(
                            &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":frame.task_id,"code":"invalid_request"}),
                        );
                        break;
                    }
                }
            }
            let Ok(value) = serde_json::from_str::<Value>(&line) else {
                let _ = write_frame(
                    &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":"","code":"invalid_request"}),
                );
                break;
            };
            let task_id = value["taskId"].as_str().unwrap_or_default().to_owned();
            match value["type"].as_str() {
                Some("run")
                    if value["protocol"] == WORKER_PROTOCOL
                        && matches!(
                            value["operation"].as_str(),
                            Some(METRICS_OPERATION)
                                | Some(synthesis_protocol::CITATION_GRAPH_LAYOUT_OPERATION)
                                | Some(synthesis_protocol::CITATION_GRAPH_BUILD_OPERATION)
                        )
                        && exact_frame_fields(
                            &value,
                            &["protocol", "type", "taskId", "operation", "payload"],
                        ) =>
                {
                    let Some(operation) = value["operation"].as_str().map(str::to_owned) else {
                        continue;
                    };
                    if !value["payload"].is_object() {
                        let _ = write_frame(
                            &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"}),
                        );
                    } else if sender
                        .send(WorkerCommand::Run(
                            task_id,
                            operation,
                            None,
                            value["payload"].clone(),
                        ))
                        .is_err()
                    {
                        break;
                    }
                }
                Some("run")
                    if value["operation"]
                        .as_str()
                        .is_some_and(deterministic_operation) =>
                {
                    let _ = write_frame(
                        &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"}),
                    );
                }
                Some("run_begin") => {
                    if pending_input.is_some() {
                        let _ = write_frame(
                            &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"}),
                        );
                        break;
                    }
                    let Ok(frame) = DeterministicRunBegin::rebuild(value) else {
                        let _ = write_frame(
                            &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"}),
                        );
                        break;
                    };
                    let input = if matches!(
                        frame.operation.as_str(),
                        synthesis_protocol::CONCEPT_KB_INDEX_OPERATION
                            | synthesis_protocol::CONCEPT_KB_QUERY_OPERATION
                    ) {
                        synthesis_concept_kb::ConceptPagedInputAssembler::new(
                            frame.task_id.clone(),
                            frame.operation,
                            frame.request_hash,
                            frame.header,
                        )
                        .map(PendingInputAssembler::Concept)
                    } else if matches!(
                        frame.operation.as_str(),
                        synthesis_protocol::CITATION_GRAPH_BUILD_OPERATION
                            | synthesis_protocol::CITATION_GRAPH_BUILD_TRANSFER_OPERATION
                    ) {
                        synthesis_citation_graph_build::GraphPagedInputAssembler::new(
                            frame.task_id.clone(),
                            frame.operation,
                            frame.request_hash,
                            frame.header,
                        )
                        .map(PendingInputAssembler::Graph)
                    } else {
                        PagedInputAssembler::new(
                            frame.task_id.clone(),
                            frame.operation,
                            frame.request_hash,
                            frame.header,
                        )
                        .map(PendingInputAssembler::Generic)
                    };
                    match input {
                        Ok(input) => pending_input = Some(input),
                        Err(_) => {
                            let _ = write_frame(
                                &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":frame.task_id,"code":"invalid_request"}),
                            );
                            break;
                        }
                    }
                }
                Some("input_page") => {
                    let Some(pending) = pending_input.as_mut() else {
                        continue;
                    };
                    match DeterministicPageFrame::rebuild_input(value) {
                        Ok(frame) => {
                            match pending.append_page(&frame.task_id, frame.descriptor, frame.rows)
                            {
                                Ok((section, page_index)) => {
                                    let _ = write_frame(
                                        &json!({"protocol":WORKER_PROTOCOL,"type":"input_ack","taskId":frame.task_id,"section":section,"pageIndex":page_index}),
                                    );
                                }
                                Err(_) => {
                                    let _ = write_frame(
                                        &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":frame.task_id,"code":"invalid_request"}),
                                    );
                                    break;
                                }
                            }
                        }
                        Err(_) => {
                            let _ = write_frame(
                                &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"}),
                            );
                            break;
                        }
                    }
                }
                Some("input_complete") => {
                    let Some(pending) = pending_input.take() else {
                        continue;
                    };
                    let Ok(frame) = DeterministicTaskFrame::rebuild(value, "input_complete") else {
                        let _ = write_frame(
                            &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"}),
                        );
                        break;
                    };
                    let command = match pending {
                        PendingInputAssembler::Generic(input) => input.finish(&frame.task_id).map(
                            |(task_id, operation, request_hash, request)| {
                                WorkerCommand::Run(task_id, operation, Some(request_hash), request)
                            },
                        ),
                        PendingInputAssembler::Concept(input) => {
                            input
                                .finish(&frame.task_id)
                                .map(|(task_id, request_hash, request)| {
                                    WorkerCommand::RunConcept(task_id, request_hash, request)
                                })
                        }
                        PendingInputAssembler::Graph(input) => input.finish(&frame.task_id).map(
                            |(task_id, operation, request_hash, request)| {
                                WorkerCommand::RunGraph(task_id, operation, request_hash, request)
                            },
                        ),
                    };
                    match command {
                        Ok(command) => {
                            if sender.send(command).is_err() {
                                break;
                            }
                        }
                        Err(_) => {
                            let _ = write_frame(
                                &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"}),
                            );
                            break;
                        }
                    }
                }
                Some("result_ack") => {
                    let Ok(frame) = DeterministicAckFrame::rebuild_result(value) else {
                        let _ = write_frame(
                            &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"}),
                        );
                        break;
                    };
                    let _ = control_sender.send(ResultControl::Acknowledge {
                        task_id: frame.task_id,
                        section: frame.section,
                        page_index: frame.page_index,
                    });
                }
                Some("cancel") => {
                    let Ok(frame) = DeterministicTaskFrame::rebuild(value, "cancel") else {
                        let _ = write_frame(
                            &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"}),
                        );
                        break;
                    };
                    let task_id = frame.task_id;
                    if pending_input
                        .as_ref()
                        .is_some_and(|pending| pending.task_id() == task_id)
                    {
                        pending_input = None;
                        let _ = write_frame(
                            &json!({"protocol":WORKER_PROTOCOL,"type":"canceled","taskId":task_id,"code":"worker_canceled"}),
                        );
                        continue;
                    }
                    if let Some((current, flag)) = &*reader_active.lock().unwrap()
                        && current == &task_id
                    {
                        flag.store(true, Ordering::Relaxed);
                    }
                }
                _ => {
                    let _ = write_frame(
                        &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":task_id,"code":"invalid_request"}),
                    );
                    break;
                }
            }
        }
        if let Some((_, flag)) = &*reader_active.lock().unwrap() {
            flag.store(true, Ordering::Relaxed);
        }
        let _ = sender.send(WorkerCommand::End);
    });
    while let Ok(command) = receiver.recv() {
        match command {
            WorkerCommand::Run(task_id, operation, request_hash, request) => {
                let canceled = Arc::new(AtomicBool::new(false));
                *active.lock().unwrap() = Some((task_id.clone(), Arc::clone(&canceled)));
                let computed = match operation.as_str() {
                    synthesis_protocol::CITATION_GRAPH_LAYOUT_OPERATION => {
                        synthesis_citation_layout::compute_value(request, &canceled)
                    }
                    METRICS_OPERATION => serde_json::from_value(request)
                        .map_err(|_| "invalid_request")
                        .and_then(|request| {
                            synthesis_metrics::compute(request, &canceled)
                                .map(|result| serde_json::to_value(result).unwrap())
                        }),
                    synthesis_protocol::TAG_VOCABULARY_VALIDATE_OPERATION
                    | synthesis_protocol::TAG_VOCABULARY_INDEX_OPERATION => {
                        synthesis_tag_vocabulary::compute(&operation, request, &canceled)
                    }
                    synthesis_protocol::TOPIC_GRAPH_INDEX_OPERATION => {
                        synthesis_topic_graph::compute(request, &canceled)
                    }
                    synthesis_protocol::REFERENCE_BINDING_OPERATION
                    | synthesis_protocol::REFERENCE_CANONICAL_DEDUPE_OPERATION => {
                        synthesis_reference_matcher::compute(&operation, request, &canceled)
                    }
                    synthesis_protocol::TOPIC_MANIFEST_VALIDATE_OPERATION
                    | synthesis_protocol::TOPIC_ARTIFACT_ASSEMBLE_OPERATION
                    | synthesis_protocol::TOPIC_ARTIFACT_VALIDATE_OPERATION
                    | synthesis_protocol::TOPIC_SECTION_PATCH_OPERATION => {
                        synthesis_topic_structured_artifact::compute(&operation, request, &canceled)
                    }
                    synthesis_protocol::CITATION_GRAPH_BUILD_OPERATION
                    | synthesis_protocol::CITATION_GRAPH_BUILD_TRANSFER_OPERATION => {
                        synthesis_citation_graph_build::compute(request, &canceled)
                    }
                    _ => Err("invalid_request"),
                };
                if deterministic_operation(&operation)
                    && let Some(request_hash) = request_hash.as_deref()
                {
                    let outcome = computed.and_then(|result| {
                        write_paged_result(
                            &task_id,
                            &operation,
                            request_hash,
                            result,
                            &control_receiver,
                            &canceled,
                        )
                    });
                    *active.lock().unwrap() = None;
                    if let Err(code) = outcome {
                        let frame_type = if code == "worker_canceled" {
                            "canceled"
                        } else {
                            "error"
                        };
                        write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":frame_type,"taskId":task_id,"code":code})).map_err(|error| error.to_string())?;
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
            WorkerCommand::RunConcept(task_id, request_hash, request) => {
                let canceled = Arc::new(AtomicBool::new(false));
                *active.lock().unwrap() = Some((task_id.clone(), Arc::clone(&canceled)));
                let outcome =
                    synthesis_concept_kb::compute_typed(request, &canceled).and_then(|result| {
                        write_concept_paged_result(
                            &task_id,
                            &request_hash,
                            result,
                            &control_receiver,
                            &canceled,
                        )
                    });
                *active.lock().unwrap() = None;
                if let Err(code) = outcome {
                    let frame_type = if code == "worker_canceled" {
                        "canceled"
                    } else {
                        "error"
                    };
                    write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":frame_type,"taskId":task_id,"code":code})).map_err(|error| error.to_string())?;
                }
            }
            WorkerCommand::RunGraph(task_id, operation, request_hash, request) => {
                let canceled = Arc::new(AtomicBool::new(false));
                *active.lock().unwrap() = Some((task_id.clone(), Arc::clone(&canceled)));
                let outcome = synthesis_citation_graph_build::compute_typed(request, &canceled)
                    .and_then(|result| {
                        write_graph_paged_result(
                            &task_id,
                            &operation,
                            &request_hash,
                            result,
                            &control_receiver,
                            &canceled,
                        )
                    });
                *active.lock().unwrap() = None;
                if let Err(code) = outcome {
                    let frame_type = if code == "worker_canceled" {
                        "canceled"
                    } else {
                        "error"
                    };
                    write_frame(&json!({"protocol":WORKER_PROTOCOL,"type":frame_type,"taskId":task_id,"code":code})).map_err(|error| error.to_string())?;
                }
            }
            WorkerCommand::End => break,
        }
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CallEnvelope {
    protocol: String,
    request_id: String,
    profile_id: String,
    capability: String,
    payload: Value,
}

struct ServeState {
    config: NativeLaunchConfig,
    service_instance_id: String,
    profile: String,
    repository_id: String,
    repository: Arc<Mutex<Repository>>,
    workbench: WorkbenchApplication,
    canonical: CanonicalStorePort,
    stopping: Arc<AtomicBool>,
    compute_pool: NativeComputePool,
    transfer: Mutex<NativeTransferOwner>,
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
        "mode":"isolated_shadow",
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

fn handle_connection(mut stream: TcpStream, state: Arc<ServeState>) -> Result<(), String> {
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
        return response(
            &mut stream,
            200,
            json!({
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
            }),
        );
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
    let expected_token = if call.capability == "system.shutdown" {
        &state.config.lifecycle_token
    } else {
        &state.config.client_token
    };
    if bearer != *expected_token {
        return response(
            &mut stream,
            401,
            error_response(if call.capability == "system.shutdown" {
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
        capability @ ("compute.citation_graph_layout"
        | "compute.citation_graph_metrics"
        | "compute.citation_graph_build") => {
            let _admission = match state.compute_pool.admit(&state.stopping) {
                Ok(admission) => admission,
                Err(code) => return response(&mut stream, 503, error_response(code)),
            };
            let operation = match capability {
                "compute.citation_graph_layout" => {
                    synthesis_protocol::CITATION_GRAPH_LAYOUT_OPERATION
                }
                "compute.citation_graph_build" => {
                    synthesis_protocol::CITATION_GRAPH_BUILD_OPERATION
                }
                _ => METRICS_OPERATION,
            };
            if let Ok(delay) = std::env::var("SYNTHESIS_R7_FAULT_COMPUTE_HOLD_MS")
                && let Ok(delay) = delay.parse::<u64>()
            {
                thread::sleep(Duration::from_millis(delay.min(2_000)));
            }
            match worker_call(operation, call.payload) {
                Ok(data) => {
                    state.compute_pool.record_success();
                    response(
                        &mut stream,
                        200,
                        call_response(&call.request_id, &state.service_instance_id, data),
                    )
                }
                Err(code) => {
                    if code != "invalid_request" && code != "worker_canceled" {
                        state.compute_pool.record_failure();
                    }
                    response(
                        &mut stream,
                        if code == "invalid_request" { 400 } else { 503 },
                        error_response(&code),
                    )
                }
            }
        }
        "compute.citation_graph_build_transfer" => {
            let result = state
                .transfer
                .lock()
                .map_err(|_| "transfer_unavailable".to_owned())?
                .handle(call.payload, current_time_ms()?);
            match result {
                Ok(data) => bounded_response(
                    &mut stream,
                    200,
                    call_response(&call.request_id, &state.service_instance_id, data),
                    MAX_READ_RESPONSE_BYTES * 8,
                ),
                Err(code) => {
                    let status = match code {
                        "transfer_busy" => 429,
                        "transfer_not_found" => 404,
                        "transfer_conflict"
                        | "transfer_incomplete"
                        | "transfer_output_not_ready" => 409,
                        "transfer_limit_exceeded" => 413,
                        "transfer_stopping" => 503,
                        _ => 400,
                    };
                    response(&mut stream, status, error_response(code))
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
            bounded_response(
                &mut stream,
                200,
                call_response(
                    &call.request_id,
                    &state.service_instance_id,
                    json!({
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
                        "mutationEnabled":false,
                        "lifecycleState":"ready",
                        "repository":repository_snapshot(&state),
                        "canonicalStore":canonical_snapshot(&state)?,
                        "computePool":compute_pool_snapshot(&state)?,
                        "citationGraphTransfer":transfer_snapshot(&state)?,
                    }),
                ),
                MAX_READ_RESPONSE_BYTES,
            )
        }
        "workbench.chrome.read" => {
            if !exact_payload(&call.payload, &["state"]) || !call.payload["state"].is_object() {
                return response(&mut stream, 400, error_response("invalid_request"));
            }
            let data = state.workbench.read_json()?;
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

pub(crate) fn serve(config_path: &str) -> Result<(), String> {
    let config = read_native_launch_config(Path::new(config_path))?;
    let lease_path = Path::new(config_path)
        .parent()
        .ok_or_else(|| "invalid_config".to_owned())?
        .join("lease.json");
    validate_host_lease(&lease_path, &config)?;
    let ownership = RuntimeOwnership::acquire(&config)?;
    let repository = Repository::open(
        &config.profile_runtime_root,
        RepositoryIdentity {
            profile_id: config.profile_id.clone(),
            data_root_id: config.data_root_id.clone(),
        },
    )?;
    let canonical = CanonicalStore::open(
        &config.profile_runtime_root,
        CanonicalIdentity {
            profile_id: config.profile_id.clone(),
            data_root_id: config.data_root_id.clone(),
        },
    )?;
    let repository_id = repository.repository_id().to_owned();
    let repository = Arc::new(Mutex::new(repository));
    let canonical = Arc::new(Mutex::new(canonical));
    let repository_port = RepositoryPort::new(Arc::clone(&repository));
    let canonical_port = CanonicalStorePort::new(Arc::clone(&canonical));
    let workbench = WorkbenchApplication::new(Arc::new(repository_port));
    let stopping = Arc::new(AtomicBool::new(false));
    let state = Arc::new(ServeState {
        service_instance_id: ownership.service_instance_id.clone(),
        profile: config.profile_id.clone(),
        config,
        repository_id,
        repository,
        workbench,
        canonical: canonical_port,
        stopping: Arc::clone(&stopping),
        compute_pool: NativeComputePool::new(),
        transfer: Mutex::new(NativeTransferOwner::default()),
    });
    drop(canonical);
    let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|error| error.to_string())?;
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;
    let port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();
    ownership.publish_discovery(&json!({
        "schema":"synthesis-sidecar-discovery.v2",
        "profileId":state.config.profile_id,
        "supervisorInstanceId":state.config.supervisor_instance_id,
        "serviceInstanceId":state.service_instance_id,
        "bundleId":state.config.bundle_id,
        "implementation":state.config.implementation,
        "target":state.config.target,
        "targetTriple":state.config.target_triple,
        "buildFingerprint":state.config.build_fingerprint,
        "platformSignature":state.config.platform_signature,
        "serviceVersion":state.config.service_version,
        "protocolVersion":state.config.protocol_version,
        "schemaVersion":state.config.schema_version,
        "runtimeRootId":state.config.runtime_root_id,
        "dataRootId":state.config.data_root_id,
        "host":"127.0.0.1",
        "port":port,
        "pid":std::process::id(),
        "lifecycleState":"ready",
        "tokenLocator":"supervisor-session",
        "capabilities":SIDECAR_CAPABILITIES,
    }))?;
    println!(
        "{}",
        json!({"type":"listening","port":port,"buildFingerprint":state.config.build_fingerprint})
    );
    let stdin_stopping = Arc::clone(&stopping);
    thread::spawn(move || {
        let mut buffer = [0_u8; 1];
        while io::stdin().read(&mut buffer).is_ok_and(|size| size > 0) {}
        stdin_stopping.store(true, Ordering::Release);
    });
    let mut handlers = Vec::new();
    let mut next_lease_check_ms = current_time_ms()?.saturating_add(15_000);
    while !state.stopping.load(Ordering::Acquire) {
        let now_ms = current_time_ms()?;
        if now_ms >= next_lease_check_ms {
            if validate_host_lease(&lease_path, &state.config).is_err() {
                state.stopping.store(true, Ordering::Release);
                continue;
            }
            next_lease_check_ms = now_ms.saturating_add(15_000);
        }
        match listener.accept() {
            Ok((stream, _)) => {
                let state = Arc::clone(&state);
                handlers.push(thread::spawn(move || {
                    let _ = handle_connection(stream, state);
                }));
            }
            Err(error) if error.kind() == io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(5));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
    drop(listener);
    let mut cleanup_errors = Vec::new();
    state.compute_pool.stop();
    for handler in handlers {
        if handler.join().is_err() {
            cleanup_errors.push("http_handler_panicked".to_owned());
        }
    }
    match state.transfer.lock() {
        Ok(mut transfer) => transfer.stop(),
        Err(_) => cleanup_errors.push("transfer_owner_unavailable".to_owned()),
    }
    match Arc::try_unwrap(state) {
        Ok(state) => {
            let repository = Arc::clone(&state.repository);
            let canonical = state.canonical.owner();
            drop(state);
            match Arc::try_unwrap(canonical) {
                Ok(canonical) => match canonical.into_inner() {
                    Ok(canonical) => {
                        if let Err(error) = canonical.close() {
                            cleanup_errors.push(error);
                        }
                    }
                    Err(_) => cleanup_errors.push("canonical_store_unavailable".to_owned()),
                },
                Err(_) => cleanup_errors.push("canonical_store_owner_leaked".to_owned()),
            }
            match Arc::try_unwrap(repository) {
                Ok(repository) => match repository.into_inner() {
                    Ok(repository) => {
                        if let Err(error) = repository.close() {
                            cleanup_errors.push(error);
                        }
                    }
                    Err(_) => cleanup_errors.push("repository_unavailable".to_owned()),
                },
                Err(_) => cleanup_errors.push("repository_owner_leaked".to_owned()),
            }
        }
        Err(_) => cleanup_errors.push("service_owner_leaked".to_owned()),
    }
    drop(ownership);
    if cleanup_errors.is_empty() {
        Ok(())
    } else {
        Err(format!("shutdown_incomplete:{}", cleanup_errors.join(",")))
    }
}

#[cfg(test)]
mod service_tests {
    use super::*;

    #[test]
    fn native_compute_pool_bounds_queue_and_fuses_failures() {
        let pool = Arc::new(NativeComputePool::new());
        let stopping = Arc::new(AtomicBool::new(false));
        let active = pool.admit(&stopping).expect("active admission");
        let mut waiting = Vec::new();
        for _ in 0..2 {
            let pool = Arc::clone(&pool);
            let stopping = Arc::clone(&stopping);
            waiting.push(thread::spawn(move || {
                let _admission = pool.admit(&stopping).expect("queued admission");
            }));
        }
        for _ in 0..100 {
            if pool.snapshot(false).expect("snapshot")["queued"].as_u64() == Some(2) {
                break;
            }
            thread::sleep(Duration::from_millis(1));
        }
        assert_eq!(
            pool.admit(&stopping).err(),
            Some("worker_busy"),
            "third queued task must fail immediately"
        );
        drop(active);
        for waiter in waiting {
            waiter.join().expect("queued task");
        }
        for _ in 0..3 {
            pool.record_failure();
        }
        assert_eq!(
            pool.admit(&stopping).err(),
            Some("worker_unavailable"),
            "three consecutive runtime failures fuse compute"
        );
        assert_eq!(pool.snapshot(false).expect("snapshot")["state"], "degraded");
    }
}
