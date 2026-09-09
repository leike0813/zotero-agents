use serde_json::{Map, Value, json};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use synthesis_protocol::{
    PageDescriptor, REFERENCE_BINDING_OPERATION, REFERENCE_CANONICAL_DEDUPE_OPERATION,
    WORKER_PROTOCOL, page_descriptor, paged_request_hash,
};

struct WorkerProcess {
    child: Child,
    input: ChildStdin,
    output: BufReader<ChildStdout>,
}

impl WorkerProcess {
    fn spawn() -> Self {
        let mut child = Command::new(env!("CARGO_BIN_EXE_synthesis-sidecar"))
            .arg("worker")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .expect("spawn production worker");
        let input = child.stdin.take().expect("worker input");
        let mut output = BufReader::new(child.stdout.take().expect("worker output"));
        let ready = recv_frame(&mut output);
        assert_eq!(ready["protocol"], "synthesis-rust-worker.v1");
        assert_eq!(ready["type"], "ready");
        Self {
            child,
            input,
            output,
        }
    }

    fn send(&mut self, frame: Value) {
        writeln!(self.input, "{frame}")
            .and_then(|_| self.input.flush())
            .expect("send worker frame");
    }

    fn recv(&mut self) -> Value {
        recv_frame(&mut self.output)
    }

    fn stop(mut self) {
        drop(self.input);
        assert!(self.child.wait().expect("worker exit").success());
    }
}

fn recv_frame(output: &mut BufReader<ChildStdout>) -> Value {
    let mut line = String::new();
    output.read_line(&mut line).expect("worker frame");
    serde_json::from_str(&line).expect("worker frame json")
}

/// Drives one deterministic operation through the real paged worker protocol:
/// run_begin, per-section input_page frames (each section may span multiple
/// pages), input_complete, then result_begin/result_page/result_complete
/// reassembly with per-page acknowledgement and descriptor validation.
fn run_paged_operation(
    worker: &mut WorkerProcess,
    task_id: &str,
    operation: &str,
    header: Map<String, Value>,
    sections: Vec<(&str, Vec<Vec<Value>>)>,
) -> Value {
    let mut descriptors = Vec::new();
    for (section, pages) in &sections {
        for (page_index, rows) in pages.iter().enumerate() {
            descriptors.push(
                page_descriptor(section, page_index as u64, rows).expect("input page descriptor"),
            );
        }
    }
    let request_hash =
        paged_request_hash(operation, &header, &descriptors).expect("paged request hash");
    worker.send(json!({
        "protocol":WORKER_PROTOCOL,
        "type":"run_begin",
        "taskId":task_id,
        "operation":operation,
        "requestHash":request_hash,
        "header":Value::Object(header),
    }));
    let mut cursor = 0;
    for (section, pages) in &sections {
        for (page_index, rows) in pages.iter().enumerate() {
            worker.send(json!({
                "protocol":WORKER_PROTOCOL,
                "type":"input_page",
                "taskId":task_id,
                "descriptor":descriptors[cursor],
                "rows":rows,
            }));
            cursor += 1;
            let ack = worker.recv();
            assert_eq!(ack["type"], "input_ack");
            assert_eq!(ack["taskId"], task_id);
            assert_eq!(ack["section"], *section);
            assert_eq!(ack["pageIndex"], page_index as u64);
        }
    }
    worker.send(json!({
        "protocol":WORKER_PROTOCOL,
        "type":"input_complete",
        "taskId":task_id,
    }));
    let begin = worker.recv();
    assert_eq!(begin["type"], "result_begin");
    assert_eq!(begin["taskId"], task_id);
    assert_eq!(begin["operation"], operation);
    assert_eq!(begin["requestHash"], request_hash);
    let mut result = begin["header"]
        .as_object()
        .cloned()
        .expect("result begin header");
    loop {
        let frame = worker.recv();
        assert_eq!(frame["taskId"], task_id);
        match frame["type"].as_str() {
            Some("result_page") => {
                let descriptor: PageDescriptor =
                    serde_json::from_value(frame["descriptor"].clone())
                        .expect("result page descriptor");
                let rows = frame["rows"].as_array().cloned().expect("result page rows");
                assert_eq!(
                    page_descriptor(&descriptor.section, descriptor.page_index, &rows).as_ref(),
                    Ok(&descriptor),
                    "result page descriptor must match its rows"
                );
                worker.send(json!({
                    "protocol":WORKER_PROTOCOL,
                    "type":"result_ack",
                    "taskId":task_id,
                    "section":descriptor.section,
                    "pageIndex":descriptor.page_index,
                }));
                result
                    .entry(descriptor.section)
                    .or_insert_with(|| Value::Array(Vec::new()))
                    .as_array_mut()
                    .expect("result section rows")
                    .extend(rows);
            }
            Some("result_complete") => {
                assert_eq!(frame["operation"], operation);
                assert_eq!(frame["requestHash"], request_hash);
                return Value::Object(result);
            }
            other => panic!("unexpected worker frame: {other:?}"),
        }
    }
}

#[test]
fn production_worker_executable_serves_the_framed_metrics_route() {
    let mut worker = WorkerProcess::spawn();

    let graph_hash = format!("sha256:{}", "0".repeat(64));
    worker.send(json!({
        "protocol":"synthesis-rust-worker.v1",
        "type":"run",
        "taskId":"metrics-1",
        "operation":"citation_graph_metrics.v1",
        "payload":{
            "graphHash":graph_hash,
            "nodes":[{
                "nodeId":"1:AAAA1111",
                "kind":"library_paper",
                "libraryId":1,
                "itemKey":"AAAA1111",
                "title":"Paper A",
                "year":"2024"
            }],
            "edges":[]
        }
    }));
    let result = worker.recv();
    assert_eq!(result["type"], "result");
    assert_eq!(result["taskId"], "metrics-1");
    assert_eq!(result["result"]["graphHash"], graph_hash);

    worker.stop();
}

fn binding_paper(paper_ref: &str, item_key: &str, title: &str, year: &str, doi: &str) -> Value {
    json!({
        "paperRef":paper_ref,
        "itemKey":item_key,
        "title":title,
        "year":year,
        "authors":["Alpha"],
        "doi":doi,
    })
}

fn binding_reference(
    canonical_id: &str,
    instance_id: &str,
    title: &str,
    year: &str,
    doi: &str,
) -> Value {
    json!({
        "canonicalReferenceId":canonical_id,
        "reference":{
            "referenceInstanceId":instance_id,
            "parsedTitle":title,
            "normalizedTitle":title.to_lowercase(),
            "year":year,
            "authors":["Alpha"],
            "rawReference":format!("doi:{doi}"),
        }
    })
}

#[test]
fn reference_operations_use_the_real_paged_worker_protocol() {
    let mut worker = WorkerProcess::spawn();

    let binding = run_paged_operation(
        &mut worker,
        "binding-1",
        REFERENCE_BINDING_OPERATION,
        Map::from_iter([
            (
                "contractVersion".to_owned(),
                json!("synthesis-reference-matcher.v1"),
            ),
            ("algorithmVersion".to_owned(), json!("reference-binding.v1")),
            ("policyId".to_owned(), json!("production")),
        ]),
        vec![
            (
                "papers",
                vec![vec![
                    binding_paper(
                        "1:AAAA",
                        "AAAA",
                        "Exact Target Work",
                        "2024",
                        "10.1000/exact",
                    ),
                    binding_paper(
                        "1:BBBB",
                        "BBBB",
                        "Another Distinct Study",
                        "2023",
                        "10.1000/other",
                    ),
                ]],
            ),
            (
                "references",
                vec![
                    vec![binding_reference(
                        "canonical:1",
                        "raw:1",
                        "Exact Target Work",
                        "2024",
                        "10.1000/exact",
                    )],
                    vec![binding_reference(
                        "canonical:2",
                        "raw:2",
                        "Another Distinct Study",
                        "2023",
                        "10.1000/other",
                    )],
                ],
            ),
        ],
    );
    let matches = binding["matches"].as_array().expect("binding matches");
    let mut targets = matches
        .iter()
        .map(|entry| {
            entry["result"]["targetPaperRef"]
                .as_str()
                .expect("bound target")
                .to_owned()
        })
        .collect::<Vec<_>>();
    targets.sort();
    assert_eq!(targets, vec!["1:AAAA".to_owned(), "1:BBBB".to_owned()]);

    let canonical = |canonical_id: &str, raw_id: &str, raw_hash: &str| {
        json!({
            "canonicalReferenceId":canonical_id,
            "title":"Exact Target Work",
            "normalizedTitle":"exact target work",
            "year":"2024",
            "authors":["Alpha"],
            "identifiers":[{"kind":"doi","value":"10.1000/exact"}],
            "rawReferenceIds":[raw_id],
            "rawHashes":[raw_hash],
            "rawReferences":["Exact Target Work"],
            "sourceRefs":["1:SOURCE"],
            "acceptedBinding":false,
            "stickyRepresentative":false,
            "titleCandidates":[]
        })
    };
    let dedupe = run_paged_operation(
        &mut worker,
        "dedupe-1",
        REFERENCE_CANONICAL_DEDUPE_OPERATION,
        Map::from_iter([
            (
                "contractVersion".to_owned(),
                json!("synthesis-reference-matcher.v1"),
            ),
            (
                "algorithmVersion".to_owned(),
                json!("canonical-cluster-dedupe.v1"),
            ),
        ]),
        vec![(
            "canonicals",
            vec![
                vec![canonical("canonical:1", "raw:1", "sha256:raw-1")],
                vec![canonical("canonical:2", "raw:2", "sha256:raw-2")],
            ],
        )],
    );
    assert_eq!(dedupe["actions"].as_array().map(Vec::len), Some(1));

    worker.stop();
}
