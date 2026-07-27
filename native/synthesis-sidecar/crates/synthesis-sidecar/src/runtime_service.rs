use serde_json::json;
use std::io::{self, Read};
use std::net::TcpListener;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use synthesis_application::{CanonicalStorePort, RepositoryPort, WorkbenchApplication};
use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
use synthesis_repository::{Repository, RepositoryIdentity};
use synthesis_sidecar::runtime_contract::{
    SIDECAR_CAPABILITIES, current_time_ms, read_native_launch_config, validate_host_lease,
};

use crate::runtime_capabilities::{ServeState, handle_connection};
use crate::runtime_lifecycle::RuntimeOwnership;
use crate::runtime_transfer::NativeTransferOwner;
use crate::runtime_worker_pool::NativeComputePool;

pub(crate) fn serve(config_path: &str) -> Result<(), String> {
    let config = read_native_launch_config(Path::new(config_path))?;
    let lease_path = Path::new(config_path)
        .parent()
        .ok_or_else(|| "invalid_config".to_owned())?
        .join("lease.json");
    validate_host_lease(&lease_path, &config)?;
    let ownership = RuntimeOwnership::acquire(&config)?;
    let repository = Repository::open(
        &config.profile_runtime_root,
        RepositoryIdentity {
            profile_id: config.profile_id.clone(),
            data_root_id: config.data_root_id.clone(),
        },
    )?;
    let canonical = CanonicalStore::open(
        &config.profile_runtime_root,
        CanonicalIdentity {
            profile_id: config.profile_id.clone(),
            data_root_id: config.data_root_id.clone(),
        },
    )?;
    let repository_id = repository.repository_id().to_owned();
    let repository = Arc::new(Mutex::new(repository));
    let canonical = Arc::new(Mutex::new(canonical));
    let repository_port = RepositoryPort::new(Arc::clone(&repository));
    let canonical_port = CanonicalStorePort::new(Arc::clone(&canonical));
    let workbench = WorkbenchApplication::new(Arc::new(repository_port));
    let stopping = Arc::new(AtomicBool::new(false));
    let transfer = NativeTransferOwner::new(Path::new(&config.profile_runtime_root))?;
    let state = Arc::new(ServeState {
        service_instance_id: ownership.service_instance_id.clone(),
        profile: config.profile_id.clone(),
        config,
        repository_id,
        repository,
        workbench,
        canonical: canonical_port,
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
    ownership.publish_discovery(&json!({
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
    }))?;
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
