use serde::Deserialize;
use serde_json::Value;
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

#[derive(Debug, Deserialize)]
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
    platform_signature: RuntimeSignature,
    files: Vec<RuntimeFile>,
}

#[derive(Debug, Deserialize)]
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
    pub lease_nonce: String,
    pub client_token: String,
    pub lifecycle_token: String,
    pub mutation_enabled: bool,
    pub port: u16,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct LeaseRecord {
    schema: String,
    profile_id: String,
    supervisor_instance_id: String,
    lease_nonce: String,
    updated_at_ms: u64,
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
            | ("linux-x64", "x86_64-unknown-linux-gnu")
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

fn timestamp(value: &str) -> bool {
    value.len() >= 20 && value.ends_with('Z') && value.contains('T')
}

fn signature_valid(target: &str, signature: &RuntimeSignature) -> bool {
    match target {
        "linux-x64" | "linux-arm64" => {
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
                        .is_some_and(|value| !value.is_empty() && value.len() <= 256))
                    || (signature.status == "unsigned-candidate" && signature.signer.is_none()))
        }
        "darwin-x64" | "darwin-arm64" => {
            signature.scheme == "apple-code-signing"
                && ((signature.status == "verified"
                    && signature
                        .signer
                        .as_deref()
                        .is_some_and(|value| !value.is_empty() && value.len() <= 256))
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
    let signature_valid = signature_valid(&manifest.target, &manifest.platform_signature);
    let capabilities_match = manifest.capabilities.len() == SIDECAR_CAPABILITIES.len()
        && manifest
            .capabilities
            .iter()
            .zip(SIDECAR_CAPABILITIES)
            .all(|(left, right)| left == right);
    let mut paths = std::collections::BTreeSet::new();
    let executable_files = manifest.files.iter().filter(|file| file.executable).count();
    let files_valid = !manifest.files.is_empty()
        && manifest.files.iter().all(|file| {
            safe_relative_path(&file.path)
                && file.bytes > 0
                && sha256(&file.sha256)
                && paths.insert(file.path.as_str())
                && (!file.executable || file.path == executable)
        });
    if manifest.schema != "synthesis-sidecar-runtime-bundle.v2"
        || manifest.implementation != "rust-native"
        || manifest.protocol_version != "synthesis-sidecar.v1"
        || !bounded_text(&manifest.service_version, 128)
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
        || !signature_valid
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
    if config.schema != "synthesis-sidecar-launch-config.v2"
        || config.implementation != "rust-native"
        || config.protocol_version != "synthesis-sidecar.v1"
        || config.service_version != SERVICE_VERSION
        || config.mutation_enabled
        || config.port != 0
        || !config.profile_runtime_root.is_absolute()
        || !sha256(&config.profile_id)
        || !sha256(&config.runtime_root_id)
        || !sha256(&config.data_root_id)
        || !sha256(&config.bundle_id)
        || !sha256(&config.build_fingerprint)
        || !target_matches(&config.target, &config.target_triple)
        || !bounded_text(&config.schema_version, 128)
        || !bounded_text(&config.supervisor_instance_id, 128)
        || !bounded_text(&config.lease_nonce, 128)
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NativeDiscovery {
    schema: String,
    profile_id: String,
    supervisor_instance_id: String,
    service_instance_id: String,
    bundle_id: String,
    implementation: String,
    target: String,
    target_triple: String,
    build_fingerprint: String,
    platform_signature: Value,
    service_version: String,
    protocol_version: String,
    schema_version: String,
    runtime_root_id: String,
    data_root_id: String,
    host: String,
    port: u16,
    pid: u32,
    lifecycle_state: String,
    token_locator: String,
    capabilities: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RepositorySnapshot {
    mode: String,
    state: String,
    schema_version: String,
    repository_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CanonicalSnapshot {
    state: String,
    schema_version: String,
    store_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ComputePoolSnapshot {
    state: String,
    active: u8,
    queued: u8,
    restart_count: u64,
    failure_count: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TransferSnapshot {
    state: String,
    sessions: u64,
    staged_bytes: u64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NativeHealth {
    status: String,
    implementation: String,
    protocol: String,
    service_version: String,
    service_instance_id: String,
    supervisor_instance_id: String,
    bundle_id: String,
    target: String,
    target_triple: String,
    build_fingerprint: String,
    platform_signature: Value,
    lifecycle_state: String,
    repository: RepositorySnapshot,
    canonical_store: CanonicalSnapshot,
    compute_pool: ComputePoolSnapshot,
    citation_graph_transfer: TransferSnapshot,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct NativeHandshake {
    implementation: String,
    protocol: String,
    service_version: String,
    service_instance_id: String,
    supervisor_instance_id: String,
    bundle_id: String,
    target: String,
    target_triple: String,
    build_fingerprint: String,
    platform_signature: Value,
    profile_id: String,
    schema_version: String,
    runtime_root_id: String,
    data_root_id: String,
    capabilities: Vec<String>,
    mutation_enabled: bool,
    lifecycle_state: String,
    repository: RepositorySnapshot,
    canonical_store: CanonicalSnapshot,
    compute_pool: ComputePoolSnapshot,
    citation_graph_transfer: TransferSnapshot,
}

fn capabilities_valid(capabilities: &[String]) -> bool {
    capabilities.len() == SIDECAR_CAPABILITIES.len()
        && capabilities
            .iter()
            .zip(SIDECAR_CAPABILITIES)
            .all(|(left, right)| left == right)
}

fn repository_snapshot_valid(value: &RepositorySnapshot) -> bool {
    value.mode == "isolated_shadow"
        && matches!(value.state.as_str(), "ready" | "stopping")
        && value.schema_version == "synthesis-repository-foundation.v1"
        && sha256(&value.repository_id)
}

fn canonical_snapshot_valid(value: &CanonicalSnapshot) -> bool {
    matches!(
        value.state.as_str(),
        "ready" | "stopping" | "repair_required"
    ) && value.schema_version == "synthesis-topic-canonical-store.v1"
        && sha256(&value.store_id)
}

fn compute_pool_snapshot_valid(value: &ComputePoolSnapshot) -> bool {
    matches!(
        value.state.as_str(),
        "idle" | "busy" | "degraded" | "stopping"
    ) && value.active <= 1
        && value.queued <= 2
        && value.restart_count >= u64::from(value.failure_count > 0)
}

fn transfer_snapshot_valid(value: &TransferSnapshot) -> bool {
    matches!(value.state.as_str(), "idle" | "active" | "stopping")
        && value.sessions <= 2
        && (value.sessions > 0 || value.staged_bytes == 0)
}

struct RuntimeIdentityView<'a> {
    implementation: &'a str,
    protocol: &'a str,
    service_version: &'a str,
    service_instance_id: &'a str,
    supervisor_instance_id: &'a str,
    bundle_id: &'a str,
    target: &'a str,
    target_triple: &'a str,
    build_fingerprint: &'a str,
    platform_signature: &'a Value,
}

fn runtime_identity_valid(value: RuntimeIdentityView<'_>) -> bool {
    value.implementation == "rust-native"
        && value.protocol == "synthesis-sidecar.v1"
        && bounded_text(value.service_version, 128)
        && bounded_text(value.service_instance_id, 128)
        && bounded_text(value.supervisor_instance_id, 128)
        && sha256(value.bundle_id)
        && target_matches(value.target, value.target_triple)
        && sha256(value.build_fingerprint)
        && signature_value_valid(value.target, value.platform_signature)
}

pub fn rebuild_native_discovery(value: &str) -> Result<(), String> {
    let document: NativeDiscovery =
        serde_json::from_str(value).map_err(|_| "invalid_discovery".to_owned())?;
    if document.schema != "synthesis-sidecar-discovery.v2"
        || !sha256(&document.profile_id)
        || !bounded_text(&document.supervisor_instance_id, 128)
        || !bounded_text(&document.service_instance_id, 128)
        || !sha256(&document.bundle_id)
        || document.implementation != "rust-native"
        || !target_matches(&document.target, &document.target_triple)
        || !sha256(&document.build_fingerprint)
        || !signature_value_valid(&document.target, &document.platform_signature)
        || !bounded_text(&document.service_version, 128)
        || document.protocol_version != "synthesis-sidecar.v1"
        || !bounded_text(&document.schema_version, 128)
        || !sha256(&document.runtime_root_id)
        || !sha256(&document.data_root_id)
        || document.host != "127.0.0.1"
        || document.port == 0
        || document.pid < 2
        || document.lifecycle_state != "ready"
        || document.token_locator != "supervisor-session"
        || !capabilities_valid(&document.capabilities)
    {
        return Err("invalid_discovery".into());
    }
    Ok(())
}

pub fn rebuild_native_health(value: &str) -> Result<(), String> {
    let document: NativeHealth =
        serde_json::from_str(value).map_err(|_| "invalid_health".to_owned())?;
    if document.status != "ok"
        || !runtime_identity_valid(RuntimeIdentityView {
            implementation: &document.implementation,
            protocol: &document.protocol,
            service_version: &document.service_version,
            service_instance_id: &document.service_instance_id,
            supervisor_instance_id: &document.supervisor_instance_id,
            bundle_id: &document.bundle_id,
            target: &document.target,
            target_triple: &document.target_triple,
            build_fingerprint: &document.build_fingerprint,
            platform_signature: &document.platform_signature,
        })
        || !matches!(
            document.lifecycle_state.as_str(),
            "starting" | "ready" | "stopping"
        )
        || !repository_snapshot_valid(&document.repository)
        || !canonical_snapshot_valid(&document.canonical_store)
        || !compute_pool_snapshot_valid(&document.compute_pool)
        || !transfer_snapshot_valid(&document.citation_graph_transfer)
    {
        return Err("invalid_health".into());
    }
    Ok(())
}

pub fn rebuild_native_handshake(value: &str) -> Result<(), String> {
    let document: NativeHandshake =
        serde_json::from_str(value).map_err(|_| "invalid_handshake".to_owned())?;
    if !runtime_identity_valid(RuntimeIdentityView {
        implementation: &document.implementation,
        protocol: &document.protocol,
        service_version: &document.service_version,
        service_instance_id: &document.service_instance_id,
        supervisor_instance_id: &document.supervisor_instance_id,
        bundle_id: &document.bundle_id,
        target: &document.target,
        target_triple: &document.target_triple,
        build_fingerprint: &document.build_fingerprint,
        platform_signature: &document.platform_signature,
    }) || !sha256(&document.profile_id)
        || !bounded_text(&document.schema_version, 128)
        || !sha256(&document.runtime_root_id)
        || !sha256(&document.data_root_id)
        || !capabilities_valid(&document.capabilities)
        || document.mutation_enabled
        || document.lifecycle_state != "ready"
        || !repository_snapshot_valid(&document.repository)
        || !canonical_snapshot_valid(&document.canonical_store)
        || !compute_pool_snapshot_valid(&document.compute_pool)
        || !transfer_snapshot_valid(&document.citation_graph_transfer)
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

pub fn validate_host_lease(path: &Path, config: &NativeLaunchConfig) -> Result<(), String> {
    let lease: LeaseRecord = serde_json::from_str(
        &fs::read_to_string(path).map_err(|_| "host_lease_unavailable".to_owned())?,
    )
    .map_err(|_| "host_lease_invalid".to_owned())?;
    if lease.schema != "synthesis-sidecar-lease.v1"
        || lease.profile_id != config.profile_id
        || lease.supervisor_instance_id != config.supervisor_instance_id
        || lease.lease_nonce != config.lease_nonce
    {
        return Err("host_lease_invalid".into());
    }
    if current_time_ms()?.saturating_sub(lease.updated_at_ms) > 120_000 {
        return Err("host_lease_expired".into());
    }
    Ok(())
}
