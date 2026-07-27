use serde_json::json;
use std::io::{self, Read};
use std::net::TcpListener;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use synthesis_application::{
    CanonicalStorePort, DisabledStructuredArtifact, RepositoryPort, TopicApplication,
    WorkbenchApplication,
};
use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
use synthesis_repository::{Repository, RepositoryIdentity};
use synthesis_sidecar::production_capabilities::production_client_capabilities;
use synthesis_sidecar::runtime_contract::{
    SIDECAR_CAPABILITIES, current_time_ms, read_native_launch_config, read_production_admission,
    validate_host_lease, validate_production_cutover_receipt,
};

use crate::runtime_capabilities::{ServeState, handle_connection};
use crate::runtime_lifecycle::{ProductionOwnership, RuntimeOwnership};
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
    let production_client_capabilities = production_client_capabilities()?.into_iter().collect();
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
    let lease_path = Path::new(config_path)
        .parent()
        .ok_or_else(|| "invalid_config".to_owned())?
        .join("lease.json");
    validate_host_lease(&lease_path, &config)?;
    let ownership = RuntimeOwnership::acquire(&config)?;
    let production_ownership = admission
        .as_ref()
        .map(|admission| ProductionOwnership::acquire(admission, &ownership.service_instance_id))
        .transpose()?;
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
    let repository_port = Arc::new(RepositoryPort::new(Arc::clone(&repository)));
    let canonical_port = Arc::new(CanonicalStorePort::new(Arc::clone(&canonical)));
    let workbench = WorkbenchApplication::new(repository_port.clone());
    let topics = TopicApplication::new(
        repository_port,
        canonical_port.clone(),
        Arc::new(DisabledStructuredArtifact),
    );
    let stopping = Arc::new(AtomicBool::new(false));
    let transfer = NativeTransferOwner::new(Path::new(&config.profile_runtime_root))?;
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
        workbench,
        topics,
        production_client_capabilities,
        canonical: canonical_port.as_ref().clone(),
        stopping: Arc::clone(&stopping),
        compute_pool: Arc::new(NativeComputePool::new()),
        transfer: Mutex::new(transfer),
    });
    drop(canonical);
    let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|error| error.to_string())?;
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;
    let port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();
    let mut discovery = json!({
        "schema":"synthesis-sidecar-discovery.v2",
        "profileId":state.config.profile_id,
        "supervisorInstanceId":state.config.supervisor_instance_id,
        "serviceInstanceId":state.service_instance_id,
        "bundleId":state.config.bundle_id,
        "implementation":state.config.implementation,
        "target":state.config.target,
        "targetTriple":state.config.target_triple,
        "buildFingerprint":state.config.build_fingerprint,
        "platformSignature":state.config.platform_signature,
        "serviceVersion":state.config.service_version,
        "protocolVersion":state.config.protocol_version,
        "schemaVersion":state.config.schema_version,
        "runtimeRootId":state.config.runtime_root_id,
        "dataRootId":state.config.data_root_id,
        "host":"127.0.0.1",
        "port":port,
        "pid":std::process::id(),
        "lifecycleState":"ready",
        "tokenLocator":"supervisor-session",
        "capabilities":SIDECAR_CAPABILITIES,
    });
    if let Some(admission) = admission.as_ref() {
        discovery["schema"] = json!("synthesis-sidecar-discovery.v3");
        discovery["ownerMode"] = json!("production");
        discovery["mutationEnabled"] = json!(false);
        discovery["capabilityFingerprint"] = json!(admission.capability_fingerprint);
        discovery["cutoverReceiptId"] = json!(admission.cutover_receipt_id);
        discovery["readyClientCapabilities"] =
            json!(synthesis_sidecar::production_capabilities::READY_PRODUCTION_CLIENT_CAPABILITIES);
    }
    ownership.publish_discovery(&discovery)?;
    println!(
        "{}",
        json!({"type":"listening","port":port,"buildFingerprint":state.config.build_fingerprint})
    );
    let stdin_stopping = Arc::clone(&stopping);
    thread::spawn(move || {
        let mut buffer = [0_u8; 1];
        while io::stdin().read(&mut buffer).is_ok_and(|size| size > 0) {}
        stdin_stopping.store(true, Ordering::Release);
    });
    let mut handlers = Vec::new();
    let mut next_lease_check_ms = current_time_ms()?.saturating_add(15_000);
    let mut next_transfer_reap_ms = current_time_ms()?.saturating_add(30_000);
    while !state.stopping.load(Ordering::Acquire) {
        let now_ms = current_time_ms()?;
        if now_ms >= next_transfer_reap_ms {
            if let Ok(mut transfer) = state.transfer.lock() {
                transfer.reap(now_ms);
            }
            next_transfer_reap_ms = now_ms.saturating_add(30_000);
        }
        if now_ms >= next_lease_check_ms {
            if validate_host_lease(&lease_path, &state.config).is_err() {
                state.stopping.store(true, Ordering::Release);
                continue;
            }
            next_lease_check_ms = now_ms.saturating_add(15_000);
        }
        match listener.accept() {
            Ok((stream, _)) => {
                let state = Arc::clone(&state);
                handlers.push(thread::spawn(move || {
                    let _ = handle_connection(stream, state);
                }));
            }
            Err(error) if error.kind() == io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(5));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
    drop(listener);
    let mut cleanup_errors = Vec::new();
    state.compute_pool.stop();
    for handler in handlers {
        if handler.join().is_err() {
            cleanup_errors.push("http_handler_panicked".to_owned());
        }
    }
    match state.transfer.lock() {
        Ok(mut transfer) => transfer.stop(),
        Err(_) => cleanup_errors.push("transfer_owner_unavailable".to_owned()),
    }
    match Arc::try_unwrap(state) {
        Ok(state) => {
            let repository = Arc::clone(&state.repository);
            let canonical = state.canonical.owner();
            drop(state);
            match Arc::try_unwrap(canonical) {
                Ok(canonical) => match canonical.into_inner() {
                    Ok(canonical) => {
                        if let Err(error) = canonical.close() {
                            cleanup_errors.push(error);
                        }
                    }
                    Err(_) => cleanup_errors.push("canonical_store_unavailable".to_owned()),
                },
                Err(_) => cleanup_errors.push("canonical_store_owner_leaked".to_owned()),
            }
            match Arc::try_unwrap(repository) {
                Ok(repository) => match repository.into_inner() {
                    Ok(repository) => {
                        if let Err(error) = repository.close() {
                            cleanup_errors.push(error);
                        }
                    }
                    Err(_) => cleanup_errors.push("repository_unavailable".to_owned()),
                },
                Err(_) => cleanup_errors.push("repository_owner_leaked".to_owned()),
            }
        }
        Err(_) => cleanup_errors.push("service_owner_leaked".to_owned()),
    }
    drop(ownership);
    drop(production_ownership);
    if cleanup_errors.is_empty() {
        Ok(())
    } else {
        Err(format!("shutdown_incomplete:{}", cleanup_errors.join(",")))
    }
}

#[cfg(test)]
mod service_tests {
    use super::*;

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
