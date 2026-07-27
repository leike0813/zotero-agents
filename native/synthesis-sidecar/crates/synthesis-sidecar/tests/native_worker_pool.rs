#![allow(dead_code)]

#[path = "../src/runtime_deadline.rs"]
mod runtime_deadline;

#[path = "../src/runtime_worker_pool.rs"]
mod runtime_worker_pool;

use runtime_worker_pool::{NativeComputePool, WorkerOperation};
use serde_json::json;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;

fn request(mode: char) -> serde_json::Value {
    json!({"graphHash":format!("sha256:{mode}{}", "0".repeat(63))})
}

#[test]
fn reuses_a_successful_child_and_fuses_three_crashes() {
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_synthesis-metrics-worker-fixture"));
    let pool = Arc::new(NativeComputePool::new_with_executable(executable));
    let stopping = AtomicBool::new(false);

    let admission = pool.admit(&stopping).expect("first admission");
    assert_eq!(
        pool.run_direct(WorkerOperation::CitationGraphMetrics, request('0'))
            .expect("first result")["graphHash"],
        request('0')["graphHash"]
    );
    let child_id = pool.child_id().expect("persistent child");
    drop(admission);

    let admission = pool.admit(&stopping).expect("second admission");
    pool.run_direct(WorkerOperation::CitationGraphMetrics, request('0'))
        .expect("second result");
    assert_eq!(pool.child_id(), Some(child_id));
    drop(admission);

    let admission = pool.admit(&stopping).expect("invalid-result admission");
    assert_eq!(
        pool.run_direct(WorkerOperation::CitationGraphMetrics, request('c'))
            .expect_err("invalid worker result"),
        "worker_result_invalid"
    );
    drop(admission);
    assert_eq!(pool.snapshot(false).expect("snapshot")["restartCount"], 1);

    let admission = pool.admit(&stopping).expect("replacement admission");
    pool.run_direct(WorkerOperation::CitationGraphMetrics, request('0'))
        .expect("replacement result");
    assert_ne!(pool.child_id(), Some(child_id));
    drop(admission);

    for expected_failures in 1..=3 {
        let admission = pool.admit(&stopping).expect("fault admission");
        assert_eq!(
            pool.run_direct(WorkerOperation::CitationGraphMetrics, request('b'))
                .expect_err("worker crash"),
            "worker_crashed"
        );
        drop(admission);
        assert_eq!(
            pool.snapshot(false).expect("snapshot")["failureCount"],
            expected_failures
        );
    }
    assert_eq!(
        pool.admit(&stopping).err(),
        Some("worker_unavailable"),
        "three consecutive child crashes open the fuse"
    );
    assert_eq!(pool.snapshot(false).expect("snapshot")["restartCount"], 4);
}
