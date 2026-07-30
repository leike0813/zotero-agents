use crate::runtime_file_system::sync_directory;
use serde::Deserialize;
use serde_json::{Value, json};
use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use synthesis_sidecar::runtime_contract::{
    NativeLaunchConfig, ProductionAdmission, current_time_ms,
};

const ACTIVATION_EVIDENCE_MAX_AGE_MS: u64 = 60_000;
const ACTIVATION_EVIDENCE_MAX_FUTURE_SKEW_MS: u64 = 5_000;
const RUNTIME_OWNER_LEASE_TIMEOUT_MS: u64 = 120_000;
const PRODUCTION_SMOKE_ROSTER_VERSION: &str = "synthesis-production-critical-smoke.v1";
const PRODUCTION_SMOKE_CHECK_IDS: &[&str] = &[
    "identity",
    "storage",
    "workbench",
    "topic-list",
    "topic-detail",
    "canonical-manifest",
    "reference-cache",
    "graph-read",
    "worker",
];

fn smoke_aggregate_digest(evidence: &ProductionActivationEvidence) -> String {
    let mut parts = vec![json!(evidence.smoke_roster_version)];
    parts.extend(evidence.smoke_check_ids.iter().map(|value| json!(value)));
    parts.extend(
        evidence
            .smoke_check_digests
            .iter()
            .map(|value| json!(value)),
    );
    parts.extend([
        json!(evidence.profile_id),
        json!(evidence.receipt_id),
        json!(evidence.runtime_admission_generation),
        json!(evidence.service_instance_id),
        json!(evidence.supervisor_instance_id),
        json!(evidence.capability_fingerprint),
    ]);
    synthesis_protocol::canonical_sha256(&parts)
        .unwrap_or_default()
        .trim_start_matches("sha256:")
        .to_owned()
}

fn atomic_write_json(path: &Path, value: &Value) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "runtime_path_invalid".to_owned())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary = parent.join(format!(
        ".{}.tmp-{}",
        std::process::id(),
        current_time_ms()?
    ));
    let bytes = serde_json::to_vec(value).map_err(|error| error.to_string())?;
    let mut file = OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary)
        .map_err(|error| error.to_string())?;
    file.write_all(&bytes).map_err(|error| error.to_string())?;
    file.write_all(b"\n").map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())?;
    drop(file);
    #[cfg(windows)]
    {
        let previous = parent.join(format!(
            ".{}.previous-{}-{}",
            path.file_name()
                .and_then(|name| name.to_str())
                .ok_or_else(|| "runtime_path_invalid".to_owned())?,
            std::process::id(),
            current_time_ms()?
        ));
        let replaced = path.exists();
        if replaced {
            fs::rename(path, &previous).map_err(|error| error.to_string())?;
        }
        if let Err(error) = fs::rename(&temporary, path) {
            if replaced {
                let _ = fs::rename(&previous, path);
            }
            return Err(error.to_string());
        }
        if replaced {
            fs::remove_file(previous).map_err(|error| error.to_string())?;
        }
    }
    #[cfg(not(windows))]
    fs::rename(&temporary, path).map_err(|error| error.to_string())?;
    sync_directory(parent)
}

#[cfg(unix)]
fn process_is_alive(pid: u32) -> bool {
    if pid == 0 || pid > i32::MAX as u32 {
        return false;
    }
    unsafe extern "C" {
        fn kill(pid: i32, signal: i32) -> i32;
    }
    let result = unsafe { kill(pid as i32, 0) };
    result == 0 || io::Error::last_os_error().raw_os_error() == Some(1)
}

#[cfg(windows)]
fn process_is_alive(pid: u32) -> bool {
    use std::ffi::c_void;

    const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
    const STILL_ACTIVE: u32 = 259;
    const ERROR_INVALID_PARAMETER: u32 = 87;
    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn OpenProcess(access: u32, inherit_handle: i32, process_id: u32) -> *mut c_void;
        fn GetExitCodeProcess(process: *mut c_void, exit_code: *mut u32) -> i32;
        fn CloseHandle(handle: *mut c_void) -> i32;
        fn GetLastError() -> u32;
    }

    if pid == 0 {
        return false;
    }
    let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid) };
    if handle.is_null() {
        return unsafe { GetLastError() } != ERROR_INVALID_PARAMETER;
    }
    let mut exit_code = 0;
    let queried = unsafe { GetExitCodeProcess(handle, &mut exit_code) } != 0;
    unsafe {
        CloseHandle(handle);
    }
    !queried || exit_code == STILL_ACTIVE
}

#[cfg(not(any(unix, windows)))]
fn process_is_alive(_pid: u32) -> bool {
    true
}

fn required_json_str<'a>(value: &'a Value, key: &str) -> Result<&'a str, String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| "runtime_owner_invalid".to_owned())
}

fn required_json_u32(value: &Value, key: &str) -> Result<u32, String> {
    value
        .get(key)
        .and_then(Value::as_u64)
        .and_then(|value| u32::try_from(value).ok())
        .ok_or_else(|| "runtime_owner_invalid".to_owned())
}

#[derive(Debug)]
pub(crate) struct RuntimeOwnership {
    owner_path: PathBuf,
    discovery_path: PathBuf,
    pub(crate) service_instance_id: String,
}

impl RuntimeOwnership {
    pub(crate) fn acquire(config: &NativeLaunchConfig) -> Result<Self, String> {
        Self::acquire_with_process_probe(config, process_is_alive)
    }

    fn acquire_with_process_probe(
        config: &NativeLaunchConfig,
        is_process_alive: impl Fn(u32) -> bool,
    ) -> Result<Self, String> {
        let owner_dir = config.profile_runtime_root.join("owner");
        fs::create_dir_all(&owner_dir).map_err(|error| error.to_string())?;
        let owner_path = owner_dir.join("owner.json");
        let service_instance_id = format!("rust-{}", std::process::id());
        let owner = json!({
            "schema":"synthesis-sidecar-owner.v1",
            "profileId":config.profile_id,
            "supervisorInstanceId":config.supervisor_instance_id,
            "serviceInstanceId":service_instance_id,
            "leaseNonce":config.lease_nonce,
            "pid":std::process::id(),
            "createdAtMs":current_time_ms()?,
        });
        for _ in 0..2 {
            match OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&owner_path)
            {
                Ok(mut file) => {
                    serde_json::to_writer(&mut file, &owner).map_err(|error| error.to_string())?;
                    file.write_all(b"\n").map_err(|error| error.to_string())?;
                    file.sync_all().map_err(|error| error.to_string())?;
                    let discovery_path = config.profile_runtime_root.join("discovery.json");
                    match fs::remove_file(&discovery_path) {
                        Ok(()) => {}
                        Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                        Err(_) => {
                            let _ = fs::remove_file(&owner_path);
                            return Err("sidecar_discovery_cleanup_failed".into());
                        }
                    }
                    return Ok(Self {
                        owner_path,
                        discovery_path,
                        service_instance_id,
                    });
                }
                Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
                    let existing = fs::read(&owner_path)
                        .ok()
                        .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
                        .ok_or_else(|| "sidecar_owner_invalid".to_owned())?;
                    if required_json_str(&existing, "schema")
                        .map_err(|_| "sidecar_owner_invalid".to_owned())?
                        != "synthesis-sidecar-owner.v1"
                    {
                        return Err("sidecar_owner_invalid".into());
                    }
                    let pid = required_json_u32(&existing, "pid")
                        .map_err(|_| "sidecar_owner_invalid".to_owned())?;
                    if is_process_alive(pid) {
                        return Err("sidecar_owner_conflict".into());
                    }
                    let supervisor_instance_id =
                        required_json_str(&existing, "supervisorInstanceId")
                            .map_err(|_| "sidecar_owner_invalid".to_owned())?;
                    let lease_nonce = required_json_str(&existing, "leaseNonce")
                        .map_err(|_| "sidecar_owner_invalid".to_owned())?;
                    let same_supervisor = supervisor_instance_id == config.supervisor_instance_id
                        && lease_nonce == config.lease_nonce;
                    let lease_allows_recovery = if same_supervisor {
                        true
                    } else {
                        let lease_path = config
                            .profile_runtime_root
                            .join("sessions")
                            .join(supervisor_instance_id)
                            .join("lease.json");
                        fs::read(&lease_path)
                            .ok()
                            .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
                            .is_none_or(|lease| {
                                lease.get("profileId").and_then(Value::as_str)
                                    != existing.get("profileId").and_then(Value::as_str)
                                    || lease.get("supervisorInstanceId").and_then(Value::as_str)
                                        != Some(supervisor_instance_id)
                                    || lease.get("leaseNonce").and_then(Value::as_str)
                                        != Some(lease_nonce)
                                    || lease.get("updatedAtMs").and_then(Value::as_u64).is_none_or(
                                        |updated_at_ms| {
                                            current_time_ms()
                                                .unwrap_or_default()
                                                .saturating_sub(updated_at_ms)
                                                > RUNTIME_OWNER_LEASE_TIMEOUT_MS
                                        },
                                    )
                            })
                    };
                    if !lease_allows_recovery {
                        return Err("sidecar_owner_lease_fresh".into());
                    }
                    let tombstone = config.profile_runtime_root.join(format!(
                        "owner.stale-{}-{}",
                        std::process::id(),
                        current_time_ms()?
                    ));
                    match fs::rename(&owner_dir, &tombstone) {
                        Ok(()) => {
                            fs::remove_dir_all(&tombstone)
                                .map_err(|_| "sidecar_owner_recovery_failed".to_owned())?;
                            fs::create_dir(&owner_dir)
                                .map_err(|_| "sidecar_owner_recovery_failed".to_owned())?;
                        }
                        Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                        Err(_) => return Err("sidecar_owner_recovery_failed".into()),
                    }
                }
                Err(error) => return Err(error.to_string()),
            }
        }
        Err("sidecar_owner_acquire_failed".into())
    }

    pub(crate) fn publish_discovery(&self, document: &Value) -> Result<(), String> {
        atomic_write_json(&self.discovery_path, document)
    }
}

impl Drop for RuntimeOwnership {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.discovery_path);
        let _ = fs::remove_file(&self.owner_path);
        if let Some(owner_dir) = self.owner_path.parent() {
            let _ = fs::remove_dir(owner_dir);
        }
    }
}

#[cfg(test)]
mod runtime_owner_tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_ROOT_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    fn config() -> NativeLaunchConfig {
        let profile_runtime_root = std::env::temp_dir().join(format!(
            "synthesis-runtime-owner-{}-{}",
            std::process::id(),
            TEST_ROOT_SEQUENCE.fetch_add(1, Ordering::Relaxed),
        ));
        NativeLaunchConfig {
            schema: "synthesis-sidecar-launch-config.v1".into(),
            profile_id: "1".repeat(64),
            profile_runtime_root,
            runtime_root_id: "2".repeat(64),
            data_root_id: "3".repeat(64),
            bundle_id: "4".repeat(64),
            implementation: "rust-native".into(),
            target: "linux-x64".into(),
            target_triple: "x86_64-unknown-linux-gnu".into(),
            build_fingerprint: "5".repeat(64),
            platform_signature: serde_json::from_value(json!({
                "scheme":"not-applicable",
                "status":"not-applicable",
                "signer":null
            }))
            .unwrap(),
            service_version: "0.1.0".into(),
            protocol_version: "synthesis-sidecar.v1".into(),
            schema_version: "1.0.0".into(),
            supervisor_instance_id: "supervisor-current".into(),
            lease_nonce: "lease-current".into(),
            client_token: "6".repeat(64),
            lifecycle_token: "7".repeat(64),
            mutation_enabled: false,
            port: 0,
        }
    }

    #[test]
    fn runtime_owner_reclaims_a_dead_owner_and_discards_stale_discovery() {
        let config = config();
        let owner_dir = config.profile_runtime_root.join("owner");
        fs::create_dir_all(&owner_dir).unwrap();
        fs::write(
            owner_dir.join("owner.json"),
            serde_json::to_vec(&json!({
                "schema":"synthesis-sidecar-owner.v1",
                "profileId":config.profile_id,
                "supervisorInstanceId":"supervisor-old",
                "serviceInstanceId":"service-old",
                "leaseNonce":"lease-old",
                "pid":1234,
                "createdAtMs":1
            }))
            .unwrap(),
        )
        .unwrap();
        fs::write(
            config.profile_runtime_root.join("discovery.json"),
            b"{\"serviceInstanceId\":\"service-old\"}",
        )
        .unwrap();

        let owner = RuntimeOwnership::acquire_with_process_probe(&config, |_| false).unwrap();

        assert!(!config.profile_runtime_root.join("discovery.json").exists());
        drop(owner);
        fs::remove_dir_all(config.profile_runtime_root).unwrap();
    }

    #[test]
    fn runtime_owner_preserves_a_live_owner() {
        let config = config();
        let first = RuntimeOwnership::acquire_with_process_probe(&config, |_| false).unwrap();
        assert_eq!(
            RuntimeOwnership::acquire_with_process_probe(&config, |_| true).unwrap_err(),
            "sidecar_owner_conflict"
        );
        drop(first);
        fs::remove_dir_all(config.profile_runtime_root).unwrap();
    }
}

#[derive(Debug)]
pub(crate) struct ProductionOwnership {
    owner_path: PathBuf,
    activation_path: PathBuf,
    service_instance_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct ProductionActivationEvidence {
    pub(crate) receipt_id: String,
    pub(crate) runtime_admission_generation: u64,
    pub(crate) profile_id: String,
    pub(crate) service_instance_id: String,
    pub(crate) supervisor_instance_id: String,
    pub(crate) capability_fingerprint: String,
    pub(crate) ready_client_capabilities: Vec<String>,
    pub(crate) smoke_roster_version: String,
    pub(crate) smoke_check_ids: Vec<String>,
    pub(crate) smoke_check_digests: Vec<String>,
    pub(crate) smoke_evidence_digest: String,
    pub(crate) issued_at_ms: u64,
}

impl ProductionOwnership {
    pub(crate) fn require_repair_for_partial_activation(
        admission: &ProductionAdmission,
        receipt_mutation_enabled: bool,
    ) -> Result<(), String> {
        let state_root = admission
            .repository_db_path
            .parent()
            .ok_or_else(|| "production_owner_path_invalid".to_owned())?;
        if state_root.join("native-activation.json").exists() && !receipt_mutation_enabled {
            return Err("rust_only_repair_required".into());
        }
        Ok(())
    }

    pub(crate) fn acquire(
        admission: &ProductionAdmission,
        service_instance_id: &str,
        mutation_enabled: bool,
    ) -> Result<Self, String> {
        Self::acquire_with_process_probe(
            admission,
            service_instance_id,
            mutation_enabled,
            process_is_alive,
        )
    }

    fn acquire_with_process_probe(
        admission: &ProductionAdmission,
        service_instance_id: &str,
        mutation_enabled: bool,
        is_process_alive: impl Fn(u32) -> bool,
    ) -> Result<Self, String> {
        if admission.purpose != "live_owner"
            || service_instance_id.is_empty()
            || service_instance_id.len() > 128
        {
            return Err("production_owner_identity_invalid".into());
        }
        let state_root = admission
            .repository_db_path
            .parent()
            .ok_or_else(|| "production_owner_path_invalid".to_owned())?;
        let owner_path = state_root.join("synthesis.owner.json");
        let owner = json!({
            "schema":"synthesis-production-owner.v1",
            "profileId":admission.profile_id,
            "supervisorInstanceId":admission.supervisor_instance_id,
            "serviceInstanceId":service_instance_id,
            "cutoverReceiptId":admission.cutover_receipt_id,
            "capabilityFingerprint":admission.capability_fingerprint,
            "repositoryDbPath":admission.repository_db_path,
            "canonicalRoot":admission.canonical_root,
            "mutationEnabled":mutation_enabled,
            "pid":std::process::id(),
            "createdAtMs":current_time_ms()?
        });
        for _ in 0..2 {
            match OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&owner_path)
            {
                Ok(mut file) => {
                    serde_json::to_writer(&mut file, &owner).map_err(|error| error.to_string())?;
                    file.write_all(b"\n").map_err(|error| error.to_string())?;
                    file.sync_all().map_err(|error| error.to_string())?;
                    if mutation_enabled {
                        match fs::remove_file(state_root.join("native-activation.json")) {
                            Ok(()) => {}
                            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                            Err(_) => {
                                let _ = fs::remove_file(&owner_path);
                                return Err("production_activation_cleanup_failed".into());
                            }
                        }
                    }
                    return Ok(Self {
                        activation_path: state_root.join("native-activation.json"),
                        owner_path,
                        service_instance_id: service_instance_id.to_owned(),
                    });
                }
                Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
                    let existing = fs::read(&owner_path)
                        .ok()
                        .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
                        .ok_or_else(|| "production_owner_invalid".to_owned())?;
                    let pid = required_json_u32(&existing, "pid")
                        .map_err(|_| "production_owner_invalid".to_owned())?;
                    if is_process_alive(pid) {
                        return Err("production_owner_conflict".into());
                    }
                    let identity_matches = existing.get("schema").and_then(Value::as_str)
                        == Some("synthesis-production-owner.v1")
                        && existing.get("profileId").and_then(Value::as_str)
                            == Some(admission.profile_id.as_str())
                        && existing.get("cutoverReceiptId").and_then(Value::as_str)
                            == Some(admission.cutover_receipt_id.as_str())
                        && existing
                            .get("capabilityFingerprint")
                            .and_then(Value::as_str)
                            == Some(admission.capability_fingerprint.as_str());
                    if !identity_matches {
                        return Err("production_owner_identity_mismatch".into());
                    }
                    let tombstone = state_root.join(format!(
                        "synthesis.owner.stale-{}-{}.json",
                        std::process::id(),
                        current_time_ms()?
                    ));
                    match fs::rename(&owner_path, &tombstone) {
                        Ok(()) => {
                            fs::remove_file(&tombstone)
                                .map_err(|_| "production_owner_recovery_failed".to_owned())?;
                        }
                        Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                        Err(_) => return Err("production_owner_recovery_failed".into()),
                    }
                }
                Err(error) => return Err(error.to_string()),
            }
        }
        Err("production_owner_acquire_failed".into())
    }

    pub(crate) fn activate(
        &self,
        admission: &ProductionAdmission,
        evidence: &ProductionActivationEvidence,
        ready_client_capabilities: &[&str],
    ) -> Result<(), String> {
        let now = current_time_ms()?;
        if evidence.issued_at_ms > now.saturating_add(ACTIVATION_EVIDENCE_MAX_FUTURE_SKEW_MS)
            || now.saturating_sub(evidence.issued_at_ms) > ACTIVATION_EVIDENCE_MAX_AGE_MS
        {
            return Err("production_activation_expired".into());
        }
        if self.activation_path.exists() {
            return Err("production_activation_replayed".into());
        }
        let valid_digest = |value: &str| {
            value.len() == 64
                && value
                    .bytes()
                    .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
        };
        let valid_roster = evidence.smoke_roster_version == PRODUCTION_SMOKE_ROSTER_VERSION
            && evidence.smoke_check_ids
                == PRODUCTION_SMOKE_CHECK_IDS
                    .iter()
                    .map(|value| (*value).to_owned())
                    .collect::<Vec<_>>()
            && evidence.smoke_check_digests.len() == PRODUCTION_SMOKE_CHECK_IDS.len()
            && evidence
                .smoke_check_digests
                .iter()
                .all(|value| valid_digest(value));
        if evidence.receipt_id != admission.cutover_receipt_id
            || evidence.runtime_admission_generation
                != admission.runtime_admission_generation.unwrap_or(1)
            || evidence.profile_id != admission.profile_id
            || evidence.service_instance_id != self.service_instance_id
            || evidence.supervisor_instance_id != admission.supervisor_instance_id
            || evidence.capability_fingerprint != admission.capability_fingerprint
            || evidence.ready_client_capabilities
                != ready_client_capabilities
                    .iter()
                    .map(|value| (*value).to_owned())
                    .collect::<Vec<_>>()
            || !valid_digest(&evidence.smoke_evidence_digest)
            || !valid_roster
            || evidence.smoke_evidence_digest != smoke_aggregate_digest(evidence)
        {
            return Err("production_activation_identity_mismatch".into());
        }
        let activated_at_ms = current_time_ms()?;
        atomic_write_json(
            &self.activation_path,
            &json!({
                "schema":"synthesis-native-activation.v1",
                "profileId":admission.profile_id,
                "supervisorInstanceId":admission.supervisor_instance_id,
                "serviceInstanceId":self.service_instance_id,
                "cutoverReceiptId":admission.cutover_receipt_id,
                "runtimeAdmissionGeneration":evidence.runtime_admission_generation,
                "capabilityFingerprint":admission.capability_fingerprint,
                "readyClientCapabilities":ready_client_capabilities,
                "smokeRosterVersion":evidence.smoke_roster_version,
                "smokeCheckIds":evidence.smoke_check_ids,
                "smokeCheckDigests":evidence.smoke_check_digests,
                "smokeEvidenceDigest":evidence.smoke_evidence_digest,
                "mutationEnabled":true,
                "activatedAtMs":activated_at_ms,
            }),
        )?;
        atomic_write_json(
            &self.owner_path,
            &json!({
                "schema":"synthesis-production-owner.v1",
                "profileId":admission.profile_id,
                "supervisorInstanceId":admission.supervisor_instance_id,
                "serviceInstanceId":self.service_instance_id,
                "cutoverReceiptId":admission.cutover_receipt_id,
                "runtimeAdmissionGeneration":evidence.runtime_admission_generation,
                "capabilityFingerprint":admission.capability_fingerprint,
                "repositoryDbPath":admission.repository_db_path,
                "canonicalRoot":admission.canonical_root,
                "mutationEnabled":true,
                "pid":std::process::id(),
                "activatedAtMs":activated_at_ms,
            }),
        )
    }
}

impl Drop for ProductionOwnership {
    fn drop(&mut self) {
        let owned = fs::read(&self.owner_path)
            .ok()
            .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
            .and_then(|value| {
                value
                    .get("serviceInstanceId")
                    .and_then(Value::as_str)
                    .map(str::to_owned)
            })
            .is_some_and(|service_instance_id| service_instance_id == self.service_instance_id);
        if owned {
            let _ = fs::remove_file(&self.owner_path);
            let _ = fs::remove_file(&self.activation_path);
        }
    }
}

#[cfg(test)]
mod production_owner_tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};
    use synthesis_sidecar::production_capabilities::{
        PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT, READY_PRODUCTION_CLIENT_CAPABILITIES,
    };
    use synthesis_sidecar::runtime_contract::{ProductionAdmission, ProductionReverseHost};

    static TEST_ROOT_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    fn root() -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "synthesis-production-owner-{}-{}",
            std::process::id(),
            TEST_ROOT_SEQUENCE.fetch_add(1, Ordering::Relaxed),
        ));
        fs::create_dir_all(root.join("state")).unwrap();
        fs::create_dir_all(root.join("data/synthesis")).unwrap();
        fs::write(root.join("state/synthesis.db"), []).unwrap();
        root
    }

    fn admission(root: &Path) -> ProductionAdmission {
        ProductionAdmission {
            schema: "synthesis-production-admission.v1".into(),
            purpose: "live_owner".into(),
            profile_id: "1".repeat(64),
            supervisor_instance_id: "supervisor-1".into(),
            cutover_receipt_id: "receipt-1".into(),
            cutover_receipt_path: root.join("state/synthesis-cutover/receipt.json"),
            runtime_admission_state_path: None,
            runtime_admission_generation: None,
            capability_fingerprint: PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT.into(),
            repository_db_path: root.join("state/synthesis.db"),
            canonical_root: root.join("data/synthesis"),
            reverse_host: ProductionReverseHost {
                host: "127.0.0.1".into(),
                port: 9134,
                authorization_token: "2".repeat(64),
            },
            mutation_enabled: false,
        }
    }

    fn activation_evidence() -> ProductionActivationEvidence {
        let mut evidence = ProductionActivationEvidence {
            receipt_id: "receipt-1".into(),
            runtime_admission_generation: 1,
            profile_id: "1".repeat(64),
            service_instance_id: "service-1".into(),
            supervisor_instance_id: "supervisor-1".into(),
            capability_fingerprint: PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT.into(),
            ready_client_capabilities: READY_PRODUCTION_CLIENT_CAPABILITIES
                .iter()
                .map(|capability| (*capability).to_owned())
                .collect(),
            smoke_evidence_digest: String::new(),
            smoke_roster_version: PRODUCTION_SMOKE_ROSTER_VERSION.into(),
            smoke_check_ids: PRODUCTION_SMOKE_CHECK_IDS
                .iter()
                .map(|value| (*value).into())
                .collect(),
            smoke_check_digests: PRODUCTION_SMOKE_CHECK_IDS
                .iter()
                .map(|_| "4".repeat(64))
                .collect(),
            issued_at_ms: current_time_ms().unwrap(),
        };
        evidence.smoke_evidence_digest = smoke_aggregate_digest(&evidence);
        evidence
    }

    #[test]
    fn production_owner_is_exclusive_and_released_by_its_instance() {
        let root = root();
        let admission = admission(&root);
        let owner = ProductionOwnership::acquire(&admission, "service-1", false).unwrap();
        assert_eq!(
            ProductionOwnership::acquire(&admission, "service-2", false).unwrap_err(),
            "production_owner_conflict"
        );
        drop(owner);
        ProductionOwnership::acquire(&admission, "service-2", false).unwrap();
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn production_owner_reclaims_dead_matching_identity_and_stale_activation() {
        let root = root();
        let admission = admission(&root);
        fs::write(
            root.join("state/synthesis.owner.json"),
            serde_json::to_vec(&json!({
                "schema":"synthesis-production-owner.v1",
                "profileId":admission.profile_id,
                "supervisorInstanceId":"supervisor-old",
                "serviceInstanceId":"service-old",
                "cutoverReceiptId":admission.cutover_receipt_id,
                "capabilityFingerprint":admission.capability_fingerprint,
                "pid":1234
            }))
            .unwrap(),
        )
        .unwrap();
        fs::write(root.join("state/native-activation.json"), b"{}").unwrap();

        let owner = ProductionOwnership::acquire_with_process_probe(
            &admission,
            "service-current",
            true,
            |_| false,
        )
        .unwrap();

        assert!(!root.join("state/native-activation.json").exists());
        drop(owner);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn activation_requires_current_identity_and_rejects_replay() {
        let root = root();
        let admission = admission(&root);
        let owner = ProductionOwnership::acquire(&admission, "service-1", false).unwrap();
        let evidence = activation_evidence();

        for invalid in [
            ProductionActivationEvidence {
                receipt_id: "receipt-2".into(),
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                runtime_admission_generation: 2,
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                profile_id: "2".repeat(64),
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                supervisor_instance_id: "supervisor-2".into(),
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                smoke_roster_version: "synthesis-production-critical-smoke.v2".into(),
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                service_instance_id: "service-2".into(),
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                capability_fingerprint: "4".repeat(64),
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                ready_client_capabilities: vec!["client.listTopics".into()],
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                smoke_check_ids: vec!["identity".into()],
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                smoke_check_ids: vec!["identity".into(); PRODUCTION_SMOKE_CHECK_IDS.len()],
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                smoke_check_ids: PRODUCTION_SMOKE_CHECK_IDS
                    .iter()
                    .enumerate()
                    .map(|(index, value)| {
                        if index == 0 {
                            "unknown".into()
                        } else {
                            (*value).into()
                        }
                    })
                    .collect(),
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                smoke_check_digests: vec!["4".repeat(64)],
                ..activation_evidence()
            },
            ProductionActivationEvidence {
                smoke_evidence_digest: "9".repeat(64),
                ..activation_evidence()
            },
        ] {
            assert_eq!(
                owner
                    .activate(&admission, &invalid, READY_PRODUCTION_CLIENT_CAPABILITIES)
                    .unwrap_err(),
                "production_activation_identity_mismatch"
            );
        }

        assert_eq!(
            owner
                .activate(
                    &admission,
                    &ProductionActivationEvidence {
                        issued_at_ms: 0,
                        ..activation_evidence()
                    },
                    READY_PRODUCTION_CLIENT_CAPABILITIES,
                )
                .unwrap_err(),
            "production_activation_expired"
        );

        owner
            .activate(&admission, &evidence, READY_PRODUCTION_CLIENT_CAPABILITIES)
            .unwrap();
        assert_eq!(
            owner
                .activate(&admission, &evidence, READY_PRODUCTION_CLIENT_CAPABILITIES)
                .unwrap_err(),
            "production_activation_replayed"
        );
        drop(owner);
        fs::remove_dir_all(root).unwrap();
    }
}
