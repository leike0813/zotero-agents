use serde::Deserialize;
use serde_json::{Map, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub const SERVICE_VERSION: &str = env!("CARGO_PKG_VERSION");
pub const SIDECAR_CAPABILITIES: &[&str] = &[
    "system.handshake",
    "system.shutdown",
    "workbench.chrome.read",
    "topics.canonical.inspect",
    "compute.citation_graph_layout",
    "compute.citation_graph_metrics",
    "compute.citation_graph_build",
    "compute.citation_graph_build_transfer",
];

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuntimeFile {
    path: String,
    bytes: u64,
    sha256: String,
    executable: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuntimeProvenance {
    source_fingerprint: String,
    toolchain: String,
    cargo_lock_sha256: String,
    license_inventory: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuntimeSignature {
    scheme: String,
    status: String,
    signer: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RuntimeBundleManifest {
    schema: String,
    bundle_id: String,
    implementation: String,
    service_version: String,
    protocol_version: String,
    target: String,
    target_triple: String,
    executable: String,
    build_fingerprint: String,
    capabilities: Vec<String>,
    created_at: String,
    expires_at: Option<String>,
    provenance: RuntimeProvenance,
    files: Vec<RuntimeFile>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NativeLaunchConfig {
    pub schema: String,
    pub profile_id: String,
    pub profile_runtime_root: PathBuf,
    pub runtime_root_id: String,
    pub data_root_id: String,
    pub bundle_id: String,
    pub implementation: String,
    pub target: String,
    pub target_triple: String,
    pub build_fingerprint: String,
    pub platform_signature: Value,
    pub service_version: String,
    pub protocol_version: String,
    pub schema_version: String,
    pub supervisor_instance_id: String,
    #[serde(default)]
    pub diagnostics_enabled: bool,
    pub repository_db_path: PathBuf,
    pub canonical_root: PathBuf,
    pub reverse_host: ProductionReverseHost,
    pub client_token: String,
    pub lifecycle_token: String,
    pub port: u16,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProductionReverseHost {
    pub host: String,
    pub port: u16,
    pub authorization_token: String,
}

fn bounded_text(value: &str, max: usize) -> bool {
    !value.is_empty() && value.len() <= max && !value.chars().any(char::is_control)
}

fn sha256(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
}

fn target_matches(target: &str, triple: &str) -> bool {
    matches!(
        (target, triple),
        ("win32-x64", "x86_64-pc-windows-msvc")
            | ("darwin-x64", "x86_64-apple-darwin")
            | ("darwin-arm64", "aarch64-apple-darwin")
            | ("linux-x86", "i686-unknown-linux-gnu")
            | ("linux-x64", "x86_64-unknown-linux-gnu")
            | ("linux-arm", "armv7-unknown-linux-gnueabihf")
            | ("linux-arm64", "aarch64-unknown-linux-gnu")
    )
}

fn target_executable(target: &str) -> &'static str {
    if target == "win32-x64" {
        "synthesis-sidecar.exe"
    } else {
        "synthesis-sidecar"
    }
}

fn safe_relative_path(value: &str) -> bool {
    !value.is_empty()
        && !value.starts_with('/')
        && !value.contains('\\')
        && value
            .split('/')
            .all(|segment| !segment.is_empty() && segment != "." && segment != "..")
}

fn absolute_path(path: &Path) -> bool {
    path.is_absolute()
        && !path.components().any(|component| {
            matches!(
                component,
                std::path::Component::CurDir | std::path::Component::ParentDir
            )
        })
}

fn timestamp(value: &str) -> bool {
    value.len() >= 20 && value.ends_with('Z') && value.contains('T')
}

fn signature_valid(target: &str, signature: &RuntimeSignature) -> bool {
    match target {
        "linux-x86" | "linux-x64" | "linux-arm" | "linux-arm64" => {
            signature.scheme == "not-applicable"
                && signature.status == "not-applicable"
                && signature.signer.is_none()
        }
        "win32-x64" => {
            signature.scheme == "authenticode"
                && ((signature.status == "verified"
                    && signature
                        .signer
                        .as_deref()
                        .is_some_and(|value| bounded_text(value, 256)))
                    || (signature.status == "unsigned-candidate" && signature.signer.is_none()))
        }
        "darwin-x64" | "darwin-arm64" => {
            signature.scheme == "apple-code-signing"
                && ((signature.status == "verified"
                    && signature
                        .signer
                        .as_deref()
                        .is_some_and(|value| bounded_text(value, 256)))
                    || (signature.status == "unsigned-candidate" && signature.signer.is_none()))
        }
        _ => false,
    }
}

fn signature_value_valid(target: &str, value: &Value) -> bool {
    serde_json::from_value::<RuntimeSignature>(value.clone())
        .is_ok_and(|signature| signature_valid(target, &signature))
}

pub fn rebuild_native_bundle_manifest(value: &str) -> Result<(), String> {
    let manifest: RuntimeBundleManifest =
        serde_json::from_str(value).map_err(|_| "invalid_manifest".to_owned())?;
    let executable = target_executable(&manifest.target);
    let capabilities_match = manifest.capabilities.len() == SIDECAR_CAPABILITIES.len()
        && manifest
            .capabilities
            .iter()
            .zip(SIDECAR_CAPABILITIES.iter())
            .all(|(left, right)| left == right);
    let files_valid = !manifest.files.is_empty()
        && manifest
            .files
            .windows(2)
            .all(|pair| pair[0].path < pair[1].path)
        && manifest.files.iter().all(|file| {
            safe_relative_path(&file.path)
                && file.bytes > 0
                && sha256(&file.sha256)
                && file.executable == (file.path == executable)
        });
    let executable_files = manifest.files.iter().filter(|file| file.executable).count();
    if manifest.schema != "synthesis-sidecar-runtime-bundle.v3"
        || manifest.implementation != "rust-native"
        || manifest.service_version != SERVICE_VERSION
        || manifest.protocol_version != "synthesis-sidecar.v1"
        || !sha256(&manifest.bundle_id)
        || !sha256(&manifest.build_fingerprint)
        || !target_matches(&manifest.target, &manifest.target_triple)
        || manifest.executable != executable
        || !capabilities_match
        || !timestamp(&manifest.created_at)
        || manifest
            .expires_at
            .as_deref()
            .is_some_and(|value| !timestamp(value))
        || !sha256(&manifest.provenance.source_fingerprint)
        || !bounded_text(&manifest.provenance.toolchain, 128)
        || !sha256(&manifest.provenance.cargo_lock_sha256)
        || !safe_relative_path(&manifest.provenance.license_inventory)
        || !files_valid
        || executable_files != 1
    {
        return Err("invalid_manifest".into());
    }
    Ok(())
}

pub fn rebuild_native_launch_config(value: &str) -> Result<NativeLaunchConfig, String> {
    let config: NativeLaunchConfig =
        serde_json::from_str(value).map_err(|_| "invalid_config".to_owned())?;
    if config.schema != "synthesis-sidecar-launch-config.v3"
        || config.implementation != "rust-native"
        || config.protocol_version != "synthesis-sidecar.v1"
        || config.service_version != SERVICE_VERSION
        || config.port != 0
        || !absolute_path(&config.profile_runtime_root)
        || !absolute_path(&config.repository_db_path)
        || !absolute_path(&config.canonical_root)
        || !sha256(&config.profile_id)
        || !sha256(&config.runtime_root_id)
        || !sha256(&config.data_root_id)
        || !sha256(&config.bundle_id)
        || !sha256(&config.build_fingerprint)
        || !target_matches(&config.target, &config.target_triple)
        || !bounded_text(&config.schema_version, 128)
        || !bounded_text(&config.supervisor_instance_id, 128)
        || config.reverse_host.host != "127.0.0.1"
        || config.reverse_host.port == 0
        || config.reverse_host.authorization_token.len() < 32
        || config.reverse_host.authorization_token.len() > 256
        || config.client_token.len() < 32
        || config.client_token.len() > 256
        || config.lifecycle_token.len() < 32
        || config.lifecycle_token.len() > 256
        || config.client_token == config.lifecycle_token
        || !signature_value_valid(&config.target, &config.platform_signature)
    {
        return Err("invalid_config".into());
    }
    Ok(config)
}

fn object(value: &str, code: &str) -> Result<Map<String, Value>, String> {
    serde_json::from_str::<Value>(value)
        .ok()
        .and_then(|value| value.as_object().cloned())
        .ok_or_else(|| code.to_owned())
}

fn exact_fields(record: &Map<String, Value>, expected: &[&str]) -> bool {
    record.len() == expected.len() && expected.iter().all(|field| record.contains_key(*field))
}

fn value_text<'a>(record: &'a Map<String, Value>, field: &str) -> Option<&'a str> {
    record.get(field).and_then(Value::as_str)
}

fn hash_field(record: &Map<String, Value>, field: &str) -> bool {
    value_text(record, field).is_some_and(sha256)
}

fn runtime_identity(record: &Map<String, Value>, protocol_field: &str) -> bool {
    value_text(record, "implementation") == Some("rust-native")
        && value_text(record, protocol_field) == Some("synthesis-sidecar.v1")
        && value_text(record, "serviceVersion") == Some(SERVICE_VERSION)
        && hash_field(record, "bundleId")
        && hash_field(record, "buildFingerprint")
        && value_text(record, "target")
            .zip(value_text(record, "targetTriple"))
            .is_some_and(|(target, triple)| target_matches(target, triple))
        && value_text(record, "target")
            .is_some_and(|target| signature_value_valid(target, &record["platformSignature"]))
}

fn capabilities(record: &Map<String, Value>) -> bool {
    record
        .get("capabilities")
        .and_then(Value::as_array)
        .is_some_and(|values| {
            values.len() == SIDECAR_CAPABILITIES.len()
                && values
                    .iter()
                    .zip(SIDECAR_CAPABILITIES.iter())
                    .all(|(left, right)| left.as_str() == Some(right))
        })
}

pub fn rebuild_native_discovery(value: &str) -> Result<(), String> {
    const FIELDS: &[&str] = &[
        "schema",
        "profileId",
        "supervisorInstanceId",
        "serviceInstanceId",
        "bundleId",
        "implementation",
        "target",
        "targetTriple",
        "buildFingerprint",
        "platformSignature",
        "serviceVersion",
        "protocolVersion",
        "schemaVersion",
        "runtimeRootId",
        "dataRootId",
        "host",
        "port",
        "pid",
        "lifecycleState",
        "tokenLocator",
        "capabilities",
    ];
    let record = object(value, "invalid_discovery")?;
    if !exact_fields(&record, FIELDS)
        || value_text(&record, "schema") != Some("synthesis-sidecar-discovery.v2")
        || value_text(&record, "host") != Some("127.0.0.1")
        || value_text(&record, "lifecycleState") != Some("ready")
        || value_text(&record, "tokenLocator") != Some("supervisor-session")
        || !hash_field(&record, "profileId")
        || !hash_field(&record, "runtimeRootId")
        || !hash_field(&record, "dataRootId")
        || !runtime_identity(&record, "protocolVersion")
        || !capabilities(&record)
    {
        return Err("invalid_discovery".into());
    }
    Ok(())
}

pub fn rebuild_native_health(value: &str) -> Result<(), String> {
    const FIELDS: &[&str] = &[
        "status",
        "implementation",
        "protocol",
        "serviceVersion",
        "serviceInstanceId",
        "supervisorInstanceId",
        "bundleId",
        "target",
        "targetTriple",
        "buildFingerprint",
        "platformSignature",
        "lifecycleState",
        "repository",
        "canonicalStore",
        "computePool",
        "citationGraphTransfer",
    ];
    let record = object(value, "invalid_health")?;
    if !exact_fields(&record, FIELDS)
        || value_text(&record, "status") != Some("ok")
        || !matches!(
            value_text(&record, "lifecycleState"),
            Some("starting" | "ready" | "stopping")
        )
        || !runtime_identity(&record, "protocol")
        || !record["repository"].is_object()
        || !record["canonicalStore"].is_object()
        || !record["computePool"].is_object()
        || !record["citationGraphTransfer"].is_object()
    {
        return Err("invalid_health".into());
    }
    Ok(())
}

pub fn rebuild_native_handshake(value: &str) -> Result<(), String> {
    const FIELDS: &[&str] = &[
        "implementation",
        "protocol",
        "serviceVersion",
        "serviceInstanceId",
        "supervisorInstanceId",
        "bundleId",
        "target",
        "targetTriple",
        "buildFingerprint",
        "platformSignature",
        "profileId",
        "schemaVersion",
        "runtimeRootId",
        "dataRootId",
        "capabilities",
        "mutationEnabled",
        "lifecycleState",
        "repository",
        "canonicalStore",
        "computePool",
        "citationGraphTransfer",
    ];
    let record = object(value, "invalid_handshake")?;
    if !exact_fields(&record, FIELDS)
        || value_text(&record, "lifecycleState") != Some("ready")
        || !hash_field(&record, "profileId")
        || !hash_field(&record, "runtimeRootId")
        || !hash_field(&record, "dataRootId")
        || !runtime_identity(&record, "protocol")
        || record.get("mutationEnabled") != Some(&Value::Bool(false))
        || !capabilities(&record)
        || !record["repository"].is_object()
        || !record["canonicalStore"].is_object()
        || !record["computePool"].is_object()
        || !record["citationGraphTransfer"].is_object()
    {
        return Err("invalid_handshake".into());
    }
    Ok(())
}

pub fn read_native_launch_config(path: &Path) -> Result<NativeLaunchConfig, String> {
    rebuild_native_launch_config(&fs::read_to_string(path).map_err(|error| error.to_string())?)
}

pub fn current_time_ms() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "system_clock_invalid".to_owned())?
        .as_millis()
        .try_into()
        .map_err(|_| "system_clock_invalid".to_owned())
}
