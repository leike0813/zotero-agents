use serde_json::{Value, json};
use std::io::{self, BufRead, BufReader, Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, mpsc};
use synthesis_protocol::{
    DeterministicAckFrame, DeterministicPageFrame, DeterministicRawPageFrame,
    DeterministicRunBegin, DeterministicTaskFrame, METRICS_OPERATION, PAGE_MAX_BYTES,
    PAGE_MAX_JSON_NODES, PageDescriptor, PagedInputAssembler, WORKER_PROTOCOL, canonical_json,
    count_json_nodes, count_json_nodes_raw, deterministic_operation, page_descriptor,
    raw_page_descriptor_with_node_count, split_paged_result,
};

use crate::runtime_worker_pool::WorkerOperation;

const WORKER_BUILD_FINGERPRINT: &str = match option_env!("SYNTHESIS_RUST_BUILD_FINGERPRINT") {
    Some(value) => value,
    None => "development",
};
const MAX_WORKER_FRAME_BYTES: u64 = 8 * 1024 * 1024;

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
                    if WorkerOperation::from_protocol_name(&frame.operation).is_err() {
                        let _ = write_frame(
                            &json!({"protocol":WORKER_PROTOCOL,"type":"error","taskId":frame.task_id,"code":"invalid_request"}),
                        );
                        break;
                    }
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
                    synthesis_protocol::CONCEPT_KB_INDEX_OPERATION
                    | synthesis_protocol::CONCEPT_KB_QUERY_OPERATION => {
                        synthesis_concept_kb::compute(&operation, request, &canceled)
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
