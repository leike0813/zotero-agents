use serde_json::{Value, json};
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitStatus, Stdio};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
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

fn shutdown(port: u16, lifecycle_token: &str) -> Value {
    let body = serde_json::to_vec(&json!({
        "protocol":"synthesis-sidecar.v1",
        "requestId":"shutdown-1",
        "profileId":"1".repeat(64),
        "capability":"system.shutdown",
        "payload":{}
    }))
    .expect("shutdown request");
    let mut stream = TcpStream::connect(("127.0.0.1", port)).expect("sidecar connection");
    write!(
        stream,
        "POST /synthesis/v1/call HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nAuthorization: Bearer {lifecycle_token}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    )
    .and_then(|_| stream.write_all(&body))
    .and_then(|_| stream.flush())
    .expect("send shutdown");
    let mut response = Vec::new();
    stream
        .read_to_end(&mut response)
        .expect("shutdown response");
    let body = response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .map(|index| &response[index + 4..])
        .expect("shutdown response body");
    serde_json::from_slice(body).expect("shutdown response json")
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
