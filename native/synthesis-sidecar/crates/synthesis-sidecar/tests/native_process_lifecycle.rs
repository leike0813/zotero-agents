use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitStatus, Stdio};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use synthesis_canonical_store::{
    CanonicalIdentity, CanonicalStore, CanonicalTopicDraft, PreparedCanonicalPromotion,
    prepare_topic,
};
use synthesis_protocol::{canonical_json, canonical_sha256};
use synthesis_repository::{DurableImportApply, DurableTopicBasis, Repository, RepositoryIdentity};
use synthesis_sidecar::{ServePhase, serve};

static TEST_SEQUENCE: AtomicU64 = AtomicU64::new(0);

fn test_root(label: &str) -> PathBuf {
    std::env::temp_dir().join(format!(
        "synthesis-sidecar-lifecycle-{label}-{}-{}",
        std::process::id(),
        TEST_SEQUENCE.fetch_add(1, Ordering::Relaxed)
    ))
}

struct ReverseHost {
    port: u16,
    stopping: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl ReverseHost {
    fn start() -> Self {
        let listener = TcpListener::bind(("127.0.0.1", 0)).expect("reverse host listener");
        listener
            .set_nonblocking(true)
            .expect("nonblocking reverse host");
        let port = listener.local_addr().expect("reverse host address").port();
        let stopping = Arc::new(AtomicBool::new(false));
        let thread_stopping = Arc::clone(&stopping);
        let thread = thread::spawn(move || {
            while !thread_stopping.load(Ordering::Acquire) {
                match listener.accept() {
                    Ok((mut stream, _)) => {
                        read_http_request(&mut stream);
                        let body = br#"{"ok":true,"result":{}}"#;
                        write!(
                            stream,
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                            body.len()
                        )
                        .and_then(|_| stream.write_all(body))
                        .and_then(|_| stream.flush())
                        .expect("reverse host response");
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(5));
                    }
                    Err(error) => panic!("reverse host accept failed: {error}"),
                }
            }
        });
        Self {
            port,
            stopping,
            thread: Some(thread),
        }
    }
}

impl Drop for ReverseHost {
    fn drop(&mut self) {
        self.stopping.store(true, Ordering::Release);
        if let Some(thread) = self.thread.take() {
            thread.join().expect("reverse host thread");
        }
    }
}

fn read_http_request(stream: &mut TcpStream) {
    stream
        .set_read_timeout(Some(Duration::from_secs(2)))
        .expect("reverse host timeout");
    let mut bytes = Vec::new();
    let mut byte = [0_u8; 1];
    while !bytes.ends_with(b"\r\n\r\n") {
        stream.read_exact(&mut byte).expect("request header");
        bytes.push(byte[0]);
    }
    let header = String::from_utf8(bytes).expect("request header utf8");
    let content_length = header
        .lines()
        .filter_map(|line| line.split_once(':'))
        .find(|(name, _)| name.eq_ignore_ascii_case("content-length"))
        .and_then(|(_, value)| value.trim().parse::<usize>().ok())
        .expect("request content length");
    let mut body = vec![0_u8; content_length];
    stream.read_exact(&mut body).expect("request body");
}

fn target_identity() -> (&'static str, &'static str, Value) {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("linux", "x86") => (
            "linux-x86",
            "i686-unknown-linux-gnu",
            json!({"scheme":"not-applicable","status":"not-applicable","signer":null}),
        ),
        ("linux", "x86_64") => (
            "linux-x64",
            "x86_64-unknown-linux-gnu",
            json!({"scheme":"not-applicable","status":"not-applicable","signer":null}),
        ),
        ("linux", "arm") => (
            "linux-arm",
            "armv7-unknown-linux-gnueabihf",
            json!({"scheme":"not-applicable","status":"not-applicable","signer":null}),
        ),
        ("linux", "aarch64") => (
            "linux-arm64",
            "aarch64-unknown-linux-gnu",
            json!({"scheme":"not-applicable","status":"not-applicable","signer":null}),
        ),
        ("macos", "x86_64") => (
            "darwin-x64",
            "x86_64-apple-darwin",
            json!({"scheme":"apple-code-signing","status":"unsigned-candidate","signer":null}),
        ),
        ("macos", "aarch64") => (
            "darwin-arm64",
            "aarch64-apple-darwin",
            json!({"scheme":"apple-code-signing","status":"unsigned-candidate","signer":null}),
        ),
        ("windows", "x86_64") => (
            "win32-x64",
            "x86_64-pc-windows-msvc",
            json!({"scheme":"authenticode","status":"unsigned-candidate","signer":null}),
        ),
        target => panic!("unsupported test target: {target:?}"),
    }
}

fn write_launch_config(root: &Path, reverse_host_port: u16) -> (PathBuf, PathBuf, String) {
    let runtime_root = root.join("runtime/session");
    let discovery_path = runtime_root.join("discovery.json");
    let config_path = root.join("launch-config.json");
    let lifecycle_token = "8".repeat(64);
    let (target, target_triple, platform_signature) = target_identity();
    fs::create_dir_all(&runtime_root).expect("runtime root");
    let config = json!({
        "schema":"synthesis-sidecar-launch-config.v3",
        "profileId":"1".repeat(64),
        "libraryId":1,
        "profileRuntimeRoot":runtime_root,
        "runtimeRootId":"2".repeat(64),
        "dataRootId":"3".repeat(64),
        "bundleId":"4".repeat(64),
        "implementation":"rust-native",
        "target":target,
        "targetTriple":target_triple,
        "buildFingerprint":"5".repeat(64),
        "platformSignature":platform_signature,
        "serviceVersion":env!("CARGO_PKG_VERSION"),
        "protocolVersion":"synthesis-sidecar.v1",
        "schemaVersion":"synthesis-repository-foundation.v2",
        "supervisorInstanceId":"supervisor-1",
        "diagnosticsEnabled":false,
        "repositoryDbPath":root.join("state/synthesis.db"),
        "canonicalRoot":root.join("data/synthesis"),
        "reverseHost":{
            "host":"127.0.0.1",
            "port":reverse_host_port,
            "authorizationToken":"6".repeat(64)
        },
        "clientToken":"7".repeat(64),
        "lifecycleToken":lifecycle_token,
        "port":0
    });
    fs::write(
        &config_path,
        serde_json::to_vec(&config).expect("serialize launch config"),
    )
    .expect("write launch config");
    (config_path, discovery_path, lifecycle_token)
}

fn repository_identity() -> RepositoryIdentity {
    RepositoryIdentity {
        profile_id: "1".repeat(64),
        data_root_id: "3".repeat(64),
    }
}

fn canonical_identity() -> CanonicalIdentity {
    CanonicalIdentity {
        profile_id: "1".repeat(64),
        data_root_id: "3".repeat(64),
    }
}

fn pending_import_topic() -> (PreparedCanonicalPromotion, DurableTopicBasis) {
    let sections = BTreeMap::from([("summary".into(), json!({"text":"recovered"}))]);
    let artifact = json!({"schema":"topic.artifact.v1","title":"Recovered"});
    let metadata = json!({"updatedAt":"2026-08-15T00:00:00.000Z"});
    let prepared = prepare_topic(CanonicalTopicDraft {
        topic_id: "topic:startup-recovery".into(),
        manifest: json!({
            "schema":"topic.manifest.v1",
            "sections":{"summary":{"path":"summary.json"}},
        }),
        artifact,
        metadata,
        sections,
        markdown: BTreeMap::from([("synthesis.md".into(), "# Recovered\n".into())]),
    })
    .expect("prepare canonical topic");
    let topic = prepared.view();
    let target = DurableTopicBasis {
        topic_id: topic.topic_id,
        path_id: topic.path_id,
        manifest_hash: topic.basis.manifest_hash,
        artifact_hash: topic.basis.artifact_hash,
        metadata_hash: topic.metadata_hash,
        bundle_hash: prepared
            .representation_hash()
            .expect("canonical representation hash"),
    };
    (prepared.for_promotion(None), target)
}

fn prepare_import_crash_window(
    root: &Path,
    repository_receipt_id: Option<&str>,
    canonical_receipt_id: &str,
    promote_canonical: bool,
) {
    let database_path = root.join("state/synthesis.db");
    let canonical_root = root.join("data/synthesis");
    let (promotion, target) = pending_import_topic();
    let manifest_hash = "a".repeat(64);
    let mut repository = Repository::initialize_production(&database_path, repository_identity())
        .expect("initialize repository");
    let capture = repository
        .capture_durable_import_state()
        .expect("capture import state");
    if let Some(receipt_id) = repository_receipt_id {
        assert!(
            repository
                .apply_durable_import_state(&DurableImportApply {
                    expected_aggregate_basis: capture.bundle.aggregate_basis,
                    expected_index_revision: capture.index_revision,
                    receipt_id: receipt_id.into(),
                    manifest_hash: format!("sha256:{manifest_hash}"),
                    topic_targets: vec![target],
                    now: "2026-08-15T00:00:00.000Z".into(),
                    ..DurableImportApply::default()
                })
                .expect("commit repository import")
        );
    }
    repository.close().expect("close repository");

    let mut canonical =
        CanonicalStore::initialize_production(&canonical_root, canonical_identity())
            .expect("initialize canonical store");
    canonical
        .stage_prepared_import_batch(
            canonical_receipt_id.into(),
            manifest_hash.clone(),
            vec![promotion],
        )
        .expect("stage canonical import");
    if promote_canonical {
        canonical
            .commit_import_batch(canonical_receipt_id, &manifest_hash)
            .expect("promote canonical import");
    }
    canonical.close().expect("close canonical store");
}

fn run_until_ready_then_shutdown(config_path: &Path, discovery_path: &Path, lifecycle_token: &str) {
    let mut child = Command::new(env!("CARGO_BIN_EXE_synthesis-sidecar"))
        .arg("serve")
        .arg("--config")
        .arg(config_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("spawn sidecar");
    let discovery = wait_for_discovery(&mut child, discovery_path);
    let port = discovery["port"].as_u64().expect("discovery port") as u16;
    assert_eq!(shutdown(port, lifecycle_token)["ok"], true);
    assert!(wait_for_exit(&mut child).success());
}

fn wait_for_discovery(child: &mut Child, path: &Path) -> Value {
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        if let Ok(bytes) = fs::read(path)
            && let Ok(discovery) = serde_json::from_slice(&bytes)
        {
            return discovery;
        }
        if let Some(status) = child.try_wait().expect("sidecar status") {
            panic!("sidecar exited before ready: {status}");
        }
        assert!(Instant::now() < deadline, "sidecar ready deadline");
        thread::sleep(Duration::from_millis(10));
    }
}

fn wait_for_exit(child: &mut Child) -> ExitStatus {
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        if let Some(status) = child.try_wait().expect("sidecar status") {
            return status;
        }
        if Instant::now() >= deadline {
            child.kill().expect("kill timed-out sidecar");
            panic!("sidecar exit deadline");
        }
        thread::sleep(Duration::from_millis(10));
    }
}

fn call(
    port: u16,
    lifecycle_token: &str,
    request_id: &str,
    capability: &str,
    payload: Value,
) -> Value {
    let body = serde_json::to_vec(&json!({
        "protocol":"synthesis-sidecar.v1",
        "requestId":request_id,
        "profileId":"1".repeat(64),
        "capability":capability,
        "payload":payload
    }))
    .expect("call request");
    let mut stream = TcpStream::connect(("127.0.0.1", port)).expect("sidecar connection");
    write!(
        stream,
        "POST /synthesis/v1/call HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nAuthorization: Bearer {lifecycle_token}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    )
    .and_then(|_| stream.write_all(&body))
    .and_then(|_| stream.flush())
    .expect("send call");
    let mut response = Vec::new();
    stream.read_to_end(&mut response).expect("call response");
    let body = response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .map(|index| &response[index + 4..])
        .expect("call response body");
    serde_json::from_slice(body).expect("call response json")
}

fn shutdown(port: u16, lifecycle_token: &str) -> Value {
    call(
        port,
        lifecycle_token,
        "shutdown-1",
        "system.shutdown",
        json!({}),
    )
}

#[test]
fn startup_failure_is_typed_and_never_publishes_discovery() {
    let root = test_root("missing-config");
    let config_path = root.join("config.json");

    let failure = serve(&config_path).expect_err("missing config must fail");

    assert_eq!(failure.phase(), ServePhase::Startup);
    assert!(!failure.code().is_empty());
    assert!(failure.cleanup_issues().is_empty());
    assert!(!root.join("discovery.json").exists());
}

#[test]
fn partial_startup_failure_releases_ownership_without_publishing_ready() {
    let root = test_root("partial-startup");
    let reverse_host = ReverseHost::start();
    let (config_path, discovery_path, _) = write_launch_config(&root, reverse_host.port);
    fs::create_dir_all(root.join("state")).expect("state root");
    fs::write(root.join("state/synthesis.db"), []).expect("partial repository source");

    let first = serve(&config_path).expect_err("partial source must fail");
    let second = serve(&config_path).expect_err("released ownership must permit retry");

    assert_eq!(first.phase(), ServePhase::Startup);
    assert_eq!(first.code(), "synthesis_source_state_incomplete");
    assert_eq!(second.code(), first.code());
    assert!(!discovery_path.exists());

    drop(reverse_host);
    fs::remove_dir_all(root).expect("remove partial startup root");
}

#[test]
fn ready_startup_rolls_forward_a_committed_durable_import() {
    let root = test_root("durable-import-roll-forward");
    let reverse_host = ReverseHost::start();
    let (config_path, discovery_path, lifecycle_token) =
        write_launch_config(&root, reverse_host.port);
    prepare_import_crash_window(
        &root,
        Some("receipt:startup-recovery"),
        "receipt:startup-recovery",
        false,
    );
    run_until_ready_then_shutdown(&config_path, &discovery_path, &lifecycle_token);

    let mut repository = Repository::open_production(
        &root.join("state/synthesis.db"),
        repository_identity(),
        "2026-08-15T00:01:00.000Z",
    )
    .expect("reopen repository");
    assert!(
        repository
            .capture_durable_import_state()
            .expect("capture recovered import")
            .commit_receipt
            .is_none()
    );
    repository.close().expect("close repository");
    let canonical =
        CanonicalStore::open_production(&root.join("data/synthesis"), canonical_identity())
            .expect("reopen canonical store");
    assert_eq!(
        canonical
            .inspect("topic:startup-recovery")
            .expect("inspect recovered topic")["status"],
        "ready"
    );
    canonical.close().expect("close canonical store");

    drop(reverse_host);
    fs::remove_dir_all(root).expect("remove recovery root");
}

#[test]
fn ready_startup_discards_an_uncommitted_durable_import_batch() {
    let root = test_root("durable-import-discard");
    let reverse_host = ReverseHost::start();
    let (config_path, discovery_path, lifecycle_token) =
        write_launch_config(&root, reverse_host.port);
    prepare_import_crash_window(&root, None, "receipt:startup-recovery", false);

    run_until_ready_then_shutdown(&config_path, &discovery_path, &lifecycle_token);

    assert!(!root.join("data/synthesis/import-batch.json").exists());
    let canonical =
        CanonicalStore::open_production(&root.join("data/synthesis"), canonical_identity())
            .expect("reopen canonical store");
    assert_eq!(
        canonical
            .inspect("topic:startup-recovery")
            .expect("inspect discarded topic")["status"],
        "absent"
    );
    canonical.close().expect("close canonical store");

    drop(reverse_host);
    fs::remove_dir_all(root).expect("remove discard root");
}

#[test]
fn ready_startup_clears_a_receipt_after_completed_canonical_promotion() {
    let root = test_root("durable-import-verify");
    let reverse_host = ReverseHost::start();
    let (config_path, discovery_path, lifecycle_token) =
        write_launch_config(&root, reverse_host.port);
    prepare_import_crash_window(
        &root,
        Some("receipt:startup-recovery"),
        "receipt:startup-recovery",
        true,
    );

    run_until_ready_then_shutdown(&config_path, &discovery_path, &lifecycle_token);

    let mut repository = Repository::open_production(
        &root.join("state/synthesis.db"),
        repository_identity(),
        "2026-08-15T00:01:00.000Z",
    )
    .expect("reopen repository");
    assert!(
        repository
            .capture_durable_import_state()
            .expect("capture verified import")
            .commit_receipt
            .is_none()
    );
    repository.close().expect("close repository");

    drop(reverse_host);
    fs::remove_dir_all(root).expect("remove verified root");
}

#[test]
fn inconsistent_durable_import_evidence_fails_before_ready() {
    let root = test_root("durable-import-mismatch");
    let reverse_host = ReverseHost::start();
    let (config_path, discovery_path, _) = write_launch_config(&root, reverse_host.port);
    prepare_import_crash_window(
        &root,
        Some("receipt:startup-recovery"),
        "receipt:different",
        false,
    );

    let failure = serve(&config_path).expect_err("mismatched import must fail startup");

    assert_eq!(failure.phase(), ServePhase::Startup);
    assert_eq!(failure.code(), "canonical_import_receipt_mismatch");
    assert!(!discovery_path.exists());
    assert!(root.join("data/synthesis/import-batch.json").exists());

    drop(reverse_host);
    fs::remove_dir_all(root).expect("remove mismatch root");
}

#[test]
fn discovery_is_the_ready_commit_and_shutdown_receipt_precedes_terminal_cleanup() {
    let root = test_root("ready-shutdown");
    let reverse_host = ReverseHost::start();
    let (config_path, discovery_path, lifecycle_token) =
        write_launch_config(&root, reverse_host.port);
    let mut child = Command::new(env!("CARGO_BIN_EXE_synthesis-sidecar"))
        .arg("serve")
        .arg("--config")
        .arg(&config_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("spawn sidecar");

    let discovery = wait_for_discovery(&mut child, &discovery_path);
    assert_eq!(discovery["schema"], "synthesis-sidecar-discovery.v5");
    assert_eq!(discovery["lifecycleState"], "ready");
    let port = discovery["port"].as_u64().expect("discovery port") as u16;

    let receipt = shutdown(port, &lifecycle_token);
    assert_eq!(receipt["ok"], true);
    assert_eq!(receipt["data"]["accepted"], true);
    assert_eq!(receipt["data"]["lifecycleState"], "stopping");
    assert!(wait_for_exit(&mut child).success());
    assert!(!discovery_path.exists());

    drop(reverse_host);
    fs::remove_dir_all(root).expect("remove lifecycle root");
}

#[test]
fn canonical_inspect_serves_the_raw_topic_descriptor_shape() {
    let root = test_root("canonical-inspect");
    let reverse_host = ReverseHost::start();
    let (config_path, discovery_path, lifecycle_token) =
        write_launch_config(&root, reverse_host.port);
    let mut child = Command::new(env!("CARGO_BIN_EXE_synthesis-sidecar"))
        .arg("serve")
        .arg("--config")
        .arg(&config_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("spawn sidecar");

    let discovery = wait_for_discovery(&mut child, &discovery_path);
    let port = discovery["port"].as_u64().expect("discovery port") as u16;

    let inspected = call(
        port,
        &"7".repeat(64),
        "inspect-1",
        "topics.canonical.inspect",
        json!({"topicId":"r7-canary"}),
    );
    assert_eq!(inspected["ok"], true);
    assert_eq!(inspected["data"]["status"], "absent");
    assert_eq!(inspected["data"]["topicId"], "r7-canary");
    assert_eq!(inspected["data"]["pathId"], "r7-canary");
    assert_eq!(inspected["data"]["manifestHash"], Value::Null);
    assert_eq!(inspected["data"]["sections"], json!([]));
    assert_eq!(inspected["data"]["diagnostics"], json!([]));

    assert_eq!(shutdown(port, &lifecycle_token)["ok"], true);
    assert!(wait_for_exit(&mut child).success());

    drop(reverse_host);
    fs::remove_dir_all(root).expect("remove canonical inspect root");
}

#[test]
fn transfer_execution_completes_through_the_real_http_lifecycle() {
    let root = test_root("transfer-execution");
    let reverse_host = ReverseHost::start();
    let (config_path, discovery_path, lifecycle_token) =
        write_launch_config(&root, reverse_host.port);
    let mut child = Command::new(env!("CARGO_BIN_EXE_synthesis-sidecar"))
        .arg("serve")
        .arg("--config")
        .arg(&config_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .expect("spawn sidecar");

    let discovery = wait_for_discovery(&mut child, &discovery_path);
    let port = discovery["port"].as_u64().expect("discovery port") as u16;
    let client_token = "7".repeat(64);
    let empty_rows = json!([]);
    let empty_rows_bytes = canonical_json(&empty_rows)
        .expect("canonical empty rows")
        .len();
    let empty_rows_hash = canonical_sha256(&empty_rows).expect("empty rows hash");
    let pages = ["library_nodes", "references"].map(|kind| {
        json!({
            "descriptor":{
                "kind":kind,
                "pageIndex":0,
                "rowCount":0,
                "byteLength":empty_rows_bytes,
                "sha256":empty_rows_hash,
            },
            "rows":empty_rows,
        })
    });
    let manifest_body = json!({
        "transferVersion":"synthesis-citation-graph-build-transfer.v1",
        "encoding":"canonical_json_rows.v1",
        "direction":"input",
        "header":{
            "contractVersion":"synthesis-citation-graph-build.v1",
            "scope":{"kind":"full","sourceIds":[]},
            "rolePriority":[],
        },
        "pages":pages.iter().map(|page| page["descriptor"].clone()).collect::<Vec<_>>(),
    });
    let mut manifest = manifest_body.clone();
    manifest["rootSha256"] =
        Value::String(canonical_sha256(&manifest_body).expect("canonical manifest hash"));
    let begun = call(
        port,
        &client_token,
        "transfer-begin",
        "compute.citation_graph_build_transfer",
        json!({
            "action":"begin",
            "idempotencyKey":"native-process-lifecycle",
            "manifest":manifest,
        }),
    );
    assert_eq!(begun["ok"], true, "begin response: {begun}");
    let session_id = begun["data"]["sessionId"]
        .as_str()
        .expect("transfer session id");
    for (page_index, page) in pages.into_iter().enumerate() {
        let staged = call(
            port,
            &client_token,
            &format!("transfer-page-{page_index}"),
            "compute.citation_graph_build_transfer",
            json!({"action":"put_input_page","sessionId":session_id,"page":page}),
        );
        assert_eq!(staged["ok"], true, "stage response: {staged}");
    }
    let sealed = call(
        port,
        &client_token,
        "transfer-seal",
        "compute.citation_graph_build_transfer",
        json!({"action":"seal_input","sessionId":session_id}),
    );
    assert_eq!(sealed["data"]["state"], "input_sealed");
    let accepted = call(
        port,
        &client_token,
        "transfer-execute",
        "compute.citation_graph_build_transfer",
        json!({"action":"execute","sessionId":session_id}),
    );
    assert_eq!(accepted["ok"], true);
    assert!(matches!(
        accepted["data"]["state"].as_str(),
        Some("queued" | "executing" | "publishing" | "completed")
    ));

    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        let status = call(
            port,
            &client_token,
            "transfer-status",
            "compute.citation_graph_build_transfer",
            json!({"action":"status","sessionId":session_id}),
        );
        if status["data"]["state"] == "completed" {
            assert_eq!(status["data"]["execution"]["lastFailure"], Value::Null);
            break;
        }
        assert!(
            Instant::now() < deadline,
            "transfer completion deadline; last status: {status}"
        );
        thread::sleep(Duration::from_millis(10));
    }

    assert_eq!(shutdown(port, &lifecycle_token)["ok"], true);
    assert!(wait_for_exit(&mut child).success());

    drop(reverse_host);
    fs::remove_dir_all(root).expect("remove transfer lifecycle root");
}
