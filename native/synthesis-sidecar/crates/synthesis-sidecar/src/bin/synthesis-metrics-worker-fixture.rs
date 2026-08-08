use serde_json::{Value, json};
use std::io::{self, BufRead, Write};

const PROTOCOL: &str = "synthesis-rust-worker.v1";

fn write_frame(value: &Value) -> io::Result<()> {
    let mut stdout = io::stdout().lock();
    serde_json::to_writer(&mut stdout, value)?;
    stdout.write_all(b"\n")?;
    stdout.flush()
}

fn main() -> io::Result<()> {
    write_frame(&json!({
        "protocol": PROTOCOL,
        "type": "ready",
        "buildFingerprint": "test-fixture"
    }))?;

    for line in io::stdin().lock().lines() {
        let value: Value = match serde_json::from_str(&line?) {
            Ok(value) => value,
            Err(_) => continue,
        };
        if value["protocol"] != PROTOCOL || value["type"] != "run" {
            continue;
        }
        let task_id = value["taskId"].as_str().unwrap_or_default();
        let graph_hash = value["payload"]["graphHash"].as_str().unwrap_or_default();
        let mode = graph_hash
            .strip_prefix("sha256:")
            .and_then(|suffix| suffix.chars().next())
            .unwrap_or('0');
        match mode {
            '0' => write_frame(&json!({
                "protocol": PROTOCOL,
                "type": "result",
                "taskId": task_id,
                "result": {
                    "graphHash":graph_hash,
                    "metricsVersion":2,
                    "params":{
                        "pagerankDamping":0.85,
                        "pagerankIterations":50,
                        "foundationFormula":"fixture",
                        "frontierFormula":"fixture"
                    },
                    "graphYear":null,
                    "libraryNodeMetrics":[],
                    "diagnostics":{
                        "libraryNodeCount":0,
                        "externalReferenceCount":0,
                        "unresolvedReferenceCount":0,
                        "componentCount":0,
                        "isolatedLibraryNodeCount":0,
                        "missingYearCount":0
                    }
                }
            }))?,
            'a' => loop {
                std::hint::spin_loop();
            },
            'b' => std::process::exit(17),
            'd' => panic!("fixture worker panic with private detail"),
            'c' => write_frame(&json!({
                "protocol": PROTOCOL,
                "type": "result",
                "taskId": task_id,
                "result": {}
            }))?,
            _ => write_frame(&json!({
                "protocol": PROTOCOL,
                "type": "error",
                "taskId": task_id,
                "code": "fixture_unconfigured"
            }))?,
        }
    }
    Ok(())
}
