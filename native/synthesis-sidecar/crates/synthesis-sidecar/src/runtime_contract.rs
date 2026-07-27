use crate::production_capabilities::PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT;
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

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProductionReverseHost {
    pub host: String,
    pub port: u16,
    pub authorization_token: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProductionAdmission {
    pub schema: String,
    pub purpose: String,
    pub profile_id: String,
    pub supervisor_instance_id: String,
    pub cutover_receipt_id: String,
    pub cutover_receipt_path: PathBuf,
    pub capability_fingerprint: String,
    pub repository_db_path: PathBuf,
    pub canonical_root: PathBuf,
    pub reverse_host: ProductionReverseHost,
    pub mutation_enabled: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ProductionCutoverReceipt {
    schema: String,
    receipt_id: String,
    profile_id: String,
    phase: String,
    source_owner: String,
    target_owner: String,
    backup_id: String,
    source_schema_version: String,
    target_schema_version: String,
    canonical_manifest_sha256: String,
    durable_summary_sha256: String,
    bundle_fingerprint: String,
    capability_fingerprint: String,
    service_instance_id: Option<String>,
    mutation_enabled: bool,
    updated_at_ms: u64,
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

fn explicit_production_path(path: &Path, suffix: &Path) -> bool {
    path.is_absolute()
        && path.ends_with(suffix)
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
    if manifest.schema != "synthesis-sidecar-runtime-bundle.v3"
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

pub fn rebuild_production_admission(value: &str) -> Result<ProductionAdmission, String> {
    let admission: ProductionAdmission =
        serde_json::from_str(value).map_err(|_| "invalid_production_admission".to_owned())?;
    if admission.schema != "synthesis-production-admission.v1"
        || !matches!(admission.purpose.as_str(), "preflight_copy" | "live_owner")
        || !sha256(&admission.profile_id)
        || !bounded_text(&admission.supervisor_instance_id, 128)
        || !bounded_text(&admission.cutover_receipt_id, 128)
        || !explicit_production_path(
            &admission.cutover_receipt_path,
            Path::new("state/synthesis-cutover/receipt.json"),
        )
        || admission.capability_fingerprint != PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT
        || !explicit_production_path(
            &admission.repository_db_path,
            Path::new("state/synthesis.db"),
        )
        || !explicit_production_path(&admission.canonical_root, Path::new("data/synthesis"))
        || admission.reverse_host.host != "127.0.0.1"
        || admission.reverse_host.port == 0
        || admission.reverse_host.authorization_token.len() < 32
        || admission.reverse_host.authorization_token.len() > 256
        || admission.mutation_enabled
    {
        return Err("invalid_production_admission".into());
    }
    Ok(admission)
}

pub fn read_production_admission(path: &Path) -> Result<ProductionAdmission, String> {
    rebuild_production_admission(&fs::read_to_string(path).map_err(|error| error.to_string())?)
}

pub fn validate_production_cutover_receipt(
    admission: &ProductionAdmission,
    config: &NativeLaunchConfig,
) -> Result<(), String> {
    let receipt: ProductionCutoverReceipt = serde_json::from_str(
        &fs::read_to_string(&admission.cutover_receipt_path)
            .map_err(|_| "production_cutover_receipt_unavailable".to_owned())?,
    )
    .map_err(|_| "production_cutover_receipt_invalid".to_owned())?;
    let valid_phase = match admission.purpose.as_str() {
        "preflight_copy" => {
            receipt.phase == "backup_verified"
                && receipt.service_instance_id.is_none()
                && !receipt.mutation_enabled
        }
        "live_owner" => {
            (receipt.phase == "preflight_verified"
                && receipt.service_instance_id.is_none()
                && !receipt.mutation_enabled)
                || (receipt.phase == "mutation_enabled"
                    && receipt
                        .service_instance_id
                        .as_ref()
                        .is_some_and(|value| bounded_text(value, 128))
                    && receipt.mutation_enabled)
        }
        _ => false,
    };
    if receipt.schema != "synthesis-production-cutover-receipt.v1"
        || receipt.receipt_id != admission.cutover_receipt_id
        || receipt.profile_id != admission.profile_id
        || receipt.profile_id != config.profile_id
        || !valid_phase
        || receipt.source_owner != "legacy-plugin"
        || receipt.target_owner != "rust-native"
        || !sha256(&receipt.backup_id)
        || !bounded_text(&receipt.source_schema_version, 128)
        || !bounded_text(&receipt.target_schema_version, 128)
        || !sha256(&receipt.canonical_manifest_sha256)
        || !sha256(&receipt.durable_summary_sha256)
        || receipt.bundle_fingerprint != config.build_fingerprint
        || receipt.capability_fingerprint != admission.capability_fingerprint
        || receipt.updated_at_ms == 0
    {
        return Err("production_cutover_receipt_invalid".into());
    }
    Ok(())
}

pub fn production_cutover_receipt_is_mutation_enabled(
    admission: &ProductionAdmission,
) -> Result<bool, String> {
    let receipt: ProductionCutoverReceipt = serde_json::from_str(
        &fs::read_to_string(&admission.cutover_receipt_path)
            .map_err(|_| "production_cutover_receipt_unavailable".to_owned())?,
    )
    .map_err(|_| "production_cutover_receipt_invalid".to_owned())?;
    Ok(receipt.phase == "mutation_enabled" && receipt.mutation_enabled)
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

#[cfg(test)]
mod production_admission_tests {
    use super::*;
    use serde_json::json;

    fn admission() -> Value {
        json!({
            "schema":"synthesis-production-admission.v1",
            "purpose":"preflight_copy",
            "profileId":"1".repeat(64),
            "supervisorInstanceId":"supervisor-1",
            "cutoverReceiptId":"receipt-1",
            "cutoverReceiptPath":"/profile/state/synthesis-cutover/receipt.json",
            "capabilityFingerprint":PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
            "repositoryDbPath":"/profile/state/synthesis.db",
            "canonicalRoot":"/profile/data/synthesis",
            "reverseHost":{
                "host":"127.0.0.1",
                "port":9134,
                "authorizationToken":"2".repeat(64)
            },
            "mutationEnabled":false
        })
    }

    fn launch_config() -> NativeLaunchConfig {
        NativeLaunchConfig {
            schema: "synthesis-sidecar-launch-config.v2".into(),
            profile_id: "1".repeat(64),
            profile_runtime_root: PathBuf::from("/profile/runtime"),
            runtime_root_id: "2".repeat(64),
            data_root_id: "3".repeat(64),
            bundle_id: "4".repeat(64),
            implementation: "rust-native".into(),
            target: "linux-x64".into(),
            target_triple: "x86_64-unknown-linux-gnu".into(),
            build_fingerprint: "5".repeat(64),
            platform_signature: json!({
                "scheme":"not-applicable",
                "status":"not-applicable",
                "signer":null
            }),
            service_version: SERVICE_VERSION.into(),
            protocol_version: "synthesis-sidecar.v1".into(),
            schema_version: "schema-1".into(),
            supervisor_instance_id: "supervisor-1".into(),
            lease_nonce: "lease-1".into(),
            client_token: "6".repeat(64),
            lifecycle_token: "7".repeat(64),
            mutation_enabled: false,
            port: 0,
        }
    }

    #[test]
    fn accepts_only_explicit_production_roots_before_mutation_admission() {
        rebuild_production_admission(&admission().to_string()).unwrap();
        let mut shadow = admission();
        shadow["repositoryDbPath"] = json!("/profile/runtime/shadow-repository/root/synthesis.db");
        assert_eq!(
            rebuild_production_admission(&shadow.to_string()).unwrap_err(),
            "invalid_production_admission"
        );
        let mut admitted = admission();
        admitted["mutationEnabled"] = json!(true);
        assert_eq!(
            rebuild_production_admission(&admitted.to_string()).unwrap_err(),
            "invalid_production_admission"
        );
    }

    #[test]
    fn binds_preflight_to_the_durable_backup_verified_receipt() {
        let root = std::env::temp_dir().join(format!(
            "synthesis-cutover-receipt-{}-{}",
            std::process::id(),
            current_time_ms().unwrap()
        ));
        fs::create_dir_all(root.join("state/synthesis-cutover")).unwrap();
        fs::create_dir_all(root.join("state")).unwrap();
        fs::create_dir_all(root.join("data/synthesis")).unwrap();
        let receipt_path = root.join("state/synthesis-cutover/receipt.json");
        let receipt = json!({
            "schema":"synthesis-production-cutover-receipt.v1",
            "receiptId":"receipt-1",
            "profileId":"1".repeat(64),
            "phase":"backup_verified",
            "sourceOwner":"legacy-plugin",
            "targetOwner":"rust-native",
            "backupId":"8".repeat(64),
            "sourceSchemaVersion":"source-1",
            "targetSchemaVersion":"target-1",
            "canonicalManifestSha256":"9".repeat(64),
            "durableSummarySha256":"a".repeat(64),
            "bundleFingerprint":"5".repeat(64),
            "capabilityFingerprint":PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT,
            "serviceInstanceId":null,
            "mutationEnabled":false,
            "updatedAtMs":1
        });
        fs::write(&receipt_path, receipt.to_string()).unwrap();
        let mut value = admission();
        value["repositoryDbPath"] = json!(root.join("state/synthesis.db"));
        value["canonicalRoot"] = json!(root.join("data/synthesis"));
        value["cutoverReceiptPath"] = json!(receipt_path);
        let admission = rebuild_production_admission(&value.to_string()).unwrap();
        validate_production_cutover_receipt(&admission, &launch_config()).unwrap();
        let mut invalid = receipt;
        invalid["phase"] = json!("native_owner");
        fs::write(&admission.cutover_receipt_path, invalid.to_string()).unwrap();
        assert_eq!(
            validate_production_cutover_receipt(&admission, &launch_config(),).unwrap_err(),
            "production_cutover_receipt_invalid"
        );
        fs::remove_dir_all(root).unwrap();
    }
}
