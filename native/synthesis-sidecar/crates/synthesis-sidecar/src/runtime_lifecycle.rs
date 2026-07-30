use crate::runtime_file_system::sync_directory;
use serde_json::Value;
use std::fs::{self, File, OpenOptions, TryLockError};
use std::io::Write;
use std::path::{Path, PathBuf};
use synthesis_sidecar::runtime_contract::{NativeLaunchConfig, current_time_ms};

fn atomic_write_json(path: &Path, value: &Value) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "runtime_path_invalid".to_owned())?;
    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    let temporary = parent.join(format!(
        ".discovery.tmp-{}-{}",
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
            ".discovery.previous-{}-{}",
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

#[derive(Debug)]
pub(crate) struct RuntimeOwnership {
    _production_lock: File,
    discovery_path: PathBuf,
    pub(crate) service_instance_id: String,
}

impl RuntimeOwnership {
    pub(crate) fn acquire(config: &NativeLaunchConfig) -> Result<Self, String> {
        let state_root = config
            .repository_db_path
            .parent()
            .ok_or_else(|| "production_lock_path_invalid".to_owned())?;
        fs::create_dir_all(state_root).map_err(|error| error.to_string())?;
        let lock_path = state_root.join("synthesis.lock");
        let lock = OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(lock_path)
            .map_err(|error| error.to_string())?;
        match lock.try_lock() {
            Ok(()) => {}
            Err(TryLockError::WouldBlock) => return Err("production_lock_conflict".into()),
            Err(TryLockError::Error(error)) => return Err(error.to_string()),
        }
        Ok(Self {
            _production_lock: lock,
            discovery_path: config.profile_runtime_root.join("discovery.json"),
            service_instance_id: format!("rust-{}", std::process::id()),
        })
    }

    pub(crate) fn publish_discovery(&self, document: &Value) -> Result<(), String> {
        atomic_write_json(&self.discovery_path, document)
    }
}

impl Drop for RuntimeOwnership {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.discovery_path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::sync::atomic::{AtomicU64, Ordering};
    use synthesis_sidecar::runtime_contract::ProductionReverseHost;

    static SEQUENCE: AtomicU64 = AtomicU64::new(0);

    fn config(root: &Path) -> NativeLaunchConfig {
        NativeLaunchConfig {
            schema: "synthesis-sidecar-launch-config.v3".into(),
            profile_id: "1".repeat(64),
            profile_runtime_root: root.join("runtime/session"),
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
            service_version: env!("CARGO_PKG_VERSION").into(),
            protocol_version: "synthesis-sidecar.v1".into(),
            schema_version: "synthesis-repository-foundation.v1".into(),
            supervisor_instance_id: "supervisor-1".into(),
            repository_db_path: root.join("state/synthesis.db"),
            canonical_root: root.join("data/synthesis"),
            reverse_host: ProductionReverseHost {
                host: "127.0.0.1".into(),
                port: 9134,
                authorization_token: "6".repeat(64),
            },
            client_token: "7".repeat(64),
            lifecycle_token: "8".repeat(64),
            port: 0,
        }
    }

    #[test]
    fn holds_the_production_lock_for_process_lifetime() {
        let root = std::env::temp_dir().join(format!(
            "synthesis-production-lock-{}-{}",
            std::process::id(),
            SEQUENCE.fetch_add(1, Ordering::Relaxed)
        ));
        let config = config(&root);
        let first = RuntimeOwnership::acquire(&config).expect("first lock");
        assert_eq!(
            RuntimeOwnership::acquire(&config).unwrap_err(),
            "production_lock_conflict"
        );
        drop(first);
        RuntimeOwnership::acquire(&config).expect("lock after release");
        let _ = fs::remove_dir_all(root);
    }
}
