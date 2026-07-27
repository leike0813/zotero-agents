use serde::Deserialize;
use serde_json::{Value, json};
use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use synthesis_sidecar::runtime_contract::{
    NativeLaunchConfig, ProductionAdmission, current_time_ms,
};

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
    fs::rename(&temporary, path).map_err(|error| error.to_string())?;
    OpenOptions::new()
        .read(true)
        .open(parent)
        .and_then(|directory| directory.sync_all())
        .map_err(|error| error.to_string())
}

pub(crate) struct RuntimeOwnership {
    owner_path: PathBuf,
    discovery_path: PathBuf,
    pub(crate) service_instance_id: String,
}

impl RuntimeOwnership {
    pub(crate) fn acquire(config: &NativeLaunchConfig) -> Result<Self, String> {
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
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&owner_path)
            .map_err(|error| {
                if error.kind() == io::ErrorKind::AlreadyExists {
                    "sidecar_owner_conflict".to_owned()
                } else {
                    error.to_string()
                }
            })?;
        serde_json::to_writer(&mut file, &owner).map_err(|error| error.to_string())?;
        file.write_all(b"\n").map_err(|error| error.to_string())?;
        Ok(Self {
            owner_path,
            discovery_path: config.profile_runtime_root.join("discovery.json"),
            service_instance_id,
        })
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
    pub(crate) service_instance_id: String,
    pub(crate) capability_fingerprint: String,
    pub(crate) ready_client_capabilities: Vec<String>,
    pub(crate) smoke_evidence_digest: String,
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
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&owner_path)
            .map_err(|error| {
                if error.kind() == io::ErrorKind::AlreadyExists {
                    "production_owner_conflict".to_owned()
                } else {
                    error.to_string()
                }
            })?;
        serde_json::to_writer(&mut file, &owner).map_err(|error| error.to_string())?;
        file.write_all(b"\n").map_err(|error| error.to_string())?;
        file.sync_all().map_err(|error| error.to_string())?;
        Ok(Self {
            activation_path: state_root.join("native-activation.json"),
            owner_path,
            service_instance_id: service_instance_id.to_owned(),
        })
    }

    pub(crate) fn activate(
        &self,
        admission: &ProductionAdmission,
        evidence: &ProductionActivationEvidence,
        ready_client_capabilities: &[&str],
    ) -> Result<(), String> {
        let valid_digest = evidence.smoke_evidence_digest.len() == 64
            && evidence
                .smoke_evidence_digest
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase());
        if evidence.receipt_id != admission.cutover_receipt_id
            || evidence.service_instance_id != self.service_instance_id
            || evidence.capability_fingerprint != admission.capability_fingerprint
            || evidence.ready_client_capabilities
                != ready_client_capabilities
                    .iter()
                    .map(|value| (*value).to_owned())
                    .collect::<Vec<_>>()
            || !valid_digest
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
                "capabilityFingerprint":admission.capability_fingerprint,
                "readyClientCapabilities":ready_client_capabilities,
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
    use synthesis_sidecar::production_capabilities::PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT;
    use synthesis_sidecar::runtime_contract::{ProductionAdmission, ProductionReverseHost};

    fn root() -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "synthesis-production-owner-{}-{}",
            std::process::id(),
            current_time_ms().unwrap()
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
}
