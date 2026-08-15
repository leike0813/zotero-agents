use serde_json::{Value, json};
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};

#[test]
fn production_worker_executable_serves_the_framed_metrics_route() {
    let mut child = Command::new(env!("CARGO_BIN_EXE_synthesis-sidecar"))
        .arg("worker")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("spawn production worker");
    let mut input = child.stdin.take().expect("worker input");
    let mut output = BufReader::new(child.stdout.take().expect("worker output"));

    let mut line = String::new();
    output.read_line(&mut line).expect("worker ready frame");
    let ready: Value = serde_json::from_str(&line).expect("ready json");
    assert_eq!(ready["protocol"], "synthesis-rust-worker.v1");
    assert_eq!(ready["type"], "ready");

    let graph_hash = format!("sha256:{}", "0".repeat(64));
    writeln!(
        input,
        "{}",
        json!({
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
        })
    )
    .and_then(|_| input.flush())
    .expect("send metrics frame");

    line.clear();
    output.read_line(&mut line).expect("worker result frame");
    let result: Value = serde_json::from_str(&line).expect("result json");
    assert_eq!(result["type"], "result");
    assert_eq!(result["taskId"], "metrics-1");
    assert_eq!(result["result"]["graphHash"], graph_hash);

    drop(input);
    assert!(child.wait().expect("worker exit").success());
}
