#![allow(dead_code)]

#[path = "../src/runtime_deadline.rs"]
mod runtime_deadline;

#[path = "../src/runtime_diagnostics.rs"]
mod runtime_diagnostics;

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

#[test]
fn reports_a_stable_code_when_the_worker_panics() {
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_synthesis-metrics-worker-fixture"));
    let pool = Arc::new(NativeComputePool::new_with_executable(executable));
    let stopping = AtomicBool::new(false);
    let admission = pool.admit(&stopping).expect("panic admission");

    assert_eq!(
        pool.run_direct(WorkerOperation::CitationGraphMetrics, request('d'))
            .expect_err("worker panic"),
        "worker_panicked"
    );
    drop(admission);
    assert_eq!(pool.snapshot(false).expect("snapshot")["restartCount"], 1);
}

#[test]
fn reference_matcher_uses_the_real_paged_worker_protocol() {
    let executable = PathBuf::from(env!("CARGO_BIN_EXE_synthesis-sidecar"));
    let pool = Arc::new(NativeComputePool::new_with_executable(executable));
    let stopping = AtomicBool::new(false);
    let admission = pool.admit(&stopping).expect("worker admission");

    let binding = pool
        .run_direct(
            WorkerOperation::ReferenceBinding,
            json!({
                "contractVersion":"synthesis-reference-matcher.v1",
                "algorithmVersion":"reference-binding.v1",
                "policyId":"production",
                "papers":[{
                    "paperRef":"1:TARGET",
                    "itemKey":"TARGET",
                    "title":"Exact Target Work",
                    "year":"2024",
                    "authors":["Alpha"],
                    "doi":"10.1000/exact"
                }],
                "references":[{
                    "canonicalReferenceId":"canonical:1",
                    "reference":{
                        "referenceInstanceId":"raw:1",
                        "parsedTitle":"Exact Target Work",
                        "normalizedTitle":"exact target work",
                        "year":"2024",
                        "authors":["Alpha"],
                        "rawReference":"doi:10.1000/exact"
                    }
                }]
            }),
        )
        .expect("paged binding result");
    assert_eq!(
        binding["matches"][0]["result"]["targetPaperRef"],
        "1:TARGET"
    );

    let dedupe = pool
        .run_direct(
            WorkerOperation::ReferenceCanonicalDedupe,
            json!({
                "contractVersion":"synthesis-reference-matcher.v1",
                "algorithmVersion":"canonical-cluster-dedupe.v1",
                "canonicals":[
                    {
                        "canonicalReferenceId":"canonical:1",
                        "title":"Exact Target Work",
                        "normalizedTitle":"exact target work",
                        "year":"2024",
                        "authors":["Alpha"],
                        "identifiers":[{"kind":"doi","value":"10.1000/exact"}],
                        "rawReferenceIds":["raw:1"],
                        "rawHashes":["sha256:raw-1"],
                        "rawReferences":["Exact Target Work"],
                        "sourceRefs":["1:SOURCE"],
                        "acceptedBinding":false,
                        "stickyRepresentative":false,
                        "titleCandidates":[]
                    },
                    {
                        "canonicalReferenceId":"canonical:2",
                        "title":"Exact Target Work",
                        "normalizedTitle":"exact target work",
                        "year":"2024",
                        "authors":["Alpha"],
                        "identifiers":[{"kind":"doi","value":"10.1000/exact"}],
                        "rawReferenceIds":["raw:2"],
                        "rawHashes":["sha256:raw-2"],
                        "rawReferences":["Exact Target Work"],
                        "sourceRefs":["1:SOURCE"],
                        "acceptedBinding":false,
                        "stickyRepresentative":false,
                        "titleCandidates":[]
                    }
                ]
            }),
        )
        .expect("paged dedupe result");
    assert_eq!(dedupe["actions"].as_array().map(Vec::len), Some(1));
    drop(admission);
}
