use serde_json::json;
use std::path::Path;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};
use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
use synthesis_repository::{Repository, RepositoryIdentity};
use synthesis_sidecar::production_capabilities::{
    production_client_capabilities, production_client_operation_metadata,
    production_ready_client_capabilities,
};
use synthesis_sidecar::runtime_contract::{
    current_time_ms, production_cutover_receipt_is_mutation_enabled, read_native_launch_config,
    read_production_admission, validate_host_lease, validate_production_cutover_receipt,
};

use crate::runtime_capabilities::ServeState;
use crate::runtime_lifecycle::{ProductionOwnership, RuntimeOwnership};
use crate::runtime_production_ports::build_production_applications;
use crate::runtime_reverse_host::probe_reverse_host;
use crate::runtime_server_loop::run_sidecar_listener;
use crate::runtime_transfer::NativeTransferOwner;
use crate::runtime_worker_pool::NativeComputePool;

pub(crate) fn preflight_production(config_path: &str, admission_path: &str) -> Result<(), String> {
    production_client_capabilities()?;
    let config = read_native_launch_config(Path::new(config_path))?;
    let admission = read_production_admission(Path::new(admission_path))?;
    if admission.purpose != "preflight_copy"
        || admission.profile_id != config.profile_id
        || admission.supervisor_instance_id != config.supervisor_instance_id
    {
        return Err("production_preflight_identity_mismatch".into());
    }
    validate_production_cutover_receipt(&admission, &config)?;
    let lease_path = Path::new(config_path)
        .parent()
        .ok_or_else(|| "invalid_config".to_owned())?
        .join("lease.json");
    validate_host_lease(&lease_path, &config)?;
    probe_reverse_host(&admission)?;
    let repository = Repository::open_production(
        &admission.repository_db_path,
        RepositoryIdentity {
            profile_id: config.profile_id.clone(),
            data_root_id: config.data_root_id.clone(),
        },
        &current_time_ms()?.to_string(),
    )?;
    let inventory = repository.schema_inventory()?;
    let canonical = CanonicalStore::open_production(
        &admission.canonical_root,
        CanonicalIdentity {
            profile_id: config.profile_id.clone(),
            data_root_id: config.data_root_id.clone(),
        },
    )?;
    let repository_id = repository.repository_id().to_owned();
    let canonical_id = canonical.store_id().to_owned();
    canonical.close()?;
    repository.close()?;
    println!(
        "{}",
        json!({
            "type":"production-preflight",
            "status":"ready",
            "profileId":config.profile_id,
            "cutoverReceiptId":admission.cutover_receipt_id,
            "capabilityFingerprint":admission.capability_fingerprint,
            "repositoryId":repository_id,
            "canonicalStoreId":canonical_id,
            "schemaInventory":inventory,
            "mutationEnabled":false
        })
    );
    Ok(())
}

pub(crate) fn serve(config_path: &str) -> Result<(), String> {
    serve_internal(config_path, None)
}

pub(crate) fn serve_production(config_path: &str, admission_path: &str) -> Result<(), String> {
    serve_internal(config_path, Some(admission_path))
}

fn serve_internal(config_path: &str, admission_path: Option<&str>) -> Result<(), String> {
    production_client_capabilities()?;
    production_ready_client_capabilities()?;
    let production_client_operations = production_client_operation_metadata()?;
    let config = read_native_launch_config(Path::new(config_path))?;
    let admission = admission_path
        .map(|path| read_production_admission(Path::new(path)))
        .transpose()?;
    if admission.as_ref().is_some_and(|admission| {
        admission.purpose != "live_owner"
            || admission.profile_id != config.profile_id
            || admission.supervisor_instance_id != config.supervisor_instance_id
    }) {
        return Err("production_owner_identity_mismatch".into());
    }
    if let Some(admission) = admission.as_ref() {
        validate_production_cutover_receipt(admission, &config)?;
    }
    let mutation_enabled = admission
        .as_ref()
        .map(production_cutover_receipt_is_mutation_enabled)
        .transpose()?
        .unwrap_or(false);
    if let Some(admission) = admission.as_ref() {
        ProductionOwnership::require_repair_for_partial_activation(admission, mutation_enabled)?;
    }
    let lease_path = Path::new(config_path)
        .parent()
        .ok_or_else(|| "invalid_config".to_owned())?
        .join("lease.json");
    validate_host_lease(&lease_path, &config)?;
    let ownership = Arc::new(RuntimeOwnership::acquire(&config)?);
    let production_ownership = admission
        .as_ref()
        .map(|admission| {
            ProductionOwnership::acquire(
                admission,
                &ownership.service_instance_id,
                mutation_enabled,
            )
        })
        .transpose()?
        .map(|ownership| Arc::new(Mutex::new(ownership)));
    let repository_identity = RepositoryIdentity {
        profile_id: config.profile_id.clone(),
        data_root_id: config.data_root_id.clone(),
    };
    let canonical_identity = CanonicalIdentity {
        profile_id: config.profile_id.clone(),
        data_root_id: config.data_root_id.clone(),
    };
    let repository = match admission.as_ref() {
        Some(admission) => Repository::open_production(
            &admission.repository_db_path,
            repository_identity,
            &current_time_ms()?.to_string(),
        )?,
        None => Repository::open(&config.profile_runtime_root, repository_identity)?,
    };
    let canonical = match admission.as_ref() {
        Some(admission) => {
            CanonicalStore::open_production(&admission.canonical_root, canonical_identity)?
        }
        None => CanonicalStore::open(&config.profile_runtime_root, canonical_identity)?,
    };
    let repository_id = repository.repository_id().to_owned();
    let repository = Arc::new(Mutex::new(repository));
    let canonical = Arc::new(Mutex::new(canonical));
    let compute_pool = Arc::new(NativeComputePool::new());
    let webdav_state_path = admission
        .as_ref()
        .and_then(|admission| Path::new(&admission.repository_db_path).parent())
        .unwrap_or_else(|| Path::new(&config.profile_runtime_root))
        .join("native-webdav-state.json");
    let admission = admission.map(Arc::new);
    let applications = build_production_applications(
        Arc::clone(&repository),
        Arc::clone(&canonical),
        Arc::clone(&compute_pool),
        admission.clone(),
        ownership.service_instance_id.clone(),
        webdav_state_path,
    );
    let canonical_port = applications.canonical.as_ref().clone();
    let stopping = Arc::new(AtomicBool::new(false));
    let transfer = NativeTransferOwner::new(Path::new(&config.profile_runtime_root))?;
    let discovery_document = Arc::new(Mutex::new(json!({})));
    let state = Arc::new(ServeState {
        service_instance_id: ownership.service_instance_id.clone(),
        owner_mode: if admission.is_some() {
            "production"
        } else {
            "shadow"
        },
        cutover_receipt_id: admission
            .as_ref()
            .map(|admission| admission.cutover_receipt_id.clone()),
        profile: config.profile_id.clone(),
        config,
        repository_id,
        repository,
        applications,
        production_client_operations,
        mutation_enabled: AtomicBool::new(mutation_enabled),
        production_admission: admission.clone(),
        production_ownership: production_ownership.clone(),
        runtime_ownership: Arc::clone(&ownership),
        discovery: Arc::clone(&discovery_document),
        canonical: canonical_port,
        stopping: Arc::clone(&stopping),
        compute_pool,
        transfer: Mutex::new(transfer),
    });
    drop(canonical);
    let result = run_sidecar_listener(state, &lease_path);
    drop(production_ownership);
    drop(ownership);
    result
}

#[cfg(test)]
mod service_tests {
    use super::*;
    use std::thread;
    use std::time::Duration;

    #[test]
    fn native_compute_pool_bounds_queue_and_fuses_failures() {
        let pool = Arc::new(NativeComputePool::new());
        let stopping = Arc::new(AtomicBool::new(false));
        let active = pool.admit(&stopping).expect("active admission");
        let mut waiting = Vec::new();
        for _ in 0..2 {
            let pool = Arc::clone(&pool);
            let stopping = Arc::clone(&stopping);
            waiting.push(thread::spawn(move || {
                let _admission = pool.admit(&stopping).expect("queued admission");
            }));
        }
        for _ in 0..100 {
            if pool.snapshot(false).expect("snapshot")["queued"].as_u64() == Some(2) {
                break;
            }
            thread::sleep(Duration::from_millis(1));
        }
        assert_eq!(
            pool.admit(&stopping).err(),
            Some("worker_busy"),
            "third queued task must fail immediately"
        );
        drop(active);
        for waiter in waiting {
            waiter.join().expect("queued task");
        }
        for _ in 0..3 {
            pool.record_failure();
        }
        assert_eq!(
            pool.admit(&stopping).err(),
            Some("worker_unavailable"),
            "three consecutive runtime failures fuse compute"
        );
        assert_eq!(pool.snapshot(false).expect("snapshot")["state"], "degraded");
    }
}
